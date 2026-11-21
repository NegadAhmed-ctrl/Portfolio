"""End-to-end check of the live demo page in a real browser.

Run:  python tests/e2e_demo.py [URL] [--chrome /usr/bin/google-chrome]
(default URL: the live GitHub Pages demo). Needs internet for Pyodide.

1. Python boots in the page and the seeded sheet has 3 orders.
2. Autoplay: full customer order → ticket, admin notification, new sheet row,
   admin presses "استلمنا الهدوم" → row status changes, customer is told.
3. Wrong phone number → validation message, contact button shown.
4. Sheet outage → order NOT saved, customer + owner warned → retry saves it.
5. Admin /today works; non-admin can't see admin output.
6. Phone width has no horizontal scroll. 0 console errors.
"""
import sys

from playwright.sync_api import expect, sync_playwright

args = sys.argv[1:]
CHROME = None
if "--chrome" in args:
    i = args.index("--chrome")
    CHROME = args[i + 1]
    del args[i:i + 2]
URL = args[0] if args else "https://negadahmed-ctrl.github.io/Portfolio/demos/telegram-bot/"


def rows(page):
    return page.locator(".sheet tbody tr").count()


def wait_idle(page):
    page.wait_for_function("document.querySelectorAll('.typing').length === 0")
    page.wait_for_timeout(350)


def say(page, text):
    page.fill("#customer-input", text)
    page.press("#customer-input", "Enter")
    wait_idle(page)


def tap(page, chat, label):
    page.locator(f"{chat} .ikb button:not(:disabled)", has_text=label).last.click()
    wait_idle(page)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.goto(URL)
        page.wait_for_selector("#phone-customer .boot[hidden]", state="attached", timeout=120_000)
        assert rows(page) == 3, "seeded sheet"

        # 2. autoplay = the whole happy path
        page.click("#autoplay")
        page.wait_for_function("!document.querySelector('#autoplay').disabled", timeout=60_000)
        assert rows(page) == 4
        expect(page.locator("#phone-customer .ticket").first).to_contain_text("ND-")
        expect(page.locator("#phone-admin .chat")).to_contain_text("طلب جديد")
        expect(page.locator(".sheet tbody tr").last).to_contain_text("اتستلم من العميل")
        expect(page.locator("#phone-customer .chat")).to_contain_text("استلمنا هدومك")
        expect(page.locator("#events li")).to_have_count(5)

        # 3. validation
        say(page, "/new")
        tap(page, "#phone-customer", "كي بس")
        say(page, "٥")
        page.locator("#phone-customer .ikb").last.locator("button").first.click()  # earliest slot
        wait_idle(page)
        say(page, "شارع النصر، عمارة 5، الدور الأول")
        say(page, "12345")
        expect(page.locator("#phone-customer .chat .msg.bot").last).to_contain_text("مش رقم موبايل")
        expect(page.locator("#phone-customer .kbd button")).to_have_text("ابعت رقمي")
        say(page, "+20 112 345 6789")
        tap(page, "#phone-customer", "مفيش ملاحظات")
        expect(page.locator("#phone-customer .chat .msg.bot").last).to_contain_text("01123456789")

        # 4. outage on confirm → not saved → retry
        page.click("#outage")
        expect(page.locator("#sheet-state")).to_have_class("sheet-state down")
        tap(page, "#phone-customer", "تأكيد الطلب")
        assert rows(page) == 4, "nothing saved during the outage"
        expect(page.locator("#phone-customer .chat")).to_contain_text("متسجلش")
        expect(page.locator("#phone-admin .chat")).to_contain_text("الشيت مش بيرد")
        expect(page.locator("#sheet-state")).to_have_text("متصل")
        tap(page, "#phone-customer", "تأكيد الطلب")
        assert rows(page) == 5, "retry saved the order"

        # 5. admin commands
        page.click("#phone-admin .chip[data-cmd='/today']")
        wait_idle(page)
        expect(page.locator("#phone-admin .chat .msg.bot").last).to_contain_text("استلامات")
        say(page, "/stats")
        expect(page.locator("#phone-customer .chat .msg.bot").last).to_contain_text("لإدارة المغسلة بس")

        # 6. phone layout
        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto(URL)
        mobile.wait_for_selector("#phone-customer .boot[hidden]", state="attached", timeout=120_000)
        assert mobile.evaluate("document.documentElement.scrollWidth") <= 390, "horizontal scroll on phone"
        mobile.click(".tabs [data-tab='sheet']")
        expect(mobile.locator(".sheet")).to_be_visible()

        browser.close()
        assert not errors, f"console errors: {errors}"
        print("OK: boot, full order + admin update, validation, sheet outage + retry, admin-only commands, "
              "mobile tabs. 0 console errors.")


if __name__ == "__main__":
    main()
