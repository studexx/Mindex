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
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterBoardSection === 'function'")
            result = page.evaluate("""() => {
              const group = {id:'badge-test', kind:'main-praise', title:'찬양', name:'찬양',
                label:'찬양', meta:'테힐라 찬양단', slides:[], subgroups:[]};
              return [renderPresenterBoardSection(group,-1,''),
                renderDeferredPresenterBoardSection(group,'',0)].map(html => {
                  const root = document.createElement('div'); root.innerHTML=html;
                  return {title:root.querySelector('.svc-board-section-title').textContent.trim(),
                    badges:root.querySelectorAll('.svc-board-section-title small').length,
                    jump:!!root.querySelector('[data-presenter-action="jump"]'), meta:group.meta};
                });
            }""")
            for entry in result:
                assert entry == {'title':'찬양','badges':0,'jump':True,'meta':'테힐라 찬양단'}, entry
            print('PASS normal and deferred headings: badge removed, metadata retained')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
