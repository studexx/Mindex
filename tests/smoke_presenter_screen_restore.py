import argparse
import json
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def run(browser, url, engine):
    for mode in ('granted', 'saved', 'prompt', 'denied', 'unsupported', 'error', 'pending', 'electron'):
        context = browser.new_context()
        context.route('**/*supabase*/**', lambda route: route.abort())
        context.add_init_script('window.screenTestMode=' + json.dumps(mode) + ';' + '''
          window.screenCalls=0;window.permissionCalls=0;
          const primary={availLeft:0,availTop:0,availWidth:1440,availHeight:900,isPrimary:true};
          const external={availLeft:1440,availTop:0,availWidth:1920,availHeight:1080,isPrimary:false};
          window.testScreenDetails=new EventTarget();
          testScreenDetails.screens=[primary,external];testScreenDetails.currentScreen=primary;
          if(screenTestMode==='saved') localStorage.setItem('mindex.presenter.targetScreen.v1','0:0:1440:900:primary');
          Object.defineProperty(navigator,'permissions',{configurable:true,value:{query:async()=>{
            permissionCalls++;
            if(screenTestMode==='error') throw new Error('unsupported permission');
            return {state:['prompt','denied'].includes(screenTestMode)?screenTestMode:'granted'};
          }}});
          window.getScreenDetails=screenTestMode==='unsupported'?undefined:async()=>{
            screenCalls++;
            if(screenTestMode==='pending') return new Promise(()=>{});
            return testScreenDetails;
          };
          if(screenTestMode==='electron') window.mindexElectron={getPresenterDisplays:async()=>{
            screenCalls++;return {displays:[{...primary,isCurrent:true},external]};
          }};
        ''')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='domcontentloaded')
        page.wait_for_function("typeof requestPresenterScreens==='function' && !document.body.classList.contains('ui-booting')")
        page.wait_for_timeout(100)
        expected = mode in ('granted', 'saved', 'electron')
        if expected:
            page.wait_for_function('state.presenter.screens.length===2')
            assert page.evaluate('resolvePresenterTargetScreenRect().left') == (0 if mode == 'saved' else 1440)
        else:
            assert page.evaluate('state.presenter.screens.length') == 0
        assert page.evaluate('screenCalls') == (1 if expected or mode == 'pending' else 0)
        # Exercise the real launch path with only transport/window side effects stubbed.
        launch = page.evaluate('''() => {
          preparePresenterService=()=>{};publishPresenterState=()=>{};
          renderPresenterControlState=()=>{};startPresenterOutputWindowMonitor=()=>{};
          hydratePresenterOutputInBackground=()=>{};presenterOutputWindowRef=()=>null;
          isPresenterOutputHeartbeatOpen=()=>false;
          window.opened=[];window.toasts=[];showToast=(...args)=>toasts.push(args);
          window.open=(url,name,features)=>{opened.push(features);return {focus(){},addEventListener(){},closed:false};};
          openPresenterOutput('screen-fixture');
          return {count:opened.length,features:opened[0]};
        }''')
        assert launch['count'] == 1, (mode, 'launch waited for detection')
        if expected:
            assert ('left=0' if mode == 'saved' else 'left=1440') in launch['features']
        else:
            assert 'left=' not in launch['features']
        if mode == 'granted':
            page.evaluate('''() => {
              testScreenDetails.screens=[testScreenDetails.screens[0]];
              testScreenDetails.dispatchEvent(new Event('screenschange'));
            }''')
            assert page.evaluate('state.presenter.screens.length') == 1
            assert page.evaluate('opened.length') == 1, 'display change reopened output'
            assert page.evaluate('toasts.length') == 0
        if mode == 'prompt':
            page.evaluate('requestPresenterScreens()')
            assert page.evaluate('screenCalls') == 1, 'explicit detection must remain available'
        assert not errors, errors
        print('PASS screens', engine, mode, flush=True)
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                try:
                    run(browser, url, engine)
                finally:
                    browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
