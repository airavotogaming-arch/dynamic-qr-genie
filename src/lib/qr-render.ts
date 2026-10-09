import QRCode from "qrcode";

export const DEFAULT_GRADIENT_COLORS = [
  "#8B5CF6", // purple
  "#2563EB", // blue
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#FFFFFF", // white
] as const;

export const AIRAVOTO_POSTER_SRC = "/templates/airavoto-gaming-poster.png";
export const AIRAVOTO_POSTER_DIMENSIONS = { width: 1024, height: 1536 } as const;
export const POSTER_EXPORT_SCALE = 2;
export const POSTER_QR_SIZE_BOUNDS = { min: 240, max: 420 } as const;
export const POSTER_QR_LEGACY_MIN_SIZE = 160;
export const QR_ERROR_CORRECTION_LEVEL = "Q" as const;
export const QR_MIN_WHITE_CONTRAST_RATIO = 4.5;

export type QRPlacement = { x: number; y: number; size: number };
export const DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT: QRPlacement = {
  x: 348,
  y: 698,
  size: 375,
};
export const AIRAVOTO_POSTER_QR_SLOT = DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT;

export type QRStyle = {
  mode: "solid" | "gradient";
  colors: string[];
  pattern: "square" | "rounded" | "dots";
  background: "white" | "transparent";
  size: number;
};

export function normalizePosterQRPlacement(
  placement: QRPlacement,
  width: number = AIRAVOTO_POSTER_DIMENSIONS.width,
  height: number = AIRAVOTO_POSTER_DIMENSIONS.height,
  scale = 1,
): QRPlacement {
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value));
  const proposedSize = Number.isFinite(placement.size)
    ? Math.round(placement.size)
    : DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT.size;
  const normalizedScale = Math.max(1, Math.round(scale));
  const size = clamp(
    proposedSize,
    Math.min(POSTER_QR_SIZE_BOUNDS.min * normalizedScale, width, height),
    Math.min(POSTER_QR_SIZE_BOUNDS.max * normalizedScale, width, height),
  );
  const proposedX = Number.isFinite(placement.x)
    ? Math.round(placement.x)
    : DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT.x;
  const proposedY = Number.isFinite(placement.y)
    ? Math.round(placement.y)
    : DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT.y;
  return {
    x: clamp(proposedX, 0, width - size),
    y: clamp(proposedY, 0, height - size),
    size,
  };
}

function linearizeSrgb(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function colorLuminance(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = match[1]!;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * linearizeSrgb(red) + 0.7152 * linearizeSrgb(green) + 0.0722 * linearizeSrgb(blue);
}

export function getWhiteBackgroundContrastRatio(hex: string) {
  return 1.05 / (colorLuminance(hex) + 0.05);
}

export function ensureQRCodeColorContrastOnWhite(hex: string) {
  if (getWhiteBackgroundContrastRatio(hex) >= QR_MIN_WHITE_CONTRAST_RATIO) return hex;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = match[1]!;
  let channels = [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
  for (let attempt = 0; attempt < 256; attempt++) {
    channels = channels.map((channel) => Math.round(channel * 0.96));
    const safeColor = `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    if (getWhiteBackgroundContrastRatio(safeColor) >= QR_MIN_WHITE_CONTRAST_RATIO) {
      return safeColor.toUpperCase();
    }
  }
  return "#000000";
}

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
  posterPlacement: QRPlacement = DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT,
  posterScale = 1,
) {
  const qr = QRCode.create(value, { errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL });
  const count = qr.modules.size;
  const scale = poster ? Math.max(1, Math.round(posterScale)) : 1;
  const width = poster ? poster.naturalWidth * scale : style.size;
  const height = poster ? poster.naturalHeight * scale : style.size;
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

  const slot = poster
    ? normalizePosterQRPlacement(
        {
          x: posterPlacement.x * scale,
          y: posterPlacement.y * scale,
          size: posterPlacement.size * scale,
        },
        width,
        height,
        scale,
      )
    : { x: 0, y: 0, size: style.size };
  const unit = slot.size / (count + 8);
  const sourceColors = style.colors.length ? style.colors : [DEFAULT_GRADIENT_COLORS[0]];
  const colors =
    !poster && style.background === "white"
      ? sourceColors.map(ensureQRCodeColorContrastOnWhite)
      : sourceColors;
  const gradient = ctx.createLinearGradient(slot.x, slot.y, slot.x + slot.size, slot.y + slot.size);
  if (colors.length === 1) {
    gradient.addColorStop(0, colors[0]!);
    gradient.addColorStop(1, colors[0]!);
  } else {
    colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  }
  ctx.fillStyle = style.mode === "gradient" ? gradient : colors[0]!;

  for (let row = 0; row < count; row++) {
    const y = Math.round(slot.y + (row + 4) * unit);
    const bottom = Math.round(slot.y + (row + 5) * unit);
    const moduleHeight = Math.max(1, bottom - y);
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x = Math.round(slot.x + (col + 4) * unit);
      const right = Math.round(slot.x + (col + 5) * unit);
      const moduleWidth = Math.max(1, right - x);
      const finder =
        (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);

      ctx.beginPath();
      if (finder || style.pattern === "square") {
        ctx.rect(x, y, moduleWidth, moduleHeight);
      } else if (style.pattern === "dots") {
        ctx.arc(
          x + moduleWidth / 2,
          y + moduleHeight / 2,
          Math.min(moduleWidth, moduleHeight) * 0.48,
          0,
          Math.PI * 2,
        );
      } else {
        ctx.roundRect(x, y, moduleWidth, moduleHeight, Math.min(moduleWidth, moduleHeight) * 0.28);
      }
      ctx.fill();
    }
  }
}
