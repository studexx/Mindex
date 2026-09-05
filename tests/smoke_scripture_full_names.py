import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--url')
    args=parser.parse_args()
    server,url=(None,args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            browser=launch_chromium(p)
            page=browser.new_page()
            page.route('**/*supabase*/**',lambda r:r.abort())
            page.goto(url+'?output=presenter',wait_until='domcontentloaded')
            page.wait_for_function("typeof formatServiceScriptureReferenceList === 'function'")
            result=page.evaluate('''() => {
              const names=['삼상 18:27-30','사무엘상 18:27-30','마23:1','23:1마','요 3:16'].map(formatServiceScriptureReferenceList);
              const ref=parseBibleReference('삼상 18:27-30');
              const item={id:'full-name-test',label:'설교 본문',raw_title:'삼상 18:27-30',memo:JSON.stringify({
                scriptureReferences:['삼상 18:27-30'],
                scriptureReferencePayloads:[{reference:'삼상 18:27-30',manualScripture:{verses:[{number:27,text:'본문 유지 확인'}]}}]
              })};
              const slides=buildPresenterScriptureTextSlides(item,{sectionTitle:'설교',sectionLabel:'설교'},0);
              return {names,parts:serviceScriptureReferenceParts(ref),
                slides:slides.map(slide=>({title:slide.title,book:slide.referenceBook,text:slide.text})),
                roundtrip:Object.entries(KOREAN_BIBLE_BOOK_NAMES).filter(([code,name]) => parseBibleReference(`${name} 1:1`)?.book.code !== code),
                sidebar:serviceSidebarChildItemDisplayText({label:'설교 본문',raw_title:'삼상 18:27-30'}),
                multiple:formatServiceScriptureReferenceList('삼상 18:27; 삼상 18:30; 요 3:16'),
                keys:[normalizeServiceScriptureReferenceKey('삼상 18:27-30'),normalizeServiceScriptureReferenceKey('사무엘상 18:27-30')],
                inline:normalizeServiceItemReferenceSpacing('요 3:16'),
                unknown:normalizeServiceItemReferenceSpacing('입력 중인 제목')};
            }''')
            assert result['names']==['사무엘상 18:27–30','사무엘상 18:27–30','마태복음 23:1','마태복음 23:1','요한복음 3:16'],result
            assert result['parts']['referenceBook']=='사무엘상',result
            assert result['roundtrip']==[],result
            assert result['sidebar']=='사무엘상 18:27–30',result
            assert len(result['slides'])==1,result
            assert result['slides'][0]['title']=='사무엘상 18:27–30',result
            assert result['slides'][0]['book']=='사무엘상',result
            assert '본문 유지 확인' in result['slides'][0]['text'],result
            assert result['multiple']=='사무엘상 18:27, 30; 요한복음 3:16',result
            assert result['keys'][0]==result['keys'][1],result
            assert result['inline']=='요한복음 3:16' and result['unknown']=='입력 중인 제목',result
            print('PASS full book names: abbreviations, reversed input, multiple references, stable lookup keys')
            browser.close()
    finally:
        if server: server.shutdown()


if __name__=='__main__': main()
