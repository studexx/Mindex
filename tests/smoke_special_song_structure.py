from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof buildPresenterCustomSlides === 'function'")
            result = page.evaluate('''() => {
              const results=[];
              for (const label of ['특송','봉헌특송','봉헌찬송']) {
                const special=label!=='봉헌찬송';
                const item={id:'fixture',label,raw_title:'테스트 곡',assignee:'찬양대',
                  _worshipSectionKey:label==='특송'?'special_song':'offering',
                  memo:JSON.stringify({inputMode:'manual_praise',elementType:'praise',
                    slides:['[Verse 1]\\n첫 줄\\n둘째 줄','[간주]','[Bridge]\\n마지막 줄']})};
                const section={sectionKey:item._worshipSectionKey,sectionLabel:label,sectionTitle:'테스트 곡'};
                const raw=buildPresenterCustomSlides(item,section,0);
                const slides=presenterSlidesWithSpecialSongTitle(item,section,raw,0,{type_id:'sunday-main'});
                const repeated=presenterSlidesWithSpecialSongTitle(item,section,slides,0,{type_id:'sunday-main'});
                const expected=special?['title-assignee','song-title','lyrics','blank','lyrics']:['title-assignee','lyrics','blank','lyrics'];
                if(JSON.stringify(slides.map(s=>s.type))!==JSON.stringify(expected)) throw Error(label+' sequence '+JSON.stringify(slides.map(s=>s.type)));
                if(repeated.length!==slides.length) throw Error('duplicate introduction');
                if(special && (slides[0].title!==label || slides[0].assignee!=='찬양대' || slides[1].sectionHeading)) throw Error(label+' heading');
                if(label==='봉헌특송' && slides.some(s=>s.outputContext==='clean')) throw Error('offering context changed');
                if(slides.find(s=>s.type==='blank').text!=='') throw Error('interlude text visible');
                results.push(label);
              }
              if(parsePresenterCustomSlideBlock('간주 후 다시 찬양').blank) throw Error('ordinary lyrics erased');
              return results;
            }''')
            print('PASS', result, 'intro/title/lyrics and interlude preservation')
            browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
