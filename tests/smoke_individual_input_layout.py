from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url, wait_until='domcontentloaded')
                page.wait_for_function("typeof renderPresenterServiceTextInputs === 'function'")
                page.evaluate(r'''() => {
                  const service={id:'ui-fixture',type_id:'sunday-main'};
                  const model={service,assigneeValue:'할렐루야 찬양대',showAssignee:true};
                  const special={id:'special',label:'특송',raw_title:'나 이제 주님의 새 생명 얻은 몸',memo:JSON.stringify({inputMode:'manual_praise',slides:['첫 번째 가사','두 번째 가사']})};
                  const scripture={id:'scripture',label:'설교 본문',raw_title:'요한복음 3:16',memo:''};
                  const announcement={id:'notice',label:'청소년부 광고',raw_title:'환영합니다.\n\n다음 주 모임 안내',memo:''};
                  const blocks=[renderPresenterServiceTextInputs(special,0,model,parseServiceItemMemo(special.memo)),
                    renderPresenterServiceScriptureInput(scripture,1,{}),
                    renderPresenterServiceTextInputs(announcement,2,model,{}),
                    renderPresenterServicePraiseInput({id:'song',label:'찬양 1',raw_title:'나를 사랑하는 주님',version_id:'v1',memo:''},3,{...model,showAssignee:false,showTitle:true,song:true,strictSong:true,titlePlaceholder:'곡명',parsed:{},linkedSong:{id:'linked',title:'나를 사랑하는 주님'},songVersions:[{id:'v1',name:'기본'},{id:'v2',name:'다른 버전'}]}),
                    renderPresenterMonthlyCorporatePrayerInputs({label:'공동기도 3·4'},4,{corporatePrayers:[{title:'치유와 회복을 위해',assignee:'유혜경 집사'},{title:'교회학교를 위해',assignee:'유정희 권사'}]},service.id)];
                  document.body.innerHTML='<main id="fixture" style="margin:24px;width:960px">'+blocks.map((html,i)=>
                    '<h2 style="font-size:16px">'+['특송','설교 본문','광고','찬양','공동기도 3·4'][i]+'</h2><div class="svc-board-subgroup-controls"><div class="svc-board-subgroup-control-item">'+html+
                    '<div class="svc-board-subgroup-flow"><button class="reference-new-btn svc-board-subgroup-commit" type="button">반영</button></div></div></div>').join('')+'</main>';
                }''')
                for width in [960, 600, 320]:
                    page.evaluate("w=>document.getElementById('fixture').style.width=w+'px'", width)
                    page.wait_for_timeout(100)
                    result = page.evaluate('''() => {
                      const errors=[];
                      const song=document.querySelector('.svc-presenter-input-field--song');
                      if(song && song.getBoundingClientRect().width>800) {
                        const fields=[...song.querySelectorAll('input,select')].filter(n=>n.getBoundingClientRect().height);
                        if(fields.some(n=>Math.abs(n.getBoundingClientRect().top-fields[0].getBoundingClientRect().top)>2))errors.push('linked song forced extra rows');
                      }
                      for(const row of document.querySelectorAll('.svc-presenter-input-group--corporate-prayer > label')) {
                        const fields=[...row.querySelectorAll('input')].map(n=>n.getBoundingClientRect());
                        if(row.getBoundingClientRect().width>480 && Math.abs(fields[0].top-fields[1].top)>1)errors.push('prayer row wraps unnecessarily');
                        if(fields[0].top===fields[1].top && fields[0].right>fields[1].left)errors.push('prayer fields overlap');
                      }
                      for(const group of document.querySelectorAll('.svc-board-subgroup-controls')) {
                        const g=group.getBoundingClientRect();
                        const controls=[...group.querySelectorAll('input,textarea,select,button')].filter(n=>n.getBoundingClientRect().height);
                        for(const n of controls){const r=n.getBoundingClientRect();if(r.left<g.left-1||r.right>g.right+1)errors.push('overflow '+n.outerHTML.slice(0,80))}
                        for(const label of group.querySelectorAll('label.svc-presenter-input-field')){
                          const span=label.querySelector(':scope > span'),field=label.querySelector('input,textarea');
                          if(span) {
                            const range=document.createRange();range.selectNodeContents(span);
                            if(span.getBoundingClientRect().width-range.getBoundingClientRect().width>2)errors.push('label has fixed empty width');
                          }
                          if(span&&field&&field.getBoundingClientRect().height){if(span.getBoundingClientRect().right>field.getBoundingClientRect().left+1)errors.push('label overlaps')}
                        }
                        const flow=group.querySelector('.svc-board-subgroup-flow').getBoundingClientRect();
                        for(const n of controls.filter(n=>n.tagName!=='BUTTON')) {
                          const r=n.getBoundingClientRect();
                          if(Math.min(r.right,flow.right)-Math.max(r.left,flow.left)>1 && Math.min(r.bottom,flow.bottom)-Math.max(r.top,flow.top)>1)errors.push('actions overlap');
                        }
                        if(innerWidth>1000 && g.width>900 && group.querySelectorAll('textarea').length===0) {
                          const first=controls[0]?.getBoundingClientRect();
                          if(first && Math.abs(flow.top-first.top)>2)errors.push('unnecessary action row');
                        }
                      }
                      return errors;
                    }''')
                    assert not result, (engine, width, result)
                    if width in [960, 320]:
                        page.locator('#fixture').screenshot(path=f'/tmp/individual-inputs-{engine}-{width}.png')
                page.locator('textarea[data-service-item-field="raw_title"]').fill('빈 줄\n\n유지')
                assert page.locator('textarea[data-service-item-field="raw_title"]').input_value() == '빈 줄\n\n유지'
                print('PASS', engine, '960/600/320px labels, containment, actions and multiline input')
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
