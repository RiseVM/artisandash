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
  Timer,
  Mail,
  UserPlus,
  Trash2,
  DollarSign,
  Clock,
  Pencil,
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

function formatTimeInput(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

// ── Punch Edit Modal ────────────────────────

function PunchEditRow({
  punch,
  onSave,
  onDelete,
  isSaving,
}: {
  punch: ClockPunch;
  onSave: (punchId: number, clockIn: string, clockOut: string | null) => void;
  onDelete: (punchId: number) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inTime, setInTime] = useState(formatTimeInput(punch.clockIn));
  const [outTime, setOutTime] = useState(punch.clockOut ? formatTimeInput(punch.clockOut) : "");

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50 group">
        <span className="text-muted-foreground w-20 text-xs">{formatDayLabel(punch.punchDate)}</span>
        <span className="font-mono text-xs">
          {formatTime(punch.clockIn)} → {punch.clockOut ? formatTime(punch.clockOut) : <span className="text-green-600 font-medium">Active</span>}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {punch.hours ? `${parseFloat(punch.hours).toFixed(1)}h` : "—"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={() => onDelete(punch.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
        >
          <Trash2 className="h-3 w-3 text-red-500" />
        </button>
      </div>
    );
  }

  const handleSave = () => {
    const inDate = `${punch.punchDate}T${inTime}:00`;
    const outDate = outTime ? `${punch.punchDate}T${outTime}:00` : null;
    onSave(punch.id, inDate, outDate);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 text-sm py-1 px-2 bg-blue-50 rounded">
      <span className="text-muted-foreground w-20 text-xs">{formatDayLabel(punch.punchDate)}</span>
      <input
        type="time"
        value={inTime}
        onChange={(e) => setInTime(e.target.value)}
        className="border rounded px-2 py-0.5 text-xs w-24"
      />
      <span className="text-xs">→</span>
      <input
        type="time"
        value={outTime}
        onChange={(e) => setOutTime(e.target.value)}
        className="border rounded px-2 py-0.5 text-xs w-24"
        placeholder="Still active"
      />
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleSave} disabled={isSaving}>
        Save
      </Button>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditing(false)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Inline Grid Cell Editor ─────────────────

interface GridCellEditorProps {
  entry: TimecardEntry | null;
  userId: string;
  entryDate: string;
  currentMonday: string;
  onSave: (hours: number) => void;
  isLoading?: boolean;
}

function GridCellEditor({
  entry,
  userId,
  entryDate,
  currentMonday,
  onSave,
  isLoading,
}: GridCellEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(entry ? entry.hours : "");

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-pointer text-center py-2 px-1 hover:bg-muted/50 rounded transition-colors"
      >
        {entry ? (
          <span className="text-sm font-mono">{parseFloat(entry.hours).toFixed(2)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    );
  }

  const handleSave = () => {
    if (value && value !== (entry?.hours || "")) {
      onSave(parseFloat(value));
    }
    setIsEditing(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="py-2 px-1">
      <input
        autoFocus
        type="number"
        min="0"
        max="24"
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
        className="w-full text-center px-1 py-1 text-sm border rounded bg-white"
        disabled={isLoading}
      />
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
  const [currentMonday, setCurrentMonday] = useState(() => formatIso(getMonday(new Date())));
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<VerifiedUser | null>(null);
  const [expandedEmployeesSection, setExpandedEmployeesSection] = useState(false);
  const [expandedPayrollSection, setExpandedPayrollSection] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({ firstName: "", lastName: "", email: "", password: "", mileageEnabled: false, mileageRate: 0 });
  const [newContactForm, setNewContactForm] = useState({ name: "", email: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"timecards" | "status" | "recipients" | "employees">("status");
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [newRecipientForm, setNewRecipientForm] = useState({ name: "", email: "", title: "" });
  const [editingRecipient, setEditingRecipient] = useState<TimecardRecipient | null>(null);
  const [addPunchFor, setAddPunchFor] = useState<{ userId: string; date: string } | null>(null);
  const [newPunchIn, setNewPunchIn] = useState("09:00");
  const [newPunchOut, setNewPunchOut] = useState("17:00");
  const [statusFilterPill, setStatusFilterPill] = useState<"all" | "draft" | "submitted" | "approved">("all");
  const [editingEmployee, setEditingEmployee] = useState<{ id: string; firstName: string; lastName: string; email: string; password: string; role: string; mileageRate: string } | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "staff" });

  // Fetch all employees' live clock status
  const { data: clockStatuses = [] } = useQuery<EmployeeClockStatus[]>({
    queryKey: ["/api/timecards/admin/clock-status"],
    enabled: !!verifiedUser,
    refetchInterval: 30000,
  });

  // Fetch all timecards for selected week
  const { data: allCards = [], isLoading } = useQuery<TimecardWithUser[]>({
    queryKey: ["/api/timecards/admin/all", { weekStartDate: currentMonday, userId: userFilter !== "all" ? userFilter : undefined, status: statusFilterPill !== "all" ? statusFilterPill : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("weekStartDate", currentMonday);
      if (userFilter !== "all") params.set("userId", userFilter);
      if (statusFilterPill !== "all") params.set("status", statusFilterPill);
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

  // Fetch all employees
  const { data: employees = [], refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/timecards/admin/employees"],
    enabled: !!verifiedUser,
  });

  // Fetch payroll contacts
  const { data: payrollContacts = [], refetch: refetchPayrollContacts } = useQuery<PayrollContact[]>({
    queryKey: ["/api/timecards/admin/payroll-contacts"],
    enabled: !!verifiedUser,
  });

  // Fetch ALL users for employee management tab (includes inactive)
  interface ManagedUser { id: string; firstName: string | null; lastName: string | null; email: string; role: string; isActive: string; createdAt: string; }
  const { data: allUsers = [], refetch: refetchAllUsers } = useQuery<ManagedUser[]>({
    queryKey: ["/api/users"],
    enabled: !!verifiedUser,
  });

  // Fetch mileage entries for expanded card
  const { data: expandedMileage = [], refetch: refetchExpandedMileage } = useQuery<MileageEntry[]>({
    queryKey: ["/api/timecards/admin/" + expandedCard + "/mileage"],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/${expandedCard}/mileage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load mileage");
      return res.json();
    },
    enabled: !!verifiedUser && expandedCard !== null,
  });

  // Mileage add state
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [newMileageDate, setNewMileageDate] = useState("");
  const [newMileageMiles, setNewMileageMiles] = useState("");
  const [newMileagePurpose, setNewMileagePurpose] = useState("");

  // Mutation: admin add mileage
  const addAdminMileage = useMutation({
    mutationFn: async ({ timecardId, entryDate, miles, purpose }: { timecardId: number; entryDate: string; miles: number; purpose: string }) => {
      const res = await apiRequest("POST", `/api/timecards/admin/${timecardId}/mileage`, { entryDate, miles, purpose });
      return res.json();
    },
    onSuccess: () => {
      refetchExpandedMileage();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      setShowAddMileage(false);
      setNewMileageMiles("");
      setNewMileagePurpose("");
      setNewMileageDate("");
    },
  });

  // Mutation: admin delete mileage
  const deleteAdminMileage = useMutation({
    mutationFn: async (mileageId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/mileage/${mileageId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchExpandedMileage();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
    },
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

  // Mutation: create timecard entry (if doesn't exist)
  const createTimecardEntry = useMutation({
    mutationFn: async ({ userId, weekStartDate }: { userId: string; weekStartDate: string }) => {
      const res = await fetch(`/api/timecards/admin/user/${userId}/${weekStartDate}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error("Failed to create timecard");
      return res.json();
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

  // Mutation: add employee
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

  // Mutation: update mileage
  const updateMileage = useMutation({
    mutationFn: async ({ userId, mileageEnabled, mileageRate }: { userId: string; mileageEnabled: boolean; mileageRate: number }) => {
      const res = await apiRequest("PATCH", `/api/timecards/admin/employees/${userId}/mileage`, { mileageEnabled, mileageRate });
      return res.json();
    },
    onSuccess: () => {
      refetchEmployees();
    },
  });

  // Mutation: add payroll contact
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

  // Mutation: delete payroll contact
  const deletePayrollContact = useMutation({
    mutationFn: async (contactId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/payroll-contacts/${contactId}`);
      return res.json();
    },
    onSuccess: () => {
      refetchPayrollContacts();
    },
  });

  // Mutation: create user via /api/users
  const createUser = useMutation({
    mutationFn: async (data: typeof newUserForm) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      refetchAllUsers();
      refetchEmployees();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/users"] });
      setNewUserForm({ firstName: "", lastName: "", email: "", password: "", role: "staff" });
      setShowAddUserDialog(false);
      setFeedback({ type: "success", message: "Employee created successfully" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err?.message || "Failed to create employee" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  // Mutation: update user via PATCH /api/users/:id
  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; firstName?: string; lastName?: string; email?: string; password?: string; role?: string; isActive?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchAllUsers();
      refetchEmployees();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/users"] });
      setEditingEmployee(null);
      setFeedback({ type: "success", message: "Employee updated" });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: "error", message: "Failed to update employee" });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  // Fetch all recipients
  const { data: allRecipients = [], refetch: refetchRecipients } = useQuery<TimecardRecipient[]>({
    queryKey: ["/api/timecards/admin/recipients"],
    enabled: !!verifiedUser,
  });

  // Mutation: create recipient
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

  // Mutation: update recipient
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

  // Mutation: deactivate recipient
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

  // Mutation: send payroll email
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

  // Mutation: edit punch
  const editPunch = useMutation({
    mutationFn: async ({ punchId, clockIn, clockOut }: { punchId: number; clockIn: string; clockOut: string | null }) => {
      const res = await apiRequest("PATCH", `/api/timecards/admin/punches/${punchId}`, { clockIn, clockOut });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/clock-status"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + expandedCard + "/punches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
    },
  });

  // Mutation: delete punch
  const deletePunch = useMutation({
    mutationFn: async (punchId: number) => {
      const res = await apiRequest("DELETE", `/api/timecards/admin/punches/${punchId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/clock-status"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + expandedCard + "/punches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
    },
  });

  // Mutation: add punch
  const addPunch = useMutation({
    mutationFn: async ({ userId, punchDate, clockIn, clockOut }: { userId: string; punchDate: string; clockIn: string; clockOut: string | null }) => {
      const res = await apiRequest("POST", "/api/timecards/admin/punches", { userId, punchDate, clockIn, clockOut });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/clock-status"] });
      if (expandedCard) {
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/" + expandedCard + "/punches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + expandedCard] });
      }
      setAddPunchFor(null);
      setNewPunchIn("09:00");
      setNewPunchOut("17:00");
    },
  });

  const navigateWeek = useCallback((direction: -1 | 1) => {
    setExpandedCard(null);
    setSelectedEmployeeId(null);
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

  const handleGridCellSave = useCallback(
    async (timecardId: number | null, userId: string, entryDate: string, hours: number) => {
      try {
        let finalTimecardId = timecardId;

        if (!timecardId) {
          const response = await createTimecardEntry.mutateAsync({ userId, weekStartDate: currentMonday });
          finalTimecardId = response.id;
        }

        const card = allCards.find(c => c.id === finalTimecardId);
        const entry = card?.entries.find(e => e.entryDate === entryDate);

        if (entry) {
          adminEditEntry.mutate({
            entryId: entry.id,
            hours: hours.toString(),
            notes: entry.notes,
          });
        }
      } catch (error) {
        console.error("Failed to save cell", error);
      }
    },
    [createTimecardEntry, currentMonday, allCards, adminEditEntry],
  );

  // Gate: require identity verification
  if (!verifiedUser) {
    return <AdminIdentityGate onVerified={setVerifiedUser} />;
  }

  // Week summary
  const weekTotalHours = allCards.reduce((s, c) => s + parseFloat(c.totalHours || "0"), 0);
  const weekTotalOtHours = allCards.reduce((s, c) => s + parseFloat(c.totalOtHours || "0"), 0);
  const approvedTimecards = allCards.filter(c => c.status === "approved");
  const clockedInCount = clockStatuses.filter(s => s.openPunch).length;
  const weekDays = Array.from({ length: 7 }, (_, i) => formatIso(addDays(new Date(currentMonday + "T12:00:00"), i)));
  const today = formatIso(new Date());

  // Build grid rows: one row per non-admin active user, merged with timecard data
  const nonAdminUsers = allUsers.filter(u => u.role !== "admin" && u.isActive === "yes");
  const gridRows = nonAdminUsers.map(u => {
    const card = allCards.find(c => c.userId === u.id);
    const emp = employees.find(e => e.id === u.id);
    return {
      employee: { ...u, mileageEnabled: emp?.mileageEnabled || false, mileageRate: emp?.mileageRate || 0 },
      card,  // may be undefined if no timecard exists for this week
    };
  });

  // Drawer: find the timecard for the selected employee (if any)
  const selectedCard = selectedEmployeeId ? allCards.find(c => c.userId === selectedEmployeeId) : null;
  const selectedTimecardId = selectedCard?.id ?? null;

  // Fetch detail for the drawer's timecard
  const { data: drawerDetail } = useQuery<TimecardDetail>({
    queryKey: ["/api/timecards/admin/" + selectedTimecardId],
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  // Fetch punches for drawer
  const { data: drawerPunches = [] } = useQuery<ClockPunch[]>({
    queryKey: ["/api/timecards/" + selectedTimecardId + "/punches"],
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  // Fetch mileage for drawer
  const { data: drawerMileage = [], refetch: refetchDrawerMileage } = useQuery<MileageEntry[]>({
    queryKey: ["/api/timecards/admin/" + selectedTimecardId + "/mileage"],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/${selectedTimecardId}/mileage`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load mileage");
      return res.json();
    },
    enabled: !!verifiedUser && selectedTimecardId !== null,
  });

  const selectedEmployee = selectedEmployeeId ? nonAdminUsers.find(u => u.id === selectedEmployeeId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Time Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve employee timecards</p>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${feedback.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {feedback.message}
        </div>
      )}

      {/* Live Clock Status Bar */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Today's Status</h2>
          <Badge variant="secondary" className="ml-auto">
            {clockedInCount} clocked in
          </Badge>
        </div>
        {clockStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees found</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {clockStatuses.map((status) => {
              const isClockedIn = !!status.openPunch;
              const elapsed = isClockedIn
                ? ((Date.now() - new Date(status.openPunch!.clockIn).getTime()) / 3600000)
                : 0;
              return (
                <div
                  key={status.user.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    isClockedIn ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
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
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("status")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "status" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          Timecard View
        </button>
        <button
          onClick={() => setActiveTab("timecards")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "timecards" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4 inline mr-1.5" />
          Detail View
        </button>
        <button
          onClick={() => setActiveTab("recipients")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "recipients" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Recipients
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "employees" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="h-4 w-4 inline mr-1.5" />
          Employees
        </button>
      </div>

      {/* Week Nav */}
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

        {activeTab === "status" && (
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              {(["all", "draft", "submitted", "approved"] as const).map((pill) => (
                <button
                  key={pill}
                  onClick={() => setStatusFilterPill(pill)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                    statusFilterPill === pill
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {pill === "all" ? "All" : pill.charAt(0).toUpperCase() + pill.slice(1)}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Total Hours This Week: {weekTotalHours.toFixed(1)}h
              </span>
            </div>
          </div>
        )}

        {activeTab === "timecards" && (
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
        )}
      </div>

      {/* ═══ TIMECARD VIEW (Weekly Grid) ═══ */}
      {activeTab === "status" && (
        <>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading timecards…</div>
          ) : gridRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No employees found. Add employees in the Employees tab.</div>
          ) : (
            <div className="bg-card border rounded-lg overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 text-left py-2.5 px-3 font-semibold w-48">Employee</th>
                    {weekDays.map((day) => {
                      const isToday = day === today;
                      return (
                        <th
                          key={day}
                          className={`text-center py-2.5 px-2 font-medium w-20 ${
                            isToday ? "border-t-2 border-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="text-xs">{formatShortDay(day)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatShortDate(day)}</div>
                        </th>
                      );
                    })}
                    <th className="text-center py-2.5 px-2 font-semibold w-20">Reg Hrs</th>
                    <th className="text-center py-2.5 px-2 font-semibold w-16"><span className="text-amber-600">OT</span></th>
                    <th className="text-center py-2.5 px-2 font-semibold w-16"><span className="text-blue-600">PTO</span></th>
                    <th className="text-center py-2.5 px-2 font-semibold w-16"><span className="text-indigo-600">Hol</span></th>
                    <th className="text-center py-2.5 px-2 font-semibold w-16">Miles</th>
                    <th className="text-center py-2.5 px-2 font-semibold w-20">Mileage $</th>
                    <th className="text-center py-2.5 px-2 font-semibold w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gridRows.map(({ employee: emp, card }) => {
                    const clockStatus = clockStatuses.find(s => s.user.id === emp.id);
                    const isClockedIn = clockStatus?.openPunch != null;
                    const status = card?.status || "draft";
                    const totalHrs = card ? parseFloat(card.totalHours || "0") : 0;
                    const totalOtHrs = card ? parseFloat(card.totalOtHours || "0") : 0;
                    const totalPtoHrs = card ? parseFloat(card.totalPtoHours || "0") : 0;
                    const totalHolHrs = card ? parseFloat(card.totalHolidayHours || "0") : 0;
                    const totalMiles = card ? parseFloat(card.totalMileage || "0") : 0;
                    const mileagePayout = totalMiles * (emp.mileageRate || 0);

                    return (
                      <tr
                        key={emp.id}
                        className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="sticky left-0 z-9 bg-white hover:bg-muted/20 py-2 px-3">
                          <button
                            onClick={() => setSelectedEmployeeId(selectedEmployeeId === emp.id ? null : emp.id)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {initials(emp.firstName, emp.lastName)}
                              </div>
                              {isClockedIn && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                              )}
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-sm">{fullName({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email })}</div>
                              {isClockedIn && (
                                <div className="text-[10px] text-green-700">
                                  Clocked in
                                </div>
                              )}
                            </div>
                          </button>
                        </td>

                        {weekDays.map((day) => {
                          const isToday = day === today;
                          const isWeekend = day.endsWith("-06") || day.endsWith("-07");
                          const entry = card?.entries?.find(e => e.entryDate === day);

                          return (
                            <td
                              key={day}
                              className={`text-center py-2 px-2 ${
                                isToday ? "border-t-2 border-primary bg-primary/5" : ""
                              } ${isWeekend ? "bg-muted/30" : ""}`}
                            >
                              <GridCellEditor
                                entry={entry || null}
                                userId={emp.id}
                                entryDate={day}
                                currentMonday={currentMonday}
                                onSave={(hours) =>
                                  handleGridCellSave(entry && card ? card.id : null, emp.id, day, hours)
                                }
                              />
                            </td>
                          );
                        })}

                        <td className="text-center py-2 px-2">
                          <span className="font-semibold text-sm">{totalHrs.toFixed(1)}</span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <span className={`text-sm ${totalOtHrs > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
                            {totalOtHrs > 0 ? totalOtHrs.toFixed(1) : "—"}
                          </span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <span className={`text-sm ${totalPtoHrs > 0 ? "font-semibold text-blue-600" : "text-muted-foreground"}`}>
                            {totalPtoHrs > 0 ? totalPtoHrs.toFixed(1) : "—"}
                          </span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <span className={`text-sm ${totalHolHrs > 0 ? "font-semibold text-indigo-600" : "text-muted-foreground"}`}>
                            {totalHolHrs > 0 ? totalHolHrs.toFixed(1) : "—"}
                          </span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <span className="text-sm text-muted-foreground">{totalMiles > 0 ? totalMiles.toFixed(1) : "—"}</span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <span className="text-sm text-muted-foreground">{mileagePayout > 0 ? `$${mileagePayout.toFixed(2)}` : "—"}</span>
                        </td>

                        <td className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {statusBadge(status)}
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="bg-muted/50 font-semibold border-t-2">
                    <td className="sticky left-0 z-9 bg-muted/50 py-2.5 px-3 text-sm">Total</td>
                    {weekDays.map((day) => {
                      const dayTotal = gridRows.reduce((sum, { card }) => {
                        const entry = card?.entries?.find(e => e.entryDate === day);
                        return sum + parseFloat(entry?.hours || "0");
                      }, 0);
                      return (
                        <td key={day} className="text-center py-2.5 px-2 text-xs font-mono">
                          {dayTotal > 0 ? dayTotal.toFixed(1) : "—"}
                        </td>
                      );
                    })}
                    <td className="text-center py-2.5 px-2 text-sm">{weekTotalHours.toFixed(1)}</td>
                    <td className="text-center py-2.5 px-2 text-xs font-mono text-amber-600">
                      {(() => {
                        const total = gridRows.reduce((sum, { card }) => sum + parseFloat(card?.totalOtHours || "0"), 0);
                        return total > 0 ? total.toFixed(1) : "—";
                      })()}
                    </td>
                    <td className="text-center py-2.5 px-2 text-xs font-mono text-blue-600">
                      {(() => {
                        const total = gridRows.reduce((sum, { card }) => sum + parseFloat(card?.totalPtoHours || "0"), 0);
                        return total > 0 ? total.toFixed(1) : "—";
                      })()}
                    </td>
                    <td className="text-center py-2.5 px-2 text-xs font-mono text-indigo-600">
                      {(() => {
                        const total = gridRows.reduce((sum, { card }) => sum + parseFloat(card?.totalHolidayHours || "0"), 0);
                        return total > 0 ? total.toFixed(1) : "—";
                      })()}
                    </td>
                    <td className="text-center py-2.5 px-2 text-xs font-mono">
                      {(() => {
                        const totalMi = gridRows.reduce((sum, { card }) => sum + parseFloat(card?.totalMileage || "0"), 0);
                        return totalMi > 0 ? totalMi.toFixed(1) : "—";
                      })()}
                    </td>
                    <td className="text-center py-2.5 px-2 text-xs font-mono">
                      {(() => {
                        const totalPayout = gridRows.reduce((sum, { employee: emp, card }) => {
                          const miles = parseFloat(card?.totalMileage || "0");
                          return sum + miles * (emp.mileageRate || 0);
                        }, 0);
                        return totalPayout > 0 ? `$${totalPayout.toFixed(2)}` : "—";
                      })()}
                    </td>
                    <td className="py-2.5 px-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </>
      )}

      {/* ═══ EMPLOYEE DETAIL DRAWER ═══ */}
      <Sheet open={selectedEmployeeId !== null} onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedEmployee && (
                <>
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initials(selectedEmployee.firstName, selectedEmployee.lastName)}
                  </div>
                  <span>{fullName(selectedEmployee)}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-1">— {formatWeekLabel(currentMonday)}</span>
                </>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedCard && (
            <div className="flex items-center gap-2 mt-2 mb-4">
              {statusBadge(selectedCard.status)}
              {selectedCard.status === "submitted" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => approveTimecard.mutate(selectedCard.id)}
                  disabled={approveTimecard.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="font-semibold">{parseFloat(selectedCard.totalHours || "0").toFixed(1)}h</span>
                {parseFloat(selectedCard.totalOtHours || "0") > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">OT {parseFloat(selectedCard.totalOtHours || "0").toFixed(1)}h</Badge>
                )}
                {parseFloat(selectedCard.totalPtoHours || "0") > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO {parseFloat(selectedCard.totalPtoHours || "0").toFixed(1)}h</Badge>
                )}
                {parseFloat(selectedCard.totalHolidayHours || "0") > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Hol {parseFloat(selectedCard.totalHolidayHours || "0").toFixed(1)}h</Badge>
                )}
              </div>
            </div>
          )}

          {!selectedCard && selectedEmployeeId && (
            <p className="text-sm text-muted-foreground py-6 text-center">No timecard for this week yet.</p>
          )}

          {/* Entries Table */}
          {drawerDetail && drawerDetail.id === selectedTimecardId && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium text-xs">Day</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Type</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Clock In</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Clock Out</th>
                      <th className="text-center py-2 px-2 font-medium text-xs">Reg Hrs</th>
                      <th className="text-center py-2 px-2 font-medium text-xs text-amber-600">OT</th>
                      <th className="text-left py-2 px-2 font-medium text-xs">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerDetail.entries.map((entry: TimecardEntryWithMileage) => {
                      const hrs = parseFloat(entry.hours || "0");
                      const otHrs = parseFloat(entry.otHours || "0");
                      const ptoHrs = parseFloat(entry.ptoHours || "0");
                      const holHrs = parseFloat(entry.holidayHours || "0");
                      const wasAdminEdited = drawerDetail.auditLog.some(
                        (l) => l.action === "admin_edit" && l.entryDate === entry.entryDate,
                      );
                      // Find clock punches for this day
                      const dayPunches = drawerPunches.filter(p => p.punchDate === entry.entryDate);
                      const clockInStr = dayPunches.length > 0 ? formatTime(dayPunches[0].clockIn) : "—";
                      const lastPunch = dayPunches[dayPunches.length - 1];
                      const clockOutStr = lastPunch?.clockOut ? formatTime(lastPunch.clockOut) : (dayPunches.length > 0 ? "Active" : "—");

                      return (
                        <tr key={entry.id} className={`border-b last:border-b-0 ${
                          entry.entryType === "pto" ? "bg-blue-50/50" : entry.entryType === "holiday" ? "bg-indigo-50/50" : ""
                        }`}>
                          <td className="py-2 px-3 text-sm font-medium whitespace-nowrap">{formatDayLabel(entry.entryDate)}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              entry.entryType === "pto" ? "bg-blue-100 text-blue-700"
                                : entry.entryType === "holiday" ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {entry.entryType === "pto" ? "PTO" : entry.entryType === "holiday" ? "Hol" : "Work"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-xs font-mono">
                            {entry.entryType === "work" ? clockInStr : "—"}
                          </td>
                          <td className="py-2 px-2 text-center text-xs font-mono">
                            {entry.entryType === "work" ? (
                              <span className={clockOutStr === "Active" ? "text-green-600 font-semibold" : ""}>{clockOutStr}</span>
                            ) : "—"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {entry.entryType === "work" ? (
                              <span className={`text-sm font-mono ${hrs > 0 ? "font-semibold" : "text-muted-foreground"}`}>
                                {hrs > 0 ? `${hrs.toFixed(1)}h` : "—"}
                              </span>
                            ) : entry.entryType === "pto" ? (
                              <span className="text-sm font-mono font-semibold text-blue-600">{ptoHrs > 0 ? `${ptoHrs.toFixed(1)}h` : "—"}</span>
                            ) : (
                              <span className="text-sm font-mono font-semibold text-indigo-600">{holHrs > 0 ? `${holHrs.toFixed(1)}h` : "—"}</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-sm font-mono ${otHrs > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
                              {otHrs > 0 ? `${otHrs.toFixed(1)}h` : "—"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground truncate max-w-[120px]">
                            {entry.notes || "—"}
                            {wasAdminEdited && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-orange-600 border-orange-200">Admin</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mileage section */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Car className="h-3 w-3" /> Mileage Log
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setShowAddMileage(true);
                      setNewMileageDate(weekDays[0]);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Log Mileage
                  </Button>
                </div>
                {drawerMileage.length > 0 ? (
                  <div className="space-y-1">
                    {drawerMileage.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 text-sm py-1 px-2 rounded hover:bg-muted/50 group">
                        <span className="text-xs text-muted-foreground w-28">{formatDayLabel(m.entryDate)}</span>
                        <span className="font-mono text-xs font-semibold">{parseFloat(m.miles).toFixed(1)} mi</span>
                        {m.purpose && <span className="text-xs text-muted-foreground truncate flex-1">{m.purpose}</span>}
                        <button
                          onClick={() => deleteAdminMileage.mutate(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded ml-auto"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 text-sm py-1 px-2 font-semibold border-t mt-1 pt-1">
                      <span className="text-xs w-28">Total</span>
                      <span className="font-mono text-xs">{drawerMileage.reduce((s, m) => s + parseFloat(m.miles), 0).toFixed(1)} mi</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No mileage logged this week</p>
                )}
                {showAddMileage && selectedTimecardId && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 p-2 bg-blue-50 rounded">
                    <select
                      value={newMileageDate}
                      onChange={(e) => setNewMileageDate(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {weekDays.map((d) => (
                        <option key={d} value={d}>{formatDayLabel(d)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Miles"
                      value={newMileageMiles}
                      onChange={(e) => setNewMileageMiles(e.target.value)}
                      className="border rounded px-2 py-1 text-xs w-20"
                    />
                    <input
                      type="text"
                      placeholder="Purpose"
                      value={newMileagePurpose}
                      onChange={(e) => setNewMileagePurpose(e.target.value)}
                      className="border rounded px-2 py-1 text-xs flex-1 min-w-[100px]"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (selectedTimecardId && newMileageMiles) {
                          addAdminMileage.mutate({
                            timecardId: selectedTimecardId,
                            entryDate: newMileageDate,
                            miles: parseFloat(newMileageMiles),
                            purpose: newMileagePurpose.trim(),
                          });
                        }
                      }}
                      disabled={addAdminMileage.isPending || !newMileageMiles}
                    >
                      {addAdminMileage.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAddMileage(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Audit Log */}
              {drawerDetail.auditLog.length > 0 && (
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <History className="h-3 w-3" /> Audit Log
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {drawerDetail.auditLog.map((log) => {
                      const who = fullName(log.changedBy);
                      const when = new Date(log.changedAt).toLocaleString();
                      return (
                        <div key={log.id} className="text-xs">
                          <span className="text-muted-foreground">{when}</span>
                          <span className="mx-1">·</span>
                          <span className="font-medium">{who}</span>
                          {(log.action === "admin_edit" || log.action === "admin_edit_punch" || log.action === "admin_add_punch" || log.action === "admin_delete_punch") && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-orange-600 border-orange-200">Admin</Badge>
                          )}
                          <p className="text-muted-foreground">{log.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ DETAIL VIEW (Original card-per-employee) ═══ */}
      {activeTab === "timecards" && (
        <>
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
                      {parseFloat(card.totalOtHours || "0") > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">OT {parseFloat(card.totalOtHours || "0").toFixed(1)}h</Badge>
                      )}
                      {parseFloat(card.totalPtoHours || "0") > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px]">PTO {parseFloat(card.totalPtoHours || "0").toFixed(1)}h</Badge>
                      )}
                      {parseFloat(card.totalHolidayHours || "0") > 0 && (
                        <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Hol {parseFloat(card.totalHolidayHours || "0").toFixed(1)}h</Badge>
                      )}
                      {statusBadge(card.status)}
                      {card.recipient && (card.status === "submitted" || card.status === "approved") && (
                        <span className="text-xs text-muted-foreground">
                          → {card.recipient.title ? `${card.recipient.name} (${card.recipient.title})` : card.recipient.name}
                        </span>
                      )}
                      {card.totalMileage && parseFloat(card.totalMileage) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {parseFloat(card.totalMileage).toFixed(1)} mi
                        </Badge>
                      )}

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
                          <div className="grid grid-cols-[1fr_60px_80px_60px_60px_60px_1fr_80px] gap-2 text-xs font-medium text-muted-foreground mb-1">
                            <span>Day</span>
                            <span className="text-center">Type</span>
                            <span className="text-center">Hours</span>
                            <span className="text-center text-amber-600">OT</span>
                            <span className="text-center text-blue-600">PTO</span>
                            <span className="text-center text-indigo-600">Hol</span>
                            <span>Notes</span>
                            <span></span>
                          </div>
                          {expandedDetail.entries.map((entry: TimecardEntryWithMileage) => {
                            const wasAdminEdited = expandedDetail.auditLog.some(
                              (l) => l.action === "admin_edit" && l.entryDate === entry.entryDate,
                            );
                            const hrs = parseFloat(entry.hours || "0");
                            const otHrs = parseFloat(entry.otHours || "0");
                            const ptoHrs = parseFloat(entry.ptoHours || "0");
                            const holHrs = parseFloat(entry.holidayHours || "0");
                            return (
                              <div key={entry.id} className={`grid grid-cols-[1fr_60px_80px_60px_60px_60px_1fr_80px] gap-2 items-center py-1.5 border-b last:border-b-0 ${
                                entry.entryType === "pto" ? "bg-blue-50/50" : entry.entryType === "holiday" ? "bg-indigo-50/50" : ""
                              }`}>
                                <span className="text-sm">{formatDayLabel(entry.entryDate)}</span>
                                <span className={`text-[10px] text-center font-medium px-1 py-0.5 rounded ${
                                  entry.entryType === "pto" ? "bg-blue-100 text-blue-700"
                                    : entry.entryType === "holiday" ? "bg-indigo-100 text-indigo-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {entry.entryType === "pto" ? "PTO" : entry.entryType === "holiday" ? "Holiday" : "Work"}
                                </span>
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
                                <span className={`text-sm text-center ${otHrs > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
                                  {otHrs > 0 ? otHrs.toFixed(1) : "—"}
                                </span>
                                <span className={`text-sm text-center ${ptoHrs > 0 ? "font-semibold text-blue-600" : "text-muted-foreground"}`}>
                                  {ptoHrs > 0 ? ptoHrs.toFixed(1) : "—"}
                                </span>
                                <span className={`text-sm text-center ${holHrs > 0 ? "font-semibold text-indigo-600" : "text-muted-foreground"}`}>
                                  {holHrs > 0 ? holHrs.toFixed(1) : "—"}
                                </span>
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
                            <div className="space-y-0.5">
                              {expandedPunches.map((p) => (
                                <PunchEditRow
                                  key={p.id}
                                  punch={p}
                                  onSave={(punchId, clockIn, clockOut) => editPunch.mutate({ punchId, clockIn, clockOut })}
                                  onDelete={(punchId) => deletePunch.mutate(punchId)}
                                  isSaving={editPunch.isPending}
                                />
                              ))}
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
        </>
      )}

      {/* Manage Employees Section */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedEmployeesSection(!expandedEmployeesSection)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Manage Employees</h2>
          {expandedEmployeesSection ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>

        {expandedEmployeesSection && (
          <div className="border-t px-4 py-3 space-y-4">
            {employees.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current Employees</h3>
                <div className="space-y-1">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded border gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{emp.role}</Badge>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={emp.mileageEnabled}
                              onChange={(e) =>
                                updateMileage.mutate({
                                  userId: emp.id,
                                  mileageEnabled: e.target.checked,
                                  mileageRate: emp.mileageRate,
                                })
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-xs">Mileage</span>
                          </label>
                          {emp.mileageEnabled && (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={emp.mileageRate}
                              onChange={(e) =>
                                updateMileage.mutate({
                                  userId: emp.id,
                                  mileageEnabled: true,
                                  mileageRate: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="$/mi"
                              className="w-16 px-2 py-1 text-xs border rounded"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showAddEmployee ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddEmployee(true)}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Employee
              </Button>
            ) : (
              <div className="border-t pt-3 space-y-3">
                <h3 className="text-sm font-medium">Add New Employee</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input
                      type="text"
                      placeholder="First name"
                      value={newEmployeeForm.firstName}
                      onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input
                      type="text"
                      placeholder="Last name"
                      value={newEmployeeForm.lastName}
                      onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newEmployeeForm.email}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newEmployeeForm.password}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mileage-enabled"
                    checked={newEmployeeForm.mileageEnabled}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, mileageEnabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="mileage-enabled" className="text-sm font-normal cursor-pointer">
                    Enable Mileage Tracking
                  </Label>
                </div>
                {newEmployeeForm.mileageEnabled && (
                  <div>
                    <Label className="text-xs">Mileage Rate ($/mile)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.67"
                      value={newEmployeeForm.mileageRate}
                      onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, mileageRate: parseFloat(e.target.value) || 0 })}
                      className="text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addEmployee.mutate(newEmployeeForm)}
                    disabled={addEmployee.isPending || !newEmployeeForm.firstName || !newEmployeeForm.email || !newEmployeeForm.password}
                  >
                    {addEmployee.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Save Employee
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddEmployee(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payroll Contacts Section */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedPayrollSection(!expandedPayrollSection)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payroll Contacts</h2>
          {expandedPayrollSection ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>

        {expandedPayrollSection && (
          <div className="border-t px-4 py-3 space-y-4">
            {payrollContacts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Current Contacts</h3>
                <div className="space-y-1">
                  {payrollContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded border gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{contact.name}</div>
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => deletePayrollContact.mutate(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showAddContact ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddContact(true)}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            ) : (
              <div className="border-t pt-3 space-y-3">
                <h3 className="text-sm font-medium">Add Payroll Contact</h3>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    type="text"
                    placeholder="Contact name"
                    value={newContactForm.name}
                    onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addPayrollContact.mutate(newContactForm)}
                    disabled={addPayrollContact.isPending || !newContactForm.name || !newContactForm.email}
                  >
                    {addPayrollContact.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Save Contact
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddContact(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Employees Tab ── */}
      {activeTab === "employees" && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Employee Management</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Employees listed here have access to log timecards. Their email and password are also their dashboard login credentials.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddUserDialog(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2.5 px-3 font-medium w-10"></th>
                  <th className="text-left py-2.5 px-3 font-medium">Full Name</th>
                  <th className="text-left py-2.5 px-3 font-medium">Email</th>
                  <th className="text-left py-2.5 px-3 font-medium">Role</th>
                  <th className="text-center py-2.5 px-3 font-medium">Mileage Rate</th>
                  <th className="text-left py-2.5 px-3 font-medium">Status</th>
                  <th className="text-right py-2.5 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers
                  .filter(u => u.role !== "admin")
                  .map(u => {
                    const isActive = u.isActive === "yes";
                    return (
                      <tr key={u.id} className={`border-b last:border-b-0 ${!isActive ? "opacity-50" : "hover:bg-muted/20"}`}>
                        <td className="py-2 px-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            {initials(u.firstName, u.lastName)}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-medium">{fullName(u)}</td>
                        <td className="py-2 px-3 text-muted-foreground">{u.email}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {(() => {
                            const emp = employees.find(e => e.id === u.id);
                            if (!emp || !emp.mileageEnabled) return <span className="text-xs text-muted-foreground">—</span>;
                            return <span className="text-xs font-mono">${emp.mileageRate.toFixed(3)}/mi</span>;
                          })()}
                        </td>
                        <td className="py-2 px-3">
                          {isActive ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                const emp = employees.find(e => e.id === u.id);
                                setEditingEmployee({
                                  id: u.id,
                                  firstName: u.firstName || "",
                                  lastName: u.lastName || "",
                                  email: u.email,
                                  password: "",
                                  role: u.role,
                                  mileageRate: emp?.mileageRate?.toString() || "0",
                                });
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 text-xs ${isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                              onClick={() => updateUser.mutate({ id: u.id, isActive: isActive ? "no" : "yes" })}
                              disabled={updateUser.isPending}
                            >
                              {isActive ? "Deactivate" : "Reactivate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {allUsers.filter(u => u.role !== "admin").length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No employees yet. Click "Add Employee" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add Employee Dialog */}
          {showAddUserDialog && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="text-sm font-semibold">Add New Employee</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    placeholder="First name"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    placeholder="Last name"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Password *</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                  <SelectTrigger className="w-[160px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createUser.mutate(newUserForm)}
                  disabled={createUser.isPending || !newUserForm.firstName || !newUserForm.email || !newUserForm.password}
                >
                  {createUser.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save Employee
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddUserDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Edit Employee Dialog */}
          {editingEmployee && (
            <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50">
              <h4 className="text-sm font-semibold">Edit Employee</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={editingEmployee.firstName}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    value={editingEmployee.lastName}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, lastName: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editingEmployee.email}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  placeholder="New password (optional)"
                  value={editingEmployee.password}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={editingEmployee.role} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, role: v })}>
                  <SelectTrigger className="w-[160px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Mileage Rate ($/mile)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.670"
                  value={editingEmployee.mileageRate}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, mileageRate: e.target.value })}
                  className="text-sm w-[160px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const payload: any = {
                      id: editingEmployee.id,
                      firstName: editingEmployee.firstName,
                      lastName: editingEmployee.lastName,
                      email: editingEmployee.email,
                      role: editingEmployee.role,
                      mileageRate: parseFloat(editingEmployee.mileageRate) || 0,
                    };
                    if (editingEmployee.password) {
                      payload.password = editingEmployee.password;
                    }
                    updateUser.mutate(payload);
                  }}
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingEmployee(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recipients Tab ── */}
      {activeTab === "recipients" && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Timecard Recipients</h3>
            <Button size="sm" onClick={() => setShowAddRecipient(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Recipient
            </Button>
          </div>

          <div className="space-y-2">
            {allRecipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg p-3">
                {editingRecipient?.id === r.id ? (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <Input
                      value={editingRecipient.name}
                      onChange={(e) => setEditingRecipient({ ...editingRecipient, name: e.target.value })}
                      placeholder="Name"
                      className="text-sm"
                    />
                    <Input
                      value={editingRecipient.email}
                      onChange={(e) => setEditingRecipient({ ...editingRecipient, email: e.target.value })}
                      placeholder="Email"
                      className="text-sm"
                    />
                    <Input
                      value={editingRecipient.title || ""}
                      onChange={(e) => setEditingRecipient({ ...editingRecipient, title: e.target.value || null })}
                      placeholder="Title (optional)"
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => updateRecipientMut.mutate({
                          id: editingRecipient.id,
                          name: editingRecipient.name,
                          email: editingRecipient.email,
                          title: editingRecipient.title || undefined,
                        })}
                        disabled={updateRecipientMut.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingRecipient(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.title && <span className="text-xs text-muted-foreground ml-2">— {r.title}</span>}
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.isActive === "no" && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRecipient(r)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {r.isActive === "yes" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deactivateRecipient.mutate(r.id)}
                          disabled={deactivateRecipient.isPending}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {allRecipients.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No recipients yet. Add one above.</p>
            )}
          </div>

          {showAddRecipient && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Name *"
                  value={newRecipientForm.name}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, name: e.target.value })}
                  className="text-sm"
                />
                <Input
                  placeholder="Email *"
                  type="email"
                  value={newRecipientForm.email}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, email: e.target.value })}
                  className="text-sm"
                />
                <Input
                  placeholder="Title (optional)"
                  value={newRecipientForm.title}
                  onChange={(e) => setNewRecipientForm({ ...newRecipientForm, title: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createRecipient.mutate({
                    name: newRecipientForm.name.trim(),
                    email: newRecipientForm.email.trim(),
                    title: newRecipientForm.title.trim() || undefined,
                  })}
                  disabled={createRecipient.isPending || !newRecipientForm.name || !newRecipientForm.email}
                >
                  {createRecipient.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Save Recipient
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddRecipient(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
