"""E2E tests for home page content and layout.

Tests validate:
- AC-1.1: Page loads at /
- AC-1.2: Exactly 2 city cards present
- AC-1.3: Cards contain "Monterey Park" and "Fort Collins"
- AC-1.5: About section present with title
- Navigation: Links navigate to correct city routes
"""

from playwright.sync_api import sync_playwright


def test_home_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test: page loads at /
        response = page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        assert response.status == 200, f"Home page returned status {response.status}, expected 200"

        # Test: exactly 2 city cards present
        # City cards are links with aria-label containing "View transcripts for"
        city_cards = page.locator('a[aria-label^="View transcripts for"]')
        card_count = city_cards.count()
        assert card_count == 2, f"Expected exactly 2 city cards, found {card_count}"

        # Test: cards contain "Monterey Park" and "Fort Collins"
        monterey_card = page.locator('text=Monterey Park')
        assert monterey_card.is_visible(), "'Monterey Park' city card not visible"

        fort_collins_card = page.locator('text=Fort Collins')
        assert fort_collins_card.is_visible(), "'Fort Collins' city card not visible"

        # Test: About section present with title
        about_heading = page.locator('h2:has-text("About")')
        assert about_heading.is_visible(), "About section heading not visible"

        # Verify About section has descriptive content
        about_section = page.locator('section:has(h2:has-text("About"))')
        about_paragraph = about_section.locator('p')
        assert about_paragraph.is_visible(), "About section paragraph not visible"

        # Test: links navigate to correct city routes
        # Get the href attributes of city cards
        monterey_link = page.locator('a[aria-label*="Monterey Park"]')
        monterey_href = monterey_link.get_attribute('href')
        assert monterey_href == '/ca/monterey-park', f"Monterey Park link href is '{monterey_href}', expected '/ca/monterey-park'"

        fort_collins_link = page.locator('a[aria-label*="Fort Collins"]')
        fort_collins_href = fort_collins_link.get_attribute('href')
        assert fort_collins_href == '/co/fort-collins', f"Fort Collins link href is '{fort_collins_href}', expected '/co/fort-collins'"

        # Verify navigation works by clicking the Monterey Park link
        with page.expect_navigation():
            monterey_link.click()
        page.wait_for_load_state('networkidle')
        assert '/ca/monterey-park' in page.url, f"Navigation failed, URL is {page.url}"

        # Navigate back and verify Fort Collins link works
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        fort_collins_link = page.locator('a[aria-label*="Fort Collins"]')
        with page.expect_navigation():
            fort_collins_link.click()
        page.wait_for_load_state('networkidle')
        assert '/co/fort-collins' in page.url, f"Navigation failed, URL is {page.url}"

        browser.close()
        print("All home page tests passed!")


if __name__ == '__main__':
    test_home_page()
