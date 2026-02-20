import { useState } from "react";
import {
  useProjectDeliveries,
  useCreateDelivery,
  useUpdateDelivery,
  useDeleteDelivery,
} from "../hooks";
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
import {
  Plus,
  Truck,
  Pencil,
  Trash2,
  Package,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type { ProjectDeliveryWithPhase, ProjectPhase } from "@shared/schema";

const deliveryStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  ordered: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  delayed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const deliveryStatusLabels: Record<string, string> = {
  pending: "Pending",
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

interface ProjectDeliveriesProps {
  projectId: number;
  phases: ProjectPhase[];
  canManage: boolean;
}

export function ProjectDeliveries({ projectId, phases, canManage }: ProjectDeliveriesProps) {
  const { toast } = useToast();
  const { data: deliveries = [], isLoading } = useProjectDeliveries(projectId);
  const createMutation = useCreateDelivery();
  const updateMutation = useUpdateDelivery();
  const deleteMutation = useDeleteDelivery();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<ProjectDeliveryWithPhase | null>(null);
  const [deleteDelivery, setDeleteDelivery] = useState<ProjectDeliveryWithPhase | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    vendor: "",
    status: "pending",
    expected_date: "",
    tracking_number: "",
    carrier: "",
    cost: "",
    linked_phase_id: "",
    notes: "",
    client_visible: "yes",
  });

  const resetForm = () => {
    setFormData({
      description: "",
      vendor: "",
      status: "pending",
      expected_date: "",
      tracking_number: "",
      carrier: "",
      cost: "",
      linked_phase_id: "",
      notes: "",
      client_visible: "yes",
    });
  };

  const handleCreate = async () => {
    if (!formData.description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        projectId,
        data: {
          description: formData.description,
          vendor: formData.vendor || null,
          status: formData.status,
          expected_date: formData.expected_date || null,
          tracking_number: formData.tracking_number || null,
          carrier: formData.carrier || null,
          cost: formData.cost ? formData.cost : null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          notes: formData.notes || null,
          client_visible: formData.client_visible,
        },
      });
      resetForm();
      setIsAddOpen(false);
      toast({ title: "Delivery Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingDelivery) return;
    try {
      await updateMutation.mutateAsync({
        id: editingDelivery.id,
        projectId,
        data: {
          description: formData.description,
          vendor: formData.vendor || null,
          status: formData.status,
          expected_date: formData.expected_date || null,
          actual_date: formData.status === "delivered" && !editingDelivery.actual_date
            ? new Date().toISOString().split("T")[0]
            : undefined,
          tracking_number: formData.tracking_number || null,
          carrier: formData.carrier || null,
          cost: formData.cost ? formData.cost : null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          notes: formData.notes || null,
          client_visible: formData.client_visible,
        },
      });
      setEditingDelivery(null);
      resetForm();
      toast({ title: "Delivery Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteDelivery) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteDelivery.id, projectId });
      setDeleteDelivery(null);
      toast({ title: "Delivery Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const openEdit = (delivery: ProjectDeliveryWithPhase) => {
    setFormData({
      description: delivery.description,
      vendor: delivery.vendor || "",
      status: delivery.status,
      expected_date: delivery.expected_date || "",
      tracking_number: delivery.tracking_number || "",
      carrier: delivery.carrier || "",
      cost: delivery.cost || "",
      linked_phase_id: delivery.linked_phase_id?.toString() || "",
      notes: delivery.notes || "",
      client_visible: delivery.client_visible,
    });
    setEditingDelivery(delivery);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Deliveries
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Delivery
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No deliveries tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-background"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{delivery.description}</span>
                    <Badge className={deliveryStatusColors[delivery.status]}>
                      {deliveryStatusLabels[delivery.status]}
                    </Badge>
                    {delivery.client_visible === "no" && (
                      <Badge variant="outline" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {delivery.vendor && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {delivery.vendor}
                      </span>
                    )}
                    {delivery.expected_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expected: {new Date(delivery.expected_date).toLocaleDateString()}
                      </span>
                    )}
                    {delivery.tracking_number && (
                      <span>Tracking: {delivery.tracking_number}</span>
                    )}
                    {delivery.phase && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {delivery.phase.name}
                      </span>
                    )}
                  </div>
                  {delivery.status === "delayed" && delivery.delay_reason && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {delivery.delay_reason}
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(delivery)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteDelivery(delivery)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddOpen || !!editingDelivery}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingDelivery(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? "Edit Delivery" : "Add Delivery"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Floor tiles for kitchen"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Input
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  placeholder="e.g., UPS, FedEx"
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linked Phase</Label>
                <Select
                  value={formData.linked_phase_id === "" ? "none" : formData.linked_phase_id}
                  onValueChange={(value) => setFormData({ ...formData, linked_phase_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id.toString()}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client Visible</Label>
                <Select
                  value={formData.client_visible}
                  onValueChange={(value) => setFormData({ ...formData, client_visible: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No (Internal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setEditingDelivery(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingDelivery ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingDelivery
                ? "Update"
                : "Add Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDelivery} onOpenChange={(open) => !open && setDeleteDelivery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDelivery?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
