import type { InventoryQuery, Page } from "../domain/inventory";
import type { Category, Movement, MovementKind, Product, ProductDraft, Role, User } from "../domain/types";

export interface Session {
  user: User;
}

export interface MovementInput {
  productId: string;
  kind: MovementKind;
  qty: number;
  ref: string;
}

/**
 * The only thing the UI talks to. `LocalApi` implements it in the browser for
 * the demo; `SupabaseApi` implements it against a real Postgres + Auth.
 * Every method can reject with a `DomainError` whose `code` the UI maps to text.
 */
export interface AdminApi {
  readonly mode: "demo" | "supabase";

  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  currentSession(): Promise<Session | null>;

  categories(): Promise<Category[]>;
  queryProducts(q: InventoryQuery): Promise<Page<Product>>;
  allProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  createProduct(draft: ProductDraft): Promise<Product>;
  updateProduct(id: string, patch: Partial<ProductDraft>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  recordMovement(input: MovementInput): Promise<{ product: Product; movement: Movement }>;
  movements(opts?: { productId?: string; limit?: number; sinceDays?: number }): Promise<Movement[]>;

  users(): Promise<User[]>;
  inviteUser(input: { name: string; email: string; role: Role }): Promise<User>;
  updateUser(id: string, patch: { role?: Role; active?: boolean }): Promise<User>;
}
