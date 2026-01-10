import { useState } from "react";
import { useProjectUpdates, useCreateProjectUpdate, useDeleteProjectUpdate } from "@/hooks/use-api";
import type { ProjectUpdate } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, Plus, Trash2, MessageSquare, AlertCircle, CheckCircle, Clock, FileText, Settings, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ProjectActivityFeedProps {
  projectId: number;
}

const UPDATE_TYPES = [
  { value: "note", label: "Note", icon: MessageSquare },
  { value: "status_change", label: "Status Change", icon: Settings },
  { value: "milestone", label: "Milestone", icon: CheckCircle },
  { value: "issue", label: "Issue", icon: AlertCircle },
  { value: "delay", label: "Delay", icon: Clock },
  { value: "document", label: "Document", icon: FileText },
  { value: "client_comment", label: "Client Comment", icon: User },
];

function getUpdateIcon(type: string) {
  const config = UPDATE_TYPES.find(t => t.value === type);
  if (config) {
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  }
  return <MessageSquare className="h-4 w-4" />;
}

function getUpdateBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "milestone":
      return "default";
    case "issue":
    case "delay":
      return "destructive";
    case "status_change":
      return "secondary";
    default:
      return "outline";
  }
}

function getUpdateLabel(type: string): string {
  const config = UPDATE_TYPES.find(t => t.value === type);
  return config?.label || type;
}

export default function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
  const { data: updates, isLoading } = useProjectUpdates(projectId);
  const createUpdate = useCreateProjectUpdate();
  const deleteUpdate = useDeleteProjectUpdate();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    update_type: "note",
    title: "",
    content: "",
    is_internal: "no" as "yes" | "no",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.content.trim()) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createUpdate.mutateAsync({
        projectId,
        data: {
          update_type: newUpdate.update_type,
          title: newUpdate.title || undefined,
          content: newUpdate.content,
          is_internal: newUpdate.is_internal,
        },
      });
      toast({
        title: "Update added",
        description: "The project update has been posted.",
      });
      setNewUpdate({ update_type: "note", title: "", content: "", is_internal: "no" });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create update",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (update: ProjectUpdate) => {
    try {
      await deleteUpdate.mutateAsync({ id: update.id, projectId });
      toast({
        title: "Update deleted",
        description: "The update has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete update",
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add Project Update</DialogTitle>
                <DialogDescription>
                  Post an update to the project activity feed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="update_type">Type</Label>
                  <Select
                    value={newUpdate.update_type}
                    onValueChange={(value) => setNewUpdate({ ...newUpdate, update_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UPDATE_TYPES.filter(t => t.value !== "client_comment").map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title (optional)</Label>
                  <Input
                    id="title"
                    value={newUpdate.title}
                    onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                    placeholder="Brief summary..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newUpdate.content}
                    onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                    placeholder="Enter your update..."
                    rows={4}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_internal"
                    checked={newUpdate.is_internal === "yes"}
                    onCheckedChange={(checked) =>
                      setNewUpdate({ ...newUpdate, is_internal: checked ? "yes" : "no" })
                    }
                  />
                  <Label htmlFor="is_internal" className="text-sm font-normal">
                    Internal only (not visible to client)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUpdate.isPending}>
                  {createUpdate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Post Update
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!updates || updates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No updates yet</p>
            <p className="text-sm">Add an update to start tracking project activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div
                key={update.id}
                className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5 p-2 rounded-full bg-muted">
                      {getUpdateIcon(update.update_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={getUpdateBadgeVariant(update.update_type)}>
                          {getUpdateLabel(update.update_type)}
                        </Badge>
                        {update.is_internal === "yes" && (
                          <Badge variant="outline" className="text-xs">
                            Internal
                          </Badge>
                        )}
                        {update.title && (
                          <span className="font-medium">{update.title}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {update.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>
                          {update.user_name || update.client_name || "Unknown"}
                        </span>
                        <span>&bull;</span>
                        <span>
                          {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Update</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this update? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(update)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
