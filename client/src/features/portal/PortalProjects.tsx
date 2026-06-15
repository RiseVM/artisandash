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
  active: { bg: "bg-brass-muted", text: "text-brass", dot: "bg-brass", label: "Active" },
  on_hold: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "On Hold" },
  completed: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Completed" },
  cancelled: { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted-foreground/40", label: "Cancelled" },
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Client Portal</p>
            <h1 className="text-2xl font-bold text-foreground font-serif">Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm">View and track all your projects.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No Projects Yet</h3>
              <p className="text-muted-foreground text-sm mb-5">
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
                  className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group bg-card"
                  onClick={() => setLocation(`/portal/project/${project.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-brass transition-colors truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 ml-3" />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <Badge
                        variant="secondary"
                        className={`${status.bg} ${status.text} border-0 font-medium text-xs px-2.5 py-0.5`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} mr-1.5 inline-block`} />
                        {status.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-foreground/70">{project.overall_progress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-brass"
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
