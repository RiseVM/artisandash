import { useState } from "react";
import {
  useTimeEntries,
  useTimeTotals,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
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
import {
  Plus,
  Clock,
  Pencil,
  Trash2,
  Calendar,
  User,
} from "lucide-react";
import type { TimeEntryWithPhase, ProjectPhase } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  labor: "Labor",
  design: "Design",
  consultation: "Consultation",
  travel: "Travel",
  admin: "Admin",
  other: "Other",
};

interface ProjectTimeTrackingProps {
  projectId: number;
  phases: ProjectPhase[];
  canManage: boolean;
}

export function ProjectTimeTracking({ projectId, phases, canManage }: ProjectTimeTrackingProps) {
  const { toast } = useToast();
  const { data: entries = [], isLoading } = useTimeEntries(projectId);
  const { data: totals } = useTimeTotals(projectId);
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithPhase | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntryWithPhase | null>(null);

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    hours: "",
    category: "labor",
    description: "",
    linked_phase_id: "",
    is_billable: "yes",
    hourly_rate: "",
  });

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split("T")[0],
      hours: "",
      category: "labor",
      description: "",
      linked_phase_id: "",
      is_billable: "yes",
      hourly_rate: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      toast({ title: "Hours is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        projectId,
        data: {
          entry_date: formData.entry_date,
          hours: formData.hours,
          category: formData.category || null,
          description: formData.description || null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          is_billable: formData.is_billable,
          hourly_rate: formData.hourly_rate ? formData.hourly_rate : null,
        },
      });
      resetForm();
      setIsAddOpen(false);
      toast({ title: "Time Entry Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    try {
      await updateMutation.mutateAsync({
        id: editingEntry.id,
        projectId,
        data: {
          entry_date: formData.entry_date,
          hours: formData.hours,
          category: formData.category || null,
          description: formData.description || null,
          linked_phase_id: formData.linked_phase_id ? parseInt(formData.linked_phase_id) : null,
          is_billable: formData.is_billable,
          hourly_rate: formData.hourly_rate ? formData.hourly_rate : null,
        },
      });
      setEditingEntry(null);
      resetForm();
      toast({ title: "Time Entry Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteEntry.id, projectId });
      setDeleteEntry(null);
      toast({ title: "Time Entry Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const openEdit = (entry: TimeEntryWithPhase) => {
    setFormData({
      entry_date: entry.entry_date,
      hours: entry.hours,
      category: entry.category || "labor",
      description: entry.description || "",
      linked_phase_id: entry.linked_phase_id?.toString() || "",
      is_billable: entry.is_billable,
      hourly_rate: entry.hourly_rate || "",
    });
    setEditingEntry(entry);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Log Time
            </Button>
          )}
        </div>
        {totals && (
          <div className="flex gap-4 mt-2 text-sm">
            <span>
              Total: <strong>{totals.total_hours.toFixed(1)}h</strong>
            </span>
            <span>
              Billable: <strong>{totals.billable_hours.toFixed(1)}h</strong>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No time entries logged yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-background"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{parseFloat(entry.hours).toFixed(1)}h</span>
                    {entry.category && (
                      <Badge variant="secondary">{categoryLabels[entry.category] || entry.category}</Badge>
                    )}
                    {entry.is_billable === "yes" ? (
                      <Badge className="bg-green-100 text-green-800">Billable</Badge>
                    ) : (
                      <Badge variant="outline">Non-billable</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.entry_date).toLocaleDateString()}
                    </span>
                    {entry.user_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.user_name}
                      </span>
                    )}
                    {entry.phase && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {entry.phase.name}
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {entry.description}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteEntry(entry)}
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
        open={isAddOpen || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingEntry(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Time Entry" : "Log Time"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billable</Label>
                <Select
                  value={formData.is_billable}
                  onValueChange={(value) => setFormData({ ...formData, is_billable: value })}
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
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What did you work on?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setEditingEntry(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingEntry ? handleUpdate : handleCreate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingEntry
                ? "Update"
                : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteEntry?.hours}h time entry.
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
