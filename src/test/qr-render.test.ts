import { describe, expect, it, vi } from "vitest";
import { renderQR, type QRStyle } from "@/lib/qr-render";

function makeCanvas() {
  const addColorStop = vi.fn();
  const context = {
    addColorStop,
    clearRect: vi.fn(),
    createLinearGradient: () => ({ addColorStop }),
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
  start: "#161616",
  middle: "#77354f",
  end: "#164c9c",
  pattern: "square",
  background: "white",
  size: 1024,
};

describe("QR rendering", () => {
  it.each([512, 640, 1024])("uses the middle stop in %i px previews and exports", async (size) => {
    const { canvas, context, addColorStop } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, size });

    expect(addColorStop.mock.calls).toEqual([
      [0, baseStyle.start],
      [0.5, baseStyle.middle],
      [1, baseStyle.end],
    ]);
    expect(canvas.width).toBe(size);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, size, size);

    addColorStop.mockClear();
    await renderQR(canvas, "https://example.com", { ...baseStyle, middle: undefined });
    expect(addColorStop.mock.calls).toEqual([
      [0, baseStyle.start],
      [1, baseStyle.end],
    ]);
  });

  it("leaves the PNG background transparent when selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, background: "transparent" });

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, baseStyle.size, baseStyle.size);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("rounds QR modules when the rounded pattern is selected", async () => {
    const { canvas, context } = makeCanvas();
    await renderQR(canvas, "https://example.com", { ...baseStyle, pattern: "rounded" });

    expect(context.roundRect).toHaveBeenCalled();
    expect(context.rect).toHaveBeenCalled();
  });
});
