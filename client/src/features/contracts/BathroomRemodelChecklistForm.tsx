import { useState, useRef } from "react";
import { useLocation } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { useCreateContract } from "./hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, PenLine, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { BathroomRemodelChecklistPreview } from "./components/BathroomRemodelChecklistPreview";

export function BathroomRemodelChecklistForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createContractMutation = useCreateContract();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [step, setStep] = useState<'form' | 'preview' | 'sign'>('form');
  const [hasReviewedContract, setHasReviewedContract] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
    clientName: "",
    clientAddress: "",
    propertyAddress: "",
    renovationType: "Full gut renovation",
    fixtures: "New tub/shower, toilet, vanity/sink",
    tileWork: "New floor tile and wall/shower surround tile",
    plumbing: "Moving or adding supply and drain lines",
    electrical: "New lighting, GFCI outlets, exhaust fan, heated floors",
    estimatedTimeline: "4-8 weeks",
  });

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const validateForm = () => {
    if (!formData.clientName || !customerEmail) {
      toast({ title: "Please fill in required fields (Name and Email)", variant: "destructive" });
      return false;
    }
    return true;
  };

  const goToPreview = () => {
    if (validateForm()) {
      setStep('preview');
    }
  };

  const goToSign = () => {
    if (!hasReviewedContract) {
      toast({ title: "Please confirm you have reviewed the contract", variant: "destructive" });
      return;
    }
    setStep('sign');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasReviewedContract) {
      toast({ title: "Please review the contract before signing", variant: "destructive" });
      setStep('preview');
      return;
    }

    const signatureData = sigCanvas.current?.toDataURL("image/png");
    if (!signatureData || sigCanvas.current?.isEmpty()) {
      toast({ title: "Signature is required", variant: "destructive" });
      return;
    }

    try {
      await createContractMutation.mutateAsync({
        contract_type: "bathroom_remodel_checklist",
        customer_name: formData.clientName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_address: formData.clientAddress || null,
        property_address: formData.propertyAddress || null,
        form_data: { ...formData, contractReviewed: true },
        signature_data: signatureData,
      });

      toast({ title: "Contract created successfully!" });
      setLocation("/contracts");
    } catch (err) {
      toast({ title: "Error creating contract", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/contracts")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold text-primary" data-testid="text-page-title">
          Bathroom Remodel Checklist
        </h1>
        <p className="text-muted-foreground">
          {step === 'form' && "Step 1: Fill out the project details"}
          {step === 'preview' && "Step 2: Review the complete checklist"}
          {step === 'sign' && "Step 3: Sign the checklist"}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className={`h-2 flex-1 rounded ${step === 'form' ? 'bg-primary' : 'bg-primary/30'}`} />
        <div className={`h-2 flex-1 rounded ${step === 'preview' ? 'bg-primary' : 'bg-primary/30'}`} />
        <div className={`h-2 flex-1 rounded ${step === 'sign' ? 'bg-primary' : 'bg-primary/30'}`} />
      </div>

      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" value={formData.date} onChange={handleInputChange} data-testid="input-date" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required
                    data-testid="input-client-name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Client Address</Label>
                  <Input
                    id="clientAddress"
                    name="clientAddress"
                    value={formData.clientAddress}
                    onChange={handleInputChange}
                    data-testid="input-client-address"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyAddress">Property Address</Label>
                  <Input
                    id="propertyAddress"
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    data-testid="input-property-address"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Project Scope</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="renovationType">Renovation Type</Label>
                  <Input
                    id="renovationType"
                    name="renovationType"
                    value={formData.renovationType}
                    onChange={handleInputChange}
                    data-testid="input-renovation-type"
                  />
                </div>
                <div>
                  <Label htmlFor="fixtures">Fixtures</Label>
                  <Input
                    id="fixtures"
                    name="fixtures"
                    value={formData.fixtures}
                    onChange={handleInputChange}
                    data-testid="input-fixtures"
                  />
                </div>
                <div>
                  <Label htmlFor="tileWork">Tile Work</Label>
                  <Input
                    id="tileWork"
                    name="tileWork"
                    value={formData.tileWork}
                    onChange={handleInputChange}
                    data-testid="input-tile-work"
                  />
                </div>
                <div>
                  <Label htmlFor="plumbing">Plumbing</Label>
                  <Input
                    id="plumbing"
                    name="plumbing"
                    value={formData.plumbing}
                    onChange={handleInputChange}
                    data-testid="input-plumbing"
                  />
                </div>
                <div>
                  <Label htmlFor="electrical">Electrical</Label>
                  <Input
                    id="electrical"
                    name="electrical"
                    value={formData.electrical}
                    onChange={handleInputChange}
                    data-testid="input-electrical"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedTimeline">Estimated Timeline</Label>
                  <Input
                    id="estimatedTimeline"
                    name="estimatedTimeline"
                    value={formData.estimatedTimeline}
                    onChange={handleInputChange}
                    data-testid="input-timeline"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm font-medium">Project Checklist Coverage</p>
              <p className="text-blue-700 text-sm mt-1">
                This checklist covers permits, planning, demolition, rough-in, finishing, and final inspection
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/contracts")} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="button" onClick={goToPreview} data-testid="button-preview">
                <Eye className="h-4 w-4 mr-2" />
                Review Checklist
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Complete Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                Please read the entire checklist carefully before signing. This document is legally binding.
              </p>
            </div>

            <BathroomRemodelChecklistPreview formData={formData} />

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="reviewed"
                checked={hasReviewedContract}
                onCheckedChange={(checked) => setHasReviewedContract(checked === true)}
                data-testid="checkbox-reviewed"
              />
              <label htmlFor="reviewed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have read and understand the complete checklist above
              </label>
            </div>

            <div className="flex justify-between gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep('form')} data-testid="button-back-to-form">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <Button type="button" onClick={goToSign} disabled={!hasReviewedContract} data-testid="button-proceed-sign">
                Proceed to Sign
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'sign' && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                Sign the Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  You have reviewed and agreed to the terms. Please sign below to complete the checklist.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Client Signature *</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Sign in the box below. Your signature will be applied to the complete checklist document you just reviewed.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{
                      className: "w-full",
                      height: 200,
                      "data-testid": "signature-canvas",
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="mt-2"
                  data-testid="button-clear-signature"
                >
                  Clear Signature
                </Button>
              </div>

              <div className="flex justify-between gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep('preview')} data-testid="button-back-to-preview">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Review
                </Button>
                <Button
                  type="submit"
                  disabled={createContractMutation.isPending}
                  data-testid="button-submit"
                >
                  {createContractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PenLine className="h-4 w-4 mr-2" />
                  )}
                  Sign & Submit Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
