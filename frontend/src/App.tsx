import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { AppRoutes } from "./routes";

// The background triangle pattern (body::after in index.css) grows taller
// by this fraction of the real scroll distance — noticeably slower than the
// foreground content scrolling past at 1:1, so it visibly expands upward
// rather than staying a fixed size or rigidly shifting position.
const GROWTH_FACTOR = 0.1;

function useBackgroundParallax() {
  useEffect(() => {
    // Setting one custom property per scroll event is cheap (no layout
    // read/write like getBoundingClientRect would force), so this skips the
    // usual rAF-throttling dance for scroll handlers — nothing here is
    // expensive enough to need it.
    const applyGrowth = () => {
      document.body.style.setProperty("--pattern-growth", `${window.scrollY * GROWTH_FACTOR}px`);
    };

    applyGrowth();
    window.addEventListener("scroll", applyGrowth, { passive: true });
    return () => window.removeEventListener("scroll", applyGrowth);
  }, []);
}

export function App() {
  useBackgroundParallax();

  return (
    <BrowserRouter>
      <CartProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </CartProvider>
    </BrowserRouter>
  );
}
