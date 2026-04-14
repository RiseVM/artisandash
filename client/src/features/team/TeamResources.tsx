import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useTeamMembers,
  useCreateTeamMember,
  useDeleteTeamMember,
  useTeamResources,
  useCreateTeamResource,
  useDeleteTeamResource,
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
  Users2,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  FileDown,
  FileText,
  BookOpen,
  Link as LinkIcon,
  Upload,
  Save,
  Search,
  ChevronRight,
  ClipboardList,
  Shield,
  Star,
  FolderOpen,
  Settings2,
} from "lucide-react";
import type { TeamMember, TeamResource } from "@shared/schema";

type TeamMemberWithProgress = TeamMember & { total_items: number; checked_items: number };

const categoryLabels: Record<string, string> = {
  setup: "Setup Documents",
  sop: "Standard Operating Procedures",
  policy: "Policies",
  standards: "Standards",
  other: "Other Resources",
};

const categoryShort: Record<string, string> = {
  setup: "Setup",
  sop: "SOPs",
  policy: "Policies",
  standards: "Standards",
  other: "Other",
};

const categoryIcons: Record<string, React.ReactNode> = {
  setup: <ClipboardList className="h-5 w-5" />,
  sop: <Settings2 className="h-5 w-5" />,
  policy: <Shield className="h-5 w-5" />,
  standards: <Star className="h-5 w-5" />,
  other: <FolderOpen className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  setup: "text-blue-600",
  sop: "text-green-600",
  policy: "text-orange-600",
  standards: "text-purple-600",
  other: "text-gray-600",
};

const categoryBadgeColors: Record<string, string> = {
  setup: "bg-blue-100 text-blue-800",
  sop: "bg-green-100 text-green-800",
  policy: "bg-orange-100 text-orange-800",
  standards: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
};

export function TeamResources() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"members" | "resources">("members");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users2 className="h-6 w-6 text-primary" />
            Team Resources
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Onboarding checklists and team resource library
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          New Member Setup
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "resources"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Resource Library
        </button>
      </div>

      {activeTab === "members" ? <MembersTab /> : <ResourcesTab />}
    </div>
  );
}

// ============================================
// MEMBERS TAB — Card-based list
// ============================================
function MembersTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: members = [], isLoading } = useTeamMembers() as { data: TeamMemberWithProgress[] | undefined; isLoading: boolean };
  const createMutation = useCreateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({
    employee_name: "",
    job_title: "",
    manager_name: "",
    start_date: "",
  });

  const handleCreate = async (navigate: boolean) => {
    if (!form.employee_name.trim()) return;
    try {
      const member = await createMutation.mutateAsync({
        employee_name: form.employee_name.trim(),
        job_title: form.job_title.trim() || null,
        manager_name: form.manager_name.trim() || null,
        start_date: form.start_date || null,
      } as any);
      setIsCreateOpen(false);
      setForm({ employee_name: "", job_title: "", manager_name: "", start_date: "" });
      toast({ title: "Team Member Added", description: form.employee_name });
      if (navigate) {
        setLocation(`/team/setup/${member.id}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast({ title: "Team Member Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            No team members added yet. Add your first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const total = m.total_items || 0;
            const checked = m.checked_items || 0;
            const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
            const isComplete = m.status === "complete";
            const isReady = !isComplete && pct === 100;

            return (
              <Card
                key={m.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/team/setup/${m.id}`)}
              >
                <div className="flex">
                  {/* Left accent bar */}
                  <div className={`w-1.5 shrink-0 ${isComplete ? "bg-green-500" : isReady ? "bg-blue-500" : "bg-blue-300"}`} />
                  <CardContent className="flex-1 py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{m.employee_name}</span>
                          {m.job_title && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">— {m.job_title}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {m.start_date && <span>Start: {m.start_date}</span>}
                          <span>{checked}/{total} items</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              isComplete ? "bg-green-500" : "bg-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          className={
                            isComplete
                              ? "bg-green-100 text-green-800"
                              : isReady
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {isComplete ? "Complete" : isReady ? "Ready" : `${pct}%`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hidden sm:flex"
                          onClick={(e) => { e.stopPropagation(); setLocation(`/team/setup/${m.id}`); }}
                        >
                          Open
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              <Input
                placeholder="Full name"
                value={form.employee_name}
                onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g., Tile Installer"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input
                placeholder="Who they report to"
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => handleCreate(false)}
              disabled={createMutation.isPending || !form.employee_name.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button onClick={() => handleCreate(true)} disabled={createMutation.isPending || !form.employee_name.trim()}>
              {createMutation.isPending ? "Creating..." : "Save & Start Setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.employee_name}" and their entire setup checklist.
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
    </>
  );
}

// ============================================
// RESOURCES TAB — Category-first knowledge hub
// ============================================
function ResourcesTab() {
  const { toast } = useToast();
  // Fetch ALL resources (no category filter — we group client-side)
  const { data: resources = [], isLoading } = useTeamResources("all");
  const createMutation = useCreateTeamResource();
  const deleteMutation = useDeleteTeamResource();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamResource | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceType, setResourceType] = useState<"link" | "file">("link");
  const [form, setForm] = useState({
    title: "",
    category: "sop",
    description: "",
    external_url: "",
    file_name: "",
  });

  // Group resources by category, filtered by search
  const { grouped, categoryOrder } = useMemo(() => {
    const filtered = searchQuery.trim()
      ? resources.filter(
          (r) =>
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : resources;

    const map = new Map<string, TeamResource[]>();
    for (const r of filtered) {
      const cat = r.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }

    // Order: setup, sop, policy, standards, other
    const order = ["setup", "sop", "policy", "standards", "other"].filter((c) => map.has(c));
    return { grouped: map, categoryOrder: order };
  }, [resources, searchQuery]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      await createMutation.mutateAsync({
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        external_url: resourceType === "link" ? (form.external_url.trim() || null) : null,
        file_name: resourceType === "file" ? (form.file_name.trim() || null) : null,
      } as any);
      setIsAddOpen(false);
      setForm({ title: "", category: "sop", description: "", external_url: "", file_name: "" });
      toast({ title: "Resource Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast({ title: "Resource Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const scrollToSection = (cat: string) => {
    const el = document.getElementById(`section-${cat}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getResourceIcon = (r: TeamResource) => {
    if (r.external_url) return <ExternalLink className="h-5 w-5 text-blue-500 shrink-0" />;
    const name = r.file_url || r.title || "";
    if (name.match(/\.(pdf)$/i)) return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
    if (name.match(/\.(doc|docx)$/i)) return <FileText className="h-5 w-5 text-blue-600 shrink-0" />;
    return <FileDown className="h-5 w-5 text-muted-foreground shrink-0" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Top bar: search + add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Quick-jump category pills */}
      {categoryOrder.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categoryOrder.map((cat) => (
            <button
              key={cat}
              onClick={() => scrollToSection(cat)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              {categoryShort[cat] || cat} ({grouped.get(cat)?.length || 0})
            </button>
          ))}
        </div>
      )}

      {/* Category sections */}
      {categoryOrder.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            {searchQuery ? "No resources match your search." : "No resources yet. Add your first one above."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categoryOrder.map((cat) => {
            const catResources = grouped.get(cat) || [];
            return (
              <div key={cat} id={`section-${cat}`}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={categoryColors[cat] || "text-gray-600"}>
                    {categoryIcons[cat] || <FolderOpen className="h-5 w-5" />}
                  </span>
                  <h3 className="text-lg font-semibold">{categoryLabels[cat] || cat}</h3>
                  <span className="text-sm text-muted-foreground">({catResources.length} resource{catResources.length !== 1 ? "s" : ""})</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Resource rows */}
                <div className="space-y-2">
                  {catResources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      {getResourceIcon(r)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        {r.description && (
                          <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {r.uploaded_by_user_name && <>by {r.uploaded_by_user_name.split("@")[0]}</>}
                          {r.created_at && <> · {new Date(r.created_at).toLocaleDateString()}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(r.external_url || r.file_url) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(r.external_url || r.file_url || "", "_blank")}
                          >
                            {r.external_url ? "Open" : "Download"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Resource Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Tile Installation SOP"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup</SelectItem>
                  <SelectItem value="sop">SOPs</SelectItem>
                  <SelectItem value="policy">Policies</SelectItem>
                  <SelectItem value="standards">Standards</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={resourceType === "link" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResourceType("link")}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Link (URL)
                </Button>
                <Button
                  variant={resourceType === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResourceType("file")}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  File Reference
                </Button>
              </div>
            </div>
            {resourceType === "link" ? (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://docs.google.com/..."
                  value={form.external_url}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File Name / Path</Label>
                <Input
                  placeholder="e.g., tile-installation-guide.pdf"
                  value={form.file_name}
                  onChange={(e) => setForm({ ...form, file_name: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !form.title.trim()}>
              {createMutation.isPending ? "Adding..." : "Add Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}".
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
    </>
  );
}
