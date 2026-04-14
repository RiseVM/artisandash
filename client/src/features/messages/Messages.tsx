import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InternalMessaging } from "@/components/shared/InternalMessaging";
import { useAuth } from "@/features/auth/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  FolderKanban,
  Check,
  Loader2,
  Circle,
} from "lucide-react";
import { Link } from "wouter";

interface ProjectMessage {
  id: number;
  project_id: number;
  sender_type: string;
  sender_name: string;
  subject: string | null;
  content: string;
  read_by_admin: string;
  read_by_admin_at: string | null;
  created_at: string;
}

interface ProjectWithMessages {
  projectId: number;
  projectName: string;
  customerName: string;
  messages: ProjectMessage[];
  unreadCount: number;
}

export function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("team");

  // Fetch unread counts
  const { data: unreadData } = useQuery<{ internalUnread: number; projectUnread: number }>({
    queryKey: ["/api/messages/unified-unread"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unified-unread", { credentials: "include" });
      if (!res.ok) return { internalUnread: 0, projectUnread: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const internalUnread = unreadData?.internalUnread || 0;
  const projectUnread = unreadData?.projectUnread || 0;

  // Fetch all projects with their messages
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "client",
  });

  // Group project messages by project
  const projectsWithClientMessages: ProjectWithMessages[] = projects
    .filter((p: any) => p.messages && p.messages.length > 0)
    .map((p: any) => {
      const clientMsgs = (p.messages || []).filter((m: any) => m.sender_type === "client");
      const unread = clientMsgs.filter((m: any) => m.read_by_admin === "no").length;
      return {
        projectId: p.id,
        projectName: p.name,
        customerName: p.customerName || "Customer",
        messages: clientMsgs.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        unreadCount: unread,
      };
    })
    .filter((p: ProjectWithMessages) => p.messages.length > 0)
    .sort((a: ProjectWithMessages, b: ProjectWithMessages) => b.unreadCount - a.unreadCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Messages
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
            {internalUnread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                {internalUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="client" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Client
            {projectUnread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                {projectUnread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <InternalMessaging />
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          <ClientMessages
            projects={projectsWithClientMessages}
            isLoading={projectsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientMessages({
  projects,
  isLoading,
}: {
  projects: ProjectWithMessages[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await fetch(`/api/projects/${projectId}/messages/mark-read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unified-unread"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            No client messages yet. Messages from the client portal will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.projectId} className={project.unreadCount > 0 ? "border-blue-200" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/projects/${project.projectId}`}>
                  <CardTitle className="text-base hover:underline cursor-pointer">
                    {project.projectName}
                  </CardTitle>
                </Link>
                <p className="text-xs text-muted-foreground">{project.customerName}</p>
              </div>
              <div className="flex items-center gap-2">
                {project.unreadCount > 0 && (
                  <>
                    <Badge variant="destructive" className="text-xs">
                      {project.unreadCount} new
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markReadMutation.mutate(project.projectId)}
                      disabled={markReadMutation.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark Read
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {project.messages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-sm ${
                    msg.read_by_admin === "no"
                      ? "bg-blue-50 border-l-4 border-l-blue-400"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {msg.read_by_admin === "no" && (
                      <Circle className="h-2 w-2 fill-blue-500 text-blue-500 shrink-0 mt-1.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.sender_name} &middot; {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {project.messages.length > 5 && (
                <Link href={`/projects/${project.projectId}`}>
                  <p className="text-xs text-blue-600 hover:underline cursor-pointer text-center py-1">
                    View all {project.messages.length} messages in project
                  </p>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
