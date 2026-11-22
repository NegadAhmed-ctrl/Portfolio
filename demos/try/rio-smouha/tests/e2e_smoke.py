"""End-to-end smoke test for the café menu (real browser, real UI).

Run:  pip install playwright && python -m playwright install chromium
      python tests/e2e_smoke.py [URL]      # default: the live GitHub Pages demo

Checks the two order paths a café owner cares about:
  1. Dine-in from a table QR (#table-7): table number pre-filled, WhatsApp message built.
  2. Delivery: empty form is blocked, Arabic-Indic phone digits accepted, delivery fee added.
Fails (exit 1) on any assertion or browser console error.
"""
import sys
import urllib.parse
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://negadahmed-ctrl.github.io/Portfolio/demos/cafe-menu/"


def wa_text(page):
    return urllib.parse.unquote(page.get_attribute("#waLink", "href"))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))

        # 1. Dine-in from a table QR
        page.goto(URL + "#table-7")
        page.wait_for_load_state("networkidle")
        page.evaluate("localStorage.clear()")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.locator("button:has-text('إضافة')").first.click()
        page.click("#openCart")
        assert page.input_value("#table") == "7", "table number not pre-filled from #table-7"
        page.click("#orderForm button[type=submit]")
        assert page.is_visible("#sentSheet"), "dine-in order did not reach the WhatsApp step"
        msg = wa_text(page)
        assert msg.startswith("https://wa.me/") and "ترابيزة رقم: 7" in msg, msg

        # cart survives a refresh
        page.reload()
        page.wait_for_load_state("networkidle")
        assert page.inner_text("#cartCount") == "1", "cart not restored after reload"

        # 2. Delivery
        page.click("[data-order-type=delivery]")
        page.click("#openCart")
        page.click("#orderForm button[type=submit]")
        invalid = page.eval_on_selector_all("#orderForm [aria-invalid=true]", "els => els.map(e => e.id)")
        assert {"name", "phone", "address"} <= set(invalid), f"empty delivery form not blocked: {invalid}"
        assert not page.is_visible("#sentSheet")

        page.fill("#name", "منة أحمد")
        page.fill("#phone", "٠١٠١٢٣٤٥٦٧٨")  # Arabic-Indic digits
        page.fill("#address", "سموحة، شارع النصر، عمارة 12")
        page.click("#orderForm button[type=submit]")
        assert not page.is_visible("#sentSheet"), "order below the delivery minimum was accepted"
        assert "أقل طلب للتوصيل" in page.inner_text("#orderForm"), "minimum-order message missing"

        # add two more items to pass the minimum, then the order goes through
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        adds = page.locator("button:has-text('إضافة')")
        adds.nth(0).click()
        adds.nth(0).click()
        page.click("#openCart")
        page.click("#orderForm button[type=submit]")
        assert page.is_visible("#sentSheet"), "valid delivery order did not reach the WhatsApp step"
        msg = wa_text(page)
        assert "01012345678" in msg and "التوصيل: 25" in msg, msg

        assert not errors, f"console errors: {errors}"
        browser.close()
    print("e2e smoke: all checks passed")


if __name__ == "__main__":
    main()
