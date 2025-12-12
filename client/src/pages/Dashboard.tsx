import { useState } from "react";
import { Link } from "wouter";
import { useStore, CheckoutView, Checkout } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Search, 
  Bell, 
  Plus, 
  CheckCircle2, 
  Edit2,
  Calendar,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const { checkouts, customers, inventory, getCheckoutView, updateCheckout, checkOverdue } = useStore();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'due_desc' | 'name_asc'>('due_asc');
  const [editingCheckout, setEditingCheckout] = useState<CheckoutView | null>(null);
  const { toast } = useToast();

  const handleRunReminders = () => {
    checkOverdue();
    toast({
      title: "Reminders Checked",
      description: "Overdue status updated for all samples.",
    });
  };

  const handleStatusChange = (id: number, newStatus: 'checked_out' | 'overdue' | 'returned') => {
    updateCheckout(id, { status: newStatus });
    toast({
      title: "Status Updated",
      description: `Checkout #${id} marked as ${newStatus.replace('_', ' ')}.`,
    });
  };

  const handleUpdateCheckout = () => {
    if (!editingCheckout) return;
    updateCheckout(editingCheckout.id, {
      due_date: editingCheckout.due_date,
      status: editingCheckout.status,
      notes: editingCheckout.notes,
    });
    setEditingCheckout(null);
    toast({ title: "Checkout Updated", description: "Changes saved successfully." });
  };

  // Convert checkouts to views (with customer/item data)
  const checkoutViews = checkouts.map(getCheckoutView);

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

  const activeCheckouts = filterAndSort(checkoutViews.filter(c => c.status !== 'returned'));
  const returnedCheckouts = filterAndSort(checkoutViews.filter(c => c.status === 'returned'));

  const CheckoutTable = ({ data, showActions = true }: { data: CheckoutView[], showActions?: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Sample</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No samples found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((sample) => (
              <TableRow 
                key={sample.id} 
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => setEditingCheckout(sample)}
                data-testid={`row-checkout-${sample.id}`}
              >
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
                          <StatusBadge status={sample.status} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checked_out">Checked Out</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-xs text-muted-foreground" title={sample.notes}>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of checkouts and returns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRunReminders}>
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
              <CheckoutTable data={activeCheckouts} />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Checkout</DialogTitle>
          </DialogHeader>
          {editingCheckout && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Customer</Label>
                <div className="font-medium">{editingCheckout.customer.name}</div>
                <div className="text-xs text-muted-foreground">{editingCheckout.customer.email}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Sample</Label>
                <div className="font-medium">{editingCheckout.item.name}</div>
                <div className="text-xs text-muted-foreground">{editingCheckout.item.sku}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-date">Checkout Date</Label>
                  <Input 
                    id="checkout-date"
                    type="date" 
                    value={editingCheckout.checkout_date} 
                    disabled
                    className="bg-muted"
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
                  value={editingCheckout.notes || ""} 
                  onChange={(e) => setEditingCheckout({...editingCheckout, notes: e.target.value})}
                  placeholder="Add notes..."
                  className="resize-none"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCheckout(null)}>Cancel</Button>
            <Button onClick={handleUpdateCheckout} data-testid="button-save-checkout">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
