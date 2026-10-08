import { z } from 'zod';
export const urlSchema = z.string().trim().max(2048).url('Enter a complete website URL.').refine(value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }, 'Use an http or https URL without embedded credentials.');
export const passwordSchema = z.string().min(10, 'Use at least 10 characters.').max(64).regex(/^[\x20-\x7E]+$/, 'Use standard letters, numbers, and symbols.');
export const createSchema = z.object({ destination: urlSchema, label: z.string().trim().max(80), password: passwordSchema });
export const manageSchema = z.object({ id: z.string().uuid('Enter a valid code ID.'), password: passwordSchema, destination: urlSchema.optional() });
export const resultSchema = z.object({ id: z.string().uuid(), destination: urlSchema, label: z.string() });
export type QRRecord = z.infer<typeof resultSchema>;
export const analyticsSchema = manageSchema.omit({ destination: true }).extend({ page: z.number().int().min(0).max(100000).default(0) });
export const scanSchema = z.object({ id: z.string().uuid(), event: z.string().uuid() });
export const analyticsResultSchema = z.object({
  code: resultSchema, total: z.number(), today: z.number(), week: z.number(),
  lastScan: z.string().nullable(), page: z.number(),
  scans: z.array(z.object({ id: z.string().uuid(), scannedAt: z.string() })),
});
export type QRAnalytics = z.infer<typeof analyticsResultSchema>;
