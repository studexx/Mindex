"""Verify legacy input_mode constraints without writing to the live database."""

import argparse

from smoke_app import launch_chromium, start_local_app_server, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url')
    args = parser.parse_args()
    server, url = start_local_app_server() if not args.url else (None, args.url)
    try:
        with sync_playwright() as p:
            browser = launch_chromium(p)
            page = browser.new_page()
            page.route('**/*supabase*/**', lambda route: route.abort())
            page.goto(url + '?output=presenter', wait_until='domcontentloaded')
            page.wait_for_function("typeof buildWorshipPersistenceRows === 'function'")
            result = page.evaluate("""() => {
              const allowed = ['', 'praise_db', 'text', 'scripture', 'asset', 'config', 'none'];
              const mapped = [...WORSHIP_DB_ELEMENT_INPUT_MODES].map(worshipDbInputModeForSave);
              if (!mapped.every(mode => allowed.includes(mode))) throw Error('legacy CHECK violation');
              const service = {id:'compat-test', type_id:'sunday-first', date:'2026-09-06'};
              const results = [];
              for (const contentState of [true, false]) {
                for (const sectionKey of ['praise', 'special_song']) {
                  const item = normalizeServiceItem({service_id:service.id, label:'특송',
                    raw_title:'은혜', song_id:null, memo:serializeServiceItemMemo({
                      elementType:'praise', inputMode:'manual_praise', outputMode:'lyrics',
                      slides:['첫 줄\\n둘째 줄', '후렴']}),
                    _worshipSectionKey:sectionKey, _worshipSectionTitle:'찬양',
                    _worshipElementTemplateModified:true, _worshipTemplatePlaceholder:false}, 0);
                  const options = {elementTypedStateColumns:{inputMode:true, contentState}};
                  const rows = buildWorshipPersistenceRows(service, [item], {}, {}, options);
                  if (rows.elements[0].input_mode !== 'praise_db') throw Error('builder CHECK violation');
                  // Retry/legacy row sanitization must use the same compatibility mapping.
                  rows.elements[0].input_mode = 'manual_praise';
                  sanitizeWorshipPersistenceRows(rows, options);
                  validateWorshipPersistenceRows(rows, {serviceId:service.id});
                  if (!rows.elements.every(row => allowed.includes(row.input_mode))) throw Error('sanitizer CHECK violation');
                  const restored = groupWorshipElements(rows.sections, rows.elements)[service.id][0];
                  const memo = parseServiceItemMemo(restored.memo);
                  results.push({contentState, sectionKey, dbMode:rows.elements[0].input_mode,
                    mode:memo.inputMode, title:restored.raw_title, slides:memo.slides});
                }
              }
              return results;
            }""")
            for row in result:
                assert row['dbMode'] == 'praise_db' and row['mode'] == 'manual_praise', row
                assert row['title'] == '은혜' and row['slides'] == ['첫 줄\n둘째 줄', '후렴'], row
                print('PASS legacy constraint and manual lyrics roundtrip', row, flush=True)
            browser.close()
    finally:
        if server:
            server.shutdown()


if __name__ == '__main__':
    main()
