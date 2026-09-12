from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda r: r.abort())
            page.goto(url+'?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof serviceElementDisplayLabel === 'function'")
            print(page.evaluate('''() => {
              const check=(v,m)=>{if(!v)throw Error(m)};
              for(const label of ['청소년부 광고','청년부 광고']) {
                const item={id:'fixture',label,raw_title:'1. 이번 주 모임 안내',_worshipSectionKey:'announcements',memo:serializeServiceItemMemo({elementType:'body'})};
                const before=JSON.stringify(item);
                check(serviceElementDisplayLabel(label)==='광고','display label');
                check(liturgicalBodyTitle(item)==='광고','output title');
                check(serviceSidebarChildItemDisplayParts(item).meta==='광고','outline label');
                check(presenterBoardSubgroupDisplay('fixture',{label,title:'',slides:[]}).label==='광고','editor heading');
                check(isLiturgicalBodyServiceItem(item),'body recognition changed');
                check(JSON.stringify(item)===before,'data changed');
              }
              check(serviceElementDisplayLabel('교회소식')==='교회소식','unrelated label changed');
              check(serviceElementDisplayLabel('청년부 광고 특별 안내')==='청년부 광고 특별 안내','custom title changed');
              return 'PASS outline, editor and output labels; data and custom names preserved';
            }'''))
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
