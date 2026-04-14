import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InternalMessaging } from "@/components/shared/InternalMessaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  FolderKanban,
  Send,
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

  // Fetch client messages from dedicated endpoint
  const { data: projectsWithClientMessages = [], isLoading: projectsLoading } = useQuery<ProjectWithMessages[]>({
    queryKey: ["/api/messages/client-messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages/client-messages", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "client",
  });

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
                  <CardTitle className="text-base hover:underline cursor-pointer flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    {project.projectName}
                  </CardTitle>
                </Link>
                <p className="text-xs text-muted-foreground ml-6">{project.customerName}</p>
              </div>
              <div className="flex items-center gap-2">
                {project.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {project.unreadCount} new
                  </Badge>
                )}
                <Link href={`/projects/${project.projectId}`}>
                  <Button size="sm">
                    <Send className="h-3 w-3 mr-1" />
                    Open &amp; Reply
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/projects/${project.projectId}`}>
              <div className="space-y-2 cursor-pointer hover:opacity-90 transition-opacity">
                {project.messages.slice(0, 3).map((msg) => (
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
                {project.messages.length > 3 && (
                  <p className="text-xs text-blue-600 hover:underline text-center py-1">
                    View all {project.messages.length} messages &rarr;
                  </p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
