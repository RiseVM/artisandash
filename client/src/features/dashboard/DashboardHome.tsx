import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/features/auth/hooks";
import { useCheckouts } from "@/features/checkouts/hooks";
import { useContracts } from "@/features/contracts/hooks";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeEST } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  AlertTriangle,
  FileCheck,
  FolderKanban,
  Calculator,
  MessageSquare,
  Users,
  PlusCircle,
  ArrowRight,
  Timer,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Send,
  ChevronRight,
  Sparkles,
  Loader2,
  Wrench,
  ClipboardList,
} from "lucide-react";
import { startOfMonth, format, formatDistanceToNow } from "date-fns";
import type { CheckoutView } from "@shared/schema";

// ── Helpers ──────────────────────────────────

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function money(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

export function DashboardHome() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const canManagePayroll = hasPermission("manage_timecards");
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const monday = getCurrentMonday();

  // ── Data ──
  const { data: checkouts = [] } = useCheckouts();
  const activeCheckouts = checkouts.filter((c: CheckoutView) => c.status === "checked_out");
  const overdueCheckouts = checkouts.filter((c: CheckoutView) => c.status === "overdue");

  const { data: contracts = [] } = useContracts();
  const monthStart = startOfMonth(new Date());
  const contractsThisMonth = contracts.filter((c: any) => new Date(c.createdAt) >= monthStart);
  const contractsAwaiting = contracts.filter((c: any) => c.status === "sent_for_signature");

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });
  const activeProjects = projects.filter((p: any) => p.status === "active" || p.status === "in_progress");

  const { data: estimates = [] } = useQuery<any[]>({
    queryKey: ["/api/estimates"],
    queryFn: async () => {
      const res = await fetch("/api/estimates", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });
  const pendingEstimates = estimates.filter((e: any) => e.status === "draft" || e.status === "sent");
  const quotesToFollowUp = estimates.filter((e: any) => e.status === "sent");
  const pipelineValue = pendingEstimates.reduce((s: number, e: any) => s + parseFloat(e.total || "0"), 0);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", { credentials: "include" });
      return res.ok ? res.json() : [];
    },
  });

  const { data: unreadMsgData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unified-unread"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unified-unread", { credentials: "include" });
      return res.ok ? res.json() : { count: 0 };
    },
  });
  const unreadCount = unreadMsgData?.count || 0;

  // Clock status (self)
  const { data: clockData } = useQuery<{ clockedIn: boolean; openPunch?: { clockIn: string } | null }>({
    queryKey: ["/api/timecards/clock/status"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/timecards/clock/status", { credentials: "include" });
        if (!res.ok) return { clockedIn: false };
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("json")) return { clockedIn: false };
        return res.json();
      } catch {
        return { clockedIn: false };
      }
    },
    refetchInterval: 30000,
  });
  const isClockedIn = clockData?.clockedIn ?? false;
  const clockInSince = clockData?.openPunch?.clockIn ? formatTimeEST(clockData.openPunch.clockIn) : null;

  const clockMutation = useMutation({
    mutationFn: async (action: "in" | "out") => {
      const res = await apiRequest("POST", `/api/timecards/clock/${action}`);
      return res.json();
    },
    onSuccess: (_d, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timecards/clock/status"] });
      toast({ title: action === "in" ? "Clocked in" : "Clocked out", description: formatTimeEST(new Date()) });
    },
    onError: (err: Error) => {
      toast({ title: "Clock action failed", description: String(err.message), variant: "destructive" });
    },
  });

  // ── Manager-only data ──
  const { data: weekCards = [] } = useQuery<any[]>({
    queryKey: ["/api/timecards/admin/all", { weekStartDate: monday }],
    queryFn: async () => {
      const res = await fetch(`/api/timecards/admin/all?weekStartDate=${monday}`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: canManagePayroll,
    refetchInterval: 60000,
  });
  const submittedCount = weekCards.filter((c) => c.status === "submitted").length;
  const approvedCount = weekCards.filter((c) => c.status === "approved").length;
  const weekHours = weekCards.reduce(
    (s, c) => s + parseFloat(c.totalHours || "0") + parseFloat(c.totalOtHours || "0"),
    0,
  );
  const clockedInNow = weekCards.filter((c) => c.clockStatus?.clockedIn);

  const { data: lastPayroll } = useQuery<any>({
    queryKey: ["/api/timecards/admin/payroll-history/latest"],
    queryFn: async () => {
      const res = await fetch("/api/timecards/admin/payroll-history/latest", { credentials: "include" });
      return res.ok ? res.json() : null;
    },
    enabled: canManagePayroll,
  });
  const payrollSentThisWeek = lastPayroll?.weekStartDate === monday && lastPayroll?.status === "sent";

  // ── Recent activity ──
  const recentActivity: { type: string; label: string; time: Date; href: string }[] = [];
  checkouts.slice(0, 15).forEach((c: CheckoutView) => {
    if (c.status === "returned" && c.returnedAt) {
      recentActivity.push({ type: "return", label: `${c.customerName} returned ${c.itemName}`, time: new Date(c.returnedAt), href: "/checkouts" });
    } else if (c.createdAt) {
      recentActivity.push({ type: "checkout", label: `${c.customerName} checked out ${c.itemName}`, time: new Date(c.createdAt), href: "/checkouts" });
    }
  });
  contracts.slice(0, 10).forEach((c: any) => {
    if (c.status === "signed" && c.signedAt) {
      recentActivity.push({ type: "contract", label: `Contract signed — ${c.customerName || "Customer"}`, time: new Date(c.signedAt), href: "/contracts" });
    }
  });
  recentActivity.sort((a, b) => b.time.getTime() - a.time.getTime());
  const topActivity = recentActivity.slice(0, 7);

  // ── Needs attention ──
  const attention: {
    key: string;
    icon: React.ReactNode;
    label: string;
    detail: string;
    count: number | string;
    href: string;
    urgent?: boolean;
  }[] = [];
  if (overdueCheckouts.length > 0)
    attention.push({ key: "overdue", icon: <AlertTriangle className="h-4 w-4" />, label: "Overdue samples", detail: "Past their return date", count: overdueCheckouts.length, href: "/checkouts", urgent: true });
  if (canManagePayroll && submittedCount > 0)
    attention.push({ key: "approve", icon: <CheckCircle2 className="h-4 w-4" />, label: "Timecards to approve", detail: "Submitted this week", count: submittedCount, href: "/time-management" });
  if (canManagePayroll && approvedCount > 0 && !payrollSentThisWeek)
    attention.push({ key: "payroll", icon: <Send className="h-4 w-4" />, label: "Payroll ready to send", detail: `${approvedCount} approved this week`, count: "Send", href: "/time-management" });
  if (quotesToFollowUp.length > 0)
    attention.push({ key: "quotes", icon: <Calculator className="h-4 w-4" />, label: "Quotes awaiting reply", detail: "Sent, not yet answered", count: quotesToFollowUp.length, href: "/estimates" });
  if (contractsAwaiting.length > 0)
    attention.push({ key: "contracts", icon: <FileCheck className="h-4 w-4" />, label: "Contracts out for signature", detail: "Waiting on the client", count: contractsAwaiting.length, href: "/contracts" });
  if (unreadCount > 0)
    attention.push({ key: "messages", icon: <MessageSquare className="h-4 w-4" />, label: "Unread messages", detail: "Client & internal", count: unreadCount, href: "/messages" });

  return (
    <div className="space-y-8">
      {/* ── Masthead ── */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">
          Artisan Tile · Kitchen &amp; Bath
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Good {getTimeOfDay()}, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {today}
              {isClockedIn && clockInSince && (
                <span className="text-foreground"> · On the clock since {clockInSince}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isClockedIn ? "outline" : "default"}
              onClick={() => clockMutation.mutate(isClockedIn ? "out" : "in")}
              disabled={clockMutation.isPending}
              className={isClockedIn ? "border-brass/40 text-foreground" : ""}
            >
              {clockMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isClockedIn ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isClockedIn ? "Clock Out" : "Clock In"}
            </Button>
            <Link href="/new">
              <Button variant="outline">
                <PlusCircle className="h-4 w-4" />
                New Checkout
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-6 h-px rule-warm" />
      </header>

      {/* ── Metrics ── */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <MetricTile
          href="/projects"
          icon={<FolderKanban className="h-4 w-4" />}
          label="Active Projects"
          value={activeProjects.length}
          sub={`${projects.length} total`}
          tone="brass"
        />
        <MetricTile
          href="/estimates"
          icon={<Calculator className="h-4 w-4" />}
          label="Open Pipeline"
          value={money(pipelineValue)}
          sub={`${pendingEstimates.length} quote${pendingEstimates.length === 1 ? "" : "s"}`}
        />
        <MetricTile
          href="/checkouts"
          icon={<Package className="h-4 w-4" />}
          label="Out on Loan"
          value={activeCheckouts.length}
          sub={overdueCheckouts.length > 0 ? `${overdueCheckouts.length} overdue` : "all on time"}
          tone={overdueCheckouts.length > 0 ? "urgent" : "default"}
        />
        <MetricTile
          href="/contracts"
          icon={<FileCheck className="h-4 w-4" />}
          label="Contracts (Mo.)"
          value={contractsThisMonth.length}
          sub={contractsAwaiting.length > 0 ? `${contractsAwaiting.length} awaiting` : "signed & filed"}
        />
        <MetricTile
          href="/customers"
          icon={<Users className="h-4 w-4" />}
          label="Clients"
          value={customers.length}
          sub="in your book"
        />
      </section>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left / main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Needs attention */}
          <Panel
            title="Needs your attention"
            accent
            right={attention.length > 0 ? <span className="nums text-xs text-muted-foreground">{attention.length} item{attention.length === 1 ? "" : "s"}</span> : undefined}
          >
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass-muted text-brass">
                  <Sparkles className="h-4 w-4" />
                </span>
                You&rsquo;re all caught up. Nothing needs action right now.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href}>
                      <div className="hover-elevate flex items-center gap-3 px-5 py-3 cursor-pointer">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                            a.urgent ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground/70"
                          }`}
                        >
                          {a.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{a.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                        </div>
                        <span
                          className={`nums flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            a.urgent
                              ? "bg-destructive text-destructive-foreground"
                              : typeof a.count === "string"
                              ? "bg-brass text-brass-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {a.count}
                        </span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Recent activity */}
          <Panel title="Recent activity">
            {topActivity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <ul className="px-5 py-2">
                {topActivity.map((item, i) => (
                  <li key={i}>
                    <Link href={item.href}>
                      <div className="hover-elevate -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 cursor-pointer">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            item.type === "return" ? "bg-brass" : item.type === "checkout" ? "bg-foreground/40" : "bg-brass"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(item.time, { addSuffix: true })}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          {/* On the clock (managers) */}
          {canManagePayroll && (
            <Panel
              title="On the clock"
              right={
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${clockedInNow.length > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                  {clockedInNow.length} in
                </span>
              }
            >
              {clockedInNow.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">No one is clocked in right now.</p>
              ) : (
                <ul className="px-5 py-2 space-y-1">
                  {clockedInNow.map((c) => {
                    const name = [c.user?.firstName, c.user?.lastName].filter(Boolean).join(" ") || c.user?.email;
                    const since = c.clockStatus?.clockInTime ? formatTimeEST(c.clockStatus.clockInTime) : null;
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {name}
                        </span>
                        <span className="nums text-xs text-muted-foreground">
                          {(c.clockStatus?.todayHours ?? 0).toFixed(1)}h{since ? ` · since ${since}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          {/* Payroll pulse (managers) */}
          {canManagePayroll && (
            <Panel title="Payroll · this week">
              <div className="space-y-3 px-5 py-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="nums font-serif text-3xl font-bold text-foreground">{weekHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">hours logged across the team</p>
                  </div>
                  <Timer className="h-5 w-5 text-brass" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">{approvedCount} approved</span>
                  {submittedCount > 0 && (
                    <span className="rounded-full bg-brass-muted px-2 py-0.5 font-medium text-brass">{submittedCount} to review</span>
                  )}
                </div>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  {payrollSentThisWeek ? (
                    <span className="flex items-center gap-1.5 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      Sent {lastPayroll?.sentAt ? formatDistanceToNow(new Date(lastPayroll.sentAt), { addSuffix: true }) : ""}
                    </span>
                  ) : lastPayroll ? (
                    <span className="text-muted-foreground">
                      Last sent {formatDistanceToNow(new Date(lastPayroll.sentAt), { addSuffix: true })}
                      {lastPayroll.sentByName ? ` by ${lastPayroll.sentByName}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No payroll sent yet.</span>
                  )}
                </div>
                <Link href="/time-management">
                  <Button variant="outline" size="sm" className="w-full">
                    Open Time Management
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Panel>
          )}

          {/* Quick actions */}
          <Panel title="Quick actions">
            <div className="grid grid-cols-2 gap-2 px-5 py-4">
              <QuickAction href="/quote-builder" icon={<Wrench className="h-4 w-4" />} label="Quote Builder" />
              <QuickAction href="/new" icon={<PlusCircle className="h-4 w-4" />} label="New Checkout" />
              <QuickAction href="/contracts" icon={<ClipboardList className="h-4 w-4" />} label="New Contract" />
              <QuickAction href="/projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" />
              <QuickAction href="/customers" icon={<Users className="h-4 w-4" />} label="Customers" />
              <QuickAction href={canManagePayroll ? "/time-management" : "/timecards"} icon={<Timer className="h-4 w-4" />} label="Timecards" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────

function Panel({
  title,
  right,
  accent,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-serif text-base font-bold text-foreground">
          {accent && <span className="h-3.5 w-0.5 rounded-full bg-brass" />}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  href,
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  tone?: "default" | "brass" | "urgent";
}) {
  return (
    <Link href={href}>
      <div className="lift group h-full cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              tone === "brass"
                ? "bg-brass-muted text-brass"
                : tone === "urgent"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-foreground/60"
            }`}
          >
            {icon}
          </span>
        </div>
        <p
          className={`nums mt-3 font-serif text-3xl font-bold ${
            tone === "urgent" ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </p>
        <p className={`mt-0.5 text-xs ${tone === "urgent" ? "text-destructive/80" : "text-muted-foreground"}`}>{sub}</p>
      </div>
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <Button variant="outline" className="h-auto w-full justify-start gap-2 py-2.5">
        <span className="text-brass">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </Button>
    </Link>
  );
}
