import { useState } from "react";
import { useStore } from "@/lib/store";
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
import { Search, Plus, Edit2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Inventory() {
  const { inventory, addInventoryItem, updateInventoryItem } = useStore();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();

  const [newItem, setNewItem] = useState({ name: "", sku: "", category: "", total_quantity: 10 });

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddItem = () => {
    if (!newItem.name) return;
    addInventoryItem(newItem);
    setIsAddOpen(false);
    setNewItem({ name: "", sku: "", category: "", total_quantity: 10 });
    toast({ title: "Item Added", description: `${newItem.name} added to inventory.` });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateInventoryItem(editingItem.id, editingItem);
    setEditingItem(null);
    toast({ title: "Item Updated", description: "Inventory item details updated." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Inventory</h1>
          <p className="text-muted-foreground">Manage your sample library.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
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
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">SKU</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.sku} 
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Category</Label>
                <Input 
                  className="col-span-3" 
                  value={newItem.category} 
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddItem}>Save Item</Button>
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
                  <TableRow key={item.id}>
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
                        onClick={() => setEditingItem(item)}
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

      {/* Edit Dialog */}
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
                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">SKU</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.sku || ""} 
                onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <Input 
                className="col-span-3" 
                value={editingItem?.category || ""} 
                onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
