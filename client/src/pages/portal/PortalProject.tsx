import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import type { ProjectWithDetails } from "@shared/schema";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const phaseStatusIcons: Record<string, React.ReactNode> = {
  not_started: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  on_hold: <Clock className="h-4 w-4 text-yellow-500" />,
  skipped: <Circle className="h-4 w-4 text-gray-400" />,
};

const phaseStatusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
  skipped: "Skipped",
};

export function PortalProject() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0");

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/portal/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const togglePhase = (phaseId: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">Project not found</h2>
          <Button onClick={() => setLocation("/portal")}>
            Back to Projects
          </Button>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/portal")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={project.overall_progress} className="flex-1 h-3" />
              <span className="text-xl font-semibold min-w-[60px] text-right">
                {project.overall_progress}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Phases */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Project Phases</h2>

          {project.phases.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No phases available to display yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            project.phases.map((phase, index) => (
              <Card key={phase.id}>
                <Collapsible
                  open={expandedPhases.has(phase.id)}
                  onOpenChange={() => togglePhase(phase.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedPhases.has(phase.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <CardTitle className="text-base">{phase.name}</CardTitle>
                              {phase.description && (
                                <CardDescription>{phase.description}</CardDescription>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sm">
                            {phaseStatusIcons[phase.status]}
                            <span className="text-muted-foreground">
                              {phaseStatusLabels[phase.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={phase.progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground w-10 text-right">
                              {phase.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {phase.tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No tasks in this phase.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {phase.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : task.status === "in_progress" ? (
                                <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                  {task.name}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              {task.status === "completed" && (
                                <Badge variant="secondary" className="flex-shrink-0">
                                  Completed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
