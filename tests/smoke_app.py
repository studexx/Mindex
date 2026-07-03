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
    if module == "service":
        page.wait_for_function(
            """
            () => document.body.dataset.module === 'service'
              && (
                document.querySelector('.service-dashboard')
                || document.querySelector('.service-sidebar')
                || document.querySelector('.empty-detail')
                || document.body.textContent.includes('Psalm 27:14')
              )
            """,
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


def select_service_for_print(page) -> dict[str, Any] | None:
    return page.evaluate(
        """
        (() => {
          if (typeof state === 'undefined') return null;
          const candidates = state.services
            .filter((service) => ['friday', 'monthly'].includes(service.type_id))
            .filter((service) => (state.serviceItems[service.id] || []).length > 0)
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
          const service = candidates[0];
          if (!service) return null;
          state.module = 'order-sheets';
          state.selectedServiceTypeId = service.type_id;
          state.selectedServiceId = service.id;
          render();
          return {
            id: service.id,
            typeId: service.type_id,
            date: service.date,
            items: (state.serviceItems[service.id] || []).length,
            slides: buildServicePresenterSlides(service.id).length
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
          state.module = 'service';
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
                  localStorage.clear();
                  sessionStorage.clear();
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
                [...document.querySelectorAll('#sidebarToggleBtn,#brandHome,#themeBtn,#saveAllBtn')]
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
                  const leftRail = document.querySelector('.brand-cluster')?.getBoundingClientRect();
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
            if topbar_offsets["leftFirst"] == 12 and topbar_offsets["rightLastInset"] == 12:
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

            desktop_shell = shell_layout_snapshot(page)
            desktop_overflow = max(
                desktop_shell["documentScrollWidth"] - desktop_shell["viewport"],
                desktop_shell["bodyScrollWidth"] - desktop_shell["viewport"],
            )
            if (
                desktop_shell["detailPaddingLeft"] == 25
                and desktop_shell["detailPaddingTop"] == 25
                and desktop_shell["sidebarSearchTop"] == 8
                and desktop_shell["sidebarSearchInputLineHeight"] == 30
                and desktop_shell["toggleWidth"] == desktop_shell["toggleHeight"] == 32
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
            if home_gutter["left"] == 25 and home_gutter["top"] == 25 and home_gutter["overflow"] <= 2:
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
                mobile_shell["detailPaddingLeft"] == 25
                and mobile_shell["detailPaddingTop"] == 25
                and mobile_shell["sidebarSearchTop"] == 8
                and mobile_shell["sidebarSearchInputLineHeight"] == 30
                and mobile_shell["topbarHeight"] == 40
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
	                          const sidebar = rect('.sidebar');
	                          const search = rect('.sidebar-search-wrap');
	                          const detail = rect('.detail-pane');
	                          const switcher = document.querySelector('.primary-switcher');
	                          return {
	                            width,
	                            topbarHeight: topbar?.height || 0,
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
	                item["topbarHeight"] == 40
	                and item["sidebarWidth"] <= item["width"]
	                and (item["width"] >= 780 or item["sidebarWidth"] == 170)
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
                expected_home_order = ["Worship", "Scripture", "Praise", "Activities", "Calendar", "References", "Order Sheets"]
                if home_order == expected_home_order:
                    pass_("home-sidebar-hierarchy", json.dumps(home_order, ensure_ascii=False))
                else:
                    fail("home-sidebar-hierarchy", json.dumps(home_order, ensure_ascii=False))

                spacing_modules = ["home", "service", "scripture", "praise", "activities", "calendar", "references", "order-sheets"]
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
                if all(item["searchTop"] == 8 and item["firstTop"] == 25 and item["overflow"] <= 2 for item in module_spacing):
                    pass_("module-start-gutters", json.dumps(module_spacing, ensure_ascii=False))
                else:
                    fail("module-start-gutters", json.dumps(module_spacing, ensure_ascii=False))

                page.click('[data-module="scripture"]')
                page.wait_for_function("() => document.body.dataset.module === 'scripture'", timeout=5000)
                page.mouse.move(12, 200)
                topbar_state = page.evaluate(
                    """
                    (() => {
                      const tabs = [...document.querySelectorAll('.primary-switcher .top-module-entry')];
                      const active = document.querySelector('.primary-switcher .top-module-entry.active');
                      const activeLabel = active?.querySelector('span');
                      const activeIcon = active?.querySelector('svg');
                      const activeStyles = active ? getComputedStyle(active) : null;
                      const activeLabelStyles = activeLabel ? getComputedStyle(activeLabel) : null;
                      const activeIconStyles = activeIcon ? getComputedStyle(activeIcon) : null;
                      const activeIconRect = activeIcon?.getBoundingClientRect();
                      const probe = document.createElement('span');
                      probe.style.position = 'absolute';
                      probe.style.background = 'var(--tab-active-bg)';
                      probe.style.color = 'var(--ink)';
                      document.body.appendChild(probe);
                      const expected = getComputedStyle(probe);
                      const expectedBackground = expected.backgroundColor;
                      const expectedColor = expected.color;
                      probe.style.color = 'var(--accent)';
                      const expectedAccent = getComputedStyle(probe).color;
                      const output = {
                        order: tabs.map((tab) => tab.textContent.trim()),
                        active: active?.dataset.module || '',
                        activeBackground: activeStyles?.backgroundColor || '',
                        expectedBackground,
                        activeColor: activeStyles?.color || '',
                        expectedColor,
                        activeLabelColor: activeLabelStyles?.color || '',
                        expectedLabelColor: expectedAccent,
                        activeIconColor: activeIconStyles?.color || '',
                        activeIconWidth: Math.round(activeIconRect?.width || 0),
                        activeIconHeight: Math.round(activeIconRect?.height || 0),
                        activeIconStroke: activeIconStyles?.strokeWidth || '',
                        activeWeight: activeStyles?.fontWeight || ''
                      };
                      probe.remove();
                      return output;
                    })()
                    """
                )
                page.locator(".primary-switcher .top-module-entry.active").hover()
                topbar_hover_state = page.evaluate(
                    """
                    (() => {
                      const active = document.querySelector('.primary-switcher .top-module-entry.active');
                      const activeStyles = active ? getComputedStyle(active) : null;
                      const probe = document.createElement('span');
                      probe.style.position = 'absolute';
                      probe.style.background = 'var(--tab-active-bg)';
                      document.body.appendChild(probe);
                      const expected = getComputedStyle(probe);
                      const output = {
                        activeHoverBackground: activeStyles?.backgroundColor || '',
                        expectedHoverBackground: expected.backgroundColor,
                      };
                      probe.remove();
                      return output;
                    })()
                    """
                )
                topbar_state.update(topbar_hover_state)
                expected_topbar_order = ["Worship", "Scripture", "Praise", "Activities"]
                if (
                    topbar_state["order"] == expected_topbar_order
                    and topbar_state["active"] == "scripture"
                    and topbar_state["activeBackground"] == topbar_state["expectedBackground"]
                    and topbar_state["activeHoverBackground"] == topbar_state["expectedHoverBackground"]
                    and topbar_state["activeColor"] == topbar_state["expectedColor"]
                    and topbar_state["activeLabelColor"] == topbar_state["expectedLabelColor"]
                    and topbar_state["activeIconColor"] == topbar_state["expectedColor"]
                    and topbar_state["activeIconWidth"] == 14
                    and topbar_state["activeIconHeight"] == 14
                    and topbar_state["activeIconStroke"] == "1.7px"
                    and topbar_state["activeWeight"] == "550"
                ):
                    pass_("topbar-module-order-active-style", json.dumps(topbar_state, ensure_ascii=False))
                else:
                    fail("topbar-module-order-active-style", json.dumps(topbar_state, ensure_ascii=False))

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
                        .filter((text) => text.includes('부')),
                      hasYearEndRow: document.body.textContent.includes('송구영신예배'),
                      hasFootnote: document.querySelector('.cal-footnote')?.textContent.includes('부활절 기간 동안 사도행전을 읽는 것으로') || false,
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
                ]
                if (
                    calendar_state["placeholder"] == "Search..."
                    and calendar_state["hasCalendar"]
                    and calendar_state["activeTab"] == "부서 일과"
                    and calendar_state["departmentHeaders"] == expected_department_headers
                    and calendar_state["hasYearEndRow"]
                    and calendar_state["hasFootnote"]
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
                      overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                    }))()
                    """
                )
                expected_lectionary_headers = ["색깔", "첫째 읽기", "시편", "둘째 읽기", "복음서"]
                if (
                    calendar_lectionary_state["activeTab"] == "성서일과"
                    and calendar_lectionary_state["headers"] == expected_lectionary_headers
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
                if references_state["placeholder"] == "Search..." and references_state["hasReferences"] and references_state["overflow"] <= 2:
                    pass_("references-utility-shell", json.dumps(references_state, ensure_ascii=False))
                else:
                    fail("references-utility-shell", json.dumps(references_state, ensure_ascii=False))

                page.click('[data-module="service"]')
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
                    and "Scripture" in global_search_state["headings"]
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
                    and service_sidebar_gap["headLeft"] == 12
                    and service_sidebar_gap["labelLeft"] == 20
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
                    service_gutter["listLeft"] == 25
                    and service_gutter["titleLeft"] == 25
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
                    template_gutter["rootLeft"] == 25
                    and template_gutter["titleLeft"] == 25
                    and template_gutter["gridLeft"] == 25
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
                          levels: [...document.querySelectorAll('.svc-template-level-card strong')]
                            .map((node) => node.textContent.trim()),
                          monthlyFirst: (() => {
                            const step = serviceOrderTemplate('monthly')[0] || {};
                            return {
                              label: step.label || step.name || '',
                              elementType: step.elementType || step.element_type || step.componentType || step.component_type || ''
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
                                  label: element.source_ref?.label || '',
                                  order: element.config?.orderSheet?.order || ''
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
                              sectionKeys: sections.map((section) => section.key),
                              monthlyPrayerElements: sections.find((section) => section.key === 'monthly_prayer')?.elements || [],
                              offeringElements: sections.find((section) => section.key === 'offering')?.elements || [],
                              offeringDefaults: defaultsFor('offering'),
                              closingSection: (() => {
                                const closing = sections.find((section) => section.key === 'closing_song');
                                return {
                                  title: closing?.title || '',
                                  elements: closing?.elements || []
                                };
                              })(),
                              closingDefaults: defaultsFor('closing_song'),
                              blankPlaceholders: scaffold.elements
                                .filter((item) => item.config?.orderSheetPlaceholder === true)
                                .length
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
                          templateFormEditor: (() => {
                            const typeId = '__smoke_template_form__';
                            const previousDirty = state.dirty.service;
                            const previousDirtyTypeIds = new Set(state.dirtyServiceTypeIds);
                            state.serviceTypes = state.serviceTypes.filter((type) => type.id !== typeId);
                            state.serviceTypes.push({
                              id: typeId,
                              name: 'Smoke Template',
                              sort_order: 9999,
                              order_template: [{
                                label: '찬양',
                                name: '찬양',
                                phase: 'Gathering',
                                elementType: 'praise',
                                formHint: 'V1-C'
                              }]
                            });
                            const steps = ensureServiceOrderTemplate(typeId);
                            const host = document.createElement('div');
                            host.innerHTML = renderServiceTemplateStepRow(typeId, steps[0], 0, 1);
                            const input = host.querySelector('[data-service-template-step-field="form_hint"]');
                            const before = input?.value || '';
                            input.value = 'V2-C';
                            updateServiceTemplateStepField(input);
                            const updatedStep = ensureServiceOrderTemplate(typeId)[0] || {};
                            const serialized = serializeServiceOrderTemplate(typeId)[0] || {};
                            state.serviceTypes = state.serviceTypes.filter((type) => type.id !== typeId);
                            state.dirtyServiceTypeIds = previousDirtyTypeIds;
                            state.dirty.service = previousDirty;
                            return {
                              before,
                              fieldLabel: host.querySelector('[data-service-template-step-field="form_hint"]')?.closest('label')?.querySelector('small')?.textContent.trim() || '',
                              stepFormHint: updatedStep.formHint || '',
                              serializedFormHint: serialized.formHint || '',
                              serializedForms: serialized.formPreset?.forms || [],
                              serializedStrength: serialized.formPreset?.strength || '',
                              serializedDefaultStrength: serialized.defaultStrength || ''
                            };
                          })(),
                          templateElementEditor: (() => {
                            const typeId = '__smoke_template_element__';
                            const previousDirty = state.dirty.service;
                            const previousDirtyTypeIds = new Set(state.dirtyServiceTypeIds);
                            state.serviceTypes = state.serviceTypes.filter((type) => type.id !== typeId);
                            state.serviceTypes.push({
                              id: typeId,
                              name: 'Smoke Template Element',
                              sort_order: 9999,
                              order_template: [{
                                label: '봉헌',
                                name: '봉헌',
                                phase: 'Response',
                                elements: [{
                                  label: '봉헌',
                                  name: '봉헌찬양',
                                  elementType: 'praise',
                                  default_text: '이런 교회 되게 하소서',
                                  formHint: 'V-C',
                                  orderSheet: { order: '봉헌', group: 'praise' }
                                }, {
                                  label: '봉헌기도',
                                  name: '봉헌기도',
                                  elementType: 'title_person',
                                  orderSheet: { order: '봉헌기도' }
                                }]
                              }]
                            });
                            const steps = ensureServiceOrderTemplate(typeId);
                            const host = document.createElement('div');
                            host.innerHTML = renderServiceTemplateStepRow(typeId, steps[0], 0, 1);
                            const formInput = host.querySelector('[data-service-template-element-field="form_hint"][data-element-index="0"]');
                            const orderInput = host.querySelector('[data-service-template-element-field="order_sheet"][data-element-index="0"]');
                            const typeSelect = host.querySelector('[data-service-template-element-field="element_type"][data-element-index="1"]');
                            const before = formInput?.value || '';
                            formInput.value = 'V2-C';
                            updateServiceTemplateElementField(formInput);
                            orderInput.value = '봉헌찬양';
                            updateServiceTemplateElementField(orderInput);
                            typeSelect.value = 'title_person';
                            updateServiceTemplateElementField(typeSelect);
                            const snapshots = [];
                            runServiceTemplateElementAction('add-after', typeId, 0, 0);
                            snapshots.push((ensureServiceOrderTemplate(typeId)[0]?.elements || []).map((item) => item.label || item.name || ''));
                            runServiceTemplateElementAction('down', typeId, 0, 1);
                            snapshots.push((ensureServiceOrderTemplate(typeId)[0]?.elements || []).map((item) => item.label || item.name || ''));
                            runServiceTemplateElementAction('up', typeId, 0, 2);
                            snapshots.push((ensureServiceOrderTemplate(typeId)[0]?.elements || []).map((item) => item.label || item.name || ''));
                            runServiceTemplateElementAction('delete', typeId, 0, 1);
                            snapshots.push((ensureServiceOrderTemplate(typeId)[0]?.elements || []).map((item) => item.label || item.name || ''));
                            const updatedElements = ensureServiceOrderTemplate(typeId)[0]?.elements || [];
                            const serializedElements = serializeServiceOrderTemplate(typeId)[0]?.elements || [];
                            state.serviceTypes = state.serviceTypes.filter((type) => type.id !== typeId);
                            state.dirtyServiceTypeIds = previousDirtyTypeIds;
                            state.dirty.service = previousDirty;
                            return {
                              before,
                              rowCount: host.querySelectorAll('.svc-template-element-row').length,
                              actionButtons: host.querySelectorAll('[data-service-template-element-action]').length,
                              fieldLabels: [...host.querySelectorAll('.svc-template-element-field small')].map((node) => node.textContent.trim()).slice(0, 5),
                              snapshots,
                              firstFormHint: updatedElements[0]?.formHint || '',
                              firstForms: updatedElements[0]?.formPreset?.forms || [],
                              firstStrength: updatedElements[0]?.formPreset?.strength || '',
                              serializedFirstOrder: serializedElements[0]?.orderSheet?.order || '',
                              serializedFirstGroup: serializedElements[0]?.orderSheet?.group || '',
                              serializedFirstForms: serializedElements[0]?.formPreset?.forms || [],
                              serializedFirstStrength: serializedElements[0]?.formPreset?.strength || '',
                              serializedSecondType: serializedElements[1]?.elementType || ''
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
                        and template_terms["monthlyScaffold"]["elements"] == 21
                        and template_terms["monthlyScaffold"]["firstSection"] == "준비"
                        and template_terms["monthlyScaffold"]["firstElementType"] == "video"
                        and "monthly_prayer" in template_terms["monthlyScaffold"]["sectionKeys"]
                        and "closing_song" in template_terms["monthlyScaffold"]["sectionKeys"]
                        and template_terms["monthlyScaffold"]["closingSection"]["title"] == "찬양"
                        and template_terms["monthlyScaffold"]["closingSection"]["elements"] == [{"type": "praise", "label": "찬양", "order": "찬양"}]
                        and template_terms["monthlyScaffold"]["offeringDefaults"][0] == {
                            "label": "봉헌",
                            "title": "이런 교회 되게 하소서",
                            "formHint": "V-C",
                            "forms": ["V", "C"],
                            "strength": "suggested",
                        }
                        and template_terms["monthlyScaffold"]["closingDefaults"][0] == {
                            "label": "찬양",
                            "title": "여기에 모인 우리",
                            "formHint": "V1-C-C",
                            "forms": ["V1", "C", "C"],
                            "strength": "default",
                        }
                        and template_terms["publicSpecialRule"] == {
                            "sectionTitle": "특송",
                            "elementLabel": "특송",
                            "when": {"songType": "hymn"},
                            "forms": ["1절", "2절", "간주", "마지막 절"],
                            "hint": "1절-2절-간주-마지막 절",
                            "strength": "default",
                        }
                        and template_terms["formPresetUi"] == {
                            "formHint": "V2-C",
                            "forms": ["V2", "C"],
                            "strength": "manual",
                            "badgeText": "송폼 V2-C 찬송가 1절-2절-간주-마지막 절",
                        }
                        and template_terms["templateFormEditor"] == {
                            "before": "V1-C",
                            "fieldLabel": "송폼",
                            "stepFormHint": "V2-C",
                            "serializedFormHint": "V2-C",
                            "serializedForms": ["V2", "C"],
                            "serializedStrength": "manual",
                            "serializedDefaultStrength": "manual",
                        }
                        and template_terms["templateElementEditor"] == {
                            "before": "V-C",
                            "rowCount": 2,
                            "actionButtons": 9,
                            "fieldLabels": ["엘리먼트", "기본 항목", "타입", "순서지", "송폼"],
                            "snapshots": [
                                ["봉헌", "새 엘리먼트", "봉헌기도"],
                                ["봉헌", "봉헌기도", "새 엘리먼트"],
                                ["봉헌", "새 엘리먼트", "봉헌기도"],
                                ["봉헌", "봉헌기도"],
                            ],
                            "firstFormHint": "V2-C",
                            "firstForms": ["V2", "C"],
                            "firstStrength": "manual",
                            "serializedFirstOrder": "봉헌찬양",
                            "serializedFirstGroup": "praise",
                            "serializedFirstForms": ["V2", "C"],
                            "serializedFirstStrength": "manual",
                            "serializedSecondType": "title_person",
                        }
                        and len(template_terms["monthlyScaffold"]["monthlyPrayerElements"]) == 5
                        and len(template_terms["monthlyScaffold"]["offeringElements"]) == 2
                        and template_terms["monthlyScaffold"]["blankPlaceholders"] == 20
                        and template_terms["overflow"] <= 2
                    ):
                        pass_("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))
                    else:
                        fail("service-template-terminology", json.dumps(template_terms, ensure_ascii=False))

                service_for_print = select_service_for_print(page)
                if not service_for_print:
                    skip("order-sheet-print", "No friday/monthly service with items.")
                else:
                    page.wait_for_selector(".order-sheet-tool #orderSheetPrintArea .order-sheet-copy", state="attached", timeout=5000)
                    print_state = page.evaluate(
                        """
                        (() => {
                          window.__mindexPrintCalled = 0;
                          window.print = () => { window.__mindexPrintCalled += 1; };
                          const area = document.getElementById('orderSheetPrintArea');
                          const rect = area.getBoundingClientRect();
                          const copies = [...area.querySelectorAll('.order-sheet-copy')].map((copy) => {
                            const copyRect = copy.getBoundingClientRect();
                            return {
                              x: Math.round(copyRect.x - rect.x),
                              y: Math.round(copyRect.y - rect.y),
                              width: Math.round(copyRect.width),
                              height: Math.round(copyRect.height)
                            };
                          });
                          return {
                            copies: copies.length,
                            copyRects: copies,
                            ratio: rect.width / rect.height,
                            rows: area.querySelectorAll('tbody tr').length
                          };
                        })()
                        """
                    )
                    side_by_side = (
                        print_state["copies"] == 2
                        and abs(print_state["copyRects"][0]["y"] - print_state["copyRects"][1]["y"]) <= 2
                        and print_state["copyRects"][1]["x"] > print_state["copyRects"][0]["x"]
                        and abs(print_state["copyRects"][0]["height"] - print_state["copyRects"][1]["height"]) <= 2
                    )
                    if side_by_side and 1.40 <= print_state["ratio"] <= 1.43 and print_state["rows"] >= 2:
                        pass_("order-sheet-preview", json.dumps({**service_for_print, **print_state}, ensure_ascii=False))
                    else:
                        fail("order-sheet-preview", json.dumps({**service_for_print, **print_state}, ensure_ascii=False))

                    active_order_sheet_date = page.evaluate(
                        """
                        () => document.querySelector('.order-sheet-service.active strong')?.textContent.trim() || ''
                        """
                    )
                    page.fill("#searchInput", active_order_sheet_date)
                    page.wait_for_timeout(150)
                    order_sheet_search = page.evaluate(
                        """
                        (serviceId) => {
                          const active = document.querySelector(`.order-sheet-service.active[data-order-sheet-service="${CSS.escape(serviceId)}"]`);
                          const area = document.getElementById('orderSheetPrintArea');
                          return {
                            query: document.querySelector('#searchInput')?.value || '',
                            count: document.querySelectorAll('.order-sheet-service').length,
                            activeMatches: Boolean(active),
                            copies: area?.querySelectorAll('.order-sheet-copy').length || 0,
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                          };
                        }
                        """,
                        service_for_print["id"],
                    )
                    if order_sheet_search["query"] and order_sheet_search["count"] >= 1 and order_sheet_search["activeMatches"] and order_sheet_search["copies"] == 2 and order_sheet_search["overflow"] <= 2:
                        pass_("order-sheet-search", json.dumps(order_sheet_search, ensure_ascii=False))
                    else:
                        fail("order-sheet-search", json.dumps(order_sheet_search, ensure_ascii=False))

                    order_sheet_adapter = page.evaluate(
                        """
                        (serviceId) => {
                          const original = state.serviceItems[serviceId] || [];
                          const explicitItem = normalizeServiceItem({
                            service_id: serviceId,
                            sort_order: original.length + 1,
                            label: '',
                            raw_title: 'Fallback text',
                            order_sheet: {
                              order: '데이터 순서',
                              assignee: '데이터 담당',
                              note: '데이터 비고'
                            }
                          });
                          const hiddenItem = normalizeServiceItem({
                            service_id: serviceId,
                            sort_order: original.length + 2,
                            label: '숨김',
                            raw_title: '숨겨진 비고',
                            order_sheet_hidden: true
                          });
                          const blankItem = normalizeServiceItem({
                            service_id: serviceId,
                            sort_order: original.length + 3,
                            label: '',
                            raw_title: '',
                            assignee: ''
                          });
                          const memo = serializeServiceItemMemo({
                            note: '메모',
                            orderSheet: {
                              order: '메모 순서',
                              assignee: '메모 담당',
                              note: '메모 비고'
                            }
                          });
                          state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder([...original, explicitItem, hiddenItem, blankItem]);
                          const service = state.services.find((svc) => svc.id === serviceId) || {};
                          const type = state.serviceTypes.find((candidate) => candidate.id === service.type_id);
                          const originalDefaults = type ? [...(type.fixed_items || [])] : [];
                          if (type) {
                            type.fixed_items = normalizeServiceDefaultItemsInCurrentOrder([
                              ...originalDefaults,
                              {
                                label: '',
                                raw_title: '',
                                order_sheet: {
                                  order: '공란 순서'
                                }
                              }
                            ]);
                          }
                          const rows = serviceOrderSheetRows(serviceId);
                          if (type) type.fixed_items = originalDefaults;
                          state.serviceItems[serviceId] = original;
                          refreshServiceOrderSheetPreview(serviceId);
                          const explicit = rows.find((row) => row.order === '데이터 순서');
                          const hidden = rows.find((row) => row.note === '숨겨진 비고');
                          const defaultBlank = rows.find((row) => row.order === '공란 순서');
                          const blank = rows[rows.length - 1] || {};
                          const parsedMemo = parseServiceItemMemo(memo).orderSheet || {};
                          return {
                            explicit,
                            hidden: Boolean(hidden),
                            defaultBlank,
                            blankPreserved: blank.order === '' && blank.assignee === '' && blank.note === '',
                            memoPreserved: parsedMemo.order === '메모 순서' && parsedMemo.assignee === '메모 담당' && parsedMemo.note === '메모 비고'
                          };
                        }
                        """,
                        service_for_print["id"],
                    )
                    if (
                        order_sheet_adapter["explicit"]
                        and order_sheet_adapter["explicit"]["assignee"] == "데이터 담당"
                        and order_sheet_adapter["explicit"]["note"] == "데이터 비고"
                        and not order_sheet_adapter["hidden"]
                        and order_sheet_adapter["defaultBlank"]
                        and order_sheet_adapter["defaultBlank"]["note"] == ""
                        and order_sheet_adapter["blankPreserved"]
                        and order_sheet_adapter["memoPreserved"]
                    ):
                        pass_("order-sheet-data-adapter", json.dumps(order_sheet_adapter, ensure_ascii=False))
                    else:
                        fail("order-sheet-data-adapter", json.dumps(order_sheet_adapter, ensure_ascii=False))

                    print_button = page.evaluate(
                        """
                        (() => {
                          const button = document.querySelector('[data-print-service-order]');
                          if (!button) return null;
                          const rect = button.getBoundingClientRect();
                          return {
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            disabled: button.disabled,
                            visible: rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden'
                          };
                        })()
                        """
                    )
                    if print_button and print_button["visible"] and not print_button["disabled"]:
                        pass_("order-sheet-print-button-mounted", json.dumps(print_button, ensure_ascii=False))
                    else:
                        fail("order-sheet-print-button-mounted", json.dumps(print_button, ensure_ascii=False))

                    page.evaluate("document.querySelector('[data-print-service-order]')?.click()")
                    called = page.evaluate("window.__mindexPrintCalled")
                    if called == 1:
                        pass_("order-sheet-print-button")
                    else:
                        fail("order-sheet-print-button", f"called={called}")

                    pdf_bytes = page.pdf(format="A4", landscape=True, print_background=True)
                    if len(pdf_bytes) > 10000:
                        pass_("order-sheet-pdf", f"{len(pdf_bytes)} bytes")
                    else:
                        fail("order-sheet-pdf", f"{len(pdf_bytes)} bytes")
                    page.emulate_media(media="screen")

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
                          outlineRows: document.querySelectorAll('.service-outline-row').length,
                          editorFields: [...document.querySelectorAll('.service-sidebar-editor label > span')]
                            .map((node) => node.textContent.trim()),
                          hasLegacyDrawer: Boolean(document.querySelector('.svc-edit-drawer')),
                          status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                          jumpLabel: document.querySelector('[data-presenter-jump-button]')?.getAttribute('aria-label') || '',
                          firstThumbLabel: document.querySelector('.svc-slide-thumb')?.getAttribute('aria-label') || '',
                          actionLabels: [...document.querySelectorAll('.service-sidebar-editor-actions [aria-label]')]
                            .slice(0, 4)
                            .map((node) => node.getAttribute('aria-label')),
                          elementTypes: [...document.querySelectorAll('[data-service-item-field="element_type"] option')]
                            .map((node) => node.textContent.trim())
                            .slice(0, 10),
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
                        and "편집" in presenter_terms["sidebarHeadings"]
                        and presenter_terms["outlineRows"] >= 2
                        and presenter_terms["editorFields"][:4] == ["섹션", "담당", "항목", "타입"]
                        and not presenter_terms["hasLegacyDrawer"]
                        and presenter_terms["actionLabels"][:4] == ["항목 위로 이동", "항목 아래로 이동", "항목 복제", "항목 삭제"]
                        and presenter_terms["elementTypes"][:6] == ["자동", "빈 화면", "동영상", "이미지", "찬양", "말씀"]
                        and presenter_terms["status"] == "Preview"
                        and presenter_terms["jumpLabel"] == "슬라이드로 이동"
                        and (
                            "슬라이드로 이동" in presenter_terms["firstThumbLabel"]
                            or "준비 화면으로 이동" in presenter_terms["firstThumbLabel"]
                        )
                        and not presenter_terms["visibleBadTerms"]
                        and not presenter_terms["visiblePresentationTerms"]
                        and not presenter_terms["legacyArtifactLabels"]
                        and presenter_terms["overflow"] <= 2
                    ):
                        pass_("presenter-terminology", json.dumps(presenter_terms, ensure_ascii=False))
                    else:
                        fail("presenter-terminology", json.dumps(presenter_terms, ensure_ascii=False))
                    thumb_metrics = page.evaluate(
                        """
                        (() => [...document.querySelectorAll('.svc-slide-thumb-frame')]
                          .slice(0, 12)
                          .map((node) => {
                            const rect = node.getBoundingClientRect();
                            return {
                              width: Math.round(rect.width),
                              height: Math.round(rect.height),
                              ratio: rect.height ? Number((rect.width / rect.height).toFixed(3)) : 0
                            };
                          }))()
                        """
                    )
                    if thumb_metrics:
                        widths = [item["width"] for item in thumb_metrics]
                        heights = [item["height"] for item in thumb_metrics]
                        ratios = [item["ratio"] for item in thumb_metrics]
                        uniform = (
                            max(widths) - min(widths) <= 2
                            and max(heights) - min(heights) <= 2
                            and all(1.75 <= ratio <= 1.79 for ratio in ratios)
                        )
                        if uniform:
                            pass_("presenter-thumbnail-grid", json.dumps(thumb_metrics[:4], ensure_ascii=False))
                        else:
                            fail("presenter-thumbnail-grid", json.dumps(thumb_metrics[:8], ensure_ascii=False))
                    page.evaluate(
                        """
                        (serviceId) => {
                          preparePresenterService(serviceId);
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
                        page.wait_for_function("(target) => state.presenter.index === target", arg=dbl_target, timeout=5000)
                        page.wait_for_function("() => window.__mindexPresenterOpenCalls === 1", timeout=5000)
                        dbl_state = page.evaluate(
                            """
                            (() => ({
                              serviceId: state.presenter.serviceId,
                              index: state.presenter.index,
                              openCalls: window.__mindexPresenterOpenCalls || 0
                            }))()
                            """
                        )
                        if (
                            dbl_state["serviceId"] == service_for_slides["id"]
                            and dbl_state["index"] == dbl_target
                            and dbl_state["openCalls"] == 1
                        ):
                            pass_("presenter-doubleclick-start", json.dumps(dbl_state, ensure_ascii=False))
                        else:
                            fail("presenter-doubleclick-start", json.dumps(dbl_state, ensure_ascii=False))

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

                page.click('[data-module="praise"]')
                wait_for_praise_data(page)
                wait_for_module_data(page, "praise")
                praise_placeholder = page.input_value("#searchInput")
                placeholder = page.get_attribute("#searchInput", "placeholder") or ""
                if placeholder == "Search...":
                    pass_("praise-module-placeholder", placeholder)
                else:
                    fail("praise-module-placeholder", placeholder or praise_placeholder)

                page.click('[data-module="scripture"]')
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
