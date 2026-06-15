import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Collapsible removed — phases now use simplified view
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Truck,
  Image,
  File,
  Download,
  Eye,
  PenLine,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PortalMessages } from "./components/PortalMessages";
import type { ProjectWithDetails, ChangeOrder, ProjectDelivery, ProjectFile } from "@shared/schema";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-brass-muted", text: "text-brass", dot: "bg-brass", label: "Active" },
  on_hold: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "On Hold" },
  completed: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Completed" },
  cancelled: { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted-foreground/40", label: "Cancelled" },
};

const phaseStatusIcons: Record<string, React.ReactNode> = {
  not_started: <Circle className="h-4 w-4 text-muted-foreground/40" />,
  in_progress: <Clock className="h-4 w-4 text-brass" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  on_hold: <Clock className="h-4 w-4 text-amber-500" />,
  skipped: <Circle className="h-4 w-4 text-muted-foreground/40" />,
};

const phaseStatusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  skipped: "Skipped",
};

const changeOrderStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Draft" },
  pending_approval: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Approval" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-destructive/10", text: "text-destructive", label: "Rejected" },
  void: { bg: "bg-secondary", text: "text-muted-foreground", label: "Void" },
};

const deliveryStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Pending" },
  ordered: { bg: "bg-brass-muted", text: "text-brass", label: "Ordered" },
  shipped: { bg: "bg-brass-muted", text: "text-brass", label: "Shipped" },
  in_transit: { bg: "bg-brass-muted", text: "text-brass", label: "In Transit" },
  delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
  delayed: { bg: "bg-destructive/10", text: "text-destructive", label: "Delayed" },
};

export function PortalProject() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = parseInt(params.id || "0");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [approveChangeOrder, setApproveChangeOrder] = useState<ChangeOrder | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/portal/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: changeOrders = [] } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/portal/projects", projectId, "change-orders"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/change-orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: deliveries = [] } = useQuery<ProjectDelivery[]>({
    queryKey: ["/api/portal/projects", projectId, "deliveries"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/deliveries`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: files = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/portal/projects", projectId, "files"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/files`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!projectId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, signature }: { id: number; signature: string }) => {
      const res = await fetch(`/api/portal/change-orders/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature }),
      });
      if (!res.ok) throw new Error("Failed to approve change order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "change-orders"] });
      setApproveChangeOrder(null);
      toast({ title: "Change Order Approved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    },
  });

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleApprove = () => {
    if (!approveChangeOrder || !canvasRef.current) return;
    const signature = canvasRef.current.toDataURL("image/png");
    approveMutation.mutate({ id: approveChangeOrder.id, signature });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    canvas.dataset.drawing = "true";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.dataset.drawing !== "true") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.dataset.drawing = "false";
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const photoFiles = files.filter((f) => f.is_photo === "yes");
  const documentFiles = files.filter((f) => f.is_photo !== "yes");
  const pendingChangeOrders = changeOrders.filter((co) => co.status === "pending_approval");

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout>
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Project not found</h2>
          <Button onClick={() => setLocation("/portal")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </PortalLayout>
    );
  }

  const status = statusConfig[project.status] || statusConfig.active;

  return (
    <PortalLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <button
            onClick={() => setLocation("/portal/projects")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/70 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground font-serif">{project.name}</h1>
                <Badge
                  variant="secondary"
                  className={`${status.bg} ${status.text} border-0 font-medium text-xs`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5 inline-block`} />
                  {status.label}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground text-sm">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="border-0 shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground/70">Overall Progress</h3>
              <span className="text-2xl font-bold text-brass">
                {project.overall_progress}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-brass"
                style={{ width: `${project.overall_progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phases — simplified view showing status and progress only */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Project Timeline</h2>
          {project.phases.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No phases available to display yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm bg-card overflow-hidden">
              <CardContent className="p-5 space-y-4">
                {project.phases
                  .filter((phase) => {
                    // Hide internal phases like intake checklists
                    const name = phase.name.toLowerCase();
                    return !name.includes("intake") && !name.includes("checklist") && !name.includes("internal");
                  })
                  .map((phase, index) => {
                    const completedTasks = phase.tasks.filter((t) => t.status === "completed").length;
                    const totalTasks = phase.tasks.length;
                    return (
                      <div key={phase.id} className="flex items-center gap-4">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            phase.status === "completed"
                              ? "bg-green-500 text-white"
                              : phase.status === "in_progress"
                                ? "bg-brass text-brass-foreground"
                                : "bg-secondary text-muted-foreground"
                          )}>
                            {phase.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                        </div>

                        {/* Phase info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{phase.name}</p>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {phaseStatusLabels[phase.status]}
                            </span>
                          </div>
                          {phase.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brass transition-all"
                                style={{ width: `${phase.progress}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-12 text-right">
                              {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : `${phase.progress}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Change Orders */}
        {changeOrders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Change Orders</h2>
              {pendingChangeOrders.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                  {pendingChangeOrders.length} pending
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              {changeOrders.map((co) => {
                const coStatus = changeOrderStatusConfig[co.status || "draft"] || changeOrderStatusConfig.draft;
                return (
                  <Card key={co.id} className="border-0 shadow-sm bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">CO-{co.co_number}: {co.title}</span>
                            <Badge variant="secondary" className={`${coStatus.bg} ${coStatus.text} border-0 text-xs`}>
                              {coStatus.label}
                            </Badge>
                          </div>
                          {co.description && <p className="text-sm text-muted-foreground mb-2">{co.description}</p>}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {co.cost_impact && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(co.cost_impact)}
                              </span>
                            )}
                            {co.time_impact_days && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {co.time_impact_days} days
                              </span>
                            )}
                          </div>
                        </div>
                        {co.status === "pending_approval" && (
                          <Button
                            size="sm"
                            className="w-full sm:w-auto bg-brass hover:bg-brass/90 text-brass-foreground"
                            onClick={() => setApproveChangeOrder(co)}
                          >
                            <PenLine className="h-4 w-4 mr-1" />
                            Sign & Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Deliveries */}
        {deliveries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              Deliveries
            </h2>
            <div className="space-y-3">
              {deliveries.map((delivery) => {
                const delStatus = deliveryStatusConfig[delivery.status || "pending"] || deliveryStatusConfig.pending;
                return (
                  <Card key={delivery.id} className="border-0 shadow-sm bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-foreground">{delivery.description}</span>
                            <Badge variant="secondary" className={`${delStatus.bg} ${delStatus.text} border-0 text-xs`}>
                              {delStatus.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                            {delivery.vendor && <span>Vendor: {delivery.vendor}</span>}
                            {delivery.expected_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expected: {new Date(delivery.expected_date).toLocaleDateString()}
                              </span>
                            )}
                            {delivery.tracking_number && <span>Tracking: {delivery.tracking_number}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Files & Photos */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Image className="h-5 w-5 text-muted-foreground" />
              Files & Photos
            </h2>

            {photoFiles.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Photos ({photoFiles.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photoFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-muted/40 cursor-pointer shadow-sm"
                      onClick={() => setPreviewFile(file)}
                    >
                      {file.thumbnail_url || file.file_url ? (
                        <img src={file.thumbnail_url || file.file_url} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documentFiles.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Documents ({documentFiles.length})
                </h3>
                <div className="space-y-2">
                  {documentFiles.map((file) => (
                    <Card key={file.id} className="border-0 shadow-sm bg-card">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brass-muted flex items-center justify-center shrink-0">
                          <File className="h-4 w-4 text-brass" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
                          {file.description && <p className="text-xs text-muted-foreground truncate">{file.description}</p>}
                        </div>
                        {file.file_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground/70" onClick={() => window.open(file.file_url, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <PortalMessages projectId={projectId} />

      {/* Change Order Approval Dialog */}
      <Dialog open={!!approveChangeOrder} onOpenChange={(open) => !open && setApproveChangeOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Change Order</DialogTitle>
            <DialogDescription>
              CO-{approveChangeOrder?.co_number}: {approveChangeOrder?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {approveChangeOrder?.description && <p className="text-sm text-foreground/70">{approveChangeOrder.description}</p>}
            <div className="flex gap-4 text-sm">
              {approveChangeOrder?.cost_impact && (
                <span>Cost Impact: <strong>{formatCurrency(approveChangeOrder.cost_impact)}</strong></span>
              )}
              {approveChangeOrder?.time_impact_days && (
                <span>Time Impact: <strong>{approveChangeOrder.time_impact_days} days</strong></span>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sign below to approve:</p>
              <canvas
                ref={canvasRef}
                width={350}
                height={150}
                className="border rounded-xl bg-card w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Button variant="outline" size="sm" onClick={clearCanvas}>Clear Signature</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveChangeOrder(null)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-brass hover:bg-brass/90 text-brass-foreground"
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px]">
            {previewFile?.file_url && (
              <img src={previewFile.file_url} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
