"""Browser smoke test of the main flows.

Usage: python3 tests/e2e_smoke.py [BASE_URL]
Default BASE_URL is the live GitHub Pages demo. Needs `pip install playwright`
and Chrome at /usr/bin/google-chrome (or change EXE).
"""
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://negadahmed-ctrl.github.io/Portfolio/demos/admin-dashboard/"
EXE = "/usr/bin/google-chrome"
errors: list[str] = []


def step(msg):
    print("✓", msg)


def login(page, email, password="Demo@1234"):
    page.fill("#email", email)
    page.fill("#password", password)
    page.click("button[type=submit]")


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EXE)
    ctx = browser.new_context(viewport={"width": 1366, "height": 860}, locale="ar-EG")
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))

    # 1. protected route → login, and back after signing in
    page.goto(BASE + "#/inventory")
    expect(page.get_by_role("heading", name="تسجيل الدخول")).to_be_visible()
    login(page, "karim@elsayed.demo", "wrong-password")
    expect(page.get_by_role("alert")).to_have_text("الإيميل أو كلمة السر غلط")
    step("signed-out visitor is sent to login; wrong password gives one clear message")

    login(page, "karim@elsayed.demo")
    expect(page.get_by_role("heading", name="الأصناف")).to_be_visible()
    expect(page.get_by_role("link", name="فريق العمل")).to_have_count(0)
    expect(page.get_by_role("button", name="صنف جديد")).to_have_count(0)
    page.goto(BASE + "#/users")
    expect(page.get_by_text("الصفحة دي للمدير بس")).to_be_visible()
    step("staff lands on the page he asked for; no users page, no create button")

    # 2. staff issues stock from the bin card
    page.goto(BASE + "#/inventory")
    page.fill("input[type=search]", "خلاط كروم")
    expect(page.locator("tbody tr")).to_have_count(1)
    page.locator("tbody tr").first.click()
    dialog = page.get_by_role("dialog")
    expect(dialog.get_by_text("كارت الصنف")).to_be_visible()
    stock = int(dialog.locator("p.font-display").first.inner_text().translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")))
    dialog.locator("#mv-qty").fill(str(stock + 5))
    dialog.get_by_role("button", name="سجّل الصرف").click()
    expect(dialog.get_by_text(re.compile("الموجود"))).to_be_visible()
    expect(dialog.get_by_text("رقم فاتورة البيع").last).to_be_visible()
    dialog.locator("#mv-qty").fill("١")  # Arabic digit on purpose
    dialog.locator("#mv-ref").fill("فاتورة بيع 5001")
    dialog.get_by_role("button", name="سجّل الصرف").click()
    expect(page.get_by_text(re.compile("اتسجل صرف"))).to_be_visible()
    expect(dialog.get_by_text("تم الصرف")).to_be_visible()
    expect(dialog.locator("tbody tr").first).to_contain_text("فاتورة بيع 5001")
    expect(dialog.get_by_role("button", name="مسح")).to_have_count(0)
    page.keyboard.press("Escape")
    step("staff: over-stock issue refused, Arabic-digit quantity accepted, stamp + ledger row, no delete")

    # 3. admin
    page.get_by_role("button", name="خروج").first.click()
    login(page, "hesham@elsayed.demo")
    expect(page.get_by_role("heading", name="الأصناف")).to_be_visible()  # back where he signed out
    page.goto(BASE + "#/")
    expect(page.get_by_text("قايمة الطلب")).to_be_visible()
    expect(page.get_by_text("قيمة البضاعة على الرفوف (بسعر الشراء)")).to_be_visible()
    page.reload()
    expect(page.get_by_text("قايمة الطلب")).to_be_visible()
    step("admin overview with money figures; session survives a reload")

    page.goto(BASE + "#/inventory")
    page.get_by_role("radio", name="خلصت").click()
    expect(page.locator("tbody tr")).to_have_count(2)
    page.get_by_role("radio", name="الكل").click()
    expect(page.get_by_text(re.compile("١–٨ من"))).to_be_visible()
    page.get_by_role("button", name="٢", exact=True).click()
    expect(page.get_by_text(re.compile("٩–١٦ من"))).to_be_visible()
    step("filter by stock state + pagination")

    page.get_by_role("button", name="صنف جديد").click()
    form = page.get_by_role("dialog")
    form.get_by_role("button", name="أضف الصنف").click()
    expect(form.get_by_text("اسم الصنف لازم يكون 3 حروف على الأقل")).to_be_visible()
    form.locator("#pf-name").fill("منشار حديد يدوي")
    form.locator("#pf-sku").fill("f-03-1")
    form.locator("#pf-category").select_option("tools")
    form.locator("#pf-cost").fill("120")
    form.locator("#pf-price").fill("100")
    expect(form.get_by_text("سعر البيع أقل من سعر الشراء")).to_be_visible()
    form.locator("#pf-price").fill("165")
    form.locator("#pf-reorderAt").fill("2")
    form.locator("#pf-supplier").fill("المتحدة للخامات")
    form.locator("#pf-stock").fill("6")
    form.get_by_role("button", name="أضف الصنف").click()
    card = page.get_by_role("dialog")
    expect(card.get_by_role("heading", name="منشار حديد يدوي")).to_be_visible()
    card.get_by_role("button", name="مسح").click()
    card.get_by_role("button", name="أيوه امسح").click()
    expect(page.get_by_text("اتمسح منشار حديد يدوي")).to_be_visible()
    step("admin: create with live validation → bin card opens → delete")

    page.goto(BASE + "#/users")
    page.fill("#inv-name", "نورهان خالد")
    page.fill("#inv-email", "nourhan@elsayed.demo")
    page.get_by_role("button", name="ضيف", exact=True).click()
    expect(page.get_by_text("nourhan@elsayed.demo")).to_be_visible()
    page.get_by_label("صلاحية هشام السيد").select_option("staff")
    expect(page.get_by_text("لازم يفضل مدير واحد على الأقل شغال")).to_be_visible()
    step("users: invite, and the last admin can't be demoted")

    # 4. error state + phone layout
    page.goto(BASE.rstrip("/") + "/?demo-error#/inventory")
    expect(page.get_by_text("مش قادرين نجيب الأصناف")).to_be_visible()
    expect(page.get_by_role("button", name="حاول تاني")).to_be_visible()
    step("?demo-error shows the error state with a retry")

    phone = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    m = phone.new_page()
    m.on("console", lambda msg: msg.type == "error" and errors.append(msg.text))
    m.goto(BASE + "#/login")
    m.get_by_text("هشام السيد").click()
    m.click("button[type=submit]")
    expect(m.get_by_text("قايمة الطلب")).to_be_visible()
    for route in ["#/", "#/inventory", "#/users"]:
        m.goto(BASE + route)
        m.wait_for_timeout(700)
        overflow = m.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 0, f"horizontal scroll on {route}: {overflow}px"
    step("phone width: no horizontal scroll on any page")

    browser.close()

assert not errors, f"console errors: {errors}"
print("✓ 0 console errors\nALL PASSED")
