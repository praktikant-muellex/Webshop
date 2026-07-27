import { useEffect, useState } from "react";

/**
 * Render's free-tier backend spins down after inactivity, so the very first
 * request after a while can take up to ~30-60s to come back — without this,
 * that window just looks like a blank "Lade..." with no explanation, which
 * reads as broken rather than slow.
 */
export function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <img src="/logo-full.png" alt="müllex" className="mb-6 h-14 w-auto" />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary-200 border-t-secondary-600" />
      <p className="mt-4 max-w-xs text-sm text-slate-500">
        {slow
          ? "Der Server war eine Weile inaktiv und startet gerade neu – das kann bis zu einer Minute dauern."
          : "Lade..."}
      </p>
    </div>
  );
}
