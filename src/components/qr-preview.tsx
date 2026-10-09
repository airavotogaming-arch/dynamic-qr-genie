import { useEffect, useRef } from "react";
import {
  DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT,
  loadAiravotoPoster,
  renderQR,
  type QRPlacement,
  type QRStyle,
} from "@/lib/qr-render";

export function QRPreview({
  value,
  style,
  poster = false,
  placement = DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT,
}: {
  value: string;
  style: QRStyle;
  poster?: boolean;
  placement?: QRPlacement;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    async function render() {
      try {
        const backgroundImage = poster ? await loadAiravotoPoster() : undefined;
        if (active && ref.current) {
          await renderQR(ref.current, value, style, backgroundImage, placement);
        }
      } catch {
        // Keep rendering best-effort; the generator's controls remain available if the template fails.
      }
    }
    void render();
    return () => {
      active = false;
    };
  }, [value, style, poster, placement]);

  return (
    <canvas
      ref={ref}
      className={poster ? "qr-canvas poster" : "qr-canvas"}
      aria-label={poster ? "Airavoto Gaming poster with QR code" : "Scannable QR code preview"}
    />
  );
}
