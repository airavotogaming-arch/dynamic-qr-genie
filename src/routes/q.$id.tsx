import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ArrowUpRight, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveQR } from '@/lib/qr.functions';
export const Route = createFileRoute('/q/$id')({
  head: () => ({ meta: [{ title: 'QR link — Qraft' }, { name: 'description', content: 'Follow a dynamic Qraft QR link.' }, { property: 'og:title', content: 'QR link — Qraft' }, { property: 'og:description', content: 'Follow a dynamic Qraft QR link.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  headers: () => ({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }),
  loader: ({ params }) => resolveQR({ data: { id: params.id } }),
  staleTime: 0,
  gcTime: 0,
  component: ScanThanks,
  errorComponent: () => <main className="link-message"><h1>This link is unavailable</h1><Link to="/">Back to Qraft</Link></main>,
  notFoundComponent: () => <main className="link-message"><h1>QR code not found</h1><Link to="/">Back to Qraft</Link></main>,
});

function ScanThanks() {
  const destination = Route.useLoaderData();
  useEffect(() => {
    if (!destination) return;
    const timer = window.setTimeout(() => window.location.replace(destination), 2200);
    return () => window.clearTimeout(timer);
  }, [destination]);
  if (!destination) return <main className="link-message"><h1>QR code not found</h1><Link to="/">Back to Qraft</Link></main>;
  return <main className="scan-thanks">
    <div className="scan-brand"><QrCode /><span>qraft.</span></div>
    <div className="scan-message"><span className="scan-eyebrow">CONNECTION MADE</span><h1 aria-label="Thanks for scanning"><span>Thanks for</span><span>scanning<span className="scan-period">.</span></span></h1><div className="scan-progress" aria-hidden="true"><span /></div></div>
    <Button asChild variant="link" className="scan-continue"><a href={destination} rel="noreferrer">Continue to destination<ArrowUpRight /></a></Button>
  </main>;
}
