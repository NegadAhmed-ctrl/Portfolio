"""End-to-end check of the dashboard in a real Chrome.

    python tests/e2e_dashboard.py [URL]     (default: the live GitHub Pages URL)
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "https://negadahmed-ctrl.github.io/Portfolio/demos/sales-dashboard/"
CHROME = "/usr/bin/google-chrome"
ROOT = Path(__file__).resolve().parent.parent


def expected_net() -> str:
    data = json.loads((ROOT / "data" / "web" / "sales.json").read_text(encoding="utf-8"))
    net = sum(t[4] - t[5] for t in data["tickets"])
    return f"{net:,}"


def main() -> None:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME)
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_selector("#report:not([hidden])")

        # 1. whole year, all branches
        first = page.locator(".total .figure").first.inner_text()
        assert expected_net() in first.replace("\n", ""), first
        assert "مفيش فترة قبلها" in page.locator("#scope").inner_text()
        assert page.locator("#noteList .note").count() == 6
        print("year totals OK:", first.split("\n")[0])

        # 2. branch tab + Ramadan preset -> comparison with the previous 2 months
        page.click("#branchTabs button:has-text('سموحة')")
        page.click("#presets button:has-text('رمضان والعيد')")
        scope = page.locator("#scope").inner_text()
        assert "فرع سموحة" in scope and "فبراير" in scope and "مارس 2026" in scope, scope
        vs = page.locator(".total .vs").first.inner_text()
        assert vs.startswith("+") and "ديسمبر 2025" in vs, vs
        assert "يوم بيوم" in page.locator("#trendTitle").inner_text()
        assert "b=0" in page.url and "p=2026-02_2026-03" in page.url
        print("branch + Ramadan OK:", vs)

        # 3. the filtered view survives a reload (shareable link)
        page.reload()
        page.wait_for_selector("#report:not([hidden])")
        assert page.locator("#branchTabs button[aria-pressed=true]").inner_text().strip() == "سموحة"
        print("hash state survives reload OK")

        # 4. channels: none -> empty state with a way back
        for lbl in page.locator("#channels label.check").all():
            lbl.click()
        assert "اختار قناة واحدة على الأقل" in page.locator("#totals").inner_text()
        page.click("#allCh")
        assert page.locator("#channels input:checked").count() == 3
        print("empty state + restore OK")

        # 5. category click filters the product ledger; Black Forest drops after July
        page.click("#branchTabs button:has-text('الكل')")
        page.select_option("#from", label="يوليو 2026")
        page.select_option("#to", label="أكتوبر 2026")
        page.click("#cats [data-cat='1']")
        rows = page.locator("#products tbody tr")
        assert rows.count() == 5, rows.count()
        bf = page.locator("#products tbody tr:has-text('بلاك فورست') td.num").nth(3).inner_text()
        assert bf.startswith("−"), bf
        page.click("#clearCat")
        assert page.locator("#products tbody tr").count() == 20
        print("category filter + Black Forest drop OK:", bf)

        # 6. cleaning page
        page.click("#tab-clean")
        page.click("#runClean")
        page.wait_for_function("document.getElementById('cleanStatus').textContent.includes('اتصلّحوا')", timeout=8000)
        assert page.locator("#rawRows tr.cleaned").count() == page.locator("#rawRows tbody tr").count()
        print("cleaning OK:", page.locator("#cleanStatus").inner_text())

        # 7. excel page + downloads exist
        page.click("#tab-excel")
        for href in page.locator(".downloads a").evaluate_all("els => els.map(e => e.href)"):
            with urllib.request.urlopen(urllib.request.Request(href, method="HEAD")) as r:
                assert r.status == 200, href
        assert page.locator(".sheet-shot img").evaluate("i => i.complete && i.naturalWidth > 0")
        print("excel page + downloads OK")

        # 8. phone width: no horizontal page scroll
        mob = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
        mob.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        mob.goto(URL)
        mob.wait_for_selector("#report:not([hidden])")
        over = mob.evaluate("document.documentElement.scrollWidth - innerWidth")
        assert over <= 0, f"horizontal scroll {over}px"
        print("phone width OK")
        browser.close()

    assert not errors, errors
    print("0 console errors. ALL OK")


if __name__ == "__main__":
    main()
