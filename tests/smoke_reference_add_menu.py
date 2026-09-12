from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ("chrome", "webkit"):
                browser = launch_chromium(p) if engine == "chrome" else p.webkit.launch()
                page = browser.new_page(viewport={"width": 1100, "height": 700})
                page.route("**/*supabase*/**", lambda route: route.abort())
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("typeof renderPresenterReferenceMediaQuickAdd === 'function'")
                page.evaluate("""() => {
                  window.mediaCalls=[];
                  addPresenterReferenceMedia=(...args)=>mediaCalls.push(['url',...args]);
                  addAndUploadPresenterReferenceMedia=async input=>mediaCalls.push(['file',input.files[0]?.name]);
                  const host=document.createElement('div');
                  host.id='media-test';
                  host.style.cssText='position:fixed;inset:0;z-index:99999;padding:20px;background:var(--bg)';
                  host.innerHTML='<div class="svc-board-section-head-row" style="width:300px"><button class="svc-board-section-head">광고</button>'
                    +renderPresenterReferenceMediaQuickAdd('announcements','fixture')
                    +'</div><button id="outside">다른 영역</button>';
                  host.addEventListener('click',handleDetailClick);
                  host.addEventListener('change',handleDetailChange);
                  host.addEventListener('keydown',handleDetailKeydown);
                  document.body.append(host);
                }""")
                host = page.locator("#media-test")
                summary = host.locator("summary")
                row = host.locator(".svc-board-section-head-row")
                height = row.bounding_box()["height"]
                assert summary.inner_text().strip() == "추가"
                assert host.locator("[data-presenter-reference-media-add]").is_hidden()
                summary.click()
                assert host.locator("[data-presenter-reference-media-add]").is_visible()
                assert row.bounding_box()["height"] == height
                assert page.evaluate("mediaCalls.length") == 0
                summary.press("Escape")
                assert host.locator("[data-presenter-reference-media-add]").is_hidden()
                summary.click()
                host.locator("#outside").click()
                assert host.locator("[data-presenter-reference-media-add]").is_hidden()
                summary.click()
                host.locator("[data-presenter-reference-media-add]").click()
                assert page.evaluate("mediaCalls[0][0]") == "url"
                assert page.evaluate("mediaCalls[0][1]") == "fixture"
                assert page.evaluate("mediaCalls[0][2]") == "announcements"
                summary.click()
                host.locator("input[type=file]").set_input_files(
                    {"name": "test.png", "mimeType": "image/png", "buffer": b"test"}
                )
                assert page.evaluate("mediaCalls[1][0]") == "file"
                assert host.locator("[data-presenter-reference-media-add]").is_hidden()
                summary.click()
                bounds = page.evaluate("""() => {
                  const h=document.querySelector('#media-test .svc-board-section-head-row').getBoundingClientRect();
                  const m=document.querySelector('#media-test .svc-reference-media-quick-add-actions').getBoundingClientRect();
                  return {left:m.left,right:m.right,limit:h.right};
                }""")
                assert bounds["left"] >= 0 and bounds["right"] <= bounds["limit"] + 1
                page.screenshot(path=f"/tmp/reference-add-{engine}.png")
                print("PASS", engine, "compact row, URL/file actions, dismiss", flush=True)
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
