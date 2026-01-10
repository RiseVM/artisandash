import { useState } from "react";
import {
  useOutOfScopeItems,
  useCreateOutOfScopeItem,
  useUpdateOutOfScopeItem,
  useDeleteOutOfScopeItem,
} from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus, Ban, Pencil, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectOutOfScopeProps {
  projectId: number;
}

export function ProjectOutOfScope({ projectId }: ProjectOutOfScopeProps) {
  const { data: items, isLoading } = useOutOfScopeItems(projectId);
  const createItem = useCreateOutOfScopeItem();
  const updateItem = useUpdateOutOfScopeItem();
  const deleteItem = useDeleteOutOfScopeItem();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    item: "",
    reason: "",
    client_visible: "yes",
  });

  const resetForm = () => {
    setFormData({ item: "", reason: "", client_visible: "yes" });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        item: item.item,
        reason: item.reason || "",
        client_visible: item.client_visible,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.item.trim()) {
      toast({
        title: "Error",
        description: "Item description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          projectId,
          data: formData,
        });
        toast({ title: "Item updated" });
      } else {
        await createItem.mutateAsync({
          projectId,
          data: formData,
        });
        toast({ title: "Item added" });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteItem.mutateAsync({ id: deleteConfirm.id, projectId });
      toast({ title: "Item deleted" });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleToggleAcknowledged = async (item: any) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        projectId,
        data: {
          client_acknowledged: item.client_acknowledged === "yes" ? "no" : "yes",
          acknowledged_at: item.client_acknowledged === "yes" ? null : new Date().toISOString(),
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update acknowledgment",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5" />
          Out of Scope Items
        </CardTitle>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        {!items || items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No out of scope items defined</p>
            <p className="text-sm">Add items that are explicitly excluded from this project</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.item}</div>
                  {item.reason && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Reason: {item.reason}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={item.client_acknowledged === "yes"}
                        onCheckedChange={() => handleToggleAcknowledged(item)}
                      />
                      <span className="flex items-center gap-1">
                        {item.client_acknowledged === "yes" ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Client acknowledged
                          </>
                        ) : (
                          "Client acknowledged"
                        )}
                      </span>
                    </label>
                    {item.client_visible === "no" && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Internal only
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Out of Scope Item" : "Add Out of Scope Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item Description *</Label>
              <Input
                id="item"
                placeholder="e.g., Electrical work behind walls"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why is this excluded from the project scope?"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="client_visible"
                checked={formData.client_visible === "yes"}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, client_visible: checked ? "yes" : "no" })
                }
              />
              <Label htmlFor="client_visible" className="cursor-pointer">
                Visible to client in portal
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createItem.isPending || updateItem.isPending}
            >
              {(createItem.isPending || updateItem.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.item}"? This action cannot be undone.
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
