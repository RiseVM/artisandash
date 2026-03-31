import { useState } from "react";
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
  Eye,
  ExternalLink,
  FileDown,
  BookOpen,
  Link as LinkIcon,
  Upload,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Save } from "lucide-react";
import type { TeamMember, TeamResource } from "@shared/schema";

type TeamMemberWithProgress = TeamMember & { total_items: number; checked_items: number };

const categoryLabels: Record<string, string> = {
  setup: "Setup",
  sop: "SOPs",
  policy: "Policies",
  standards: "Standards",
  other: "Other",
};

const categoryColors: Record<string, string> = {
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
// MEMBERS TAB
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
            No team members yet. Add someone to start their onboarding checklist.
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Job Title</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Start Date</th>
                <th className="text-left p-3 font-medium">Progress</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onView={() => setLocation(`/team/setup/${m.id}`)}
                  onDelete={() => setDeleteTarget(m)}
                />
              ))}
            </tbody>
          </table>
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

function MemberRow({
  member,
  onView,
  onDelete,
}: {
  member: TeamMemberWithProgress;
  onView: () => void;
  onDelete: () => void;
}) {
  const total = member.total_items || 0;
  const checked = member.checked_items || 0;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={onView}>
      <td className="p-3 font-medium">{member.employee_name}</td>
      <td className="p-3 text-muted-foreground hidden sm:table-cell">{member.job_title || "—"}</td>
      <td className="p-3 text-muted-foreground hidden md:table-cell">{member.start_date || "—"}</td>
      <td className="p-3">
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {checked}/{total} ({pct}%)
          </span>
        </div>
      </td>
      <td className="p-3">
        <Badge
          className={
            member.status === "complete"
              ? "bg-green-100 text-green-800"
              : pct === 100
                ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800"
          }
        >
          {member.status === "complete" ? "Complete" : pct === 100 ? "Ready to Complete" : "In Progress"}
        </Badge>
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ============================================
// RESOURCES TAB
// ============================================
function ResourcesTab() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: resources = [], isLoading } = useTeamResources(categoryFilter);
  const createMutation = useCreateTeamResource();
  const deleteMutation = useDeleteTeamResource();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamResource | null>(null);
  const [resourceType, setResourceType] = useState<"link" | "file">("link");
  const [form, setForm] = useState({
    title: "",
    category: "sop",
    description: "",
    external_url: "",
    file_name: "",
  });

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

  const categories = ["all", "setup", "sop", "policy", "standards", "other"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All" : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No {categoryFilter !== "all" ? (categoryLabels[categoryFilter]?.toLowerCase() || categoryFilter) : ""} resources yet. Add one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardContent className="pt-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight">{r.title}</h3>
                  <Badge className={`shrink-0 text-xs ${categoryColors[r.category] || categoryColors.other}`}>
                    {categoryLabels[r.category] || r.category}
                  </Badge>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                )}
                <div className="mt-auto pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {r.uploaded_by_user_name && (
                      <span>by {r.uploaded_by_user_name.split("@")[0]}</span>
                    )}
                    {r.created_at && (
                      <span> · {new Date(r.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(r.external_url || r.file_url) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(r.external_url || r.file_url || "", "_blank")}
                      >
                        {r.external_url ? <ExternalLink className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
