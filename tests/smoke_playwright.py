from __future__ import annotations

import html
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

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
    APP_DIR.parent / "INDEX" / ".env.supabase.local",
    APP_DIR.parent / "INDEX" / ".env.supabase",
    Path.home() / "Documents" / "INDEX" / ".env.supabase.local",
    Path.home() / "Documents" / "INDEX" / ".env.supabase",
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
        route = self.path.split("?", 1)[0]
        if route in ("", "/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(injected_index_html().encode("utf-8"))
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
              && state.services.length > 0
              && Object.keys(state.serviceItems || {}).length > 0
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
          state.module = 'service';
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
          const service = state.services
            .filter((item) => (state.serviceItems[item.id] || []).length > 0)
            .find((item) => buildServicePresenterSlides(item.id).length > 0);
          if (!service) return null;
          const slides = buildServicePresenterSlides(service.id);
          state.module = 'service';
          state.selectedServiceTypeId = service.type_id;
          state.selectedServiceId = service.id;
          render();
          return { id: service.id, typeId: service.type_id, date: service.date, slides: slides.length };
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

            page.click("#sidebarToggleBtn")
            collapsed = page.evaluate("document.body.classList.contains('sidebar-collapsed')")
            page.click("#sidebarToggleBtn")
            expanded = page.evaluate("!document.body.classList.contains('sidebar-collapsed')")
            if collapsed and expanded:
                pass_("sidebar-toggle")
            else:
                fail("sidebar-toggle", f"collapsed={collapsed} expanded={expanded}")

            if not has_config:
                skip("supabase-backed-flows", "No Supabase config found.")
            else:
                wait_for_supabase_client(page)
                page.click('[data-module="service"]')
                wait_for_service_data(page)
                wait_for_module_data(page, "service")
                snapshot = get_app_snapshot(page)
                if snapshot.get("serviceError") or snapshot.get("connectionError"):
                    fail("service-data-load", json.dumps(snapshot, ensure_ascii=False))
                elif snapshot.get("serviceTypes", 0) > 0 and snapshot.get("services", 0) > 0:
                    pass_("service-data-load", json.dumps(snapshot, ensure_ascii=False))
                else:
                    fail("service-data-load", json.dumps(snapshot, ensure_ascii=False))

                service_for_print = select_service_for_print(page)
                if not service_for_print:
                    skip("order-sheet-print", "No friday/monthly service with items.")
                else:
                    page.evaluate(
                        """
                        (() => {
                          const area = document.getElementById('orderSheetPrintArea');
                          const drawer = area?.closest('details.svc-edit-drawer')
                            || document.querySelector('details.svc-edit-drawer');
                          if (drawer) {
                            drawer.open = true;
                            drawer.scrollIntoView({ block: 'start', inline: 'nearest' });
                          }
                        })()
                        """
                    )
                    page.wait_for_selector("#orderSheetPrintArea .order-sheet-copy", timeout=5000)
                    print_state = page.evaluate(
                        """
                        (() => {
                          window.__mindexPrintCalled = 0;
                          window.print = () => { window.__mindexPrintCalled += 1; };
                          const area = document.getElementById('orderSheetPrintArea');
                          const rect = area.getBoundingClientRect();
                          return {
                            copies: area.querySelectorAll('.order-sheet-copy').length,
                            ratio: rect.width / rect.height,
                            rows: area.querySelectorAll('tbody tr').length
                          };
                        })()
                        """
                    )
                    if print_state["copies"] == 2 and 0.68 <= print_state["ratio"] <= 0.74 and print_state["rows"] >= 2:
                        pass_("order-sheet-preview", json.dumps({**service_for_print, **print_state}, ensure_ascii=False))
                    else:
                        fail("order-sheet-preview", json.dumps({**service_for_print, **print_state}, ensure_ascii=False))

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

                    pdf_bytes = page.pdf(format="A4", print_background=True)
                    if len(pdf_bytes) > 10000:
                        pass_("order-sheet-pdf", f"{len(pdf_bytes)} bytes")
                    else:
                        fail("order-sheet-pdf", f"{len(pdf_bytes)} bytes")

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

                page.click('[data-module="praise"]')
                wait_for_praise_data(page)
                wait_for_module_data(page, "praise")
                praise_placeholder = page.input_value("#searchInput")
                placeholder = page.get_attribute("#searchInput", "placeholder") or ""
                if "title" in placeholder.lower() or "lyrics" in placeholder.lower():
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
