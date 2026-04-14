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
import { Card, CardContent } from "@/components/ui/card";
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
  PartyPopper,
} from "lucide-react";
import type { TeamSetupItem } from "@shared/schema";

// Phase 1: SOP (pre-hire setup), Phase 2: HR (forms/compliance), Phase 3: Training (post-hire)
const PHASES: { label: string; description: string; sections: string[] }[] = [
  {
    label: "New Hire Preparation",
    description: "SOP — Everything before day one",
    sections: ["Human Resources", "Admin Services", "Information Technology"],
  },
  {
    label: "HR Paperwork & Compliance",
    description: "Tax forms, agreements, handbook sign-off, HR processing",
    sections: [
      "Tax & Payroll Forms",
      "Employee Agreements",
      "Received from Employee",
      "HR Processing",
    ],
  },
  {
    label: "Orientation & Training",
    description: "Post-hire — getting trained and up to speed",
    sections: [
      "Introduction to the Company",
      "Benefits and Compensation",
      "Administrative Procedures",
      "Key Policy Review",
      "Introductions and Tours",
    ],
  },
];

// ── SVG Progress Ring ──────────────────────────
function ProgressRing({ size = 48, stroke = 4, value, total }: { size?: number; stroke?: number; value: number; total: number }) {
  const pct = total > 0 ? value / total : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const isComplete = total > 0 && value === total;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={`transition-all duration-500 ${isComplete ? "text-green-500" : "text-primary"}`}
        />
      </svg>
      <span className={`absolute text-[10px] font-semibold ${isComplete ? "text-green-600" : "text-muted-foreground"}`}>
        {value}/{total}
      </span>
    </div>
  );
}

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
      {/* ── Hero Header Card ─────────────────────── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1 -mt-1" onClick={() => setLocation("/team")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{member.employee_name}</h1>
                <Badge
                  className={
                    member.status === "complete"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  }
                >
                  {member.status === "complete" ? "Complete" : "In Progress"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                {member.job_title && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {member.job_title}
                  </span>
                )}
                {member.start_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Start: {member.start_date}
                  </span>
                )}
                {member.manager_name && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Manager: {member.manager_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Full-width progress bar */}
        <div className="px-5 py-3 border-t bg-white dark:bg-background">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold">
              {checkedItems} of {totalItems} items complete ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                allComplete ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* ── Celebration Banner (all phases complete) ── */}
      {allComplete && member.status !== "complete" && (
        <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">
                  {member.employee_name} is fully onboarded!
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  All setup items are complete. Ready to mark as done.
                </p>
              </div>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setCompletedByName(user?.email?.split("@")[0] || "");
                setIsCompleteOpen(true);
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed info */}
      {member.status === "complete" && member.completed_by_name && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
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

      {/* ── Phase Cards ──────────────────────────── */}
      {PHASES.map((phase, phaseIndex) => {
        const phaseItems = phase.sections.flatMap((s) => sectionMap.get(s) || []);
        if (phaseItems.length === 0) return null;
        const phaseChecked = phaseItems.filter((i) => i.is_checked).length;
        const phaseComplete = phaseItems.length > 0 && phaseChecked === phaseItems.length;

        return (
          <Card key={phase.label} className="overflow-hidden">
            {/* Phase Header */}
            <div
              className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                phaseComplete
                  ? "bg-green-50 dark:bg-green-950/20 border-b border-green-200"
                  : "bg-slate-50/80 dark:bg-slate-900/50 border-b"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Phase {phaseIndex + 1}
                  </span>
                  {phaseComplete && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-semibold">{phase.label}</h2>
                <p className="text-sm text-muted-foreground">{phase.description}</p>
              </div>
              <ProgressRing value={phaseChecked} total={phaseItems.length} />
            </div>

            {/* Phase complete banner inside card */}
            {phaseComplete && (
              <div className="px-5 py-2.5 bg-green-50 dark:bg-green-950/10 border-b border-green-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Phase complete!</span>
              </div>
            )}

            {/* Sections */}
            <CardContent className="pt-4 pb-2 space-y-5">
              {phase.sections.map((sectionName) => {
                const sectionItems = sectionMap.get(sectionName) || [];
                if (sectionItems.length === 0) return null;
                const sectionChecked = sectionItems.filter((i) => i.is_checked).length;

                return (
                  <div key={sectionName}>
                    {/* Section heading with divider */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {sectionName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
                        ({sectionChecked}/{sectionItems.length})
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Item rows */}
                    <div className="space-y-0.5">
                      {sectionItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 py-1.5 px-2 rounded-md hover:bg-muted/40 group transition-colors"
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
                              <div className="flex items-baseline justify-between gap-2">
                                <span className={`text-sm ${item.is_checked ? "text-muted-foreground line-through" : ""}`}>
                                  {item.item_text}
                                </span>
                                {item.is_checked && item.checked_by_user_name && (
                                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap shrink-0">
                                    ✓ {item.checked_by_user_name}
                                    {item.checked_at && <> · {new Date(item.checked_at).toLocaleDateString()}</>}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {editingItemId !== item.id && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleStartEdit(item)} title="Edit item">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteItem(item)} title="Delete item">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add item */}
                      {addingSection === sectionName ? (
                        <div className="flex items-center gap-2 py-1.5 px-2">
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

      {/* ── Complete Setup Dialog ─────────────────── */}
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
