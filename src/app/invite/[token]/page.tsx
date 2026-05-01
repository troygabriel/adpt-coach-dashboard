import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ClientOnboardingForm } from "@/components/onboarding/client-onboarding-form";
import { SignInLinkForm } from "@/components/onboarding/sign-in-link-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("client_invitations")
    .select("id, email, status, expires_at, coach_id")
    .eq("token", token)
    .maybeSingle();

  const expired =
    !invitation ||
    (invitation.status === "expired") ||
    new Date(invitation.expires_at) < new Date();

  if (expired) {
    return (
      <Shell>
        <Card className="max-w-md space-y-2 p-8 text-center">
          <h1 className="text-xl font-semibold">Invitation invalid</h1>
          <p className="text-sm text-muted-foreground">
            This link has expired. Ask your coach to send a new one.
          </p>
        </Card>
      </Shell>
    );
  }

  const { data: coach } = await supabase
    .from("coaches")
    .select("display_name")
    .eq("id", invitation.coach_id)
    .maybeSingle();

  const coachName = coach?.display_name ?? "Your coach";

  if (invitation.status === "accepted") {
    return (
      <Shell>
        <Card className="max-w-md space-y-2 p-8 text-center">
          <h1 className="text-xl font-semibold">You&apos;re all set</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re connected to {coachName}. Open the ADPT app on your phone to get
            started — we&apos;ll email you when it&apos;s live.
          </p>
        </Card>
      </Shell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailMatches =
    user?.email?.toLowerCase() === invitation.email.toLowerCase();

  if (!user || !emailMatches) {
    return (
      <Shell>
        <SignInLinkForm email={invitation.email} token={token} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-xl">
        <ClientOnboardingForm
          token={token}
          email={invitation.email}
          coachName={coachName}
        />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-6 sm:p-12">
      {children}
    </div>
  );
}
