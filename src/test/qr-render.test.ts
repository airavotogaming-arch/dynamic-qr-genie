import { describe, it, expect, vi } from 'vitest';
import { renderQR, type QRStyle } from '@/lib/qr-render';

describe('QR gradient rendering', () => {
  it.each([512, 640, 1024])('uses the middle stop in %i px previews and exports', async size => {
    const addColorStop = vi.fn();
    const context = { createLinearGradient: () => ({ addColorStop }), fillRect: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), fill: vi.fn(), fillStyle: '' };
    const canvas = { getContext: () => context, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    const style: QRStyle = { mode: 'gradient', start: '#161616', middle: '#77354f', end: '#164c9c', pattern: 'square', size };
    await renderQR(canvas, 'https://example.com', style);
    expect(addColorStop.mock.calls).toEqual([[0, style.start], [.5, style.middle], [1, style.end]]);
    expect(canvas.width).toBe(size);
    addColorStop.mockClear();
    await renderQR(canvas, 'https://example.com', { ...style, middle: undefined });
    expect(addColorStop.mock.calls).toEqual([[0, style.start], [1, style.end]]);
  });
});