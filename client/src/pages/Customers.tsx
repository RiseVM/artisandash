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
import { Search, Plus, User, CreditCard, Eye, EyeOff, Lock, X, Loader2, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "@Artisan1200";

export function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [newCustomer, setNewCustomer] = useState({ 
    name: "", 
    email: "", 
    phone: "",
    address: "",
    notes: "",
    card_number: "",
    card_exp: "",
    card_cvc: "",
  });

  const [editCardInfo, setEditCardInfo] = useState({
    card_number: "",
    card_exp: "",
    card_cvc: "",
  });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const parseCardNumber = (cardNum: string) => {
    const cleaned = cardNum.replace(/\s/g, '');
    if (cleaned.length < 4) return { last4: '', brand: '' };
    const last4 = cleaned.slice(-4);
    let brand = 'Card';
    if (cleaned.startsWith('4')) brand = 'Visa';
    else if (cleaned.startsWith('5')) brand = 'Mastercard';
    else if (cleaned.startsWith('3')) brand = 'Amex';
    else if (cleaned.startsWith('6')) brand = 'Discover';
    return { last4, brand };
  };

  const parseExpiry = (exp: string) => {
    const parts = exp.split('/');
    if (parts.length !== 2) return { month: '', year: '' };
    return { month: parts[0].trim(), year: '20' + parts[1].trim() };
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) return;
    
    try {
      const { last4, brand } = parseCardNumber(newCustomer.card_number);
      const { month, year } = parseExpiry(newCustomer.card_exp);
      
      const cleanedCardNumber = newCustomer.card_number.replace(/\s/g, '');
      await createCustomerMutation.mutateAsync({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        notes: newCustomer.notes || null,
        card_last4: last4 || null,
        card_brand: brand || null,
        card_exp_month: month || null,
        card_exp_year: year || null,
        card_full_number: cleanedCardNumber || null,
        card_cvc: newCustomer.card_cvc || null,
      });
      setIsAddOpen(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "", notes: "", card_number: "", card_exp: "", card_cvc: "" });
      toast({ title: "Customer Added", description: `${newCustomer.name} added.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add customer. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      let updates: any = {
        name: editingCustomer.name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
        notes: editingCustomer.notes,
      };

      if (editCardInfo.card_number) {
        const { last4, brand } = parseCardNumber(editCardInfo.card_number);
        const { month, year } = parseExpiry(editCardInfo.card_exp);
        const cleanedCardNumber = editCardInfo.card_number.replace(/\s/g, '');
        updates = {
          ...updates,
          card_last4: last4,
          card_brand: brand,
          card_exp_month: month,
          card_exp_year: year,
          card_full_number: cleanedCardNumber,
          card_cvc: editCardInfo.card_cvc || null,
        };
      }
      
      await updateCustomerMutation.mutateAsync({
        id: editingCustomer.id,
        data: updates
      });
      setEditingCustomer(null);
      setEditCardInfo({ card_number: "", card_exp: "", card_cvc: "" });
      setShowCardForm(false);
      setIsAdminVerified(false);
      toast({ title: "Customer Updated", description: "Customer details updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update customer. Please try again.", variant: "destructive" });
    }
  };

  const handleVerifyAdmin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminVerified(true);
      setShowAdminPrompt(false);
      setAdminPasswordInput("");
      toast({ title: "Verified", description: "Admin access granted." });
    } else {
      toast({ title: "Access Denied", description: "Incorrect password.", variant: "destructive" });
    }
  };

  const handleCloseEditDialog = () => {
    setEditingCustomer(null);
    setShowCardForm(false);
    setIsAdminVerified(false);
    setEditCardInfo({ card_number: "", card_exp: "", card_cvc: "" });
  };

  const handleRemoveCard = async () => {
    if (!editingCustomer) return;
    try {
      await updateCustomerMutation.mutateAsync({
        id: editingCustomer.id,
        data: {
          card_last4: null,
          card_brand: null,
          card_exp_month: null,
          card_exp_year: null,
          card_full_number: null,
          card_cvc: null,
        }
      });
      setEditingCustomer({
        ...editingCustomer,
        card_last4: null,
        card_brand: null,
        card_exp_month: null,
        card_exp_year: null,
        card_full_number: null,
        card_cvc: null,
      });
      setIsAdminVerified(false);
      toast({ title: "Card Removed", description: "Payment method has been removed." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove card. Please try again.", variant: "destructive" });
    }
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
      toast({ title: "Failed to Delete Customer", description: `${errorMsg} Settle all Checkouts for Customer First.`, variant: "destructive" });
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

              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment Method (Optional)</span>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Card number" 
                      className="pl-9 font-mono"
                      maxLength={19}
                      value={newCustomer.card_number}
                      onChange={(e) => setNewCustomer({...newCustomer, card_number: formatCardNumber(e.target.value)})}
                      data-testid="input-new-customer-card"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      placeholder="MM / YY" 
                      className="font-mono text-center" 
                      maxLength={7}
                      value={newCustomer.card_exp}
                      onChange={(e) => setNewCustomer({...newCustomer, card_exp: e.target.value})}
                      data-testid="input-new-customer-exp"
                    />
                    <Input 
                      placeholder="CVC" 
                      className="font-mono text-center" 
                      maxLength={4}
                      type="password"
                      value={newCustomer.card_cvc}
                      onChange={(e) => setNewCustomer({...newCustomer, card_cvc: e.target.value})}
                      data-testid="input-new-customer-cvc"
                    />
                  </div>
                </div>
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
                  <TableHead>Payment</TableHead>
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
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{customer.card_brand}</span>
                          <span className="font-mono">••••{customer.card_last4}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No card</span>
                      )}
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

            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment Method</span>
                </div>
              </div>
              
              {editingCustomer?.card_last4 && !showCardForm ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{editingCustomer.card_brand}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          •••• •••• •••• {editingCustomer.card_last4}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {editingCustomer.card_exp_month}/{editingCustomer.card_exp_year?.slice(-2)}
                    </div>
                  </div>
                  
                  {!isAdminVerified && !showAdminPrompt && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowAdminPrompt(true)}
                      data-testid="button-view-card-details"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      View Full Details (Admin)
                    </Button>
                  )}

                  {showAdminPrompt && !isAdminVerified && (
                    <div className="space-y-2 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                        <Lock className="h-4 w-4" />
                        Enter Admin Password
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          type="password"
                          placeholder="Password"
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdmin()}
                          data-testid="input-admin-password"
                        />
                        <Button size="sm" onClick={handleVerifyAdmin} data-testid="button-verify-admin">
                          Verify
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAdminPrompt(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {isAdminVerified && (
                    <div className="space-y-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200">
                        <Eye className="h-4 w-4" />
                        Card Details (Admin View)
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Card Type:</span>
                          <span className="font-medium">{editingCustomer.card_brand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Card Number:</span>
                          <span className="font-mono font-medium">
                            {editingCustomer.card_full_number 
                              ? editingCustomer.card_full_number.replace(/(\d{4})/g, '$1 ').trim()
                              : `•••• •••• •••• ${editingCustomer.card_last4}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className="font-medium">{editingCustomer.card_exp_month}/{editingCustomer.card_exp_year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CVC:</span>
                          <span className="font-mono font-medium">
                            {editingCustomer.card_cvc || "Not saved"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setShowCardForm(true)}
                      data-testid="button-update-card"
                    >
                      Update Card
                    </Button>
                    {isAdminVerified && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={handleRemoveCard}
                        data-testid="button-remove-card"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Card
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!editingCustomer?.card_last4 && !showCardForm && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowCardForm(true)}
                      data-testid="button-add-card"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  )}
                  
                  {showCardForm && (
                    <div className="space-y-3">
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Card number" 
                          className="pl-9 font-mono"
                          maxLength={19}
                          value={editCardInfo.card_number}
                          onChange={(e) => setEditCardInfo({...editCardInfo, card_number: formatCardNumber(e.target.value)})}
                          data-testid="input-edit-card-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input 
                          placeholder="MM / YY" 
                          className="font-mono text-center" 
                          maxLength={7}
                          value={editCardInfo.card_exp}
                          onChange={(e) => setEditCardInfo({...editCardInfo, card_exp: e.target.value})}
                          data-testid="input-edit-card-exp"
                        />
                        <Input 
                          placeholder="CVC" 
                          className="font-mono text-center" 
                          maxLength={4}
                          type="password"
                          value={editCardInfo.card_cvc}
                          onChange={(e) => setEditCardInfo({...editCardInfo, card_cvc: e.target.value})}
                          data-testid="input-edit-card-cvc"
                        />
                      </div>
                      {editingCustomer?.card_last4 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowCardForm(false);
                            setEditCardInfo({ card_number: "", card_exp: "", card_cvc: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
