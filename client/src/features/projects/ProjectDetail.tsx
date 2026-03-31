import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useReorderPhases,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useChangeOrders,
} from "./hooks";
import { useAuth } from "@/features/auth/hooks";
import { useQuery } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Loader2,
  User,
  Calendar,
  Globe,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  CheckCircle,
  Circle,
  Clock,
  FolderKanban,
  GripVertical,
  Send,
} from "lucide-react";
import type { ProjectPhase, ProjectTask, ProjectPhaseWithTasks } from "@shared/schema";
import { ProjectDeliveries } from "./components/ProjectDeliveries";
import { ProjectChangeOrders } from "./components/ProjectChangeOrders";
import { ProjectTimeTracking } from "./components/ProjectTimeTracking";
import { ProjectPricing } from "./components/ProjectPricing";
import { ProjectFiles } from "./components/ProjectFiles";
import { ProjectActivityFeed } from "./components/ProjectActivityFeed";
import { ProjectMessages } from "./components/ProjectMessages";
import { ProjectOutOfScope } from "./components/ProjectOutOfScope";
import { NotesPanel } from "@/components/shared/NotesPanel";
import { InternalMessaging } from "@/components/shared/InternalMessaging";

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

const phaseStatusColors: Record<string, string> = {
  not_started: "border-gray-200 bg-white",
  in_progress: "border-blue-300 bg-blue-50",
  on_hold: "border-yellow-300 bg-yellow-50",
  completed: "border-green-300 bg-green-50",
  skipped: "border-gray-200 bg-gray-50 opacity-60",
};

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const { data: project, isLoading } = useProject(projectId);
  const { data: changeOrders = [] } = useChangeOrders(projectId);

  // Portal access for the project's customer
  const { data: portalAccess } = useQuery<any>({
    queryKey: ["/api/client-portal-access/customer", project?.customer_id],
    queryFn: async () => {
      const res = await fetch(`/api/client-portal-access/customer/${project?.customer_id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!project?.customer_id,
  });

  // Unread messages from client
  const { data: unreadMessages } = useQuery<{ count: number }>({
    queryKey: ["/api/portal/projects", projectId, "messages", "unread-admin"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages/unread-count`, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: !!projectId && !!portalAccess,
  });

  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createPhaseMutation = useCreatePhase();
  const updatePhaseMutation = useUpdatePhase();
  const deletePhaseMutation = useDeletePhase();
  const reorderPhasesMutation = useReorderPhases();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [deletePhase, setDeletePhase] = useState<ProjectPhase | null>(null);
  const [addTaskToPhase, setAddTaskToPhase] = useState<number | null>(null);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [activeTab, setActiveTab] = useState("progress");
  const [isEmailStatusOpen, setIsEmailStatusOpen] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState("");

  // Inline editable header state
  const [inlineProjectName, setInlineProjectName] = useState("");
  const [inlineProjectStatus, setInlineProjectStatus] = useState("");
  const [inlineProjectDescription, setInlineProjectDescription] = useState("");
  const [inlineEstimatedStartDate, setInlineEstimatedStartDate] = useState("");
  const [inlineEstimatedEndDate, setInlineEstimatedEndDate] = useState("");
  const [inlineSiteAddress, setInlineSiteAddress] = useState("");

  const [editedPhase, setEditedPhase] = useState({
    name: "",
    description: "",
    client_visible: "yes",
    requires_approval: "no",
    estimated_start: "",
    estimated_end: "",
  });

  const canManageProjects = hasPermission("manage_projects");

  // Initialize inline editable fields when project loads
  useEffect(() => {
    if (project) {
      setInlineProjectName(project.name);
      setInlineProjectStatus(project.status);
      setInlineProjectDescription(project.description || "");
      setInlineEstimatedStartDate(project.estimated_start_date || "");
      setInlineEstimatedEndDate(project.estimated_end_date || "");
      setInlineSiteAddress(project.site_address || "");
    }
  }, [project]);

  // Scroll to top when project loads — target the <main> scroll container
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [projectId]);

  // Check if project has been modified (dirty state)
  const isProjectDirty = !!(
    project && (
      inlineProjectName !== project.name ||
      inlineProjectStatus !== project.status ||
      inlineProjectDescription !== (project.description || "") ||
      inlineEstimatedStartDate !== (project.estimated_start_date || "") ||
      inlineEstimatedEndDate !== (project.estimated_end_date || "") ||
      inlineSiteAddress !== (project.site_address || "")
    )
  );

  const togglePhaseExpanded = (phaseId: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !project) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Reorder the phases array
    const reorderedPhases = Array.from(project.phases);
    const [removed] = reorderedPhases.splice(sourceIndex, 1);
    reorderedPhases.splice(destIndex, 0, removed);

    // Get the new order of phase IDs
    const phaseIds = reorderedPhases.map((p: any) => p.id);

    try {
      await reorderPhasesMutation.mutateAsync({ projectId, phaseIds });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to reorder phases.",
        variant: "destructive",
      });
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const handleUpdateProject = async () => {
    if (!project) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        data: {
          name: inlineProjectName,
          description: inlineProjectDescription || null,
          status: inlineProjectStatus,
          estimated_start_date: inlineEstimatedStartDate || null,
          estimated_end_date: inlineEstimatedEndDate || null,
          site_address: inlineSiteAddress || null,
        },
      });
      toast({ title: "Project Updated" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update project.",
        variant: "destructive",
      });
    }
  };

  const handleEmailProjectStatus = async () => {
    if (!emailStatusMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/status-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: emailStatusMessage }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      toast({ title: "Status email sent to client!" });
      setIsEmailStatusOpen(false);
      setEmailStatusMessage("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send status email.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast({ title: "Project Deleted", description: `${project.name} has been deleted.` });
      setLocation("/projects");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  const handleAddPhase = async () => {
    if (!newPhaseName.trim()) return;
    try {
      await createPhaseMutation.mutateAsync({
        projectId,
        data: { name: newPhaseName },
      });
      setNewPhaseName("");
      setIsAddPhaseOpen(false);
      toast({ title: "Phase Added" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to add phase.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePhaseStatus = async (phase: ProjectPhase, newStatus: string) => {
    try {
      await updatePhaseMutation.mutateAsync({
        id: phase.id,
        projectId,
        data: { status: newStatus },
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update phase.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePhase = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deletePhase) return;
    try {
      await deletePhaseMutation.mutateAsync({ id: deletePhase.id, projectId });
      setDeletePhase(null);
      toast({ title: "Phase Deleted" });
    } catch (err: any) {
      setDeletePhase(null);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete phase.",
        variant: "destructive",
      });
    }
  };

  const handleOpenPhaseSettings = (phase: ProjectPhase) => {
    setEditedPhase({
      name: phase.name,
      description: phase.description || "",
      client_visible: phase.client_visible,
      requires_approval: phase.requires_approval,
      estimated_start: phase.estimated_start || "",
      estimated_end: phase.estimated_end || "",
    });
    setEditingPhase(phase);
  };

  const handleSavePhaseSettings = async () => {
    if (!editingPhase) return;
    try {
      await updatePhaseMutation.mutateAsync({
        id: editingPhase.id,
        projectId,
        data: {
          name: editedPhase.name,
          description: editedPhase.description || null,
          client_visible: editedPhase.client_visible,
          requires_approval: editedPhase.requires_approval,
          estimated_start: editedPhase.estimated_start || null,
          estimated_end: editedPhase.estimated_end || null,
        },
      });
      setEditingPhase(null);
      toast({ title: "Phase Updated" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update phase.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !addTaskToPhase) return;
    try {
      await createTaskMutation.mutateAsync({
        phaseId: addTaskToPhase,
        projectId,
        data: { name: newTaskName },
      });
      setNewTaskName("");
      setAddTaskToPhase(null);
      toast({ title: "Task Added" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to add task.",
        variant: "destructive",
      });
    }
  };

  const handleToggleTaskStatus = async (task: ProjectTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        projectId,
        data: { status: newStatus },
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update task.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTaskMutation.mutateAsync({ id: taskId, projectId });
      toast({ title: "Task Deleted" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete task.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="link" onClick={() => setLocation("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with inline editing */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              {canManageProjects ? (
                <Input
                  value={inlineProjectName}
                  onChange={(e) => setInlineProjectName(e.target.value)}
                  className="font-bold text-xl sm:text-2xl h-auto px-2 py-1"
                  placeholder="Project Name"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold">{inlineProjectName}</h1>
              )}
              {canManageProjects ? (
                <Select value={inlineProjectStatus} onValueChange={setInlineProjectStatus}>
                  <SelectTrigger className="w-40 h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={statusColors[inlineProjectStatus]}>
                  {statusLabels[inlineProjectStatus]}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {project.customer.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Save Changes Button (floating, only visible when dirty) */}
        {canManageProjects && isProjectDirty && (
          <div className="flex gap-2">
            <Button
              onClick={handleUpdateProject}
              disabled={updateProjectMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInlineProjectName(project.name);
                setInlineProjectStatus(project.status);
                setInlineProjectDescription(project.description || "");
                setInlineEstimatedStartDate(project.estimated_start_date || "");
                setInlineEstimatedEndDate(project.estimated_end_date || "");
                setInlineSiteAddress(project.site_address || "");
              }}
            >
              Discard Changes
            </Button>
          </div>
        )}

        {/* Delete Project Button */}
        {canManageProjects && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
            onClick={() => setIsDeleteProjectOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        )}
      </div>

      {/* Client & Project Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Details (Read-Only) */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Client Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{project.customer.name}</span>
                </div>
                {project.customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${project.customer.email}`} className="text-sm text-blue-600 hover:underline">{project.customer.email}</a>
                  </div>
                )}
                {project.customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${project.customer.phone}`} className="text-sm text-blue-600 hover:underline">{project.customer.phone}</a>
                  </div>
                )}
                {project.customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{project.customer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Info (Editable) */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Project Info</h3>
              <div className="space-y-3">
                {project.created_by_user_name && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">Assigned to <span className="font-medium">{project.created_by_user_name.split("@")[0]}</span></span>
                  </div>
                )}

                {/* Description - Editable */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                  {canManageProjects ? (
                    <Textarea
                      value={inlineProjectDescription}
                      onChange={(e) => setInlineProjectDescription(e.target.value)}
                      placeholder="Add project description..."
                      className="text-sm min-h-20"
                    />
                  ) : (
                    inlineProjectDescription && <p className="text-sm text-muted-foreground">{inlineProjectDescription}</p>
                  )}
                </div>

                {/* Estimated Dates - Editable */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Est. Start</Label>
                    {canManageProjects ? (
                      <Input
                        type="date"
                        value={inlineEstimatedStartDate}
                        onChange={(e) => setInlineEstimatedStartDate(e.target.value)}
                        className="text-sm h-8"
                      />
                    ) : (
                      <span className="text-sm">{inlineEstimatedStartDate || "—"}</span>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Est. End</Label>
                    {canManageProjects ? (
                      <Input
                        type="date"
                        value={inlineEstimatedEndDate}
                        onChange={(e) => setInlineEstimatedEndDate(e.target.value)}
                        className="text-sm h-8"
                      />
                    ) : (
                      <span className="text-sm">{inlineEstimatedEndDate || "—"}</span>
                    )}
                  </div>
                </div>

                {/* Site Address - Editable */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Site Address</Label>
                  {canManageProjects ? (
                    <Input
                      value={inlineSiteAddress}
                      onChange={(e) => setInlineSiteAddress(e.target.value)}
                      placeholder="Project site address..."
                      className="text-sm h-8"
                    />
                  ) : (
                    inlineSiteAddress && <span className="text-sm">{inlineSiteAddress}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-bold">{project.overall_progress}%</span>
                </div>
                <Progress value={project.overall_progress} className="h-3" />
              </div>
              <div className="flex sm:flex-col gap-4 sm:gap-0 justify-around sm:justify-start">
                <div className="text-center sm:text-right">
                  <div className="text-xl sm:text-2xl font-bold">{project.phases.length}</div>
                  <div className="text-sm text-muted-foreground">Phases</div>
                </div>
                <div className="text-center sm:text-right">
                  <div className="text-xl sm:text-2xl font-bold">
                    {project.phases.reduce((sum, p) => sum + p.tasks.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Tasks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Project Status Button */}
          {canManageProjects && (
            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={() => setIsEmailStatusOpen(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Email Project Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Portal Info */}
      {portalAccess && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Client Portal Active</p>
                  <p className="text-xs text-muted-foreground">{portalAccess.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadMessages?.count ? (
                  <Badge variant="destructive" className="gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {unreadMessages.count} unread
                  </Badge>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/portal/project/${projectId}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View as Client
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Progress Tab - Phases & Tasks */}
        <TabsContent value="progress">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Project Phases</CardTitle>
                {canManageProjects && (
                  <Button size="sm" onClick={() => setIsAddPhaseOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Phase
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {project.phases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No phases yet. Add a phase to start tracking progress.
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="phases">
                    {(provided) => (
                      <div
                        className="space-y-2"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {project.phases.map((phase, index) => (
                          <Draggable
                            key={phase.id}
                            draggableId={`phase-${phase.id}`}
                            index={index}
                            isDragDisabled={!canManageProjects}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border rounded-lg ${phaseStatusColors[phase.status]} ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : ""
                                }`}
                              >
                                {/* Phase Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center p-3 gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {canManageProjects && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                    )}
                                    <button
                                      onClick={() => togglePhaseExpanded(phase.id)}
                                      className="p-1 hover:bg-black/5 rounded shrink-0"
                                    >
                                      {expandedPhases.has(phase.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>

                                    <span className="shrink-0">{getPhaseStatusIcon(phase.status)}</span>

                                    <span className="font-medium truncate">{phase.name}</span>

                                    {phase.requires_approval === "yes" && (
                                      <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                                        Approval Required
                                      </Badge>
                                    )}
                                    {phase.client_visible === "no" && (
                                      <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                                        Internal Only
                                      </Badge>
                                    )}
                                  </div>

                          <div className="flex items-center gap-2 pl-8 sm:pl-0">
                            <div className="flex items-center gap-2 flex-1 sm:flex-none">
                              <span className="text-sm text-muted-foreground">{phase.progress}%</span>
                              <Progress value={phase.progress} className="h-2 w-16 sm:w-20" />
                            </div>

                            {canManageProjects && (
                              <Select
                                value={phase.status}
                                onValueChange={(value) => handleUpdatePhaseStatus(phase, value)}
                              >
                                <SelectTrigger className="w-28 sm:w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="skipped">Skipped</SelectItem>
                                </SelectContent>
                              </Select>
                            )}

                            {canManageProjects && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPhaseSettings(phase);
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}

                            {canManageProjects && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletePhase(phase);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Phase Tasks */}
                        {expandedPhases.has(phase.id) && (
                          <div className="px-4 pb-3 border-t">
                            <div className="mt-3 space-y-2">
                              {phase.tasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No tasks in this phase.</p>
                              ) : (
                                phase.tasks.map((task) => (
                                  <div key={task.id} className="flex items-center gap-2 py-1 group">
                                    <Checkbox
                                      checked={task.status === "completed"}
                                      onCheckedChange={() => handleToggleTaskStatus(task)}
                                      disabled={!canManageProjects}
                                    />
                                    <span
                                      className={`flex-1 ${
                                        task.status === "completed" ? "line-through text-muted-foreground" : ""
                                      }`}
                                    >
                                      {task.name}
                                    </span>
                                    {task.due_date && (
                                      <span className="text-xs text-muted-foreground">
                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {canManageProjects && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteTask(task.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                              )}

                              {canManageProjects && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground mt-2"
                                  onClick={() => setAddTaskToPhase(phase.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Task
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliveries & Change Orders Tab */}
        <TabsContent value="deliveries" className="space-y-6">
          <ProjectDeliveries
            projectId={projectId}
            phases={project.phases}
            canManage={canManageProjects}
          />
          <ProjectChangeOrders
            projectId={projectId}
            phases={project.phases}
            canManage={canManageProjects}
          />
        </TabsContent>

        {/* Pricing & Payments Tab */}
        <TabsContent value="pricing">
          <ProjectPricing
            projectId={projectId}
            phases={project.phases}
            changeOrders={changeOrders}
            canManage={canManageProjects}
          />
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time">
          <ProjectTimeTracking
            projectId={projectId}
            phases={project.phases}
            canManage={canManageProjects}
          />
        </TabsContent>

        {/* Files & Photos Tab */}
        <TabsContent value="files">
          <ProjectFiles
            projectId={projectId}
            phases={project.phases}
            canManage={canManageProjects}
          />
        </TabsContent>

        {/* Messages & Notes Tab */}
        <TabsContent value="messages" className="space-y-6">
          <ProjectMessages projectId={projectId} />
          <InternalMessaging compact projectId={projectId} />
          <NotesPanel entityType="project" entityId={projectId} />
          <ProjectActivityFeed projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Email Project Status Dialog */}
      <Dialog open={isEmailStatusOpen} onOpenChange={setIsEmailStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Project Status to Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-message">Message</Label>
              <Textarea
                id="status-message"
                placeholder="Enter a status message to send to the client..."
                value={emailStatusMessage}
                onChange={(e) => setEmailStatusMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailStatusOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailProjectStatus} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Sending..." : "Send Status Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Phase Dialog */}
      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phase</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="phase-name">Phase Name</Label>
            <Input
              id="phase-name"
              placeholder="e.g., Design Review"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPhaseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPhase} disabled={createPhaseMutation.isPending}>
              {createPhaseMutation.isPending ? "Adding..." : "Add Phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={!!addTaskToPhase} onOpenChange={(open) => !open && setAddTaskToPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="task-name">Task Name</Label>
            <Input
              id="task-name"
              placeholder="e.g., Review tile samples"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskToPhase(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Phase Confirmation */}
      <AlertDialog open={!!deletePhase} onOpenChange={(open) => !open && setDeletePhase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletePhase?.name}" and all its tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phase Settings Dialog */}
      <Dialog open={!!editingPhase} onOpenChange={(open) => !open && setEditingPhase(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Phase Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phase-name">Phase Name</Label>
              <Input
                id="phase-name"
                value={editedPhase.name}
                onChange={(e) => setEditedPhase({ ...editedPhase, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-description">Description</Label>
              <Textarea
                id="phase-description"
                value={editedPhase.description}
                onChange={(e) => setEditedPhase({ ...editedPhase, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phase-start">Estimated Start</Label>
                <Input
                  id="phase-start"
                  type="date"
                  value={editedPhase.estimated_start}
                  onChange={(e) => setEditedPhase({ ...editedPhase, estimated_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase-end">Estimated End</Label>
                <Input
                  id="phase-end"
                  type="date"
                  value={editedPhase.estimated_end}
                  onChange={(e) => setEditedPhase({ ...editedPhase, estimated_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="client-visible"
                  checked={editedPhase.client_visible === "yes"}
                  onCheckedChange={(checked) =>
                    setEditedPhase({ ...editedPhase, client_visible: checked ? "yes" : "no" })
                  }
                />
                <Label htmlFor="client-visible" className="cursor-pointer">
                  Visible to client in portal
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requires-approval"
                  checked={editedPhase.requires_approval === "yes"}
                  onCheckedChange={(checked) =>
                    setEditedPhase({ ...editedPhase, requires_approval: checked ? "yes" : "no" })
                  }
                />
                <Label htmlFor="requires-approval" className="cursor-pointer">
                  Requires client approval to complete
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => {
                setEditingPhase(null);
                setDeletePhase(editingPhase);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Phase
            </Button>
            <Button variant="outline" onClick={() => setEditingPhase(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePhaseSettings} disabled={updatePhaseMutation.isPending}>
              {updatePhaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={isDeleteProjectOpen} onOpenChange={setIsDeleteProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all its phases, tasks, files, and related data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
