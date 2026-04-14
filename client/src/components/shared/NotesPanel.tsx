import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, api } from "@/lib/api";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import type { EntityNoteWithUser, EntityNote } from "@shared/schema";

interface NotesPanelProps {
  entityType: "project" | "customer" | "estimate" | "checkout";
  entityId: number;
  /** If true, the "Internal note" checkbox defaults to checked for new notes */
  defaultInternal?: boolean;
}

const noteTypeIcons: Record<string, React.ReactNode> = {
  general: <MessageSquare className="h-3 w-3" />,
  follow_up: <Clock className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  important: <AlertCircle className="h-3 w-3" />,
};

const noteTypeColors: Record<string, string> = {
  general: "bg-gray-100 text-gray-800",
  follow_up: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  important: "bg-red-100 text-red-800",
};

const noteTypeLabels: Record<string, string> = {
  general: "General",
  follow_up: "Follow-Up",
  warning: "Warning",
  important: "Important",
};

export function NotesPanel({ entityType, entityId, defaultInternal = false }: NotesPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const queryKey = ["notes", entityType, entityId];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => apiQuery<EntityNoteWithUser[]>(`/api/notes/${entityType}/${entityId}`),
    enabled: !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/notes/${entityType}/${entityId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/api/notes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteNote, setDeleteNote] = useState<EntityNoteWithUser | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("general");
  const [newIsInternal, setNewIsInternal] = useState(defaultInternal);
  const [editContent, setEditContent] = useState("");

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    try {
      await createMutation.mutateAsync({
        content: newContent,
        note_type: newType,
        is_internal: newIsInternal ? "yes" : "no",
      });
      setNewContent("");
      setNewType("general");
      setNewIsInternal(defaultInternal);
      setIsAdding(false);
      toast({ title: "Note Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleEdit = async (id: number) => {
    if (!editContent.trim()) return;
    try {
      await updateMutation.mutateAsync({ id, data: { content: editContent } });
      setEditingId(null);
      toast({ title: "Note Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleTogglePin = async (note: EntityNoteWithUser) => {
    try {
      await updateMutation.mutateAsync({
        id: note.id,
        data: { is_pinned: note.is_pinned === "yes" ? "no" : "yes" },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteNote) return;
    try {
      await deleteMutation.mutateAsync(deleteNote.id);
      setDeleteNote(null);
      toast({ title: "Note Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Note Form */}
        {isAdding && (
          <div className="mb-4 space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex gap-2 items-center">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="follow_up">Follow-Up</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto">
                <Checkbox
                  id="is-internal"
                  checked={newIsInternal}
                  onCheckedChange={(checked) => setNewIsInternal(!!checked)}
                />
                <label htmlFor="is-internal" className="text-xs font-medium text-orange-600 cursor-pointer flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Internal note (never shown to client)
                </label>
              </div>
            </div>
            <Textarea
              placeholder="Write a note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setIsAdding(false); setNewContent(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending || !newContent.trim()}>
                {createMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border ${
                  note.is_pinned === "yes" ? "border-amber-300 bg-amber-50/50" : "bg-white"
                }`}
              >
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleEdit(note.id)} disabled={updateMutation.isPending}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${noteTypeColors[note.note_type]}`}>
                          <span className="mr-1">{noteTypeIcons[note.note_type]}</span>
                          {noteTypeLabels[note.note_type]}
                        </Badge>
                        {(note as any).is_internal === "yes" && (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-300">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Internal Only
                          </Badge>
                        )}
                        {note.is_pinned === "yes" && (
                          <Pin className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleTogglePin(note)}
                          title={note.is_pinned === "yes" ? "Unpin" : "Pin"}
                        >
                          {note.is_pinned === "yes" ? (
                            <PinOff className="h-3 w-3" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteNote(note)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{note.content}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {note.created_by_user_name || "Unknown"} &middot;{" "}
                      {new Date(note.created_at).toLocaleString()}
                      {note.updated_at !== note.created_at && " (edited)"}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={(open) => !open && setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
