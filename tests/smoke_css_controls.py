"""Check shared theme tokens and section-editor layout at narrow widths."""

import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = start_local_app_server() if not args.url else (None, args.url)
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url, wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterSectionEditorItem === 'function'")
            page.evaluate("""() => {
              const service={id:'css-test', type_id:'sunday-main'};
              const items=[{id:'prayer',label:'공동기도',raw_title:'교회학교를 위해',assignee:'담당자',_origIndex:0},
                {id:'song',label:'찬양 1',raw_title:'찬양 제목',_origIndex:1}];
              const fixture=document.createElement('div'); fixture.id='cssFixture';
              fixture.innerHTML=`<div class="presenter-section-editor-layer"><section class="presenter-section-editor">
                <div class="presenter-section-editor-body"><div class="presenter-section-editor-list">
                ${items.map((item,i)=>renderPresenterSectionEditorItem(item,i,{service,sectionItems:items})).join('')}
                </div></div></section></div>
                <span class="svc-presenter-pin-track"></span><div class="cal-view"><span id="calTokenProbe" style="color:var(--cal-text)">달력</span></div>`;
              document.body.append(fixture); refreshIcons(fixture);
            }""")
            for theme in ('light','dark'):
                page.evaluate('(theme)=>document.body.dataset.theme=theme',theme)
                for width in (1440, 800, 390):
                    page.set_viewport_size({'width':width,'height':900})
                    result=page.evaluate("""() => {
                      const fixture=document.getElementById('cssFixture');
                      const rows=[...fixture.querySelectorAll('.presenter-section-editor-item')];
                      const pin=getComputedStyle(fixture.querySelector('.svc-presenter-pin-track'),'::after');
                      return {rowsFit:rows.every(row=>row.scrollWidth<=row.clientWidth+1),
                        fieldsFit:rows.every(row=>[...row.querySelectorAll('input,select,button')].every(el=>{
                          const r=el.getBoundingClientRect(),b=row.getBoundingClientRect();
                          return !r.width || r.left>=b.left-1 && r.right<=b.right+1;
                        })),
                        pinVisible:pin.backgroundColor!=='rgba(0, 0, 0, 0)',
                        calendarToken:Boolean(getComputedStyle(fixture.querySelector('.cal-view')).getPropertyValue('--cal-text').trim())};
                    }""")
                    assert all(result.values()), (theme,width,result)
                    print('PASS CSS controls',theme,width,flush=True)
            page.screenshot(path='/tmp/mindex-css-controls-mobile.png')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
