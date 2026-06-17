"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { invalidateCache } from "@/lib/client-cache";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 25;

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "BACKUP_EXPORTED", label: "Backup exported" },
  { value: "BACKUP_RESTORED", label: "Backup restored" },
  { value: "USER_ENABLED", label: "User enabled" },
  { value: "USER_DISABLED", label: "User disabled" },
  { value: "INVOICE_CREATED", label: "Invoice created" },
  { value: "STOCK_DELETED", label: "Stock deleted" },
  { value: "LOGIN_FAILED", label: "Login failed" },
  { value: "DISABLED_USER_ACCESS_ATTEMPT", label: "Disabled user access" },
  { value: "ADMIN_ACCESS_VIOLATION", label: "Admin access violation" },
  { value: "RATE_LIMIT_EXCEEDED", label: "Rate limit exceeded" },
  { value: "DAILY_COLLECTION_MARKED", label: "Daily collection marked" },
  { value: "DAILY_COLLECTION_UPDATED", label: "Daily collection updated" },
  { value: "CASUAL_SWIM_TICKET_CREATED", label: "Casual swim ticket created" },
  { value: "CASUAL_SWIM_BILL_CREATED", label: "Casual swim bill created" },
  { value: "CASUAL_SWIM_BILL_DELETED", label: "Casual swim bill deleted" },
  { value: "CASUAL_SWIM_TICKET_COUNTER_RESET", label: "Casual swim counter reset" },
  { value: "CASUAL_SWIM_SETTINGS_UPDATED", label: "Casual swim settings updated" },
] as const;

type AuditEventRow = {
  id: string;
  createdAt: string;
  username: string | null;
  action: string;
  entityType: string | null;
  details: unknown;
};

type SecurityEventsResponse = {
  events: AuditEventRow[];
  total: number;
  page: number;
  pageSize: number;
};

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatActionLabel(action: string) {
  return action.replace(/_/g, " ");
}

function formatDetails(details: unknown) {
  if (details == null) return "—";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return "—";
  }
}

function actionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (
    action === "LOGIN_FAILED" ||
    action === "DISABLED_USER_ACCESS_ATTEMPT" ||
    action === "ADMIN_ACCESS_VIOLATION" ||
    action === "RATE_LIMIT_EXCEEDED" ||
    action.includes("DISABLED") ||
    action.includes("DELETED")
  ) {
    return "destructive";
  }
  if (action.includes("BACKUP") || action.includes("ENABLED")) return "default";
  return "secondary";
}

function buildEventsUrl(page: number, action: string, username: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (action !== "all") params.set("action", action);
  const q = username.trim();
  if (q) params.set("username", q);
  return `/api/admin/security/events?${params.toString()}`;
}

export default function SecurityDashboardPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [usernameFilter, setUsernameFilter] = useState("");

  const listUrl = useMemo(
    () => buildEventsUrl(page, actionFilter, usernameFilter),
    [page, actionFilter, usernameFilter]
  );

  const { data, isInitialLoading, isRefreshing, refetch } =
    useCachedFetch<SecurityEventsResponse>(listUrl);

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRefresh = () => {
    invalidateCache(listUrl);
    void refetch();
  };

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleUsernameChange = (value: string) => {
    setUsernameFilter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Shield className="h-7 w-7 text-primary" />
            Security Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Audit trail of security-sensitive and administrative actions
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Showing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{events.length}</p>
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filters active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {(actionFilter !== "all" ? 1 : 0) + (usernameFilter.trim() ? 1 : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-56">
          <Label htmlFor="action-filter">Action</Label>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger id="action-filter">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:max-w-xs sm:flex-1">
          <Label htmlFor="username-filter">Username</Label>
          <Input
            id="username-filter"
            value={usernameFilter}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="Filter by username…"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No audit events found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{event.username ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={actionBadgeVariant(event.action)}>
                          {formatActionLabel(event.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.entityType ?? "—"}</TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground">
                        {formatDetails(event.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {total} event{total === 1 ? "" : "s"} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isRefreshing}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isRefreshing}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
