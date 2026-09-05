"""Verify wrapped scripture stays readable and inside the lower bar."""

import argparse
import subprocess

from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args()
    server, local_url = start_local_app_server() if not args.url else (None, None)
    url = args.url or local_url
    try:
        with sync_playwright() as playwright:
            browser = launch_chromium(playwright)
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            page.route('**/*supabase*/**', lambda route: route.abort())
            if args.baseline:
                source = subprocess.check_output(['git', 'show', 'HEAD:mindex.presenter.js'], text=True)
                page.route('**/mindex.presenter.js?*', lambda route: route.fulfill(body=source, content_type='text/javascript'))
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterOutput === 'function'")
            page.evaluate('document.fonts.ready')
            texts = [
                '여호와는 나의 목자시니 내게 부족함이 없으리로다',
                '다윗과 이스라엘 장로들과 천부장들이 가서 여호와의 언약궤를 즐거이 메고 오벧에돔의 집에서 올라왔는데',
                '17 자녀이면 또한 상속자 곧 하나님의 상속자요 그리스도와 함께 한 상속자니 우리가 그와 함께 영광을 받기 위하여 고난도 함께 받아야 할 것이니라',
            ]
            for index, text in enumerate(texts):
                result = page.evaluate("""text => {
                  const slide = {id:'wrap-test', elementType:PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
                    layout:PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT, type:'scripture',
                    title:'역대상 15:25', text, live:true, outputContext:'chromakey'};
                  renderPresenterOutput({serviceId:'wrap-test', serviceType:'sunday-main',
                    chromakey:true, slides:[slide], index:0, safetyBlank:false}, {});
                  const measure = root => {
                    const box = root.querySelector('.presenter-slide--scripture > .presenter-slide-text');
                    const bounds = box.getBoundingClientRect();
                    const range = document.createRange();
                    range.selectNodeContents(box);
                    const textRects = [...range.getClientRects()];
                    return {size:parseFloat(getComputedStyle(box).fontSize),
                      fits:box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1,
                      inside:textRects.every(r => r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1
                        && r.left >= bounds.left - 1 && r.right <= bounds.right + 1)};
                  };
                  const output = measure(document.getElementById('presenterOutputRoot'));
                  const mount = document.createElement('div');
                  mount.className = 'svc-slide-thumb-frame';
                  mount.style.cssText = 'position:fixed;top:0;left:0;width:406px;height:228.375px';
                  mount.innerHTML = renderPresenterSlideMiniPreview(slide);
                  document.body.append(mount);
                  applyPresenterPreviewScales(mount);
                  fitPresenterChromakeyScripturePreviews(mount);
                  const preview = measure(mount);
                  fitPresenterChromakeyScripturePreviews(mount);
                  const repeat = measure(mount);
                  mount.remove();
                  return {output, preview, repeat};
                }""", text)
                assert all(r['fits'] and r['inside'] for r in result.values()), result
                assert result['preview'] == result['repeat'], result
                assert abs(result['output']['size'] - result['preview']['size']) <= 1, result
                assert result['output']['size'] >= (65 if index < 2 else 45), result
                print('PASS wrapped scripture', index, result, flush=True)
            page.screenshot(path='/tmp/mindex-scripture-wrap.png')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
