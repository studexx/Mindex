from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url, wait_until='domcontentloaded')
                page.wait_for_function("typeof handleSaveShortcut === 'function'")
                print(engine, page.evaluate('''async () => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const original=saveAll;
                  let calls=0;
                  saveAll=async()=>{calls++};
                  const field=document.createElement('textarea');
                  document.body.append(field);
                  field.addEventListener('keydown',e=>e.stopPropagation());
                  field.focus();
                  for(const options of [{key:'s',metaKey:true},{key:'s',ctrlKey:true},{key:'ㄴ',code:'KeyS',metaKey:true}]) {
                    const before=calls;
                    const e=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...options});
                    field.dispatchEvent(e);
                    check(calls===before+1,'save shortcut lost or duplicated');
                    check(e.defaultPrevented,'browser save not prevented');
                  }
                  for(const options of [{key:'s'},{key:'s',metaKey:true,altKey:true},{key:'s',metaKey:true,shiftKey:true},{key:'s',metaKey:true,repeat:true}]) {
                    const before=calls;
                    field.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...options}));
                    check(calls===before,'unintended save');
                  }
                  saveAll=original;
                  state.module='presenter';
                  state.selectedServiceId='shortcut-fixture';
                  state.services=[{id:'shortcut-fixture'}];
                  state.dirty.service=false;
                  state.saving=false;
                  presenterViewServiceId=()=>state.selectedServiceId;
                  let saved='';
                  saveService=async id=>{saved=id;return true};
                  check(await saveAll()===true && saved==='shortcut-fixture','clean flag skipped pending input commit');
                  field.remove();
                  return 'PASS capture routing, Korean key, Ctrl/Cmd, repeat guard, pending-input save routing';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
