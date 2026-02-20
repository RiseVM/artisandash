import { useState, useEffect, useRef } from "react";
import {
  useProjectMessages,
  useSendProjectMessage,
  useMarkMessagesRead,
  useDeleteProjectMessage,
  useUnreadMessageCount,
} from "../hooks";
import type { ProjectMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, MessageCircle, Trash2, User, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectMessagesProps {
  projectId: number;
}

export function ProjectMessages({ projectId }: ProjectMessagesProps) {
  const { data: messages, isLoading } = useProjectMessages(projectId);
  const { data: unreadData } = useUnreadMessageCount(projectId);
  const sendMessage = useSendProjectMessage();
  const markRead = useMarkMessagesRead();
  const deleteMessage = useDeleteProjectMessage();
  const { toast } = useToast();

  const [newMessage, setNewMessage] = useState({
    subject: "",
    content: "",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when component mounts with unread messages
  const unreadCount = unreadData?.count ?? 0;
  useEffect(() => {
    if (unreadCount > 0) {
      markRead.mutate({ projectId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) {
      toast({
        title: "Error",
        description: "Message content is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage.mutateAsync({
        projectId,
        data: {
          subject: newMessage.subject || undefined,
          content: newMessage.content,
        },
      });
      setNewMessage({ subject: "", content: "" });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (message: ProjectMessage) => {
    try {
      await deleteMessage.mutateAsync({ id: message.id, projectId });
      toast({
        title: "Message deleted",
        description: "The message has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[400px] sm:h-[600px]">
      <CardHeader className="flex-none border-b py-3 sm:py-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageCircle className="h-5 w-5" />
          Messages
          {unreadData?.count ? (
            <Badge variant="destructive" className="ml-2">
              {unreadData.count} unread
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          {!messages || messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sender_type === "admin" ? "flex-row-reverse" : ""
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      message.sender_type === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.sender_type === "admin" ? (
                      <Building className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 max-w-[80%]",
                      message.sender_type === "admin" ? "text-right" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "inline-block rounded-lg p-3",
                        message.sender_type === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.subject && (
                        <p className="font-medium mb-1">{message.subject}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 mt-1 text-xs text-muted-foreground",
                        message.sender_type === "admin" ? "justify-end" : ""
                      )}
                    >
                      <span>{message.sender_name}</span>
                      <span>&bull;</span>
                      <span>
                        {format(new Date(message.created_at), "MMM d, h:mm a")}
                      </span>
                      {message.sender_type === "admin" && (
                        <>
                          <span>&bull;</span>
                          {message.read_by_client === "yes" ? (
                            <span className="text-green-600">Read</span>
                          ) : (
                            <span>Sent</span>
                          )}
                        </>
                      )}
                      {message.sender_type === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-50 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Message</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this message? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(message)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message input */}
        <div className="flex-none border-t p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <Input
                placeholder="Subject (optional)"
                value={newMessage.subject}
                onChange={(e) =>
                  setNewMessage({ ...newMessage, subject: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage.content}
                onChange={(e) =>
                  setNewMessage({ ...newMessage, content: e.target.value })
                }
                rows={2}
                className="flex-1 resize-none"
              />
              <Button
                type="submit"
                size="icon"
                className="h-auto"
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
