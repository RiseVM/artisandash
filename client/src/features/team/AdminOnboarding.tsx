import { useState } from "react";
import { useLocation } from "wouter";
import {
  useTeamMembers,
  useCreateTeamMember,
  useDeleteTeamMember,
} from "./hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users2,
  Plus,
  Loader2,
  Trash2,
  Save,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import type { TeamMember } from "@shared/schema";

type TeamMemberWithProgress = TeamMember & { total_items: number; checked_items: number };

export function AdminOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: members = [], isLoading } = useTeamMembers() as {
    data: TeamMemberWithProgress[] | undefined;
    isLoading: boolean;
  };
  const createMutation = useCreateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({
    employee_name: "",
    job_title: "",
    manager_name: "",
    start_date: "",
  });

  const handleCreate = async (navigate: boolean) => {
    if (!form.employee_name.trim()) return;
    try {
      const member = await createMutation.mutateAsync({
        employee_name: form.employee_name.trim(),
        job_title: form.job_title.trim() || null,
        manager_name: form.manager_name.trim() || null,
        start_date: form.start_date || null,
      } as any);
      setIsCreateOpen(false);
      setForm({ employee_name: "", job_title: "", manager_name: "", start_date: "" });
      toast({ title: "Team Member Added", description: form.employee_name });
      if (navigate) {
        setLocation(`/team/setup/${member.id}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast({ title: "Team Member Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            New Member Setup
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Onboarding management for new team members
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            No team members added yet. Add your first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const total = m.total_items || 0;
            const checked = m.checked_items || 0;
            const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
            const isComplete = m.status === "complete";
            const isReady = !isComplete && pct === 100;

            return (
              <Card
                key={m.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/team/setup/${m.id}`)}
              >
                <div className="flex">
                  {/* Left accent bar */}
                  <div
                    className={`w-1.5 shrink-0 ${
                      isComplete ? "bg-green-500" : isReady ? "bg-blue-500" : "bg-blue-300"
                    }`}
                  />
                  <CardContent className="flex-1 py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{m.employee_name}</span>
                          {m.job_title && (
                            <span className="text-sm text-muted-foreground hidden sm:inline">
                              — {m.job_title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {m.start_date && <span>Start: {m.start_date}</span>}
                          <span>
                            {checked}/{total} items
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              isComplete ? "bg-green-500" : "bg-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          className={
                            isComplete
                              ? "bg-green-100 text-green-800"
                              : isReady
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {isComplete ? "Complete" : isReady ? "Ready" : `${pct}%`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hidden sm:flex"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/team/setup/${m.id}`);
                          }}
                        >
                          Open
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(m);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              <Input
                placeholder="Full name"
                value={form.employee_name}
                onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g., Tile Installer"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input
                placeholder="Who they report to"
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreate(false)}
              disabled={createMutation.isPending || !form.employee_name.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={() => handleCreate(true)}
              disabled={createMutation.isPending || !form.employee_name.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Save & Start Setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.employee_name}" and their entire setup
              checklist.
            </AlertDialogDescription>
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
    </div>
  );
}
