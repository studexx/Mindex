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
            page.wait_for_function("typeof serviceSidebarChildItemDisplayText === 'function'")
            result=page.evaluate('''() => {
              const form={part_type:'Verse',part_number:1,lyrics:'테스트 가사'};
              const song={id:'fixture',title:'구주의 십자가 보혈로',hymn_no:'250',versions:[
                {id:'new',name:'새찬송가',hymn_no:'250',is_primary:true,forms:[form]},
                {id:'old',name:'통일 182 구주의 십자가 보혈로',hymn_no:'통 182',forms:[form]}]};
              state.songs=[song];clearSearchCaches();
              const item={id:'item',label:'찬양 2',raw_title:'250 구주의 십자가 보혈로',song_id:song.id};
              const results=['new','old'].map(version_id=>{
                const current={...item,version_id};
                const before=JSON.stringify(current);
                const sidebar=serviceSidebarChildItemDisplayText(current);
                const output=presenterSongTitleDisplayTitle(song,getPresenterServiceItemVersion(song,current,null),current.raw_title);
                if(JSON.stringify(current)!==before) throw Error('item mutated');
                return {sidebar,output};
              });
              return {results,manual:serviceSidebarChildItemDisplayText({label:'특송',raw_title:'직접 입력 곡'})};
            }''')
            assert result['results']==[
                {'sidebar':'250 구주의 십자가 보혈로','output':'250 구주의 십자가 보혈로'},
                {'sidebar':'통 182 구주의 십자가 보혈로','output':'통 182 구주의 십자가 보혈로'}],result
            assert result['manual']=='직접 입력 곡',result
            print('PASS sidebar matches selected hymn version; source fields retained')
            browser.close()
    finally:
        if server: server.shutdown()


if __name__=='__main__': main()
