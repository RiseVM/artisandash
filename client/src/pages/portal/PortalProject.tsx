import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { ProjectWithDetails, ChangeOrder, ProjectDelivery, ProjectFile } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const phaseStatusIcons: Record<string, React.ReactNode> = {
  not_started: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  on_hold: <Clock className="h-4 w-4 text-yellow-500" />,
  skipped: <Circle className="h-4 w-4 text-gray-400" />,
};

const phaseStatusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  skipped: "Skipped",
};

const changeOrderStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  void: "bg-gray-100 text-gray-500",
};

const changeOrderStatusLabels: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  void: "Void",
};

const deliveryStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  ordered: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  delayed: "bg-red-100 text-red-800",
};

const deliveryStatusLabels: Record<string, string> = {
  pending: "Pending",
  ordered: "Ordered",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  delayed: "Delayed",
};

export function PortalProject() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = parseInt(params.id || "0");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [approveChangeOrder, setApproveChangeOrder] = useState<ChangeOrder | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/portal/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: changeOrders = [] } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/portal/projects", projectId, "change-orders"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/change-orders`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: deliveries = [] } = useQuery<ProjectDelivery[]>({
    queryKey: ["/api/portal/projects", projectId, "deliveries"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/deliveries`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: files = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/portal/projects", projectId, "files"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/files`, {
        credentials: "include",
      });
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

  const togglePhase = (phaseId: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleApprove = () => {
    if (!approveChangeOrder || !canvasRef.current) return;
    const signature = canvasRef.current.toDataURL("image/png");
    approveMutation.mutate({ id: approveChangeOrder.id, signature });
  };

  // Canvas drawing logic
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
    if (canvas) {
      canvas.dataset.drawing = "false";
    }
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  const isImage = (file: ProjectFile) => {
    return file.is_photo === "yes" || file.mime_type?.startsWith("image/");
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
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">Project not found</h2>
          <Button onClick={() => setLocation("/portal")}>
            Back to Projects
          </Button>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/portal")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={project.overall_progress} className="flex-1 h-3" />
              <span className="text-xl font-semibold min-w-[60px] text-right">
                {project.overall_progress}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Phases */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Phases</h2>

          {project.phases.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No phases available to display yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            project.phases.map((phase, index) => (
              <Card key={phase.id}>
                <Collapsible
                  open={expandedPhases.has(phase.id)}
                  onOpenChange={() => togglePhase(phase.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedPhases.has(phase.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <CardTitle className="text-base">{phase.name}</CardTitle>
                              {phase.description && (
                                <CardDescription>{phase.description}</CardDescription>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm">
                            {phaseStatusIcons[phase.status]}
                            <span className="text-muted-foreground">
                              {phaseStatusLabels[phase.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={phase.progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground w-10 text-right">
                              {phase.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {phase.tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No tasks in this phase.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {phase.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : task.status === "in_progress" ? (
                                <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                  {task.name}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              {task.status === "completed" && (
                                <Badge variant="secondary" className="flex-shrink-0">
                                  Completed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>

        {/* Change Orders */}
        {changeOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Change Orders
              {pendingChangeOrders.length > 0 && (
                <Badge variant="destructive">{pendingChangeOrders.length} pending</Badge>
              )}
            </h2>
            <div className="space-y-3">
              {changeOrders.map((co) => (
                <Card key={co.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">CO-{co.co_number}: {co.title}</span>
                          <Badge className={changeOrderStatusColors[co.status || "draft"]}>
                            {changeOrderStatusLabels[co.status || "draft"]}
                          </Badge>
                        </div>
                        {co.description && (
                          <p className="text-sm text-muted-foreground mb-2">{co.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
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
                        <Button size="sm" onClick={() => setApproveChangeOrder(co)}>
                          <PenLine className="h-4 w-4 mr-1" />
                          Sign & Approve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Deliveries */}
        {deliveries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Deliveries
            </h2>
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{delivery.description}</span>
                          <Badge className={deliveryStatusColors[delivery.status || "pending"]}>
                            {deliveryStatusLabels[delivery.status || "pending"]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {delivery.vendor && <span>Vendor: {delivery.vendor}</span>}
                          {delivery.expected_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expected: {new Date(delivery.expected_date).toLocaleDateString()}
                            </span>
                          )}
                          {delivery.tracking_number && (
                            <span>Tracking: {delivery.tracking_number}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files & Photos */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image className="h-5 w-5" />
              Files & Photos
            </h2>

            {/* Photos Grid */}
            {photoFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Photos ({photoFiles.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photoFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative group aspect-square border rounded-lg overflow-hidden bg-muted cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      {file.thumbnail_url || file.file_url ? (
                        <img
                          src={file.thumbnail_url || file.file_url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents List */}
            {documentFiles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Documents ({documentFiles.length})</h3>
                <div className="space-y-2">
                  {documentFiles.map((file) => (
                    <Card key={file.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <File className="h-5 w-5 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          {file.description && (
                            <p className="text-sm text-muted-foreground truncate">{file.description}</p>
                          )}
                        </div>
                        {file.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(file.file_url, "_blank")}
                          >
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
            {approveChangeOrder?.description && (
              <p className="text-sm">{approveChangeOrder.description}</p>
            )}
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
                className="border rounded-lg bg-white w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                Clear Signature
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveChangeOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
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
              <img
                src={previewFile.file_url}
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
