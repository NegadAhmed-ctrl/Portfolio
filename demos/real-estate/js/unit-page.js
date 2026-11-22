import { CONFIG } from "./config.js";
import { findUnit } from "./units.js";
import { createLeadSink } from "./leads-store.js";
import { wireLeadForm } from "./lead-ui.js";
import { track } from "./analytics.js";

const unit = findUnit(document.body.dataset.unit);
const sink = createLeadSink(CONFIG);

if (unit) {
  track("view_unit", { id: unit.id, from: "page" });
  wireLeadForm(document.getElementById("viewing-form"), { sink, unit });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-track]");
  if (a) track(a.dataset.track, { id: unit?.id, from: "unit" });
});
