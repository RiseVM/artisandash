import { ScrollArea } from "@/components/ui/scroll-area";

interface CabinetryContractPreviewProps {
  formData: {
    date: string;
    purchaserName: string;
    purchaserAddress: string;
    propertyAddress: string;
    contractPrice: string;
    ctSalesTax: string;
    totalAmount: string;
    deposit: string;
    balance: string;
    workDescription: string;
  };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CabinetryContractPreview({ formData }: CabinetryContractPreviewProps) {
  const contractPrice = parseFloat(formData.contractPrice) || 0;
  const ctSalesTax = parseFloat(formData.ctSalesTax) || (contractPrice * 0.0635);
  const totalAmount = parseFloat(formData.totalAmount) || (contractPrice + ctSalesTax);
  const deposit = parseFloat(formData.deposit) || (totalAmount * 0.60);
  const balance = parseFloat(formData.balance) || (totalAmount * 0.40);

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

        <h2 className="text-center font-bold text-xl mb-4">CUSTOM CABINETRY AGREEMENT</h2>

        <p className="text-justify mb-4">
          THIS AGREEMENT is made as of this {formData.date || "___"}, by and between Artisan Tile At Whitfield Design LLC, 
          a limited liability company organized under the laws of Connecticut having a principal business address of 
          1200 Boston Post Road, Guilford, CT, 06437, doing business as Artisan Tile (hereinafter referred to as "Seller") 
          and <strong>{formData.purchaserName || "_____________________________"}</strong>, an individual residing at 
          <strong> {formData.purchaserAddress || "_____________________________________"}</strong> (hereinafter referred to as the "Purchaser").
        </p>

        <p className="text-justify mb-4">
          In consideration of the mutual promises and conditions contained herein, the Parties agree as follows:
        </p>

        <h3 className="font-bold mt-4">1. Scope of Work.</h3>
        <p className="ml-4 text-justify">
          <strong>1.1 Work Included.</strong> Seller shall design, fabricate, and deliver custom cabinets and/or furniture 
          (collectively, the "Cabinets") as described in Exhibit A, which sets forth the specifications and scope of work 
          and is incorporated herein by reference (the "Work"). Specifically, the Work includes:
        </p>
        <ul className="ml-8 list-disc">
          <li>Design and Layout: Consultation, drawings, plans, and layout development for the Cabinets.</li>
          <li>Fabrication: Fabrication and finishing of the Cabinets according to approved plans, selections, and specifications.</li>
          <li>Delivery: Delivery of the completed Cabinets to the Property.</li>
        </ul>
        <p className="ml-4 text-justify">
          <strong>1.2 Work Not Included.</strong> Installation of the Cabinets is expressly excluded from this Agreement 
          and will only be provided under a separate written installation contract, if elected by the Owner.
        </p>
        <p className="ml-4 text-justify">
          <strong>1.3 Customer Acknowledgment.</strong> Customer acknowledges and understands that any installation work, 
          if desired, must be performed under a separate written contract.
        </p>
        <p className="ml-4 text-justify">
          <strong>1.4 Limitation of Liability Regarding Installation.</strong> Contractor is not responsible for installation 
          errors, site conditions, or damages caused by Customer or any third-party installer.
        </p>

        <h3 className="font-bold mt-4">2. Price and Payment Terms.</h3>
        <p className="ml-4 text-justify">
          <strong>2.1 Contract Price.</strong> The total Contract Price for the Work is <strong>${formatCurrency(contractPrice)}</strong>, 
          plus Connecticut sales tax of <strong>${formatCurrency(ctSalesTax)}</strong>, for a total amount of <strong>${formatCurrency(totalAmount)}</strong>.
        </p>
        <p className="ml-4 text-justify">
          <strong>2.2 Deposit.</strong> A 60% deposit of the Contract Price in the amount of <strong>${formatCurrency(deposit)}</strong> is due 
          at the time of signing this Agreement and is required before production will begin.
        </p>
        <p className="ml-4 text-justify">
          <strong>2.3 Balance Due.</strong> The remaining 40% balance in the amount of <strong>${formatCurrency(balance)}</strong> is due in full 
          prior to delivery and is necessary to schedule delivery. Cabinets will not be delivered or released until full payment is received.
        </p>
        <p className="ml-4 text-justify">
          <strong>2.4 Payment Method.</strong> Payments may be made by cash, check, or any method otherwise accepted by Contractor. 
          Returned payments may incur a service fee as permitted by Connecticut law.
        </p>

        <h3 className="font-bold mt-4">3. Delivery; Inspection; Acceptance.</h3>
        <p className="ml-4 text-justify">
          <strong>3.1 Delivery Location.</strong> Delivery of the Cabinets shall be made to the following property address ("Property"): 
          <strong> {formData.propertyAddress || formData.purchaserAddress || "_____________________________________"}</strong>
        </p>
        <p className="ml-4 text-justify">
          <strong>3.2 Delivery of Products.</strong> Seller shall deliver the completed custom cabinets ("Cabinets") to the Property. 
          Delivery shall occur during Seller's normal delivery hours or at a mutually agreed-upon time.
        </p>
        <p className="ml-4 text-justify">
          <strong>3.3 Delivery Contingent on Final Payment.</strong> Delivery shall not be scheduled, and no delivery date shall be 
          placed on Seller's calendar, unless and until Seller has received final payment in full, cleared, and confirmed.
        </p>
        <p className="ml-4 text-justify">
          <strong>3.4 Delivery Window and Conditions.</strong> After final payment is received, Seller will provide Purchaser with 
          an estimated delivery window. Delivery dates are approximate and may be adjusted due to production schedules, material 
          availability, transportation issues, or other factors beyond Seller's reasonable control.
        </p>
        <p className="ml-4 text-justify">
          <strong>3.5 Access for Delivery.</strong> Purchaser shall ensure that Seller has safe, sufficient, and unobstructed access 
          for delivery.
        </p>
        <p className="ml-4 text-justify">
          <strong>3.6 Risk of Loss.</strong> Risk of loss or damage to the Cabinets transfers to Purchaser upon delivery to the 
          Property or placement into Purchaser's possession, whichever occurs first.
        </p>
        <p className="ml-4 text-justify">
          <strong>3.7 Inspection and Acceptance.</strong> Purchaser shall inspect the delivered Cabinets at the time of delivery. 
          Any rejection for nonconformity must be stated in a written notice specifying the claimed nonconformity and delivered to 
          Seller within five (5) business days after delivery.
        </p>

        <h3 className="font-bold mt-4">4. Rescission Period/Right to Cancel.</h3>
        <p className="ml-4 text-justify">
          <strong>4.1 Right to Cancel.</strong> Purchaser may cancel this Agreement at any time prior to midnight of the third (3rd) 
          business day after the date this Agreement is fully signed.
        </p>
        <p className="ml-4 text-justify">
          <strong>4.2 Notice of Cancellation.</strong> Notice of cancellation must be sent to Seller in writing. A separate Notice 
          of Cancellation form is attached as Exhibit B and is incorporated herein by reference.
        </p>

        <h3 className="font-bold mt-4">5. Custom, Non-Cancellable Goods; Seller's Reliance; Remedies for Cancellation Attempt</h3>
        <p className="ml-4 text-justify">
          <strong>5.1 Custom and Specially Manufactured Goods.</strong> Purchaser acknowledges and agrees that all products described 
          in this Agreement are specially designed and custom built for Purchaser, and that Seller takes immediate steps upon execution 
          of this Agreement to design, order, and construct the items set forth herein.
        </p>
        <p className="ml-4 text-justify">
          <strong>5.2 No Cancellation by Purchaser Beyond Rescission Period.</strong> This Agreement is not subject to cancellation by 
          Purchaser for any reason after the rescission period described in Section 4 has expired.
        </p>
        <p className="ml-4 text-justify">
          <strong>5.4 Non-Refundability of Deposit.</strong> The deposit shall be non-refundable after the rescission period expires.
        </p>

        <h3 className="font-bold mt-4">6. Remedies for Nonpayment</h3>
        <p className="ml-4 text-justify">
          Any delinquent amount shall accrue interest at the lesser of 1% per month (12% per annum) or the maximum rate permitted 
          by applicable law. Seller may suspend performance until all past-due amounts are paid in full.
        </p>

        <h3 className="font-bold mt-4">7. Change Orders.</h3>
        <p className="ml-4 text-justify">
          No changes, additions, deletions, or alterations to this Agreement shall be effective unless set forth in a written 
          Change Order signed by both Purchaser and Seller.
        </p>

        <h3 className="font-bold mt-4">8. Force Majeure; Extensions of Time.</h3>
        <p className="ml-4 text-justify">
          Seller shall not be responsible or liable for any delay, interruption, or failure to perform the Work caused by events 
          beyond Seller's reasonable control.
        </p>

        <h3 className="font-bold mt-4">9. Ownership of Materials.</h3>
        <p className="ml-4 text-justify">
          Seller retains full ownership of all materials and Cabinets until the Contract Price is paid in full.
        </p>

        <h3 className="font-bold mt-4">10. Warranty.</h3>
        <p className="ml-4 text-justify">
          Contractor warrants that the Cabinets will be free from fabrication defects for one (1) year. Warranty does not cover 
          damage caused by installation, misuse, or improper handling; variations in natural wood grain, texture, or color; 
          environmental damage; normal wear and tear; or issues arising from third-party installation.
        </p>

        <h3 className="font-bold mt-4">11. Limitation of Liability.</h3>
        <p className="ml-4 text-justify">
          Seller's total liability under this Agreement shall not exceed the total amount actually paid by Purchaser for the 
          portion of the Cabinets giving rise to the claim.
        </p>

        <h3 className="font-bold mt-4">12-23. Additional Terms</h3>
        <p className="ml-4 text-justify">
          This Agreement includes additional sections covering: Intellectual Property, Dispute Resolution - Arbitration, 
          Attorneys' Fees, Indemnification, Insurance, Entire Agreement; Amendments, Severability, Waiver, Notice, 
          Governing Law; Venue, and Assignment. The complete terms will appear in the final signed document.
        </p>

        {formData.workDescription && (
          <>
            <h3 className="font-bold mt-6 text-center">EXHIBIT A - WORK TO BE PERFORMED</h3>
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
