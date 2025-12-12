import { useState } from "react";
import { useInventory, useCreateInventory, useUpdateInventory, useDeleteInventory } from "@/hooks/use-api";
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
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Package, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Inventory() {
  const { data: inventory = [], isLoading } = useInventory();
  const createInventoryMutation = useCreateInventory();
  const updateInventoryMutation = useUpdateInventory();
  const deleteInventoryMutation = useDeleteInventory();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({ name: "", sku: "", category: "", total_quantity: 10 });

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddItem = async () => {
    if (!newItem.name) return;
    try {
      await createInventoryMutation.mutateAsync({
        name: newItem.name,
        sku: newItem.sku || null,
        category: newItem.category || null,
        total_quantity: newItem.total_quantity,
      });
      setIsAddOpen(false);
      setNewItem({ name: "", sku: "", category: "", total_quantity: 10 });
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
          sku: editingItem.sku,
          category: editingItem.category,
          total_quantity: editingItem.total_quantity,
        }
      });
      setEditingItem(null);
      toast({ title: "Item Updated", description: "Inventory item details updated." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update item. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (!confirm(`Are you sure you want to delete ${editingItem.name}?`)) return;
    try {
      await deleteInventoryMutation.mutateAsync(editingItem.id);
      setEditingItem(null);
      toast({ title: "Item Deleted", description: `${editingItem.name} has been deleted.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
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
                <Label className="text-right">SKU</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.sku} 
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  data-testid="input-new-item-sku"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Category</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.category} 
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  data-testid="input-new-item-category"
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell>{item.sku || "—"}</TableCell>
                    <TableCell>{item.category || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditingItem({...item})}
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
              <Label className="text-right">SKU</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.sku || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, sku: e.target.value} : null)}
                data-testid="input-edit-item-sku"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.category || ""} 
                onChange={(e) => setEditingItem(editingItem ? {...editingItem, category: e.target.value} : null)}
                data-testid="input-edit-item-category"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleDeleteItem} 
              disabled={deleteInventoryMutation.isPending}
              data-testid="button-delete-item"
            >
              {deleteInventoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
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
    </div>
  );
}
