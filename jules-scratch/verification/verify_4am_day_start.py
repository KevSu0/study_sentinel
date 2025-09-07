from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the dashboard page
    page.goto("http://localhost:3000/dashboard")

    # Set time to 3 AM
    page.evaluate("() => { const now = new Date('2025-09-08T03:00:00.000Z'); globalThis.Date = class extends Date { constructor(date) { if (date) { return super(date); } return now; } static now() { return now.getTime(); } }; }")
    page.screenshot(path="jules-scratch/verification/3am.png")

    # Set time to 5 AM
    page.evaluate("() => { const now = new Date('2025-09-08T05:00:00.000Z'); globalThis.Date = class extends Date { constructor(date) { if (date) { return super(date); } return now; } static now() { return now.getTime(); } }; }")
    page.screenshot(path="jules-scratch/verification/5am.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
