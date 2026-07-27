/** Small inline loading indicator for a single data section (a table, a card) — not a full page. */
export function Spinner({ label = "Lade..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-200 border-t-secondary-600" />
      {label}
    </div>
  );
}
