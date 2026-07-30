const RING_SIZE = {
  sm: "h-4 w-4 border-2",
  lg: "h-8 w-8 border-4",
};

/** The bare spinning ring, shared by Spinner (inline, with a label) and LoadingScreen (full-page). */
export function SpinnerRing({ size = "sm" }: { size?: keyof typeof RING_SIZE }) {
  return <div className={`animate-spin rounded-full border-secondary-200 border-t-secondary-600 ${RING_SIZE[size]}`} />;
}

/** Small inline loading indicator for a single data section (a table, a card) — not a full page. */
export function Spinner({ label = "Lade...", size = "sm" }: { label?: string; size?: keyof typeof RING_SIZE }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
      <SpinnerRing size={size} />
      {label}
    </div>
  );
}
