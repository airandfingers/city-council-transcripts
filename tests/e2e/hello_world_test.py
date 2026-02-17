from playwright.sync_api import sync_playwright

# Test for Hello World page at http://localhost:3000


def test_hello_world():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')

        # AC-1.1: Check for "Hello World" text
        assert page.locator('text=Hello World').is_visible(), "'Hello World' text not visible"

        # AC-1.2: Check for console errors/warnings
        errors = []

        def on_console(msg):
            if msg.type in ('error', 'warning'):
                errors.append(msg.text)

        page.on('console', on_console)
        page.reload()
        page.wait_for_load_state('networkidle')
        assert not errors, f"Console errors/warnings found: {errors}"

        # AC-1.3: Check visibility in dark mode
        page.emulate_media(color_scheme='dark')
        assert page.locator('text=Hello World').is_visible(), "'Hello World' not visible in dark mode"

        # AC-1.4: Ensure no Next.js starter content
        forbidden = [
            'Get started by editing',
            'Learn more',
            'By Vercel',
            'src/app/page.tsx',
            'Next.js',
        ]
        content = page.content()
        for text in forbidden:
            assert text not in content, f"Found forbidden starter content: {text}"

        browser.close()


if __name__ == '__main__':
    test_hello_world()
