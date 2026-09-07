from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def run(browser, url, engine):
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.route('**/*supabase*/**', lambda route: route.abort())
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function("typeof renderSingleVersionForms === 'function'")
    page.evaluate('''() => {
      state.module='praise';state.selectedSongId='fixture';state.selectedVersionId='v1';
      const forms=[{id:'f1',part_type:'Verse',part_number:1,sort_order:0,
        lyrics:'A long lyric line that must wrap inside the editor without clipping.'}];
      state.songs=[{id:'fixture',title:'Responsive title',versions:[{id:'v1',name:'기본',forms}]}];
      state.forms=forms;state.dirty.forms=false;
      render();
      document.body.classList.remove('sidebar-collapsed');syncSidebarCollapsedState();
    }''')
    for width in (1440, 1024, 768, 390, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        if width <= 560:
            page.evaluate("document.body.classList.remove('sidebar-collapsed');syncSidebarCollapsedState()")
            page.locator('[data-song-id="fixture"]').click()
            page.wait_for_function("document.body.classList.contains('sidebar-collapsed')")
        page.wait_for_timeout(300)
        result = page.evaluate('''() => {
          const pane=document.getElementById('detailPane'),bounds=pane.getBoundingClientRect();
          const grid=pane.querySelector('.version-compare-grid');
          const fields=[...grid.querySelectorAll('button,input,textarea,select')];
          return {fits:fields.every(e=>{const r=e.getBoundingClientRect();
            return !r.width||r.left>=bounds.left&&r.right<=bounds.right;}),
            gridFits:grid.scrollWidth<=grid.clientWidth+1,
            paneWidth:bounds.width};
        }''')
        assert result['fits'] and result['gridFits'], (engine, width, result)
        if width <= 560:
            assert result['paneWidth'] >= width - 60, result
        page.screenshot(path=f'/tmp/praise-responsive-{engine}-{width}.png')
        print('PASS', engine, width, result, flush=True)
    page.set_viewport_size({'width': 390, 'height': 900})
    page.evaluate('''() => {
      const song=state.songs[0];song.versions.push({id:'v2',name:'Alternate',forms:[]});render();
    }''')
    assert page.evaluate('''() => {
      const grid=document.querySelector('.version-compare-grid');
      return grid.scrollWidth>grid.clientWidth && getComputedStyle(grid).overflowX==='auto';
    }'''), 'comparison must retain horizontal scrolling'
    page.close()


def main():
    server, url = start_local_app_server()
    try:
        with sync_playwright() as p:
            for engine in ('chromium', 'webkit'):
                browser = launch_chromium(p) if engine == 'chromium' else p.webkit.launch()
                run(browser, url, engine)
                browser.close()
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
