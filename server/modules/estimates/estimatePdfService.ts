// @ts-ignore - pdfkit types
import PDFDocument from "pdfkit";

const COMPANY_INFO = {
  name: "ARTISAN TILE AT WHITFIELD DESIGN LLC",
  dba: "ARTISAN TILE KITCHEN & BATH",
  address: "1200 Boston Post Road",
  cityStateZip: "Guilford, CT 06437",
  phone: "(203) 458-8453",
  hicNumber: "HIC #: 0646519",
};

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: Date | string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export interface EstimatePdfInput {
  id: number;
  estimate_number: string;
  title: string;
  description?: string | null;
  status: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at: Date | string;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  lineItems: Array<{
    description: string;
    section?: string | null;
    category?: string | null;
    quantity: number | string;
    unit?: string | null;
    unit_price: number | string;
    total: number | string;
  }>;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
}

export async function generateEstimatePdf(estimate: EstimatePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "LETTER",
        bufferPages: true,
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ───────────────────────────────────────────────
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(COMPANY_INFO.name, { align: "center" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`D/B/A ${COMPANY_INFO.dba}`, { align: "center" });
      doc.text(COMPANY_INFO.address, { align: "center" });
      doc.text(COMPANY_INFO.cityStateZip, { align: "center" });
      doc.text(COMPANY_INFO.phone, { align: "center" });
      doc.text(COMPANY_INFO.hicNumber, { align: "center" });
      doc.moveDown(0.8);

      // Horizontal rule
      doc
        .strokeColor("#333333")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // ── Estimate title + date ─────────────────────────────────
      const titleY = doc.y;
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text(`ESTIMATE #${estimate.estimate_number}`, 50, titleY);

      const dateLabel = estimate.issue_date
        ? formatDate(estimate.issue_date)
        : formatDate(estimate.created_at);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#555555")
        .text(`Date: ${dateLabel}`, 350, titleY, {
          align: "right",
          width: 212,
        });

      if (estimate.expiry_date) {
        doc.text(`Valid Until: ${formatDate(estimate.expiry_date)}`, 350, titleY + 14, {
          align: "right",
          width: 212,
        });
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#555555")
        .text(
          `Status: ${estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}`,
          350,
          titleY + (estimate.expiry_date ? 28 : 14),
          { align: "right", width: 212 },
        );

      doc.y = titleY + 45;
      doc.moveDown(0.5);

      // ── Title & description ────────────────────────────────────
      if (estimate.title) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#1a1a1a")
          .text(estimate.title);
        doc.moveDown(0.2);
      }
      if (estimate.description) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#555555")
          .text(estimate.description);
        doc.moveDown(0.5);
      }

      // ── Customer info ─────────────────────────────────────────
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a")
        .text("Prepared For:");
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").fillColor("#333333");
      doc.text(estimate.customer.name);
      if (estimate.customer.email) doc.text(estimate.customer.email);
      if (estimate.customer.phone) doc.text(estimate.customer.phone);
      if (estimate.customer.address) doc.text(estimate.customer.address);
      doc.moveDown(0.8);

      // ── Line items table ──────────────────────────────────────
      const tableTop = doc.y;
      const colX = {
        description: 50,
        category: 230,
        qty: 310,
        unit: 350,
        unitPrice: 410,
        total: 490,
      };

      // Header row
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#ffffff");

      doc
        .rect(50, tableTop - 2, 512, 18)
        .fill("#2c3e50");

      doc
        .fillColor("#ffffff")
        .text("Description", colX.description, tableTop + 2, { width: 175 })
        .text("Category", colX.category, tableTop + 2, { width: 75 })
        .text("Qty", colX.qty, tableTop + 2, { width: 35, align: "right" })
        .text("Unit", colX.unit, tableTop + 2, { width: 55 })
        .text("Unit Price", colX.unitPrice, tableTop + 2, {
          width: 70,
          align: "right",
        })
        .text("Total", colX.total, tableTop + 2, {
          width: 72,
          align: "right",
        });

      let rowY = tableTop + 22;

      doc.font("Helvetica").fontSize(9).fillColor("#333333");

      for (let i = 0; i < estimate.lineItems.length; i++) {
        const item = estimate.lineItems[i];

        // Alternate row background
        if (i % 2 === 0) {
          doc.rect(50, rowY - 2, 512, 16).fill("#f8f9fa");
          doc.fillColor("#333333");
        }

        // Check page break
        if (rowY > 680) {
          doc.addPage();
          rowY = 50;
        }

        doc.text(item.description, colX.description, rowY, { width: 175 });
        doc.text(item.category || item.section || "", colX.category, rowY, { width: 75 });
        doc.text(String(item.quantity), colX.qty, rowY, {
          width: 35,
          align: "right",
        });
        doc.text(item.unit || "", colX.unit, rowY, { width: 55 });
        doc.text(`$${formatCurrency(item.unit_price)}`, colX.unitPrice, rowY, {
          width: 70,
          align: "right",
        });
        doc.text(`$${formatCurrency(item.total)}`, colX.total, rowY, {
          width: 72,
          align: "right",
        });

        rowY += 18;
      }

      // Line under items
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(50, rowY + 2)
        .lineTo(562, rowY + 2)
        .stroke();
      rowY += 12;

      // ── Totals ────────────────────────────────────────────────
      const totalsX = 410;
      const totalsValX = 490;
      const totalsW = 72;

      doc.fontSize(10).font("Helvetica").fillColor("#333333");
      doc.text("Subtotal:", totalsX, rowY, { width: 70, align: "right" });
      doc.text(`$${formatCurrency(estimate.subtotal)}`, totalsValX, rowY, {
        width: totalsW,
        align: "right",
      });
      rowY += 16;

      const taxAmount = parseFloat(String(estimate.tax_amount) || "0");
      if (taxAmount > 0) {
        const taxRate = parseFloat(String(estimate.tax_rate) || "0");
        const taxLabel = taxRate > 0 ? `Tax (${(taxRate * 100).toFixed(1)}%):` : "Tax:";
        doc.text(taxLabel, totalsX, rowY, { width: 70, align: "right" });
        doc.text(`$${formatCurrency(taxAmount)}`, totalsValX, rowY, {
          width: totalsW,
          align: "right",
        });
        rowY += 16;
      }

      // Bold total
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#1a1a1a");
      doc.text("Total:", totalsX, rowY, { width: 70, align: "right" });
      doc.text(`$${formatCurrency(estimate.total)}`, totalsValX, rowY, {
        width: totalsW,
        align: "right",
      });
      rowY += 24;

      // ── Notes ─────────────────────────────────────────────────
      if (estimate.notes) {
        if (rowY > 650) {
          doc.addPage();
          rowY = 50;
        }

        doc.y = rowY;
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#1a1a1a")
          .text("Notes:");
        doc.moveDown(0.2);
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#555555")
          .text(estimate.notes, { width: 512 });
        doc.moveDown(0.8);
      } else {
        doc.y = rowY;
        doc.moveDown(0.8);
      }

      // ── Footer ────────────────────────────────────────────────
      doc
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .stroke();
      doc.moveDown(0.5);

      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor("#888888")
        .text(
          "This estimate is valid for 30 days from the date above. Thank you for your business.",
          { align: "center" },
        );
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#888888")
        .text("Prepared by: Artisan Tile Kitchen & Bath", { align: "center" });

      // Timestamp
      doc.moveDown(1);
      doc
        .fontSize(8)
        .fillColor("#aaaaaa")
        .text(
          `Document generated: ${new Date().toLocaleString("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })} EST`,
          { align: "center" },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
