import { useState } from "react";
import { Link } from "wouter";
import { useCheckouts, useCustomers, useInventory, useUpdateCheckout, useDeleteCheckout } from "@/hooks/use-api";
import type { CheckoutView, Customer, Inventory } from "@shared/schema";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Bell, 
  Plus, 
  CheckCircle2, 
  Edit2,
  Calendar,
  Filter,
  Check,
  ChevronsUpDown,
  Loader2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EditCheckoutState {
  id: number;
  customer_id: number;
  inventory_item_id: number;
  checkout_date: string;
  due_date: string;
  status: 'checked_out' | 'overdue' | 'returned';
  notes: string;
  auth_notes: string;
}

export function Dashboard() {
  const { data: checkouts = [], isLoading: checkoutsLoading } = useCheckouts();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const updateCheckoutMutation = useUpdateCheckout();
  const deleteCheckoutMutation = useDeleteCheckout();
  
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'due_desc' | 'name_asc'>('due_asc');
  const [editingCheckout, setEditingCheckout] = useState<EditCheckoutState | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkReturning, setIsBulkReturning] = useState(false);
  const { toast } = useToast();

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (checkouts: CheckoutView[]) => {
    const allIds = checkouts.map(c => c.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkReturn = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkReturning(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await updateCheckoutMutation.mutateAsync({
          id,
          data: { status: 'returned' }
        });
      }
      toast({
        title: "Samples Returned",
        description: `${ids.length} sample${ids.length > 1 ? 's' : ''} marked as returned.`,
      });
      setSelectedIds(new Set());
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark samples as returned. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBulkReturning(false);
    }
  };

  const handleRunReminders = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const overdueCheckouts = checkouts.filter(
        c => c.status !== 'returned' && c.due_date < today && c.status !== 'overdue'
      );
      
      for (const checkout of overdueCheckouts) {
        await updateCheckoutMutation.mutateAsync({
          id: checkout.id,
          data: { status: 'overdue' }
        });
      }
      
      toast({
        title: "Reminders Checked",
        description: `${overdueCheckouts.length} samples marked as overdue.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to check reminders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: number, newStatus: 'checked_out' | 'overdue' | 'returned') => {
    try {
      await updateCheckoutMutation.mutateAsync({
        id,
        data: { status: newStatus }
      });
      toast({
        title: "Status Updated",
        description: `Checkout #${id} marked as ${newStatus.replace('_', ' ')}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (sample: CheckoutView) => {
    setEditingCheckout({
      id: sample.id,
      customer_id: sample.customer_id,
      inventory_item_id: sample.inventory_item_id,
      checkout_date: sample.checkout_date,
      due_date: sample.due_date,
      status: sample.status as 'checked_out' | 'overdue' | 'returned',
      notes: sample.notes || "",
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
        }
      });
      setEditingCheckout(null);
      toast({ title: "Checkout Updated", description: "All changes saved successfully." });
    } catch (err) {
      toast({ title: "Update Failed", description: "Failed to save changes. Please try again.", variant: "destructive" });
    }
  };

  const filterAndSort = (items: CheckoutView[]) => {
    let filtered = items.filter((s) => 
      s.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      s.item.name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.email.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortOrder === 'due_asc') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (sortOrder === 'due_desc') return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      if (sortOrder === 'name_asc') return a.customer.name.localeCompare(b.customer.name);
      return 0;
    });
  };

  const activeCheckouts = filterAndSort(checkouts.filter(c => c.status !== 'returned'));
  const returnedCheckouts = filterAndSort(checkouts.filter(c => c.status === 'returned'));

  const selectedCustomer = editingCheckout ? customers.find(c => c.id === editingCheckout.customer_id) : null;
  const selectedItem = editingCheckout ? inventory.find(i => i.id === editingCheckout.inventory_item_id) : null;

  if (checkoutsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CheckoutTable = ({ data, showCheckboxes = false }: { data: CheckoutView[], showCheckboxes?: boolean }) => {
    const allSelected = data.length > 0 && data.every(c => selectedIds.has(c.id));
    const someSelected = data.some(c => selectedIds.has(c.id));
    
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckboxes && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleSelectAll(data)}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
              )}
              <TableHead>Customer</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckboxes ? 7 : 6} className="h-24 text-center">
                  No samples found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((sample) => (
                <TableRow 
                  key={sample.id} 
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => openEditDialog(sample)}
                  data-testid={`row-checkout-${sample.id}`}
                >
                  {showCheckboxes && (
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(sample.id)}
                          onCheckedChange={() => toggleSelection(sample.id)}
                          data-testid={`checkbox-checkout-${sample.id}`}
                        />
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{sample.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{sample.customer.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sample.item.name}</div>
                    <div className="text-xs text-muted-foreground">{sample.item.sku}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between w-32">
                        <span className="text-muted-foreground">Out:</span> 
                        <span>{format(new Date(sample.checkout_date), 'MMM d')}</span>
                      </div>
                      <div className="flex justify-between w-32 font-medium">
                        <span className="text-muted-foreground">Due:</span> 
                        <span className={sample.status === 'overdue' ? "text-red-600" : ""}>
                          {format(new Date(sample.due_date), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                     <Select 
                        defaultValue={sample.status} 
                        onValueChange={(val: any) => handleStatusChange(sample.id, val)}
                      >
                        <SelectTrigger className="w-[130px] h-8 border-none bg-transparent p-0">
                          <div className="flex items-center">
                            <StatusBadge status={sample.status as 'checked_out' | 'overdue' | 'returned'} />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checked_out">Checked Out</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="returned">Returned</SelectItem>
                        </SelectContent>
                      </Select>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sample.createdByUser ? (
                        <>
                          <div className="font-medium">
                            {sample.createdByUser.firstName || sample.createdByUser.email?.split('@')[0] || '—'}
                          </div>
                          {sample.createdByUser.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={sample.createdByUser.email}>
                              {sample.createdByUser.email}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-xs text-muted-foreground" title={sample.notes || ""}>
                      {sample.notes || "—"}
                    </p>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRunReminders} disabled={updateCheckoutMutation.isPending}>
            <Bell className="mr-2 h-4 w-4" />
            Run Checks
          </Button>
          <Link href="/new">
            <Button data-testid="button-new-checkout">
              <Plus className="mr-2 h-4 w-4" />
              New Checkout
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search checkouts..." 
              className="pl-8 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-checkouts"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort-order">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_asc">Due Date (Earliest)</SelectItem>
                <SelectItem value="due_desc">Due Date (Latest)</SelectItem>
                <SelectItem value="name_asc">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active" data-testid="tab-active">Active ({activeCheckouts.length})</TabsTrigger>
          <TabsTrigger value="returned" data-testid="tab-returned">Returned History ({returnedCheckouts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardContent className="pt-6">
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">
                    {selectedIds.size} sample{selectedIds.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    onClick={handleBulkReturn}
                    disabled={isBulkReturning}
                    data-testid="button-bulk-return"
                  >
                    {isBulkReturning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Selected as Returned
                      </>
                    )}
                  </Button>
                </div>
              )}
              <CheckoutTable data={activeCheckouts} showCheckboxes={true} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="returned">
          <Card>
            <CardContent className="pt-6">
              <CheckoutTable data={returnedCheckouts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingCheckout} onOpenChange={(open) => !open && setEditingCheckout(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Checkout</DialogTitle>
          </DialogHeader>
          {editingCheckout && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      data-testid="select-edit-customer"
                    >
                      {selectedCustomer?.name || "Select customer"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              value={customer.name}
                              key={customer.id}
                              onSelect={() => {
                                setEditingCheckout({...editingCheckout, customer_id: customer.id});
                                setCustomerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customer.id === editingCheckout.customer_id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div>{customer.name}</div>
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
              
              <div className="space-y-2">
                <Label>Sample Item</Label>
                <Popover open={itemOpen} onOpenChange={setItemOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      data-testid="select-edit-item"
                    >
                      {selectedItem?.name || "Select sample"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search inventory..." />
                      <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                          {inventory.map((item) => (
                            <CommandItem
                              value={item.name}
                              key={item.id}
                              onSelect={() => {
                                setEditingCheckout({...editingCheckout, inventory_item_id: item.id});
                                setItemOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  item.id === editingCheckout.inventory_item_id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div>{item.name}</div>
                                <div className="text-xs text-muted-foreground">{item.sku || "No SKU"}</div>
                              </div>
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
                  <Label htmlFor="checkout-date">Checkout Date</Label>
                  <Input 
                    id="checkout-date"
                    type="date" 
                    value={editingCheckout.checkout_date} 
                    onChange={(e) => setEditingCheckout({...editingCheckout, checkout_date: e.target.value})}
                    data-testid="input-edit-checkout-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input 
                    id="due-date"
                    type="date" 
                    value={editingCheckout.due_date} 
                    onChange={(e) => setEditingCheckout({...editingCheckout, due_date: e.target.value})}
                    data-testid="input-edit-due-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editingCheckout.status} 
                  onValueChange={(val: any) => setEditingCheckout({...editingCheckout, status: val})}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes"
                  value={editingCheckout.notes} 
                  onChange={(e) => setEditingCheckout({...editingCheckout, notes: e.target.value})}
                  placeholder="Add notes..."
                  className="resize-none"
                  rows={3}
                  data-testid="textarea-edit-notes"
                />
              </div>

              {editingCheckout.auth_notes && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Payment Info</Label>
                  <div className="text-xs bg-muted p-2 rounded">{editingCheckout.auth_notes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!editingCheckout) return;
                if (!confirm("Are you sure you want to cancel/delete this checkout?")) return;
                try {
                  await deleteCheckoutMutation.mutateAsync(editingCheckout.id);
                  setEditingCheckout(null);
                  toast({ title: "Checkout Cancelled", description: "The checkout has been deleted." });
                } catch (err) {
                  toast({ title: "Error", description: "Failed to delete checkout.", variant: "destructive" });
                }
              }} 
              disabled={deleteCheckoutMutation.isPending}
              data-testid="button-delete-checkout"
            >
              {deleteCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Cancel Checkout
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingCheckout(null)}>Close</Button>
              <Button onClick={handleUpdateCheckout} disabled={updateCheckoutMutation.isPending} data-testid="button-save-checkout">
                {updateCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
