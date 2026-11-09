export interface BiometricCredentialRecord {
  id: string;
  deviceLabel: string;
  createdAt: string;
}

const LOCAL_CRED_PREFIX = 'kpl_biometric_cred_';

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ reports Macintosh with touch points
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

export async function isMobileBiometricSupported(): Promise<boolean> {
  if (!isMobileDevice()) return false;
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function getMobileDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Teléfono móvil';
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone (Face ID / Touch ID)';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad (Face ID / Touch ID)';
  if (/Android/i.test(ua)) return 'Android (Biometría / Rostro)';
  return 'Teléfono móvil (Face ID / Biometría)';
}

export function normalizeBiometricCredentials(raw: unknown): BiometricCredentialRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && typeof (item as any).id === 'string'))
    .map((item) => ({
      id: String(item.id),
      deviceLabel: typeof item.deviceLabel === 'string' && item.deviceLabel ? item.deviceLabel : 'Teléfono móvil',
      createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
    }));
}

export function getLocalBiometricCredentialId(userId?: string): string | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(LOCAL_CRED_PREFIX + userId);
  } catch {
    return null;
  }
}

export function setLocalBiometricCredentialId(userId: string, credentialId: string | null): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    if (credentialId) {
      localStorage.setItem(LOCAL_CRED_PREFIX + userId, credentialId);
    } else {
      localStorage.removeItem(LOCAL_CRED_PREFIX + userId);
    }
  } catch {}
}

export function isCurrentDeviceEnrolled(userId?: string, credentials?: BiometricCredentialRecord[]): boolean {
  if (!userId || !credentials || credentials.length === 0) return false;
  const localId = getLocalBiometricCredentialId(userId);
  if (!localId) return false;
  return credentials.some((c) => c.id === localId);
}

export async function registerMobileBiometric(user: {
  id: string;
  email: string;
  name?: string;
}): Promise<BiometricCredentialRecord> {
  const supported = await isMobileBiometricSupported();
  if (!supported) {
    throw new Error('Face ID / Biometría solo está disponible desde el navegador de tu teléfono.');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const userIdBytes = new TextEncoder().encode(user.id);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Kaupaloki',
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: user.email,
        displayName: user.name || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (Apple Face ID / Touch ID & Android)
        { alg: -257, type: 'public-key' }, // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('No se completó el registro de Face ID.');
  }

  const id = bufferToBase64Url(credential.rawId);
  setLocalBiometricCredentialId(user.id, id);

  return {
    id,
    deviceLabel: getMobileDeviceLabel(),
    createdAt: new Date().toISOString(),
  };
}

export async function verifyMobileBiometric(
  userId: string,
  credentials: BiometricCredentialRecord[]
): Promise<string> {
  if (!credentials.length) {
    throw new Error('No hay credenciales de Face ID configuradas en tu cuenta.');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const localId = getLocalBiometricCredentialId(userId);
  const ordered = localId
    ? [
        ...credentials.filter((c) => c.id === localId),
        ...credentials.filter((c) => c.id !== localId),
      ]
    : credentials;

  const allowCredentials: PublicKeyCredentialDescriptor[] = ordered.map((cred) => ({
    id: base64UrlToBuffer(cred.id),
    type: 'public-key',
    transports: ['internal', 'hybrid'],
  }));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Verificación con Face ID cancelada.');
  }

  const verifiedId = bufferToBase64Url(assertion.rawId);
  setLocalBiometricCredentialId(userId, verifiedId);
  return verifiedId;
}
