/**
 * Generate a PDF summary of approved timecards for a week.
 * Uses PDFKit to create a clean table layout.
 */

export async function generatePayrollPdf(
  weekLabel: string,
  cards: Array<{
    user: { firstName: string | null; lastName: string | null; email: string; mileageRate?: string | null };
    totalHours: string | null;
    totalMileage: string | null;
    entries: Array<{ entryDate: string; hours: string; mileage: string | null }>;
  }>,
): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 40 });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc.fontSize(18).font("Helvetica-Bold").text("Weekly Timecard Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").text(`Week: ${weekLabel}`, { align: "center" });
    doc.moveDown(1);

    // Table setup
    const startX = 40;
    let y = doc.y;
    const colWidths = [140, 50, 50, 50, 50, 50, 50, 50, 60, 60, 60]; // name + 7 days + total + miles + $
    const headers = ["Employee", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Total Hrs", "Miles", "Mileage $"];
    const rowHeight = 22;

    // Header row
    doc.fontSize(9).font("Helvetica-Bold");
    let x = startX;
    for (let i = 0; i < headers.length; i++) {
      doc.rect(x, y, colWidths[i], rowHeight).fill("#e0e0e0").stroke();
      doc.fillColor("#000").text(headers[i], x + 3, y + 6, { width: colWidths[i] - 6, align: i === 0 ? "left" : "center" });
      x += colWidths[i];
    }
    y += rowHeight;

    // Data rows
    doc.font("Helvetica").fontSize(9);
    for (const card of cards) {
      if (y > 540) {
        doc.addPage();
        y = 40;
      }

      const name = [card.user.firstName, card.user.lastName].filter(Boolean).join(" ") || card.user.email;
      const rawRate = parseFloat(card.user.mileageRate || "0");
      const rate = rawRate > 0 ? rawRate : 0.67; // default IRS rate
      const totalMiles = parseFloat(card.totalMileage || "0");
      const mileageCost = (rate * totalMiles).toFixed(2);

      x = startX;
      const values = [
        name,
        ...card.entries.map((e) => parseFloat(e.hours || "0").toFixed(1)),
        parseFloat(card.totalHours || "0").toFixed(1),
        totalMiles.toFixed(1),
        `$${mileageCost}`,
      ];

      for (let i = 0; i < values.length; i++) {
        doc.rect(x, y, colWidths[i], rowHeight).stroke();
        const fontStyle = i === 0 || i === 8 ? "Helvetica-Bold" : "Helvetica";
        doc.font(fontStyle).fillColor("#000").text(values[i], x + 3, y + 6, { width: colWidths[i] - 6, align: i === 0 ? "left" : "center" });
        x += colWidths[i];
      }
      y += rowHeight;
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("#888").text(
      `Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString("en-US")}`,
      { align: "center" },
    );

    doc.end();
  });
}
