import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?invite=${token}`);
  }

  const { error } = await supabase.rpc("accept_invitation", {
    invitation_token: token,
  });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md p-8 text-center space-y-3">
          <h1 className="text-xl font-semibold">Invitation invalid</h1>
          <p className="text-sm text-muted-foreground">
            This link is no longer valid. Please ask your coach to send a new one.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-md p-8 text-center space-y-3">
        <h1 className="text-xl font-semibold">You&apos;re connected</h1>
        <p className="text-sm text-muted-foreground">
          Open the ADPT app on your phone to get started.
        </p>
      </Card>
    </div>
  );
}
