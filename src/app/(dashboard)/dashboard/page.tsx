import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCoachHomeData } from "@/lib/coach-home";
import { StatLine } from "@/components/patterns/stat-line";
import { NeedsAttentionBuckets } from "@/components/dashboard/needs-attention-buckets";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const data = await getCoachHomeData(user.id);
  const firstName = data.coachName?.split(" ")[0] ?? "Coach";
  const isEmpty = data.stats.activeClients === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEmpty
              ? "Add your first client to get started."
              : "Here's who needs you right now."}
          </p>
        </div>
        <Link href="/clients">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add client
          </Button>
        </Link>
      </div>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <StatLine
            items={[
              {
                value: data.stats.activeClients,
                template: "{n} active",
                zeroText: "no active clients",
                href: "/clients",
              },
              {
                value: data.stats.engagedThisWeek,
                template: "{n} trained this week",
                zeroText: "no one trained this week",
              },
              {
                value: data.stats.programsEndingSoon,
                template: "{n} programs ending soon",
                zeroText: "no programs ending soon",
                href: "/programs",
              },
            ]}
          />

          {/* Two-column on wide; stacks on narrow */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <NeedsAttentionBuckets
                buckets={data.buckets}
                total={data.totalNeedingAttention}
              />
            </div>
            <div className="lg:col-span-2">
              <ActivityFeed items={data.activity} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <h3 className="text-base font-semibold tracking-tight">No clients yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite your first client and start building their program.
      </p>
      <Link href="/clients" className="mt-4 inline-block">
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add your first client
        </Button>
      </Link>
    </div>
  );
}
