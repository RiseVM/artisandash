import { useState } from "react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Search, 
  Bell, 
  Plus, 
  CheckCircle2, 
  Edit2, 
  AlertCircle 
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const { samples, markReturned, checkOverdue } = useStore();
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleRunReminders = () => {
    checkOverdue();
    toast({
      title: "Reminders Checked",
      description: "Overdue status updated for all samples.",
    });
  };

  const handleMarkReturned = (id: number, name: string) => {
    markReturned(id);
    toast({
      title: "Sample Returned",
      description: `${name} has been marked as returned.`,
    });
  };

  const filteredSamples = samples.filter((s) => 
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.sample_name.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    // Custom sort: Overdue -> Checked Out -> Returned, then by due date
    const statusPriority = { overdue: 0, checked_out: 1, returned: 2 };
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[a.status] - statusPriority[b.status];
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of current checkouts and statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRunReminders}>
            <Bell className="mr-2 h-4 w-4" />
            Check Reminders
          </Button>
          <Link href="/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Checkout
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Samples</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search customers or samples..." 
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No samples found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSamples.map((sample) => (
                    <TableRow key={sample.id} className="group">
                      <TableCell>
                        <div className="font-medium">{sample.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{sample.customer_email}</div>
                        {sample.customer_phone && (
                          <div className="text-xs text-muted-foreground">{sample.customer_phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{sample.sample_name}</div>
                        {sample.auth_notes && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/50" />
                            Card on file
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between w-32">
                            <span className="text-muted-foreground">Out:</span> 
                            <span>{format(new Date(sample.checkout_date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex justify-between w-32 font-medium">
                            <span className="text-muted-foreground">Due:</span> 
                            <span className={sample.status === 'overdue' ? "text-red-600" : ""}>
                              {format(new Date(sample.due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sample.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-xs text-muted-foreground" title={sample.notes}>
                          {sample.notes || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {sample.status !== 'returned' && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Mark Returned"
                              onClick={() => handleMarkReturned(sample.id, sample.sample_name)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/edit/${sample.id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
