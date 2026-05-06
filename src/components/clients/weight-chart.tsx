"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stat = {
  date: string; // YYYY-MM-DD
  weightKg: number | null;
};

export function WeightChart({ stats }: { stats: Stat[] }) {
  const data = useMemo(() => {
    return stats
      .filter((s) => s.weightKg != null)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        lbs: Number(((s.weightKg as number) * 2.20462).toFixed(1)),
      }));
  }, [stats]);

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium">Not enough data</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Two or more weigh-ins needed to plot a trend.
        </p>
      </div>
    );
  }

  const first = data[0].lbs;
  const last = data[data.length - 1].lbs;
  const delta = +(last - first).toFixed(1);
  const deltaLabel =
    delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} lbs`;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Body weight</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground">{last} lbs</span> · {deltaLabel} since{" "}
          {new Date(data[0].date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              }
              stroke="currentColor"
              opacity={0.4}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="lbs"
              domain={["dataMin - 2", "dataMax + 2"]}
              stroke="currentColor"
              opacity={0.4}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(v) =>
                new Date(v as string).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
              formatter={(value) => [`${value} lbs`, "Weight"]}
            />
            <Area
              type="monotone"
              dataKey="lbs"
              stroke="currentColor"
              strokeWidth={2}
              fill="url(#weightFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
