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
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            This dashboard is for coaches only. Please use the ADPT mobile app.
          </p>
        </div>
      </div>
    );
  }

  // Get or create coach profile
  let { data: coach } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!coach) {
    // Auto-create coaches row (trigger may have failed or user was set to coach manually)
    await supabase.from("coaches").insert({
      id: user.id,
      display_name: profile.first_name || user.email || "Coach",
      is_accepting_clients: true,
    });

    const { data: created } = await supabase
      .from("coaches")
      .select("*")
      .eq("id", user.id)
      .single();

    coach = created;
  }

  return <DashboardShell coach={coach as Coach | null}>{children}</DashboardShell>;
}
