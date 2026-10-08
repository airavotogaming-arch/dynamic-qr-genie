import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, CalendarDays, Clock, Grid2X2, Loader2, LockKeyhole, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQRAnalytics } from '@/lib/qr.functions';
import { analyticsSchema, type QRAnalytics } from '@/lib/qr-schema';

export const Route = createFileRoute('/dashboard')({
  head: () => ({ meta: [
    { title: 'Scan dashboard — Airavoto Qraf' },
    { name: 'description', content: 'Privately view scan counts and timestamped scan history for your dynamic Airavoto Qraf QR codes.' },
    { property: 'og:title', content: 'Scan dashboard — Airavoto Qraf' },
    { property: 'og:description', content: 'Password-protected scan activity for your dynamic QR codes.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: ScanDashboard,
});

function timestamp(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'No scans yet';
}

function ScanDashboard() {
  const analytics = useServerFn(getQRAnalytics);
  const [codes, setCodes] = useState<{ id: string; label: string }[]>([]);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [data, setData] = useState<QRAnalytics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('qraft-recent') || '[]');
      if (Array.isArray(saved)) setCodes(saved.filter((code): code is { id: string; label: string } => code && typeof code.id === 'string' && typeof code.label === 'string').map(code => ({ id: code.id, label: code.label })));
    } catch { /* Code references are optional; any code can be opened by its ID. */ }
    return () => { request.current++; };
  }, []);

  function lock(nextId = id) {
    request.current++;
    setId(nextId); setPassword(''); setData(null); setError(''); setBusy(false);
  }
  async function load(page = 0) {
    const codeId = id.trim().split('/').filter(Boolean).at(-1) || '';
    const parsed = analyticsSchema.safeParse({ id: codeId, password, page });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Check your code ID and password.'); return; }
    const current = ++request.current;
    setBusy(true); setError('');
    try {
      const result = await analytics({ data: parsed.data });
      if (request.current === current) { setData(result); setId(result.code.id); }
    } catch (e) {
      if (request.current === current) setError(e instanceof Error ? e.message : 'Scan history could not be loaded.');
    } finally { if (request.current === current) setBusy(false); }
  }

  return <div className="workspace">
    <aside className="sidebar">
      <Link to="/" className="brand"><QrCode strokeWidth={2.6} /><span>Airavoto Qraf</span></Link>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="side-nav" aria-label="Workspace">
        <Button asChild variant="ghost" className="side-item"><Link to="/"><Grid2X2 />QR generator</Link></Button>
        <Button asChild variant="ghost" className="side-item active"><Link to="/dashboard" aria-current="page"><BarChart3 />Scan dashboard<span className="nav-dot" /></Link></Button>
      </nav>
      <div className="sidebar-bottom"><div className="limit-label"><ShieldCheck /><span>Private by default</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Workspace<span>/</span><strong>Scan dashboard</strong></div><Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft />Generator</Link></Button></header>
      <main className="main-content analytics-content">
        <div className="page-heading"><div><div className="eyebrow"><span />AIRAVOTO QRAF ANALYTICS</div><h1>Scan dashboard</h1></div><span className="private-label"><ShieldCheck />Password protected</span></div>
        <section className="analytics-selector" aria-label="Choose a QR code">
          <div><label htmlFor="analytics-code-select">My QR codes</label><select id="analytics-code-select" value={codes.some(code => code.id === id) ? id : ''} onChange={e => lock(e.target.value)}><option value="">Choose a code or enter its ID</option>{codes.map(code => <option key={code.id} value={code.id}>{code.label || 'Untitled QR code'} · {code.id.slice(0, 8)}</option>)}</select></div>
          {data && <Button variant="outline" onClick={() => lock()}><LockKeyhole />Lock analytics</Button>}
        </section>
        {!data ? <section className="analytics-unlock" aria-labelledby="analytics-unlock-title">
          <div className="modal-icon"><LockKeyhole /></div><h2 id="analytics-unlock-title">Your code’s activity</h2>
          <form onSubmit={e => { e.preventDefault(); void load(); }}>
            <label htmlFor="analytics-id">Code ID or QR link</label><input id="analytics-id" value={id} onChange={e => setId(e.target.value)} placeholder="Paste your code ID or QR link" maxLength={2048} required disabled={busy} />
            <label htmlFor="analytics-password" className="label-spaced">Edit password</label><input id="analytics-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your private password" minLength={10} maxLength={64} required disabled={busy} />
            {error && <p className="error-message" role="alert">{error}</p>}
            <Button type="submit" className="modal-submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : <BarChart3 />}{busy ? 'Opening analytics…' : 'Unlock analytics'}<ArrowRight /></Button>
          </form>
        </section> : <>
          <section className="analytics-code-heading"><div><h2>{data.code.label || 'Untitled QR code'}</h2><p>{data.code.destination}</p><span>{data.code.id}</span></div><Button variant="outline" size="icon" aria-label="Refresh scan activity" title="Refresh scan activity" disabled={busy} onClick={() => void load(data.page)}><RefreshCw className={busy ? 'spin' : ''} /></Button></section>
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="analytics-stats">
            <article><BarChart3 /><span>Total scans</span><strong>{data.total.toLocaleString()}</strong></article>
            <article><CalendarDays /><span>Today · UTC</span><strong>{data.today.toLocaleString()}</strong></article>
            <article><Clock /><span>Last 7 days</span><strong>{data.week.toLocaleString()}</strong></article>
          </div>
          <section className="analytics-history" aria-labelledby="scan-history-title" aria-busy={busy}>
            <div className="recent-heading"><h2 id="scan-history-title">Scan history</h2><span>UTC</span></div>
            <p className="analytics-last">Last scan: {timestamp(data.lastScan)}</p>
            {data.scans.length === 0 ? <div className="empty-history"><QrCode /><span>{data.total ? 'No scans on this page.' : 'No scans yet.'}</span></div> : <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th scope="col">Scan</th><th scope="col">Date & time · UTC</th></tr></thead><tbody>{data.scans.map((scan, index) => <tr key={scan.id}><td>#{(data.total - data.page * 20 - index).toLocaleString()}</td><td><time dateTime={scan.scannedAt}>{timestamp(scan.scannedAt)}</time></td></tr>)}</tbody></table></div>}
            <div className="analytics-pagination"><span>{data.total === 0 ? '0 scans' : `${data.page * 20 + 1}–${Math.min((data.page + 1) * 20, data.total)} of ${data.total.toLocaleString()} scans`}</span><div><Button variant="outline" size="icon" aria-label="Previous scan page" title="Previous page" disabled={busy || data.page === 0} onClick={() => void load(data.page - 1)}><ArrowLeft /></Button><Button variant="outline" size="icon" aria-label="Next scan page" title="Next page" disabled={busy || (data.page + 1) * 20 >= data.total} onClick={() => void load(data.page + 1)}><ArrowRight /></Button></div></div>
          </section>
          <p className="analytics-note">Tracking began October 8, 2026. Counts include visits to the QR link, not unique people.</p>
        </>}
      </main>
    </div>
  </div>;
}