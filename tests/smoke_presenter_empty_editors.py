from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof presenterBoardEntries === 'function'")
            result = page.evaluate('''() => {
              const assert = (test, message) => { if (!test) throw Error(message); };
              const service = {id:'empty-editors-test',type_id:'sunday-afternoon'};
              const items = [
                {id:'before',label:'대표기도',raw_title:'기도',sort_order:1},
                {id:'special',label:'특송',raw_title:'',sort_order:2,
                  memo:serializeServiceItemMemo({elementType:'praise',inputMode:'text'})},
                {id:'reference',label:'참고 화면',raw_title:'',sort_order:3,
                  _worshipSectionKey:'announcements',
                  memo:serializeServiceItemMemo({elementType:'image',componentType:'image',inputMode:'asset',asset:{kind:'image',name:'',url:''}})},
                {id:'after',label:'축도',raw_title:'축도',sort_order:4},
              ];
              const originalOutline = getServiceOutlineItems;
              const originalItems = getServiceItems;
              const originalServices = state.services;
              try {
                getServiceOutlineItems = () => items;
                getServiceItems = () => items;
                state.services = [service];
                const slideFor = item => ({...presenterSectionForServiceItem(item,0,item.raw_title),
                  id:item.id+':title',type:'title-assignee',title:item.label,text:item.raw_title});
                const slides = [slideFor(items[0]),slideFor(items[3])];
                const before = JSON.stringify(slides);
                const groups = groupPresenterSlidesBySection(slides,service.id);
                const entries = groups.flatMap(g => g.slides);
                assert(entries.map(e=>e.slide.elementId).join(',') === 'before,special,reference,after', 'source order');
                assert(JSON.stringify(slides) === before, 'output slides mutated');
                assert(entries.filter(e=>e.slideIndex>=0).map(e=>e.slideIndex).join(',') === '0,1', 'output indexes changed');
                for (const id of ['special','reference']) {
                  const group = groups.find(g=>g.slides.some(e=>e.slide.elementId===id));
                  const html = renderPresenterBoardSection(group,-1,service.id);
                  const root = document.createElement('div');
                  root.innerHTML = html;
                  assert(root.querySelector('[data-service-element-id="'+id+'"]'), id+' editor missing');
                  assert(root.querySelector('input, textarea, select'), id+' fields missing');
                  assert(!root.querySelector('.svc-board-subgroup.active'), id+' false active');
                  assert(!root.querySelector('.svc-board-grid').textContent.trim(), id+' phantom thumbnail');
                  assert(root.querySelector('.svc-board-subgroup-head').disabled, id+' invalid jump');
                  assert(renderDeferredPresenterBoardSection(group,service.id,0).includes('data-service-element-id="'+id+'"'),id+' deferred editor missing');
                }
                const populated = [...slides.slice(0,1),slideFor(items[1]),slideFor(items[2]),slides[1]];
                assert(!presenterBoardEntries(populated,service).some(e=>e.slide.controllerEditorOnly),'duplicate editors after content resolves');
                const empty = presenterBoardEntries([],service);
                assert(empty.length===items.length,'all-empty service lost editors');
                return 'Empty special/reference editors, order, hydration and unchanged output verified';
              } finally {
                getServiceOutlineItems = originalOutline;
                getServiceItems = originalItems;
                state.services = originalServices;
              }
            }''')
            print('PASS:', result)
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
