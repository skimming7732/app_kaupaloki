import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createPortalHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const reader = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
const storage = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options).storage.from('comprobantes');

Deno.serve(createPortalHandler({
  async openPortal(token, pin) {
    const { data, error } = await reader.rpc('abrir_portal_cliente', { p_token: token, p_pin: pin });
    if (error) throw error;
    return data;
  },
  async signReceipts(paths) {
    const signed = new Map<string, string>();
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await storage.createSignedUrls(paths.slice(i, i + 100), 3600);
      if (error) throw error;
      for (const row of data || []) if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
    }
    return signed;
  },
}));
