import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useCheckouts, useUpdateCheckout, useDeleteCheckout, useSendReminder } from "./hooks";
import { useCustomers } from "../customers/hooks";
import { useInventory } from "../inventory/hooks";
import { useContracts } from "../contracts/hooks";
import { StatusBadge } from "./StatusBadge";
import type { CheckoutView } from "@shared/schema";
import { startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatShortDateEST, formatReminderDateEST } from "@/lib/utils";
import {
  Search, CheckCircle2, Calendar, Check, ChevronsUpDown,
  Loader2, Trash2, Mail, ClipboardList, Package, User, Clock,
  ChevronRight, StickyNote, CreditCard, Send,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EditCheckoutState {
  id: number;
  customer_id: number;
  inventory_item_id: number;
  checkout_date: string;
  due_date: string;
  status: "checked_out" | "overdue" | "returned";
  notes: string;
  auth_notes: string;
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: checkouts = [], isLoading: checkoutsLoading } = useCheckouts();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const { data: contracts = [] } = useContracts();
  const updateCheckoutMutation = useUpdateCheckout();
  const deleteCheckoutMutation = useDeleteCheckout();
  const sendReminderMutation = useSendReminder();

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"due_asc" | "due_desc" | "name_asc">("due_asc");
  const [editingCheckout, setEditingCheckout] = useState<EditCheckoutState | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkReturning, setIsBulkReturning] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const activeCount = checkouts.filter((c) => c.status !== "returned").length;
    const overdueCount = checkouts.filter((c) => c.status === "overdue").length;
    return { activeCount, overdueCount };
  }, [checkouts]);

  const handleSendReminder = async (checkoutId: number, customerEmail: string) => {
    setSendingReminderId(checkoutId);
    try {
      await sendReminderMutation.mutateAsync(checkoutId);
      toast({ title: "Reminder Sent", description: `Email sent to ${customerEmail}`, duration: 1000 });
    } catch {
      toast({ title: "Failed to Send", description: "Could not send reminder email", variant: "destructive" });
    } finally {
      setSendingReminderId(null);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items: CheckoutView[]) => {
    const allIds = items.map((c) => c.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleBulkReturn = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkReturning(true);
    const ids = Array.from(selectedIds);
    const successfulIds: number[] = [];
    for (const id of ids) {
      try {
        await updateCheckoutMutation.mutateAsync({ id, data: { status: "returned" } });
        successfulIds.push(id);
      } catch {}
    }
    if (successfulIds.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        successfulIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    toast({
      title: "Samples Returned",
      description: `${successfulIds.length} sample${successfulIds.length > 1 ? "s" : ""} marked as returned.`,
    });
    setIsBulkReturning(false);
  };

  // Auto-mark overdue
  const hasCheckedOverdue = useRef(false);
  useEffect(() => {
    if (checkouts.length > 0 && !hasCheckedOverdue.current) {
      hasCheckedOverdue.current = true;
      const today = format(new Date(), "yyyy-MM-dd");
      const overdueCheckouts = checkouts.filter(
        (c) => c.status !== "returned" && c.due_date < today && c.status !== "overdue",
      );
      for (const checkout of overdueCheckouts) {
        updateCheckoutMutation.mutate({ id: checkout.id, data: { status: "overdue" } });
      }
    }
  }, [checkouts]);

  const handleStatusChange = async (id: number, newStatus: "checked_out" | "overdue" | "returned") => {
    try {
      await updateCheckoutMutation.mutateAsync({ id, data: { status: newStatus } });
      toast({ title: "Status Updated", description: `Checkout #${id} marked as ${newStatus.replace("_", " ")}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const openEditDialog = (sample: CheckoutView) => {
    setEditingCheckout({
      id: sample.id, customer_id: sample.customer_id,
      inventory_item_id: sample.inventory_item_id,
      checkout_date: sample.checkout_date, due_date: sample.due_date,
      status: sample.status as any, notes: sample.notes || "",
      auth_notes: sample.auth_notes || "",
    });
  };

  const handleUpdateCheckout = async () => {
    if (!editingCheckout) return;
    try {
      await updateCheckoutMutation.mutateAsync({
        id: editingCheckout.id,
        data: {
          customer_id: editingCheckout.customer_id,
          inventory_item_id: editingCheckout.inventory_item_id,
          checkout_date: editingCheckout.checkout_date,
          due_date: editingCheckout.due_date,
          status: editingCheckout.status,
          notes: editingCheckout.notes,
        },
      });
      setEditingCheckout(null);
      toast({ title: "Checkout Updated", description: "All changes saved successfully." });
    } catch {
      toast({ title: "Update Failed", description: "Failed to save changes.", variant: "destructive" });
    }
  };

  const filterAndSort = (items: CheckoutView[]) => {
    let filtered = items.filter(
      (s) =>
        s.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        s.item.name.toLowerCase().includes(search.toLowerCase()) ||
        s.customer.email.toLowerCase().includes(search.toLowerCase()),
    );
    return filtered.sort((a, b) => {
      if (sortOrder === "due_asc") return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (sortOrder === "due_desc") return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      if (sortOrder === "name_asc") return a.customer.name.localeCompare(b.customer.name);
      return 0;
    });
  };

  const activeCheckouts = filterAndSort(checkouts.filter((c) => c.status !== "returned"));
  const returnedCheckouts = filterAndSort(checkouts.filter((c) => c.status === "returned"));

  const selectedCustomer = editingCheckout ? customers.find((c) => c.id === editingCheckout.customer_id) : null;
  const selectedItem = editingCheckout ? inventory.find((i) => i.id === editingCheckout.inventory_item_id) : null;

  if (checkoutsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Checkout Card Row ──────────────────────────
  const CheckoutCard = ({ sample, showCheckbox = false }: { sample: CheckoutView; showCheckbox?: boolean }) => {
    const daysUntilDue = Math.ceil((new Date(sample.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isDueSoon = sample.status === "checked_out" && daysUntilDue <= 3 && daysUntilDue >= 0;

    return (
      <div
        className={cn(
          "group relative flex items-center gap-4 p-4 rounded-xl border bg-white transition-all cursor-pointer",
          "hover:shadow-md hover:border-slate-300",
          sample.status === "overdue" && "border-red-200 bg-red-50/30",
          isDueSoon && "border-amber-200 bg-amber-50/20",
        )}
        onClick={() => openEditDialog(sample)}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Checkbox
              checked={selectedIds.has(sample.id)}
              onCheckedChange={() => toggleSelection(sample.id)}
              className="h-4.5 w-4.5"
            />
          </div>
        )}

        {/* Customer avatar + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <User className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{sample.customer.name}</p>
            <p className="text-xs text-slate-500 truncate">{sample.customer.email}</p>
          </div>
        </div>

        {/* Sample info */}
        <div className="hidden sm:block min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700 truncate">{sample.item.name}</p>
          <p className="text-xs text-slate-400 truncate">
            {[sample.item.color, sample.item.vendor].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Due date */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 min-w-[100px]">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <div>
            <p className={cn(
              "text-xs font-medium",
              sample.status === "overdue" ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-600",
            )}>
              {formatShortDateEST(sample.due_date)}
            </p>
            {sample.last_reminder_sent && (
              <p className="text-[10px] text-slate-400">
                Reminded {formatReminderDateEST(sample.last_reminder_sent)}
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Select defaultValue={sample.status} onValueChange={(val: any) => handleStatusChange(sample.id, val)}>
            <SelectTrigger className="h-auto w-auto border-none bg-transparent p-0 shadow-none focus:ring-0">
              <StatusBadge status={sample.status as any} size="sm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Remind button */}
        <div className="shrink-0 hidden lg:block" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => handleSendReminder(sample.id, sample.customer.email)}
            disabled={sendingReminderId === sample.id}
          >
            {sendingReminderId === sample.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      </div>
    );
  };

  // ── Checkout List ──────────────────────────────
  const CheckoutList = ({ data, showCheckboxes = false }: { data: CheckoutView[]; showCheckboxes?: boolean }) => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No checkouts found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or create a new checkout</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {showCheckboxes && data.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1">
            <Checkbox
              checked={data.length > 0 && data.every((c) => selectedIds.has(c.id))}
              onCheckedChange={() => toggleSelectAll(data)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-slate-400">Select all</span>
          </div>
        )}
        {data.map((sample) => (
          <CheckoutCard key={sample.id} sample={sample} showCheckbox={showCheckboxes} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            Checkouts
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {stats.activeCount} active
            </span>
            {stats.overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {stats.overdueCount} overdue
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {returnedCheckouts.length} returned
            </span>
          </div>
        </div>
        <Link href="/new">
          <Button size="lg" className="shadow-sm">
            <Package className="h-4 w-4 mr-2" />
            New Checkout
          </Button>
        </Link>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers, samples, emails..."
            className="pl-9 h-10 bg-white border-slate-200 focus-visible:ring-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
          <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due_asc">Due Date (Earliest)</SelectItem>
            <SelectItem value="due_desc">Due Date (Latest)</SelectItem>
            <SelectItem value="name_asc">Customer Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} sample{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button size="sm" onClick={handleBulkReturn} disabled={isBulkReturning} className="bg-blue-600 hover:bg-blue-700">
            {isBulkReturning ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Mark as Returned</>
            )}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 h-auto">
          <TabsTrigger value="active" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Active ({activeCheckouts.length})
          </TabsTrigger>
          <TabsTrigger value="returned" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Returned ({returnedCheckouts.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All ({checkouts.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <CheckoutList data={activeCheckouts} showCheckboxes={true} />
        </TabsContent>
        <TabsContent value="returned" className="mt-4">
          <CheckoutList data={returnedCheckouts} />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <CheckoutList data={filterAndSort(checkouts)} showCheckboxes={true} />
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ──────────────────────────── */}
      <Dialog open={!!editingCheckout} onOpenChange={(open) => !open && setEditingCheckout(null)}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
          {editingCheckout && (
            <>
              {/* Dialog Header with status */}
              <div className="bg-slate-50 border-b px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-lg font-semibold text-slate-900">Edit Checkout</DialogTitle>
                    <p className="text-sm text-slate-500 mt-0.5">#{editingCheckout.id}</p>
                  </div>
                  <StatusBadge status={editingCheckout.status} />
                </div>
              </div>

              {/* Form Body */}
              <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Customer */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Customer</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-11 bg-white border-slate-200 text-left font-normal hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm truncate block">{selectedCustomer?.name || "Select customer"}</span>
                            {selectedCustomer?.email && (
                              <span className="text-xs text-slate-400 truncate block">{selectedCustomer.email}</span>
                            )}
                          </div>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customer..." />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => { setEditingCheckout({ ...editingCheckout, customer_id: customer.id }); setCustomerOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", customer.id === editingCheckout.customer_id ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <div className="text-sm">{customer.name}</div>
                                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sample Item */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Sample Item</Label>
                  <Popover open={itemOpen} onOpenChange={setItemOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-11 bg-white border-slate-200 text-left font-normal hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm truncate block">{selectedItem?.name || "Select sample"}</span>
                            {selectedItem && (
                              <span className="text-xs text-slate-400 truncate block">
                                {[selectedItem.color, selectedItem.vendor].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search inventory..." />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup>
                            {inventory.map((item) => (
                              <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => { setEditingCheckout({ ...editingCheckout, inventory_item_id: item.id }); setItemOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", item.id === editingCheckout.inventory_item_id ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <div className="text-sm">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{[item.color, item.vendor].filter(Boolean).join(" · ")}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Checkout Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        className="pl-10 h-10 bg-white border-slate-200"
                        value={editingCheckout.checkout_date}
                        onChange={(e) => setEditingCheckout({ ...editingCheckout, checkout_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        className="pl-10 h-10 bg-white border-slate-200"
                        value={editingCheckout.due_date}
                        onChange={(e) => setEditingCheckout({ ...editingCheckout, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</Label>
                  <Select value={editingCheckout.status} onValueChange={(val: any) => setEditingCheckout({ ...editingCheckout, status: val })}>
                    <SelectTrigger className="h-10 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checked_out">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Checked Out
                        </div>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          Overdue
                        </div>
                      </SelectItem>
                      <SelectItem value="returned">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Returned
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">Notes</Label>
                  <Textarea
                    value={editingCheckout.notes}
                    onChange={(e) => setEditingCheckout({ ...editingCheckout, notes: e.target.value })}
                    placeholder="Add notes about this checkout..."
                    className="resize-none bg-white border-slate-200 min-h-[80px]"
                    rows={3}
                  />
                </div>

                {/* Payment Info */}
                {editingCheckout.auth_notes && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      Payment Info
                    </Label>
                    <div className="text-sm bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-600">{editingCheckout.auth_notes}</div>
                  </div>
                )}

                {/* Send Reminder */}
                <Button
                  variant="outline"
                  className="w-full h-10 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    const customer = customers.find((c) => c.id === editingCheckout.customer_id);
                    if (customer) handleSendReminder(editingCheckout.id, customer.email);
                  }}
                  disabled={sendingReminderId === editingCheckout.id}
                >
                  {sendingReminderId === editingCheckout.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Reminder Email
                </Button>
              </div>

              {/* Dialog Footer */}
              <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteCheckoutMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingCheckout(null)} className="border-slate-200">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleUpdateCheckout} disabled={updateCheckoutMutation.isPending}>
                    {updateCheckoutMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checkout</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!editingCheckout) return;
                try {
                  await deleteCheckoutMutation.mutateAsync(editingCheckout.id);
                  setShowDeleteConfirm(false);
                  setEditingCheckout(null);
                  toast({ title: "Checkout Deleted", description: "The checkout has been removed." });
                } catch {
                  setShowDeleteConfirm(false);
                  toast({ title: "Error", description: "Failed to delete checkout.", variant: "destructive" });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
