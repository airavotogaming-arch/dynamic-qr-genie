import QRCode from "qrcode";

export type QRStyle = {
  mode: "solid" | "gradient";
  start: string;
  middle?: string | undefined;
  end: string;
  pattern: "square" | "rounded" | "dots";
  background: "white" | "transparent";
  size: number;
};

export async function renderQR(canvas: HTMLCanvasElement, value: string, style: QRStyle) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  canvas.width = style.size;
  canvas.height = style.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, style.size, style.size);
  if (style.background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, style.size, style.size);
  }

  const unit = style.size / (count + 8);
  const gradient = ctx.createLinearGradient(0, 0, style.size, style.size);
  gradient.addColorStop(0, style.start);
  if (style.middle) gradient.addColorStop(0.5, style.middle);
  gradient.addColorStop(1, style.end);
  ctx.fillStyle = style.mode === "gradient" ? gradient : style.start;

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x = (col + 4) * unit;
      const y = (row + 4) * unit;
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
