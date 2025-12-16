import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Users, ClipboardList, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
            <CardTitle>Staff Login</CardTitle>
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
            
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
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
                data-testid="button-login-submit"
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
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground mt-2">
          Staff Portal
        </p>
      </div>
    </div>
  );
}
