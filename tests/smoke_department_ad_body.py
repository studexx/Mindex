from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url+'?output=presenter', wait_until='domcontentloaded')
                page.wait_for_function("typeof buildPresenterSlidesForServiceItem === 'function'")
                print(engine, page.evaluate('''() => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  for(const type of ['youth','young-adult']) {
                    const service={id:'ad-fixture',type_id:type,date:'2026-09-13'};
                    const body='환영합니다.\\n1. 첫 번째 안내\\n\\n2. 두 번째 안내';
                    const item=normalizeServiceItem({id:'ad',service_id:service.id,label:'광고',raw_title:body,
                      _worshipSectionKey:'announcements',_worshipSectionTitle:'광고',
                      memo:serializeServiceItemMemo({elementType:'body',inputMode:'text'})});
                    state.services=[service];state.serviceItems[service.id]=[item];
                    state.loadedWorshipServiceIds.add(service.id);
                    const projected=getServiceItems(service.id).find(x=>x.id==='ad');
                    check(projected,'item lost');
                    check(!presenterFixedTitleText(projected),'fixed title intercepts body');
                    check(!presenterServiceInputIsStatic(projected),'editor hidden');
                    check(presenterServiceInputItem(projected,service),'no editor input');
                    const slides=buildPresenterSlidesForServiceItem(projected,service,0);
                    const output=slides.map(x=>x.text||'').join('\\n');
                    check(output.includes('첫 번째 안내') && output.includes('두 번째 안내'),'body missing: '+output);
                    check(!slides.some(x=>x.title==='교회소식'),'incorrect church-news title');
                    check(projected.raw_title===body,'body changed');
                  }
                  const title={label:'교회소식',_worshipSectionKey:'announcements',memo:serializeServiceItemMemo({elementType:'title'})};
                  check(presenterFixedTitleText(title)==='교회소식','regular service title changed');
                  return 'PASS editable department announcements produce actual body slides; title-only church news unchanged';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
