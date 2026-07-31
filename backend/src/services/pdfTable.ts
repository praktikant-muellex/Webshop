import PDFKit from "pdfkit";

/** A4 with the app's standard 50pt margin: content past this y needs a new page. */
export const PDF_PAGE_BOTTOM = 780;

/**
 * If the next row would run past the page bottom, starts a fresh page and
 * redraws the table header there. Shared by every generated PDF that lays
 * out a paginated column table (order receipts, inventory sheets) so the
 * "when to start a new page" rule lives in one place instead of being
 * hand-copied per document.
 */
export function ensureRowSpace(
  doc: PDFKit.PDFDocument,
  y: number,
  drawHeader: (doc: PDFKit.PDFDocument, y: number) => number
): number {
  if (y > PDF_PAGE_BOTTOM) {
    doc.addPage();
    return drawHeader(doc, 50);
  }
  return y;
}
