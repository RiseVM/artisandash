// @ts-ignore - pdfkit types
import PDFDocument from 'pdfkit';

const COMPANY_INFO = {
  name: 'ARTISAN TILE AT WHITFIELD DESIGN LLC',
  dba: 'ARTISAN TILE',
  address: '1200 Boston Post Road',
  cityStateZip: 'Guilford, CT 06437',
  hicNumber: 'HIC #: 0646519',
};

export async function generateContractPdf(
  contractType: string,
  formData: Record<string, any>,
  signatureDataUrl: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER',
        bufferPages: true
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (contractType === 'custom_cabinetry') {
        generateCabinetryContract(doc, formData, signatureDataUrl);
      } else if (contractType === 'home_improvement') {
        generateHomeImprovementContract(doc, formData, signatureDataUrl);
      } else if (contractType === 'kitchen_design_retainer') {
        generateKitchenDesignRetainerContract(doc, formData, signatureDataUrl);
      } else {
        reject(new Error(`Unknown contract type: ${contractType}`));
        return;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addSection(doc: any, sectionNumber: string, title: string, content: string | string[], options: any = {}) {
  const { indent = 0, bold = false, allCaps = false, fontSize = 10 } = options;
  
  doc.fontSize(fontSize).font('Helvetica-Bold');
  let headerText = sectionNumber ? `${sectionNumber}  ${title}` : title;
  if (allCaps) headerText = headerText.toUpperCase();
  doc.text(headerText, 50 + indent, doc.y, { continued: false });
  doc.moveDown(0.3);
  
  doc.font('Helvetica').fontSize(fontSize);
  if (Array.isArray(content)) {
    content.forEach((para, idx) => {
      doc.text(para, 50 + indent, doc.y, { align: 'justify', width: 512 - indent });
      if (idx < content.length - 1) doc.moveDown(0.3);
    });
  } else {
    doc.text(content, 50 + indent, doc.y, { align: 'justify', width: 512 - indent });
  }
  doc.moveDown(0.5);
}

function addSubSection(doc: any, subNumber: string, content: string, options: any = {}) {
  const { indent = 30, fontSize = 10 } = options;
  doc.fontSize(fontSize).font('Helvetica');
  doc.text(`${subNumber}  ${content}`, 50 + indent, doc.y, { align: 'justify', width: 512 - indent });
  doc.moveDown(0.3);
}

function addBulletPoint(doc: any, content: string, indent: number = 50) {
  doc.fontSize(10).font('Helvetica');
  doc.text(`• ${content}`, indent, doc.y, { align: 'justify', width: 512 - (indent - 50) });
  doc.moveDown(0.2);
}

function addLetterItem(doc: any, letter: string, content: string, indent: number = 50) {
  doc.fontSize(10).font('Helvetica');
  doc.text(`${letter}) ${content}`, indent, doc.y, { align: 'justify', width: 512 - (indent - 50) });
  doc.moveDown(0.3);
}

function checkPageBreak(doc: any, minSpace: number = 100) {
  if (doc.y > 700 - minSpace) {
    doc.addPage();
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString('en-US', { month: 'long', timeZone: 'America/New_York' });
    return `${day} day of ${month}, 2025`;
  }
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day} day of ${month}, ${year}`;
}

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : value;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateCabinetryContract(doc: any, formData: Record<string, any>, signatureDataUrl: string) {
  const contractPrice = parseFloat(formData.contractPrice) || 0;
  const taxRate = 0.0635;
  const ctSalesTax = parseFloat(formData.ctSalesTax) || (contractPrice * taxRate);
  const totalAmount = parseFloat(formData.totalAmount) || (contractPrice + ctSalesTax);
  const deposit = parseFloat(formData.deposit) || (totalAmount * 0.60);
  const balance = parseFloat(formData.balance) || (totalAmount * 0.40);

  // Header
  doc.fontSize(11).font('Helvetica-Bold').text(COMPANY_INFO.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`D/B/A ${COMPANY_INFO.dba}`, { align: 'center' });
  doc.text(COMPANY_INFO.address, { align: 'center' });
  doc.text(COMPANY_INFO.cityStateZip, { align: 'center' });
  doc.text(`CT Registration: ${COMPANY_INFO.hicNumber}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica-Bold').text('CUSTOM CABINETRY AGREEMENT', { align: 'center' });
  doc.moveDown(1);

  // Preamble
  doc.fontSize(10).font('Helvetica');
  doc.text(`THIS AGREEMENT is made as of this ${formatDate(formData.date)}, by and between Artisan Tile At Whitfield Design LLC, a limited liability company organized under the laws of Connecticut having a principal business address of 1200 Boston Post Road, Guilford, CT, 06437, doing business as Artisan Tile (hereinafter referred to as "Seller") and ${formData.purchaserName || '_____________________________'}, an individual residing at ${formData.purchaserAddress || '_____________________________________'} (hereinafter referred to as the "Purchaser").`, { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('In consideration of the mutual promises and conditions contained herein, the Parties agree as follows:', { align: 'justify' });
  doc.moveDown(1);

  // Section 1: Scope of Work
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('1.  Scope of Work.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('1.1  Work Included.  Seller shall design, fabricate, and deliver custom cabinets and/or furniture (collectively, the "Cabinets") as described in Exhibit A, which sets forth the specifications and scope of work and is incorporated herein by reference (the "Work"). Specifically, the Work includes:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);
  addBulletPoint(doc, 'Design and Layout: Consultation, drawings, plans, and layout development for the Cabinets.', 100);
  addBulletPoint(doc, 'Fabrication: Fabrication and finishing of the Cabinets according to approved plans, selections, and specifications.', 100);
  addBulletPoint(doc, 'Delivery: Delivery of the completed Cabinets to the Property.', 100);
  doc.moveDown(0.3);

  doc.text('1.2  Work Not Included.  Installation of the Cabinets is expressly excluded from this Agreement and will only be provided under a separate written installation contract, if elected by the Owner.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('1.3  Customer Acknowledgment.  Customer acknowledges and understands that any installation work, if desired, must be performed under a separate written contract.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('1.4  Limitation of Liability Regarding Installation.  Contractor is not responsible for installation errors, site conditions, or damages caused by Customer or any third-party installer.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 2: Price and Payment Terms
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('2.  Price and Payment Terms.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text(`2.1  Contract Price.  The total Contract Price for the Work is $${formatCurrency(contractPrice)}, plus Connecticut sales tax of $${formatCurrency(ctSalesTax)}, for a total amount of $${formatCurrency(totalAmount)}.`, 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text(`2.2  Deposit.  A 60% deposit of the Contract Price in the amount of $${formatCurrency(deposit)} is due at the time of signing this Agreement and is required before production will begin.`, 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text(`2.3  Balance Due.  The remaining 40% balance in the amount of $${formatCurrency(balance)} is due in full prior to delivery and is necessary to schedule delivery. Cabinets will not be delivered or released until full payment is received.`, 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('2.4  Payment Method.  Payments may be made by cash, check, or any method otherwise accepted by Contractor. Returned payments may incur a service fee as permitted by Connecticut law.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 3: Delivery; Inspection; Acceptance
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('3.  Delivery; Inspection; Acceptance.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text(`3.1  Delivery Location.  Delivery of the Cabinets shall be made to the following property address ("Property"), which Purchaser shall supply in this Agreement:`, 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);
  doc.text(`Property Address: ${formData.propertyAddress || formData.purchaserAddress || '_____________________________________________'}`, 100, doc.y, { width: 462 });
  doc.moveDown(0.3);

  doc.text('3.2  Delivery of Products.  Seller shall deliver the completed custom cabinets ("Cabinets") to the Property identified in this Agreement. Delivery shall occur during Seller\'s normal delivery hours or at a mutually agreed-upon time.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.3  Delivery Contingent on Final Payment.  Delivery shall not be scheduled, and no delivery date shall be placed on Seller\'s calendar, unless and until Seller has received final payment in full, cleared, and confirmed. Final payment is a condition precedent to delivery.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.4  Delivery Window and Conditions.  After final payment is received, Seller will provide Purchaser with an estimated delivery window. Delivery dates are approximate and may be adjusted due to production schedules, material availability, transportation issues, or other factors beyond Seller\'s reasonable control.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.5  Access for Delivery.  Purchaser shall ensure that Seller has safe, sufficient, and unobstructed access for delivery. Seller shall not be responsible for delays or added costs resulting from unsafe or inadequate access, site restrictions, or Purchaser\'s failure to prepare the site.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.6  Risk of Loss.  Risk of loss or damage to the Cabinets transfers to Purchaser upon delivery to the Property or placement into Purchaser\'s possession, whichever occurs first.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.7  Inspection and Acceptance.  Purchaser shall inspect the delivered Cabinets at the time of delivery. Any rejection for nonconformity must be stated in a written notice specifying the claimed nonconformity and delivered to Seller within five (5) business days after delivery. If no such notice is provided within that period, the Cabinets shall be deemed accepted.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('3.8  Refusal or Failure to Accept Delivery.  If Purchaser refuses or fails to accept delivery when the Cabinets are ready, Seller may, at its option:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'place the Cabinets into storage at Purchaser\'s sole risk and expense;', 100);
  addLetterItem(doc, 'b', 'invoice Purchaser as though delivery had occurred; and', 100);
  addLetterItem(doc, 'c', 'recover from Purchaser all reasonable storage, handling, redelivery, and insurance costs.', 100);
  doc.moveDown(0.3);

  // Section 4: Rescission Period/Right to Cancel
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('4.  Rescission Period/Right to Cancel.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('4.1  Right to Cancel.  Purchaser may cancel this Agreement at any time prior to midnight of the third (3rd) business day after the date this Agreement is fully signed.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('4.2  Notice of Cancellation.  Notice of cancellation must be sent to Seller in writing. A separate Notice of Cancellation form is attached as Exhibit B and is incorporated herein by reference.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 5: Custom, Non-Cancellable Goods
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('5.  Custom, Non-Cancellable Goods; Seller\'s Reliance; Remedies for Cancellation Attempt');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('5.1  Custom and Specially Manufactured Goods; Immediate Performance.  Purchaser acknowledges and agrees that all products described in this Agreement are specially designed and custom built for Purchaser, and that Seller takes immediate steps upon execution of this Agreement to design, order, and construct the items set forth herein.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('5.2  No Cancellation by Purchaser Beyond Rescission Period.  In light of the custom nature of the products and Seller\'s immediate performance, this Agreement is not subject to cancellation by Purchaser for any reason after the rescission period described in Section 4 has expired.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('5.3  Seller\'s Remedies for Purchaser\'s Cancellation Attempt or Breach.  If Purchaser attempts to cancel this Agreement after the rescission period or otherwise breaches the Agreement, Seller may, without limiting any other rights or remedies available at law or in equity:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'proceed with performance and demand full payment in accordance with the Schedule of Payments; and/or', 100);
  addLetterItem(doc, 'b', 'sell any items in Seller\'s possession, acting as Purchaser\'s agent, with Purchaser remaining liable for any net deficiency on resale.', 100);
  doc.moveDown(0.3);

  doc.text('5.4  Non-Refundability of Deposit.  Purchaser\'s deposit is required to start production. Given the custom and specially manufactured nature of the items and Seller\'s immediate steps upon execution, the deposit shall be non-refundable after the rescission period expires.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('5.5  Risk Allocation for Materials and Availability.  Purchaser acknowledges that Seller\'s performance is subject to the availability of materials at the time of delivery, and delays caused by factors beyond Seller\'s control, including strikes, fires, acts of God, or other unforeseen events, shall not constitute grounds for cancellation by Purchaser.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 6: Remedies for Nonpayment
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('6.  Remedies for Nonpayment');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('6.1  Late Charges.  Any delinquent amount shall accrue interest at the lesser of 1% per month (12% per annum) or the maximum rate permitted by applicable law, calculated from the due date until paid in full.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('6.2  Suspension of Performance.  Seller may suspend performance, production, shipment, or delivery of products until all past-due amounts and applicable charges are paid in full.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('6.3  Security Interest; Lien; Repossession.  To secure payment, Purchaser grants Seller a purchase money security interest in all products until Seller receives full payment. Purchaser authorizes Seller to file any necessary financing statements. Upon default, Seller may reclaim or repossess products not yet paid for, and Purchaser shall provide access to facilitate such recovery. These remedies are in addition to Seller\'s resale rights and Purchaser\'s liability for any deficiency on resale.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('6.4  Collection Costs.  Purchaser shall be responsible for Seller\'s reasonable collection costs, including attorneys\' fees, court costs, and related expenses incurred as a result of Purchaser\'s default.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 7: Change Orders
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('7.  Change Orders.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('No changes, additions, deletions, or alterations to this Agreement, including but not limited to any changes to materials, specifications, dimensions, design, or finishes or other modifications to the Scope of Work, shall be effective unless set forth in a written Change Order signed by both Purchaser and Seller. No work shall proceed based on verbal instructions or understandings. Change Orders may increase price and extend production time. All approved Change Orders shall be incorporated into and become a part of this Agreement, and any additional cost or credit associated with the Change Order shall be added to or deducted from the Contract Price accordingly.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 8: Force Majeure
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('8.  Force Majeure; Extensions of Time.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Seller shall not be responsible or liable for any delay, interruption, or failure to perform the Work caused by events beyond Seller\'s reasonable control ("Force Majeure Events"). Force Majeure Events include, but are not limited to: severe weather or natural disasters; epidemics or pandemics; labor strikes, lockouts, or workforce shortages; fire, casualty, or other calamity, supply chain disruptions or material unavailability; governmental orders, inspections, regulatory changes, or shutdowns; utility interruptions; acts of vandalism, theft, or damage by third parties; additions to or modifications of the Scope of Work; Owner-caused delays, including failure to make progress payments; and any other event or condition that renders performance impracticable or impossible. If a Force Majeure Event occurs, Seller\'s time for performance, including the scheduled completion date, shall be extended for a period equal to the duration of the delay, and Seller shall provide written notice to Purchaser identifying the cause and the anticipated extension. Any such delay shall not constitute a breach of this Agreement.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 9: Ownership of Materials
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('9.  Ownership of Materials.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Seller retains full ownership of all materials and Cabinets until the Contract Price is paid in full.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 10: Warranty
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('10.  Warranty.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('10.1  Standard Warranty.  Contractor warrants that the Cabinets will be free from fabrication defects for one (1) year.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('10.2  Not Covered.  Warranty does not cover:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addBulletPoint(doc, 'Damage caused by installation, misuse, or improper handling;', 100);
  addBulletPoint(doc, 'Variations in natural wood grain, texture, or color;', 100);
  addBulletPoint(doc, 'Environmental damage (humidity, water exposure, etc.);', 100);
  addBulletPoint(doc, 'Normal wear and tear;', 100);
  addBulletPoint(doc, 'Issues arising from third-party installation.', 100);
  doc.moveDown(0.3);

  doc.text('10.3  Other Manufacturer Warranties.  Where other warranties of purchased products apply, such manufacturer warranties govern those products, and Seller\'s standard warranty applies to Seller\'s services and equipment otherwise furnished.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('10.4  Disclaimer of Implied Warranties.  Except as expressly stated in Section 10.1 and any applicable manufacturer warranties, and to the maximum extent permitted by law, Seller disclaims all implied warranties, including merchantability and fitness for a particular purpose.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 11: Limitation of Liability
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('11.  Limitation of Liability.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('11.1  Total Liability Cap.  To the fullest extent permitted by Connecticut law, Seller\'s total liability under this Agreement, whether arising in contract, tort (including negligence), strict liability, or otherwise, shall not exceed the total amount actually paid by Purchaser for the portion of the Cabinets giving rise to the claim.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('11.2  Exclusion of Certain Damages.  Except to the extent prohibited by law, Seller shall not be liable for any indirect, incidental, special, exemplary, or consequential damages, including without limitation lost profits, loss of use, delay damages, diminution in value, or costs arising from installer scheduling, site readiness, or third-party actions, even if Seller has been advised of the possibility of such damages.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('11.3  Exceptions.  Nothing in this Section shall limit or exclude Seller\'s liability for:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'bodily injury or death caused by Seller\'s gross negligence or willful misconduct; or', 100);
  addLetterItem(doc, 'b', 'any other liability that cannot be limited or excluded under Connecticut law.', 100);
  doc.moveDown(0.3);

  doc.text('11.4  Exclusive Remedies.  The remedies provided in this Agreement, including repair, replacement, or refund of amounts paid, are Purchaser\'s sole and exclusive remedies for any claim arising from or relating to the Cabinets or services provided under this Agreement.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('11.5  Conspicuousness and Acknowledgment.  Purchaser acknowledges that this Limitation of Liability is clearly stated, conspicuous, and part of the basis of the bargain, and that Purchaser has read and understands this provision prior to signing.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 12: Intellectual Property
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('12.  Intellectual Property.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('12.1  Ownership.  All designs, layouts, drawings, specifications, and other materials furnished by Seller are original works and proprietary to Seller and must not be released or copied unless the applicable fee has been paid or a job order placed.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('12.2  License.  Upon full payment, Seller grants Purchaser a non-exclusive, non-transferable license to use the delivered designs solely for the project at the Property. No other rights are granted or implied.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('12.3  Misuse and Remedies.  Any unauthorized use, reproduction, or disclosure constitutes a material breach entitling Seller to injunctive relief, damages, and recovery of reasonable attorneys\' fees.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('12.4  Attribution/Markings.  Purchaser shall not remove or obscure proprietary notices on Seller\'s materials.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 13: Dispute Resolution - Arbitration
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('13.  Dispute Resolution - Arbitration.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('13.1  Arbitration Requirement.  Any dispute, claim, or controversy arising out of or relating to this Agreement, the products or services provided under it, or the breach, termination, or validity thereof (collectively, a "Dispute"), shall be resolved exclusively by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its applicable rules then in effect, except as modified by this Section.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('13.2  Venue; Governing Law.  The arbitration shall take place exclusively in New Haven County, Connecticut. This Agreement and any arbitration conducted under it shall be governed by the laws of the State of Connecticut, without regard to conflict-of-law principles.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('13.3  Arbitrator and Procedures.  The arbitration shall be conducted before a single neutral arbitrator selected in accordance with AAA rules. The arbitrator shall have authority to award any remedy or relief that a court of competent jurisdiction could award, including injunctive relief and attorneys\' fees where authorized by this Agreement or applicable law.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('13.4  Enforcement of Award.  The arbitrator\'s award shall be final and binding on the parties. Judgment on the award may be entered in any court of competent jurisdiction, and the parties consent to the jurisdiction of such courts for this purpose.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('13.5  Provisional Judicial Relief.  Either party may seek temporary or preliminary injunctive relief in a court of competent jurisdiction located in New Haven County, Connecticut, if necessary to protect its rights pending arbitration.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 14: WAIVER OF JURY TRIAL
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('14.  WAIVER OF JURY TRIAL AND COURT PROCEEDINGS.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('BY SIGNING THIS AGREEMENT, THE PARTIES KNOWINGLY AND VOLUNTARILY AGREE THAT ALL DISPUTES SHALL BE RESOLVED EXCLUSIVELY THROUGH BINDING ARBITRATION AND NOT IN COURT. THE PARTIES FURTHER ACKNOWLEDGE AND AGREE THAT THEY ARE WAIVING ANY RIGHT TO A TRIAL BY JURY AND ANY RIGHT TO PARTICIPATE IN A COURT ACTION (EXCEPT TO ENFORCE AN ARBITRATION AWARD OR SEEK PERMITTED PROVISIONAL RELIEF).', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 15: Notices
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('15.  Notices.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Any notice, demand, or other communication required or permitted under this Agreement shall be in writing and shall be deemed properly given if:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'Delivered personally to the recipient at the address set forth in the opening section of this Agreement; or', 70);
  addLetterItem(doc, 'b', 'Sent by first-class U.S. Mail, postage prepaid, and addressed to the recipient at the address set forth in the opening section of this Agreement, in which case it shall be deemed given three (3) days after mailing.', 70);
  doc.text('Notices may also be delivered by other means if agreed in writing by both parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 16: Prevailing Party Attorney Fees
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('16.  Prevailing Party Attorney Fees.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('In any dispute, contest, action, proceeding, arbitration or litigation between the parties hereto arising out of or relating to this Agreement and/or the enforcement or the interpretation of this Agreement, the prevailing party shall be entitled to recover from the non-prevailing party all costs, expenses, and reasonable attorneys\' fees incurred, including those incurred in any appeal, post-judgment proceedings, or in enforcing any judgment or award.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 17: Seller Disclosure
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('17.  Seller Disclosure of Related Business Entities.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Seller hereby discloses that within the past five (5) years, Seller has not held an ownership, membership, partnership, officer, shareholder, or other financial interest in any other corporations, limited liability companies, partnerships, or other business entities engaged in home improvement or related construction services.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 18: Relationship of the Parties
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('18.  Relationship of the Parties.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Seller is an independent contractor. Neither Party is an agent, representative, partner or employee of the other Party. The Parties understand this Contract is not an exclusive arrangement. The Parties agree that they are free to enter into other similar agreements with other parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 19: No Partnership
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('19.  No Partnership.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Nothing in this Agreement shall be construed to create a partnership, joint venture, or any similar relationship between the parties. Neither party shall have any authority to bind, act for, or assume any obligation on behalf of the other.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 20: Governing Law
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('20.  Governing Law.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement shall be governed by the laws of the State of Connecticut.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 21: Severability
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('21.  Severability.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('If any provision of this Contract shall be held invalid by any court of competent jurisdiction, such holding shall not invalidate any other provision hereof.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 22: Entire Agreement
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('22.  Entire Agreement.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, understandings, or agreements. Any modifications to this Agreement must be in writing and signed by both parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 23: Execution in Counterparts; Electronic Signatures
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('23.  Execution in Counterparts; Electronic Signatures.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement may be executed in two or more counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Signatures transmitted by electronic means, including by PDF, email, DocuSign, or other electronic signature platform, shall be deemed original signatures for all purposes and shall have the same force and effect as original handwritten signatures.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(1);

  // Signature Section
  checkPageBreak(doc, 200);
  doc.fontSize(11).font('Helvetica-Bold').text('SELLER:');
  doc.fontSize(10).font('Helvetica').text('ARTISAN TILE AT WHITFIELD DESIGN LLC');
  doc.text('D/B/A ARTISAN TILE');
  doc.moveDown(0.5);
  doc.text('By: _________________________          Date: _______________');
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('PURCHASER:');
  doc.moveDown(0.5);
  
  // Purchaser signature
  const sigBoxY = doc.y;
  doc.rect(50, sigBoxY, 250, 80).fillAndStroke('#ffffff', '#000000');

  if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
    try {
      const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, 55, sigBoxY + 5, { 
        width: 240, 
        height: 70,
        fit: [240, 70],
        align: 'center',
        valign: 'center'
      });
    } catch (imgError) {
      console.error('Error embedding signature image:', imgError);
      doc.fillColor('#666666').fontSize(10).text('[Signature on file]', 55, sigBoxY + 30);
    }
  } else {
    doc.fillColor('#666666').fontSize(10).text('[Signature on file]', 55, sigBoxY + 30);
  }

  doc.y = sigBoxY + 90;
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
  doc.text(`${formData.purchaserName || '(Purchaser Name)'}`);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`);
  doc.moveDown(1);

  // EXHIBIT A
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('EXHIBIT A:', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('WORK TO BE PERFORMED SPECIFICATIONS', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica');
  doc.text(formData.workDescription || formData.exhibitA || '[Specifications to be attached or described here]', { align: 'left' });
  doc.moveDown(2);

  // EXHIBIT B: Notice of Cancellation
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('EXHIBIT B: NOTICE OF CANCELLATION', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('NOTICE OF CANCELLATION', { align: 'center' });
  doc.moveDown(1);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('YOU MAY CANCEL THIS TRANSACTION WITHOUT ANY PENALTY OR OBLIGATION, WITHIN THREE (3) BUSINESS DAYS FROM THE DATE THIS AGREEMENT IS FULLY SIGNED.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('IF YOU CANCEL, ANY PROPERTY TRADED IN, ANY PAYMENTS MADE BY YOU UNDER THE CONTRACT OR SALE, AND ANY NEGOTIABLE INSTRUMENT EXECUTED BY YOU WILL BE RETURNED WITHIN TEN (10) BUSINESS DAYS FOLLOWING THE RECEIPT BY CONTRACTOR OF YOUR CANCELLATION NOTICE, AND ANY SECURITY INTEREST ARISING OUT OF THE TRANSACTION WILL ALSO BE CANCELLED.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('TO CANCEL THIS TRANSACTION, MAIL OR DELIVER A SIGNED AND DATED COPY OF THIS CANCELLATION NOTICE, OR ANY OTHER WRITTEN CANCELLATION NOTICE, NOT LATER THAN MIDNIGHT OF THE THIRD BUSINESS DAY FOLLOWING THE FULL EXECUTION OF THE AGREEMENT, TO:', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('      Artisan Tile At Whitfield Design LLC');
  doc.text('      1200 Boston Post Road');
  doc.text('      Guilford, CT 06437');
  doc.moveDown(1);
  doc.text('I HEREBY CANCEL THIS TRANSACTION:');
  doc.moveDown(0.5);
  doc.text('OWNER:');
  doc.moveDown(0.5);
  doc.text('By: _________________________________          Date: _________________');
  doc.text('           (Signature)');
  doc.text('Printed Name: ______________________');
  doc.text('Title: _____________________________');
  doc.moveDown(1);
  doc.text('Cancellation is effective if sent prior to midnight of the third business day after the date the Agreement is fully signed.');

  // Footer
  doc.moveDown(2);
  doc.strokeColor('#333333').lineWidth(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor('#666666');
  doc.text(`Document generated: ${new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} EST`, { align: 'center' });
}

function generateHomeImprovementContract(doc: any, formData: Record<string, any>, signatureDataUrl: string) {
  const laborPrice = parseFloat(formData.laborPrice) || 0;
  const materialsPrice = parseFloat(formData.materialsPrice) || 0;
  const totalContractPrice = parseFloat(formData.totalContractPrice) || (laborPrice + materialsPrice);

  // Header
  doc.fontSize(11).font('Helvetica-Bold').text(COMPANY_INFO.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`D/B/A ${COMPANY_INFO.dba}`, { align: 'center' });
  doc.text(COMPANY_INFO.address, { align: 'center' });
  doc.text(COMPANY_INFO.cityStateZip, { align: 'center' });
  doc.text(`CT Registration: ${COMPANY_INFO.hicNumber}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica-Bold').text('AGREEMENT FOR HOME IMPROVEMENT SERVICES', { align: 'center' });
  doc.moveDown(1);

  // Preamble
  doc.fontSize(10).font('Helvetica');
  const owner2Text = formData.ownerName2 ? ` and ${formData.ownerName2}` : '';
  doc.text(`THIS AGREEMENT is made as of this ${formatDate(formData.date)}, by and between Artisan Tile At Whitfield Design LLC, a limited liability company organized under the laws of Connecticut having a principal business address of 1200 Boston Post Road, Guilford, CT, 06437, doing business as Artisan Tile (hereinafter referred to as "Contractor") and ${formData.ownerName1 || '_____________________________'}${owner2Text}, ${formData.ownerName2 ? 'both individuals' : 'an individual'} residing at ${formData.ownerAddress || '_____________________________________'} (hereinafter ${formData.ownerName2 ? 'collectively ' : ''}referred to as the "Owner").`, { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('In consideration of the mutual promises and conditions contained herein, the Parties agree as follows:', { align: 'justify' });
  doc.moveDown(1);

  // Section 1: Scope of Work
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('1.  Scope of Work.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Owner hires Contractor to perform the home improvement services described in Exhibit A, which is attached hereto and incorporated herein by reference (the "Work"). Contractor shall furnish all labor, materials (unless expressly designated in Exhibit A as Owner-provided), equipment, and services necessary to complete the Work at the Property in accordance with the terms of this Agreement.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 2: Property Location
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('2.  Property Location.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Contractor will conduct the Work at the following address (hereinafter referred to as the "Property"): ${formData.propertyAddress || '_____________________________________________'}`, 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 3: Contract Price
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('3.  Contract Price.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('The total contract price for the Work ("Contract Price") is:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text(`     Labor: $${formatCurrency(laborPrice)}`, 50, doc.y);
  doc.moveDown(0.2);
  doc.text(`     Materials: $${formatCurrency(materialsPrice)}`, 50, doc.y);
  doc.text('     (Materials to be paid in full by Owner at time of ordering; see Section 4.)', 50, doc.y);
  doc.moveDown(0.2);
  doc.text(`     Total Contract Price: $${formatCurrency(totalContractPrice)}`, 50, doc.y);
  doc.moveDown(0.5);

  // Section 4: Payment Schedule
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('4.  Payment Schedule.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('a) General.  Contractor shall be paid strictly in accordance with the Payment Schedule for Labor, the Payments for Materials provisions, and any written, signed Change Orders issued under this Agreement. No Work shall proceed without payments being made when due. Contractor may suspend Work for failure by Owner to make any required payment.', 70, doc.y, { align: 'justify', width: 492 });
  doc.moveDown(0.3);

  doc.text('b) Payment Schedule for Labor.  Owner shall pay Contractor for labor in the following installments:', 70, doc.y, { align: 'justify', width: 492 });
  doc.moveDown(0.2);
  doc.text('   1. 33.33% of the Labor Price upon signing this Contract.', 90, doc.y);
  doc.moveDown(0.2);
  doc.text('   2. 33.33% of the Labor Price upon commencement of the Work. "Commencement" means Contractor begins physical work at the Property.', 90, doc.y, { width: 472 });
  doc.moveDown(0.2);
  doc.text('   3. 33.34% (balance) of the Labor Price upon substantial completion of the Work.', 90, doc.y, { width: 472 });
  doc.moveDown(0.2);
  doc.text('Contractor may suspend Work for any late or missed payment until all amounts due are paid in full.', 70, doc.y, { width: 492 });
  doc.moveDown(0.3);

  doc.text('c) Payments for Materials.  All materials required for the Work shall be paid 100% by Owner at the time of ordering. Contractor may require Owner to pre-approve material lists and material pricing before placing any order. Materials ordered on behalf of Owner may be deemed special order and may be non-refundable. Owner understands and agrees that materials cannot be returned without restocking fees, if allowed at all.', 70, doc.y, { align: 'justify', width: 492 });
  doc.moveDown(0.3);

  doc.text('d) Late Fees.  All payments shall be made when due. Any payment not received within five (5) days after its due date shall accrue interest at one percent (1%) per month (or the maximum rate permitted under Connecticut law, if less), calculated until the date payment is received in full. Interest is in addition to Contractor\'s right to suspend or terminate the Work for nonpayment and to recover all costs of collection as permitted under this Agreement.', 70, doc.y, { align: 'justify', width: 492 });
  doc.moveDown(0.5);

  // Section 5: Start Date and Completion Date
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('5.  Start Date and Completion Date.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text(`The Work shall commence on ${formData.startDate || '________________'} ("Start Date") and shall be substantially completed on or before ${formData.completionDate || '_______________'} ("Completion Date"), subject to change orders, excusable delays and extensions permitted under this Agreement. Owner shall provide timely access to the site, areas of work, and staging; timely approvals and selections; and prompt responses to requests for information to avoid delay.`, 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 6: Force Majeure
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('6.  Force Majeure; Extensions of Time.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor shall not be responsible or liable for any delay, interruption, or failure to perform the Work caused by events beyond Contractor\'s reasonable control ("Force Majeure Events"). Force Majeure Events include, but are not limited to: severe weather or natural disasters; epidemics or pandemics; labor strikes, lockouts, or workforce shortages; fire, casualty, or other calamity affecting the Property, supply chain disruptions or material unavailability; manufacturer delays; governmental orders, inspections, permit delays, regulatory changes, or shutdowns; utility interruptions; acts of vandalism, theft, or damage by third parties; additions to or modifications of the Scope of Work; Owner-caused delays, including failure to make progress payments; and any other event or condition that renders performance impracticable or impossible.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text('If a Force Majeure Event occurs, Contractor\'s time for performance, including the scheduled completion date, shall be extended for a period equal to the duration of the delay, and Contractor shall provide written notice to Owner identifying the cause and the anticipated extension. Any such delay shall not constitute a breach of this Agreement.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text('Contractor is entitled to additional time and equitable compensation for concealed or unknown conditions, hazardous materials, utility conflicts, code changes, discovery of nonconforming existing conditions, supply chain disruptions, severe weather, labor shortages, or other force majeure events beyond Contractor\'s control.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 7: Change Orders
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('7.  Change Orders.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('No changes, additions, deletions, or alterations to this Agreement, including but not limited to modifications to the Scope of Work, shall be effective unless set forth in a written Change Order signed by both Owner and Contractor. No work shall proceed based on verbal instructions or understandings. All approved Change Orders shall be incorporated into and become a part of this Agreement, and any additional cost or credit associated with the Change Order shall be added to or deducted from the Contract Price accordingly.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 8: Permits and Approvals
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('8.  Permits and Approvals.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor will obtain necessary building permits unless otherwise stated. Owner shall cooperate with all inspections and municipal requirements. If approvals, variances, HOA permissions, or engineering reports are required, Owner is responsible for obtaining them unless otherwise agreed.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 9: Contractor Insurance and Registration
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('9.  Contractor Insurance and Registration Information.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor represents and warrants that it is duly registered as a Home Improvement Contractor in the State of Connecticut (HIC #: 0646519) and that its registration is current and in good standing. Contractor maintains commercial general liability insurance in compliance with all applicable state requirements. Upon request, Contractor shall provide Owner with a certificate of insurance evidencing such coverage.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 10: Contractor Warranty
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('10.  Contractor Warranty.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor warrants to Owner that: (1) all materials and equipment furnished under this Contract will be new and of good quality unless otherwise specified in this or required by this Contract or any written change order executed by all parties; and (2) the Work will be performed in a workmanlike manner consistent with industry standards. Any manufacturer warranties for materials, if applicable, shall be passed through to the Owner to the extent permitted.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text('Contractor\'s warranty does not apply to, and Contractor shall have no responsibility for:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.2);
  addBulletPoint(doc, 'Damage caused by misuse, neglect, improper maintenance, or acts of others;', 70);
  addBulletPoint(doc, 'Pre-existing conditions at the Property; or', 70);
  addBulletPoint(doc, 'Normal wear and tear.', 70);
  doc.moveDown(0.3);

  // Section 11: Ownership and Authority
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('11.  Ownership and Authority Regarding Property.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Owner represents and warrants that they are the lawful owner of the Property and have full authority and legal capacity to enter into and execute this Agreement.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 12: Owner Obligations
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('12.  Owner Obligations.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Owner agrees to the following obligations under this Agreement:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);

  addLetterItem(doc, 'a', 'Access to Property.  Owner shall provide Contractor and its employees, agents, and subcontractors unrestricted access to the Property during normal working hours. Normal working hours are defined as between the hours of 8:00 am and 5:00 pm.', 70);
  addLetterItem(doc, 'b', 'Utilities.  Owner shall provide access to utilities, including electricity and water, necessary for the completion of the services.', 70);
  addLetterItem(doc, 'c', 'Site Preparation.  Owner agrees to ensure that the work area is clear of obstructions and hazards prior to the commencement of the Work. Owner shall remove or protect personal property from the Work area. Contractor is not responsible for damage to items not removed or protected by Owner.', 70);
  addLetterItem(doc, 'd', 'Timely Decisions and Changes.  Owner shall provide prompt decisions and approvals when required by Contractor and Owner shall promptly notify Contractor of any request to change to the scope of work or changes to avoid delays in the completion of services.', 70);
  addLetterItem(doc, 'e', 'Payment Obligations.  Owner shall make all payments in accordance with the payment terms outlined in this Agreement. Failure to do so may result in suspension or termination of services.', 70);
  addLetterItem(doc, 'f', 'Representation of Property Conditions.  Owner represents that the property conditions are accurately described to Contractor.', 70);
  addLetterItem(doc, 'g', 'Non-Interference.  Owner shall not interfere with, direct, or attempt to control Contractor\'s workers, subcontractors, or means and methods of performing the Work. Owner shall ensure areas outside the work zone are secured from children, pets, and occupants during work hours to allow safe and efficient performance.', 70);
  addLetterItem(doc, 'h', 'Compliance with Law.  Owner is responsible for ensuring that the property complies with local building and zoning codes, except as directly related to the Work provided by Contractor.', 70);
  addLetterItem(doc, 'i', 'Liability for Delays.  Owner acknowledges that Contractor is not liable for delays caused by Owner\'s failure to meet these obligations.', 70);
  doc.moveDown(0.3);

  // Section 13: Site Access and Storage
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('13.  Site Access and Storage.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor may store equipment and materials on the Property at locations convenient to the work, which may include bedrooms, bathrooms, garages, or other areas designated by Contractor to ensure safety, logistical efficiency, or protection from weather.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 14: Site Maintenance; Dust and Cleanup
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('14.  Site Maintenance; Dust and Cleanup.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor will employ reasonable dust control measures, including plastic sheeting, temporary barriers, and localized dust collection. Owner acknowledges that some dust is unavoidable. Contractor will remove debris and leave the immediate work area broom clean; cleaning beyond this area is the Owner\'s responsibility. Any additional or whole-home cleaning is optional, not included in the Contract Sum, and may be provided for a separate fee under a separate written agreement. Contractor is not obligated to remove dust beyond what is necessary to complete the contracted work, nor beyond its immediate work area, and Owner acknowledges responsibility for managing any residual dust.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 15: Ownership of Work Product
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('15.  Ownership of Work Product.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('All plans, drawings, specifications, designs, reports, and other materials prepared, developed, or provided by Contractor in connection with the Work (collectively, "Work Product") shall remain the exclusive property of Contractor until full payment has been received for all Work performed under this Agreement. Upon full payment, ownership of all installations and materials incorporated into the Project transfers to Owner. Contractor retains ownership of proprietary methods, processes, and designs used in connection with the Work, but grants Owner a non-exclusive, perpetual, royalty-free license to use them solely for the operation, maintenance, or repair of the Project. Owner shall not reproduce, distribute, or use Contractor\'s proprietary methods or Work Product for any other project or purpose without Contractor\'s prior written consent.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 16: Taxes and Regulatory Costs
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('16.  Taxes and Regulatory Costs.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor is responsible for its own income taxes and FICA obligations; Owner will not withhold or remit such taxes. Contract Price does not include sales, use, property, value-added, or similar taxes. If any such taxes are assessed on the Work or materials furnished, Contractor may bill them separately to Owner, and Owner shall pay them when due, including any interest or penalties resulting from Owner\'s late payment or nonpayment. If changes in law, building codes, inspection requirements, or utility or regulatory mandates increase the cost or time required to perform the Work, Owner shall execute a written Change Order providing an equitable adjustment to the Contract Price, schedule, or both.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 17: Subcontractors
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('17.  Subcontractors.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor may at its discretion engage subcontractors to perform work hereunder, provided the Contractor shall fully pay said subcontractor and in all instances remain responsible for the property completion of this Contract.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 18: Right to Repair
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('18.  Right to Repair.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor reserves the exclusive right to cure any construction defects or issues, both during the construction process and after completion of the Work. Owner shall provide Contractor with written notice of any alleged defect and shall allow Contractor a reasonable opportunity to inspect the condition. Contractor shall have fourteen (14) days from receipt of written notice to commence repairs and shall complete such repairs within a reasonable time thereafter, subject to material availability and scheduling constraints. Failure of Owner to provide written notice and a reasonable opportunity for Contractor to repair or replace any alleged defect shall excuse Contractor from any obligation to pay for repairs or replacements incurred by Owner and shall void any related claims for damages against Contractor.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 19: Default and Termination
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('19.  Default and Termination.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('19.1  Owner Default.  Owner is in default if: (a) any payment is not made when due, or (b) Owner fails to perform any obligation under this Agreement. Contractor may immediately suspend Work for non-payment without prior notice. For all other defaults, Contractor shall provide written notice, and Owner shall have five (5) days to cure. If not cured, Contractor may terminate this Agreement. Upon termination, Owner shall pay Contractor for:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addBulletPoint(doc, 'All Work performed to date;', 100);
  addBulletPoint(doc, 'All materials purchased or specially ordered (including non-refundable items);', 100);
  addBulletPoint(doc, 'Demobilization costs; and', 100);
  addBulletPoint(doc, 'Contractor\'s reasonable overhead and anticipated profit on unperformed Work.', 100);
  doc.text('These amounts are agreed damages, not a penalty. Contractor may pursue all other legal or equitable remedies.', 80, doc.y, { width: 482 });
  doc.moveDown(0.3);

  doc.text('19.2  Contractor Default.  If Contractor materially fails to perform, Owner shall give written notice of default. Contractor shall have fourteen (14) days to cure. If not cured, Owner may terminate this Agreement and pursue legal or equitable remedies, except that Owner waives any claim for specific performance.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('19.3  Termination Without Cause.  Owner may not terminate without cause unless Contractor agrees in writing. If Contractor consents, Owner shall pay for all Work performed, all materials purchased or ordered, non-cancellable costs, demobilization, and reasonable overhead and profit on unperformed Work. Contractor may terminate without cause on seven (7) days\' written notice, with payment due for all Work and authorized costs incurred through the termination date.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('19.4  Effect of Termination.  Upon any termination, absent Contractor\'s uncured material breach, Owner shall pay all sums due within five (5) days of Contractor\'s final invoice. All payment, indemnification, and warranty survive termination.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 20: Contractor's Indemnification
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('20.  Contractor\'s Indemnification.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor shall indemnify, defend, and hold harmless Owner from and against any claims, damages, liabilities, losses, and costs (including reasonable attorney\'s fees) to the extent they arise directly from the gross negligence or willful misconduct of Contractor in the performance of the Work. Contractor\'s indemnification obligations shall not apply to any claims, damages, liabilities, or costs resulting from the acts or omissions of Owner or any of Owner\'s agents, representatives, or employees, or from conditions or circumstances outside Contractor\'s control. This indemnification provision shall survive the completion of the Work, final payment, and any termination or expiration of this Agreement.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 21: Owner's Indemnification; Limitation of Liability
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('21.  Owner\'s Indemnification; Limitation of Liability; Unforeseen Conditions.');
  doc.moveDown(0.3);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('21.1  Owner\'s Indemnification.  Owner agrees to indemnify, defend, and hold harmless Contractor, its officers, employees, agents, and subcontractors from and against any and all claims, demands, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising out of or relating to:', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'Any negligent act, omission, misconduct, or breach of this Agreement by Owner or Owner\'s agents, representatives, guests, tenants, or other third parties on the Property;', 100);
  addLetterItem(doc, 'b', 'Any pre-existing, concealed, or undisclosed hazardous conditions, defects, or unsafe situations on or within the Property, including but not limited to structural defects, rot, infestation, mold, asbestos, lead, or code violations;', 100);
  addLetterItem(doc, 'c', 'Conditions at the Property not created by Contractor;', 100);
  addLetterItem(doc, 'd', 'Owner\'s failure to secure, remove, or adequately protect personal property;', 100);
  addLetterItem(doc, 'e', 'Owner\'s interference with, delay of, or direction relating to the Work; and', 100);
  addLetterItem(doc, 'f', 'Claims, demands, or disputes asserted by third parties, including tenants, guests, neighbors, invitees, or other individuals, except to the extent such claims arise solely from Contractor\'s sole gross negligence or willful misconduct.', 100);
  doc.text('This indemnification obligation shall survive completion, termination, or expiration of this Agreement. This clause does not apply to claims resulting from the sole gross negligence or willful misconduct of Contractor, its employees, or subcontractors.', 80, doc.y, { width: 482 });
  doc.moveDown(0.3);

  doc.text('21.2  Limitation of Liability. To the fullest extent permitted by Connecticut law, Contractor shall not, under any circumstances, be liable for indirect, consequential, special, exemplary, or punitive damages, including but not limited to loss of use, loss of value, diminution in property value, loss of income, business interruption, or emotional distress.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.3);

  doc.text('22.3  Unforeseen or Concealed Conditions.  If unforeseen, concealed, hazardous, or substandard conditions are discovered at the Property, including, without limitation, structural defects, rot, infestation, mold, asbestos, lead, contaminated materials, or building-code violations, Contractor shall have no responsibility or liability for any resulting damages, delays, or additional costs. Contractor shall immediately pause the Work and notify Owner. Work shall not resume until Owner provides written authorization and agrees to pay for any remediation, additional work, or adjustments to the Contract Price, schedule, or Scope of Work required to address such conditions. Any such written authorization shall constitute a Change Order under this Agreement in accordance with the Connecticut Home Improvement Act.', 80, doc.y, { align: 'justify', width: 482 });
  doc.moveDown(0.5);

  // Section 23: Pre-Existing Conditions
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('23.  Pre-Existing Conditions and Third-Party Workmanship.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor shall not be responsible or liable under any circumstances for any defects, deficiencies, delays, damages, or failures arising out of or relating to: (a) pre-existing conditions at the Property; or (b) any work, materials, or services performed or supplied by third parties not hired or directed by Contractor, including without limitation any subcontractors, vendors, or design professionals retained directly by Owner. Contractor shall have no duty to inspect, supervise, correct, or warranty any work performed by such Owner-hired third parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 24: Notices
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('24.  Notices.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Any notice, demand, or other communication required or permitted under this Agreement shall be in writing and shall be deemed properly given if:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.2);
  addLetterItem(doc, 'a', 'Delivered personally to the recipient at the address set forth in the opening section of this Agreement; or', 70);
  addLetterItem(doc, 'b', 'Sent by first-class U.S. Mail, postage prepaid, and addressed to the recipient at the address set forth in the opening section of this Agreement, in which case it shall be deemed given three (3) days after mailing.', 70);
  doc.text('Notices may also be delivered by other means if agreed in writing by both parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 25: Prevailing Party Attorney Fees
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('25.  Prevailing Party Attorney Fees.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('In any dispute, contest, action, proceeding, arbitration or litigation between the parties hereto arising out of or relating to this Agreement and/or the enforcement or the interpretation of this Agreement, the prevailing party shall be entitled to recover from the non-prevailing party all costs, expenses, and reasonable attorneys\' fees incurred, including those incurred in any appeal, post-judgment proceedings, or in enforcing any judgment or award.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 26: Contractor Disclosure
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('26.  Contractor Disclosure of Related Business Entities.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor hereby discloses that within the past five (5) years, Contractor has held an ownership, membership, partnership, officer, shareholder, or other financial interest in the following corporations, limited liability companies, partnerships, or other business entities engaged in home improvement or related construction services:', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text(`     ${formData.contractorDisclosure || 'None.'}`, 50, doc.y);
  doc.moveDown(0.3);
  doc.text('Owner acknowledges receipt of this information/disclosure.', 50, doc.y);
  doc.moveDown(0.5);

  // Section 27: Rescission Period/Right to Cancel
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('27.  RESCISSION PERIOD/RIGHT TO CANCEL.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('OWNER MAY CANCEL THIS AGREEMENT AT ANY TIME PRIOR TO MIDNIGHT OF THE THIRD BUSINESS DAY AFTER THE DATE THIS AGREEMENT IS FULLY SIGNED.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.3);
  doc.text('Notice of cancellation must be sent to Contractor in writing. A separate Notice of Cancellation form is attached as Exhibit B and incorporated into this Agreement by reference.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 28: Relationship of the Parties
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('28.  Relationship of the Parties.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Contractor is an independent contractor. Neither Party is an agent, representative, partner or employee of the other Party. The Parties understand this Contract is not an exclusive arrangement. The Parties agree that they are free to enter into other similar agreements with other parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 29: No Partnership
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('29.  No Partnership.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('Nothing in this Agreement shall be construed to create a partnership, joint venture, or any similar relationship between the parties. Neither party shall have any authority to bind, act for, or assume any obligation on behalf of the other.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 30: Waiver of Jury Trial
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('30.  WAIVER OF JURY TRIAL.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('THE PARTIES HEREBY KNOWINGLY AND VOLUNTARILY WAIVE ANY RIGHT TO A JURY TRIAL IN CONNECTION WITH ANY CLAIM, DISPUTE, OR CONTROVERSY ARISING OUT OF OR RELATING TO THIS CONTRACT. ALL SUCH CLAIMS SHALL BE RESOLVED BY A BENCH TRIAL BEFORE A COURT OF COMPETENT JURISDICTION LOCATED IN NEW HAVEN COUNTY, CONNECTICUT, UNLESS THE PARTIES AGREE IN WRITING TO RESOLVE THE DISPUTE THROUGH BINDING MEDIATION OR ARBITRATION. BY SIGNING THIS AGREEMENT, EACH PARTY ACKNOWLEDGES THAT THEY HAVE HAD THE OPPORTUNITY TO CONSULT LEGAL COUNSEL AND UNDERSTAND THE SIGNIFICANCE OF THIS WAIVER.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 31: Governing Law
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('31.  Governing Law.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement shall be governed by the laws of the State of Connecticut.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 32: Severability
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('32.  Severability.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('If any provision of this Contract shall be held invalid by any court of competent jurisdiction, such holding shall not invalidate any other provision hereof.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 33: Entire Agreement
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('33.  Entire Agreement.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, understandings, or agreements. Any modifications to this Agreement must be in writing and signed by both parties.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(0.5);

  // Section 34: Execution in Counterparts
  checkPageBreak(doc);
  doc.fontSize(11).font('Helvetica-Bold').text('34.  Execution in Counterparts; Electronic Signatures.');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica');
  doc.text('This Agreement may be executed in two or more counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument. Signatures transmitted by electronic means, including by PDF, email, DocuSign, or other electronic signature platform, shall be deemed original signatures for all purposes and shall have the same force and effect as original handwritten signatures.', 50, doc.y, { align: 'justify', width: 512 });
  doc.moveDown(1);

  // Signature Section
  checkPageBreak(doc, 250);
  doc.fontSize(11).font('Helvetica-Bold').text('CONTRACTOR:');
  doc.fontSize(10).font('Helvetica').text('ARTISAN TILE AT WHITFIELD DESIGN LLC');
  doc.text('D/B/A ARTISAN TILE');
  doc.moveDown(0.5);
  doc.text('By: _________________________          Date: _______________');
  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('OWNER:');
  doc.moveDown(0.5);
  
  // Owner 1 signature
  const sigBoxY = doc.y;
  doc.rect(50, sigBoxY, 250, 80).fillAndStroke('#ffffff', '#000000');

  if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
    try {
      const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, 55, sigBoxY + 5, { 
        width: 240, 
        height: 70,
        fit: [240, 70],
        align: 'center',
        valign: 'center'
      });
    } catch (imgError) {
      console.error('Error embedding signature image:', imgError);
      doc.fillColor('#666666').fontSize(10).text('[Signature on file]', 55, sigBoxY + 30);
    }
  } else {
    doc.fillColor('#666666').fontSize(10).text('[Signature on file]', 55, sigBoxY + 30);
  }

  doc.y = sigBoxY + 90;
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
  doc.text(`${formData.ownerName1 || '(Owner 1 Name)'}`);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`);
  doc.moveDown(0.5);

  // Owner 2 signature line (if applicable)
  if (formData.ownerName2) {
    doc.text('_________________________          Date: _______________');
    doc.text(`${formData.ownerName2} (Owner 2)`);
  }
  doc.moveDown(1);

  // EXHIBIT A
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('EXHIBIT A:', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('WORK TO BE PERFORMED', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica');
  doc.text(formData.workDescription || formData.exhibitA || '[Scope of work to be attached or described here]', { align: 'left' });
  doc.moveDown(2);

  // EXHIBIT B: Notice of Cancellation
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('EXHIBIT B: NOTICE OF CANCELLATION', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('NOTICE OF CANCELLATION', { align: 'center' });
  doc.moveDown(1);
  
  doc.fontSize(10).font('Helvetica');
  doc.text('YOU MAY CANCEL THIS TRANSACTION WITHOUT ANY PENALTY OR OBLIGATION, WITHIN THREE (3) BUSINESS DAYS FROM THE DATE THIS AGREEMENT IS FULLY SIGNED.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('IF YOU CANCEL, ANY PROPERTY TRADED IN, ANY PAYMENTS MADE BY YOU UNDER THE CONTRACT OR SALE, AND ANY NEGOTIABLE INSTRUMENT EXECUTED BY YOU WILL BE RETURNED WITHIN TEN (10) BUSINESS DAYS FOLLOWING THE RECEIPT BY CONTRACTOR OF YOUR CANCELLATION NOTICE, AND ANY SECURITY INTEREST ARISING OUT OF THE TRANSACTION WILL ALSO BE CANCELLED.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('TO CANCEL THIS TRANSACTION, MAIL OR DELIVER A SIGNED AND DATED COPY OF THIS CANCELLATION NOTICE, OR ANY OTHER WRITTEN CANCELLATION NOTICE, NOT LATER THAN MIDNIGHT OF THE THIRD BUSINESS DAY FOLLOWING THE FULL EXECUTION OF THE AGREEMENT, TO:', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('      Artisan Tile At Whitfield Design LLC');
  doc.text('      1200 Boston Post Road');
  doc.text('      Guilford, CT 06437');
  doc.moveDown(1);
  doc.text('I HEREBY CANCEL THIS TRANSACTION:');
  doc.moveDown(0.5);
  doc.text('OWNER:');
  doc.moveDown(0.5);
  doc.text('By: _________________________________          Date: _________________');
  doc.text('           (Signature)');
  doc.text('Printed Name: ______________________');
  doc.text('Title: _____________________________');
  doc.moveDown(1);
  doc.text('Cancellation is effective if sent prior to midnight of the third business day after the date the Agreement is fully signed.');

  // Footer
  doc.moveDown(2);
  doc.strokeColor('#333333').lineWidth(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor('#666666');
  doc.text(`Document generated: ${new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} EST`, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// KITCHEN DESIGN RETAINER AGREEMENT
// ─────────────────────────────────────────────────────────────────────────────
function generateKitchenDesignRetainerContract(
  doc: any,
  formData: Record<string, any>,
  signatureDataUrl: string
) {
  const date = formData.date || new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  const clientName = formData.clientName || '';
  const clientAddress = formData.clientAddress || '';

  function checkPageBreak(needed = 80) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - needed) {
      doc.addPage();
    }
  }

  // Header
  doc.fontSize(13).font('Helvetica-Bold').text('Artisan Tile Kitchen and Bath', { align: 'center' });
  doc.fontSize(10).font('Helvetica')
    .text('1200 Boston Post Rd', { align: 'center' })
    .text('Guilford CT 06437', { align: 'center' })
    .text('203-458-8453', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(13).font('Helvetica-Bold').text('KITCHEN DESIGN RETAINER AGREEMENT', { align: 'center' });
  doc.moveDown(0.8);

  doc.fontSize(10).font('Helvetica').text(
    `This Kitchen Design Retainer Agreement ("Agreement") is entered into on ${date}, by and between:`,
    50, doc.y, { align: 'justify', width: 512 }
  );
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Designer: ', 50, doc.y, { continued: true }).font('Helvetica').text('Peter Lemos');
  doc.font('Helvetica-Bold').text('Client: ', 50, doc.y, { continued: true }).font('Helvetica').text(clientName || '______________________________');
  doc.font('Helvetica-Bold').text('Address: ', 50, doc.y, { continued: true }).font('Helvetica').text(clientAddress || '______________________________');
  doc.moveDown(0.8);

  const sections: [string, string][] = [
    ['1.', 'Scope of Design Services',
      'Designer agrees to provide professional kitchen design services, which may include site consultation, layout planning, design concepts, cabinet planning, and preliminary selections for materials and finishes (collectively referred to as "Design Services"). These services are intended to assist the Client in evaluating and planning a potential kitchen renovation project.'] as any,
    ['2.', 'Design Retainer Fee',
      'Client agrees to pay Designer a design retainer in the amount of One Thousand Two Hundred Dollars ($1,200.00) prior to the commencement of any design work.'] as any,
    ['3.', 'Non-Refundable Retainer',
      'The $1,200.00 design retainer compensates Designer for time, consultation, planning, and preparation of design materials. This retainer is non-refundable once design services have commenced, regardless of whether Client proceeds with the kitchen renovation project.'] as any,
    ['4.', 'Credit Toward Cabinet Purchase',
      "If Client proceeds with the purchase of kitchen cabinets through Designer or Designer's business within sixty (60) days of the design presentation, the $1,200.00 retainer will be applied as a credit toward the cabinet purchase price."] as any,
    ['5.', 'No Obligation to Proceed',
      "Client is under no obligation to move forward with the project following the design phase. However, if Client chooses not to proceed with purchasing cabinets through Designer, the design retainer will be retained by Designer as payment for services rendered."] as any,
    ['6.', 'Ownership of Design Materials',
      "All drawings, layouts, renderings, and design materials produced by Designer remain the intellectual property of Designer unless otherwise agreed in writing. Design materials are provided for Client's use in connection with the project and may not be reproduced, transferred, or used for construction or purchasing through other vendors without written permission from Designer."] as any,
    ['7.', 'Limitation of Liability',
      'Designer shall not be liable for construction issues, installation errors, or contractor performance unless Designer is separately contracted for such services.'] as any,
    ['8.', 'Governing Law',
      'This Agreement shall be governed by and construed in accordance with the laws of the State of Connecticut.'] as any,
    ['9.', 'Entire Agreement',
      'This Agreement constitutes the entire agreement between the parties regarding the design retainer and supersedes any prior discussions or agreements.'] as any,
  ];

  for (const [num, title, body] of sections as any) {
    checkPageBreak();
    doc.fontSize(11).font('Helvetica-Bold').text(`${num}  ${title}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').text(body, 70, doc.y, { align: 'justify', width: 492 });
    doc.moveDown(0.6);
  }

  // Signature block
  checkPageBreak(160);
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(
    'IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.',
    50, doc.y, { align: 'justify', width: 512 }
  );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('Artisan Tile at Whitfield Design LLC', 50, doc.y);
  doc.font('Helvetica').text('03/9/2026', 50, doc.y);
  doc.moveDown(1.5);

  // Embed client signature
  if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
    try {
      const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const sigBuffer = Buffer.from(base64Data, 'base64');
      doc.text('Client Signature:', 50, doc.y);
      doc.moveDown(0.3);
      doc.image(sigBuffer, 50, doc.y, { width: 200, height: 60 });
      doc.moveDown(4);
    } catch {
      doc.text('Client Signature: ________________________________', 50, doc.y);
      doc.moveDown(1);
    }
  } else {
    doc.text('Client Signature: ________________________________', 50, doc.y);
    doc.moveDown(1);
  }

  doc.text(`Name: ${clientName}`, 50, doc.y);
  doc.moveDown(0.5);
  doc.text(`Date: ${date}`, 50, doc.y);

  // Footer
  doc.moveDown(2);
  doc.strokeColor('#333333').lineWidth(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor('#666666');
  doc.text(`Document generated: ${new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} EST`, { align: 'center' });
}
