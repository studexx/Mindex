import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    parser.add_argument('--webkit', action='store_true')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = p.webkit.launch() if args.webkit else launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof resizeFormTextarea === 'function'")
            result = page.evaluate('''async () => {
              document.body.innerHTML = '<div id="scroller" style="height:400px;overflow:auto"><div style="height:900px"></div><textarea class="form-textarea"></textarea></div>';
              const s = document.querySelector('#scroller'), t = s.querySelector('textarea');
              const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              const assert = (value, label) => { if (!value) throw Error(label); };
              t.value = Array(35).fill('찬양 가사').join('\\n');
              resizeFormTextarea(t);
              t.focus(); t.setSelectionRange(t.value.length, t.value.length);
              s.scrollTop = s.scrollHeight;
              await frame();
              const before = s.scrollTop;
              for (let i = 0; i < 5; i++) {
                t.value += ' 더'; resizeFormTextarea(t); await frame();
                assert(Math.abs(s.scrollTop - before) <= 1, 'bottom typing jumped');
              }
              const height = t.offsetHeight;
              t.value += '\\n추가 가사'; resizeFormTextarea(t); await frame();
              assert(t.offsetHeight > height, 'did not grow');
              assert(Math.abs(s.scrollTop - before) <= 1, 'growing jumped');
              t.value = '짧은 가사'; resizeFormTextarea(t); await frame();
              assert(t.offsetHeight < height, 'did not shrink');
              assert(Math.abs(s.scrollTop - (s.scrollHeight - s.clientHeight)) <= 1, 'shrink did not clamp naturally');
              t.value = Array(35).fill('찬양 가사').join('\\n'); resizeFormTextarea(t);
              s.scrollTop = 200; resizeFormTextareas(); await frame();
              assert(s.scrollTop === 200, 'middle position changed');
              assert(document.activeElement === t, 'focus lost');
              return {before, typing: true, growth: true, shrink: true, middle: true};
            }''')
            before = page.evaluate('''() => {
              const s = document.querySelector('#scroller'), t = s.querySelector('textarea');
              t.addEventListener('input', () => resizeFormTextarea(t));
              t.focus(); t.setSelectionRange(t.value.length, t.value.length);
              s.scrollTop = s.scrollHeight;
              return s.scrollTop;
            }''')
            page.keyboard.type('abc')
            page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            after = page.locator('#scroller').evaluate('(element) => element.scrollTop')
            assert abs(before - after) <= 1, f'Keyboard typing jumped: {before} -> {after}'
            print('PASS textarea scroll stability and keyboard input:', result)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
