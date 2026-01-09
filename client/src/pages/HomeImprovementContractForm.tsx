import { useState, useRef } from "react";
import { useLocation } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { useCreateContract } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Home, Eye, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { HomeImprovementContractPreview } from "@/components/HomeImprovementContractPreview";

export function HomeImprovementContractForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createContractMutation = useCreateContract();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [step, setStep] = useState<'form' | 'preview' | 'sign'>('form');
  const [hasReviewedContract, setHasReviewedContract] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
    ownerName1: "",
    ownerName2: "",
    ownerAddress: "",
    propertyAddress: "",
    workDescription: "",
    laborPrice: "",
    materialsPrice: "",
    totalContractPrice: "",
    startDate: "",
    completionDate: "",
    contractorDisclosure: "",
  });

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'laborPrice' || name === 'materialsPrice') {
        const labor = parseFloat(name === 'laborPrice' ? value : prev.laborPrice) || 0;
        const materials = parseFloat(name === 'materialsPrice' ? value : prev.materialsPrice) || 0;
        updated.totalContractPrice = (labor + materials).toFixed(2);
      }
      return updated;
    });
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const validateForm = () => {
    if (!formData.ownerName1 || !customerEmail) {
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
        contract_type: "home_improvement",
        customer_name: formData.ownerName1,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_address: formData.ownerAddress || null,
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
          Home Improvement Contract
        </h1>
        <p className="text-muted-foreground">
          {step === 'form' && "Step 1: Fill out the contract details"}
          {step === 'preview' && "Step 2: Review the complete contract"}
          {step === 'sign' && "Step 3: Sign the contract"}
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
              <Home className="h-5 w-5" />
              Contract Information
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
              <h3 className="font-semibold mb-3">Property Owner Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ownerName1">Owner Name 1 *</Label>
                  <Input id="ownerName1" name="ownerName1" value={formData.ownerName1} onChange={handleInputChange} required data-testid="input-owner-name-1" />
                </div>
                <div>
                  <Label htmlFor="ownerName2">Owner Name 2 (if applicable)</Label>
                  <Input id="ownerName2" name="ownerName2" value={formData.ownerName2} onChange={handleInputChange} data-testid="input-owner-name-2" />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required data-testid="input-email" />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input id="customerPhone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} data-testid="input-phone" />
                </div>
                <div>
                  <Label htmlFor="ownerAddress">Owner Address</Label>
                  <Input id="ownerAddress" name="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} data-testid="input-owner-address" />
                </div>
                <div>
                  <Label htmlFor="propertyAddress">Property Address (where work performed)</Label>
                  <Input id="propertyAddress" name="propertyAddress" value={formData.propertyAddress} onChange={handleInputChange} data-testid="input-property-address" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Description of Work (Exhibit A)</h3>
              <Textarea
                id="workDescription"
                name="workDescription"
                value={formData.workDescription}
                onChange={handleInputChange}
                placeholder="Describe the home improvement work to be performed..."
                rows={4}
                data-testid="input-work-description"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="laborPrice">Labor ($)</Label>
                  <Input id="laborPrice" name="laborPrice" type="number" step="0.01" value={formData.laborPrice} onChange={handleInputChange} data-testid="input-labor-price" />
                </div>
                <div>
                  <Label htmlFor="materialsPrice">Materials ($)</Label>
                  <Input id="materialsPrice" name="materialsPrice" type="number" step="0.01" value={formData.materialsPrice} onChange={handleInputChange} data-testid="input-materials-price" />
                </div>
                <div>
                  <Label htmlFor="totalContractPrice">Total Contract Price</Label>
                  <Input id="totalContractPrice" name="totalContractPrice" value={formData.totalContractPrice} readOnly className="bg-muted" data-testid="input-total" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Project Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Estimated Start Date</Label>
                  <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} data-testid="input-start-date" />
                </div>
                <div>
                  <Label htmlFor="completionDate">Estimated Completion Date</Label>
                  <Input id="completionDate" name="completionDate" type="date" value={formData.completionDate} onChange={handleInputChange} data-testid="input-completion-date" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Contractor Disclosure Statement</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Any facts regarding claims or lawsuits the contractor is a party to (leave blank if none)
              </p>
              <Textarea
                id="contractorDisclosure"
                name="contractorDisclosure"
                value={formData.contractorDisclosure}
                onChange={handleInputChange}
                placeholder="None."
                rows={2}
                data-testid="input-contractor-disclosure"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/contracts")} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="button" onClick={goToPreview} data-testid="button-preview">
                <Eye className="h-4 w-4 mr-2" />
                Review Contract
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
              Review Complete Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                Please read the entire contract carefully before signing. This document is legally binding.
              </p>
            </div>

            <div className="flex justify-end mb-4">
              <a 
                href="/api/contract-templates/home-improvement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                data-testid="link-download-template"
              >
                <Download className="h-4 w-4 mr-1" />
                Download blank contract template (PDF)
              </a>
            </div>

            <HomeImprovementContractPreview formData={formData} />

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox 
                id="reviewed" 
                checked={hasReviewedContract}
                onCheckedChange={(checked) => setHasReviewedContract(checked === true)}
                data-testid="checkbox-reviewed"
              />
              <label htmlFor="reviewed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have read and understand the complete contract terms above
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
                <Home className="h-5 w-5" />
                Sign the Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  You have reviewed and agreed to the contract terms. Please sign below to complete the agreement.
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Customer Signature *</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Sign in the box below. Your signature will be applied to the complete contract document you just reviewed.
                </p>
                <div className="border rounded-md bg-white p-2">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{
                      className: "w-full h-32 border border-dashed border-gray-300 rounded",
                    } as React.CanvasHTMLAttributes<HTMLCanvasElement>}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={clearSignature} data-testid="button-clear-signature">
                  Clear Signature
                </Button>
              </div>

              <div className="flex justify-between gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setStep('preview')} data-testid="button-back-to-preview">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Review
                </Button>
                <Button type="submit" disabled={createContractMutation.isPending} data-testid="button-submit">
                  {createContractMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign & Create Contract
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
