"""Exercise preparation examples against real editor modes, without a live DB."""
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url + '?output=presenter', wait_until='domcontentloaded')
                page.wait_for_function("typeof presenterPreparationPlaceholderForService === 'function'")
                print(engine, page.evaluate('''async () => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'example-fixture',type_id:'fixture'};
                  const make=(label,memo,section)=>normalizeServiceItem({id:label,service_id:service.id,
                    label,raw_title:label,_worshipSectionKey:section,
                    memo:serializeServiceItemMemo(memo)},0);
                  const special=make('특송',{elementType:'praise',inputMode:'manual_praise',slides:['original lyric']},'special_song');
                  const notice=make('광고',{elementType:'body',inputMode:'text'},'announcements');
                  const group=start=>make(`공동기도 ${start}·${start+1}`,{elementType:'title_person',inputMode:'text',
                    templateKey:'monthly_corporate_prayer_group',corporatePrayers:[
                      {title:'기존 제목 A',assignee:'기존 담당 A',sourceElementId:'source-a'},
                      {title:'기존 제목 B',assignee:'기존 담당 B',sourceElementId:'source-b'}]},'corporate_prayer');
                  const groups=[group(1),group(3)];
                  state.services=[service]; state.serviceItems={[service.id]:[special,notice,...groups]};
                  state.selectedServiceId=service.id;
                  const lines=item=>presenterPreparationPlaceholderLinesForItem(item,service,presenterServiceInputItem(item,service));
                  check(lines(special)[0]==='특송: 그 크신 하나님의 사랑 / 찬양대','manual mode example');
                  check(lines(notice)[0].includes('다음 주 예배'),'announcement example');
                  check(groups.every(g=>lines(g).length===2),'group examples missing');
                  const examples=[...lines(special),...lines(notice),...groups.flatMap(lines)].join('\\n');
                  check(parsePresenterPreparationInput(examples).errors.length===0,'example parse failure');
                  servicePrepEditorItems=()=>state.serviceItems[service.id];
                  getServiceItems=()=>state.serviceItems[service.id];
                  renderServiceList=()=>{}; renderCurrentServiceModuleDetail=()=>{};
                  refreshPresenterForService=()=>{}; updateSaveState=()=>{};
                  projectWorshipServiceItemsFromTemplate=(_,items)=>items;
                  const errors=[]; showToast=(text,type)=>{if(type==='error')errors.push(text)};
                  let draft='공동기도1: 새 제목 / 새 담당';
                  presenterPreparationDraftForService=()=>draft;
                  await applyPresenterPreparationInput(service.id);
                  check(!errors.length,errors.join(','));
                  let prayers=monthlyCorporatePrayerEntries(state.serviceItems[service.id].find(i=>i.id===groups[0].id));
                  check(prayers[0].title==='새 제목'&&prayers[0].assignee==='새 담당','group field not applied');
                  check(prayers[1].title==='기존 제목 B'&&prayers[1].assignee==='기존 담당 B','sibling lost');
                  check(prayers[0].sourceElementId==='source-a','source metadata lost');
                  draft=groups.flatMap(lines).join('\\n');
                  await applyPresenterPreparationInput(service.id);
                  check(!errors.length,errors.join(','));
                  check(state.serviceItems[service.id].length===4,'extra elements created');
                  for(const g of groups) {
                    prayers=monthlyCorporatePrayerEntries(state.serviceItems[service.id].find(i=>i.id===g.id));
                    check(prayers.every(e=>e.title==='교회를 위해'&&e.assignee==='홍길동 집사'),'pair apply');
                  }
                  const before=JSON.stringify(state.serviceItems[service.id]);
                  draft='공동기도1: 하나\\n공동기도1: 둘';
                  await applyPresenterPreparationInput(service.id);
                  check(JSON.stringify(state.serviceItems[service.id])===before,'invalid input mutated data');
                  return 'PASS actual mode examples, both pairs, sibling preservation, metadata, no inserts, invalid input';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
