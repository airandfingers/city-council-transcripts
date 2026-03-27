"""E2E tests for city page content.

Tests validate:
- AC-2.1: /ca/monterey-park and /co/fort-collins routes load
- AC-2.2: City pages have correct title format "{City}, {State}"
- AC-2.3: Page summary paragraph present
- AC-2.4: Meeting cards present on each page
- AC-2.5: "Full transcript" links present
- AC-2.6: Meeting cards have title and summary
"""

from playwright.sync_api import sync_playwright


def test_city_page(page, city_url: str, expected_title: str, expected_city: str):
    """Test a single city page for required elements."""

    # Test: page loads at city URL
    response = page.goto(f'http://localhost:3000{city_url}')
    page.wait_for_load_state('networkidle')
    assert response.status == 200, f"City page {city_url} returned status {response.status}, expected 200"

    # Test: correct title in h1
    h1 = page.locator('h1')
    assert h1.is_visible(), f"H1 not visible on {city_url}"
    h1_text = h1.inner_text()
    assert h1_text == expected_title, f"H1 text is '{h1_text}', expected '{expected_title}'"

    # Test: page summary paragraph present
    # The summary is a <p> tag directly in main, after h1 and before the meetings section
    summary_paragraph = page.locator('main > p').first
    assert summary_paragraph.is_visible(), f"Summary paragraph not visible on {city_url}"
    summary_text = summary_paragraph.inner_text()
    assert len(summary_text) > 0, f"Summary paragraph is empty on {city_url}"

    # Test: meeting cards present
    # Meeting cards are <article> elements in the meetings section
    meeting_cards = page.locator('section article')
    card_count = meeting_cards.count()
    assert card_count > 0, f"No meeting cards found on {city_url}"

    # Test: each meeting card has a title (h3), summary (p), and "Full transcript" link
    for i in range(card_count):
        card = meeting_cards.nth(i)

        # Meeting title
        card_title = card.locator('h3')
        assert card_title.is_visible(), f"Meeting card {i+1} title not visible on {city_url}"
        title_text = card_title.inner_text()
        assert "City Council Meeting" in title_text, f"Meeting card {i+1} title missing expected text on {city_url}"

        # Meeting summary
        card_summary = card.locator('p')
        assert card_summary.is_visible(), f"Meeting card {i+1} summary not visible on {city_url}"

        # Full transcript link
        transcript_link = card.locator('a:has-text("View full transcript")')
        assert transcript_link.is_visible(), f"Meeting card {i+1} transcript link not visible on {city_url}"
        # Verify link has aria-label for accessibility
        aria_label = transcript_link.get_attribute('aria-label')
        assert aria_label is not None, f"Meeting card {i+1} transcript link missing aria-label on {city_url}"
        href = transcript_link.get_attribute('href')
        assert href is not None, f"Meeting card {i+1} transcript link missing href on {city_url}"
        assert href.startswith('/transcripts/'), (
            f"Meeting card {i+1} transcript link href is '{href}', expected '/transcripts/<meeting-slug>'"
        )

    print(f"  {city_url}: All tests passed ({card_count} meeting cards)")


def test_city_pages():
    """Run tests for all city pages."""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test Monterey Park, California
        test_city_page(
            page,
            city_url='/ca/monterey-park',
            expected_title='Monterey Park, California',
            expected_city='Monterey Park'
        )

        # Test Fort Collins, Colorado
        test_city_page(
            page,
            city_url='/co/fort-collins',
            expected_title='Fort Collins, Colorado',
            expected_city='Fort Collins'
        )

        browser.close()
        print("All city page tests passed!")


if __name__ == '__main__':
    test_city_pages()
