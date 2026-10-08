import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, ImagePlus, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QRStyle } from '@/lib/qr-render';

const presets = ['#161616', '#174b3a', '#164c9c', '#77354f', '#953e25', '#515056'];
const names = ['Black', 'Forest', 'Blue', 'Berry', 'Rust', 'Graphite'];
type Stop = 'start' | 'middle' | 'end';

export function QRColorTools({ style, setStyle }: { style: QRStyle; setStyle: Dispatch<SetStateAction<QRStyle>> }) {
  const [active, setActive] = useState<Stop>('start');
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState('');
  const [sample, setSample] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const position = useRef({ x: 0, y: 0 });
  const target = style.mode === 'solid' ? 'start' : active === 'middle' && !style.middle ? 'start' : active;
  const stops: Stop[] = style.mode === 'solid' ? ['start'] : style.middle ? ['start', 'middle', 'end'] : ['start', 'end'];
  function apply(color: string) { setStyle(previous => ({ ...previous, [target]: color })); }
  function pick(x: number, y: number) {
    const node = canvas.current;
    const context = node?.getContext('2d');
    if (!node || !context || !imageReady) return;
    const px = Math.max(0, Math.min(node.width - 1, Math.floor(x)));
    const py = Math.max(0, Math.min(node.height - 1, Math.floor(y)));
    position.current = { x: px, y: py };
    const pixel = context.getImageData(px, py, 1, 1).data;
    const color = '#' + Array.from(pixel.slice(0, 3), value => value.toString(16).padStart(2, '0')).join('');
    apply(color); setSample(color.toUpperCase());
  }
  async function loadImage(file?: File) {
    if (!file) return;
    const token = ++request.current;
    setImageError(''); setSample('');
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
      setImageError('Choose an image smaller than 20 MB.'); return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (token !== request.current) return;
        const node = canvas.current;
        const context = node?.getContext('2d', { willReadFrequently: true });
        if (!node || !context) throw new Error('Canvas unavailable');
        const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
        node.width = Math.max(1, Math.round(bitmap.width * scale));
        node.height = Math.max(1, Math.round(bitmap.height * scale));
        context.fillStyle = getComputedStyle(node).getPropertyValue('--background');
        context.fillRect(0, 0, node.width, node.height);
        context.drawImage(bitmap, 0, 0, node.width, node.height);
        position.current = { x: Math.floor(node.width / 2), y: Math.floor(node.height / 2) };
        setImageReady(true);
      } finally { bitmap.close(); }
    } catch { if (token === request.current) setImageError('This image could not be opened. Try a PNG, JPG or WebP.'); }
  }
  return <div className="qr-color-tools">
    <div className="style-top"><label>Color style</label><div className="segmented">
      <Button type="button" variant="ghost" aria-pressed={style.mode === 'solid'} className={style.mode === 'solid' ? 'segment selected' : 'segment'} onClick={() => setStyle(previous => ({ ...previous, mode: 'solid' }))}>Solid</Button>
      <Button type="button" variant="ghost" aria-pressed={style.mode === 'gradient'} className={style.mode === 'gradient' ? 'segment selected' : 'segment'} onClick={() => setStyle(previous => ({ ...previous, mode: 'gradient' }))}><Sparkles />Gradient</Button>
    </div></div>
    <div className="color-stops">
      {stops.map((stop, index) => <div className="color-stop" key={stop}>
        <label htmlFor={`qr-color-${stop}`}>{style.mode === 'solid' ? 'Color' : `Color ${index + 1}`}</label>
        <input id={`qr-color-${stop}`} aria-label={style.mode === 'solid' ? 'QR color' : `Gradient color ${index + 1}`} type="color" value={style[stop] || style.start} onFocus={() => setActive(stop)} onChange={event => { setActive(stop); setStyle(previous => ({ ...previous, [stop]: event.target.value })); }} />
      </div>)}
      {style.mode === 'gradient' && <Button type="button" variant="outline" size="icon" className="stop-toggle" title={style.middle ? 'Remove third color' : 'Add third color'} aria-label={style.middle ? 'Remove third color' : 'Add third color'} onClick={() => { setStyle(previous => ({ ...previous, middle: previous.middle ? undefined : '#77354f' })); setActive('start'); }}>{style.middle ? <X /> : <Plus />}</Button>}
    </div>
    <div className="palette-row">{presets.map((color, index) => <Button key={color} type="button" variant="ghost" className={`swatch swatch-${index} ${style[target] === color ? 'swatch-selected' : ''}`} aria-label={`Choose ${names[index]?.toLowerCase() || 'color'}`} title={names[index]} onClick={() => apply(color)}>{style[target] === color && <Check />}</Button>)}<span className="color-value">{(style[target] || style.start).toUpperCase()}</span></div>
    <div className="image-picker-toolbar">
      <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}><ImagePlus />{imageReady ? 'Replace image' : 'Pick from image'}</Button>
      {style.mode === 'gradient' && <select aria-label="Image color target" value={target} onChange={event => setActive(event.target.value as Stop)}>{stops.map((stop, index) => <option key={stop} value={stop}>Color {index + 1}</option>)}</select>}
      <input ref={fileInput} type="file" accept="image/*" aria-label="Upload color reference image" hidden onChange={event => { void loadImage(event.target.files?.[0]); event.target.value = ''; }} />
      {imageReady && <Button type="button" variant="ghost" size="icon" title="Remove image" aria-label="Remove image" onClick={() => { request.current++; setImageReady(false); setSample(''); setImageError(''); const node = canvas.current; if (node) { node.width = 0; node.height = 0; } }}><X /></Button>}
    </div>
    <canvas ref={canvas} hidden={!imageReady} className="color-reference-image" role="button" tabIndex={imageReady ? 0 : -1} aria-label="Pick color from image" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); pick((event.clientX - bounds.left) * event.currentTarget.width / bounds.width, (event.clientY - bounds.top) * event.currentTarget.height / bounds.height); }} onKeyDown={event => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const move = moves[event.key];
      if (move) { event.preventDefault(); pick(position.current.x + move[0], position.current.y + move[1]); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(position.current.x, position.current.y); }
    }} />
    {sample && <div className="sample-result" role="status">Picked {sample}</div>}
    {imageError && <p className="error-message" role="alert">{imageError}</p>}
  </div>;
}