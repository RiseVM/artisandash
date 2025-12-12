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

function generateCabinetryContract(doc: any, formData: Record<string, any>, signatureDataUrl: string) {
  // Header
  doc.fontSize(16).font('Helvetica-Bold').text('CABINET DESIGN AND LAYOUT AGREEMENT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').text(COMPANY_INFO.name, { align: 'center' });
  doc.text(`D/B/A ${COMPANY_INFO.dba}`, { align: 'center' });
  doc.text(COMPANY_INFO.address, { align: 'center' });
  doc.text(COMPANY_INFO.cityStateZip, { align: 'center' });
  doc.text(`CT Registration: ${COMPANY_INFO.hicNumber}`, { align: 'center' });
  doc.moveDown(1.5);

  // Date
  doc.fontSize(11).font('Helvetica').text(`Date: ${formData.date || new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`);
  doc.moveDown(1);

  // Purchaser Information
  doc.font('Helvetica-Bold').text('PURCHASER:');
  doc.font('Helvetica');
  doc.text(`Name: ${formData.purchaserName || ''}`);
  doc.text(`Address: ${formData.purchaserAddress || ''}`);
  doc.moveDown(0.5);

  // Property Address
  doc.font('Helvetica-Bold').text('PROPERTY ADDRESS (if different):');
  doc.font('Helvetica').text(formData.propertyAddress || 'Same as above');
  doc.moveDown(1);

  // Agreement text
  doc.font('Helvetica').text(
    'The Purchaser hereby engages Artisan Tile at Whitfield Design LLC to provide cabinet design and layout services for the property listed above. This agreement covers the design, selection, and coordination of custom cabinetry for the project.',
    { align: 'justify' }
  );
  doc.moveDown(1);

  // Pricing
  doc.font('Helvetica-Bold').text('PRICING:');
  doc.moveDown(0.5);
  
  const contractPrice = parseFloat(formData.contractPrice) || 0;
  const taxRate = 0.0635; // CT sales tax
  const tax = parseFloat(formData.ctSalesTax) || (contractPrice * taxRate);
  const total = parseFloat(formData.totalAmount) || (contractPrice + tax);
  const deposit = parseFloat(formData.deposit) || (total * 0.60);
  const balance = parseFloat(formData.balance) || (total * 0.40);

  doc.font('Helvetica');
  doc.text(`Contract Price: $${contractPrice.toFixed(2)}`);
  doc.text(`CT Sales Tax (6.35%): $${tax.toFixed(2)}`);
  doc.text(`Total Amount: $${total.toFixed(2)}`);
  doc.moveDown(0.5);
  doc.text(`60% Deposit Due at Signing: $${deposit.toFixed(2)}`);
  doc.text(`40% Balance Due Upon Delivery: $${balance.toFixed(2)}`);
  doc.moveDown(1);

  // Terms
  doc.font('Helvetica-Bold').text('TERMS AND CONDITIONS:');
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  
  const terms = [
    '1. The 60% deposit is due upon signing of this agreement.',
    '2. The 40% balance is due upon delivery of the cabinets.',
    '3. All sales are final. Custom orders cannot be canceled once placed with the manufacturer.',
    '4. Delivery dates are estimates and may vary based on manufacturer lead times.',
    '5. The Purchaser is responsible for ensuring proper site preparation prior to delivery.',
    '6. Artisan Tile is not responsible for damage caused by improper installation by third parties.',
    '7. Any changes to the order after signing may result in additional charges and delays.',
  ];

  terms.forEach(term => {
    doc.text(term, { width: 500 });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);

  // Signature section
  addSignatureSection(doc, signatureDataUrl, formData.purchaserName || 'Purchaser');
}

function generateHomeImprovementContract(doc: any, formData: Record<string, any>, signatureDataUrl: string) {
  // Header
  doc.fontSize(16).font('Helvetica-Bold').text('HOME IMPROVEMENT CONTRACT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica').text(COMPANY_INFO.name, { align: 'center' });
  doc.text(`D/B/A ${COMPANY_INFO.dba}`, { align: 'center' });
  doc.text(COMPANY_INFO.address, { align: 'center' });
  doc.text(COMPANY_INFO.cityStateZip, { align: 'center' });
  doc.text(`CT Registration: ${COMPANY_INFO.hicNumber}`, { align: 'center' });
  doc.moveDown(1.5);

  // Date
  doc.fontSize(11).font('Helvetica').text(`Date: ${formData.date || new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}`);
  doc.moveDown(1);

  // Owner Information
  doc.font('Helvetica-Bold').text('PROPERTY OWNER(S):');
  doc.font('Helvetica');
  doc.text(`Owner 1: ${formData.ownerName1 || ''}`);
  if (formData.ownerName2) {
    doc.text(`Owner 2: ${formData.ownerName2}`);
  }
  doc.text(`Owner Address: ${formData.ownerAddress || ''}`);
  doc.moveDown(0.5);

  // Property Address
  doc.font('Helvetica-Bold').text('PROPERTY ADDRESS (where work will be performed):');
  doc.font('Helvetica').text(formData.propertyAddress || 'Same as above');
  doc.moveDown(1);

  // Description of Work
  doc.font('Helvetica-Bold').text('DESCRIPTION OF WORK:');
  doc.font('Helvetica').text(formData.workDescription || 'Home improvement services as agreed upon.', { align: 'justify' });
  doc.moveDown(1);

  // Pricing
  doc.font('Helvetica-Bold').text('CONTRACT PRICING:');
  doc.moveDown(0.5);
  
  const laborPrice = parseFloat(formData.laborPrice) || 0;
  const materialsPrice = parseFloat(formData.materialsPrice) || 0;
  const totalPrice = parseFloat(formData.totalContractPrice) || (laborPrice + materialsPrice);

  doc.font('Helvetica');
  doc.text(`Labor: $${laborPrice.toFixed(2)}`);
  doc.text(`Materials: $${materialsPrice.toFixed(2)}`);
  doc.text(`Total Contract Price: $${totalPrice.toFixed(2)}`);
  doc.moveDown(0.5);

  // Timeline
  doc.font('Helvetica-Bold').text('PROJECT TIMELINE:');
  doc.font('Helvetica');
  doc.text(`Estimated Start Date: ${formData.startDate || 'TBD'}`);
  doc.text(`Estimated Completion Date: ${formData.completionDate || 'TBD'}`);
  doc.moveDown(1);

  // Terms
  doc.font('Helvetica-Bold').text('TERMS AND CONDITIONS:');
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  
  const terms = [
    '1. This contract is subject to all applicable Connecticut home improvement laws and regulations.',
    '2. The homeowner has three (3) business days to cancel this contract without penalty.',
    '3. All work will be performed in a workmanlike manner and in compliance with applicable building codes.',
    '4. The contractor will obtain all necessary permits for the work described herein.',
    '5. Payment terms: 50% deposit due at signing, 50% balance due upon completion.',
    '6. Any changes to the scope of work must be agreed upon in writing by both parties.',
    '7. The contractor maintains appropriate liability insurance and workers compensation coverage.',
    '8. Warranty: All work is warranted for one (1) year from the date of completion.',
  ];

  terms.forEach(term => {
    doc.text(term, { width: 500 });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);

  // Signature section
  addSignatureSection(doc, signatureDataUrl, formData.ownerName1 || 'Property Owner');
}

function addSignatureSection(doc: any, signatureDataUrl: string, signerName: string) {
  doc.fontSize(11).font('Helvetica-Bold').text('CUSTOMER SIGNATURE');
  doc.moveDown(0.5);

  // Draw signature box with white background
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
  doc.text(`${signerName}`);
  doc.text(`Signed on: ${new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} EST`);
  
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
