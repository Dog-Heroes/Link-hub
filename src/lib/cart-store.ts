"use client";

/**
 * Carrello della tab Shop: vive nel browser del visitatore (localStorage),
 * fuori dal componente, così sopravvive al cambio di tab (TabBar smonta la
 * tab non attiva) e al ricaricamento della pagina. Shopify lo vede solo al
 * momento del checkout, tramite il link-carrello (vedi cartPermalink).
 */

import { useSyncExternalStore } from "react";
import type { ShopProduct } from "./shop";

export interface CartLine {
  variantId: string;
  handle: string;
  title: string;
  variantLabel: string;
  image: string | null;
  /** Prezzo unitario in centesimi. */
  price: number;
  quantity: number;
}

const STORAGE_KEY = "dh-hub-cart-v1";
/** Un carrello lasciato lì da più di 3 giorni riparte vuoto. */
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_QUANTITY = 20;

const EMPTY: CartLine[] = [];
let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function isLine(value: unknown): value is CartLine {
  const l = value as CartLine;
  return (
    typeof l?.variantId === "string" &&
    typeof l.title === "string" &&
    typeof l.price === "number" &&
    Number.isInteger(l.quantity) &&
    l.quantity > 0
  );
}

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved?.lines) || Date.now() - Number(saved.savedAt) > MAX_AGE_MS) return EMPTY;
    return saved.lines.filter(isLine);
  } catch {
    return EMPTY;
  }
}

function commit(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), lines: next }));
  } catch {
    // Storage non disponibile (navigazione privata, in-app browser): il
    // carrello funziona lo stesso finché la pagina resta aperta.
  }
  listeners.forEach((listener) => listener());
}

function getSnapshot(): CartLine[] {
  if (lines === null) lines = load();
  return lines;
}

function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addToCart(line: Omit<CartLine, "quantity">) {
  const current = getSnapshot();
  const existing = current.find((l) => l.variantId === line.variantId);
  if (existing) {
    setQuantity(line.variantId, existing.quantity + 1);
  } else {
    commit([...current, { ...line, quantity: 1 }]);
  }
}

/** Quantità <= 0 toglie la riga. */
export function setQuantity(variantId: string, quantity: number) {
  const qty = Math.min(Math.floor(quantity), MAX_QUANTITY);
  const current = getSnapshot();
  commit(
    qty <= 0
      ? current.filter((l) => l.variantId !== variantId)
      : current.map((l) => (l.variantId === variantId ? { ...l, quantity: qty } : l))
  );
}

export function clearCart() {
  commit(EMPTY);
}

/**
 * Allinea il carrello salvato al catalogo appena letto dal sito: aggiorna i
 * prezzi e toglie le varianti che non sono più acquistabili (esaurite o
 * tolte dallo shop), così il checkout non riceve righe che fallirebbero.
 */
export function syncWithCatalog(products: ShopProduct[]) {
  const current = getSnapshot();
  if (current.length === 0) return;
  const priceById = new Map<string, number>();
  for (const p of products) for (const v of p.variants) priceById.set(v.id, v.price);

  const next = current
    .filter((l) => priceById.has(l.variantId))
    .map((l) => ({ ...l, price: priceById.get(l.variantId)! }));
  const changed =
    next.length !== current.length || next.some((l, i) => l.price !== current[i].price);
  if (changed) commit(next);
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
}
