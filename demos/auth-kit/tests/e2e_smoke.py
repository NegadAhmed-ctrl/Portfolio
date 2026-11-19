"""End-to-end smoke test for the Flutter Auth Kit web demo (real browser, real UI).

Run:  pip install playwright && python -m playwright install chromium
      python tests/e2e_smoke.py [URL] [--chrome /usr/bin/google-chrome]
      (default URL: the live GitHub Pages demo)

Flutter web paints on a canvas; the app turns on its semantics tree, so the
test drives it through roles and labels, like a screen reader would.

Covers every flow a client asks for:
  1. Login: empty submit blocked, wrong password error, demo account works.
  2. Session persistence: reload the page, still signed in. Sign out.
  3. Register → email verification with the 6-digit code (demo inbox) → home.
  4. Forgot password → reset code → new password → sign in with it.
  5. Arabic (RTL) + dark theme switch.
Fails (exit 1) on any assertion or browser console error.
"""
import re
import sys
import time

from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:]]
CHROME = None
if "--chrome" in args:
    i = args.index("--chrome")
    CHROME = args[i + 1]
    del args[i : i + 2]
URL = args[0] if args else "https://negadahmed-ctrl.github.io/Portfolio/demos/auth-kit/"
TIMEOUT = 20_000


def type_into(page, label, text, verify=True):
    box = page.get_by_role("textbox", name=label, exact=True)
    for _ in range(3):
        box.click()
        page.wait_for_timeout(200)  # let Flutter attach its editing element
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")
        page.keyboard.type(text, delay=25)
        page.wait_for_timeout(150)
        # The code field auto-submits at 6 digits, so it may already be cleared.
        if not verify or box.input_value() == text:
            return
    raise AssertionError(f"could not type into {label!r}")


def click(page, name):
    page.get_by_role("button", name=name, exact=True).click()


def screen_text(page):
    """Everything the accessibility tree exposes (Flutter merges labels into groups)."""
    return page.locator("body").aria_snapshot()


def wait_text(page, text):
    deadline = time.time() + TIMEOUT / 1000
    while time.time() < deadline:
        if text in screen_text(page):
            return
        time.sleep(0.25)
    raise AssertionError(f"not on screen: {text!r}\n{screen_text(page)[:1500]}")


def demo_code(page):
    """Reads the 6-digit code from the on-screen demo inbox."""
    wait_text(page, "Demo inbox")
    deadline = time.time() + 10
    while time.time() < deadline:
        found = re.findall(r"\b\d{6}\b", screen_text(page))
        if found:
            return found[-1]
        time.sleep(0.3)
    raise AssertionError("no code in the demo inbox:\n" + screen_text(page)[:2000])


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900}, locale="en-US")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))

        page.goto(URL)
        page.evaluate("localStorage.clear()")
        page.reload()
        wait_text(page, "Welcome back")

        # 1. Login
        click(page, "Sign in")
        wait_text(page, "Enter your email.")
        type_into(page, "Email", "demo@negadbuilds.dev")
        type_into(page, "Password", "wrong-password")
        click(page, "Sign in")
        wait_text(page, "Email or password is incorrect.")
        click(page, "Fill the demo account")
        click(page, "Sign in")
        wait_text(page, "Hi, Sara Ahmed")

        # 2. Session survives a reload
        page.reload()
        wait_text(page, "Hi, Sara Ahmed")
        click(page, "Sign out")
        wait_text(page, "Welcome back")

        # 3. Register + verify email
        email = f"omar{int(time.time())}@mail.com"
        click(page, "Create an account")
        wait_text(page, "Create your account")
        type_into(page, "Full name", "Omar Ali")
        type_into(page, "Email", email)
        type_into(page, "Password", "Abcdefg1")
        type_into(page, "Confirm password", "Abcdefg1")
        click(page, "Create account")
        wait_text(page, "Verify your email")
        code = demo_code(page)
        wrong = "111111" if code != "111111" else "222222"
        type_into(page, "6-digit code", wrong, verify=False)
        wait_text(page, "attempts left")
        type_into(page, "6-digit code", code, verify=False)
        wait_text(page, "Hi, Omar Ali")
        click(page, "Sign out")

        # 4. Forgot password → code → new password → login
        click(page, "Forgot password?")
        wait_text(page, "Forgot your password?")
        type_into(page, "Email", email)
        click(page, "Send code")
        wait_text(page, "Enter the reset code")
        type_into(page, "6-digit code", demo_code(page), verify=False)
        wait_text(page, "Choose a new password")
        type_into(page, "New password", "NewPass123")
        type_into(page, "Confirm password", "NewPass123")
        click(page, "Save new password")
        wait_text(page, "Password updated")
        click(page, "Back to sign in")
        type_into(page, "Email", email)
        type_into(page, "Password", "NewPass123")
        click(page, "Sign in")
        wait_text(page, "Hi, Omar Ali")

        # 5. Arabic + dark theme
        click(page, "العربية")
        wait_text(page, "أهلاً يا Omar Ali")
        page.get_by_role("button", name=re.compile("تغيير المظهر")).click()
        stored = page.evaluate("Object.entries(localStorage).map(e => e.join('=')).join(' ')")
        assert "settings.locale" in stored and "ar" in stored, stored

        browser.close()
        if errors:
            raise AssertionError(f"console errors: {errors}")
        print("OK: login, persistence, register + OTP, reset, Arabic/dark. 0 console errors.")


if __name__ == "__main__":
    main()
