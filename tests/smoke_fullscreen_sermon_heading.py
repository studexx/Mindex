from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ("chrome", "webkit"):
                browser = launch_chromium(p) if engine == "chrome" else p.webkit.launch()
                page = browser.new_page(viewport={"width": 1920, "height": 1080})
                page.route("**/*supabase*/**", lambda route: route.abort())
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("typeof normalizeCleanPresenterSlideLayout === 'function'")
                result = page.evaluate("""() => {
                  const root = document.createElement('div');
                  root.className = 'presenter-output-root no-chromakey';
                  document.body.append(root);
                  let count = 0;
                  for (const width of [406, 1280, 1920]) {
                    root.style.cssText = 'position:fixed;inset:0;transform:none;width:'+width+'px;height:'+width*9/16+'px;container-type:size;z-index:99999;background:black';
                    for (const person of ['', '김남영 목사']) {
                      const raw = {type:'title-assignee', elementType:PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
                        layout:PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT, sectionKey:'sermon',
                        sectionTitle:'설교', label:'설교 제목', titlePresentation:'sermon',
                        title:'감사하는 생활 ②', contentTitle:'감사하는 생활 ②',
                        orderTitle:'설교', assignee:person, outputContext:'clean'};
                      const before = JSON.stringify(raw);
                      const clean = normalizeCleanPresenterSlideLayout(raw);
                      root.innerHTML = renderPresenterSlideFrame(clean, {noChromakey:true});
                      const heading = root.querySelector('.presenter-fullscreen-order-heading');
                      const title = root.querySelector('.presenter-title-content-title');
                      const body = root.querySelector('.presenter-title-content-body');
                      if (heading?.textContent !== '설교' || title?.textContent !== raw.title) throw Error('Missing heading/title');
                      if (person && !body.textContent.includes(person)) throw Error('Missing person');
                      const h = heading.getBoundingClientRect(), t = title.getBoundingClientRect(), r = root.getBoundingClientRect();
                      if (h.height <= 0 || h.bottom > t.top + 1 || h.left < r.left || h.right > r.right || t.bottom > r.bottom) throw Error('Heading collision');
                      if (person && body.getBoundingClientRect().top < t.bottom - 1) throw Error('Person collision');
                      const songHeading = document.createElement('span');
                      songHeading.className = 'presenter-fullscreen-song-heading';
                      root.append(songHeading);
                      const hs = getComputedStyle(heading), ss = getComputedStyle(songHeading);
                      if (hs.fontSize !== ss.fontSize || hs.fontWeight !== ss.fontWeight) throw Error('Song hierarchy mismatch');
                      songHeading.remove();
                      if (JSON.stringify(raw) !== before) throw Error('Source changed');
                      const bar = renderPresenterSlideFrame({...raw,outputContext:'chromakey'},{noChromakey:false});
                      if (bar.includes('presenter-fullscreen-order-heading')) throw Error('Lower bar changed');
                      count++;
                    }
                  }
                  return count;
                }""")
                page.screenshot(path=f"/tmp/fullscreen-sermon-heading-{engine}.png")
                print("PASS", engine, result, flush=True)
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
