import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Contract } from "@shared/schema";

// Signature canvas component
function SignatureCanvas({ onSignature }: { onSignature: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
    }
  }, []);

  const handleMouseDown = () => {
    setIsDrawing(true);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSignature(canvas.toDataURL());
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
    }
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
        style={{ height: "200px" }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
      <Button type="button" variant="outline" onClick={handleClear} className="w-full">
        Clear Signature
      </Button>
    </div>
  );
}

export function RemoteSign() {
  const [, params] = useRoute("/sign/:token");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const token = params?.token as string;

  const [contract, setContract] = useState<Partial<Contract> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string>("");
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch contract data
  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await fetch(`/api/sign/${token}`);

        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Failed to load contract");
          return;
        }

        const data = await res.json();
        setContract(data);
      } catch (err) {
        setError("Failed to load contract. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchContract();
    }
  }, [token]);

  const handleSubmitSignature = async () => {
    if (!signatureData) {
      toast({ title: "Please provide a signature", variant: "destructive" });
      return;
    }

    if (!reviewed) {
      toast({ title: "Please confirm you've reviewed the contract", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: signatureData }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit signature");
      }

      setSuccess(true);
      toast({ title: "Contract signed successfully!" });

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit signature",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Cannot Access Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-4">
              If you believe this is an error, please contact Artisan Tile Kitchen & Bath.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Contract Signed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              Your contract has been signed and a copy has been sent to your email.
            </p>
            <p className="text-sm text-green-600 mt-4">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Review and Sign Your Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contract Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Contract Type</p>
                <p className="font-semibold">
                  {contract?.contract_type === "custom_cabinetry"
                    ? "Cabinet Design and Layout Agreement"
                    : "Home Improvement Contract"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-semibold">{contract?.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{contract?.customer_email}</p>
              </div>
            </div>

            {/* Contract Form Data Preview */}
            {contract?.form_data && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Contract Details</p>
                <pre className="text-xs overflow-auto max-h-64 bg-white p-3 rounded border border-blue-100">
                  {JSON.stringify(contract.form_data, null, 2)}
                </pre>
              </div>
            )}

            {/* Signature Canvas */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Your Signature *</label>
              <p className="text-xs text-muted-foreground">
                Please sign in the box below. Use your mouse or touchpad to draw your signature.
              </p>
              <SignatureCanvas onSignature={setSignatureData} />
            </div>

            {/* Review Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="reviewed"
                checked={reviewed}
                onCheckedChange={(checked) => setReviewed(checked as boolean)}
              />
              <label htmlFor="reviewed" className="text-sm">
                I have reviewed the contract details and agree to sign this contract.
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitSignature}
              disabled={submitting || !signatureData || !reviewed}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Signature...
                </>
              ) : (
                "Sign and Submit"
              )}
            </Button>

            {/* Footer */}
            <p className="text-xs text-muted-foreground text-center">
              A copy of your signed contract will be sent to your email address.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
