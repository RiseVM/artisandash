import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function LoginFailed() {
  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full text-center flex flex-col items-center gap-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only @artisantilect.com email addresses can access this application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.location.href = "/"}
              data-testid="button-return-home"
            >
              Return to Welcome Screen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
