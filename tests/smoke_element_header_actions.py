from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ("chrome", "webkit"):
                browser = launch_chromium(p) if engine == "chrome" else p.webkit.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 900})
                page.route("**/*supabase*/**", lambda r: r.abort())
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("typeof renderPresenterBoardSubgroup === 'function'")
                print(engine, page.evaluate("""async () => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'header-fixture',type_id:'fixture'};
                  const item=normalizeServiceItem({id:'item-fixture',service_id:service.id,
                    label:'설교 제목',raw_title:'사랑으로 시작하다',
                    memo:serializeServiceItemMemo({elementType:'text'})},0);
                  state.services=[service];state.serviceItems={[service.id]:[item]};
                  state.selectedServiceId=service.id;
                  const context={service,item,index:0};
                  presenterBoardSubgroupInputContexts=()=>[context];
                  presenterBoardSubgroupItemContext=()=>context;
                  presenterBoardSubgroupDisplay=()=>({label:'설교 제목',title:'사랑으로 시작하다'});
                  renderPresenterSlideThumb=()=>'';
                  const host=document.createElement('main');
                  host.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--bg);padding:16px;overflow:auto';
                  document.body.append(host);
                  serviceItemSupportsHeaderAudio=()=>true;
                  for(const width of [320,600,960]){
                    host.style.width=width+'px';
                    host.innerHTML=renderPresenterBoardSubgroup({slides:[{slide:{sectionLabel:'설교 제목'},slideIndex:0}],name:'설교 제목'},0,service.id,{showHead:true});
                    const head=host.querySelector('.svc-board-subgroup-head-row');
                    const editor=host.querySelector('.svc-board-subgroup-control-item');
                    const button=head.querySelector('[data-service-item-commit]');
                    check(button,'missing header save');
                    check(!editor.querySelector('[data-service-item-commit]'),'duplicate save');
                    check(head.querySelector('[data-service-item-audio-file]'),'missing header audio');
                    const field=editor.querySelector('[data-service-item-field]');
                    field.focus();field.value='수정한 제목';markServiceInputFeedbackChanged(field);
                    check(head.querySelector('[data-service-input-status]').textContent==='수정됨','dirty feedback');
                    const snapshots=beginServiceInputFeedback(service.id,item.id);
                    check(button.disabled,'save not disabled');
                    check(document.activeElement===field,'focus lost');
                    finishServiceInputFeedback(snapshots,false);
                    check(!button.disabled && head.querySelector('[data-service-input-status]').textContent==='저장 실패','failure feedback');
                    const h=head.getBoundingClientRect(),b=button.getBoundingClientRect(),e=editor.getBoundingClientRect();
                    check(b.left>=h.left-1 && b.right<=h.right+1 && b.bottom<=e.top+1,'header collision');
                  }
                  for(const [name,type,expected] of [
                    ['photo.JPG','','image'],['clip.MP4','','video'],['sound.MP3','','audio'],
                    ['recording','audio/wav','audio'],['file.txt','','']
                  ])check(presenterReferenceMediaKindForFile({name,type})===expected,'file inference '+name);
                  const assetItem={id:'asset-fixture',label:'참고 화면',_worshipSectionKey:'announcements',
                    memo:serializeServiceItemMemo({elementType:'image',inputMode:'asset',asset:{kind:'image'}})};
                  currentServiceItemForMutation=()=>assetItem;
                  getServiceItems=()=>[assetItem];
                  markServiceElementDirty=()=>{};
                  saveServiceItemMutation=async()=>true;
                  renderCurrentServiceModuleDetail=()=>{};
                  renderServiceList=()=>{};
                  state.client={storage:{from:()=>({upload:async()=>({}),
                    getPublicUrl:()=>({data:{publicUrl:'https://example.test/clip.mp4'}})})}};
                  check(await uploadPresenterReferenceMediaAsset({file:new File(['fixture'],'clip.MP4'),serviceId:service.id,item:assetItem}),'upload failed');
                  const uploaded=parseServiceItemMemo(assetItem.memo);
                  check(uploaded.elementType==='video' && uploaded.asset.kind==='video','uploaded type not updated');
                  return 'PASS header placement, save feedback, focus, file type detection';
                }"""), flush=True)
                page.screenshot(path=f"/tmp/element-header-{engine}.png")
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
