"""Audit visible module controls with the sidebar open at narrow widths."""

import argparse
from smoke_app import (
    build_raw_connection_link, launch_chromium, start_local_app_server,
    sync_playwright, wait_for_service_data,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = start_local_app_server() if not args.url else (None, args.url)
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page(viewport={'width':1440,'height':900})
            page.goto(build_raw_connection_link(url,'service'), wait_until='domcontentloaded')
            wait_for_service_data(page)
            for module in ('service','praise','scripture','calendar','references'):
                page.evaluate('(module)=>switchModule(module)',module)
                page.wait_for_timeout(1200)
                for width in (1440,1024,768,390):
                    page.set_viewport_size({'width':width,'height':900})
                    page.wait_for_timeout(160)
                    result=page.evaluate("""() => {
                      const pane=document.getElementById('detailPane'), bounds=pane.getBoundingClientRect();
                      const controls=[...pane.querySelectorAll('input:not([type=hidden]),select,textarea,button')];
                      return {shell:document.documentElement.scrollWidth<=innerWidth+1,
                        pane:pane.scrollWidth<=pane.clientWidth+1,
                        controls:controls.every(el=>{
                          const r=el.getBoundingClientRect();
                          return !r.width || !r.height || r.top>=innerHeight || r.bottom<=0
                            || r.left>=bounds.left-2 && r.right<=bounds.right+2;
                        })};
                    }""")
                    assert all(result.values()), (module,width,result)
                print('PASS responsive module',module,flush=True)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
