"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flag,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckInDetail } from "./check-in-detail";
import { generateFlags } from "@/lib/check-in-flags";
import { formatRelativeDate } from "@/lib/utils";
import type {
  CheckInWithClient,
  BodyStat,
  CoachNote,
  HabitWithLogs,
  CheckInFlag,
  CheckInResponses,
} from "@/types";

interface CheckInQueueProps {
  checkIns: CheckInWithClient[];
  bodyStats: BodyStat[];
  coachNotes: CoachNote[];
  habits: HabitWithLogs[];
  coachId: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Needs Review" },
  { value: "flagged", label: "Flagged" },
  { value: "reviewed", label: "Reviewed" },
] as const;

export function CheckInQueue({
  checkIns,
  bodyStats,
  coachNotes,
  habits,
  coachId,
}: CheckInQueueProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Generate flags for each check-in
  const checkInsWithFlags = useMemo(() => {
    return checkIns.map((checkIn) => {
      const clientStats = bodyStats.filter(
        (s) => s.client_id === checkIn.client_id
      );
      const flags = generateFlags(
        checkIn.responses as CheckInResponses | null,
        clientStats
      );
      return { ...checkIn, flags };
    });
  }, [checkIns, bodyStats]);

  // Filter
  const filtered = useMemo(() => {
    return checkInsWithFlags.filter((ci) => {
      const matchesSearch =
        !search ||
        ci.profiles?.first_name
          ?.toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "flagged"
          ? ci.flags.some((f) => f.severity === "critical" || f.severity === "warning")
          : ci.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [checkInsWithFlags, search, statusFilter]);

  const counts = useMemo(() => {
    const all = checkInsWithFlags.length;
    const submitted = checkInsWithFlags.filter(
      (ci) => ci.status === "submitted"
    ).length;
    const flagged = checkInsWithFlags.filter((ci) =>
      ci.flags.some((f) => f.severity === "critical" || f.severity === "warning")
    ).length;
    const reviewed = checkInsWithFlags.filter(
      (ci) => ci.status === "reviewed"
    ).length;
    return { all, submitted, flagged, reviewed };
  }, [checkInsWithFlags]);

  const clientNotes = (clientId: string) =>
    coachNotes.filter((n) => n.client_id === clientId);

  const clientHabits = (clientId: string) =>
    habits.filter((h) => h.client_id === clientId);

  const clientStats = (clientId: string) =>
    bodyStats.filter((s) => s.client_id === clientId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 min-w-[20px] px-1 text-xs"
                >
                  {counts[tab.value as keyof typeof counts]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Queue List */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-success mb-3" />
            <p className="text-lg font-medium text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground">
              No check-ins match your current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((checkIn) => {
            const isExpanded = expandedId === checkIn.id;
            const responses = checkIn.responses as CheckInResponses | null;
            const hasPhotos =
              checkIn.check_in_photos && checkIn.check_in_photos.length > 0;
            const criticalFlags = checkIn.flags.filter(
              (f) => f.severity === "critical"
            );
            const warningFlags = checkIn.flags.filter(
              (f) => f.severity === "warning"
            );

            return (
              <div key={checkIn.id}>
                {/* Queue Row */}
                <Card
                  className={`border-border bg-card transition-colors hover:bg-card/80 cursor-pointer ${
                    isExpanded ? "border-primary/30 bg-card/90" : ""
                  } ${
                    criticalFlags.length > 0
                      ? "border-l-2 border-l-destructive"
                      : warningFlags.length > 0
                        ? "border-l-2 border-l-accent"
                        : ""
                  }`}
                  onClick={() =>
                    setExpandedId(isExpanded ? null : checkIn.id)
                  }
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    {/* Expand indicator */}
                    <div className="text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>

                    {/* Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {checkIn.profiles?.first_name || "Unknown"}
                        </span>
                        <StatusBadge status={checkIn.status} />
                        {hasPhotos && (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Photos
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {checkIn.profiles?.goal || "No goal set"}
                      </p>
                    </div>

                    {/* Quick metrics */}
                    <div className="hidden md:flex items-center gap-4 text-sm">
                      {responses?.training_adherence != null && (
                        <MetricPill
                          label="Training"
                          value={responses.training_adherence}
                        />
                      )}
                      {responses?.nutrition_adherence != null && (
                        <MetricPill
                          label="Nutrition"
                          value={responses.nutrition_adherence}
                        />
                      )}
                      {responses?.energy_level != null && (
                        <MetricPill
                          label="Energy"
                          value={responses.energy_level}
                        />
                      )}
                    </div>

                    {/* Flags */}
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        {criticalFlags.map((flag, i) => (
                          <Tooltip key={`c-${i}`}>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{flag.message}</p>
                              {flag.detail && (
                                <p className="text-xs text-muted-foreground">
                                  {flag.detail}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {warningFlags.map((flag, i) => (
                          <Tooltip key={`w-${i}`}>
                            <TooltipTrigger>
                              <Flag className="h-4 w-4 text-accent" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{flag.message}</p>
                              {flag.detail && (
                                <p className="text-xs text-muted-foreground">
                                  {flag.detail}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3.5 w-3.5" />
                      {checkIn.submitted_at
                        ? formatRelativeDate(checkIn.submitted_at)
                        : "Not submitted"}
                    </div>
                  </CardContent>
                </Card>

                {/* Expanded Detail */}
                {isExpanded && (
                  <CheckInDetail
                    checkIn={checkIn}
                    flags={checkIn.flags}
                    bodyStats={clientStats(checkIn.client_id)}
                    coachNotes={clientNotes(checkIn.client_id)}
                    habits={clientHabits(checkIn.client_id)}
                    coachId={coachId}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
    },
    submitted: {
      label: "Needs Review",
      className: "bg-accent/15 text-accent border-accent/30",
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-success/15 text-success border-success/30",
    },
    flagged: {
      label: "Flagged",
      className: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };
  const { label, className } = config[status] || config.pending;
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8
      ? "text-success"
      : value >= 5
        ? "text-foreground"
        : "text-accent";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value}/10</span>
    </div>
  );
}
