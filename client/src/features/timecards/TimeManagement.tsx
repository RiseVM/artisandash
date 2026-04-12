import { useState, useCallback, useEffect, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Mail,
  UserPlus,
  Trash2,
  DollarSign,
  Clock,
  Plus,
  X,
  Circle,
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

function formatShortDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

function formatShortDate(iso: string): string {
  return iso.slice(5);
}

function formatWeekLabel(mondayIso: string): string {
  const mon = new Date(mondayIso + "T12:00:00");
  const sun = addDays(mon, 6);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Week of ${months[mon.getMonth()]} ${mon.getDate()} – ${months[sun.getMonth()]} ${sun.getDate()}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  otHours: string;
  ptoHours: string;
  holidayHours: string;
  entryType: string;
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
  recipientId: number | null;
  totalHours: string | null;
  totalOtHours: string | null;
  totalPtoHours: string | null;
  totalHolidayHours: string | null;
  totalMileage: string | null;
  user: CardUser;
  entries: TimecardEntry[];
  recipient?: TimecardRecipient | null;
}

interface ClockPunch {
  id: number;
  timecardId: number;
  userId: string;
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
  totalOtHours: string | null;
  totalPtoHours: string | null;
  totalHolidayHours: string | null;
  totalMileage: number | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
}

interface TimecardEntryWithMileage extends TimecardEntry {
  mileage?: string | null;
}

interface Employee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  mileageEnabled: boolean;
  mileageRate: number;
}

interface PayrollContact {
  id: number;
  name: string;
  email: string;
}

interface TimecardRecipient {
  id: number;
  name: string;
  email: string;
  title: string | null;
  isActive: string;
}

interface EmployeeClockStatus {
  user: CardUser;
  openPunch: ClockPunch | null;
  todayHours: number;
}

interface MileageEntry {
  id: number;
  timecardId: number;
  entryDate: string;
  miles: string;
  purpose: string | null;
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

// ── Wrapper (handles non-admin redirect before inner hooks) ──

export function TimeManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      navigate("/timecards");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return null;
  if (!user) return null;
  if (user.role !== "admin") return null;

  return <TimeManagementInner />;
}

// ── Component ───────────────────────────────

function TimeManagementInner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── All useState ──
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [expandedEmployeesSection, setExpandedEmployeesSection] = useState(false);
  const [expandedPayrollSection, setExpandedPayrollSection] = useState(false);
  const [expandedRecipientsSection, setExpandedRecipientsSection] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({ firstName: "", lastName: "", email: "", password: "", mileageEnabled: false, mileageRate: 0 });
  const [newContactForm, setNewContactForm] = useState({ name: "", email: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipientForm, setNewRecipientForm] = useState({ name: "", email: "", title: "" });
  const [editingRecipient, setEditingRecipient] = useState<TimecardRecipient | null>(null);
  const [statusFilterPill, setStatusFilterPill] = useState<"all" | "draft" | "submitted" | "approved">("all");
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [newMileageDate, setNewMileageDate] = useState("");
  const [newMileageMiles, setNewMileageMiles] = useState("");
  const [newMileagePurpose, setNewMileagePurpose] = useState("");

  // ── All useQuery ──
  const { data: clockStatuses = [] } = useQuery<EmployeeClockStatus[]>({
    queryKey: ["/api/timecards/admin/clock-status"],
    enabled: !!verifiedUser,
    refetchInterval: 30000,
  });

  const { data: allCards = [], isLoading } = useQuery<TimecardWithUser[]>({
    queryKey: ["/api/timecards/admin/all", { weekStartDate: currentMonday, status: statusFilterPill !== "all" ? statusFilterPill : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("weekStartDate", currentMonday);
      if (statusFilterPill !== "all") params.set("status", statusFilterPill);
      const res = await fetch(`/api/timecards/admin/all?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!verifiedUser,
  });

  const { data: activeUsers = [] } = useQuery<CardUser[]>({
    queryKey: ["/api/timecards/admin/users"],
    enabled: !!verifiedUser,
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/timecards/admin/employees"],
    enabled: !!verifiedUser,
  });

  const { data: payrollContacts = [], refetch: refetchPayrollContacts } = useQuery<PayrollContact[]>({
    queryKey: ["/api/timecards/admin/payroll-contacts"],
    enabled: !!verifiedUser,
  });

  interface ManagedUser { id: string; firstName: string | null; lastName: string | null; email: string; role: string; isActive: string; createdAt: string; }
  const { data: allUsers = [], refetch: refetchAllUsers } = useQuery<ManagedUser[]>({
    queryKey: ["/api/users"],
    enabled: !!verifiedUser,
  });

  const { data: allRecipients = [], refetch: refetchRecipients } = useQuery<TimecardRecipient[]>({
    queryKey: ["/api/timecards/admin/recipients"],
    enabled: !!verifiedUser,
  });

  // ── Computed values ──
  const selectedCard = selectedEmployeeId ? allCards.find(c => c.userId === selectedEmployeeId) : null;
  const selectedTimecardId = selectedCard?.id ?? null;

  // ── Drawer queries ──
  const { data: drawerDetail } = useQuery<TimecardDetail>({
    queryKey: ["/api/timecards/admin/" + selectedTimecardId],
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  const { data: drawerPunches = [] } = useQuery<ClockPunch[]>({
    queryKey: ["/api/timecards/" + selectedTimecardId + "/punches"],
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  const { data: drawerMileage = [], refetch: refetchDrawerMileage } = useQuery<MileageEntry[]>({
    queryKey: ["/api/timecards/admin/" + selectedTimecardId + "/mileage"],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/${selectedTimecardId}/mileage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load mileage");
      return res.json();
    },
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  // ── All useMutation ──
  const addAdminMileage = useMutation({
    mutationFn: async ({ timecardId, entryDate, miles, purpose }: { timecardId: number; entryDate: string; miles: number; purpose: string }) => {
      const res = await apiRequest("POST", `/api/timecards/admin/${timecardId}/mileage`, { entryDate, miles, purpose });
      return res.json();
    },
    onSuccess: () => {
      refetchDrawerMileage();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      setShowAddMileage(false);
      setNewMileageMiles("");
      setNewMileagePurpose("");
      setNewMileageDate("");
    },
  });

  const deleteAdminMileage = useMutation({
    mutationFn: async (mileageId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/mileage/${mileageId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchDrawerMileage();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
    },
  });

  const approveTimecard = useMutation({
    mutationFn: async (timecardId: number) => {
      const res = await apiRequest("POST", `/api/timecards/admin/${timecardId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      if (selectedTimecardId) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + selectedTimecardId] });
      }
      setFeedback({ type: "success", message: "Timecard approved" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const addEmployee = useMutation({
    mutationFn: async (data: typeof newEmployeeForm) => {
      const res = await apiRequest("POST", "/api/timecards/admin/employees", data);
      return res.json();
    },
    onSuccess: () => {
      refetchEmployees();
      setNewEmployeeForm({ firstName: "", lastName: "", email: "", password: "", mileageEnabled: false, mileageRate: 0 });
      setShowAddEmployee(false);
      setFeedback({ type: "success", message: "Employee added successfully" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Failed to add employee" });
    },
  });

  const updateMileage = useMutation({
    mutationFn: async ({ userId, mileageEnabled, mileageRate }: { userId: string; mileageEnabled: boolean; mileageRate: number }) => {
      const res = await apiRequest("PATCH", `/api/timecards/admin/employees/${userId}/mileage`, { mileageEnabled, mileageRate });
      return res.json();
    },
    onSuccess: () => {
      refetchEmployees();
    },
  });

  const addPayrollContact = useMutation({
    mutationFn: async (data: typeof newContactForm) => {
      const res = await apiRequest("POST", "/api/timecards/admin/payroll-contacts", data);
      return res.json();
    },
    onSuccess: () => {
      refetchPayrollContacts();
      setNewContactForm({ name: "", email: "" });
      setShowAddContact(false);
      setFeedback({ type: "success", message: "Contact added successfully" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Failed to add contact" });
    },
  });

  const deletePayrollContact = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/payroll-contacts/${contactId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchPayrollContacts();
    },
  });

  const createRecipient = useMutation({
    mutationFn: async (data: { name: string; email: string; title?: string }) => {
      const res = await apiRequest("POST", "/api/timecards/recipients", data);
      return res.json();
    },
    onSuccess: () => {
      refetchRecipients();
      setNewRecipientForm({ name: "", email: "", title: "" });
      setShowAddRecipient(false);
      setFeedback({ type: "success", message: "Recipient added" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Failed to add recipient" });
    },
  });

  const updateRecipientMut = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; email?: string; title?: string }) => {
      const res = await apiRequest("PATCH", `/api/timecards/recipients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchRecipients();
      setEditingRecipient(null);
      setFeedback({ type: "success", message: "Recipient updated" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deactivateRecipient = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/recipients/${id}`);
      return res.json();
    },
    onSuccess: () => {
      refetchRecipients();
      setFeedback({ type: "success", message: "Recipient deactivated" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const sendPayrollEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/timecards/admin/send-payroll", { weekStartDate: currentMonday });
      return res.json();
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "Payroll report sent successfully" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Failed to send payroll report" });
    },
  });

  // ── All useCallback ──
  const navigateWeek = useCallback((direction: -1 | 1) => {
    setSelectedEmployeeId(null);
    setCurrentMonday((prev) => {
      const d = new Date(prev + "T12:00:00");
      return formatIso(addDays(d, direction * 7));
    });
  }, []);

  // ── Identity gate ──
  if (!verifiedUser) {
    return <AdminIdentityGate onVerified={setVerifiedUser} />;
  }

  // ── Derived values ──
  const weekTotalHours = allCards.reduce((s, c) => s + parseFloat(c.totalHours || "0"), 0);
  const weekTotalOtHours = allCards.reduce((s, c) => s + parseFloat(c.totalOtHours || "0"), 0);
  const approvedTimecards = allCards.filter(c => c.status === "approved");
  const clockedInCount = clockStatuses.filter(s => s.openPunch).length;
  const weekDays = Array.from({ length: 7 }, (_, i) => formatIso(addDays(new Date(currentMonday + "T12:00:00"), i)));
  const today = formatIso(new Date());

  // Build grid rows: one row per non-admin active user
  const nonAdminUsers = allUsers.filter(u => u.role !== "admin" && u.isActive === "yes");
  const gridRows = nonAdminUsers.map(u => {
    const card = allCards.find(c => c.userId === u.id);
    const emp = employees.find(e => e.id === u.id);
    return {
      employee: { ...u, mileageEnabled: emp?.mileageEnabled || false, mileageRate: emp?.mileageRate || 0 },
      card,  // may be undefined if no timecard exists for this week
    };
  });

  const selectedEmployee = selectedEmployeeId ? nonAdminUsers.find(u => u.id === selectedEmployeeId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Time Management
        </h1>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-lg text-sm font-medium ${feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {feedback.message}
        </div>
      )}

      {/* Clock Status Bar */}
      {clockStatuses.length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            CURRENTLY CLOCKED IN ({clockedInCount})
          </div>
          <div className="space-y-2">
            {clockStatuses.map((status) => {
              const isClockedIn = !!status.openPunch;
              const elapsed = isClockedIn
                ? (new Date(status.openPunch!.clockIn).getTime() - Date.now()) / -3600000
                : 0;
              return (
                <div
                  key={status.user.id}
                  className="flex items-center gap-3 text-sm p-2 bg-muted/40 rounded hover:bg-muted/60 transition-colors"
                >
                  <Circle
                    className={`h-2.5 w-2.5 flex-shrink-0 ${
                      isClockedIn ? "fill-green-500 text-green-500" : "fill-gray-300 text-gray-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs truncate">{fullName(status.user)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {isClockedIn ? (
                        <span className="text-green-700">
                          In since {formatTime(status.openPunch!.clockIn)} ({elapsed.toFixed(1)}h)
                        </span>
                      ) : (
                        <span>Today: {status.todayHours.toFixed(1)}h</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week Nav Card */}
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
          {approvedTimecards.length > 0 && payrollContacts.length > 0 && (
            <Button
              size="sm"
              className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => sendPayrollEmail.mutate()}
              disabled={sendPayrollEmail.isPending}
            >
              <Mail className="h-4 w-4 mr-1" />
              {sendPayrollEmail.isPending ? "Sending…" : "Email Payroll Report"}
            </Button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            {(["all", "draft", "submitted", "approved"] as const).map((pill) => (
              <button
                key={pill}
                onClick={() => setStatusFilterPill(pill)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  statusFilterPill === pill
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {pill === "all" ? "All" : pill.charAt(0).toUpperCase() + pill.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Total Hours Text */}
        <div className="text-sm text-muted-foreground border-t pt-3">
          <strong>Week Total:</strong> {weekTotalHours.toFixed(1)}h
          {weekTotalOtHours > 0 && ` + ${weekTotalOtHours.toFixed(1)}h OT`}
        </div>
      </div>

      {/* Employee Grid – Always Visible */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 inline animate-spin mr-2" />
            Loading timecards...
          </div>
        ) : gridRows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No employees found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Status</th>
                {weekDays.map((day) => (
                  <th key={day} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
                    <div>{formatShortDay(day)}</div>
                    <div className="text-[10px] text-muted-foreground">{formatShortDate(day)}</div>
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {gridRows.map(({ employee, card }) => (
                <tr
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  {/* Employee Name */}
                  <td className="px-4 py-3 text-sm font-medium">
                    {employee.firstName || employee.lastName
                      ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim()
                      : employee.email}
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3 text-center text-xs">
                    {card ? statusBadge(card.status) : <Badge variant="secondary">—</Badge>}
                  </td>

                  {/* Day Cells (Read-Only) */}
                  {weekDays.map((day) => {
                    const entry = card?.entries.find(e => e.entryDate === day);
                    return (
                      <td key={day} className="px-2 py-3 text-center border-l border-muted/30">
                        {entry ? (
                          <span className="text-sm font-mono">{parseFloat(entry.hours).toFixed(2)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Hours */}
                  <td className="px-4 py-3 text-center text-sm font-semibold border-l border-muted/30">
                    {card ? parseFloat(card.totalHours || "0").toFixed(1) : "—"}
                  </td>

                  {/* Approve Button */}
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {card && card.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-green-600 hover:bg-green-50"
                        onClick={() => approveTimecard.mutate(card.id)}
                        disabled={approveTimecard.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sheet Drawer */}
      <Sheet open={!!selectedEmployeeId} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <SheetContent className="w-full sm:w-[600px] flex flex-col max-h-screen">
          <SheetHeader>
            <SheetTitle>
              {selectedEmployee
                ? `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim() || selectedEmployee.email
                : "Loading..."}
            </SheetTitle>
          </SheetHeader>

          {drawerDetail && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-4">
              {/* Entries Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Hours Worked</h3>
                <div className="space-y-2">
                  {drawerDetail.entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No entries this week</p>
                  ) : (
                    drawerDetail.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs">
                        <span>{formatDayLabel(entry.entryDate)}</span>
                        <span className="font-mono font-semibold">{parseFloat(entry.hours).toFixed(2)}h</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Punches Section */}
              {drawerPunches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Clock Punches</h3>
                  <div className="space-y-1">
                    {drawerPunches.map((punch) => (
                      <div key={punch.id} className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs">
                        <span className="text-muted-foreground">{formatDayLabel(punch.punchDate)}</span>
                        <span className="font-mono text-xs">
                          {formatTime(punch.clockIn)} → {punch.clockOut ? formatTime(punch.clockOut) : <span className="text-green-600">Active</span>}
                        </span>
                        <span className="text-muted-foreground">
                          {punch.hours ? `${parseFloat(punch.hours).toFixed(1)}h` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mileage Section */}
              {(() => { const emp = employees.find(e => e.id === selectedEmployeeId); return emp?.mileageEnabled; })() && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Mileage
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddMileage(!showAddMileage)}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>

                  {showAddMileage && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded mb-3">
                      <Input
                        type="date"
                        value={newMileageDate}
                        onChange={(e) => setNewMileageDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Miles"
                        value={newMileageMiles}
                        onChange={(e) => setNewMileageMiles(e.target.value)}
                        step="0.1"
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Purpose"
                        value={newMileagePurpose}
                        onChange={(e) => setNewMileagePurpose(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!newMileageDate || !newMileageMiles || !selectedTimecardId) return;
                            addAdminMileage.mutate({
                              timecardId: selectedTimecardId,
                              entryDate: newMileageDate,
                              miles: parseFloat(newMileageMiles),
                              purpose: newMileagePurpose,
                            });
                          }}
                          disabled={addAdminMileage.isPending}
                          className="h-7 text-xs"
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddMileage(false)}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {drawerMileage.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No mileage entries this week</p>
                  ) : (
                    <div className="space-y-1">
                      {drawerMileage.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs group">
                          <div>
                            <div className="text-muted-foreground">{formatDayLabel(m.entryDate)}</div>
                            <div className="text-[10px] text-muted-foreground">{m.purpose || "—"}</div>
                          </div>
                          <span className="font-mono font-semibold">{parseFloat(m.miles).toFixed(1)}mi</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAdminMileage.mutate(m.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audit Log Section */}
              {drawerDetail.auditLog.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Audit Log</h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {drawerDetail.auditLog.map((log) => (
                      <div key={log.id} className="text-[10px] p-1.5 bg-muted/30 rounded">
                        <div className="font-medium">{log.action}</div>
                        {log.description && <div className="text-muted-foreground">{log.description}</div>}
                        <div className="text-muted-foreground">
                          {new Date(log.changedAt).toLocaleDateString()} by {fullName(log.changedBy)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Manage Employees Section */}
      <div className="bg-card border rounded-lg">
        <button
          onClick={() => setExpandedEmployeesSection(!expandedEmployeesSection)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <h2 className="text-lg font-semibold">Manage Employees</h2>
          {expandedEmployeesSection ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {expandedEmployeesSection && (
          <div className="border-t p-4 space-y-4">
            <Button
              onClick={() => setShowAddEmployee(!showAddEmployee)}
              className="w-full"
              variant="outline"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>

            {showAddEmployee && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <Input
                  placeholder="First Name"
                  value={newEmployeeForm.firstName}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value })}
                />
                <Input
                  placeholder="Last Name"
                  value={newEmployeeForm.lastName}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newEmployeeForm.email}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={newEmployeeForm.password}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mileage-enabled"
                    checked={newEmployeeForm.mileageEnabled}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, mileageEnabled: e.target.checked })}
                  />
                  <Label htmlFor="mileage-enabled" className="text-sm">Enable Mileage Tracking</Label>
                </div>
                {newEmployeeForm.mileageEnabled && (
                  <Input
                    placeholder="Mileage Rate ($/mi)"
                    type="number"
                    step="0.01"
                    value={newEmployeeForm.mileageRate}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, mileageRate: parseFloat(e.target.value) })}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => addEmployee.mutate(newEmployeeForm)}
                    disabled={addEmployee.isPending}
                    className="flex-1"
                  >
                    {addEmployee.isPending ? "Creating..." : "Create Employee"}
                  </Button>
                  <Button
                    onClick={() => setShowAddEmployee(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {emp.firstName || emp.lastName
                            ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                            : emp.email}
                        </div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    </div>
                    {emp.mileageEnabled && (
                      <div className="text-xs text-muted-foreground">
                        Mileage Rate: ${emp.mileageRate.toFixed(2)}/mi
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payroll Contacts Section */}
      <div className="bg-card border rounded-lg">
        <button
          onClick={() => setExpandedPayrollSection(!expandedPayrollSection)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <h2 className="text-lg font-semibold">Payroll Contacts</h2>
          {expandedPayrollSection ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {expandedPayrollSection && (
          <div className="border-t p-4 space-y-4">
            <Button
              onClick={() => setShowAddContact(!showAddContact)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>

            {showAddContact && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <Input
                  placeholder="Name"
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => addPayrollContact.mutate(newContactForm)}
                    disabled={addPayrollContact.isPending}
                    className="flex-1"
                  >
                    {addPayrollContact.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                  <Button
                    onClick={() => setShowAddContact(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {payrollContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payroll contacts</p>
            ) : (
              <div className="space-y-2">
                {payrollContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg group">
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-muted-foreground">{contact.email}</div>
                    </div>
                    <button
                      onClick={() => deletePayrollContact.mutate(contact.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timecard Recipients Section */}
      <div className="bg-card border rounded-lg">
        <button
          onClick={() => setExpandedRecipientsSection(!expandedRecipientsSection)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <h2 className="text-lg font-semibold">Timecard Recipients</h2>
          {expandedRecipientsSection ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {expandedRecipientsSection && (
          <div className="border-t p-4 space-y-4">
            <Button
              onClick={() => setShowAddRecipient(!showAddRecipient)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>

            {showAddRecipient && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <Input
                  placeholder="Name"
                  value={newRecipientForm.name}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newRecipientForm.email}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, email: e.target.value })}
                />
                <Input
                  placeholder="Title (Optional)"
                  value={newRecipientForm.title}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, title: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => createRecipient.mutate({
                      name: newRecipientForm.name,
                      email: newRecipientForm.email,
                      title: newRecipientForm.title || undefined,
                    })}
                    disabled={createRecipient.isPending}
                    className="flex-1"
                  >
                    {createRecipient.isPending ? "Adding..." : "Add Recipient"}
                  </Button>
                  <Button
                    onClick={() => setShowAddRecipient(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {editingRecipient && (
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                <Input
                  placeholder="Name"
                  value={editingRecipient.name}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={editingRecipient.email}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, email: e.target.value })}
                />
                <Input
                  placeholder="Title (Optional)"
                  value={editingRecipient.title || ""}
                  onChange={(e) => setEditingRecipient({ ...editingRecipient, title: e.target.value || null })}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateRecipientMut.mutate({
                      id: editingRecipient.id,
                      name: editingRecipient.name,
                      email: editingRecipient.email,
                      title: editingRecipient.title || undefined,
                    })}
                    disabled={updateRecipientMut.isPending}
                    className="flex-1"
                  >
                    {updateRecipientMut.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={() => setEditingRecipient(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {allRecipients.filter(r => r.isActive === "yes").length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipients</p>
            ) : (
              <div className="space-y-2">
                {allRecipients.filter(r => r.isActive === "yes").map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between p-3 border rounded-lg group">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{recipient.name}</div>
                      <div className="text-xs text-muted-foreground">{recipient.email}</div>
                      {recipient.title && (
                        <div className="text-xs text-muted-foreground">{recipient.title}</div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingRecipient(recipient)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deactivateRecipient.mutate(recipient.id)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
