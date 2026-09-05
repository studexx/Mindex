"""Keep the visible frame intact until delayed media can replace it."""

import argparse
from io import BytesIO

from PIL import Image
from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, local_url = start_local_app_server() if not args.url else (None, None)
    url = args.url or local_url
    try:
        with sync_playwright() as playwright:
            browser = launch_chromium(playwright)
            page = browser.new_page(viewport={'width': 960, 'height': 540})
            page.route('**/*supabase*/**', lambda route: route.abort())
            pending = []
            page.route('**/swap-test.png', lambda route: pending.append(route))
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof renderPresenterOutput === 'function'")
            page.evaluate("""() => {
              window.swapPayload = {serviceId:'swap', serviceType:'sunday-main', chromakey:true,
                slides:[{id:'text',type:'scripture',elementType:'scripture_text',
                  layout:'lower_bar_text',text:'첫 화면',outputContext:'chromakey'}],index:0};
              renderPresenterOutput(swapPayload);
              window.removedLayers = 0;
              new MutationObserver(records => {
                for (const record of records) for (const node of record.removedNodes)
                  if (node.classList?.contains('presenter-output-layer')) window.removedLayers++;
              }).observe(document.getElementById('presenterOutputRoot'), {childList:true});
              renderPresenterOutput({...swapPayload,slides:[{id:'image',type:'image',
                elementType:'image',layout:'media',imageSrc:new URL('swap-test.png',location.href).href,
                outputContext:'clean'}]});
            }""")
            page.wait_for_timeout(80)
            assert page.evaluate("!document.getElementById('presenterOutputRoot').classList.contains('no-chromakey')")
            before = Image.open(BytesIO(page.screenshot())).convert('RGB')
            assert before.getpixel((480, 200)) == (0, 255, 0)
            assert pending, 'The delayed image was not requested'
            data = BytesIO()
            Image.new('RGB', (1920, 1080), (20, 80, 220)).save(data, format='PNG')
            for route in pending:
                route.fulfill(body=data.getvalue(), content_type='image/png')
            page.wait_for_function("document.querySelector('.presenter-output-layer.is-active img')?.naturalWidth > 0")
            after = Image.open(BytesIO(page.screenshot())).convert('RGB')
            assert after.getpixel((480, 200)) == (20, 80, 220)
            for index in range(6):
                page.evaluate("""index => renderPresenterOutput({...swapPayload,
                  slides:[{...swapPayload.slides[0],id:`text-${index}`,text:`말씀 ${index}`} ]})""", index)
                screenshot = Image.open(BytesIO(page.screenshot())).convert('RGB')
                assert screenshot.getpixel((480, 200)) == (0, 255, 0)
            assert page.evaluate('window.removedLayers') == 0
            print('PASS delayed media preserves old frame; six text swaps retain attached layers')
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
