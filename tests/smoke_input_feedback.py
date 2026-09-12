"""Individual editor feedback; no live database writes."""
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page(viewport={'width': 1280, 'height': 720})
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url + '?output=presenter', wait_until='domcontentloaded')
                page.wait_for_function("typeof beginServiceInputFeedback === 'function'")
                print(engine, page.evaluate('''async () => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'feedback-fixture',type_id:'fixture'};
                  const item=normalizeServiceItem({id:'item-fixture',service_id:service.id,
                    label:'설교 제목',raw_title:'사랑으로 시작하다',
                    memo:serializeServiceItemMemo({elementType:'text'})},0);
                  state.services=[service]; state.serviceItems={[service.id]:[item]};
                  state.selectedServiceId=service.id;
                  presenterBoardSubgroupInputContexts=()=>[{service,item,index:0}];
                  const html=renderPresenterBoardSubgroupInputControls(service.id,{});
                  document.body.style.cssText='display:block;overflow:auto;background:var(--bg);color:var(--ink)';
                  document.body.innerHTML='<main style="padding:16px">'+html+'</main>';
                  refs.detailPane=document.querySelector('main');
                  const editor=document.querySelector('.svc-board-subgroup-control-item');
                  const field=editor.querySelector('input[data-service-item-field]');
                  check(field,'real editor field missing');
                  field.focus(); field.value='바꾼 제목'; markServiceInputFeedbackChanged(field);
                  check(editor.dataset.inputStatus==='modified','dirty feedback');
                  const snapshot=beginServiceInputFeedback(service.id,item.id);
                  check(editor.querySelector('button[data-service-item-commit]').disabled,'busy button');
                  check(!field.disabled && document.activeElement===field,'typing/focus blocked');
                  field.value='저장 중 새 입력';
                  finishServiceInputFeedback(snapshot,true);
                  check(editor.dataset.inputStatus==='modified','late input falsely saved');
                  check(field.value==='저장 중 새 입력','late input lost');
                  let next=beginServiceInputFeedback(service.id,item.id);
                  finishServiceInputFeedback(next,false);
                  check(editor.dataset.inputStatus==='error' && field.value==='저장 중 새 입력','failure lost input');
                  field.dataset.initialValue=field.value;
                  next=beginServiceInputFeedback(service.id,item.id);
                  finishServiceInputFeedback(next,true);
                  check(editor.dataset.inputStatus==='saved','success missing');
                  updateServiceItemField=()=>{};
                  resolveServiceSongSelectionBeforeSave=async()=>{};
                  resolveServiceScriptureBeforeSave=async()=>{};
                  serviceItemSongSelectionInvalid=()=>false;
                  serviceItemScriptureInputInvalid=()=>false;
                  saveServiceItemPatch=async()=>false;
                  check(await commitServiceItemInputs(service.id,0)===false,'false save reported success');
                  saveServiceItemPatch=async()=>true;
                  check(await commitServiceItemInputs(service.id,0)===true,'retry failed');
                  saveServiceItemPatch=async()=>{throw Error('offline')};
                  try {await commitServiceItemInputs(service.id,0)} catch(e) {}
                  check(editor.dataset.inputStatus==='error','exception feedback');
                  return 'PASS real editor, focus, late typing, failure, retry, return values';
                }'''))
                for width in [1280, 390]:
                    page.set_viewport_size({'width': width, 'height': 720})
                    page.screenshot(path=f'/private/tmp/mindex-input-{engine}-{width}.png')
                    assert page.evaluate('''() => [...document.querySelectorAll('input,button,[data-service-input-status]')]
                      .every(el=>{const r=el.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1})'''), 'editor overflow'
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
