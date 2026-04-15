import { ScrollArea } from "@/components/ui/scroll-area";

interface BathroomRemodelInstructionsPreviewProps {
  formData: {
    date: string;
    clientName: string;
    clientAddress: string;
    propertyAddress: string;
  };
}

export function BathroomRemodelInstructionsPreview({ formData }: BathroomRemodelInstructionsPreviewProps) {
  return (
    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-white">
      <div className="prose prose-sm max-w-none text-black">
        <div className="text-center mb-6">
          <h2 className="font-bold text-xl mb-2 underline">Bathroom Remodel Instructions</h2>
          <p className="mb-1">Prepared for <strong>{formData.clientName || "___________________________"}</strong> • <strong>{formData.date || "___________________________"}</strong></p>
        </div>

        <h3 className="font-bold mt-6">Site Assessment</h3>
        <ol className="ml-4 space-y-1">
          <li>Measure all walls, windows AND ceiling height (in two different places to see if level)</li>
          <li>Record existing conditions and take pictures</li>
          <li>Is there any discoloration on shower floor, toilet, ceiling</li>
          <li>Is there any broken tile</li>
          <li>Check if floor is level</li>
          <li>Take pics of all plumbing fixtures and under the sink plumbing in cabinet</li>
          <li>Take pics and locate electrical outlets and plugs</li>
          <li>Locate all closets, note adjacent rooms, outside walls and windows — Take Pics</li>
          <li>Locate Electrical Panel and Main Shut-Off valve for plumbing — Take Pic of location</li>
          <li>Ask client for inspirational photos, style and color scheme preference they can email</li>
          <li>Take photos of exterior and note material</li>
        </ol>

        <h3 className="font-bold mt-6">Schedule Appointments for Estimates</h3>
        <ol className="ml-4 space-y-1">
          <li>Electrician</li>
          <li>Plumber</li>
          <li>Installer</li>
          <li>Builder</li>
          <li>Plimpton & Hills (Fixtures & Accessories)</li>
        </ol>

        <h3 className="font-bold mt-6">Contracts</h3>
        <ol className="ml-4 space-y-1">
          <li>Design Contract</li>
          <li>Labor Contract</li>
          <li>Payment Schedule</li>
        </ol>

        <h3 className="font-bold mt-6">Create Design Floor Plans & Elevations for Presentation</h3>

        <h3 className="font-bold mt-6">Showroom Appointment for Presentation and Selections</h3>
        <ol className="ml-4 space-y-1">
          <li>Cabinetry</li>
          <li>Tile & Pattern for each area</li>
          <li>Niche Size, Shelving, Curb, Drain</li>
          <li>Countertop</li>
          <li>Sinks, Mirrors, Lighting, Exhaust Fan/Light Combo</li>
          <li>Plumbing Fixtures: Finish and Style</li>
          <li>Shower Glass Enclosure</li>
          <li>Threshold</li>
          <li>Other Materials: Baseboard Molding, Crown Molding, Board & Batten, Wainscot, Shiplap</li>
          <li>Paint Colors</li>
        </ol>

        <p className="mt-4 ml-4"><strong>Email all Estimates of the above</strong></p>

        <p className="mt-2 ml-4"><strong>Schedule 2nd Showroom Appointment to Review Design & Selections</strong></p>

        <p className="mt-2 ml-4"><strong>Schedule 3rd Showroom Appointment to Finalize, Sign Contracts, and Start Date</strong></p>

        <div className="mt-8 border-t pt-6">
          <p className="mb-4">IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-bold mb-1">Artisan Tile at Whitfield Design LLC</p>
              <p className="text-sm text-gray-600">{formData.date || "___________________________"}</p>
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
