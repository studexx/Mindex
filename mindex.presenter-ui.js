function renderPresenterScreenControl() {
  if (state.presenter.screens.length) {
    return `
      <label class="svc-presenter-screen-select">
        <i data-lucide="monitor"></i>
        <select data-presenter-screen-select>
          <option value="">${escapeHtml(uiText("presenter.option.auto"))}</option>
          ${state.presenter.screens.map((screen) => `
            <option value="${escapeAttr(screen.key)}" ${state.presenter.selectedScreenId === screen.key ? "selected" : ""}>
              ${escapeHtml(screen.label)}
            </option>
          `).join("")}
        </select>
      </label>`;
  }
  return `
    <button class="icon-btn" type="button" data-presenter-action="detect-screens" aria-label="${escapeAttr(uiText("presenter.action.detectDisplays"))}" title="${escapeAttr(uiText("presenter.action.detectDisplays"))}">
      <i data-lucide="monitor"></i>
      <span class="svc-presenter-screen-label">화면 감지</span>
    </button>`;
}

function renderPresenterAlwaysOnTopControl() {
  const supported = Boolean(window.mindexElectron?.setPresenterAlwaysOnTop);
  return `
    <label class="svc-presenter-pin-toggle${supported ? "" : " is-unavailable"}" title="${supported ? "출력 창을 항상 위에 표시" : "웹 버전에서는 항상 위 표시를 지원하지 않습니다"}">
      <input type="checkbox" data-presenter-always-on-top ${supported && state.presenter.alwaysOnTop ? "checked" : ""} />
      <span class="svc-presenter-pin-track" aria-hidden="true"></span>
      <span>항상 위</span>
    </label>`;
}

function setPresenterAlwaysOnTopPreference(enabled) {
  const updater = window.mindexElectron?.setPresenterAlwaysOnTop;
  if (!updater) {
    state.presenter.alwaysOnTop = false;
    safeStorageRemove("local", PRESENTER_ALWAYS_ON_TOP_STORAGE_KEY);
    showToast("웹 버전에서는 항상 위 표시를 지원하지 않습니다.", "info");
    renderPresenterControlState(presenterViewServiceId());
    return;
  }
  state.presenter.alwaysOnTop = Boolean(enabled);
  safeStorageSet("local", PRESENTER_ALWAYS_ON_TOP_STORAGE_KEY, state.presenter.alwaysOnTop ? "true" : "false");
  updater({ enabled: state.presenter.alwaysOnTop }).catch((error) => {
    console.warn("Could not update presenter always-on-top state.", error);
  });
  renderPresenterControlState(presenterViewServiceId());
}

function renderPresenterHelpControl() {
  const rows = [
    ["송출 시작 / 송출 종료", "출력 창 열기 / 닫기"],
    ["Space / →", "다음 슬라이드"],
    ["←", "이전 슬라이드"],
    ["번호 + Enter", "해당 슬라이드로 이동"],
    ["0 + Enter", "빈 화면"],
    ["범위 밖 번호", "현재 화면 유지"],
    ["Esc Esc", "프레젠터 종료"],
    ["실시간 성구 송출", "해당 순서에서 성구 입력"],
  ];
  return `
    <details class="svc-presenter-help" data-presenter-help>
      <summary class="icon-btn" aria-label="${escapeAttr(uiText("presenter.action.help"))}" title="${escapeAttr(uiText("presenter.action.help"))}">
        <i data-lucide="circle-help"></i>
      </summary>
      <div class="svc-presenter-help-panel" role="dialog" aria-label="${escapeAttr(uiText("presenter.help.title"))}">
        <div class="svc-presenter-help-head">
          <strong>${escapeHtml(uiText("presenter.help.title"))}</strong>
          <small>출력 창은 앱 제어로만 전체화면 전환합니다</small>
        </div>
        <dl>
          ${rows.map(([key, value]) => `
            <div>
              <dt>${escapeHtml(key)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>`).join("")}
        </dl>
      </div>
    </details>`;
}

function renderServicePresenterControls(service, slides, active, index) {
  const boardKey = presenterControlBoardKey(service, slides, active, presenterServiceUsesChromakey(service));
  return `
    <section id="servicePresenterControls" class="${escapeAttr(presenterControlsClassName(active, presenterServiceUsesChromakey(service)))}" aria-label="${escapeAttr(uiText("presenter.controls"))}" data-board-key="${escapeAttr(boardKey)}" data-service-id="${escapeAttr(service.id)}">
      <div class="svc-presenter-workspace">
        <div class="svc-presenter-board-column">
          ${renderPresenterSlideBoard(slides, presenterBoardActiveIndex(slides, active, index), service.id)}
        </div>
      </div>
    </section>`;
}

function renderPresenterRightSidebar(service, slides, active, index) {
  if (!service?.id) return "";
  return `
    <div class="svc-presenter-side-panel" data-presenter-right-sidebar data-service-id="${escapeAttr(service.id)}">
      ${renderPresenterControlsTop(service, slides, active, index)}
      ${renderPresenterServiceInputRail(service)}
    </div>`;
}

function renderPresenterRightSidebarToggle(options = {}) {
  const open = presenterRightSidebarIsOpen();
  const label = options.label || (open ? "컨트롤러 닫기" : "컨트롤러 열기");
  const icon = options.icon || "panel-right";
  return `
    <button class="icon-btn svc-right-sidebar-toggle${open ? " is-active" : ""}" type="button" data-presenter-right-sidebar-toggle aria-pressed="${escapeAttr(String(open))}" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">
      <i data-lucide="${escapeAttr(icon)}"></i>
    </button>`;
}

function renderPresenterServiceInputRail(service) {
  const draft = state.presenterPreparationDrafts[service.id] || "";
  const examples = presenterPreparationPlaceholderForService(service);
  const applying = state.presenterPreparationApplyingServiceIds.has(service.id);
  const placeholder = examples || "찬양1 곡명\n대표기도 이름 직분\n성경봉독 히 10:38-39\n말씀 \"설교 제목\"";
  return `
    <aside class="svc-presenter-input-rail" aria-label="예배 입력">
      <header class="svc-presenter-input-rail-head">
        <span>예배 입력</span>
        <small>빠른 반영</small>
      </header>
      <section class="svc-presenter-preparation-input">
        <textarea class="svc-presenter-preparation-text" data-presenter-preparation-input data-service-id="${escapeAttr(service.id)}" rows="5" placeholder="${escapeAttr(placeholder)}" aria-label="예배 준비 입력">${escapeHtml(draft)}</textarea>
        <div class="svc-presenter-preparation-actions">
          <button class="svc-presenter-preparation-apply" type="button" data-presenter-preparation-apply data-service-id="${escapeAttr(service.id)}" ${applying ? "disabled" : ""}>
            <i data-lucide="wand-sparkles"></i>
            <span>${applying ? "반영 중" : "반영 (Enter 2번)"}</span>
          </button>
        </div>
      </section>
    </aside>`;
}
