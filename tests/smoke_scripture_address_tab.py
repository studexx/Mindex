from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ['chromium', 'webkit']:
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                page = browser.new_page(viewport={'width': 1920, 'height': 1080})
                page.route('**/*supabase*/**', lambda r: r.abort())
                page.goto(url + '?output=presenter', wait_until='domcontentloaded')
                page.wait_for_function("typeof presenterScriptureContextUsesAddressTab === 'function'")
                for width in [1920, 400]:
                    page.set_viewport_size({'width': width, 'height': round(width * 9 / 16)})
                    for context in ['citation-chromakey', 'sermon-chromakey', 'sermon', 'citation', 'reading']:
                        result = page.evaluate('''async (context) => {
                          const slide={elementType:PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
                            layout:PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT, type:'scripture',
                            scriptureContext:context, referenceBook:'데살로니가전서',
                            referenceRange:'5:16-18', scriptureVerse:16, title:'데살로니가전서 5:16',
                            text:context==='citation-chromakey'?'살전 5:16   항상 기뻐하라':'16   항상 기뻐하라'};
                          document.body.innerHTML='<div class="presenter-output-root">'+renderPresenterSlideFrame(slide)+'</div>';
                          await document.fonts.ready;
                          const root=document.querySelector('.presenter-output-root');
                          fitPresenterChromakeyScriptureText(root);
                          const tab=root.querySelector('.presenter-citation-tab');
                          if(!tab) return {tab:false, reading:!!root.querySelector('.presenter-slide--scripture-reading')};
                          const body=root.querySelector('.presenter-slide-text');
                          const t=tab.getBoundingClientRect(), b=body.getBoundingClientRect(), css=getComputedStyle(tab);
                          return {tab:true,label:tab.textContent,text:body.textContent,
                            font:parseFloat(css.fontSize),weight:css.fontWeight,clip:css.clipPath,
                            radius:parseFloat(css.borderTopRightRadius),
                            fits:tab.scrollWidth<=tab.clientWidth+1 && t.right<=innerWidth+1,
                            overlap:t.bottom>b.top+1};
                        }''', context)
                        if context.endswith('-chromakey'):
                            assert result['tab'] and result['label'] == '데살로니가전서 5:16', result
                            assert result['text'] == '항상 기뻐하라', result
                            assert result['fits'] and not result['overlap'], result
                            assert result['weight'] == '700' and result['clip'] == 'none', result
                            assert abs(result['radius'] / result['font'] - 28 / 50) < .01, result
                            if width == 1920:
                                assert abs(result['font'] - 50) < .1, result
                                page.screenshot(path=f'/tmp/scripture-tab-{engine}-{context}.png')
                        else:
                            assert not result['tab'] and result['reading'], result
                print('PASS', engine, 'citation/sermon tabs, geometry, type and fullscreen preservation')
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
