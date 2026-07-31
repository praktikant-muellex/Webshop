import PDFDocument from "pdfkit";
import path from "path";
import { InventorySession, User } from "@prisma/client";
import { PDF_PAGE_BOTTOM, ensureRowSpace } from "./pdfTable";

const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "logo-full.png");
const BRAND_PURPLE = "#76689a";
const BRAND_MINT = "#71cc98";

const CATEGORY_LABELS: Record<string, string> = {
  SHIRTS: "Shirts",
  HOSEN: "Hosen",
  PULLOVER: "Pullover",
  JACKEN_WESTEN: "Jacken & Westen",
  ZUBEHOER: "Zubehör",
};

export interface InventoryPdfRow {
  productName: string;
  color: string | null;
  category: string;
  previousCount: number | null;
  soldSincePrevious: number | null;
  expectedStock: number | null;
  count: number;
  difference: number | null;
}

type SessionWithCreator = InventorySession & {
  createdByUser: Pick<User, "firstName" | "lastName" | "email">;
};

function staffLabel(user: Pick<User, "firstName" | "lastName" | "email">): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "Unbekannt";
}

function productLabel(row: InventoryPdfRow): string {
  return row.color ? `${row.productName} (${row.color})` : row.productName;
}

const COLS = { product: 50, category: 220, previous: 300, sold: 345, expected: 390, counted: 440, diff: 490 };

/** Draws the column header bar and leaves the doc ready to write body rows right after it. */
function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.rect(50, y, 495, 20).fill(BRAND_MINT);
  doc
    .fillColor("#ffffff")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Artikel", COLS.product + 5, y + 6)
    .text("Kategorie", COLS.category, y + 6)
    .text("Vorher", COLS.previous, y + 6)
    .text("Verk.", COLS.sold, y + 6)
    .text("Soll", COLS.expected, y + 6)
    .text("Gezählt", COLS.counted, y + 6)
    .text("Diff.", COLS.diff, y + 6);
  doc.font("Helvetica").fillColor("#334155");
  return y + 20;
}

/** Small filled triangle + "!" — pdfkit's standard fonts don't reliably render the ⚠ glyph. */
function drawWarningTriangle(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc
    .polygon([x + 4, y], [x + 8, y + 8], [x, y + 8])
    .fill("#dc2626");
  doc.fillColor("#ffffff").fontSize(6).font("Helvetica-Bold").text("!", x + 2.5, y + 1.5);
}

export function generateInventorySessionPdf(session: SessionWithCreator, rows: InventoryPdfRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      doc.image(LOGO_PATH, 50, 45, { width: 140 });
    } catch {
      // Logo asset missing in this environment — the PDF still works without it.
    }

    doc.fontSize(18).fillColor(BRAND_PURPLE).font("Helvetica-Bold").text("Inventur", 50, 120);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#334155")
      .text(`Datum: ${session.takenAt.toLocaleDateString("de-AT")}`, 50, 150)
      .text(
        `Erstellt am: ${session.createdAt.toLocaleDateString("de-AT")}, ${session.createdAt.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr`
      )
      .text(`Erfasst von: ${staffLabel(session.createdByUser)}`);

    let y = drawTableHeader(doc, 205);

    for (const row of rows) {
      y = ensureRowSpace(doc, y, drawTableHeader);

      const rowY = y + 6;
      doc
        .fontSize(8)
        .fillColor("#334155")
        .text(productLabel(row), COLS.product + 5, rowY, { width: 165 })
        .text(CATEGORY_LABELS[row.category] ?? row.category, COLS.category, rowY, { width: 75 })
        .text(row.previousCount === null ? "–" : String(row.previousCount), COLS.previous, rowY)
        .text(row.soldSincePrevious === null ? "–" : String(row.soldSincePrevious), COLS.sold, rowY)
        .text(row.expectedStock === null ? "–" : String(row.expectedStock), COLS.expected, rowY)
        .text(String(row.count), COLS.counted, rowY);

      if (row.difference !== null && row.difference < 0) {
        drawWarningTriangle(doc, COLS.diff, rowY - 1);
        doc.fillColor("#dc2626").font("Helvetica-Bold").text(String(row.difference), COLS.diff + 11, rowY);
        doc.font("Helvetica");
      } else {
        const label = row.difference === null ? "–" : row.difference > 0 ? `+${row.difference}` : String(row.difference);
        doc.fillColor("#334155").text(label, COLS.diff, rowY);
      }

      y += 22;
      doc.moveTo(50, y).lineTo(545, y).strokeColor("#e2e8f0").stroke();
    }

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "Rot markierte Differenzen zeigen, dass weniger Ware physisch vorhanden war als nach Vorbestand und Verkäufen erwartet.",
        50,
        Math.min(y + 20, PDF_PAGE_BOTTOM + 40),
        { width: 495 }
      );

    doc.end();
  });
}
