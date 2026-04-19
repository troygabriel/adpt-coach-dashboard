import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Coach } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            This dashboard is for coaches only. Please use the ADPT mobile app.
          </p>
        </div>
      </div>
    );
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .single();

  return <DashboardShell coach={coach as Coach | null}>{children}</DashboardShell>;
}
