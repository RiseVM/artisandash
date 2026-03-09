import { useState } from "react";
import { useLocation } from "wouter";
import {
  useProjectTemplates,
  useProjectTemplate,
  useCreateProjectTemplate,
  useUpdateProjectTemplate,
  useDeleteProjectTemplate,
  useDuplicateProjectTemplate,
  useCreatePhaseTemplate,
  useUpdatePhaseTemplate,
  useDeletePhaseTemplate,
  useCreateTaskTemplate,
  useUpdateTaskTemplate,
  useDeleteTaskTemplate,
} from "./hooks";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Plus,
  FileText,
  Loader2,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit,
  Copy,
  ArrowLeft,
  ListChecks,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import type { ProjectTemplate, ProjectTemplateWithDetails, PhaseTemplate, TaskTemplate } from "@shared/schema";

export function ProjectTemplates() {
  const [, setLocation] = useLocation();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useProjectTemplates();

  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ProjectTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    startFrom: "default" as "default" | "blank",
  });

  const createTemplateMutation = useCreateProjectTemplate();
  const deleteTemplateMutation = useDeleteProjectTemplate();
  const duplicateTemplateMutation = useDuplicateProjectTemplate();

  const canManageProjects = hasPermission("manage_projects");

  // Find the "default" template for "Start from Default" option
  const defaultTemplate = templates.find(t => t.name === "default");

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(search.toLowerCase()) ||
    template.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      toast({
        title: "Error",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    try {
      let template;
      if (newTemplate.startFrom === "default" && defaultTemplate) {
        // Duplicate the default template, then rename it
        template = await duplicateTemplateMutation.mutateAsync(defaultTemplate.id);
        // Update the name and description of the duplicated template
        const { useUpdateProjectTemplate } = await import("./hooks");
        // We'll use a direct API call to rename
        const res = await fetch(`/api/project-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newTemplate.name,
            description: newTemplate.description || template.description,
          }),
        });
        if (res.ok) {
          template = await res.json();
        }
      } else {
        // Create blank template
        template = await createTemplateMutation.mutateAsync({
          name: newTemplate.name,
          description: newTemplate.description || null,
        });
      }
      setIsAddOpen(false);
      setNewTemplate({ name: "", description: "", startFrom: "default" });
      toast({ title: "Template Created", description: `${template.name} has been created.` });
      setEditingTemplateId(template.id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create template.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    try {
      const duplicated = await duplicateTemplateMutation.mutateAsync(template.id);
      toast({ title: "Template Duplicated", description: `"${template.name}" has been duplicated. You can now edit the copy.` });
      setEditingTemplateId(duplicated.id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to duplicate template.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTemplate) return;
    try {
      await deleteTemplateMutation.mutateAsync(deleteTemplate.id);
      toast({ title: "Template Deleted", description: `${deleteTemplate.name} has been deleted.` });
      setDeleteTemplate(null);
    } catch (err: any) {
      setDeleteTemplate(null);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete template.",
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

  // If editing a template, show the editor view
  if (editingTemplateId) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        onBack={() => setEditingTemplateId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Templates</h1>
          <p className="text-muted-foreground">Create reusable project structures with phases and tasks</p>
        </div>
        {canManageProjects && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates ({filteredTemplates.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
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
                  <TableHead>Template Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{template.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground truncate max-w-[200px] block">
                          {template.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.is_active === "yes" ? "default" : "secondary"}>
                          {template.is_active === "yes" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTemplateId(template.id)}
                            title="Edit template"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicateTemplate(template)}
                            disabled={duplicateTemplateMutation.isPending}
                            title="Duplicate template"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTemplate(template)}
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Add Template Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) setNewTemplate({ name: "", description: "", startFrom: "default" });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {defaultTemplate && (
              <div className="space-y-2">
                <Label>Start From</Label>
                <Select
                  value={newTemplate.startFrom}
                  onValueChange={(value: "default" | "blank") => setNewTemplate({ ...newTemplate, startFrom: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Default Template (copy all phases & tasks)
                      </div>
                    </SelectItem>
                    <SelectItem value="blank">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Blank Template
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {newTemplate.startFrom === "default" && (
                  <p className="text-xs text-muted-foreground">
                    Creates a copy of the default template with all phases and tasks. You can then customize it.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen Renovation"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief template description..."
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending || duplicateTemplateMutation.isPending}>
              {(createTemplateMutation.isPending || duplicateTemplateMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTemplate?.name}" and all its phases and tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
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

// Template Editor Component
function TemplateEditor({ templateId, onBack }: { templateId: number; onBack: () => void }) {
  const { toast } = useToast();
  const { data: template, isLoading } = useProjectTemplate(templateId);

  const updateTemplateMutation = useUpdateProjectTemplate();
  const createPhaseMutation = useCreatePhaseTemplate();
  const updatePhaseMutation = useUpdatePhaseTemplate();
  const deletePhaseMutation = useDeletePhaseTemplate();
  const createTaskMutation = useCreateTaskTemplate();
  const updateTaskMutation = useUpdateTaskTemplate();
  const deleteTaskMutation = useDeleteTaskTemplate();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState(false);

  // Add phase/task dialogs
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState<number | null>(null);
  const [newPhase, setNewPhase] = useState({ name: "", description: "" });
  const [newTask, setNewTask] = useState({ name: "", description: "" });

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

  const handleAddPhase = async () => {
    if (!newPhase.name) {
      toast({ title: "Error", description: "Phase name is required.", variant: "destructive" });
      return;
    }
    try {
      await createPhaseMutation.mutateAsync({
        templateId,
        data: { name: newPhase.name, description: newPhase.description || null },
      });
      setNewPhase({ name: "", description: "" });
      setIsAddPhaseOpen(false);
      toast({ title: "Phase Added", description: `${newPhase.name} has been added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add phase.", variant: "destructive" });
    }
  };

  const handleAddTask = async (phaseId: number) => {
    if (!newTask.name) {
      toast({ title: "Error", description: "Task name is required.", variant: "destructive" });
      return;
    }
    try {
      await createTaskMutation.mutateAsync({
        phaseId,
        templateId,
        data: { name: newTask.name, description: newTask.description || null },
      });
      setNewTask({ name: "", description: "" });
      setIsAddTaskOpen(null);
      toast({ title: "Task Added", description: `${newTask.name} has been added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add task.", variant: "destructive" });
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    try {
      await deletePhaseMutation.mutateAsync({ id: phaseId, templateId });
      toast({ title: "Phase Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete phase.", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTaskMutation.mutateAsync({ id: taskId, templateId });
      toast({ title: "Task Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete task.", variant: "destructive" });
    }
  };

  if (isLoading || !template) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground">{template.description || "No description"}</p>
        </div>
        <Button onClick={() => setIsAddPhaseOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Phase
        </Button>
      </div>

      {/* Phases List */}
      <div className="space-y-4">
        {template.phases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No phases yet. Add your first phase to get started.</p>
            </CardContent>
          </Card>
        ) : (
          template.phases.map((phase) => (
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
                        <div>
                          <CardTitle className="text-base">{phase.name}</CardTitle>
                          {phase.description && (
                            <CardDescription>{phase.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {phase.tasks.length} task{phase.tasks.length !== 1 ? "s" : ""}
                        </Badge>
                        {phase.client_visible === "yes" && (
                          <Badge variant="secondary">
                            <Eye className="h-3 w-3 mr-1" />
                            Visible
                          </Badge>
                        )}
                        {phase.requires_approval === "yes" && (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approval
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhase(phase.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {phase.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-background"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded border border-muted-foreground/30" />
                            <div>
                              <p className="font-medium">{task.name}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.client_visible === "yes" && (
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            )}
                            {task.requires_approval === "yes" && (
                              <CheckCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setIsAddTaskOpen(phase.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Add Phase Dialog */}
      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phase-name">Phase Name *</Label>
              <Input
                id="phase-name"
                placeholder="e.g., Design & Planning"
                value={newPhase.name}
                onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-description">Description</Label>
              <Textarea
                id="phase-description"
                placeholder="Brief phase description..."
                value={newPhase.description}
                onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPhaseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPhase} disabled={createPhaseMutation.isPending}>
              {createPhaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Phase"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskOpen !== null} onOpenChange={() => setIsAddTaskOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                placeholder="e.g., Review floor plan"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Brief task description..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => isAddTaskOpen !== null && handleAddTask(isAddTaskOpen)}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
