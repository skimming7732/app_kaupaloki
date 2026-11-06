// TOTP (Time-based One-Time Password) RFC 6238 implementation using Web Crypto API

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 16): string {
  let secret = '';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytes[i] % BASE32_CHARS.length];
  }
  return secret;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

function base32ToUint8Array(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

export async function generateTotpCode(secret: string, timeStepWindow = 0): Promise<string> {
  const keyBytes = base32ToUint8Array(secret);
  if (keyBytes.length === 0) return '000000';

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counter = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const signature = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTotpCode(secret: string, inputCode: string): Promise<boolean> {
  const cleanCode = inputCode.trim().replace(/\s/g, '');
  if (!cleanCode || cleanCode.length !== 6) return false;

  // Check windows: current step, -1 step (-30s), +1 step (+30s)
  for (const window of [0, -1, 1, -2, 2]) {
    try {
      const expected = await generateTotpCode(secret, window);
      if (expected === cleanCode) {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

export function buildOtpAuthUri(email: string, secret: string, issuer = 'Kaupaloki'): string {
  const cleanEmail = encodeURIComponent(email);
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// Aliases for convenience
export const generateTotpSecret = generateBase32Secret;
export const generateTotpUri = (secret: string, email: string, issuer = 'Kaupaloki') => buildOtpAuthUri(email, secret, issuer);
export const verifyTotp = (code: string, secret: string) => verifyTotpCode(secret, code);
