import { createClient } from '@supabase/supabase-js';

export const APP_DOMAIN = 'https://app.kaupaloki.co';
export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || 'https://tjuqludeduydarwzhbor.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdXFsdWRlZHV5ZGFyd3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3Mjg5MzAsImV4cCI6MjEwOTMwNDkzMH0.OQX9Dny5tOaMg8H9NRXMcU78FwmHL6j54quBURQiHfM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'administrador' | 'operador' | 'client';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientSharedLink {
  id: string;
  client_id: string;
  client_name: string;
  slug: string;
  pin: string;
  created_by?: string;
  is_active: boolean;
  created_at: string;
}
