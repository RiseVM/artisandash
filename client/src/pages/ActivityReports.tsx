import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export function ActivityReports() {
  const [filters, setFilters] = useState({
    userId: "",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const queryParams = new URLSearchParams();
  if (appliedFilters.userId) queryParams.append("userId", appliedFilters.userId);
  if (appliedFilters.startDate) queryParams.append("startDate", appliedFilters.startDate);
  if (appliedFilters.endDate) queryParams.append("endDate", appliedFilters.endDate);

  const { data: logs = [], isLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", appliedFilters],
    queryFn: async () => {
      const response = await fetch(`/api/activity-logs?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters({ userId: "", startDate: "", endDate: "" });
    setAppliedFilters({ userId: "", startDate: "", endDate: "" });
  };

  const exportToCsv = () => {
    const headers = ["Date/Time", "User", "Action", "Entity Type", "Entity ID", "Details", "IP Address"];
    const rows = logs.map(log => [
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.userEmail || "System",
      log.action,
      log.entityType || "",
      log.entityId || "",
      log.details || "",
      log.ipAddress || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("login")) return "default";
    if (action.includes("create")) return "secondary";
    if (action.includes("update")) return "outline";
    if (action.includes("delete")) return "destructive";
    return "secondary";
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activity Reports</h1>
          <p className="text-muted-foreground">Track user actions and system activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCsv} disabled={logs.length === 0} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters({ ...filters, userId: value === "all" ? "" : value })}
              >
                <SelectTrigger data-testid="select-filter-user">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                data-testid="input-filter-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                data-testid="input-filter-end-date"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1" data-testid="button-apply-filters">
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>{logs.length} record{logs.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        {log.userEmail || <span className="text-muted-foreground">System</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entityType ? (
                          <span className="text-sm">
                            {log.entityType}
                            {log.entityId && <span className="text-muted-foreground"> #{log.entityId}</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.ipAddress || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
