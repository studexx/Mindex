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
                    renderPresenterServicePraiseInput({id:'song',label:'찬양 1',raw_title:'주 은혜임을',memo:''},3,{...model,showTitle:true,song:true,strictSong:true,titlePlaceholder:'곡명',parsed:{}})];
                  document.body.innerHTML='<main id="fixture" style="margin:24px;width:960px">'+blocks.map((html,i)=>
                    '<h2 style="font-size:16px">'+['특송','설교 본문','광고','찬양'][i]+'</h2><div class="svc-board-subgroup-controls"><div class="svc-board-subgroup-control-item">'+html+
                    '<div class="svc-board-subgroup-flow"><button class="reference-new-btn svc-board-subgroup-commit" type="button">반영</button></div></div></div>').join('')+'</main>';
                }''')
                for width in [960, 600, 320]:
                    page.evaluate("w=>document.getElementById('fixture').style.width=w+'px'", width)
                    page.wait_for_timeout(100)
                    result = page.evaluate('''() => {
                      const errors=[];
                      for(const group of document.querySelectorAll('.svc-board-subgroup-controls')) {
                        const g=group.getBoundingClientRect();
                        const controls=[...group.querySelectorAll('input,textarea,select,button')].filter(n=>n.getBoundingClientRect().height);
                        for(const n of controls){const r=n.getBoundingClientRect();if(r.left<g.left-1||r.right>g.right+1)errors.push('overflow '+n.outerHTML.slice(0,80))}
                        for(const label of group.querySelectorAll('label.svc-presenter-input-field')){
                          const span=label.querySelector(':scope > span'),field=label.querySelector('input,textarea');
                          if(span&&field&&field.getBoundingClientRect().height){if(span.getBoundingClientRect().right>field.getBoundingClientRect().left+1)errors.push('label overlaps')}
                        }
                        const flow=group.querySelector('.svc-board-subgroup-flow').getBoundingClientRect();
                        for(const n of controls.filter(n=>n.tagName!=='BUTTON'))if(n.getBoundingClientRect().bottom>flow.top+1)errors.push('actions overlap');
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
