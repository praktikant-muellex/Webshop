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

    let y = 240;
    const col = { product: 50, size: 300, qty: 370, price: 420, sum: 490 };

    doc.rect(50, y, 495, 22).fill(BRAND_MINT);
    doc
      .fillColor("#ffffff")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Artikel", col.product + 5, y + 6)
      .text("Größe", col.size, y + 6)
      .text("Menge", col.qty, y + 6)
      .text("Preis", col.price, y + 6)
      .text("Summe", col.sum, y + 6);

    y += 22;
    doc.font("Helvetica").fillColor("#334155");

    let total = 0;
    for (const item of order.items) {
      const lineTotal = item.unitPriceEur * item.quantity;
      total += lineTotal;

      doc
        .fontSize(9)
        .text(productLabel(item.product), col.product + 5, y + 7, { width: 240 })
        .text(item.sizeLabel ?? "-", col.size, y + 7)
        .text(String(item.quantity), col.qty, y + 7)
        .text(`${item.unitPriceEur} €`, col.price, y + 7)
        .text(`${lineTotal} €`, col.sum, y + 7);

      y += 24;
      doc.moveTo(50, y).lineTo(545, y).strokeColor("#e2e8f0").stroke();
    }

    y += 20;
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(BRAND_PURPLE)
      .text(`Gesamtsumme: ${total} €`, col.price - 20, y);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text(
        "Dieser Beleg dokumentiert den Abzug vom Arbeitskleidungsbudget des Mitarbeiters und dient nicht als steuerliche Rechnung.",
        50,
        760,
        { width: 495 }
      );

    doc.end();
  });
}
