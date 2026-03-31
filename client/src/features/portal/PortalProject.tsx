import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Image as ImageIcon,
  File,
  Download,
  Eye,
  PenLine,
  DollarSign,
  Calendar,
  Send,
  MessageCircle,
  User,
  Building,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProjectWithDetails, ChangeOrder, ProjectDelivery, ProjectFile, ProjectMessage } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  in_progress: "In Progress",
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
  pending_approval: "bg-amber-100 text-amber-800",
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
  ordered: "bg-amber-100 text-amber-800",
  shipped: "bg-blue-100 text-blue-800",
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [approveChangeOrder, setApproveChangeOrder] = useState<ChangeOrder | null>(null);
  const [rejectChangeOrder, setRejectChangeOrder] = useState<ChangeOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [newMessage, setNewMessage] = useState({ subject: "", content: "" });

  // ── Data queries ──────────────────────────────

  const { data: project, isLoading, isError } = useQuery<ProjectWithDetails>({
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

  const { data: messages = [] } = useQuery<ProjectMessage[]>({
    queryKey: ["/api/portal/projects", projectId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages/unread-count`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });

  // ── Mutations ─────────────────────────────────

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
      clearCanvas();
      toast({ title: "Change order approved", description: "Your approval has been recorded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: number; rejection_reason: string }) => {
      const res = await fetch(`/api/portal/change-orders/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rejection_reason }),
      });
      if (!res.ok) throw new Error("Failed to reject change order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "change-orders"] });
      setRejectChangeOrder(null);
      setRejectionReason("");
      toast({ title: "Change order rejected", description: "Your response has been recorded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { subject?: string; content: string }) => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"] });
      setNewMessage({ subject: "", content: "" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/portal/projects/${projectId}/messages/mark-read`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"] });
    },
  });

  // ── Effects ───────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeTab === "messages" && unreadData?.count && unreadData.count > 0) {
      markReadMutation.mutate();
    }
  }, [activeTab, unreadData?.count]);

  // ── Handlers ──────────────────────────────────

  const togglePhase = (phaseId: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

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

  const handleReject = () => {
    if (!rejectChangeOrder || !rejectionReason.trim()) return;
    rejectMutation.mutate({ id: rejectChangeOrder.id, rejection_reason: rejectionReason });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) return;
    sendMessageMutation.mutate({ subject: newMessage.subject || undefined, content: newMessage.content });
  };

  // Canvas drawing with mouse + touch support
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    canvas.dataset.drawing = "true";
  }, [getCanvasCoords]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || canvas.dataset.drawing !== "true") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }, [getCanvasCoords]);

  const stopDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.dataset.drawing = "false";
  }, []);

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  // ── Filtered data ─────────────────────────────

  const visibleChangeOrders = changeOrders.filter((co: any) => co.client_visible !== "no");
  const visibleDeliveries = deliveries.filter((d: any) => d.client_visible !== "no");
  const photoFiles = files.filter((f: any) => f.is_photo === "yes" || (f.mime_type && f.mime_type.startsWith("image/")));
  const documentFiles = files.filter((f: any) => f.is_photo !== "yes" && !(f.mime_type && f.mime_type.startsWith("image/")));
  const pendingChangeOrders = visibleChangeOrders.filter((co) => co.status === "pending_approval");

  // ── Loading & Error states ────────────────────

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PortalLayout>
    );
  }

  if (isError || !project) {
    return (
      <PortalLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-medium mb-2">{isError ? "Something went wrong" : "Project not found"}</h2>
          <p className="text-muted-foreground mb-4">{isError ? "Please refresh the page to try again." : "This project may have been removed."}</p>
          <Button onClick={() => setLocation("/portal")}>Back to Projects</Button>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Button variant="outline" size="sm" className="shrink-0 mt-1" onClick={() => setLocation("/portal")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1">
              <h1 className="text-xl sm:text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground text-sm">{project.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={project.overall_progress} className="flex-1 h-3" />
              <span className="text-lg font-semibold min-w-[50px] text-right">
                {project.overall_progress}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="w-auto inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages" className="relative">
                Messages
                {unreadData?.count ? (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                    {unreadData.count}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="files">Files & Photos</TabsTrigger>
              <TabsTrigger value="change-orders">
                Change Orders
                {pendingChangeOrders.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                    {pendingChangeOrders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab 1: Overview ─────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {(() => {
              const clientPhases = project.phases.filter((p) => p.client_visible === "yes");
              const progress = project.progress || 0;
              const activePhase = clientPhases.find((p) => p.status === "in_progress");
              const allComplete = clientPhases.length > 0 && clientPhases.every((p) => p.status === "completed");

              // Status message
              const statusMessage = allComplete
                ? "Your project is complete. Thank you for choosing Artisan Tile!"
                : progress > 75
                  ? "Your project is in the final stages. We're almost done!"
                  : progress > 0
                    ? "Work is underway on your project. We'll notify you when the next milestone is reached."
                    : "Your project is getting started — we'll keep you updated as things progress.";

              if (clientPhases.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No phases available to display yet.</p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <>
                  {/* Progress bar + status */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        Your project is {progress}% complete
                      </p>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Phase journey — vertical stepper */}
                  <Card>
                    <CardContent className="py-5 px-5">
                      <div className="space-y-0">
                        {clientPhases.map((phase, idx) => {
                          const isCompleted = phase.status === "completed";
                          const isCurrent = phase.status === "in_progress";
                          const isUpcoming = !isCompleted && !isCurrent;

                          return (
                            <div key={phase.id} className="flex items-stretch gap-4">
                              {/* Vertical line + icon column */}
                              <div className="flex flex-col items-center">
                                {/* Icon */}
                                <div className={cn(
                                  "flex items-center justify-center w-7 h-7 rounded-full shrink-0 border-2",
                                  isCompleted && "bg-green-100 border-green-500",
                                  isCurrent && "bg-blue-100 border-blue-500",
                                  isUpcoming && "bg-muted border-muted-foreground/30",
                                )}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : isCurrent ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                                  )}
                                </div>
                                {/* Connector line (not on last item) */}
                                {idx < clientPhases.length - 1 && (
                                  <div className={cn(
                                    "w-0.5 flex-1 min-h-[24px]",
                                    isCompleted ? "bg-green-300" : "bg-muted-foreground/15",
                                  )} />
                                )}
                              </div>

                              {/* Phase name + label */}
                              <div className={cn(
                                "pb-5 pt-1",
                                idx === clientPhases.length - 1 && "pb-0",
                              )}>
                                <p className={cn(
                                  "text-sm leading-tight",
                                  isCompleted && "text-muted-foreground",
                                  isCurrent && "font-semibold text-foreground",
                                  isUpcoming && "text-muted-foreground",
                                )}>
                                  {phase.name}
                                </p>
                                <p className={cn(
                                  "text-xs mt-0.5",
                                  isCompleted && "text-green-600",
                                  isCurrent && "text-blue-600 font-medium",
                                  isUpcoming && "text-muted-foreground/60",
                                )}>
                                  {isCompleted ? "Completed" : isCurrent ? "In Progress" : "Coming up"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Friendly status message */}
                  <p className="text-sm text-muted-foreground text-center px-4">
                    {allComplete && "🎉 "}{statusMessage}
                  </p>
                </>
              );
            })()}
          </TabsContent>

          {/* ── Tab 2: Messages ─────────────────── */}
          <TabsContent value="messages" className="mt-4">
            <Card className="flex flex-col" style={{ height: "min(600px, 70vh)" }}>
              <CardHeader className="flex-none border-b py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Send a message to contact your project team</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex gap-2 sm:gap-3", message.sender_type === "client" ? "flex-row-reverse" : "")}
                        >
                          <div
                            className={cn(
                              "shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
                              message.sender_type === "client" ? "bg-primary text-primary-foreground" : "bg-muted",
                            )}
                          >
                            {message.sender_type === "client" ? <User className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
                          </div>
                          <div className={cn("flex-1 max-w-[85%] sm:max-w-[75%]", message.sender_type === "client" ? "text-right" : "")}>
                            <div
                              className={cn(
                                "inline-block rounded-lg p-2.5 sm:p-3 text-left",
                                message.sender_type === "client" ? "bg-primary text-primary-foreground" : "bg-muted",
                              )}
                            >
                              {message.subject && <p className="font-medium mb-1 text-xs sm:text-sm">{message.subject}</p>}
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-1.5 mt-1 text-[10px] sm:text-xs text-muted-foreground",
                                message.sender_type === "client" ? "justify-end" : "",
                              )}
                            >
                              <span>{message.sender_type === "admin" ? "Project Team" : "You"}</span>
                              <span>&middot;</span>
                              <span>{format(new Date(message.created_at), "MMM d, h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="flex-none border-t p-3">
                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <Input
                      placeholder="Subject (optional)"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                      className="text-sm h-8"
                    />
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage.content}
                        onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                        rows={2}
                        className="flex-1 resize-none text-sm"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="h-auto self-end"
                        disabled={sendMessageMutation.isPending || !newMessage.content.trim()}
                      >
                        {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Files & Photos ──────────── */}
          <TabsContent value="files" className="space-y-6 mt-4">
            {files.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Files Yet</h3>
                  <p className="text-muted-foreground">Project files and photos will appear here as they are uploaded.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {photoFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Photos ({photoFiles.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photoFiles.map((file) => (
                        <div
                          key={file.id}
                          className="relative group aspect-square border rounded-lg overflow-hidden bg-muted cursor-pointer"
                          onClick={() => setPreviewFile(file)}
                        >
                          {file.thumbnail_url || file.file_url ? (
                            <img src={file.thumbnail_url || file.file_url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
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

                {documentFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Documents ({documentFiles.length})</h3>
                    <div className="space-y-2">
                      {documentFiles.map((file) => (
                        <Card key={file.id}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <File className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              {file.description && <p className="text-xs text-muted-foreground truncate">{file.description}</p>}
                            </div>
                            {file.file_url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => window.open(file.file_url, "_blank")}>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 4: Change Orders ───────────── */}
          <TabsContent value="change-orders" className="space-y-4 mt-4">
            {visibleChangeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Change Orders</h3>
                  <p className="text-muted-foreground">Any change orders for your project will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleChangeOrders.map((co) => (
                  <Card key={co.id} className={co.status === "pending_approval" ? "border-amber-300" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-sm sm:text-base">CO-{co.co_number}: {co.title}</span>
                              <Badge className={changeOrderStatusColors[co.status || "draft"]}>
                                {changeOrderStatusLabels[co.status || "draft"]}
                              </Badge>
                            </div>
                            {co.description && <p className="text-sm text-muted-foreground mb-2">{co.description}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          {co.cost_impact && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(co.cost_impact)}
                            </span>
                          )}
                          {co.time_impact_days && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              +{co.time_impact_days} days
                            </span>
                          )}
                        </div>

                        {co.status === "pending_approval" && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={() => setApproveChangeOrder(co)}>
                              <PenLine className="h-4 w-4 mr-1" />
                              Sign & Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectChangeOrder(co)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {co.status === "rejected" && co.rejection_reason && (
                          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                            Rejection reason: {co.rejection_reason}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 5: Deliveries ──────────────── */}
          <TabsContent value="deliveries" className="space-y-4 mt-4">
            {visibleDeliveries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Deliveries Yet</h3>
                  <p className="text-muted-foreground">Material deliveries for your project will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleDeliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm sm:text-base">{delivery.description}</span>
                            <Badge className={deliveryStatusColors[delivery.status || "pending"]}>
                              {deliveryStatusLabels[delivery.status || "pending"]}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
          <div className="space-y-4 py-2">
            {approveChangeOrder?.description && <p className="text-sm">{approveChangeOrder.description}</p>}
            <div className="flex gap-4 text-sm">
              {approveChangeOrder?.cost_impact && (
                <span>Cost: <strong>{formatCurrency(approveChangeOrder.cost_impact)}</strong></span>
              )}
              {approveChangeOrder?.time_impact_days && (
                <span>Time: <strong>+{approveChangeOrder.time_impact_days} days</strong></span>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sign below to approve:</p>
              <canvas
                ref={canvasRef}
                width={350}
                height={150}
                className="border rounded-lg bg-white w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <Button variant="outline" size="sm" onClick={clearCanvas}>Clear Signature</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveChangeOrder(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Order Rejection Dialog */}
      <Dialog open={!!rejectChangeOrder} onOpenChange={(open) => !open && setRejectChangeOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              CO-{rejectChangeOrder?.co_number}: {rejectChangeOrder?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Please provide a reason for rejection:</p>
              <Textarea
                placeholder="Enter your reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectChangeOrder(null); setRejectionReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectionReason.trim()}>
              {rejectMutation.isPending ? "Rejecting..." : "Reject Change Order"}
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
          <div className="flex items-center justify-center min-h-[200px]">
            {previewFile?.file_url && (
              <img src={previewFile.file_url} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
