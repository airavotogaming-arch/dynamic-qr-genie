<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep QR destination records private and expose only narrowly scoped password-verified database functions; editing uses per-code credentials, not app user accounts.
- Use a fixed public deployment origin in generated QR URLs so printed codes do not depend on the visitor's current preview host.
- Render QR matrices with the qrcode library in browser canvases; styling and PNG exports must share one renderer for consistent output.
- Store only code references in browser history, never passwords; Cloud is the source of truth for destinations.
- Sample uploaded images locally in a browser canvas without storing or uploading them; image color picking does not need Cloud access.
- Resolve scan destinations freshly in the public scan route, then redirect after a brief client-side interstitial; never cache destinations and provide a direct continuation link.
