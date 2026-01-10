import { useState, useMemo } from "react";
import { useInventory, useCreateInventory, useUpdateInventory, useDeleteInventory, useCheckouts } from "@/hooks/use-api";
import type { Inventory } from "@shared/schema";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Package, Loader2, Trash2, Copy, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Inventory() {
  const { data: inventory = [], isLoading } = useInventory();
  const { data: checkouts = [] } = useCheckouts();
  const createInventoryMutation = useCreateInventory();
  const updateInventoryMutation = useUpdateInventory();
  const deleteInventoryMutation = useDeleteInventory();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({ name: "", color: "", vendor: "", size: "", total_quantity: 1 });

  const checkedOutToMap = useMemo(() => {
    const map: Record<number, { customerName: string; status: string }> = {};
    for (const checkout of checkouts) {
      if (checkout.status === 'checked_out' || checkout.status === 'overdue') {
        map[checkout.inventory_item_id] = {
          customerName: checkout.customer.name,
          status: checkout.status
        };
      }
    }
    return map;
  }, [checkouts]);

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.color && item.color.toLowerCase().includes(search.toLowerCase())) ||
    (item.vendor && item.vendor.toLowerCase().includes(search.toLowerCase())) ||
    (item.size && item.size.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddItem = async () => {
    if (!newItem.name) return;
    try {
      await createInventoryMutation.mutateAsync({
        name: newItem.name,
        color: newItem.color || null,
        vendor: newItem.vendor || null,
        size: newItem.size || null,
        total_quantity: newItem.total_quantity,
      });
      setIsAddOpen(false);
      setNewItem({ name: "", color: "", vendor: "", size: "", total_quantity: 1 });
      toast({ title: "Item Added", description: `${newItem.name} added to inventory.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add item. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      await updateInventoryMutation.mutateAsync({
        id: editingItem.id,
        data: {
          name: editingItem.name,
          color: editingItem.color,
          vendor: editingItem.vendor,
          size: editingItem.size,
          total_quantity: editingItem.total_quantity,
        }
      });
      setEditingItem(null);
      toast({ title: "Item Updated", description: "Inventory item details updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update item. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await deleteInventoryMutation.mutateAsync(editingItem.id);
      setShowDeleteConfirm(false);
      setEditingItem(null);
      toast({ title: "Item Deleted", description: `${editingItem.name} has been deleted.` });
    } catch (err: any) {
      setShowDeleteConfirm(false);
      const errorMsg = err?.message || "Failed to delete item.";
      toast({ title: "Failed to Delete Item", description: `${errorMsg} Return all samples first.`, variant: "destructive" });
    }
  };

  const handleDuplicateItem = async () => {
    if (!editingItem) return;
    const baseName = editingItem.name.replace(/-\d+$/, '');
    const existingNumbers = inventory
      .filter(item => item.name === baseName || item.name.startsWith(baseName + '-'))
      .map(item => {
        const match = item.name.match(/-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    const newName = `${baseName}-${nextNumber}`;
    
    try {
      await createInventoryMutation.mutateAsync({
        name: newName,
        color: editingItem.color || null,
        vendor: editingItem.vendor || null,
        size: editingItem.size || null,
        total_quantity: 1,
      });
      setEditingItem(null);
      toast({ title: "Item Duplicated", description: `Created ${newName}` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to duplicate item.", variant: "destructive" });
    }
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
          <h1 className="text-2xl font-serif font-bold text-primary">Inventory</h1>
          <p className="text-muted-foreground">Manage your sample library.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-item">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  data-testid="input-new-item-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Color</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.color} 
                  onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                  data-testid="input-new-item-color"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Vendor</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.vendor} 
                  onChange={(e) => setNewItem({...newItem, vendor: e.target.value})}
                  data-testid="input-new-item-vendor"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Size</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.size} 
                  onChange={(e) => setNewItem({...newItem, size: e.target.value})}
                  data-testid="input-new-item-size"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddItem} disabled={createInventoryMutation.isPending} data-testid="button-save-item">
                {createInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Items ({filteredInventory.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-inventory"
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
                  <TableHead>Color</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Checked Out To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow 
                    key={item.id} 
                    data-testid={`row-inventory-${item.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setEditingItem({...item})}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>{item.color || "—"}</TableCell>
                    <TableCell>{item.vendor || "—"}</TableCell>
                    <TableCell>{item.size || "—"}</TableCell>
                    <TableCell>
                      {checkedOutToMap[item.id] ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className={checkedOutToMap[item.id].status === 'overdue' ? 'text-destructive font-medium' : ''}>
                            {checkedOutToMap[item.id].customerName}
                          </span>
                          {checkedOutToMap[item.id].status === 'overdue' && (
                            <span className="text-xs text-destructive">(Overdue)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Available</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={(e) => { e.stopPropagation(); setEditingItem({...item}); }}
                        data-testid={`button-edit-item-${item.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.name || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, name: e.target.value} : null)}
                data-testid="input-edit-item-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.color || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, color: e.target.value} : null)}
                data-testid="input-edit-item-color"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Vendor</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.vendor || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, vendor: e.target.value} : null)}
                data-testid="input-edit-item-vendor"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Size</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.size || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, size: e.target.value} : null)}
                data-testid="input-edit-item-size"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={deleteInventoryMutation.isPending}
                data-testid="button-delete-item"
              >
                {deleteInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleDuplicateItem} 
                disabled={createInventoryMutation.isPending}
                data-testid="button-duplicate-item"
              >
                {createInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Duplicate
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleUpdateItem} disabled={updateInventoryMutation.isPending} data-testid="button-save-edit-item">
                {updateInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete {editingItem?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
