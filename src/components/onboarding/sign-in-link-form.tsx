/**
 * Recovery card shown when a client lands on /invite/<token> without a
 * session — usually because their browser dropped the cookie between the
 * Supabase verify redirect and our /api/auth/callback exchange (mobile
 * private-mode browsers, ITP).
 *
 * Old behavior: triggered another signInWithOtp, which immediately
 * rate-limited because Supabase had just sent the invite email seconds
 * earlier. New behavior: explain what happened and ask them to tap the
 * email link again. No additional auth calls — never rate-limits.
 */

import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

// Props shape kept compatible with the existing call site so the page
// doesn't need to change. `token` is unused now but declared for stability.
export function SignInLinkForm({
  email,
}: {
  email: string;
  token: string;
}) {
  return (
    <Card className="max-w-md space-y-4 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Mail className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Almost there</h1>
        <p className="text-sm text-muted-foreground">
          Open your invite email at{" "}
          <span className="font-mono">{email}</span> and tap{" "}
          <span className="font-medium text-foreground">Accept the invite</span>{" "}
          again. Your session timed out before this page could finish
          loading.
        </p>
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        If it keeps bouncing back, open the email on desktop instead —
        some mobile browsers (especially in private mode) drop the auth
        cookie between the redirect and this page. Or ask your coach to
        send a fresh invite.
      </div>
    </Card>
  );
}
