// text-base (16px), not text-sm (14px): iOS Safari auto-zooms in on any
// input/select/textarea with a computed font-size under 16px when it gains
// focus, and — since this is an SPA where "logging in" is a client-side
// navigation rather than a full page load — never zooms back out again on
// its own afterwards, leaving the whole app zoomed in until the user
// manually pinches back out.
export const inputClass =
  "block w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 " +
  "placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

export const selectClass = inputClass + " bg-white";

export const labelClass = "block text-sm font-medium text-slate-700 mb-1";
