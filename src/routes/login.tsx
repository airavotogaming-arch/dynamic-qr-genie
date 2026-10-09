import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { loginAdmin } from "@/lib/site-auth.functions";

function safeReturnTo(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/";
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: safeReturnTo(search["returnTo"]),
  }),
  head: () => ({
    meta: [
      { title: "Admin sign in — Airavoto Qraf" },
      { name: "description", content: "Sign in to the private Airavoto Qraf studio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const authenticate = useServerFn(loginAdmin);
  const { returnTo } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authenticate({ data: { username, password, otp } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsername("");
      setPassword("");
      setOtp("");
      window.location.assign(returnTo);
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <a className="admin-login-brand" href="/login" aria-label="Airavoto Qraf sign in">
          <span className="admin-login-mark">
            <QrCode aria-hidden="true" />
          </span>
          <span>Airavoto Qraf</span>
        </a>
        <div className="admin-login-eyebrow">
          <ShieldCheck aria-hidden="true" />
          PRIVATE STUDIO
        </div>
        <h1 id="admin-login-title">Welcome back.</h1>
        <p className="admin-login-description">
          Sign in to create codes and manage your Qraf workspace.
        </p>

        <form className="admin-login-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="admin-username">Admin username</label>
          <input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter the admin username"
            maxLength={1024}
            required
            disabled={busy}
          />

          <label htmlFor="admin-password">Admin password</label>
          <div className="admin-login-input-wrap">
            <LockKeyhole aria-hidden="true" />
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter the studio password"
              maxLength={1024}
              required
              disabled={busy}
            />
          </div>

          <label htmlFor="admin-otp">One-time code</label>
          <input
            id="admin-otp"
            className="admin-login-otp"
            type="text"
            autoComplete="one-time-code"
            maxLength={1024}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="Enter your one-time code"
            required
            disabled={busy}
          />
          <p className="admin-login-note">
            Enter the private one-time code configured for this studio in Render.
          </p>

          {error && (
            <p className="admin-login-error" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="admin-login-submit"
            disabled={busy || !username || !password || !otp}
          >
            {busy ? <Loader2 className="spin" /> : <LockKeyhole />}
            {busy ? "Signing in…" : "Sign in to Qraf"}
            {!busy && <ArrowRight />}
          </Button>
        </form>
        <p className="admin-login-footer">
          <ShieldCheck aria-hidden="true" /> Visitors scanning existing QR codes do not need to sign
          in.
        </p>
      </section>
    </main>
  );
}
