import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Timer,
  Loader2,
  Calendar,
  Search,
  Users,
} from "lucide-react";
import { formatDateEST } from "@/lib/utils";
import {
  useAdminClockEntries,
  useAdminTimeEntries,
} from "./hooks";

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUserName(user: any): string {
  if (!user) return "Unknown";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email;
}

export function AdminTimesheets() {
  const week = getWeekRange();
  const [startDate, setStartDate] = useState(week.start);
  const [endDate, setEndDate] = useState(week.end);
  const [tab, setTab] = useState<"clock" | "entries">("clock");
  const [search, setSearch] = useState("");

  const { data: clockEntries = [], isLoading: loadingClock } =
    useAdminClockEntries(startDate, endDate);
  const { data: timeEntries = [], isLoading: loadingEntries } =
    useAdminTimeEntries(startDate, endDate);

  const isLoading = loadingClock || loadingEntries;

  // Filter by search
  const filteredClock = clockEntries.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = getUserName(e.user).toLowerCase();
    const proj = e.project?.name?.toLowerCase() || "";
    return name.includes(s) || proj.includes(s);
  });

  const filteredEntries = timeEntries.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = (e.user_name || "").toLowerCase();
    const proj = (e.project_name || "").toLowerCase();
    const desc = (e.description || "").toLowerCase();
    return name.includes(s) || proj.includes(s) || desc.includes(s);
  });

  // Summary stats
  const totalClockMinutes = filteredClock.reduce((sum: number, entry: any) => {
    if (!entry.clock_out) return sum;
    const diff =
      new Date(entry.clock_out).getTime() -
      new Date(entry.clock_in).getTime();
    return sum + diff / 60000 - (entry.break_minutes || 0);
  }, 0);

  const totalTimeHours = filteredEntries.reduce(
    (sum: number, e: any) => sum + parseFloat(e.hours),
    0
  );

  // Unique employees
  const uniqueEmployeesClock = new Set(filteredClock.map((e: any) => e.user_id));
  const activeNow = filteredClock.filter((e: any) => !e.clock_out);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-primary">
          All Timesheets
        </h1>
        <p className="text-muted-foreground">
          View and manage employee time records
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{uniqueEmployeesClock.size}</div>
            <p className="text-sm text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {activeNow.length}
            </div>
            <p className="text-sm text-muted-foreground">Clocked In Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatDuration(totalClockMinutes)}
            </div>
            <p className="text-sm text-muted-foreground">Total Clock Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalTimeHours.toFixed(1)}h</div>
            <p className="text-sm text-muted-foreground">Total Project Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee or project..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "clock" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("clock")}
        >
          <Clock className="h-4 w-4 mr-1" />
          Clock Records ({filteredClock.length})
        </Button>
        <Button
          variant={tab === "entries" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("entries")}
        >
          <Timer className="h-4 w-4 mr-1" />
          Time Entries ({filteredEntries.length})
        </Button>
      </div>

      {/* Clock Records Tab */}
      {tab === "clock" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Clock Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClock.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No clock records for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClock.map((entry: any) => {
                    const inTime = new Date(entry.clock_in);
                    const outTime = entry.clock_out
                      ? new Date(entry.clock_out)
                      : null;
                    const duration = outTime
                      ? (outTime.getTime() - inTime.getTime()) / 60000 -
                        (entry.break_minutes || 0)
                      : null;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {getUserName(entry.user)}
                        </TableCell>
                        <TableCell>
                          {inTime.toLocaleDateString("en-US", {
                            timeZone: "America/New_York",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{formatTime(inTime)}</TableCell>
                        <TableCell>
                          {outTime ? (
                            formatTime(outTime)
                          ) : (
                            <span className="text-green-600 font-medium">
                              Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.break_minutes ? `${entry.break_minutes}m` : "-"}
                        </TableCell>
                        <TableCell>
                          {duration !== null ? formatDuration(duration) : "-"}
                        </TableCell>
                        <TableCell>{entry.project?.name || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Entries Tab */}
      {tab === "entries" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              All Project Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No time entries for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.user_name || "-"}
                      </TableCell>
                      <TableCell>{formatDateEST(entry.entry_date)}</TableCell>
                      <TableCell>{entry.project_name || "-"}</TableCell>
                      <TableCell>{entry.phase?.name || "-"}</TableCell>
                      <TableCell className="capitalize">
                        {entry.category || "-"}
                      </TableCell>
                      <TableCell>
                        {parseFloat(entry.hours).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            entry.is_billable === "yes"
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }
                        >
                          {entry.is_billable === "yes" ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {entry.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
