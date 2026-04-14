import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  ChevronRight,
  Loader2,
  Calendar,
  Plus,
} from "lucide-react";
import type { ProjectWithCustomer } from "@shared/schema";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  on_hold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "On Hold" },
  completed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Completed" },
  cancelled: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "Cancelled" },
};

export function PortalProjects() {
  const [, setLocation] = useLocation();

  const { data: projects = [], isLoading } = useQuery<ProjectWithCustomer[]>({
    queryKey: ["/api/portal/projects"],
    queryFn: async () => {
      const res = await fetch("/api/portal/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">Projects</h1>
            <p className="text-gray-500 mt-1 text-sm">View and track all your projects.</p>
          </div>
        </div>

        {isLoading ? (
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
                Ready to get started? Request a new project from the dashboard.
              </p>
              <Button
                onClick={() => setLocation("/portal")}
                variant="outline"
              >
                Go to Dashboard
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
    </PortalLayout>
  );
}
