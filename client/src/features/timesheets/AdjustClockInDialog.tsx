import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  formatTimeEST,
  formatShortDateEST,
  toEstDateString,
  estWallClockToUtc,
} from "@/lib/utils";
import { useAdminUpdateClockEntry } from "./hooks";

/**
 * Admin dialog to adjust the clock_in time on a clock entry — including
 * entries that are still active (clock_out IS NULL). All times entered are
 * EST wall-clock; we convert to UTC via estWallClockToUtc before sending.
 *
 * Props are kept loose (`any`) for the entry to match how AdminTimesheets
 * passes data; we only read `id`, `clock_in`, `clock_out`, and `user`.
 */
export function AdjustClockInDialog({
  entry,
  onClose,
}: {
  entry: {
    id: number;
    clock_in: string;
    clock_out: string | null;
    user?: { firstName: string | null; lastName: string | null; email: string } | null;
  } | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const updateMutation = useAdminUpdateClockEntry();

  // EST date/time pieces — initialised when the dialog opens against the
  // entry's *current* clock_in (refetched from props each time, so it
  // reflects the latest state if another admin just changed it).
  const [estDate, setEstDate] = useState(""); // YYYY-MM-DD
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [reason, setReason] = useState("");

  // When the dialog opens (entry becomes truthy) or the underlying entry
  // changes, re-seed the inputs from live data.
  useEffect(() => {
    if (!entry) return;
    const d = new Date(entry.clock_in);
    setEstDate(toEstDateString(d));
    // Pull the EST hour/minute via Intl so the seed value is what the admin
    // sees on the row, not browser-local.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    let h24 = get("hour");
    if (h24 === 24) h24 = 0;
    const m = get("minute");
    const a: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    setHour12(h12);
    setMinute(Math.round(m / 5) * 5); // snap to 5-min increment
    setAmpm(a);
    setReason("");
  }, [entry?.id, entry?.clock_in]);

  // Constrain date selector to today (in EST) and the previous 2 days.
  const dateOptions = useMemo(() => {
    const todayEst = toEstDateString(new Date());
    // toEstDateString returns YYYY-MM-DD strings; build an array by
    // subtracting days on a UTC-anchored timestamp.
    const todayParts = todayEst.split("-").map((s) => parseInt(s, 10));
    const todayUtcMs = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const out: string[] = [];
    for (let i = 0; i <= 2; i++) {
      const ms = todayUtcMs - i * 86_400_000;
      out.push(new Date(ms).toISOString().slice(0, 10));
    }
    return out;
  }, []);

  // Compute the proposed UTC instant for display warnings + payload.
  const proposed = useMemo(() => {
    if (!estDate) return null;
    const [y, m, d] = estDate.split("-").map((s) => parseInt(s, 10));
    const h24 = (() => {
      let h = hour12 % 12;
      if (ampm === "PM") h += 12;
      return h;
    })();
    return estWallClockToUtc(y, m - 1, d, h24, minute);
  }, [estDate, hour12, minute, ampm]);

  if (!entry) return null;

  const employeeName =
    [entry.user?.firstName, entry.user?.lastName].filter(Boolean).join(" ") ||
    entry.user?.email ||
    "Unknown employee";
  const originalDate = new Date(entry.clock_in);

  // Guards
  const inFuture = proposed ? proposed.getTime() > Date.now() + 60_000 : false;
  const bigShiftWarning =
    proposed &&
    Math.abs(proposed.getTime() - originalDate.getTime()) > 12 * 3_600_000;

  const handleSave = async () => {
    if (!proposed) return;
    if (inFuture) return;
    try {
      await updateMutation.mutateAsync({
        id: entry.id,
        clock_in: proposed.toISOString(),
        reason: reason.trim() || undefined,
      });
      toast({ title: "Clock-in time updated" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Failed to update clock-in",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Adjust Clock-In Time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-xs">Employee</Label>
            <p className="text-sm font-medium">{employeeName}</p>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Original clock-in</Label>
            <p className="text-sm">
              {formatShortDateEST(originalDate)} at {formatTimeEST(originalDate)}
            </p>
          </div>

          <div>
            <Label className="text-xs">Date</Label>
            <select
              className="w-full mt-1 h-9 border rounded-md px-2 text-sm bg-background"
              value={estDate}
              onChange={(e) => setEstDate(e.target.value)}
            >
              {dateOptions.includes(estDate) ? null : (
                <option value={estDate}>{estDate} (original)</option>
              )}
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {formatShortDateEST(d + "T12:00:00Z")}{" "}
                  {d === toEstDateString(new Date()) ? "(today)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">New clock-in time (EST)</Label>
            <div className="flex items-center gap-2 mt-1">
              <select
                className="h-9 border rounded-md px-2 text-sm bg-background"
                value={hour12}
                onChange={(e) => setHour12(parseInt(e.target.value, 10))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">:</span>
              <select
                className="h-9 border rounded-md px-2 text-sm bg-background"
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value, 10))}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className="h-9 border rounded-md px-2 text-sm bg-background"
                value={ampm}
                onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            {proposed && (
              <p className="text-xs text-muted-foreground mt-1">
                Will be saved as {formatShortDateEST(proposed)} {formatTimeEST(proposed)} EST.
              </p>
            )}
          </div>

          {inFuture && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              That time is in the future — clock-ins must already have happened.
            </p>
          )}
          {!inFuture && bigShiftWarning && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Heads up: this is more than 12 hours different from the original. Double-check AM/PM.
            </p>
          )}

          <div>
            <Label className="text-xs">
              Reason <span className="text-muted-foreground">(optional, recommended)</span>
            </Label>
            <textarea
              className="w-full mt-1 border rounded-md px-2 py-1.5 text-sm bg-background"
              rows={2}
              placeholder="e.g. Forgot to clock in until 8:30, actually started at 8:00"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={updateMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!proposed || inFuture || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
