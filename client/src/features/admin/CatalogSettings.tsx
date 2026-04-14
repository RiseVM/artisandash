import { useState } from "react";
import {
  useCatalog,
  useSeedCatalog,
  useUpdateCategory,
  useUpdateItem,
  useCreateCategory,
  useCreateItem,
  useDeleteCategory,
  useDeleteItem,
} from "@/features/catalog/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Settings,
  Database,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react";
import type { ServiceCatalogCategoryWithItems, ServiceCatalogItemWithChildren } from "@shared/schema";

export function CatalogSettings() {
  const { toast } = useToast();
  const { data: catalog = [], isLoading } = useCatalog();
  const seedMutation = useSeedCatalog();
  const updateCategoryMutation = useUpdateCategory();
  const updateItemMutation = useUpdateItem();
  const createCategoryMutation = useCreateCategory();
  const createItemMutation = useCreateItem();
  const deleteCategoryMutation = useDeleteCategory();
  const deleteItemMutation = useDeleteItem();

  const [editingItem, setEditingItem] = useState<{ id: number; name: string; price: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [addingItemTo, setAddingItemTo] = useState<{ categoryId: number; parentId: number | null } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const handleSeed = async () => {
    try {
      await seedMutation.mutateAsync();
      toast({ title: "Default catalog seeded successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleCategory = async (id: number, currentActive: string) => {
    try {
      await updateCategoryMutation.mutateAsync({
        id,
        is_active: currentActive === "yes" ? "no" : "yes",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleItem = async (id: number, currentActive: string) => {
    try {
      await updateItemMutation.mutateAsync({
        id,
        is_active: currentActive === "yes" ? "no" : "yes",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleSaveItemEdit = async () => {
    if (!editingItem) return;
    try {
      await updateItemMutation.mutateAsync({
        id: editingItem.id,
        name: editingItem.name,
        price: editingItem.price,
      });
      setEditingItem(null);
      toast({ title: "Item updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        display_order: catalog.length + 1,
        is_active: "yes",
      });
      setNewCategoryName("");
      setShowNewCategory(false);
      toast({ title: "Category created" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleCreateItem = async () => {
    if (!addingItemTo || !newItemName.trim()) return;
    try {
      await createItemMutation.mutateAsync({
        category_id: addingItemTo.categoryId,
        parent_id: addingItemTo.parentId,
        name: newItemName.trim(),
        price: newItemPrice || "0",
        display_order: 99,
        is_active: "yes",
        is_group: "no",
        is_exclusive: "no",
      });
      setAddingItemTo(null);
      setNewItemName("");
      setNewItemPrice("");
      toast({ title: "Item added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      toast({ title: "Category deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteItemMutation.mutateAsync(id);
      toast({ title: "Item deleted" });
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Service Catalog
        </h1>
        <div className="flex gap-2">
          {catalog.length === 0 && (
            <Button onClick={handleSeed} disabled={seedMutation.isPending} variant="outline">
              {seedMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Seeding...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" />Seed Defaults</>
              )}
            </Button>
          )}
          <Button onClick={() => setShowNewCategory(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage your service catalog. Toggle items on/off, edit prices, and add new services.
        Changes here affect the Quote Builder immediately.
      </p>

      {catalog.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-4" />
          <p>No catalog items yet. Seed the defaults or add categories manually.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {catalog.map((cat) => (
            <Card key={cat.id} className={cat.is_active !== "yes" ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat.icon && (
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-lg"
                        style={{ backgroundColor: cat.icon_bg || "#f3f4f6" }}
                      >
                        {cat.icon}
                      </span>
                    )}
                    {cat.name}
                    {cat.is_active !== "yes" && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingItemTo({ categoryId: cat.id, parentId: null })}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                    <Switch
                      checked={cat.is_active === "yes"}
                      onCheckedChange={() => handleToggleCategory(cat.id, cat.is_active)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the category and all its items. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {cat.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      categoryId={cat.id}
                      onToggle={handleToggleItem}
                      onEdit={(id, name, price) => setEditingItem({ id, name, price })}
                      onDelete={handleDeleteItem}
                      onAddChild={(parentId) => setAddingItemTo({ categoryId: cat.id, parentId })}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={handleSaveItemEdit} disabled={updateItemMutation.isPending}>
              {updateItemMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Category name (e.g., Shower, Plumbing)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategory(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending || !newCategoryName.trim()}>
              {createCategoryMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={!!addingItemTo} onOpenChange={(open) => !open && setAddingItemTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <Input
                placeholder="e.g., Tile Installation"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price ($)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingItemTo(null)}>Cancel</Button>
            <Button onClick={handleCreateItem} disabled={createItemMutation.isPending || !newItemName.trim()}>
              {createItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Item Row ──────────────────────────────────
function ItemRow({
  item,
  categoryId,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  depth = 0,
}: {
  item: ServiceCatalogItemWithChildren;
  categoryId: number;
  onToggle: (id: number, active: string) => void;
  onEdit: (id: number, name: string, price: string) => void;
  onDelete: (id: number) => void;
  onAddChild: (parentId: number) => void;
  depth?: number;
}) {
  const isGroup = item.is_group === "yes";
  const price = parseFloat(item.price || "0");

  return (
    <>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/30 group ${
          item.is_active !== "yes" ? "opacity-40" : ""
        }`}
        style={{ marginLeft: depth * 20 }}
      >
        <span className="flex-1 text-sm">
          {isGroup ? (
            <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              {item.name}
              {item.is_exclusive === "yes" && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0">Exclusive</Badge>
              )}
            </span>
          ) : (
            item.name
          )}
        </span>
        {!isGroup && (
          <span className="text-sm font-mono text-muted-foreground w-20 text-right">
            ${price.toLocaleString()}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isGroup && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAddChild(item.id)}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
          {!isGroup && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onEdit(item.id, item.name, item.price)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Switch
            checked={item.is_active === "yes"}
            onCheckedChange={() => onToggle(item.id, item.is_active)}
            className="scale-75"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {/* Children */}
      {item.children?.map((child) => (
        <ItemRow
          key={child.id}
          item={{ ...child, children: [] }}
          categoryId={categoryId}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
