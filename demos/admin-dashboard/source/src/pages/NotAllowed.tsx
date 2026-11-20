import { Link } from "react-router-dom";
import { Notice } from "../ui/kit";

export function NotAllowed() {
  return (
    <Notice
      title="الصفحة دي للمدير بس"
      body="حسابك أمين مخزن: تقدر تشوف الأصناف وتسجل صرف واستلام. لو محتاج صلاحية زيادة اطلبها من المدير."
      action={<Link to="/inventory" className="text-[14px] underline underline-offset-4">روح للأصناف</Link>}
    />
  );
}

export function NotFound() {
  return <Notice title="الصفحة دي مش موجودة" body="ممكن الرابط اتغير." action={<Link to="/" className="text-[14px] underline underline-offset-4">ارجع للرئيسية</Link>} />;
}
