import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { createSchema, manageSchema, resultSchema, urlSchema } from './qr-schema';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
export const createQR = createServerFn({ method: 'POST' }).inputValidator(createSchema).handler(async ({ data }) => {
  const client = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.rpc('qr_create', { p_url: data.destination, p_label: data.label, p_password: data.password });
  if (result.error) throw new Error('Your code could not be saved. Please try again.');
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof result.data.error === 'string') throw new Error(result.data.error);
  return resultSchema.parse(result.data);
});
export const manageQR = createServerFn({ method: 'POST' }).inputValidator(manageSchema).handler(async ({ data }) => {
  const client = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.rpc('qr_manage', { p_id: data.id, p_password: data.password, ...(data.destination ? { p_url: data.destination } : {}) });
  if (result.error) throw new Error('Your code could not be opened. Please try again.');
  if (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && typeof result.data.error === 'string') throw new Error(result.data.error);
  return resultSchema.parse(result.data);
});
export const resolveQR = createServerFn({ method: 'GET' }).inputValidator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const client = createClient<Database>(process.env['SUPABASE_URL']!, process.env['SUPABASE_PUBLISHABLE_KEY']!, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.rpc('qr_resolve', { p_id: data.id });
  if (result.error) throw new Error('This QR link is temporarily unavailable.');
  return result.data ? urlSchema.parse(result.data) : null;
});
