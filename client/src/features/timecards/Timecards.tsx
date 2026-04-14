import { useState, useCallback, useEffect, useRef, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Loader2,
  LogIn,
  LogOut,
  Timer,
  Check,
  Car,
  Save,
  MessageSquare,
} from "lucide-react";

// ── Helpers ─────────────────────────────────

function formatTime24to12(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

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
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatWeekLabel(mondayIso: string): string {
  const mon = new Date(mondayIso + "T12:00:00");
  const sun = addDays(mon, 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Week of ${months[mon.getMonth()]} ${mon.getDate()} – ${months[sun.getMonth()]} ${sun.getDate()}`;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function isWeekend(iso: string): boolean {
  const d = new Date(iso + "T12:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ── Types ───────────────────────────────────

interface TimecardEntry {
  id: number;
  timecardId: number;
  entryDate: string;
  clockIn: string | null;
  clockOut: string | null;
  hours: string;
  otHours: string;
  ptoHours: string;
  holidayHours: string;
  entryType: string;
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

interface TimecardData {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  totalOtHours: string | null;
  totalPtoHours: string | null;
  totalHolidayHours: string | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
}

interface PastTimecard {
  id: number;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
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

interface MileageEntry {
  id: number;
  timecardId: number;
  entryDate: string;
  miles: string;
  purpose: string | null;
}


// ── Clock In / Out Widget ──────────────────

function ClockWidget({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [elapsed, setElapsed] = useState("");
  const [clockError, setClockError] = useState<string | null>(null);

  const { data: clockStatus } = useQuery<ClockStatus>({
    queryKey: ["/api/timecards/clock/status"],
    refetchInterval: 30000,
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/clock/in");
      return res.json();
    },
    onSuccess: () => {
      setClockError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
    },
    onError: (err: Error) => {
      setClockError(err.message || "Clock in failed");
      setTimeout(() => setClockError(null), 5000);
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/clock/out");
      return res.json();
    },
    onSuccess: () => {
      setClockError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/timecards/my/");
      }});
    },
    onError: (err: Error) => {
      setClockError(err.message || "Clock out failed");
      setTimeout(() => setClockError(null), 5000);
    },
  });

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
            {clockOut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogOut className="h-4 w-4 mr-1" />}
            Clock Out
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => clockIn.mutate()}
            disabled={clockIn.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {clockIn.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
            Clock In
          </Button>
        )}
      </div>

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

      {clockError && (
        <div className="mt-2 p-2 rounded text-sm bg-red-50 text-red-700">{clockError}</div>
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

// ── Read-Only Timecard Day Row (desktop) ──

function TimecardDayRow({
  entry,
  isToday,
  isWeekendDay,
  saveNote,
}: {
  entry: TimecardEntry;
  isToday: boolean;
  isWeekendDay: boolean;
  saveNote: (entryId: number, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(entry.notes || "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const serverNotes = useRef(entry.notes || "");

  useEffect(() => {
    if (notes === serverNotes.current) setNotes(entry.notes || "");
    serverNotes.current = entry.notes || "";
  }, [entry.notes]);

  const isDirty = notes !== serverNotes.current;

  const handleSaveNote = async () => {
    if (!isDirty) return;
    setSaveState("saving");
    try {
      await saveNote(entry.id, notes);
      serverNotes.current = notes;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  };

  const entryType = entry.entryType || "work";
  const noClockTimes = entryType === "work" && !entry.clockIn && !entry.clockOut;
  const hrs = noClockTimes ? 0 : parseFloat(entry.hours || "0");
  const ptoHrs = parseFloat(entry.ptoHours || "0");
  const holHrs = parseFloat(entry.holidayHours || "0");

  const typeColors: Record<string, string> = {
    work: "",
    pto: "bg-blue-50/70",
    holiday: "bg-indigo-50/70",
  };

  return (
    <tr
      className={`border-b last:border-b-0 ${
        isToday ? "border-l-4 border-l-primary bg-primary/5" : ""
      } ${isWeekendDay && entryType === "work" ? "bg-muted/20" : ""} ${
        typeColors[entryType] || ""
      }`}
    >
      <td className="px-3 py-2.5 font-medium text-sm whitespace-nowrap">
        {formatDayLabel(entry.entryDate)}
      </td>

      <td className="px-2 py-2.5 text-center text-sm">
        {entryType === "work" ? (
          <span className="text-muted-foreground">{formatTime24to12(entry.clockIn)}</span>
        ) : (
          <span className="text-xs">
            {entryType === "pto" && ptoHrs > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO</Badge>
            )}
            {entryType === "holiday" && holHrs > 0 && (
              <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Holiday</Badge>
            )}
          </span>
        )}
      </td>

      <td className="px-2 py-2.5 text-center text-sm">
        {entryType === "work" ? (
          <span className="text-muted-foreground">{formatTime24to12(entry.clockOut)}</span>
        ) : null}
      </td>

      <td className="px-2 py-2.5 text-center">
        <span className={`font-mono text-sm ${hrs > 0 || ptoHrs > 0 || holHrs > 0 ? "font-semibold" : "text-muted-foreground"}`}>
          {entryType === "pto" && ptoHrs > 0
            ? `${ptoHrs.toFixed(1)}h`
            : entryType === "holiday" && holHrs > 0
            ? `${holHrs.toFixed(1)}h`
            : hrs > 0
            ? `${hrs.toFixed(1)}h`
            : "—"}
        </span>
      </td>

      <td className="px-2 py-2.5">
        <input
          type="text"
          placeholder="Note / report issue…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNote}
          className="w-full border rounded px-2 py-1.5 text-sm bg-background h-8"
        />
      </td>

      <td className="px-2 py-2.5 text-center whitespace-nowrap">
        {saveState === "saved" ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-0.5 justify-center">
            <Check className="h-3 w-3" /> Saved
          </span>
        ) : saveState === "saving" ? (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 justify-center">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </span>
        ) : isDirty ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleSaveNote}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

// ── Read-Only Timecard Day Card (mobile) ──

function TimecardDayCard({
  entry,
  isToday,
  saveNote,
}: {
  entry: TimecardEntry;
  isToday: boolean;
  saveNote: (entryId: number, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(entry.notes || "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const serverNotes = useRef(entry.notes || "");

  useEffect(() => {
    if (notes === serverNotes.current) setNotes(entry.notes || "");
    serverNotes.current = entry.notes || "";
  }, [entry.notes]);

  const isDirty = notes !== serverNotes.current;

  const handleSaveNote = async () => {
    if (!isDirty) return;
    setSaveState("saving");
    try {
      await saveNote(entry.id, notes);
      serverNotes.current = notes;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
  };

  const entryType = entry.entryType || "work";
  const noClockTimes = entryType === "work" && !entry.clockIn && !entry.clockOut;
  const hrs = noClockTimes ? 0 : parseFloat(entry.hours || "0");
  const ptoHrs = parseFloat(entry.ptoHours || "0");
  const holHrs = parseFloat(entry.holidayHours || "0");

  return (
    <div
      className={`bg-card border rounded-lg p-4 space-y-2 ${
        isToday ? "border-primary/30 border-l-4" : ""
      } ${entryType === "pto" ? "bg-blue-50/50" : entryType === "holiday" ? "bg-indigo-50/50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{formatDayLabel(entry.entryDate)}</span>
        <div className="flex items-center gap-2">
          {entryType === "pto" && ptoHrs > 0 && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO {ptoHrs.toFixed(1)}h</Badge>
          )}
          {entryType === "holiday" && holHrs > 0 && (
            <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Holiday {holHrs.toFixed(1)}h</Badge>
          )}
          {entryType === "work" && hrs > 0 && (
            <span className="font-mono text-sm font-semibold">{hrs.toFixed(1)}h</span>
          )}
        </div>
      </div>

      {entryType === "work" && (entry.clockIn || entry.clockOut) && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatTime24to12(entry.clockIn)}</span>
          <span>→</span>
          <span>{formatTime24to12(entry.clockOut)}</span>
        </div>
      )}

      {/* Note / Report Issue */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Note / report issue…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNote}
          className="flex-1 border rounded px-2 py-1.5 text-sm bg-background"
        />
        {saveState === "saved" ? (
          <span className="text-xs text-green-600 flex items-center gap-0.5 shrink-0">
            <Check className="h-3 w-3" />
          </span>
        ) : saveState === "saving" ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
        ) : isDirty ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0" onClick={handleSaveNote}>
            <Save className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ── Wrapper (handles admin redirect before inner hooks) ──

export function Timecards() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && user && user.role === "admin") {
      navigate("/time-management");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return null;
  if (!user) return null;
  if (user.role === "admin") return null;

  return <TimecardsInner />;
}

// ── Component ───────────────────────────────

function TimecardsInner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [mileageMiles, setMileageMiles] = useState("");

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

  // Fetch mileage for current timecard
  const { data: mileageEntries = [] } = useQuery<MileageEntry[]>({
    queryKey: ["/api/timecards/" + timecard?.id + "/mileage"],
    queryFn: async () => {
      if (!timecard) return [];
      const res = await fetch(`/api/timecards/${timecard.id}/mileage`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!verifiedUser && !!timecard,
  });

  // Sync mileage input with existing data
  useEffect(() => {
    if (mileageEntries.length > 0) {
      const total = mileageEntries.reduce((sum, m) => sum + parseFloat(m.miles || "0"), 0);
      setMileageMiles(total > 0 ? String(total) : "");
    } else {
      setMileageMiles("");
    }
  }, [mileageEntries]);

  // Mutation: save weekly mileage
  const [mileageSaved, setMileageSaved] = useState(false);
  const [mileageError, setMileageError] = useState<string | null>(null);
  const addMileage = useMutation({
    mutationFn: async ({ timecardId, miles }: { timecardId: number; miles: string }) => {
      const res = await apiRequest("POST", `/api/timecards/${timecardId}/mileage`, { entryDate: currentMonday, miles: parseFloat(miles), purpose: null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + timecard?.id + "/mileage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
      setMileageSaved(true);
      setMileageError(null);
      setTimeout(() => setMileageSaved(false), 2000);
    },
    onError: (err: Error) => {
      console.error("[Mileage] Save error:", err);
      setMileageError(err.message || "Failed to save");
      setTimeout(() => setMileageError(null), 5000);
    },
  });


  // Save notes only (employees can't edit times)
  const saveNote = useCallback(async (entryId: number, notes: string): Promise<void> => {
    await apiRequest("PATCH", `/api/timecards/entries/${entryId}`, { notes: notes || null });
    queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
  }, [queryClient, currentMonday]);

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

  // Gate: require identity verification
  if (!verifiedUser) {
    return <IdentityGate onVerified={setVerifiedUser} />;
  }

  const totalHours = timecard?.totalHours ? parseFloat(timecard.totalHours) : 0;
  const totalOtHours = timecard?.totalOtHours ? parseFloat(timecard.totalOtHours) : 0;
  const totalPtoHours = timecard?.totalPtoHours ? parseFloat(timecard.totalPtoHours) : 0;
  const totalHolidayHours = timecard?.totalHolidayHours ? parseFloat(timecard.totalHolidayHours) : 0;
  const today = todayIso();

  const userName = verifiedUser
    ? [verifiedUser.firstName, verifiedUser.lastName].filter(Boolean).join(" ") || verifiedUser.email
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" /> My Timecards
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Logged in as <strong>{userName}</strong>
        </p>
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
          <style>{`
            @keyframes savedFlash {
              0% { background-color: rgb(220, 252, 231); }
              100% { background-color: transparent; }
            }
            .saved-flash { animation: savedFlash 2s ease-out forwards; }
          `}</style>

          {/* Desktop Grid */}
          <div className="bg-card border rounded-lg overflow-x-auto hidden sm:block">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-3 text-left font-medium text-muted-foreground w-32">Day</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-28">Clock In</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-28">Clock Out</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-20">Hours</th>
                  <th className="px-2 py-3 text-left font-medium text-muted-foreground">Note / Report Issue</th>
                  <th className="px-2 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {timecard.entries.map((entry) => (
                  <TimecardDayRow
                    key={entry.id}
                    entry={entry}
                    isToday={entry.entryDate === today}
                    isWeekendDay={isWeekend(entry.entryDate)}
                    saveNote={saveNote}
                  />
                ))}

                {/* Totals Row */}
                <tr className="bg-muted/40 font-semibold border-t-2">
                  <td className="px-3 py-3 text-sm">Total</td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3 text-center font-bold">
                    {totalHours.toFixed(1)}h
                    {totalOtHours > 0 && (
                      <span className="text-amber-600 ml-1 text-xs font-medium">(+{totalOtHours.toFixed(1)} OT)</span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-3 text-xs">
                      {totalPtoHours > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">PTO: {totalPtoHours.toFixed(1)}h</Badge>
                      )}
                      {totalHolidayHours > 0 && (
                        <Badge className="bg-indigo-100 text-indigo-700">Holiday: {totalHolidayHours.toFixed(1)}h</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {timecard.entries.map((entry) => (
              <TimecardDayCard
                key={entry.id}
                entry={entry}
                isToday={entry.entryDate === today}
                saveNote={saveNote}
              />
            ))}

            {/* Mobile Total */}
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Regular:</span>
                <span className="text-lg font-bold">{totalHours.toFixed(1)}h</span>
              </div>
              {totalOtHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-600">Overtime:</span>
                  <span className="text-lg font-bold text-amber-600">{totalOtHours.toFixed(1)}h</span>
                </div>
              )}
              {totalPtoHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">PTO:</span>
                  <span className="text-lg font-bold text-blue-600">{totalPtoHours.toFixed(1)}h</span>
                </div>
              )}
              {totalHolidayHours > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-indigo-600">Holiday:</span>
                  <span className="text-lg font-bold text-indigo-600">{totalHolidayHours.toFixed(1)}h</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No timecard data</div>
      )}

      {/* Mileage Section — simple weekly total */}
      {timecard && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 shrink-0">
              <Car className="h-4 w-4 text-primary" /> Mileage This Week
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={mileageMiles}
                onChange={(e) => setMileageMiles(e.target.value)}
                className="text-sm w-24 h-9"
              />
              <span className="text-sm text-muted-foreground">miles</span>
              <Button
                size="sm"
                onClick={() => addMileage.mutate({
                  timecardId: timecard.id,
                  miles: mileageMiles,
                })}
                disabled={addMileage.isPending || !mileageMiles || parseFloat(mileageMiles) <= 0}
              >
                {addMileage.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
              {mileageSaved && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><Check className="h-3 w-3" /> Saved</span>}
              {mileageError && <span className="text-xs text-red-600">{mileageError}</span>}
            </div>
          </div>
        </div>
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
          <h2 className="text-lg font-semibold mb-3">Past Timecards</h2>
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
                  <div className="mt-2 text-sm text-muted-foreground flex items-center gap-3">
                    <span>{parseFloat(card.totalHours || "0").toFixed(1)} hrs</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
