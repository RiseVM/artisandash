import { useState, useRef } from "react";
import {
  useChangeOrders,
  useCreateChangeOrder,
  useUpdateChangeOrder,
  useSubmitChangeOrder,
  useApproveChangeOrder,
  useRejectChangeOrder,
  useDeleteChangeOrder,
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
  FileText,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
} from "lucide-react";
import type { ChangeOrderWithPhase, ProjectPhase } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  void: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  void: "Void",
};

interface ProjectChangeOrdersProps {
  projectId: number;
  phases: ProjectPhase[];
  canManage: boolean;
}

export function ProjectChangeOrders({ projectId, phases, canManage }: ProjectChangeOrdersProps) {
  const { toast } = useToast();
  const { data: changeOrders = [], isLoading } = useChangeOrders(projectId);
  const createMutation = useCreateChangeOrder();
  const updateMutation = useUpdateChangeOrder();
  const submitMutation = useSubmitChangeOrder();
  const approveMutation = useApproveChangeOrder();
  const rejectMutation = useRejectChangeOrder();
  const deleteMutation = useDeleteChangeOrder();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCO, setEditingCO] = useState<ChangeOrderWithPhase | null>(null);
  const [deleteCO, setDeleteCO] = useState<ChangeOrderWithPhase | null>(null);
  const [approvingCO, setApprovingCO] = useState<ChangeOrderWithPhase | null>(null);
  const [rejectingCO, setRejectingCO] = useState<ChangeOrderWithPhase | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reason: "",
    cost_impact: "",
    time_impact_days: "",
    linked_phase_id: "",
    client_visible: "yes",
  });

  const [approvalName, setApprovalName] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      reason: "",
      cost_impact: "",
      time_impact_days: "",
      linked_phase_id: "",
      client_visible: "yes",
    });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        projectId,
        data: {
          title: formData.title,
          description: formData.description || null,
          reason: formData.reason || null,
          cost_impact: formData.cost_impact ? formData.cost_impact : null,
          time_impact_days: formData.time_impact_days ? parseInt(formData.time_impact_days) : null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          client_visible: formData.client_visible,
        },
      });
      resetForm();
      setIsAddOpen(false);
      toast({ title: "Change Order Created" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingCO) return;
    try {
      await updateMutation.mutateAsync({
        id: editingCO.id,
        projectId,
        data: {
          title: formData.title,
          description: formData.description || null,
          reason: formData.reason || null,
          cost_impact: formData.cost_impact ? formData.cost_impact : null,
          time_impact_days: formData.time_impact_days ? parseInt(formData.time_impact_days) : null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          client_visible: formData.client_visible,
        },
      });
      setEditingCO(null);
      resetForm();
      toast({ title: "Change Order Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (co: ChangeOrderWithPhase) => {
    try {
      await submitMutation.mutateAsync({ id: co.id, projectId });
      toast({ title: "Submitted for Approval" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    if (!approvingCO || !approvalName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL();

    try {
      await approveMutation.mutateAsync({
        id: approvingCO.id,
        projectId,
        approvedBy: approvalName,
        signature,
      });
      setApprovingCO(null);
      setApprovalName("");
      clearCanvas();
      toast({ title: "Change Order Approved" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectingCO || !rejectionReason.trim()) {
      toast({ title: "Rejection reason is required", variant: "destructive" });
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        id: rejectingCO.id,
        projectId,
        rejectionReason,
      });
      setRejectingCO(null);
      setRejectionReason("");
      toast({ title: "Change Order Rejected" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteCO) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteCO.id, projectId });
      setDeleteCO(null);
      toast({ title: "Change Order Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const openEdit = (co: ChangeOrderWithPhase) => {
    setFormData({
      title: co.title,
      description: co.description || "",
      reason: co.reason || "",
      cost_impact: co.cost_impact || "",
      time_impact_days: co.time_impact_days?.toString() || "",
      linked_phase_id: co.linked_phase_id?.toString() || "",
      client_visible: co.client_visible,
    });
    setEditingCO(co);
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return null;
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Change Orders
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Change Order
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : changeOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No change orders yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {changeOrders.map((co) => (
              <div
                key={co.id}
                className="p-4 border rounded-lg bg-background"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">CO-{co.co_number}</span>
                      <span className="truncate">{co.title}</span>
                      <Badge className={statusColors[co.status]}>
                        {statusLabels[co.status]}
                      </Badge>
                      {co.client_visible === "no" && (
                        <Badge variant="outline" className="text-xs">Internal</Badge>
                      )}
                    </div>
                    {co.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {co.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {co.cost_impact && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(co.cost_impact)}
                        </span>
                      )}
                      {co.time_impact_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {co.time_impact_days > 0 ? "+" : ""}{co.time_impact_days} days
                        </span>
                      )}
                      {co.phase && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {co.phase.name}
                        </span>
                      )}
                      {co.submitted_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted: {new Date(co.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {co.status === "rejected" && co.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">
                        Rejected: {co.rejection_reason}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-col gap-1">
                      {co.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubmit(co)}
                            disabled={submitMutation.isPending}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Submit
                          </Button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(co)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteCO(co)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                      {co.status === "pending_approval" && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-600"
                            onClick={() => setApprovingCO(co)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-600"
                            onClick={() => setRejectingCO(co)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddOpen || !!editingCO}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingCO(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCO ? "Edit Change Order" : "New Change Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Add extra bathroom tile"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details of the change..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Why is this change needed?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Impact ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Time Impact (days)</Label>
                <Input
                  type="number"
                  value={formData.time_impact_days}
                  onChange={(e) => setFormData({ ...formData, time_impact_days: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Linked Phase</Label>
                <Select
                  value={formData.linked_phase_id}
                  onValueChange={(value) => setFormData({ ...formData, linked_phase_id: value })}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setEditingCO(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingCO ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingCO
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog with Signature */}
      <Dialog open={!!approvingCO} onOpenChange={(open) => !open && setApprovingCO(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Change Order</DialogTitle>
            <DialogDescription>
              Approve CO-{approvingCO?.co_number}: {approvingCO?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Approved By *</Label>
              <Input
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature *</Label>
              <div className="border rounded-lg p-1 bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="border rounded cursor-crosshair w-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                Clear Signature
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovingCO(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingCO} onOpenChange={(open) => !open && setRejectingCO(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              Reject CO-{rejectingCO?.co_number}: {rejectingCO?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this change order being rejected?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingCO(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCO} onOpenChange={(open) => !open && setDeleteCO(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete CO-{deleteCO?.co_number}: "{deleteCO?.title}".
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
