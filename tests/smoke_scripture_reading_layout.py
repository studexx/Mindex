import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda route: route.abort())
                page.goto(url, wait_until='domcontentloaded')
                page.wait_for_function("typeof renderBibleReader === 'function'")
                for theme in ('light', 'dark'):
                    for width in (320, 390, 1440):
                        page.set_viewport_size({'width': width, 'height': 900})
                        page.evaluate('''theme => {
                          state.module='scripture';state.selectedBibleChapter=1;
                          state.selectedBookCode='GEN';state.bibleReaderLoading=false;
                          state.bibleReaderError='';state.selectedBibleVerses=[];
                          state.selectedBibleVerse=null;
                          state.bibleTranslations=[{id:'fixture',name:'개역개정'}];
                          state.selectedBibleTranslationId='fixture';
                          state.bibleBookVerses=[1,2,3].map(verse=>({chapter:1,verse,
                            text:('길이가 긴 말씀 본문의 줄바꿈과 복사 영역을 확인합니다. ').repeat(6)}));
                          render();document.body.dataset.theme=theme;
                          document.body.classList.add('sidebar-collapsed');syncSidebarCollapsedState();
                          refs.detailPane.innerHTML=renderBibleReader({koreanName:'창세기'});
                          refreshIcons();
                        }''', theme)
                        page.wait_for_timeout(300)
                        page.locator('[data-bible-verse="1"] strong').click()
                        assert page.evaluate('state.selectedBibleVerses') == [1]
                        page.locator('[data-bible-verse="3"] strong').click(modifiers=['Shift'])
                        assert page.evaluate('state.selectedBibleVerses') == [1, 2, 3]
                        result = page.evaluate('''() => {
                          const list=document.querySelector('.bible-verse-list');
                          const pane=refs.detailPane.getBoundingClientRect();
                          return {width:list.getBoundingClientRect().width,
                            fits:[...refs.detailPane.querySelectorAll('select,button,strong')].every(e=>{
                              const r=e.getBoundingClientRect();return r.left>=pane.left&&r.right<=pane.right;
                            }),overflow:list.scrollWidth>list.clientWidth+1};
                        }''')
                        assert result['width'] <= 900 and result['fits'] and not result['overflow'], result
                        page.screenshot(path=f'/tmp/scripture-polish-{engine}-{theme}-{width}.png')
                        print('PASS scripture reading', engine, theme, width, result, flush=True)
                browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
