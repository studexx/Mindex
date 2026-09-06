import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--webkit', action='store_true')
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = p.webkit.launch() if args.webkit else launch_chromium(p)
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterRightSidebar === 'function'")
            for width in (254, 320, 390):
                result = page.evaluate('''width => {
                  document.body.className = '';
                  document.body.dataset.theme = 'dark';
                  const service = {id:'layout-fixture',type_id:'fixture',title:'주일예배'};
                  state.services=[service]; state.selectedServiceId=service.id;
                  state.presenter.serviceId=service.id;
                  isPresenterOutputWindowOpen=()=>true;
                  isPresenterOutputHeartbeatOpen=()=>true;
                  state.presenter.outputWarmup={serviceId:service.id,total:5,ready:5,complete:true,updatedAt:Date.now()};
                  const slides=[{id:'slide',type:'lyrics',elementType:'lyrics',layout:'lower_bar_text',title:'주 은혜임을',text:'주 나의 모습 보네\\n상한 나의 맘 보시네'}];
                  document.body.innerHTML=`<aside id="fixture" style="width:${width}px;padding-top:20px;background:var(--panel);min-height:100vh">${renderPresenterRightSidebar(service,slides,true,0)}</aside>`;
                  refreshIcons(); applyPresenterPreviewScales();
                  const root=document.querySelector('#fixture');
                  const box=s=>root.querySelector(s).getBoundingClientRect();
                  const preview=box('.svc-presenter-live-preview'), nav=box('.svc-presenter-main'), output=box('.svc-presenter-output-group'), rail=box('.svc-presenter-input-rail');
                  const overflow=[...root.querySelectorAll('button,input,textarea,select')].filter(e=>e.getClientRects().length).some(e=>e.getBoundingClientRect().right>width+.5 || e.getBoundingClientRect().left<0);
                  return {ordered:preview.bottom<=nav.top && nav.bottom<=output.top && output.bottom<=rail.top,overflow,
                    readyHidden:getComputedStyle(root.querySelector('.svc-presenter-warmup--ready')).display==='none',
                    redundant:root.textContent.includes('빠른 반영')};
                }''', width)
                assert result['ordered'] and not result['overflow'] and result['readyHidden'] and not result['redundant'], result
                page.locator('#fixture').screenshot(path=f'/tmp/mindex-sidebar-layout-{width}.png')
                print('PASS sidebar layout', width, result)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
