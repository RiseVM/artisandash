import { ScrollArea } from "@/components/ui/scroll-area";

interface HomeImprovementContractPreviewProps {
  formData: {
    date: string;
    ownerName1: string;
    ownerName2: string;
    ownerAddress: string;
    propertyAddress: string;
    workDescription: string;
    laborPrice: string;
    materialsPrice: string;
    totalContractPrice: string;
    startDate: string;
    completionDate: string;
    contractorDisclosure: string;
  };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "_______________";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function HomeImprovementContractPreview({ formData }: HomeImprovementContractPreviewProps) {
  const laborPrice = parseFloat(formData.laborPrice) || 0;
  const materialsPrice = parseFloat(formData.materialsPrice) || 0;
  const totalContractPrice = parseFloat(formData.totalContractPrice) || (laborPrice + materialsPrice);
  const owner2Text = formData.ownerName2 ? ` and ${formData.ownerName2}` : '';

  return (
    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-white">
      <div className="prose prose-sm max-w-none text-black">
        <div className="text-center mb-6">
          <p className="font-bold text-lg mb-0">ARTISAN TILE AT WHITFIELD DESIGN LLC</p>
          <p className="mb-0">D/B/A ARTISAN TILE</p>
          <p className="mb-0">1200 Boston Post Road</p>
          <p className="mb-0">Guilford, CT 06437</p>
          <p className="mb-0">CT Registration: HIC #: 0646519</p>
        </div>

        <h2 className="text-center font-bold text-xl mb-4">AGREEMENT FOR HOME IMPROVEMENT SERVICES</h2>

        <p className="text-justify mb-4">
          THIS AGREEMENT is made as of this {formData.date || "___"}, by and between Artisan Tile At Whitfield Design LLC, 
          a limited liability company organized under the laws of Connecticut having a principal business address of 
          1200 Boston Post Road, Guilford, CT, 06437, doing business as Artisan Tile (hereinafter referred to as "Contractor") 
          and <strong>{formData.ownerName1 || "_____________________________"}{owner2Text}</strong>, 
          {formData.ownerName2 ? ' both individuals' : ' an individual'} residing at 
          <strong> {formData.ownerAddress || "_____________________________________"}</strong> (hereinafter 
          {formData.ownerName2 ? ' collectively ' : ' '}referred to as the "Owner").
        </p>

        <p className="text-justify mb-4">
          In consideration of the mutual promises and conditions contained herein, the Parties agree as follows:
        </p>

        <h3 className="font-bold mt-4">1. Scope of Work.</h3>
        <p className="ml-4 text-justify">
          Owner hires Contractor to perform the home improvement services described in Exhibit A, which is attached hereto 
          and incorporated herein by reference (the "Work"). Contractor shall furnish all labor, materials (unless expressly 
          designated in Exhibit A as Owner-provided), equipment, and services necessary to complete the Work at the Property 
          in accordance with the terms of this Agreement.
        </p>

        <h3 className="font-bold mt-4">2. Property Location.</h3>
        <p className="ml-4 text-justify">
          Contractor will conduct the Work at the following address ("Property"): 
          <strong> {formData.propertyAddress || formData.ownerAddress || "_____________________________________"}</strong>
        </p>

        <h3 className="font-bold mt-4">3. Contract Price.</h3>
        <p className="ml-4 text-justify">The total contract price for the Work ("Contract Price") is:</p>
        <ul className="ml-8 list-none">
          <li>Labor: <strong>${formatCurrency(laborPrice)}</strong></li>
          <li>Materials: <strong>${formatCurrency(materialsPrice)}</strong></li>
          <li className="text-sm">(Materials to be paid in full by Owner at time of ordering; see Section 5.)</li>
          <li className="mt-2 font-bold">Total Contract Price: <strong>${formatCurrency(totalContractPrice)}</strong></li>
        </ul>

        <h3 className="font-bold mt-4">4. Payment Schedule.</h3>
        <p className="ml-4 text-justify">
          <strong>a) General.</strong> Contractor shall be paid strictly in accordance with the Payment Schedule for Labor, 
          the Payments for Materials provisions, and any written, signed Change Orders issued under this Agreement.
        </p>
        <p className="ml-4 text-justify">
          <strong>b) Payment Schedule for Labor.</strong> Owner shall pay Contractor for labor in the following installments:
        </p>
        <ul className="ml-8 list-decimal">
          <li>33.33% of the Labor Price upon signing this Contract.</li>
          <li>33.33% of the Labor Price upon commencement of the Work.</li>
          <li>33.34% (balance) of the Labor Price upon substantial completion of the Work.</li>
        </ul>
        <p className="ml-4 text-justify">
          <strong>c) Payments for Materials.</strong> All materials required for the Work shall be paid 100% by Owner at the 
          time of ordering. Materials ordered on behalf of Owner may be deemed special order and may be non-refundable.
        </p>
        <p className="ml-4 text-justify">
          <strong>d) Late Fees.</strong> Any payment not received within five (5) days after its due date shall accrue interest 
          at one percent (1%) per month (or the maximum rate permitted under Connecticut law, if less).
        </p>

        <h3 className="font-bold mt-4">5. Start Date and Completion Date.</h3>
        <p className="ml-4 text-justify">
          The Work shall commence on <strong>{formatDate(formData.startDate)}</strong> ("Start Date") and shall be substantially 
          completed on or before <strong>{formatDate(formData.completionDate)}</strong> ("Completion Date"), subject to change 
          orders, excusable delays and extensions permitted under this Agreement.
        </p>

        <h3 className="font-bold mt-4">6. Force Majeure; Extensions of Time.</h3>
        <p className="ml-4 text-justify">
          Contractor shall not be responsible or liable for any delay, interruption, or failure to perform the Work caused by 
          events beyond Contractor's reasonable control ("Force Majeure Events").
        </p>

        <h3 className="font-bold mt-4">7. Change Orders.</h3>
        <p className="ml-4 text-justify">
          No changes, additions, deletions, or alterations to this Agreement shall be effective unless set forth in a written 
          Change Order signed by both Owner and Contractor.
        </p>

        <h3 className="font-bold mt-4">8. Permits and Approvals.</h3>
        <p className="ml-4 text-justify">
          Contractor will obtain necessary building permits unless otherwise stated. Owner shall cooperate with all inspections 
          and municipal requirements.
        </p>

        <h3 className="font-bold mt-4">9. Contractor Insurance and Registration Information.</h3>
        <p className="ml-4 text-justify">
          Contractor represents and warrants that it is duly registered as a Home Improvement Contractor in the State of 
          Connecticut (HIC #: 0646519) and maintains commercial general liability insurance in compliance with all applicable 
          state requirements.
        </p>

        <h3 className="font-bold mt-4">10. Contractor Warranty.</h3>
        <p className="ml-4 text-justify">
          Contractor warrants that: (1) all materials and equipment furnished under this Contract will be new and of good quality; 
          and (2) the Work will be performed in a workmanlike manner consistent with industry standards.
        </p>

        <h3 className="font-bold mt-4">11. Ownership and Authority Regarding Property.</h3>
        <p className="ml-4 text-justify">
          Owner represents and warrants that they are the lawful owner of the Property and have full authority and legal capacity 
          to enter into and execute this Agreement.
        </p>

        <h3 className="font-bold mt-4">12. Owner Obligations.</h3>
        <p className="ml-4 text-justify">
          Owner agrees to provide: access to Property during normal working hours (8:00 am - 5:00 pm); utilities necessary for 
          completion; a clear work area free of obstructions; timely decisions and approvals; and payments as scheduled.
        </p>

        <h3 className="font-bold mt-4">13-34. Additional Terms</h3>
        <p className="ml-4 text-justify">
          This Agreement includes additional sections covering: Site Access and Storage, Site Maintenance, Ownership of Work Product, 
          Taxes, Contractor Disclosure, Rescission Period/Right to Cancel, Non-Cancellation, Remedies for Nonpayment, Limitation of 
          Liability, Indemnification, Insurance, Entire Agreement, Severability, Waiver, Notice, Governing Law, Assignment, Acknowledgment, 
          and Signatures. The complete terms will appear in the final signed document.
        </p>

        <h3 className="font-bold mt-4">Contractor Disclosure Statement</h3>
        <p className="ml-4 text-justify">
          {formData.contractorDisclosure || "None."}
        </p>

        {formData.workDescription && (
          <>
            <h3 className="font-bold mt-6 text-center">EXHIBIT A - DESCRIPTION OF WORK</h3>
            <div className="ml-4 p-4 border rounded bg-gray-50">
              <p className="whitespace-pre-wrap">{formData.workDescription}</p>
            </div>
          </>
        )}

        <h3 className="font-bold mt-6 text-center">EXHIBIT B - NOTICE OF CANCELLATION</h3>
        <p className="ml-4 text-justify">
          You may cancel this transaction, without any penalty or obligation, within three business days from the date of 
          this agreement. To cancel, mail or deliver a signed and dated copy of this cancellation notice or any other written 
          notice to Artisan Tile At Whitfield Design LLC at 1200 Boston Post Road, Guilford, CT 06437.
        </p>

        <div className="mt-8 pt-4 border-t">
          <p className="text-sm text-gray-600 italic text-center">
            By signing below, you acknowledge that you have read, understand, and agree to all terms and conditions in this Agreement.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
