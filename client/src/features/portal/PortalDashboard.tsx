import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { usePortalAuth } from "./hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderKanban,
  ChevronRight,
  Loader2,
  Calendar,
  Download,
  FileText,
  ClipboardCheck,
  MessageCircle,
  TrendingUp,
  Plus,
  CheckCircle2,
  Bath,
  ChefHat,
  Layers,
  Hammer,
  Wrench,
} from "lucide-react";
import type { ProjectWithCustomer, Contract, ProjectRequest } from "@shared/schema";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  on_hold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "On Hold" },
  completed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Completed" },
  cancelled: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "Cancelled" },
};

const projectTypeOptions = [
  { value: "bathroom", label: "Bathroom Renovation", icon: Bath },
  { value: "kitchen", label: "Kitchen Remodel", icon: ChefHat },
  { value: "floor", label: "Flooring", icon: Layers },
  { value: "full_reno", label: "Full Renovation", icon: Hammer },
  { value: "custom", label: "Custom Project", icon: Wrench },
];

const budgetOptions = [
  { value: "under_10k", label: "Under $10,000" },
  { value: "10k_25k", label: "$10,000 – $25,000" },
  { value: "25k_50k", label: "$25,000 – $50,000" },
  { value: "50k_100k", label: "$50,000 – $100,000" },
  { value: "over_100k", label: "Over $100,000" },
];

const timelineOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "1_month", label: "Within 1 month" },
  { value: "3_months", label: "Within 3 months" },
  { value: "flexible", label: "Flexible / No rush" },
];

const requestStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Review" },
  reviewed: { bg: "bg-blue-50", text: "text-blue-700", label: "Under Review" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved" },
  declined: { bg: "bg-red-50", text: "text-red-700", label: "Declined" },
  converted: { bg: "bg-violet-50", text: "text-violet-700", label: "Converted to Project" },
};

function ProjectRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_type: "",
    title: "",
    description: "",
    budget_range: "",
    address: "",
    preferred_start: "",
    additional_notes: "",
  });
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/portal/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/project-requests"] });
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setFormData({
          project_type: "",
          title: "",
          description: "",
          budget_range: "",
          address: "",
          preferred_start: "",
          additional_notes: "",
        });
      }, 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <div className="py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Request Submitted!</h3>
            <p className="text-sm text-gray-500">
              We'll review your request and get back to you shortly.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif">Request a New Project</DialogTitle>
          <DialogDescription>
            Tell us about your project and we'll follow up with a consultation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Project Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Project Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              {projectTypeOptions.map((opt) => {
                const selected = formData.project_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("project_type", opt.value)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      selected
                        ? "border-[hsl(215,30%,35%)] bg-[hsl(215,30%,35%)]/5 text-[hsl(215,30%,25%)]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <opt.icon className="h-4 w-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="req-title" className="text-sm text-gray-600">Project Title *</Label>
            <Input
              id="req-title"
              placeholder="e.g., Master Bathroom Remodel"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="h-10 bg-gray-50 border-gray-200 focus:bg-white"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="req-desc" className="text-sm text-gray-600">Description</Label>
            <Textarea
              id="req-desc"
              placeholder="Describe what you're looking for..."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white min-h-[80px] resize-none"
            />
          </div>

          {/* Budget + Timeline row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Budget Range</Label>
              <Select value={formData.budget_range} onValueChange={(v) => updateField("budget_range", v)}>
                <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  {budgetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Preferred Start</Label>
              <Select value={formData.preferred_start} onValueChange={(v) => updateField("preferred_start", v)}>
                <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  {timelineOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="req-address" className="text-sm text-gray-600">Project Address</Label>
            <Input
              id="req-address"
              placeholder="Where is this project located?"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="h-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="req-notes" className="text-sm text-gray-600">Additional Notes</Label>
            <Textarea
              id="req-notes"
              placeholder="Anything else we should know?"
              value={formData.additional_notes}
              onChange={(e) => updateField("additional_notes", e.target.value)}
              className="bg-gray-50 border-gray-200 focus:bg-white min-h-[60px] resize-none"
            />
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {String(mutation.error?.message || "Something went wrong. Please try again.")}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-11 bg-[hsl(215,30%,25%)] hover:bg-[hsl(215,30%,20%)] text-white font-medium"
            disabled={mutation.isPending || !formData.project_type || !formData.title}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user } = usePortalAuth();
  const [activeTab, setActiveTab] = useState<"projects" | "contracts">("projects");
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithCustomer[]>({
    queryKey: ["/api/portal/projects"],
    queryFn: async () => {
      const res = await fetch("/api/portal/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/portal/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/portal/contracts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
  });

  const { data: projectRequests = [] } = useQuery<ProjectRequest[]>({
    queryKey: ["/api/portal/project-requests"],
    queryFn: async () => {
      const res = await fetch("/api/portal/project-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  const getContractTypeName = (type: string) => {
    if (type === "custom_cabinetry") return "Cabinet Design & Layout Agreement";
    if (type === "kitchen_design_retainer") return "Kitchen Design Retainer";
    return "Home Improvement Contract";
  };

  const handleDownloadPDF = (contractId: number) => {
    window.open(`/api/portal/contracts/${contractId}/pdf`, "_blank");
  };

  // Compute summary stats
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((sum, p) => sum + (p.overall_progress || 0), 0) / projects.length)
    : 0;

  return (
    <PortalLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">
              Welcome back{user?.customer?.name ? `, ${user.customer.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-gray-500 mt-1">
              Here's an overview of your projects and documents.
            </p>
          </div>
          <Button
            onClick={() => setShowRequestDialog(true)}
            className="bg-[hsl(215,30%,25%)] hover:bg-[hsl(215,30%,20%)] text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request a Project
          </Button>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(215,30%,35%)]/10 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-[hsl(215,30%,35%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
                  <p className="text-xs text-gray-500">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{avgProgress}%</p>
                  <p className="text-xs text-gray-500">Avg. Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
                  <p className="text-xs text-gray-500">Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "projects"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </span>
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "contracts"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contracts
            </span>
          </button>
        </div>

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div>
            {projectsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Projects Yet</h3>
                  <p className="text-gray-500 text-sm mb-5">
                    Ready to get started? Request a new project and we'll reach out to schedule a consultation.
                  </p>
                  <Button
                    onClick={() => setShowRequestDialog(true)}
                    className="bg-[hsl(215,30%,25%)] hover:bg-[hsl(215,30%,20%)] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request a Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((project) => {
                  const status = statusConfig[project.status] || statusConfig.active;
                  return (
                    <Card
                      key={project.id}
                      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group bg-white"
                      onClick={() => setLocation(`/portal/project/${project.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-[hsl(215,30%,35%)] transition-colors truncate">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 ml-3" />
                        </div>

                        {/* Status + Date row */}
                        <div className="flex items-center justify-between mb-4">
                          <Badge
                            variant="secondary"
                            className={`${status.bg} ${status.text} border-0 font-medium text-xs px-2.5 py-0.5`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5 inline-block`} />
                            {status.label}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-semibold text-gray-700">{project.overall_progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-[hsl(215,30%,35%)]"
                              style={{ width: `${project.overall_progress}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === "contracts" && (
          <div>
            {contractsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : contracts.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Contracts Yet</h3>
                  <p className="text-gray-500 text-sm">
                    You don't have any signed contracts yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {contracts.map((contract) => (
                  <Card key={contract.id} className="border-0 shadow-sm bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[hsl(215,30%,35%)]/10 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="h-5 w-5 text-[hsl(215,30%,35%)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {getContractTypeName(contract.contract_type)}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Signed {new Date(contract.signed_at || contract.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownloadPDF(contract.id)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-4 text-xs h-9"
                      >
                        <Download className="h-3.5 w-3.5 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Pending Project Requests */}
        {projectRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Your Requests
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {projectRequests.map((req) => {
                const typeOpt = projectTypeOptions.find((o) => o.value === req.project_type);
                const status = requestStatusConfig[req.status] || requestStatusConfig.pending;
                const TypeIcon = typeOpt?.icon || Wrench;
                return (
                  <Card key={req.id} className="border-0 shadow-sm bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[hsl(215,30%,35%)]/10 flex items-center justify-center shrink-0">
                          <TypeIcon className="h-4 w-4 text-[hsl(215,30%,35%)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{req.title}</h3>
                            <Badge
                              variant="secondary"
                              className={`${status.bg} ${status.text} border-0 text-[11px] px-2 py-0.5 shrink-0`}
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {typeOpt?.label || req.project_type} · Submitted {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Project Request Dialog */}
      <ProjectRequestDialog open={showRequestDialog} onOpenChange={setShowRequestDialog} />
    </PortalLayout>
  );
}
