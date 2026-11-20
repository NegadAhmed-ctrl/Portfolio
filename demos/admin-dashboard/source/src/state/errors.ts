import { DomainError } from "../domain/inventory";

/** One place that turns any failure into a sentence the user can act on. */
export function errorText(e: unknown): string {
  if (e instanceof DomainError) {
    if (e.code === "network") return "مش قادرين نوصل للسيرفر. اتأكد من النت وجرب تاني.";
    return e.message;
  }
  return "حصلت مشكلة غير متوقعة. جرب تاني، ولو اتكررت بلغ المدير.";
}
