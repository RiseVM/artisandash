import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Users, ClipboardList } from "lucide-react";

export function Landing() {
  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full text-center flex flex-col items-center gap-4">
        <div className="max-w-lg w-full">
          <img 
            src="/logo.jpg" 
            alt="Artisan Tile Kitchen & Bath" 
            className="w-full mx-auto mix-blend-multiply"
          />
          <p className="text-lg text-muted-foreground mt-2">Sample Tracker</p>
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
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground mt-2">
          Staff Portal
        </p>
      </div>
    </div>
  );
}
