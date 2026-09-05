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
            page = browser.new_page(viewport={'width': 1366, 'height': 768})
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof presenterLyricFitKey === 'function'")
            page.evaluate('document.fonts.ready')
            result = page.evaluate('''async () => {
              const slide = {id:'cache-test',type:'lyrics',elementType:'praise',layout:'lower_bar_text',
                text:'1 구주의 십자가 보혈로 죄 씻음 받기를 원하네\\n내 죄를 씻으신 주 이름 찬송합시다'};
              renderPresenterOutput({serviceId:'cache-test',chromakey:false,slides:[slide],index:0},{});
              await document.fonts.ready;
              await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
              const box=document.querySelector('.is-active .presenter-slide-text');
              const host=box.parentElement;
              await Promise.all([400,700].map(weight=>document.fonts.load(weight+' 16px '+getComputedStyle(box).fontFamily)));
              await new Promise(resolve=>requestAnimationFrame(resolve));
              const original=presenterTextNaturalWidth;
              let calls=0;
              presenterTextNaturalWidth=(node)=>{calls++;return original(node)};
              const cases=[];
              try {
                const check=(name,change=()=>{})=>{
                  change(); calls=0;
                  fitPresenterLyricText(host);
                  const miss=calls, fitted=box.style.fontSize;
                  calls=0; fitPresenterLyricText(host);
                  const hit=calls;
                  if(hit || !miss) throw new Error(name+': expected miss then hit, '+miss+'/'+hit);
                  presenterLyricFitCache.clear();
                  fitPresenterLyricText(host);
                  if(box.style.fontSize!==fitted) throw new Error(name+': cached size differs from fresh fit');
                  cases.push({name,miss,hit,fontSize:fitted});
                };
                presenterLyricFitCache.clear();
                check('initial');
                check('text',()=>box.lastElementChild.textContent+=' 온 세상 찬송합니다');
                check('width',()=>box.style.width='70%');
                check('height',()=>box.style.height='65px');
                check('weight',()=>box.style.fontWeight='400');
                check('font',()=>box.style.fontFamily='serif');
                check('line-height',()=>box.style.lineHeight='1.5');
                check('verse-number',()=>{
                  box.firstElementChild.classList.add('presenter-lyric-line--numbered');
                  box.firstElementChild.dataset.verseNo='123';
                });
                check('highlight',()=>box.lastElementChild.innerHTML='<strong>'+box.lastElementChild.textContent+'</strong>');
                const clone=box.cloneNode(true);box.replaceWith(clone);calls=0;
                fitPresenterLyricText(host);
                if(calls) throw new Error('Identical replacement did not reuse cache');
                document.fonts.dispatchEvent(new Event('loadingdone'));
                if(presenterLyricFitCache.size) throw new Error('Font load did not invalidate cache');
                await new Promise(resolve=>requestAnimationFrame(resolve));
                if(!calls) throw new Error('Font load did not refit');
                for(let i=0;i<600;i++) rememberPresenterLyricFit('limit-'+i,'20px');
                if(presenterLyricFitCache.size>512) throw new Error('Unbounded cache');
                return cases;
              } finally {presenterTextNaturalWidth=original;presenterLyricFitCache.clear();}
            }''')
            print('PASS cache reuse, fresh-fit equivalence, 9 invalidation cases, replacement, font load, size limit', result)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
