import { useEffect, useRef } from 'react';
import { renderQR, type QRStyle } from '@/lib/qr-render';
export function QRPreview({ value, style }: { value: string; style: QRStyle }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) void renderQR(ref.current, value, style); }, [value, style]);
  return <canvas ref={ref} className="qr-canvas" aria-label="Scannable QR code preview" />;
}
