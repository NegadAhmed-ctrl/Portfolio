"""Real-browser run of the main flow. Usage:
python tests/e2e_smoke.py [base_url]   (default: the live GitHub Pages URL)
Needs: pip install playwright; Chrome at /usr/bin/google-chrome.
"""
import json
import re
import sys
import urllib.request

from playwright.sync_api import sync_playwright, expect

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://negadahmed-ctrl.github.io/Portfolio/demos/real-estate/").rstrip("/") + "/"


def card_ids(page):
    return page.eval_on_selector_all("#grid .sheet", "els => els.map(e => e.dataset.id)")


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/google-chrome")
        ctx = browser.new_context(viewport={"width": 1366, "height": 900}, locale="ar-EG")
        page = ctx.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE)
        expect(page.locator("#count")).to_have_text("١٠ وحدات للبيع")
        assert len(card_ids(page)) == 10
        expect(page.locator(".hero-sheet svg")).to_be_visible()
        ld = json.loads(page.locator('script[type="application/ld+json"]').first.inner_text())
        assert ld[0]["@type"] == "RealEstateAgent" and len(ld[1]["itemListElement"]) == 16
        print("ok  list loads: 10 for sale, hero drawing, JSON-LD")

        # Hero quick search with a budget typed the way people type it.
        page.select_option("#quick-area", "smouha")
        page.fill("#quick-budget", "6.5 مليون")
        expect(page.locator("#quick-budget-read")).to_have_text("يعني ٦٬٥٠٠٬٠٠٠ ج.م")
        page.click("#quick button[type=submit]")
        expect(page.locator("#count")).to_have_text("وحدتين للبيع")
        assert sorted(card_ids(page)) == ["SM-0907", "SM-1201"], card_ids(page)
        assert "a=smouha" in page.url and "max=6500000" in page.url
        page.reload()
        expect(page.locator("#count")).to_have_text("وحدتين للبيع")
        print("ok  hero search: Smouha up to 6.5M -> 2 units, state survives reload")

        page.check("#filters input[name=bahari]")
        expect(page.locator("#count")).to_have_text("وحدة واحدة للبيع")
        assert card_ids(page) == ["SM-1201"]
        page.fill("#filters input[name=max]", "3 مليون")
        expect(page.locator("#empty")).to_be_visible()
        expect(page.locator("#relax")).to_contain_text("شيل الحد الأقصى للسعر")
        expect(page.locator("#request-message")).to_have_value(re.compile("للشراء في سموحة"))
        page.click("#relax")
        expect(page.locator("#count")).to_have_text("وحدة واحدة للبيع")
        print("ok  filters: bahari, empty state with a one-click fix, request form prefilled")

        page.click("#reset-filters")
        page.check('#filters input[name=purpose][value=rent]', force=True)
        page.check('#filters input[name=minRooms][value="3"]', force=True)
        expect(page.locator("#count")).to_have_text("وحدتين للإيجار")
        assert sorted(card_ids(page)) == ["KA-0302R", "SM-0402R"], card_ids(page)
        print("ok  rent + 3 rooms -> 2 units")

        page.click('.sheet[data-id="SM-0402R"] a')
        page.wait_for_url(re.compile(r"/units/SM-0402R/$"))
        expect(page.locator("h1")).to_have_text("شقة ٣ غرف للإيجار في سموحة")
        expect(page.locator("svg.plan")).to_be_visible()
        unit_ld = json.loads(page.locator('script[type="application/ld+json"]').inner_text())
        assert unit_ld["offers"]["price"] == 32000
        wa = page.locator(".contact-btns .btn-wa").get_attribute("href")
        assert wa.startswith("https://wa.me/201001234567?text=") and "SM-0402R" in urllib.request.unquote(wa)
        print("ok  unit page: title, plan, JSON-LD, WhatsApp link with the code")

        page.click("#viewing-form button[type=submit]")
        assert page.locator("#viewing-form .err").count() == 3
        page.check('#viewing-form input[name=when][value=tomorrow]', force=True)
        page.fill("#viewing-form input[name=name]", "مها عبد الرحمن")
        page.fill("#viewing-form input[name=phone]", "٠١٠٠١٢٣٤٥")
        page.click("#viewing-form button[type=submit]")
        expect(page.locator("#viewing-form .err")).to_have_count(1)
        page.fill("#viewing-form input[name=phone]", "٠١٠٠١٢٣٤٥٦٧")
        page.click("#viewing-form button[type=submit]")
        expect(page.locator(".slip")).to_contain_text("طلب المعاينة اتسجّل.")
        ref = page.locator(".slip-ref strong").inner_text()
        assert ref.startswith("ط-SM0402R-"), ref
        page.click(".slip-again")
        page.check('#viewing-form input[name=when][value=tomorrow]', force=True)
        page.fill("#viewing-form input[name=name]", "مها عبد الرحمن")
        page.fill("#viewing-form input[name=phone]", "01001234567")
        page.click("#viewing-form button[type=submit]")
        expect(page.locator(".slip")).to_contain_text("طلبك وصلنا قبل كده.")
        events = [e["name"] for e in page.evaluate("window.__loranEvents")]
        assert "view_unit" in events and "lead_submit" in events, events
        print("ok  viewing form: errors, Arabic digits, reference", ref, ", double submit caught, analytics events")

        page.goto(BASE)
        page.click("#inbox summary")
        expect(page.locator("#inbox-list li")).to_have_count(1)
        expect(page.locator("#inbox-list li").first).to_contain_text("SM-0402R")
        print("ok  demo inbox shows the lead")

        for path in ["sitemap.xml", "robots.txt", "drawings/LR-0412.svg"]:
            r = page.request.get(BASE + path)
            assert r.status == 200, (path, r.status)
        print("ok  sitemap, robots, drawings served")

        m = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mp = m.new_page()
        mp.on("pageerror", lambda e: errors.append(str(e)))
        for path in ["", "units/LR-0412/"]:
            mp.goto(BASE + path)
            mp.wait_for_timeout(600)
            sw = mp.evaluate("document.documentElement.scrollWidth")
            assert sw <= 390, (path, sw)
        print("ok  phone width: no horizontal scroll")
        browser.close()

    assert not errors, errors
    print("ok  0 console errors")


if __name__ == "__main__":
    main()
