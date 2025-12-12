import { useState, useRef } from "react";
import { useLocation } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { useCreateContract } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

export function CabinetryContractForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createContractMutation = useCreateContract();
  const sigCanvas = useRef<SignatureCanvas>(null);

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
  });

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.purchaserName || !customerEmail) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

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
        <p className="text-muted-foreground">Fill out the contract details below</p>
      </div>

      <form onSubmit={handleSubmit}>
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
              <h3 className="font-semibold mb-3">Customer Signature *</h3>
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

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/contracts")} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createContractMutation.isPending} data-testid="button-submit">
                {createContractMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Contract
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
