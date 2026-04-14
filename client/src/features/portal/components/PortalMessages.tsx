import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageCircle, User, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PortalMessagesProps {
  projectId: number;
}

function usePortalMessages(projectId: number) {
  return useQuery<ProjectMessage[]>({
    queryKey: ["/api/portal/projects", projectId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!projectId,
  });
}

function usePortalUnreadCount(projectId: number) {
  return useQuery<{ count: number }>({
    queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages/unread-count`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    enabled: !!projectId,
  });
}

function usePortalSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { subject?: string; content: string } }) => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json() as Promise<ProjectMessage>;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"] });
    },
  });
}

function usePortalMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId }: { projectId: number }) => {
      const res = await fetch(`/api/portal/projects/${projectId}/messages/mark-read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark messages as read");
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/projects", projectId, "messages", "unread-count"] });
    },
  });
}

export function PortalMessages({ projectId }: PortalMessagesProps) {
  const { data: messages, isLoading } = usePortalMessages(projectId);
  const { data: unreadData } = usePortalUnreadCount(projectId);
  const sendMessage = usePortalSendMessage();
  const markRead = usePortalMarkRead();
  const { toast } = useToast();

  const [newMessage, setNewMessage] = useState({ subject: "", content: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (unreadData?.count && unreadData.count > 0) {
      markRead.mutate({ projectId });
    }
  }, [projectId, unreadData?.count]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) {
      toast({ title: "Error", description: "Message content is required", variant: "destructive" });
      return;
    }

    try {
      await sendMessage.mutateAsync({
        projectId,
        data: { subject: newMessage.subject || undefined, content: newMessage.content },
      });
      setNewMessage({ subject: "", content: "" });
      toast({ title: "Message sent", description: "Your message has been sent." });
    } catch {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm mt-8">
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[350px] sm:h-[500px] mt-8 border-0 shadow-sm bg-white overflow-hidden">
      <CardHeader className="flex-none border-b border-gray-100 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <MessageCircle className="h-5 w-5 text-gray-400" />
          Messages
          {unreadData?.count ? (
            <Badge className="bg-[hsl(215,30%,35%)] text-white border-0 text-[10px] px-2 py-0">
              {unreadData.count} new
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {!messages || messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Send a message to contact your project team</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
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
          )}
        </ScrollArea>

        <div className="flex-none border-t border-gray-100 p-4">
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
      </CardContent>
    </Card>
  );
}
