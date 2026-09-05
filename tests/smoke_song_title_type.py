"""Check lower-bar title roles in output and scaled previews."""

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
            page.wait_for_function("typeof renderPresenterOutput === 'function'")
            page.evaluate('document.fonts.ready')
            for chromakey in [True, False]:
                for key in ['praise', 'pre_scripture_praise', 'entrance_praise',
                            'response_song', 'prayer_meeting_praise', 'special_song']:
                    for title in ['임재', '한라에서 백두까지 백두에서 땅끝까지',
                                  '한라에서 백두까지 백두에서 땅끝까지 주님의 사랑을 전하리']:
                        result = page.evaluate("""({chromakey, key, title}) => {
                          const slide = {id:'title-test', type:'song-title', elementType:'praise',
                            layout:'lower_bar_text', sectionKey:key, title, text:'♬ ' + title,
                            outputContext:chromakey ? 'chromakey' : 'fullscreen', live:true};
                          renderPresenterOutput({serviceId:'title-test', serviceType:'sunday-main',
                            chromakey, slides:[slide], index:0, safetyBlank:false}, {});
                          const measure = root => {
                            const box = root.querySelector('.presenter-slide--song-title > .presenter-slide-text');
                            const range = document.createRange();
                            range.selectNodeContents(box);
                            const bounds = box.getBoundingClientRect();
                            const style = getComputedStyle(box);
                            return {size:parseFloat(style.fontSize), weight:style.fontWeight,
                              inside:[...range.getClientRects()].every(r => r.left >= bounds.left - 1
                                && r.right <= bounds.right + 1 && r.top >= bounds.top - 1
                                && r.bottom <= bounds.bottom + 1)};
                          };
                          const output = measure(document.getElementById('presenterOutputRoot'));
                          const mount = document.createElement('div');
                          mount.className = 'svc-slide-thumb-frame';
                          mount.style.cssText='position:fixed;top:0;left:0;width:406px;height:228.375px';
                          mount.innerHTML = chromakey ? renderPresenterSlideMiniPreview(slide)
                            : '<span class="svc-slide-mini-canvas presenter-output-root no-chromakey">'
                              + renderPresenterSlideFrame(slide, {noChromakey:true, previewStage:true}) + '</span>';
                          document.body.append(mount);
                          applyPresenterPreviewScales(mount);
                          fitPresenterSongTitlePreviews(mount);
                          const preview = measure(mount);
                          mount.remove();
                          return {output, preview};
                        }""", {'chromakey': chromakey, 'key': key, 'title': title})
                        assert result['output'] == result['preview'], result
                        for value in result.values():
                            assert value['weight'] == '800' and value['inside'], result
                            assert 56 <= value['size'] <= 100.01, result
                            if title == '임재':
                                assert abs(value['size'] - 100) < 0.1, result
                        print('PASS', chromakey, key, title, result, flush=True)
                page.screenshot(path=f'/tmp/mindex-song-title-{chromakey}.png')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
