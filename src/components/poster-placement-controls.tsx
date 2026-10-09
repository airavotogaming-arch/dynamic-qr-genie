import { Button } from "@/components/ui/button";
import {
  AIRAVOTO_POSTER_DIMENSIONS,
  DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT,
  normalizePosterQRPlacement,
  POSTER_QR_SIZE_BOUNDS,
  type QRPlacement,
} from "@/lib/qr-render";

type Props = {
  placement: QRPlacement;
  onChange: (placement: QRPlacement) => void;
};

export function PosterPlacementControls({ placement, onChange }: Props) {
  const controls = [
    {
      key: "x" as const,
      label: "X position",
      min: 0,
      max: AIRAVOTO_POSTER_DIMENSIONS.width - placement.size,
    },
    {
      key: "y" as const,
      label: "Y position",
      min: 0,
      max: AIRAVOTO_POSTER_DIMENSIONS.height - placement.size,
    },
    {
      key: "size" as const,
      label: "QR size",
      min: POSTER_QR_SIZE_BOUNDS.min,
      max: POSTER_QR_SIZE_BOUNDS.max,
    },
  ];

  function update(key: keyof QRPlacement, value: number) {
    onChange(normalizePosterQRPlacement({ ...placement, [key]: value }));
  }

  return (
    <section className="poster-placement-controls" aria-label="Poster QR placement controls">
      <div className="poster-placement-heading">
        <div>
          <strong>Adjust QR placement</strong>
          <p>Move or resize the QR; the preview updates live.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT })}
        >
          Reset
        </Button>
      </div>
      {controls.map(({ key, label, min, max }) => (
        <div className="poster-placement-row" key={key}>
          <label htmlFor={`poster-placement-${key}`}>{label}</label>
          <output htmlFor={`poster-placement-${key}`}>{placement[key]} px</output>
          <input
            id={`poster-placement-${key}`}
            type="range"
            min={min}
            max={max}
            step={1}
            value={placement[key]}
            onChange={(event) => update(key, Number(event.currentTarget.value))}
          />
        </div>
      ))}
      <p className="poster-placement-footnote">
        Coordinates use the 1024 × 1536 poster; keep the QR at least 240 px for reliable scanning.
        Downloads are 2×.
      </p>
    </section>
  );
}
