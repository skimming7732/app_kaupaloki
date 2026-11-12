import { supabase } from '../lib/supabase';

export const VAPID_PUBLIC_KEY =
  'BOd887M6aCWosIgbeKfBdoAI3giD6CjHTC8u0c9fdi8T2LLDyQ1Vhrq2mJHnGhr6n3d04ihyJMNPjRakmAn9tWg';

const DISMISS_KEY = 'kaupaloki_push_prompt_dismissed';

/**
 * Convierte una clave pública VAPID en Base64 URL-safe a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detecta si la web se ejecuta como aplicación instalada (PWA Standalone)
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isMatchMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosNavigatorStandalone = (window.navigator as any).standalone === true;
  return Boolean(isMatchMediaStandalone || isIosNavigatorStandalone);
}

/**
 * Detecta si el dispositivo actual es móvil (Android o iOS)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return /Android|iPhone|iPad|iPod/i.test(ua) || isTouchMac;
}

/**
 * Categoría técnica del dispositivo para registro en base de datos
 */
export function getDeviceCategory(): string {
  if (typeof window === 'undefined') return 'desktop_browser';
  const ua = navigator.userAgent || '';
  const standalone = isStandaloneApp();
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
    return standalone ? 'iphone_standalone' : 'iphone_browser';
  }
  if (/Android/i.test(ua)) {
    return standalone ? 'android_standalone' : 'android_browser';
  }
  return 'desktop_browser';
}

/**
 * Nombre descriptivo y amigable del dispositivo actual
 */
export function getDeviceFriendlyName(): string {
  const cat = getDeviceCategory();
  switch (cat) {
    case 'iphone_standalone':
      return 'iPhone / iPad (App Instalada)';
    case 'iphone_browser':
      return 'iPhone / iPad (Navegador Safari)';
    case 'android_standalone':
      return 'Android (App Instalada)';
    case 'android_browser':
      return 'Android (Navegador Móvil)';
    default:
      return 'Ordenador (Navegador de Escritorio)';
  }
}

/**
 * Determina si se puede ofrecer la activación de notificaciones en este dispositivo:
 * - En Android y iPhone: ÚNICAMENTE si la web se está ejecutando como aplicación instalada; NUNCA desde un navegador móvil convencional.
 * - En ordenadores: Permitir la autorización desde navegadores compatibles.
 */
export function canOfferPushOnCurrentDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }

  // Si es un dispositivo móvil (iPhone, iPad o Android)
  if (isMobileDevice()) {
    // REGLA ESTRICTA: Solo si es aplicación instalada (standalone), NUNCA navegador convencional
    return isStandaloneApp();
  }

  // En ordenadores (desktop/laptop): Sí se permite si el navegador tiene soporte
  return true;
}

/**
 * Comprueba si el usuario ya descartó el aviso en este dispositivo
 */
export function hasDismissedPushPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DISMISS_KEY) === 'true';
}

/**
 * Registra el rechazo / descarte en este dispositivo para no volver a preguntar
 */
export function dismissPushPrompt(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISS_KEY, 'true');
}

/**
 * Restablece el descarte (útil si el usuario lo activa voluntariamente desde su perfil)
 */
export function clearDismissedPushPrompt(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISMISS_KEY);
}

/**
 * Obtiene el estado actual del permiso en el navegador
 */
export function getPushPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Registra o recupera el Service Worker
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    console.warn('[PushService] Error registrando service worker:', err);
    return null;
  }
}

/**
 * Suscribe al usuario actual a las notificaciones Push y guarda la suscripción en base de datos
 */
export async function subscribeToPush(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!canOfferPushOnCurrentDevice()) {
      return {
        success: false,
        error: isMobileDevice() && !isStandaloneApp()
          ? 'En móviles, las notificaciones push solo están disponibles cuando abres Kaupaloki desde la pantalla de inicio (App instalada).'
          : 'Este navegador o dispositivo no soporta notificaciones push.',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      dismissPushPrompt();
      return {
        success: false,
        error: 'Permiso de notificaciones denegado en el navegador.',
      };
    }

    const registration = await getOrRegisterServiceWorker();
    if (!registration) {
      return { success: false, error: 'No se pudo inicializar el Service Worker en este dispositivo.' };
    }

    // Esperar a que el service worker esté activo
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'Datos de suscripción push inválidos.' };
    }

    const deviceType = getDeviceCategory();
    const userAgent = navigator.userAgent;

    // Guardar en Supabase tabla push_subscriptions
    const { error: dbErr } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        device_type: deviceType,
        user_agent: userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (dbErr) {
      console.error('[PushService] Error guardando suscripción en DB:', dbErr);
      return { success: false, error: dbErr.message };
    }

    clearDismissedPushPrompt();
    return { success: true };
  } catch (err: any) {
    console.error('[PushService] Error en subscribeToPush:', err);
    return { success: false, error: err?.message || 'Error desconocido al activar notificaciones.' };
  }
}

/**
 * Desactiva la suscripción push en este dispositivo
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await getOrRegisterServiceWorker();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('endpoint', endpoint);
      }
    }
    return true;
  } catch (err) {
    console.error('[PushService] Error al desactivar push:', err);
    return false;
  }
}

/**
 * Comprueba si el dispositivo actual tiene una suscripción activa
 */
export async function checkIsSubscribedLocally(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const sub = await registration.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

/**
 * Dispara una notificación de prueba local directa a través del Service Worker
 */
export async function sendLocalTestNotification(): Promise<boolean> {
  try {
    const registration = await getOrRegisterServiceWorker();
    if (!registration) return false;
    await registration.showNotification('Kaupaloki - Notificaciones Activas', {
      body: '¡Excelente! Tu dispositivo está configurado para recibir novedades contables y actualizaciones del sistema.',
      icon: '/icono-social.png',
      badge: '/icono-social.png',
      tag: 'test-push',
      data: { url: '/perfil/notificaciones' },
    });
    return true;
  } catch (err) {
    console.error('[PushService] Error enviando notificación de prueba:', err);
    return false;
  }
}
