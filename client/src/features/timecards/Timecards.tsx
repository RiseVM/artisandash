import { useState, useCallback, useEffect, useRef, FormEvent } from "react";
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
  Plus,
  Trash2,
  Car,
  Save,
} from "lucide-react";

// ── Time Dropdown ──────────────────────────

const TIME_OPTIONS = Array.from({ length: 1440 }, (_, i) => {
  const h = Math.floor(i / 60);
  const m = i % 60;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  return { value, label };
});

function timeLabel(hhmm: string): string {
  const opt = TIME_OPTIONS.find((o) => o.value === hhmm);
  return opt ? opt.label : hhmm;
}

interface TimeDropdownProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function TimeDropdown({ value, onChange, disabled, placeholder }: TimeDropdownProps) {
  return (
    <Select
      value={value || ""}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[130px] h-9 text-sm">
        <SelectValue placeholder={placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent
        className="max-h-60 overflow-y-auto"
        position="popper"
      >
        {TIME_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

// Per-row local edit state
interface RowEdit {
  clockIn: string;
  clockOut: string;
  entryType: string;
  ptoHours: string;
  holidayHours: string;
  notes: string;
}

// ── Clock In / Out Widget ──────────────────

function ClockWidget({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [elapsed, setElapsed] = useState("");

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
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && key.startsWith("/api/timecards/my/");
      }});
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

// ── Timecard Day Row (sub-component for per-row state) ──

function TimecardDayRow({
  entry,
  isToday,
  isWeekendDay,
  saveEntry,
}: {
  entry: TimecardEntry;
  isToday: boolean;
  isWeekendDay: boolean;
  saveEntry: (entryId: number, body: Record<string, unknown>) => Promise<TimecardEntry>;
}) {
  const [clockIn, setClockIn] = useState(entry.clockIn || "");
  const [clockOut, setClockOut] = useState(entry.clockOut || "");
  const [entryType, setEntryType] = useState(entry.entryType || "work");
  const [ptoHours, setPtoHours] = useState(entry.ptoHours || "0");
  const [holidayHours, setHolidayHours] = useState(entry.holidayHours || "0");
  const [notes, setNotes] = useState(entry.notes || "");
  const [localHours, setLocalHours] = useState(entry.hours);
  const [localOtHours, setLocalOtHours] = useState(entry.otHours || "0");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Debounce timer for auto-save on dropdown change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs for latest values at debounce flush time
  const latestClockIn = useRef(clockIn);
  const latestClockOut = useRef(clockOut);
  latestClockIn.current = clockIn;
  latestClockOut.current = clockOut;

  // Server values for dirty tracking
  const serverRef = useRef({
    clockIn: entry.clockIn || "",
    clockOut: entry.clockOut || "",
    entryType: entry.entryType || "work",
    ptoHours: entry.ptoHours || "0",
    holidayHours: entry.holidayHours || "0",
    notes: entry.notes || "",
  });

  // Sync when server data changes (after refetch)
  useEffect(() => {
    const newCI = entry.clockIn || "";
    const newCO = entry.clockOut || "";
    const newType = entry.entryType || "work";
    const newPto = entry.ptoHours || "0";
    const newHol = entry.holidayHours || "0";
    const newNotes = entry.notes || "";

    // Only update local values if they match old server values (not dirty)
    if (clockIn === serverRef.current.clockIn) setClockIn(newCI);
    if (clockOut === serverRef.current.clockOut) setClockOut(newCO);
    if (entryType === serverRef.current.entryType) setEntryType(newType);
    if (ptoHours === serverRef.current.ptoHours) setPtoHours(newPto);
    if (holidayHours === serverRef.current.holidayHours) setHolidayHours(newHol);
    if (notes === serverRef.current.notes) setNotes(newNotes);

    serverRef.current = { clockIn: newCI, clockOut: newCO, entryType: newType, ptoHours: newPto, holidayHours: newHol, notes: newNotes };
    setLocalHours(entry.hours);
    setLocalOtHours(entry.otHours || "0");
  }, [entry.clockIn, entry.clockOut, entry.entryType, entry.ptoHours, entry.holidayHours, entry.notes, entry.hours, entry.otHours]);

  const isDirty =
    clockIn !== serverRef.current.clockIn ||
    clockOut !== serverRef.current.clockOut ||
    entryType !== serverRef.current.entryType ||
    ptoHours !== serverRef.current.ptoHours ||
    holidayHours !== serverRef.current.holidayHours ||
    notes !== serverRef.current.notes;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaveState("saving");
    setError(null);
    try {
      const body: Record<string, unknown> = { entryType };
      if (entryType === "work") {
        body.clockIn = clockIn || null;
        body.clockOut = clockOut || null;
      } else if (entryType === "pto") {
        body.ptoHours = parseFloat(ptoHours) || 0;
      } else if (entryType === "holiday") {
        body.holidayHours = parseFloat(holidayHours) || 0;
      }
      if (notes !== serverRef.current.notes) body.notes = notes || null;

      console.log(`[Timecard] Saving entry ${entry.id}:`, body);
      const result = await saveEntry(entry.id, body);
      console.log(`[Timecard] Save OK entry ${entry.id}:`, result);

      // Update local display from response
      if (result.hours) setLocalHours(result.hours);
      if (result.otHours) setLocalOtHours(result.otHours);

      // Update server ref to mark as clean
      serverRef.current = {
        clockIn: result.clockIn || "",
        clockOut: result.clockOut || "",
        entryType: result.entryType || "work",
        ptoHours: result.ptoHours || "0",
        holidayHours: result.holidayHours || "0",
        notes: result.notes || "",
      };

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      console.error(`[Timecard] Save error entry ${entry.id}:`, err);
      setError(msg);
      setSaveState("idle");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Debounced save for dropdown changes — fires with latest values
  const debouncedSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ci = latestClockIn.current;
      const co = latestClockOut.current;
      // Check if actually dirty vs server
      if (ci === serverRef.current.clockIn && co === serverRef.current.clockOut) return;
      setSaveState("saving");
      setError(null);
      try {
        const body: Record<string, unknown> = { entryType: "work", clockIn: ci || null, clockOut: co || null };
        console.log(`[Timecard] Debounced save entry ${entry.id}:`, body);
        const result = await saveEntry(entry.id, body);
        if (result.hours) setLocalHours(result.hours);
        if (result.otHours) setLocalOtHours(result.otHours);
        serverRef.current = {
          ...serverRef.current,
          clockIn: result.clockIn || "",
          clockOut: result.clockOut || "",
        };
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save";
        console.error(`[Timecard] Debounced save error entry ${entry.id}:`, err);
        setError(msg);
        setSaveState("idle");
        setTimeout(() => setError(null), 5000);
      }
    }, 300);
  }, [entry.id, saveEntry]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleClockChange = (field: "clockIn" | "clockOut", val: string) => {
    if (field === "clockIn") setClockIn(val);
    else setClockOut(val);
    debouncedSave();
  };

  const hrs = parseFloat(localHours || "0");
  const otHrs = parseFloat(localOtHours || "0");
  const ptoHrs = parseFloat(ptoHours || "0");
  const holHrs = parseFloat(holidayHours || "0");

  const typeColors = {
    work: "",
    pto: "bg-blue-50/70",
    holiday: "bg-indigo-50/70",
  };

  // ── Desktop Row ──
  return (
    <tr
      className={`border-b last:border-b-0 ${
        isToday ? "border-l-4 border-l-primary bg-primary/5" : ""
      } ${isWeekendDay && entryType === "work" ? "bg-muted/20" : ""} ${
        typeColors[entryType as keyof typeof typeColors] || ""
      } ${saveState === "saved" ? "saved-flash" : ""}`}
    >
      {/* Day Label */}
      <td className="px-3 py-2.5 font-medium text-sm whitespace-nowrap">
        {formatDayLabel(entry.entryDate)}
      </td>

      {/* Entry Type */}
      <td className="px-2 py-2.5">
        <div className="flex gap-0.5">
          {(["work", "pto", "holiday"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEntryType(t)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                entryType === t
                  ? t === "work" ? "bg-primary text-white"
                    : t === "pto" ? "bg-blue-500 text-white"
                    : "bg-indigo-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "work" ? "Work" : t === "pto" ? "PTO" : "Holiday"}
            </button>
          ))}
        </div>
      </td>

      {/* Clock In / Clock Out OR PTO/Holiday hours */}
      {entryType === "work" ? (
        <>
          <td className="px-2 py-2.5 text-center">
            <TimeDropdown
              value={clockIn}
              onChange={(val) => handleClockChange("clockIn", val)}
              placeholder="9:00 AM"
            />
          </td>
          <td className="px-2 py-2.5 text-center">
            <TimeDropdown
              value={clockOut}
              onChange={(val) => handleClockChange("clockOut", val)}
              placeholder="5:00 PM"
            />
          </td>
          <td className="px-2 py-2.5 text-center">
            <span className={`font-mono text-sm ${hrs > 0 ? "font-semibold" : "text-muted-foreground"}`}>
              {hrs > 0 ? `${hrs.toFixed(1)}h` : "—"}
            </span>
          </td>
          <td className="px-2 py-2.5 text-center">
            {otHrs > 0 ? (
              <span className="font-mono text-sm font-semibold text-amber-600">
                {otHrs.toFixed(1)}h
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </td>
        </>
      ) : (
        <td colSpan={4} className="px-2 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {entryType === "pto" ? "PTO Hours:" : "Holiday Hours:"}
            </span>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={entryType === "pto" ? ptoHours : holidayHours}
              onChange={(e) => entryType === "pto" ? setPtoHours(e.target.value) : setHolidayHours(e.target.value)}
              onBlur={handleSave}
              className="border rounded px-2 py-1.5 text-sm text-center w-20 bg-background"
            />
            <span className="text-xs text-muted-foreground">hrs</span>
            {entryType === "pto" && ptoHrs > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO {ptoHrs.toFixed(1)}h</Badge>
            )}
            {entryType === "holiday" && holHrs > 0 && (
              <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Holiday {holHrs.toFixed(1)}h</Badge>
            )}
          </div>
        </td>
      )}

      {/* Notes */}
      <td className="px-2 py-2.5">
        <input
          type="text"
          placeholder="Notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSave}
          className="w-full border rounded px-2 py-1.5 text-sm bg-background h-8"
        />
      </td>

      {/* Save / Status */}
      <td className="px-2 py-2.5 text-center whitespace-nowrap">
        {saveState === "saved" ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-0.5 justify-center">
            <Check className="h-3 w-3" /> Saved
          </span>
        ) : saveState === "saving" ? (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5 justify-center">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </span>
        ) : error ? (
          <span className="text-[10px] text-red-500 font-medium max-w-[80px] truncate block">{error}</span>
        ) : isDirty ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

// ── Timecard Day Card (mobile sub-component) ──

function TimecardDayCard({
  entry,
  isToday,
  saveEntry,
}: {
  entry: TimecardEntry;
  isToday: boolean;
  saveEntry: (entryId: number, body: Record<string, unknown>) => Promise<TimecardEntry>;
}) {
  const [clockIn, setClockIn] = useState(entry.clockIn || "");
  const [clockOut, setClockOut] = useState(entry.clockOut || "");
  const [entryType, setEntryType] = useState(entry.entryType || "work");
  const [ptoHours, setPtoHours] = useState(entry.ptoHours || "0");
  const [holidayHours, setHolidayHours] = useState(entry.holidayHours || "0");
  const [notes, setNotes] = useState(entry.notes || "");
  const [localHours, setLocalHours] = useState(entry.hours);
  const [localOtHours, setLocalOtHours] = useState(entry.otHours || "0");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestClockIn = useRef(clockIn);
  const latestClockOut = useRef(clockOut);
  latestClockIn.current = clockIn;
  latestClockOut.current = clockOut;

  const serverRef = useRef({
    clockIn: entry.clockIn || "",
    clockOut: entry.clockOut || "",
    entryType: entry.entryType || "work",
    ptoHours: entry.ptoHours || "0",
    holidayHours: entry.holidayHours || "0",
    notes: entry.notes || "",
  });

  useEffect(() => {
    const newCI = entry.clockIn || "";
    const newCO = entry.clockOut || "";
    const newType = entry.entryType || "work";
    const newPto = entry.ptoHours || "0";
    const newHol = entry.holidayHours || "0";
    const newNotes = entry.notes || "";

    if (clockIn === serverRef.current.clockIn) setClockIn(newCI);
    if (clockOut === serverRef.current.clockOut) setClockOut(newCO);
    if (entryType === serverRef.current.entryType) setEntryType(newType);
    if (ptoHours === serverRef.current.ptoHours) setPtoHours(newPto);
    if (holidayHours === serverRef.current.holidayHours) setHolidayHours(newHol);
    if (notes === serverRef.current.notes) setNotes(newNotes);

    serverRef.current = { clockIn: newCI, clockOut: newCO, entryType: newType, ptoHours: newPto, holidayHours: newHol, notes: newNotes };
    setLocalHours(entry.hours);
    setLocalOtHours(entry.otHours || "0");
  }, [entry.clockIn, entry.clockOut, entry.entryType, entry.ptoHours, entry.holidayHours, entry.notes, entry.hours, entry.otHours]);

  const isDirty =
    clockIn !== serverRef.current.clockIn ||
    clockOut !== serverRef.current.clockOut ||
    entryType !== serverRef.current.entryType ||
    ptoHours !== serverRef.current.ptoHours ||
    holidayHours !== serverRef.current.holidayHours ||
    notes !== serverRef.current.notes;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaveState("saving");
    setError(null);
    try {
      const body: Record<string, unknown> = { entryType };
      if (entryType === "work") {
        body.clockIn = clockIn || null;
        body.clockOut = clockOut || null;
      } else if (entryType === "pto") {
        body.ptoHours = parseFloat(ptoHours) || 0;
      } else if (entryType === "holiday") {
        body.holidayHours = parseFloat(holidayHours) || 0;
      }
      if (notes !== serverRef.current.notes) body.notes = notes || null;

      const result = await saveEntry(entry.id, body);
      if (result.hours) setLocalHours(result.hours);
      if (result.otHours) setLocalOtHours(result.otHours);
      serverRef.current = {
        clockIn: result.clockIn || "",
        clockOut: result.clockOut || "",
        entryType: result.entryType || "work",
        ptoHours: result.ptoHours || "0",
        holidayHours: result.holidayHours || "0",
        notes: result.notes || "",
      };
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
      setSaveState("idle");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Debounced save for dropdown changes — fires with latest values
  const debouncedSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ci = latestClockIn.current;
      const co = latestClockOut.current;
      if (ci === serverRef.current.clockIn && co === serverRef.current.clockOut) return;
      setSaveState("saving");
      setError(null);
      try {
        const body: Record<string, unknown> = { entryType: "work", clockIn: ci || null, clockOut: co || null };
        const result = await saveEntry(entry.id, body);
        if (result.hours) setLocalHours(result.hours);
        if (result.otHours) setLocalOtHours(result.otHours);
        serverRef.current = {
          ...serverRef.current,
          clockIn: result.clockIn || "",
          clockOut: result.clockOut || "",
        };
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save";
        setError(msg);
        setSaveState("idle");
        setTimeout(() => setError(null), 5000);
      }
    }, 300);
  }, [entry.id, saveEntry]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleClockChange = (field: "clockIn" | "clockOut", val: string) => {
    if (field === "clockIn") setClockIn(val);
    else setClockOut(val);
    debouncedSave();
  };

  const hrs = parseFloat(localHours || "0");
  const otHrs = parseFloat(localOtHours || "0");
  const ptoHrs = parseFloat(ptoHours || "0");
  const holHrs = parseFloat(holidayHours || "0");

  return (
    <div
      className={`bg-card border rounded-lg p-4 space-y-3 ${
        isToday ? "border-primary/30 border-l-4" : ""
      } ${entryType === "pto" ? "bg-blue-50/50" : entryType === "holiday" ? "bg-indigo-50/50" : ""} ${
        saveState === "saved" ? "saved-flash" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{formatDayLabel(entry.entryDate)}</span>
        <div className="flex items-center gap-2">
          {entryType === "work" && hrs > 0 && (
            <span className="font-mono text-sm font-semibold">{hrs.toFixed(1)}h</span>
          )}
          {entryType === "work" && otHrs > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px]">OT {otHrs.toFixed(1)}h</Badge>
          )}
          {entryType === "pto" && ptoHrs > 0 && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO {ptoHrs.toFixed(1)}h</Badge>
          )}
          {entryType === "holiday" && holHrs > 0 && (
            <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Holiday {holHrs.toFixed(1)}h</Badge>
          )}
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex gap-1">
        {(["work", "pto", "holiday"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setEntryType(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              entryType === t
                ? t === "work" ? "bg-primary text-white"
                  : t === "pto" ? "bg-blue-500 text-white"
                  : "bg-indigo-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "work" ? "Work" : t === "pto" ? "PTO" : "Holiday"}
          </button>
        ))}
      </div>

      {entryType === "work" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Clock In</label>
            <TimeDropdown value={clockIn} onChange={(val) => handleClockChange("clockIn", val)} placeholder="9:00 AM" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Clock Out</label>
            <TimeDropdown value={clockOut} onChange={(val) => handleClockChange("clockOut", val)} placeholder="5:00 PM" />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            {entryType === "pto" ? "PTO Hours" : "Holiday Hours"}
          </label>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={entryType === "pto" ? ptoHours : holidayHours}
            onChange={(e) => entryType === "pto" ? setPtoHours(e.target.value) : setHolidayHours(e.target.value)}
            onBlur={handleSave}
            className="border rounded px-2 py-2 text-sm w-24 bg-background"
          />
        </div>
      )}

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Notes</label>
        <input
          type="text"
          placeholder="Notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSave}
          className="w-full border rounded px-2 py-2 text-sm bg-background"
        />
      </div>

      {/* Save / Status */}
      <div className="flex items-center gap-2">
        {saveState === "saved" ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Check className="h-3 w-3" /> Saved
          </span>
        ) : saveState === "saving" ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        ) : error ? (
          <span className="text-xs text-red-500">{error}</span>
        ) : isDirty ? (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        ) : null}
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
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [mileageDate, setMileageDate] = useState(() => todayIso());
  const [mileageMiles, setMileageMiles] = useState("");
  const [mileagePurpose, setMileagePurpose] = useState("");
  const [saveAllState, setSaveAllState] = useState<"idle" | "saving" | "saved">("idle");

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

  // Mutation: add mileage
  const addMileage = useMutation({
    mutationFn: async ({ timecardId, entryDate, miles, purpose }: { timecardId: number; entryDate: string; miles: string; purpose: string }) => {
      const res = await apiRequest("POST", `/api/timecards/${timecardId}/mileage`, { entryDate, miles: parseFloat(miles), purpose });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + timecard?.id + "/mileage"] });
      setShowAddMileage(false);
      setMileageMiles("");
      setMileagePurpose("");
    },
  });

  // Mutation: delete mileage
  const deleteMileage = useMutation({
    mutationFn: async (mileageId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/mileage/${mileageId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + timecard?.id + "/mileage"] });
    },
  });

  // Save a single entry — returns the response data
  const saveEntry = useCallback(async (entryId: number, body: Record<string, unknown>): Promise<TimecardEntry> => {
    const res = await apiRequest("PATCH", `/api/timecards/entries/${entryId}`, body);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || `Save failed (${res.status})`);
    }
    const result = await res.json();
    // Invalidate queries in background to refresh totals
    queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
    queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
    return result;
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
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-36">Type</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-32">Clock In</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-32">Clock Out</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-20">Reg Hrs</th>
                  <th className="px-2 py-3 text-center font-medium text-muted-foreground w-20">
                    <span className="text-amber-600">OT Hrs</span>
                  </th>
                  <th className="px-2 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  <th className="px-2 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {timecard.entries.map((entry) => (
                  <TimecardDayRow
                    key={entry.id}
                    entry={entry}
                    isToday={entry.entryDate === today}
                    isWeekendDay={isWeekend(entry.entryDate)}
                    saveEntry={saveEntry}
                  />
                ))}

                {/* Totals Row */}
                <tr className="bg-muted/40 font-semibold border-t-2">
                  <td className="px-3 py-3 text-sm">Total</td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3"></td>
                  <td className="px-2 py-3 text-center font-bold">
                    {totalHours.toFixed(1)}h
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-amber-600">
                    {totalOtHours > 0 ? `${totalOtHours.toFixed(1)}h` : "—"}
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
                saveEntry={saveEntry}
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

      {/* Mileage Section */}
      {timecard && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Mileage This Week
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setMileageDate(todayIso());
                setShowAddMileage(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Log Mileage
            </Button>
          </div>

          {mileageEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Miles</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Purpose</th>
                    <th className="py-2 px-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {mileageEntries.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2 px-3">{formatDayLabel(m.entryDate)}</td>
                      <td className="py-2 px-3 text-right font-mono">{parseFloat(m.miles).toFixed(1)}</td>
                      <td className="py-2 px-3 text-muted-foreground">{m.purpose || "—"}</td>
                      <td className="py-2 px-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-500 hover:text-red-700"
                          onClick={() => deleteMileage.mutate(m.id)}
                          disabled={deleteMileage.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold border-t-2">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {mileageEntries.reduce((sum, m) => sum + parseFloat(m.miles || "0"), 0).toFixed(1)} miles
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No mileage logged this week</p>
          )}

          {showAddMileage && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <h4 className="text-sm font-medium">Log Mileage</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Date</Label>
                  <select
                    value={mileageDate}
                    onChange={(e) => setMileageDate(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    {timecard.entries.map((entry) => (
                      <option key={entry.entryDate} value={entry.entryDate}>
                        {formatDayLabel(entry.entryDate)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Miles</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    value={mileageMiles}
                    onChange={(e) => setMileageMiles(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Purpose *</Label>
                  <Input
                    type="text"
                    placeholder="Client site visit, supply run…"
                    value={mileagePurpose}
                    onChange={(e) => setMileagePurpose(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addMileage.mutate({
                    timecardId: timecard.id,
                    entryDate: mileageDate,
                    miles: mileageMiles,
                    purpose: mileagePurpose,
                  })}
                  disabled={addMileage.isPending || !mileageMiles || !mileagePurpose.trim()}
                >
                  {addMileage.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddMileage(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
