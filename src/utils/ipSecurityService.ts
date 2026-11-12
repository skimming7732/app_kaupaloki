import { supabase } from '../lib/supabase';

export interface IpStatusResult {
  client_ip: string;
  is_new_ip: boolean;
  requires_email_otp: boolean;
  account_age_days: number;
  known_ips_count: number;
  reason?: string;
}

let cachedIp: string | null = null;

export async function fetchClientPublicIp(): Promise<string> {
  if (cachedIp) return cachedIp;

  // Intentar primero con api64.ipify.org (soporta IPv4 e IPv6 con CORS abierto)
  try {
    const res = await fetch('https://api64.ipify.org?format=json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedIp = String(data.ip).trim();
        return cachedIp;
      }
    }
  } catch {
    // Continuar al fallback
  }

  // Fallback 1: Cloudflare trace
  try {
    const res = await fetch('https://cloudflare.com/cdn-cgi/trace', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const text = await res.text();
      const match = text.match(/ip=([^\n]+)/);
      if (match && match[1]) {
        cachedIp = match[1].trim();
        return cachedIp;
      }
    }
  } catch {
    // Continuar al siguiente fallback
  }

  // Fallback 2: api.ipify.org (solo IPv4)
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedIp = String(data.ip).trim();
        return cachedIp;
      }
    }
  } catch {
    // Sin conectividad al servicio de IP
  }

  return '';
}

export async function checkCurrentIpSecurityStatus(): Promise<IpStatusResult> {
  const clientIp = await fetchClientPublicIp();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  try {
    const { data, error } = await supabase.rpc('check_user_ip_status', {
      client_ip: clientIp,
      client_user_agent: userAgent,
    });

    if (error) {
      console.warn('check_user_ip_status RPC warning:', error);
      return {
        client_ip: clientIp,
        is_new_ip: false,
        requires_email_otp: false,
        account_age_days: 0,
        known_ips_count: 1,
        reason: error.message,
      };
    }

    return {
      client_ip: data?.client_ip || clientIp,
      is_new_ip: !!data?.is_new_ip,
      requires_email_otp: !!data?.requires_email_otp,
      account_age_days: Number(data?.account_age_days) || 0,
      known_ips_count: Number(data?.known_ips_count) || 0,
    };
  } catch (err: any) {
    console.warn('Error comprobando estatus de seguridad de IP:', err);
    return {
      client_ip: clientIp,
      is_new_ip: false,
      requires_email_otp: false,
      account_age_days: 0,
      known_ips_count: 1,
      reason: err?.message,
    };
  }
}

export async function authorizeCurrentIp(clientIp?: string): Promise<boolean> {
  const ipToAuthorize = (clientIp || cachedIp || await fetchClientPublicIp()).trim();
  if (!ipToAuthorize) return false;

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  try {
    const { data, error } = await supabase.rpc('authorize_user_ip', {
      client_ip: ipToAuthorize,
      client_user_agent: userAgent,
    });
    if (error) {
      console.error('Error al autorizar IP en Supabase:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('Fallo de red al autorizar IP:', err);
    return false;
  }
}
