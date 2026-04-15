import { ScrollArea } from '@/components/ui/scroll-area';

interface BathroomScopeOfWorkPreviewProps {
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

export default function BathroomScopeOfWorkPreview({
  formData,
}: BathroomScopeOfWorkPreviewProps) {
  return (
    <ScrollArea className="h-[500px] border border-gray-200 rounded-lg p-6 bg-white">
      <div className="space-y-6 pr-6">
        {/* Title */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">SCOPE OF WORK</h2>
          <p className="text-lg text-gray-700 mt-2">Bathroom Gut Renovation</p>
          <p className="text-sm text-gray-600">Guilford, CT | Residential</p>
        </div>

        {/* Contract Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-900">Property Address:</span>
            <p className="text-gray-700">{formData.propertyAddress}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Homeowner Name:</span>
            <p className="text-gray-700">{formData.homeownerName}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Contractor Name:</span>
            <p className="text-gray-700">{formData.contractorName}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">CT License #:</span>
            <p className="text-gray-700">{formData.ctLicenseNumber}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Date:</span>
            <p className="text-gray-700">{formData.date}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Estimated Project Value:</span>
            <p className="text-gray-700">${formData.estimatedProjectValue}</p>
          </div>
        </div>

        {/* Section 1: Project Overview */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">1. PROJECT OVERVIEW</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            This Scope of Work outlines the complete bathroom renovation project, including demolition of existing fixtures and finishes, installation of new plumbing and electrical systems, waterproofing measures, tile installation, fixture placement, and all finishing work. The contractor agrees to complete this work in compliance with all applicable building codes and permits required by the Town of Guilford and the State of Connecticut.
          </p>
        </div>

        {/* Section 2: Permits & Compliance */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">2. PERMITS & COMPLIANCE</h3>
          <p className="text-sm font-semibold text-gray-900 mb-2">
            The following permits and inspections are required:
          </p>
          <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
            <li>Building Permit from Town of Guilford Building Department</li>
            <li>Plumbing Permit and Rough/Final Inspections</li>
            <li>Electrical Permit and Rough/Final Inspections</li>
            <li>Final Building Inspection and Certificate of Occupancy</li>
            <li>Compliance with Connecticut State Building Code</li>
            <li>Connecticut Contractor HIC (Home Improvement Contractor) License requirement</li>
          </ul>
          <p className="text-sm text-gray-700 mt-3 italic">
            Note: Homeowner is responsible for obtaining Zoning Permit compliance and addressing any Zoning Board of Appeals requirements prior to construction start.
          </p>
        </div>

        {/* Section 3: Detailed Scope of Work */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">3. DETAILED SCOPE OF WORK</h3>

          {/* 3.1 Demolition */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.1 Demolition</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Remove existing toilet, sink, and vanity</li>
              <li>Remove existing shower/tub enclosure and fixtures</li>
              <li>Remove all tile, grout, and underlying substrate</li>
              <li>Remove drywall/moisture barrier down to studs in wet areas</li>
              <li>Remove existing mirrors, light fixtures, and accessories</li>
              <li>Remove existing exhaust fan and ductwork</li>
              <li>Remove flooring material and prepare subfloor</li>
              <li>Remove baseboards and trim</li>
              <li>Remove cabinet hardware and accessories</li>
              <li>Protect adjacent areas from dust and debris</li>
              <li>Proper disposal of all demolition waste</li>
            </ul>
          </div>

          {/* 3.2 Rough Plumbing */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.2 Rough Plumbing</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install new supply lines (hot and cold) per design specifications</li>
              <li>Install drain/waste/vent (DWV) lines as required</li>
              <li>Set rough-in height for toilet flange</li>
              <li>Set rough-in for sink and vanity drains</li>
              <li>Set rough-in for shower/tub drain and supply lines</li>
              <li>Pressure test and inspection of all plumbing rough-in</li>
              <li>Install shut-off valves for water supply</li>
            </ul>
          </div>

          {/* 3.3 Rough Electrical */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.3 Rough Electrical</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install new circuit for bathroom lighting and outlets</li>
              <li>Install GFCI-protected outlets per code (all bathroom outlets)</li>
              <li>Install wiring for exhaust fan</li>
              <li>Install wiring for light fixtures</li>
              <li>Install dedicated 20-amp circuits as required</li>
              <li>Rough-in inspection by Town Electrical Inspector</li>
              <li>Install electrical boxes for outlets, switches, and fixtures</li>
              <li>Verify proper grounding throughout</li>
            </ul>
          </div>

          {/* 3.4 Framing & Structural */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.4 Framing & Structural</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Reinforce studs as needed for fixtures and grab bars</li>
              <li>Frame any new walls or changes to layout</li>
              <li>Install blocking for future tile and heavy fixtures</li>
              <li>Address any water damage or structural issues found during demolition</li>
              <li>Install backing boards and nailers for fixtures</li>
              <li>Support for over-scale shower heads and fixtures</li>
            </ul>
          </div>

          {/* 3.5 Waterproofing */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.5 Waterproofing</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install cement backer board in wet areas (shower surround)</li>
              <li>Apply waterproof membrane over backer board in shower areas</li>
              <li>Install waterproof floor pan or membrane under tile</li>
              <li>Seal all penetrations with waterproof caulk and sealant</li>
            </ul>
          </div>

          {/* 3.6 Tile Installation */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.6 Tile Installation</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install wall tile in shower surround with proper slope and drainage</li>
              <li>Install floor tile with proper slope to drain</li>
              <li>Apply tile to vanity backsplash area</li>
              <li>Grout all tile joints with appropriate grout type</li>
              <li>Caulk tile joints at corners and transitions</li>
              <li>Seal grout as recommended by manufacturer</li>
            </ul>
          </div>

          {/* 3.7 Fixture Installation */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.7 Fixture Installation</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install new toilet with wax ring and bolts</li>
              <li>Install sink and faucet with supply line connections</li>
              <li>Install vanity cabinet and countertop</li>
              <li>Install shower head and trim ring</li>
              <li>Install tub/shower valve and rough-in completion</li>
              <li>Install towel bars, soap dispensers, and accessories as specified</li>
              <li>Install exhaust fan with damper and ductwork termination</li>
              <li>Test all fixtures for proper function and water tightness</li>
            </ul>
          </div>

          {/* 3.8 Electrical Finish */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.8 Electrical Finish</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install light fixtures (ceiling and wall-mounted)</li>
              <li>Install outlet and switch cover plates</li>
              <li>Connect exhaust fan to timer or humidity switch</li>
              <li>Final electrical inspection by Town Inspector</li>
              <li>Verify all circuits and outlets functioning properly</li>
            </ul>
          </div>

          {/* 3.9 Drywall, Paint & Trim */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">3.9 Drywall, Paint & Trim</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              <li>Install drywall on non-wet areas and seal with primer</li>
              <li>Tape, mud, and finish drywall joints</li>
              <li>Prime and paint all walls and ceiling with bathroom-grade paint</li>
              <li>Install baseboard and door trim</li>
              <li>Install interior door with proper hardware</li>
            </ul>
          </div>
        </div>

        {/* Section 4: Materials & Fixtures */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">4. MATERIALS & FIXTURES</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Homeowner is responsible for providing and selecting fixtures including toilet, sink, faucet, light fixtures, exhaust fan, shower head, and any special or custom items. Homeowner will provide a detailed fixture/material selection sheet for contractor approval before installation. Contractor will supply all labor, substrate materials, tile adhesive, grout, sealant, and standard installation materials.
          </p>
        </div>

        {/* Section 5: Timeline */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">5. PROJECT TIMELINE</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Estimated construction phase: 4-8 weeks from start date, depending on scope complexity, permit approvals, and fixture availability. Timeline may be extended due to unforeseen structural issues, permit delays, or changes to scope. Contractor will notify homeowner of any delays as soon as they become apparent.
          </p>
        </div>

        {/* Section 6: Payment Terms */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">6. PAYMENT TERMS</h3>
          <p className="text-sm text-gray-700 italic">
            Payment terms to be negotiated and documented in separate proposal/contract.
          </p>
        </div>

        {/* Section 7: Change Orders */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">7. CHANGE ORDERS</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Any changes to the scope of work must be documented in a written change order signed by both homeowner and contractor before work begins. Change orders will specify the scope addition/modification, cost impact, and timeline adjustment. No verbal change orders will be honored.
          </p>
        </div>

        {/* Section 8: Warranty */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">8. WARRANTY</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Contractor warrants all work and installation to be free from defects in workmanship for a period of one (1) year from final completion and acceptance. Warranty does not cover damage from improper use, maintenance, or act of nature. Manufacturer warranties on products and fixtures remain the responsibility of the homeowner.
          </p>
        </div>

        {/* Signature Block */}
        <div className="border-t pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-8">Homeowner Signature:</p>
              <div className="border-b border-gray-400" style={{ height: '50px' }}></div>
              <p className="text-xs text-gray-600 mt-1">{formData.homeownerName}</p>
              <p className="text-xs text-gray-600">{formData.date}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-8">Contractor Signature:</p>
              <div className="border-b border-gray-400" style={{ height: '50px' }}></div>
              <p className="text-xs text-gray-600 mt-1">{formData.contractorName}</p>
              <p className="text-xs text-gray-600">{formData.date}</p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
