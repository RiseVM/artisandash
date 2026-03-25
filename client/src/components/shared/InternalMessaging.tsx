import { useState, useEffect } from "react";
import {
  useInternalMessages,
  useSendInternalMessage,
  useDeleteInternalMessage,
  useMarkThreadRead,
} from "@/features/messages/hooks";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Trash2,
  Loader2,
  Circle,
  AlertCircle,
  ArrowUp,
} from "lucide-react";
import type { InternalMessageThread, InternalMessageWithUser } from "@shared/schema";

interface InternalMessagingProps {
  compact?: boolean;
  projectId?: number;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const priorityBorder: Record<string, string> = {
  low: "border-l-gray-300",
  normal: "border-l-blue-300",
  high: "border-l-orange-400",
  urgent: "border-l-red-500",
};

export function InternalMessaging({ compact = false, projectId }: InternalMessagingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: threads = [], isLoading } = useInternalMessages(projectId);
  const sendMutation = useSendInternalMessage();
  const deleteMutation = useDeleteInternalMessage();
  const markReadMutation = useMarkThreadRead();

  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const [newThread, setNewThread] = useState({
    subject: "",
    content: "",
    priority: "normal",
  });

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  // Mark thread as read when opened
  useEffect(() => {
    if (selectedThreadId && user?.id) {
      markReadMutation.mutate(selectedThreadId);
    }
  }, [selectedThreadId]);

  const isUnread = (thread: InternalMessageThread) => {
    if (!user?.id) return false;
    const readBy = Array.isArray(thread.read_by) ? thread.read_by as string[] : [];
    return !readBy.includes(user.id);
  };

  const handleCreateThread = async () => {
    if (!newThread.subject.trim() || !newThread.content.trim()) return;
    try {
      const msg = await sendMutation.mutateAsync({
        subject: newThread.subject,
        content: newThread.content,
        priority: newThread.priority,
        project_id: projectId || null,
      });
      setIsNewThreadOpen(false);
      setNewThread({ subject: "", content: "", priority: "normal" });
      setSelectedThreadId(msg.id);
      toast({ title: "Message Sent" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedThreadId) return;
    try {
      await sendMutation.mutateAsync({
        parent_id: selectedThreadId,
        content: replyContent,
        priority: selectedThread?.priority || "normal",
        project_id: projectId || selectedThread?.project_id || null,
      });
      setReplyContent("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (selectedThreadId === id) setSelectedThreadId(null);
      toast({ title: "Message Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Thread View ──────────────────────────────
  if (selectedThread) {
    return (
      <Card className={compact ? "border-0 shadow-none" : ""}>
        {!compact && (
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedThreadId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{selectedThread.subject || "No Subject"}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {selectedThread.sender_user_name} &middot;{" "}
                  {new Date(selectedThread.created_at).toLocaleString()}
                </span>
              </div>
              <Badge className={priorityColors[selectedThread.priority]}>
                {selectedThread.priority}
              </Badge>
            </div>
          </CardHeader>
        )}
        {compact && (
          <div className="flex items-center gap-2 p-3 border-b">
            <Button variant="ghost" size="sm" onClick={() => setSelectedThreadId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="font-medium text-sm truncate flex-1">{selectedThread.subject || "No Subject"}</span>
            <Badge className={`text-xs ${priorityColors[selectedThread.priority]}`}>
              {selectedThread.priority}
            </Badge>
          </div>
        )}
        <CardContent className={compact ? "p-3" : ""}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Original message */}
            <div className={`p-3 rounded-lg border-l-4 ${priorityBorder[selectedThread.priority]} bg-muted/30`}>
              <p className="text-sm whitespace-pre-wrap">{selectedThread.content}</p>
              <div className="text-xs text-muted-foreground mt-2">
                {selectedThread.sender_user_name} &middot; {new Date(selectedThread.created_at).toLocaleString()}
              </div>
            </div>

            {/* Replies */}
            {selectedThread.replies.map((reply) => (
              <div key={reply.id} className="p-3 rounded-lg bg-white border group">
                <div className="flex justify-between items-start">
                  <p className="text-sm whitespace-pre-wrap flex-1">{reply.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                    onClick={() => handleDelete(reply.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {reply.sender_user_name} &middot; {new Date(reply.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div className="flex gap-2 mt-4">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply();
              }}
            />
            <Button
              size="icon"
              onClick={handleReply}
              disabled={sendMutation.isPending || !replyContent.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Thread List ──────────────────────────────
  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      {!compact && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Staff Messages
            </CardTitle>
            <Button size="sm" onClick={() => setIsNewThreadOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Thread
            </Button>
          </div>
        </CardHeader>
      )}
      {compact && (
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-medium text-sm">Staff Messages</span>
          <Button size="sm" variant="outline" onClick={() => setIsNewThreadOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      )}
      <CardContent className={compact ? "p-2" : ""}>
        {threads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No messages yet. Start a conversation!
          </p>
        ) : (
          <div className="space-y-1">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${
                  priorityBorder[thread.priority]
                } ${isUnread(thread) ? "bg-blue-50/50" : ""}`}
                onClick={() => setSelectedThreadId(thread.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isUnread(thread) && (
                      <Circle className="h-2 w-2 fill-blue-500 text-blue-500 shrink-0" />
                    )}
                    <span className={`text-sm font-medium truncate ${isUnread(thread) ? "font-bold" : ""}`}>
                      {thread.subject || "No Subject"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {thread.content.substring(0, 80)}{thread.content.length > 80 ? "..." : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {thread.sender_user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(thread.created_at).toLocaleDateString()}
                    </span>
                    {thread.replyCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ${priorityColors[thread.priority]}`}>
                  {thread.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* New Thread Dialog */}
      <Dialog open={isNewThreadOpen} onOpenChange={setIsNewThreadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Subject"
                value={newThread.subject}
                onChange={(e) => setNewThread({ ...newThread, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Select value={newThread.priority} onValueChange={(v) => setNewThread({ ...newThread, priority: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Write your message..."
                value={newThread.content}
                onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewThreadOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateThread}
              disabled={sendMutation.isPending || !newThread.subject.trim() || !newThread.content.trim()}
            >
              {sendMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
