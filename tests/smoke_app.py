from __future__ import annotations

import html
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, urlsplit

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright
except ModuleNotFoundError as error:
    PlaywrightTimeoutError = TimeoutError
    sync_playwright = None
    PLAYWRIGHT_IMPORT_ERROR = error
else:
    PLAYWRIGHT_IMPORT_ERROR = None


APP_DIR = Path(__file__).resolve().parents[1]
INDEX_PATH = APP_DIR / "index.html"
LOCAL_CHROME_PATH = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
ENV_PATHS = (
    APP_DIR / ".env.supabase.local",
    APP_DIR / ".env.supabase",
)


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def extract_supa_config() -> tuple[str, str]:
    values: dict[str, str] = {}
    for path in ENV_PATHS:
        values.update(read_env_file(path))
    values.update(os.environ)
    url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL") or ""
    key = (
        values.get("MINDEX_SUPABASE_ANON_KEY")
        or values.get("SUPABASE_ANON_KEY")
        or values.get("SUPABASE_KEY")
        or ""
    )
    return url, key


def injected_index_html() -> str:
    markup = INDEX_PATH.read_text(encoding="utf-8")
    supa_url, supa_key = extract_supa_config()
    if not supa_url or not supa_key or "window.MINDEX_SUPABASE" in markup:
        return markup
    config = json.dumps({"url": supa_url, "anonKey": supa_key})
    script = f"<script>window.MINDEX_SUPABASE={html.escape(config, quote=False)};</script>"
    return markup.replace("</head>", f"    {script}\n  </head>", 1)


class MindexSmokeHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        route = parsed.path
        if route in ("", "/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            query = parse_qs(parsed.query)
            markup = INDEX_PATH.read_text(encoding="utf-8") if query.get("mindexSmokeRaw") else injected_index_html()
            self.wfile.write(markup.encode("utf-8"))
            return
        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *_: Any) -> None:
        return


def start_local_app_server() -> tuple[ThreadingHTTPServer, str]:
    handler = partial(MindexSmokeHandler, directory=str(APP_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    return server, f"http://{host}:{port}/index.html"


def build_raw_connection_link(app_url: str, module: str = "praise") -> str:
    supa_url, supa_key = extract_supa_config()
    params = (
        f"supabaseUrl={quote(supa_url, safe='')}"
        f"&supabaseAnonKey={quote(supa_key, safe='')}"
        f"&module={quote(module, safe='')}"
    )
    return f"{app_url}?mindexSmokeRaw=1#{params}"


def launch_chromium(playwright):
    try:
        return playwright.chromium.launch(headless=True)
    except Exception:
        if LOCAL_CHROME_PATH.exists():
            return playwright.chromium.launch(headless=True, executable_path=str(LOCAL_CHROME_PATH))
        raise


def wait_for_module_data(page, module: str) -> None:
    if module == "service" or module == "presenter":
        expected_module = module
        page.wait_for_function(
            """
            (expectedModule) => document.body.dataset.module === expectedModule
              && (
                document.querySelector('.service-dashboard')
                || document.querySelector('.presenter-dashboard')
                || document.querySelector('#servicePresenterControls')
                || document.querySelector('.service-sidebar')
                || document.querySelector('.empty-detail')
                || document.body.textContent.includes('Psalm 27:14')
              )
            """,
            arg=expected_module,
            timeout=15000,
        )
        return
    if module == "scripture":
        page.wait_for_function(
            """
            () => document.body.dataset.module === 'scripture'
              && (
                document.querySelector('[data-book-code]')
                || document.querySelector('[data-scripture-id]')
                || document.querySelector('.scripture-editor')
                || document.querySelector('.empty-detail')
              )
            """,
            timeout=15000,
        )
        return
    if module == "praise":
        page.wait_for_function(
            """
            () => document.body.dataset.module === 'praise'
              && (
                document.querySelector('[data-song-id]')
                || document.querySelector('.empty-detail')
                || document.querySelector('.song-list-empty')
              )
            """,
            timeout=15000,
        )


def wait_for_supabase_client(page) -> None:
    page.wait_for_function(
        "() => typeof state !== 'undefined' && Boolean(state.client || state.connectionError)",
        timeout=10000,
    )


def wait_for_service_data(page) -> None:
    page.wait_for_function(
        """
        () => typeof state !== 'undefined'
          && (
            (
              state.serviceTypes.length > 0
              && Array.isArray(state.services)
              && state.serviceItems
            )
            || state.serviceError
            || state.connectionError
          )
        """,
        timeout=30000,
    )


def wait_for_praise_data(page) -> None:
    page.wait_for_function(
        """
        () => typeof state !== 'undefined'
          && (state.songs.length > 0 || state.connectionError)
        """,
        timeout=30000,
    )


def wait_for_scripture_data(page) -> None:
    page.wait_for_function(
        """
        () => typeof state !== 'undefined'
          && (state.scriptureBooks.length > 0 || state.scriptureError || state.connectionError)
        """,
        timeout=30000,
    )


def get_app_snapshot(page) -> dict[str, Any]:
    return page.evaluate(
        """
        (() => {
          if (typeof state === 'undefined') return { stateAvailable: false };
          return {
            stateAvailable: true,
            module: state.module,
            songs: state.songs.length,
            scriptures: state.scriptures.length,
            scriptureBooks: state.scriptureBooks.length,
            serviceTypes: state.serviceTypes.length,
            services: state.services.length,
            serviceItemGroups: Object.keys(state.serviceItems || {}).length,
            connectionError: state.connectionError,
            serviceError: state.serviceError,
            scriptureError: state.scriptureError
          };
        })()
        """
    )


def shell_layout_snapshot(page) -> dict[str, Any]:
    return page.evaluate(
        """
        (() => {
          const detail = document.querySelector('.detail-pane');
          const topbar = document.querySelector('.topbar');
          const sidebar = document.querySelector('.sidebar');
          const search = document.querySelector('.sidebar-search-wrap');
          const searchInput = document.querySelector('.sidebar-search-wrap input');
          const firstSectionLabel = document.querySelector('.service-sidebar-head');
          const toggle = document.querySelector('#sidebarToggleBtn');
          const styles = detail ? getComputedStyle(detail) : null;
          const searchInputStyles = searchInput ? getComputedStyle(searchInput) : null;
          const topbarRect = topbar?.getBoundingClientRect();
          const toggleRect = toggle?.getBoundingClientRect();
          const sidebarRect = sidebar?.getBoundingClientRect();
          const searchRect = search?.getBoundingClientRect();
          const firstSectionLabelRect = firstSectionLabel?.getBoundingClientRect();
          return {
            module: document.body.dataset.module,
            viewport: window.innerWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            detailPaddingLeft: styles ? Math.round(parseFloat(styles.paddingLeft)) : 0,
            detailPaddingTop: styles ? Math.round(parseFloat(styles.paddingTop)) : 0,
            sidebarSearchTop: searchRect && topbarRect ? Math.round(searchRect.top - topbarRect.bottom) : 0,
            sidebarSearchSectionGap: searchRect && firstSectionLabelRect ? Math.round(firstSectionLabelRect.top - searchRect.bottom) : 0,
            sidebarSearchInputLineHeight: searchInputStyles ? Math.round(parseFloat(searchInputStyles.lineHeight)) : 0,
            topbarHeight: topbarRect ? Math.round(topbarRect.height) : 0,
            sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
            toggleLeft: toggleRect ? Math.round(toggleRect.left) : 0,
            toggleTop: toggleRect ? Math.round(toggleRect.top) : 0,
            toggleWidth: toggleRect ? Math.round(toggleRect.width) : 0,
            toggleHeight: toggleRect ? Math.round(toggleRect.height) : 0
          };
        })()
        """
    )


def select_service_with_slides(page) -> dict[str, Any] | None:
    return page.evaluate(
        """
        (() => {
          if (typeof state === 'undefined') return null;
          let fixture = false;
          let service = state.services
            .filter((item) => (state.serviceItems[item.id] || []).length > 0)
            .find((item) => buildServicePresenterSlides(item.id).length > 0);
          if (!service) {
            fixture = true;
            const typeId = 'monthly';
            service = {
              id: '__smoke_presenter_service__',
              type_id: typeId,
              date: '2026-07-02',
              title: 'Presenter Smoke',
              leader: '테스트',
              tags: [],
            };
            if (!state.serviceTypes.some((item) => item.id === typeId)) {
              state.serviceTypes.push({ id: typeId, name: '월삭예배', sort_order: 1 });
            }
            state.services = [
              service,
              ...state.services.filter((item) => item.id !== service.id),
            ];
            state.__smokePresenterFixtureServiceId = service.id;
            state.serviceItems[service.id] = normalizeServiceItems([
              {
                id: '__smoke_presenter_item_1__',
                service_id: service.id,
                sort_order: 1,
                label: '찬양',
                assignee: '테스트',
                raw_title: '주만 의지해',
                memo: JSON.stringify({
                  slides: [
                    '[Verse 1]\\n주만 의지해\\n주만 바라봐',
                    '[Chorus]\\n주 예수 앞에 다 아뢰어라',
                  ],
                }),
              },
              {
                id: '__smoke_presenter_item_2__',
                service_id: service.id,
                sort_order: 2,
                label: '말씀',
                raw_title: '요 3:16',
                memo: JSON.stringify({
                  elementType: 'scripture',
                  slides: ['하나님이 세상을 이처럼 사랑하사'],
                }),
              },
              {
                id: '__smoke_presenter_item_3__',
                service_id: service.id,
                sort_order: 3,
                label: '빈 화면',
                raw_title: '',
                memo: JSON.stringify({ elementType: 'blank' }),
              },
              {
                id: '__smoke_presenter_item_4__',
                service_id: service.id,
                sort_order: 4,
                label: '파일',
                raw_title: '',
                memo: JSON.stringify({
                  elementType: 'file',
                  asset: {
                    kind: 'file',
                    name: '예배 자료',
                    url: 'archive/service-file',
                  },
                }),
              },
            ]);
          }
          if (!service) return null;
          const slides = buildServicePresenterSlides(service.id);
          state.module = 'presenter';
          state.search = '';
          if (typeof refs !== 'undefined' && refs.searchInput) refs.searchInput.value = '';
          state.selectedServiceTypeId = service.type_id;
          state.selectedServiceId = service.id;
          render();
          return { id: service.id, typeId: service.type_id, date: service.date, slides: slides.length, fixture };
        })()
        """
    )


def cleanup_presenter_fixture(page) -> None:
    page.evaluate(
        """
        (() => {
          if (typeof state === 'undefined') return;
          const serviceId = state.__smokePresenterFixtureServiceId;
          if (!serviceId) return;
          state.services = state.services.filter((service) => service.id !== serviceId);
          delete state.serviceItems[serviceId];
          delete state.worshipPresenterSlides[serviceId];
          if (state.selectedServiceId === serviceId) state.selectedServiceId = null;
          if (state.presenter?.serviceId === serviceId) {
            state.presenter.serviceId = null;
            state.presenter.slides = [];
            state.presenter.index = 0;
            state.presenter.jumpDraft = "";
            state.presenter.liveScripture = { reference: "", draft: "", active: false, slide: null };
            state.presenter.livePraise = { query: "", draft: "", active: false, slides: [], index: 0, songId: "", versionId: "" };
          }
          delete state.__smokePresenterFixtureServiceId;
        })()
        """
    )


def main() -> int:
    results: list[tuple[str, str, str]] = []
    console_messages: list[str] = []
    page_errors: list[str] = []
    has_config = all(extract_supa_config())

    def pass_(name: str, detail: str = "") -> None:
        results.append(("PASS", name, detail))

    def fail(name: str, detail: str = "") -> None:
        results.append(("FAIL", name, detail))

    def skip(name: str, detail: str = "") -> None:
        results.append(("SKIP", name, detail))

    if sync_playwright is None:
        skip("playwright-dependency", f"{PLAYWRIGHT_IMPORT_ERROR}. Install the Python playwright package to run UI smoke checks.")
        for status, name, detail in results:
            print(f"{status} {name}" + (f" :: {detail}" if detail else ""))
        return 0

    server, app_url = start_local_app_server()
    try:
        with sync_playwright() as playwright:
            browser = launch_chromium(playwright)
            page = browser.new_page(viewport={"width": 1440, "height": 980})
            page.add_init_script(
                """
                (() => {
                  if (sessionStorage.getItem('__mindexSmokeStorageInitialized')) return;
                  localStorage.clear();
                  sessionStorage.clear();
                  sessionStorage.setItem('__mindexSmokeStorageInitialized', 'true');
                })();
                """
            )
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on(
                "console",
                lambda msg: console_messages.append(f"{msg.type}: {msg.text}")
                if msg.type in ("error", "warning")
                else None,
            )

            page.goto(app_url, wait_until="load")
            page.wait_for_selector(".app-shell", timeout=5000)

            pass_("document-title", page.title())
            if page.title() != "MINDEX":
                fail("document-title-uppercase", page.title())
            else:
                pass_("document-title-uppercase")

            icon_metrics = page.evaluate(
                """
                [...document.querySelectorAll('#sidebarToggleBtn,#themeBtn,#saveAllBtn')]
                  .filter((node) => node.offsetParent !== null)
                  .map((node) => {
                    const rect = node.getBoundingClientRect();
                    return { id: node.id, width: Math.round(rect.width), height: Math.round(rect.height) };
                  })
                """
            )
            bad_icons = [
                item for item in icon_metrics
                if abs(item["width"] - item["height"]) > 2 or item["width"] < 28 or item["height"] < 28
            ]
            if bad_icons:
                fail("topbar-icon-grid", json.dumps(bad_icons, ensure_ascii=False))
            else:
                pass_("topbar-icon-grid", json.dumps(icon_metrics, ensure_ascii=False))

            topbar_offsets = page.evaluate(
                """
                (() => {
                  const leftRail = document.querySelector('.nav-sidebar')?.getBoundingClientRect();
                  const rightRail = document.querySelector('.topbar-actions')?.getBoundingClientRect();
                  const leftFirst = document.querySelector('#sidebarToggleBtn')?.getBoundingClientRect();
                  const rightFirst = document.querySelector('#themeBtn')?.getBoundingClientRect();
                  const rightLast = document.querySelector('#saveAllBtn')?.getBoundingClientRect();
                  return {
                    leftFirst: Math.round((leftFirst?.left || 0) - (leftRail?.left || 0)),
                    rightFirst: Math.round((rightFirst?.left || 0) - (rightRail?.left || 0)),
                    rightLastInset: Math.round((rightRail?.right || 0) - (rightLast?.right || 0))
                  };
                })()
                """
            )
            if topbar_offsets["leftFirst"] == 4 and topbar_offsets["rightLastInset"] == 4:
                pass_("topbar-action-offset", json.dumps(topbar_offsets, ensure_ascii=False))
            else:
                fail("topbar-action-offset", json.dumps(topbar_offsets, ensure_ascii=False))

            page.click("#sidebarToggleBtn")
            collapsed = page.evaluate("document.body.classList.contains('sidebar-collapsed')")
            page.click("#sidebarToggleBtn")
            expanded = page.evaluate("!document.body.classList.contains('sidebar-collapsed')")
            page.wait_for_timeout(180)
            if collapsed and expanded:
                pass_("sidebar-toggle")
            else:
                fail("sidebar-toggle", f"collapsed={collapsed} expanded={expanded}")

            page.click("#sidebarToggleBtn")
            page.reload(wait_until="domcontentloaded")
            page.wait_for_selector("#sidebarToggleBtn")
            page.wait_for_function("() => typeof state !== 'undefined'")
            collapsed_after_reload = page.evaluate("document.body.classList.contains('sidebar-collapsed')")
            page.click("#sidebarToggleBtn")
            page.reload(wait_until="domcontentloaded")
            page.wait_for_selector("#sidebarToggleBtn")
            page.wait_for_function("() => typeof state !== 'undefined'")
            expanded_after_reload = page.evaluate("!document.body.classList.contains('sidebar-collapsed')")
            if collapsed_after_reload and expanded_after_reload:
                pass_("sidebar-state-persistence")
            else:
                fail(
                    "sidebar-state-persistence",
                    f"collapsed={collapsed_after_reload} expanded={expanded_after_reload}",
                )

            desktop_shell = shell_layout_snapshot(page)
            desktop_overflow = max(
                desktop_shell["documentScrollWidth"] - desktop_shell["viewport"],
                desktop_shell["bodyScrollWidth"] - desktop_shell["viewport"],
            )
            if (
                desktop_shell["detailPaddingLeft"] in {24, 25}
                and desktop_shell["detailPaddingTop"] in {24, 25}
                and desktop_shell["sidebarSearchTop"] == 0
                and desktop_shell["sidebarSearchInputLineHeight"] == 30
                and desktop_shell["topbarHeight"] == 48
                and desktop_shell["toggleWidth"] == desktop_shell["toggleHeight"] == 40
                and desktop_overflow <= 2
            ):
                pass_("shell-desktop-geometry", json.dumps(desktop_shell, ensure_ascii=False))
            else:
                fail("shell-desktop-geometry", json.dumps(desktop_shell, ensure_ascii=False))

            home_gutter = page.evaluate(
                """
                (() => {
                  const detail = document.querySelector('.detail-pane')?.getBoundingClientRect();
                  const home = document.querySelector('.home-screen')?.getBoundingClientRect();
                  return {
                    left: Math.round((home?.left || 0) - (detail?.left || 0)),
                    top: Math.round((home?.top || 0) - (detail?.top || 0)),
                    width: Math.round(home?.width || 0),
                    overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                  };
                })()
                """
            )
            if home_gutter["left"] in {24, 25} and home_gutter["top"] in {24, 25} and home_gutter["overflow"] <= 2:
                pass_("home-screen-gutter", json.dumps(home_gutter, ensure_ascii=False))
            else:
                fail("home-screen-gutter", json.dumps(home_gutter, ensure_ascii=False))

            page.click("#sidebarToggleBtn")
            page.wait_for_timeout(180)
            collapsed_shell = shell_layout_snapshot(page)
            page.click("#sidebarToggleBtn")
            page.wait_for_timeout(180)
            if collapsed_shell["detailPaddingLeft"] == desktop_shell["detailPaddingLeft"]:
                pass_("sidebar-collapse-keeps-gutter", json.dumps(collapsed_shell, ensure_ascii=False))
            else:
                fail("sidebar-collapse-keeps-gutter", json.dumps(collapsed_shell, ensure_ascii=False))

            page.set_viewport_size({"width": 390, "height": 780})
            page.wait_for_timeout(180)
            mobile_shell = shell_layout_snapshot(page)
            mobile_overflow = max(
                mobile_shell["documentScrollWidth"] - mobile_shell["viewport"],
                mobile_shell["bodyScrollWidth"] - mobile_shell["viewport"],
            )
            if (
                mobile_shell["detailPaddingLeft"] in {24, 25}
                and mobile_shell["detailPaddingTop"] in {24, 25}
                and mobile_shell["sidebarSearchTop"] == 0
                and mobile_shell["sidebarSearchInputLineHeight"] == 30
                and mobile_shell["topbarHeight"] == 48
                and mobile_overflow <= 2
            ):
                pass_("shell-mobile-geometry", json.dumps(mobile_shell, ensure_ascii=False))
            else:
                fail("shell-mobile-geometry", json.dumps(mobile_shell, ensure_ascii=False))
            page.set_viewport_size({"width": 1440, "height": 980})

            responsive_shells = []
            for width in (1180, 900, 760, 520, 390):
                page.set_viewport_size({"width": width, "height": 780})
                page.wait_for_timeout(180)
                responsive_shells.append(
                    page.evaluate(
                        """
                        (width) => {
                          const rect = (selector) => {
                            const node = document.querySelector(selector);
                            const box = node?.getBoundingClientRect();
                            return box ? {
                              left: Math.round(box.left),
                              right: Math.round(box.right),
                              width: Math.round(box.width),
                              height: Math.round(box.height)
                            } : null;
                          };
                          const topbar = rect('.topbar');
                          const navSidebar = rect('.nav-sidebar');
                          const sidebar = rect('.sidebar');
                          const search = rect('.sidebar-search-wrap');
                          const detail = rect('.detail-pane');
                          const switcher = document.querySelector('.primary-switcher');
                          return {
                            width,
                            topbarHeight: topbar?.height || 0,
                            railWidth: navSidebar?.width || 0,
                            sidebarWidth: sidebar?.width || 0,
                            sidebarHeight: sidebar?.height || 0,
                            sidebarLeftRail: Boolean(sidebar && detail && detail.left >= sidebar.right),
                            searchWithinSidebar: Boolean(search && sidebar && search.left >= sidebar.left && search.right <= sidebar.right),
                            switcherClientWidth: Math.round(switcher?.clientWidth || 0),
                            switcherScrollWidth: Math.round(switcher?.scrollWidth || 0),
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                          };
                        }
                        """,
                        width,
                    )
                )
            if all(
                item["topbarHeight"] == 48
                and item["sidebarWidth"] <= item["railWidth"] <= item["width"]
                and item["railWidth"] - item["sidebarWidth"] == 48
                and item["sidebarLeftRail"]
                and (item["width"] > 860 or item["sidebarHeight"] > 300)
                and item["searchWithinSidebar"]
                and item["switcherClientWidth"] > 0
                and item["overflow"] <= 2
                for item in responsive_shells
            ):
                pass_("shell-responsive-geometry", json.dumps(responsive_shells, ensure_ascii=False))
            else:
                fail("shell-responsive-geometry", json.dumps(responsive_shells, ensure_ascii=False))
            page.set_viewport_size({"width": 1440, "height": 980})

            reference_page = browser.new_page(viewport={"width": 1100, "height": 760})
            reference_page.add_init_script("localStorage.clear(); sessionStorage.clear();")
            reference_page.goto(f"{app_url}?mindexSmokeRaw=1", wait_until="load")
            reference_page.wait_for_selector(".app-shell", timeout=5000)
            reference_page.evaluate(
                """
                (() => {
                  state.module = 'references';
                  state.referenceError = '';
                  state.referenceLinksLoaded = true;
                  state.referenceGroupSupported = true;
                  state.referenceLinks = [
                    { id: 'a1', title: 'Alpha Link', url: 'https://alpha.example', group_name: 'Alpha', sort_order: 10, is_active: true },
                    { id: 'b1', title: 'Beta One', url: 'https://beta-one.example', group_name: 'Beta', sort_order: 20, is_active: true },
                    { id: 'b2', title: 'Beta Two', url: 'https://beta-two.example', group_name: 'Beta', sort_order: 30, is_active: true }
                  ];
                  render();
                })();
                """
            )
            reference_page.evaluate(
                """
                (() => {
                  moveReferenceGroup('Alpha', 1);
                  moveReferenceLink('b1', 1);
                })();
                """
            )
            reference_order = reference_page.evaluate(
                """
                (() => ({
                  groups: [...document.querySelectorAll('.reference-group-head h3')].map((node) => node.textContent.trim()),
                  links: state.referenceLinks.map((link) => link.id),
                  dirty: state.dirty.references
                }))()
                """
            )
            if reference_order["groups"] == ["Beta", "Alpha"] and reference_order["links"] == ["b2", "b1", "a1"] and reference_order["dirty"]:
                pass_("reference-group-reorder", json.dumps(reference_order, ensure_ascii=False))
            else:
                fail("reference-group-reorder", json.dumps(reference_order, ensure_ascii=False))
            reference_guards = reference_page.evaluate(
                """
                async () => {
                  const originalClient = state.client;
                  const originalToast = window.showToast;
                  window.showToast = () => {};

                  state.module = 'calendar';
                  state.calendarData = [{ id: 'cal1', date: '2026-01-04', note: '이전 기념' }];
                  state.client = {
                    from: () => ({
                      update: () => ({
                        eq: async () => ({ error: new Error('save failed') })
                      })
                    })
                  };
                  const cell = document.createElement('td');
                  cell.className = 'cal-cell';
                  cell.dataset.initialValue = '이전 기념';
                  cell.textContent = '새 기념';
                  const calendarSaved = await saveCalendarCell('cal1', 'note', '새 기념', { cell, previousValue: '이전 기념' });

                  state.module = 'references';
                  state.referenceLinksLoaded = true;
                  state.referenceGroupSupported = false;
                  state.referenceError = '';
                  state.referenceLinks = [
                    { id: 'safe', title: 'Safe', url: 'example.com/path', group_name: '', sort_order: 10, is_active: true },
                    { id: 'bad', title: 'Bad', url: 'javascript:alert(1)', group_name: 'Hidden', sort_order: 20, is_active: true }
                  ];
                  renderReferencesDetail();
                  const rendered = {
                    newGroupButtons: document.querySelectorAll('[data-reference-action="new-group"]').length,
                    groupFields: document.querySelectorAll('[data-reference-field="group_name"]').length,
                    disabledLinks: document.querySelectorAll('.reference-card-link.disabled').length,
                    safeUrl: normalizeReferenceUrl('example.com/path'),
                    unsafeUrl: normalizeReferenceUrl('javascript:alert(1)')
                  };

                  let savedPayload = null;
                  let orderCount = 0;
                  state.referenceLinks = [{ id: 'save-safe', title: 'Docs', url: 'docs.example.com', group_name: 'Ignored', sort_order: 10, is_active: true }];
                  state.client = {
                    from: () => ({
                      upsert: (payload) => {
                        savedPayload = payload;
                        const query = {
                          select: () => query,
                          order: () => {
                            orderCount += 1;
                            return orderCount >= 2 ? { data: payload, error: null } : query;
                          }
                        };
                        return query;
                      }
                    })
                  };
                  await saveReferenceLinks();

                  state.client = originalClient;
                  window.showToast = originalToast;
                  return {
                    calendarSaved,
                    calendarText: cell.textContent,
                    calendarRow: state.calendarData[0].note,
                    calendarErrorClass: cell.classList.contains('is-save-error'),
                    rendered,
                    savedPayload
                  };
                }
                """
            )
            if (
                reference_guards["calendarSaved"] is False
                and reference_guards["calendarText"] == "이전 기념"
                and reference_guards["calendarRow"] == "이전 기념"
                and reference_guards["calendarErrorClass"]
                and reference_guards["rendered"]["newGroupButtons"] == 0
                and reference_guards["rendered"]["groupFields"] == 0
                and reference_guards["rendered"]["disabledLinks"] == 1
                and reference_guards["rendered"]["safeUrl"] == "https://example.com/path"
                and reference_guards["rendered"]["unsafeUrl"] == ""
                and reference_guards["savedPayload"][0]["url"] == "https://docs.example.com/"
                and "group_name" not in reference_guards["savedPayload"][0]
            ):
                pass_("calendar-reference-guards", json.dumps(reference_guards, ensure_ascii=False))
            else:
                fail("calendar-reference-guards", json.dumps(reference_guards, ensure_ascii=False))
            reference_page.close()

            if not has_config:
                skip("supabase-backed-flows", "No Supabase config found.")
            else:
                raw_page = browser.new_page(viewport={"width": 1280, "height": 820})
                raw_page.add_init_script(
                    """
                    (() => {
                      localStorage.clear();
                      sessionStorage.clear();
                    })();
                    """
                )
                raw_page.on("pageerror", lambda error: page_errors.append(f"raw-link: {error}"))
                raw_page.on(
                    "console",
                    lambda msg: console_messages.append(f"raw-link {msg.type}: {msg.text}")
                    if msg.type in ("error", "warning")
                    else None,
                )
                raw_page.goto(build_raw_connection_link(app_url, "praise"), wait_until="load")
                raw_page.wait_for_selector(".app-shell", timeout=5000)
                wait_for_supabase_client(raw_page)
                wait_for_praise_data(raw_page)
                raw_link_state = raw_page.evaluate(
                    """
                    (() => ({
                      module: state.module,
                      songs: state.songs.length,
                      connectionError: state.connectionError,
                      injectedConfig: Boolean(window.MINDEX_SUPABASE),
                      hasUrl: Boolean(state.config.url),
                      hasAnonKey: Boolean(state.config.anonKey)
                    }))()
                    """
                )
                if (
                    raw_link_state["module"] == "praise"
                    and raw_link_state["songs"] > 0
                    and not raw_link_state["connectionError"]
                    and raw_link_state["hasUrl"]
                    and raw_link_state["hasAnonKey"]
                ):
                    pass_("share-link-connection", json.dumps(raw_link_state, ensure_ascii=False))
                else:
                    fail("share-link-connection", json.dumps(raw_link_state, ensure_ascii=False))
                raw_page.close()

                wait_for_supabase_client(page)
                page.evaluate("goHome()")
                page.wait_for_function("() => document.body.dataset.module === 'home'", timeout=5000)
                home_order = page.evaluate(
                    """
                    [...document.querySelectorAll('.home-sidebar-card span')].map((node) => node.textContent.trim())
                    """
                )
                home_visibility_state = page.evaluate(
                    """
                    (() => {
                      const first = document.querySelector('.home-sidebar-card');
                      const firstStyle = first ? getComputedStyle(first) : null;
                      const probe = document.createElement('span');
                      probe.style.position = 'absolute';
                      probe.style.background = 'var(--sidebar-active-bg)';
                      document.body.appendChild(probe);
                      const activeBackground = getComputedStyle(probe).backgroundColor;
                      probe.remove();
                      return {
                        hasActivities: Boolean(document.querySelector('.home-sidebar-card.activities')),
                        disabledSections: document.querySelectorAll('.home-sidebar-section--disabled').length,
                        activeCards: document.querySelectorAll('.home-sidebar-card.active').length,
                        firstBackground: firstStyle?.backgroundColor || '',
                        activeBackground,
                        firstLooksActive: Boolean(firstStyle && firstStyle.backgroundColor === activeBackground)
                      };
                    })()
                    """
                )
                expected_home_order = ["예배"]
                if (
                    home_order == expected_home_order
                    and not home_visibility_state["hasActivities"]
                    and home_visibility_state["disabledSections"] == 0
                    and home_visibility_state["activeCards"] == 0
                    and not home_visibility_state["firstLooksActive"]
                ):
                    pass_("home-sidebar-hierarchy", json.dumps({"order": home_order, "visibility": home_visibility_state}, ensure_ascii=False))
                else:
                    fail("home-sidebar-hierarchy", json.dumps({"order": home_order, "visibility": home_visibility_state}, ensure_ascii=False))

                home_design_state = page.evaluate(
                    """
                    (() => {
                      const workbench = document.querySelector('.home-workbench');
                      const main = document.querySelector('.home-workbench-main');
                      const commandPanel = document.querySelector('.home-command-panel');
                      const actionGrid = document.querySelector('.home-action-grid');
                      const resourcePanel = document.querySelector('.home-resource-panel');
                      const resourceRows = [...document.querySelectorAll('.home-resource-row')];
                      const rect = (node) => {
                        const r = node?.getBoundingClientRect();
                        return r ? { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top) } : null;
                      };
                      return {
                        hasWorkbench: Boolean(workbench),
                        hasMain: Boolean(main),
                        hasCommandPanel: Boolean(commandPanel),
                        hasResourcePanel: Boolean(resourcePanel),
                        actionTiles: actionGrid?.children.length || 0,
                        resourceRows: resourceRows.length,
                        main: rect(main),
                        resourceLabels: resourceRows.map((row) => row.querySelector('strong')?.textContent.trim() || ''),
                        primaryActions: [...document.querySelectorAll('.home-primary-actions button')]
                          .map((node) => node.textContent.trim()),
                        chevrons: document.querySelectorAll('.home-resource-go').length,
                        text: document.querySelector('.home-screen')?.innerText || '',
                        overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                      };
                    })()
                    """
                )
                if (
                    home_design_state["hasWorkbench"]
                    and home_design_state["hasMain"]
                    and home_design_state["hasCommandPanel"]
                    and not home_design_state["hasResourcePanel"]
                    and home_design_state["actionTiles"] == 4
                    and home_design_state["resourceRows"] == 0
                    and home_design_state["main"]["height"] >= 180
                    and home_design_state["resourceLabels"] == []
                    and "구성" not in home_design_state["primaryActions"]
                    and home_design_state["chevrons"] == 0
                    and "데이터 상태" not in home_design_state["text"]
                    and "1 services" not in home_design_state["text"]
                    and home_design_state["overflow"] <= 2
                ):
                    pass_("home-design-shell", json.dumps(home_design_state, ensure_ascii=False))
                else:
                    fail("home-design-shell", json.dumps(home_design_state, ensure_ascii=False))

                spacing_modules = ["home", "service", "presenter", "scripture", "praise", "calendar", "references"]
                module_spacing = []
                for module_id in spacing_modules:
                    page.evaluate("(moduleId) => switchModule(moduleId)", module_id)
                    page.wait_for_function("(moduleId) => document.body.dataset.module === moduleId", arg=module_id, timeout=5000)
                    page.wait_for_timeout(120)
                    module_spacing.append(
                        page.evaluate(
                            """
                            (moduleId) => {
                              const topbar = document.querySelector('.topbar')?.getBoundingClientRect();
                              const search = document.querySelector('.sidebar-search-wrap')?.getBoundingClientRect();
                              const first = document.querySelector('.detail-pane > *')?.getBoundingClientRect();
                              return {
                                module: moduleId,
                                searchTop: Math.round((search?.top || 0) - (topbar?.bottom || 0)),
                                firstTop: Math.round((first?.top || 0) - (topbar?.bottom || 0)),
                                overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                              };
                            }
                            """,
                            module_id,
                        )
                    )
                if all(item["searchTop"] == 0 and item["firstTop"] in {24, 25} and item["overflow"] <= 2 for item in module_spacing):
                    pass_("module-start-gutters", json.dumps(module_spacing, ensure_ascii=False))
                else:
                    fail("module-start-gutters", json.dumps(module_spacing, ensure_ascii=False))

                page.click('[data-home-module="scripture"]')
                page.wait_for_function("() => document.body.dataset.module === 'scripture'", timeout=5000)
                page.mouse.move(12, 200)
                topbar_state = page.evaluate(
                    """
                    (() => {
                      const tabs = [...document.querySelectorAll('.nav-rail .nav-rail-tab')];
                      const active = document.querySelector('.nav-rail .nav-rail-tab.active');
                      const activeIcon = active?.querySelector('svg');
                      const activeStyles = active ? getComputedStyle(active) : null;
                      const activeIconStyles = activeIcon ? getComputedStyle(activeIcon) : null;
                      const activeIconRect = activeIcon?.getBoundingClientRect();
                      const probe = document.createElement('span');
                      probe.style.position = 'absolute';
                      probe.style.color = 'var(--accent)';
                      document.body.appendChild(probe);
                      const expected = getComputedStyle(probe);
                      const expectedColor = expected.color;
                      const output = {
                        order: tabs.map((tab) => tab.getAttribute('aria-label') || ''),
                        active: active?.dataset.homeModule || '',
                        activeColor: activeStyles?.color || '',
                        expectedColor,
                        activeIconColor: activeIconStyles?.color || '',
                        activeIconWidth: Math.round(activeIconRect?.width || 0),
                        activeIconHeight: Math.round(activeIconRect?.height || 0),
                        activeIconStroke: activeIconStyles?.strokeWidth || ''
                      };
                      probe.remove();
                      return output;
                    })()
                    """
                )
                expected_topbar_order = ["홈", "예배", "말씀", "찬양", "교회력", "참고자료"]
                if (
                    topbar_state["order"] == expected_topbar_order
                    and topbar_state["active"] == "scripture"
                    and topbar_state["activeColor"] == topbar_state["expectedColor"]
                    and topbar_state["activeIconColor"] == topbar_state["expectedColor"]
                    and topbar_state["activeIconWidth"] == 16
                    and topbar_state["activeIconHeight"] == 16
                    and topbar_state["activeIconStroke"] == "1.5px"
                ):
                    pass_("navigation-rail-order-active-style", json.dumps(topbar_state, ensure_ascii=False))
                else:
                    fail("navigation-rail-order-active-style", json.dumps(topbar_state, ensure_ascii=False))

                page.click('.nav-rail [data-home-module="scripture"]')
                nav_repeat_state = page.evaluate(
                    """() => ({
                      module: document.body.dataset.module,
                      collapsed: document.body.classList.contains('sidebar-collapsed')
                    })"""
                )
                if nav_repeat_state == {"module": "scripture", "collapsed": False}:
                    pass_("navigation-rail-does-not-toggle", json.dumps(nav_repeat_state, ensure_ascii=False))
                else:
                    fail("navigation-rail-does-not-toggle", json.dumps(nav_repeat_state, ensure_ascii=False))

                page.click('.nav-rail [data-home-module="home"]')
                page.wait_for_function("() => document.body.dataset.module === 'home'", timeout=5000)
                home_rail_state = page.evaluate(
                    """() => ({
                      module: document.body.dataset.module,
                      collapsed: document.body.classList.contains('sidebar-collapsed'),
                      active: document.querySelector('.nav-rail .nav-rail-tab.active')?.dataset.homeModule || ''
                    })"""
                )
                if home_rail_state == {"module": "home", "collapsed": False, "active": "home"}:
                    pass_("navigation-rail-home", json.dumps(home_rail_state, ensure_ascii=False))
                else:
                    fail("navigation-rail-home", json.dumps(home_rail_state, ensure_ascii=False))

                page.click('.nav-rail [data-home-module="scripture"]')
                page.wait_for_function("() => document.body.dataset.module === 'scripture'", timeout=5000)
                page.click("#brandNameHome")
                page.wait_for_function("() => document.body.dataset.module === 'home'", timeout=5000)
                wordmark_state = page.evaluate(
                    """() => ({
                      module: document.body.dataset.module,
                      collapsed: document.body.classList.contains('sidebar-collapsed')
                    })"""
                )
                if wordmark_state == {"module": "home", "collapsed": False}:
                    pass_("wordmark-goes-home", json.dumps(wordmark_state, ensure_ascii=False))
                else:
                    fail("wordmark-goes-home", json.dumps(wordmark_state, ensure_ascii=False))

                page.evaluate("switchModule('scripture')")
                page.wait_for_function("() => document.body.dataset.module === 'scripture'", timeout=5000)
                page.hover(".page-tab")
                single_tab_close_before = page.locator(".page-tab-close").count()
                page.click(".page-tab-close")
                page.wait_for_function("() => document.body.dataset.module === 'home'", timeout=5000)
                single_tab_close_state = page.evaluate(
                    """() => ({
                      module: document.body.dataset.module,
                      tabs: document.querySelectorAll('.page-tab').length,
                      closeButtons: document.querySelectorAll('.page-tab-close').length
                    })"""
                )
                if single_tab_close_before == 1 and single_tab_close_state == {"module": "home", "tabs": 1, "closeButtons": 0}:
                    pass_("single-nonhome-tab-close-goes-home", json.dumps(single_tab_close_state, ensure_ascii=False))
                else:
                    fail(
                        "single-nonhome-tab-close-goes-home",
                        json.dumps({"before": single_tab_close_before, "after": single_tab_close_state}, ensure_ascii=False),
                    )

                page.evaluate("switchModule('calendar')")
                page.wait_for_function("() => document.body.dataset.module === 'calendar'", timeout=5000)
                page.wait_for_selector(".cal-tab.active", timeout=15000)
                calendar_state = page.evaluate(
                    """
                    (() => ({
                      placeholder: document.querySelector('#searchInput')?.placeholder || '',
                      hasCalendar: Boolean(document.querySelector('.cal-view') || document.querySelector('.empty-detail')),
                      activeTab: document.querySelector('.cal-tab.active')?.textContent.trim() || '',
                      departmentHeaders: [...document.querySelectorAll('.cal-table thead th')]
                        .map((node) => node.textContent.replace(/\\s+/g, ' ').trim())
                        .map((text) => text.normalize('NFC'))
                        .filter((text) => text.includes('부')),
                      widths: [...document.querySelectorAll('.cal-table thead th')]
                        .map((node) => Math.round(node.getBoundingClientRect().width)),
                      wrapperWidth: Math.round(document.querySelector('.cal-table-wrap')?.clientWidth || 0),
                      tableClass: document.querySelector('.cal-table')?.className || '',
                      tableScrollWidth: Math.round(document.querySelector('.cal-table')?.scrollWidth || 0),
                      hasYearEndRow: document.body.textContent.includes('송구영신예배'),
                      hasFootnote: document.querySelector('.cal-footnote')?.textContent.includes('부활절 기간 동안 사도행전을 읽는 것으로') || false,
                      footnoteHasBreak: Boolean(document.querySelector('.cal-footnote br')),
                      overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                    }))()
                    """
                )
                expected_department_headers = [
                    "유치부 기도자",
                    "어린이부 기도자",
                    "청소년부 기도자",
                    "청소년부 봉헌기도자",
                    "청소년부 설교자",
                    "청년부 기도자",
                ]
                if (
                    calendar_state["placeholder"] == "검색..."
                    and calendar_state["hasCalendar"]
                    and calendar_state["activeTab"] == "부서 일과"
                    and calendar_state["departmentHeaders"] == expected_department_headers
                    and "cal-table--departments" in calendar_state["tableClass"]
                    and 0 <= calendar_state["tableScrollWidth"] - calendar_state["wrapperWidth"] <= 32
                    and calendar_state["widths"][4] >= 90
                    and min(calendar_state["widths"][3:]) >= 90
                    and calendar_state["hasYearEndRow"]
                    and calendar_state["hasFootnote"]
                    and not calendar_state["footnoteHasBreak"]
                    and calendar_state["overflow"] <= 2
                ):
                    pass_("calendar-utility-shell", json.dumps(calendar_state, ensure_ascii=False))
                else:
                    fail("calendar-utility-shell", json.dumps(calendar_state, ensure_ascii=False))

                page.click('[data-calendar-detail-tab="lectionary"]')
                calendar_lectionary_state = page.evaluate(
                    """
                    (() => ({
                      activeTab: document.querySelector('.cal-tab.active')?.textContent.trim() || '',
                      headers: [...document.querySelectorAll('.cal-table thead th')]
                        .map((node) => node.textContent.replace(/\\s+/g, ' ').trim())
                        .slice(-5),
                      widths: [...document.querySelectorAll('.cal-table thead th')]
                        .map((node) => Math.round(node.getBoundingClientRect().width)),
                      wrapperWidth: Math.round(document.querySelector('.cal-table-wrap')?.clientWidth || 0),
                      tableClass: document.querySelector('.cal-table')?.className || '',
                      tableScrollWidth: Math.round(document.querySelector('.cal-table')?.scrollWidth || 0),
                      overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                    }))()
                    """
                )
                expected_lectionary_headers = ["색깔", "첫째 읽기", "시편", "둘째 읽기", "복음서"]
                if (
                    calendar_lectionary_state["activeTab"] == "성서일과"
                    and calendar_lectionary_state["headers"] == expected_lectionary_headers
                    and "cal-table--lectionary" in calendar_lectionary_state["tableClass"]
                    and abs(calendar_lectionary_state["tableScrollWidth"] - calendar_lectionary_state["wrapperWidth"]) <= 2
                    and min(calendar_lectionary_state["widths"][3:]) >= 118
                    and calendar_lectionary_state["overflow"] <= 2
                ):
                    pass_("calendar-lectionary-tab", json.dumps(calendar_lectionary_state, ensure_ascii=False))
                else:
                    fail("calendar-lectionary-tab", json.dumps(calendar_lectionary_state, ensure_ascii=False))

                page.evaluate("switchModule('references')")
                page.wait_for_function("() => document.body.dataset.module === 'references'", timeout=5000)
                references_state = page.evaluate(
                    """
                    (() => ({
                      placeholder: document.querySelector('#searchInput')?.placeholder || '',
                      hasReferences: Boolean(document.querySelector('.references-shell') || document.querySelector('.empty-detail')),
                      overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                    }))()
                    """
                )
                if references_state["placeholder"] == "검색..." and references_state["hasReferences"] and references_state["overflow"] <= 2:
                    pass_("references-utility-shell", json.dumps(references_state, ensure_ascii=False))
                else:
                    fail("references-utility-shell", json.dumps(references_state, ensure_ascii=False))

                reference_search_state = page.evaluate(
                    """
                    (() => ({
                      title: document.querySelector('.reference-card strong')?.textContent.trim() || '',
                      before: document.querySelectorAll('.reference-card').length
                    }))()
                    """
                )
                if reference_search_state["title"]:
                    page.fill("#searchInput", reference_search_state["title"])
                    page.wait_for_function(
                        """
                        () => !document.querySelector('.global-search-section')
                          && document.querySelector('.references-shell')
                          && document.querySelectorAll('.reference-card').length > 0
                        """,
                        timeout=5000,
                    )
                    reference_search_state.update(page.evaluate(
                        """
                        () => ({
                          after: document.querySelectorAll('.reference-card').length,
                          globalSections: document.querySelectorAll('.global-search-section').length
                        })
                        """
                    ))
                    if reference_search_state["after"] < reference_search_state["before"] and reference_search_state["globalSections"] == 0:
                        pass_("references-local-search", json.dumps(reference_search_state, ensure_ascii=False))
                    else:
                        fail("references-local-search", json.dumps(reference_search_state, ensure_ascii=False))
                    page.press("#searchInput", "Enter")
                    reference_search_state["moduleAfterEnter"] = page.evaluate("() => document.body.dataset.module || ''")
                    if reference_search_state["moduleAfterEnter"] != "references":
                        fail("references-search-enter", json.dumps(reference_search_state, ensure_ascii=False))
                    else:
                        pass_("references-search-enter", json.dumps(reference_search_state, ensure_ascii=False))
                    page.fill("#searchInput", "")

                page.click('[data-home-module="service"]')
                wait_for_service_data(page)
                wait_for_module_data(page, "service")
                snapshot = get_app_snapshot(page)
                if snapshot.get("serviceError") or snapshot.get("connectionError"):
                    fail("service-data-load", json.dumps(snapshot, ensure_ascii=False))
                elif snapshot.get("serviceTypes", 0) > 0 and snapshot.get("services", 0) >= 0:
                    pass_("service-data-load", json.dumps(snapshot, ensure_ascii=False))
                else:
                    fail("service-data-load", json.dumps(snapshot, ensure_ascii=False))

                page.fill("#searchInput", "창세기")
                page.wait_for_selector(".global-search-section", timeout=5000)
                global_search_state = page.evaluate(
                    """
                    (() => ({
                      module: document.body.dataset.module || '',
                      headings: [...document.querySelectorAll('.global-search-heading')]
                        .map((node) => node.textContent.trim()),
                      scriptureResults: document.querySelectorAll('[data-global-book-code], [data-global-bible-text]').length,
                      serviceLocalRows: document.querySelectorAll('.service-type-row, .service-sidebar-card').length,
                      overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                    }))()
                    """
                )
                if (
                    global_search_state["module"] == "service"
                    and "말씀" in global_search_state["headings"]
                    and global_search_state["scriptureResults"] > 0
                    and global_search_state["serviceLocalRows"] == 0
                    and global_search_state["overflow"] <= 2
                ):
                    pass_("global-search-cross-module", json.dumps(global_search_state, ensure_ascii=False))
                else:
                    fail("global-search-cross-module", json.dumps(global_search_state, ensure_ascii=False))

                page.fill("#searchInput", "")
                page.wait_for_selector("[data-service-list]", timeout=5000)

                service_sidebar_gap = page.evaluate(
                    """
                    (() => {
                      const search = document.querySelector('.sidebar-search-wrap')?.getBoundingClientRect();
                      const headNode = document.querySelector('.service-sidebar-head');
                      const head = headNode?.getBoundingClientRect();
                      const label = headNode?.querySelector('span')?.getBoundingClientRect();
                      const headStyles = headNode ? getComputedStyle(headNode) : null;
                      const sidebar = document.querySelector('.sidebar')?.getBoundingClientRect();
                      return {
                        gap: search && head ? Math.round(head.top - search.bottom) : 0,
                        headHeight: Math.round(head?.height || 0),
                        headLineHeight: headStyles?.lineHeight || '',
                        headLeft: sidebar && head ? Math.round(head.left - sidebar.left) : 0,
                        labelLeft: sidebar && label ? Math.round(label.left - sidebar.left) : 0
                      };
                    })()
                    """
                )
                if (
                    service_sidebar_gap["gap"] == 16
                    and service_sidebar_gap["headHeight"] < 18
                    and service_sidebar_gap["headLeft"] == 0
                    and service_sidebar_gap["labelLeft"] == 8
                ):
                    pass_("service-sidebar-section-label-gap", json.dumps(service_sidebar_gap, ensure_ascii=False))
                else:
                    fail("service-sidebar-section-label-gap", json.dumps(service_sidebar_gap, ensure_ascii=False))

                page.locator("[data-service-list]").first.click()
                page.wait_for_selector(".service-date-list", timeout=5000)
                service_gutter = page.evaluate(
                    """
                    (() => {
                      const detail = document.querySelector('.detail-pane')?.getBoundingClientRect();
                      const list = document.querySelector('.service-date-list')?.getBoundingClientRect();
                      const title = document.querySelector('.service-date-list-title')?.getBoundingClientRect();
                      const styles = getComputedStyle(document.querySelector('.service-date-list'));
                      return {
                        listLeft: Math.round((list?.left || 0) - (detail?.left || 0)),
                        titleLeft: Math.round((title?.left || 0) - (detail?.left || 0)),
                        paddingLeft: Math.round(parseFloat(styles.paddingLeft)),
                        hasGroups: Boolean(document.querySelector('.service-list-groups')),
                        overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                      };
                    })()
                    """
                )
                if (
                    service_gutter["listLeft"] in {24, 25}
                    and service_gutter["titleLeft"] in {24, 25}
                    and service_gutter["paddingLeft"] == 0
                    and service_gutter["hasGroups"]
                    and service_gutter["overflow"] <= 2
                ):
                    pass_("service-date-list-gutter", json.dumps(service_gutter, ensure_ascii=False))
                else:
                    fail("service-date-list-gutter", json.dumps(service_gutter, ensure_ascii=False))

                page.evaluate(
                    """
                    (() => {
                      renderServiceTemplatesDetail();
                    })()
                    """
                )
                page.wait_for_selector(".svc-template-card, .svc-template-level-card", timeout=5000)
                template_gutter = page.evaluate(
                    """
                    (() => {
                      const detail = document.querySelector('.detail-pane')?.getBoundingClientRect();
                      const root = document.querySelector('.service-templates')?.getBoundingClientRect();
                      const title = document.querySelector('.service-templates .service-date-list-title')?.getBoundingClientRect();
                      const grid = document.querySelector('.svc-template-level-grid, .svc-template-draft-grid')?.getBoundingClientRect();
                      const styles = getComputedStyle(document.querySelector('.service-templates'));
                      return {
                        rootLeft: Math.round((root?.left || 0) - (detail?.left || 0)),
                        titleLeft: Math.round((title?.left || 0) - (detail?.left || 0)),
                        gridLeft: Math.round((grid?.left || 0) - (detail?.left || 0)),
                        paddingLeft: Math.round(parseFloat(styles.paddingLeft)),
                        overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                      };
                    })()
                    """
                )
                if (
                    template_gutter["rootLeft"] in {24, 25}
                    and template_gutter["titleLeft"] in {24, 25}
                    and template_gutter["gridLeft"] in {24, 25}
                    and template_gutter["paddingLeft"] == 0
                    and template_gutter["overflow"] <= 2
                ):
                    pass_("service-template-gutter", json.dumps(template_gutter, ensure_ascii=False))
                else:
                    fail("service-template-gutter", json.dumps(template_gutter, ensure_ascii=False))

                template_mode = page.evaluate(
                    """
                    () => document.querySelector('.svc-template-card') ? 'classic' : 'worship'
                    """
                )
                if template_mode == "classic":
                    page.evaluate(
                        """
                        (() => {
                          const card = [...document.querySelectorAll('.svc-template-card')]
                            .find((item) => item.querySelector('.svc-template-step-row'));
                          if (card) card.open = true;
                        })()
                        """
                    )
                    page.wait_for_function("() => document.querySelector('.svc-template-card[open] .svc-template-step-row')", timeout=5000)
                    template_terms = page.evaluate(
                        """
                        (() => {
                          const root = [...document.querySelectorAll('.svc-template-card[open]')]
                            .find((item) => item.querySelector('.svc-template-step-row')) || document;
                          const row = root.querySelector('.svc-template-step-row') || root;
                          const fieldLabels = [...row.querySelectorAll('.svc-template-step-field small')];
                          const headerLabels = [...root.querySelectorAll('.svc-template-step-header span')].slice(1, 7);
                          return {
                            mode: 'classic',
                            labels: (fieldLabels.length ? fieldLabels : headerLabels)
                              .slice(0, 6)
                              .map((node) => node.textContent.trim()),
                            toggles: [...row.querySelectorAll('.svc-template-step-toggle span')]
                              .slice(0, 3)
                              .map((node) => node.textContent.trim()),
                            addText: root.querySelector('.svc-template-add')?.textContent.trim() || '',
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                          };
                        })()
                        """
                    )
                    expected_labels = ["섹션", "기본 항목", "흐름", "타입", "템플릿", "출력"]
                    expected_toggles = ["필수", "유동", "반복"]
                    if (
                        template_terms["labels"] == expected_labels
                        and template_terms["toggles"] == expected_toggles
                        and template_terms["addText"] == "+ 섹션"
                        and template_terms["overflow"] <= 2
                    ):
                        pass_("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))
                    else:
                        fail("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))
                else:
                    template_terms = page.evaluate(
                        """
                        (() => ({
                          mode: 'worship',
                          templateVersionBaseline: {
                            version: PUBLIC_WORSHIP_TEMPLATE_VERSION,
                            effectiveFrom: PUBLIC_WORSHIP_TEMPLATE_EFFECTIVE_FROM,
                            versions: ['sunday-first', 'sunday-second', 'sunday-main', 'sunday-afternoon', 'monthly', 'wednesday']
                              .map((typeId) => resolvePublicWorshipTemplateVersion(typeId, { service: { type_id: typeId, date: '2026-07-05' } })?.version || ''),
                          },
                          levels: [...document.querySelectorAll('.svc-template-level-card strong')]
                            .map((node) => node.textContent.trim()),
                          monthlyFirst: (() => {
                            const step = serviceOrderTemplate('monthly')[0] || {};
                            return {
                              label: step.label || step.name || '',
                              elementType: step.elementType || step.element_type || step.componentType || step.component_type || ''
                            };
                          })(),
                          fridayScaffold: (() => {
                            const scaffold = buildWorshipServiceScaffold('__smoke_friday__', 'friday');
                            return {
                              sections: scaffold.sections.map((section) => section.title || ''),
                              labels: scaffold.elements.map((element) => element.source_ref?.label || ''),
                              rawTitles: projectWorshipServiceItemsFromTemplate({
                                id: '__smoke_friday__',
                                type_id: 'friday',
                                date: '2026-07-17',
                              }, []).map((item) => ({
                                label: item.label || '',
                                rawTitle: item.raw_title || '',
                                sectionKey: item._worshipSectionKey || '',
                              })),
                            };
                          })(),
                          monthlyScaffold: (() => {
                            const scaffold = buildWorshipServiceScaffold('__smoke_service__', 'monthly');
                            const sections = scaffold.sections.map((section) => ({
                              key: section.section_key || '',
                              title: section.title || '',
                              elements: scaffold.elements
                                .filter((element) => element.section_id === section.id)
                                .map((element) => ({
                                  type: element.element_type || '',
                                  label: element.source_ref?.label || ''
                                }))
                            }));
                            const defaultsFor = (sectionKey) => {
                              const section = scaffold.sections.find((item) => item.section_key === sectionKey);
                              return scaffold.elements
                                .filter((element) => element.section_id === section?.id)
                                .map((element) => ({
                                  label: element.source_ref?.label || '',
                                  title: element.title || '',
                                  formHint: element.config?.formHint || '',
                                  forms: element.config?.formPreset?.forms || [],
                                  strength: element.config?.defaultStrength || element.config?.formPreset?.strength || ''
                                }));
                            };
                            return {
                              sections: scaffold.sections.length,
                              elements: scaffold.elements.length,
                              firstSection: scaffold.sections[0]?.title || '',
                              firstElementType: scaffold.elements[0]?.element_type || '',
                              firstElementLabel: scaffold.elements[0]?.source_ref?.label || '',
                              firstElementTitle: scaffold.elements[0]?.title || '',
                              sectionKeys: sections.map((section) => section.key),
                              praiseElements: sections.find((section) => section.key === 'praise')?.elements || [],
                              corporatePrayerElements: sections.find((section) => section.key === 'corporate_prayer')?.elements || [],
                              prayerSection: (() => {
                                const prayer = sections.find((section) => section.key === 'prayer');
                                return {
                                  title: prayer?.title || '',
                                  elements: prayer?.elements || [],
                                  defaults: defaultsFor('prayer')
                                };
                              })(),
                              sermonSection: (() => {
                                const sermon = sections.find((section) => section.key === 'sermon');
                                return {
                                  title: sermon?.title || '',
                                  elements: sermon?.elements || []
                                };
                              })(),
                              responseSection: (() => {
                                const response = sections.find((section) => section.key === 'response_song');
                                return {
                                  title: response?.title || '',
                                  elements: response?.elements || []
                                };
                              })(),
                              offeringElements: sections.find((section) => section.key === 'offering')?.elements || [],
                              offeringDefaults: defaultsFor('offering'),
                              closingSection: (() => {
                                const closing = sections.find((section) => section.key === 'closing_visual');
                                return {
                                  title: closing?.title || '',
                                  elements: closing?.elements || []
                                };
                              })(),
                              closingVisualSection: (() => {
                                const closing = scaffold.sections.find((section) => section.section_key === 'closing_visual');
                                return {
                                  title: closing?.title || '',
                                  elements: scaffold.elements
                                    .filter((element) => element.section_id === closing?.id)
                                    .map((element) => ({
                                      type: element.element_type || '',
                                      label: element.source_ref?.label || '',
                                      assetUrl: element.config?.asset?.url || ''
                                    }))
                                };
                              })(),
                              closingDefaults: defaultsFor('closing_visual')
                            };
                          })(),
                          publicSpecialRule: (() => {
                            const scaffold = buildWorshipServiceScaffold('__smoke_public__', 'sunday-main');
                            const section = scaffold.sections.find((item) => item.section_key === 'special_song');
                            const element = scaffold.elements.find((item) => item.section_id === section?.id);
                            const rule = element?.config?.formPresetRules?.[0] || null;
                            return {
                              sectionTitle: section?.title || '',
                              elementLabel: element?.source_ref?.label || '',
                              when: rule?.when || {},
                              forms: rule?.formPreset?.forms || [],
                              hint: rule?.formPreset?.hint || '',
                              strength: rule?.formPreset?.strength || ''
                            };
                          })(),
                          sundayPublicScaffold: (() => {
                            const compact = (value) => String(value || '').replace(/\\s+/g, '');
                            const summarize = (typeId, service = null) => {
                              const serviceId = service?.id || `__smoke_${typeId}__`;
                              const scaffold = buildWorshipServiceScaffold(serviceId, typeId, service ? { service } : {});
                              const sections = scaffold.sections.map((section) => ({
                                id: section.id || '',
                                key: section.section_key || '',
                                title: section.title || '',
                                elements: scaffold.elements
                                  .filter((element) => element.section_id === section.id)
                                  .map((element) => ({
                                    type: element.element_type || '',
                                    label: element.source_ref?.label || '',
                                    ...(element.person ? { person: element.person } : {}),
                                    ...(element.config?.introSlide?.title ? { introTitle: element.config.introSlide.title } : {}),
                                    ...(element.config?.introSlide?.body ? { introBody: element.config.introSlide.body } : {}),
                                    ...(element.config?.textHighlights?.length ? { textHighlights: element.config.textHighlights } : {}),
                                    ...(element.config?.formHint ? { formHint: element.config.formHint } : {}),
                                    ...(element.config?.formPreset?.forms ? { forms: element.config.formPreset.forms } : {}),
                                    ...(element.config?.defaultStrength || element.config?.formPreset?.strength ? { strength: element.config.defaultStrength || element.config.formPreset.strength } : {}),
                                    outputMode: element.config?.outputMode || ''
                                  }))
                              }));
                              return {
                                sections: sections.length,
                                elements: scaffold.elements.length,
                                titles: sections.map((section) => section.title),
                                keys: sections.map((section) => section.key),
                                compactTitles: sections.map((section) => compact(section.title)),
                                praiseElements: sections.find((section) => section.key === 'praise')?.elements || [],
                                silentPrayerElements: sections.find((section) => section.key === 'silent_prayer')?.elements || [],
                                hymnElements: sections.find((section) => section.key === 'hymn_praise')?.elements || [],
                                creedElements: sections.find((section) => section.key === 'creed')?.elements || [],
                                prayerElements: sections.find((section) => section.key === 'prayer')?.elements || [],
                                scriptureElements: sections.find((section) => section.key === 'scripture_reading')?.elements || [],
                                communityElements: sections.find((section) => section.key === 'community_confession')?.elements || [],
                                sermonElements: sections.find((section) => section.key === 'sermon')?.elements || [],
                                offeringElements: sections.find((section) => section.key === 'offering')?.elements || [],
                                announcementsElements: sections.find((section) => section.key === 'announcements')?.elements || [],
                                sendingElements: sections.find((section) => section.key === 'sending')?.elements || [],
                                closingElements: sections.find((section) => section.key === 'closing_visual')?.elements || [],
                                closingHymnDefaults: scaffold.elements
                                  .filter((element) =>
                                    element.section_id === sections.find((section) => section.key === 'closing_visual')?.id
                                    && element.source_ref?.label === '폐회찬송'
                                  )
                                  .map((element) => ({
                                    type: element.element_type || '',
                                    label: element.source_ref?.label || '',
                                    title: element.title || '',
                                    formHint: element.config?.formHint || '',
                                    forms: element.config?.formPreset?.forms || [],
                                    strength: element.config?.defaultStrength || element.config?.formPreset?.strength || ''
                                  })),
                                scoreSlots: sections.flatMap((section) =>
                                  section.elements
                                    .filter((element) => element.outputMode === 'score')
                                    .map((element) => `${section.key}:${element.label}`)
                                ),
                                doxologyDefaults: scaffold.elements
                                  .filter((element) => element.source_ref?.label === '송영')
                                  .map((element) => ({
                                    sectionKey: scaffold.sections.find((section) => section.id === element.section_id)?.section_key || '',
                                    title: element.title || ''
                                  }))
                              };
                            };
                            return {
                              first: summarize('sunday-first'),
                              firstPastor: summarize('sunday-first', { id: '__smoke_sunday_first_pastor__', type_id: 'sunday-first', worshipLeader: '김남영 목사' }),
                              second: summarize('sunday-second'),
                              third: summarize('sunday-main'),
                              afternoon: summarize('sunday-afternoon')
                            };
                          })(),
                          commonClosingTemplates: (() => {
                            const summarize = (typeId) => {
                              const template = serviceOrderTemplate(typeId);
                              const last = template[template.length - 1] || {};
                              const scaffold = buildWorshipServiceScaffold(`__smoke_common_${typeId}__`, typeId);
                              const lastSection = scaffold.sections[scaffold.sections.length - 1] || {};
                              return {
                                typeId,
                                lastLabel: last.label || last.name || '',
                                lastSectionKey: last.sectionKey || last.section_key || '',
                                lastScaffoldTitle: lastSection.title || '',
                                lastScaffoldKey: lastSection.section_key || '',
                              };
                            };
                            return ['holy-week-dawn', 'omer', 'special', 'children'].map(summarize);
                          })(),
                          scoreModeMemo: (() => {
                            const memo = serializeServiceItemMemo({ elementType: 'praise', outputMode: 'score' });
                            const parsed = parseServiceItemMemo(memo);
                            return {
                              memo,
                              outputMode: parsed.outputMode || '',
                              serializedKeepsMode: memo.includes('"outputMode":"score"')
                            };
                          })(),
                          formPresetUi: (() => {
                            const memo = serializeServiceItemMemo({
                              formHint: 'V2-C',
                              formPreset: normalizeServiceFormPreset('V2-C', 'V2-C', 'manual'),
                              formPresetRules: [{
                                when: { songType: 'hymn' },
                                formPreset: { forms: ['1절', '2절', '간주', '마지막 절'], hint: '1절-2절-간주-마지막 절' }
                              }]
                            });
                            const parsed = parseServiceItemMemo(memo);
                            const badgeHtml = renderServiceFormPresetBadges({ memo });
                            return {
                              formHint: parsed.formHint || '',
                              forms: parsed.formPreset?.forms || [],
                              strength: parsed.formPreset?.strength || '',
                              badgeText: (() => {
                                const node = document.createElement('div');
                                node.innerHTML = badgeHtml;
                                return node.textContent.trim().replace(/\\s+/g, ' ');
                              })()
                            };
                          })(),
                          fridayNewServiceLeader: (() => {
                            const previousSelectedTypeId = state.selectedServiceTypeId;
                            const previousSelectedServiceId = state.selectedServiceId;
                            const previousForm = state.newServiceForm ? { ...state.newServiceForm } : null;
                            startNewServiceForm('friday');
                            const inputValue = document.querySelector('[data-new-service-field="leader"]')?.value || '';
                            const formLeader = state.newServiceForm?.leader || '';
                            state.selectedServiceTypeId = previousSelectedTypeId;
                            state.selectedServiceId = previousSelectedServiceId;
                            state.newServiceForm = previousForm;
                            renderServiceTemplatesDetail();
                            return {
                              formLeader,
                              inputValue,
                              defaultLeader: defaultServicePraiseLeader('friday'),
                              monthlyDefaultLeader: defaultServicePraiseLeader('monthly')
                            };
                          })(),
                          serviceInstanceOverride: (() => {
                            const serviceId = '__smoke_instance_override__';
                            const previousServices = state.services;
                            const previousItems = state.serviceItems[serviceId];
                            const previousSelectedServiceId = state.selectedServiceId;
                            const previousDirty = state.dirty.service;
                            const scaffold = buildWorshipServiceScaffold(serviceId, 'sunday-main');
                            state.services = previousServices.filter((service) => service.id !== serviceId).concat([{
                              id: serviceId,
                              type_id: 'sunday-main',
                              date: '2026-07-05',
                              tags: []
                            }]);
                            state.serviceItems[serviceId] = groupWorshipElements(scaffold.sections, scaffold.elements)[serviceId] || [];
                            state.selectedServiceId = serviceId;
                            const items = state.serviceItems[serviceId];
                            const index = items.findIndex((item) => item._worshipSectionKey === 'offering' && item.label === '봉헌찬송');
                            const beforeTitle = items[index]?.raw_title || '';
                            const input = document.createElement('input');
                            input.dataset.serviceItemField = 'raw_title';
                            input.dataset.serviceItemIndex = String(index);
                            input.value = '봉헌특송';
                            updateServiceItemField(input);
                            const afterItem = state.serviceItems[serviceId][index] || {};
                            const afterMemo = parseServiceItemMemo(afterItem.memo);
                            const legacyMemo = parseServiceItemMemo(JSON.stringify({ outputMode: 'score' }));
                            const templateOffering = serviceOrderTemplate('sunday-main')
                              .find((step) => (step.sectionKey || step.section_key) === 'offering')
                              ?.elements?.find((element) => element.label === '봉헌찬송') || {};
                            state.services = previousServices;
                            if (previousItems === undefined) delete state.serviceItems[serviceId];
                            else state.serviceItems[serviceId] = previousItems;
                            state.selectedServiceId = previousSelectedServiceId;
                            state.dirty.service = previousDirty;
                            return {
                              label: afterItem.label || '',
                              sectionKey: afterItem._worshipSectionKey || '',
                              beforeTitle,
                              afterTitle: afterItem.raw_title || '',
                              outputMode: afterMemo.outputMode || '',
                              effectiveOutputMode: serviceItemOutputMode(afterItem, afterMemo),
                              legacyEffectiveOutputMode: serviceItemOutputMode({ ...afterItem, memo: JSON.stringify({ outputMode: 'score' }) }, legacyMemo),
                              templateTitle: templateOffering.default_text || '',
                              templateLabel: templateOffering.label || ''
                            };
                          })(),
                          legacyHierarchyCleanup: (() => {
                            const service = {
                              id: '__smoke_legacy_hierarchy__',
                              type_id: 'sunday-main',
                              date: '2026-07-05'
                            };
                            const sectionIds = {
                              sending: '11111111-1111-4111-8111-111111111111',
                              closing: '22222222-2222-4222-8222-222222222222',
                              oldBenediction: '33333333-3333-4333-8333-333333333333',
                              oldLordsPrayer: '44444444-4444-4444-8444-444444444444',
                              oldClosingHymn: '55555555-5555-4555-8555-555555555555'
                            };
                            const item = (id, label, key, sectionId, order) => normalizeServiceItem({
                              id,
                              service_id: service.id,
                              sort_order: order,
                              label,
                              raw_title: label,
                              _worshipSectionId: sectionId,
                              _worshipSectionKey: key,
                              _worshipSectionTitle: label,
                              _worshipSectionOrder: order,
                              _worshipElementOrder: 1,
                              memo: serializeServiceItemMemo({ elementType: label === '폐회찬송' ? 'praise' : 'title_person' })
                            });
                            const items = [
                              item('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '축도', 'benediction', sectionIds.oldBenediction, 3),
                              item('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '주기도문', 'lords_prayer', sectionIds.oldLordsPrayer, 4),
                              item('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '마무리', 'closing_visual', sectionIds.closing, 5),
                              item('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '폐회찬송', 'closing_hymn', sectionIds.oldClosingHymn, 2),
                            ];
                            const normalized = normalizeServiceItemsForTemplateHierarchy(service, items);
                            const sections = [
                              { id: sectionIds.sending, service_id: service.id, sort_order: 14, section_key: 'sending', title: '파송', source_ref: {}, config: {} },
                              { id: sectionIds.closing, service_id: service.id, sort_order: 15, section_key: 'closing_visual', title: '폐회', source_ref: {}, config: {} },
                              { id: sectionIds.oldBenediction, service_id: service.id, sort_order: 9, section_key: 'benediction', title: '축도', source_ref: {}, config: {} },
                              { id: sectionIds.oldLordsPrayer, service_id: service.id, sort_order: 10, section_key: 'lords_prayer', title: '주기도문', source_ref: {}, config: {} },
                              { id: sectionIds.oldClosingHymn, service_id: service.id, sort_order: 11, section_key: 'closing_hymn', title: '폐회찬송', source_ref: {}, config: {} },
                            ];
                            const existingSectionById = Object.fromEntries(sections.map((section) => [section.id, section]));
                            const existingElementById = Object.fromEntries(items.map((row) => [row.id, { id: row.id, section_id: row._worshipSectionId, source_ref: {}, config: {} }]));
                            const rows = buildWorshipPersistenceRows(service, normalized, existingSectionById, existingElementById);
                            return {
                              normalized: normalized.map((row) => ({
                                label: row.label,
                                key: row._worshipSectionKey,
                                title: row._worshipSectionTitle,
                                sectionId: row._worshipSectionId
                              })),
                              persistedSections: rows.sections.map((section) => ({
                                id: section.id,
                                key: section.section_key,
                                title: section.title
                              })),
                              persistedElementSections: rows.elements.map((element) => ({
                                id: element.id,
                                sectionId: element.section_id
                              }))
                            };
                          })(),
                          generatedSectionPersistence: (() => {
                            const service = { id: '__smoke_generated_section__', type_id: 'monthly', date: '2026-07-03' };
                            const sectionId = '99999999-9999-4999-8999-999999999999';
                            const items = ['첫 항목', '둘째 항목'].map((label, index) => normalizeServiceItem({
                              id: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee${index + 1}`,
                              service_id: service.id,
                              sort_order: index + 1,
                              label,
                              raw_title: '',
                              _worshipSectionId: sectionId,
                              _worshipSectionKey: 'generated_section',
                              _worshipSectionTitle: '새 섹션',
                              _worshipSectionOrder: 1,
                              _worshipElementOrder: index + 1,
                              memo: serializeServiceItemMemo({ elementType: 'title' })
                            }));
                            const rows = buildWorshipPersistenceRows(service, items, {}, {});
                            return {
                              sectionCount: rows.sections.length,
                              elementCount: rows.elements.length,
                              sortOrders: rows.sections.map((section) => section.sort_order),
                              sharedSection: new Set(rows.elements.map((element) => element.section_id)).size === 1,
                            };
                          })(),
                          templateSuppressionProjection: (() => {
                            const service = { id: '__smoke_template_suppression__', type_id: 'monthly', date: '2026-07-03' };
                            const scaffold = buildWorshipServiceScaffold(service.id, service.type_id, { service });
                            const items = groupWorshipElements(scaffold.sections, scaffold.elements)[service.id] || [];
                            const target = items.find((item) => item.label === '결단기도') || {};
                            const suppressed = {
                              ...target,
                              memo: serializeServiceItemMemo({ ...parseServiceItemMemo(target.memo), templateSuppressed: true }),
                            };
                            const projected = projectWorshipServiceItemsFromTemplate(service, [suppressed]);
                            return {
                              sourceFound: Boolean(target.id),
                              suppressed: isTemplateSuppressedServiceItem(suppressed),
                              projected: projected.some((item) => item.label === '결단기도'),
                            };
                          })(),
                          sundayFirstSendingPrune: (() => {
                            const sectionId = '66666666-6666-4666-8666-666666666666';
                            const item = (id, label, key, order, assignee = '') => normalizeServiceItem({
                              id,
                              service_id: '__smoke_sunday_first_sending__',
                              sort_order: order,
                              label,
                              raw_title: label,
                              assignee,
                              _worshipSectionId: sectionId,
                              _worshipSectionKey: key,
                              _worshipSectionTitle: label,
                              _worshipSectionOrder: order,
                              _worshipElementOrder: order,
                              memo: serializeServiceItemMemo({ elementType: label === '주기도문' ? 'body' : 'title_person' })
                            });
                            const items = [
                              item('77777777-7777-4777-8777-777777777777', '축도', 'benediction', 1),
                              item('88888888-8888-4888-8888-888888888888', '주기도문', 'lords_prayer', 2),
                              item('99999999-9999-4999-8999-999999999999', '설교 제목', 'sermon', 3, '김남영 목사'),
                            ];
                            const pastorPreacher = normalizeServiceItemsForTemplateHierarchy(
                              { id: '__smoke_sunday_first_lay__', type_id: 'sunday-first', worshipLeader: '인도자' },
                              items,
                            ).map((row) => row.label);
                            const layPreacher = normalizeServiceItemsForTemplateHierarchy(
                              { id: '__smoke_sunday_first_pastor_existing__', type_id: 'sunday-first', worshipLeader: '김남영 목사' },
                              items.map((row) => row.label === '설교 제목' ? { ...row, assignee: '이준철 전도사' } : row),
                            ).map((row) => row.label);
                            return { pastorPreacher, layPreacher };
                          })(),
                          fullscreenSermonBodyCompatibility: (() => {
                            const service = { id: '__smoke_fullscreen_sermon_body__', type_id: 'sunday-first', date: '2026-07-05' };
                            const previousServices = state.services.slice();
                            state.services.push(service);
                            const item = normalizeServiceItem({
                              id: '__smoke_fullscreen_sermon_body_item__',
                              service_id: service.id,
                              label: '설교 본문',
                              raw_title: '요 21:15-25',
                              _worshipSectionKey: 'sermon',
                              _worshipSectionTitle: '설교',
                              memo: serializeServiceItemMemo({ elementType: 'scripture_body', inputMode: 'scripture', scriptureReference: '요 21:15-25' })
                            });
                            const memo = parseServiceItemMemo(item.memo);
                            const content = resolvePresenterServiceItemContentState(item, memo, null, service);
                            const slides = buildPresenterSlidesForServiceItem(item, service, 0);
                            const staticInput = presenterServiceInputIsStatic(item, memo);
                            state.services = previousServices;
                            return {
                              staticInput,
                              contentState: content.state || '',
                              reason: content.reason || '',
                              slideCount: slides.length
                            };
                          })(),
                          cards: document.querySelectorAll('.svc-template-draft-card, .svc-template-inventory-card').length,
                          overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                        }))()
                        """
                    )
                    if (
                        template_terms["levels"] == ["Service", "Section", "Element", "Slide"]
                        and template_terms["monthlyFirst"] == {"label": "준비", "elementType": "video"}
                        and template_terms["monthlyScaffold"]["sections"] == 12
                        and template_terms["monthlyScaffold"]["elements"] == 25
                        and template_terms["monthlyScaffold"]["firstSection"] == "준비"
                        and template_terms["monthlyScaffold"]["firstElementType"] == "video"
                        and template_terms["monthlyScaffold"]["firstElementLabel"] == "대기 영상"
                        and template_terms["monthlyScaffold"]["firstElementTitle"] == ""
                        and "corporate_prayer" in template_terms["monthlyScaffold"]["sectionKeys"]
                        and "sending" in template_terms["monthlyScaffold"]["sectionKeys"]
                        and "closing_visual" in template_terms["monthlyScaffold"]["sectionKeys"]
                        and template_terms["monthlyScaffold"]["praiseElements"][:2] == [
                            {"type": "title_content", "label": "환영"},
                            {"type": "praise", "label": "찬양 1"},
                        ]
                        and template_terms["monthlyScaffold"]["prayerSection"] == {
                            "title": "대표기도",
                            "elements": [{"type": "title_person", "label": "기도"}],
                            "defaults": [{"label": "기도", "title": "", "formHint": "", "forms": [], "strength": ""}],
                        }
                        and template_terms["monthlyScaffold"]["sermonSection"] == {
                            "title": "설교",
                            "elements": [
                                {"type": "title_person", "label": "설교 제목"},
                                {"type": "scripture_body", "label": "설교 본문"},
                            ],
                        }
                        and template_terms["monthlyScaffold"]["responseSection"] == {
                            "title": "결단",
                            "elements": [
                                {"type": "praise", "label": "결단찬양"},
                                {"type": "title_person", "label": "결단기도"},
                            ],
                        }
                        and template_terms["monthlyScaffold"]["closingSection"]["title"] == "폐회"
                        and template_terms["monthlyScaffold"]["closingSection"]["elements"] == [
                            {"type": "image", "label": "마무리"},
                        ]
                        and template_terms["monthlyScaffold"]["closingVisualSection"]["title"] == "폐회"
                        and template_terms["monthlyScaffold"]["closingVisualSection"]["elements"] == [
                            {
                                "type": "image",
                                "label": "마무리",
                                "assetUrl": "assets/worship-templates/public-closing.png",
                            },
                        ]
                        and template_terms["monthlyScaffold"]["offeringDefaults"][0] == {
                            "label": "봉헌찬양",
                            "title": "",
                            "formHint": "V-C",
                            "forms": ["V", "C"],
                            "strength": "suggested",
                        }
                        and template_terms["monthlyScaffold"]["corporatePrayerElements"] == [
                            {"type": "title_person", "label": "공동기도 1"},
                            {"type": "title_person", "label": "공동기도 2"},
                            {"type": "praise", "label": "기도 찬양"},
                            {"type": "title_person", "label": "공동기도 3"},
                            {"type": "title_person", "label": "공동기도 4"},
                        ]
                        and template_terms["publicSpecialRule"] == {
                            "sectionTitle": "특송",
                            "elementLabel": "특송",
                            "when": {"songType": "hymn"},
                            "forms": ["1절", "후렴", "2절", "후렴", "간주", "마지막 절", "후렴"],
                            "hint": "1절-후렴-2절-후렴-간주-마지막 절-후렴",
                            "strength": "default",
                        }
                        and template_terms["sundayPublicScaffold"]["first"]["titles"][:4] == ["준비", "신앙고백", "찬양", "참회기도"]
                        and "환영" not in template_terms["sundayPublicScaffold"]["first"]["titles"]
                        and all(element["label"] != "환영" for element in template_terms["sundayPublicScaffold"]["first"]["praiseElements"])
                        and all(element["label"] != "환영" for element in template_terms["sundayPublicScaffold"]["second"]["praiseElements"])
                        and template_terms["sundayPublicScaffold"]["first"]["creedElements"] == [
                            {"type": "body", "label": "사도신경", "introTitle": "신앙고백", "introBody": "사도신경", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["second"]["creedElements"] == [
                            {"type": "body", "label": "사도신경", "introTitle": "신앙고백", "introBody": "사도신경", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["first"]["offeringElements"] == [
                            {"type": "praise", "label": "봉헌찬송", "outputMode": "score"},
                            {"type": "title_person", "label": "봉헌기도", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["first"]["sermonElements"] == [
                            {"type": "title_person", "label": "설교 제목", "person": "김석범 목사", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["second"]["sermonElements"] == [
                            {"type": "title_person", "label": "설교 제목", "outputMode": ""},
                            {"type": "scripture_body", "label": "설교 본문", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["second"]["prayerElements"] == [
                            {"type": "title_person", "label": "기도", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["first"]["announcementsElements"] == [
                            {"type": "title", "label": "교회소식", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["second"]["announcementsElements"] == [
                            {"type": "title", "label": "교회소식", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["first"]["sendingElements"] == [
                            {"type": "praise", "label": "송영", "outputMode": "score"},
                            {"type": "body", "label": "주기도문", "introTitle": "주기도문", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["firstPastor"]["sendingElements"] == [
                            {"type": "praise", "label": "송영", "outputMode": "score"},
                            {"type": "title_person", "label": "축도", "outputMode": ""},
                        ]
                        and set(template_terms["sundayPublicScaffold"]["first"]["scoreSlots"]) == {
                            "praise:찬양 1",
                            "praise:찬양 2",
                            "praise:찬양 3",
                            "offering:봉헌찬송",
                            "sending:송영",
                        }
                        and set(template_terms["sundayPublicScaffold"]["second"]["scoreSlots"]) == {
                            "praise:찬양 1",
                            "praise:찬양 2",
                            "praise:찬양 3",
                            "offering:봉헌찬송",
                            "sending:송영",
                        }
                        and template_terms["sundayPublicScaffold"]["afternoon"]["titles"] == [
                            "준비",
                            "찬양",
                            "묵도",
                            "찬송",
                            "대표기도",
                            "성경봉독",
                            "설교",
                            "결단",
                            "광고",
                            "파송",
                            "폐회",
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["silentPrayerElements"] == [
                            {"type": "title", "label": "묵도", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["hymnElements"] == [
                            {"type": "praise", "label": "찬송", "outputMode": "score"}
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["prayerElements"] == [
                            {"type": "title_person", "label": "기도", "outputMode": ""}
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["scriptureElements"] == [
                            {"type": "scripture_body", "label": "성경봉독", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["sermonElements"] == [
                            {"type": "title_person", "label": "설교 제목", "person": "김남영 목사", "outputMode": ""},
                            {"type": "scripture_body", "label": "설교 본문", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["sendingElements"] == [
                            {"type": "praise", "label": "송영", "outputMode": "score"},
                            {"type": "title_person", "label": "축도", "person": "김남영 목사", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["afternoon"]["doxologyDefaults"] == [
                            {"sectionKey": "sending", "title": "찬 1장"}
                        ]
                        and set(template_terms["sundayPublicScaffold"]["afternoon"]["scoreSlots"]) == {
                            "hymn_praise:찬송",
                            "sending:송영",
                        }
                        and "사죄의선언" not in template_terms["sundayPublicScaffold"]["third"]["titles"]
                        and "새가족환영" not in template_terms["sundayPublicScaffold"]["third"]["titles"]
                        and "공동체고백" in template_terms["sundayPublicScaffold"]["third"]["titles"]
                        and template_terms["sundayPublicScaffold"]["third"]["communityElements"][0]["type"] == "body"
                        and template_terms["sundayPublicScaffold"]["third"]["communityElements"][0]["label"] == "공동체고백"
                        and template_terms["sundayPublicScaffold"]["third"]["communityElements"][0]["introTitle"] == "공동체고백"
                        and any(
                            item.get("text") == "예배자" and item.get("color") == "#FFC832"
                            for item in template_terms["sundayPublicScaffold"]["third"]["communityElements"][0]["textHighlights"]
                        )
                        and any(
                            item.get("text") == "검단우리교회 공동체" and item.get("bold") is True
                            for item in template_terms["sundayPublicScaffold"]["third"]["communityElements"][0]["textHighlights"]
                        )
                        and "아멘송" not in template_terms["sundayPublicScaffold"]["third"]["titles"]
                        and "폐회" in template_terms["sundayPublicScaffold"]["third"]["titles"]
                        and template_terms["sundayPublicScaffold"]["third"]["praiseElements"][:2] == [
                            {"type": "title_content", "label": "환영", "outputMode": ""},
                            {"type": "praise", "label": "찬양 1", "outputMode": ""},
                        ]
                        and [
                            item["label"]
                            for item in template_terms["sundayPublicScaffold"]["third"]["praiseElements"]
                        ] == ["환영", "찬양 1", "찬양 2", "찬양 3", "찬양 4", "입례찬양"]
                        and template_terms["sundayPublicScaffold"]["third"]["praiseElements"][-1] == {
                            "type": "praise",
                            "label": "입례찬양",
                            "formHint": "V-V-C-V-V-C",
                            "forms": ["V", "V", "C", "V", "V", "C"],
                            "strength": "default",
                            "outputMode": "",
                        }
                        and template_terms["sundayPublicScaffold"]["third"]["sermonElements"] == [
                            {"type": "title_person", "label": "설교 제목", "outputMode": ""},
                            {"type": "scripture_body", "label": "설교 본문", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["third"]["sendingElements"] == [
                            {
                                "type": "praise",
                                "label": "파송찬송",
                                "formHint": "V1-V2-C-간주-V3-C-C",
                                "forms": ["V1", "V2", "C", "간주", "V3", "C", "C"],
                                "strength": "default",
                                "outputMode": "",
                            },
                            {"type": "title_person", "label": "축도", "outputMode": ""},
                        ]
                        and template_terms["sundayPublicScaffold"]["third"]["closingHymnDefaults"] == [{
                            "type": "praise",
                            "label": "폐회찬송",
                            "title": "352 십자가 군병들아",
                            "formHint": "V1A-간주-V1-V2-간주-V4-V1B",
                            "forms": ["V1A", "간주", "V1", "V2", "간주", "V4", "V1B"],
                            "strength": "default",
                        }]
                        and [
                            item["label"]
                            for item in template_terms["sundayPublicScaffold"]["third"]["closingElements"]
                        ] == ["마무리", "폐회찬송"]
                        and template_terms["sundayPublicScaffold"]["third"]["keys"].count("praise") == 1
                        and "hymn_praise" in template_terms["sundayPublicScaffold"]["third"]["keys"]
                        and set(template_terms["sundayPublicScaffold"]["third"]["scoreSlots"]) == {
	                            "hymn_praise:찬송",
	                            "offering:봉헌찬송",
                        }
                        and template_terms["sundayPublicScaffold"]["afternoon"]["titles"][:4] == ["준비", "찬양", "묵도", "찬송"]
                        and "hymn_praise" in template_terms["sundayPublicScaffold"]["afternoon"]["keys"]
                        and set(template_terms["sundayPublicScaffold"]["afternoon"]["scoreSlots"]) == {
                            "hymn_praise:찬송",
                            "sending:송영",
                        }
                        and all(item["lastLabel"] == "마무리" for item in template_terms["commonClosingTemplates"])
                        and all(item["lastSectionKey"] == "closing_visual" for item in template_terms["commonClosingTemplates"])
                        and all(item["lastScaffoldTitle"] == "마무리" for item in template_terms["commonClosingTemplates"])
                        and all(item["lastScaffoldKey"] == "closing_visual" for item in template_terms["commonClosingTemplates"])
                        and template_terms["scoreModeMemo"] == {
                            "memo": '{"note":"","elementType":"praise","outputMode":"score"}',
                            "outputMode": "score",
                            "serializedKeepsMode": True,
                        }
                        and template_terms["formPresetUi"] == {
                            "formHint": "V2-C",
                            "forms": ["V2", "C"],
                            "strength": "manual",
                            "badgeText": "송폼 V2-C 찬송가 1절-후렴-2절-후렴-간주-마지막 절-후렴",
                        }
                        and template_terms["fridayNewServiceLeader"] == {
                            "formLeader": "이재희 청년",
                            "inputValue": "이재희 청년",
                            "defaultLeader": "이재희 청년",
                            "monthlyDefaultLeader": "",
                        }
                        and template_terms["fridayScaffold"]["sections"][-1] == "자율기도"
                        and template_terms["fridayScaffold"]["sections"][-3:] == ["결단", "기도 찬양", "자율기도"]
                        and any(
                            item["label"] == "찬양"
                            and item["sectionKey"] == "pre_scripture_praise"
                            for item in template_terms["fridayScaffold"]["rawTitles"]
                        )
                        and any(
                            item["label"] == "기도 찬양 1"
                            and item["sectionKey"] == "prayer_meeting_praise"
                            for item in template_terms["fridayScaffold"]["rawTitles"]
                        )
                        and "통성기도" not in template_terms["fridayScaffold"]["sections"]
                        and "기도회" not in template_terms["fridayScaffold"]["sections"]
                        and "폐회" not in template_terms["fridayScaffold"]["sections"]
                        and "마무리" not in template_terms["fridayScaffold"]["labels"]
                        and next(item["rawTitle"] for item in template_terms["fridayScaffold"]["rawTitles"] if item["label"] == "교회소식") == "교회소식"
                        and not any(item["label"] == "통성기도" for item in template_terms["fridayScaffold"]["rawTitles"])
                        and template_terms["serviceInstanceOverride"] == {
                            "label": "봉헌찬송",
                            "sectionKey": "offering",
                            "beforeTitle": "",
                            "afterTitle": "봉헌특송",
                            "outputMode": "",
                            "effectiveOutputMode": "",
                            "legacyEffectiveOutputMode": "",
                            "templateTitle": "",
                            "templateLabel": "봉헌찬송",
                        }
                        and template_terms["generatedSectionPersistence"] == {
                            "sectionCount": 1,
                            "elementCount": 2,
                            "sortOrders": [1],
                            "sharedSection": True,
                        }
	                        and template_terms["templateSuppressionProjection"] == {
	                            "sourceFound": True,
	                            "suppressed": True,
	                            "projected": False,
	                        }
	                        and template_terms["templateVersionBaseline"] == {
	                            "version": "2026-q3",
	                            "effectiveFrom": "2026-07-01",
	                            "versions": ["2026-q3", "2026-q3", "2026-q3", "2026-q3", "2026-q3", "2026-q3"],
	                        }
	                        and template_terms["legacyHierarchyCleanup"]["normalized"] == [
	                            {
	                                "label": "주기도문",
	                                "key": "sending",
	                                "title": "파송",
	                                "sectionId": "33333333-3333-4333-8333-333333333333",
	                            },
                            {
                                "label": "축도",
                                "key": "sending",
                                "title": "파송",
                                "sectionId": "33333333-3333-4333-8333-333333333333",
                            },
                            {
                                "label": "마무리",
                                "key": "closing_visual",
                                "title": "폐회",
                                "sectionId": "22222222-2222-4222-8222-222222222222",
                            },
                            {
                                "label": "폐회찬송",
                                "key": "closing_visual",
                                "title": "폐회",
                                "sectionId": "22222222-2222-4222-8222-222222222222",
                            },
                        ]
                        and template_terms["legacyHierarchyCleanup"]["persistedSections"] == [
                            {
                                "id": "33333333-3333-4333-8333-333333333333",
                                "key": "sending",
                                "title": "파송",
                            },
                            {
                                "id": "22222222-2222-4222-8222-222222222222",
                                "key": "closing_visual",
                                "title": "폐회",
                            },
                        ]
                        and template_terms["sundayFirstSendingPrune"] == {
                            "pastorPreacher": ["설교 제목", "축도"],
                            "layPreacher": ["설교 제목", "주기도문"],
                        }
                        and template_terms["fullscreenSermonBodyCompatibility"] == {
                            "staticInput": True,
                            "contentState": "filled",
                            "reason": "redundant_fullscreen_sermon_body",
                            "slideCount": 0,
                        }
                        and len(template_terms["monthlyScaffold"]["corporatePrayerElements"]) == 5
                        and len(template_terms["monthlyScaffold"]["offeringElements"]) == 2
                        and template_terms["overflow"] <= 2
                    ):
                        pass_("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))
                    else:
                        fail("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))

                    strict_song_picker = page.evaluate(
                        """
                        (() => {
                          const previous = {
                            songs: state.songs,
                            services: state.services,
                            serviceItems: state.serviceItems,
                            selectedServiceId: state.selectedServiceId,
                            selectedServiceTypeId: state.selectedServiceTypeId,
                            dirtyService: state.dirty.service,
                          };
                          const service = { id: '__smoke_strict_song_service__', type_id: 'sunday-first', date: '2099-07-05', title: '' };
                          const hymn = {
                            id: '__smoke_hymn_song__',
                            title: '만복의 근원 하나님',
                            hymn_no: '1',
                            subtitle: 'Doxology',
                            metadata: {},
                            praise_types: ['hymn'],
                          };
                          hymn.versions = normalizeSongVersions(hymn, [
                            { id: '__smoke_hymn_new__', name: '새찬송가', praise_types: ['hymn'], forms: [] },
                            { id: '__smoke_hymn_unified__', name: '통일 1', hymn_no: '통 1', praise_types: ['hymn'], forms: [] },
                          ]);
                          const ccm = {
                            id: '__smoke_ccm_song__',
                            title: '은혜',
                            subtitle: '내가 누려왔던 모든 것들이',
                            metadata: { artist: '손경민' },
                            praise_types: ['ccm'],
                          };
                          ccm.versions = normalizeSongVersions(ccm, [
                            { id: '__smoke_ccm_v1__', name: 'Original', praise_types: ['ccm'], forms: [] },
                            { id: '__smoke_ccm_v2__', name: 'Female Key', praise_types: ['ccm'], forms: [] },
                          ]);
                          try {
                            state.songs = [hymn, ccm];
                            state.services = [service];
                            state.selectedServiceId = service.id;
                            state.selectedServiceTypeId = service.type_id;
                            const strictItem = normalizeServiceItem({
                              service_id: service.id,
                              label: '찬양 1',
                              raw_title: '',
                              memo: serializeServiceItemMemo({ elementType: 'praise' }),
                            }, 0);
                            const scoreItem = normalizeServiceItem({
                              service_id: service.id,
                              label: '봉헌찬송',
                              raw_title: '',
                              memo: serializeServiceItemMemo({ elementType: 'praise', outputMode: 'score' }),
                            }, 1);
                            state.serviceItems = { [service.id]: [strictItem, scoreItem] };
                            updateServiceItemField({
                              dataset: { serviceItemIndex: '0', serviceItemField: 'raw_title' },
                              value: '은혜',
                            });
                            const typed = state.serviceItems[service.id][0];
                            const typedSongId = typed.song_id || '';
                            const typedVersionId = typed.version_id || '';
                            const strictResults = serviceSongPickerResults('은혜', strictItem, service).map((song) => song.id);
                            const scoreCcmResults = serviceSongPickerResults('은혜', scoreItem, service).map((song) => song.id);
                            const scoreHymnResults = serviceSongPickerResults('만복', scoreItem, service).map((song) => song.id);
                            selectServiceSongForItem(0, ccm.id);
                            const selected = state.serviceItems[service.id][0];
                            const selectedVersionImmediately = selected.version_id || '';
                            const invalidAfterSong = serviceItemSongSelectionInvalid(selected, service);
                            updateServiceItemField({
                              dataset: { serviceItemIndex: '0', serviceItemField: 'version_id' },
                              value: '__smoke_ccm_v2__',
                            });
                            const withVersion = state.serviceItems[service.id][0];
                            const selectedVersionAfterPick = withVersion.version_id || '';
                            const invalidAfterVersion = serviceItemSongSelectionInvalid(withVersion, service);
                            const deferredField = document.createElement('input');
                            deferredField.type = 'text';
                            deferredField.dataset.serviceItemIndex = '0';
                            deferredField.dataset.serviceItemField = 'raw_title';
                            deferredField.value = '입력 대기';
                            document.body.append(deferredField);
                            handleDetailInput({ target: deferredField });
                            const deferredBeforeEnter = state.serviceItems[service.id][0].raw_title || '';
                            let deferredPrevented = false;
                            handleDetailKeydown({
                              target: deferredField,
                              key: 'Enter',
                              preventDefault() { deferredPrevented = true; },
                            });
                            const deferredAfterEnter = state.serviceItems[service.id][0].raw_title || '';
                            deferredField.remove();
                            const strictSearchField = document.createElement('input');
                            strictSearchField.type = 'text';
                            strictSearchField.dataset.serviceItemIndex = '0';
                            strictSearchField.dataset.serviceItemField = 'raw_title';
                            strictSearchField.setAttribute('data-service-song-required', 'true');
                            strictSearchField.value = '은혜 검색';
                            document.body.append(strictSearchField);
                            const strictSearchDeferred = isDeferredServiceTextInput(strictSearchField);
                            handleDetailInput({ target: strictSearchField });
                            const strictSearchAfterInput = state.serviceItems[service.id][0].raw_title || '';
                            strictSearchField.remove();
                            const oneOffThirdSpecial = normalizeServiceItem({
                              service_id: service.id,
                              label: '특송',
                              raw_title: '청년부 특송',
                              memo: serializeServiceItemMemo({ elementType: 'praise' }),
                            }, 2);
                            return {
                              strictRequires: serviceItemRequiresSongSelection(strictItem, service),
                              typedSongId,
                              typedVersionId,
                              strictResults,
                              scoreCcmResults,
                              scoreHymnResults,
                              selectedSongId: selected.song_id || '',
                              selectedRawTitle: selected.raw_title || '',
                              selectedDisplayText: serviceItemDisplayText(selected),
                              selectedTitleForSave: serviceElementTitleForSave(selected, 'praise'),
                              selectedVersionId: selectedVersionImmediately,
                              invalidAfterSong,
                              selectedVersionAfterPick,
                              invalidAfterVersion,
                              deferredBeforeEnter,
                              deferredAfterEnter,
                              deferredPrevented,
                              strictSearchDeferred,
                              strictSearchAfterInput,
                              renderedHasPicker: renderServiceEditorTitleControl(strictItem, 0, { service }, serviceItemEditorModel(strictItem, { service })).includes('svc-song-picker'),
                              thirdSpecialManual: serviceItemAllowsManualSongText(oneOffThirdSpecial, { ...service, type_id: 'sunday-main' }),
                              pickerNullMeta: renderServiceSongPickerResult({
                                id: '__smoke_null_meta__',
                                title: '메타 없는 찬양',
                                subtitle: null,
                                original_title: null,
                                praise_types: ['ccm'],
                              }, 0),
                            };
                          } finally {
                            state.songs = previous.songs;
                            state.services = previous.services;
                            state.serviceItems = previous.serviceItems;
                            state.selectedServiceId = previous.selectedServiceId;
                            state.selectedServiceTypeId = previous.selectedServiceTypeId;
                            state.dirty.service = previous.dirtyService;
                            renderCurrentServiceModuleDetail();
                          }
                        })()
                        """
                    )
                    if (
                        strict_song_picker["strictRequires"]
                        and strict_song_picker["typedSongId"] == ""
                        and strict_song_picker["typedVersionId"] == ""
                        and strict_song_picker["strictResults"] == ["__smoke_ccm_song__"]
                        and "__smoke_ccm_song__" not in strict_song_picker["scoreCcmResults"]
                        and strict_song_picker["scoreHymnResults"] == ["__smoke_hymn_song__"]
                        and strict_song_picker["selectedSongId"] == "__smoke_ccm_song__"
                        and strict_song_picker["selectedRawTitle"] == ""
                        and strict_song_picker["selectedDisplayText"] == "은혜"
                        and strict_song_picker["selectedTitleForSave"] == ""
                        and strict_song_picker["selectedVersionId"] == ""
                        and strict_song_picker["invalidAfterSong"]
                        and strict_song_picker["selectedVersionAfterPick"] == "__smoke_ccm_v2__"
                        and not strict_song_picker["invalidAfterVersion"]
                        and strict_song_picker["deferredBeforeEnter"] == ""
                        and strict_song_picker["deferredAfterEnter"] == "입력 대기"
                        and strict_song_picker["deferredPrevented"]
                        and not strict_song_picker["strictSearchDeferred"]
                        and strict_song_picker["strictSearchAfterInput"] == "은혜 검색"
                        and strict_song_picker["renderedHasPicker"]
                        and not strict_song_picker["thirdSpecialManual"]
                        and "null ·" not in strict_song_picker["pickerNullMeta"]
                    ):
                        pass_("service-strict-song-picker", json.dumps(strict_song_picker, ensure_ascii=False))
                    else:
                        fail("service-strict-song-picker", json.dumps(strict_song_picker, ensure_ascii=False))

                    service_title_normalization = page.evaluate(
                        """
                        () => ({
                          monthly: serviceDisplayTypeName({
                            type_id: 'monthly',
                            title: '7월 월삭예배',
                            date: '2026-07-03',
                          }),
                          otherMonth: serviceDisplayTypeName({
                            type_id: 'monthly',
                            title: '8월 월삭예배',
                            date: '2026-07-03',
                          }),
                          monthlyCustomTitle: serviceDisplayTypeName({
                            type_id: 'monthly',
                            title: '청년 연합 월삭예배',
                            date: '2026-07-03',
                          }),
                          specialCustomTitle: serviceDisplayTypeName({
                            type_id: 'special',
                            title: '청년 연합 월삭예배',
                            date: '2026-07-03',
                          }),
                          normalizedRowTitle: normalizeWorshipService({
                            id: '__title_normalization__',
                            service_type_id: 'monthly',
                            service_date: '2026-07-03',
                            title: '7월 월삭예배',
                          }).title,
                          normalizedOtherMonthRowTitle: normalizeWorshipService({
                            id: '__title_normalization_other__',
                            service_type_id: 'monthly',
                            service_date: '2026-07-03',
                            title: '8월 월삭예배',
                          }).title,
                          normalizedSundayRowTitle: normalizeWorshipService({
                            id: '__title_normalization_sunday__',
                            service_type_id: 'sunday-first',
                            service_date: '2026-07-05',
                            title: '7월 주일예배 [1부]',
                          }).title,
                        })
                        """
                    )
                    if service_title_normalization == {
                        "monthly": "월삭예배",
                        "otherMonth": "월삭예배",
                        "monthlyCustomTitle": "월삭예배",
                        "specialCustomTitle": "청년 연합 월삭예배",
                        "normalizedRowTitle": "월삭예배",
                        "normalizedOtherMonthRowTitle": "월삭예배",
                        "normalizedSundayRowTitle": "주일예배 [1부]",
                    }:
                        pass_("service-title-normalization", json.dumps(service_title_normalization, ensure_ascii=False))
                    else:
                        fail("service-title-normalization", json.dumps(service_title_normalization, ensure_ascii=False))

                service_for_slides = select_service_with_slides(page)
                if not service_for_slides:
                    skip("presenter-slides", "No service with generated slides.")
                else:
                    page.wait_for_selector("#servicePresenterControls", timeout=5000)
                    slide_count = page.locator(".svc-slide-thumb").count()
                    if slide_count == service_for_slides["slides"]:
                        pass_("presenter-slides", json.dumps(service_for_slides, ensure_ascii=False))
                    else:
                        fail("presenter-slides", f"dom={slide_count} state={service_for_slides}")
                    presenter_terms = page.evaluate(
                        """
                        (() => ({
                          sidebarHeadings: [...document.querySelectorAll('.service-sidebar-head span')]
                            .map((node) => node.textContent.trim()),
                          outlineHeaderTail: document.querySelector('.service-sidebar-section--current > .service-sidebar-head > small')?.textContent.trim() || '',
                          outlineRows: document.querySelectorAll('.service-outline-row').length,
                          outlineGroups: document.querySelectorAll('.service-outline-group').length,
                          multiOutlineGroups: document.querySelectorAll('.service-outline-group .service-outline-children .service-outline-row--child:nth-child(2)').length,
                          childPraiseMarkers: [...document.querySelectorAll('.service-outline-group')]
                            .filter((group) => group.querySelector('.service-outline-row--section strong')?.textContent.trim() === '찬양')
                            .flatMap((group) => [...group.querySelectorAll('.service-outline-row--child strong')].map((node) => node.textContent.trim()))
                            .filter((text) => text === '찬양').length,
                          outlineCountText: [...document.querySelectorAll('.service-outline-row small')]
                            .map((node) => node.textContent.replace(/\\s+/g, ' ').trim())
                            .filter((text) => /슬라이드|항목|곡/.test(text)),
                          outlineStartNumbers: [...document.querySelectorAll('.service-outline-row[data-service-outline-slide]:not([disabled])')]
                            .slice(0, 12)
                            .map((row) => ({
                              slide: Number(row.dataset.serviceOutlineSlide),
                              start: row.querySelector('.service-outline-start')?.textContent.trim() || '',
                              align: getComputedStyle(row.querySelector('.service-outline-start')).textAlign,
                              child: row.classList.contains('service-outline-row--child')
                            })),
                          collapsedBoardSubgroups: document.querySelectorAll('.svc-board-subgroup.collapsed-head').length,
                          mainPraiseSubgroupLabels: (() => {
                            const group = { kind: 'main-praise', label: '찬양', subgroups: [] };
                            addPresenterSlideToSubgroup(group, {
                              slideIndex: 0,
                              slide: { type: 'praise-section-title', sectionLabel: '찬양', elementId: 'marker' }
                            });
                            addPresenterSlideToSubgroup(group, {
                              slideIndex: 1,
                              slide: { type: 'image', sectionLabel: '찬양 2', elementTitle: '하나님의 크신 사랑', elementId: 'song-1' }
                            });
                            return group.subgroups.map((subgroup) => subgroup.label);
                          })(),
                          elementNameTitleContract: (() => {
                            const welcomeItem = {
                              label: '환영',
                              raw_title: '환영\\n헤세드 찬양단',
                              memo: serializeServiceItemMemo({ elementType: 'title_content' }),
                            };
                            const mainPraiseTitle = presenterBoardSubgroupContentTitle({
                              sectionKey: 'praise',
                              sectionLabel: '찬양',
                              elementLabel: '환영',
                              elementTitle: '환영',
                              type: 'title-assignee',
                              missingContent: true,
                            }, '찬양 1');
                            const entranceTitle = presenterBoardSubgroupContentTitle({
                              sectionKey: 'praise',
                              sectionLabel: '찬양',
                              elementLabel: '입례찬양',
                              elementTitle: '입례찬양',
                              type: 'lyrics',
                            }, '찬양 5');
                            return {
                              welcomeSidebar: serviceSidebarChildItemTitle(welcomeItem),
                              mainPraiseTitle,
                              entranceTitle,
                            };
                          })(),
                          doxologyScoreSectionTitle: (() => {
                            const section = presenterSectionForServiceItem({
                              id: 'smoke-doxology',
                              label: '찬양',
                              _worshipSectionKey: 'doxology',
                              raw_title: '이 천지간 만물들아'
                            }, 0, '이 천지간 만물들아');
                            return presenterScoreImageSlidesFromAsset(
                              { slides: [{ url: '/assets/smoke-score.png' }] },
                              { id: 'smoke-doxology', label: '찬양' },
                              section,
                              0,
                              '이 천지간 만물들아',
                              '찬양'
                            )[0]?.sectionTitle || '';
                          })(),
                          readyShortcutRows: document.querySelectorAll('.service-outline-row--ready').length,
                          announcementTitleContract: (() => {
                            const group = {
                              sectionKey: 'announcements',
                              sectionTitle: '광고'
                            };
                            const items = [
                              { label: '교회소식', raw_title: '교회소식', _worshipSectionKey: 'announcements' },
                              { label: '새가족환영', raw_title: '새가족환영', _worshipSectionKey: 'announcements' },
                            ];
                            return {
                              section: serviceSidebarSectionTitle(group, items[0]),
                              children: items.map((item) => serviceSidebarChildItemTitle(item))
                            };
                          })(),
                          sectionDisplayTitleAudit: [
                            ['sending', '주기도문'],
                            ['sending', '축도'],
                            ['sending', '파송찬송'],
                            ['closing_visual', '마무리'],
                            ['closing_visual', '폐회찬송'],
                            ['creed', '사도신경'],
                            ['offering', '봉헌찬양'],
                            ['response_song', '결단찬양'],
                            ['announcements', '새가족환영'],
                            ['sermon', '설교 본문'],
                            ['scripture_reading', '겔 8:14'],
                            ['custom_section', '특별 순서'],
                          ].map(([sectionKey, title]) => ({
                            sectionKey,
                            title,
                            sidebar: serviceSidebarSectionTitle(
                              { sectionKey, sectionTitle: title },
                              { label: title, _worshipSectionKey: sectionKey },
                            ),
                            board: createPresenterSlideGroup(
                              { sectionKey, sectionTitle: title, sectionId: `${sectionKey}:${title}` },
                              0,
                            ).title,
                          })),
                          editorFields: [...document.querySelectorAll('.service-sidebar-editor label > span')]
                            .map((node) => node.textContent.trim()),
                          hasLegacyDrawer: Boolean(document.querySelector('.svc-edit-drawer')),
                          status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                          modeTabLabels: [...document.querySelectorAll('.svc-header .svc-mode-tab span')]
                            .map((node) => node.textContent.trim()),
                          jumpLabel: document.querySelector('[data-presenter-jump-button]')?.getAttribute('aria-label') || '',
	                          controlLabels: [...document.querySelectorAll('.svc-presenter-mini-label')]
	                            .map((node) => node.textContent.trim()),
	                          pageTabLabel: currentPageTabTitle(),
	                          actionButtonTexts: [...document.querySelectorAll('.svc-action-text-btn')]
	                            .map((node) => node.textContent.trim()),
                          actionGroups: document.querySelectorAll('.svc-presenter-action-group').length,
                          helpLabel: document.querySelector('[data-presenter-help] > summary')?.getAttribute('aria-label') || '',
                          helpText: document.querySelector('.svc-presenter-help-panel')?.textContent.replace(/\\s+/g, ' ').trim() || '',
                          firstThumbLabel: document.querySelector('.svc-slide-thumb')?.getAttribute('aria-label') || '',
                          firstOutlineLabel: document.querySelector('.service-outline-row[data-service-outline-slide]')?.getAttribute('aria-label') || '',
                          selectedSectionRows: document.querySelectorAll('.service-outline-row--section.selected').length,
                          sidebarWidth: Math.round(document.querySelector('.sidebar')?.getBoundingClientRect().width || 0),
                          actionLabels: [...document.querySelectorAll('.service-sidebar-editor-actions [aria-label]')]
                            .slice(0, 4)
                            .map((node) => node.getAttribute('aria-label')),
                          elementTypes: [...document.querySelectorAll('[data-service-item-field="element_type"] option')]
                            .map((node) => node.textContent.trim())
                            .slice(0, 12),
                          visibleBadTerms: /컴포넌트|\\bcomponents\\b|\\bComponent\\b|\\bItem\\b|\\bElement\\b|\\bElem_/.test(document.body.innerText),
                          visiblePresentationTerms: /\\bPPTX?\\b|PowerPoint/i.test(document.body.innerText),
                          legacyArtifactLabels: [...document.querySelectorAll('[aria-label]')]
                            .map((node) => node.getAttribute('aria-label') || '')
                            .filter((label) => /\\b(?:Elem|Element|Section|Slide)_/i.test(label)),
                          overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                        }))()
                        """
                    )
                    if (
                        "순서" in presenter_terms["sidebarHeadings"]
                        and presenter_terms["outlineHeaderTail"] == "시작"
                        and "편집" not in presenter_terms["sidebarHeadings"]
                        and "최근 예배" not in presenter_terms["sidebarHeadings"]
                        and presenter_terms["outlineRows"] >= 2
                        and presenter_terms["outlineGroups"] >= 1
                        and presenter_terms["multiOutlineGroups"] >= 1
                        and presenter_terms["childPraiseMarkers"] == 0
                        and presenter_terms["outlineCountText"] == []
                        and all(
                            (item["start"] == "" if item["child"] else item["start"] == str(item["slide"] + 1) and item["align"] == "right")
                            for item in presenter_terms["outlineStartNumbers"]
                        )
                        and presenter_terms["collapsedBoardSubgroups"] == 0
                        and presenter_terms["mainPraiseSubgroupLabels"] == ["환영", "찬양 1"]
                        and presenter_terms["elementNameTitleContract"] == {
                            "welcomeSidebar": "환영 · 헤세드 찬양단",
                            "mainPraiseTitle": "",
                            "entranceTitle": "",
                        }
                        and presenter_terms["doxologyScoreSectionTitle"] == "송영"
                        and presenter_terms["readyShortcutRows"] <= 1
                        and presenter_terms["announcementTitleContract"] == {
                            "section": "광고",
                            "children": ["교회소식", "새가족환영"],
                        }
                        and presenter_terms["sectionDisplayTitleAudit"] == [
                            {"sectionKey": "sending", "title": "주기도문", "sidebar": "파송", "board": "파송"},
                            {"sectionKey": "sending", "title": "축도", "sidebar": "파송", "board": "파송"},
                            {"sectionKey": "sending", "title": "파송찬송", "sidebar": "파송", "board": "파송"},
                            {"sectionKey": "closing_visual", "title": "마무리", "sidebar": "폐회", "board": "폐회"},
                            {"sectionKey": "closing_visual", "title": "폐회찬송", "sidebar": "폐회", "board": "폐회"},
                            {"sectionKey": "creed", "title": "사도신경", "sidebar": "신앙고백", "board": "신앙고백"},
                            {"sectionKey": "offering", "title": "봉헌찬양", "sidebar": "봉헌", "board": "봉헌"},
                            {"sectionKey": "response_song", "title": "결단찬양", "sidebar": "결단", "board": "결단"},
                            {"sectionKey": "announcements", "title": "새가족환영", "sidebar": "광고", "board": "광고"},
                            {"sectionKey": "sermon", "title": "설교 본문", "sidebar": "설교", "board": "설교"},
                            {"sectionKey": "scripture_reading", "title": "겔 8:14", "sidebar": "성경봉독", "board": "성경봉독"},
                            {"sectionKey": "custom_section", "title": "특별 순서", "sidebar": "특별 순서", "board": "특별 순서"},
                        ]
                        and presenter_terms["editorFields"] == []
                        and not presenter_terms["hasLegacyDrawer"]
                        and presenter_terms["actionLabels"] == []
                        and presenter_terms["elementTypes"] == []
                        and presenter_terms["status"] == "준비"
                        and presenter_terms["modeTabLabels"] == []
	                        and presenter_terms["jumpLabel"] == "슬라이드로 이동"
	                        and presenter_terms["controlLabels"] == ["슬라이드"]
	                        and "송출" not in presenter_terms["pageTabLabel"]
	                        and presenter_terms["pageTabLabel"]
	                        and presenter_terms["actionButtonTexts"] == []
                        and presenter_terms["actionGroups"] == 2
                        and presenter_terms["helpLabel"] == "도움말"
                        and "Esc Esc" in presenter_terms["helpText"]
                        and "실시간 성구 송출" in presenter_terms["helpText"]
                        and "Mac: ⌃⌘F" in presenter_terms["helpText"]
                        and "Windows/Linux: F11" in presenter_terms["helpText"]
                        and "번호 + Enter" in presenter_terms["helpText"]
                        and "0 + Enter" in presenter_terms["helpText"]
                        and "범위 밖 번호 현재 화면 유지" in presenter_terms["helpText"]
                        and "0 또는 없는 번호" not in presenter_terms["helpText"]
                        and "1번 슬라이드 선택" in presenter_terms["firstThumbLabel"]
                        and "준비 선택" in presenter_terms["firstOutlineLabel"]
                        and presenter_terms["selectedSectionRows"] == 0
                        and presenter_terms["sidebarWidth"] >= 228
                        and not presenter_terms["visibleBadTerms"]
                        and not presenter_terms["visiblePresentationTerms"]
                        and not presenter_terms["legacyArtifactLabels"]
                        and presenter_terms["overflow"] <= 2
                    ):
                        pass_("presenter-terminology", json.dumps(presenter_terms, ensure_ascii=False))
                    else:
                        fail("presenter-terminology", json.dumps(presenter_terms, ensure_ascii=False))

                    presenter_font_contract = page.evaluate(
                        """
                        (() => {
                          const createHost = (className) => {
                            const host = document.createElement('div');
                            host.className = className;
                            host.style.cssText = 'position:absolute;left:-10000px;top:0;';
                            host.innerHTML = `
                            <span id="fontDisplay" style="font-size: var(--presenter-size-display)"></span>
                            <span id="fontSection" style="font-size: var(--presenter-size-section)"></span>
                            <span id="fontBody" style="font-size: var(--presenter-size-body)"></span>
                            <span id="fontLyrics" style="font-size: var(--presenter-size-lyrics)"></span>
                            <span id="fontMeta" style="font-size: var(--presenter-size-meta)"></span>
                            <span id="fontScriptureBar" style="font-size: var(--presenter-scripture-bar-size)"></span>
                            <span id="fontScriptureClean" style="font-size: var(--presenter-scripture-clean-size)"></span>
                            <span id="fontScriptureReadingText" style="font-size: var(--presenter-scripture-reading-text-size)"></span>
                          `;
                            document.body.appendChild(host);
                            return host;
                          };
                          const readContract = (host) => {
                            const hostStyles = getComputedStyle(host);
                            const font = (id) => getComputedStyle(host.querySelector(`#${id}`)).fontSize;
                            return {
                              unit: hostStyles.getPropertyValue('--presenter-stage-unit').trim(),
                              barHeight: hostStyles.getPropertyValue('--presenter-output-bar-height').trim(),
                              tokenDisplay: hostStyles.getPropertyValue('--presenter-size-display').trim(),
                              tokenBody: hostStyles.getPropertyValue('--presenter-size-body').trim(),
                              display: font('fontDisplay'),
                              section: font('fontSection'),
                              body: font('fontBody'),
                              lyrics: font('fontLyrics'),
                              meta: font('fontMeta'),
                              scriptureBar: font('fontScriptureBar'),
                              scriptureClean: font('fontScriptureClean'),
                              scriptureReadingText: font('fontScriptureReadingText'),
                            };
                          };
                          const chromakeyHost = createHost('presenter-output-root');
                          const cleanHost = createHost('presenter-output-root no-chromakey');
                          const result = {
                            chromakey: readContract(chromakeyHost),
                            clean: readContract(cleanHost),
                          };
                          chromakeyHost.remove();
                          cleanHost.remove();
                          return result;
                        })()
                        """
                    )
                    if (
                        presenter_font_contract["chromakey"]["unit"] == "1px"
                        and presenter_font_contract["chromakey"]["barHeight"] == "17.5%"
                        and presenter_font_contract["chromakey"]["display"] == "84px"
                        and presenter_font_contract["chromakey"]["section"] == "72px"
                        and presenter_font_contract["chromakey"]["body"] == "64px"
                        and presenter_font_contract["chromakey"]["lyrics"] == "64px"
                        and presenter_font_contract["chromakey"]["meta"] == "52px"
                        and presenter_font_contract["chromakey"]["scriptureBar"] == "72px"
                        and presenter_font_contract["chromakey"]["scriptureClean"] == "72px"
                        and presenter_font_contract["chromakey"]["scriptureReadingText"] == "88px"
                        and presenter_font_contract["clean"]["display"] == "168px"
                        and presenter_font_contract["clean"]["section"] == "144px"
                        and presenter_font_contract["clean"]["body"] == "96px"
                        and presenter_font_contract["clean"]["lyrics"] == "128px"
                        and presenter_font_contract["clean"]["meta"] == "104px"
                        and presenter_font_contract["clean"]["scriptureBar"] == "72px"
                        and presenter_font_contract["clean"]["scriptureClean"] == "72px"
                        and presenter_font_contract["clean"]["scriptureReadingText"] == "88px"
                    ):
                        pass_("presenter-font-contract", json.dumps(presenter_font_contract, ensure_ascii=False))
                    else:
                        fail("presenter-font-contract", json.dumps(presenter_font_contract, ensure_ascii=False))

                    sorter_state = page.evaluate(
                        """
                        (serviceId) => {
                          state.presenter.outputWindow = null;
                          state.presenter.outputConnectedAt = 0;
                          state.presenter.serviceId = null;
                          state.presenterBoardSelection = {
                            serviceId: null,
                            elementKey: '',
                            indexes: [],
                            anchorIndex: null,
                            drag: null,
                            clipboard: null
                          };
                          renderPresenterDetail();
                          const first = document.querySelector('.svc-slide-thumb[data-presenter-index][data-service-id]');
                          first?.click();
                          const selectedAfterClick = document.querySelectorAll('.svc-slide-thumb.selected').length;
                          const activeAfterClick = document.querySelectorAll('.svc-slide-thumb.active').length;
                          openPresenterSectionEditorForSlide(serviceId, Number(first?.dataset.presenterIndex || 0));
                          const editor = document.querySelector('[data-presenter-section-editor]');
                          const reference = parseBibleReference('ckd 1:1');
                          const beforeItems = JSON.parse(JSON.stringify(state.serviceItems[serviceId] || []));
                          const editableSectionKey = (() => {
                            const counts = {};
                            for (const item of state.serviceItems[serviceId] || []) {
                              const key = item._worshipSectionKey || '';
                              if (!key) continue;
                              counts[key] = (counts[key] || 0) + 1;
                            }
                            return Object.entries(counts).find(([, count]) => count > 1)?.[0] || '';
                          })();
                          let editorContract = {};
                          if (editableSectionKey) {
                            state.presenterSectionEditor = { serviceId, itemId: '', sectionKey: `section-key:${editableSectionKey}` };
                            renderPresenterDetail();
                            const sectionInput = document.querySelector('[data-presenter-section-field="label"]');
                            const contextBefore = presenterSectionEditorContext(state.services.find((svc) => svc.id === serviceId));
                            const labelsBefore = (contextBefore?.sectionItems || []).map((item) => item.label);
                            if (sectionInput) {
                              sectionInput.value = '편집 섹션';
                              updatePresenterSectionField(sectionInput);
                            }
                            const addRoot = document.querySelector('[data-presenter-section-editor]');
                            const typeSelect = addRoot?.querySelector('[data-presenter-section-new-type]');
                            const nameInput = addRoot?.querySelector('[data-presenter-section-new-name]');
                            if (typeSelect && nameInput) {
                              typeSelect.value = 'title';
                              nameInput.value = '새 엘리멘트';
                              runPresenterSectionItemAction('add', -1);
                            }
                            const contextAfter = presenterSectionEditorContext(state.services.find((svc) => svc.id === serviceId));
                            editorContract = {
                              sectionTitle: contextAfter?.sectionTitle || '',
                              labelsPreserved: labelsBefore.every((label, index) => (contextAfter?.sectionItems || [])[index]?.label === label),
                              addedElementLabel: (contextAfter?.sectionItems || []).some((item) => item.label === '새 엘리멘트'),
                            };
                          }
                          const result = {
                            selectedAfterClick,
                            activeAfterClick,
                            selectionService: state.presenterBoardSelection.serviceId || '',
                            editorOpen: Boolean(editor),
                            editorItems: editor ? editor.querySelectorAll('.presenter-section-editor-item').length : 0,
                            editorHasAdd: Boolean(editor?.querySelector('[data-presenter-section-add]')),
                            restoredReference: reference ? `${reference.book.code} ${reference.chapter}:${reference.verse}` : '',
                            editorContract,
                          };
                          state.serviceItems[serviceId] = beforeItems;
                          state.dirty.service = false;
                          state.presenterSectionEditor = null;
                          renderPresenterDetail();
                          return result;
                        }
                        """,
                        service_for_slides["id"],
                    )
                    if (
                        sorter_state["selectedAfterClick"] == 1
                        and sorter_state["activeAfterClick"] == 0
                        and sorter_state["selectionService"] == service_for_slides["id"]
                        and sorter_state["editorOpen"]
                        and sorter_state["editorItems"] >= 1
                        and sorter_state["editorHasAdd"]
                        and sorter_state["restoredReference"] == "GEN 1:1"
                        and sorter_state["editorContract"].get("sectionTitle") == "편집 섹션"
                        and sorter_state["editorContract"].get("labelsPreserved")
                        and sorter_state["editorContract"].get("addedElementLabel")
                    ):
                        pass_("presenter-sorter-and-editor", json.dumps(sorter_state, ensure_ascii=False))
                    else:
                        fail("presenter-sorter-and-editor", json.dumps(sorter_state, ensure_ascii=False))

                    outline_scroll_seed = page.evaluate(
                        """
                        () => {
                          delete window.__mindexOutlineScrollTarget;
                          if (!window.__mindexOriginalScrollIntoView) {
                            window.__mindexOriginalScrollIntoView = Element.prototype.scrollIntoView;
                          }
                          Element.prototype.scrollIntoView = function(options) {
                            if (this.matches?.('.svc-board-subgroup, .svc-slide-thumb')) {
                              const thumb = this.matches('.svc-slide-thumb')
                                ? this
                                : this.querySelector('.svc-slide-thumb[data-presenter-index][data-service-id]');
                              window.__mindexOutlineScrollTarget = {
                                className: this.className || '',
                                serviceId: thumb?.dataset.serviceId || '',
                                index: Number(thumb?.dataset.presenterIndex ?? -1),
                                block: options?.block || '',
                                behavior: options?.behavior || ''
                              };
                            }
                          };
                          const rows = [...document.querySelectorAll('.service-outline-row[data-service-outline-slide]:not([disabled])')]
                            .filter((row) => Number(row.dataset.serviceOutlineSlide) > 0);
                          const row = rows[rows.length - 1] || null;
                          if (!row) return null;
                          row.dataset.smokeOutlineScroll = '1';
                          return {
                            serviceId: row.dataset.serviceOutlineService || '',
                            index: Number(row.dataset.serviceOutlineSlide),
                            text: row.textContent.replace(/\\s+/g, ' ').trim()
                          };
                        }
                        """,
                    )
                    if outline_scroll_seed:
                        page.click('[data-smoke-outline-scroll="1"]')
                        page.wait_for_timeout(150)
                        outline_scroll_state = page.evaluate(
                            """
                            (expected) => {
                              const target = window.__mindexOutlineScrollTarget || {};
                              Element.prototype.scrollIntoView = window.__mindexOriginalScrollIntoView;
                              return {
                                expected,
                                target,
                                presenterIndex: state.presenter.index,
                                activeThumbs: document.querySelectorAll(`.svc-slide-thumb.active[data-presenter-index="${expected.index}"]`).length,
                                selectedThumbs: document.querySelectorAll(`.svc-slide-thumb.selected[data-presenter-index="${expected.index}"]`).length
                              };
                            }
                            """,
                            outline_scroll_seed,
                        )
                        scroll_target = outline_scroll_state["target"]
                        scroll_ok = (
                            not scroll_target
                            or (
                                scroll_target["serviceId"] == outline_scroll_seed["serviceId"]
                                and scroll_target["index"] == outline_scroll_seed["index"]
                                and scroll_target["block"] == "center"
                                and scroll_target["behavior"] == "smooth"
                            )
                        )
                        if (
                            scroll_ok
                            and (
                                outline_scroll_state["presenterIndex"] == outline_scroll_seed["index"]
                                or outline_scroll_state["selectedThumbs"] >= 1
                            )
                        ):
                            pass_("presenter-outline-scroll", json.dumps(outline_scroll_state, ensure_ascii=False))
                        else:
                            fail("presenter-outline-scroll", json.dumps(outline_scroll_state, ensure_ascii=False))
                    else:
                        skip("presenter-outline-scroll", "No outline row with slide target.")

                    page.evaluate(
                        """
                        (serviceId) => {
                          if (state.presenter.serviceId === serviceId) {
                            state.presenter.index = 0;
                            state.presenter.safetyBlank = false;
                            state.presenter.liveScripture = { ...state.presenter.liveScripture, active: false, slide: null };
                            state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
                            renderPresenterControlState(serviceId);
                          }
                        }
                        """,
                        service_for_slides["id"],
                    )

                    page.evaluate(
                        """
                        (serviceId) => {
                          state.module = 'service';
                          state.selectedServiceId = serviceId;
                          const service = state.services.find((item) => item.id === serviceId);
                          state.selectedServiceTypeId = service?.type_id || state.selectedServiceTypeId;
                          render();
                        }
                        """,
                        service_for_slides["id"],
                    )
                    page.wait_for_selector("#servicePresenterControls", timeout=5000)
                    authoring_state = page.evaluate(
                        """
                        (() => {
                          const root = document.querySelector('.presenter-viewer');
                          const rect = root?.getBoundingClientRect();
                          return {
                            mounted: Boolean(root),
                            title: document.querySelector('.presenter-viewer .svc-service-title')?.textContent.trim() || '',
                            hasReadonly: Boolean(document.querySelector('.service-readonly-view')),
                            hasPresenterControls: Boolean(document.querySelector('#servicePresenterControls')),
                            module: state.module,
                            openState: state.servicePrepEditorOpenId || '',
                            width: Math.round(rect?.width || 0),
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                          };
                        })()
                        """
                    )
                    if (
                        authoring_state["mounted"]
                        and authoring_state["title"]
                        and not authoring_state["hasReadonly"]
                        and authoring_state["hasPresenterControls"]
                        and authoring_state["module"] == "presenter"
                        and not authoring_state["openState"]
                        and authoring_state["width"] >= 900
                        and authoring_state["overflow"] <= 2
                    ):
                        pass_("service-opens-presenter", json.dumps(authoring_state, ensure_ascii=False))
                    else:
                        fail("service-opens-presenter", json.dumps(authoring_state, ensure_ascii=False))

                    presenter_sidebar_input = page.evaluate(
                        """
                        (() => {
                          const service = state.services.find((item) => item.id === state.selectedServiceId);
                          const target = servicePrepEditorItems(service?.id || '')
                            .find((item) => presenterServiceInputItem(item, service));
                          state.selectedServiceItemIndex = Number.isInteger(target?._origIndex) ? target._origIndex : null;
                          renderServiceList();
	                          const context = document.querySelector('.service-sidebar-input-context');
	                          const bulkInput = document.querySelector('.service-sidebar--presenter [data-presenter-preparation-input]');
	                          const bulkButton = document.querySelector('.service-sidebar--presenter [data-presenter-preparation-apply]');
	                          if (bulkInput) {
	                            bulkInput.value = '찬양 1: 평화 하나님의 평강이';
	                            bulkInput.dispatchEvent(new Event('input', { bubbles: true }));
	                          }
	                          const controls = [...(context?.querySelectorAll('[data-service-item-field]') || [])];
		                          const inputItem = context?.querySelector('.svc-presenter-input-item');
		                          const quick = [...(context?.querySelectorAll('[data-presenter-sidebar-input-jump]') || [])];
	                          const quickLabels = quick.map((node) => node.querySelector('span')?.textContent?.trim() || '');
	                          const firstJump = quick[0];
                          const beforeLabel = inputItem?.querySelector('strong')?.textContent?.trim() || '';
                          firstJump?.click();
                          const afterContext = document.querySelector('.service-sidebar-input-context');
                          const afterItem = afterContext?.querySelector('.svc-presenter-input-item');
                          return {
                            exists: Boolean(context),
                            railRemoved: !document.querySelector('.svc-presenter-input-rail'),
	                            fieldCount: controls.length,
	                            label: beforeLabel,
	                            bulkInput: Boolean(bulkInput),
	                            bulkButton: Boolean(bulkButton),
	                            bulkDraft: state.presenterPreparationDrafts[service?.id || ''] || '',
		                            quickCount: quick.length,
	                            quickLabels,
	                            quickNeedsInput: quick.filter((node) => node.classList.contains('needs-input')).length,
                            quickActive: quick.filter((node) => node.classList.contains('active')).length,
                            quickHead: context?.querySelector('.service-sidebar-input-quick-head')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
                            clickedLabel: afterItem?.querySelector('strong')?.textContent?.trim() || '',
                            focusedField: Boolean(document.activeElement?.closest?.('.service-sidebar-input-context')),
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                          };
                        })()
                        """
                    )
                    if (
                        presenter_sidebar_input["exists"]
                        and presenter_sidebar_input["railRemoved"]
                        and presenter_sidebar_input["fieldCount"] >= 1
                        and presenter_sidebar_input["label"]
                        and presenter_sidebar_input["bulkInput"]
                        and presenter_sidebar_input["bulkButton"]
                        and presenter_sidebar_input["bulkDraft"] == "찬양 1: 평화 하나님의 평강이"
                        and presenter_sidebar_input["quickCount"] >= 1
                        and "결단기도" not in presenter_sidebar_input["quickLabels"]
                        and "입력" in presenter_sidebar_input["quickHead"]
                        and presenter_sidebar_input["clickedLabel"]
                        and presenter_sidebar_input["overflow"] <= 2
                    ):
                        pass_("presenter-sidebar-input-context", json.dumps(presenter_sidebar_input, ensure_ascii=False))
                    else:
                        fail("presenter-sidebar-input-context", json.dumps(presenter_sidebar_input, ensure_ascii=False))

                    presenter_input_completion_guard = page.evaluate(
                        """
                        (() => {
                          const service = state.services.find((item) => item.id === state.selectedServiceId);
                          const strictSongItem = servicePrepEditorItems(service?.id || '')
                            .find((item) => serviceItemRequiresSongSelection(item, service));
                          if (!strictSongItem) return { skipped: true };
                          const typedOnly = {
                            ...strictSongItem,
                            raw_title: '가',
                            song_id: null,
                            version_id: null,
                            song_version_id: null
                          };
                          const typedMemo = parseServiceItemMemo(typedOnly.memo);
                          const typedState = resolvePresenterServiceItemContentState(typedOnly, typedMemo, null, service);
                          return {
                            skipped: false,
                            label: strictSongItem.label || '',
                            state: typedState.state,
                            hasOutputContent: typedState.hasOutputContent,
                            reason: typedState.reason,
                            inputMode: typedState.inputMode
                          };
                        })()
                        """
                    )
                    if presenter_input_completion_guard.get("skipped"):
                        skip("presenter-input-completion-guard", "No strict song input item.")
                    elif (
                        presenter_input_completion_guard["state"] == "missing"
                        and not presenter_input_completion_guard["hasOutputContent"]
                        and presenter_input_completion_guard["reason"] == "song_selection_required"
                    ):
                        pass_("presenter-input-completion-guard", json.dumps(presenter_input_completion_guard, ensure_ascii=False))
                    else:
                        fail("presenter-input-completion-guard", json.dumps(presenter_input_completion_guard, ensure_ascii=False))

                    presenter_response_prayer_input_guard = page.evaluate(
                        """
                        (() => {
                          const service = state.services.find((item) => item.id === state.selectedServiceId);
                          const responsePrayer = servicePrepEditorItems(service?.id || '')
                            .find((item) => item._worshipSectionKey === 'response_song' && compactSearchValue(item.label || '') === '결단기도');
                          if (!responsePrayer) return { skipped: true };
                          const memo = parseServiceItemMemo(responsePrayer.memo);
                          const contentState = resolvePresenterServiceItemContentState(responsePrayer, memo, null, service);
                          const slides = buildPresenterSlidesForServiceItem(responsePrayer, service, 0);
                          return {
                            skipped: false,
                            inputItem: Boolean(presenterServiceInputItem(responsePrayer, service)),
                            state: contentState.state,
                            hasOutputContent: contentState.hasOutputContent,
                            reason: contentState.reason,
                            missingSlides: slides.filter((slide) => slide?.missingContent).length,
                            titles: slides.map((slide) => slide.title || slide.text || ''),
                          };
                        })()
                        """
                    )
                    if presenter_response_prayer_input_guard.get("skipped"):
                        skip("presenter-response-prayer-input-guard", "No response prayer item.")
                    elif (
                        not presenter_response_prayer_input_guard["inputItem"]
                        and presenter_response_prayer_input_guard["state"] == "filled"
                        and presenter_response_prayer_input_guard["reason"] == "fixed_title"
                        and presenter_response_prayer_input_guard["missingSlides"] == 0
                        and presenter_response_prayer_input_guard["titles"] == ["결단기도"]
                    ):
                        pass_("presenter-response-prayer-input-guard", json.dumps(presenter_response_prayer_input_guard, ensure_ascii=False))
                    else:
                        fail("presenter-response-prayer-input-guard", json.dumps(presenter_response_prayer_input_guard, ensure_ascii=False))

                    presenter_preparation_real_song_match = page.evaluate(
                        """
                        (() => {
                          const service = state.services.find((entry) => entry.type_id === 'wednesday') || state.services[0];
                          const item = normalizeServiceItem({
                            service_id: service?.id || '',
                            label: '찬양 1',
                            memo: serializeServiceItemMemo({ elementType: 'praise', inputMode: 'praise_db' }),
                          });
                          return ['평화 하나님의 평강이', '이 세상은 내 집 아니네', '슬픈 마음 있는 사람', '충만', '나는 믿네']
                            .map((query) => {
                              const song = resolvePresenterPreparationSong(query, item, service);
                              return { query, id: song?.id || '', title: songServiceOptionLabel(song) || song?.title || '', versions: song?.versions?.length || 0 };
                            });
                        })()
                        """
                    )
                    if all(match["id"] for match in presenter_preparation_real_song_match):
                        pass_("presenter-preparation-real-song-match", json.dumps(presenter_preparation_real_song_match, ensure_ascii=False))
                    else:
                        fail("presenter-preparation-real-song-match", json.dumps(presenter_preparation_real_song_match, ensure_ascii=False))

                    presenter_preparation_paste = page.evaluate(
                        """
                        (() => {
                          const original = {
                            module: state.module,
                            songs: state.songs,
                            services: state.services,
                            serviceItems: state.serviceItems,
                            selectedServiceId: state.selectedServiceId,
                            selectedServiceTypeId: state.selectedServiceTypeId,
                            drafts: state.presenterPreparationDrafts,
                            dirty: state.dirty.service,
                          };
                          const service = { id: '__smoke_preparation_input__', type_id: 'wednesday', date: '2026-07-15', tags: [] };
                          const item = (label, elementType, sectionKey, order) => normalizeServiceItem({
                            id: `__smoke_${label}__`,
                            service_id: service.id,
                            label,
                            memo: serializeServiceItemMemo({ elementType, inputMode: serviceInputModeForElementType(elementType) }),
                            _worshipSectionId: `__smoke_section_${sectionKey}__`,
                            _worshipSectionKey: sectionKey,
                            _worshipSectionTitle: sectionKey === 'sermon' ? '설교' : sectionKey === 'prayer' ? '대표기도' : sectionKey === 'scripture_reading' ? '성경봉독' : sectionKey === 'response_song' ? '결단' : '찬양',
                            _worshipSectionOrder: order,
                            _worshipElementOrder: 1,
                          });
                          try {
                            state.module = 'home';
                            state.songs = [
                              { id: '__batch_praise_1__', title: '평화', subtitle: '하나님의 평강이', versions: [{ id: '__batch_praise_1_v__', name: '기본' }] },
                              { id: '__batch_praise_2__', title: '이 세상은 내 집 아니네', versions: [{ id: '__batch_praise_2_v__', name: '기본' }] },
                              { id: '__batch_praise_3__', title: '슬픈 마음 있는 사람', versions: [{ id: '__batch_praise_3_v__', name: '기본' }] },
                              { id: '__batch_praise_4__', title: '충만', versions: [{ id: '__batch_praise_4_v__', name: '기본' }] },
                              { id: '__batch_response__', title: '나는 믿네', versions: [{ id: '__batch_response_v__', name: '기본' }] },
                            ];
                            state.services = [service];
                            state.selectedServiceId = service.id;
                            state.selectedServiceTypeId = service.type_id;
                            state.serviceItems = {
                              [service.id]: [
                                item('찬양 1', 'praise', 'praise', 2),
                                item('찬양 2', 'praise', 'praise', 2),
                                item('찬양 3', 'praise', 'praise', 2),
                                item('찬양 4', 'praise', 'praise', 2),
                                item('기도', 'title_person', 'prayer', 3),
                                item('성경봉독', 'scripture_body', 'scripture_reading', 5),
                                item('설교 제목', 'title_person', 'sermon', 6),
                                item('설교 본문', 'scripture_body', 'sermon', 6),
                                item('결단찬양', 'praise', 'response_song', 7),
                              ],
                            };
                            state.presenterPreparationDrafts = {
                              [service.id]: `찬양 1: 평화 하나님의 평강이\n찬양 2: 이 세상은 내 집 아니네\n찬양 3: 슬픈 마음 있는 사람\n찬양 4: 충만\n\n대표기도: 정선분 권사\n성경봉독: 히 10:38–39\n설교 제목: 믿음을 잃어버릴 수도 있어요?\n인용 구절: 렘 3:22; 마 3:11; 눅 24:49; 행 2:4; 고후 10:4; 롬 8:35-37; 살전 4:3; 벧전 1:14–15; 히 4:12; 엡 5:26; 요일 1:7; 행 15:8–9; 눅 11:13; 롬 8:30; 마 5:48; 롬 13:10\n결단찬양: 나는 믿네`,
                            };
                            applyPresenterPreparationInput(service.id);
                            const items = state.serviceItems[service.id];
                            const byLabel = (label) => items.find((entry) => entry.label === label) || {};
                            const citations = items.filter(isPresenterPreparationCitationItem);
                            const citation = citations[0] || {};
                            const citationReferences = parseServiceItemMemo(citation.memo).scriptureReferences || [];
                            const translation = selectedPresenterBibleTranslation();
                            citationReferences.forEach((referenceText) => {
                              const reference = parseBibleReference(referenceText);
                              if (!reference || !translation?.id) return;
                              const start = reference.verse || 1;
                              const end = reference.verseEnd || reference.verse || start;
                              cacheServiceScriptureVerses(reference, Array.from({ length: end - start + 1 }, (_, offset) => ({
                                book_code: reference.book.code,
                                chapter: reference.chapter,
                                verse: start + offset,
                                text: `${referenceText} ${start + offset}`,
                              })));
                            });
                            const citationSlides = buildPresenterScriptureTextSlides(citation, {
                              sectionKey: 'sermon', sectionLabel: '설교', sectionTitle: '설교',
                            }, 0);
                            const citationMemoRoundTrip = parseServiceItemMemo(serializeServiceItemMemo(parseServiceItemMemo(citation.memo)));
                            const citationConfig = serviceElementConfigForSave({}, citationMemoRoundTrip, { item: citation, service });
                            return {
                              songIds: ['찬양 1', '찬양 2', '찬양 3', '찬양 4', '결단찬양'].map((label) => byLabel(label).song_id || ''),
                              prayer: byLabel('기도').assignee || '',
                              reading: byLabel('성경봉독').raw_title || '',
                              sermonTitle: byLabel('설교 제목').raw_title || '',
                              citationCount: citations.length,
                              citationReferences,
                              citationRawTitle: citation.raw_title || '',
                              citationSlideCount: citationSlides.length,
                              citationSlideReferences: [...new Set(citationSlides.map((slide) => slide.title))],
                              citationMemoRoundTrip: citationMemoRoundTrip.scriptureReferences || [],
                              citationConfigReferences: citationConfig.scriptureReferences || [],
                              draftCleared: !state.presenterPreparationDrafts[service.id],
                            };
                          } finally {
                            state.module = original.module;
                            state.songs = original.songs;
                            state.services = original.services;
                            state.serviceItems = original.serviceItems;
                            state.selectedServiceId = original.selectedServiceId;
                            state.selectedServiceTypeId = original.selectedServiceTypeId;
                            state.presenterPreparationDrafts = original.drafts;
                            state.dirty.service = original.dirty;
                            renderPresenterDetail();
                          }
                        })()
                        """
                    )
                    if (
                        presenter_preparation_paste["songIds"] == [
                            "__batch_praise_1__", "__batch_praise_2__", "__batch_praise_3__", "__batch_praise_4__", "__batch_response__"
                        ]
                        and presenter_preparation_paste["prayer"] == "정선분 권사"
                        and presenter_preparation_paste["reading"] == "히 10:38–39"
                        and presenter_preparation_paste["sermonTitle"] == "믿음을 잃어버릴 수도 있어요?"
                        and presenter_preparation_paste["citationCount"] == 1
                        and presenter_preparation_paste["citationReferences"] == [
                            "렘 3:22", "마 3:11", "눅 24:49", "행 2:4", "고후 10:4", "롬 8:35–37", "살전 4:3", "벧전 1:14–15",
                            "히 4:12", "엡 5:26", "요일 1:7", "행 15:8–9", "눅 11:13", "롬 8:30", "마 5:48", "롬 13:10"
                        ]
                        and presenter_preparation_paste["citationRawTitle"] == "렘 3:22; 마 3:11; 눅 24:49; 행 2:4; 고후 10:4; 롬 8:35–37; 살전 4:3; 벧전 1:14–15; 히 4:12; 엡 5:26; 요일 1:7; 행 15:8–9; 눅 11:13; 롬 8:30; 마 5:48; 롬 13:10"
                        and presenter_preparation_paste["citationSlideCount"] == 20
                        and len(presenter_preparation_paste["citationSlideReferences"]) == 16
                        and presenter_preparation_paste["citationSlideReferences"][:4] == ["렘 3:22", "마 3:11", "눅 24:49", "행 2:4"]
                        and "예레미야 3:22" not in presenter_preparation_paste["citationSlideReferences"]
                        and presenter_preparation_paste["citationMemoRoundTrip"] == presenter_preparation_paste["citationReferences"]
                        and presenter_preparation_paste["citationConfigReferences"] == presenter_preparation_paste["citationReferences"]
                        and presenter_preparation_paste["draftCleared"]
                    ):
                        pass_("presenter-preparation-paste", json.dumps(presenter_preparation_paste, ensure_ascii=False))
                    else:
                        fail("presenter-preparation-paste", json.dumps(presenter_preparation_paste, ensure_ascii=False))

                    presenter_preparation_sermon_slot = page.evaluate(
                        """
                        (() => {
                          const original = {
                            module: state.module,
                            services: state.services,
                            serviceItems: state.serviceItems,
                            selectedServiceId: state.selectedServiceId,
                            selectedServiceTypeId: state.selectedServiceTypeId,
                            drafts: state.presenterPreparationDrafts,
                            dirty: state.dirty.service,
                            presenter: {
                              serviceId: state.presenter.serviceId,
                              slides: state.presenter.slides,
                              index: state.presenter.index,
                              safetyBlank: state.presenter.safetyBlank,
                              jumpDraft: state.presenter.jumpDraft,
                              liveScripture: state.presenter.liveScripture,
                              livePraise: state.presenter.livePraise,
                            },
                            presenterBoardSelection: state.presenterBoardSelection,
                            presenterSectionEditor: state.presenterSectionEditor,
                          };
                          const service = { id: '__smoke_preparation_sermon_slot__', type_id: 'wednesday', date: '2026-07-15', tags: [] };
                          const sermonTitle = normalizeServiceItem({
                            id: '__smoke_sermon_title_only__',
                            service_id: service.id,
                            sort_order: 1,
                            label: '설교 제목',
                            memo: serializeServiceItemMemo({ elementType: 'title_person', inputMode: 'text' }),
                            _worshipSectionId: '__smoke_section_sermon__',
                            _worshipSectionKey: 'sermon',
                            _worshipSectionTitle: '설교',
                            _worshipSectionOrder: 6,
                            _worshipElementOrder: 1,
                          });
                          try {
                            state.module = 'home';
                            state.services = [service];
                            state.selectedServiceId = service.id;
                            state.selectedServiceTypeId = service.type_id;
                            state.serviceItems = { [service.id]: [sermonTitle] };
                            state.presenterPreparationDrafts = {
                              [service.id]: '설교 제목: 믿음을 잃어버릴 수도 있어요?',
                            };
                            applyPresenterPreparationInput(service.id);
                            const sermonItems = (state.serviceItems[service.id] || [])
                              .filter((item) => item._worshipSectionKey === 'sermon')
                              .map((item) => ({
                                label: item.label,
                                type: serviceMemoElementType(parseServiceItemMemo(item.memo)),
                                title: item.raw_title || '',
                                placeholder: Boolean(item._worshipTemplatePlaceholder),
                              }));
                            return {
                              sermonItems,
                              labels: sermonItems.map((item) => item.label),
                            };
                          } finally {
                            state.module = original.module;
                            state.services = original.services;
                            state.serviceItems = original.serviceItems;
                            state.selectedServiceId = original.selectedServiceId;
                            state.selectedServiceTypeId = original.selectedServiceTypeId;
                            state.presenterPreparationDrafts = original.drafts;
                            state.dirty.service = original.dirty;
                            state.presenter.serviceId = original.presenter.serviceId;
                            state.presenter.slides = original.presenter.slides;
                            state.presenter.index = original.presenter.index;
                            state.presenter.safetyBlank = original.presenter.safetyBlank;
                            state.presenter.jumpDraft = original.presenter.jumpDraft;
                            state.presenter.liveScripture = original.presenter.liveScripture;
                            state.presenter.livePraise = original.presenter.livePraise;
                            state.presenterBoardSelection = original.presenterBoardSelection;
                            state.presenterSectionEditor = original.presenterSectionEditor;
                            renderPresenterDetail();
                          }
                        })()
                        """
                    )
                    if (
                        presenter_preparation_sermon_slot["labels"][:2] == ["설교 제목", "설교 본문"]
                        and presenter_preparation_sermon_slot["sermonItems"][0]["title"] == "믿음을 잃어버릴 수도 있어요?"
                        and presenter_preparation_sermon_slot["sermonItems"][1]["type"] == "scripture_body"
                        and presenter_preparation_sermon_slot["sermonItems"][1]["placeholder"]
                    ):
                        pass_("presenter-preparation-sermon-slot", json.dumps(presenter_preparation_sermon_slot, ensure_ascii=False))
                    else:
                        fail("presenter-preparation-sermon-slot", json.dumps(presenter_preparation_sermon_slot, ensure_ascii=False))

                    page.set_viewport_size({"width": 520, "height": 760})
                    page.evaluate("renderPresenterDetail()")
                    page.wait_for_selector("#servicePresenterControls", timeout=5000)
                    authoring_narrow = page.evaluate(
                        """
                        (() => {
                          const editor = document.querySelector('.presenter-viewer')?.getBoundingClientRect();
                          const editorLeft = editor?.left || 0;
                          const editorRight = editor?.right || window.innerWidth;
                          return {
                            viewport: window.innerWidth,
                            editorWidth: Math.round(editor?.width || 0),
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth),
                            editorScrollOverflow: Math.max(0, Math.round((editor?.scrollWidth || 0) - (editor?.clientWidth || 0))),
                            hasReadonly: Boolean(document.querySelector('.service-readonly-view')),
                            hasControls: Boolean(document.querySelector('#servicePresenterControls')),
                            inputContextInSidebar: Boolean(document.querySelector('.service-sidebar-input-context')),
                            railRemoved: !document.querySelector('.svc-presenter-input-rail')
                          };
                        })()
                        """
                    )
                    page.set_viewport_size({"width": 1440, "height": 980})
                    if (
                        authoring_narrow["viewport"] == 520
                        and 160 <= authoring_narrow["editorWidth"] <= authoring_narrow["viewport"]
                        and authoring_narrow["overflow"] <= 2
                        and authoring_narrow["editorScrollOverflow"] <= 2
                        and authoring_narrow["hasControls"]
                        and authoring_narrow["inputContextInSidebar"]
                        and authoring_narrow["railRemoved"]
                        and not authoring_narrow["hasReadonly"]
                    ):
                        pass_("presenter-narrow", json.dumps(authoring_narrow, ensure_ascii=False))
                    else:
                        fail("presenter-narrow", json.dumps(authoring_narrow, ensure_ascii=False))

                    page.evaluate(
                        """
                        (serviceId) => {
                          state.module = 'presenter';
                          state.selectedServiceId = serviceId;
                          renderPresenterDetail();
                          renderServiceList();
                        }
                        """,
                        service_for_slides["id"],
                    )

                    thumb_metrics = page.evaluate(
                        """
                        (() => {
                          const frameMetric = (node) => {
                            const rect = node.getBoundingClientRect();
                            return {
                              left: Math.round(rect.left),
                              top: Math.round(rect.top),
                              width: Math.round(rect.width),
                              height: Math.round(rect.height),
                              ratio: rect.height ? Number((rect.width / rect.height).toFixed(3)) : 0
                            };
                          };
                          const frames = [...document.querySelectorAll('.svc-slide-thumb-frame')].map(frameMetric);
                          const grids = [...document.querySelectorAll('.svc-board-grid')].map((grid) => {
                            const gridFrames = [...grid.querySelectorAll('.svc-slide-thumb-frame')].map(frameMetric);
                            const rows = Object.values(gridFrames.reduce((acc, item) => {
                              const key = Object.keys(acc).find((top) => Math.abs(Number(top) - item.top) <= 2) || String(item.top);
                              acc[key] = acc[key] || [];
                              acc[key].push(item);
                              return acc;
                            }, {})).map((row) => row.sort((a, b) => a.left - b.left));
                            const row = rows.find((candidate) => candidate.length > 1) || [];
                            const horizontalGaps = row.slice(0, -1).map((item, index) => row[index + 1].left - (item.left + item.width));
                            return { count: gridFrames.length, row, horizontalGaps };
                          });
                          const grid = grids
                            .filter((candidate) => candidate.horizontalGaps.length)
                            .sort((a, b) => b.row.length - a.row.length)[0] || { row: [], horizontalGaps: [] };
                          return { frames: frames.slice(0, 12), row: grid.row, horizontalGaps: grid.horizontalGaps };
                        })()
                        """
                    )
                    if thumb_metrics["frames"]:
                        widths = [item["width"] for item in thumb_metrics["frames"]]
                        heights = [item["height"] for item in thumb_metrics["frames"]]
                        ratios = [item["ratio"] for item in thumb_metrics["frames"]]
                        horizontal_gaps = thumb_metrics["horizontalGaps"]
                        uniform = (
                            max(widths) - min(widths) <= 2
                            and max(heights) - min(heights) <= 2
                            and all(1.75 <= ratio <= 1.79 for ratio in ratios)
                            and horizontal_gaps
                            and max(horizontal_gaps) - min(horizontal_gaps) <= 2
                            and 18 <= horizontal_gaps[0] <= 24
                        )
                        if uniform:
                            pass_("presenter-thumbnail-grid", json.dumps(thumb_metrics, ensure_ascii=False))
                        else:
                            fail("presenter-thumbnail-grid", json.dumps(thumb_metrics, ensure_ascii=False))
                    page.evaluate(
                        """
                        (serviceId) => {
                          preparePresenterService(serviceId);
                          state.presenter.outputConnectedAt = Date.now();
                          renderPresenterControlState(serviceId);
                        }
                        """,
                        service_for_slides["id"],
                    )
                    page.wait_for_function(
                        "() => document.querySelectorAll('.svc-slide-thumb-wrap.active').length === 1",
                        timeout=5000,
                    )
                    active_ring_state = page.evaluate(
                        """
                        (() => {
                          const wrap = document.querySelector('.svc-slide-thumb-wrap.active');
                          const frame = wrap?.querySelector('.svc-slide-thumb-frame');
                          if (!wrap || !frame) return { hasActiveWrap: false };
                          const wrapRect = wrap.getBoundingClientRect();
                          const frameRect = frame.getBoundingClientRect();
                          const ring = Number.parseFloat(getComputedStyle(wrap).getPropertyValue('--svc-thumb-ring-space')) || 0;
                          return {
                            hasActiveWrap: true,
                            ring,
                            leftInset: Number((frameRect.left - wrapRect.left).toFixed(2)),
                            topInset: Number((frameRect.top - wrapRect.top).toFixed(2)),
                            rightInset: Number((wrapRect.right - frameRect.right).toFixed(2)),
                            bottomInset: Number((wrapRect.bottom - frameRect.bottom).toFixed(2)),
                            wrapWidth: Math.round(wrapRect.width),
                            frameWidth: Math.round(frameRect.width),
                            activeFrameShadow: getComputedStyle(frame).boxShadow,
                          };
                        })()
                        """
                    )
                    if (
                        active_ring_state.get("hasActiveWrap")
                        and active_ring_state.get("ring", 0) >= 3
                        and min(
                            active_ring_state.get("leftInset", 0),
                            active_ring_state.get("topInset", 0),
                            active_ring_state.get("rightInset", 0),
                            active_ring_state.get("bottomInset", 0),
                        ) >= active_ring_state.get("ring", 0) - 1
                    ):
                        pass_("presenter-active-ring-box", json.dumps(active_ring_state, ensure_ascii=False))
                    else:
                        fail("presenter-active-ring-box", json.dumps(active_ring_state, ensure_ascii=False))
                    form_label_state = page.evaluate(
                        """
                        (serviceId) => {
                          const slides = buildServicePresenterSlides(serviceId);
                          const badges = [...document.querySelectorAll('.svc-slide-form-badge')]
                            .map((node) => {
                              const thumb = node.closest('.svc-slide-thumb-wrap')?.querySelector('.svc-slide-thumb');
                              return {
                                index: Number(thumb?.dataset.presenterIndex),
                                label: node.textContent.trim()
                              };
                            })
                            .filter((item) => Number.isFinite(item.index));
                          const continuationBadges = badges.filter((item) => {
                            const slide = slides[item.index];
                            const previous = slides[item.index - 1];
                            return slide
                              && previous
                              && slide.elementType === 'praise'
                              && previous.elementType === 'praise'
                              && slide.formKey
                              && slide.formKey === previous.formKey;
                          });
                          return {
                            heads: badges.length,
                            dividers: document.querySelectorAll('.svc-slide-form-divider').length,
                            labels: badges.slice(0, 6).map((item) => item.label),
                            continuationBadges
                          };
                        }
                        """,
                        service_for_slides["id"],
                    )
                    if (
                        form_label_state["heads"] > 0
                        and form_label_state["dividers"] == 0
                        and not form_label_state["continuationBadges"]
                    ):
                        pass_("presenter-form-labels", json.dumps(form_label_state, ensure_ascii=False))
                    else:
                        fail("presenter-form-labels", json.dumps(form_label_state, ensure_ascii=False))
                    if service_for_slides["slides"] > 1:
                        page.click(f'[data-presenter-action="next"][data-service-id="{service_for_slides["id"]}"]')
                        next_state = page.evaluate(
                            """
                            (() => ({
                              serviceId: state.presenter.serviceId,
                              index: state.presenter.index,
                              slides: state.presenter.slides.length
                            }))()
                            """
                        )
                        if next_state["serviceId"] == service_for_slides["id"] and next_state["index"] == 1:
                            pass_("presenter-next-control", json.dumps(next_state, ensure_ascii=False))
                        else:
                            fail("presenter-next-control", json.dumps(next_state, ensure_ascii=False))

                        jump_target = min(service_for_slides["slides"], 3)
                        jump_input = page.locator(f'[data-presenter-jump-input][data-service-id="{service_for_slides["id"]}"]')
                        jump_input.fill(str(jump_target))
                        jump_input.press("Enter")
                        page.wait_for_function("(target) => state.presenter.index === target", arg=jump_target - 1, timeout=5000)
                        jump_state = page.evaluate(
                            """
                            (() => ({
                              serviceId: state.presenter.serviceId,
                              index: state.presenter.index,
                              draft: state.presenter.jumpDraft
                            }))()
                            """
                        )
                        if jump_state["serviceId"] == service_for_slides["id"] and jump_state["index"] == jump_target - 1 and not jump_state["draft"]:
                            pass_("presenter-jump-control", json.dumps(jump_state, ensure_ascii=False))
                        else:
                            fail("presenter-jump-control", json.dumps(jump_state, ensure_ascii=False))

                        dbl_target = min(service_for_slides["slides"] - 1, 4)
                        page.evaluate(
	                        """
	                        (() => {
	                          window.__mindexPresenterOpenCalls = 0;
                              state.presenter.outputWindow = null;
                              state.presenter.outputConnectedAt = 0;
	                          window.open = () => {
                                window.__mindexPresenterOpenCalls += 1;
                                return {
                                  closed: false,
                                  focus() {},
                                  addEventListener() {},
                                  moveTo() {},
                                  resizeTo() {},
                                  document: {
                                    documentElement: {
                                      requestFullscreen() { return Promise.resolve(); }
                                    }
                                  }
                                };
                              };
                            })()
                            """
                        )
                        page.locator(
                            f'.svc-slide-thumb[data-service-id="{service_for_slides["id"]}"][data-presenter-index="{dbl_target}"]'
                        ).dblclick()
                        page.wait_for_function("() => (window.__mindexPresenterOpenCalls || 0) === 1", timeout=5000)
                        dbl_state = page.evaluate(
                            """
                            (() => ({
                              serviceId: state.presenter.serviceId,
                              index: state.presenter.index,
                              openCalls: window.__mindexPresenterOpenCalls || 0,
                              selected: document.querySelectorAll('.svc-slide-thumb.selected').length,
                            }))()
                            """
                        )
                        if (
                            dbl_state["serviceId"] == service_for_slides["id"]
                            and dbl_state["index"] == dbl_target
                            and dbl_state["openCalls"] == 1
                        ):
                            pass_("presenter-doubleclick-starts-output", json.dumps(dbl_state, ensure_ascii=False))
                        else:
                            fail("presenter-doubleclick-starts-output", json.dumps(dbl_state, ensure_ascii=False))

                        hierarchy_state = page.evaluate(
                            """
                            (() => {
                              const groups = [...document.querySelectorAll('.service-outline-list > .service-outline-group')];
                              return {
                                standaloneRows: document.querySelectorAll('.service-outline-list > .service-outline-row:not(.service-outline-row--ready)').length,
                                sections: groups.map((group) => group.querySelector('.service-outline-row--section strong')?.textContent.trim() || ''),
                                elements: groups.map((group) => [...group.querySelectorAll('.service-outline-row--child strong')]
                                  .map((node) => node.textContent.trim())),
                                emptySections: groups.filter((group) => !group.querySelector('.service-outline-row--section strong')?.textContent.trim()).length,
                              };
                            })()
                            """
                        )
                        if (
                            hierarchy_state["standaloneRows"] == 0
                            and hierarchy_state["sections"]
                            and not hierarchy_state["emptySections"]
                            and all(elements for elements in hierarchy_state["elements"])
                        ):
                            pass_("presenter-sidebar-section-element-hierarchy", json.dumps(hierarchy_state, ensure_ascii=False))
                        else:
                            fail("presenter-sidebar-section-element-hierarchy", json.dumps(hierarchy_state, ensure_ascii=False))

                        page.evaluate(
                            """
                            (serviceId) => {
                              preparePresenterService(serviceId);
                              state.presenter.outputWindow = { closed: false, focus() {}, close() {} };
                              state.presenter.outputConnectedAt = Date.now();
                            }
                            """,
                            service_for_slides["id"],
                        )
                        passive_target = 0 if dbl_target != 0 else 1
                        page.locator(
                            f'.svc-slide-thumb[data-service-id="{service_for_slides["id"]}"][data-presenter-index="{passive_target}"]'
                        ).click()
                        passive_board_state = page.evaluate(
                            """
                            (selectedIndex) => ({
                              index: state.presenter.index,
                              selectedIndex,
                              outputIndex: JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index,
                              selectedThumbs: [...document.querySelectorAll('.svc-slide-thumb.selected')]
                                .map((node) => Number(node.dataset.presenterIndex)),
                            })
                            """,
                            passive_target,
                        )
                        outline_target = page.locator(
                            f'.service-outline-row[data-service-outline-slide="{passive_target}"]:not([disabled])'
                        ).first
                        if outline_target.count():
                            outline_target.click()
                            passive_sidebar_state = page.evaluate(
                                """
                                (selectedIndex) => ({
                                  index: state.presenter.index,
                                  selectedIndex,
                                  outputIndex: JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index,
                                  selectedRows: document.querySelectorAll('.service-outline-row.selected').length,
                                  selectedThumbs: [...document.querySelectorAll('.svc-slide-thumb.selected')]
                                    .map((node) => Number(node.dataset.presenterIndex)),
                                })
                                """,
                                passive_target,
                            )
                        else:
                            passive_sidebar_state = {"index": -1, "outputIndex": -1, "selectedRows": 0}
                        if (
                            passive_board_state["index"] == passive_target
                            and passive_board_state["outputIndex"] == passive_target
                            and passive_sidebar_state["index"] == passive_target
                            and passive_sidebar_state["outputIndex"] == passive_target
                            and passive_sidebar_state["selectedRows"] >= 1
                        ):
                            pass_("presenter-live-click-transitions-output", json.dumps({
                                "board": passive_board_state,
                                "sidebar": passive_sidebar_state,
                                "selectedIndex": passive_target,
                            }, ensure_ascii=False))
                        else:
                            fail("presenter-live-click-transitions-output", json.dumps({
                                "board": passive_board_state,
                                "sidebar": passive_sidebar_state,
                            }, ensure_ascii=False))

                    overflow_state = page.evaluate(
                        """
                        (() => {
                          const root = document.documentElement;
                          const body = document.body;
                          const board = document.querySelector('.svc-slide-board');
                          return {
                            viewport: window.innerWidth,
                            documentScrollWidth: root.scrollWidth,
                            bodyScrollWidth: body.scrollWidth,
                            boardScrollWidth: board?.scrollWidth || 0,
                            boardClientWidth: board?.clientWidth || 0
                          };
                        })()
                        """
                    )
                    const_overflow = max(
                        overflow_state["documentScrollWidth"] - overflow_state["viewport"],
                        overflow_state["bodyScrollWidth"] - overflow_state["viewport"],
                        overflow_state["boardScrollWidth"] - overflow_state["boardClientWidth"],
                    )
                    if const_overflow <= 2:
                        pass_("presenter-horizontal-overflow", json.dumps(overflow_state, ensure_ascii=False))
                    else:
                        fail("presenter-horizontal-overflow", json.dumps(overflow_state, ensure_ascii=False))

                cleanup_presenter_fixture(page)

                page.click('[data-home-module="praise"]')
                wait_for_praise_data(page)
                wait_for_module_data(page, "praise")
                praise_placeholder = page.input_value("#searchInput")
                placeholder = page.get_attribute("#searchInput", "placeholder") or ""
                if placeholder == "검색...":
                    pass_("praise-module-placeholder", placeholder)
                else:
                    fail("praise-module-placeholder", placeholder or praise_placeholder)
                page.wait_for_selector("[data-song-id]", state="attached", timeout=5000)
                page.click("[data-song-id]")
                page.wait_for_selector(".version-compare-title", state="attached", timeout=5000)
                praise_actions = page.evaluate(
                    """
                    (() => {
                      const heads = [...document.querySelectorAll('.version-compare-title:not(.linked-version-title)')];
                      const linkedHeads = [...document.querySelectorAll('.version-compare-title.linked-version-title')];
                      const versionCopyButtons = [...document.querySelectorAll('.version-copy-btn[data-copy-action="plain"][data-version-id]')];
                      const versionDuplicateButtons = [...document.querySelectorAll('.version-add-btn[data-add-version]')];
                      const draft = buildNewPraiseSongDraft({ title: '테스트 새 찬양', praiseTypes: ['ccm'] });
                      const emptyNewDraft = buildNewPraiseSongDraft({ title: '새 찬양', praiseTypes: ['ccm'] });
                      const nonEmptyNewDraft = {
                        ...emptyNewDraft,
                        versions: [{
                          ...emptyNewDraft.versions[0],
                          forms: [{ part_type: 'Lyrics', lyrics: '이미 입력된 가사', sort_order: 1 }]
                        }]
                      };
                      const renamedEmptyShell = buildNewPraiseSongDraft({ title: '날 구원하신 주 감사', praiseTypes: ['ccm'] });
                      const originalSongs = state.songs;
                      const originalSelectedSongId = state.selectedSongId;
                      const originalSelectedVersionId = state.selectedVersionId;
                      const originalForms = state.forms;
                      const originalDirty = { ...state.dirty };
                      const originalLoading = state.loading;
                      const primary = {
                        id: '__smoke_link_primary__',
                        title: '링크 원곡',
                        related_song_ids: ['__smoke_link_related__'],
                        versions: [{
                          id: '__smoke_link_primary_v1__',
                          name: 'Default',
                          is_primary: true,
                          forms: [{ id: '__smoke_link_primary_f1__', part_type: 'Lyrics', lyrics: '원곡 가사', sort_order: 1 }]
                        }]
                      };
                      const related = {
                        id: '__smoke_link_related__',
                        title: '링크된 곡',
                        related_song_ids: [],
                        versions: [{
                          id: '__smoke_link_related_v1__',
                          name: 'Default',
                          is_primary: true,
                          forms: [{ id: '__smoke_link_related_f1__', part_type: 'Lyrics', lyrics: '링크 가사', sort_order: 1 }]
                        }]
                      };
                      state.songs = [primary, related, ...originalSongs];
                      state.selectedSongId = primary.id;
                      state.selectedVersionId = primary.versions[0].id;
                      state.forms = normalizeForms(primary.versions[0].forms.map((form) => ({ ...form, song_id: primary.versions[0].id })));
                      const linkedEntries = linkedSongVersionEntries(primary);
                      const linkedHtml = renderFormsTab(primary);
                      const titleHtml = renderVersionTitleContent(primary, primary.versions[0], primary.versions[0].forms, { active: true });
                      updateVersionNameField({
                        dataset: { versionNameField: primary.versions[0].id },
                        value: '수정 버전'
                      });
                      const editedVersion = { ...primary.versions[0] };
                      state.loading = true;
                      syncPraiseCreateControls();
                      const loadingCreateState = {
                        canCreate: canCreatePraiseSong(),
                        topbarHidden: refs.newSongBtn.hidden,
                        topbarDisabled: refs.newSongBtn.disabled,
                        detailButtonsHidden: [...document.querySelectorAll('[data-create-song]')]
                          .every((button) => button.hidden && button.disabled)
                      };
                      state.songs = originalSongs;
                      state.selectedSongId = originalSelectedSongId;
                      state.selectedVersionId = originalSelectedVersionId;
                      state.forms = originalForms;
                      state.dirty = originalDirty;
                      state.loading = originalLoading;
                      syncPraiseCreateControls();
                      updateSaveState();
                      return {
                        heads: heads.length,
                        linkedHeads: linkedHeads.length,
                        versionCopyButtons: versionCopyButtons.length,
                        versionDuplicateButtons: versionDuplicateButtons.length,
                        createButtons: document.querySelectorAll('[data-create-song]').length,
                        deleteButtons: document.querySelectorAll('[data-delete-song]').length,
                        deleteInMetaRow: Boolean(document.querySelector('.song-header-meta-row [data-delete-song]')),
                        deleteInHeadActions: Boolean(document.querySelector('.head-actions [data-delete-song]')),
                        deleteButtonText: document.querySelector('[data-delete-song]')?.textContent.trim() || '',
                        deleteButtonWidth: Math.round(document.querySelector('[data-delete-song]')?.getBoundingClientRect().width || 0),
                        createButtonText: document.querySelector('[data-create-song]')?.textContent.trim() || '',
                        addVersionAria: document.querySelector('.version-add-btn[data-add-version]')?.getAttribute('aria-label') || '',
                        copyVersionAria: document.querySelector('.version-copy-btn[data-copy-action="plain"]')?.getAttribute('aria-label') || '',
                        versionNameInputs: document.querySelectorAll('[data-version-name-field]').length,
                        versionTitleHasInput: titleHtml.includes('data-version-name-field="__smoke_link_primary_v1__"'),
                        editedVersionName: editedVersion.name,
                        editedVersionRawName: editedVersion.raw_section_name,
                        loadingCreateState,
                        draftTitle: draft.title,
                        draftVersions: draft.versions.length,
                        draftPraiseType: draft.versions[0]?.praise_types?.[0] || '',
                        emptyNewDraftDeletable: canDeletePraiseSong(emptyNewDraft),
                        nonEmptyNewDraftDeletable: canDeletePraiseSong(nonEmptyNewDraft),
                        renamedEmptyShellDeletable: canDeletePraiseSong(renamedEmptyShell),
                        linkedEntries: linkedEntries.length,
                        linkedReadonly: linkedHtml.includes('linked-version-column')
                          && linkedHtml.includes('data-open-song="__smoke_link_related__"')
                          && linkedHtml.includes('링크 가사'),
                        linkedEditableLeak: linkedHtml.includes('data-version-id="__smoke_link_related_v1__"')
                          || linkedHtml.includes('data-source-version-id="__smoke_link_related_v1__"'),
                        downloadShowButtons: document.querySelectorAll('[data-copy-action="download-freeshow"]').length,
                        downloadXmlButtons: document.querySelectorAll('[data-copy-action="download-xml"]').length,
                        toolbarCopyStack: document.querySelectorAll('.form-toolbar .copy-actions').length,
                        firstHeadActions: [...(heads[0]?.querySelectorAll('.version-title-actions button') || [])]
                          .map((button) => button.className)
                      };
                    })()
                    """
                )
                if (
                    praise_actions["heads"] > 0
                    and praise_actions["versionCopyButtons"] == praise_actions["heads"]
                    and praise_actions["versionDuplicateButtons"] == praise_actions["heads"]
                    and praise_actions["createButtons"] >= 1
                    and praise_actions["deleteButtons"] >= 1
                    and praise_actions["deleteInMetaRow"]
                    and not praise_actions["deleteInHeadActions"]
                    and praise_actions["deleteButtonText"] == "삭제"
                    and praise_actions["deleteButtonWidth"] >= 50
                    and praise_actions["createButtonText"] == "곡 추가"
                    and praise_actions["addVersionAria"] == "이 버전으로 새 버전 추가"
                    and praise_actions["copyVersionAria"] == "이 버전 가사 복사"
                    and praise_actions["versionNameInputs"] >= 1
                    and praise_actions["versionTitleHasInput"]
                    and praise_actions["editedVersionName"] == "수정 버전"
                    and praise_actions["editedVersionRawName"] == "수정 버전"
                    and not praise_actions["loadingCreateState"]["canCreate"]
                    and praise_actions["loadingCreateState"]["topbarHidden"]
                    and praise_actions["loadingCreateState"]["topbarDisabled"]
                    and praise_actions["loadingCreateState"]["detailButtonsHidden"]
                    and praise_actions["draftTitle"] == "테스트 새 찬양"
                    and praise_actions["draftVersions"] == 1
                    and praise_actions["draftPraiseType"] == "ccm"
                    and praise_actions["emptyNewDraftDeletable"]
                    and not praise_actions["nonEmptyNewDraftDeletable"]
                    and praise_actions["renamedEmptyShellDeletable"]
                    and praise_actions["linkedEntries"] == 1
                    and praise_actions["linkedReadonly"]
                    and not praise_actions["linkedEditableLeak"]
                    and praise_actions["downloadShowButtons"] == 0
                    and praise_actions["downloadXmlButtons"] == 0
                    and praise_actions["toolbarCopyStack"] == 0
                ):
                    pass_("praise-version-copy-actions", json.dumps(praise_actions, ensure_ascii=False))
                else:
                    fail("praise-version-copy-actions", json.dumps(praise_actions, ensure_ascii=False))
                signature_state = page.evaluate(
                    """
                    (() => {
                      const rows = [
                        { id: '11111111-1111-4111-8111-111111111111', canonical_song_id: 'song', source_song_id: 'song', lyric_signature: 'mindex-same' },
                        { id: '22222222-2222-4222-8222-222222222222', canonical_song_id: 'song', source_song_id: 'song', lyric_signature: 'mindex-same' },
                        { id: '33333333-3333-4333-8333-333333333333', canonical_song_id: 'song', source_song_id: 'song', lyric_signature: 'mindex-other' },
                      ];
                      assignUniqueVersionLyricSignatures(rows, [
                        { id: '99999999-9999-4999-8999-999999999999', lyric_signature: 'mindex-other' },
                      ]);
                      const versionOrderRows = [
                        { id: '44444444-4444-4444-8444-444444444444', version_order: 1 },
                        { id: '55555555-5555-4555-8555-555555555555', version_order: 2 },
                      ];
                      const orders = assignStableVersionOrders([
                        { id: '66666666-6666-4666-8666-666666666666' },
                        { id: '77777777-7777-4777-8777-777777777777' },
                      ], versionOrderRows, 'other-song');
                      return {
                        signatures: rows.map((row) => row.lyric_signature),
                        unique: new Set(rows.map((row) => row.lyric_signature)).size === rows.length,
                        secondSuffixed: rows[1].lyric_signature.startsWith('mindex-same:'),
                        existingConflictSuffixed: rows[2].lyric_signature.startsWith('mindex-other:'),
                        orders: [...orders.values()],
                      };
                    })()
                    """
                )
                if (
                    signature_state["unique"]
                    and signature_state["signatures"][0] == "mindex-same"
                    and signature_state["secondSuffixed"]
                    and signature_state["existingConflictSuffixed"]
                    and signature_state["orders"] == [3, 4]
                ):
                    pass_("praise-version-lyric-signature-unique", json.dumps(signature_state, ensure_ascii=False))
                else:
                    fail("praise-version-lyric-signature-unique", json.dumps(signature_state, ensure_ascii=False))
                canonical_state = page.evaluate(
                    """
                    async () => {
                      const originalClient = state.client;
                      const existingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
                      let directUpsertCalled = false;
                      let raceMaybeCalls = 0;
                      let raceUpsertCalled = false;
                      try {
                        state.client = {
                          from() {
                            return {
                              select() { return this; },
                              eq() { return this; },
                              maybeSingle() {
                                return Promise.resolve({
                                  data: { id: existingId, title: '같은 제목', normalized_title: '같은제목' },
                                  error: null,
                                });
                              },
                              upsert() {
                                directUpsertCalled = true;
                                return this;
                              },
                              single() {
                                return Promise.resolve({ data: { id: 'unexpected' }, error: null });
                              },
                            };
                          },
                        };
                        const directSong = {
                          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                          title: '같은 제목',
                        };
                        const directId = await ensureCanonicalSongRow(directSong);

                        state.client = {
                          from() {
                            return {
                              select() { return this; },
                              eq() { return this; },
                              maybeSingle() {
                                raceMaybeCalls += 1;
                                return Promise.resolve({
                                  data: raceMaybeCalls === 1
                                    ? null
                                    : { id: existingId, title: '같은 제목', normalized_title: '같은제목' },
                                  error: null,
                                });
                              },
                              upsert() {
                                raceUpsertCalled = true;
                                return this;
                              },
                              single() {
                                return Promise.resolve({
                                  data: null,
                                  error: {
                                    code: '23505',
                                    message: 'duplicate key value violates unique constraint "mindex_canonical_songs_normalized_title_key"',
                                  },
                                });
                              },
                            };
                          },
                        };
                        const raceSong = {
                          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                          title: '같은 제목',
                        };
                        const raceId = await ensureCanonicalSongRow(raceSong);
                        return {
                          directId,
                          directCached: directSong._canonicalSongId,
                          directUpsertCalled,
                          raceId,
                          raceCached: raceSong._canonicalSongId,
                          raceMaybeCalls,
                          raceUpsertCalled,
                        };
                      } finally {
                        state.client = originalClient;
                      }
                    }
                    """
                )
                if (
                    canonical_state["directId"] == "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
                    and canonical_state["directCached"] == canonical_state["directId"]
                    and not canonical_state["directUpsertCalled"]
                    and canonical_state["raceId"] == canonical_state["directId"]
                    and canonical_state["raceCached"] == canonical_state["raceId"]
                    and canonical_state["raceMaybeCalls"] == 2
                    and canonical_state["raceUpsertCalled"]
                ):
                    pass_("praise-canonical-normalized-title-reuse", json.dumps(canonical_state, ensure_ascii=False))
                else:
                    fail("praise-canonical-normalized-title-reuse", json.dumps(canonical_state, ensure_ascii=False))
                form_reorder_save = page.evaluate(
                    """
                    async () => {
                      const originalClient = state.client;
                      const originalPraiseTypesSupported = state.songVersionPraiseTypesSupported;
                      const versionId = '11111111-2222-4333-8444-555555555555';
                      const firstUnitId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
                      const secondUnitId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
                      const operations = [];
                      try {
                        state.songVersionPraiseTypesSupported = true;
                        state.selectedVersionId = versionId;
                        state.forms = [];
                        state.client = {
                          from(table) {
                            let pendingUpdate = false;
                            const query = {
                              select() { return this; },
                              eq(column, value) {
                                operations.push({ op: 'eq', table, column, value });
                                if (pendingUpdate) {
                                  pendingUpdate = false;
                                  return Promise.resolve({ data: null, error: null });
                                }
                                return this;
                              },
                              in(column, values) {
                                operations.push({ op: 'in', table, column, values });
                                if (table === 'mindex_version_units') {
                                  return Promise.resolve({
                                    data: [
                                      { id: firstUnitId, version_id: versionId, unit_order: 1, curated_order: 1 },
                                      { id: secondUnitId, version_id: versionId, unit_order: 2, curated_order: 2 },
                                    ],
                                    error: null,
                                  });
                                }
                                return Promise.resolve({ data: [], error: null });
                              },
                              maybeSingle() {
                                return Promise.resolve({
                                  data: { id: '99999999-9999-4999-8999-999999999999', title: '순서 테스트', normalized_title: '순서테스트' },
                                  error: null,
                                });
                              },
                              update(payload) {
                                operations.push({ op: 'update', table, payload });
                                pendingUpdate = true;
                                return this;
                              },
                              upsert(payload) {
                                operations.push({ op: 'upsert', table, payload });
                                if (table === 'mindex_version_units') {
                                  const unitUpsertIndex = operations.length - 1;
                                  const reservedBeforeUpsert = operations
                                    .slice(0, unitUpsertIndex)
                                    .filter((entry) => entry.op === 'update' && entry.table === 'mindex_version_units')
                                    .length;
                                  if (reservedBeforeUpsert < 2) {
                                    return Promise.resolve({
                                      data: null,
                                      error: { message: 'duplicate key value violates unique unit order' },
                                    });
                                  }
                                }
                                return Promise.resolve({ data: payload, error: null });
                              },
                              delete() {
                                operations.push({ op: 'delete', table });
                                return this;
                              },
                            };
                            return query;
                          },
                        };
                        const song = {
                          id: '99999999-9999-4999-8999-999999999999',
                          title: '순서 테스트',
                          versions: [{
                            id: versionId,
                            name: 'Default',
                            is_primary: true,
                            praise_types: ['ccm'],
                            forms: [
                              { id: secondUnitId, part_type: 'Chorus', lyrics: '후렴', sort_order: 1 },
                              { id: firstUnitId, part_type: 'Verse', lyrics: '절', sort_order: 2 },
                            ],
                          }],
                        };
                        await saveSongVersions(song);
                        const unitUpdates = operations
                          .filter((entry) => entry.op === 'update' && entry.table === 'mindex_version_units')
                          .map((entry) => entry.payload);
                        const unitUpsert = operations.find((entry) => entry.op === 'upsert' && entry.table === 'mindex_version_units');
                        return {
                          unitUpdates,
                          upsertOrders: (unitUpsert?.payload || []).map((row) => ({
                            id: row.id,
                            unit_order: row.unit_order,
                            curated_order: row.curated_order,
                            label: row.curated_unit_label,
                          })),
                          updateBeforeUpsert: operations.findIndex((entry) => entry.op === 'update' && entry.table === 'mindex_version_units')
                            < operations.findIndex((entry) => entry.op === 'upsert' && entry.table === 'mindex_version_units'),
                        };
                      } finally {
                        state.client = originalClient;
                        state.songVersionPraiseTypesSupported = originalPraiseTypesSupported;
                      }
                    }
                    """
                )
                if (
                    len(form_reorder_save["unitUpdates"]) == 2
                    and form_reorder_save["updateBeforeUpsert"]
                    and all(item["unit_order"] >= 10000 and item["curated_order"] >= 10000 for item in form_reorder_save["unitUpdates"])
                    and [item["id"] for item in form_reorder_save["upsertOrders"]] == [
                        "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
                        "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
                    ]
                    and [item["unit_order"] for item in form_reorder_save["upsertOrders"]] == [1, 2]
                    and [item["curated_order"] for item in form_reorder_save["upsertOrders"]] == [1, 2]
                ):
                    pass_("praise-form-reorder-save-reserves-orders", json.dumps(form_reorder_save, ensure_ascii=False))
                else:
                    fail("praise-form-reorder-save-reserves-orders", json.dumps(form_reorder_save, ensure_ascii=False))

                page.click('[data-home-module="scripture"]')
                wait_for_scripture_data(page)
                wait_for_module_data(page, "scripture")
                snapshot = get_app_snapshot(page)
                if snapshot.get("scriptureError"):
                    fail("scripture-data-load", json.dumps(snapshot, ensure_ascii=False))
                elif snapshot.get("scriptureBooks", 0) > 0:
                    pass_("scripture-data-load", json.dumps(snapshot, ensure_ascii=False))
                else:
                    fail("scripture-data-load", json.dumps(snapshot, ensure_ascii=False))

            if page_errors:
                fail("page-errors", "\n".join(page_errors[:5]))
            else:
                pass_("page-errors")

            relevant_console = [
                item for item in console_messages
                if "favicon" not in item.lower()
                and "source map" not in item.lower()
                and "the server responded with a status of 400" not in item.lower()
                and "could not load song versions" not in item.lower()
            ]
            if relevant_console:
                fail("console-errors", "\n".join(relevant_console[:8]))
            else:
                pass_("console-errors")

            browser.close()
    except PlaywrightTimeoutError as error:
        fail("playwright-timeout", str(error))
    finally:
        server.shutdown()
        server.server_close()

    for status, name, detail in results:
        print(f"{status} {name}" + (f" :: {detail}" if detail else ""))

    return 1 if any(status == "FAIL" for status, _, _ in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
