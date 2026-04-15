import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCreateContract } from '@/hooks/useCreateContract';
import { ArrowLeft, Loader2, PenLine, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import BathroomScopeOfWorkPreview from './components/BathroomScopeOfWorkPreview';

export default function BathroomScopeOfWorkForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { createContract, isLoading } = useCreateContract();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
    homeownerName: '',
    homeownerAddress: '',
    propertyAddress: '',
    contractorName: '',
    ctLicenseNumber: '',
    estimatedProjectValue: '',
  });
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasReviewedContract, setHasReviewedContract] = useState(false);
  const signatureCanvasRef = useRef<SignatureCanvas>(null);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignatureSubmit = async () => {
    if (!signatureCanvasRef.current?.isEmpty()) {
      const signatureData = signatureCanvasRef.current?.toDataURL();
      try {
        await createContract({
          contract_type: 'bathroom_scope_of_work',
          customer_name: formData.homeownerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          customer_address: formData.homeownerAddress || null,
          property_address: formData.propertyAddress || null,
          form_data: { ...formData, contractReviewed: true },
          signature_data: signatureData,
        });

        toast({
          title: 'Success',
          description: 'Bathroom Scope of Work contract has been created.',
        });

        navigate('/contracts');
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create contract. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Signature Required',
        description: 'Please sign the contract before submitting.',
        variant: 'destructive',
      });
    }
  };

  const isStep1Valid =
    formData.homeownerName &&
    customerEmail &&
    formData.homeownerAddress &&
    formData.propertyAddress &&
    formData.contractorName &&
    formData.ctLicenseNumber &&
    formData.estimatedProjectValue;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/contracts')}
        className="mb-6 text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Contracts
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bathroom Scope of Work
          </h1>
          <p className="text-gray-600">
            Step {step} of 3
          </p>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                Contract Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Homeowner Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Homeowner Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="homeownerName" className="text-sm font-medium text-gray-700">
                        Homeowner Name *
                      </Label>
                      <Input
                        id="homeownerName"
                        value={formData.homeownerName}
                        onChange={(e) => handleFormChange('homeownerName', e.target.value)}
                        placeholder="Enter homeowner name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700">
                        Email *
                      </Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="text-sm font-medium text-gray-700">
                        Phone
                      </Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="homeownerAddress" className="text-sm font-medium text-gray-700">
                        Address *
                      </Label>
                      <Input
                        id="homeownerAddress"
                        value={formData.homeownerAddress}
                        onChange={(e) => handleFormChange('homeownerAddress', e.target.value)}
                        placeholder="Enter homeowner address"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Property Information Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Property Information
                  </h3>
                  <div>
                    <Label htmlFor="propertyAddress" className="text-sm font-medium text-gray-700">
                      Property Address *
                    </Label>
                    <Input
                      id="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={(e) => handleFormChange('propertyAddress', e.target.value)}
                      placeholder="Enter property address"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Contractor Information Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contractor Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="contractorName" className="text-sm font-medium text-gray-700">
                        Contractor Name *
                      </Label>
                      <Input
                        id="contractorName"
                        value={formData.contractorName}
                        onChange={(e) => handleFormChange('contractorName', e.target.value)}
                        placeholder="Enter contractor name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ctLicenseNumber" className="text-sm font-medium text-gray-700">
                        CT License Number *
                      </Label>
                      <Input
                        id="ctLicenseNumber"
                        value={formData.ctLicenseNumber}
                        onChange={(e) => handleFormChange('ctLicenseNumber', e.target.value)}
                        placeholder="Enter CT license number"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Details Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Project Details
                  </h3>
                  <div>
                    <Label htmlFor="estimatedProjectValue" className="text-sm font-medium text-gray-700">
                      Estimated Project Value *
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        id="estimatedProjectValue"
                        type="text"
                        value={formData.estimatedProjectValue}
                        onChange={(e) => handleFormChange('estimatedProjectValue', e.target.value)}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="border-t pt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Scope Overview:</span> This Scope of Work covers full gut renovation including demolition, plumbing, electrical, waterproofing, tile, fixtures, and all finish work.
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className="border-t pt-6 flex justify-end gap-3">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Review Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <BathroomScopeOfWorkPreview formData={formData} />

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="reviewedContract"
                    checked={hasReviewedContract}
                    onCheckedChange={(checked) => setHasReviewedContract(checked as boolean)}
                  />
                  <Label htmlFor="reviewedContract" className="text-sm text-gray-700">
                    I have reviewed and understand the scope of work and terms outlined above
                  </Label>
                </div>

                <div className="border-t pt-6 flex justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!hasReviewedContract}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sign Contract
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Sign */}
        {step === 3 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                Sign Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Signature
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg mt-2 bg-white">
                    <SignatureCanvas
                      ref={signatureCanvasRef}
                      penColor="black"
                      canvasProps={{
                        width: 500,
                        height: 200,
                        className: 'w-full',
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => signatureCanvasRef.current?.clear()}
                    className="mt-2"
                  >
                    Clear Signature
                  </Button>
                </div>

                <div className="border-t pt-6 flex justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSignatureSubmit}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isLoading ? 'Submitting...' : 'Submit Contract'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
