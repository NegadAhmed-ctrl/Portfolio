// Domain model. Nothing here knows about React, localStorage or Supabase.

export type Role = "admin" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  /** ISO date of the last sign-in, null if never. */
  lastSeenAt: string | null;
}

export type CategoryId = "mixers" | "pipes" | "fittings" | "heaters" | "sanitary" | "tools";

export interface Category {
  id: CategoryId;
  name: string;
}

export interface Product {
  id: string;
  /** Shelf code printed on the bin label, e.g. "B-03-2" = aisle B, rack 3, shelf 2. */
  sku: string;
  name: string;
  category: CategoryId;
  unit: string;
  /** Buying cost per unit in EGP (piastres avoided: whole pounds only). */
  cost: number;
  /** Selling price per unit in EGP. */
  price: number;
  stock: number;
  /** Re-order point: at or below this the item must be ordered again. */
  reorderAt: number;
  supplier: string;
  updatedAt: string;
}

export type MovementKind = "in" | "out" | "adjust";

export interface Movement {
  id: string;
  productId: string;
  kind: MovementKind;
  /** Always positive for in/out; for adjust it is the signed difference. */
  qty: number;
  /** Stock after the movement, so the item card reads like a paper bin card. */
  balance: number;
  /** Delivery note / invoice number or a short reason. */
  ref: string;
  byUserId: string;
  at: string;
}

export type StockState = "ok" | "low" | "out";

export type ProductDraft = Omit<Product, "id" | "updatedAt" | "stock"> & { stock?: number };
