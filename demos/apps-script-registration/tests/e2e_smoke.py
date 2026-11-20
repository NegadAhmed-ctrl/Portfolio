"""End-to-end smoke test of the live demo (real browser, real UI, real .gs code).

Run:  pip install playwright
      python tests/e2e_smoke.py [URL]      # default: the live GitHub Pages demo
      CHROME=/usr/bin/google-chrome python tests/e2e_smoke.py http://localhost:8080/demos/apps-script-registration/

Checks what a center owner cares about:
  1. New student → row "مؤكد" with a code, confirmation email in the outbox (and its HTML opens).
  2. Same student again, typed differently → "مكرر", no second email.
  3. Bad phone/email/grade → "بيانات غير صحيحة" with the reasons, no email.
  4. Full group → "قائمة انتظار" + waitlist email.
  5. Email quota reached → registration kept, email pending, logged; retry sends it.
  6. Weekly report email opens with the right numbers.
Fails (exit 1) on any assertion or browser console error.
"""
import os
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://negadahmed-ctrl.github.io/Portfolio/demos/apps-script-registration/"
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")


def last_row(page):
    return page.eval_on_selector_all("#sheet tbody tr", "trs => trs[trs.length-1].innerText")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))

        page.goto(URL)
        page.wait_for_selector("body[data-ready='1']", timeout=15000)
        seeded = page.locator("#sheet tbody tr").count()
        assert seeded == 21, f"expected header + 20 seeded rows, got {seeded}"
        assert page.inner_text("#mailCount") == "0"

        # 1. new student
        page.click("[data-scenario=new]")
        page.click("#submitBtn")
        row = last_row(page)
        assert "مؤكد" in row and "MN-0021" in row, row
        assert page.inner_text("#mailCount") == "1"
        page.click("#outbox .mail")
        frame = page.frame_locator("#mailFrame")
        assert "تم تأكيد التسجيل" in frame.locator("body").inner_text()
        page.click("#mailClose")

        # 2. duplicate
        page.click("[data-scenario=dup]")
        page.click("#submitBtn")
        row = last_row(page)
        assert "مكرر" in row and "MN-0001" in row, row
        assert page.inner_text("#mailCount") == "1", "duplicate must not get an email"

        # 3. invalid
        page.click("[data-scenario=bad]")
        page.click("#submitBtn")
        row = last_row(page)
        assert "بيانات غير صحيحة" in row and "رقم الموبايل" in row and "الإيميل مش صحيح" in row, row
        assert page.inner_text("#mailCount") == "1"
        page.wait_for_selector("#flow [data-step=validate].fail", timeout=3000)

        # 4. full group → waitlist #2
        page.click("[data-scenario=full]")
        page.click("#submitBtn")
        row = last_row(page)
        assert "قائمة انتظار" in row, row
        assert page.inner_text("#mailCount") == "2"
        page.click("#outbox .mail >> nth=0")
        assert "رقم 2 في قائمة الانتظار" in page.frame_locator("#mailFrame").locator("body").inner_text()
        page.click("#mailClose")

        # 5. quota reached, then retry
        page.check("#quotaOff")
        page.click("[data-scenario=new]")
        page.click("#submitBtn")
        row = last_row(page)
        assert "مؤكد" in row and "الحد اليومي" in row, row
        assert page.inner_text("#mailCount") == "2"
        assert page.inner_text("#errCount") == "1"
        page.uncheck("#quotaOff")
        page.click("#retry")
        assert page.inner_text("#mailCount") == "3"
        page.click("#tab-errors")
        assert "sendRegistrationEmail_" in page.inner_text("#sheet")
        page.click("#tab-responses")

        # 6. weekly report
        page.click("#runReport")
        body = page.frame_locator("#mailFrame").locator("body").inner_text()
        assert "تقرير التسجيل الأسبوعي" in body and "كيمياء" in body, body[:300]
        assert "كاملة وفيها 2 في الانتظار" in body, body
        page.click("#mailClose")

        # mobile layout: no horizontal page scroll
        page.set_viewport_size({"width": 390, "height": 844})
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 0, f"horizontal scroll on mobile: {overflow}px"

        browser.close()
        assert not errors, f"console errors: {errors}"
        print("e2e OK:", URL)


if __name__ == "__main__":
    main()
