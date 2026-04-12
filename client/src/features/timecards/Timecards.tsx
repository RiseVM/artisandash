import { useState, useCallback, useEffect, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Trash2,
  Car,
} from "lucide-react";

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

// ── Component ───────────────────────────────

export function Timecards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [mileageDate, setMileageDate] = useState(() => todayIso());
  const [mileageMiles, setMileageMiles] = useState("");
  const [mileagePurpose, setMileagePurpose] = useState("");

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

  // Mutation: update an entry with clockIn/clockOut
  const updateEntry = useMutation({
    mutationFn: async ({ entryId, clockIn, clockOut, notes }: { entryId: number; clockIn?: string | null; clockOut?: string | null; notes?: string | null }) => {
      const body: any = {};
      if (clockIn !== undefined) body.clockIn = clockIn;
      if (clockOut !== undefined) body.clockOut = clockOut;
      if (notes !== undefined) body.notes = notes;
      const res = await apiRequest("PATCH", `/api/timecards/entries/${entryId}`, body);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my/" + currentMonday] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/my"] });
      setSavedEntryId(variables.entryId);
      setTimeout(() => setSavedEntryId(null), 2000);
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

  // Gate: require identity verification
  if (!verifiedUser) {
    return <IdentityGate onVerified={setVerifiedUser} />;
  }

  const totalHours = timecard?.totalHours ? parseFloat(timecard.totalHours) : 0;
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Day</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-36">Clock In</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-36">Clock Out</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Hours</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  <th className="px-2 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {timecard.entries.map((entry) => {
                  const isEntryToday = entry.entryDate === today;
                  const weekend = isWeekend(entry.entryDate);
                  const saved = savedEntryId === entry.id;
                  const hrs = parseFloat(entry.hours || "0");

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b last:border-b-0 ${
                        isEntryToday ? "border-l-4 border-l-primary bg-primary/5" : ""
                      } ${weekend ? "bg-muted/20" : ""} ${saved ? "saved-flash" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-sm">
                        {formatDayLabel(entry.entryDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="time"
                          defaultValue={entry.clockIn || ""}
                          className="border rounded px-2 py-1.5 text-sm text-center w-28 bg-background"
                          onBlur={(e) => {
                            const val = e.target.value || null;
                            if (val !== (entry.clockIn || null)) {
                              updateEntry.mutate({ entryId: entry.id, clockIn: val });
                            }
                          }}
                          key={`ci-${entry.id}-${entry.clockIn}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="time"
                          defaultValue={entry.clockOut || ""}
                          className="border rounded px-2 py-1.5 text-sm text-center w-28 bg-background"
                          onBlur={(e) => {
                            const val = e.target.value || null;
                            if (val !== (entry.clockOut || null)) {
                              updateEntry.mutate({ entryId: entry.id, clockOut: val });
                            }
                          }}
                          key={`co-${entry.id}-${entry.clockOut}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono text-sm ${hrs > 0 ? "font-semibold" : "text-muted-foreground"}`}>
                          {hrs > 0 ? `${hrs.toFixed(1)}h` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          placeholder="Notes…"
                          defaultValue={entry.notes || ""}
                          className="h-8 text-sm"
                          onBlur={(e) => {
                            const val = e.target.value || null;
                            if (val !== (entry.notes || null)) {
                              updateEntry.mutate({ entryId: entry.id, notes: val });
                            }
                          }}
                          key={`n-${entry.id}-${entry.notes}`}
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        {saved && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-0.5 justify-center">
                            <Check className="h-3 w-3" /> Saved
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="bg-muted/40 font-semibold border-t-2">
                  <td className="px-4 py-3 text-sm">Total</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-center font-bold text-base">
                    {totalHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-2 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {timecard.entries.map((entry) => {
              const isEntryToday = entry.entryDate === today;
              const saved = savedEntryId === entry.id;
              const hrs = parseFloat(entry.hours || "0");

              return (
                <div
                  key={entry.id}
                  className={`bg-card border rounded-lg p-4 space-y-3 ${
                    isEntryToday ? "border-primary/30 border-l-4" : ""
                  } ${saved ? "saved-flash" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{formatDayLabel(entry.entryDate)}</span>
                    <span className={`font-mono text-sm ${hrs > 0 ? "font-semibold" : "text-muted-foreground"}`}>
                      {hrs > 0 ? `${hrs.toFixed(1)}h` : "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Clock In</label>
                      <input
                        type="time"
                        defaultValue={entry.clockIn || ""}
                        className="border rounded px-2 py-2 text-sm w-full bg-background"
                        onBlur={(e) => {
                          const val = e.target.value || null;
                          if (val !== (entry.clockIn || null)) {
                            updateEntry.mutate({ entryId: entry.id, clockIn: val });
                          }
                        }}
                        key={`mci-${entry.id}-${entry.clockIn}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Clock Out</label>
                      <input
                        type="time"
                        defaultValue={entry.clockOut || ""}
                        className="border rounded px-2 py-2 text-sm w-full bg-background"
                        onBlur={(e) => {
                          const val = e.target.value || null;
                          if (val !== (entry.clockOut || null)) {
                            updateEntry.mutate({ entryId: entry.id, clockOut: val });
                          }
                        }}
                        key={`mco-${entry.id}-${entry.clockOut}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                    <Input
                      type="text"
                      placeholder="Notes…"
                      defaultValue={entry.notes || ""}
                      className="w-full h-10 text-sm"
                      onBlur={(e) => {
                        const val = e.target.value || null;
                        if (val !== (entry.notes || null)) {
                          updateEntry.mutate({ entryId: entry.id, notes: val });
                        }
                      }}
                      key={`mn-${entry.id}-${entry.notes}`}
                    />
                  </div>

                  {saved && (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="h-3 w-3" /> Saved
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile Total */}
            <div className="bg-card border rounded-lg p-4 text-center">
              <span className="text-sm text-muted-foreground">Weekly Total: </span>
              <span className="text-lg font-bold">{totalHours.toFixed(1)}h</span>
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
