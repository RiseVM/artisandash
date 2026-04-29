import { useState, useCallback, useEffect, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  ShieldCheck,
  Loader2,
  Clock,
  Play,
  Square,
  CheckCheck,
  Send,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function initials(firstName: string | null, lastName: string | null): string {
  return [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

function fullName(u: { firstName: string | null; lastName: string | null; email: string }): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email;
}

/**
 * Live-ticking "hours today" display. When the employee is clocked in, combines
 * completed punches today with the running length of the current shift (now -
 * clockInTime) and re-renders every second so payroll can see the number tick.
 * When clocked out, just shows the static completed total.
 */
function LiveTodayHours({
  clockedIn,
  clockInTime,
  completedHours,
}: {
  clockedIn: boolean;
  clockInTime: string | null;
  completedHours: number;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!clockedIn || !clockInTime) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [clockedIn, clockInTime]);

  let liveTotal = completedHours;
  let runningMinutes: number | null = null;
  if (clockedIn && clockInTime) {
    const diffMs = Math.max(0, Date.now() - new Date(clockInTime).getTime());
    const currentShiftHours = diffMs / 3_600_000;
    liveTotal = completedHours + currentShiftHours;
    runningMinutes = Math.floor(diffMs / 60_000);
  }

  if (!clockedIn) {
    if (completedHours <= 0) return null;
    return <span>{completedHours.toFixed(1)}h today</span>;
  }

  // Format the running shift as "Xh YYm" for a clearer live read
  const runningLabel = (() => {
    if (runningMinutes === null) return "";
    const h = Math.floor(runningMinutes / 60);
    const m = runningMinutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  })();

  return (
    <span
      className="font-medium text-green-700 tabular-nums"
      title={`${completedHours.toFixed(2)}h completed earlier + ${runningLabel} current shift`}
    >
      {liveTotal.toFixed(2)}h today{" "}
      <span className="text-green-600 font-normal">({runningLabel} this shift)</span>
    </span>
  );
}

// ── Time Picker ────────────────────────────

function parseToHMA(iso: string): { h: number; m: number; a: "AM" | "PM" } {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const a: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { h, m, a };
}

function hmaTo24(h: number, m: number, a: "AM" | "PM"): { h24: number; m: number } {
  let h24 = h;
  if (a === "AM" && h === 12) h24 = 0;
  else if (a === "PM" && h !== 12) h24 = h + 12;
  return { h24, m };
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function TimePicker({
  value,
  punchDate,
  defaultHour,
  defaultMin,
  defaultAMPM,
  onChange,
}: {
  value: string | null;
  punchDate?: string; // "YYYY-MM-DD" — anchors the date so clock-in and clock-out share the same calendar day
  defaultHour: number;
  defaultMin: number;
  defaultAMPM: "AM" | "PM";
  onChange: (isoString: string) => void;
}) {
  const parsed = value ? parseToHMA(value) : null;
  const [hour, setHour] = useState(parsed?.h ?? defaultHour);
  const [min, setMin] = useState(parsed ? Math.round(parsed.m / 5) * 5 : defaultMin);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed?.a ?? defaultAMPM);

  const commit = (h: number, m: number, a: "AM" | "PM") => {
    if (!value && !punchDate) return;
    const { h24 } = hmaTo24(h, m, a);
    // Always anchor to punchDate so both clock-in and clock-out share the same calendar day
    const d = punchDate
      ? new Date(punchDate + "T12:00:00") // noon avoids DST edge cases
      : new Date(value!);
    d.setHours(h24, m, 0, 0);
    onChange(d.toISOString());
  };

  return (
    <div className="flex items-center gap-0.5">
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={hour}
        onChange={(e) => { const h = parseInt(e.target.value); setHour(h); commit(h, min, ampm); }}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">:</span>
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={min}
        onChange={(e) => { const m = parseInt(e.target.value); setMin(m); commit(hour, m, ampm); }}
      >
        {MINS.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={ampm}
        onChange={(e) => { const a = e.target.value as "AM" | "PM"; setAmpm(a); commit(hour, min, a); }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/** Picker for empty days — shows placeholder until admin selects a time, no auto-commit */
function EmptyDayTimePicker({
  punchDate,
  defaultHour,
  defaultMin,
  defaultAMPM,
  onTimeSet,
}: {
  punchDate: string;
  defaultHour: number;
  defaultMin: number;
  defaultAMPM: "AM" | "PM";
  onTimeSet: (h: number, m: number, a: "AM" | "PM") => void;
}) {
  const [hour, setHour] = useState<number | null>(null);
  const [min, setMin] = useState<number>(defaultMin);
  const [ampm, setAmpm] = useState<"AM" | "PM">(defaultAMPM);

  // Not yet touched — show placeholder
  if (hour === null) {
    return (
      <div className="flex items-center gap-0.5">
        <select
          className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer text-muted-foreground"
          value=""
          onChange={(e) => {
            const h = parseInt(e.target.value);
            setHour(h);
            onTimeSet(h, min, ampm);
          }}
        >
          <option value="" disabled>hr</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">:</span>
        <select
          className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer text-muted-foreground"
          value={min}
          onChange={(e) => setMin(parseInt(e.target.value))}
        >
          {MINS.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
        <select
          className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer text-muted-foreground"
          value={ampm}
          onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    );
  }

  // Once hour is selected, act like a normal time picker
  return (
    <div className="flex items-center gap-0.5">
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={hour}
        onChange={(e) => { const h = parseInt(e.target.value); setHour(h); onTimeSet(h, min, ampm); }}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">:</span>
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={min}
        onChange={(e) => { const m = parseInt(e.target.value); setMin(m); onTimeSet(hour, m, ampm); }}
      >
        {MINS.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        className="h-7 text-xs border rounded px-1 bg-background appearance-none cursor-pointer"
        value={ampm}
        onChange={(e) => { const a = e.target.value as "AM" | "PM"; setAmpm(a); onTimeSet(hour, min, a); }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/** Row for days with no punches — auto-saves punch once both times are picked */
function EmptyDayRow({
  entryDate,
  entryHours,
  onAddPunch,
  onEditHours,
  isPending,
}: {
  entryDate: string;
  entryHours: string;
  onAddPunch: (clockIn: string, clockOut: string) => void;
  onEditHours: (val: string) => void;
  isPending: boolean;
}) {
  const [ciTime, setCiTime] = useState<{ h: number; m: number; a: "AM" | "PM" } | null>(null);
  const [coTime, setCoTime] = useState<{ h: number; m: number; a: "AM" | "PM" } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const buildIso = (h: number, m: number, a: "AM" | "PM") => {
    const { h24 } = hmaTo24(h, m, a);
    const d = new Date(entryDate + "T12:00:00");
    d.setHours(h24, m, 0, 0);
    return d.toISOString();
  };

  // Auto-save as soon as both times are set
  const tryAutoSave = (
    ci: { h: number; m: number; a: "AM" | "PM" } | null,
    co: { h: number; m: number; a: "AM" | "PM" } | null,
  ) => {
    if (ci && co && !submitted) {
      setSubmitted(true);
      onAddPunch(buildIso(ci.h, ci.m, ci.a), buildIso(co.h, co.m, co.a));
    }
  };

  return (
    <div className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-2 items-center mb-1">
      <span className="text-sm font-medium">{formatDayLabel(entryDate)}</span>
      <EmptyDayTimePicker
        punchDate={entryDate}
        defaultHour={9}
        defaultMin={0}
        defaultAMPM="AM"
        onTimeSet={(h, m, a) => {
          const ci = { h, m, a };
          setCiTime(ci);
          tryAutoSave(ci, coTime);
        }}
      />
      <EmptyDayTimePicker
        punchDate={entryDate}
        defaultHour={5}
        defaultMin={0}
        defaultAMPM="PM"
        onTimeSet={(h, m, a) => {
          const co = { h, m, a };
          setCoTime(co);
          tryAutoSave(ciTime, co);
        }}
      />
      <span className="text-sm text-center text-muted-foreground">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "—"}
      </span>
      <span></span>
    </div>
  );
}

/** Inline row to add a break / additional punch on a day that already has punches */
function AddBreakRow({
  entryDate,
  onAddPunch,
  isPending,
}: {
  entryDate: string;
  onAddPunch: (clockIn: string, clockOut: string) => void;
  isPending: boolean;
}) {
  const [showPickers, setShowPickers] = useState(false);
  const [ciTime, setCiTime] = useState<{ h: number; m: number; a: "AM" | "PM" } | null>(null);
  const [coTime, setCoTime] = useState<{ h: number; m: number; a: "AM" | "PM" } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const buildIso = (h: number, m: number, a: "AM" | "PM") => {
    const { h24 } = hmaTo24(h, m, a);
    const d = new Date(entryDate + "T12:00:00");
    d.setHours(h24, m, 0, 0);
    return d.toISOString();
  };

  const tryAutoSave = (
    ci: { h: number; m: number; a: "AM" | "PM" } | null,
    co: { h: number; m: number; a: "AM" | "PM" } | null,
  ) => {
    if (ci && co && !submitted) {
      setSubmitted(true);
      onAddPunch(buildIso(ci.h, ci.m, ci.a), buildIso(co.h, co.m, co.a));
    }
  };

  if (!showPickers) {
    return (
      <div className="grid grid-cols-[90px_1fr] gap-2 items-center mb-1">
        <span></span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground w-fit px-2"
          onClick={() => setShowPickers(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add punch
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-2 items-center mb-1">
      <span></span>
      <EmptyDayTimePicker
        punchDate={entryDate}
        defaultHour={12}
        defaultMin={0}
        defaultAMPM="PM"
        onTimeSet={(h, m, a) => {
          const ci = { h, m, a };
          setCiTime(ci);
          tryAutoSave(ci, coTime);
        }}
      />
      <EmptyDayTimePicker
        punchDate={entryDate}
        defaultHour={5}
        defaultMin={0}
        defaultAMPM="PM"
        onTimeSet={(h, m, a) => {
          const co = { h, m, a };
          setCoTime(co);
          tryAutoSave(ciTime, co);
        }}
      />
      <span className="text-sm text-center text-muted-foreground">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "—"}
      </span>
      <span></span>
    </div>
  );
}

// ── Types ───────────────────────────────────

interface CardUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface TimecardEntry {
  id: number;
  timecardId: number;
  entryDate: string;
  hours: string;
  notes: string | null;
  hoursLocked?: boolean;
}

interface AuditLogEntry {
  id: number;
  action: string;
  entryDate: string | null;
  oldHours: string | null;
  newHours: string | null;
  description: string | null;
  reason: string | null;
  changedAt: string;
  changedBy: CardUser;
}

interface TimecardWithUser {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  totalOtHours?: string | null;
  hasCorrections?: boolean;
  lastCorrectionAt?: string | null;
  user: CardUser;
  clockStatus?: {
    clockedIn: boolean;
    clockInTime: string | null;
    todayHours: number;
  };
}

interface TimecardPunch {
  id: number;
  punchDate: string;
  clockIn: string;
  clockOut: string | null;
  hours: string | null;
  notes: string | null;
}

interface TimecardDetail {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  hasCorrections?: boolean;
  lastCorrectionAt?: string | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
  punches: TimecardPunch[];
}

// ── Identity Verification Gate ──────────────

interface VerifiedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function AdminIdentityGate({ onVerified }: { onVerified: (user: VerifiedUser) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const verify = useMutation({
    mutationFn: async (pw: string) => {
      const res = await apiRequest("POST", "/api/timecards/verify-identity", { password: pw });
      return res.json();
    },
    onSuccess: (data: { verified: boolean; user: VerifiedUser }) => {
      if (data.verified) {
        onVerified(data.user);
      }
    },
    onError: (err: Error) => {
      setError(err.message.includes("Incorrect") ? "Incorrect password. Try again." : "Verification failed. Please try again.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    verify.mutate(password);
  };

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-full max-w-sm">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="text-center">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
            <h2 className="text-xl font-bold">Admin Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please verify your identity to manage employee timecards
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="admin-verify-password">Password</Label>
              <PasswordInput
                id="admin-verify-password"
                autoFocus
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
                "Continue to Time Management"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────

export function TimeManagement() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);

  // Anyone with `manage_timecards` can manage timecards here — typically admin
  // and designated payroll staff (e.g. Maria). Variable kept for minimal churn
  // in the rest of this file.
  const isAdminUser = hasPermission("manage_timecards");
  const isVerified = !!verifiedUser;

  // ALL hooks must be above any conditional returns (React Rules of Hooks)

  // Fetch all timecards for selected week
  const { data: allCards = [], isLoading } = useQuery<TimecardWithUser[]>({
    queryKey: ["/api/timecards/admin/all", { weekStartDate: currentMonday, userId: userFilter !== "all" ? userFilter : undefined, status: statusFilter !== "all" ? statusFilter : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("weekStartDate", currentMonday);
      if (userFilter !== "all") params.set("userId", userFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/timecards/admin/all?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: isAdminUser && isVerified,
    refetchInterval: 30000,
  });

  // Fetch all active users for dropdown
  const { data: activeUsers = [] } = useQuery<CardUser[]>({
    queryKey: ["/api/timecards/admin/users"],
    enabled: isAdminUser && isVerified,
  });

  // Fetch expanded card detail
  const { data: expandedDetail } = useQuery<TimecardDetail>({
    queryKey: ["/api/timecards/admin/" + expandedCard],
    enabled: isAdminUser && isVerified && expandedCard !== null,
  });

  // Mutation: admin edit entry
  const adminEditEntry = useMutation({
    mutationFn: async ({ entryId, hours, notes }: { entryId: number; hours: string; notes: string | null }) => {
      const res = await apiRequest("PATCH", `/api/timecards/admin/entries/${entryId}`, { hours, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
      toast({ title: "Entry updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update entry", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: admin edit punch time
  const adminEditPunch = useMutation({
    mutationFn: async ({ punchId, clockIn, clockOut }: { punchId: number; clockIn: string; clockOut: string | null }) => {
      const res = await apiRequest("PATCH", `/api/timecards/admin/punches/${punchId}`, { clockIn, clockOut });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
      toast({ title: "Punch time updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update punch", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: admin add punch (for days with no punches)
  const adminAddPunch = useMutation({
    mutationFn: async ({ userId, punchDate, clockIn, clockOut }: { userId: string; punchDate: string; clockIn: string; clockOut: string | null }) => {
      const res = await apiRequest("POST", `/api/timecards/admin/punches`, { userId, punchDate, clockIn, clockOut });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
      toast({ title: "Punch added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add punch", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: admin delete punch
  const adminDeletePunch = useMutation({
    mutationFn: async (punchId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/punches/${punchId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
      toast({ title: "Punch cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to clear punch", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: approve
  const approveTimecard = useMutation({
    mutationFn: async (timecardId: number) => {
      const res = await apiRequest("POST", `/api/timecards/admin/${timecardId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
    },
  });

  // Mutation: admin clock in/out an employee
  const adminClock = useMutation({
    mutationFn: async ({ userId, action, name }: { userId: string; action: "in" | "out"; name: string }) => {
      const res = await apiRequest("POST", `/api/timecards/admin/clock-${action}`, { userId });
      return { ...(await res.json()), name, action };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      toast({ title: `${data.name} clocked ${data.action}`, description: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) });
    },
    onError: (err: Error) => {
      toast({ title: "Clock action failed", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: approve all timecards for the week
  const approveAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/admin/approve-all", { weekStartDate: currentMonday });
      return res.json();
    },
    onSuccess: (data: { approved: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      toast({ title: `${data.approved} timecard${data.approved === 1 ? "" : "s"} approved` });
    },
    onError: (err: Error) => {
      toast({ title: "Approve failed", description: String(err.message), variant: "destructive" });
    },
  });

  // Mutation: send payroll email
  const sendPayroll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/admin/send-payroll", { weekStartDate: currentMonday });
      return res.json();
    },
    onSuccess: (data: { sentTo: string[]; cardCount: number }) => {
      toast({ title: "Payroll sent", description: `${data.cardCount} timecards emailed to ${data.sentTo.join(", ")}` });
    },
    onError: (err: Error) => {
      toast({ title: "Send payroll failed", description: String(err.message), variant: "destructive" });
    },
  });

  const navigateWeek = useCallback((direction: -1 | 1) => {
    setExpandedCard(null);
    setCurrentMonday((prev) => {
      const d = new Date(prev + "T12:00:00");
      return formatIso(addDays(d, direction * 7));
    });
  }, []);

  const handleAdminBlur = useCallback(
    (entry: TimecardEntry, field: "hours" | "notes", value: string) => {
      if (field === "hours") {
        // Compare numerically to avoid "0.00" vs "0" vs "0.0" mismatches
        const newVal = parseFloat(value) || 0;
        const oldVal = parseFloat(entry.hours) || 0;
        if (newVal === oldVal) return;
      } else {
        if (value === (entry.notes || "")) return;
      }

      adminEditEntry.mutate({
        entryId: entry.id,
        hours: field === "hours" ? value : entry.hours,
        notes: field === "notes" ? (value || null) : entry.notes,
      });
    },
    [adminEditEntry],
  );

  // Week summary — sum of work hours INCLUDING overtime. The DB splits hours
  // into a regular column (capped at 40) and an OT column (anything over) for
  // payroll math, but the headline number on the dashboard should show the
  // actual hours worked, not just the capped portion. Without adding the OT
  // column back in, a 40.7-hour week reads as "40 hrs".
  const weekTotalHours = allCards.reduce(
    (s, c) => s + parseFloat(c.totalHours || "0") + parseFloat(c.totalOtHours || "0"),
    0,
  );

  // Conditional renders AFTER all hooks
  if (user && !isAdminUser) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You need the "Manage Timecards & Payroll" permission to view this page.
        </p>
      </div>
    );
  }

  if (!isVerified) {
    return <AdminIdentityGate onVerified={setVerifiedUser} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Time Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve employee timecards</p>
      </div>

      {/* Week Nav + Filters */}
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold min-w-[260px] text-center">
            {formatWeekLabel(currentMonday)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {activeUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {fullName(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{weekTotalHours.toFixed(1)}</span> total hours across {allCards.length} {allCards.length === 1 ? "card" : "cards"}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => approveAll.mutate()}
              disabled={approveAll.isPending || allCards.filter((c) => c.status !== "approved").length === 0}
            >
              {approveAll.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCheck className="h-3 w-3 mr-1" />}
              Approve All
            </Button>
            <Button
              size="sm"
              onClick={() => sendPayroll.mutate()}
              disabled={sendPayroll.isPending || allCards.filter((c) => c.status === "approved").length === 0}
            >
              {sendPayroll.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              Send to Payroll
            </Button>
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading timecards…</div>
      ) : allCards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No timecards found for this week</div>
      ) : (
        <div className="space-y-3">
          {(() => {
            // Hoisted once per render so each row in the .map below can
            // cheaply check whether we're viewing the live current week.
            // The server attaches "clocked in right now" + "hours today" to
            // every card regardless of week, so without this guard a past
            // week's row can read "Maria — In since 9:14 AM" when that's
            // really her *today's* status, not last week's.
            const todayMondayIso = formatIso(getMonday(new Date()));
            const viewingCurrentWeek = currentMonday === todayMondayIso;
            return allCards.map((card) => {
              const isExpanded = expandedCard === card.id;
              const isClockedIn = viewingCurrentWeek && (card.clockStatus?.clockedIn ?? false);
              const clockTime = card.clockStatus?.clockInTime
                ? new Date(card.clockStatus.clockInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : null;
              const todayHrs = viewingCurrentWeek ? (card.clockStatus?.todayHours ?? 0) : 0;
              const hasCorrections = !!card.hasCorrections;
            return (
              <div
                key={card.id}
                className={`bg-card border rounded-lg overflow-hidden ${
                  hasCorrections && card.status !== "approved"
                    ? "border-amber-300 ring-1 ring-amber-200 bg-amber-50/30"
                    : ""
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="relative h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {initials(card.user.firstName, card.user.lastName)}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isClockedIn ? "bg-green-500" : "bg-gray-300"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{fullName(card.user)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {isClockedIn ? (
                        <>
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" /> In since {clockTime}
                          </span>
                          <span>·</span>
                          <LiveTodayHours
                            clockedIn={true}
                            clockInTime={card.clockStatus?.clockInTime ?? null}
                            completedHours={todayHrs}
                          />
                        </>
                      ) : (
                        <span>{todayHrs > 0 ? `${todayHrs.toFixed(1)}h today · Clocked out` : "Clocked out"}</span>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const reg = parseFloat(card.totalHours || "0");
                    const ot = parseFloat(card.totalOtHours || "0");
                    const total = reg + ot;
                    return (
                      <span className="text-sm font-semibold whitespace-nowrap" title={ot > 0 ? `${reg.toFixed(2)}h regular + ${ot.toFixed(2)}h OT` : undefined}>
                        {total.toFixed(1)} hrs
                        {ot > 0 && (
                          <span className="ml-1 text-amber-600 text-xs font-medium">
                            (+{ot.toFixed(1)} OT)
                          </span>
                        )}
                      </span>
                    );
                  })()}
                  {statusBadge(card.status)}
                  {hasCorrections && (
                    <Badge
                      className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 whitespace-nowrap"
                      title={
                        card.lastCorrectionAt
                          ? `Employee corrected hours on ${new Date(card.lastCorrectionAt).toLocaleString()}`
                          : "Employee corrected hours on this timecard"
                      }
                    >
                      <AlertTriangle className="h-3 w-3 mr-1 inline" />
                      Corrected
                    </Badge>
                  )}

                  {/* Admin clock in/out */}
                  {isClockedIn ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminClock.mutate({ userId: card.userId, action: "out", name: fullName(card.user) });
                      }}
                      disabled={adminClock.isPending}
                    >
                      <Square className="h-3 w-3 mr-1 fill-current" />
                      Clock Out
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminClock.mutate({ userId: card.userId, action: "in", name: fullName(card.user) });
                      }}
                      disabled={adminClock.isPending}
                    >
                      <Play className="h-3 w-3 mr-1 fill-current" />
                      Clock In
                    </Button>
                  )}

                  {card.status === "submitted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        approveTimecard.mutate(card.id);
                      }}
                      disabled={approveTimecard.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}

                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && expandedDetail && expandedDetail.id === card.id && (
                  <div className="border-t">
                    {/* Corrections panel — prominent callout for payroll submitter */}
                    {(() => {
                      const corrections = (expandedDetail.auditLog || []).filter(
                        (l) => l.action === "employee_correction",
                      );
                      if (corrections.length === 0) return null;
                      return (
                        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-3">
                          <p className="text-xs font-semibold text-amber-900 flex items-center gap-1 mb-2">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Employee corrections ({corrections.length}) — review before approving
                          </p>
                          <div className="space-y-2">
                            {corrections.map((log) => {
                              const who = fullName(log.changedBy);
                              const when = new Date(log.changedAt).toLocaleString();
                              const dayLabel = log.entryDate ? formatDayLabel(log.entryDate) : null;
                              return (
                                <div key={log.id} className="text-xs bg-white/60 rounded border border-amber-200 px-2.5 py-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {dayLabel && (
                                      <span className="font-medium text-amber-900">{dayLabel}</span>
                                    )}
                                    {log.oldHours && log.newHours && (
                                      <span className="font-mono">
                                        <span className="line-through text-red-500">{String(log.oldHours)}h</span>
                                        <span className="mx-1 text-muted-foreground">→</span>
                                        <span className="text-green-700 font-semibold">{String(log.newHours)}h</span>
                                      </span>
                                    )}
                                    <span className="text-muted-foreground">· {who} · {when}</span>
                                  </div>
                                  {log.reason && (
                                    <p className="mt-1 text-amber-900">
                                      <span className="font-medium">Reason:</span> {log.reason}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Entries */}
                    <div className="px-4 py-2 space-y-0">
                      {/* Header */}
                      <div className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-2 text-xs font-medium text-muted-foreground mb-1 pb-1 border-b">
                        <span>Day</span>
                        <span>Clock In</span>
                        <span>Clock Out</span>
                        <span className="text-center">Hours</span>
                        <span></span>
                      </div>
                      {expandedDetail.entries.map((entry) => {
                        const wasAdminEdited = expandedDetail.auditLog.some(
                          (l) => l.action === "admin_edit" && l.entryDate === entry.entryDate,
                        );
                        const wasCorrected = !!entry.hoursLocked || expandedDetail.auditLog.some(
                          (l) => l.action === "employee_correction" && l.entryDate === entry.entryDate,
                        );
                        const dayPunches = (expandedDetail.punches || []).filter(
                          (p) => p.punchDate === entry.entryDate,
                        );
                        return (
                          <div
                            key={entry.id}
                            className={`border-b last:border-b-0 py-2 ${
                              wasCorrected ? "bg-amber-50/50 -mx-4 px-4" : ""
                            }`}
                          >
                            {/* Row 1: Day, Clock In, Clock Out, Hours, Clear */}
                            {dayPunches.length > 0 ? (
                              <>
                                {dayPunches.map((p, pi) => (
                                  <div key={p.id} className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-2 items-center mb-1">
                                    <span className="text-sm font-medium">{pi === 0 ? formatDayLabel(entry.entryDate) : ""}</span>
                                    <TimePicker
                                      key={`ci-${p.id}-${p.clockIn}`}
                                      value={p.clockIn}
                                      punchDate={p.punchDate}
                                      defaultHour={9}
                                      defaultMin={0}
                                      defaultAMPM="AM"
                                      onChange={(iso) => {
                                        adminEditPunch.mutate({
                                          punchId: p.id,
                                          clockIn: iso,
                                          clockOut: p.clockOut || null,
                                        });
                                      }}
                                    />
                                    {p.clockOut ? (
                                      <TimePicker
                                        key={`co-${p.id}-${p.clockOut}`}
                                        value={p.clockOut}
                                        punchDate={p.punchDate}
                                        defaultHour={5}
                                        defaultMin={0}
                                        defaultAMPM="PM"
                                        onChange={(iso) => {
                                          adminEditPunch.mutate({
                                            punchId: p.id,
                                            clockIn: p.clockIn,
                                            clockOut: iso,
                                          });
                                        }}
                                      />
                                    ) : (
                                      <span className="text-xs text-orange-500 italic font-medium">Active</span>
                                    )}
                                    <span className="text-sm text-center tabular-nums" title="Auto-calculated from clock times">
                                      {p.hours ? parseFloat(p.hours).toFixed(1) : "—"}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                        onClick={() => adminDeletePunch.mutate(p.id)}
                                        disabled={adminDeletePunch.isPending}
                                        title="Clear times"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Clear
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {/* Day total row when multiple punches */}
                                {dayPunches.length > 1 && (
                                  <div className="grid grid-cols-[90px_1fr_1fr_70px_70px] gap-2 items-center mb-1">
                                    <span></span>
                                    <span></span>
                                    <span className="text-xs text-muted-foreground text-right">Day total:</span>
                                    <span className="text-sm font-semibold text-center tabular-nums">{parseFloat(entry.hours || "0").toFixed(1)}</span>
                                    <span></span>
                                  </div>
                                )}
                                {/* Add another punch / break */}
                                <AddBreakRow
                                  key={`abr-${entry.id}-${dayPunches.length}`}
                                  entryDate={entry.entryDate}
                                  onAddPunch={(clockIn, clockOut) => {
                                    adminAddPunch.mutate({
                                      userId: expandedDetail!.userId,
                                      punchDate: entry.entryDate,
                                      clockIn,
                                      clockOut,
                                    });
                                  }}
                                  isPending={adminAddPunch.isPending}
                                />
                              </>
                            ) : (
                              <EmptyDayRow
                                key={`edr-${entry.id}`}
                                entryDate={entry.entryDate}
                                entryHours={entry.hours}
                                onAddPunch={(clockIn, clockOut) => {
                                  adminAddPunch.mutate({
                                    userId: expandedDetail!.userId,
                                    punchDate: entry.entryDate,
                                    clockIn,
                                    clockOut,
                                  });
                                }}
                                onEditHours={(val) => handleAdminBlur(entry, "hours", val)}
                                isPending={adminAddPunch.isPending}
                              />
                            )}
                            {/* Row 2: Notes + badge */}
                            <div className="grid grid-cols-[90px_1fr] gap-2 mt-1">
                              <span></span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  placeholder="Notes…"
                                  defaultValue={entry.notes || ""}
                                  className="text-xs h-7 flex-1"
                                  onBlur={(e) => handleAdminBlur(entry, "notes", e.target.value)}
                                  key={`an-${entry.id}-${entry.notes}`}
                                />
                                {wasCorrected && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                    Corrected
                                  </Badge>
                                )}
                                {wasAdminEdited && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-200 shrink-0">
                                    Admin edited
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Audit log */}
                    {expandedDetail.auditLog.length > 0 && (
                      <div className="border-t px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                          <History className="h-3 w-3" /> Audit Log
                        </p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {expandedDetail.auditLog.map((log) => {
                            const who = fullName(log.changedBy);
                            const when = new Date(log.changedAt).toLocaleString();
                            return (
                              <div key={log.id} className="text-xs">
                                <span className="text-muted-foreground">{when}</span>
                                <span className="mx-1">·</span>
                                <span className="font-medium">{who}</span>
                                {log.action === "admin_edit" && (
                                  <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-orange-600 border-orange-200">Admin</Badge>
                                )}
                                {log.action === "employee_correction" && (
                                  <Badge className="ml-1 text-[10px] px-1 py-0 bg-amber-100 text-amber-800 border border-amber-200">
                                    Correction
                                  </Badge>
                                )}
                                {log.description && <p className="text-muted-foreground">{String(log.description)}</p>}
                                {log.oldHours && log.newHours && (
                                  <p className="text-muted-foreground">
                                    <span className="line-through text-red-400">{String(log.oldHours)}h</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-green-600 font-medium">{String(log.newHours)}h</span>
                                  </p>
                                )}
                                {log.reason && (
                                  <p className="text-amber-900 italic">Reason: {log.reason}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            });
          })()}
        </div>
      )}
    </div>
  );
}
