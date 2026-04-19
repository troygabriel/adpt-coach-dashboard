"use client";

import { TrendingUp, TrendingDown, Minus, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BodyStat } from "@/types";

interface WeightTrendChartProps {
  bodyStats: BodyStat[];
}

export function WeightTrendChart({ bodyStats }: WeightTrendChartProps) {
  const weightData = bodyStats
    .filter((s) => s.weight_kg != null)
    .map((s) => ({
      date: s.date,
      weight: s.weight_kg!,
      label: new Date(s.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));

  if (weightData.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Scale className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-foreground">No weight data</p>
          <p className="text-sm text-muted-foreground">
            Weight trends will appear once the client starts logging.
          </p>
        </CardContent>
      </Card>
    );
  }

  const min = Math.min(...weightData.map((d) => d.weight));
  const max = Math.max(...weightData.map((d) => d.weight));
  const range = max - min || 1;
  const latest = weightData[weightData.length - 1].weight;
  const first = weightData[0].weight;
  const totalDelta = latest - first;

  // Week-over-week delta
  const weekDelta =
    weightData.length >= 2
      ? weightData[weightData.length - 1].weight -
        weightData[weightData.length - 2].weight
      : 0;

  // Average of last 7 entries
  const recentAvg =
    weightData.length >= 2
      ? weightData.slice(-7).reduce((sum, d) => sum + d.weight, 0) /
        Math.min(7, weightData.length)
      : latest;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStat label="Current" value={`${latest.toFixed(1)} kg`} />
        <MiniStat label="7-day Avg" value={`${recentAvg.toFixed(1)} kg`} />
        <MiniStat
          label="This Week"
          value={`${weekDelta >= 0 ? "+" : ""}${weekDelta.toFixed(1)} kg`}
          color={
            Math.abs(weekDelta) < 0.1
              ? "text-muted-foreground"
              : weekDelta > 0
                ? "text-accent"
                : "text-success"
          }
        />
        <MiniStat
          label="Total Change"
          value={`${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)} kg`}
          color={
            Math.abs(totalDelta) < 0.1
              ? "text-muted-foreground"
              : totalDelta > 0
                ? "text-accent"
                : "text-success"
          }
        />
      </div>

      {/* Visual chart — CSS-based sparkline */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Weight Trend ({weightData.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-40">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground tabular-nums pr-2">
              <span>{max.toFixed(1)}</span>
              <span>{((max + min) / 2).toFixed(1)}</span>
              <span>{min.toFixed(1)}</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 h-full flex items-end gap-[2px]">
              {weightData.map((d, i) => {
                const height = ((d.weight - min) / range) * 100;
                const isLatest = i === weightData.length - 1;
                return (
                  <div
                    key={d.date}
                    className="group relative flex-1 flex flex-col justify-end"
                  >
                    <div
                      className={`w-full rounded-t transition-colors ${
                        isLatest ? "bg-primary" : "bg-primary/40 hover:bg-primary/60"
                      }`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                      <div className="rounded bg-popover border border-border px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                        <div className="font-medium text-foreground">
                          {d.weight.toFixed(1)} kg
                        </div>
                        <div className="text-muted-foreground">{d.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels (show first, middle, last) */}
          {weightData.length >= 3 && (
            <div className="ml-12 flex justify-between text-xs text-muted-foreground mt-1">
              <span>{weightData[0].label}</span>
              <span>
                {weightData[Math.floor(weightData.length / 2)].label}
              </span>
              <span>{weightData[weightData.length - 1].label}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Measurements history */}
      {bodyStats.some((s) => s.measurements && Object.keys(s.measurements).length > 0) && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Measurement History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">
                      Date
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      Waist
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      Chest
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      Arms
                    </th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">
                      Thighs
                    </th>
                    <th className="text-right py-2 pl-2 text-muted-foreground font-medium">
                      Hips
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bodyStats
                    .filter(
                      (s) =>
                        s.measurements &&
                        Object.keys(s.measurements).length > 0
                    )
                    .slice(-8)
                    .reverse()
                    .map((stat) => (
                      <tr
                        key={stat.id}
                        className="border-b border-border/50"
                      >
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(stat.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums text-foreground">
                          {stat.measurements?.waist ?? "—"}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums text-foreground">
                          {stat.measurements?.chest ?? "—"}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums text-foreground">
                          {stat.measurements?.arms ?? "—"}
                        </td>
                        <td className="text-right py-2 px-2 tabular-nums text-foreground">
                          {stat.measurements?.thighs ?? "—"}
                        </td>
                        <td className="text-right py-2 pl-2 tabular-nums text-foreground">
                          {stat.measurements?.hips ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-semibold tabular-nums ${color || "text-foreground"}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
