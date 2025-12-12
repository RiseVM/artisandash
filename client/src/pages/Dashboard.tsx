import { useState } from "react";
import { Link } from "wouter";
import { useStore, CheckoutView } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Bell, 
  Plus, 
  CheckCircle2, 
  Edit2,
  Calendar,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const { checkouts, getCheckoutView, updateCheckout, checkOverdue } = useStore();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<'due_asc' | 'due_desc' | 'name_asc'>('due_asc');
  const { toast } = useToast();

  const handleRunReminders = () => {
    checkOverdue();
    toast({
      title: "Reminders Checked",
      description: "Overdue status updated for all samples.",
    });
  };

  const handleStatusChange = (id: number, newStatus: 'checked_out' | 'overdue' | 'returned') => {
    updateCheckout(id, { status: newStatus });
    toast({
      title: "Status Updated",
      description: `Checkout #${id} marked as ${newStatus.replace('_', ' ')}.`,
    });
  };

  // Convert checkouts to views (with customer/item data)
  const checkoutViews = checkouts.map(getCheckoutView);

  const filterAndSort = (items: CheckoutView[]) => {
    let filtered = items.filter((s) => 
      s.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      s.item.name.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.email.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortOrder === 'due_asc') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (sortOrder === 'due_desc') return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      if (sortOrder === 'name_asc') return a.customer.name.localeCompare(b.customer.name);
      return 0;
    });
  };

  const activeCheckouts = filterAndSort(checkoutViews.filter(c => c.status !== 'returned'));
  const returnedCheckouts = filterAndSort(checkoutViews.filter(c => c.status === 'returned'));

  const CheckoutTable = ({ data, showActions = true }: { data: CheckoutView[], showActions?: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Sample</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No samples found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((sample) => (
              <TableRow key={sample.id} className="group">
                <TableCell>
                  <div className="font-medium">{sample.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{sample.customer.email}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{sample.item.name}</div>
                  <div className="text-xs text-muted-foreground">{sample.item.sku}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between w-32">
                      <span className="text-muted-foreground">Out:</span> 
                      <span>{format(new Date(sample.checkout_date), 'MMM d')}</span>
                    </div>
                    <div className="flex justify-between w-32 font-medium">
                      <span className="text-muted-foreground">Due:</span> 
                      <span className={sample.status === 'overdue' ? "text-red-600" : ""}>
                        {format(new Date(sample.due_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <Select 
                      defaultValue={sample.status} 
                      onValueChange={(val: any) => handleStatusChange(sample.id, val)}
                    >
                      <SelectTrigger className="w-[130px] h-8 border-none bg-transparent p-0">
                        <div className="flex items-center">
                          <StatusBadge status={sample.status} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checked_out">Checked Out</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-xs text-muted-foreground" title={sample.notes}>
                    {sample.notes || "—"}
                  </p>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/edit/${sample.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of checkouts and returns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRunReminders}>
            <Bell className="mr-2 h-4 w-4" />
            Run Checks
          </Button>
          <Link href="/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Checkout
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search checkouts..." 
              className="pl-8 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_asc">Due Date (Earliest)</SelectItem>
                <SelectItem value="due_desc">Due Date (Latest)</SelectItem>
                <SelectItem value="name_asc">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">Active ({activeCheckouts.length})</TabsTrigger>
          <TabsTrigger value="returned">Returned History ({returnedCheckouts.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardContent className="pt-6">
              <CheckoutTable data={activeCheckouts} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="returned">
          <Card>
            <CardContent className="pt-6">
              <CheckoutTable data={returnedCheckouts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
