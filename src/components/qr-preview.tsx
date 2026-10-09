import { useEffect, useRef } from "react";
import { loadAiravotoPoster, renderQR, type QRStyle } from "@/lib/qr-render";

export function QRPreview({
  value,
  style,
  poster = false,
}: {
  value: string;
  style: QRStyle;
  poster?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    async function render() {
      try {
        const backgroundImage = poster ? await loadAiravotoPoster() : undefined;
        if (active && ref.current) await renderQR(ref.current, value, style, backgroundImage);
      } catch {
        // Keep rendering best-effort; the generator's controls remain available if the template fails.
      }
    }
    void render();
    return () => {
      active = false;
    };
  }, [value, style, poster]);

  return (
    <canvas
      ref={ref}
      className={poster ? "qr-canvas poster" : "qr-canvas"}
      aria-label={poster ? "Airavoto Gaming poster with QR code" : "Scannable QR code preview"}
    />
  );
}
