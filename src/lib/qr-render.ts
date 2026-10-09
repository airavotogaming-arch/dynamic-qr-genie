import QRCode from "qrcode";

export const DEFAULT_GRADIENT_COLORS = [
  "#8B5CF6", // purple
  "#2563EB", // blue
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#FFFFFF", // white
] as const;

export const AIRAVOTO_POSTER_SRC = "/templates/airavoto-gaming-poster.png";
export const AIRAVOTO_POSTER_QR_SLOT = { x: 350, y: 741, size: 324 } as const;

export type QRStyle = {
  mode: "solid" | "gradient";
  colors: string[];
  pattern: "square" | "rounded" | "dots";
  background: "white" | "transparent";
  size: number;
};

let posterImagePromise: Promise<HTMLImageElement> | undefined;

export function loadAiravotoPoster() {
  if (!posterImagePromise) {
    posterImagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        posterImagePromise = undefined;
        reject(new Error("The Airavoto Gaming poster could not be loaded."));
      };
      image.src = AIRAVOTO_POSTER_SRC;
    });
  }
  return posterImagePromise;
}

export async function renderQR(
  canvas: HTMLCanvasElement,
  value: string,
  style: QRStyle,
  poster?: HTMLImageElement,
) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const width = poster?.naturalWidth || style.size;
  const height = poster?.naturalHeight || style.size;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  if (poster) {
    ctx.drawImage(poster, 0, 0, width, height);
  } else if (style.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  const slot = poster ? AIRAVOTO_POSTER_QR_SLOT : { x: 0, y: 0, size: style.size };
  const unit = slot.size / (count + 8);
  const colors = style.colors.length ? style.colors : [DEFAULT_GRADIENT_COLORS[0]];
  const gradient = ctx.createLinearGradient(slot.x, slot.y, slot.x + slot.size, slot.y + slot.size);
  if (colors.length === 1) {
    gradient.addColorStop(0, colors[0]!);
    gradient.addColorStop(1, colors[0]!);
  } else {
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  }
  ctx.fillStyle = style.mode === "gradient" ? gradient : colors[0]!;

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x = slot.x + (col + 4) * unit;
      const y = slot.y + (row + 4) * unit;
      const finder =
        (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);

      ctx.beginPath();
      if (finder || style.pattern === "square") {
        ctx.rect(x, y, unit + 0.2, unit + 0.2);
      } else if (style.pattern === "dots") {
        ctx.arc(x + unit / 2, y + unit / 2, unit * 0.48, 0, Math.PI * 2);
      } else {
        ctx.roundRect(x, y, unit + 0.2, unit + 0.2, unit * 0.28);
      }
      ctx.fill();
    }
  }
}
