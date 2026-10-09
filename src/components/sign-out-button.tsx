import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/site-auth.functions";

export function SignOutButton() {
  const signOut = useServerFn(logoutAdmin);
  const [busy, setBusy] = useState(false);

  async function leaveStudio() {
    setBusy(true);
    try {
      await signOut();
      window.location.assign("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void leaveStudio()}
      disabled={busy}
    >
      <LogOut aria-hidden="true" />
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}
