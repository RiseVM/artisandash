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
import { Search, Plus, Edit2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Customers() {
  const { customers, addCustomer, updateCustomer } = useStore();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const { toast } = useToast();

  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.email) return;
    addCustomer(newCustomer);
    setIsAddOpen(false);
    setNewCustomer({ name: "", email: "", phone: "" });
    toast({ title: "Customer Added", description: `${newCustomer.name} added.` });
  };

  const handleUpdateCustomer = () => {
    if (!editingCustomer) return;
    updateCustomer(editingCustomer.id, editingCustomer);
    setEditingCustomer(null);
    toast({ title: "Customer Updated", description: "Customer details updated." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Customers</h1>
          <p className="text-muted-foreground">Manage your client list.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.name} 
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.email} 
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Phone</Label>
                <Input 
                  className="col-span-3" 
                  value={newCustomer.phone} 
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer}>Save Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Clients ({filteredCustomers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setEditingCustomer(customer)}
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
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.name || ""} 
                onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Email</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.email || ""} 
                onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Phone</Label>
              <Input 
                className="col-span-3" 
                value={editingCustomer?.phone || ""} 
                onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateCustomer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
