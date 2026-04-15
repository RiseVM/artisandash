import { ScrollArea } from "@/components/ui/scroll-area";

interface BathroomRemodelChecklistPreviewProps {
  formData: {
    date: string;
    clientName: string;
    clientAddress: string;
    propertyAddress: string;
    renovationType: string;
    fixtures: string;
    tileWork: string;
    plumbing: string;
    electrical: string;
    estimatedTimeline: string;
  };
}

export function BathroomRemodelChecklistPreview({ formData }: BathroomRemodelChecklistPreviewProps) {
  const displayLocation = formData.propertyAddress || "Guilford, CT";

  return (
    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-white">
      <div className="prose prose-sm max-w-none text-black space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-bold text-lg mb-0">Artisan Tile Kitchen and Bath</p>
          <p className="mb-0">1200 Boston Post Rd</p>
          <p className="mb-0">Guilford CT 06437</p>
          <p className="mb-0">203-458-8453</p>
        </div>

        {/* Title */}
        <h2 className="text-center font-bold text-xl mb-1">YOUR BATHROOM REMODEL CHECKLIST</h2>
        <p className="text-center font-semibold text-lg mb-6">Tailored to Your Project</p>

        {/* Client and Date Info */}
        <p className="text-center text-sm font-medium mb-6">
          Prepared for {formData.clientName || "___________________________"} • {formData.date || "___________________________"}
        </p>

        {/* Project Scope Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
              <tr className="bg-blue-100">
                <td className="border border-gray-300 p-2 font-semibold">Renovation Type</td>
                <td className="border border-gray-300 p-2">{formData.renovationType || "___________________________"}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Fixtures</td>
                <td className="border border-gray-300 p-2">{formData.fixtures || "___________________________"}</td>
              </tr>
              <tr className="bg-blue-100">
                <td className="border border-gray-300 p-2 font-semibold">Tile Work</td>
                <td className="border border-gray-300 p-2">{formData.tileWork || "___________________________"}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Plumbing</td>
                <td className="border border-gray-300 p-2">{formData.plumbing || "___________________________"}</td>
              </tr>
              <tr className="bg-blue-100">
                <td className="border border-gray-300 p-2 font-semibold">Electrical</td>
                <td className="border border-gray-300 p-2">{formData.electrical || "___________________________"}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">Estimated Timeline</td>
                <td className="border border-gray-300 p-2">{formData.estimatedTimeline || "___________________________"}</td>
              </tr>
              <tr className="bg-blue-100">
                <td className="border border-gray-300 p-2 font-semibold">Location</td>
                <td className="border border-gray-300 p-2">{displayLocation}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PHASE 1: PRE-CONSTRUCTION PLANNING */}
        <div className="bg-blue-700 text-white p-3 font-bold mb-2">PHASE 1: PRE-CONSTRUCTION PLANNING (Weeks 1-3)</div>

        <h3 className="text-blue-700 font-bold">Permits & Approvals</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Verify zoning restrictions for bathroom renovations</li>
          <li>☐ Obtain building permit from local authority</li>
          <li>☐ Apply for plumbing permit if moving/adding lines</li>
          <li>☐ Apply for electrical permit for new circuits/fixtures</li>
          <li>☐ Schedule pre-construction inspections with municipality</li>
          <li>☐ Confirm all permits are approved before work begins</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Design & Planning</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Confirm bathroom layout and dimensions</li>
          <li>☐ Select fixture locations (toilet, vanity, tub/shower)</li>
          <li>☐ Choose tile style, color, and layout for floor/walls</li>
          <li>☐ Plan lighting design (ambient, task, accent)</li>
          <li>☐ Select paint color and finishes</li>
          <li>☐ Plan for ventilation/exhaust fan requirements</li>
          <li>☐ Determine need for heated floors or radiant heating</li>
          <li>☐ Select cabinet/vanity style and materials</li>
          <li>☐ Create detailed construction drawings</li>
          <li>☐ Confirm timeline with contractor</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Contractor Coordination</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Verify contractor's general contractor license</li>
          <li>☐ Confirm workers' compensation and liability insurance</li>
          <li>☐ Review and sign contract with clearly defined scope</li>
          <li>☐ Confirm project timeline and milestones</li>
          <li>☐ Establish payment schedule (deposits, draw schedule)</li>
          <li>☐ Arrange site access and work hours</li>
        </ul>

        {/* PHASE 2: DEMOLITION & ROUGH-IN */}
        <div className="bg-blue-700 text-white p-3 font-bold mb-2 mt-4">PHASE 2: DEMOLITION & ROUGH-IN (Weeks 4-5)</div>

        <h3 className="text-blue-700 font-bold">Demolition</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Protect flooring and fixtures in adjacent areas</li>
          <li>☐ Turn off water supply and cap pipes</li>
          <li>☐ Remove old fixtures (toilet, vanity, tub/shower)</li>
          <li>☐ Remove old tile, drywall, and flooring</li>
          <li>☐ Properly dispose of demolition debris</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Rough Plumbing</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Install new supply lines to correct locations</li>
          <li>☐ Install new drain and vent lines</li>
          <li>☐ Pressure test all new plumbing lines</li>
          <li>☐ Schedule plumbing rough-in inspection</li>
          <li>☐ Confirm inspector approval before closing walls</li>
          <li>☐ Cap all exposed pipes for protection</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Rough Electrical</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Run electrical wire for lighting circuits</li>
          <li>☐ Install outlet boxes at vanity and other locations</li>
          <li>☐ Run dedicated circuit for exhaust fan</li>
          <li>☐ Install GFCI outlet boxes (required for bathrooms)</li>
          <li>☐ Run heated floor wiring if applicable</li>
          <li>☐ Schedule electrical rough-in inspection</li>
          <li>☐ Confirm inspector approval before drywall</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Framing & Structural</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Install new framing for vanity or recessed shelving</li>
          <li>☐ Build blocking for grab bars and fixtures</li>
          <li>☐ Frame soffit for plumbing/electrical if needed</li>
          <li>☐ Ensure all framing is square and level</li>
          <li>☐ Inspect framing before insulation</li>
          <li>☐ Install insulation in exterior walls</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Waterproofing</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Apply waterproof membrane to shower/tub area</li>
          <li>☐ Seal all seams and corners in wet areas</li>
          <li>☐ Install waterproof drywall (cement board) in shower zone</li>
          <li>☐ Ensure waterproofing is complete before tile</li>
        </ul>

        {/* PHASE 3: FINISHING */}
        <div className="bg-blue-700 text-white p-3 font-bold mb-2 mt-4">PHASE 3: FINISHING (Weeks 5-7)</div>

        <h3 className="text-blue-700 font-bold">Tile Installation</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Install floor tile with proper slope to drain</li>
          <li>☐ Install wall tile in shower/tub surround</li>
          <li>☐ Apply grout to all tile seams</li>
          <li>☐ Seal grout appropriately</li>
          <li>☐ Install trim and edge pieces</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Fixture Installation</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Install toilet with proper wax ring seal</li>
          <li>☐ Install vanity and secure to wall studs</li>
          <li>☐ Install faucet and connect supply lines</li>
          <li>☐ Install tub/shower unit or finish surround</li>
          <li>☐ Test all fixtures for leaks</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Electrical Finish</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Install exhaust fan in ceiling</li>
          <li>☐ Install light fixtures and switches</li>
          <li>☐ Connect all GFCI outlets</li>
          <li>☐ Turn on circuit breakers and test all outlets</li>
          <li>☐ Verify all lighting works properly</li>
        </ul>

        <h3 className="text-blue-700 font-bold">Drywall & Paint</h3>
        <ul className="list-none pl-0 space-y-1">
          <li>☐ Hang drywall on walls (avoid wet areas)</li>
          <li>☐ Tape and mud drywall seams</li>
          <li>☐ Sand drywall smooth</li>
          <li>☐ Prime and paint walls with bathroom-grade paint</li>
          <li>☐ Install trim molding and baseboard</li>
        </ul>

        {/* PHASE 4: FINAL INSPECTION */}
        <div className="bg-blue-700 text-white p-3 font-bold mb-2 mt-4">PHASE 4: FINAL INSPECTION (Week 8)</div>

        <ul className="list-none pl-0 space-y-1">
          <li>☐ Schedule final plumbing inspection</li>
          <li>☐ Schedule final electrical inspection</li>
          <li>☐ Schedule final building inspection</li>
          <li>☐ Contractor completes all punch list items</li>
          <li>☐ Final walk-through with homeowner</li>
          <li>☐ Obtain Certificate of Occupancy from municipality</li>
          <li>☐ Keep all permits and inspection documents</li>
        </ul>

        {/* Signature Section */}
        <div className="mt-8 border-t pt-6">
          <p className="mb-4 font-medium">IN WITNESS WHEREOF, the parties have executed this Checklist as of the date first written above.</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-bold mb-1">Artisan Tile Kitchen and Bath</p>
              <p className="text-sm text-gray-600">Date: ___________________________</p>
            </div>
            <div>
              <p className="mb-4">Client Signature: ___________________________</p>
              <p className="mb-2">Name: <strong>{formData.clientName || "___________________________"}</strong></p>
              <p>Date: <strong>{formData.date || "___________________________"}</strong></p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
