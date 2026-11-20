import type { Role } from "./types";

/**
 * Every action the UI can trigger. Pages and buttons ask `can(role, action)`
 * instead of checking roles directly, so changing who may do what is one table.
 * The same rules are enforced again in the data layer (and in Supabase RLS).
 */
export type Action =
  | "inventory.view"
  | "inventory.move" // receive / issue stock
  | "inventory.create"
  | "inventory.edit" // name, price, cost, re-order point
  | "inventory.delete"
  | "users.view"
  | "users.manage"
  | "reports.money"; // stock value, margins

const RULES: Record<Role, ReadonlySet<Action>> = {
  admin: new Set<Action>([
    "inventory.view",
    "inventory.move",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "users.view",
    "users.manage",
    "reports.money",
  ]),
  staff: new Set<Action>(["inventory.view", "inventory.move"]),
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return RULES[role].has(action);
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "مدير",
  staff: "أمين مخزن",
};
