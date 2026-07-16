import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Product } from "../api/types";

export interface CartLine {
  product: Product;
  sizeLabel: string | null;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addLine: (product: Product, sizeLabel: string | null) => void;
  removeLine: (index: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "arbeitskleidung-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addLine = (product: Product, sizeLabel: string | null) => {
    setLines((prev) => [...prev, { product, sizeLabel, quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const clear = () => setLines([]);

  return (
    <CartContext.Provider value={{ lines, addLine, removeLine, clear }}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart muss innerhalb von CartProvider verwendet werden.");
  return ctx;
}
