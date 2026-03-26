import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { usePortalAuth } from "./hooks";

export function PortalLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { login } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation("/portal");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      setLocation("/portal");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage("");
    setForgotLoading(true);

    try {
      const res = await fetch("/api/portal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (!res.ok) {
        throw new Error("Failed to reset password");
      }

      setForgotMessage("If an account with this email exists, a password reset email has been sent.");
      setForgotEmail("");
      setTimeout(() => setShowForgotPassword(false), 3000);
    } catch (err) {
      setForgotMessage("Error: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setForgotLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Artisan Tile Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-wider text-slate-900">ARTISAN</h1>
          <p className="text-xs tracking-[0.3em] text-slate-500 uppercase mt-1">Tile Kitchen & Bath</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Client Portal</CardTitle>
            <CardDescription>
              Sign in to view your project progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {forgotMessage && (
              <div
                className={`p-3 text-sm rounded-md ${
                  forgotMessage.startsWith("Error")
                    ? "text-red-600 bg-red-50 border border-red-200"
                    : "text-green-600 bg-green-50 border border-green-200"
                }`}
              >
                {forgotMessage}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={forgotLoading}>
              {forgotLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
