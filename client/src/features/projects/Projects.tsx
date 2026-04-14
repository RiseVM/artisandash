import { useState } from "react";
import { useLocation } from "wouter";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProjectTemplates,
  useCreateProjectFromTemplate,
} from "./hooks";
import { useCustomers, useCreateCustomer } from "../customers/hooks";
import { useAuth } from "@/features/auth/hooks";
import { useSendPortalSetupEmail } from "@/features/portal/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Search,
  Plus,
  FolderKanban,
  Loader2,
  ChevronRight,
  Calendar,
  User,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectTemplates } from "./ProjectTemplates";
import type { ProjectWithCustomer } from "@shared/schema";

const statusColors: Record<string, string> = {
  planning: "bg-purple-100 text-purple-800",
  in_progress: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const phaseStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-500",
};

export function Projects() {
  const [, setLocation] = useLocation();
  const { hasPermission, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useProjects();
  const { data: customers = [] } = useCustomers();
  const { data: templates = [] } = useProjectTemplates();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const createFromTemplateMutation = useCreateProjectFromTemplate();
  const deleteProjectMutation = useDeleteProject();
  const createCustomerMutation = useCreateCustomer();
  const sendPortalSetupMutation = useSendPortalSetupEmail();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectWithCustomer | null>(null);
  const [deleteProject, setDeleteProject] = useState<ProjectWithCustomer | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateDefaultApplied, setTemplateDefaultApplied] = useState(false);
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });
  const [newProject, setNewProject] = useState({
    name: "",
    customer_id: 0,
    description: "",
    status: "planning",
  });
  const [editedProject, setEditedProject] = useState({
    name: "",
    customer_id: 0,
    description: "",
    status: "planning",
  });

  const activeTemplates = templates.filter(t => t.is_active === "yes");

  // Auto-select the first active template as default
  if (activeTemplates.length > 0 && !templateDefaultApplied && selectedTemplateId === null) {
    setSelectedTemplateId(activeTemplates[0].id);
    setTemplateDefaultApplied(true);
  }

  const canManageProjects = hasPermission("manage_projects");

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.customer_id) {
      toast({
        title: "Error",
        description: "Please enter a project name and select a customer.",
        variant: "destructive",
      });
      return;
    }

    try {
      let project;
      if (selectedTemplateId) {
        // Create from template
        project = await createFromTemplateMutation.mutateAsync({
          templateId: selectedTemplateId,
          data: {
            name: newProject.name,
            customer_id: newProject.customer_id,
            description: newProject.description || null,
            status: newProject.status,
          },
        });
      } else {
        // Create blank project
        project = await createProjectMutation.mutateAsync({
          name: newProject.name,
          customer_id: newProject.customer_id,
          description: newProject.description || null,
          status: newProject.status,
        });
      }
      setIsAddOpen(false);
      setNewProject({ name: "", customer_id: 0, description: "", status: "planning" });
      setSelectedTemplateId(null);
      setTemplateDefaultApplied(false);
      toast({ title: "Project Created", description: `${project.name} has been created.` });
      // Navigate to the new project
      setLocation(`/projects/${project.id}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create project.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteProject) return;
    try {
      await deleteProjectMutation.mutateAsync(deleteProject.id);
      toast({ title: "Project Deleted", description: `${deleteProject.name} has been deleted.` });
      setDeleteProject(null);
    } catch (err: any) {
      setDeleteProject(null);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  const handleSendPortalInvite = async (project: ProjectWithCustomer) => {
    if (!project.customer.email) {
      toast({ title: "Customer email not found", variant: "destructive" });
      return;
    }

    try {
      await sendPortalSetupMutation.mutateAsync({
        customer_email: project.customer.email,
        customer_name: project.customer.name,
        context: 'project',
        context_details: project.name,
      });
      toast({ title: "Portal invitation sent" });
    } catch (err) {
      toast({
        title: "Error sending portal invitation",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditProject = (project: ProjectWithCustomer) => {
    setEditedProject({
      name: project.name,
      customer_id: project.customer_id,
      description: project.description || "",
      status: project.status,
    });
    setEditProject(project);
  };

  const handleUpdateProject = async () => {
    if (!editProject) return;
    if (!editedProject.name || !editedProject.customer_id) {
      toast({
        title: "Error",
        description: "Please enter a project name and select a customer.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        id: editProject.id,
        data: {
          name: editedProject.name,
          customer_id: editedProject.customer_id,
          description: editedProject.description || null,
          status: editedProject.status,
        },
      });
      setEditProject(null);
      toast({ title: "Project Updated", description: `${editedProject.name} has been updated.` });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update project.",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage and track your client projects</p>
        </div>
      </div>

      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Layers className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          {isAuthenticated && (
            <div className="flex justify-end">
              <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projects ({filteredProjects.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(project as any).currentPhaseName ? (
                          <Badge className={phaseStatusColors[(project as any).currentPhaseStatus] || "bg-gray-100 text-gray-800"}>
                            {(project as any).currentPhaseName}
                          </Badge>
                        ) : (
                          <Badge className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                        )}
                        {canManageProjects && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditProject(project);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendPortalInvite(project);
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Send Portal Invite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteProject(project);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <User className="h-3 w-3" />
                      {project.customer.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={project.overall_progress} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-10">
                        {project.overall_progress}%
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/projects/${project.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{project.name}</div>
                              {project.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {project.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {project.customer.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(project as any).currentPhaseName ? (
                            <div>
                              <Badge className={phaseStatusColors[(project as any).currentPhaseStatus] || "bg-gray-100 text-gray-800"}>
                                {(project as any).currentPhaseName}
                              </Badge>
                            </div>
                          ) : (
                            <Badge className={statusColors[project.status]}>
                              {statusLabels[project.status]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={project.overall_progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground w-10">
                              {project.overall_progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {canManageProjects ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditProject(project);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteProject(project);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="templates">
          <ProjectTemplates />
        </TabsContent>
      </Tabs>

      {/* Add Project Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open);
        if (!open) {
          setSelectedTemplateId(null);
          setTemplateDefaultApplied(false);
          setNewProject({ name: "", customer_id: 0, description: "", status: "planning" });
          setIsAddingNewClient(false);
          setNewClient({ name: "", email: "", phone: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template">Start from Template</Label>
                <Select
                  value={selectedTemplateId?.toString() || "blank"}
                  onValueChange={(value) => setSelectedTemplateId(value === "blank" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Blank Project
                      </div>
                    </SelectItem>
                    {activeTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    Project will be created with phases and tasks from the template.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen Renovation"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              {!isAddingNewClient ? (
                <>
                  <Select
                    value={newProject.customer_id ? newProject.customer_id.toString() : ""}
                    onValueChange={(value) => {
                      if (value === "new") {
                        setIsAddingNewClient(true);
                      } else {
                        setNewProject({ ...newProject, customer_id: parseInt(value) });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <UserPlus className="h-4 w-4" />
                          + Add New Client
                        </div>
                      </SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">New Client</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingNewClient(false);
                        setNewClient({ name: "", email: "", phone: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Input
                    placeholder="Client name *"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  <Input
                    placeholder="Email *"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!newClient.name || !newClient.email || createCustomerMutation.isPending}
                    onClick={async () => {
                      try {
                        const customer = await createCustomerMutation.mutateAsync({
                          name: newClient.name,
                          email: newClient.email,
                          phone: newClient.phone || null,
                          address: null,
                          notes: null,
                        });
                        setNewProject({ ...newProject, customer_id: customer.id });
                        setIsAddingNewClient(false);
                        setNewClient({ name: "", email: "", phone: "" });
                        toast({ title: "Client Created", description: `${customer.name} has been added.` });
                      } catch (err: any) {
                        toast({ title: "Error", description: err?.message || "Failed to create client.", variant: "destructive" });
                      }
                    }}
                  >
                    {createCustomerMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><UserPlus className="h-4 w-4 mr-2" />Add Client</>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief project description..."
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newProject.status}
                onValueChange={(value) => setNewProject({ ...newProject, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending || createFromTemplateMutation.isPending}>
              {(createProjectMutation.isPending || createFromTemplateMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Kitchen Renovation"
                value={editedProject.name}
                onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer *</Label>
              <Select
                value={editedProject.customer_id ? editedProject.customer_id.toString() : ""}
                onValueChange={(value) => setEditedProject({ ...editedProject, customer_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief project description..."
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
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProject} onOpenChange={(open) => !open && setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteProject?.name}" and all its phases and tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
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
