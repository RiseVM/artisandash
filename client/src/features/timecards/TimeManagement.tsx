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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  Pencil,
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
  clockIn?: string | null;
  clockOut?: string | null;
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

// ── Clock Time Helpers ─────────────────────

function clientCalcHours(clockIn: string, clockOut: string) {
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  const totalMins = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
  const totalHrs = parseFloat((totalMins / 60).toFixed(2));
  return { regular: Math.min(totalHrs, 8), ot: parseFloat(Math.max(0, totalHrs - 8).toFixed(2)) };
}

function parseTimeToComponents(time: string): { hour: string; minute: string; period: string } {
  if (!time) return { hour: "", minute: "", period: "" };
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour: String(hour12), minute: String(m).padStart(2, "0"), period };
}

function componentsToTime(hour: string, minute: string, period: string): string {
  if (!hour || !minute) return "";
  let h = parseInt(hour);
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

// ── Drawer Time Picker ─────────────────────

function DrawerTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { hour, minute, period } = parseTimeToComponents(value);

  const update = (h: string, m: string, p: string) => {
    if (h && m) onChange(componentsToTime(h, m, p || "AM"));
  };

  return (
    <div className="flex gap-0.5">
      <select
        value={hour}
        onChange={(e) => update(e.target.value, minute || "00", period)}
        className="border rounded px-1 h-7 text-xs w-[44px] bg-white"
      >
        <option value="">—</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={String(h)}>{h}</option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => update(hour || "9", e.target.value, period)}
        className="border rounded px-1 h-7 text-xs w-[48px] bg-white"
      >
        <option value="">—</option>
        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => update(hour || "9", minute || "00", e.target.value)}
        className="border rounded px-1 h-7 text-xs w-[44px] bg-white"
      >
        <option value="">—</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ── Drawer Entry Row ───────────────────────

function DrawerEntryRow({ entry, onSaved }: { entry: TimecardEntry; onSaved: () => void }) {
  const [clockIn, setClockIn] = useState(entry.clockIn ?? "");
  const [clockOut, setClockOut] = useState(entry.clockOut ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Client-side hours preview
  const calculated = (clockIn && clockOut) ? clientCalcHours(clockIn, clockOut) : null;
  const displayReg = calculated?.regular ?? parseFloat(entry.hours || "0");
  const displayOt = calculated?.ot ?? parseFloat(entry.otHours || "0");
  const displayPto = parseFloat(entry.ptoHours || "0");
  const displayHol = parseFloat(entry.holidayHours || "0");

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/timecards/admin/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clockIn: clockIn || null,
          clockOut: clockOut || null,
          notes: notes || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch {
      // silent fail — network error
    } finally {
      setSaving(false);
    }
  };

  const isWork = entry.entryType === "work" || !entry.entryType;

  return (
    <tr className={`border-b last:border-b-0 ${
      entry.entryType === "pto" ? "bg-blue-50/50" : entry.entryType === "holiday" ? "bg-indigo-50/50" : ""
    }`}>
      <td className="py-1 px-2 text-sm font-medium whitespace-nowrap">{formatDayLabel(entry.entryDate)}</td>
      <td className="py-1 px-1 text-center w-[50px]">
        <span className={`text-xs text-muted-foreground`}>
          {entry.entryType === "pto" ? "PTO" : entry.entryType === "holiday" ? "Hol" : "Work"}
        </span>
      </td>
      <td className="py-1 px-1">
        {isWork ? (
          <DrawerTimePicker value={clockIn} onChange={(v) => { setClockIn(v); }} />
        ) : (
          <span className="text-xs text-muted-foreground px-2">—</span>
        )}
      </td>
      <td className="py-1 px-1">
        {isWork ? (
          <DrawerTimePicker value={clockOut} onChange={(v) => { setClockOut(v); setTimeout(save, 100); }} />
        ) : (
          <span className="text-xs text-muted-foreground px-2">—</span>
        )}
      </td>
      <td className="py-1 px-1 text-center w-[60px]">
        {isWork ? (
          <span className={`text-sm font-mono ${displayReg > 0 ? "font-semibold" : "text-muted-foreground"}`}>
            {displayReg > 0 ? `${displayReg.toFixed(1)}` : "—"}
          </span>
        ) : entry.entryType === "pto" ? (
          <span className="text-sm font-mono font-semibold text-blue-600">{displayPto > 0 ? displayPto.toFixed(1) : "—"}</span>
        ) : (
          <span className="text-sm font-mono font-semibold text-indigo-600">{displayHol > 0 ? displayHol.toFixed(1) : "—"}</span>
        )}
      </td>
      <td className="py-1 px-1 text-center w-[60px]">
        <span className={`text-sm font-mono ${displayOt > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
          {displayOt > 0 ? `${displayOt.toFixed(1)}` : "—"}
        </span>
      </td>
      <td className="py-1 px-1">
        <input
          className="border rounded px-1.5 py-0.5 text-xs h-7 w-full min-w-[70px] bg-white"
          placeholder="Notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={save}
        />
      </td>
      <td className="py-1 px-1 w-12 text-center">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin inline text-muted-foreground" />
        ) : saved ? (
          <span className="text-[10px] text-green-600 font-medium">Saved</span>
        ) : null}
      </td>
    </tr>
  );
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
  const { toast } = useToast();

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
  const [showAddMileage, setShowAddMileage] = useState(false);
  const [newMileageDate, setNewMileageDate] = useState("");
  const [newMileageMiles, setNewMileageMiles] = useState("");
  const [newMileagePurpose, setNewMileagePurpose] = useState("");
  const [drawerMilesInput, setDrawerMilesInput] = useState("");
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    firstName: "", lastName: "", email: "", password: "", role: "staff", mileageRate: "0.670",
  });
  const [savingDrawerMileage, setSavingDrawerMileage] = useState(false);
  const [drawerMileageSaved, setDrawerMileageSaved] = useState(false);

  // ── All useQuery ──
  const { data: clockStatuses = [] } = useQuery<EmployeeClockStatus[]>({
    queryKey: ["/api/timecards/admin/clock-status"],
    enabled: !!verifiedUser,
    refetchInterval: 30000,
  });

  const { data: allCards = [], isLoading } = useQuery<TimecardWithUser[]>({
    queryKey: ["/api/timecards/admin/all", { weekStartDate: currentMonday }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("weekStartDate", currentMonday);
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

  // ── Sync drawer mileage input ──
  useEffect(() => {
    if (drawerMileage) {
      const total = drawerMileage.reduce((sum, m) => sum + parseFloat(m.miles || "0"), 0);
      setDrawerMilesInput(total > 0 ? total.toFixed(1) : "");
    }
  }, [drawerMileage]);

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

  const saveDrawerMileage = useCallback(async () => {
    if (!selectedTimecardId || !drawerMilesInput) return;
    setSavingDrawerMileage(true);
    try {
      await fetch(`/api/timecards/admin/${selectedTimecardId}/mileage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entryDate: currentMonday, miles: parseFloat(drawerMilesInput), purpose: "Weekly mileage" }),
      });
      refetchDrawerMileage();
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
      setDrawerMileageSaved(true);
      setTimeout(() => setDrawerMileageSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSavingDrawerMileage(false);
    }
  }, [selectedTimecardId, drawerMilesInput, currentMonday, refetchDrawerMileage, queryClient]);

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
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Miles</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Mileage $</th>
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
                  <td className="px-3 py-3 text-right font-bold text-sm border-l border-muted/30">
                    {(() => {
                      if (!card) return "—";
                      const reg = parseFloat(String(card.totalHours ?? "0"));
                      const ot = parseFloat(String(card.totalOtHours ?? "0"));
                      const total = reg + ot;
                      if (total === 0) return "—";
                      return ot > 0
                        ? <span>{reg.toFixed(1)} <span className="text-amber-600 text-xs">+{ot.toFixed(1)} OT</span></span>
                        : `${total.toFixed(1)}h`;
                    })()}
                  </td>

                  {/* Miles */}
                  <td className="px-3 py-3 text-right text-sm border-l border-muted/30">
                    {card && parseFloat(card.totalMileage || "0") > 0
                      ? `${parseFloat(card.totalMileage || "0").toFixed(1)}`
                      : <span className="text-muted-foreground">—</span>}
                  </td>

                  {/* Mileage $ */}
                  <td className="px-3 py-3 text-right text-sm font-medium border-l border-muted/30">
                    {(() => {
                      if (!card) return <span className="text-muted-foreground">—</span>;
                      const miles = parseFloat(String(card.totalMileage ?? "0"));
                      const rate = (() => {
                        const r = parseFloat(String(employee.mileageRate ?? "0"));
                        return (isNaN(r) || r === 0) ? 0.67 : r;
                      })();
                      if (isNaN(miles) || miles === 0) return <span className="text-muted-foreground">—</span>;
                      return `$${(miles * rate).toFixed(2)}`;
                    })()}
                  </td>
                </tr>
              ))}
              {/* Totals Footer Row */}
              <tr className="bg-muted/50 border-t-2 font-semibold">
                <td className="px-4 py-2 text-sm">Total</td>
                <td className="px-4 py-2"></td>
                {weekDays.map((day) => {
                  const dayTotal = gridRows.reduce((sum, { card }) => {
                    const entry = card?.entries?.find(e => e.entryDate === day);
                    return sum + parseFloat(entry?.hours || "0");
                  }, 0);
                  return (
                    <td key={day} className="px-2 py-2 text-center text-xs font-mono border-l border-muted/30">
                      {dayTotal > 0 ? dayTotal.toFixed(1) : "—"}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-sm font-bold border-l border-muted/30">
                  {(() => {
                    const reg = gridRows.reduce((s, { card }) => s + parseFloat(String(card?.totalHours ?? "0")), 0);
                    const ot = gridRows.reduce((s, { card }) => s + parseFloat(String(card?.totalOtHours ?? "0")), 0);
                    const total = reg + ot;
                    if (total === 0) return "—";
                    return ot > 0
                      ? <span>{reg.toFixed(1)} <span className="text-amber-600 text-xs">+{ot.toFixed(1)} OT</span></span>
                      : `${total.toFixed(1)}h`;
                  })()}
                </td>
                <td className="px-3 py-2 text-right text-sm border-l border-muted/30">
                  {(() => {
                    const totalMi = gridRows.reduce((s, { card }) => s + parseFloat(card?.totalMileage || "0"), 0);
                    return totalMi > 0 ? `${totalMi.toFixed(1)}` : "—";
                  })()}
                </td>
                <td className="px-3 py-2 text-right text-sm font-medium border-l border-muted/30">
                  {(() => {
                    const total = gridRows.reduce((sum, { employee, card }) => {
                      if (!card) return sum;
                      const miles = parseFloat(String(card.totalMileage ?? "0"));
                      const rate = (() => {
                        const r = parseFloat(String(employee.mileageRate ?? "0"));
                        return (isNaN(r) || r === 0) ? 0.67 : r;
                      })();
                      if (isNaN(miles)) return sum;
                      return sum + miles * rate;
                    }, 0);
                    return total > 0 ? `$${total.toFixed(2)}` : "—";
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Sheet Drawer */}
      <Sheet open={!!selectedEmployeeId} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <SheetContent className="w-full sm:max-w-[900px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
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

          {/* Status + Approve + Summary */}
          {selectedCard && (
            <div className="flex items-center gap-2 mt-2 mb-4 px-6">
              {statusBadge(selectedCard.status)}
              {(selectedCard.status === "draft" || selectedCard.status === "submitted") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => approveTimecard.mutate(selectedCard.id)}
                  disabled={approveTimecard.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {approveTimecard.isPending ? "Approving..." : "Approve"}
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
            <p className="text-sm text-muted-foreground py-6 text-center px-6">No timecard for this week yet.</p>
          )}

          {drawerDetail && drawerDetail.id === selectedTimecardId && (
            <div className="flex-1 overflow-y-auto space-y-4 px-6 pb-6">
              {/* Editable Entries Table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-1.5 px-2 font-medium text-xs">Day</th>
                      <th className="text-center py-1.5 px-1 font-medium text-xs w-[50px]">Type</th>
                      <th className="text-left py-1.5 px-1 font-medium text-xs">Clock In</th>
                      <th className="text-left py-1.5 px-1 font-medium text-xs">Clock Out</th>
                      <th className="text-center py-1.5 px-1 font-medium text-xs w-[60px]">Reg</th>
                      <th className="text-center py-1.5 px-1 font-medium text-xs w-[60px] text-amber-600">OT</th>
                      <th className="text-left py-1.5 px-1 font-medium text-xs">Notes</th>
                      <th className="py-1.5 px-1 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerDetail.entries.map((entry: TimecardEntryWithMileage) => (
                      <DrawerEntryRow
                        key={`${entry.id}-${entry.clockIn}-${entry.clockOut}-${entry.hours}`}
                        entry={entry}
                        onSaved={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/" + selectedTimecardId] });
                          queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/all"] });
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clock Punches Section */}
              {drawerPunches.length > 0 && (
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Clock className="h-3 w-3" /> Clock Punches
                  </p>
                  <div className="space-y-1">
                    {drawerPunches.map((punch) => (
                      <div key={punch.id} className="flex items-center gap-3 text-xs py-1 px-2 rounded hover:bg-muted/50">
                        <span className="text-muted-foreground w-24">{formatDayLabel(punch.punchDate)}</span>
                        <span className="font-mono">
                          {formatTime(punch.clockIn)} → {punch.clockOut ? formatTime(punch.clockOut) : <span className="text-green-600 font-medium">Active</span>}
                        </span>
                        <span className="text-muted-foreground ml-auto">
                          {punch.hours ? `${parseFloat(punch.hours).toFixed(1)}h` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mileage Section */}
              {selectedTimecardId && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Car className="h-4 w-4" /> Mileage This Week
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Total Miles:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="border rounded px-2 py-1 text-sm w-[90px]"
                        value={drawerMilesInput}
                        onChange={(e) => setDrawerMilesInput(e.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={saveDrawerMileage} disabled={savingDrawerMileage}>
                      {savingDrawerMileage ? "Saving..." : "Save"}
                    </Button>
                    {drawerMileageSaved && <span className="text-xs text-green-600">Saved</span>}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Rate: <span className="font-medium">${(() => {
                      const emp = employees.find(e => e.id === selectedEmployeeId);
                      return (emp?.mileageRate ?? 0.67).toFixed(3);
                    })()}/mi</span></div>
                    <div>Mileage Payout: <span className="font-semibold text-foreground">${(() => {
                      const emp = employees.find(e => e.id === selectedEmployeeId);
                      const rate = emp?.mileageRate ?? 0.67;
                      const miles = parseFloat(drawerMilesInput || "0");
                      return (miles * rate).toFixed(2);
                    })()}</span></div>
                  </div>
                </div>
              )}

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

            {nonAdminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees</p>
            ) : (
              <div className="space-y-2">
                {nonAdminUsers.map((u) => {
                  const emp = employees.find(e => e.id === u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setEditingEmployee(emp ?? { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, mileageEnabled: false, mileageRate: 0 });
                        setEditEmployeeForm({
                          firstName: u.firstName || "",
                          lastName: u.lastName || "",
                          email: u.email,
                          password: "",
                          role: u.role,
                          mileageRate: String(emp?.mileageRate || "0.670"),
                        });
                        setEditEmployeeOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.firstName || ""} {u.lastName || ""}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          ${parseFloat(String(emp?.mileageRate || "0.670")).toFixed(3)}/mi
                        </span>
                        <Badge variant="secondary">{u.role}</Badge>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
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

      {/* Edit Employee Dialog */}
      <Dialog open={editEmployeeOpen} onOpenChange={setEditEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee details and mileage rate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input
                  value={editEmployeeForm.firstName}
                  onChange={e => setEditEmployeeForm(p => ({...p, firstName: e.target.value}))}
                />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input
                  value={editEmployeeForm.lastName}
                  onChange={e => setEditEmployeeForm(p => ({...p, lastName: e.target.value}))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={editEmployeeForm.email}
                onChange={e => setEditEmployeeForm(p => ({...p, email: e.target.value}))}
              />
            </div>
            <div className="space-y-1">
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input
                type="password"
                value={editEmployeeForm.password}
                onChange={e => setEditEmployeeForm(p => ({...p, password: e.target.value}))}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={editEmployeeForm.role}
                onValueChange={v => setEditEmployeeForm(p => ({...p, role: v}))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Mileage Rate ($/mi)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.670"
                value={editEmployeeForm.mileageRate}
                onChange={e => setEditEmployeeForm(p => ({...p, mileageRate: e.target.value}))}
              />
              <p className="text-xs text-muted-foreground">IRS standard rate: $0.670/mi</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmployeeOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!editingEmployee) return;
              const body: Record<string, string> = {
                firstName: editEmployeeForm.firstName,
                lastName: editEmployeeForm.lastName,
                email: editEmployeeForm.email,
                role: editEmployeeForm.role,
                mileageRate: editEmployeeForm.mileageRate,
              };
              if (editEmployeeForm.password) body.password = editEmployeeForm.password;
              await fetch(`/api/users/${editingEmployee.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
              });
              queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/users"] });
              queryClient.invalidateQueries({ queryKey: ["/api/timecards/admin/employees"] });
              toast({ title: "Employee updated successfully" });
              setEditEmployeeOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
