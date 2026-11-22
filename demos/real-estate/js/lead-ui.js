// Lead form behaviour shared by the list page (general request) and unit pages (viewing request).
import { CONFIG } from "./config.js";
import { validateLead, buildWhatsAppText, whatsappUrl, VIEWING_TIMES, CONTACT_WAYS } from "./lead.js";
import { areaName, typeName, findUnit } from "./units.js";
import { esc } from "./render.js";
import { track } from "./analytics.js";

let toastTimer;
export function toast(text) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

function showErrors(form, errors) {
  form.querySelectorAll(".err").forEach((e) => e.remove());
  form.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name];
    const host = input?.closest?.(".field, fieldset") ?? (input?.[0]?.closest?.("fieldset"));
    if (!host) continue;
    const id = `${form.id}-${name}-err`;
    host.insertAdjacentHTML("beforeend", `<span class="err" id="${id}">${esc(msg)}</span>`);
    const target = input.length && !input.tagName ? input[0] : input;
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-describedby", id);
    first ||= target;
  }
  first?.focus();
}

function slipHtml(lead, res, unit) {
  const wa = unit
    ? whatsappUrl(CONFIG.whatsapp, buildWhatsAppText(unit, { areaName, typeName, lead, url: location.href.split("?")[0] }))
    : whatsappUrl(CONFIG.whatsapp, `السلام عليكم، سبت طلب على الموقع رقم ${res.reference}\n${lead.message}`);
  return `<div class="slip" role="status" tabindex="-1">
    <p class="slip-ref"><span>رقم الطلب</span><strong dir="ltr">${esc(res.reference)}</strong></p>
    <p class="slip-title">${res.duplicate ? "طلبك وصلنا قبل كده." : unit ? "طلب المعاينة اتسجّل." : "طلبك اتسجّل."}</p>
    <p class="slip-text">${
      res.duplicate
        ? "مش محتاج تبعته تاني. هنكلمك على نفس الرقم."
        : `هنكلمك ${lead.contact === "call" ? "بمكالمة" : "على واتساب"} على <span dir="ltr">${esc(lead.phone)}</span>${
            lead.when ? ` عشان نأكد ميعاد المعاينة (${esc(VIEWING_TIMES[lead.when])})` : ""
          }. لو مستعجل ابعتلنا رقم الطلب على واتساب.`
    }</p>
    <div class="slip-actions">
      <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener" data-track="whatsapp_click">ابعت رقم الطلب على واتساب</a>
      <button type="button" class="btn-link slip-again">طلب تاني</button>
    </div>
  </div>`;
}

export function wireLeadForm(form, { sink, unit, onSaved }) {
  const submit = form.querySelector('button[type="submit"]');
  const original = submit.textContent;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const result = validateLead({
      name: fd.get("name"),
      phone: fd.get("phone"),
      contact: fd.get("contact"),
      when: fd.get("when"),
      message: fd.get("message"),
      website: fd.get("website"),
      unitId: unit?.id ?? null,
      needsWhen: Boolean(form.querySelector('[name="when"]')),
    });
    if (result.spam) return;
    if (!result.ok) {
      showErrors(form, result.errors);
      return;
    }
    showErrors(form, {});
    submit.disabled = true;
    submit.textContent = "بنسجّل طلبك…";
    const res = await sink.submit(result.value);
    submit.disabled = false;
    submit.textContent = original;
    if (!res.ok) {
      form.insertAdjacentHTML(
        "beforeend",
        `<span class="err err-form">الطلب موصلش (${esc(res.error)}). جرّب تاني، أو كلمنا على ${esc(CONFIG.phoneDisplay)}.</span>`,
      );
      return;
    }
    track("lead_submit", { unit: unit?.id ?? null, kind: form.dataset.kind, duplicate: Boolean(res.duplicate) });
    form.hidden = true;
    form.insertAdjacentHTML("afterend", slipHtml(result.value, res, unit));
    const slip = form.nextElementSibling;
    slip.focus();
    slip.querySelector(".slip-again").addEventListener("click", () => {
      slip.remove();
      form.reset();
      form.hidden = false;
      form.querySelector("input")?.focus();
    });
    onSaved?.(res);
  });
  // Clear an error as soon as the field is fixed.
  form.addEventListener("input", (e) => {
    const host = e.target.closest(".field, fieldset");
    host?.querySelector(".err")?.remove();
    e.target.removeAttribute("aria-invalid");
  });
}

export async function renderInbox(sink) {
  const list = document.getElementById("inbox-list");
  if (!list) return;
  const leads = await sink.list();
  document.getElementById("inbox-count").textContent = leads.length ? `(${new Intl.NumberFormat("ar-EG").format(leads.length)})` : "";
  list.innerHTML = leads.length
    ? leads
        .map((l) => {
          const u = l.unitId ? findUnit(l.unitId) : null;
          const t = new Date(l.at).toLocaleString("ar-EG", { weekday: "long", hour: "numeric", minute: "2-digit" });
          return `<li><p><strong>${esc(l.name)}</strong> <span dir="ltr">${esc(l.phone)}</span> · ${esc(CONTACT_WAYS[l.contact])}</p>
            <p>${u ? `معاينة <span class="code">${esc(u.id)}</span>${l.when ? `، ${esc(VIEWING_TIMES[l.when])}` : ""}` : "طلب عام"}${l.message ? `: ${esc(l.message)}` : ""}</p>
            <p class="inbox-meta"><span dir="ltr">${esc(l.reference)}</span> · ${esc(t)}</p></li>`;
        })
        .join("")
    : `<li class="inbox-empty">لسه مفيش طلبات. جرّب تسيب طلب من الفورم أو من صفحة أي وحدة.</li>`;
}
