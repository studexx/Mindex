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
                page.wait_for_function("typeof serviceDocumentPresenterSlides === 'function'")
                print(engine, page.evaluate('''() => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'restore-fixture',type_id:'fixture'};
                  state.services=[service];getServiceOutlineItems=()=>[];
                  const image={id:'closing',elementId:'closing',sectionId:'closing-section',sectionKey:'closing_visual',
                    elementType:'image',layout:'media',type:'image',title:'마무리',imageSrc:'closing.png'};
                  for(const chromakey of [false,true]) {
                    presenterServiceUsesChromakey=()=>chromakey;
                    let document={slides:[image]};
                    serviceDocumentSnapshotFromRef=()=>document;
                    const before=JSON.stringify(document);
                    const restored=serviceDocumentPresenterSlides(service);
                    check(restored.length===4,'missing ready/closing blanks');
                    check(restored[0].type==='ready'&&restored[2].id==='closing','order changed');
                    check(restored[1].autoTrailingBlank&&restored[3].autoTrailingBlank,'missing blanks');
                    check(JSON.stringify(document)===before,'stored snapshot mutated');
                    check(groupPresenterSlidesBySection(restored,service.id).length===2,'detached groups');
                    document={slides:restored};
                    const again=serviceDocumentPresenterSlides(service);
                    check(again.length===4,'duplicate blanks on second restore');
                    check(presenterSlidesModelIssues(again).length===0,'invalid slide model');
                    document={slides:[image,{id:'manual-blank',elementId:'closing',sectionId:'closing-section',
                      elementType:'blank',type:'blank',layout:'blank',title:'빈 화면'}]};
                    const manual=serviceDocumentPresenterSlides(service);
                    check(manual.length===4&&manual[3].id==='manual-blank','existing explicit blank replaced/duplicated');
                    document={slides:[]};
                    check(serviceDocumentPresenterSlides(service).length===0,'empty snapshot creates output');
                  }
                  return 'PASS missing blanks, repeated restore, explicit blanks, group ownership, both output modes, snapshot unchanged';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
