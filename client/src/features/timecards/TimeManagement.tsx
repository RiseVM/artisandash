import { useState, useCallback, FormEvent } from "react";
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
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  ShieldCheck,
  Loader2,
  Timer,
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
}

interface AuditLogEntry {
  id: number;
  action: string;
  entryDate: string | null;
  oldHours: string | null;
  newHours: string | null;
  description: string | null;
  changedAt: string;
  changedBy: CardUser;
}

interface TimecardWithUser {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  user: CardUser;
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

interface TimecardDetail {
  id: number;
  userId: string;
  weekStartDate: string;
  status: string;
  totalHours: string | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
}

// ── Identity Verification Gate ──────────────

interface VerifiedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function AdminIdentityGate({ onVerified }: { onVerified: (user: VerifiedUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const verify = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/timecards/verify-identity", creds);
      return res.json();
    },
    onSuccess: (data: { verified: boolean; user: VerifiedUser & { role?: string } }) => {
      if (data.verified) {
        if (data.user.role && data.user.role !== "admin") {
          setError("Admin access required. This account does not have admin privileges.");
          return;
        }
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
            <h2 className="text-xl font-bold">Admin Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please sign in to manage employee timecards
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="admin-verify-email">Email</Label>
              <Input
                id="admin-verify-email"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="admin-verify-password">Password</Label>
              <Input
                id="admin-verify-password"
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);

  // ALL hooks must be called before any conditional return (React Rules of Hooks)

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
    enabled: !!verifiedUser,
  });

  // Fetch all active users for dropdown
  const { data: activeUsers = [] } = useQuery<CardUser[]>({
    queryKey: ["/api/timecards/admin/users"],
    enabled: !!verifiedUser,
  });

  // Fetch expanded card detail
  const { data: expandedDetail } = useQuery<TimecardDetail>({
    queryKey: ["/api/timecards/admin/" + expandedCard],
    enabled: !!verifiedUser && expandedCard !== null,
  });

  // Fetch punches for expanded card
  const { data: expandedPunches = [] } = useQuery<ClockPunch[]>({
    queryKey: ["/api/timecards/" + expandedCard + "/punches"],
    enabled: !!verifiedUser && expandedCard !== null,
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

  const navigateWeek = useCallback((direction: -1 | 1) => {
    setExpandedCard(null);
    setCurrentMonday((prev) => {
      const d = new Date(prev + "T12:00:00");
      return formatIso(addDays(d, direction * 7));
    });
  }, []);

  const handleAdminBlur = useCallback(
    (entry: TimecardEntry, field: "hours" | "notes", value: string) => {
      const currentVal = field === "hours" ? entry.hours : (entry.notes || "");
      if (value === currentVal) return;

      adminEditEntry.mutate({
        entryId: entry.id,
        hours: field === "hours" ? value : entry.hours,
        notes: field === "notes" ? (value || null) : entry.notes,
      });
    },
    [adminEditEntry],
  );

  // Redirect non-admins
  if (user && user.role !== "admin") {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">Admin access required</p>
      </div>
    );
  }

  // Gate: require identity verification on every page visit
  if (!verifiedUser) {
    return <AdminIdentityGate onVerified={setVerifiedUser} />;
  }

  // Week summary
  const weekTotalHours = allCards.reduce((s, c) => s + parseFloat(c.totalHours || "0"), 0);

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

          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{weekTotalHours.toFixed(1)}</span> total hours across {allCards.length} {allCards.length === 1 ? "card" : "cards"}
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
          {allCards.map((card) => {
            const isExpanded = expandedCard === card.id;
            return (
              <div key={card.id} className="bg-card border rounded-lg overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {initials(card.user.firstName, card.user.lastName)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{fullName(card.user)}</div>
                    <div className="text-xs text-muted-foreground">{card.user.email}</div>
                  </div>
                  <span className="text-sm font-semibold">{parseFloat(card.totalHours || "0").toFixed(1)} hrs</span>
                  {statusBadge(card.status)}

                  {card.status === "submitted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
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
                    {/* Entries grid */}
                    <div className="px-4 py-2">
                      <div className="grid grid-cols-[1fr_100px_1fr_80px] gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <span>Day</span>
                        <span className="text-center">Hours</span>
                        <span>Notes</span>
                        <span></span>
                      </div>
                      {expandedDetail.entries.map((entry) => {
                        const wasAdminEdited = expandedDetail.auditLog.some(
                          (l) => l.action === "admin_edit" && l.entryDate === entry.entryDate,
                        );
                        return (
                          <div key={entry.id} className="grid grid-cols-[1fr_100px_1fr_80px] gap-2 items-center py-1.5 border-b last:border-b-0">
                            <span className="text-sm">{formatDayLabel(entry.entryDate)}</span>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              defaultValue={entry.hours}
                              className="w-20 text-center text-sm"
                              onBlur={(e) => handleAdminBlur(entry, "hours", e.target.value)}
                              key={`ah-${entry.id}-${entry.hours}`}
                            />
                            <Input
                              type="text"
                              placeholder="Notes…"
                              defaultValue={entry.notes || ""}
                              className="text-sm"
                              onBlur={(e) => handleAdminBlur(entry, "notes", e.target.value)}
                              key={`an-${entry.id}-${entry.notes}`}
                            />
                            <div className="flex justify-end">
                              {wasAdminEdited && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600 border-orange-200">
                                  Admin edited
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Clock punches */}
                    {expandedPunches.length > 0 && (
                      <div className="border-t px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                          <Timer className="h-3 w-3" /> Clock Punches
                        </p>
                        <div className="space-y-1">
                          {expandedPunches.map((p) => {
                            const inTime = new Date(p.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                            const outTime = p.clockOut
                              ? new Date(p.clockOut).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                              : "active";
                            const dayLabel = new Date(p.punchDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                            return (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground w-24">{dayLabel}</span>
                                <span>{inTime} → {outTime}</span>
                                <span className="text-muted-foreground w-16 text-right">
                                  {p.hours ? `${parseFloat(p.hours).toFixed(1)} hrs` : "—"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
                                <p className="text-muted-foreground">{log.description}</p>
                                {log.oldHours && log.newHours && (
                                  <p className="text-muted-foreground">
                                    <span className="line-through text-red-400">{log.oldHours}h</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-green-600 font-medium">{log.newHours}h</span>
                                  </p>
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
          })}
        </div>
      )}
    </div>
  );
}
