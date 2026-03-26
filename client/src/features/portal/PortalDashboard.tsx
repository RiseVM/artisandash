import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { usePortalAuth } from "./hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FolderKanban, ChevronRight, Loader2, Calendar, Download, FileText, AlertCircle } from "lucide-react";
import type { ProjectWithCustomer, Contract } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user } = usePortalAuth();
  const [activeTab, setActiveTab] = useState("projects");

  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useQuery<ProjectWithCustomer[]>({
    queryKey: ["/api/portal/projects"],
    queryFn: async () => {
      const res = await fetch("/api/portal/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const { data: contracts = [], isLoading: contractsLoading, isError: contractsError } = useQuery<Contract[]>({
    queryKey: ["/api/portal/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/portal/contracts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
  });

  const getContractTypeName = (type: string) => {
    if (type === 'custom_cabinetry') return 'Cabinet Design & Layout Agreement';
    if (type === 'kitchen_design_retainer') return 'Kitchen Design Retainer';
    return 'Home Improvement Contract';
  };

  const handleDownloadPDF = (contractId: number) => {
    window.open(`/api/portal/contracts/${contractId}/pdf`, '_blank');
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Welcome greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome{user?.customer?.name ? `, ${user.customer.name}` : ""}
          </h1>
          <p className="text-muted-foreground">View your projects and contracts</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {projectsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projectsError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
                  <p className="text-muted-foreground">Please refresh the page to try again.</p>
                </CardContent>
              </Card>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground">
                    Your projects will appear here once your Artisan Tile project is created.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/portal/project/${project.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{project.name}</span>
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="mt-1 truncate">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-800"}>
                            {statusLabels[project.status] || project.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{project.overall_progress || 0}%</span>
                          </div>
                          <Progress value={project.overall_progress || 0} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            {contractsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contractsError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
                  <p className="text-muted-foreground">Please refresh the page to try again.</p>
                </CardContent>
              </Card>
            ) : contracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Contracts Yet</h3>
                  <p className="text-muted-foreground">
                    Your signed contracts will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            {getContractTypeName(contract.contract_type)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Signed on {new Date(contract.signed_at || contract.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleDownloadPDF(contract.id)}
                        className="w-full"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
