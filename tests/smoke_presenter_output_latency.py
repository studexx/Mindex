from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def run(browser, url):
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.route("**/*supabase*/**", lambda route: route.abort())
    page.goto(url + "?output=presenter", wait_until="domcontentloaded")
    page.wait_for_function("typeof preparePresenterNavigation === 'function'")
    print(page.evaluate('''async () => {
      const assert=(v,m)=>{if(!v)throw Error(m)};
      const service={id:'latency-test',type_id:'sunday-afternoon',date:'2026-09-06'};
      state.services=[service];
      state.serviceItems[service.id]=[{id:'song',label:'찬양 1',raw_title:'곡',memo:''}];
      state.presenter.serviceId=service.id;
      state.presenter.slides=[{id:'first',type:'title-assignee',text:'First'}];
      state.presenter.sourceSignature=presenterSlideBuildSourceSignature(service.id);
      let prepares=0;
      const originalPrepare=preparePresenterService;
      preparePresenterService=()=>{prepares++};
      try {
        for(let i=0;i<40;i++) {
          state.serviceItems[service.id]=state.serviceItems[service.id].map(item=>({...item}));
          assert(preparePresenterNavigation(service.id),'unchanged projection not reused');
        }
        assert(prepares===0,'navigation repeats preparation');
        state.serviceItems[service.id][0].raw_title='Changed';
        assert(!preparePresenterNavigation(service.id),'edited data skipped');
        assert(prepares===1,'edit not prepared');
        preparePresenterNavigation('another-service');
        assert(prepares===2,'service switch not prepared');
      } finally {preparePresenterService=originalPrepare;}

      const keySlides=[{id:'key',type:'lyrics',title:'Title',text:'Line 1\\r\\nLine 2',bodyText:'Body'}];
      const key=presenterControlBoardKey(service,keySlides,true,true);
      const template=document.createElement('template');
      template.innerHTML=`<div data-board-key="${escapeAttr(key)}"></div>`;
      assert(template.content.firstElementChild.dataset.boardKey===key,'board key corrupted by HTML parsing');
      const sidebar=document.createElement('div');sidebar.className='svc-presenter-side-panel';
      sidebar.style.width='320px';document.body.append(sidebar);
      const originalOpen=isPresenterOutputWindowOpen;
      isPresenterOutputWindowOpen=()=>true;
      try {
        sidebar.innerHTML=renderPresenterControlsTop(service,keySlides,true,0);
        for(let i=0;i<5;i++)patchPresenterControlsTop(sidebar,service,keySlides,true,0);
        const frame=sidebar.querySelector('.svc-presenter-live-preview');
        const rect=frame.getBoundingClientRect();
        assert(rect.height>0 && Math.abs(rect.width/rect.height-16/9)<0.02,'preview aspect ratio collapsed');
      } finally {isPresenterOutputWindowOpen=originalOpen;sidebar.remove();}
      const source=new URL('assets/favicon-32.png',location.href).href;
      await preloadPresenterOutputImage(source);
      assert(presenterOutputImageIsReady(source),'image fixture not ready');
      const payload={serviceId:service.id,chromakey:true,index:0,slides:[
        {id:'picture',type:'image',elementType:'image',layout:'media',imageSrc:source},
        {id:'text',type:'title-assignee',elementType:'title_assignee',layout:'lower-bar-text',text:'Latest'}
      ]};
      const originalFrame=nextAnimationFrame;
      let frameWaits=0;
      nextAnimationFrame=()=>{frameWaits++;return originalFrame()};
      try {
        renderPresenterOutput(payload);
        for(let i=0;i<12;i++)await Promise.resolve();
        const root=document.getElementById('presenterOutputRoot');
        assert(root.querySelector('.is-active img'),'ready image not committed');
        assert(frameWaits===0,'ready image waits for extra frames');
        assert(!root.hasAttribute('aria-busy'),'ready image remains busy');
        // A pending image commit must not overwrite a newer text navigation.
        renderPresenterOutput(payload);
        renderPresenterOutput({...payload,index:1});
        for(let i=0;i<12;i++)await Promise.resolve();
        assert(root.querySelector('.is-active').textContent.includes('Latest'),'stale image overwrote text');
        assert(!root.querySelector('.is-entering,.is-exiting'),'transition was reintroduced');
      } finally {nextAnimationFrame=originalFrame;}
      return {result:'PASS projection reuse, edit/service invalidation, ready image without RAF waits, stale commit protection',frameWaits};
    }'''))
    page.close()


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ("chrome", "webkit"):
                browser = launch_chromium(p) if engine == "chrome" else p.webkit.launch()
                try:
                    run(browser, url)
                finally:
                    browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
