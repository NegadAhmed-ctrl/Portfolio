/* Demo page: runs the real bot package (bot/*.py) in Pyodide and draws two
   Telegram-style chats (customer + owner) and the Google Sheet.
   DEMO ONLY: Telegram and Google Sheets are simulated in the browser. */
(function () {
  "use strict";

  const CUSTOMER = 101, ADMIN = 900;
  const NAMES = { [CUSTOMER]: "مريم حسن", [ADMIN]: "سامح فؤاد" };
  const DEMO_PHONE = "01012345678";
  // __init__.py is written directly: GitHub Pages (Jekyll) does not serve files starting with "_".
  const BOT_FILES = ["catalog.py", "domain.py", "storage.py", "sheets.py", "engine.py"];
  const STEPS = ["جديد", "اتستلم", "في الغسيل", "جاهز", "اتسلّم"];

  const $ = (s, el = document) => el.querySelector(s);
  const chats = { [CUSTOMER]: $("#phone-customer .chat"), [ADMIN]: $("#phone-admin .chat") };
  const kbd = $("#phone-customer .kbd");
  const input = $("#customer-input");
  const sendBtn = $("#phone-customer .send");
  const boot = $("#phone-customer .boot");
  const events = $("#events");
  const stage = $(".stage");
  let py = null, glue = null, busy = false, lastRows = new Map();

  // Cairo wall-clock time for the bot's slots (Egypt has DST, so use Intl).
  window.cairoNowIso = function () {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  };

  function clock() {
    return new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }).format(new Date());
  }

  function logEvent(html, cls) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${html}</span>`;
    if (cls) li.className = cls;
    events.appendChild(li);
    const box = events.closest(".log");
    box.scrollTop = box.scrollHeight; // scroll the panel, never the page
  }

  function flagTab(name) {
    if (stage.dataset.show === name) return;
    const dot = $(`.tabs [data-tab="${name}"] .dot`);
    if (dot) dot.hidden = false;
  }

  function scrollDown(chat) { chat.scrollTop = chat.scrollHeight; }

  function addBubble(chatId, text, who) {
    const chat = chats[chatId];
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    const t = document.createElement("time");
    t.textContent = clock();
    div.appendChild(t);
    chat.appendChild(div);
    scrollDown(chat);
    return div;
  }

  function ticket(chatId, o, isUpdate) {
    const chat = chats[chatId];
    const el = document.createElement("div");
    el.className = "ticket" + (o.status === "ملغي" ? " cancelled" : "");
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", `بون الطلب ${o.code}، الحالة ${o.status}`);
    const done = o.status === "ملغي" ? 0 : o.step + 1;
    el.innerHTML = `
      <div class="t-top"><span class="t-code"></span><span class="t-shop">مغسلة الندى</span></div>
      <div class="t-line t-what"></div>
      <div class="t-line t-when"></div>
      <div class="t-line t-total"></div>
      <div class="punches">${STEPS.map((s, i) =>
        `<span class="punch${i < done ? " done" : ""}${isUpdate && i === done - 1 ? " now" : ""}"><i></i>${s}</span>`).join("")}</div>`;
    $(".t-code", el).textContent = o.code;
    $(".t-what", el).textContent = `${o.service} · ${o.pieces} قطعة`;
    $(".t-when", el).textContent = `الاستلام: ${o.slot}`;
    $(".t-total", el).textContent = `الحساب: ${o.total} ج`;
    chat.appendChild(el);
    scrollDown(chat);
  }

  function inlineKeyboard(chatId, rows) {
    if (!rows.length) return;
    const chat = chats[chatId];
    const box = document.createElement("div");
    box.className = "ikb";
    rows.forEach((row) => {
      const r = document.createElement("div");
      r.className = "ikb-row";
      row.forEach((b) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = b.label;
        btn.dataset.data = b.data;
        btn.addEventListener("click", () => press(chatId, b, box));
        r.appendChild(btn);
      });
      box.appendChild(r);
    });
    chat.appendChild(box);
    scrollDown(chat);
  }

  function replyKeyboard(show) {
    kbd.innerHTML = "";
    kbd.hidden = !show;
    if (!show) return;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "ابعت رقمي";
    b.addEventListener("click", () => run(CUSTOMER, "contact", DEMO_PHONE, `رقمي: ${DEMO_PHONE}`));
    kbd.appendChild(b);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function deliver(replies) {
    for (const r of replies) {
      if (r.chat === CUSTOMER) replyKeyboard(r.askContact);
      const typing = document.createElement("div");
      typing.className = "typing";
      typing.textContent = "بيكتب…";
      chats[r.chat].appendChild(typing);
      scrollDown(chats[r.chat]);
      await wait(260);
      typing.remove();
      if (r.order && r.chat === CUSTOMER) {
        addBubble(r.chat, r.text, "bot");
        const update = !/اتسجل طلبك/.test(r.text);
        ticket(r.chat, r.order, update);
        if (update) logEvent(`العميل اتبعتله رسالة إن طلبه بقى «${r.order.status}»، والبون اتخرم خرم جديد.`);
      } else {
        addBubble(r.chat, r.text, "bot");
      }
      inlineKeyboard(r.chat, r.buttons);
      if (r.chat === ADMIN) {
        flagTab("admin");
        if (r.order && /^طلب جديد/.test(r.text)) logEvent(`وصل لصاحب المغسلة إشعار بالطلب <code>${r.order.code}</code> وعليه زرار الخطوة الجاية.`);
      }
    }
  }

  function refreshSheet() {
    const data = JSON.parse(glue.sheet());
    const thead = $(".sheet thead"), tbody = $(".sheet tbody");
    if (!thead.children.length) {
      const letters = data.headers.map((_, i) => `<th>${String.fromCharCode(65 + i)}</th>`).join("");
      thead.innerHTML = `<tr class="letters"><th class="rn"></th>${letters}</tr><tr><th class="rn">1</th>${data.headers.map((h) => `<th></th>`).join("")}</tr>`;
      thead.querySelectorAll("tr:last-child th:not(.rn)").forEach((th, i) => { th.textContent = data.headers[i]; });
    }
    const statusCol = data.headers.indexOf("الحالة");
    const addrCol = data.headers.indexOf("العنوان");
    const changed = [];
    tbody.innerHTML = "";
    data.rows.forEach((row, i) => {
      const tr = document.createElement("tr");
      const key = row[0], sig = row.join("|");
      if (lastRows.size && lastRows.get(key) !== sig) { tr.className = "fresh"; changed.push(row); }
      const rn = document.createElement("td");
      rn.className = "rn"; rn.textContent = i + 2;
      tr.appendChild(rn);
      row.forEach((cell, c) => {
        const td = document.createElement("td");
        td.textContent = cell.replace(/^'/, "");
        if (c === statusCol) { td.className = "st"; td.dataset.s = cell; }
        if (c === addrCol) td.classList.add("addr");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    lastRows = new Map(data.rows.map((r) => [r[0], r.join("|")]));
    changed.forEach((row) => {
      logEvent(`الشيت اتحدث: صف <code>${row[0]}</code> حالته «${row[statusCol]}».`);
      flagTab("sheet");
    });
  }

  async function run(chatId, kind, value, echo) {
    if (busy || !glue) return;
    busy = true;
    try {
      if (echo) addBubble(chatId, echo, "me");
      const name = NAMES[chatId];
      const raw = kind === "text" ? glue.text(chatId, name, value)
        : kind === "button" ? glue.button(chatId, name, value)
        : glue.contact(chatId, name, value);
      const replies = JSON.parse(raw);
      if (replies.some((r) => /متسجلش/.test(r.text))) {
        logEvent("الشيت مردّش، فالطلب <b>متسجلش</b>: العميل اتقاله يعيد التأكيد، والمالك وصله تنبيه. المسودة محفوظة.", "err");
      } else if (kind === "button" && value === "confirm:yes" && replies[0] && replies[0].order) {
        logEvent(`الكود راجع البيانات ولقى الميعاد لسه فاضي، وطلّع رقم طلب <code>${replies[0].order.code}</code> وحفظه.`);
      }
      await deliver(replies);
      refreshSheet();
    } catch (err) {
      console.warn(err);
      addBubble(chatId, "حصل خطأ في الديمو. اعمل ريفرش للصفحة.", "system");
    } finally {
      busy = false;
    }
  }

  function press(chatId, b, box) {
    if (busy) return;
    box.querySelectorAll("button").forEach((x) => { x.disabled = true; });
    run(chatId, "button", b.data, b.label);
  }

  // ---- composer + admin quick commands
  $("#phone-customer .composer").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    run(CUSTOMER, "text", v, v);
  });
  document.querySelectorAll("#phone-admin .chip").forEach((c) =>
    c.addEventListener("click", () => run(ADMIN, "text", c.dataset.cmd, c.dataset.cmd)));

  // ---- tabs (phone layout)
  stage.dataset.show = "customer";
  document.querySelectorAll(".tabs [role=tab]").forEach((t) => t.addEventListener("click", () => {
    stage.dataset.show = t.dataset.tab;
    document.querySelectorAll(".tabs [role=tab]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    const dot = $(".dot", t); if (dot) dot.hidden = true;
  }));

  // ---- scenario + outage + reset
  function lastButton(chatId, predicate) {
    // Newest keyboard that has a matching button, then its first match (e.g. the earliest slot).
    const boards = [...chats[chatId].querySelectorAll(".ikb")].reverse();
    for (const box of boards) {
      const hit = [...box.querySelectorAll("button:not(:disabled)")].find((b) => predicate(b.dataset.data));
      if (hit) return hit;
    }
    return null;
  }
  async function clickWhenFree(chatId, predicate) {
    while (busy) await wait(80);
    const b = lastButton(chatId, predicate);
    if (!b) throw new Error("button not found");
    b.click();
    await wait(120);
    while (busy) await wait(80);
    await wait(500);
  }
  async function typeWhenFree(text) {
    while (busy) await wait(80);
    for (const ch of text) { input.value += ch; await wait(18); }
    $("#phone-customer .composer").requestSubmit();
    await wait(120);
    while (busy) await wait(80);
    await wait(500);
  }

  $("#autoplay").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await typeWhenFree("/start");
      await clickWhenFree(CUSTOMER, (d) => d === "menu:new");
      await clickWhenFree(CUSTOMER, (d) => d === "svc:wash_iron");
      await clickWhenFree(CUSTOMER, (d) => d === "qty:8");
      await clickWhenFree(CUSTOMER, (d) => d.startsWith("slot:"));
      await typeWhenFree("14 شارع فوزي معاذ، سموحة، عمارة الصفا، الدور 3");
      while (busy) await wait(80);
      kbd.querySelector("button").click();
      await wait(120); while (busy) await wait(80); await wait(500);
      await clickWhenFree(CUSTOMER, (d) => d === "notes:skip");
      await clickWhenFree(CUSTOMER, (d) => d === "confirm:yes");
      await clickWhenFree(ADMIN, (d) => d.startsWith("adm:next:"));
    } catch (err) {
      console.warn("autoplay stopped:", err.message);
    } finally {
      btn.disabled = false;
    }
  });

  const outage = $("#outage");
  outage.addEventListener("click", () => {
    const on = outage.getAttribute("aria-pressed") !== "true";
    outage.setAttribute("aria-pressed", String(on));
    if (on) {
      glue.break_sheet();
      $("#sheet-state").textContent = "مش بيرد (الحفظ الجاي هيفشل)";
      $("#sheet-state").classList.add("down");
      logEvent("قطعنا الشيت: أول عملية حفظ هتفشل زي ما بيحصل لو جوجل مردّش.", "err");
    }
  });
  function sheetBack() {
    outage.setAttribute("aria-pressed", "false");
    $("#sheet-state").textContent = "متصل";
    $("#sheet-state").classList.remove("down");
  }

  $("#reset").addEventListener("click", () => location.reload());

  // ---- boot Pyodide with the real bot files
  async function start() {
    try {
      if (typeof loadPyodide !== "function") throw new Error("pyodide.js did not load");
      py = await loadPyodide();
      py.FS.mkdirTree("/home/pyodide/bot");
      py.FS.writeFile("/home/pyodide/bot/__init__.py", "");
      $(".boot-text").textContent = "بنحمّل ملفات البوت…";
      await Promise.all(BOT_FILES.map(async (f) => {
        const res = await fetch(`bot/${f}`);
        if (!res.ok) throw new Error(`bot/${f}: ${res.status}`);
        py.FS.writeFile(`/home/pyodide/bot/${f}`, await res.text());
      }));
      const g = await fetch("demo/glue.py");
      py.FS.writeFile("/home/pyodide/demo_glue.py", await g.text());
      py.runPython("import sys; sys.path.insert(0, '/home/pyodide')");
      glue = py.pyimport("demo_glue");
      boot.hidden = true;
      [input, sendBtn, $("#autoplay"), outage, $("#reset")].forEach((x) => { x.disabled = false; });
      refreshSheet();
      addBubble(CUSTOMER, "اكتب /start أو دوس «شغّل طلب كامل لوحده».", "system");
      addBubble(ADMIN, "هنا بتوصل الطلبات الجديدة لصاحب المغسلة.", "system");
      // When the simulated outage has been consumed, show the sheet as connected again.
      const origRefresh = refreshSheet;
      refreshSheet = function () { origRefresh(); if (!glue.store.fail_next) sheetBack(); };
    } catch (err) {
      console.warn(err);
      boot.classList.add("error");
      $(".boot-text").innerHTML = "مقدرناش نشغّل كود البوت في المتصفح. اتأكد من النت وجرّب تاني. ";
      const retry = document.createElement("button");
      retry.className = "btn btn-line"; retry.textContent = "جرّب تاني";
      retry.addEventListener("click", () => location.reload());
      boot.appendChild(retry);
    }
  }
  start();
})();
