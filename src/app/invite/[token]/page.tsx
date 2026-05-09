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
        <Card className="max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">You&apos;re all set</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re connected to {coachName}. Install the ADPT app on
            your phone to start training, log workouts, and message your
            coach.
          </p>
          {/* TestFlight link — replace with App Store URL once live. */}
          <a
            href="https://testflight.apple.com/join/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Install ADPT for iOS
          </a>
          <p className="text-xs text-muted-foreground">
            Sign in with the same email and password you just set.
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
