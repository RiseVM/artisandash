import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Bug, RefreshCw, CheckCircle2, AlertCircle, Clock, Trash2, ExternalLink, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BugReport {
  id: number;
  reporter_email: string | null;
  reporter_name: string | null;
  reporter_user_id: string | null;
  title: string;
  description: string;
  page_url: string | null;
  error_message: string | null;
  error_stack: string | null;
  browser_info: string | null;
  status: string;
  priority: string | null;
  resolved_by_user_id: string | null;
  resolved_by_user_name: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function BugReports() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [deleteReport, setDeleteReport] = useState<BugReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports = [], isLoading, refetch } = useQuery<BugReport[]>({
    queryKey: ["/api/bug-reports"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BugReport> }) => {
      await apiRequest("PATCH", `/api/bug-reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bug-reports"] });
      toast({ title: "Bug report updated" });
    },
    onError: () => {
      toast({ title: "Failed to update bug report", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bug-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bug-reports"] });
      toast({ title: "Bug report deleted" });
      setDeleteReport(null);
    },
    onError: () => {
      toast({ title: "Failed to delete bug report", variant: "destructive" });
    },
  });

  const filteredReports = reports.filter(report => {
    if (statusFilter === "all") return true;
    return report.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <AlertCircle className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "resolved": return <CheckCircle2 className="h-4 w-4" />;
      case "closed": return <XCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "new": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  const getPriorityBadgeVariant = (priority: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "normal": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const handleStatusChange = (report: BugReport, newStatus: string) => {
    if (newStatus === "resolved" || newStatus === "closed") {
      setSelectedReport(report);
      setResolutionNotes("");
    } else {
      updateMutation.mutate({ id: report.id, data: { status: newStatus } });
    }
  };

  const handleResolve = () => {
    if (!selectedReport) return;
    updateMutation.mutate({
      id: selectedReport.id,
      data: {
        status: "resolved",
        resolution_notes: resolutionNotes || undefined,
      },
    });
    setSelectedReport(null);
    setResolutionNotes("");
  };

  const openCounts = {
    new: reports.filter(r => r.status === "new").length,
    in_progress: reports.filter(r => r.status === "in_progress").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    closed: reports.filter(r => r.status === "closed").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bug Reports</h1>
          <p className="text-muted-foreground">Manage user-submitted bug reports and errors</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter("new")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{openCounts.new}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter("in_progress")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{openCounts.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter("resolved")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{openCounts.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter("closed")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{openCounts.closed}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bug Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Bug Reports</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bug reports found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-sm">#{report.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <p className="font-medium truncate">{report.title}</p>
                          {report.error_message && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Auto-reported
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{report.reporter_name || "Anonymous"}</p>
                          {report.reporter_email && (
                            <p className="text-muted-foreground text-xs">{report.reporter_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={report.status}
                          onValueChange={(value) => handleStatusChange(report, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(report.status)}
                              <span className="capitalize">{report.status.replace("_", " ")}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={report.priority || "normal"}
                          onValueChange={(value) =>
                            updateMutation.mutate({ id: report.id, data: { priority: value } })
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <Badge variant={getPriorityBadgeVariant(report.priority)}>
                              {report.priority || "normal"}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <BugReportDetailDialog report={report} />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteReport(report)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Add optional resolution notes for this bug report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resolution Notes (Optional)</Label>
              <Textarea
                placeholder="Describe how the issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReport} onOpenChange={() => setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bug Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bug report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReport && deleteMutation.mutate(deleteReport.id)}
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

function BugReportDetailDialog({ report }: { report: BugReport }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <ExternalLink className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-500" />
            Bug Report #{report.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Title</Label>
            <p className="font-medium">{report.title}</p>
          </div>

          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="whitespace-pre-wrap text-sm">{report.description}</p>
          </div>

          {report.page_url && (
            <div>
              <Label className="text-muted-foreground">Page URL</Label>
              <p className="text-sm font-mono break-all">{report.page_url}</p>
            </div>
          )}

          {report.reporter_name && (
            <div>
              <Label className="text-muted-foreground">Reporter</Label>
              <p className="text-sm">
                {report.reporter_name}
                {report.reporter_email && ` (${report.reporter_email})`}
              </p>
            </div>
          )}

          {report.browser_info && (
            <div>
              <Label className="text-muted-foreground">Browser Info</Label>
              <p className="text-sm font-mono break-all">{report.browser_info}</p>
            </div>
          )}

          {report.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <Label className="text-red-700">Error Message</Label>
              <p className="text-sm font-mono text-red-600 mt-1">{report.error_message}</p>
              {report.error_stack && (
                <div className="mt-3">
                  <Label className="text-red-700">Stack Trace</Label>
                  <pre className="text-xs font-mono text-red-600 mt-1 overflow-x-auto whitespace-pre-wrap">
                    {report.error_stack}
                  </pre>
                </div>
              )}
            </div>
          )}

          {report.resolution_notes && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <Label className="text-green-700">Resolution Notes</Label>
              <p className="text-sm mt-1">{report.resolution_notes}</p>
              {report.resolved_by_user_name && (
                <p className="text-xs text-green-600 mt-2">
                  Resolved by {report.resolved_by_user_name}
                  {report.resolved_at && ` on ${format(new Date(report.resolved_at), "MMM d, yyyy")}`}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-4 text-sm text-muted-foreground">
            <p>Created: {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}</p>
            <p>Updated: {format(new Date(report.updated_at), "MMM d, yyyy h:mm a")}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
