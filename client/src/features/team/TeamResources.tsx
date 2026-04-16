import { useState, useMemo } from "react";
import {
  useTeamResources,
  useCreateTeamResource,
  useDeleteTeamResource,
} from "./hooks";
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
import {
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  FileDown,
  FileText,
  BookOpen,
  Link as LinkIcon,
  Upload,
  Search,
  ClipboardList,
  Shield,
  Star,
  FolderOpen,
  Settings2,
  Download,
  ArrowLeft,
  X,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import type { TeamResource } from "@shared/schema";

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
  setup: <ClipboardList className="h-4 w-4" />,
  sop: <Settings2 className="h-4 w-4" />,
  policy: <Shield className="h-4 w-4" />,
  standards: <Star className="h-4 w-4" />,
  other: <FolderOpen className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  setup: "text-blue-600",
  sop: "text-green-600",
  policy: "text-orange-600",
  standards: "text-purple-600",
  other: "text-gray-600",
};

export function TeamResources() {
  const { toast } = useToast();
  const { data: resources = [], isLoading } = useTeamResources("all");
  const createMutation = useCreateTeamResource();
  const deleteMutation = useDeleteTeamResource();

  const [selectedResource, setSelectedResource] = useState<TeamResource | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

  // Group resources by category, filtered by search and active category
  const { grouped, categoryOrder, flatFiltered } = useMemo(() => {
    let filtered = resources;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (activeCategory) {
      filtered = filtered.filter((r) => (r.category || "other") === activeCategory);
    }

    const map = new Map<string, TeamResource[]>();
    for (const r of filtered) {
      const cat = r.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }

    const order = ["setup", "sop", "policy", "standards", "other"].filter((c) => map.has(c));
    return { grouped: map, categoryOrder: order, flatFiltered: filtered };
  }, [resources, searchQuery, activeCategory]);

  // All categories present in unfiltered resources (for category pills)
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const r of resources) cats.add(r.category || "other");
    return ["setup", "sop", "policy", "standards", "other"].filter((c) => cats.has(c));
  }, [resources]);

  const getResourceIcon = (r: TeamResource) => {
    if (r.external_url) return <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />;
    const name = r.file_url || r.file_name || r.title || "";
    if (name.match(/\.(pdf)$/i)) return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
    if (name.match(/\.(doc|docx)$/i)) return <FileText className="h-4 w-4 text-blue-600 shrink-0" />;
    return <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const getViewerUrl = (r: TeamResource): string | null => {
    // For file-based resources, route through the backend API
    if (r.file_name) {
      return `/api/team/resources/file/${encodeURIComponent(r.file_name)}`;
    }
    if (r.file_url) {
      // Extract filename from path-style file_url (e.g. "/resources/foo.pdf" → "foo.pdf")
      const segments = r.file_url.split("/");
      const filename = segments[segments.length - 1];
      if (filename) {
        return `/api/team/resources/file/${encodeURIComponent(filename)}`;
      }
      return r.file_url;
    }
    if (r.external_url) return r.external_url;
    return null;
  };

  const isPdf = (r: TeamResource): boolean => {
    const name = r.file_url || r.file_name || r.title || "";
    return /\.(pdf)$/i.test(name);
  };

  const isViewableFile = (r: TeamResource): boolean => {
    const name = r.file_url || r.file_name || r.title || "";
    return /\.(pdf|docx?)$/i.test(name);
  };

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
      if (selectedResource?.id === deleteTarget.id) setSelectedResource(null);
      setDeleteTarget(null);
      toast({ title: "Resource Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
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
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Resource Library
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Team documents, SOPs, and reference materials
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Mobile: back button when viewing a doc */}
      {selectedResource && (
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedResource(null); setSidebarExpanded(true); }}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Button>
        </div>
      )}

      {/* Split pane layout */}
      <div className="flex gap-0 min-h-[calc(100vh-220px)]">
        {/* Left pane: document list — collapses to mini sidebar when doc is selected */}
        <div
          className={`flex flex-col transition-all duration-200 ease-in-out shrink-0 ${
            selectedResource && !sidebarExpanded
              ? "hidden md:flex w-12 border-r"
              : selectedResource
                ? "hidden md:flex w-80 border-r"
                : "w-full md:w-80 md:border-r"
          }`}
        >
          {/* Collapsed mini sidebar */}
          {selectedResource && !sidebarExpanded ? (
            <div className="flex flex-col h-full">
              <button
                onClick={() => setSidebarExpanded(true)}
                className="p-3 hover:bg-muted/50 border-b flex items-center justify-center"
                title="Expand document list"
              >
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex-1 overflow-y-auto py-1">
                {flatFiltered.map((r) => {
                  const isSelected = selectedResource?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedResource(r)}
                      className={`w-full flex items-center justify-center p-2.5 transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-r-2 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                      title={r.title}
                    >
                      {getResourceIcon(r)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Expanded sidebar */
            <div className="flex flex-col gap-3 p-3 h-full">
              {/* Collapse button + Search */}
              <div className="flex items-center gap-2">
                {selectedResource && (
                  <button
                    onClick={() => setSidebarExpanded(false)}
                    className="p-1.5 rounded-md hover:bg-muted/50 shrink-0"
                    title="Collapse document list"
                  >
                    <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category filter pills */}
              {allCategories.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      !activeCategory
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    All
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {categoryShort[cat] || cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Document list */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {categoryOrder.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      {searchQuery || activeCategory
                        ? "No resources match your filters."
                        : "No resources yet. Add your first one above."}
                    </CardContent>
                  </Card>
                ) : (
                  categoryOrder.map((cat) => {
                    const catResources = grouped.get(cat) || [];
                    return (
                      <div key={cat}>
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className={categoryColors[cat] || "text-gray-600"}>
                            {categoryIcons[cat] || <FolderOpen className="h-4 w-4" />}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {categoryLabels[cat] || cat}
                          </span>
                          <span className="text-xs text-muted-foreground/60">({catResources.length})</span>
                        </div>

                        {/* Resource items */}
                        <div className="space-y-1">
                          {catResources.map((r) => {
                            const isSelected = selectedResource?.id === r.id;
                            return (
                              <button
                                key={r.id}
                                onClick={() => { setSelectedResource(r); setSidebarExpanded(false); }}
                                className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-transparent hover:bg-muted/50"
                                }`}
                              >
                                {getResourceIcon(r)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{r.title}</p>
                                  {r.description && (
                                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground/50 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right pane: document viewer */}
        <div
          className={`flex-1 min-w-0 flex flex-col bg-card overflow-hidden ${
            selectedResource ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedResource ? (
            <>
              {/* Viewer header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{selectedResource.title}</h3>
                  {selectedResource.description && (
                    <p className="text-xs text-muted-foreground truncate">{selectedResource.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getViewerUrl(selectedResource) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getViewerUrl(selectedResource)!, "_blank")}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/60 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(selectedResource); }}
                    title="Delete resource"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden"
                    onClick={() => { setSelectedResource(null); setSidebarExpanded(true); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Viewer body */}
              <div className="flex-1 min-h-0">
                {getViewerUrl(selectedResource) ? (
                  isViewableFile(selectedResource) ? (
                    <iframe
                      src={getViewerUrl(selectedResource)!}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                    />
                  ) : selectedResource.external_url ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <ExternalLink className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-sm">This is an external link.</p>
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedResource.external_url!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  ) : (
                    <iframe
                      src={getViewerUrl(selectedResource)!}
                      className="w-full h-full border-0"
                      title={selectedResource.title}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <FileText className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-sm">No file or URL attached to this resource.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="h-16 w-16 text-muted-foreground/20" />
              <p className="text-sm font-medium">Select a document to view it here</p>
              <p className="text-xs text-muted-foreground/60">
                Choose a resource from the list on the left
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}
