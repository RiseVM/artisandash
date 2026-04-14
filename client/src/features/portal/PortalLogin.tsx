import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { usePortalAuth } from "./hooks";

export function PortalLogin() {
  const [, setLocation] = useLocation();
  const { login, isLoading } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    try {
      await login(email, password);
      setLocation("/portal");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(215,30%,12%)] p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Brand Header */}
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(215,30%,35%)] mb-5 shadow-lg">
              <span className="text-xl font-bold text-white tracking-tight">AT</span>
            </div>
            <p className="text-xs font-semibold tracking-widest text-[hsl(215,30%,35%)] uppercase mb-1">
              Client Portal
            </p>
            <h1 className="text-xl font-bold text-gray-900">
              Artisan Tile Kitchen & Bath
            </h1>
          </div>

          {/* Divider */}
          <div className="mx-8 border-t border-gray-100" />

          {/* Form */}
          <div className="px-8 pt-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-gray-600">
                  Your email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-600">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[hsl(215,30%,25%)] hover:bg-[hsl(215,30%,20%)] text-white font-medium text-sm rounded-lg shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[hsl(215,30%,45%)] hover:text-[hsl(215,30%,30%)] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-white/40">
          Powered by Artisan Tile Kitchen & Bath
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {forgotMessage && (
              <div
                className={`p-3 text-sm rounded-lg ${
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
