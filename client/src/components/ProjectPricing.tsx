import { useState } from "react";
import {
  useLineItems,
  useProjectTotal,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  usePayments,
  usePaymentSummary,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  DollarSign,
  Pencil,
  Trash2,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { ProjectLineItem, ProjectPayment, ProjectPhase, ChangeOrder } from "@shared/schema";

const lineItemCategories: Record<string, string> = {
  materials: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  permits: "Permits",
  other: "Other",
};

const paymentStatuses: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

interface ProjectPricingProps {
  projectId: number;
  phases: ProjectPhase[];
  changeOrders: ChangeOrder[];
  canManage: boolean;
}

export function ProjectPricing({ projectId, phases, changeOrders, canManage }: ProjectPricingProps) {
  const { toast } = useToast();

  // Line Items
  const { data: lineItems = [], isLoading: lineItemsLoading } = useLineItems(projectId);
  const { data: projectTotal } = useProjectTotal(projectId);
  const createLineItemMutation = useCreateLineItem();
  const updateLineItemMutation = useUpdateLineItem();
  const deleteLineItemMutation = useDeleteLineItem();

  // Payments
  const { data: payments = [], isLoading: paymentsLoading } = usePayments(projectId);
  const { data: paymentSummary } = usePaymentSummary(projectId);
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();

  // Line Item State
  const [isAddLineItemOpen, setIsAddLineItemOpen] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<ProjectLineItem | null>(null);
  const [deleteLineItem, setDeleteLineItem] = useState<ProjectLineItem | null>(null);
  const [lineItemForm, setLineItemForm] = useState({
    category: "materials",
    description: "",
    quantity: "1",
    unit: "",
    unit_price: "",
    linked_phase_id: "",
    linked_change_order_id: "",
    client_visible: "yes",
  });

  // Payment State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ProjectPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<ProjectPayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    description: "",
    amount: "",
    due_date: "",
    paid_date: "",
    status: "pending",
    payment_method: "",
    reference_number: "",
  });

  const resetLineItemForm = () => {
    setLineItemForm({
      category: "materials",
      description: "",
      quantity: "1",
      unit: "",
      unit_price: "",
      linked_phase_id: "",
      linked_change_order_id: "",
      client_visible: "yes",
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      description: "",
      amount: "",
      due_date: "",
      paid_date: "",
      status: "pending",
      payment_method: "",
      reference_number: "",
    });
  };

  // Line Item Handlers
  const handleCreateLineItem = async () => {
    if (!lineItemForm.description || !lineItemForm.unit_price) {
      toast({ title: "Description and unit price are required", variant: "destructive" });
      return;
    }
    try {
      const quantity = parseFloat(lineItemForm.quantity) || 1;
      const unitPrice = parseFloat(lineItemForm.unit_price) || 0;
      await createLineItemMutation.mutateAsync({
        projectId,
        data: {
          category: lineItemForm.category || null,
          description: lineItemForm.description,
          quantity: lineItemForm.quantity,
          unit: lineItemForm.unit || null,
          unit_price: lineItemForm.unit_price,
          total: (quantity * unitPrice).toFixed(2),
          linked_phase_id: lineItemForm.linked_phase_id ? parseInt(lineItemForm.linked_phase_id) : null,
          linked_change_order_id: lineItemForm.linked_change_order_id ? parseInt(lineItemForm.linked_change_order_id) : null,
          client_visible: lineItemForm.client_visible,
        },
      });
      resetLineItemForm();
      setIsAddLineItemOpen(false);
      toast({ title: "Line Item Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUpdateLineItem = async () => {
    if (!editingLineItem) return;
    try {
      const quantity = parseFloat(lineItemForm.quantity) || 1;
      const unitPrice = parseFloat(lineItemForm.unit_price) || 0;
      await updateLineItemMutation.mutateAsync({
        id: editingLineItem.id,
        projectId,
        data: {
          category: lineItemForm.category || null,
          description: lineItemForm.description,
          quantity: lineItemForm.quantity,
          unit: lineItemForm.unit || null,
          unit_price: lineItemForm.unit_price,
          total: (quantity * unitPrice).toFixed(2),
          linked_phase_id: lineItemForm.linked_phase_id ? parseInt(lineItemForm.linked_phase_id) : null,
          linked_change_order_id: lineItemForm.linked_change_order_id ? parseInt(lineItemForm.linked_change_order_id) : null,
          client_visible: lineItemForm.client_visible,
        },
      });
      setEditingLineItem(null);
      resetLineItemForm();
      toast({ title: "Line Item Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteLineItem = async () => {
    if (!deleteLineItem) return;
    try {
      await deleteLineItemMutation.mutateAsync({ id: deleteLineItem.id, projectId });
      setDeleteLineItem(null);
      toast({ title: "Line Item Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const openEditLineItem = (item: ProjectLineItem) => {
    setLineItemForm({
      category: item.category || "materials",
      description: item.description,
      quantity: item.quantity || "1",
      unit: item.unit || "",
      unit_price: item.unit_price || "",
      linked_phase_id: item.linked_phase_id?.toString() || "",
      linked_change_order_id: item.linked_change_order_id?.toString() || "",
      client_visible: item.client_visible || "yes",
    });
    setEditingLineItem(item);
  };

  // Payment Handlers
  const handleCreatePayment = async () => {
    if (!paymentForm.description || !paymentForm.amount) {
      toast({ title: "Description and amount are required", variant: "destructive" });
      return;
    }
    try {
      await createPaymentMutation.mutateAsync({
        projectId,
        data: {
          description: paymentForm.description,
          amount: paymentForm.amount,
          due_date: paymentForm.due_date || null,
          paid_date: paymentForm.paid_date || null,
          status: paymentForm.status,
          payment_method: paymentForm.payment_method || null,
          reference_number: paymentForm.reference_number || null,
        },
      });
      resetPaymentForm();
      setIsAddPaymentOpen(false);
      toast({ title: "Payment Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    try {
      await updatePaymentMutation.mutateAsync({
        id: editingPayment.id,
        projectId,
        data: {
          description: paymentForm.description,
          amount: paymentForm.amount,
          due_date: paymentForm.due_date || null,
          paid_date: paymentForm.paid_date || null,
          status: paymentForm.status,
          payment_method: paymentForm.payment_method || null,
          reference_number: paymentForm.reference_number || null,
        },
      });
      setEditingPayment(null);
      resetPaymentForm();
      toast({ title: "Payment Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePayment) return;
    try {
      await deletePaymentMutation.mutateAsync({ id: deletePayment.id, projectId });
      setDeletePayment(null);
      toast({ title: "Payment Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const openEditPayment = (payment: ProjectPayment) => {
    setPaymentForm({
      description: payment.description,
      amount: payment.amount,
      due_date: payment.due_date || "",
      paid_date: payment.paid_date || "",
      status: payment.status || "pending",
      payment_method: payment.payment_method || "",
      reference_number: payment.reference_number || "",
    });
    setEditingPayment(payment);
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing & Payments
          </CardTitle>
        </div>
        {(projectTotal || paymentSummary) && (
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            {projectTotal && (
              <span>
                Total: <strong>{formatCurrency(projectTotal.total)}</strong>
              </span>
            )}
            {paymentSummary && (
              <>
                <span>
                  Paid: <strong className="text-green-600">{formatCurrency(paymentSummary.total_paid)}</strong>
                </span>
                <span>
                  Balance: <strong className="text-blue-600">{formatCurrency(paymentSummary.balance)}</strong>
                </span>
              </>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="line-items">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="line-items" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Line Items
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Line Items Tab */}
          <TabsContent value="line-items">
            {canManage && (
              <Button size="sm" onClick={() => setIsAddLineItemOpen(true)} className="mb-4">
                <Plus className="h-4 w-4 mr-1" />
                Add Line Item
              </Button>
            )}
            {lineItemsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No line items added yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.description}</span>
                        {item.category && (
                          <Badge variant="secondary">
                            {lineItemCategories[item.category] || item.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          {item.quantity} {item.unit || "unit"} × {formatCurrency(item.unit_price)}
                        </span>
                        <span className="font-medium text-foreground">
                          = {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditLineItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteLineItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            {canManage && (
              <Button size="sm" onClick={() => setIsAddPaymentOpen(true)} className="mb-4">
                <Plus className="h-4 w-4 mr-1" />
                Add Payment
              </Button>
            )}
            {paymentsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No payments recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{payment.description}</span>
                        <Badge className={paymentStatuses[payment.status || "pending"].color}>
                          {getPaymentStatusIcon(payment.status || "pending")}
                          <span className="ml-1">{paymentStatuses[payment.status || "pending"].label}</span>
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatCurrency(payment.amount)}
                        </span>
                        {payment.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(payment.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {payment.paid_date && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Paid: {new Date(payment.paid_date).toLocaleDateString()}
                          </span>
                        )}
                        {payment.payment_method && (
                          <span>{payment.payment_method}</span>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditPayment(payment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletePayment(payment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Line Item Add/Edit Dialog */}
      <Dialog
        open={isAddLineItemOpen || !!editingLineItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddLineItemOpen(false);
            setEditingLineItem(null);
            resetLineItemForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLineItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={lineItemForm.description}
                onChange={(e) => setLineItemForm({ ...lineItemForm, description: e.target.value })}
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={lineItemForm.category}
                  onValueChange={(value) => setLineItemForm({ ...lineItemForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(lineItemCategories).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client Visible</Label>
                <Select
                  value={lineItemForm.client_visible}
                  onValueChange={(value) => setLineItemForm({ ...lineItemForm, client_visible: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineItemForm.quantity}
                  onChange={(e) => setLineItemForm({ ...lineItemForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={lineItemForm.unit}
                  onChange={(e) => setLineItemForm({ ...lineItemForm, unit: e.target.value })}
                  placeholder="sqft, hr, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={lineItemForm.unit_price}
                  onChange={(e) => setLineItemForm({ ...lineItemForm, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linked Phase</Label>
                <Select
                  value={lineItemForm.linked_phase_id}
                  onValueChange={(value) => setLineItemForm({ ...lineItemForm, linked_phase_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id.toString()}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Change Order</Label>
                <Select
                  value={lineItemForm.linked_change_order_id}
                  onValueChange={(value) => setLineItemForm({ ...lineItemForm, linked_change_order_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {changeOrders.map((co) => (
                      <SelectItem key={co.id} value={co.id.toString()}>
                        CO-{co.co_number}: {co.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddLineItemOpen(false);
                setEditingLineItem(null);
                resetLineItemForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingLineItem ? handleUpdateLineItem : handleCreateLineItem}
              disabled={createLineItemMutation.isPending || updateLineItemMutation.isPending}
            >
              {createLineItemMutation.isPending || updateLineItemMutation.isPending
                ? "Saving..."
                : editingLineItem
                ? "Update"
                : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Add/Edit Dialog */}
      <Dialog
        open={isAddPaymentOpen || !!editingPayment}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddPaymentOpen(false);
            setEditingPayment(null);
            resetPaymentForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Edit Payment" : "Add Payment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={paymentForm.description}
                onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                placeholder="Payment description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={paymentForm.due_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Paid Date</Label>
                <Input
                  type="date"
                  value={paymentForm.paid_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Input
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  placeholder="Check, Card, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="Check #, Trans ID"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddPaymentOpen(false);
                setEditingPayment(null);
                resetPaymentForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingPayment ? handleUpdatePayment : handleCreatePayment}
              disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            >
              {createPaymentMutation.isPending || updatePaymentMutation.isPending
                ? "Saving..."
                : editingPayment
                ? "Update"
                : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Line Item Delete Confirmation */}
      <AlertDialog open={!!deleteLineItem} onOpenChange={(open) => !open && setDeleteLineItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteLineItem?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLineItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Delete Confirmation */}
      <AlertDialog open={!!deletePayment} onOpenChange={(open) => !open && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {formatCurrency(deletePayment?.amount)} payment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
