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
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text('ARTISAN TILE', { align: 'center' });
      doc.fontSize(16).text('Sample Checkout Agreement', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold').text('Customer Information:');
      doc.font('Helvetica');
      doc.text(`Name: ${options.customerName}`);
      doc.text(`Email: ${options.customerEmail}`);
      if (options.customerPhone) {
        doc.text(`Phone: ${options.customerPhone}`);
      }
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Sample Details:');
      doc.font('Helvetica');
      doc.text(`Sample: ${options.sampleName}`);
      doc.text(`Checkout Date: ${options.checkoutDate}`);
      doc.text(`Due Date: ${options.dueDate}`);
      doc.moveDown(2);

      doc.font('Helvetica-Bold').fontSize(12).text('CUSTOMER ACKNOWLEDGMENT:', { underline: true });
      doc.moveDown(0.5);
      
      doc.font('Helvetica').fontSize(11);
      doc.text('[X] I agree to the sample policy and authorize storing my card on file', { continued: false });
      doc.moveDown(0.3);
      
      doc.rect(doc.x, doc.y, 450, 60).stroke();
      doc.moveDown(0.2);
      const boxX = doc.x + 10;
      doc.font('Helvetica').fontSize(10);
      doc.text('I authorize Artisan Tile to store my card on file and charge it for the full', boxX, doc.y);
      doc.text('retail price of the sample if it is not returned by the due date or is returned', boxX);
      doc.text('damaged.', boxX);
      doc.moveDown(1.5);
      
      doc.font('Helvetica-Bold').fontSize(11).text('TERMS AND CONDITIONS:');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10);
      
      const terms = [
        '1. The sample(s) listed above are loaned to the customer for evaluation purposes only.',
        '2. The customer agrees to return the sample(s) in the same condition as received by the due date specified.',
        '3. If the sample(s) are not returned by the due date, or are returned damaged, the customer authorizes Artisan Tile to charge the full retail price to the card on file.',
        '4. The customer is responsible for the care and safekeeping of the sample(s) while in their possession.',
        '5. Artisan Tile reserves the right to pursue collection of any unpaid charges.',
      ];

      terms.forEach(line => {
        doc.text(line);
        doc.moveDown(0.3);
      });
      
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold').text('Customer Signature:');
      doc.moveDown(0.5);

      if (options.signatureDataUrl && options.signatureDataUrl.startsWith('data:image')) {
        try {
          const base64Data = options.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, { width: 200, height: 80 });
        } catch (imgError) {
          doc.text('[Signature on file]');
        }
      } else {
        doc.text('[Signature on file]');
      }

      doc.moveDown();
      doc.font('Helvetica').fontSize(10);
      doc.text(`Signed on: ${options.signedAt.toLocaleString()}`);
      
      doc.moveDown(2);
      doc.fontSize(8).fillColor('gray');
      doc.text(`Document generated: ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
