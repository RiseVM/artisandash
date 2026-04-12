import { useState, useCallback, useEffect, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Send,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
  LogIn,
  LogOut,
  Timer,
  Plus,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Helpers ─────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatWeekLabel(mondayIso: string): string {
  const mon = new Date(mondayIso + "T12:00:00");
  const sun = addDays(mon, 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Week of ${months[mon.getMonth()]} ${mon.getDate()} – ${months[sun.getMonth()]} ${sun.getDate()}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function isToday(iso: string): boolean {
  return iso === new Date().toISOString().split("T")[0];
}

function isWeekend(iso: string): boolean {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function shortDayLabel(iso: string): { day: string; date: string } {
  const d = new Date(iso + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { day: days[d.getDay()], date: `${d.getMonth() + 1}/${d.getDate()}` };
}

// ── Types ───────────────────────────────────

interface TimecardEntry {
  id: number;
  timecardId: number;
  entryDate: string;
  hours: string;
  notes: string | null;
  mileage: string | null;
}

interface AuditLogEntry {
  id: number;
  timecardId: number;
  action: string;
  entryDate: string | null;
  oldHours: string | null;
  newHours: string | null;
  oldNotes: string | null;
  newNotes: string | null;
  description: string | null;
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
}

interface TimecardRecipient {
  id: number;
  name: string;
  email: string;
  title: string | null;
  isActive: string;
}

interface TimecardData {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  recipientId: number | null;
  totalHours: string | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
  recipient?: TimecardRecipient | null;
}

interface PastTimecard {
  id: number;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  recipientId: number | null;
  recipient?: TimecardRecipient | null;
}

interface ClockPunch {
  id: number;
  timecardId: number;
  punchDate: string;
  clockIn: string;
  clockOut: string | null;
  hours: string | null;
  notes: string | null;
}

interface ClockStatus {
  clockedIn: boolean;
  openPunch: ClockPunch | null;
  todayPunches: ClockPunch[];
}

interface MileageSettings {
  mileageEnabled: "yes" | "no";
  mileageRate: string | null;
}

// ── Clock In / Out Widget ──────────────────

function ClockWidget({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [elapsed, setElapsed] = useState("");

  const { data: clockStatus } = useQuery<ClockStatus>({
    queryKey: ["/api/timecards/clock/status"],
    refetchInterval: 30000, // refresh every 30s
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/clock/in");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/clock/out");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
      // Also refresh the current week's timecard since hours were updated
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/timecards/my/");
      }});
    },
  });

  // Update elapsed timer
  useEffect(() => {
    if (!clockStatus?.openPunch) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const start = new Date(clockStatus.openPunch!.clockIn).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clockStatus?.openPunch]);

  const isClockedIn = clockStatus?.clockedIn ?? false;
  const todayPunches = clockStatus?.todayPunches ?? [];
  const todayTotal = todayPunches.reduce((sum, p) => sum + parseFloat(p.hours || "0"), 0);

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
          <div>
            <p className="text-sm font-medium">
              {isClockedIn ? "Currently Clocked In" : "Not Clocked In"}
            </p>
            {isClockedIn && elapsed && (
              <p className="text-xs text-muted-foreground font-mono">{elapsed} elapsed</p>
            )}
            {!isClockedIn && todayTotal > 0 && (
              <p className="text-xs text-muted-foreground">Today: {todayTotal.toFixed(1)} hrs across {todayPunches.filter(p => p.clockOut).length} shift(s)</p>
            )}
          </div>
        </div>

        {isClockedIn ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clockOut.mutate()}
            disabled={clockOut.isPending}
          >
            {clockOut.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-1" />
            )}
            Clock Out
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => clockIn.mutate()}
            disabled={clockIn.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {clockIn.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4 mr-1" />
            )}
            Clock In
          </Button>
        )}
      </div>

      {/* Today's shifts */}
      {todayPunches.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Timer className="h-3 w-3" /> Today's Shifts
          </p>
          <div className="space-y-1">
            {todayPunches.map((p) => {
              const inTime = new Date(p.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const outTime = p.clockOut
                ? new Date(p.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : "—";
              return (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span>{inTime} → {outTime}</span>
                  <span className="text-muted-foreground">
                    {p.hours ? `${parseFloat(p.hours).toFixed(1)} hrs` : "active"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Identity Verification Gate ──────────────

interface VerifiedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function IdentityGate({ onVerified }: { onVerified: (user: VerifiedUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const verify = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/timecards/verify-identity", creds);
      return res.json();
    },
    onSuccess: (data: { verified: boolean; user: VerifiedUser }) => {
      if (data.verified) {
        onVerified(data.user);
      }
    },
    onError: () => {
      setError("Invalid email or password. Please try again.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    verify.mutate({ email: email.trim(), password });
  };

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="text-center">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-bold">Verify Your Identity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Shared computer — please sign in to access your timecards
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="verify-password">Password</Label>
              <Input
                id="verify-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={verify.isPending}>
              {verify.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Continue to Timecards"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────

export function Timecards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientTitle, setNewRecipientTitle] = useState("");

  // ALL hooks must be called before any conditional return (React Rules of Hooks)

  // Fetch current week's timecard
  const { data: timecard, isLoading } = useQuery<TimecardData>({
    queryKey: ["/api/timecards/my/" + currentMonday],
    enabled: !!verifiedUser,
  });

  // Fetch all past timecards
  const { data: pastTimecards } = useQuery<PastTimecard[]>({
    queryKey: ["/api/timecards/my"],
    enabled: !!verifiedUser,
  });

  // Fetch mileage settings
  const { data: mileageSettings } = useQuery<MileageSettings>({
    queryKey: ["/api/timecards/my/mileage-settings"],
    enabled: !!verifiedUser,
  });

  // Fetch recipients list
  const { data: recipients } = useQuery<TimecardRecipient[]>({
    queryKey: ["/api/timecards/recipients"],
    enabled: !!verifiedUser,
  });

  // Mutation: update an entry
  const updateEntry = useMutation({
    mutationFn: async ({ entryId, hours, notes, mileage }: { entryId: number; hours: string; notes: string | null; mileage?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/timecards/entries/${entryId}`, { hours, notes, mileage });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
      // Flash "Saved" indicator
      setSavedEntryId(variables.entryId);
      setTimeout(() => setSavedEntryId(null), 1500);
    },
  });

  // Mutation: submit timecard
  const submitTimecard = useMutation({
    mutationFn: async (timecardId: number) => {
      const res = await apiRequest("POST", `/api/timecards/${timecardId}/submit`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
    },
  });

  // Mutation: set recipient on timecard
  const setRecipient = useMutation({
    mutationFn: async ({ timecardId, recipientId }: { timecardId: number; recipientId: number }) => {
      const res = await apiRequest("PATCH", `/api/timecards/${timecardId}/recipient`, { recipientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
    },
  });

  // Mutation: create new recipient
  const createRecipient = useMutation({
    mutationFn: async (data: { name: string; email: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/timecards/recipients", data);
      return res.json();
    },
    onSuccess: (newRecipient: TimecardRecipient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/recipients"] });
      // Auto-select the new recipient on the timecard
      if (timecard) {
        setRecipient.mutate({ timecardId: timecard.id, recipientId: newRecipient.id });
      }
      setAddRecipientOpen(false);
      setNewRecipientName("");
      setNewRecipientEmail("");
      setNewRecipientTitle("");
    },
  });

  const navigateWeek = useCallback((direction: -1 | 1) => {
    setCurrentMonday((prev) => {
      const d = new Date(prev + "T12:00:00");
      return formatIso(addDays(d, direction * 7));
    });
  }, []);

  const goToWeek = useCallback((weekStart: string) => {
    setCurrentMonday(weekStart);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBlur = useCallback(
    (entry: TimecardEntry, field: "hours" | "notes" | "mileage", value: string) => {
      const currentVal = field === "hours" ? entry.hours : field === "notes" ? (entry.notes || "") : (entry.mileage || "");
      if (value === currentVal) return; // no change

      updateEntry.mutate({
        entryId: entry.id,
        hours: field === "hours" ? value : entry.hours,
        notes: field === "notes" ? (value || null) : entry.notes,
        mileage: field === "mileage" ? (value || null) : entry.mileage,
      });
    },
    [updateEntry],
  );

  // Gate: require identity verification on every page visit
  if (!verifiedUser) {
    return <IdentityGate onVerified={setVerifiedUser} />;
  }

  const isApproved = timecard?.status === "approved";
  const isSubmitted = timecard?.status === "submitted";
  const totalHours = timecard?.totalHours ? parseFloat(timecard.totalHours) : 0;
  const totalMileage = timecard?.entries.reduce((sum, entry) => sum + parseFloat(entry.mileage || "0"), 0) ?? 0;
  const mileageEnabled = mileageSettings?.mileageEnabled === "yes";

  // Who is verified — show at top for safety
  const userName = verifiedUser
    ? [verifiedUser.firstName, verifiedUser.lastName].filter(Boolean).join(" ") || verifiedUser.email
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" /> My Timecards
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Logged in as <strong>{userName}</strong>
          </p>
        </div>
      </div>

      {/* Clock In / Out */}
      <ClockWidget queryClient={queryClient} />

      {/* Week Navigator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 bg-card border rounded-lg p-3">
        <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)} className="h-10 w-10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm sm:text-lg font-semibold min-w-0 sm:min-w-[260px] text-center flex-1 sm:flex-none px-2">
          {formatWeekLabel(currentMonday)}
        </span>
        <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} className="h-10 w-10">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Timecard Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading timecard…</div>
      ) : timecard ? (
        <>
          {/* Horizontal Week Grid Table - hidden on mobile */}
          <div className="bg-card border rounded-lg overflow-x-auto hidden sm:block">
            <style>{`
              @keyframes savedFlash {
                0% { background-color: rgb(220, 252, 231); }
                100% { background-color: transparent; }
              }
              .saved-flash {
                animation: savedFlash 1.5s ease-out forwards;
              }
            `}</style>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hours</th>
                  {timecard.entries.map((entry) => {
                    const labels = shortDayLabel(entry.entryDate);
                    const today = isToday(entry.entryDate);
                    const weekend = isWeekend(entry.entryDate);
                    return (
                      <th
                        key={`h-${entry.id}`}
                        className={`px-2 py-2 text-center font-medium text-xs w-24 ${
                          today ? "bg-primary/5 border-t-2 border-primary" : weekend ? "bg-muted/30" : ""
                        }`}
                      >
                        <div>{labels.day}</div>
                        <div className="text-muted-foreground">{labels.date}</div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground min-w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Hours Row */}
                <tr className="border-b">
                  <td className="px-3 py-3 text-sm font-medium text-foreground">Hours</td>
                  {timecard.entries.map((entry) => {
                    const today = isToday(entry.entryDate);
                    const weekend = isWeekend(entry.entryDate);
                    const saved = savedEntryId === entry.id;
                    return (
                      <td
                        key={`hours-${entry.id}`}
                        className={`px-2 py-3 text-center ${
                          today ? "bg-primary/5 border-t-2 border-primary" : weekend ? "bg-muted/30" : ""
                        } ${saved ? "saved-flash" : ""}`}
                      >
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          defaultValue={entry.hours}
                          disabled={isApproved || isSubmitted}
                          className="w-20 text-center h-8 text-xs"
                          onBlur={(e) => handleBlur(entry, "hours", e.target.value)}
                          key={`h-${entry.id}-${entry.hours}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold text-foreground">
                    {totalHours.toFixed(1)}h
                  </td>
                </tr>

                {/* Notes Row */}
                <tr className="border-b last:border-b-0">
                  <td className="px-3 py-3 text-sm font-medium text-foreground">Notes</td>
                  {timecard.entries.map((entry) => {
                    const today = isToday(entry.entryDate);
                    const weekend = isWeekend(entry.entryDate);
                    const saved = savedEntryId === entry.id;
                    return (
                      <td
                        key={`notes-${entry.id}`}
                        className={`px-2 py-3 text-center ${
                          today ? "bg-primary/5 border-t-2 border-primary" : weekend ? "bg-muted/30" : ""
                        } ${saved ? "saved-flash" : ""}`}
                      >
                        <Input
                          type="text"
                          placeholder="…"
                          defaultValue={entry.notes || ""}
                          disabled={isApproved || isSubmitted}
                          className="text-center h-8 text-xs"
                          onBlur={(e) => handleBlur(entry, "notes", e.target.value)}
                          key={`n-${entry.id}-${entry.notes}`}
                        />
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout - shown on mobile */}
          <div className="sm:hidden space-y-3">
            {timecard.entries.map((entry) => (
              <div key={entry.id} className={`bg-card border rounded-lg p-4 space-y-3 ${isToday(entry.entryDate) ? "border-primary/30 border-l-4" : ""}`}>
                <div className="font-medium text-sm text-foreground">{formatDayLabel(entry.entryDate)}</div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Hours</label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    defaultValue={entry.hours}
                    disabled={isApproved || isSubmitted}
                    className="w-full h-10 text-center"
                    onBlur={(e) => handleBlur(entry, "hours", e.target.value)}
                    key={`h-${entry.id}-${entry.hours}`}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                  <Input
                    type="text"
                    placeholder="Notes…"
                    defaultValue={entry.notes || ""}
                    disabled={isApproved || isSubmitted}
                    className="w-full h-10 text-sm"
                    onBlur={(e) => handleBlur(entry, "notes", e.target.value)}
                    key={`n-${entry.id}-${entry.notes}`}
                  />
                </div>

                {/* Saved indicator */}
                {savedEntryId === entry.id && (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="h-3 w-3" /> Saved
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Status and Totals Summary */}
          <div className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
              <span className="text-sm font-semibold">
                Total: {totalHours.toFixed(1)} hours {mileageEnabled && `| ${totalMileage.toFixed(1)} miles`}
              </span>
              {statusBadge(timecard.status)}
            </div>
            {isSubmitted && (
              <span className="text-xs text-muted-foreground">Awaiting admin approval</span>
            )}
            {isApproved && (
              <span className="text-xs text-green-600 font-medium">Approved</span>
            )}
          </div>

          {/* Status Banners */}
          {isSubmitted && timecard.recipient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Timecard submitted to {timecard.recipient.name} on {new Date().toLocaleDateString()}
            </div>
          )}
          {isApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Timecard approved
            </div>
          )}

          {/* Submit To Section */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">Submit To</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Select
                value={timecard.recipientId ? String(timecard.recipientId) : ""}
                onValueChange={(val) => {
                  if (val && timecard) {
                    setRecipient.mutate({ timecardId: timecard.id, recipientId: parseInt(val, 10) });
                  }
                }}
                disabled={isSubmitted || isApproved}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {recipients?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.title ? `${r.name} — ${r.title}` : r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRecipientOpen(true)}
                disabled={isSubmitted || isApproved}
              >
                <Plus className="h-4 w-4 mr-1" /> Add New Recipient
              </Button>
            </div>

            {timecard.status === "draft" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={!timecard.recipientId || submitTimecard.isPending}
                    className="h-10"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Submit Timecard
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Timecard?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Submit timecard for {formatWeekLabel(currentMonday)} to{" "}
                      {timecard.recipient?.name || "selected recipient"}? Once submitted, you won't be able to edit hours — contact an admin if you need a correction.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => submitTimecard.mutate(timecard.id)}>
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Add New Recipient Dialog */}
          <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Recipient</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    placeholder="e.g. Claudia"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    placeholder="e.g. claudia@company.com"
                  />
                </div>
                <div>
                  <Label>Title (optional)</Label>
                  <Input
                    value={newRecipientTitle}
                    onChange={(e) => setNewRecipientTitle(e.target.value)}
                    placeholder="e.g. HR Manager"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddRecipientOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createRecipient.mutate({
                    name: newRecipientName.trim(),
                    email: newRecipientEmail.trim(),
                    title: newRecipientTitle.trim() || undefined,
                  })}
                  disabled={!newRecipientName.trim() || !newRecipientEmail.trim() || createRecipient.isPending}
                >
                  {createRecipient.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save Recipient
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No timecard data</div>
      )}

      {/* Edit History */}
      {timecard && timecard.auditLog && timecard.auditLog.length > 0 && (
        <div className="bg-card border rounded-lg">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Edit History ({timecard.auditLog.length})
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {historyOpen && (
            <div className="border-t px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
              {timecard.auditLog.map((log) => {
                const who = [log.changedBy.firstName, log.changedBy.lastName].filter(Boolean).join(" ") || log.changedBy.email;
                const when = new Date(log.changedAt).toLocaleString();
                return (
                  <div key={log.id} className="text-xs border-b last:border-b-0 pb-2 last:pb-0">
                    <span className="text-muted-foreground">{when}</span>
                    <span className="mx-1">·</span>
                    <span className="font-medium">{who}</span>
                    {log.action === "admin_edit" && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Admin</Badge>
                    )}
                    <p className="text-muted-foreground mt-0.5">{log.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Past Timecards */}
      {pastTimecards && pastTimecards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Past Timecards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastTimecards
              .filter((c) => c.weekStartDate !== currentMonday)
              .map((card) => (
                <button
                  key={card.id}
                  onClick={() => goToWeek(card.weekStartDate)}
                  className="bg-card border rounded-lg p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-sm">{formatWeekLabel(card.weekStartDate)}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">
                      {parseFloat(card.totalHours || "0").toFixed(1)} hrs
                    </span>
                    {statusBadge(card.status)}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
