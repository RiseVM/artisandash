import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Users, ClipboardList, Mail, Loader2 } from "lucide-react";

export function Landing() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/login/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full text-center flex flex-col items-center gap-4">
        <div className="max-w-lg w-full">
          <img 
            src="/logo.jpg" 
            alt="Artisan Tile Kitchen & Bath" 
            className="w-full mx-auto mix-blend-multiply"
          />
          <p className="text-lg text-muted-foreground mt-2">Artisan Showroom Dashboard</p>
        </div>
        
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Track sample checkouts, manage customers, and monitor inventory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <ClipboardList className="h-8 w-8 text-primary" />
                <span>Track Checkouts</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <span>Manage Customers</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                <span>Inventory</span>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Sign In with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {!showEmailForm ? (
              <Button 
                variant="outline"
                className="w-full" 
                size="lg"
                onClick={() => setShowEmailForm(true)}
                data-testid="button-show-email-login"
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign In with Email
              </Button>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@artisantilect.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-login-password"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500" data-testid="text-login-error">{error}</p>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                  data-testid="button-email-login-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground mt-2">
          Staff Portal
        </p>
      </div>
    </div>
  );
}
