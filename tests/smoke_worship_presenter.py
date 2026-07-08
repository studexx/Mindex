from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Any

from PIL import Image

from smoke_app import (
    PLAYWRIGHT_IMPORT_ERROR,
    PlaywrightTimeoutError,
    build_raw_connection_link,
    extract_supa_config,
    launch_chromium,
    select_service_with_slides,
    start_local_app_server,
    sync_playwright,
    wait_for_service_data,
    wait_for_supabase_client,
)


def presenter_output_url(app_url: str) -> str:
    return f"{app_url}?mindexSmokeRaw=1&output=presenter"


def rgb_at(image_bytes: bytes, x_ratio: float, y_ratio: float) -> tuple[int, int, int]:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    x = max(0, min(image.width - 1, round((image.width - 1) * x_ratio)))
    y = max(0, min(image.height - 1, round((image.height - 1) * y_ratio)))
    return image.getpixel((x, y))


def is_chromakey_green(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return green >= 220 and red <= 35 and blue <= 35


def is_dark_bar(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return red <= 25 and green <= 35 and 35 <= blue <= 95


def is_empty_output_background(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return red <= 8 and green <= 8 and blue <= 8


def screenshot_with_retry(page, locator, attempts: int = 4) -> bytes:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return locator.screenshot()
        except Exception as error:
            last_error = error
            page.wait_for_timeout(250)
    assert last_error is not None
    raise last_error


def main() -> int:
    results: list[tuple[str, str, str]] = []
    console_messages: list[str] = []
    page_errors: list[str] = []

    def record_response(response, prefix: str = "") -> None:
        if response.status >= 400:
            label = f"{prefix} " if prefix else ""
            console_messages.append(f"{label}response {response.status}: {response.url}")

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

    if not all(extract_supa_config()):
        skip("supabase-config", "No Supabase config found.")
        for status, name, detail in results:
            print(f"{status} {name}" + (f" :: {detail}" if detail else ""))
        return 0

    server, app_url = start_local_app_server()
    try:
        with sync_playwright() as playwright:
            browser = launch_chromium(playwright)
            context = browser.new_context(viewport={"width": 1440, "height": 980})
            page = context.new_page()
            page.add_init_script("localStorage.clear(); sessionStorage.clear();")
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on("response", record_response)
            page.on(
                "console",
                lambda msg: console_messages.append(f"{msg.type}: {msg.text}")
                if msg.type in ("error", "warning")
                else None,
            )

            page.goto(build_raw_connection_link(app_url, "presenter"), wait_until="load")
            page.wait_for_selector(".app-shell", timeout=5000)
            wait_for_supabase_client(page)
            wait_for_service_data(page)

            service = select_service_with_slides(page)
            if not service:
                skip("presenter-slides", "No service with generated slides.")
            else:
                page.wait_for_selector("#servicePresenterControls", timeout=5000)
                slide_count = page.locator(".svc-slide-thumb").count()
                if slide_count == service["slides"]:
                    pass_("presenter-slides", json.dumps(service, ensure_ascii=False))
                else:
                    fail("presenter-slides", f"dom={slide_count} state={service}")

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

                initial_status = page.evaluate(
                    """
                    (() => ({
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                    }))()
                    """
                )
                if initial_status["status"] == "미리보기" and initial_status["mode"] == "":
                    pass_("presenter-status-preview", json.dumps(initial_status, ensure_ascii=False))
                else:
                    fail("presenter-status-preview", json.dumps(initial_status, ensure_ascii=False))

                sticky_title_state: dict[str, Any] = page.evaluate(
                    """
                    async () => {
                      const pane = document.querySelector('.detail-pane');
                      const header = document.querySelector('.svc-header');
                      const top = document.querySelector('.svc-presenter-top');
                      const title = document.querySelector('.svc-service-title');
                      const date = document.querySelector('.svc-date-text');
                      const beforeHeader = header?.getBoundingClientRect();
                      const beforeTop = top?.getBoundingClientRect();
                      if (pane) pane.scrollTop = 260;
                      document.scrollingElement.scrollTop = 260;
                      await new Promise((resolve) => requestAnimationFrame(resolve));
                      const afterHeader = header?.getBoundingClientRect();
                      const afterTop = top?.getBoundingClientRect();
                      const beforeHeaderTop = Math.round(beforeHeader?.top || 0);
                      const afterHeaderTop = Math.round(afterHeader?.top || 0);
                      const beforeControlsTop = Math.round(beforeTop?.top || 0);
                      const afterControlsTop = Math.round(afterTop?.top || 0);
                      return {
                        title: title?.textContent.trim() || '',
                        date: date?.textContent.trim() || '',
                        usesExistingHeader: Boolean(title?.closest('.svc-header') && !document.querySelector('.svc-presenter-title-row')),
                        headerPosition: header ? getComputedStyle(header).position : '',
                        controlsPosition: top ? getComputedStyle(top).position : '',
                        beforeHeaderTop,
                        afterHeaderTop,
                        headerShift: Math.abs(afterHeaderTop - beforeHeaderTop),
                        beforeControlsTop,
                        afterControlsTop,
                        controlsShift: Math.abs(afterControlsTop - beforeControlsTop),
                        overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth)
                      };
                    }
                    """
                )
                if (
                    sticky_title_state["title"]
                    and sticky_title_state["date"]
                    and re.match(r"^\d{4}-\d{2}-\d{2} \((주일|월|화|수|목|금|토)\)", sticky_title_state["date"])
                    and sticky_title_state["usesExistingHeader"]
                    and sticky_title_state["headerPosition"] == "sticky"
                    and sticky_title_state["controlsPosition"] == "sticky"
                    and sticky_title_state["headerShift"] <= 1
                    and sticky_title_state["controlsShift"] <= 1
                    and sticky_title_state["afterControlsTop"] > sticky_title_state["afterHeaderTop"]
                    and sticky_title_state["overflow"] <= 2
                ):
                    pass_("presenter-sticky-service-title", json.dumps(sticky_title_state, ensure_ascii=False))
                else:
                    fail("presenter-sticky-service-title", json.dumps(sticky_title_state, ensure_ascii=False))

                page.evaluate(
                    """
                    (serviceId) => {
                      preparePresenterService(serviceId);
                      renderPresenterControlState(serviceId);
                    }
                    """,
                    service["id"],
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

                fast_jump_state = page.evaluate(
                    """
                    async (serviceId) => {
                      preparePresenterService(serviceId);
                      renderPresenterControlState(serviceId);
                      const detail = refs.detailPane || document.getElementById('detailPane');
                      const targetIndex = Math.min(18, Math.max(state.presenter.slides.length - 1, 0));
                      detail.scrollTop = 320;
                      const scrollBefore = detail.scrollTop;
                      const boardBefore = document.querySelector('.svc-slide-board');
                      const thumb = document.querySelector(`.svc-slide-thumb[data-service-id="${serviceId}"][data-presenter-index="${targetIndex}"]`);
                      const startedAt = performance.now();
                      thumb?.click();
                      const immediateIndex = state.presenter.index;
                      await new Promise((resolve) => requestAnimationFrame(resolve));
                      const boardAfter = document.querySelector('.svc-slide-board');
                      const activeThumb = document.querySelector('.svc-slide-thumb.active');
                      const result = {
                        targetIndex,
                        immediateIndex,
                        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
                        sameBoard: boardBefore === boardAfter,
                        scrollBefore,
                        scrollAfter: detail.scrollTop,
                        activeIndex: Number(activeThumb?.dataset.presenterIndex ?? -1),
                      };
                      state.presenter.index = 0;
                      state.presenter.safetyBlank = false;
                      renderPresenterControlState(serviceId);
                      return result;
                    }
                    """,
                    service["id"],
                )
                if (
                    fast_jump_state["targetIndex"] == fast_jump_state["immediateIndex"]
                    and fast_jump_state["targetIndex"] == fast_jump_state["activeIndex"]
                    and fast_jump_state["sameBoard"]
                    and abs(fast_jump_state["scrollAfter"] - fast_jump_state["scrollBefore"]) <= 1
                    and fast_jump_state["elapsedMs"] < 120
                ):
                    pass_("presenter-thumb-click-fast-no-scroll", json.dumps(fast_jump_state, ensure_ascii=False))
                else:
                    fail("presenter-thumb-click-fast-no-scroll", json.dumps(fast_jump_state, ensure_ascii=False))

                hover_thumb = page.locator(f'.svc-slide-thumb[data-service-id="{service["id"]}"][data-presenter-index="1"]')
                hover_thumb.hover()
                hover_state = page.evaluate(
                    """
                    (serviceId) => {
                      const frame = document.querySelector(`.svc-slide-thumb[data-service-id="${serviceId}"][data-presenter-index="1"] .svc-slide-thumb-frame`);
                      return {
                        shadow: frame ? getComputedStyle(frame).boxShadow : '',
                      };
                    }
                    """,
                    service["id"],
                )
                if "0px 0px 0px 2px" in hover_state["shadow"]:
                    pass_("presenter-thumb-hover-ring", json.dumps(hover_state, ensure_ascii=False))
                else:
                    fail("presenter-thumb-hover-ring", json.dumps(hover_state, ensure_ascii=False))

                ready_status = page.evaluate(
                    """
                    (() => ({
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                    }))()
                    """
                )
                if ready_status["status"] == "준비" and ready_status["mode"].endswith("번"):
                    pass_("presenter-status-ready", json.dumps(ready_status, ensure_ascii=False))
                else:
                    fail("presenter-status-ready", json.dumps(ready_status, ensure_ascii=False))

                warmup_chip_state = page.evaluate(
                    """
                    (serviceId) => {
                      const previousConnectedAt = state.presenter.outputConnectedAt;
                      const previousWarmup = state.presenter.outputWarmup;
                      const previousClientId = state.presenter.outputClientId;
                      state.presenter.outputConnectedAt = Date.now();
                      state.presenter.outputClientId = '__smoke_output__';
                      state.presenter.outputWarmup = {
                        serviceId,
                        total: 12,
                        ready: 7,
                        queued: 5,
                        complete: false,
                        updatedAt: Date.now(),
                      };
                      renderPresenterControlState(serviceId);
                      const warming = document.querySelector('.svc-presenter-warmup');
                      const warmingState = {
                        text: warming?.textContent.trim() || '',
                        className: warming?.className || '',
                        aria: warming?.getAttribute('aria-label') || '',
                      };
                      state.presenter.outputWarmup = {
                        serviceId,
                        total: 12,
                        ready: 12,
                        queued: 0,
                        complete: true,
                        updatedAt: Date.now(),
                      };
                      renderPresenterControlState(serviceId);
                      const ready = document.querySelector('.svc-presenter-warmup');
                      const readyState = {
                        text: ready?.textContent.trim() || '',
                        className: ready?.className || '',
                        aria: ready?.getAttribute('aria-label') || '',
                      };
                      state.presenter.outputConnectedAt = previousConnectedAt;
                      state.presenter.outputWarmup = previousWarmup;
                      state.presenter.outputClientId = previousClientId;
                      renderPresenterControlState(serviceId);
                      return { warming: warmingState, ready: readyState };
                    }
                    """,
                    service["id"],
                )
                if (
                    warmup_chip_state["warming"]["text"] == "이미지 준비 7/12"
                    and "svc-presenter-warmup--warming" in warmup_chip_state["warming"]["className"]
                    and "7 / 12" in warmup_chip_state["warming"]["aria"]
                    and warmup_chip_state["ready"]["text"] == "이미지 준비 완료"
                    and "svc-presenter-warmup--ready" in warmup_chip_state["ready"]["className"]
                    and warmup_chip_state["ready"]["aria"] == "출력 이미지 준비 완료"
                ):
                    pass_("presenter-output-warmup-chip", json.dumps(warmup_chip_state, ensure_ascii=False))
                else:
                    fail("presenter-output-warmup-chip", json.dumps(warmup_chip_state, ensure_ascii=False))

                ready_thumb_state = page.evaluate(
                    """
                    (() => {
                      const first = document.querySelector('.svc-slide-thumb[data-presenter-index="0"]');
                      const second = document.querySelector('.svc-slide-thumb[data-presenter-index="1"]');
                      return {
                        firstPreparationMedia: Boolean(first?.querySelector('.svc-slide-thumb-frame--video[data-element-type="video"][data-slide-layout="media"]')),
                        firstPreviewText: first?.querySelector('.svc-slide-mini-output')?.innerText.trim() || '',
                        numberBadges: document.querySelectorAll('.svc-slide-thumb-no').length,
                        firstNumber: first?.closest('.svc-slide-thumb-wrap')?.querySelector('.svc-slide-thumb-no')?.textContent.trim() || '',
                        secondNumber: second?.closest('.svc-slide-thumb-wrap')?.querySelector('.svc-slide-thumb-no')?.textContent.trim() || '',
                        firstLabel: first?.getAttribute('aria-label') || '',
                        secondLabel: second?.getAttribute('aria-label') || '',
                      };
                    })()
                    """
                )
                if (
                    ready_thumb_state["firstPreparationMedia"]
                    and ready_thumb_state["firstPreviewText"] == ""
                    and ready_thumb_state["numberBadges"] >= 2
                    and ready_thumb_state["firstNumber"] == "1"
                    and ready_thumb_state["secondNumber"] == "2"
                    and "1번 슬라이드로 이동" in ready_thumb_state["firstLabel"]
                    and "2번 슬라이드로 이동" in ready_thumb_state["secondLabel"]
                ):
                    pass_("presenter-ready-thumb-chrome", json.dumps(ready_thumb_state, ensure_ascii=False))
                else:
                    fail("presenter-ready-thumb-chrome", json.dumps(ready_thumb_state, ensure_ascii=False))

                intro_auto_advance_state = page.evaluate(
                    """
                    async () => {
                      const existingRoot = document.getElementById('presenterOutputRoot');
                      existingRoot?.remove();
                      const root = document.createElement('main');
                      root.id = 'presenterOutputRoot';
                      root.className = 'presenter-output-root no-chromakey';
                      document.body.appendChild(root);
                      const hits = [];
                      const makePayload = (role, playback = {}) => ({
                        serviceId: '__smoke_intro_service__',
                        serviceType: 'friday',
                        serviceDate: '2026-07-12',
                        chromakey: false,
                        backgroundImages: [],
                        index: 0,
                        slides: [
                          {
                            id: `__smoke_${role}_slide__`,
                            elementType: 'video',
                            layout: 'media',
                            type: 'video',
                            presenterRole: role,
                            title: role,
                            videoSrc: '/',
                            playback,
                          },
                          {
                            id: '__smoke_after_intro__',
                            elementType: 'title_assignee',
                            layout: 'lower_bar_text',
                            type: 'title-assignee',
                            title: '예배',
                            assignee: '',
                            text: '예배',
                          },
                        ],
                      });
                      const fireEnded = (payload) => {
                        renderPresenterOutput(payload, { onAutoAdvance: (detail) => hits.push(detail) });
                        const video = root.querySelector('.presenter-output-layer.is-active video.presenter-video');
                        video?.dispatchEvent(new Event('ended'));
                        return {
                          hitCount: hits.length,
                          videoRole: video?.dataset.presenterRole || '',
                          autoplay: video?.hasAttribute('autoplay') || false,
                          muted: video?.hasAttribute('muted') || false,
                          loop: video?.hasAttribute('loop') || false,
                          detail: hits[hits.length - 1] || null,
                        };
                      };
                      const introSlide = makePayload('intro').slides[0];
                      const waitingSlide = makePayload('waiting_loop', { loop: true }).slides[0];
                      const introLoopSlide = makePayload('intro', { loop: true }).slides[0];
                      const intro = fireEnded(makePayload('intro'));
                      hits.length = 0;
                      const waiting = fireEnded(makePayload('waiting_loop', { loop: true }));
                      hits.length = 0;
                      const introLoop = fireEnded(makePayload('intro', { loop: true }));
                      hits.length = 0;
                      const scheduledPastPayload = makePayload('waiting_loop', {
                        loop: true,
                        autoAdvanceAt: new Date(Date.now() - 1000).toISOString(),
                      });
                      renderPresenterOutput(scheduledPastPayload, { onAutoAdvance: (detail) => hits.push(detail) });
                      await new Promise((resolve) => setTimeout(resolve, 30));
                      const scheduledPast = {
                        hitCount: hits.length,
                        detail: hits[hits.length - 1] || null,
                      };
                      hits.length = 0;
                      const scheduledFuturePayload = makePayload('waiting_loop', {
                        loop: true,
                        autoAdvanceAt: new Date(Date.now() + 60000).toISOString(),
                      });
                      renderPresenterOutput(scheduledFuturePayload, { onAutoAdvance: (detail) => hits.push(detail) });
                      await new Promise((resolve) => setTimeout(resolve, 30));
                      const scheduledFuture = {
                        hitCount: hits.length,
                        timerArmed: Boolean(presenterOutputRenderState.autoAdvanceTimer),
                      };
                      const parsedClock = parsePresenterAutoAdvanceAt('10:40', '2026-07-12');
                      const timelinePayload = {
                        serviceId: '__smoke_timeline_service__',
                        serviceType: 'friday',
                        serviceDate: '2026-07-12',
                        chromakey: false,
                        index: 1,
                        slides: [
                          {
                            id: '__smoke_waiting_timeline__',
                            elementType: 'video',
                            layout: 'media',
                            presenterRole: 'waiting_loop',
                            playback: { autoAdvanceAt: '10:40' },
                          },
                          {
                            id: '__smoke_intro_timeline__',
                            elementType: 'video',
                            layout: 'media',
                            presenterRole: 'intro',
                            playback: { durationSeconds: 600 },
                          },
                          {
                            id: '__smoke_first_screen__',
                            elementType: 'title_assignee',
                            layout: 'lower_bar_text',
                            title: '예배 시작',
                            text: '예배 시작',
                          },
                        ],
                      };
                      const timelineIntro = timelinePayload.slides[1];
                      const catchUpMid = presenterVideoTimelineCatchUp(timelineIntro, timelinePayload, {
                        now: new Date('2026-07-12T10:44:00').getTime(),
                        durationSeconds: 600,
                      });
                      const catchUpDone = presenterVideoTimelineCatchUp(timelineIntro, timelinePayload, {
                        now: new Date('2026-07-12T10:54:00').getTime(),
                        durationSeconds: 600,
                      });
                      const endAtPayload = {
                        ...timelinePayload,
                        slides: [
                          timelinePayload.slides[0],
                          {
                            ...timelineIntro,
                            playback: { autoAdvanceAt: '10:50', durationSeconds: 600 },
                          },
                        ],
                      };
                      const catchUpFromEndAt = presenterVideoTimelineCatchUp(endAtPayload.slides[1], endAtPayload, {
                        now: new Date('2026-07-12T10:45:00').getTime(),
                        durationSeconds: 600,
                      });
                      clearPresenterOutputAutoAdvanceTimer();
                      root.remove();
                      if (existingRoot) document.body.appendChild(existingRoot);
                      return {
                        intro,
                        waiting,
                        introLoop,
                        scheduledPast,
                        scheduledFuture,
                        parsedClock: parsedClock ? {
                          year: parsedClock.getFullYear(),
                          month: parsedClock.getMonth() + 1,
                          day: parsedClock.getDate(),
                          hour: parsedClock.getHours(),
                          minute: parsedClock.getMinutes(),
                        } : null,
                        catchUpMid: catchUpMid ? {
                          offsetSeconds: Math.round(catchUpMid.offsetSeconds),
                          shouldAdvance: catchUpMid.shouldAdvance,
                          startHour: catchUpMid.startAt.getHours(),
                          startMinute: catchUpMid.startAt.getMinutes(),
                        } : null,
                        catchUpDone: catchUpDone ? {
                          offsetSeconds: Math.round(catchUpDone.offsetSeconds),
                          shouldAdvance: catchUpDone.shouldAdvance,
                        } : null,
                        catchUpFromEndAt: catchUpFromEndAt ? {
                          offsetSeconds: Math.round(catchUpFromEndAt.offsetSeconds),
                          shouldAdvance: catchUpFromEndAt.shouldAdvance,
                          startHour: catchUpFromEndAt.startAt.getHours(),
                          startMinute: catchUpFromEndAt.startAt.getMinutes(),
                        } : null,
                        shouldAdvanceIntro: presenterSlideShouldAutoAdvanceOnEnd(introSlide),
                        shouldAdvanceWaiting: presenterSlideShouldAutoAdvanceOnEnd(waitingSlide),
                        shouldAdvanceIntroLoop: presenterSlideShouldAutoAdvanceOnEnd(introLoopSlide),
                        introDefaults: presenterPlaybackConfig(null, 'intro-video'),
                        readyDefaults: presenterPlaybackConfig(null, 'ready-video'),
                      };
                    }
                    """
                )
                if (
                    intro_auto_advance_state["intro"]["hitCount"] == 1
                    and intro_auto_advance_state["intro"]["videoRole"] == "intro"
                    and intro_auto_advance_state["intro"]["autoplay"]
                    and not intro_auto_advance_state["intro"]["muted"]
                    and not intro_auto_advance_state["intro"]["loop"]
                    and intro_auto_advance_state["intro"]["detail"]["slideId"] == "__smoke_intro_slide__"
                    and intro_auto_advance_state["waiting"]["hitCount"] == 0
                    and intro_auto_advance_state["waiting"]["videoRole"] == "waiting_loop"
                    and intro_auto_advance_state["waiting"]["loop"]
                    and intro_auto_advance_state["introLoop"]["hitCount"] == 0
                    and intro_auto_advance_state["scheduledPast"]["hitCount"] == 1
                    and intro_auto_advance_state["scheduledPast"]["detail"]["slideId"] == "__smoke_waiting_loop_slide__"
                    and intro_auto_advance_state["scheduledFuture"]["hitCount"] == 0
                    and intro_auto_advance_state["scheduledFuture"]["timerArmed"]
                    and intro_auto_advance_state["catchUpMid"] == {
                        "offsetSeconds": 240,
                        "shouldAdvance": False,
                        "startHour": 10,
                        "startMinute": 40,
                    }
                    and intro_auto_advance_state["catchUpDone"]["shouldAdvance"]
                    and intro_auto_advance_state["catchUpDone"]["offsetSeconds"] == 600
                    and intro_auto_advance_state["catchUpFromEndAt"] == {
                        "offsetSeconds": 300,
                        "shouldAdvance": False,
                        "startHour": 10,
                        "startMinute": 40,
                    }
                    and intro_auto_advance_state["parsedClock"] == {
                        "year": 2026,
                        "month": 7,
                        "day": 12,
                        "hour": 10,
                        "minute": 40,
                    }
                    and intro_auto_advance_state["shouldAdvanceIntro"]
                    and not intro_auto_advance_state["shouldAdvanceWaiting"]
                    and not intro_auto_advance_state["shouldAdvanceIntroLoop"]
                    and intro_auto_advance_state["introDefaults"]["autoAdvanceOnEnd"]
                    and not intro_auto_advance_state["introDefaults"]["loop"]
                    and intro_auto_advance_state["readyDefaults"]["loop"]
                ):
                    pass_("presenter-intro-video-auto-advance", json.dumps(intro_auto_advance_state, ensure_ascii=False))
                else:
                    fail("presenter-intro-video-auto-advance", json.dumps(intro_auto_advance_state, ensure_ascii=False))

                fallback_state = page.evaluate(
                    """
                    (serviceId) => {
                      const slides = buildServicePresenterSlides(serviceId);
                      return {
                        centerFallbacks: slides.filter((slide) =>
                          slide.layout === 'center_text'
                          || slide.type === 'component'
                          || slide.elementType === 'plain_text'
                          || slide.elementType === 'freeform'
                        ).map((slide, index) => ({
                          index,
                          sectionLabel: slide.sectionLabel || '',
                          elementLabel: slide.elementLabel || '',
                          title: slide.title || ''
                        })),
                        ready: {
                          elementType: slides[0]?.elementType || '',
                          layout: slides[0]?.layout || '',
                          type: slides[0]?.type || ''
                        },
                        monthlyPrayerGroups: groupPresenterSlidesBySection(slides, serviceId)
                          .filter((group) => group.label === '월삭기도')
                          .map((group) => ({
                            title: group.title,
                            subgroups: group.subgroups.map((subgroup) => ({
                              label: subgroup.label,
                              title: subgroup.title,
                              slides: subgroup.slides.length
                            }))
                          })),
                        mainPraiseGroups: groupPresenterSlidesBySection(slides, serviceId)
                          .filter((group) => group.kind === 'main-praise')
                          .map((group) => ({
                            label: group.label,
                            meta: group.meta,
                            subgroups: group.subgroups.length
                          })),
                        praiseTeamBoardMeta: (() => {
                          const service = state.services.find((item) => item.id === serviceId);
                          if (!service) return [];
                          const previousTags = [...(service.tags || [])];
                          const previousLeader = service.leader || '';
                          service.tags = ['찬양팀: 헤세드 찬양단', ...previousTags.filter((tag) => !isServicePraiseTeamTag(tag))];
                          service.leader = '김남영 목사';
                          const teamSlides = buildServicePresenterSlides(serviceId);
                          const groups = groupPresenterSlidesBySection(teamSlides, serviceId)
                            .filter((group) => group.kind === 'main-praise')
                            .map((group) => group.meta);
                          service.tags = previousTags;
                          service.leader = previousLeader;
                          return groups;
                        })(),
                        praiseTeamNameAsLeaderMeta: (() => {
                          const service = state.services.find((item) => item.id === serviceId);
                          if (!service) return [];
                          const previousTags = [...(service.tags || [])];
                          const previousLeader = service.leader || '';
                          service.tags = previousTags.filter((tag) => !isServicePraiseTeamTag(tag));
                          service.leader = '헤세드 찬양단';
                          const teamSlides = buildServicePresenterSlides(serviceId);
                          const groups = groupPresenterSlidesBySection(teamSlides, serviceId)
                            .filter((group) => group.kind === 'main-praise')
                            .map((group) => group.meta);
                          service.tags = previousTags;
                          service.leader = previousLeader;
                          return groups;
                        })(),
                        praiseAutoAssigneeFallback: (() => ({
                          group: servicePraiseAssignee({ type_id: 'monthly', leader: '', tags: [] }, [{ label: '찬양' }]),
                          board: servicePraiseBoardMetaCandidate({ type_id: 'monthly', leader: '', tags: [] }, [{ label: '찬양' }]),
                          orderSheet: inferOrderSheetAssignee({ label: '결단찬양', raw_title: '결단찬양' }),
                        }))(),
                        mainPraiseElementTitleMeta: (() => {
                          const service = state.services.find((item) => item.id === serviceId) || { id: serviceId, type_id: 'monthly' };
                          const song = {
                            id: '__smoke_main_praise_meta_song__',
                            title: '가서 제자 삼으라',
                            subtitle: '갈릴리 마을 그 숲속에서',
                            original_title: 'Go Make Disciples',
                            versions: [{
                              id: '__smoke_main_praise_meta_version__',
                              name: 'Default',
                              is_primary: true,
                              forms: [
                                { id: 'meta-v1', part_type: 'Verse', part_number: 1, lyrics: '가서 제자 삼으라\\n세상 모든 사람들을', sort_order: 1 }
                              ]
                            }]
                          };
                          const previousSongs = state.songs;
                          state.songs = state.songs.filter((item) => item.id !== song.id).concat([song]);
                          const slides = buildPresenterSlidesForServiceItem({
                            id: '__smoke_main_praise_meta_item__',
                            label: '찬양',
                            raw_title: '가서 제자 삼으라',
                            song_id: song.id,
                            version_id: '__smoke_main_praise_meta_version__',
                          }, service, 0);
                          const group = groupPresenterSlidesBySection(slides, serviceId).find((item) => item.kind === 'main-praise');
                          const subgroup = group?.subgroups.find((item) => item.title.includes('가서 제자 삼으라')) || {};
                          const titleSlide = slides.find((slide) => slide.type === 'song-title') || {};
                          state.songs = previousSongs;
                          return {
                            groupTitle: group?.title || '',
                            subgroupTitle: subgroup.title || '',
                            outputTitle: titleSlide.title || '',
                            outputText: titleSlide.text || '',
                          };
                        })(),
                        praiseTeamIntro: (() => {
                          const service = state.services.find((item) => item.id === serviceId);
                          if (!service) return null;
                          const previousTags = [...(service.tags || [])];
                          service.tags = ['찬양팀: 글로리아 찬양단', ...previousTags.filter((tag) => !isServicePraiseTeamTag(tag))];
                          const teamSlides = buildServicePresenterSlides(serviceId);
                          service.tags = previousTags;
                          const intro = teamSlides.find((slide) => slide.type === 'praise-section-title') || {};
                          return {
                            type: intro.type || '',
                            elementType: intro.elementType || '',
                            layout: intro.layout || '',
                            title: intro.title || '',
                            subtitle: intro.subtitle || '',
                            text: intro.text || '',
                            skipTrailingBlank: intro.skipTrailingBlank === true,
                            visibleTags: serviceVisibleTags({ tags: ['찬양팀: 글로리아 찬양단', '온세대'] }),
                          };
                        })(),
                        specialPraiseLabelGuard: (() => {
                          const slides = [
                            {
                              id: '__smoke_special_title__',
                              sectionId: '__smoke_special_section__',
                              sectionKey: 'special_song',
                              sectionLabel: '특송',
                              sectionTitle: '특송',
                              elementType: 'title_assignee',
                              layout: 'lower_bar_text',
                              type: 'title-assignee',
                              title: '특송',
                              assignee: '청소년부 교사 일동',
                              text: '특송\\n청소년부 교사 일동',
                            },
                            {
                              id: '__smoke_special_song_title__',
                              sectionId: '__smoke_special_section__',
                              sectionLabel: '찬양',
                              sectionTitle: '특송',
                              elementLabel: '찬양',
                              elementType: 'praise',
                              layout: 'lower_bar_text',
                              type: 'song-title',
                              title: '청소년부 교사 일동',
                              text: '♪ 청소년부 교사 일동',
                            },
                          ];
                          const withIntro = withMainPraiseIntroSlides(slides, { id: serviceId });
                          return {
                            mainFlags: slides.map((slide) => isPresenterMainPraiseSlide(slide)),
                            praiseIntroCount: withIntro.filter((slide) => slide.type === 'praise-section-title').length,
                            types: withIntro.map((slide) => slide.type),
                          };
                        })(),
                        closingGroups: groupPresenterSlidesBySection(slides, serviceId)
                          .filter((group) => group.slides.some((entry) => entry.slide.sectionKey === 'closing_song'))
                          .map((group) => ({
                            kind: group.kind,
                            label: group.label,
                            title: group.title,
                            subgroups: group.subgroups.length
                          })),
                        trailingBlankPolicy: (() => {
                          const readySlides = withPresenterElementTrailingBlanks([
                            {
                              id: '__smoke_ready_media__',
                              elementId: '__smoke_ready_media__',
                              sectionId: '__smoke_ready__',
                              sectionKey: 'ready',
                              sectionRole: 'ready',
                              sectionLabel: '준비',
                              elementType: 'video',
                              layout: 'media',
                              type: 'ready',
                              title: '준비',
                              text: '',
                            },
                            {
                              id: '__smoke_after_ready__',
                              elementId: '__smoke_after_ready__',
                              sectionId: '__smoke_praise__',
                              sectionKey: 'praise',
                              sectionLabel: '찬양',
                              elementType: 'title_assignee',
                              layout: 'lower_bar_text',
                              type: 'title-assignee',
                              title: '찬양',
                              text: '찬양',
                            },
                          ]);
                          const closingSlides = withPresenterElementTrailingBlanks([
                            {
                              id: '__smoke_closing_visual__',
                              elementId: '__smoke_closing_visual__',
                              sectionId: '__smoke_closing__',
                              sectionKey: 'closing_visual',
                              sectionLabel: '마무리',
                              elementType: 'image',
                              layout: 'media',
                              type: 'image',
                              title: '마무리',
                              text: '마무리',
                            },
                            {
                              id: '__smoke_after_closing__',
                              elementId: '__smoke_after_closing__',
                              sectionId: '__smoke_after__',
                              sectionKey: 'after',
                              sectionLabel: '다음',
                              elementType: 'title_assignee',
                              layout: 'lower_bar_text',
                              type: 'title-assignee',
                              title: '다음',
                              text: '다음',
                            },
                          ]);
                          const normalSlides = withPresenterElementTrailingBlanks([
                            {
                              id: '__smoke_prayer__',
                              elementId: '__smoke_prayer__',
                              sectionId: '__smoke_prayer_section__',
                              sectionKey: 'prayer',
                              sectionLabel: '대표기도',
                              elementType: 'title_assignee',
                              layout: 'lower_bar_text',
                              type: 'title-assignee',
                              title: '기도',
                              text: '기도',
                            },
                            {
                              id: '__smoke_scripture__',
                              elementId: '__smoke_scripture__',
                              sectionId: '__smoke_scripture_section__',
                              sectionKey: 'scripture_reading',
                              sectionLabel: '성경봉독',
                              elementType: 'title_assignee',
                              layout: 'lower_bar_text',
                              type: 'title-assignee',
                              title: '성경봉독',
                              text: '성경봉독',
                            },
                          ]);
                          return {
                            readyHasBlankAfterReady: readySlides.some((slide) => slide.id === '__smoke_ready_media__:after-blank'),
                            closingHasBlankAfterClosing: closingSlides.some((slide) => slide.id === '__smoke_closing_visual__:after-blank'),
                            normalHasBlankAfterPrayer: normalSlides.some((slide) => slide.id === '__smoke_prayer__:after-blank'),
                          };
                        })()
                      };
                    }
                    """,
                    service["id"],
                )
                if (
                    not fallback_state["centerFallbacks"]
                    and fallback_state["ready"] == {"elementType": "video", "layout": "media", "type": "ready"}
                    and fallback_state["monthlyPrayerGroups"]
                    and all(group["title"] == "월삭기도" for group in fallback_state["monthlyPrayerGroups"])
                    and any(
                        any(
                            subgroup["label"] == "월삭기도"
                            and subgroup["title"]
                            and subgroup["title"] != "월삭기도"
                            for subgroup in group["subgroups"]
                        )
                        for group in fallback_state["monthlyPrayerGroups"]
                    )
                    and any(
                        any(subgroup["label"] == "찬양" and subgroup["slides"] > 0 for subgroup in group["subgroups"])
                        for group in fallback_state["monthlyPrayerGroups"]
                    )
                    and len(fallback_state["mainPraiseGroups"]) == 1
                    and fallback_state["mainPraiseGroups"][0]["label"] == "찬양"
                    and fallback_state["praiseTeamBoardMeta"] == ["헤세드 찬양단"]
                    and fallback_state["praiseTeamNameAsLeaderMeta"] == ["헤세드 찬양단"]
                    and fallback_state["praiseAutoAssigneeFallback"] == {
                        "group": "",
                        "board": {"text": "", "priority": 0},
                        "orderSheet": "",
                    }
                    and fallback_state["mainPraiseElementTitleMeta"] == {
                        "groupTitle": "찬양",
                        "subgroupTitle": "가서 제자 삼으라 (갈릴리 마을 그 숲속에서 · Go Make Disciples)",
                        "outputTitle": "가서 제자 삼으라",
                        "outputText": "♪ 가서 제자 삼으라",
                    }
                    and fallback_state["praiseTeamIntro"] == {
                        "type": "praise-section-title",
                        "elementType": "title_assignee",
                        "layout": "lower_bar_text",
                        "title": "찬양",
                        "subtitle": "글로리아 찬양단",
                        "text": "찬양\n글로리아 찬양단",
                        "skipTrailingBlank": True,
                        "visibleTags": ["온세대"],
                    }
                    and fallback_state["specialPraiseLabelGuard"] == {
                        "mainFlags": [False, False],
                        "praiseIntroCount": 0,
                        "types": ["title-assignee", "song-title"],
                    }
                    and len(fallback_state["closingGroups"]) == 1
                    and fallback_state["closingGroups"][0]["kind"] == "item"
                    and fallback_state["closingGroups"][0]["label"] == "찬양"
                    and fallback_state["trailingBlankPolicy"] == {
                        "readyHasBlankAfterReady": False,
                        "closingHasBlankAfterClosing": False,
                        "normalHasBlankAfterPrayer": True,
                    }
                ):
                    pass_("presenter-section-element-model", json.dumps(fallback_state, ensure_ascii=False))
                else:
                    fail("presenter-section-element-model", json.dumps(fallback_state, ensure_ascii=False))

                title_assignee_state = page.evaluate(
                    """
                    () => {
                      const service = { id: '__smoke_title_service__', type_id: 'monthly', date: '2026-07-04' };
                      const items = [
                        {
                          id: '__smoke_prayer_title__',
                          label: '대표기도',
                          raw_title: '박귀서 장로',
                          memo: serializeServiceItemMemo({ elementType: 'title_person' }),
                        },
                        {
                          id: '__smoke_scripture_title__',
                          label: '성경봉독',
                          raw_title: '대하 15:8-15',
                          memo: serializeServiceItemMemo({ elementType: 'scripture_reading' }),
                        },
                        {
                          id: '__smoke_sermon_title__',
                          label: '설교',
                          raw_title: '정함',
                          assignee: '김남영 목사',
                          memo: serializeServiceItemMemo({ elementType: 'title_person' }),
                        },
                      ];
                      return items.map((item, index) => {
                        const slide = buildPresenterSlidesForServiceItem(item, service, index)[0] || {};
                        return {
                          elementType: slide.elementType || '',
                          layout: slide.layout || '',
                          type: slide.type || '',
                          renderClass: presenterSlideRenderClass(slide),
                          title: slide.title || '',
                          assignee: slide.assignee || '',
                          text: slide.text || '',
                          html: renderPresenterSlideFrame(slide),
                        };
                      });
                    }
                    """
                )
                if (
                    title_assignee_state == [
                        {
                            "elementType": "title_assignee",
                            "layout": "lower_bar_text",
                            "type": "title-assignee",
                            "renderClass": "title-assignee",
                            "title": "기도",
                            "assignee": "박귀서 장로",
                            "text": "기도\n박귀서 장로",
                            "html": title_assignee_state[0]["html"],
                        },
                        {
                            "elementType": "title_assignee",
                            "layout": "lower_bar_text",
                            "type": "title-assignee",
                            "renderClass": "title-assignee",
                            "title": "성경봉독",
                            "assignee": "대하 15:8–15",
                            "text": "성경봉독\n대하 15:8–15",
                            "html": title_assignee_state[1]["html"],
                        },
                        {
                            "elementType": "title_assignee",
                            "layout": "lower_bar_text",
                            "type": "title-assignee",
                            "renderClass": "title-assignee",
                            "title": "정함",
                            "assignee": "김남영 목사",
                            "text": "정함\n김남영 목사",
                            "html": title_assignee_state[2]["html"],
                        },
                    ]
                    and all("presenter-title-assignee" in item["html"] for item in title_assignee_state)
                ):
                    pass_("presenter-title-assignee-slides", json.dumps(title_assignee_state, ensure_ascii=False))
                else:
                    fail("presenter-title-assignee-slides", json.dumps(title_assignee_state, ensure_ascii=False))

                db_title_assignee_state = page.evaluate(
                    """
                    () => {
                      const slide = normalizeWorshipPresenterSlide({
                        service_id: '__smoke_db_service__',
                        section_id: '__smoke_db_section__',
                        section_order: 4,
                        section_key: 'prayer',
                        section_title: '대표기도',
                        section_person: '',
                        element_id: '__smoke_db_element__',
                        element_order: 1,
                        element_type: 'title_person',
                        element_title: '기도',
                        element_person: '박귀서 장로',
                        slide_id: '__smoke_db_slide__',
                        slide_order: 1,
                        slide_type: 'title_person',
                        slide_title: '기도',
                        slide_body: ''
                      }, 0);
                      return {
                        elementType: slide.elementType || '',
                        layout: slide.layout || '',
                        type: slide.type || '',
                        renderClass: presenterSlideRenderClass(slide),
                        title: slide.title || '',
                        assignee: slide.assignee || '',
                        text: slide.text || '',
                        html: renderPresenterSlideFrame(slide),
                      };
                    }
                    """
                )
                if (
                    db_title_assignee_state["elementType"] == "title_assignee"
                    and db_title_assignee_state["layout"] == "lower_bar_text"
                    and db_title_assignee_state["type"] == "title-assignee"
                    and db_title_assignee_state["renderClass"] == "title-assignee"
                    and db_title_assignee_state["title"] == "기도"
                    and db_title_assignee_state["assignee"] == "박귀서 장로"
                    and db_title_assignee_state["text"] == "기도\n박귀서 장로"
                    and "presenter-title-assignee" in db_title_assignee_state["html"]
                ):
                    pass_("presenter-db-title-assignee-slide", json.dumps(db_title_assignee_state, ensure_ascii=False))
                else:
                    fail("presenter-db-title-assignee-slide", json.dumps(db_title_assignee_state, ensure_ascii=False))

                title_content_state = page.evaluate(
                    """
                    () => {
                      const dbSlide = normalizeWorshipPresenterSlide({
                        service_id: '__smoke_title_content_service__',
                        section_id: '__smoke_title_content_section__',
                        section_order: 5,
                        section_key: 'notice',
                        section_title: '교회소식',
                        section_person: '',
                        element_id: '__smoke_title_content_element__',
                        element_order: 1,
                        element_type: 'body',
                        element_title: '교회소식',
                        element_person: '',
                        slide_id: '__smoke_title_content_slide__',
                        slide_order: 1,
                        slide_type: 'body',
                        slide_title: '교회소식',
                        slide_body: '다음 주 공동의회가 있습니다\\n예배 후 본당에 남아 주세요'
                      }, 0);
                      const fallbackSlides = buildPresenterSlidesForServiceItem({
                        id: '__smoke_plain_text_body__',
                        label: '교회소식',
                        raw_title: '교회소식',
                        memo: serializeServiceItemMemo({
                          elementType: 'body',
                          slides: ['다음 주 공동의회가 있습니다\\n예배 후 본당에 남아 주세요']
                        }),
                      }, { id: '__smoke_title_content_fallback_service__', type_id: 'monthly', date: '2026-07-04' }, 0);
                      const fallbackSlide = fallbackSlides[0] || {};
                      return {
                        db: {
                          elementType: dbSlide.elementType || '',
                          layout: dbSlide.layout || '',
                          type: dbSlide.type || '',
                          renderClass: presenterSlideRenderClass(dbSlide),
                          title: dbSlide.title || '',
                          assignee: dbSlide.assignee || '',
                          text: dbSlide.text || '',
                          body: renderPresenterSlideBody(dbSlide).trim(),
                          html: renderPresenterSlideFrame(dbSlide),
                        },
                        fallback: {
                          elementType: fallbackSlide.elementType || '',
                          layout: fallbackSlide.layout || '',
                          type: fallbackSlide.type || '',
                          renderClass: presenterSlideRenderClass(fallbackSlide),
                          title: fallbackSlide.title || '',
                          assignee: fallbackSlide.assignee || '',
                          text: fallbackSlide.text || '',
                          body: renderPresenterSlideBody(fallbackSlide).trim(),
                          html: renderPresenterSlideFrame(fallbackSlide),
                        }
                      };
                    }
                    """
                )
                if (
                    title_content_state["db"]["elementType"] == "body_text"
                    and title_content_state["db"]["layout"] == "center_text"
                    and title_content_state["db"]["type"] == "title-content"
                    and title_content_state["db"]["renderClass"] == "title-content"
                    and title_content_state["db"]["title"] == "교회소식"
                    and title_content_state["db"]["assignee"] == ""
                    and "presenter-title-content" in title_content_state["db"]["html"]
                    and "presenter-title-assignee" not in title_content_state["db"]["html"]
                    and "다음 주 공동의회가 있습니다" in title_content_state["db"]["body"]
                    and title_content_state["fallback"]["elementType"] == "freeform"
                    and title_content_state["fallback"]["layout"] == "center_text"
                    and title_content_state["fallback"]["renderClass"] == "title-content"
                    and title_content_state["fallback"]["title"] == "교회소식"
                    and title_content_state["fallback"]["assignee"] == ""
                    and "presenter-title-content" in title_content_state["fallback"]["html"]
                    and "presenter-title-assignee" not in title_content_state["fallback"]["html"]
                ):
                    pass_("presenter-title-content-slides", json.dumps(title_content_state, ensure_ascii=False))
                else:
                    fail("presenter-title-content-slides", json.dumps(title_content_state, ensure_ascii=False))

                title_and_liturgical_state = page.evaluate(
                    """
                    () => {
                      const confessionSlide = buildPresenterSlidesForServiceItem({
                        id: '__smoke_confession_title__',
                        label: '참회기도',
                        raw_title: '',
                        memo: serializeServiceItemMemo({ elementType: 'title' }),
                        _worshipSectionKey: 'confession',
                        _worshipOrderSheetPlaceholder: true,
                      }, { id: '__smoke_chromakey_service__', type_id: 'sunday-main', date: '2026-07-05' }, 0)[0] || {};
                      const creedItem = {
                        id: '__smoke_creed_body__',
                        label: '사도신경',
                        raw_title: '사도신경',
                        memo: serializeServiceItemMemo({
                          elementType: 'body',
                          slides: ['전능하사 천지를 만드신 하나님 아버지를 내가 믿사오며\\n그 외아들 우리 주 예수 그리스도를 믿사오니\\n이는 성령으로 잉태하사 동정녀 마리아에게 나시고\\n본디오 빌라도에게 고난을 받으사 십자가에 못 박혀 죽으시고\\n장사한 지 사흘 만에 죽은 자 가운데서 다시 살아나시며']
                        }),
                        _worshipSectionKey: 'creed',
                      };
                      const chromakeySlides = buildPresenterSlidesForServiceItem(
                        creedItem,
                        { id: '__smoke_creed_chromakey_service__', type_id: 'sunday-main', date: '2026-07-05' },
                        1
                      );
                      const fullscreenSlides = buildPresenterSlidesForServiceItem(
                        creedItem,
                        { id: '__smoke_creed_fullscreen_service__', type_id: 'friday', date: '2026-07-03' },
                        1
                      );
                      return {
                        confession: {
                          elementType: confessionSlide.elementType || '',
                          layout: confessionSlide.layout || '',
                          type: confessionSlide.type || '',
                          renderClass: presenterSlideRenderClass(confessionSlide),
                          title: confessionSlide.title || '',
                          text: confessionSlide.text || '',
                          html: renderPresenterSlideFrame(confessionSlide),
                        },
                        chromakey: chromakeySlides.map((slide) => ({
                          elementType: slide.elementType || '',
                          layout: slide.layout || '',
                          type: slide.type || '',
                          renderClass: presenterSlideRenderClass(slide),
                          title: slide.title || '',
                          marker: slide.marker || '',
                          text: slide.text || '',
                        })),
                        fullscreen: fullscreenSlides.map((slide) => ({
                          elementType: slide.elementType || '',
                          layout: slide.layout || '',
                          type: slide.type || '',
                          renderClass: presenterSlideRenderClass(slide),
                          title: slide.title || '',
                          text: slide.text || '',
                          html: renderPresenterSlideFrame(slide),
                        })),
                      };
                    }
                    """
                )
                if (
                    title_and_liturgical_state["confession"]["elementType"] == "title_assignee"
                    and title_and_liturgical_state["confession"]["layout"] == "lower_bar_text"
                    and title_and_liturgical_state["confession"]["type"] == "title-assignee"
                    and title_and_liturgical_state["confession"]["renderClass"] == "title-assignee"
                    and title_and_liturgical_state["confession"]["title"] == "참회기도"
                    and "presenter-title-assignee" in title_and_liturgical_state["confession"]["html"]
                    and 'presenter-slide--title"' not in title_and_liturgical_state["confession"]["html"]
                    and len(title_and_liturgical_state["chromakey"]) >= 2
                    and all(slide["elementType"] == "body_text" for slide in title_and_liturgical_state["chromakey"])
                    and all(slide["layout"] == "lower_bar_text" for slide in title_and_liturgical_state["chromakey"])
                    and all(slide["type"] == "lyrics" for slide in title_and_liturgical_state["chromakey"])
                    and all(slide["renderClass"] == "lyrics" for slide in title_and_liturgical_state["chromakey"])
                    and title_and_liturgical_state["chromakey"][0]["marker"] == "사도신경"
                    and len(title_and_liturgical_state["fullscreen"]) == 1
                    and title_and_liturgical_state["fullscreen"][0]["elementType"] == "body_text"
                    and title_and_liturgical_state["fullscreen"][0]["layout"] == "center_text"
                    and title_and_liturgical_state["fullscreen"][0]["type"] == "liturgical-body"
                    and title_and_liturgical_state["fullscreen"][0]["renderClass"] == "liturgical-body"
                    and "presenter-slide--liturgical-body" in title_and_liturgical_state["fullscreen"][0]["html"]
                    and "본디오 빌라도" in title_and_liturgical_state["fullscreen"][0]["text"]
                ):
                    pass_("presenter-title-and-liturgical-body-contract", json.dumps(title_and_liturgical_state, ensure_ascii=False))
                else:
                    fail("presenter-title-and-liturgical-body-contract", json.dumps(title_and_liturgical_state, ensure_ascii=False))

                form_preset_state = page.evaluate(
                    """
                    () => {
                      const hymnSong = {
                        id: '__smoke_hymn_song__',
                        title: '특송 테스트',
                        hymn_no: '999',
                        versions: [{
                          id: '__smoke_hymn_version__',
                          name: 'Default',
                          is_primary: true,
                          forms: [
                            { id: 'h-v1', part_type: 'Verse', part_number: 1, lyrics: '1절 첫 줄\\n1절 둘째 줄', sort_order: 1 },
                            { id: 'h-c', part_type: 'Chorus', part_number: null, lyrics: '후렴 첫 줄\\n후렴 둘째 줄', sort_order: 2 },
                            { id: 'h-v2', part_type: 'Verse', part_number: 2, lyrics: '2절 첫 줄\\n2절 둘째 줄', sort_order: 3 },
                            { id: 'h-v3', part_type: 'Verse', part_number: 3, lyrics: '3절 첫 줄\\n3절 둘째 줄', sort_order: 4 },
                            { id: 'h-v4', part_type: 'Verse', part_number: 4, lyrics: '마지막 절 첫 줄\\n마지막 절 둘째 줄', sort_order: 5 },
                            { id: 'h-amen', part_type: 'Lyrics', part_number: null, label: 'Amen', lyrics: '아멘', sort_order: 6 }
                          ]
                        }]
                      };
                      const ccmSong = {
                        id: '__smoke_ccm_song__',
                        title: '반복 테스트',
                        versions: [{
                          id: '__smoke_ccm_version__',
                          name: 'Default',
                          is_primary: true,
                          forms: [
                            { id: 'c-v1', part_type: 'Verse', part_number: 1, lyrics: 'V1 첫 줄\\nV1 둘째 줄', sort_order: 1 },
                            { id: 'c-c', part_type: 'Chorus', part_number: null, lyrics: 'C 첫 줄\\nC 둘째 줄', sort_order: 2 },
                            { id: 'c-v2', part_type: 'Verse', part_number: 2, lyrics: 'V2 첫 줄\\nV2 둘째 줄', sort_order: 3 }
                          ]
                        }]
                      };
                      const defaultFormSong = {
                        id: '__smoke_default_form_song__',
                        title: '감사',
                        metadata: {
                          presenter_form: { forms: ['V1', 'V2', 'C', 'V3', 'C', 'Coda'], hint: 'V1-V2-C-V3-C-Coda', strength: 'song-default' }
                        },
                        versions: [{
                          id: '__smoke_default_form_version__',
                          name: 'Default',
                          is_primary: true,
                          forms: [
                            {
                              id: 'df-lyrics',
                              part_type: 'Lyrics',
                              part_number: null,
                              lyrics: '감사 1절 첫 줄\\n감사 1절 둘째 줄\\n\\n감사 2절 첫 줄\\n감사 2절 둘째 줄\\n\\n감사 후렴 첫 줄\\n감사 후렴 둘째 줄\\n\\n감사 3절 첫 줄\\n감사 3절 둘째 줄\\n\\n감사 코다 첫 줄\\n감사 코다 둘째 줄',
                              sort_order: 1
                            }
                          ]
                        }]
                      };
                      const fallbackSong = {
                        id: '__smoke_presenter_fallback_song__',
                        title: '하나님은 너를 지키시는 자 스모크',
                        versions: [
                          {
                            id: '__smoke_presenter_empty_version__',
                            name: '빈 버전',
                            is_primary: true,
                            forms: []
                          },
                          {
                            id: '__smoke_presenter_lyrics_version__',
                            name: '가사 버전',
                            forms: [
                              { id: 'fb-lyrics', part_type: 'Lyrics', part_number: null, lyrics: '하나님은 너를 지키시는 자\\n너의 우편에 그늘 되시니', sort_order: 1 }
                            ]
                          }
                        ]
                      };
                      const hymnScoreSong = {
                        ...hymnSong,
                        id: '__smoke_hymn_score_song__',
                        title: '이 천지간 만물들아',
                        hymn_no: '5',
                      };
                      const offeringSong = {
                        ...hymnSong,
                        id: '__smoke_offering_song__',
                        title: '하나님의 크신 사랑',
                      };
                      state.hymnScoreManifest = {
                        '5': {
                          title: '이 천지간 만물들아',
                          slides: [
                            { src: 'assets/hymn-scores/5/slide-01.webp', sourceSlide: 1 },
                            { src: 'assets/hymn-scores/5/slide-02.webp', sourceSlide: 2 },
                          ],
                        },
                      };
                      state.songs = state.songs.filter((song) => !String(song.id || '').startsWith('__smoke_')).concat([hymnSong, hymnScoreSong, offeringSong, ccmSong, defaultFormSong, fallbackSong]);
                      const service = { id: '__smoke_form_service__', type_id: 'sunday-main', date: '2026-07-04' };
                      const hymnItem = {
                        id: '__smoke_hymn_item__',
                        label: '특송',
                        raw_title: '특송 테스트',
                        song_id: hymnSong.id,
                        version_id: '__smoke_hymn_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          formPresetRules: [{
                            when: { songType: 'hymn' },
                            formPreset: {
                              forms: ['1절', '2절', '간주', '마지막 절'],
                              hint: '1절-2절-간주-마지막 절',
                              strength: 'default'
                            }
                          }]
                        })
                      };
                      const ccmItem = {
                        id: '__smoke_ccm_item__',
                        label: '찬양',
                        raw_title: '반복 테스트',
                        song_id: ccmSong.id,
                        version_id: '__smoke_ccm_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          formPreset: { forms: ['V1', 'C', 'C'], hint: 'V1-C-C', strength: 'default' }
                        })
                      };
                      const missingItem = {
                        id: '__smoke_missing_item__',
                        label: '찬양',
                        raw_title: '반복 테스트',
                        song_id: ccmSong.id,
                        version_id: '__smoke_ccm_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          formPreset: { forms: ['V1', 'C', 'B'], hint: 'V1-C-B', strength: 'manual' }
                        })
                      };
                      const defaultFormItem = {
                        id: '__smoke_default_form_item__',
                        label: '찬양',
                        raw_title: '감사',
                        song_id: defaultFormSong.id,
                        version_id: '__smoke_default_form_version__',
                        memo: serializeServiceItemMemo({ elementType: 'praise' })
                      };
                      const fallbackVersionItem = {
                        id: '__smoke_presenter_fallback_version_item__',
                        label: '결단',
                        raw_title: '하나님은 너를 지키시는 자 스모크',
                        song_id: fallbackSong.id,
                        version_id: '__smoke_presenter_empty_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          formPreset: { forms: ['Lyrics'], hint: 'Lyrics', strength: 'manual' }
                        })
                      };
                      const fallbackTitleItem = {
                        id: '__smoke_presenter_fallback_title_item__',
                        label: '결단',
                        raw_title: '하나님은 너를 지키시는 자 스모크',
                        song_id: '',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          formPreset: { forms: ['Lyrics'], hint: 'Lyrics', strength: 'manual' }
                        })
                      };
                      const hymnAutoItem = {
                        id: '__smoke_hymn_auto_item__',
                        label: '찬양',
                        raw_title: '특송 테스트',
                        song_id: hymnSong.id,
                        version_id: '__smoke_hymn_version__',
                        memo: serializeServiceItemMemo({ elementType: 'praise' })
                      };
                      const scoreItem = {
                        id: '__smoke_score_item__',
                        label: '찬송',
                        raw_title: '특송 테스트',
                        song_id: hymnSong.id,
                        version_id: '__smoke_hymn_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const scoreImageItem = {
                        id: '__smoke_score_image_item__',
                        label: '찬송',
                        raw_title: '악보 이미지 테스트',
                        song_id: hymnSong.id,
                        version_id: '__smoke_hymn_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score',
                          asset: {
                            kind: 'score',
                            name: '찬양 PPT',
                            slides: [
                              { url: 'assets/worship-backgrounds/26-A1.png', name: '1', scoreFormLabel: 'Verse 1' },
                              { url: 'assets/worship-backgrounds/26-A2.png', name: '2', scoreFormLabel: 'Chorus' },
                            ]
                          }
                        })
                      };
                      const scoreManifestItem = {
                        id: '__smoke_score_manifest_item__',
                        label: '찬송',
                        raw_title: '5 이 천지간 만물들아',
                        song_id: hymnScoreSong.id,
                        version_id: '__smoke_hymn_version__',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const scoreRawTitleItem = {
                        id: '__smoke_score_raw_title_item__',
                        label: '찬송',
                        raw_title: '5 이 천지간 만물들아',
                        song_id: '',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const offeringScoreItem = {
                        id: '__smoke_offering_score_item__',
                        label: '봉헌찬송',
                        raw_title: '하나님의 크신 사랑',
                        song_id: offeringSong.id,
                        version_id: '__smoke_hymn_version__',
                        _worshipSectionId: '__smoke_offering_section__',
                        _worshipSectionKey: 'offering',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const specialScoreItem = {
                        id: '__smoke_special_score_item__',
                        label: '특송',
                        raw_title: '특송 테스트',
                        song_id: '',
                        _worshipSectionId: '__smoke_special_section__',
                        _worshipSectionKey: 'special_song',
                        assignee: '할렐루야 찬양대',
                        _worshipSectionTitle: '특송',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const doxologyScoreItem = {
                        id: '__smoke_doxology_score_item__',
                        label: '송영',
                        raw_title: '5 이 천지간 만물들아',
                        song_id: hymnScoreSong.id,
                        version_id: '__smoke_hymn_version__',
                        _worshipSectionId: '__smoke_doxology_section__',
                        _worshipSectionKey: 'doxology',
                        memo: serializeServiceItemMemo({
                          elementType: 'praise',
                          outputMode: 'score'
                        })
                      };
                      const audioMemo = serializeServiceItemMemo({
                        elementType: 'audio',
                        asset: { kind: 'audio', name: '성가대 MR', url: 'assets/audio/choir.m4a' }
                      });
                      const audioItem = {
                        id: '__smoke_audio_item__',
                        label: '특송 음원',
                        raw_title: '성가대 MR',
                        song_id: '',
                        memo: audioMemo
                      };
                      const hymnAllSlides = buildPresenterSlidesForServiceItem(hymnItem, service, 0);
                      const hymnSlides = hymnAllSlides.filter((slide) => slide.type === 'lyrics');
                      const hymnBlankSlides = hymnAllSlides.filter((slide) => slide.type === 'blank');
                      const ccmSlides = buildPresenterSlidesForServiceItem(ccmItem, service, 1).filter((slide) => slide.type === 'lyrics');
                      const missingSlides = buildPresenterSlidesForServiceItem(missingItem, service, 2);
                      const defaultFormSlides = buildPresenterSlidesForServiceItem(defaultFormItem, service, 2.2).filter((slide) => slide.type === 'lyrics');
                      const fallbackVersionSlides = buildPresenterSlidesForServiceItem(fallbackVersionItem, service, 2.25);
                      const fallbackTitleSlides = buildPresenterSlidesForServiceItem(fallbackTitleItem, service, 2.3);
                      const hymnAutoSlides = buildPresenterSlidesForServiceItem(hymnAutoItem, service, 2.4).filter((slide) => slide.type === 'lyrics');
                      const scoreAllSlides = buildPresenterSlidesForServiceItem(scoreItem, service, 3);
                      const scoreSlides = scoreAllSlides.filter((slide) => slide.sourceType === 'score');
                      const scoreImageAllSlides = buildPresenterSlidesForServiceItem(scoreImageItem, service, 4);
                      const scoreImageSlides = scoreImageAllSlides.filter((slide) => slide.sourceType === 'score');
                      const longScoreSlides = Array.from({ length: 12 }, (_, slideIndex) => ({
                        id: `__smoke_long_score__:${slideIndex}`,
                        sectionId: '__smoke_long_score_section__',
                        elementId: '__smoke_long_score_element__',
                        type: 'image',
                        elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
                        layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
                        sourceType: 'score',
                        componentType: 'score',
                        scoreBackground: true,
                        imageSrc: `assets/hymn-scores/999/slide-${String(slideIndex + 1).padStart(2, '0')}.webp`,
                      }));
                      const longScoreWarmupSourcesStart = presenterOutputWarmupSourcesForPayload({
                        serviceId: '__smoke_long_score_service__',
                        slides: longScoreSlides,
                        index: 0,
                        chromakey: false
                      }, longScoreSlides[0]);
                      const longScoreWarmupSourcesMiddle = presenterOutputWarmupSourcesForPayload({
                        serviceId: '__smoke_long_score_service__',
                        slides: longScoreSlides,
                        index: 6,
                        chromakey: false
                      }, longScoreSlides[6]);
                      const longScoreWarmupKeys = [
                        presenterOutputWarmupKey({ serviceId: '__smoke_long_score_service__' }, longScoreWarmupSourcesStart),
                        presenterOutputWarmupKey({ serviceId: '__smoke_long_score_service__' }, longScoreWarmupSourcesMiddle),
                      ];
                      const scoreManifestAllSlides = buildPresenterSlidesForServiceItem(scoreManifestItem, service, 5);
                      const scoreManifestSlides = scoreManifestAllSlides.filter((slide) => slide.sourceType === 'score');
                      const scoreRawTitleAllSlides = buildPresenterSlidesForServiceItem(scoreRawTitleItem, service, 6);
                      const scoreRawTitleSlides = scoreRawTitleAllSlides.filter((slide) => slide.sourceType === 'score');
                      const offeringScoreSlides = buildPresenterSlidesForServiceItem(offeringScoreItem, service, 7);
                      const specialScoreSlides = buildPresenterSlidesForServiceItem(specialScoreItem, service, 8);
                      const doxologyScoreSlides = buildPresenterSlidesForServiceItem(doxologyScoreItem, service, 9);
                      const sectionSongTitleSlides = {
                        offering: offeringScoreSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          type: slide.type,
                          title: slide.title,
                          text: slide.text,
                          sectionHeading: slide.sectionHeading || '',
                          sectionKey: slide.sectionKey,
                          layout: slide.layout,
                          body: renderPresenterSlideBody(slide).trim(),
                        })),
                        special: specialScoreSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          type: slide.type,
                          title: slide.title,
                          text: slide.text,
                          sectionHeading: slide.sectionHeading || '',
                          sectionKey: slide.sectionKey,
                          layout: slide.layout,
                          body: renderPresenterSlideBody(slide).trim(),
                        })),
                        doxology: doxologyScoreSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          type: slide.type,
                          title: slide.title,
                          text: slide.text,
                          sectionHeading: slide.sectionHeading || '',
                          sectionKey: slide.sectionKey,
                          layout: slide.layout,
                          body: renderPresenterSlideBody(slide).trim(),
                        })),
                      };
                      const specialSectionTitleSlides = specialScoreSlides.filter((slide) => slide.type === 'title-assignee').map((slide) => ({
                        type: slide.type,
                        elementType: slide.elementType || '',
                        layout: slide.layout || '',
                        title: slide.title || '',
                        assignee: slide.assignee || '',
                        text: slide.text || '',
                        sectionKey: slide.sectionKey || '',
                        body: renderPresenterSlideBody(slide).trim(),
                      }));
                      const audioSlides = buildPresenterSlidesForServiceItem(audioItem, service, 9);
                      const warningHtml = renderPresenterBoardSubgroup({
                        id: '__smoke_warning_group__',
                        label: '찬양',
                        title: '반복 테스트',
                        name: '찬양 / 반복 테스트',
                        slides: missingSlides.map((slide, slideIndex) => ({ slide, slideIndex }))
                      }, 0, service.id, { showHead: true });
                      const warningNode = document.createElement('div');
                      warningNode.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;';
                      warningNode.innerHTML = warningHtml;
                      document.body.appendChild(warningNode);
                      const warningHead = warningNode.querySelector('.svc-board-subgroup-head');
                      const warningTitle = warningNode.querySelector('.svc-board-subgroup-head strong');
                      const warningChip = warningNode.querySelector('.svc-presenter-warning');
                      const warningHeadRect = warningHead?.getBoundingClientRect();
                      const warningTitleRect = warningTitle?.getBoundingClientRect();
                      const warningChipRect = warningChip?.getBoundingClientRect();
                      const warningLayout = {
                        headDisplay: warningHead ? getComputedStyle(warningHead).display : '',
                        headWidth: warningHeadRect?.width || 0,
                        chipGap: warningChipRect && warningTitleRect ? Math.round(warningChipRect.left - warningTitleRect.right) : null,
                      };
                      warningNode.remove();
                      const scoreBadgeHtml = renderPresenterBoardSubgroup({
                        id: '__smoke_score_badge_group__',
                        label: '찬송',
                        title: '악보 이미지 테스트',
                        name: '찬송 / 악보 이미지 테스트',
                        slides: scoreImageSlides.map((slide, slideIndex) => ({ slide, slideIndex }))
                      }, 0, service.id, { showHead: true });
                      const scoreBadgeNode = document.createElement('div');
                      scoreBadgeNode.innerHTML = scoreBadgeHtml;
                      const scoreSafeArea = (() => {
                        const host = document.createElement('div');
                        host.className = 'svc-slide-mini-output no-chromakey';
                        host.style.cssText = 'position:fixed;left:-2000px;top:0;width:1152px;height:648px;';
                        host.innerHTML = `<span class="svc-slide-mini-canvas" style="width:1152px;height:648px;transform:none">${renderPresenterSlideFrame(scoreManifestSlides[0], { preview: true })}</span>`;
                        document.body.appendChild(host);
                        const slideEl = host.querySelector('.presenter-slide');
                        const imageEl = host.querySelector('.presenter-image');
                        const slideRect = slideEl?.getBoundingClientRect();
                        const imageRect = imageEl?.getBoundingClientRect();
                        const metrics = slideRect && imageRect ? {
                          className: slideEl.className,
                          slideBackground: getComputedStyle(slideEl).backgroundColor,
                          imageBackground: getComputedStyle(imageEl).backgroundImage,
                          imageBackgroundColor: getComputedStyle(imageEl).backgroundColor,
                          top: Math.round(imageRect.top - slideRect.top),
                          right: Math.round(slideRect.right - imageRect.right),
                          bottom: Math.round(slideRect.bottom - imageRect.bottom),
                          left: Math.round(imageRect.left - slideRect.left),
                        } : null;
                        host.remove();
                        return metrics;
                      })();
                      return {
                        hymnTypes: hymnAllSlides.map((slide) => slide.type),
                        hymnMarkers: hymnSlides.map((slide) => slide.marker),
                        hymnTexts: hymnSlides.map((slide) => slide.text),
                        hymnWarnings: [...new Set(hymnAllSlides.flatMap((slide) => slide.warnings || []))],
                        hymnBlankCount: hymnBlankSlides.length,
                        hymnBlankText: hymnBlankSlides.map((slide) => slide.text).join(''),
                        hymnBlankLayout: hymnBlankSlides[0]?.layout || '',
                        ccmMarkers: ccmSlides.map((slide) => slide.marker),
                        ccmTexts: ccmSlides.map((slide) => slide.text),
                        ccmFormKeys: ccmSlides.map((slide) => slide.formKey),
                        defaultFormMetadataSummary: serviceFormPresetSummary(normalizeSongMetadata(defaultFormSong.metadata).presenter_form),
                        defaultFormMarkers: defaultFormSlides.map((slide) => slide.marker),
                        defaultFormTexts: defaultFormSlides.map((slide) => slide.text),
                        fallbackVersionTexts: fallbackVersionSlides.filter((slide) => slide.type === 'lyrics').map((slide) => slide.text),
                        fallbackVersionWarnings: [...new Set(fallbackVersionSlides.flatMap((slide) => slide.warnings || []))],
                        fallbackTitleTexts: fallbackTitleSlides.filter((slide) => slide.type === 'lyrics').map((slide) => slide.text),
                        fallbackTitleWarnings: [...new Set(fallbackTitleSlides.flatMap((slide) => slide.warnings || []))],
                        hymnAutoMarkers: hymnAutoSlides.map((slide) => slide.marker),
                        hymnAutoTexts: hymnAutoSlides.map((slide) => slide.text),
                        scoreTitleSlides: scoreAllSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          type: slide.type,
                          title: slide.title,
                          text: slide.text
                        })),
                        scoreImageTitleSlides: scoreImageAllSlides.filter((slide) => slide.type === 'song-title').map((slide) => slide.title),
                        scoreManifestTitleSlides: scoreManifestAllSlides.filter((slide) => slide.type === 'song-title').map((slide) => slide.title),
                        scoreRawTitleTitleSlides: scoreRawTitleAllSlides.filter((slide) => slide.type === 'song-title').map((slide) => slide.title),
                        offeringScoreTitleSlides: offeringScoreSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          title: slide.title,
                          sectionTitle: slide.sectionTitle,
                          label: slide.label
                        })),
                        specialScoreTitleSlides: specialScoreSlides.filter((slide) => slide.type === 'song-title').map((slide) => ({
                          title: slide.title,
                          sectionTitle: slide.sectionTitle,
                          label: slide.label
                        })),
                        specialSectionTitleSlides,
                        sectionSongTitleSlides,
                        scoreSlides: scoreSlides.map((slide) => ({
                          type: slide.type,
                          layout: slide.layout,
                          elementType: slide.elementType,
                          sourceType: slide.sourceType,
                          componentType: slide.componentType,
                          marker: slide.marker,
                          title: slide.title
                        })),
                        scoreImageSlides: scoreImageSlides.map((slide) => ({
                          type: slide.type,
                          layout: slide.layout,
                          elementType: slide.elementType,
                          sourceType: slide.sourceType,
                          componentType: slide.componentType,
                          marker: slide.marker,
                          imageSrc: slide.imageSrc
                        })),
                        scoreManifestSlides: scoreManifestSlides.map((slide) => ({
                          type: slide.type,
                          layout: slide.layout,
                          elementType: slide.elementType,
                          sourceType: slide.sourceType,
                          componentType: slide.componentType,
                          marker: slide.marker,
                          imageSrc: slide.imageSrc
                        })),
                        scoreRawTitleSlides: scoreRawTitleSlides.map((slide) => ({
                          type: slide.type,
                          layout: slide.layout,
                          elementType: slide.elementType,
                          sourceType: slide.sourceType,
                          componentType: slide.componentType,
                          marker: slide.marker,
                          imageSrc: slide.imageSrc
                        })),
                        scorePreloadSources: presenterOutputImageSourcesForPreload({
                          slides: scoreImageSlides,
                          index: 0,
                          chromakey: false
                        }, scoreImageSlides[0]),
                        longScorePreloadSources: presenterOutputImageSourcesForPreload({
                          slides: longScoreSlides,
                          index: 0,
                          chromakey: false
                        }, longScoreSlides[0]),
                        longScoreWarmupSourcesStart,
                        longScoreWarmupSourcesMiddle,
                        longScoreWarmupKeys,
                        scoreSafeArea,
                        audioMemo: parseServiceItemMemo(audioMemo),
                        audioDbType: worshipDbElementTypeForSave('audio'),
                        audioConfig: serviceElementConfigForSave({}, parseServiceItemMemo(audioMemo)),
                        audioSlides: audioSlides.map((slide) => ({
                          type: slide.type,
                          layout: slide.layout,
                          elementType: slide.elementType,
                          sourceType: slide.sourceType,
                          componentType: slide.componentType,
                          audioSrc: slide.audioSrc,
                          body: renderPresenterSlideBody(slide).trim(),
                          preview: renderPresenterSlidePreviewBody(slide),
                        })),
                        scoreFormBadges: [...scoreBadgeNode.querySelectorAll('.svc-slide-form-badge')].map((node) => node.textContent.trim()),
                        missingWarnings: [...new Set(missingSlides.flatMap((slide) => slide.warnings || []))],
                        missingPreviewText: missingSlides.map((slide) => renderPresenterSlideMiniPreview(slide, service.id)).join(' '),
                        warningChipText: warningChip?.textContent.trim() || '',
                        warningLayout
                      };
                    }
                    """
                )
                if (
                    form_preset_state["hymnTypes"] == ["song-title", "lyrics", "lyrics", "lyrics", "lyrics", "blank", "lyrics", "lyrics"]
                    and form_preset_state["hymnMarkers"] == ["Verse 1", "Chorus", "Verse 2", "Chorus", "Verse 4", "Chorus"]
                    and form_preset_state["hymnTexts"] == [
                        "1절 첫 줄\n1절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "2절 첫 줄\n2절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "마지막 절 첫 줄\n마지막 절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                    ]
                    and "3절 첫 줄" not in "\n".join(form_preset_state["hymnTexts"])
                    and form_preset_state["hymnWarnings"] == []
                    and form_preset_state["hymnBlankCount"] == 1
                    and form_preset_state["hymnBlankText"] == ""
                    and form_preset_state["hymnBlankLayout"] == "blank"
                    and form_preset_state["ccmMarkers"] == ["Verse 1", "Chorus", "Chorus"]
                    and form_preset_state["ccmTexts"] == ["V1 첫 줄\nV1 둘째 줄", "C 첫 줄\nC 둘째 줄", "C 첫 줄\nC 둘째 줄"]
                    and len(set(form_preset_state["ccmFormKeys"])) == 3
                    and form_preset_state["defaultFormMetadataSummary"] == "V1-V2-C-V3-C-Coda"
                    and form_preset_state["defaultFormMarkers"] == ["Verse 1", "Verse 2", "Chorus", "Verse 3", "Chorus", "Coda"]
                    and form_preset_state["defaultFormTexts"] == [
                        "감사 1절 첫 줄\n감사 1절 둘째 줄",
                        "감사 2절 첫 줄\n감사 2절 둘째 줄",
                        "감사 후렴 첫 줄\n감사 후렴 둘째 줄",
                        "감사 3절 첫 줄\n감사 3절 둘째 줄",
                        "감사 후렴 첫 줄\n감사 후렴 둘째 줄",
                        "감사 코다 첫 줄\n감사 코다 둘째 줄",
                    ]
                    and form_preset_state["fallbackVersionTexts"] == ["하나님은 너를 지키시는 자\n너의 우편에 그늘 되시니"]
                    and form_preset_state["fallbackVersionWarnings"] == []
                    and form_preset_state["fallbackTitleTexts"] == ["하나님은 너를 지키시는 자\n너의 우편에 그늘 되시니"]
                    and form_preset_state["fallbackTitleWarnings"] == []
                    and form_preset_state["hymnAutoMarkers"] == ["Verse 1", "Chorus", "Verse 2", "Chorus", "Verse 3", "Chorus", "Verse 4", "Chorus", "Coda"]
                    and form_preset_state["hymnAutoTexts"] == [
                        "1절 첫 줄\n1절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "2절 첫 줄\n2절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "3절 첫 줄\n3절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "마지막 절 첫 줄\n마지막 절 둘째 줄",
                        "후렴 첫 줄\n후렴 둘째 줄",
                        "아멘",
                    ]
                    and form_preset_state["scoreTitleSlides"] == [{
                        "type": "song-title",
                        "title": "특송 테스트",
                        "text": "♪ 특송 테스트",
                    }]
                    and form_preset_state["scoreImageTitleSlides"] == ["특송 테스트"]
                    and form_preset_state["scoreManifestTitleSlides"] == ["이 천지간 만물들아"]
                    and form_preset_state["scoreRawTitleTitleSlides"] == ["이 천지간 만물들아"]
                    and form_preset_state["offeringScoreTitleSlides"] == [{
                        "title": "하나님의 크신 사랑",
                        "sectionTitle": "봉헌",
                        "label": "봉헌찬송",
                    }]
                    and form_preset_state["specialScoreTitleSlides"] == [{
                        "title": "특송 테스트",
                        "sectionTitle": "특송",
                        "label": "특송",
                    }]
                    and form_preset_state["specialSectionTitleSlides"] == [{
                        "type": "title-assignee",
                        "elementType": "title_assignee",
                        "layout": "lower_bar_text",
                        "title": "특송",
                        "assignee": "할렐루야 찬양대",
                        "text": "특송\n할렐루야 찬양대",
                        "sectionKey": "special_song",
                        "body": form_preset_state["specialSectionTitleSlides"][0]["body"],
                    }]
                    and "presenter-title-assignee" in form_preset_state["specialSectionTitleSlides"][0]["body"]
                    and form_preset_state["sectionSongTitleSlides"]["offering"] == [
                        {
                            "type": "song-title",
                            "title": "하나님의 크신 사랑",
                            "text": "♪ 999 하나님의 크신 사랑",
                            "sectionHeading": "봉헌",
                            "sectionKey": "offering",
                            "layout": "lower_bar_text",
                            "body": form_preset_state["sectionSongTitleSlides"]["offering"][0]["body"],
                        },
                    ]
                    and "presenter-section-song-title" in form_preset_state["sectionSongTitleSlides"]["offering"][0]["body"]
                    and form_preset_state["sectionSongTitleSlides"]["special"] == [
                        {
                            "type": "song-title",
                            "title": "특송 테스트",
                            "text": "♪ 999 특송 테스트",
                            "sectionHeading": "특송",
                            "sectionKey": "special_song",
                            "layout": "lower_bar_text",
                            "body": form_preset_state["sectionSongTitleSlides"]["special"][0]["body"],
                        },
                    ]
                    and "presenter-section-song-title-heading" in form_preset_state["sectionSongTitleSlides"]["special"][0]["body"]
                    and form_preset_state["sectionSongTitleSlides"]["doxology"] == [
                        {
                            "type": "song-title",
                            "title": "이 천지간 만물들아",
                            "text": "♪ 5 이 천지간 만물들아",
                            "sectionHeading": "송영",
                            "sectionKey": "doxology",
                            "layout": "lower_bar_text",
                            "body": form_preset_state["sectionSongTitleSlides"]["doxology"][0]["body"],
                        },
                    ]
                    and "presenter-section-song-title-name" in form_preset_state["sectionSongTitleSlides"]["doxology"][0]["body"]
                    and "♪ 5 이 천지간 만물들아" in form_preset_state["sectionSongTitleSlides"]["doxology"][0]["body"]
                    and form_preset_state["scoreSlides"] == [{
                        "type": "file",
                        "layout": "file",
                        "elementType": "file",
                        "sourceType": "score",
                        "componentType": "score",
                        "marker": "악보",
                        "title": "특송 테스트",
                    }]
                    and form_preset_state["scoreImageSlides"] == [
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/worship-backgrounds/26-A1.png",
                        },
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/worship-backgrounds/26-A2.png",
                        },
                    ]
                    and form_preset_state["scoreFormBadges"] == ["Verse 1", "Chorus"]
                    and form_preset_state["scoreManifestSlides"] == [
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/hymn-scores/5/slide-01.webp",
                        },
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/hymn-scores/5/slide-02.webp",
                        },
                    ]
                    and form_preset_state["scoreRawTitleSlides"] == [
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/hymn-scores/5/slide-01.webp",
                        },
                        {
                            "type": "image",
                            "layout": "media",
                            "elementType": "image",
                            "sourceType": "score",
                            "componentType": "score",
                            "marker": "",
                            "imageSrc": "assets/hymn-scores/5/slide-02.webp",
                        },
                    ]
                    and form_preset_state["scorePreloadSources"] == [
                        "assets/worship-backgrounds/26-A1.png",
                        "assets/worship-backgrounds/26-A2.png",
                    ]
                    and len(form_preset_state["longScorePreloadSources"]) == 12
                    and form_preset_state["longScorePreloadSources"][0].endswith("slide-01.webp")
                    and form_preset_state["longScorePreloadSources"][-1].endswith("slide-12.webp")
                    and len(form_preset_state["longScoreWarmupSourcesStart"]) == 12
                    and len(form_preset_state["longScoreWarmupSourcesMiddle"]) == 12
                    and form_preset_state["longScoreWarmupSourcesStart"][0].endswith("slide-01.webp")
                    and form_preset_state["longScoreWarmupSourcesMiddle"][0].endswith("slide-07.webp")
                    and form_preset_state["longScoreWarmupKeys"][0] == form_preset_state["longScoreWarmupKeys"][1]
                    and "presenter-slide--score" in form_preset_state["scoreSafeArea"]["className"]
                    and abs(form_preset_state["scoreSafeArea"]["top"]) <= 1
                    and abs(form_preset_state["scoreSafeArea"]["right"]) <= 1
                    and abs(form_preset_state["scoreSafeArea"]["bottom"]) <= 1
                    and abs(form_preset_state["scoreSafeArea"]["left"]) <= 1
                    and form_preset_state["scoreSafeArea"]["slideBackground"] == "rgb(0, 0, 0)"
                    and form_preset_state["scoreSafeArea"]["imageBackground"] == "none"
                    and form_preset_state["scoreSafeArea"]["imageBackgroundColor"] == "rgb(0, 0, 0)"
                    and form_preset_state["audioMemo"]["elementType"] == "audio"
                    and form_preset_state["audioMemo"]["asset"] == {
                        "kind": "audio",
                        "name": "성가대 MR",
                        "url": "assets/audio/choir.m4a",
                    }
                    and form_preset_state["audioDbType"] == "plain_text"
                    and form_preset_state["audioConfig"]["elementType"] == "audio"
                    and form_preset_state["audioConfig"]["asset"]["kind"] == "audio"
                    and form_preset_state["audioSlides"] == [{
                        "type": "audio",
                        "layout": "file",
                        "elementType": "audio",
                        "sourceType": "audio",
                        "componentType": "audio",
                        "audioSrc": "assets/audio/choir.m4a",
                        "body": "",
                        "preview": form_preset_state["audioSlides"][0]["preview"],
                    }]
                    and "오디오" in form_preset_state["audioSlides"][0]["preview"]
                    and "성가대 MR" in form_preset_state["audioSlides"][0]["preview"]
                    and form_preset_state["missingWarnings"] == ["Bridge 없음"]
                    and "Bridge 없음" not in form_preset_state["missingPreviewText"]
                    and form_preset_state["warningChipText"] == "Bridge 없음"
                    and form_preset_state["warningLayout"]["headDisplay"] in ("flex", "inline-flex")
                    and form_preset_state["warningLayout"]["headWidth"] < 260
                    and 0 <= form_preset_state["warningLayout"]["chipGap"] <= 16
                ):
                    pass_("presenter-form-preset-sequence", json.dumps(form_preset_state, ensure_ascii=False))
                else:
                    fail("presenter-form-preset-sequence", json.dumps(form_preset_state, ensure_ascii=False))

                live_input = page.locator(f'[data-live-scripture-input][data-service-id="{service["id"]}"]')
                live_input.fill("요")
                live_input.focus()
                page.keyboard.press("Space")
                page.keyboard.press("5")
                page.keyboard.press("ArrowRight")
                focused_input_state = page.evaluate(
                    """
                    (serviceId) => ({
                      index: state.presenter.index,
                      draft: state.presenter.jumpDraft,
                      inputValue: document.querySelector(`[data-live-scripture-input][data-service-id="${serviceId}"]`)?.value || '',
                    })
                    """,
                    service["id"],
                )
                if (
                    focused_input_state["index"] == 0
                    and focused_input_state["draft"] == ""
                    and focused_input_state["inputValue"] == "요 5"
                ):
                    pass_("presenter-keyboard-input-scope", json.dumps(focused_input_state, ensure_ascii=False))
                else:
                    fail("presenter-keyboard-input-scope", json.dumps(focused_input_state, ensure_ascii=False))

                jump_scope_input = page.locator(f'[data-presenter-jump-input][data-service-id="{service["id"]}"]')
                jump_scope_input.fill("1")
                jump_scope_input.focus()
                page.keyboard.press("ArrowDown")
                page.wait_for_timeout(250)
                jump_scope_state = page.evaluate(
                    """
                    (() => ({
                      index: state.presenter.index,
                      draft: state.presenter.jumpDraft,
                    }))()
                    """
                )
                if jump_scope_state["index"] == 0 and jump_scope_state["draft"] == "":
                    pass_("presenter-keyboard-jump-input-arrows-ignored", json.dumps(jump_scope_state, ensure_ascii=False))
                else:
                    fail("presenter-keyboard-jump-input-arrows-ignored", json.dumps(jump_scope_state, ensure_ascii=False))

                page.evaluate(
                    """
                    (serviceId) => {
                      preparePresenterService(serviceId);
                      state.presenter.index = 0;
                      state.presenter.safetyBlank = false;
                      state.presenter.jumpDraft = "";
                      renderPresenterControlState(serviceId);
                    }
                    """,
                    service["id"],
                )
                jump_scope_input = page.locator(f'[data-presenter-jump-input][data-service-id="{service["id"]}"]')
                jump_scope_input.fill("9")
                jump_scope_input.focus()
                page.keyboard.press("Escape")
                page.wait_for_timeout(150)
                jump_escape_state = page.evaluate(
                    """
                    (serviceId) => ({
                      index: state.presenter.index,
                      draft: state.presenter.jumpDraft,
                      inputValue: document.querySelector(`[data-presenter-jump-input][data-service-id="${serviceId}"]`)?.value || '',
                    })
                    """,
                    service["id"],
                )
                if (
                    jump_escape_state["index"] == 0
                    and jump_escape_state["draft"] == ""
                    and jump_escape_state["inputValue"] == "1"
                ):
                    pass_("presenter-keyboard-jump-input-escape-cancel", json.dumps(jump_escape_state, ensure_ascii=False))
                else:
                    fail("presenter-keyboard-jump-input-escape-cancel", json.dumps(jump_escape_state, ensure_ascii=False))

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
                    service["id"],
                )
                if (
                    form_label_state["heads"] > 0
                    and form_label_state["dividers"] == 0
                    and not form_label_state["continuationBadges"]
                ):
                    pass_("presenter-form-labels", json.dumps(form_label_state, ensure_ascii=False))
                else:
                    fail("presenter-form-labels", json.dumps(form_label_state, ensure_ascii=False))

                legacy_artifact_state = page.evaluate(
                    """
                    (() => ({
                      visible: /\\b(?:Elem|Element|Section|Slide)_/i.test(document.body.innerText),
                      presentationTerms: /\\bPPTX?\\b|PowerPoint/i.test(document.body.innerText),
                      labels: [...document.querySelectorAll('[aria-label]')]
                        .map((node) => node.getAttribute('aria-label') || '')
                        .filter((label) => /\\b(?:Elem|Element|Section|Slide)_/i.test(label)),
                    }))()
                    """
                )
                if not legacy_artifact_state["visible"] and not legacy_artifact_state["presentationTerms"] and not legacy_artifact_state["labels"]:
                    pass_("presenter-legacy-artifact-hidden", json.dumps(legacy_artifact_state, ensure_ascii=False))
                else:
                    fail("presenter-legacy-artifact-hidden", json.dumps(legacy_artifact_state, ensure_ascii=False))

                if service["slides"] > 1:
                    page.click(f'[data-presenter-action="next"][data-service-id="{service["id"]}"]')
                    next_state = page.evaluate(
                        """
                        (() => ({
                          serviceId: state.presenter.serviceId,
                          index: state.presenter.index,
                          slides: state.presenter.slides.length
                        }))()
                        """
                    )
                    if next_state["serviceId"] == service["id"] and next_state["index"] == 1:
                        pass_("presenter-next-control", json.dumps(next_state, ensure_ascii=False))
                    else:
                        fail("presenter-next-control", json.dumps(next_state, ensure_ascii=False))

                    jump_target = min(service["slides"], 3)
                    jump_input = page.locator(f'[data-presenter-jump-input][data-service-id="{service["id"]}"]')
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
                    if jump_state["serviceId"] == service["id"] and jump_state["index"] == jump_target - 1 and not jump_state["draft"]:
                        pass_("presenter-jump-control", json.dumps(jump_state, ensure_ascii=False))
                    else:
                        fail("presenter-jump-control", json.dumps(jump_state, ensure_ascii=False))

                    page.evaluate(
                        """
                        (() => {
                          const primary = {
                            isPrimary: true,
                            left: 0,
                            top: 0,
                            availLeft: 0,
                            availTop: 0,
                            width: 1440,
                            height: 900,
                            availWidth: 1440,
                            availHeight: 900,
                          };
                          const secondary = {
                            isPrimary: false,
                            left: 1440,
                            top: 0,
                            availLeft: 1440,
                            availTop: 0,
                            width: 1920,
                            height: 1080,
                            availWidth: 1920,
                            availHeight: 1080,
                          };
                          window.getScreenDetails = async () => ({
                            currentScreen: primary,
                            screens: [primary, secondary],
                            addEventListener() {},
                          });
                          window.__mindexPresenterOpenArgs = null;
                          window.__mindexPresenterFullscreenCalls = 0;
                          window.__mindexPresenterFocusCalls = 0;
                          window.open = (url, name, features) => {
                            window.__mindexPresenterOpenArgs = { url, name, features };
                            window.__mindexPresenterOpenCalls = (window.__mindexPresenterOpenCalls || 0) + 1;
                            return {
                              closed: false,
                              focus() { window.__mindexPresenterFocusCalls += 1; },
                              addEventListener() {},
                              moveTo() {},
                              resizeTo() {},
                              document: {
                                documentElement: {
                                  requestFullscreen() {
                                    window.__mindexPresenterFullscreenCalls += 1;
                                    return Promise.resolve();
                                  }
                                }
                              }
                            };
                          };
                        })()
                        """
                    )
                    page.click(f'.svc-presenter-launch[data-service-id="{service["id"]}"]')
                    page.wait_for_function("() => Boolean(window.__mindexPresenterOpenArgs)", timeout=5000)
                    page.wait_for_function("() => (window.__mindexPresenterFullscreenCalls || 0) > 0", timeout=5000)
                    target_state = page.evaluate(
                        """
                        (() => ({
                          args: window.__mindexPresenterOpenArgs,
                          fullscreenCalls: window.__mindexPresenterFullscreenCalls || 0,
                          focusCalls: window.__mindexPresenterFocusCalls || 0,
                          openCalls: window.__mindexPresenterOpenCalls || 0,
                        }))()
                        """
                    )
                    target_features = target_state["args"]["features"] or ""
                    if (
                        "fullscreen=1" in target_state["args"]["url"]
                        and "left=1440" in target_features
                        and "top=0" in target_features
                        and "width=1920" in target_features
                        and "height=1080" in target_features
                        and "fullscreen=yes" in target_features
                        and target_state["fullscreenCalls"] > 0
                        and target_state["focusCalls"] == 1
                        and target_state["openCalls"] == 1
                    ):
                        pass_("presenter-secondary-fullscreen-launch", json.dumps(target_state, ensure_ascii=False))
                    else:
                        fail("presenter-secondary-fullscreen-launch", json.dumps(target_state, ensure_ascii=False))

                    page.click(f'.svc-presenter-launch[data-service-id="{service["id"]}"]')
                    page.wait_for_function("() => (window.__mindexPresenterFullscreenCalls || 0) > 1", timeout=5000)
                    reuse_state = page.evaluate(
                        """
                        (() => ({
                          openCalls: window.__mindexPresenterOpenCalls || 0,
                          focusCalls: window.__mindexPresenterFocusCalls || 0,
                          fullscreenCalls: window.__mindexPresenterFullscreenCalls || 0,
                          hasWindowRef: Boolean(state.presenter.outputWindow),
                        }))()
                        """
                    )
                    if (
                        reuse_state["openCalls"] == 1
                        and reuse_state["focusCalls"] >= 2
                        and reuse_state["fullscreenCalls"] >= 2
                        and reuse_state["hasWindowRef"]
                    ):
                        pass_("presenter-open-reuses-existing-window", json.dumps(reuse_state, ensure_ascii=False))
                    else:
                        fail("presenter-open-reuses-existing-window", json.dumps(reuse_state, ensure_ascii=False))

                    dbl_target = min(service["slides"] - 1, 4)
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
                        f'.svc-slide-thumb[data-service-id="{service["id"]}"][data-presenter-index="{dbl_target}"]'
                    ).dblclick()
                    page.wait_for_function("(target) => state.presenter.index === target", arg=dbl_target, timeout=5000)
                    page.wait_for_function("() => window.__mindexPresenterOpenCalls === 0", timeout=5000)
                    dbl_state = page.evaluate(
                        """
                        (() => ({
                          serviceId: state.presenter.serviceId,
                          index: state.presenter.index,
                          openCalls: window.__mindexPresenterOpenCalls || 0,
                          hasWindowRef: Boolean(state.presenter.outputWindow)
                        }))()
                        """
                    )
                    if (
                        dbl_state["serviceId"] == service["id"]
                        and dbl_state["index"] == dbl_target
                        and dbl_state["openCalls"] == 0
                        and dbl_state["hasWindowRef"]
                    ):
                        pass_("presenter-doubleclick-start", json.dumps(dbl_state, ensure_ascii=False))
                    else:
                        fail("presenter-doubleclick-start", json.dumps(dbl_state, ensure_ascii=False))

                overflow_state: dict[str, Any] = page.evaluate(
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
                overflow = max(
                    overflow_state["documentScrollWidth"] - overflow_state["viewport"],
                    overflow_state["bodyScrollWidth"] - overflow_state["viewport"],
                    overflow_state["boardScrollWidth"] - overflow_state["boardClientWidth"],
                )
                if overflow <= 2:
                    pass_("presenter-horizontal-overflow", json.dumps(overflow_state, ensure_ascii=False))
                else:
                    fail("presenter-horizontal-overflow", json.dumps(overflow_state, ensure_ascii=False))

                responsive_control_states = []
                for width in [1180, 900, 760, 620, 520, 390]:
                    page.set_viewport_size({"width": width, "height": 820})
                    page.wait_for_timeout(80)
                    responsive_control_states.append(page.evaluate(
                        """
                        () => {
                          const rect = (node) => {
                            const r = node?.getBoundingClientRect();
                            return r ? {
                              x: Math.round(r.x),
                              y: Math.round(r.y),
                              right: Math.round(r.right),
                              bottom: Math.round(r.bottom),
                              width: Math.round(r.width),
                              height: Math.round(r.height),
                            } : null;
                          };
                          const top = document.querySelector('.svc-presenter-top');
                          const boxes = [...(top?.children || [])].map(rect).filter(Boolean);
                          let overlaps = 0;
                          for (let i = 0; i < boxes.length; i += 1) {
                            for (let j = i + 1; j < boxes.length; j += 1) {
                              const a = boxes[i];
                              const b = boxes[j];
                              if (!(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y)) overlaps += 1;
                            }
                          }
                          return {
                            width: window.innerWidth,
                            top: rect(top),
                            overlaps,
                            overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, document.body.scrollWidth - window.innerWidth),
                          };
                        }
                        """
                    ))
                page.set_viewport_size({"width": 1440, "height": 980})
                page.wait_for_timeout(80)
                if all(item["overlaps"] == 0 and item["overflow"] <= 2 for item in responsive_control_states):
                    pass_("presenter-responsive-controls", json.dumps(responsive_control_states, ensure_ascii=False))
                else:
                    fail("presenter-responsive-controls", json.dumps(responsive_control_states, ensure_ascii=False))

                payload = page.evaluate(
                    """
                    (serviceId) => {
                      preparePresenterService(serviceId);
                      state.presenter.index = Math.min(1, Math.max(state.presenter.slides.length - 1, 0));
                      state.presenter.liveScripture = { reference: "", draft: "", active: false, slide: null };
                      state.presenter.livePraise = { query: "", draft: "", active: false, slides: [], index: 0, songId: "", versionId: "" };
                      state.presenter.outputWindow = null;
                      state.presenter.outputConnectedAt = 0;
                      state.presenter.outputClientId = "";
                      stopPresenterOutputWindowMonitor();
                      renderPresenterControlState(serviceId);
                      publishPresenterState({ force: true });
                      return presenterStatePayload(serviceId);
                    }
                    """,
                    service["id"],
                )
                output_page = context.new_page()
                output_page.set_viewport_size({"width": 1280, "height": 800})
                output_page.on("pageerror", lambda error: page_errors.append(f"output: {error}"))
                output_page.on("response", lambda response: record_response(response, "output"))
                output_page.on(
                    "console",
                    lambda msg: console_messages.append(f"output {msg.type}: {msg.text}")
                    if msg.type in ("error", "warning")
                    else None,
                )
                output_page.goto(presenter_output_url(app_url), wait_until="load")
                output_page.wait_for_selector("#presenterOutputRoot", timeout=5000)
                output_page.wait_for_function(
                    "(serviceId) => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').serviceId === serviceId",
                    arg=service["id"],
                    timeout=5000,
                )
                page.wait_for_function(
                    "() => document.querySelector('.svc-presenter-status')?.textContent.trim() === '송출 중'",
                    timeout=5000,
                )
                heartbeat_state = page.evaluate(
                    """
                    (() => ({
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                      connected: state.presenter.outputConnectedAt > 0,
                      open: isPresenterOutputWindowOpen(),
                      hasWindowRef: Boolean(state.presenter.outputWindow),
                    }))()
                    """
                )
                if (
                    heartbeat_state["status"] == "송출 중"
                    and heartbeat_state["mode"] == "2번"
                    and heartbeat_state["connected"]
                    and heartbeat_state["open"]
                    and not heartbeat_state["hasWindowRef"]
                ):
                    pass_("presenter-output-heartbeat-direct-route", json.dumps(heartbeat_state, ensure_ascii=False))
                else:
                    fail("presenter-output-heartbeat-direct-route", json.dumps(heartbeat_state, ensure_ascii=False))

                output_fullscreen_key_state = output_page.evaluate(
                    """
                    async () => {
                      let requestCalls = 0;
                      const originalRequestFullscreen = document.documentElement.requestFullscreen;
                      document.documentElement.requestFullscreen = () => {
                        requestCalls += 1;
                        return Promise.resolve();
                      };
                      const before = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index;
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
                      await new Promise((resolve) => setTimeout(resolve, 80));
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
                      await new Promise((resolve) => setTimeout(resolve, 80));
                      const after = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index;
                      document.documentElement.requestFullscreen = originalRequestFullscreen;
                      return { requestCalls, before, after };
                    }
                    """
                )
                if (
                    output_fullscreen_key_state["requestCalls"] >= 2
                    and output_fullscreen_key_state["before"] == output_fullscreen_key_state["after"]
                ):
                    pass_("presenter-output-enter-space-fullscreen", json.dumps(output_fullscreen_key_state, ensure_ascii=False))
                else:
                    fail("presenter-output-enter-space-fullscreen", json.dumps(output_fullscreen_key_state, ensure_ascii=False))

                page.evaluate(
                    """
                    (() => {
                      window.__mindexPresenterOpenCalls = 0;
                      window.open = () => {
                        window.__mindexPresenterOpenCalls += 1;
                        return null;
                      };
                    })()
                    """
                )
                page.click(f'.svc-presenter-launch[data-service-id="{service["id"]}"]')
                page.wait_for_timeout(350)
                heartbeat_reuse_state = page.evaluate(
                    """
                    (() => ({
                      openCalls: window.__mindexPresenterOpenCalls || 0,
                      connected: state.presenter.outputConnectedAt > 0,
                      open: isPresenterOutputWindowOpen(),
                      hasWindowRef: Boolean(state.presenter.outputWindow),
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                    }))()
                    """
                )
                if (
                    heartbeat_reuse_state["openCalls"] == 0
                    and heartbeat_reuse_state["connected"]
                    and heartbeat_reuse_state["open"]
                    and not heartbeat_reuse_state["hasWindowRef"]
                    and heartbeat_reuse_state["status"] == "송출 중"
                ):
                    pass_("presenter-open-reuses-heartbeat-output", json.dumps(heartbeat_reuse_state, ensure_ascii=False))
                else:
                    fail("presenter-open-reuses-heartbeat-output", json.dumps(heartbeat_reuse_state, ensure_ascii=False))

                payload = page.evaluate(
                    """
                    (serviceId) => {
                      const songTitleIndex = state.presenter.slides.findIndex((slide) => slide.type === 'song-title');
                      state.presenter.index = songTitleIndex >= 0
                        ? songTitleIndex
                        : Math.min(2, Math.max(state.presenter.slides.length - 1, 0));
                      state.presenter.safetyBlank = false;
                      renderPresenterControlState(serviceId);
                      publishPresenterState({ force: true });
                      return presenterStatePayload(serviceId);
                    }
                    """,
                    service["id"],
                )
                output_page.wait_for_function(
                    "(expectedIndex) => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index === expectedIndex",
                    arg=payload["index"],
                    timeout=5000,
                )

                output_state = output_page.evaluate(
                    """
                    (() => {
                      const root = document.getElementById('presenterOutputRoot');
                      const slide = root?.querySelector('.presenter-slide');
                      const text = slide?.innerText.trim() || '';
                      const styles = root ? getComputedStyle(root) : null;
                      const rect = root?.getBoundingClientRect();
                      const textRect = slide?.querySelector('.presenter-slide-text')?.getBoundingClientRect();
                      return {
                        serviceType: root?.dataset.serviceType || '',
                        outputTheme: root?.dataset.outputTheme || '',
                        noChromakey: root?.classList.contains('no-chromakey') || false,
                        hasBackground: root?.classList.contains('has-background') || false,
                        slideClass: slide ? [...slide.classList].find((name) => name.startsWith('presenter-slide--') && name !== 'presenter-slide') : '',
                        elementType: slide?.dataset.elementType || '',
                        layout: slide?.dataset.slideLayout || '',
                        backgroundColor: styles?.backgroundColor || '',
                        text,
                        viewport: { width: window.innerWidth, height: window.innerHeight },
                        frame: rect ? {
                          width: Math.round(rect.width),
                          height: Math.round(rect.height),
                          ratio: rect.height ? Number((rect.width / rect.height).toFixed(3)) : 0,
                        } : null,
                        lowerBarRatio: rect && textRect ? Number((textRect.height / rect.height).toFixed(3)) : 0,
                        overflow: Math.max(
                          document.documentElement.scrollWidth - window.innerWidth,
                          document.documentElement.scrollHeight - window.innerHeight,
                          document.body.scrollWidth - window.innerWidth,
                          document.body.scrollHeight - window.innerHeight
                        ),
                      };
                    })()
                    """
                )
                if (
                    output_state["serviceType"] == payload["serviceType"]
                    and output_state["outputTheme"] == payload["outputTheme"]
                    and output_state["noChromakey"] == (payload["chromakey"] is False)
                    and output_state["slideClass"]
                    and output_state["elementType"]
                    and output_state["layout"]
                    and (output_state["slideClass"] != "presenter-slide--song-title" or output_state["text"].startswith("♪ "))
                    and abs(output_state["frame"]["ratio"] - (16 / 9)) <= 0.01
                    and abs(output_state["lowerBarRatio"] - (7 / 40)) <= 0.01
                    and output_state["overflow"] <= 2
                ):
                    pass_("presenter-output-route", json.dumps(output_state, ensure_ascii=False))
                else:
                    fail("presenter-output-route", json.dumps({"payload": payload, "output": output_state}, ensure_ascii=False))

                preview_state = page.evaluate(
                    """
                    (() => {
                      const thumb = document.querySelector('.svc-slide-thumb.active .svc-slide-mini-output .presenter-slide')
                        || document.querySelector(`.svc-slide-thumb[data-presenter-index="${state.presenter.index}"] .svc-slide-mini-output .presenter-slide`);
                      const text = thumb?.innerText.trim() || '';
                      return {
                        hasSharedFrame: Boolean(thumb),
                        slideClass: thumb ? [...thumb.classList].find((name) => name.startsWith('presenter-slide--') && name !== 'presenter-slide') : '',
                        elementType: thumb?.dataset.elementType || '',
                        layout: thumb?.dataset.slideLayout || '',
                        text,
                      };
                    })()
                    """
                )
                if (
                    preview_state["hasSharedFrame"]
                    and preview_state["slideClass"] == output_state["slideClass"]
                    and preview_state["elementType"] == output_state["elementType"]
                    and preview_state["layout"] == output_state["layout"]
                    and (output_state["text"] in preview_state["text"] or preview_state["text"] in output_state["text"])
                ):
                    pass_("presenter-controller-preview-shared-frame", json.dumps(preview_state, ensure_ascii=False))
                else:
                    fail("presenter-controller-preview-shared-frame", json.dumps({"output": output_state, "preview": preview_state}, ensure_ascii=False))

                output_viewport_shot = output_page.screenshot()
                letterbox_pixels = {
                    "top": rgb_at(output_viewport_shot, 0.5, 0.01),
                    "bottom": rgb_at(output_viewport_shot, 0.5, 0.99),
                }
                if (
                    is_empty_output_background(letterbox_pixels["top"])
                    and is_empty_output_background(letterbox_pixels["bottom"])
                ):
                    pass_("presenter-output-letterbox-empty", json.dumps(letterbox_pixels, ensure_ascii=False))
                else:
                    fail("presenter-output-letterbox-empty", json.dumps(letterbox_pixels, ensure_ascii=False))

                current_presenter_index = page.evaluate("state.presenter.index")
                page.wait_for_function(
                    "(index) => Boolean(document.querySelector(`.svc-slide-thumb[data-presenter-index=\"${index}\"] .svc-slide-mini-output`))",
                    arg=current_presenter_index,
                    timeout=5000,
                )
                page.wait_for_timeout(250)
                thumb_shot = screenshot_with_retry(page, page.locator(f'.svc-slide-thumb[data-presenter-index="{current_presenter_index}"] .svc-slide-mini-output').first)
                output_shot = output_page.locator("#presenterOutputRoot").screenshot()
                chromakey_pixels = {
                    "thumbTop": rgb_at(thumb_shot, 0.5, 0.2),
                    "thumbBar": rgb_at(thumb_shot, 0.08, 0.92),
                    "outputTop": rgb_at(output_shot, 0.5, 0.2),
                    "outputBar": rgb_at(output_shot, 0.08, 0.92),
                }
                if (
                    is_chromakey_green(chromakey_pixels["thumbTop"])
                    and is_chromakey_green(chromakey_pixels["outputTop"])
                    and is_dark_bar(chromakey_pixels["thumbBar"])
                    and is_dark_bar(chromakey_pixels["outputBar"])
                ):
                    pass_("presenter-output-pixel-match-chromakey", json.dumps(chromakey_pixels, ensure_ascii=False))
                else:
                    fail("presenter-output-pixel-match-chromakey", json.dumps(chromakey_pixels, ensure_ascii=False))

                image_swap_state = output_page.evaluate(
                    """
                    async () => {
                      const root = document.getElementById('presenterOutputRoot');
                      const src = normalizePresenterMediaSource('assets/worship-backgrounds/26-A1.png');
                      let resolveReady;
                      const pending = new Promise((resolve) => { resolveReady = resolve; });
                      presenterOutputImagePreloadCache.clear();
                      presenterOutputImagePreloadCache.set(src, {
                        image: { complete: false, naturalWidth: 0 },
                        promise: pending,
                        lastUsed: Date.now(),
                        ready: false,
                      });
                      root.innerHTML = '<section class="presenter-slide presenter-slide--lyrics" data-element-type="praise" data-slide-layout="lower_bar_text"><div class="presenter-slide-text"><span>OLD FRAME</span></div></section>';
                      renderPresenterOutput({
                        serviceId: '__smoke_image_wait__',
                        serviceType: 'friday',
                        chromakey: false,
                        outputTheme: 'chromakey',
                        backgroundImage: '',
                        slides: [{
                          id: '__smoke_image_slide__',
                          type: 'image',
                          elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
                          layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
                          imageSrc: src,
                        }],
                        index: 0,
                        safetyBlank: false,
                      });
                      const before = {
                        busy: root.getAttribute('aria-busy'),
                        oldVisible: root.querySelector('.presenter-output-layer.is-active')?.innerText.includes('OLD FRAME') || root.innerText.includes('OLD FRAME'),
                        activeHasImage: Boolean(root.querySelector('.presenter-output-layer.is-active img.presenter-image')),
                        nextHasImage: Boolean(root.querySelector('.presenter-output-layer:not(.is-active) img.presenter-image')),
                      };
                      const record = presenterOutputImagePreloadCache.get(src);
                      record.ready = true;
                      resolveReady();
                      await new Promise((resolve) => {
                        const start = Date.now();
                        const tick = () => {
                          const imageReady = !root.getAttribute('aria-busy')
                            && root.querySelector('.presenter-output-layer.is-active img.presenter-image');
                          if (imageReady || Date.now() - start > 3000) resolve();
                          else requestAnimationFrame(tick);
                        };
                        tick();
                      });
                      const after = {
                        busy: root.getAttribute('aria-busy'),
                        oldVisible: root.querySelector('.presenter-output-layer.is-active')?.innerText.includes('OLD FRAME') || false,
                        activeHasImage: Boolean(root.querySelector('.presenter-output-layer.is-active img.presenter-image')),
                        source: root.querySelector('.presenter-output-layer.is-active img.presenter-image')?.getAttribute('src') || '',
                      };
                      return { before, after };
                    }
                    """
                )
                if (
                    image_swap_state["before"]["busy"] == "true"
                    and image_swap_state["before"]["oldVisible"]
                    and not image_swap_state["before"]["activeHasImage"]
                    and image_swap_state["after"]["busy"] is None
                    and not image_swap_state["after"]["oldVisible"]
                    and image_swap_state["after"]["activeHasImage"]
                    and "26-A1.png" in image_swap_state["after"]["source"]
                ):
                    pass_("presenter-output-image-ready-swap", json.dumps(image_swap_state, ensure_ascii=False))
                else:
                    fail("presenter-output-image-ready-swap", json.dumps(image_swap_state, ensure_ascii=False))

                title_assignee_bounds = output_page.evaluate(
                    """
                    () => {
                      renderPresenterOutput({
                        serviceId: '__smoke_title_assignee_bounds__',
                        serviceType: 'friday',
                        chromakey: true,
                        outputTheme: 'chromakey',
                        backgroundImage: '',
                        slides: [{
                          id: '__smoke_long_title_assignee__',
                          type: 'title-assignee',
                          elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
                          layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
                          title: '성경봉독과 공동기도를 위한 안내',
                          assignee: '김남영 담임목사 외 공동집례자',
                        }],
                        index: 0,
                        safetyBlank: false,
                      });
                      const root = document.getElementById('presenterOutputRoot');
                      const bar = root.querySelector('.presenter-title-assignee');
                      const title = root.querySelector('.presenter-title-assignee-title');
                      const person = root.querySelector('.presenter-title-assignee-person');
                      const rect = (node) => {
                        const r = node.getBoundingClientRect();
                        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
                      };
                      const rootRect = rect(root);
                      const barRect = rect(bar);
                      const titleRect = rect(title);
                      const personRect = rect(person);
                      const titleStyle = getComputedStyle(title);
                      const personStyle = getComputedStyle(person);
                      return {
                        text: root.innerText,
                        titleOverflow: titleStyle.textOverflow,
                        personOverflow: personStyle.textOverflow,
                        titleFontSize: Number.parseFloat(titleStyle.fontSize),
                        personFontSize: Number.parseFloat(personStyle.fontSize),
                        titleInside: titleRect.left >= rootRect.left - 1 && titleRect.right <= rootRect.right + 1,
                        personInside: personRect.left >= rootRect.left - 1 && personRect.right <= rootRect.right + 1,
                        noOverlap: titleRect.right <= personRect.left + 1,
                        barCentered: Math.abs(((barRect.top + barRect.bottom) / 2) - ((titleRect.top + titleRect.bottom) / 2)) < 2
                          && Math.abs(((barRect.top + barRect.bottom) / 2) - ((personRect.top + personRect.bottom) / 2)) < 2,
                      };
                    }
                    """
                )
                if (
                    "성경봉독과 공동기도를 위한 안내" in title_assignee_bounds["text"]
                    and "김남영 담임목사 외 공동집례자" in title_assignee_bounds["text"]
                    and title_assignee_bounds["titleOverflow"] == "clip"
                    and title_assignee_bounds["personOverflow"] == "clip"
                    and title_assignee_bounds["titleInside"]
                    and title_assignee_bounds["personInside"]
                    and title_assignee_bounds["noOverlap"]
                    and title_assignee_bounds["barCentered"]
                ):
                    pass_("presenter-title-assignee-long-fit", json.dumps(title_assignee_bounds, ensure_ascii=False))
                else:
                    fail("presenter-title-assignee-long-fit", json.dumps(title_assignee_bounds, ensure_ascii=False))

                title_assignee_solo = output_page.evaluate(
                    """
                    () => {
                      renderPresenterOutput({
                        serviceId: '__smoke_title_assignee_solo__',
                        serviceType: 'friday',
                        chromakey: true,
                        outputTheme: 'chromakey',
                        backgroundImage: '',
                        slides: [{
                          id: '__smoke_long_title_solo__',
                          type: 'title-assignee',
                          elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
                          layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
                          title: '공동체를 위한 길고 긴 안내 제목',
                          assignee: '',
                        }],
                        index: 0,
                        safetyBlank: false,
                      });
                      const root = document.getElementById('presenterOutputRoot');
                      const bar = root.querySelector('.presenter-title-assignee');
                      const title = root.querySelector('.presenter-title-assignee-title');
                      const rootRect = root.getBoundingClientRect();
                      const titleRect = title.getBoundingClientRect();
                      return {
                        text: root.innerText,
                        hasSoloClass: bar.classList.contains('presenter-title-assignee--solo'),
                        columnCount: getComputedStyle(bar).gridTemplateColumns.split(' ').filter(Boolean).length,
                        titleInside: titleRect.left >= rootRect.left - 1 && titleRect.right <= rootRect.right + 1,
                        hasPerson: Boolean(root.querySelector('.presenter-title-assignee-person')),
                      };
                    }
                    """
                )
                if (
                    "공동체를 위한 길고 긴 안내 제목" in title_assignee_solo["text"]
                    and title_assignee_solo["hasSoloClass"]
                    and not title_assignee_solo["hasPerson"]
                    and title_assignee_solo["titleInside"]
                    and title_assignee_solo["columnCount"] == 1
                ):
                    pass_("presenter-title-assignee-solo-fit", json.dumps(title_assignee_solo, ensure_ascii=False))
                else:
                    fail("presenter-title-assignee-solo-fit", json.dumps(title_assignee_solo, ensure_ascii=False))

                page.evaluate(
                    """
                    (serviceId) => {
                      const slide = {
                        id: '__smoke_live_scripture__',
                        elementType: PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
                        layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
                        type: 'scripture',
                        label: '성구',
                        title: '요 3:16',
                        marker: '요 3:16',
                        text: '요 3:16   하나님이 세상을 이처럼 사랑하사',
                        live: true,
                      };
                      state.presenter.liveScripture = {
                        reference: slide.title,
                        draft: slide.title,
                        active: true,
                        slide,
                      };
                      state.presenter.safetyBlank = false;
                      publishPresenterState({ force: true });
                      renderPresenterControlState(serviceId);
                      return presenterStatePayload(serviceId);
                    }
                    """,
                    service["id"],
                )
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').liveScripture?.active === true",
                    timeout=5000,
                )
                output_page.wait_for_function(
                    "() => document.querySelector('.presenter-slide')?.classList.contains('presenter-slide--scripture')",
                    timeout=5000,
                )
                live_scripture_state = output_page.evaluate(
                    """
                    (() => {
                      const root = document.getElementById('presenterOutputRoot');
                      const slide = root?.querySelector('.presenter-slide');
                      const textEl = slide?.querySelector('.presenter-slide-text');
                      const firstLine = textEl?.querySelector('span');
                      const rootRect = root?.getBoundingClientRect();
                      const textRect = textEl?.getBoundingClientRect();
                      const firstRect = firstLine?.getBoundingClientRect();
                      const style = textEl ? getComputedStyle(textEl) : null;
                      return {
                        slideClass: slide?.className || '',
                        elementType: slide?.dataset.elementType || '',
                        layout: slide?.dataset.slideLayout || '',
                        text: slide?.innerText.trim() || '',
                        html: firstLine?.innerHTML || '',
                        textAlign: style?.textAlign || '',
                        alignItems: style?.alignItems || '',
                        barRatio: rootRect && textRect ? Number((textRect.height / rootRect.height).toFixed(3)) : 0,
                        lineLeftInset: rootRect && firstRect ? Math.round(firstRect.left - rootRect.left) : -1,
                        lineRightInset: rootRect && firstRect ? Math.round(rootRect.right - firstRect.right) : -1,
                      };
                    })()
                    """
                )
                if (
                    "presenter-slide--scripture" in live_scripture_state["slideClass"]
                    and live_scripture_state["elementType"] == "scripture_text"
                    and live_scripture_state["layout"] == "lower_bar_text"
                    and "요 3:16" in live_scripture_state["text"]
                    and "하나님이 세상을" in live_scripture_state["text"]
                    and "요 3:16&nbsp;&nbsp;&nbsp;하나님이" in live_scripture_state["html"]
                    and live_scripture_state["textAlign"] == "left"
                    and live_scripture_state["alignItems"] == "flex-start"
                    and abs(live_scripture_state["barRatio"] - (7 / 40)) <= 0.01
                    and 60 <= live_scripture_state["lineLeftInset"] <= 180
                    and live_scripture_state["lineRightInset"] > live_scripture_state["lineLeftInset"]
                ):
                    pass_("presenter-live-scripture-lower-bar", json.dumps(live_scripture_state, ensure_ascii=False))
                else:
                    fail("presenter-live-scripture-lower-bar", json.dumps(live_scripture_state, ensure_ascii=False))

                live_scripture_controller_state = page.evaluate(
                    """
                    (() => ({
                      activeThumbs: document.querySelectorAll('.svc-slide-thumb.active').length,
                      activeWraps: document.querySelectorAll('.svc-slide-thumb-wrap.active').length,
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                    }))()
                    """
                )
                if (
                    live_scripture_controller_state["activeThumbs"] == 0
                    and live_scripture_controller_state["activeWraps"] == 0
                    and live_scripture_controller_state["status"] == "송출 중"
                    and live_scripture_controller_state["mode"] == "성구"
                ):
                    pass_("presenter-live-scripture-controller-preview", json.dumps(live_scripture_controller_state, ensure_ascii=False))
                else:
                    fail("presenter-live-scripture-controller-preview", json.dumps(live_scripture_controller_state, ensure_ascii=False))

                page.evaluate(
                    """
                    (serviceId) => {
                      const song = {
                        id: '__smoke_live_praise_song__',
                        title: '테스트 찬양',
                        hymn_no: null,
                        scripture: [],
                        metadata: {},
                        versions: [{
                          id: '__smoke_live_praise_version__',
                          name: 'Default',
                          is_primary: true,
                          forms: [
                            { id: 'v1', part_type: 'Verse', part_number: 1, lyrics: '첫 줄\\n둘째 줄\\n셋째 줄\\n넷째 줄' },
                            { id: 'c1', part_type: 'Chorus', part_number: null, lyrics: '후렴 첫 줄\\n후렴 둘째 줄' },
                          ],
                        }],
                      };
                      state.songs = [song, ...state.songs.filter((item) => item.id !== song.id)];
                      preparePresenterService(serviceId);
                      const result = buildLivePraisePayload('테스트 찬양', serviceId);
                      state.presenter.livePraise = {
                        query: '테스트 찬양',
                        draft: '테스트 찬양',
                        active: true,
                        slides: result.slides,
                        index: 0,
                        songId: result.song.id,
                        versionId: result.version.id,
                      };
                      state.presenter.liveScripture = { reference: '', draft: '', active: false, slide: null };
                      state.presenter.safetyBlank = false;
                      publishPresenterState({ force: true });
                      renderPresenterControlState(serviceId);
                    }
                    """,
                    service["id"],
                )
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').livePraise?.active === true",
                    timeout=5000,
                )
                output_page.wait_for_function(
                    "() => document.querySelector('.presenter-slide')?.classList.contains('presenter-slide--song-title')",
                    timeout=5000,
                )
                page.evaluate("(serviceId) => runPresenterAction('next', serviceId)", service["id"])
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').livePraise?.index === 1",
                    timeout=5000,
                )
                output_page.wait_for_function(
                    "() => document.querySelector('.presenter-slide')?.classList.contains('presenter-slide--lyrics')",
                    timeout=5000,
                )
                live_praise_state = page.evaluate(
                    """
                    (() => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      return {
                        active: Boolean(payload.livePraise?.active),
                        index: payload.livePraise?.index ?? -1,
                        slideCount: payload.livePraise?.slides?.length || 0,
                        mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                        activeThumbs: document.querySelectorAll('.svc-slide-thumb.active').length,
                      };
                    })()
                    """
                )
                live_praise_output_state = output_page.evaluate(
                    """
                    (() => ({
                      slideClass: document.querySelector('.presenter-slide')?.className || '',
                      text: document.querySelector('.presenter-slide')?.innerText.trim() || '',
                    }))()
                    """
                )
                if (
                    live_praise_state["active"]
                    and live_praise_state["index"] == 1
                    and live_praise_state["slideCount"] >= 3
                    and live_praise_state["mode"] == "찬양"
                    and live_praise_state["activeThumbs"] == 0
                    and "presenter-slide--lyrics" in live_praise_output_state["slideClass"]
                    and "첫 줄" in live_praise_output_state["text"]
                    and "둘째 줄" in live_praise_output_state["text"]
                ):
                    pass_("presenter-live-praise-transient-output", json.dumps({**live_praise_state, **live_praise_output_state}, ensure_ascii=False))
                else:
                    fail("presenter-live-praise-transient-output", json.dumps({**live_praise_state, **live_praise_output_state}, ensure_ascii=False))

                jump_input = page.locator(f'[data-presenter-jump-input][data-service-id="{service["id"]}"]')
                jump_input.fill("1")
                jump_input.press("Enter")
                output_page.wait_for_function(
                    "() => { const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}'); return payload.index === 0 && payload.safetyBlank !== true; }",
                    timeout=5000,
                )
                output_page.wait_for_function(
                    "() => document.querySelector('.presenter-slide')?.classList.contains('presenter-slide--video')",
                    timeout=5000,
                )
                ready_output_shot = output_page.locator("#presenterOutputRoot").screenshot()
                ready_output_state = output_page.evaluate(
                    """
                    (() => {
                      const slide = document.querySelector('.presenter-slide');
                      return {
                        slideClass: slide?.className || '',
                        elementType: slide?.dataset.elementType || '',
                        layout: slide?.dataset.slideLayout || '',
                        text: slide?.innerText.trim() || '',
                      };
                    })()
                    """
                )
                ready_output_state["centerPixel"] = rgb_at(ready_output_shot, 0.5, 0.5)
                if (
                    "presenter-slide--video" in ready_output_state["slideClass"]
                    and ready_output_state["elementType"] == "video"
                    and ready_output_state["layout"] == "media"
                    and ready_output_state["text"] == ""
                    and is_chromakey_green(tuple(ready_output_state["centerPixel"]))
                ):
                    pass_("presenter-ready-output-raw-chromakey", json.dumps(ready_output_state, ensure_ascii=False))
                else:
                    fail("presenter-ready-output-raw-chromakey", json.dumps(ready_output_state, ensure_ascii=False))

                jump_input.fill("0")
                jump_input.press("Enter")
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').safetyBlank === true",
                    timeout=5000,
                )
                output_page.wait_for_function(
                    "() => document.querySelector('.presenter-slide')?.classList.contains('presenter-slide--blank')",
                    timeout=5000,
                )
                safety_blank_state = output_page.evaluate(
                    """
                    (() => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      const slide = document.querySelector('.presenter-slide');
                      return {
                        index: payload.index,
                        safetyBlank: Boolean(payload.safetyBlank),
                        slideClass: slide?.className || '',
                        elementType: slide?.dataset.elementType || '',
                        layout: slide?.dataset.slideLayout || '',
                        text: slide?.innerText.trim() || '',
                      };
                    })()
                    """
                )
                if (
                    safety_blank_state["safetyBlank"]
                    and "presenter-slide--blank" in safety_blank_state["slideClass"]
                    and safety_blank_state["elementType"] == "blank"
                    and safety_blank_state["layout"] == "blank"
                    and safety_blank_state["text"] == ""
                ):
                    pass_("presenter-invalid-jump-blank", json.dumps(safety_blank_state, ensure_ascii=False))
                else:
                    fail("presenter-invalid-jump-blank", json.dumps(safety_blank_state, ensure_ascii=False))

                safety_blank_controller_state = page.evaluate(
                    """
                    (() => ({
                      inputValue: document.querySelector('[data-presenter-jump-input]')?.value || '',
                      activeThumbs: document.querySelectorAll('.svc-slide-thumb.active').length,
                      activeWraps: document.querySelectorAll('.svc-slide-thumb-wrap.active').length,
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                    }))()
                    """
                )
                if (
                    safety_blank_controller_state["inputValue"] == "0"
                    and safety_blank_controller_state["activeThumbs"] == 0
                    and safety_blank_controller_state["activeWraps"] == 0
                    and safety_blank_controller_state["status"] == "송출 중"
                    and safety_blank_controller_state["mode"] == "빈 화면"
                ):
                    pass_("presenter-safety-blank-controller-preview", json.dumps(safety_blank_controller_state, ensure_ascii=False))
                else:
                    fail("presenter-safety-blank-controller-preview", json.dumps(safety_blank_controller_state, ensure_ascii=False))

                jump_input.fill("2")
                jump_input.press("Enter")
                output_page.wait_for_function(
                    "() => { const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}'); return payload.index === 1 && payload.safetyBlank !== true; }",
                    timeout=10000,
                )

                output_page.keyboard.press("ArrowRight")
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index === 2",
                    timeout=10000,
                )
                channel_state = output_page.evaluate(
                    """
                    (() => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      const text = document.querySelector('.presenter-slide')?.innerText.trim() || '';
                      return {
                        index: payload.index,
                        slideClass: document.querySelector('.presenter-slide')?.className || '',
                        text,
                      };
                    })()
                    """
                )
                controller_state = page.evaluate(
                    """
                    (() => ({
                      index: state.presenter.index,
                      serviceId: state.presenter.serviceId,
                    }))()
                    """
                )
                if channel_state["index"] == 2 and controller_state["index"] == 2:
                    pass_("presenter-output-key-sync", json.dumps({"output": channel_state, "controller": controller_state}, ensure_ascii=False))
                else:
                    fail("presenter-output-key-sync", json.dumps({"output": channel_state, "controller": controller_state}, ensure_ascii=False))

                selection_state = page.evaluate(
                    """
                    () => {
                      const service = {
                        id: '__smoke_presenter_switch_service__',
                        type_id: 'monthly',
                        date: '2026-07-04',
                        title: 'Switch Smoke',
                        leader: '테스트',
                        tags: [],
                      };
                      if (!state.serviceTypes.some((item) => item.id === service.type_id)) {
                        state.serviceTypes.push({ id: service.type_id, name: '월삭예배', sort_order: 1 });
                      }
                      state.services = [
                        service,
                        ...state.services.filter((item) => item.id !== service.id),
                      ];
                      state.serviceItems[service.id] = normalizeServiceItems([
                        {
                          id: '__smoke_presenter_switch_item_1__',
                          service_id: service.id,
                          sort_order: 1,
                          label: '찬양',
                          raw_title: '전환 테스트 찬양',
                          memo: JSON.stringify({
                            slides: ['[Verse 1]\\n전환 후 첫 슬라이드', '[Chorus]\\n전환 후 후렴'],
                          }),
                        },
                      ]);
                      state.module = 'presenter';
                      state.selectedServiceTypeId = service.type_id;
                      state.selectedServiceId = service.id;
                      renderPresenterDetail();
                      renderServiceList();
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      return {
                        switchId: service.id,
                        selectedServiceId: state.selectedServiceId,
                        presenterServiceId: state.presenter.serviceId,
                        outputServiceId: payload.serviceId || '',
                        selectedThumbs: document.querySelectorAll('.svc-slide-thumb').length,
                        selectedActiveThumbs: document.querySelectorAll('.svc-slide-thumb.active').length,
                        status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                        mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                      };
                    }
                    """
                )
                if (
                    selection_state["switchId"] == selection_state["selectedServiceId"]
                    and selection_state["presenterServiceId"] == service["id"]
                    and selection_state["outputServiceId"] == service["id"]
                    and selection_state["selectedThumbs"] >= 2
                    and selection_state["selectedActiveThumbs"] == 0
                    and selection_state["status"] == "다른 예배 송출"
                    and selection_state["mode"] == "다른 예배"
                ):
                    pass_("presenter-service-selection-is-passive", json.dumps(selection_state, ensure_ascii=False))
                else:
                    fail("presenter-service-selection-is-passive", json.dumps(selection_state, ensure_ascii=False))

                page.keyboard.press("Space")
                page.locator(
                    f'.svc-slide-thumb[data-service-id="{selection_state["switchId"]}"][data-presenter-index="1"]'
                ).click()
                page.wait_for_timeout(500)
                other_live_keyboard_state = page.evaluate(
                    """
                    () => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      return {
                        presenterServiceId: state.presenter.serviceId,
                        presenterIndex: state.presenter.index,
                        outputServiceId: payload.serviceId || '',
                        outputIndex: payload.index,
                        status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                        mode: document.querySelector('.svc-presenter-mode')?.textContent.trim() || '',
                      };
                    }
                    """
                )
                if (
                    other_live_keyboard_state["presenterServiceId"] == service["id"]
                    and other_live_keyboard_state["presenterIndex"] == 2
                    and other_live_keyboard_state["outputServiceId"] == service["id"]
                    and other_live_keyboard_state["outputIndex"] == 2
                    and other_live_keyboard_state["status"] == "다른 예배 송출"
                    and other_live_keyboard_state["mode"] == "다른 예배"
                ):
                    pass_("presenter-keyboard-other-live-ignored", json.dumps(other_live_keyboard_state, ensure_ascii=False))
                else:
                    fail("presenter-keyboard-other-live-ignored", json.dumps(other_live_keyboard_state, ensure_ascii=False))

                controller_esc_state = page.evaluate(
                    """
                    () => {
                      const previousModule = state.module;
                      const previousSelectedServiceId = state.selectedServiceId;
                      const previousPresenterServiceId = state.presenter.serviceId;
                      const previousExitArmedAt = state.presenter.exitArmedAt;
                      const originalStopPresenterOutput = stopPresenterOutput;
                      let stoppedServiceId = '';
                      let preventCount = 0;
                      stopPresenterOutput = (serviceId) => {
                        stoppedServiceId = serviceId || '';
                      };
                      state.module = 'presenter';
                      state.selectedServiceId = '__smoke_other_selected__';
                      state.presenter.serviceId = previousPresenterServiceId || '__smoke_active_presenter__';
                      state.presenter.exitArmedAt = 0;
                      const makeEvent = () => ({
                        key: 'Escape',
                        target: document.body,
                        metaKey: false,
                        ctrlKey: false,
                        altKey: false,
                        preventDefault() { preventCount += 1; },
                      });
                      const firstHandled = handlePresenterShortcut(makeEvent());
                      const armedAfterFirst = state.presenter.exitArmedAt > 0;
                      const secondHandled = handlePresenterShortcut(makeEvent());
                      const armedAfterSecond = state.presenter.exitArmedAt > 0;
                      stopPresenterOutput = originalStopPresenterOutput;
                      state.module = previousModule;
                      state.selectedServiceId = previousSelectedServiceId;
                      state.presenter.serviceId = previousPresenterServiceId;
                      state.presenter.exitArmedAt = previousExitArmedAt || 0;
                      return {
                        firstHandled,
                        secondHandled,
                        armedAfterFirst,
                        armedAfterSecond,
                        stoppedServiceId,
                        expectedServiceId: previousPresenterServiceId,
                        preventCount,
                      };
                    }
                    """
                )
                if (
                    controller_esc_state["firstHandled"]
                    and controller_esc_state["secondHandled"]
                    and controller_esc_state["armedAfterFirst"]
                    and controller_esc_state["armedAfterSecond"]
                    and controller_esc_state["stoppedServiceId"] == controller_esc_state["expectedServiceId"]
                    and controller_esc_state["preventCount"] == 2
                ):
                    pass_("presenter-controller-escape-stop-other-service", json.dumps(controller_esc_state, ensure_ascii=False))
                else:
                    fail("presenter-controller-escape-stop-other-service", json.dumps(controller_esc_state, ensure_ascii=False))

                switch_state = page.evaluate(
                    """
                    (switchId) => {
                      state.presenter.index = 99;
                      state.presenter.liveScripture = {
                        reference: '요 3:16',
                        draft: '요 3:16',
                        active: true,
                        slide: { text: '테스트 본문' },
                      };
                      preparePresenterService(switchId);
                      publishPresenterState({ force: true });
                      renderPresenterControlState(switchId);
                      const payload = presenterStatePayload(switchId);
                      return {
                        serviceId: state.presenter.serviceId,
                        index: state.presenter.index,
                        liveScriptureActive: Boolean(state.presenter.liveScripture.active),
                        slides: state.presenter.slides.length,
                        payloadIndex: payload.index,
                        activeThumbs: document.querySelectorAll('.svc-slide-thumb.active').length,
                        status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      };
                    }
                    """,
                    selection_state["switchId"],
                )
                output_page.wait_for_function(
                    "(serviceId) => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').serviceId === serviceId",
                    arg=selection_state["switchId"],
                    timeout=5000,
                )
                switch_output_state = output_page.evaluate(
                    """
                    (() => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      const root = document.getElementById('presenterOutputRoot');
                      return {
                        serviceId: payload.serviceId || '',
                        index: payload.index,
                        hasSlide: Boolean(root?.querySelector('.presenter-slide')),
                      };
                    })()
                    """
                )
                if (
                    switch_state["serviceId"] == selection_state["switchId"]
                    and switch_state["index"] == 0
                    and not switch_state["liveScriptureActive"]
                    and switch_state["slides"] >= 2
                    and switch_state["payloadIndex"] == 0
                    and switch_state["activeThumbs"] == 1
                    and switch_state["status"] == "송출 중"
                    and switch_output_state["serviceId"] == selection_state["switchId"]
                    and switch_output_state["index"] == 0
                    and switch_output_state["hasSlide"]
                ):
                    pass_(
                        "presenter-service-switch-reset",
                        json.dumps({"controller": switch_state, "output": switch_output_state}, ensure_ascii=False),
                    )
                else:
                    fail(
                        "presenter-service-switch-reset",
                        json.dumps({"controller": switch_state, "output": switch_output_state}, ensure_ascii=False),
                    )

                page.keyboard.press("Space")
                output_page.wait_for_function(
                    "() => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').index === 1",
                    timeout=5000,
                )
                active_keyboard_state = page.evaluate(
                    """
                    (() => {
                      const payload = JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}');
                      return {
                        presenterServiceId: state.presenter.serviceId,
                        presenterIndex: state.presenter.index,
                        outputServiceId: payload.serviceId || '',
                        outputIndex: payload.index,
                        status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                      };
                    })()
                    """
                )
                if (
                    active_keyboard_state["presenterServiceId"] == selection_state["switchId"]
                    and active_keyboard_state["presenterIndex"] == 1
                    and active_keyboard_state["outputServiceId"] == selection_state["switchId"]
                    and active_keyboard_state["outputIndex"] == 1
                    and active_keyboard_state["status"] == "송출 중"
                ):
                    pass_("presenter-keyboard-active-service", json.dumps(active_keyboard_state, ensure_ascii=False))
                else:
                    fail("presenter-keyboard-active-service", json.dumps(active_keyboard_state, ensure_ascii=False))

                fullscreen_ready_state = page.evaluate(
                    """
                    () => {
                      const service = {
                        id: '__smoke_fullscreen_ready_image_service__',
                        type_id: 'friday',
                        date: '2026-07-03',
                        title: 'Fullscreen Ready Image',
                        leader: '테스트',
                        tags: [],
                      };
                      if (!state.serviceTypes.some((item) => item.id === service.type_id)) {
                        state.serviceTypes.push({ id: service.type_id, name: '금요기도회', sort_order: 2 });
                      }
                      state.services = [
                        service,
                        ...state.services.filter((item) => item.id !== service.id),
                      ];
                      state.serviceItems[service.id] = normalizeServiceItems([
                        {
                          id: '__smoke_fullscreen_ready_image_item__',
                          service_id: service.id,
                          sort_order: 1,
                          label: '준비',
                          raw_title: '준비',
                          memo: JSON.stringify({
                            elementType: 'image',
                            asset: {
                              kind: 'image',
                              name: '첫 슬라이드',
                              url: 'assets/worship-backgrounds/26-A1.png',
                            },
                          }),
                        },
                        {
                          id: '__smoke_fullscreen_ready_image_song__',
                          service_id: service.id,
                          sort_order: 2,
                          label: '찬양',
                          raw_title: '금요기도회 찬양',
                          memo: JSON.stringify({
                            slides: ['[Verse 1]\\n보이지 않아도\\n주님만 의지해'],
                          }),
                        },
                      ]);
                      preparePresenterService(service.id);
                      const first = state.presenter.slides[0] || {};
                      return {
                        chromakey: presenterServiceUsesChromakey(service),
                        slideCount: state.presenter.slides.length,
                        type: first.type || '',
                        elementType: first.elementType || '',
                        layout: first.layout || '',
                        imageSrc: first.imageSrc || '',
                        title: first.title || '',
                      };
                    }
                    """
                )
                if (
                    fullscreen_ready_state["chromakey"] is False
                    and fullscreen_ready_state["slideCount"] >= 2
                    and fullscreen_ready_state["type"] == "image"
                    and fullscreen_ready_state["elementType"] == "image"
                    and fullscreen_ready_state["layout"] == "media"
                    and fullscreen_ready_state["imageSrc"].endswith("assets/worship-backgrounds/26-A1.png")
                ):
                    pass_("presenter-fullscreen-ready-image", json.dumps(fullscreen_ready_state, ensure_ascii=False))
                else:
                    fail("presenter-fullscreen-ready-image", json.dumps(fullscreen_ready_state, ensure_ascii=False))

                no_chromakey_payload = page.evaluate(
                    """
                    () => {
                      const missingBackgroundFile = '26-A2.png';
                      WORSHIP_BACKGROUND_STATIC_FILES.delete(missingBackgroundFile);
                      delete state.worshipBackgroundRegistry[missingBackgroundFile];
                      const service = {
                        id: '__smoke_presenter_background_service__',
                        type_id: 'friday',
                        date: '2026-03-06',
                        title: 'No Chroma Smoke',
                        leader: '테스트',
                        tags: [],
                      };
                      if (!state.serviceTypes.some((item) => item.id === service.type_id)) {
                        state.serviceTypes.push({ id: service.type_id, name: '금요기도회', sort_order: 2 });
                      }
                      state.services = [
                        service,
                        ...state.services.filter((item) => item.id !== service.id),
                      ];
                      state.serviceItems[service.id] = normalizeServiceItems([
                        {
                          id: '__smoke_presenter_background_item__',
                          service_id: service.id,
                          sort_order: 1,
                          label: '찬양',
                          raw_title: '금요기도회 찬양',
                          memo: JSON.stringify({
                            slides: ['[Verse 1]\\n보이지 않아도\\n주님만 의지해'],
                          }),
                        },
                      ]);
                      preparePresenterService(service.id);
                      const lyricsIndex = state.presenter.slides.findIndex((slide) => slide.type === 'lyrics');
                      state.presenter.index = lyricsIndex >= 0
                        ? lyricsIndex
                        : Math.min(2, Math.max(state.presenter.slides.length - 1, 0));
                      state.presenter.liveScripture = { reference: "", draft: "", active: false, slide: null };
                      state.presenter.livePraise = { query: "", draft: "", active: false, slides: [], index: 0, songId: "", versionId: "" };
                      state.module = 'presenter';
                      state.selectedServiceTypeId = service.type_id;
                      state.selectedServiceId = service.id;
                      renderPresenterDetail();
                      publishPresenterState({ force: true });
                      const payload = presenterStatePayload(service.id);
                      WORSHIP_BACKGROUND_STATIC_FILES.add(missingBackgroundFile);
                      return payload;
                    }
                    """
                )
                output_page.wait_for_function(
                    "(serviceId) => JSON.parse(localStorage.getItem('mindex.presenter.state') || '{}').serviceId === serviceId",
                    arg=no_chromakey_payload["serviceId"],
                    timeout=5000,
                )
                no_chromakey_state = output_page.evaluate(
                    """
                    (() => {
                      const root = document.getElementById('presenterOutputRoot');
                      const slide = root?.querySelector('.presenter-slide');
                      const styles = root ? getComputedStyle(root) : null;
                      return {
                        serviceType: root?.dataset.serviceType || '',
                        outputTheme: root?.dataset.outputTheme || '',
                        noChromakey: root?.classList.contains('no-chromakey') || false,
                        hasBackground: root?.classList.contains('has-background') || false,
                        slideClass: slide ? [...slide.classList].find((name) => name.startsWith('presenter-slide--') && name !== 'presenter-slide') : '',
                        elementType: slide?.dataset.elementType || '',
                        layout: slide?.dataset.slideLayout || '',
                        inlineBackground: root?.style.getPropertyValue('--presenter-bg-image') || '',
                        computedBackground: styles?.backgroundImage || '',
                        backgroundColor: styles?.backgroundColor || '',
                        text: slide?.innerText.trim() || '',
                        overflow: Math.max(
                          document.documentElement.scrollWidth - window.innerWidth,
                          document.documentElement.scrollHeight - window.innerHeight,
                          document.body.scrollWidth - window.innerWidth,
                          document.body.scrollHeight - window.innerHeight
                        ),
                      };
                    })()
                    """
                )
                if (
                    no_chromakey_payload["chromakey"] is False
                    and no_chromakey_payload["backgroundImage"] == ""
                    and no_chromakey_state["serviceType"] == no_chromakey_payload["serviceType"]
                    and no_chromakey_state["noChromakey"]
                    and not no_chromakey_state["hasBackground"]
                    and no_chromakey_state["backgroundColor"] == "rgb(0, 0, 0)"
                    and no_chromakey_state["inlineBackground"] == ""
                    and no_chromakey_state["slideClass"] == "presenter-slide--lyrics"
                    and no_chromakey_state["elementType"] == "praise"
                    and no_chromakey_state["layout"] == "lower_bar_text"
                    and no_chromakey_state["overflow"] <= 2
                ):
                    pass_("presenter-output-no-chromakey", json.dumps(no_chromakey_state, ensure_ascii=False))
                else:
                    fail(
                        "presenter-output-no-chromakey",
                        json.dumps({"payload": no_chromakey_payload, "output": no_chromakey_state}, ensure_ascii=False),
                    )

                current_presenter_index = page.evaluate("state.presenter.index")
                page.wait_for_function(
                    "(index) => Boolean(document.querySelector(`.svc-slide-thumb[data-presenter-index=\"${index}\"] .svc-slide-mini-output`))",
                    arg=current_presenter_index,
                    timeout=5000,
                )
                page.wait_for_timeout(250)
                no_chromakey_thumb_shot = screenshot_with_retry(page, page.locator(f'.svc-slide-thumb[data-presenter-index="{current_presenter_index}"] .svc-slide-mini-output').first)
                no_chromakey_output_shot = output_page.locator("#presenterOutputRoot").screenshot()
                no_chromakey_pixels = {
                    "thumbTop": rgb_at(no_chromakey_thumb_shot, 0.5, 0.16),
                    "thumbBottom": rgb_at(no_chromakey_thumb_shot, 0.5, 0.92),
                    "outputTop": rgb_at(no_chromakey_output_shot, 0.5, 0.16),
                    "outputBottom": rgb_at(no_chromakey_output_shot, 0.5, 0.92),
                }
                if not any(is_chromakey_green(rgb) for rgb in no_chromakey_pixels.values()):
                    pass_("presenter-output-pixel-match-no-chromakey", json.dumps(no_chromakey_pixels, ensure_ascii=False))
                else:
                    fail("presenter-output-pixel-match-no-chromakey", json.dumps(no_chromakey_pixels, ensure_ascii=False))

                explicit_background_payload = page.evaluate(
                    """
                    () => {
                      const service = {
                        id: '__smoke_presenter_explicit_background_service__',
                        type_id: 'youth',
                        date: '2026-07-05',
                        title: 'Explicit Background Smoke',
                        leader: '테스트',
                        tags: [],
                        _worshipSourceRef: { presenter_background: '26-B2.png' },
                      };
                      if (!state.serviceTypes.some((item) => item.id === service.type_id)) {
                        state.serviceTypes.push({
                          id: service.type_id,
                          name: '청소년부 예배',
                          sort_order: 5,
                          _worship: true,
                          _worshipOutputContext: 'clean',
                          _worshipChromakey: false,
                        });
                      }
                      state.services = [
                        service,
                        ...state.services.filter((item) => item.id !== service.id),
                      ];
                      state.serviceItems[service.id] = normalizeServiceItems([
                        {
                          id: '__smoke_presenter_explicit_background_item__',
                          service_id: service.id,
                          sort_order: 1,
                          label: '찬양',
                          raw_title: '청소년부 찬양',
                          memo: JSON.stringify({
                            slides: ['[Verse 1]\\n주님만 바라봅니다'],
                          }),
                        },
                      ]);
                      preparePresenterService(service.id);
                      return presenterStatePayload(service.id);
                    }
                    """
                )
                if (
                    explicit_background_payload["chromakey"] is False
                    and explicit_background_payload["backgroundImage"].endswith("assets/worship-backgrounds/26-B2.png")
                    and all("26-B4" not in source for source in explicit_background_payload["backgroundImages"])
                ):
                    pass_("presenter-output-explicit-background", json.dumps(explicit_background_payload, ensure_ascii=False))
                else:
                    fail("presenter-output-explicit-background", json.dumps(explicit_background_payload, ensure_ascii=False))

                clean_blank_background_state = output_page.evaluate(
                    """
                    (payload) => {
                      const blankIndex = payload.slides.findIndex((slide) => slide?.layout === 'blank' && slide?.autoTrailingBlank);
                      renderPresenterOutput({ ...payload, index: blankIndex, safetyBlank: false }, {});
                      const root = document.getElementById('presenterOutputRoot');
                      const slide = root?.querySelector('.presenter-slide');
                      const cleanBlank = {
                        blankIndex,
                        hasBackground: root?.classList.contains('has-background') || false,
                        isBlank: root?.classList.contains('is-blank') || false,
                        noChromakey: root?.classList.contains('no-chromakey') || false,
                        inlineBackground: root?.style.getPropertyValue('--presenter-bg-image') || '',
                        slideClass: slide?.className || '',
                        text: slide?.innerText.trim() || '',
                      };
                      renderPresenterOutput({ ...payload, index: blankIndex, safetyBlank: true }, {});
                      const safetyRoot = document.getElementById('presenterOutputRoot');
                      const safetySlide = safetyRoot?.querySelector('.presenter-slide');
                      return {
                        cleanBlank,
                        safetyBlank: {
                          hasBackground: safetyRoot?.classList.contains('has-background') || false,
                          isBlank: safetyRoot?.classList.contains('is-blank') || false,
                          noChromakey: safetyRoot?.classList.contains('no-chromakey') || false,
                          inlineBackground: safetyRoot?.style.getPropertyValue('--presenter-bg-image') || '',
                          slideClass: safetySlide?.className || '',
                          text: safetySlide?.innerText.trim() || '',
                        },
                      };
                    }
                    """,
                    explicit_background_payload,
                )
                if (
                    clean_blank_background_state["cleanBlank"]["blankIndex"] >= 0
                    and clean_blank_background_state["cleanBlank"]["hasBackground"]
                    and not clean_blank_background_state["cleanBlank"]["isBlank"]
                    and clean_blank_background_state["cleanBlank"]["noChromakey"]
                    and "26-B2.png" in clean_blank_background_state["cleanBlank"]["inlineBackground"]
                    and "presenter-slide--blank" in clean_blank_background_state["cleanBlank"]["slideClass"]
                    and clean_blank_background_state["cleanBlank"]["text"] == ""
                    and not clean_blank_background_state["safetyBlank"]["hasBackground"]
                    and clean_blank_background_state["safetyBlank"]["isBlank"]
                    and clean_blank_background_state["safetyBlank"]["inlineBackground"] == ""
                    and "presenter-slide--blank" in clean_blank_background_state["safetyBlank"]["slideClass"]
                    and clean_blank_background_state["safetyBlank"]["text"] == ""
                ):
                    pass_("presenter-clean-blank-keeps-background", json.dumps(clean_blank_background_state, ensure_ascii=False))
                else:
                    fail("presenter-clean-blank-keeps-background", json.dumps(clean_blank_background_state, ensure_ascii=False))
                page.evaluate(
                    """
                    (serviceId) => {
                      state.module = "presenter";
                      state.selectedServiceId = serviceId;
                      preparePresenterService(serviceId);
                      state.presenter.outputConnectedAt = Date.now();
                      renderPresenterDetail();
                      publishPresenterState({ force: true });
                    }
                    """,
                    service["id"],
                )

                theme_preview_state = page.evaluate(
                    """
                    (() => {
                      const host = document.createElement('div');
                      host.style.cssText = 'position:fixed;left:-10000px;top:0;width:184px;height:104px;';
                      host.innerHTML = `
                        <span id="miniFormal" class="svc-slide-mini-output" data-output-theme="formal"></span>
                        <span id="miniChildren" class="svc-slide-mini-output" data-output-theme="children">
                          <span class="svc-slide-mini-canvas presenter-output-root" data-output-theme="children">
                            <section class="presenter-slide presenter-slide--song-title" data-element-type="praise" data-slide-layout="lower_bar_text">
                              <div class="presenter-slide-text"><span>♪ 어린이 찬양</span></div>
                            </section>
                          </span>
                        </span>
                        <span id="miniYouth" class="svc-slide-mini-output" data-output-theme="youth"></span>
                        <span id="miniYoungAdult" class="svc-slide-mini-output" data-output-theme="young-adult"></span>
                        <span id="miniChildrenBg" class="svc-slide-mini-output no-chromakey has-background" data-output-theme="children" style="--presenter-bg-image: url('assets/worship-backgrounds/26-C1.png')"></span>
                      `;
                      document.body.appendChild(host);
                      const css = (id) => getComputedStyle(host.querySelector(`#${id}`));
                      const childrenText = getComputedStyle(host.querySelector('#miniChildren .presenter-slide-text'));
                      const result = {
                        formalBg: css('miniFormal').backgroundColor,
                        childrenBgImage: css('miniChildren').backgroundImage,
                        childrenTextColor: childrenText.color,
                        youthBgImage: css('miniYouth').backgroundImage,
                        youngAdultBgImage: css('miniYoungAdult').backgroundImage,
                        childrenHasBackgroundImage: css('miniChildrenBg').backgroundImage,
                      };
                      host.remove();
                      return result;
                    })()
                    """
                )
                if (
                    theme_preview_state["formalBg"] == "rgb(16, 18, 15)"
                    and "radial-gradient" in theme_preview_state["childrenBgImage"]
                    and theme_preview_state["childrenTextColor"] == "rgb(85, 51, 0)"
                    and "linear-gradient" in theme_preview_state["youthBgImage"]
                    and "radial-gradient" in theme_preview_state["youngAdultBgImage"]
                    and "26-C1.png" in theme_preview_state["childrenHasBackgroundImage"]
                ):
                    pass_("presenter-controller-preview-theme-parity", json.dumps(theme_preview_state, ensure_ascii=False))
                else:
                    fail("presenter-controller-preview-theme-parity", json.dumps(theme_preview_state, ensure_ascii=False))

                output_page.keyboard.press("Escape")
                output_page.wait_for_timeout(120)
                output_page.keyboard.press("Escape")
                page.wait_for_function(
                    "() => state.presenter.outputConnectedAt === 0 && !isPresenterOutputWindowOpen()",
                    timeout=5000,
                )
                esc_stop_state = page.evaluate(
                    """
                    (() => ({
                      outputConnectedAt: state.presenter.outputConnectedAt,
                      outputWindowCleared: state.presenter.outputWindow === null,
                      monitorCleared: state.presenter.outputWindowMonitor === null,
                      open: isPresenterOutputWindowOpen(),
                      status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                    }))()
                    """
                )
                if (
                    esc_stop_state["outputConnectedAt"] == 0
                    and esc_stop_state["outputWindowCleared"]
                    and esc_stop_state["monitorCleared"]
                    and not esc_stop_state["open"]
                    and esc_stop_state["status"] == "준비"
                ):
                    pass_("presenter-output-escape-stop", json.dumps(esc_stop_state, ensure_ascii=False))
                else:
                    fail("presenter-output-escape-stop", json.dumps(esc_stop_state, ensure_ascii=False))
                if not output_page.is_closed():
                    output_page.close()
                page.evaluate(
                    """
                    (serviceId) => {
                      state.module = "presenter";
                      state.selectedServiceId = serviceId;
                      preparePresenterService(serviceId);
                      state.presenter.outputWindow = null;
                      state.presenter.outputConnectedAt = 0;
                      state.presenter.outputClientId = "";
                      stopPresenterOutputWindowMonitor();
                      publishPresenterState({ force: true });
                      renderPresenterDetail();
                      renderPresenterControlState(serviceId);
                    }
                    """,
                    service["id"],
                )
                disconnect_page = context.new_page()
                disconnect_page.set_viewport_size({"width": 1280, "height": 720})
                disconnect_page.on("pageerror", lambda error: page_errors.append(f"disconnect output: {error}"))
                disconnect_page.on("response", lambda response: record_response(response, "disconnect output"))
                disconnect_page.on(
                    "console",
                    lambda msg: console_messages.append(f"disconnect output {msg.type}: {msg.text}")
                    if msg.type in ("error", "warning")
                    else None,
                )
                disconnect_page.goto(presenter_output_url(app_url), wait_until="load")
                disconnect_page.wait_for_selector("#presenterOutputRoot", timeout=5000)
                page.wait_for_function(
                    "() => state.presenter.outputConnectedAt > 0 && isPresenterOutputWindowOpen()",
                    timeout=5000,
                )
                disconnect_page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
                page.wait_for_function(
                    "() => state.presenter.outputConnectedAt === 0 && !isPresenterOutputWindowOpen()",
                    timeout=5000,
                )
                disconnect_state = page.evaluate(
                    """
                    (() => ({
                      outputConnectedAt: state.presenter.outputConnectedAt,
                      outputWindowCleared: state.presenter.outputWindow === null,
                      monitorCleared: state.presenter.outputWindowMonitor === null,
                      open: isPresenterOutputWindowOpen(),
                    }))()
                    """
                )
                if (
                    disconnect_state["outputConnectedAt"] == 0
                    and disconnect_state["outputWindowCleared"]
                    and disconnect_state["monitorCleared"]
                    and not disconnect_state["open"]
                ):
                    pass_("presenter-output-pagehide-disconnect", json.dumps(disconnect_state, ensure_ascii=False))
                else:
                    fail("presenter-output-pagehide-disconnect", json.dumps(disconnect_state, ensure_ascii=False))
                if not disconnect_page.is_closed():
                    disconnect_page.close()
                monitor_state = page.evaluate(
                    """
                    () => new Promise((resolve) => {
                      const fakeWindow = { closed: true };
                      state.presenter.outputWindow = fakeWindow;
                      startPresenterOutputWindowMonitor(state.presenter.serviceId);
                      window.setTimeout(() => {
                        resolve({
                          outputWindowCleared: state.presenter.outputWindow === null,
                          monitorCleared: state.presenter.outputWindowMonitor === null,
                          connectedAt: state.presenter.outputConnectedAt,
                          open: isPresenterOutputWindowOpen(),
                          status: document.querySelector('.svc-presenter-status')?.textContent.trim() || '',
                        });
                      }, 4300);
                    })
                    """
                )
                if (
                    monitor_state["outputWindowCleared"]
                    and monitor_state["monitorCleared"]
                    and monitor_state["connectedAt"] == 0
                    and not monitor_state["open"]
                    and monitor_state["status"] == "준비"
                ):
                    pass_("presenter-output-window-monitor", json.dumps(monitor_state, ensure_ascii=False))
                else:
                    fail("presenter-output-window-monitor", json.dumps(monitor_state, ensure_ascii=False))

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
