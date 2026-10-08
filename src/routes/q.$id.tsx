import { createFileRoute, redirect, Link } from '@tanstack/react-router';
import { resolveQR } from '@/lib/qr.functions';
export const Route = createFileRoute('/q/$id')({
  head: () => ({ meta: [{ title: 'QR link — Qraft' }, { name: 'description', content: 'Follow a dynamic Qraft QR link.' }, { property: 'og:title', content: 'QR link — Qraft' }, { property: 'og:description', content: 'Follow a dynamic Qraft QR link.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  loader: async ({ params }) => { const destination = await resolveQR({ data: { id: params.id } }); if (destination) throw redirect({ href: destination, statusCode: 302, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }); return null; },
  component: () => <main className="link-message"><h1>QR code not found</h1><Link to="/">Back to Qraft</Link></main>,
  errorComponent: () => <main className="link-message"><h1>This link is unavailable</h1><Link to="/">Back to Qraft</Link></main>,
  notFoundComponent: () => <main className="link-message"><h1>QR code not found</h1><Link to="/">Back to Qraft</Link></main>,
});
