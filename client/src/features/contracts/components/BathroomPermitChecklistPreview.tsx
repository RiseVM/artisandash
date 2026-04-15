import { ScrollArea } from "@/components/ui/scroll-area";

interface BathroomPermitChecklistPreviewProps {
  formData: {
    date: string;
    homeownerName: string;
    homeownerAddress: string;
    propertyAddress: string;
    contractorName: string;
    ctLicenseNumber: string;
    estimatedProjectValue: string;
  };
}

export function BathroomPermitChecklistPreview({ formData }: BathroomPermitChecklistPreviewProps) {
  return (
    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-white">
      <div className="prose prose-sm max-w-none text-black">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-0">Bathroom Remodel Permit Checklist — Guilford, CT</h2>
          <p className="text-sm mb-1">Town of Guilford Building Department</p>
          <p className="text-sm mb-1">50 Boston Street, Guilford, CT 06437</p>
          <p className="text-sm mb-1">(203) 453-8029 | building.perm@guilfordct.gov</p>
        </div>

        <div className="border-b pb-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Homeowner: <span className="font-normal">{formData.homeownerName || "___________________________"}</span></p>
              <p className="font-semibold">Address: <span className="font-normal">{formData.homeownerAddress || "___________________________"}</span></p>
            </div>
            <div>
              <p className="font-semibold">Contractor: <span className="font-normal">{formData.contractorName || "___________________________"}</span></p>
              <p className="font-semibold">CT License #: <span className="font-normal">{formData.ctLicenseNumber || "___________________________"}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
            <div>
              <p className="font-semibold">Property Address: <span className="font-normal">{formData.propertyAddress || "___________________________"}</span></p>
            </div>
            <div>
              <p className="font-semibold">Estimated Project Value: <span className="font-normal">${formData.estimatedProjectValue || "___________________________"}</span></p>
            </div>
          </div>
          <div className="text-sm mt-2">
            <p className="font-semibold">Date: <span className="font-normal">{formData.date || "___________________________"}</span></p>
          </div>
        </div>

        <div className="bg-blue-700 text-white p-3 rounded font-bold mb-4">
          SECTION 1 — BEFORE YOU APPLY
        </div>

        <div className="ml-4 mb-4">
          <p className="mb-2">☐ Confirm project scope requires a permit (structural, plumbing, electrical, or mechanical work)</p>
          <p className="mb-2">☐ Obtain Zoning Permit from Guilford Zoning Department (required before building permit)</p>
          <p className="mb-2">☐ Hire a CT-licensed contractor (valid State of Connecticut license required)</p>
          <p className="mb-2">☐ Verify contractor has current liability insurance on file</p>
          <p className="mb-2">☐ Prepare construction drawings / floor plans (existing and proposed layouts)</p>
          <p className="mb-2">☐ Calculate project value (labor + materials) for fee calculation</p>
        </div>

        <div className="bg-blue-700 text-white p-3 rounded font-bold mb-4">
          SECTION 2 — PERMITS REQUIRED
        </div>

        <div className="ml-4 mb-4">
          <p className="mb-2">☐ Building Permit (main structural/renovation permit)</p>
          <p className="mb-2">☐ Plumbing Permit (any supply, drain, or fixture work) — $50 recording fee</p>
          <p className="mb-2">☐ Electrical Permit (wiring, outlets, lighting, fans) — $50 recording fee</p>
          <p className="mb-2">☐ Mechanical Permit (HVAC/ventilation if applicable) — $50 recording fee</p>
        </div>

        <div className="bg-blue-700 text-white p-3 rounded font-bold mb-4">
          SECTION 3 — APPLICATION SUBMISSION
        </div>

        <div className="ml-4 mb-4">
          <p className="mb-2">☐ Submit application through Guilford's Online Permit Portal (no paper applications accepted)</p>
          <p className="mb-2">☐ Upload construction/floor plan drawings</p>
          <p className="mb-2">☐ Upload contractor's CT license</p>
          <p className="mb-2">☐ Upload contractor's liability insurance certificate</p>
          <p className="mb-2">☐ Pay permit fees: $0.60/sq ft for renovation area + $50 per trade permit + state fee ($0.26 per $1,000 value)</p>
        </div>

        <div className="bg-blue-700 text-white p-3 rounded font-bold mb-4">
          SECTION 4 — DURING CONSTRUCTION
        </div>

        <div className="ml-4 mb-4">
          <p className="mb-2">☐ Post building permit in visible location at job site</p>
          <p className="mb-2">☐ Schedule rough-in inspections (framing, plumbing, electrical) before closing walls</p>
          <p className="mb-2">☐ Ensure all work meets Connecticut State Building Code (based on ICC/IBC/IRC)</p>
          <p className="mb-2">☐ Maintain access for building inspector visits</p>
        </div>

        <div className="bg-blue-700 text-white p-3 rounded font-bold mb-4">
          SECTION 5 — PROJECT COMPLETION
        </div>

        <div className="ml-4 mb-4">
          <p className="mb-2">☐ Schedule final inspections (building, plumbing, electrical)</p>
          <p className="mb-2">☐ Obtain Certificate of Occupancy — $50 fee for single-family residence</p>
          <p className="mb-2">☐ Retain all permits and inspection records for your files</p>
        </div>

        <div className="border-t pt-4 mt-6">
          <p className="text-sm font-semibold mb-4">
            Permits are valid for one year from issue. Work started without a permit is subject to doubled fees. Contact the Building Department with questions: (203) 453-8029.
          </p>

          <div className="mt-8">
            <p className="mb-4">Homeowner Signature: ___________________________</p>
            <p className="mb-2">Name: <strong>{formData.homeownerName || "___________________________"}</strong></p>
            <p>Date: <strong>{formData.date || "___________________________"}</strong></p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
