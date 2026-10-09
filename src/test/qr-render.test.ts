import QRCode from "qrcode";
import { describe, expect, it, vi } from "vitest";
import {
  ensureQRCodeColorContrastOnWhite,
  getWhiteBackgroundContrastRatio,
  normalizePosterQRPlacement,
  POSTER_EXPORT_SCALE,
  QR_ERROR_CORRECTION_LEVEL,
  QR_MIN_WHITE_CONTRAST_RATIO,
  renderQR,
  type QRStyle,
} from "@/lib/qr-render";

function makeCanvas() {
  const addColorStop = vi.fn();
  const context = {
    clearRect: vi.fn(),
    createLinearGradient: () => ({ addColorStop }),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
  };
  const canvas = { getContext: () => context, width: 0, height: 0 } as unknown as HTMLCanvasElement;
  return { canvas, context, addColorStop };
}

const baseStyle: QRStyle = {
  mode: "gradient",
  colors: ["#8B5CF6", "#2563EB", "#06B6D4", "#EC4899", "#FFFFFF"],
  pattern: "rounded",
  background: "white",
  size: 1024,
};

describe("QR rendering", () => {
  it.each([512, 640, 1024])(
    "uses scan-contrasted gradient colors in %i px output",
    async (size) => {
      const { canvas, context, addColorStop } = makeCanvas();
      await renderQR(canvas, "https://example.com", { ...baseStyle, size });

      expect(addColorStop.mock.calls).toEqual(
        baseStyle.colors.map((color, index) => [
          index / 4,
          ensureQRCodeColorContrastOnWhite(color),
        ]),
      );
      expect(canvas.width).toBe(size);
      expect(context.fillRect).toHaveBeenCalledWith(0, 0, size, size);

      addColorStop.mockClear();
      await renderQR(canvas, "https://example.com", {
        ...baseStyle,
        colors: [baseStyle.colors[0]!, baseStyle.colors[4]!],
      });
      expect(addColorStop.mock.calls).toEqual([
        [0, ensureQRCodeColorContrastOnWhite(baseStyle.colors[0]!)],
        [1, ensureQRCodeColorContrastOnWhite(baseStyle.colors[4]!)],
      ]);
    },
  );

  it("darkens low-contrast foreground colors only enough to be readable on white", () => {
    const adjusted = ensureQRCodeColorContrastOnWhite("#FFFFFF");
    expect(adjusted).not.toBe("#FFFFFF");
    expect(getWhiteBackgroundContrastRatio(adjusted)).toBeGreaterThanOrEqual(
      QR_MIN_WHITE_CONTRAST_RATIO,
    );
    expect(ensureQRCodeColorContrastOnWhite("#000000")).toBe("#000000");
  });

  it("uses Q-level correction to keep a dynamic QR less dense than H-level", () => {
    const value = "https://dynamic-qr-genie.onrender.com/q/123e4567-e89b-12d3-a456-426614174000";
    const scanReady = QRCode.create(value, { errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL });
    const maximumCorrection = QRCode.create(value, { errorCorrectionLevel: "H" });

    expect(QR_ERROR_CORRECTION_LEVEL).toBe("Q");
    expect(scanReady.modules.size).toBeLessThan(maximumCorrection.modules.size);
  });

  it("leaves the QR background transparent when selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, background: "transparent" });

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, baseStyle.size, baseStyle.size);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("composites a transparent QR over a poster and keeps the requested gradient", async () => {
    const { canvas, context, addColorStop } = makeCanvas();
    const poster = { naturalWidth: 1024, naturalHeight: 1536 } as HTMLImageElement;
    await renderQR(
      canvas,
      "https://example.com",
      { ...baseStyle, background: "transparent" },
      poster,
    );

    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(1536);
    expect(context.drawImage).toHaveBeenCalledWith(poster, 0, 0, 1024, 1536);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.rect).toHaveBeenCalled();
    expect(addColorStop.mock.calls.map((call) => call[1])).toEqual(baseStyle.colors);
  });

  it("exports the poster at double resolution and scales QR placement with it", async () => {
    const { canvas, context } = makeCanvas();
    const poster = { naturalWidth: 1024, naturalHeight: 1536 } as HTMLImageElement;
    const placement = { x: 350, y: 741, size: 324 };
    await renderQR(
      canvas,
      "https://example.com",
      { ...baseStyle, background: "transparent" },
      poster,
      placement,
      POSTER_EXPORT_SCALE,
    );

    expect(canvas.width).toBe(2048);
    expect(canvas.height).toBe(3072);
    expect(context.drawImage).toHaveBeenCalledWith(poster, 0, 0, 2048, 3072);
    expect(context.rect.mock.calls[0]![0]).toBeGreaterThanOrEqual(
      placement.x * POSTER_EXPORT_SCALE,
    );
    expect(context.rect.mock.calls[0]![1]).toBeGreaterThanOrEqual(
      placement.y * POSTER_EXPORT_SCALE,
    );
  });

  it("moves the QR modules when poster X and Y coordinates change", async () => {
    const poster = { naturalWidth: 1024, naturalHeight: 1536 } as HTMLImageElement;
    const first = makeCanvas();
    const moved = makeCanvas();
    await renderQR(first.canvas, "https://example.com", baseStyle, poster, {
      x: 300,
      y: 700,
      size: 280,
    });
    await renderQR(moved.canvas, "https://example.com", baseStyle, poster, {
      x: 330,
      y: 720,
      size: 280,
    });

    expect(moved.context.rect.mock.calls[0]![0] - first.context.rect.mock.calls[0]![0]).toBe(30);
    expect(moved.context.rect.mock.calls[0]![1] - first.context.rect.mock.calls[0]![1]).toBe(20);
  });

  it("clamps poster size and coordinates to safe image bounds", () => {
    expect(normalizePosterQRPlacement({ x: -20, y: 3000, size: 999 })).toEqual({
      x: 0,
      y: 1116,
      size: 420,
    });
    expect(normalizePosterQRPlacement({ x: 20, y: 30, size: 160 }).size).toBe(240);
  });

  it("snaps square QR module edges to whole pixels", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, pattern: "square" });

    expect(context.rect).toHaveBeenCalled();
    for (const call of context.rect.mock.calls) {
      expect(call.slice(0, 4).every((value) => Number.isInteger(value))).toBe(true);
    }
  });

  it("rounds QR modules when the rounded pattern is selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, pattern: "rounded" });

    expect(context.roundRect).toHaveBeenCalled();
    expect(context.rect).toHaveBeenCalled();
  });
});
