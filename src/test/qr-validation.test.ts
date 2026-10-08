import { describe, expect, it } from 'vitest';
import { createSchema, manageSchema, urlSchema } from '@/lib/qr-schema';
import QRCode from 'qrcode';
describe('QR input security', () => {
  it('accepts public website URLs', () => expect(urlSchema.safeParse('https://example.com/path?a=1').success).toBe(true));
  it.each(['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', 'https://user:secret@example.com'])('rejects unsafe URL %s', value => expect(urlSchema.safeParse(value).success).toBe(false));
  it('requires a strong edit password', () => expect(createSchema.safeParse({ destination: 'https://example.com', label: '', password: '123' }).success).toBe(false));
  it('requires a UUID for editing', () => expect(manageSchema.safeParse({ id: '123', password: 'StrongPass123' }).success).toBe(false));
  it('produces a valid QR matrix', () => { const result = QRCode.create('https://example.com/q/123', { errorCorrectionLevel: 'H' }); expect(result.modules.size).toBeGreaterThan(20); expect(result.modules.get(0, 0)).toBeTruthy(); });
});