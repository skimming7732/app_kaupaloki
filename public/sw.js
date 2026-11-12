/* Service Worker para Notificaciones Push de Kaupaloki */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Evento Push: Mostrar notificación con resumen de novedades o avisos
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Kaupaloki',
        body: event.data.text() || 'Tienes novedades pendientes en Kaupaloki.',
      };
    }
  } else {
    data = {
      title: 'Kaupaloki',
      body: 'Novedades disponibles en tu plataforma.',
    };
  }

  const title = data.title || 'Kaupaloki - Novedades';
  const options = {
    body: data.body || 'Hay nuevas funciones disponibles en la plataforma.',
    icon: data.icon || '/icono-social.png',
    badge: data.badge || '/icono-social.png',
    tag: data.tag || 'kaupaloki-update',
    renotify: true,
    data: {
      url: data.url || '/perfil/notificaciones',
      version: data.version || null,
      highest_version_code: data.highest_version_code || null,
    },
    // Vibración en dispositivos compatibles
    vibrate: [100, 50, 100],
  };

  // NOTA: Recibir una notificación push NUNCA marca las novedades como confirmadas.
  // La confirmación se hace exclusivamente dentro de la aplicación al pulsar "Entendido".
  event.waitUntil(self.registration.showNotification(title, options));
});

// Evento Click en Notificación: Abrir o enfocar la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/perfil/notificaciones';

  // NOTA: Abrir la notificación tampoco marca las novedades como leídas.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
