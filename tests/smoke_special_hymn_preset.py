import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof presenterSpecialSongHymnFormPreset === 'function'")
            result = page.evaluate('''() => {
              const assert=(test,message)=>{if(!test)throw Error(message)};
              const song={hymn_no:'304',title:'찬송가'};
              const form=(id,type,number)=>({id,part_type:type,part_number:number,lyrics:id+' 가사',sort_order:number||10});
              const all=[form('v1','Verse',1),form('v2','Verse',2),form('v3','Verse',3),form('v4','Verse',4),form('c','Chorus',1),form('coda','Coda',1)];
              const cases=[];
              for(const label of ['특송','봉헌특송']) {
                const item={id:'test',label,_worshipSectionKey:label==='특송'?'special_song':'offering'};
                const preset=presenterSpecialSongHymnFormPreset(item,song,{});
                assert(preset.hint==='V1-C-V2-C-Int-VL-C-Coda','default hint');
                for(const [name,forms,expected] of [
                  ['all',all,['v1','c','v2','c','Int','v4','c','coda']],
                  ['no-coda',all.filter(f=>f.id!=='coda'),['v1','c','v2','c','Int','v4','c']],
                  ['no-chorus',all.filter(f=>f.id!=='c'),['v1','v2','Int','v4','coda']],
                  ['one-verse',[all[0]],['v1','Int','v1']],
                ]) {
                  const plan=presenterFormPlanForServiceItem({forms},item,song);
                  const actual=plan.forms.map(f=>f._presenterBlank?'Int':f.id);
                  assert(JSON.stringify(actual)===JSON.stringify(expected),label+' '+name+': '+JSON.stringify(actual));
                  assert(!plan.warnings.length,'optional forms warned');
                  cases.push(label+' '+name);
                }
              }
              for(const parse of [normalizePresenterFormPresetLabel,normalizeSongFormPresetLabel]) {
                assert(parse('VL').lastVerse && parse('vl').lastVerse,'VL alias');
                assert(parse('Int').type==='instrumental','Int alias');
                assert(parse('V1L').group==='L' || parse('V1L').group==='l','numbered group preserved');
              }
              const when={songType:'hymn'};
              for(const forms of [LEGACY_PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS,PREVIOUS_PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS]) {
                const preset={forms,hint:forms.join('-'),strength:'default'};
                const upgraded=normalizeServiceFormPresetRulePreset(preset,when);
                assert(upgraded.hint==='V1-C-V2-C-Int-VL-C-Coda','saved default migration');
                const manual={...preset,strength:'manual'};
                assert(normalizeServiceFormPresetRulePreset(manual,when)===manual,'manual rule changed');
              }
              const custom={forms:['V1','C2','V2'],strength:'default'};
              assert(normalizeServiceFormPresetRulePreset(custom,when)===custom,'custom rule changed');
              assert(presenterSpecialSongHymnFormPreset({label:'찬양 1'},song,{})===null,'ordinary praise changed');
              assert(presenterSpecialSongHymnFormPreset({label:'특송'},{title:'CCM'},{praise_types:['ccm']})===null,'CCM changed');
              return cases;
            }''')
            print('PASS special hymn default, aliases, optional forms, saved defaults and custom preservation:', result)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
