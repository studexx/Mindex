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
                page.wait_for_function("typeof handlePresenterShortcut === 'function'")
                page.evaluate('''() => {
                  state.module='presenter';state.selectedServiceId='fixture';state.presenter.serviceId='fixture';
                  state.presenter.slides=Array.from({length:100},(_,i)=>({id:'s'+i}));
                  isPresenterOutputWindowOpen=()=>true;preparePresenterService=()=>{};
                  if(typeof preparePresenterNavigation==='function')preparePresenterNavigation=()=>{};
                  syncSelectedServiceItemToPresenterSlide=()=>{};syncServiceMusicWithPresenterContext=()=>{};
                  publishPresenterState=()=>{};renderPresenterControlState=()=>{};
                  scrollPresenterOutlineToActive=()=>{};scrollPresenterBoardToIndexStable=()=>{};scrollPresenterBoardToIndex=()=>{};
                  refs.rightSidebar.hidden=false;refs.rightSidebar.inert=false;document.body.classList.add('right-sidebar-open');
                  refs.rightSidebar.innerHTML=`<button id="next" data-presenter-action="next" data-service-id="fixture">다음</button>
                    <button id="thumb" class="svc-slide-thumb" data-presenter-index="1" data-service-id="fixture">슬라이드</button>
                    <input id="jump" type="number" data-presenter-jump-input data-service-id="fixture">
                    <textarea id="editor"></textarea><button id="music" data-service-music-action="toggle">음악</button>`;
                }''')
                for target in ('next', 'thumb'):
                    page.locator('#'+target).focus()
                    page.evaluate("state.presenter.jumpDraft=''")
                    page.keyboard.type('37')
                    assert page.evaluate('state.presenter.jumpDraft') == '37', target
                    page.keyboard.press('Enter')
                    assert page.evaluate('state.presenter.index') == 36, target
                    page.keyboard.type('0')
                    page.keyboard.press('Enter')
                    assert page.evaluate('state.presenter.safetyBlank'), target
                    page.keyboard.type('999')
                    page.keyboard.press('Enter')
                    assert page.evaluate('state.presenter.index') == 36, 'invalid jump'
                page.locator('#jump').fill('24')
                page.locator('#jump').press('Enter')
                assert page.evaluate('state.presenter.index') == 23, 'jump field'
                page.locator('#editor').focus()
                page.keyboard.type('12')
                assert page.evaluate('state.presenter.jumpDraft') == '', 'editor hijacked'
                assert page.locator('#editor').input_value() == '12'
                page.locator('#music').focus()
                page.keyboard.type('12')
                assert page.evaluate('state.presenter.jumpDraft') == '', 'music hijacked'
                print('PASS number navigation after button focus, direct field, zero, invalid and typing guards', engine)
                browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
