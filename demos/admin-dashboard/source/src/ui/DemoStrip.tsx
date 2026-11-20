import { useApp } from "../state/app";
import { useToast } from "./Toast";
import { LocalApi } from "../data/localApi";

/** Tells visitors this is a demo and lets them put the sample data back. */
export function DemoStrip() {
  const { api, changed } = useApp();
  const toast = useToast();
  if (api.mode !== "demo") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink-line bg-paper-deep/60 px-4 py-1.5 text-[12.5px] text-ink-2 md:px-8">
      <span>نسخة ديمو: محل وأسماء وأرقام وهمية، وأي تعديل بيتحفظ على جهازك بس.</span>
      <button
        className="underline decoration-ink-line underline-offset-4 hover:text-ink"
        onClick={() => {
          (api as LocalApi).reset();
          changed();
          toast("رجعنا بيانات الديمو الأصلية");
        }}
      >
        رجّع بيانات الديمو
      </button>
    </div>
  );
}
