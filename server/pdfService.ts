// @ts-ignore - pdfkit types
import PDFDocument from 'pdfkit';

const AGREEMENT_TEXT = `SAMPLE CHECKOUT AGREEMENT

I agree to the sample policy and authorize Artisan Tile to store my card on file.

I authorize Artisan Tile to store my card on file and charge it for the full retail price of the sample if it is not returned by the due date or is returned damaged.

TERMS AND CONDITIONS:

1. The sample(s) listed below are loaned to the customer for evaluation purposes only.

2. The customer agrees to return the sample(s) in the same condition as received by the due date specified.

3. If the sample(s) are not returned by the due date, or are returned damaged, the customer authorizes Artisan Tile to charge the full retail price to the card on file.

4. The customer is responsible for the care and safekeeping of the sample(s) while in their possession.

5. Artisan Tile reserves the right to pursue collection of any unpaid charges.`;

export function getAgreementText(): string {
  return AGREEMENT_TEXT;
}

export async function generateAgreementPdf(options: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sampleName: string;
  checkoutDate: string;
  dueDate: string;
  signatureDataUrl: string;
  signedAt: Date;
}): Promise<Buffer> {
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

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('ARTISAN TILE', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica').text('Sample Checkout Agreement', { align: 'center' });
      doc.moveDown(1.5);

      // Horizontal line
      doc.strokeColor('#333333').lineWidth(1);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(1);

      // Customer Information section
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('CUSTOMER INFORMATION');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Name: ${options.customerName}`);
      doc.text(`Email: ${options.customerEmail}`);
      if (options.customerPhone) {
        doc.text(`Phone: ${options.customerPhone}`);
      }
      doc.moveDown(1);

      // Sample Details section
      doc.fontSize(12).font('Helvetica-Bold').text('SAMPLE DETAILS');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Sample: ${options.sampleName}`);
      doc.text(`Checkout Date: ${options.checkoutDate}`);
      doc.text(`Due Date: ${options.dueDate}`);
      doc.moveDown(1.5);

      // Authorization box
      doc.fontSize(12).font('Helvetica-Bold').text('AUTHORIZATION');
      doc.moveDown(0.5);
      
      const boxY = doc.y;
      doc.rect(50, boxY, 512, 70).fillAndStroke('#f5f5f5', '#cccccc');
      doc.fillColor('#000000').font('Helvetica').fontSize(10);
      doc.text('I authorize Artisan Tile to store my card on file and charge it for the full retail', 60, boxY + 15, { width: 492 });
      doc.text('price of the sample if it is not returned by the due date or is returned damaged.', 60, doc.y, { width: 492 });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('[X] I agree to the sample policy and authorize storing my card on file', 60);
      
      doc.y = boxY + 80;
      doc.moveDown(1);

      // Terms and Conditions
      doc.fontSize(12).font('Helvetica-Bold').text('TERMS AND CONDITIONS');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      
      const terms = [
        '1. The sample(s) listed above are loaned to the customer for evaluation purposes only.',
        '2. The customer agrees to return the sample(s) in the same condition as received by the due date specified.',
        '3. If the sample(s) are not returned by the due date, or are returned damaged, the customer authorizes Artisan Tile to charge the full retail price to the card on file.',
        '4. The customer is responsible for the care and safekeeping of the sample(s) while in their possession.',
        '5. Artisan Tile reserves the right to pursue collection of any unpaid charges.',
      ];

      terms.forEach(term => {
        doc.text(term, { width: 512 });
        doc.moveDown(0.4);
      });
      
      doc.moveDown(1);

      // Signature section
      doc.fontSize(12).font('Helvetica-Bold').text('CUSTOMER SIGNATURE');
      doc.moveDown(0.5);

      // Draw signature box with white background
      const sigBoxY = doc.y;
      doc.rect(50, sigBoxY, 250, 80).fillAndStroke('#ffffff', '#000000');

      if (options.signatureDataUrl && options.signatureDataUrl.startsWith('data:image')) {
        try {
          const base64Data = options.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          // Place signature inside the box
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
      doc.text(`Signed on: ${options.signedAt.toLocaleString('en-US', {
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

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
