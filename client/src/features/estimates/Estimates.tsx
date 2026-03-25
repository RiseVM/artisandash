import { useState } from "react";
import { useLocation } from "wouter";
import { useEstimates, useCreateEstimate, useDeleteEstimate } from "./hooks";
import { useAuth } from "@/features/auth/hooks";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  FileText,
  Loader2,
  Trash2,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/api";
import type { Customer, EstimateWithCustomer } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  converted: "bg-purple-100 text-purple-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

export function Estimates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: estimates = [], isLoading } = useEstimates();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiQuery<Customer[]>("/api/customers"),
  });
  const createMutation = useCreateEstimate();
  const deleteMutation = useDeleteEstimate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteEstimate, setDeleteEstimate] = useState<EstimateWithCustomer | null>(null);
  const [newEstimate, setNewEstimate] = useState({
    customer_id: 0,
    title: "",
    description: "",
  });

  const filtered = estimates.filter((est) => {
    const matchesSearch =
      est.title.toLowerCase().includes(search.toLowerCase()) ||
      est.estimate_number.toLowerCase().includes(search.toLowerCase()) ||
      est.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newEstimate.customer_id || !newEstimate.title.trim()) return;
    try {
      const created = await createMutation.mutateAsync({
        customer_id: newEstimate.customer_id,
        title: newEstimate.title,
        description: newEstimate.description || null,
        issue_date: new Date().toISOString().split("T")[0],
      });
      setIsCreateOpen(false);
      setNewEstimate({ customer_id: 0, title: "", description: "" });
      toast({ title: "Estimate Created", description: `${created.estimate_number}` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create estimate.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteEstimate) return;
    try {
      await deleteMutation.mutateAsync(deleteEstimate.id);
      setDeleteEstimate(null);
      toast({ title: "Estimate Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete.", variant: "destructive" });
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Estimates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {estimates.length} total estimate{estimates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Estimate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estimates List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search || statusFilter !== "all"
              ? "No estimates match your filters."
              : "No estimates yet. Create your first estimate to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((est) => (
            <Card
              key={est.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/estimates/${est.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">
                        {est.estimate_number}
                      </span>
                      <Badge className={statusColors[est.status]}>
                        {statusLabels[est.status]}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mt-1 truncate">{est.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {est.customer?.name || "No Customer"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {est.issue_date || new Date(est.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold">
                        <DollarSign className="h-4 w-4" />
                        {parseFloat(est.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteEstimate(est);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={newEstimate.customer_id ? String(newEstimate.customer_id) : ""}
                onValueChange={(val) => setNewEstimate({ ...newEstimate, customer_id: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g., Bathroom Renovation Quote"
                value={newEstimate.title}
                onChange={(e) => setNewEstimate({ ...newEstimate, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the estimate..."
                value={newEstimate.description}
                onChange={(e) => setNewEstimate({ ...newEstimate, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newEstimate.customer_id || !newEstimate.title.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create Estimate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEstimate} onOpenChange={(open) => !open && setDeleteEstimate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteEstimate?.estimate_number} - {deleteEstimate?.title}" and all its line items.
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
    </div>
  );
}
