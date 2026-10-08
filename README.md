# Dynamic QR Genie

Dynamic QR codes with password-protected destination updates, anonymous scan counts, and per-code scan history.

## Privacy and access

- Anyone can scan a QR code and continue to its destination; **scanners do not need a password**.
- The code owner must enter the per-code password to view/change its destination or unlock its scan dashboard.
- Scan records contain only the QR code reference, a unique event ID, and a timestamp. IP addresses and user agents are not stored.
- A short interstitial records a scan only after the QR page renders, then redirects to the current destination.

## Neon and Render

The app connects to Neon from server-side code only. The `DATABASE_URL` secret must be configured in Render; do not expose it as a `VITE_` variable or commit it to source control. The schema is in `drizzle/migrations/0002_neon_qr_schema.sql`.

Recommended Render configuration:

- **Build command:** `bun install && NITRO_PRESET=node-server bun run build`
- **Start command:** `node .output/server/index.mjs`
- **Environment:** `DATABASE_URL` (Neon connection string)

Generated QR links use the fixed public Render origin `https://dynamic-qr-genie.onrender.com` so preview hosts do not change printed codes.

## Development

```sh
bun install
bun run dev
```

For a production-style local build and server:

```sh
NITRO_PRESET=node-server bun run build
node .output/server/index.mjs
```

Set `DATABASE_URL` in the server environment before creating codes or using scan analytics.

## Tests

```sh
bun test
bunx tsc --noEmit
```
