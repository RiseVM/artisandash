import { useState } from "react";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-api";
import type { Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, User, Loader2, Trash2, Download, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function Customers() {
  const { user } = useAuth();
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) return;

    try {
      await createCustomerMutation.mutateAsync({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        notes: newCustomer.notes || null,
      });
      setIsAddOpen(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "", notes: "" });
      toast({ title: "Customer Added", description: `${newCustomer.name} added.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add customer. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;

    try {
      await updateCustomerMutation.mutateAsync({
        id: editingCustomer.id,
        data: {
          name: editingCustomer.name,
          email: editingCustomer.email,
          phone: editingCustomer.phone,
          address: editingCustomer.address,
          notes: editingCustomer.notes,
        }
      });
      setEditingCustomer(null);
      toast({ title: "Customer Updated", description: "Customer details updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update customer. Please try again.", variant: "destructive" });
    }
  };

  const handleCloseEditDialog = () => {
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async () => {
    if (!editingCustomer) return;
    try {
      await deleteCustomerMutation.mutateAsync(editingCustomer.id);
      setShowDeleteConfirm(false);
      handleCloseEditDialog();
      toast({ title: "Customer Deleted", description: `${editingCustomer.name} has been deleted.` });
    } catch (err: any) {
      setShowDeleteConfirm(false);
      const errorMsg = err?.message || "Failed to delete customer.";
      toast({ title: "Failed to Delete Customer", description: errorMsg, variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Notes"];
    const rows = customers.map(c => [
      c.name,
      c.email,
      c.phone || "",
      c.notes || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Export Complete", description: `${customers.length} customers exported to CSV.` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Customers</h1>
          <p className="text-muted-foreground">Manage your client list.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-customers">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.name} 
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  data-testid="input-new-customer-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.email} 
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  data-testid="input-new-customer-email"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Phone</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.phone} 
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  data-testid="input-new-customer-phone"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Address</Label>
                <Input 
                  className="col-span-3" 
                  placeholder="Street, City, State ZIP"
                  value={newCustomer.address} 
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  data-testid="input-new-customer-address"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Notes</Label>
                <Input 
                  className="col-span-3" 
                  placeholder="Optional notes about this customer"
                  value={newCustomer.notes} 
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  data-testid="input-new-customer-notes"
                />
              </div>

            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer} disabled={createCustomerMutation.isPending} data-testid="button-save-new-customer">
                {createCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Customer
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Clients ({filteredCustomers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Card on File</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setEditingCustomer({...customer})}
                    data-testid={`row-customer-${customer.id}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>
                      {customer.card_last4 ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{customer.card_brand || "Card"} •••• {customer.card_last4}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{customer.notes || "—"}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && handleCloseEditDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.name || ""} 
                onChange={(e) => setEditingCustomer(editingCustomer ? {...editingCustomer, name: e.target.value} : null)}
                data-testid="input-edit-customer-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Email</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.email || ""} 
                onChange={(e) => setEditingCustomer(editingCustomer ? {...editingCustomer, email: e.target.value} : null)}
                data-testid="input-edit-customer-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Phone</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.phone || ""} 
                onChange={(e) => setEditingCustomer(editingCustomer ? {...editingCustomer, phone: e.target.value} : null)}
                data-testid="input-edit-customer-phone"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Address</Label>
              <Input 
                className="col-span-3" 
                placeholder="Street, City, State ZIP"
                value={editingCustomer?.address || ""} 
                onChange={(e) => setEditingCustomer(editingCustomer ? {...editingCustomer, address: e.target.value} : null)}
                data-testid="input-edit-customer-address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Notes</Label>
              <Input 
                className="col-span-3" 
                placeholder="Optional notes about this customer"
                value={editingCustomer?.notes || ""} 
                onChange={(e) => setEditingCustomer(editingCustomer ? {...editingCustomer, notes: e.target.value} : null)}
                data-testid="input-edit-customer-notes"
              />
            </div>

          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)} 
              disabled={deleteCustomerMutation.isPending}
              data-testid="button-delete-customer"
            >
              {deleteCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseEditDialog}>Cancel</Button>
              <Button onClick={handleUpdateCustomer} disabled={updateCustomerMutation.isPending} data-testid="button-save-customer">
                {updateCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete {editingCustomer?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
