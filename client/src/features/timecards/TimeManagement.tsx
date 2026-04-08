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
  Mail,
  UserPlus,
  Trash2,
  DollarSign,
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
  totalMileage: string | null;
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
  totalMileage: number | null;
  entries: TimecardEntry[];
  auditLog: AuditLogEntry[];
}

interface TimecardEntryWithMileage extends TimecardEntry {
  mileage?: number | null;
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
  const [expandedEmployeesSection, setExpandedEmployeesSection] = useState(false);
  const [expandedPayrollSection, setExpandedPayrollSection] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({ firstName: "", lastName: "", email: "", password: "", mileageEnabled: false, mileageRate: 0 });
  const [newContactForm, setNewContactForm] = useState({ name: "", email: "" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
  const approvedTimecards = allCards.filter(c => c.status === "approved");

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
            {/* Employees List */}
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

            {/* Add Employee Form */}
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
            {/* Contacts List */}
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

            {/* Add Contact Form */}
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
                      <div className="grid grid-cols-[1fr_100px_80px_1fr_80px] gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <span>Day</span>
                        <span className="text-center">Hours</span>
                        <span className="text-center">Mileage</span>
                        <span>Notes</span>
                        <span></span>
                      </div>
                      {expandedDetail.entries.map((entry: TimecardEntryWithMileage) => {
                        const wasAdminEdited = expandedDetail.auditLog.some(
                          (l) => l.action === "admin_edit" && l.entryDate === entry.entryDate,
                        );
                        return (
                          <div key={entry.id} className="grid grid-cols-[1fr_100px_80px_1fr_80px] gap-2 items-center py-1.5 border-b last:border-b-0">
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
                            <span className="text-sm text-center text-muted-foreground">
                              {entry.mileage ? `${entry.mileage.toFixed(1)} mi` : "—"}
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
