from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page()
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url + '?output=presenter', wait_until='domcontentloaded')
                page.wait_for_function("typeof withPresenterElementTrailingBlanks === 'function'")
                print(engine, page.evaluate('''() => {
                  const check=(v,m)=>{if(!v)throw Error(m)};
                  const service={id:'example-fixture',type_id:'sunday-second'};
                  state.services=[service];
                  for(const mode of ['score_db','lyrics_db']) {
                    const examples=Array.from({length:10},(_,i)=>presenterPreparationPlaceholderLinesForItem(
                      {label:i<6?`찬양 ${i+1}`:['봉헌찬송','특송','기도찬양','송영'][i-6]},service,
                      {mode,memo:{inputMode:mode},model:{},exampleIndex:i})[0]);
                    const titles=examples.map(line=>line.split(': ')[1].split(' / ')[0]);
                    check(new Set(titles).size===10,'duplicate '+mode+' examples');
                    check(parsePresenterPreparationInput(examples.join('\\n')).errors.length===0,'example grammar');
                  }
                  const item={id:'welcome',label:'환영',raw_title:'찬양\\n찬양단',_worshipSectionKey:'praise'};
                  const section={sectionKey:'praise',sectionId:'praise',elementId:'welcome'};
                  const intro=presenterElementSlideFromMemoCore(item,section,0,{elementType:'title_content'},item.raw_title,service);
                  check(intro._praiseIntroSlide && !intro.skipTrailingBlank,'welcome suppression remains');
                  const song={id:'song',elementId:'song',sectionKey:'praise',type:'lyrics',text:'가사',layout:'lower_bar_text'};
                  const slides=withPresenterElementTrailingBlanks([intro,song],service);
                  check(slides[1].autoTrailingBlank && slides[1].type==='blank','welcome blank missing');
                  check(slides[1].elementId==='welcome','blank belongs to wrong element');
                  check(!slides[1].text && !slides[1].bodyText && !slides[1].assignee,'blank retains visible text');
                  check(slides[2]===song,'song order changed');
                  check(withPresenterElementTrailingBlanks(slides,service).length===slides.length,'duplicate blanks');
                  return 'PASS distinct score/lyric examples, parse, welcome blank, empty payload, order, idempotence';
                }'''))
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
