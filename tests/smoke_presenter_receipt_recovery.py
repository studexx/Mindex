from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def run(browser, url):
    context = browser.new_context()
    context.route('**/*supabase*/**', lambda route: route.abort())
    controller = context.new_page()
    controller.goto(url, wait_until='domcontentloaded')
    controller.wait_for_function("typeof reconcilePresenterTransportReceipt === 'function'")
    controller.evaluate('''() => {
      state.presenter.serviceId='receipt-test';
      state.presenter.outputStopAt=0;
      state.presenter.outputTransportVersion=1;
      markPresenterOutputConnected=()=>{};
      restorePresenterControllerSession=()=> 'restored';
      state.presenter.channel?.close();
      window.transport=new BroadcastChannel(PRESENTER_CHANNEL);
      transport.onmessage=event=>handlePresenterControllerMessage(event.data);
      window.sent=[];window.drop=false;window.throwSend=false;
      state.presenter.channel={postMessage(message){
        if(throwSend)throw new Error('closed channel');
        sent.push(message);if(!drop)transport.postMessage(message);
      }};
      const storage=safeStorageSet;
      safeStorageSet=(scope,key,value)=>drop&&key.startsWith(PRESENTER_STORAGE_KEY)
        ? true:storage(scope,key,value);
      window.fixture={serviceId:'receipt-test',serviceType:'sunday-afternoon',chromakey:true,
        slides:Array.from({length:4},(_,i)=>({id:'receipt:'+i,type:'title-assignee',
          title:'Receipt '+i,text:'Receipt '+i,elementType:'title_assignee',layout:'lower-bar-text'})),
        index:0,safetyBlank:false,updatedAt:Date.now()};
      publishPresenterPayload(fixture);
    }''')
    output = context.new_page()
    output.goto(url + '?output=presenter', wait_until='domcontentloaded')
    output.wait_for_function("document.querySelector('#presenterOutputRoot')?.textContent.includes('Receipt 0')")
    output.evaluate('''() => {
      window.renderCount=0;const render=renderPresenterOutput;
      renderPresenterOutput=(...args)=>{renderCount++;return render(...args)};
    }''')
    controller.evaluate('''() => {
      drop=true;publishPresenterPayload({...fixture,index:1,updatedAt:Date.now()});
    }''')
    output.wait_for_timeout(200)
    assert output.evaluate("document.querySelector('#presenterOutputRoot').textContent.includes('Receipt 0')")
    controller.evaluate('drop=false')
    output.wait_for_function("document.querySelector('#presenterOutputRoot').textContent.includes('Receipt 1')", timeout=5000)
    assert output.evaluate('renderCount') == 1
    sent = controller.evaluate('sent.length')
    output.wait_for_timeout(2200)
    assert controller.evaluate('sent.length') == sent, 'healthy heartbeat resent state'
    assert output.evaluate('renderCount') == 1, 'healthy heartbeat rerendered output'
    controller.evaluate('''() => {
      throwSend=true;publishPresenterPayload({...fixture,index:2,updatedAt:Date.now()});
      throwSend=false;
    }''')
    output.wait_for_function("document.querySelector('#presenterOutputRoot').textContent.includes('Receipt 2')")
    controller.evaluate('''() => {
      drop=true;
      publishPresenterPayload({...fixture,index:3,updatedAt:Date.now()});
      publishPresenterPayload({...fixture,index:0,updatedAt:Date.now()});
      drop=false;
    }''')
    output.wait_for_function("document.querySelector('#presenterOutputRoot').textContent.includes('Receipt 0')", timeout=5000)
    assert output.evaluate('renderCount') == 3, 'recovery replayed intermediate slides'
    print('PASS dropped delivery recovery, healthy heartbeat no-op, closed channel, latest move only')
    context.close()


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                print(engine, flush=True)
                run(browser, url)
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
