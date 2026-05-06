import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeightChart } from "@/components/clients/weight-chart";
import { PhotosTimeline } from "@/components/clients/photos-timeline";

export const dynamic = "force-dynamic";

export default async function ClientProgressPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: bodyStats }, { data: photoRows }] = await Promise.all([
    supabase
      .from("body_stats")
      .select("id, date, weight_kg, body_fat_pct")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .limit(180),
    supabase
      .from("progress_photos")
      .select("id, storage_path, pose, taken_at, created_at, notes")
      .eq("client_id", clientId)
      .order("taken_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const photos = await Promise.all(
    (photoRows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(row.storage_path, 3600);
      return {
        id: row.id,
        storage_path: row.storage_path,
        pose: row.pose as "front" | "side" | "back" | "other" | null,
        taken_at: row.taken_at,
        created_at: row.created_at,
        notes: row.notes,
        url: signed?.signedUrl ?? null,
      };
    })
  );

  const stats = (bodyStats ?? []).map((s) => ({
    date: s.date,
    weightKg: s.weight_kg as number | null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Weight trend, body stats, and progress photos.
        </p>
      </div>

      <WeightChart stats={stats} />

      {/* Recent body stats list */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium">Recent weigh-ins</h2>
        </header>
        {stats.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium">No weigh-ins yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Body stats logged in the mobile app will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {stats.slice(0, 10).map((s, i) => (
              <li
                key={`${s.date}-${i}`}
                className="flex items-center justify-between px-5 py-2.5"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(s.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {s.weightKg
                    ? `${(s.weightKg * 2.20462).toFixed(1)} lbs`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Photos */}
      <section>
        <h2 className="mb-3 text-sm font-medium">Progress photos</h2>
        <PhotosTimeline photos={photos} />
      </section>
    </div>
  );
}
