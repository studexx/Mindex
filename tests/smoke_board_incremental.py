from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page(viewport={'width': 1440, 'height': 900})
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url, wait_until='domcontentloaded')
                page.wait_for_function("typeof patchPresenterBoardSections === 'function'")
                result = page.evaluate('''async () => {
                  const check=(value,label)=>{if(!value)throw Error(label)};
                  const service={id:'incremental-audit',type_id:'sunday-afternoon'};
                  state.module='presenter';state.selectedServiceId=service.id;state.services=[service];
                  state.presenter.serviceId=service.id;state.presenter.index=0;
                  const slides=Array.from({length:12},(_,i)=>({id:'s'+i,sectionId:'section'+i,
                    type:'lyrics',elementType:'praise',layout:'center-text',text:'가사 '+i,title:'찬양',elementId:'e'+i}));
                  state.presenter.slides=slides;presenterSlidesForService=()=>slides;
                  patchPresenterSidebarServiceSummary=()=>{};patchPresenterSidebarOutline=()=>{};
                  patchServiceOutlineActiveState=()=>{};updateSaveState=()=>{};
                  refs.detailPane.innerHTML=renderServicePresenterControls(service,slides,true,0);
                  setRightSidebarContent(renderPresenterRightSidebar(service,slides,true,0));
                  const root=document.getElementById('servicePresenterControls');
                  const sections=[...root.querySelectorAll('.svc-board-section')];
                  const thumbs=[...root.querySelectorAll('.svc-slide-thumb')];
                  let detached=0;
                  const observer=new MutationObserver(records=>records.forEach(r=>r.removedNodes.forEach(n=>{
                    if(sections.includes(n)||thumbs.includes(n))detached++;
                  })));
                  observer.observe(root,{childList:true,subtree:true});
                  for(let i=0;i<12;i++){state.presenter.index=i;renderPresenterControlState(service.id)}
                  thumbs[0].focus({preventScroll:true});
                  slides[0].text='수정한 가사';renderPresenterControlState(service.id);
                  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                  check(root.isConnected&&thumbs.every(n=>n.isConnected),'board or thumbnail removed');
                  check(detached===0,'sections detached during content edit');
                  check(root.textContent.includes('수정한 가사'),'edit missing');
                  check(document.activeElement.closest('.svc-slide-thumb'),'focus lost');
                  observer.disconnect();
                  const render=()=>{
                    const t=document.createElement('template');t.innerHTML=renderServicePresenterControls(service,slides,true,0).trim();
                    check(patchPresenterBoardSections(root,t.content.firstElementChild,service.id,slides,true,0),'patch rejected');
                  };
                  slides.splice(1,1);render();check(!sections[1].isConnected&&sections[2].isConnected,'delete failed');
                  slides.unshift({id:'new',sectionId:'new',type:'lyrics',text:'추가',elementType:'praise',layout:'center-text'});
                  render();check(root.querySelector('.svc-board-section').dataset.presenterSectionKey==='new','insert failed');
                  check(sections[2].isConnected,'unrelated section lost after insert');
                  while(slides.length<90){const i=slides.length;slides.push({id:'large'+i,sectionId:'large'+i,type:'lyrics',text:'가사',elementType:'praise',layout:'center-text'})}
                  render();
                  check(!sections[2].hasAttribute('data-presenter-deferred-board-section'),'hydrated section reverted');
                  const deferred=root.querySelector('[data-presenter-deferred-board-section]');
                  check(deferred,'no lazy sections');
                  check(hydrateDeferredPresenterBoardSection(root,service.id,slides,Number(deferred.dataset.presenterBoardGroupIndex)),'hydration failed');
                  slides.splice(0);render();check(!root.querySelector('.svc-board-section')&&root.querySelector('.svc-slide-board').textContent.includes('슬라이드 없음'),'empty board stale');
                  slides.push({id:'restored',sectionId:'restored',type:'lyrics',text:'복원',elementType:'praise',layout:'center-text'});
                  render();check(!root.querySelector('.svc-slide-board').textContent.includes('슬라이드 없음'),'empty label retained');
                  return {detachedDuringEdit:detached,navigation:12,insertDelete:true,lazyHydration:true,empty:true};
                }''')
                print('PASS', engine, result)
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
