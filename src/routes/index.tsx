import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, Eye, EyeOff, Grid2X2, ImagePlus, Infinity as InfinityIcon, Link2, LockKeyhole, Palette, Plus, QrCode, Settings2, ShieldCheck, Sparkles, X, Loader2, Pencil, CircleHelp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRPreview } from '@/components/qr-preview';
import { QRColorTools } from '@/components/qr-color-tools';
import { PosterPlacementControls } from '@/components/poster-placement-controls';
import { SignOutButton } from '@/components/sign-out-button';
import { createQR, manageQR } from '@/lib/qr.functions';
import { createSchema, manageSchema, type QRRecord } from '@/lib/qr-schema';
import { AIRAVOTO_POSTER_DIMENSIONS, AIRAVOTO_POSTER_SRC, DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT, DEFAULT_GRADIENT_COLORS, loadAiravotoPoster, normalizePosterQRPlacement, POSTER_EXPORT_SCALE, POSTER_QR_LEGACY_MIN_SIZE, POSTER_QR_SIZE_BOUNDS, renderQR, type QRPlacement, type QRStyle } from '@/lib/qr-render';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Airavoto Qraf — Dynamic QR Code Studio' }, { name: 'description', content: 'Create custom gradient QR codes, download high-resolution PNGs, and securely update destinations with your private password.' }, { property: 'og:title', content: 'Airavoto Qraf — Dynamic QR Code Studio' }, { property: 'og:description', content: 'Beautiful QR codes. Changeable links. Password-protected control.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: QRStudio,
});
const initialStyle: QRStyle = { mode: 'gradient', colors: [...DEFAULT_GRADIENT_COLORS], pattern: 'square', background: 'white', size: 1024 };
type SavedQRRecord = QRRecord & { style?: QRStyle; poster?: boolean; posterPlacement?: QRPlacement };
function isQRStyle(value: unknown): value is QRStyle {
  if (!value || typeof value !== 'object') return false;
  const style = value as Partial<QRStyle>;
  return (style.mode === 'solid' || style.mode === 'gradient') && Array.isArray(style.colors) && style.colors.length >= 2 && style.colors.length <= 5 && style.colors.every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) && ['square', 'rounded', 'dots'].includes(style.pattern || '') && ['white', 'transparent'].includes(style.background || '') && [512, 1024, 2048, 4096].includes(style.size || 0);
}
function isQRPlacement(value: unknown): value is QRPlacement {
  if (!value || typeof value !== 'object') return false;
  const placement = value as { x?: unknown; y?: unknown; size?: unknown };
  return typeof placement.x === 'number' && Number.isInteger(placement.x) && placement.x >= 0 && placement.x <= AIRAVOTO_POSTER_DIMENSIONS.width - POSTER_QR_LEGACY_MIN_SIZE && typeof placement.y === 'number' && Number.isInteger(placement.y) && placement.y >= 0 && placement.y <= AIRAVOTO_POSTER_DIMENSIONS.height - POSTER_QR_LEGACY_MIN_SIZE && typeof placement.size === 'number' && Number.isInteger(placement.size) && placement.size >= POSTER_QR_LEGACY_MIN_SIZE && placement.size <= POSTER_QR_SIZE_BOUNDS.max && placement.x + placement.size <= AIRAVOTO_POSTER_DIMENSIONS.width && placement.y + placement.size <= AIRAVOTO_POSTER_DIMENSIONS.height;
}
function isSavedQRRecord(value: unknown): value is SavedQRRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedQRRecord>;
  return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.destination === 'string' && (item.style === undefined || isQRStyle(item.style)) && (item.poster === undefined || typeof item.poster === 'boolean') && (item.posterPlacement === undefined || isQRPlacement(item.posterPlacement));
}
function cloneStyle(style: QRStyle): QRStyle { return { ...style, colors: [...style.colors] }; }
function QRStudio() {
  const create = useServerFn(createQR), manage = useServerFn(manageQR);
  const [destination, setDestination] = useState('');
  const [label, setLabel] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [style, setStyle] = useState<QRStyle>(initialStyle);
  const [record, setRecord] = useState<QRRecord | null>(null);
  const [recent, setRecent] = useState<SavedQRRecord[]>([]);
  const [usePoster, setUsePoster] = useState(false);
  const [posterPlacement, setPosterPlacement] = useState<QRPlacement>(() => ({ ...DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT }));
  const [origin, setOrigin] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'manage' | 'help' | null>(null);
  const [editId, setEditId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [dialogError, setDialogError] = useState('');
  useEffect(() => {
    // A fixed public origin keeps printed QR codes stable when previewing on another device.
    setOrigin(window.location.hostname === 'localhost' ? window.location.origin : 'https://dynamic-qr-genie.onrender.com');
    try { const saved = JSON.parse(localStorage.getItem('qraft-recent') || '[]'); if (Array.isArray(saved)) setRecent(saved.filter(isSavedQRRecord)); } catch { /* empty history */ }
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (!dialog) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDialog(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [dialog]);
  const qrValue = record ? `${origin}/q/${record.id}` : (destination || 'https://example.com');
  const previewStyle = useMemo(() => ({ ...style, size: 640 }), [style]);
  function remember(item: QRRecord, design?: { style: QRStyle; poster: boolean; placement: QRPlacement }) {
    const existing = recent.find(r => r.id === item.id);
    const saved: SavedQRRecord = {
      ...item,
      ...(design?.style ? { style: cloneStyle(design.style) } : existing?.style ? { style: cloneStyle(existing.style) } : {}),
      poster: design?.poster ?? existing?.poster ?? false,
      posterPlacement: design?.placement ? { ...design.placement } : existing?.posterPlacement ? { ...existing.posterPlacement } : { ...DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT },
    };
    const next = [saved, ...recent.filter(r => r.id !== item.id)];
    setRecent(next);
    localStorage.setItem('qraft-recent', JSON.stringify(next));
  }
  function applyPosterPlacement(placement: QRPlacement) {
    setPosterPlacement(placement);
    if (record) remember(record, { style: cloneStyle(style), poster: usePoster, placement });
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const parsed = createSchema.safeParse({ destination, label, password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Please check your details.'); return; }
    setBusy(true);
    try { const result = await create({ data: parsed.data }); setRecord(result); remember(result, { style: cloneStyle(style), poster: usePoster, placement: { ...posterPlacement } }); setPassword(''); setNotice('Your dynamic QR code is ready.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Your code could not be created.'); }
    finally { setBusy(false); }
  }
  function reset() { setRecord(null); setDestination(''); setLabel(''); setPassword(''); setError(''); }
  function openManage(id = '') { setEditId(id); setEditPassword(''); setEditUrl(''); setUnlocked(false); setDialogError(''); setDialog('manage'); }
  async function edit(event: React.FormEvent) {
    event.preventDefault(); setDialogError('');
    const id = editId.trim().split('/').filter(Boolean).at(-1) || '';
    const parsed = manageSchema.safeParse({ id, password: editPassword, ...(unlocked ? { destination: editUrl } : {}) });
    if (!parsed.success) { setDialogError(parsed.error.issues[0]?.message || 'Check your details.'); return; }
    setBusy(true);
    try {
      const result = await manage({ data: parsed.data });
      if (!unlocked) { setEditUrl(result.destination); setEditId(result.id); setUnlocked(true); }
      else { remember(result); if (record?.id === result.id) { setRecord(result); setDestination(result.destination); } setDialog(null); setEditPassword(''); setNotice('Destination updated. Your QR code stays the same.'); }
    } catch (e) { setDialogError(e instanceof Error ? e.message : 'Unable to open this code.'); }
    finally { setBusy(false); }
  }
  async function exportPNG(value: string, filename: string, selectedStyle: QRStyle, poster: boolean, placement: QRPlacement) {
    const canvas = document.createElement('canvas');
    const image = poster ? await loadAiravotoPoster() : undefined;
    const outputStyle = { ...selectedStyle, background: poster ? 'transparent' as const : selectedStyle.background };
    await renderQR(canvas, value, outputStyle, image, placement, poster ? POSTER_EXPORT_SCALE : 1);
    const anchor = document.createElement('a');
    anchor.download = `${filename}${poster ? '-poster' : ''}.png`;
    anchor.href = canvas.toDataURL('image/png');
    anchor.click();
  }
  async function download() {
    if (!record) return;
    try {
      const outputStyle = { ...style, background: usePoster ? 'transparent' as const : style.background };
      remember(record, { style: outputStyle, poster: usePoster, placement: { ...posterPlacement } });
      await exportPNG(qrValue, (record.label || 'airavoto-qraf').replace(/[^a-z0-9-_]/gi, '-'), outputStyle, usePoster, posterPlacement);
      setNotice(usePoster ? 'Poster PNG downloaded.' : 'QR PNG downloaded.');
    } catch {
      setNotice('The PNG could not be downloaded. Please try again.');
    }
  }
  async function downloadAgain(item: SavedQRRecord) {
    try {
      const savedStyle = cloneStyle(item.style ?? initialStyle);
      const poster = item.poster === true;
      const outputStyle = { ...savedStyle, background: poster ? 'transparent' as const : savedStyle.background };
      const publicOrigin = origin || window.location.origin;
      await exportPNG(`${publicOrigin}/q/${item.id}`, (item.label || 'airavoto-qraf').replace(/[^a-z0-9-_]/gi, '-'), outputStyle, poster, item.posterPlacement ?? DEFAULT_AIRAVOTO_POSTER_QR_PLACEMENT);
      setNotice(poster ? 'Poster PNG downloaded again.' : 'QR PNG downloaded again.');
    } catch {
      setNotice('The saved QR image could not be downloaded. Please try again.');
    }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); } catch { setNotice('Copy unavailable. Select and copy the link instead.'); } }
  return <div className="workspace">
    <aside className="sidebar">
      <a href="/" className="brand"><QrCode strokeWidth={2.6} /><span>Airavoto Qraf</span></a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="side-nav" aria-label="Workspace">
        <Button variant="ghost" className="side-item active" onClick={() => { reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Grid2X2 />QR generator <span className="nav-dot" /></Button>
        <Button variant="ghost" className="side-item" onClick={() => document.getElementById('recent-codes')?.scrollIntoView({ behavior: 'smooth' })}><QrCode />My QR codes<span className="nav-count">{recent.length}</span></Button>
        <Button variant="ghost" className="side-item" onClick={() => openManage()}><LockKeyhole />Manage a code<ArrowUpRight className="nav-arrow" /></Button>
        <Button asChild variant="ghost" className="side-item"><Link to="/dashboard"><BarChart3 />Scan dashboard</Link></Button>
      </nav>
      <div className="sidebar-bottom"><div className="limit-label"><InfinityIcon /><span>Unlimited by design</span></div><p>Your next idea deserves a code.</p><div className="sidebar-rule" /><Button variant="ghost" className="side-item" onClick={() => setDialog('help')}><CircleHelp />Help & answers<ArrowUpRight className="nav-arrow" /></Button><div className="profile"><div className="profile-icon">Q</div><div><strong>Personal workspace</strong><span>Made for your next idea</span></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>QR generator</strong></div><div className="topbar-right"><span className="private-label"><ShieldCheck />Private by default</span><Button variant="outline" size="sm" onClick={() => openManage()}><LockKeyhole />Manage code</Button><SignOutButton /></div></header>
      <main className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><span />THE QR CODE STUDIO</div><h1>Small code. Endless possibilities.</h1><p>A beautiful connection to wherever you want to go.</p></div><span className="dynamic-badge"><span />DYNAMIC QR</span></div>
        <div className="studio-grid">
          <section className="editor" aria-label="QR code editor">
            <div className="editor-tabs"><span className="selected"><Link2 />Website URL</span><span className="tab-note"><InfinityIcon />No limits. Just links.</span></div>
            <form onSubmit={generate}>
              <div className="form-section"><div className="section-heading"><span className="step">01</span><h2>Make the connection</h2><Link2 className="section-symbol" /></div><label htmlFor="destination">Destination URL <span className="required">*</span></label><div className="icon-input"><Link2 /><input id="destination" type="url" placeholder="https://your-website.com" maxLength={2048} value={destination} onChange={e => setDestination(e.target.value)} disabled={!!record} required /></div><div className="field-note">{record ? 'Edit the destination from Manage code.' : 'The destination can change. Your QR code won’t.'}</div><label htmlFor="code-name" className="label-spaced">Code name <span className="optional">Optional</span></label><input id="code-name" placeholder="Give your code a name" maxLength={80} value={label} onChange={e => setLabel(e.target.value)} disabled={!!record} /></div>
              <div className="form-section"><div className="section-heading"><span className="step">02</span><h2>A little more you</h2><Palette className="section-symbol" /></div><QRColorTools style={style} setStyle={setStyle} />{!usePoster && <p className="field-note qr-contrast-note">Bright colors are automatically darkened on white backgrounds for scan contrast; the poster preserves your full gradient.</p>}<div className="pattern-heading"><label>Pattern</label><span className="field-note">The details make it yours.</span></div><div className="pattern-options">{(['square', 'rounded', 'dots'] as const).map(pattern => <Button key={pattern} type="button" variant="outline" className={`pattern-option ${style.pattern === pattern ? 'selected' : ''}`} onClick={() => setStyle({ ...style, pattern })}><span className={`pattern-icon ${pattern}`}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span><span>{pattern.charAt(0).toUpperCase() + pattern.slice(1)}</span>{style.pattern === pattern && <Check className="pattern-check" />}</Button>)}</div><div className="poster-template"><img src={AIRAVOTO_POSTER_SRC} alt="Airavoto Gaming poster with an empty QR panel" loading="lazy" /><div className="poster-template-copy"><strong>Airavoto Gaming poster</strong><span>Place a transparent QR in the empty center panel.</span><Button type="button" variant={usePoster ? 'default' : 'outline'} aria-pressed={usePoster} onClick={() => { const selected = !usePoster; setUsePoster(selected); setStyle(previous => ({ ...previous, background: selected ? 'transparent' : 'white' })); }}><ImagePlus />{usePoster ? 'Remove poster' : 'Use this poster'}</Button></div></div>{usePoster && <PosterPlacementControls placement={posterPlacement} onChange={applyPosterPlacement} />}<div className="pattern-heading"><label>QR background</label><span className="field-note">{usePoster ? 'Transparent for the selected poster.' : 'Choose the poster to enable transparency.'}</span></div><div className="pattern-options background-options">{(['white', 'transparent'] as const).map(background => <Button key={background} type="button" variant="outline" aria-pressed={style.background === background} disabled={background === 'white' ? usePoster : !usePoster} className={`pattern-option ${style.background === background ? 'selected' : ''}`} onClick={() => setStyle(previous => ({ ...previous, background }))}><span>{background === 'white' ? 'White' : 'Transparent'}</span>{style.background === background && <Check className="pattern-check" />}</Button>)}</div></div>
              <div className="form-section security-section"><div className="section-heading"><span className="step">03</span><h2>Keep it in your hands</h2><LockKeyhole className="section-symbol" /></div>{record ? <div className="protected-success"><ShieldCheck /><div><strong>Password protected</strong><span>Keep your password and code ID safe.</span></div><Button type="button" variant="ghost" size="sm" onClick={() => openManage(record.id)}>Edit link<ArrowRight /></Button></div> : <><label htmlFor="edit-password">Edit password <span className="required">*</span><span className="label-tail"><LockKeyhole />Only you</span></label><div className="password-input"><input id="edit-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a private password" minLength={10} maxLength={64} value={password} onChange={e => setPassword(e.target.value)} required /><Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div><div className="field-note">At least 10 characters. Keep it safe — it can’t be recovered.</div></>}{error && <p className="error-message" role="alert">{error}</p>}<Button className="generate-button" type={record ? 'button' : 'submit'} disabled={busy} onClick={record ? reset : undefined}>{busy ? <Loader2 className="spin" /> : record ? <Plus /> : <QrCode />}{busy ? 'Creating your code…' : record ? 'Create another QR code' : 'Generate QR code'}<ArrowRight className="button-arrow" /></Button><div className="generate-note"><ShieldCheck />Password protected<span>·</span><InfinityIcon />Unlimited codes</div></div>
            </form>
          </section>
          <section className="preview-panel" aria-label="QR preview and export"><div className="preview-heading"><h2>Looking good.</h2><span><span />LIVE PREVIEW</span></div><div className={`preview-stage ${usePoster ? 'poster-preview-stage' : ''}`}><div className="preview-cross top-left" /><div className="preview-cross top-right" /><div className="preview-cross bottom-left" /><div className="preview-cross bottom-right" /><div className={`qr-paper ${usePoster ? 'poster' : style.background === 'transparent' ? 'transparent' : ''}`}><QRPreview value={qrValue} style={previewStyle} poster={usePoster} placement={posterPlacement} /></div></div><div className="preview-caption"><span className="mini-qr"><QrCode /></span><div><strong>{record ? (record.label || 'Your dynamic QR code') : 'Your next connection'}</strong><span>{record ? 'Ready for the real world' : 'Made to stand out. Built to scan.'}</span></div></div><div className="export-settings"><div><label>{usePoster ? 'Poster size' : 'Export size'}</label>{usePoster ? <div className="format-value">{AIRAVOTO_POSTER_DIMENSIONS.width * POSTER_EXPORT_SCALE} × {AIRAVOTO_POSTER_DIMENSIONS.height * POSTER_EXPORT_SCALE} px<span>2× export for a sharper QR</span></div> : <div className="select-wrap"><select id="export-size" value={style.size} onChange={e => setStyle({ ...style, size: Number(e.target.value) })}><option value={512}>512 × 512 px</option><option value={1024}>1024 × 1024 px</option><option value={2048}>2048 × 2048 px</option><option value={4096}>4096 × 4096 px</option></select><ChevronDown /></div>}</div><div><label>File format</label><div className="format-value">PNG<span>High quality</span></div></div></div><Button variant="outline" className="download-button" onClick={download} disabled={!record}><ArrowDownToLine />{usePoster ? 'Download poster PNG' : 'Download QR PNG'}<ArrowDownToLine className="download-tail" /></Button><div className="export-note">{record ? 'Ready to print, share, or put anywhere.' : 'Generate your code to unlock the download.'}</div>{record && <div className="saved-code"><span>YOUR PERMANENT QR LINK</span><div><input readOnly value={qrValue} aria-label="Permanent QR link" /><Button variant="ghost" size="icon" title="Copy permanent link" aria-label="Copy permanent link" onClick={() => copy(qrValue)}><Copy /></Button></div><Button variant="link" onClick={() => copy(record.id)}><Copy />Copy code ID for future editing</Button></div>}<div className="preview-footer"><LockKeyhole /><p>Your link is flexible.<br /><strong>Your code is forever yours.</strong></p><ArrowUpRight /></div></section>
        </div>
        <div className="promise-row"><div><Link2 /><span><strong>One code, any destination</strong><small>Change the link. Keep the code.</small></span></div><div><ShieldCheck /><span><strong>Your password. Your control.</strong><small>No one else gets to edit your link.</small></span></div><div><InfinityIcon /><span><strong>Create without limits</strong><small>As many ideas as you have.</small></span></div></div>
        <section className="recent-section" id="recent-codes"><div className="recent-heading"><h2>My QR codes <span>{recent.length}</span></h2><span>On this device</span></div>{recent.length === 0 ? <div className="empty-history"><QrCode /><span>Your collection starts with your first code.</span><span>Go make a connection <ArrowUpRight /></span></div> : <div className="recent-list">{recent.map(item => <div className="recent-item" key={item.id}><span className="recent-icon"><QrCode /></span><div><strong>{item.label || 'Untitled QR code'}</strong><span>{item.destination}</span></div><span className="status-label"><span />Active</span><Button variant="ghost" size="icon" aria-label={`Copy ID for ${item.label || 'Untitled QR code'}`} title="Copy code ID" onClick={() => copy(item.id)}><Copy /></Button><Button variant="outline" size="sm" onClick={() => void downloadAgain(item)}><ArrowDownToLine />Download again</Button><Button variant="outline" size="sm" onClick={() => openManage(item.id)}><Pencil />Edit link</Button></div>)}</div>}</section>
        <footer className="page-footer"><span>Less friction. More connection.</span><span>POWERED BY AIRAVOTO QRAF <QrCode /></span></footer>
      </main>
    </div>
    {notice && <div className="notice" role="status"><Check />{notice}</div>}
    {dialog && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal"><Button variant="ghost" size="icon" className="modal-close" aria-label="Close dialog" onClick={() => setDialog(null)}><X /></Button><div className="modal-icon">{dialog === 'help' ? <CircleHelp /> : <LockKeyhole />}</div><h2 id="dialog-title">{dialog === 'help' ? 'A few good answers.' : unlocked ? 'A new destination.' : 'Your code. Your control.'}</h2>{dialog === 'help' ? <div className="help-content"><h3>What makes a QR code dynamic?</h3><p>Your code points to a permanent Airavoto Qraf link. Change its destination anytime without reprinting the code.</p><h3>Who can edit my destination?</h3><p>Anyone with your code ID and private edit password. Keep the password secret; it can’t be recovered.</p><h3>Where are my codes saved?</h3><p>Your links are saved securely in Cloud. The list remembers codes created on this device. Use a code ID and password to manage one from any device.</p><h3>Are there generation limits?</h3><p>No app-imposed code limit. Hosting and storage depend on available Cloud resources.</p><h3>Can I use my code now?</h3><p>Preview links work for testing. Publish the app before distributing permanent printed codes.</p></div> : <form onSubmit={edit}><p className="modal-description">{unlocked ? 'The printed QR code stays exactly the same.' : 'Enter your code ID and the password you created.'}</p>{!unlocked && <><label htmlFor="manage-id">Code ID or QR link</label><input autoFocus id="manage-id" maxLength={2048} value={editId} onChange={e => setEditId(e.target.value)} placeholder="Paste your code ID or QR link" required /><label htmlFor="manage-password" className="label-spaced">Edit password</label><input id="manage-password" type="password" autoComplete="current-password" minLength={10} maxLength={64} value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Your private password" required /></>}{unlocked && <><label htmlFor="new-destination">New destination URL</label><input autoFocus id="new-destination" type="url" maxLength={2048} value={editUrl} onChange={e => setEditUrl(e.target.value)} required /></>}{dialogError && <p className="error-message" role="alert">{dialogError}</p>}<Button type="submit" className="modal-submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : unlocked ? <Check /> : <LockKeyhole />}{busy ? 'Please wait…' : unlocked ? 'Save destination' : 'Unlock code'}<ArrowRight /></Button></form>}</section></div>}
  </div>;
}
