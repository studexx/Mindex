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
                const normalized=normalizeServiceItem({...item,service_id:'11111111-1111-4111-8111-111111111111'});
                check(normalized.label==='광고' && normalized.raw_title===item.raw_title,'canonical label/body');
                check(isAnnouncementTextInputItem(normalized) && liturgicalBodyTitle(normalized)==='광고','renamed body recognition');
                check(liturgicalBodyText(normalized).includes('이번 주 모임 안내'),'body lost');
                const service={id:normalized.service_id,type_id:label==='청소년부 광고'?'youth':'young-adult',date:'2026-09-13'};
                const projected=projectWorshipServiceItemsFromTemplate(service,[normalized]);
                const ads=projected.filter(x=>isAnnouncementTextInputItem(x));
                check(ads.length===1 && ads[0].raw_title===item.raw_title,'duplicate or overwritten announcement');
                const rows=buildWorshipPersistenceRows(service,ads);
                check(rows.elements.length===1 && rows.elements[0].source_ref.label==='광고','saved label');
                const reloaded=groupWorshipElements(rows.sections,rows.elements)[service.id][0];
                check(reloaded.label==='광고' && liturgicalBodyText(reloaded).includes('이번 주 모임 안내'),'reload loses body');
              }
              check(serviceElementDisplayLabel('교회소식')==='교회소식','unrelated label changed');
              check(youthWorshipAnnouncementsStep().elements[0].label==='광고','youth template');
              check(youngAdultWorshipAnnouncementsStep().elements[0].label==='광고','young adult template');
              check(serviceElementDisplayLabel('청년부 광고 특별 안내')==='청년부 광고 특별 안내','custom title changed');
              return 'PASS outline, editor and output labels; data and custom names preserved';
            }'''))
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
