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
            page.wait_for_function("typeof renderServiceSidebarDateGroups === 'function'")
            result = page.evaluate('''() => {
              const root=document.createElement('div');
              root.style.width='260px';
              root.innerHTML=renderServiceSidebarDateGroups([{id:'test-service',date:'2026-09-06',type_id:'sunday-main'}]);
              document.body.append(root);
              const row=root.querySelector('.service-sidebar-card-row');
              const button=row.querySelector('button');
              return {buttons:row.querySelectorAll('button').length,
                service:button.dataset.serviceId,
                launch:!!root.querySelector('[data-open-presenter-service]'),
                columns:getComputedStyle(row).gridTemplateColumns.split(' ').length};
            }''')
            assert result == {'buttons':1,'service':'test-service','launch':False,'columns':1}, result
            print('PASS sidebar: service navigation retained, launch icon and extra column removed')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
