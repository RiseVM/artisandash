import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Home, CheckCircle, AlertCircle } from "lucide-react";
import { HomeImprovementContractPreview } from "@/components/HomeImprovementContractPreview";
import { CabinetryContractPreview } from "@/components/CabinetryContractPreview";

export function RemoteSign() {
  const { token } = useParams<{ token: string }>();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: contract, isLoading, error: fetchError } = useQuery({
    queryKey: ["sign", token],
    queryFn: async () => {
      const res = await fetch(`/api/sign/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load contract");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const handleSubmit = async () => {
    if (!hasReviewed) {
      setError("Please review and acknowledge the contract before signing.");
      return;
    }

    const signatureData = sigCanvas.current?.toDataURL("image/png");
    if (!signatureData || sigCanvas.current?.isEmpty()) {
      setError("Please sign in the signature box above.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: signatureData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit signature");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit signature. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Contract</h2>
            <p className="text-muted-foreground">
              {(fetchError as Error).message}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Please contact Artisan Tile Kitchen & Bath if you need a new signing link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contract Signed Successfully!</h2>
            <p className="text-muted-foreground">
              Thank you for signing the contract. A copy has been sent to your email address.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contract) return null;

  const contractTypeName = contract.contract_type === 'custom_cabinetry'
    ? 'Cabinet Design & Layout Agreement'
    : 'Home Improvement Contract';

  const Icon = contract.contract_type === 'custom_cabinetry' ? FileText : Home;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Artisan Tile Kitchen & Bath</h1>
          <p className="text-muted-foreground">Contract Review & Signature</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {contractTypeName}
            </CardTitle>
            <CardDescription>
              Prepared for: {contract.customer_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                Please read the entire contract carefully before signing. This document is legally binding.
              </p>
            </div>

            {contract.contract_type === 'home_improvement' ? (
              <HomeImprovementContractPreview formData={contract.form_data} />
            ) : (
              <CabinetryContractPreview formData={contract.form_data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reviewed"
                checked={hasReviewed}
                onCheckedChange={(checked) => setHasReviewed(checked === true)}
              />
              <label htmlFor="reviewed" className="text-sm font-medium leading-none">
                I have read and understand the complete contract terms above
              </label>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Your Signature *</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Sign in the box below using your finger or stylus.
              </p>
              <div className="border rounded-md bg-white p-2">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: "w-full h-40 border border-dashed border-gray-300 rounded",
                  } as React.CanvasHTMLAttributes<HTMLCanvasElement>}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => sigCanvas.current?.clear()}
              >
                Clear Signature
              </Button>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !hasReviewed}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Sign Contract"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
