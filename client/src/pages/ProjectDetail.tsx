import { useState } from "react";
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
} from "@/hooks/use-api";
import { useAuth } from "@/hooks/useAuth";
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
  CheckCircle,
  Circle,
  Clock,
  FolderKanban,
  GripVertical,
} from "lucide-react";
import type { ProjectPhase, ProjectTask, ProjectPhaseWithTasks } from "@shared/schema";
import { ProjectDeliveries } from "@/components/ProjectDeliveries";
import { ProjectChangeOrders } from "@/components/ProjectChangeOrders";
import { ProjectTimeTracking } from "@/components/ProjectTimeTracking";
import { ProjectPricing } from "@/components/ProjectPricing";
import { ProjectFiles } from "@/components/ProjectFiles";
import ProjectActivityFeed from "@/components/ProjectActivityFeed";
import { ProjectMessages } from "@/components/ProjectMessages";
import { ProjectOutOfScope } from "@/components/ProjectOutOfScope";

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
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [deletePhase, setDeletePhase] = useState<ProjectPhase | null>(null);
  const [addTaskToPhase, setAddTaskToPhase] = useState<number | null>(null);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newTaskName, setNewTaskName] = useState("");

  const [editedProject, setEditedProject] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const [editedPhase, setEditedPhase] = useState({
    name: "",
    description: "",
    client_visible: "yes",
    requires_approval: "no",
    estimated_start: "",
    estimated_end: "",
  });

  const canManageProjects = hasPermission("manage_projects");

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
    const phaseIds = reorderedPhases.map((p) => p.id);

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
          name: editedProject.name,
          description: editedProject.description || null,
          status: editedProject.status,
        },
      });
      setIsEditingProject(false);
      toast({ title: "Project Updated" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update project.",
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-muted-foreground text-sm">
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
        {canManageProjects && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setEditedProject({
                name: project.name,
                description: project.description || "",
                status: project.status,
              });
              setIsEditingProject(true);
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Phases */}
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

      {/* Deliveries */}
      <ProjectDeliveries
        projectId={projectId}
        phases={project.phases}
        canManage={canManageProjects}
      />

      {/* Change Orders */}
      <ProjectChangeOrders
        projectId={projectId}
        phases={project.phases}
        canManage={canManageProjects}
      />

      {/* Time Tracking */}
      <ProjectTimeTracking
        projectId={projectId}
        phases={project.phases}
        canManage={canManageProjects}
      />

      {/* Pricing & Payments */}
      <ProjectPricing
        projectId={projectId}
        phases={project.phases}
        changeOrders={changeOrders}
        canManage={canManageProjects}
      />

      {/* Out of Scope Items */}
      <ProjectOutOfScope projectId={projectId} />

      {/* Files & Photos */}
      <ProjectFiles
        projectId={projectId}
        phases={project.phases}
        canManage={canManageProjects}
      />

      {/* Activity Feed */}
      <ProjectActivityFeed projectId={projectId} />

      {/* Client Messages */}
      <ProjectMessages projectId={projectId} />

      {/* Edit Project Dialog */}
      <Dialog open={isEditingProject} onOpenChange={setIsEditingProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={editedProject.name}
                onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editedProject.description}
                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editedProject.status}
                onValueChange={(value) => setEditedProject({ ...editedProject, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
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
    </div>
  );
}
