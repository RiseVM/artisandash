import { ScrollArea } from "@/components/ui/scroll-area";

interface KitchenDesignRetainerPreviewProps {
  formData: {
    date: string;
    clientName: string;
    clientAddress: string;
  };
}

export function KitchenDesignRetainerPreview({ formData }: KitchenDesignRetainerPreviewProps) {
  return (
    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-white">
      <div className="prose prose-sm max-w-none text-black">
        <div className="text-center mb-6">
          <p className="font-bold text-lg mb-0">Artisan Tile Kitchen and Bath</p>
          <p className="mb-0">1200 Boston Post Rd</p>
          <p className="mb-0">Guilford CT 06437</p>
          <p className="mb-0">203-458-8453</p>
        </div>

        <h2 className="text-center font-bold text-xl mb-6">KITCHEN DESIGN RETAINER AGREEMENT</h2>

        <p className="mb-4">
          This Kitchen Design Retainer Agreement ("Agreement") is entered into on{" "}
          <strong>{formData.date || "________"}</strong>, by and between:
        </p>

        <p className="mb-1"><strong>Designer:</strong> Peter Lemos</p>
        <p className="mb-1"><strong>Client:</strong> <strong>{formData.clientName || "______________________________"}</strong></p>
        <p className="mb-4"><strong>Address:</strong> {formData.clientAddress || "______________________________"}</p>

        <h3 className="font-bold mt-6">1. Scope of Design Services</h3>
        <p className="ml-4 text-justify">
          Designer agrees to provide professional kitchen design services, which may include site consultation, layout
          planning, design concepts, cabinet planning, and preliminary selections for materials and finishes (collectively
          referred to as "Design Services"). These services are intended to assist the Client in evaluating and planning
          a potential kitchen renovation project.
        </p>

        <h3 className="font-bold mt-4">2. Design Retainer Fee</h3>
        <p className="ml-4 text-justify">
          Client agrees to pay Designer a design retainer in the amount of{" "}
          <strong>One Thousand Two Hundred Dollars ($1,200.00)</strong> prior to the commencement of any design work.
        </p>

        <h3 className="font-bold mt-4">3. Non-Refundable Retainer</h3>
        <p className="ml-4 text-justify">
          The $1,200.00 design retainer compensates Designer for time, consultation, planning, and preparation of design
          materials. This retainer is non-refundable once design services have commenced, regardless of whether Client
          proceeds with the kitchen renovation project.
        </p>

        <h3 className="font-bold mt-4">4. Credit Toward Cabinet Purchase</h3>
        <p className="ml-4 text-justify">
          If Client proceeds with the purchase of kitchen cabinets through Designer or Designer's business within sixty
          (60) days of the design presentation, the $1,200.00 retainer will be applied as a credit toward the cabinet
          purchase price.
        </p>

        <h3 className="font-bold mt-4">5. No Obligation to Proceed</h3>
        <p className="ml-4 text-justify">
          Client is under no obligation to move forward with the project following the design phase. However, if Client
          chooses not to proceed with purchasing cabinets through Designer, the design retainer will be retained by
          Designer as payment for services rendered.
        </p>

        <h3 className="font-bold mt-4">6. Ownership of Design Materials</h3>
        <p className="ml-4 text-justify">
          All drawings, layouts, renderings, and design materials produced by Designer remain the intellectual property
          of Designer unless otherwise agreed in writing. Design materials are provided for Client's use in connection
          with the project and may not be reproduced, transferred, or used for construction or purchasing through other
          vendors without written permission from Designer.
        </p>

        <h3 className="font-bold mt-4">7. Limitation of Liability</h3>
        <p className="ml-4 text-justify">
          Designer shall not be liable for construction issues, installation errors, or contractor performance unless
          Designer is separately contracted for such services.
        </p>

        <h3 className="font-bold mt-4">8. Governing Law</h3>
        <p className="ml-4 text-justify">
          This Agreement shall be governed by and construed in accordance with the laws of the State of Connecticut.
        </p>

        <h3 className="font-bold mt-4">9. Entire Agreement</h3>
        <p className="ml-4 text-justify">
          This Agreement constitutes the entire agreement between the parties regarding the design retainer and supersedes
          any prior discussions or agreements.
        </p>

        <div className="mt-8 border-t pt-6">
          <p className="mb-4">IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-bold mb-1">Artisan Tile at Whitfield Design LLC</p>
              <p className="text-sm text-gray-600">03/9/2026</p>
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
