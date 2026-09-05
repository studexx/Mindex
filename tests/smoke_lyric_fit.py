import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterOutput === 'function'")
            page.evaluate('document.fonts.ready')
            for width, height in [(1920,1080), (1366,768), (900,900), (406,228)]:
                page.set_viewport_size({'width':width,'height':height})
                for chromakey in [False, True]:
                    for text in ['1 구주의 십자가 보혈로 죄 씻음 받기를 원하네\n내 죄를 씻으신 주 이름 찬송합시다', '짧은 가사', '아주 긴 가사를 온전히 표시합니다 ' * 6]:
                        page.evaluate('''({text, chromakey}) => {
                          const slide = {id:Math.random().toString(), type:'lyrics', elementType:'praise',
                            layout:'lower_bar_text', text, outputContext:chromakey?'chromakey':'fullscreen'};
                          renderPresenterOutput({serviceId:'test', chromakey, slides:[slide], index:0}, {});
                        }''', {'text':text,'chromakey':chromakey})
                        page.wait_for_timeout(100)
                        result = page.evaluate('''() => {
                          const box = document.querySelector('.is-active .presenter-slide-text');
                          const bounds = box.getBoundingClientRect();
                          const range = document.createRange(); range.selectNodeContents(box);
                          const stage = box.closest('.presenter-output-root').getBoundingClientRect();
                          return {ratio:bounds.width/stage.width, exists:!!box, inside:[...range.getClientRects()].every(r =>
                            r.left >= bounds.left-1 && r.right <= bounds.right+1 &&
                            r.top >= bounds.top-1 && r.bottom <= bounds.bottom+1)};
                        }''')
                        assert result['inside'], (width,height,chromakey,text,result)
                        if not chromakey:
                            assert abs(result['ratio'] - 0.85) < 0.002, result
                        if width == 1920 and not chromakey and text.startswith('1 '):
                            page.screenshot(path='/tmp/mindex-lyric-fit-reported.png')
                page.screenshot(path=f'/tmp/mindex-lyric-fit-{width}.png')
            browser.close()
            print('PASS lyric bounds: 24 cases, repeated transitions and resizing')
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
