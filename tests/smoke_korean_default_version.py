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
            page.wait_for_function("typeof buildNewPraiseSongDraft === 'function'")
            result=page.evaluate('''() => {
              const draft=buildNewPraiseSongDraft({title:'테스트',praiseTypes:['ccm']});
              const old={id:'song',title:'테스트',memo:JSON.stringify({versions:[{id:'version',name:'Default',forms:[]}]})};
              const song=normalizeServerSong(old);
              const roundtrip=normalizeServerSong({...old,memo:serializeSongMemo(song)});
              const previousSelected=getSelectedSong;
              const previousUpdateSaveState=updateSaveState;
              updateSaveState=()=>{};
              getSelectedSong=()=>song;
              for (const name of ['Default','default','버전 1','Default Remix','']) {
                updateVersionNameField({dataset:{versionNameField:'version'},value:name});
                const expected=name || '기본';
                const loaded=normalizeServerSong({...old,memo:serializeSongMemo(song)});
                if (song.versions[0].name!==expected || loaded.versions[0].name!==expected)
                  throw new Error('Version name changed: '+name);
              }
              getSelectedSong=previousSelected;
              updateSaveState=previousUpdateSaveState;
              return {draft:draft.versions[0].name, raw:draft.versions[0].raw_section_name,
                imported:roundtrip.versions[0].name, saved:roundtrip.versions[0].name,
                id:roundtrip.versions[0].id,
                fallback:normalizeServerSong({id:'empty',title:'빈 곡'}).versions[0].name,
                labels:['Default','default',' DEFAULT ','기본',''].map(displayVersionName),
                custom:displayVersionName('Default Remix')};
            }''')
            assert result=={'draft':'기본','raw':'기본','imported':'Default','saved':'Default','id':'version',
                'fallback':'기본','labels':['Default','default','DEFAULT','기본','기본'],'custom':'Default Remix'}, result
            print('PASS explicit names survive editing and save roundtrip; empty/new names use Korean default')
            browser.close()
    finally:
        if server: server.shutdown()


if __name__=='__main__':
    main()
