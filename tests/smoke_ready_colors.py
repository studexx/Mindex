import argparse

from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = start_local_app_server() if not args.url else (None, args.url)
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterFullscreenReadySlide === 'function'")
            result = page.evaluate("""() => {
              const root = document.getElementById('presenterOutputRoot');
              root.className = 'presenter-output-root no-chromakey';
              root.innerHTML = renderPresenterFullscreenReadySlide({title:'주일예배 [1부]'});
              return {color:getComputedStyle(root.querySelector('.presenter-ready-screen-kicker')).color,
                opacity:getComputedStyle(root.querySelector('.presenter-ready-screen-logo')).opacity};
            }""")
            assert result == {'color': 'rgb(255, 255, 255)', 'opacity': '1'}, result
            page.evaluate('document.fonts.ready')
            page.screenshot(path='/tmp/mindex-ready-colors.png')
            print('PASS ready screen full color', result)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
