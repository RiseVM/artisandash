import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useCheckouts, useUpdateCheckout, useDeleteCheckout, useSendReminder } from "./hooks";
import { useCustomers } from "../customers/hooks";
import { useInventory } from "../inventory/hooks";
import { StatusBadge } from "./StatusBadge";
import type { CheckoutView } from "@shared/schema";
import { startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Search, CheckCircle2, Calendar, Filter, Check, ChevronsUpDown,
  Loader2, Trash2, Mail, ClipboardList, AlertTriangle, Package, RotateCcw,
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
  const { data: checkouts = [], isLoading: checkoutsLoading } = useCheckouts();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
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

  const recentActivity = useMemo(() => {
    const activities: { id: string; type: string; description: string; date: Date; icon: any; color: string }[] = [];
    checkouts.slice(0, 20).forEach((c) => {
      if (c.status === "returned") {
        activities.push({
          id: `return-${c.id}`, type: "return",
          description: `${c.customer.name} returned ${c.item.name}`,
          date: new Date(c.due_date), icon: RotateCcw, color: "text-green-600",
        });
      } else {
        activities.push({
          id: `checkout-${c.id}`, type: "checkout",
          description: `${c.customer.name} checked out ${c.item.name}`,
          date: new Date(c.checkout_date), icon: Package, color: "text-blue-600",
        });
      }
    });
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
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

  const CheckoutTable = ({ data, showCheckboxes = false }: { data: CheckoutView[]; showCheckboxes?: boolean }) => {
    const allSelected = data.length > 0 && data.every((c) => selectedIds.has(c.id));
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && (
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={() => toggleSelectAll(data)} />
                </TableHead>
              )}
              <TableHead>Customer</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Due & Remind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckboxes ? 7 : 6} className="h-24 text-center">No samples found.</TableCell>
              </TableRow>
            ) : (
              data.map((sample) => (
                <TableRow key={sample.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(sample)}>
                  {showCheckboxes && (
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(sample.id)} onCheckedChange={() => toggleSelection(sample.id)} />
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{sample.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{sample.customer.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sample.item.name}</div>
                    <div className="text-xs text-muted-foreground">{[sample.item.color, sample.item.vendor].filter(Boolean).join(" • ")}</div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">
                        <span className="text-muted-foreground">Due: </span>
                        <span className={sample.status === "overdue" ? "text-red-600" : ""}>{formatShortDateEST(sample.due_date)}</span>
                      </div>
                      {sample.last_reminder_sent && (
                        <div className="text-muted-foreground text-[10px]">Reminded: {formatReminderDateEST(sample.last_reminder_sent)}</div>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs mt-1" onClick={() => handleSendReminder(sample.id, sample.customer.email)} disabled={sendingReminderId === sample.id}>
                        {sendingReminderId === sample.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Mail className="h-3 w-3 mr-1" />Remind</>}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select defaultValue={sample.status} onValueChange={(val: any) => handleStatusChange(sample.id, val)}>
                      <SelectTrigger className="w-[130px] h-8 border-none bg-transparent p-0">
                        <div className="flex items-center"><StatusBadge status={sample.status as any} /></div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checked_out">Checked Out</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-xs text-muted-foreground" title={sample.notes || ""}>{sample.notes || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sample.createdByUser ? (
                        <>
                          <div className="font-medium">{sample.createdByUser.firstName || sample.createdByUser.email?.split("@")[0] || "—"}</div>
                          {sample.createdByUser.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={sample.createdByUser.email}>{sample.createdByUser.email}</div>
                          )}
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of checkouts and returns.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Checkouts</p>
                <p className="text-3xl font-bold text-primary">{stats.activeCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Items</p>
                <p className={`text-3xl font-bold ${stats.overdueCount > 0 ? "text-red-600" : "text-primary"}`}>{stats.overdueCount}</p>
              </div>
              <div className={`h-12 w-12 rounded-full ${stats.overdueCount > 0 ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center`}>
                <AlertTriangle className={`h-6 w-6 ${stats.overdueCount > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-4 w-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0"><p className="truncate">{activity.description}</p></div>
                    <div className="text-xs text-muted-foreground flex-shrink-0">{formatShortDateEST(format(activity.date, "yyyy-MM-dd"))}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search checkouts..." className="pl-8 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due_asc">Due Date (Earliest)</SelectItem>
              <SelectItem value="due_desc">Due Date (Latest)</SelectItem>
              <SelectItem value="name_asc">Customer Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="active">Active ({activeCheckouts.length})</TabsTrigger>
          <TabsTrigger value="returned">Returned ({returnedCheckouts.length})</TabsTrigger>
          <TabsTrigger value="all">All ({checkouts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Card>
            <CardContent className="pt-6">
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">{selectedIds.size} sample{selectedIds.size > 1 ? "s" : ""} selected</span>
                  <Button onClick={handleBulkReturn} disabled={isBulkReturning}>
                    {isBulkReturning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Mark Selected as Returned</>}
                  </Button>
                </div>
              )}
              <CheckoutTable data={activeCheckouts} showCheckboxes={true} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="returned">
          <Card><CardContent className="pt-6"><CheckoutTable data={returnedCheckouts} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="all">
          <Card><CardContent className="pt-6"><CheckoutTable data={filterAndSort(checkouts)} showCheckboxes={true} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingCheckout} onOpenChange={(open) => !open && setEditingCheckout(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Checkout</DialogTitle></DialogHeader>
          {editingCheckout && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedCustomer?.name || "Select customer"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem key={customer.id} value={customer.name} onSelect={() => { setEditingCheckout({ ...editingCheckout, customer_id: customer.id }); setCustomerOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", customer.id === editingCheckout.customer_id ? "opacity-100" : "opacity-0")} />
                              <div><div>{customer.name}</div><div className="text-xs text-muted-foreground">{customer.email}</div></div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Sample Item</Label>
                <Popover open={itemOpen} onOpenChange={setItemOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedItem?.name || "Select sample"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search inventory..." />
                      <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                          {inventory.map((item) => (
                            <CommandItem key={item.id} value={item.name} onSelect={() => { setEditingCheckout({ ...editingCheckout, inventory_item_id: item.id }); setItemOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", item.id === editingCheckout.inventory_item_id ? "opacity-100" : "opacity-0")} />
                              <div><div>{item.name}</div><div className="text-xs text-muted-foreground">{[item.color, item.vendor].filter(Boolean).join(" • ")}</div></div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Checkout Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input type="date" className="pl-10" value={editingCheckout.checkout_date} onChange={(e) => setEditingCheckout({ ...editingCheckout, checkout_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input type="date" className="pl-10" value={editingCheckout.due_date} onChange={(e) => setEditingCheckout({ ...editingCheckout, due_date: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingCheckout.status} onValueChange={(val: any) => setEditingCheckout({ ...editingCheckout, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editingCheckout.notes} onChange={(e) => setEditingCheckout({ ...editingCheckout, notes: e.target.value })} placeholder="Add notes..." className="resize-none" rows={3} />
              </div>

              {editingCheckout.auth_notes && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Payment Info</Label>
                  <div className="text-xs bg-muted p-2 rounded">{editingCheckout.auth_notes}</div>
                </div>
              )}

              <div className="pt-2 border-t">
                <Button variant="secondary" className="w-full" onClick={() => {
                  const customer = customers.find((c) => c.id === editingCheckout.customer_id);
                  if (customer) handleSendReminder(editingCheckout.id, customer.email);
                }} disabled={sendingReminderId === editingCheckout.id}>
                  {sendingReminderId === editingCheckout.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Reminder Email
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={deleteCheckoutMutation.isPending}>
              {deleteCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Cancel Checkout
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingCheckout(null)}>Close</Button>
              <Button onClick={handleUpdateCheckout} disabled={updateCheckoutMutation.isPending}>
                {updateCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Checkout</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel/delete this checkout? This action cannot be undone.</AlertDialogDescription>
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
                  toast({ title: "Checkout Cancelled", description: "The checkout has been deleted." });
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
