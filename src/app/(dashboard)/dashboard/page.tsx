import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ClipboardCheck, MessageSquare, DollarSign, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch dashboard stats via RPC
  const { data: stats } = await supabase.rpc("get_coach_dashboard", {
    p_coach_id: user.id,
  });

  const dashboardStats: DashboardStats = stats ?? {
    active_clients: 0,
    pending_checkins: 0,
    unread_messages: 0,
    monthly_revenue_cents: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here&apos;s your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Clients"
          value={dashboardStats.active_clients}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Check-ins"
          value={dashboardStats.pending_checkins}
          icon={<ClipboardCheck className="h-6 w-6" />}
          variant={dashboardStats.pending_checkins > 0 ? "accent" : "default"}
        />
        <StatCard
          title="Unread Messages"
          value={dashboardStats.unread_messages}
          icon={<MessageSquare className="h-6 w-6" />}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(dashboardStats.monthly_revenue_cents)}
          icon={<DollarSign className="h-6 w-6" />}
          variant="success"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/clients">
          <Card className="border-border bg-card transition-colors hover:bg-card/80 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Add Client</p>
                <p className="text-sm text-muted-foreground">Invite a new client</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/check-ins">
          <Card className="border-border bg-card transition-colors hover:bg-card/80 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Review Check-ins</p>
                <p className="text-sm text-muted-foreground">
                  {dashboardStats.pending_checkins > 0
                    ? `${dashboardStats.pending_checkins} pending`
                    : "All caught up"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/programs">
          <Card className="border-border bg-card transition-colors hover:bg-card/80 cursor-pointer group">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">New Program</p>
                <p className="text-sm text-muted-foreground">Create a training plan</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity placeholder */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Activity feed coming soon. Check-in submissions, workout completions, and messages will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
