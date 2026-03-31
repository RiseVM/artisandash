import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useTeamMember,
  useUpdateTeamMember,
  useUpdateSetupItem,
  useCreateSetupItem,
  useDeleteSetupItem,
} from "./hooks";
import { useAuth } from "@/features/auth/hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Calendar,
  Briefcase,
  User,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react";
import type { TeamSetupItem } from "@shared/schema";

// Phases with their sub-sections, matching the ATK&B new hire documents
const PHASES: { label: string; description: string; sections: string[] }[] = [
  {
    label: "Phase 1: Preparation",
    description: "Done before start date",
    sections: ["Workspace & Equipment", "Systems & Access", "Day One Preparation"],
  },
  {
    label: "Phase 2: Company Orientation",
    description: "First 3 days",
    sections: ["Introduction to the Company", "Facility Tour", "How We Work"],
  },
  {
    label: "Phase 3: Policies & Standards",
    description: "First week",
    sections: ["Workplace Policies", "Safety & Procedures"],
  },
];

export function TeamMemberDetail() {
  const [, params] = useRoute("/team/setup/:id");
  const [, setLocation] = useLocation();
  const memberId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: member, isLoading } = useTeamMember(memberId);
  const updateMemberMutation = useUpdateTeamMember();
  const updateItemMutation = useUpdateSetupItem();
  const createItemMutation = useCreateSetupItem();
  const deleteItemMutation = useDeleteSetupItem();

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [completedByName, setCompletedByName] = useState("");

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // Add new item state
  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");

  const handleToggleItem = async (item: TeamSetupItem) => {
    try {
      await updateItemMutation.mutateAsync({
        id: item.id,
        teamMemberId: memberId,
        is_checked: !item.is_checked,
        checked_by_name: user?.email?.split("@")[0] || "Unknown",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleCompleteSetup = async () => {
    if (!completedByName.trim()) return;
    try {
      await updateMemberMutation.mutateAsync({
        id: memberId,
        data: {
          status: "complete",
          completed_by_name: completedByName.trim(),
          completed_at: new Date(),
        } as any,
      });
      setIsCompleteOpen(false);
      toast({ title: "Setup Complete!", description: `${member?.employee_name} is fully onboarded.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleStartEdit = (item: TeamSetupItem) => {
    setEditingItemId(item.id);
    setEditingText(item.item_text);
  };

  const handleSaveEdit = async () => {
    if (!editingItemId || !editingText.trim()) return;
    try {
      await updateItemMutation.mutateAsync({
        id: editingItemId,
        teamMemberId: memberId,
        item_text: editingText.trim(),
      });
      setEditingItemId(null);
      setEditingText("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (item: TeamSetupItem) => {
    try {
      await deleteItemMutation.mutateAsync({ id: item.id, teamMemberId: memberId });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  const handleAddItem = async (section: string) => {
    if (!newItemText.trim()) return;
    try {
      await createItemMutation.mutateAsync({
        teamMemberId: memberId,
        section,
        item_text: newItemText.trim(),
      });
      setAddingSection(null);
      setNewItemText("");
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

  if (!member) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Team member not found.</p>
        <Button variant="link" onClick={() => setLocation("/team")}>
          Back to Team Resources
        </Button>
      </div>
    );
  }

  const items = member.items || [];
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.is_checked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const allComplete = totalItems > 0 && checkedItems === totalItems;

  // Group items by section
  const sectionMap = new Map<string, TeamSetupItem[]>();
  for (const item of items) {
    if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
    sectionMap.get(item.section)!.push(item);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/team")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">{member.employee_name}</h1>
              <Badge
                className={
                  member.status === "complete"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {member.status === "complete" ? "Complete" : "In Progress"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {member.job_title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {member.job_title}
                </span>
              )}
              {member.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start: {member.start_date}
                </span>
              )}
              {member.manager_name && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Manager: {member.manager_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {checkedItems}/{totalItems} items ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                allComplete ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* All Complete Banner */}
      {allComplete && member.status !== "complete" && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                All setup items complete! Mark this team member as fully onboarded?
              </span>
            </div>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setCompletedByName(user?.email?.split("@")[0] || "");
                setIsCompleteOpen(true);
              }}
            >
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed info */}
      {member.status === "complete" && member.completed_by_name && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>
                Setup completed by <strong>{member.completed_by_name}</strong>
                {member.completed_at && (
                  <> on {new Date(member.completed_at).toLocaleDateString()}</>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Cards */}
      {PHASES.map((phase) => {
        // Gather all items for this phase's sections
        const phaseItems = phase.sections.flatMap((s) => sectionMap.get(s) || []);
        if (phaseItems.length === 0) return null;
        const phaseChecked = phaseItems.filter((i) => i.is_checked).length;

        return (
          <Card key={phase.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{phase.label}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {phaseChecked}/{phaseItems.length} complete
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {phase.sections.map((sectionName) => {
                const sectionItems = sectionMap.get(sectionName) || [];
                if (sectionItems.length === 0) return null;
                return (
                  <div key={sectionName}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
                      {sectionName}
                    </div>
                    <div className="space-y-1">
                      {sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/50 group"
                        >
                          <Checkbox
                            checked={item.is_checked}
                            onCheckedChange={() => handleToggleItem(item)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            {editingItemId === item.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit();
                                    if (e.key === "Escape") { setEditingItemId(null); setEditingText(""); }
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingItemId(null); setEditingText(""); }}>
                                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className={`text-sm ${
                                    item.is_checked ? "text-muted-foreground line-through" : ""
                                  }`}
                                >
                                  {item.item_text}
                                </span>
                                {item.is_checked && item.checked_by_user_name && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    ✓ {item.checked_by_user_name}
                                    {item.checked_at && (
                                      <> — {new Date(item.checked_at).toLocaleDateString()}</>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {editingItemId !== item.id && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleStartEdit(item)}
                                title="Edit item"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleDeleteItem(item)}
                                title="Delete item"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Add new item */}
                      {addingSection === sectionName ? (
                        <div className="flex items-center gap-2 py-2 px-2">
                          <Input
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            placeholder="New checklist item..."
                            className="h-7 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddItem(sectionName);
                              if (e.key === "Escape") { setAddingSection(null); setNewItemText(""); }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddItem(sectionName)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setAddingSection(null); setNewItemText(""); }}>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 transition-colors"
                          onClick={() => { setAddingSection(sectionName); setNewItemText(""); }}
                        >
                          <Plus className="h-3 w-3" />
                          Add item
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Complete Setup Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Setup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Completed By</Label>
              <Input
                placeholder="Your name"
                value={completedByName}
                onChange={(e) => setCompletedByName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteSetup}
              disabled={updateMemberMutation.isPending || !completedByName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMemberMutation.isPending ? "Completing..." : "Mark as Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
