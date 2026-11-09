import type { Session } from '@supabase/supabase-js';

const VERIFICATION_STORAGE_KEY = 'kaupaloki_2fa_verified';

export function getTwoFactorSessionKey(session: Session | null): string | null {
  if (!session?.access_token) return null;
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return claims.sub === session.user.id && typeof claims.session_id === 'string' && claims.session_id
      ? session.user.id + ':' + claims.session_id
      : null;
  } catch {
    return null;
  }
}

export function clearTwoFactorVerification() {
  try { sessionStorage.removeItem(VERIFICATION_STORAGE_KEY); } catch {}
}

export function connectTwoFactorTabs(key: string | null, onVerified: () => void) {
  let verified = false;
  let channel: BroadcastChannel | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settle: () => void = () => {};
  const ready = new Promise<void>((resolve) => { settle = resolve; });

  if (key) {
    try { verified = sessionStorage.getItem(VERIFICATION_STORAGE_KEY) === key; } catch {}
    try { channel = new BroadcastChannel('kaupaloki:2fa:' + key); } catch {}
  }

  const accept = () => {
    if (verified) return;
    verified = true;
    if (key) {
      try { sessionStorage.setItem(VERIFICATION_STORAGE_KEY, key); } catch {}
    }
    onVerified();
    settle();
  };

  const broadcast = (message: 'verified' | 'request') => {
    try { channel?.postMessage(message); } catch {}
  };

  if (channel) {
    channel.onmessage = (event) => {
      if (event.data === 'verified') accept();
      if (event.data === 'request' && verified) broadcast('verified');
    };
  }
  if (verified || !channel) {
    settle();
  } else {
    timer = setTimeout(settle, 700);
    broadcast('request');
  }

  return {
    ready,
    verified: () => verified,
    verify() {
      accept();
      broadcast('verified');
    },
    close() {
      verified = false;
      if (timer !== undefined) clearTimeout(timer);
      try { channel?.close(); } catch {}
      channel = undefined;
      settle();
    },
  };
}
