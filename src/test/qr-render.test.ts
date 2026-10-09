import { describe, expect, it, vi } from "vitest";
import { renderQR, type QRStyle } from "@/lib/qr-render";

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
  it.each([512, 640, 1024])("uses all five gradient colors in %i px output", async (size) => {
    const { canvas, context, addColorStop } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, size });

    expect(addColorStop.mock.calls).toEqual(
      baseStyle.colors.map((color, index) => [index / 4, color]),
    );
    expect(canvas.width).toBe(size);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, size, size);

    addColorStop.mockClear();
    await renderQR(canvas, "https://example.com", {
      ...baseStyle,
      colors: [baseStyle.colors[0]!, baseStyle.colors[4]!],
    });
    expect(addColorStop.mock.calls).toEqual([
      [0, baseStyle.colors[0]],
      [1, baseStyle.colors[4]],
    ]);
  });

  it("leaves the QR background transparent when selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, background: "transparent" });

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, baseStyle.size, baseStyle.size);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("composites a transparent QR in the supplied poster's center panel", async () => {
    const { canvas, context } = makeCanvas();
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
  });

  it("rounds QR modules when the rounded pattern is selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, pattern: "rounded" });

    expect(context.roundRect).toHaveBeenCalled();
    expect(context.rect).toHaveBeenCalled();
  });
});
