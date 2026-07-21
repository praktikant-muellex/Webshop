import { Resend } from "resend";
import { Order, OrderItem, Product, User } from "@prisma/client";

type FullOrder = Order & {
  items: (OrderItem & { product: Product })[];
  user: User;
  decidedByUser: User | null;
};

function employeeLabel(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unbekannt";
}

/**
 * Best-effort side effect of order approval: emails the issuance receipt PDF
 * to whoever hands out the clothing (RECEIPT_TO_EMAIL). Employees have no
 * email address in this system (they log in with name + Personalnummer), so
 * there is no per-employee recipient to send to instead.
 */
export async function sendReceiptEmail(order: FullOrder, pdfBuffer: Buffer): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RECEIPT_TO_EMAIL;
  const from = process.env.RECEIPT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      "Beleg-E-Mail übersprungen: RESEND_API_KEY, RECEIPT_TO_EMAIL oder RECEIPT_FROM_EMAIL ist nicht gesetzt."
    );
    return;
  }

  const resend = new Resend(apiKey);
  const employeeName = employeeLabel(order.user);

  // The Resend SDK does not throw on API-level failures (invalid recipient,
  // unverified domain, etc.) — it resolves with { data: null, error }. Must
  // check `error` explicitly, otherwise a failed send looks identical to a
  // successful one to the caller's try/catch.
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `Freigegebene Bestellung – ${employeeName} (#${order.id.slice(0, 8)})`,
    text: `Die Bestellung von ${employeeName} wurde freigegeben. Beleg im Anhang.`,
    attachments: [
      {
        filename: `beleg-${order.id.slice(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(`Resend-Versand fehlgeschlagen: ${error.name} – ${error.message}`);
  }

  console.log(`Beleg-E-Mail verschickt (Resend-ID: ${data?.id}) an ${to}.`);
}
