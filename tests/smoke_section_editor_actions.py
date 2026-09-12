from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chrome', 'webkit'):
                browser = launch_chromium(p) if engine == 'chrome' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda route: route.abort())
                page.goto(url, wait_until='domcontentloaded')
                page.wait_for_function("typeof runPresenterSectionItemAction === 'function'")
                result = page.evaluate('''() => {
                  const service={id:'section-action-fixture',type_id:'sunday-second',date:'2026-09-13'};
                  state.services=[service]; state.serviceItems[service.id]=[];
                  state.selectedServiceId=service.id;
                  renderCurrentServiceModuleDetail=()=>{};renderServiceList=()=>{};
                  refreshPresenterForService=()=>{};updateSaveState=()=>{};
                  const target=servicePrepEditorItems(service.id).find(isMainPraiseServiceItem);
                  if(!target) throw Error('No praise fixture');
                  state.presenterSectionEditor={serviceId:service.id,itemId:target.id,sectionKey:''};
                  state.module='presenter';
                  const clickAction=action=>{
                    refs.detailPane.innerHTML=renderPresenterSectionEditorLayer(service);
                    const current=servicePrepEditorItems(service.id).find(item=>item.id===target.id);
                    const button=refs.detailPane.querySelector(`[data-presenter-section-item-action="${action}"][data-service-item-index="${current._origIndex}"]`);
                    if(!button || button.disabled) throw Error('Unavailable action: '+action);
                    button.click();
                  };
                  const order=()=>presenterSectionEditorContext(service).sectionItems.map(item=>item.id);
                  const before=order();
                  clickAction('down');
                  if(order().indexOf(target.id)!==before.indexOf(target.id)+1) throw Error('Move down failed');
                  clickAction('up');
                  if(JSON.stringify(order())!==JSON.stringify(before)) throw Error('Move up failed');
                  clickAction('toggle-visibility');
                  const hidden=getServiceItems(service.id).find(item=>item.id===target.id);
                  if(!parseServiceItemMemo(hidden.memo).hiddenInPresentation) throw Error('Visibility lost');
                  clickAction('delete');
                  for(let i=0;i<3;i++) {
                    if(getServiceItems(service.id).some(item=>item.id===target.id)) throw Error('Deleted item returned');
                  }
                  const suppression=state.templateElementSuppressions.get(target.id);
                  if(!suppression || !isTemplateSuppressedServiceItem(suppression)) throw Error('Missing suppression');
                  return {moved:true,hidden:true,deleted:true,suppression:true};
                }''')
                print('PASS section editor', engine, result)
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
