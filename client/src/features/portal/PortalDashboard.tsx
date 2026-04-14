import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { usePortalAuth } from "./hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { ProjectWithCustomer, Contract } from "@shared/schema";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  on_hold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "On Hold" },
  completed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Completed" },
  cancelled: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "Cancelled" },
};

export function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user } = usePortalAuth();
  const [activeTab, setActiveTab] = useState<"projects" | "contracts">("projects");

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            Welcome back{user?.customer?.name ? `, ${user.customer.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-gray-500 mt-1">
            Here's an overview of your projects and documents.
          </p>
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
                  <p className="text-gray-500 text-sm">
                    You don't have any projects associated with your account yet.
                  </p>
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
      </div>
    </PortalLayout>
  );
}
