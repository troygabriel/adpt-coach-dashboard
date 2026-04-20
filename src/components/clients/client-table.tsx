"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreHorizontal, MessageSquare, Pause, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency, formatRelativeDate, getStatusColor } from "@/lib/utils";
import { AddClientDialog } from "./add-client-dialog";
import type { ClientWithProfile } from "@/types";

interface ClientTableProps {
  clients: ClientWithProfile[];
  coachId: string;
}

export function ClientTable({ clients, coachId }: ClientTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const filtered = clients.filter((c) => {
    const name = c.profiles?.first_name?.toLowerCase() || "";
    const matchesSearch = !search || name.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    pending: clients.filter((c) => c.status === "pending").length,
    paused: clients.filter((c) => c.status === "paused").length,
    archived: clients.filter((c) => c.status === "archived").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-input border-border pl-9"
          />
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary-dark"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="data-[state=active]:bg-card">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-card">
            Active ({statusCounts.active})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-card">
            Pending ({statusCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="paused" className="data-[state=active]:bg-card">
            Paused ({statusCounts.paused})
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-card">
            Archived ({statusCounts.archived})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <p className="text-lg font-medium text-foreground">No clients yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first client to get started.
          </p>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Client</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground hidden sm:table-cell">
                  Monthly Rate
                </TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">
                  Started
                </TableHead>
                <TableHead className="text-muted-foreground w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => {
                const name = client.profiles?.first_name || "Unknown";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TableRow
                    key={client.id}
                    className="border-border hover:bg-secondary/50 cursor-pointer"
                    onClick={() => router.push(`/clients/${client.client_id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("capitalize", getStatusColor(client.status))}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {client.monthly_rate_cents
                        ? `${formatCurrency(client.monthly_rate_cents)}/mo`
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {client.started_at
                        ? formatRelativeDate(client.started_at)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem className="cursor-pointer">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Message
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive">
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddClientDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        coachId={coachId}
      />
    </div>
  );
}
