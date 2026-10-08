import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { createSchema, manageSchema, resultSchema, urlSchema, analyticsSchema, analyticsResultSchema, scanSchema } from './qr-schema';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
function publicClient(url: string, key: string) {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
}
export const createQR = createServerFn({ method: 'POST' }).inputValidator(createSchema).handler(async ({ data }) => {
  const client = publicClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!);
  const result = await client.rpc('qr_create', { p_url: data.destination, p_label: data.label, p_password: data.password });
  if (result.error) throw new Error('Your code could not be saved. Please try again.');
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof result.data['error'] === 'string') throw new Error(result.data['error']);
  return resultSchema.parse(result.data);
});
export const manageQR = createServerFn({ method: 'POST' }).inputValidator(manageSchema).handler(async ({ data }) => {
  const client = publicClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!);
  const result = await client.rpc('qr_manage', { p_id: data.id, p_password: data.password, ...(data.destination ? { p_url: data.destination } : {}) });
  if (result.error) throw new Error('Your code could not be opened. Please try again.');
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof result.data['error'] === 'string') throw new Error(result.data['error']);
  return resultSchema.parse(result.data);
});
export const resolveQR = createServerFn({ method: 'GET' }).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const client = publicClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!);
  const result = await client.rpc('qr_resolve', { p_id: data.id });
  if (result.error) throw new Error('This QR link is temporarily unavailable.');
  return result.data ? urlSchema.parse(result.data) : null;
});
export const recordScan = createServerFn({ method: 'POST' }).inputValidator(scanSchema).handler(async ({ data }) => {
  const client = publicClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!);
  const result = await client.rpc('qr_record_scan', { p_id: data.id, p_event: data.event });
  return { recorded: !result.error && result.data === true };
});
export const getQRAnalytics = createServerFn({ method: 'POST' }).inputValidator(analyticsSchema).handler(async ({ data }) => {
  const client = publicClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!);
  const result = await client.rpc('qr_analytics', { p_id: data.id, p_password: data.password, p_page: data.page });
  if (result.error) throw new Error('Scan history could not be loaded. Please try again.');
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof result.data['error'] === 'string') throw new Error(result.data['error']);
  return analyticsResultSchema.parse(result.data);
});
