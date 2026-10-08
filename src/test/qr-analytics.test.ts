import { describe, expect, it } from 'vitest';
import { analyticsSchema, analyticsResultSchema, scanSchema } from '@/lib/qr-schema';

const id = '550e8400-e29b-41d4-a716-446655440000';
describe('QR analytics validation', () => {
  it('requires per-code credentials and defaults to the first history page', () => {
    expect(analyticsSchema.parse({ id, password: 'private-password' }).page).toBe(0);
    expect(analyticsSchema.safeParse({ id }).success).toBe(false);
    expect(analyticsSchema.safeParse({ id, password: 'short' }).success).toBe(false);
  });
  it('rejects invalid IDs and out-of-range history pages', () => {
    for (const page of [-1, 0.5, 100001]) expect(analyticsSchema.safeParse({ id, password: 'private-password', page }).success).toBe(false);
    expect(scanSchema.safeParse({ id, event: 'not-a-uuid' }).success).toBe(false);
  });
  it('accepts an empty private dashboard response', () => {
    expect(analyticsResultSchema.parse({ code: { id, label: '', destination: 'https://example.com' }, total: 0, today: 0, week: 0, lastScan: null, scans: [], page: 0 }).scans).toEqual([]);
  });
});