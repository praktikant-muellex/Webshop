import PDFDocument from "pdfkit";
import path from "path";
import { Order, OrderItem, Product, User } from "@prisma/client";

const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "logo-full.png");
const BRAND_PURPLE = "#76689a";
const BRAND_MINT = "#71cc98";

type FullOrder = Order & {
  items: (OrderItem & { product: Product })[];
  user: User;
  decidedByUser: User | null;
};

function employeeLabel(user: User): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unbekannt";
  return user.employeeNumber ? `${name} (Personalnummer ${user.employeeNumber})` : name;
}

// Admin/supervisor accounts have no name on file, only email — fall back to
// that instead of showing "Unbekannt" for who approved the order.
function staffLabel(user: User): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "Unbekannt";
}

function productLabel(product: Product): string {
  return product.color ? `${product.name} (${product.color})` : product.name;
}

const COL = { product: 50, size: 300, qty: 370, price: 420, sum: 490 };
const PAGE_BOTTOM = 780;

/** Draws the column header bar and leaves the doc ready to write body rows right after it. */
function drawItemTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.rect(50, y, 495, 22).fill(BRAND_MINT);
  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Artikel", COL.product + 5, y + 6)
    .text("Größe", COL.size, y + 6)
    .text("Menge", COL.qty, y + 6)
    .text("Preis", COL.price, y + 6)
    .text("Summe", COL.sum, y + 6);
  doc.font("Helvetica").fillColor("#334155");
  return y + 22;
}

export function generateReceiptPdf(order: FullOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.image(LOGO_PATH, 50, 45, { width: 140 });
    } catch {
      // Logo asset missing in this environment — the receipt still works without it.
    }

    doc
      .fontSize(18)
      .fillColor(BRAND_PURPLE)
      .text("Beleg – Arbeitskleidung", 50, 120, { align: "left" });

    doc
      .fontSize(10)
      .fillColor("#334155")
      .text(`Bestellnummer: ${order.id}`, 50, 150)
      .text(`Bestelldatum: ${order.submittedAt.toLocaleDateString("de-AT")}`)
      .text(`Freigegeben am: ${order.decidedAt ? order.decidedAt.toLocaleDateString("de-AT") : "-"}`)
      .text(`Freigegeben von: ${order.decidedByUser ? staffLabel(order.decidedByUser) : "-"}`)
      .text(`Mitarbeiter: ${employeeLabel(order.user)}`);

    let y = drawItemTableHeader(doc, 240);

    let total = 0;
    for (const item of order.items) {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        y = drawItemTableHeader(doc, 50);
      }

      const lineTotal = item.unitPriceEur * item.quantity;
      total += lineTotal;

      doc
        .fontSize(9)
        .text(productLabel(item.product), COL.product + 5, y + 7, { width: 240 })
        .text(item.sizeLabel ?? "-", COL.size, y + 7)
        .text(String(item.quantity), COL.qty, y + 7)
        .text(`${item.unitPriceEur} €`, COL.price, y + 7)
        .text(`${lineTotal} €`, COL.sum, y + 7);

      y += 24;
      doc.moveTo(50, y).lineTo(545, y).strokeColor("#e2e8f0").stroke();
    }

    // The total and footer need another ~60pt below the last item row — if
    // that would run off the page, start a fresh page for them rather than
    // letting them silently render past the page bottom (unlike text drawn
    // within the page, pdfkit does not warn or auto-paginate for this).
    if (y + 60 > PAGE_BOTTOM) {
      doc.addPage();
      y = 50;
    }

    y += 20;
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(BRAND_PURPLE)
      .text(`Gesamtsumme: ${total} €`, COL.price - 20, y);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text(
        "Dieser Beleg dokumentiert den Abzug vom Arbeitskleidungsbudget des Mitarbeiters und dient nicht als steuerliche Rechnung.",
        50,
        y + 25,
        { width: 495 }
      );

    doc.end();
  });
}
