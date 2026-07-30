export function RejectionReasonBanner({ reason }: { reason: string }) {
  return (
    <div className="mt-2 inline-block w-fit rounded-md border-2 border-red-500 bg-red-50 px-3 py-2">
      <p className="text-sm font-bold text-red-700">Ablehnungsgrund: {reason}</p>
    </div>
  );
}
