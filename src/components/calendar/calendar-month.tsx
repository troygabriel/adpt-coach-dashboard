"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Scale,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  clientId: string;
  scheduledFor: string; // YYYY-MM-DD
  taskType: string;
  title: string;
  completed: boolean;
  clientFirstName: string | null;
};

type ClientOption = {
  id: string;
  firstName: string | null;
};

const TASK_ICON: Record<string, LucideIcon> = {
  photos: Camera,
  body_stats: Scale,
  macros: UtensilsCrossed,
  custom: ClipboardList,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtMonthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarMonth({
  year,
  month,
  tasks,
  clients,
  clientFilter,
}: {
  year: number;
  month: number;
  tasks: Task[];
  clients: ClientOption[];
  clientFilter: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = (newYear: number, newMonth: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", fmtMonthParam(newYear, newMonth));
    router.push(`/calendar?${params.toString()}`);
  };

  const setClient = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("client", id);
    else params.delete("client");
    router.push(`/calendar?${params.toString()}`);
  };

  const goPrev = () => {
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    navigate(y, m);
  };
  const goNext = () => {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    navigate(y, m);
  };
  const goToday = () => {
    const d = new Date();
    navigate(d.getFullYear(), d.getMonth());
  };

  // Build the 6x7 grid.
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - firstOfMonth.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const tasksByDate = new Map<string, Task[]>();
  for (const t of tasks) {
    const arr = tasksByDate.get(t.scheduledFor) ?? [];
    arr.push(t);
    tasksByDate.set(t.scheduledFor, arr);
  }

  const todayIso = isoDate(new Date());

  return (
    <section className="rounded-xl border border-border bg-card">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">
            {MONTH_NAMES[month]} {year}
          </h2>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goPrev}
              aria-label="Previous month"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goNext}
              aria-label="Next month"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={goToday}
            >
              Today
            </Button>
          </div>
        </div>

        <Select
          value={clientFilter ?? "all"}
          onValueChange={(v) => setClient(v === "all" ? null : v)}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName ?? "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const iso = isoDate(d);
          const inMonth = d.getMonth() === month;
          const isToday = iso === todayIso;
          const cellTasks = tasksByDate.get(iso) ?? [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[96px] border-b border-r border-border p-1.5",
                !inMonth && "bg-muted/30",
                i % 7 === 6 && "border-r-0"
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded text-xs tabular-nums",
                  isToday
                    ? "bg-foreground text-background font-semibold"
                    : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {d.getDate()}
              </div>
              {cellTasks.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {cellTasks.slice(0, 3).map((t) => (
                    <TaskChip key={t.id} task={t} />
                  ))}
                  {cellTasks.length > 3 && (
                    <li className="px-1 text-[10px] text-muted-foreground">
                      +{cellTasks.length - 3} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskChip({ task }: { task: Task }) {
  const Icon = TASK_ICON[task.taskType] ?? ClipboardList;
  return (
    <li>
      <Link
        href={`/clients/${task.clientId}`}
        className={cn(
          "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-muted",
          task.completed
            ? "text-muted-foreground line-through"
            : "text-foreground"
        )}
        title={`${task.clientFirstName ?? "Client"} · ${task.title}`}
      >
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-foreground/10 text-[9px] font-semibold uppercase">
          {getInitials(task.clientFirstName)}
        </span>
        <Icon aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
      </Link>
    </li>
  );
}
