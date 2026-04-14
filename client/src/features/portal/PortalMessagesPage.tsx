import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "./PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Loader2,
  Send,
  User,
  Building,
  FolderKanban,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProjectMessage } from "@shared/schema";

interface MessageThread {
  projectId: number;
  projectName: string;
  messages: ProjectMessage[];
}

export function PortalMessagesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState({ subject: "", content: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threads = [], isLoading } = useQuery<MessageThread[]>({
    queryKey: ["/api/portal/messages"],
    queryFn: async () => {
      const res = await fetch("/api/portal/messages", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { subject?: string; content: string } }) => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/messages/unread-total"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (projectId: number) => {
      await fetch(`/api/portal/projects/${projectId}/messages/mark-read`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/messages/unread-total"] });
    },
  });

  // Auto-select first thread
  useEffect(() => {
    if (threads.length > 0 && selectedProject === null) {
      setSelectedProject(threads[0].projectId);
    }
  }, [threads, selectedProject]);

  // Mark messages as read when selecting a project
  useEffect(() => {
    if (selectedProject) {
      const thread = threads.find((t) => t.projectId === selectedProject);
      const hasUnread = thread?.messages.some(
        (m) => m.sender_type === "admin" && m.read_by_client === "no"
      );
      if (hasUnread) {
        markRead.mutate(selectedProject);
      }
    }
  }, [selectedProject, threads]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedProject, threads]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim() || !selectedProject) return;

    try {
      await sendMessage.mutateAsync({
        projectId: selectedProject,
        data: { subject: newMessage.subject || undefined, content: newMessage.content },
      });
      setNewMessage({ subject: "", content: "" });
      toast({ title: "Message sent" });
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const selectedThread = threads.find((t) => t.projectId === selectedProject);

  const getUnreadCount = (thread: MessageThread) => {
    return thread.messages.filter((m) => m.sender_type === "admin" && m.read_by_client === "no").length;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Messages</h1>
          <p className="text-gray-500 mt-1 text-sm">Communicate with your project team.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : threads.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No Messages Yet</h3>
              <p className="text-gray-500 text-sm">
                Messages will appear here once you have an active project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Thread list */}
            <Card className="border-0 shadow-sm w-72 shrink-0 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {threads.map((thread) => {
                    const unread = getUnreadCount(thread);
                    const lastMsg = thread.messages[thread.messages.length - 1];
                    const isSelected = selectedProject === thread.projectId;
                    return (
                      <button
                        key={thread.projectId}
                        onClick={() => setSelectedProject(thread.projectId)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          isSelected
                            ? "bg-[hsl(215,30%,35%)]/10 border border-[hsl(215,30%,35%)]/20"
                            : "hover:bg-gray-50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate flex-1">
                            {thread.projectName}
                          </span>
                          {unread > 0 && (
                            <Badge className="bg-[hsl(215,30%,35%)] text-white border-0 text-[10px] px-1.5 py-0 ml-2">
                              {unread}
                            </Badge>
                          )}
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-gray-400 truncate">
                            {lastMsg.sender_type === "client" ? "You: " : ""}
                            {lastMsg.content.substring(0, 50)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>

            {/* Message area */}
            <Card className="border-0 shadow-sm flex-1 flex flex-col overflow-hidden">
              {selectedThread ? (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-sm text-gray-900">{selectedThread.projectName}</span>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedThread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", message.sender_type === "client" ? "flex-row-reverse" : "")}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                              message.sender_type === "client"
                                ? "bg-[hsl(215,30%,35%)] text-white"
                                : "bg-gray-100",
                            )}
                          >
                            {message.sender_type === "client" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Building className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className={cn("flex-1 max-w-[80%]", message.sender_type === "client" ? "text-right" : "")}>
                            <div
                              className={cn(
                                "inline-block rounded-2xl px-4 py-2.5",
                                message.sender_type === "client"
                                  ? "bg-[hsl(215,30%,35%)] text-white rounded-tr-md"
                                  : "bg-gray-100 text-gray-800 rounded-tl-md",
                              )}
                            >
                              {message.subject && (
                                <p className="font-medium mb-1 text-sm">{message.subject}</p>
                              )}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            </div>
                            <div
                              className={cn(
                                "flex items-center gap-2 mt-1.5 text-[11px] text-gray-400",
                                message.sender_type === "client" ? "justify-end" : "",
                              )}
                            >
                              <span>{message.sender_type === "admin" ? "Project Team" : "You"}</span>
                              <span className="text-gray-300">&bull;</span>
                              <span>{format(new Date(message.created_at), "MMM d, h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="border-t border-gray-100 p-4">
                    <form onSubmit={handleSend} className="space-y-2">
                      <Input
                        placeholder="Subject (optional)"
                        value={newMessage.subject}
                        onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                        className="text-sm h-9 bg-gray-50 border-gray-200"
                      />
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage.content}
                          onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                          rows={2}
                          className="flex-1 resize-none text-sm bg-gray-50 border-gray-200"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          className="h-auto bg-[hsl(215,30%,25%)] hover:bg-[hsl(215,30%,20%)]"
                          disabled={sendMessage.isPending || !newMessage.content.trim()}
                        >
                          {sendMessage.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Select a project to view messages</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
