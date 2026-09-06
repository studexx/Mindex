from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def run(browser, url):
    context = browser.new_context()
    context.route('**/*supabase*/**', lambda route: route.abort())
    controller = context.new_page()
    controller.goto(url, wait_until='domcontentloaded')
    controller.wait_for_function("typeof publishPresenterPayload === 'function'")
    output = context.new_page()
    output.goto(url + '?output=presenter', wait_until='domcontentloaded')
    output.wait_for_selector('#presenterOutputRoot', state='attached')
    output.evaluate('''() => {
      window.renders=[];
      const original=renderPresenterOutput;
      renderPresenterOutput=(payload,options)=>{window.renders.push(payload.index);return original(payload,options)};
    }''')
    controller.evaluate('''() => {
      state.presenter.channel?.close();
      window.transportChannel=new BroadcastChannel(PRESENTER_CHANNEL);
      window.sent=[];
      state.presenter.channel={postMessage(message){sent.push(message);transportChannel.postMessage(message)}};
      state.presenter.outputTransportVersion=1;
      window.fixture={serviceId:'transport-test',serviceType:'sunday-afternoon',chromakey:true,
        slides:Array.from({length:120},(_,i)=>({id:'test:'+i,type:'title-assignee',title:'Slide '+i,
          text:'Slide '+i+' '+'Test '.repeat(100),elementType:'title_assignee',layout:'lower-bar-text'})),
        index:0,safetyBlank:false,liveScripture:null,updatedAt:Date.now()};
      publishPresenterPayload(fixture);
    }''')
    output.wait_for_function('window.renders.includes(0)')
    output.wait_for_timeout(100)
    assert output.evaluate('window.renders.length') == 1, output.evaluate('window.renders')
    controller.evaluate('''() => {
      window.baseSnapshot=localStorage.getItem(PRESENTER_STORAGE_KEY);
      for(let i=1;i<=40;i++)publishPresenterPayload({...fixture,index:i,updatedAt:Date.now()});
    }''')
    output.wait_for_function('window.renders.at(-1) === 40')
    output.wait_for_timeout(100)
    result = controller.evaluate('''() => {
      const assert=(v,m)=>{if(!v)throw Error(m)};
      assert(localStorage.getItem(PRESENTER_STORAGE_KEY)===baseSnapshot,'full snapshot rewritten');
      assert(sent.slice(1).every(m=>m.type==='presenter-navigation'&&!('slides' in m.payload)),'full slides resent');
      assert(readPresenterStoredPayload().index===40,'restore lost current index');
      const fullBytes=JSON.stringify(sent[0]).length;
      const moveBytes=JSON.stringify(sent.at(-1)).length;
      assert(moveBytes<fullBytes/10,'navigation payload not reduced');
      return {fullBytes,moveBytes};
    }''')
    renders = output.evaluate('window.renders')
    assert renders == sorted(set(renders)) and renders[-1] == 40, renders
    # Reopening the output must restore the latest move, not the initial snapshot.
    output.reload(wait_until='domcontentloaded')
    output.wait_for_function("document.getElementById('presenterOutputRoot')?.textContent.includes('Slide 40')")
    controller.evaluate('''() => {
      fixture.slides[40].title='Edited title';
      fixture.slides[40].text='Edited title';
      publishPresenterPayload({...fixture,index:40,updatedAt:Date.now()});
      if(sent.at(-1).type!=='presenter-state')throw Error('in-place edit not sent');
    }''')
    output.wait_for_function("document.getElementById('presenterOutputRoot').textContent.includes('Edited title')")
    controller.evaluate('''() => {
      publishPresenterPayload({...fixture,index:4,updatedAt:Date.now()},{force:true});
      if(sent.at(-1).type!=='presenter-state')throw Error('forced resync failed');
      state.presenter.outputTransportVersion=0;
      publishPresenterPayload({...fixture,index:5,updatedAt:Date.now()});
      if(sent.at(-1).type!=='presenter-state')throw Error('legacy output compatibility');
      const valid=readPresenterStoredPayload();
      localStorage.setItem(PRESENTER_NAVIGATION_STORAGE_KEY,'{broken');
      if(readPresenterStoredPayload().index!==valid.index)throw Error('corrupt navigation erased snapshot');
    }''')
    # Do not restart an already-loading video while preparing its first frame.
    controller.evaluate('''async () => {
      let loads=0;
      const video=new EventTarget();
      Object.assign(video,{autoplay:false,readyState:0,networkState:HTMLMediaElement.NETWORK_LOADING,load(){loads++}});
      const ready=preparePresenterOutputVideoForPaint(video);
      video.dispatchEvent(new Event('loadeddata'));
      await ready;
      if(loads)throw Error('loading video restarted');
    }''')
    print('PASS dual-channel deduplication, compact moves, reload, edits, legacy output, video:', result)
    context.close()


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            run(browser, url)
            browser.close()
            browser = p.webkit.launch()
            run(browser, url)
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
