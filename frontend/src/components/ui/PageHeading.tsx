import { ReactNode } from "react";

/** Matches the Markenleitfaden heading pattern: bold primary-colored title with a mint-green rule beneath. */
export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-primary-700">{children}</h1>
      <div className="mt-2 h-0.5 w-16 bg-secondary-500" />
    </div>
  );
}
