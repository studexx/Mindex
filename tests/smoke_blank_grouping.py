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
                page.wait_for_function("typeof groupPresenterSlidesBySection === 'function'")
                print(engine, page.evaluate('''() => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'group-fixture',type_id:'youth'};
                  state.services=[service];
                  getServiceOutlineItems=()=>[];
                  const songs=Array.from({length:3},(_,i)=>({id:`song-${i}`,elementId:`item-${i}`,
                    sectionId:'praise',sectionKey:'praise',sectionRole:'main-praise',sectionLabel:'찬양',
                    label:`찬양 ${i+1}`,elementLabel:`찬양 ${i+1}`,type:'lyrics',layout:'lower_bar_text',text:'가사'}));
                  const slides=withPresenterElementTrailingBlanks(songs,service);
                  check(slides.length===6,'blank count');
                  const groups=groupPresenterSlidesBySection(slides,service.id);
                  check(groups.length===1 && groups[0].kind==='main-praise','blanks detached into separate group');
                  check(groups[0].subgroups.length===3,'duplicate editor subgroups');
                  groups[0].subgroups.forEach((g,i)=>{
                    check(g.slides.length===2,'blank not in song subgroup');
                    check(g.slides[0].slide===songs[i] && g.slides[1].slide.autoTrailingBlank,'wrong order');
                    check(g.label!=='빈 화면','blank mislabeled as element');
                  });
                  const ready=presenterReadySlide(service);
                  const blank=presenterElementTrailingBlankSlide(ready,1,service);
                  check(!isPresenterPreparationSlide(blank),'blank classified as ready');
                  check(isPresenterPreparationSlide(ready),'ready lost');
                  return 'PASS three songs, one section, three editor groups, each blank follows its song, ready classification';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
