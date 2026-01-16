import { useState, useEffect } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BugReportButtonProps {
  variant?: "floating" | "inline";
  className?: string;
}

export function BugReportButton({ variant = "floating", className }: BugReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and description for the bug report.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const browserInfo = `${navigator.userAgent}`;
      const pageUrl = window.location.href;

      await apiRequest("POST", "/api/bug-reports", {
        title: title.trim(),
        description: description.trim(),
        page_url: pageUrl,
        browser_info: browserInfo,
      });

      toast({
        title: "Bug Report Submitted",
        description: "Thank you for your feedback. We'll look into this issue.",
      });

      setTitle("");
      setDescription("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit the bug report. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global error handler to capture and report JavaScript errors
  useEffect(() => {
    const handleError = async (event: ErrorEvent) => {
      try {
        await apiRequest("POST", "/api/bug-reports", {
          title: `JavaScript Error: ${event.message}`,
          description: `An automatic error report was generated.\n\nError: ${event.message}\n\nFile: ${event.filename}\nLine: ${event.lineno}, Column: ${event.colno}`,
          page_url: window.location.href,
          error_message: event.message,
          error_stack: event.error?.stack || "No stack trace available",
          browser_info: navigator.userAgent,
        });
      } catch (err) {
        console.error("Failed to send automatic error report:", err);
      }
    };

    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      try {
        const errorMessage = event.reason?.message || String(event.reason);
        await apiRequest("POST", "/api/bug-reports", {
          title: `Unhandled Promise Rejection: ${errorMessage.substring(0, 100)}`,
          description: `An automatic error report was generated for an unhandled promise rejection.\n\nError: ${errorMessage}`,
          page_url: window.location.href,
          error_message: errorMessage,
          error_stack: event.reason?.stack || "No stack trace available",
          browser_info: navigator.userAgent,
        });
      } catch (err) {
        console.error("Failed to send automatic error report:", err);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (variant === "floating") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={`fixed bottom-6 left-6 w-12 h-12 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-orange-600 transition-colors ${className || ""}`}
            title="Report a Bug"
          >
            <Bug className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <BugReportDialogContent
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Bug className="mr-2 h-4 w-4" />
          Report Bug
        </Button>
      </DialogTrigger>
      <BugReportDialogContent
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}

interface BugReportDialogContentProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function BugReportDialogContent({
  title,
  setTitle,
  description,
  setDescription,
  isSubmitting,
  onSubmit,
}: BugReportDialogContentProps) {
  return (
    <DialogContent className="sm:max-w-[500px]">
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-orange-500" />
            Report a Bug
          </DialogTitle>
          <DialogDescription>
            Found an issue? Let us know and we'll fix it as soon as possible.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bug-title">Summary</Label>
            <Input
              id="bug-title"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bug-description">Details</Label>
            <Textarea
              id="bug-description"
              placeholder="Please describe what happened, what you expected to happen, and any steps to reproduce the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your current page URL and browser information will be included automatically.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
