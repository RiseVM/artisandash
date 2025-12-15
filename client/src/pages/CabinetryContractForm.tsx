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
import { ArrowLeft, Loader2, FileText, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { CabinetryContractPreview } from "@/components/CabinetryContractPreview";

export function CabinetryContractForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createContractMutation = useCreateContract();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [step, setStep] = useState<'form' | 'preview' | 'sign'>('form');
  const [hasReviewedContract, setHasReviewedContract] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
    purchaserName: "",
    purchaserAddress: "",
    propertyAddress: "",
    contractPrice: "",
    ctSalesTax: "",
    totalAmount: "",
    deposit: "",
    balance: "",
    workDescription: "",
  });

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'contractPrice') {
        const price = parseFloat(value) || 0;
        const tax = price * 0.0635;
        const total = price + tax;
        updated.ctSalesTax = tax.toFixed(2);
        updated.totalAmount = total.toFixed(2);
        updated.deposit = (total * 0.60).toFixed(2);
        updated.balance = (total * 0.40).toFixed(2);
      }
      return updated;
    });
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const validateForm = () => {
    if (!formData.purchaserName || !customerEmail) {
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

    const signatureData = sigCanvas.current?.toDataURL("image/png");
    if (!signatureData || sigCanvas.current?.isEmpty()) {
      toast({ title: "Signature is required", variant: "destructive" });
      return;
    }

    try {
      await createContractMutation.mutateAsync({
        contract_type: "custom_cabinetry",
        customer_name: formData.purchaserName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        customer_address: formData.purchaserAddress || null,
        property_address: formData.propertyAddress || null,
        form_data: formData,
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
          Cabinet Design & Layout Agreement
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
              <FileText className="h-5 w-5" />
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
              <h3 className="font-semibold mb-3">Purchaser Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaserName">Purchaser Name *</Label>
                  <Input id="purchaserName" name="purchaserName" value={formData.purchaserName} onChange={handleInputChange} required data-testid="input-purchaser-name" />
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
                  <Label htmlFor="purchaserAddress">Purchaser Address</Label>
                  <Input id="purchaserAddress" name="purchaserAddress" value={formData.purchaserAddress} onChange={handleInputChange} data-testid="input-purchaser-address" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="propertyAddress">Property Address (if different)</Label>
                  <Input id="propertyAddress" name="propertyAddress" value={formData.propertyAddress} onChange={handleInputChange} data-testid="input-property-address" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contractPrice">Contract Price ($)</Label>
                  <Input id="contractPrice" name="contractPrice" type="number" step="0.01" value={formData.contractPrice} onChange={handleInputChange} data-testid="input-contract-price" />
                </div>
                <div>
                  <Label htmlFor="ctSalesTax">CT Sales Tax (6.35%)</Label>
                  <Input id="ctSalesTax" name="ctSalesTax" value={formData.ctSalesTax} readOnly className="bg-muted" data-testid="input-sales-tax" />
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input id="totalAmount" name="totalAmount" value={formData.totalAmount} readOnly className="bg-muted" data-testid="input-total" />
                </div>
                <div>
                  <Label htmlFor="deposit">60% Deposit Due</Label>
                  <Input id="deposit" name="deposit" value={formData.deposit} readOnly className="bg-muted" data-testid="input-deposit" />
                </div>
                <div>
                  <Label htmlFor="balance">40% Balance Due</Label>
                  <Input id="balance" name="balance" value={formData.balance} readOnly className="bg-muted" data-testid="input-balance" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Exhibit A - Work to be Performed</h3>
              <Textarea
                id="workDescription"
                name="workDescription"
                value={formData.workDescription}
                onChange={handleInputChange}
                placeholder="Describe the custom cabinetry and/or furniture to be designed, fabricated, and delivered..."
                rows={6}
                data-testid="input-work-description"
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

            <CabinetryContractPreview formData={formData} />

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
                <FileText className="h-5 w-5" />
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
                      "data-testid": "signature-canvas"
                    }}
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
