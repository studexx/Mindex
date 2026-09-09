"""Controller badges use source verse count without changing output or presets."""
import argparse
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = (None, args.url) if args.url else start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                try:
                    page = browser.new_page()
                    page.route('**/*supabase*/**', lambda route: route.abort())
                    page.goto(url + '?output=presenter', wait_until='domcontentloaded')
                    page.wait_for_function("typeof presenterFormGroupLabel === 'function'")
                    cases = page.evaluate('''() => {
                      const check=(ok,msg)=>{if(!ok)throw Error(msg)};
                      const form=(label,id=label)=>({id,label,part_type:label.startsWith('Verse')?'Verse':'Chorus',lyrics:'sample',sort_order:1});
                      const cases=[];
                      const sample=(source,marker,expected)=>{
                        const version={id:'version',forms:source};
                        const before=JSON.stringify(version);
                        const section=presenterSectionForServiceItem({id:'item',label:'찬양 1'},0,'Test song',{title:'Test song'},version);
                        const slide={...section,marker,formKey:'v1:0',type:'lyrics',elementType:'praise',layout:'lower_bar_text',text:'sample'};
                        check(presenterFormGroupLabel(slide)===expected,marker+' badge mismatch');
                        const entry=annotatePresenterFormStarts([{slide,slideIndex:0}]).entries[0];
                        check(entry.formLabel===expected,'annotation mismatch');
                        const html=renderPresenterSlideThumb(slide,0,-1,'fixture',entry.formLabel);
                        check(html.includes('aria-label="'+expected+'"'),'actual badge HTML mismatch');
                        check(slide.marker===marker && JSON.stringify(version)===before,'output marker or source mutated');
                        cases.push(marker+' -> '+expected);
                        return section;
                      };
                      sample([form('Verse 1')],'Verse 1','Verse');
                      sample([form('Verse')],'Verse','Verse');
                      sample([form('Verse 1'),form('Chorus')],'Verse 1','Verse');
                      sample([form('Verse 1'),form('Verse 2')],'Verse 1','Verse 1');
                      sample([form('Verse 1'),form('Verse 2')],'Verse 2','Verse 2');
                      sample([form('Verse 2')],'Verse 2','Verse 2');
                      sample([form('Verse A')],'Verse A','Verse A');
                      sample([form('Verse 1'),form('Chorus 1')],'Chorus 1','Chorus 1');
                      sample([],'Verse 1','Verse 1');
                      // Editor state belongs to another song and must not affect the source count.
                      state.forms=[form('Verse 1'),form('Verse 2')];
                      sample([form('Verse 1')],'Verse 1','Verse');
                      state.forms=[];
                      const source=[form('Verse')];
                      const plan=resolvePresenterFormPresetSequence(source,['V1','V1']);
                      check(plan.items.length===2&&!plan.missing.length,'V1 resolution or repeat changed');
                      for(const item of plan.items) sample(source,presenterResolvedFormMarker(item),'Verse');
                      const section=presenterSectionForServiceItem({label:'찬양 1'},0,'Test',null,{forms:source});
                      check(presenterFormGroupLabel({...section,formLabel:'V1'})==='Verse','score metadata bypass');
                      check(presenterFormGroupLabel({...section,marker:'1절'})==='Verse','hymn badge normalization');
                      check(presenterFormGroupLabel({...section,marker:'VL'})==='VL','last verse semantics changed');
                      return cases;
                    }''')
                    print('PASS', engine, cases, flush=True)
                finally:
                    browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
