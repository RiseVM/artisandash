import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Play,
  Square,
  Loader2,
  Trash2,
  Calendar,
  Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateEST } from "@/lib/utils";
import {
  useActiveClock,
  useClockEntries,
  useClockIn,
  useClockOut,
  useMyTimeEntries,
  useDeleteClockEntry,
} from "./hooks";
import { useProjects } from "@/features/projects/hooks";

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
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

export function MyTimesheets() {
  const { toast } = useToast();
  const week = getWeekRange();
  const [startDate, setStartDate] = useState(week.start);
  const [endDate, setEndDate] = useState(week.end);
  const [tab, setTab] = useState<"clock" | "entries">("clock");

  // Clock
  const { data: activeClock, isLoading: loadingActive } = useActiveClock();
  const { data: clockEntries = [], isLoading: loadingClock } = useClockEntries(startDate, endDate);
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const deleteClockMutation = useDeleteClockEntry();

  // Time entries
  const { data: timeEntries = [], isLoading: loadingEntries } = useMyTimeEntries(startDate, endDate);

  // Projects for clock-in selector
  const { data: projects = [] } = useProjects();

  // Clock-in form state
  const [clockProjectId, setClockProjectId] = useState<string>("");
  const [clockNotes, setClockNotes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [showClockOut, setShowClockOut] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<number | null>(null);

  // Elapsed timer
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!activeClock) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const start = new Date(activeClock.clock_in).getTime();
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000);
      setElapsed(formatDuration(mins));
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [activeClock]);

  const handleClockIn = async () => {
    try {
      await clockInMutation.mutateAsync({
        project_id: clockProjectId ? parseInt(clockProjectId) : null,
        notes: clockNotes || null,
      });
      setClockProjectId("");
      setClockNotes("");
      toast({ title: "Clocked in!" });
    } catch {
      toast({ title: "Failed to clock in", variant: "destructive" });
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOutMutation.mutateAsync({
        break_minutes: breakMinutes ? parseInt(breakMinutes) : undefined,
        notes: clockOutNotes || undefined,
      });
      setBreakMinutes("");
      setClockOutNotes("");
      setShowClockOut(false);
      toast({ title: "Clocked out!" });
    } catch {
      toast({ title: "Failed to clock out", variant: "destructive" });
    }
  };

  const handleDeleteClock = async () => {
    if (!deleteEntry) return;
    try {
      await deleteClockMutation.mutateAsync(deleteEntry);
      toast({ title: "Entry deleted" });
      setDeleteEntry(null);
    } catch {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    }
  };

  // Totals
  const totalClockMinutes = clockEntries.reduce((sum, entry) => {
    if (!entry.clock_out) return sum;
    const diff =
      new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
    return sum + diff / 60000 - (entry.break_minutes || 0);
  }, 0);

  const totalTimeHours = timeEntries.reduce(
    (sum, e) => sum + parseFloat(e.hours),
    0
  );

  const isLoading = loadingActive || loadingClock || loadingEntries;

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
          My Timesheets
        </h1>
        <p className="text-muted-foreground">
          Track your time and view your work history
        </p>
      </div>

      {/* Clock In/Out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeClock ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Currently Clocked In</p>
                  <p className="text-sm text-green-600">
                    Since {formatTime(activeClock.clock_in)}
                    {elapsed && ` (${elapsed})`}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowClockOut(true)}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Project (optional)</Label>
                  <Select
                    value={clockProjectId}
                    onValueChange={setClockProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={clockNotes}
                    onChange={(e) => setClockNotes(e.target.value)}
                    placeholder="What are you working on?"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleClockIn}
                    disabled={clockInMutation.isPending}
                    className="w-full"
                  >
                    {clockInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Clock In
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
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
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "clock" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("clock")}
        >
          <Clock className="h-4 w-4 mr-1" />
          Clock History ({clockEntries.length})
        </Button>
        <Button
          variant={tab === "entries" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("entries")}
        >
          <Timer className="h-4 w-4 mr-1" />
          Time Entries ({timeEntries.length})
        </Button>
      </div>

      {/* Clock History Tab */}
      {tab === "clock" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Clock History</CardTitle>
              <span className="text-sm text-muted-foreground">
                Total: {formatDuration(totalClockMinutes)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {clockEntries.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No clock entries for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clockEntries.map((entry) => {
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
                        <TableCell>
                          {inTime.toLocaleDateString("en-US", {
                            timeZone: "America/New_York",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{formatTime(inTime)}</TableCell>
                        <TableCell>
                          {outTime ? formatTime(outTime) : (
                            <span className="text-green-600 font-medium">Active</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.break_minutes ? `${entry.break_minutes}m` : "-"}
                        </TableCell>
                        <TableCell>
                          {duration !== null ? formatDuration(duration) : "-"}
                        </TableCell>
                        <TableCell>
                          {(entry as any).project?.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!activeClock || activeClock.id !== entry.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : null}
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
            <div className="flex items-center justify-between">
              <CardTitle>Project Time Entries</CardTitle>
              <span className="text-sm text-muted-foreground">
                Total: {totalTimeHours.toFixed(1)}h
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No time entries for this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDateEST(entry.entry_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(entry as any).project_name || "-"}
                      </TableCell>
                      <TableCell>
                        {entry.phase?.name || "-"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {entry.category || "-"}
                      </TableCell>
                      <TableCell>{parseFloat(entry.hours).toFixed(1)}</TableCell>
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

      {/* Clock Out Dialog */}
      <Dialog open={showClockOut} onOpenChange={setShowClockOut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Break Minutes (optional)</Label>
              <Input
                type="number"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClockOut(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
              >
                {clockOutMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Clock Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Clock Entry?</AlertDialogTitle>
          </AlertDialogHeader>
          <p>This will permanently remove this clock entry.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClock}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
