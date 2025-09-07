from playwright.sync_api import sync_playwright, Page, expect

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Arrange: Go to the plans page.
        page.goto("http://localhost:3000/plans")

        # Get page content for debugging
        content = page.content()
        print(content)

        # 2. Assert: Check for a known element on the page.
        # I'll check for the "Upcoming" heading.
        expect(page.get_by_role("heading", name="Upcoming")).to_be_visible()

        # 3. Screenshot: Capture the final result for visual verification.
        page.screenshot(path="jules-scratch/verification/plans_page.png")

        browser.close()

if __name__ == "__main__":
    main()
