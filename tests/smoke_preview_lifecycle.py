"""Check sidebar preview geometry across replacement and board hydration."""

from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as playwright:
            browser = launch_chromium(playwright)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.route("**/*supabase*/**", lambda route: route.abort())
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_function("typeof setRightSidebarContent === 'function'")
            page.evaluate("""() => {
              state.module = 'presenter';
              document.body.dataset.module = 'presenter';
              window.previewFixture = `<div class="svc-presenter-side-panel">
                <div class="svc-presenter-live-preview">
                  <span class="svc-slide-mini-output">
                    <span class="svc-slide-mini-canvas presenter-output-root">
                      <div style="position:absolute;inset:0;border:16px solid red;background:#000"></div>
                    </span>
                  </span>
                </div></div>`;
              refs.rightSidebar.style.cssText = 'display:block;position:fixed;right:0;top:100px;width:254px;height:500px';
              refs.detailPane.innerHTML = '<div id="previewBoardFixture"></div>';
            }""")
            for width in (254, 360, 220):
                page.evaluate("""width => {
                  refs.rightSidebar.style.width = `${width}px`;
                  setRightSidebarContent(window.previewFixture);
                  const board = document.getElementById('previewBoardFixture');
                  observePresenterPreviewScaleFrames(board);
                  schedulePresenterPreviewLayoutUpdate(board);
                }""", width)
                page.wait_for_timeout(100)
                check_geometry(page)
                # A later resize must still be observed after board hydration.
                page.evaluate("refs.rightSidebar.style.width = '300px'")
                page.wait_for_timeout(100)
                check_geometry(page)
            page.locator('.svc-presenter-live-preview').screenshot(path='/tmp/mindex-preview-lifecycle.png')
            browser.close()
    finally:
        server.shutdown()


def check_geometry(page):
    geometry = page.evaluate("""() => {
      const frame = document.querySelector('.svc-presenter-live-preview').getBoundingClientRect();
      const canvas = document.querySelector('.svc-slide-mini-canvas').getBoundingClientRect();
      return {left: canvas.left - frame.left, top: canvas.top - frame.top,
        right: frame.right - canvas.right, bottom: frame.bottom - canvas.bottom};
    }""")
    assert all(-0.1 <= value <= 3 for value in geometry.values()), geometry
    print('PASS sidebar preview fits after replacement/resize', geometry)


if __name__ == '__main__':
    main()
