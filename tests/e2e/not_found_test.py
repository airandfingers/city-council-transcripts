"""E2E tests for 404 behavior.

Tests validate:
- AC-3.4: Unknown routes return 404
  - /invalid/route returns 404
  - /ca/invalid-city returns 404
  - /xx/monterey-park returns 404 (invalid state code)
"""

from playwright.sync_api import sync_playwright


def test_404_route(page, route: str):
    """Test that a route returns 404 status."""
    response = page.goto(f'http://localhost:3000{route}')
    page.wait_for_load_state('networkidle')
    assert response.status == 404, f"Route {route} returned status {response.status}, expected 404"
    print(f"  {route}: 404 verified")


def test_not_found_routes():
    """Run 404 tests for various invalid routes."""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test: /invalid/route returns 404
        test_404_route(page, '/invalid/route')

        # Test: /ca/invalid-city returns 404 (valid state, invalid city)
        test_404_route(page, '/ca/invalid-city')

        # Test: /xx/monterey-park returns 404 (invalid state code)
        test_404_route(page, '/xx/monterey-park')

        browser.close()
        print("All 404 route tests passed!")


if __name__ == '__main__':
    test_not_found_routes()
