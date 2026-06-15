import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from "./hooks";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Settings,
  Trash2,
  Loader2,
  User,
  Calendar,
  FolderKanban,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Hammer,
  CalendarRange,
} from "lucide-react";
import { ProjectFiles } from "./components/ProjectFiles";
import { ProjectSpecs } from "./components/ProjectSpecs";

const statusColors: Record<string, string> = {
  planning: "bg-secondary text-secondary-foreground border border-secondary-border",
  active: "bg-green-100 text-green-700 border border-green-200",
  in_progress: "bg-green-100 text-green-700 border border-green-200",
  on_hold: "bg-amber-100 text-amber-800 border border-amber-200",
  completed: "bg-brass-muted text-brass border border-brass/20",
  cancelled: "bg-muted text-muted-foreground border border-border",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const typeLabels: Record<string, string> = {
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  floor: "Flooring",
  full_reno: "Full Renovation",
  custom: "Custom",
};

const PROJECT_TYPES = ["bathroom", "kitchen", "floor", "full_reno", "custom"];

function fmtMoney(v: string | number | null | undefined): string | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!n || isNaN(n) || n <= 0) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const { data: project, isLoading } = useProject(projectId);
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [editedProject, setEditedProject] = useState({
    name: "",
    description: "",
    status: "active",
    project_type: "",
    site_address: "",
    estimated_start_date: "",
    estimated_end_date: "",
    estimated_value: "",
  });

  const canManageProjects = hasPermission("manage_projects");

  const handleUpdateProject = async () => {
    if (!project) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: projectId,
        data: {
          name: editedProject.name,
          description: editedProject.description || null,
          status: editedProject.status,
          project_type: editedProject.project_type || null,
          site_address: editedProject.site_address || null,
          estimated_start_date: editedProject.estimated_start_date || null,
          estimated_end_date: editedProject.estimated_end_date || null,
          original_estimate: editedProject.estimated_value ? editedProject.estimated_value : null,
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

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast({
        title: "Project Deleted",
        description: `${project.name} has been deleted.`,
      });
      setLocation("/projects");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete project.",
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/projects")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
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
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setEditedProject({
                  name: project.name,
                  description: project.description || "",
                  status: project.status,
                  project_type: project.project_type || "",
                  site_address: project.site_address || "",
                  estimated_start_date: project.estimated_start_date || "",
                  estimated_end_date: project.estimated_end_date || "",
                  estimated_value: project.original_estimate ? String(project.original_estimate) : "",
                });
                setIsEditingProject(true);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsDeleteProjectOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* At a glance — surfaces the project's key facts so the page never feels empty */}
      <Card>
        <CardContent className="p-5">
          {typeof project.overall_progress === "number" && project.overall_progress > 0 && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                <span className="nums font-semibold text-foreground">{project.overall_progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brass" style={{ width: `${Math.min(100, project.overall_progress)}%` }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact icon={<Hammer className="h-4 w-4" />} label="Type" value={project.project_type ? (typeLabels[project.project_type] || project.project_type) : null} />
            <Fact icon={<DollarSign className="h-4 w-4" />} label="Estimated Value" value={fmtMoney(project.original_estimate)} accent />
            <Fact icon={<CalendarRange className="h-4 w-4" />} label="Target Window" value={targetWindow(project.estimated_start_date, project.estimated_end_date)} />
            <Fact icon={<MapPin className="h-4 w-4" />} label="Site Address" value={project.site_address || null} />
            <Fact icon={<Mail className="h-4 w-4" />} label="Client Email" value={project.customer.email || null} />
            <Fact icon={<Phone className="h-4 w-4" />} label="Client Phone" value={project.customer.phone || null} />
          </div>
        </CardContent>
      </Card>

      {/* Description (if present) */}
      {project.description && (
        <Card>
          <CardContent className="pt-6 text-sm whitespace-pre-wrap">
            {project.description}
          </CardContent>
        </Card>
      )}

      {/* Bathroom Specifications — the spec sheet (Claudia) */}
      <ProjectSpecs projectId={projectId} />

      {/* Files & Photos */}
      <ProjectFiles
        projectId={projectId}
        phases={project.phases}
        canManage={canManageProjects}
      />

      {/* Edit Project Dialog */}
      <Dialog open={isEditingProject} onOpenChange={setIsEditingProject}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                value={editedProject.name}
                onChange={(e) =>
                  setEditedProject({ ...editedProject, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Project Type</Label>
                <Select
                  value={editedProject.project_type}
                  onValueChange={(value) => setEditedProject({ ...editedProject, project_type: value })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-value">Estimated Value</Label>
                <Input
                  id="edit-value"
                  type="number"
                  min="0"
                  placeholder="$"
                  value={editedProject.estimated_value}
                  onChange={(e) => setEditedProject({ ...editedProject, estimated_value: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-site-address">Site Address</Label>
              <Input
                id="edit-site-address"
                placeholder="123 Main St, Town, CT"
                value={editedProject.site_address}
                onChange={(e) => setEditedProject({ ...editedProject, site_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Target Start</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editedProject.estimated_start_date}
                  onChange={(e) => setEditedProject({ ...editedProject, estimated_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Target Finish</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={editedProject.estimated_end_date}
                  onChange={(e) => setEditedProject({ ...editedProject, estimated_end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editedProject.description}
                onChange={(e) =>
                  setEditedProject({
                    ...editedProject,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editedProject.status}
                onValueChange={(value) =>
                  setEditedProject({ ...editedProject, status: value })
                }
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
            <Button
              variant="outline"
              onClick={() => setIsEditingProject(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProject}
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog
        open={isDeleteProjectOpen}
        onOpenChange={setIsDeleteProjectOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{project.name}&rdquo; and all
              its files, specs, and related data. This action cannot be undone.
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

function targetWindow(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = fmtDate(start);
  const e = fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `Starts ${s}`;
  if (e) return `Due ${e}`;
  return null;
}

function Fact({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground/60">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {value ? (
          <p className={`truncate text-sm ${accent ? "font-semibold text-brass" : "text-foreground"}`} title={value}>
            {value}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/40">Not set</p>
        )}
      </div>
    </div>
  );
}
