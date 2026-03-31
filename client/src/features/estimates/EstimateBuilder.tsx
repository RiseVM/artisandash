import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useEstimate,
  useUpdateEstimate,
  useCreateEstimateLineItem,
  useUpdateEstimateLineItem,
  useDeleteEstimateLineItem,
} from "./hooks";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Printer,
  Pencil,
  Save,
  X,
  User,
  Calendar,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/api";
import type { EstimateLineItem, Customer } from "@shared/schema";
import { NotesPanel } from "@/components/shared/NotesPanel";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  converted: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

const fmt = (v: string | number) =>
  "$" + parseFloat(String(v)).toLocaleString("en-US", { minimumFractionDigits: 2 });

export function EstimateBuilder() {
  const [, params] = useRoute("/estimates/:id");
  const [, setLocation] = useLocation();
  const estimateId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();

  const { data: estimate, isLoading } = useEstimate(estimateId);
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiQuery<Customer[]>("/api/customers"),
  });
  const updateEstimateMutation = useUpdateEstimate();
  const createLineItemMutation = useCreateEstimateLineItem();
  const updateLineItemMutation = useUpdateEstimateLineItem();
  const deleteLineItemMutation = useDeleteEstimateLineItem();

  const [isEditing, setIsEditing] = useState(false);
  const [isAddLineOpen, setIsAddLineOpen] = useState(false);

  // Edit form state (for estimate-level fields)
  const [editForm, setEditForm] = useState({
    customer_id: 0,
    title: "",
    description: "",
    status: "draft",
    notes: "",
    internal_notes: "",
    tax_rate: "0",
    issue_date: "",
    expiry_date: "",
    valid_until: "",
  });

  // Inline line item editing
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineEditValues, setLineEditValues] = useState<Record<string, string>>({});

  // New line item form
  const [lineForm, setLineForm] = useState({
    section: "",
    category: "",
    description: "",
    quantity: "1",
    unit: "each",
    unit_price: "0",
  });

  // Populate edit form when toggling into edit mode
  useEffect(() => {
    if (estimate && isEditing) {
      setEditForm({
        customer_id: estimate.customer_id || 0,
        title: estimate.title,
        description: estimate.description || "",
        status: estimate.status,
        notes: estimate.notes || "",
        internal_notes: estimate.internal_notes || "",
        tax_rate: (parseFloat(estimate.tax_rate) * 100).toString(),
        issue_date: estimate.issue_date || "",
        expiry_date: estimate.expiry_date || "",
        valid_until: (estimate as any).valid_until || "",
      });
    }
  }, [estimate, isEditing]);

  const resetLineForm = () => {
    setLineForm({ section: "", category: "", description: "", quantity: "1", unit: "each", unit_price: "0" });
  };

  // ── Save estimate-level edits ──────────────────
  const handleSaveEstimate = async () => {
    try {
      await updateEstimateMutation.mutateAsync({
        id: estimateId,
        data: {
          customer_id: editForm.customer_id || null,
          title: editForm.title,
          description: editForm.description || null,
          status: editForm.status,
          notes: editForm.notes || null,
          internal_notes: editForm.internal_notes || null,
          tax_rate: (parseFloat(editForm.tax_rate || "0") / 100).toFixed(4),
          issue_date: editForm.issue_date || null,
          expiry_date: editForm.expiry_date || null,
          valid_until: editForm.valid_until || null,
        } as any,
      });
      setIsEditing(false);
      toast({ title: "Estimate Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  // ── Inline line item save ──────────────────────
  const handleSaveLineItem = async (item: EstimateLineItem) => {
    const qty = parseFloat(lineEditValues.quantity || String(item.quantity)) || 1;
    const price = parseFloat(lineEditValues.unit_price || String(item.unit_price)) || 0;
    const total = qty * price;

    try {
      await updateLineItemMutation.mutateAsync({
        id: item.id,
        estimateId,
        data: {
          description: lineEditValues.description ?? item.description,
          category: lineEditValues.category ?? item.category,
          quantity: qty.toString(),
          unit: lineEditValues.unit ?? item.unit,
          unit_price: price.toFixed(2),
          total: total.toFixed(2),
        },
      });
      setEditingLineId(null);
      setLineEditValues({});
      toast({ title: "Line Item Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const startEditingLine = (item: EstimateLineItem) => {
    setEditingLineId(item.id);
    setLineEditValues({
      description: item.description,
      category: item.category || "",
      quantity: item.quantity,
      unit: item.unit || "each",
      unit_price: item.unit_price,
    });
  };

  // ── Add new line item ──────────────────────────
  const handleAddLineItem = async () => {
    if (!lineForm.description.trim()) return;
    const qty = parseFloat(lineForm.quantity) || 1;
    const price = parseFloat(lineForm.unit_price) || 0;
    const total = qty * price;

    try {
      await createLineItemMutation.mutateAsync({
        estimateId,
        data: {
          description: lineForm.description,
          section: lineForm.section || null,
          category: lineForm.category || null,
          quantity: qty.toString(),
          unit: lineForm.unit || null,
          unit_price: price.toFixed(2),
          total: total.toFixed(2),
          display_order: estimate?.lineItems?.length || 0,
        },
      });
      setIsAddLineOpen(false);
      resetLineForm();
      toast({ title: "Line Item Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteLineItem = async (item: EstimateLineItem) => {
    try {
      await deleteLineItemMutation.mutateAsync({ id: item.id, estimateId });
      toast({ title: "Line Item Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Estimate not found.</p>
        <Button variant="link" onClick={() => setLocation("/estimates")}>
          Back to Estimates
        </Button>
      </div>
    );
  }

  // Group line items by section
  const sections = new Map<string, EstimateLineItem[]>();
  for (const item of estimate.lineItems) {
    const key = item.section || "General";
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/estimates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">{estimate.estimate_number}</span>
              <Badge className={statusColors[estimate.status]}>{statusLabels[estimate.status]}</Badge>
            </div>
            {isEditing ? (
              <Input
                className="text-xl font-bold mt-1"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold truncate">{estimate.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {estimate.customer?.name || "No Customer"}
              </span>
              {estimate.issue_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Issued: {estimate.issue_date}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit Mode: Estimate Details Panel ── */}
      {isEditing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estimate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={editForm.customer_id ? String(editForm.customer_id) : ""}
                  onValueChange={(v) => setEditForm({ ...editForm, customer_id: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input type="date" value={editForm.issue_date} onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" value={editForm.valid_until} onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                className="w-32"
                value={editForm.tax_rate}
                onChange={(e) => setEditForm({ ...editForm, tax_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (visible on estimate)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                Internal Notes
                <Badge className="text-xs bg-orange-100 text-orange-700">Internal Only</Badge>
              </Label>
              <Textarea
                value={editForm.internal_notes}
                onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                rows={2}
                placeholder="Markup calculations, cost notes — never shown to client"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Description (view mode) ── */}
      {!isEditing && estimate.description && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            {estimate.description}
          </CardContent>
        </Card>
      )}

      {/* ── Line Items ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={() => { resetLineForm(); setIsAddLineOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimate.lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items yet. Add items to build your estimate.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase px-2">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              {/* Grouped by section */}
              {Array.from(sections.entries()).map(([section, items]) => (
                <div key={section}>
                  {sections.size > 1 && (
                    <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-2 px-2">
                      {section}
                    </div>
                  )}
                  {items.map((item) => (
                    editingLineId === item.id ? (
                      /* ── Inline edit row ── */
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-2 bg-blue-50/50 rounded border border-blue-200">
                        <div className="col-span-12 sm:col-span-5">
                          <Input
                            className="h-8 text-sm"
                            value={lineEditValues.description || ""}
                            onChange={(e) => setLineEditValues({ ...lineEditValues, description: e.target.value })}
                            placeholder="Description"
                          />
                          <Input
                            className="h-7 text-xs mt-1"
                            value={lineEditValues.category || ""}
                            onChange={(e) => setLineEditValues({ ...lineEditValues, category: e.target.value })}
                            placeholder="Category"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm text-right"
                            value={lineEditValues.quantity || ""}
                            onChange={(e) => setLineEditValues({ ...lineEditValues, quantity: e.target.value })}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm text-right"
                            value={lineEditValues.unit_price || ""}
                            onChange={(e) => setLineEditValues({ ...lineEditValues, unit_price: e.target.value })}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-right text-sm font-medium pt-1">
                          {fmt(
                            (parseFloat(lineEditValues.quantity || "0") || 0) *
                            (parseFloat(lineEditValues.unit_price || "0") || 0)
                          )}
                        </div>
                        <div className="col-span-1 flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            onClick={() => handleSaveLineItem(item)}
                            disabled={updateLineItemMutation.isPending}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingLineId(null); setLineEditValues({}); }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── View row ── */
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 items-center py-2 px-2 hover:bg-muted/50 rounded group cursor-pointer"
                        onClick={() => isEditing && startEditingLine(item)}
                      >
                        <div className="col-span-12 sm:col-span-5">
                          <div className="font-medium text-sm">{item.description}</div>
                          {item.category && (
                            <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                          )}
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-right text-sm">
                          {item.quantity} {item.unit || ""}
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-right text-sm">
                          ${parseFloat(item.unit_price).toFixed(2)}
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-right text-sm font-medium">
                          ${parseFloat(item.total).toFixed(2)}
                        </div>
                        <div className="col-span-1 flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); startEditingLine(item); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteLineItem(item); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ))}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 px-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(estimate.subtotal)}</span>
                </div>
                {parseFloat(estimate.tax_rate) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(parseFloat(estimate.tax_rate) * 100).toFixed(1)}%)
                    </span>
                    <span>{fmt(estimate.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {parseFloat(estimate.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notes (view mode) ── */}
      {!isEditing && estimate.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Internal Notes (view mode) ── */}
      {!isEditing && estimate.internal_notes && (
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Internal Notes
              <Badge className="text-xs bg-orange-100 text-orange-700">Internal Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.internal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Entity Notes Panel ── */}
      <NotesPanel entityType="estimate" entityId={estimateId} defaultInternal />

      {/* ── Sticky Save Bar (edit mode) ── */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
          <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Editing <span className="font-semibold">{estimate.estimate_number}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEstimate} disabled={updateEstimateMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateEstimateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Line Item Dialog ── */}
      <Dialog open={isAddLineOpen} onOpenChange={setIsAddLineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Subway Tile - White Gloss 3x6"
                value={lineForm.description}
                onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., Materials"
                  value={lineForm.section}
                  onChange={(e) => setLineForm({ ...lineForm, section: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={lineForm.category} onValueChange={(v) => setLineForm({ ...lineForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                  value={lineForm.quantity}
                  onChange={(e) => setLineForm({ ...lineForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={lineForm.unit} onValueChange={(v) => setLineForm({ ...lineForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="sqft">Sq Ft</SelectItem>
                    <SelectItem value="linear ft">Linear Ft</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="lot">Lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lineForm.unit_price}
                  onChange={(e) => setLineForm({ ...lineForm, unit_price: e.target.value })}
                />
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Line Total: {fmt((parseFloat(lineForm.quantity) || 0) * (parseFloat(lineForm.unit_price) || 0))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLineOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLineItem} disabled={createLineItemMutation.isPending || !lineForm.description.trim()}>
              {createLineItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
