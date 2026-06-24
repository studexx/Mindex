const PART_TYPES = [
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Coda",
];

const FORM_ADD_LABELS = {
  Verse: "V",
  "Pre-Chorus": "PC",
  Chorus: "C",
  Bridge: "B",
  Coda: "Coda",
};

const PRAISE_TYPES = ["hymn", "ccm"];
const PROMOTED_SONG_METADATA_COLUMNS = {
  otherTitle: "other_title",
  praiseTypes: "praise_types",
  artist: "artist",
  lyricist: "lyricist",
  composer: "composer",
  translator: "translator",
  album: "album",
  track: "track",
};
const META_SEPARATOR = "; ";
const BIBLE_TEXT_SEARCH_PAGE_SIZE = 50;

const BIBLE_CHAPTER_COUNTS = {};

const KOREAN_BIBLE_BOOK_ABBREVIATIONS = {
  GEN: "창",
  EXO: "출",
  LEV: "레",
  NUM: "민",
  DEU: "신",
  JOS: "수",
  JDG: "삿",
  RUT: "룻",
  "1SA": "삼상",
  "2SA": "삼하",
  "1KI": "왕상",
  "2KI": "왕하",
  "1CH": "대상",
  "2CH": "대하",
  EZR: "스",
  NEH: "느",
  EST: "에",
  JOB: "욥",
  PSA: "시",
  PRO: "잠",
  ECC: "전",
  SNG: "아",
  ISA: "사",
  JER: "렘",
  LAM: "애",
  EZK: "겔",
  DAN: "단",
  HOS: "호",
  JOL: "욜",
  AMO: "암",
  OBA: "옵",
  JON: "욘",
  MIC: "미",
  NAM: "나",
  HAB: "합",
  ZEP: "습",
  HAG: "학",
  ZEC: "슥",
  MAL: "말",
  MAT: "마",
  MRK: "막",
  LUK: "눅",
  JHN: "요",
  ACT: "행",
  ROM: "롬",
  "1CO": "고전",
  "2CO": "고후",
  GAL: "갈",
  EPH: "엡",
  PHP: "빌",
  COL: "골",
  "1TH": "살전",
  "2TH": "살후",
  "1TI": "딤전",
  "2TI": "딤후",
  TIT: "딛",
  PHM: "몬",
  HEB: "히",
  JAS: "약",
  "1PE": "벧전",
  "2PE": "벧후",
  "1JN": "요일",
  "2JN": "요이",
  "3JN": "요삼",
  JUD: "유",
  REV: "계",
};

const ENGLISH_BIBLE_BOOK_ABBREVIATIONS = {
  GEN: "Gen",
  EXO: "Exod",
  LEV: "Lev",
  NUM: "Num",
  DEU: "Deut",
  JOS: "Josh",
  JDG: "Judg",
  RUT: "Ruth",
  "1SA": "1 Sam",
  "2SA": "2 Sam",
  "1KI": "1 Kgs",
  "2KI": "2 Kgs",
  "1CH": "1 Chr",
  "2CH": "2 Chr",
  EZR: "Ezra",
  NEH: "Neh",
  EST: "Esth",
  JOB: "Job",
  PSA: "Ps",
  PRO: "Prov",
  ECC: "Eccl",
  SNG: "Song",
  ISA: "Isa",
  JER: "Jer",
  LAM: "Lam",
  EZK: "Ezek",
  DAN: "Dan",
  HOS: "Hos",
  JOL: "Joel",
  AMO: "Amos",
  OBA: "Obad",
  JON: "Jonah",
  MIC: "Mic",
  NAM: "Nah",
  HAB: "Hab",
  ZEP: "Zeph",
  HAG: "Hag",
  ZEC: "Zech",
  MAL: "Mal",
  MAT: "Matt",
  MRK: "Mark",
  LUK: "Luke",
  JHN: "John",
  ACT: "Acts",
  ROM: "Rom",
  "1CO": "1 Cor",
  "2CO": "2 Cor",
  GAL: "Gal",
  EPH: "Eph",
  PHP: "Phil",
  COL: "Col",
  "1TH": "1 Thess",
  "2TH": "2 Thess",
  "1TI": "1 Tim",
  "2TI": "2 Tim",
  TIT: "Titus",
  PHM: "Philem",
  HEB: "Heb",
  JAS: "Jas",
  "1PE": "1 Pet",
  "2PE": "2 Pet",
  "1JN": "1 John",
  "2JN": "2 John",
  "3JN": "3 John",
  JUD: "Jude",
  REV: "Rev",
};

const BIBLE_BOOK_ALIASES = {
  GEN: ["gen", "ge", "gn"],
  EXO: ["exo", "exod", "ex"],
  LEV: ["lev", "le"],
  NUM: ["num", "nu", "nm"],
  DEU: ["deut", "deu", "dt"],
  JOS: ["josh", "jos"],
  JDG: ["judg", "jdg", "jg"],
  RUT: ["ruth", "rut", "ru"],
  "1SA": ["1 sam", "1sam", "1 sa", "1sa", "first samuel"],
  "2SA": ["2 sam", "2sam", "2 sa", "2sa", "second samuel"],
  "1KI": ["1 kgs", "1kgs", "1 ki", "1ki", "1 kings", "first kings"],
  "2KI": ["2 kgs", "2kgs", "2 ki", "2ki", "2 kings", "second kings"],
  "1CH": ["1 chr", "1chr", "1 ch", "1ch", "1 chronicles", "first chronicles"],
  "2CH": ["2 chr", "2chr", "2 ch", "2ch", "2 chronicles", "second chronicles"],
  EZR: ["ezra", "ezr"],
  NEH: ["neh", "ne"],
  EST: ["esth", "est"],
  JOB: ["job", "jb"],
  PSA: ["ps", "psa", "psalm", "psalms"],
  PRO: ["prov", "pro", "pr"],
  ECC: ["eccl", "ecc", "qoheleth"],
  SNG: ["song", "songs", "sos", "song of solomon", "song of songs"],
  ISA: ["isa", "is"],
  JER: ["jer", "je"],
  LAM: ["lam", "la"],
  EZK: ["ezek", "ezk", "eze"],
  DAN: ["dan", "da"],
  HOS: ["hos", "ho"],
  JOL: ["joel", "jol"],
  AMO: ["amos", "amo", "am"],
  OBA: ["obad", "oba", "ob"],
  JON: ["jonah", "jon"],
  MIC: ["mic", "mi"],
  NAM: ["nah", "nam"],
  HAB: ["hab"],
  ZEP: ["zeph", "zep"],
  HAG: ["hag"],
  ZEC: ["zech", "zec"],
  MAL: ["mal"],
  MAT: ["matt", "mat", "mt"],
  MRK: ["mark", "mrk", "mk"],
  LUK: ["luke", "luk", "lk"],
  JHN: ["john", "jhn", "jn"],
  ACT: ["acts", "act", "ac"],
  ROM: ["rom", "ro"],
  "1CO": ["1 cor", "1cor", "1 co", "1co", "1 corinthians", "first corinthians"],
  "2CO": ["2 cor", "2cor", "2 co", "2co", "2 corinthians", "second corinthians"],
  GAL: ["gal"],
  EPH: ["eph"],
  PHP: ["phil", "php", "philip"],
  COL: ["col"],
  "1TH": ["1 thess", "1thess", "1 th", "1th", "1 thessalonians", "first thessalonians"],
  "2TH": ["2 thess", "2thess", "2 th", "2th", "2 thessalonians", "second thessalonians"],
  "1TI": ["1 tim", "1tim", "1 ti", "1ti", "1 timothy", "first timothy"],
  "2TI": ["2 tim", "2tim", "2 ti", "2ti", "2 timothy", "second timothy"],
  TIT: ["titus", "tit"],
  PHM: ["philem", "phm"],
  HEB: ["heb"],
  JAS: ["james", "jas", "jam"],
  "1PE": ["1 pet", "1pet", "1 pe", "1pe", "1 peter", "first peter"],
  "2PE": ["2 pet", "2pet", "2 pe", "2pe", "2 peter", "second peter"],
  "1JN": ["1 john", "1john", "1 jn", "1jn", "first john"],
  "2JN": ["2 john", "2john", "2 jn", "2jn", "second john"],
  "3JN": ["3 john", "3john", "3 jn", "3jn", "third john"],
  JUD: ["jude", "jud"],
  REV: ["rev", "revelation", "re"],
};

const BIBLE_BOOKS = [];

const STORAGE = {
  url: "mindex.supabase.url",
  key: "mindex.supabase.anonKey",
  theme: "mindex.theme",
  module: "mindex.ui.module",
  praiseFilter: "mindex.ui.praiseFilter",
  scriptureFilter: "mindex.ui.scriptureFilter",
  serviceFilter: "mindex.ui.serviceFilter",
  bibleTranslationId: "mindex.ui.bibleTranslationId",
  bibleChapter: "mindex.ui.bibleChapter",
  bibleCopyReference: "mindex.ui.bibleCopyReference",
  selectedSongId: "mindex.ui.selectedSongId",
  selectedVersionId: "mindex.ui.selectedVersionId",
  selectedScriptureId: "mindex.ui.selectedScriptureId",
  selectedBookCode: "mindex.ui.selectedBookCode",
};

const SYSTEM_THEME_QUERY = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
const TITLE_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

const HANGUL_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const state = {
  module: "praise",
  client: null,
  config: { url: "", anonKey: "" },
  songs: [],
  scriptureBooks: [],
  scriptures: [],
  bibleTranslations: [],
  bibleBookVerses: [],
  bibleVerseCache: new Map(),
  bibleTextSearchQuery: "",
  bibleTextSearchAllResults: [],
  bibleTextSearchResults: [],
  bibleTextSearchLoading: false,
  bibleTextSearchError: "",
  bibleTextSearchRequestId: "",
  bibleTextSearchTotal: null,
  bibleTextSearchPage: 0,
  applyingBrowserHistory: false,
  selectedSongId: null,
  selectedVersionId: null,
  selectedScriptureId: null,
  selectedBookCode: null,
  selectedBibleTranslationId: null,
  selectedBibleChapter: 1,
  selectedBibleVerse: null,
  selectedBibleVerses: [],
  lastSelectedBibleVerse: null,
  bibleDragSelection: null,
  suppressBibleVerseClick: false,
  bibleCopyReference: true,
  praiseFilter: "all",
  scriptureFilter: "all",
  serviceTypes: [],
  services: [],
  serviceItems: {},
  dirtyServiceTypeIds: new Set(),
  selectedServiceTypeId: null,
  selectedServiceId: null,
  serviceFilter: "all",
  serviceError: "",
  newServiceForm: null,
  calendarData: [],
  calendarLoaded: false,
  listScroll: {},
  forms: [],
  search: "",
  loading: false,
  saving: false,
  theme: "light",
  connectionError: "",
  scriptureError: "",
  bibleReaderError: "",
  bibleReaderLoading: false,
  metadataPopupOpen: false,
  dirty: {
    song: false,
    forms: false,
    scripture: false,
    service: false,
  },
};

const refs = {};
const bibleBookLookupCache = {
  books: null,
  byCode: new Map(),
  byName: new Map(),
  byReferenceName: new Map(),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheRefs();
  applyTheme(readTheme());
  state.config = readConfig();
  rememberConfig(state.config);
  readUiState();
  bindStaticEvents();
  connectClient();
  render();
  syncBrowserHistory({ replace: true });

  if (state.client) {
    loadSongs();
    loadScriptureBooks({ silent: true });
    loadScriptures({ silent: true });
    loadBibleTranslations({ silent: true });
    loadServiceData({ silent: true });
  } else {
    showToast(state.connectionError || "Connection settings are missing from the link.", "error");
  }
}

function cacheRefs() {
  refs.moduleSwitcher = document.getElementById("moduleSwitcher");
  refs.moduleButtons = [...document.querySelectorAll(".module-tab[data-module]")];
  refs.connectionStatus = document.getElementById("connectionStatus");
  refs.themeBtn = document.getElementById("themeBtn");
  refs.newSongBtn = document.getElementById("newSongBtn");
  refs.saveAllBtn = document.getElementById("saveAllBtn");
  refs.searchInput = document.getElementById("searchInput");
  refs.listFilter = document.getElementById("listFilter");
  refs.listFilterButtons = [...document.querySelectorAll("[data-list-filter]")];
  refs.songCount = document.getElementById("songCount");
  refs.songList = document.getElementById("songList");
  refs.sidebar = document.querySelector(".sidebar");
  refs.detailPane = document.getElementById("detailPane");
  refs.toastRegion = document.getElementById("toastRegion");
}

function bindStaticEvents() {
  refs.moduleSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-module]");
    if (!button) return;
    switchModule(button.dataset.module);
  });
  refs.themeBtn.addEventListener("click", toggleTheme);
  refs.saveAllBtn.addEventListener("click", saveAll);
  refs.searchInput.addEventListener("input", (event) => {
    saveCurrentListScroll();
    state.search = event.target.value;
    if (shouldClearBibleTextSearchOnInput()) {
      clearBibleTextSearch();
    }
    renderSongList();
    if (state.module === "scripture") renderDetail();
    if (state.module === "service") renderServiceDetail();
  });
  refs.searchInput.addEventListener("keydown", handleSearchKeydown);
  refs.listFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-list-filter]");
    if (!button) return;
    saveCurrentListScroll();
    if (state.module === "service") {
      if (!confirmDiscardServiceChanges()) return;
      state.serviceFilter = button.dataset.listFilter;
      state.selectedServiceTypeId = null;
      state.selectedServiceId = null;
      if (state.serviceFilter === "calendar" && !state.calendarLoaded) loadCalendarData();
      render();
      syncBrowserHistory();
      return;
    } else if (state.module === "scripture") {
      state.scriptureFilter = button.dataset.listFilter;
      clearSelectedBookOutsideFilter();
    } else {
      state.praiseFilter = button.dataset.listFilter;
      const selectedSong = getSelectedSong();
      if (selectedSong && !state.dirty.forms) {
        const preferredVersionId = getPreferredVersionId(selectedSong);
        if (preferredVersionId && preferredVersionId !== state.selectedVersionId) {
          state.selectedVersionId = preferredVersionId;
          loadForms(preferredVersionId);
        }
      }
    }
    persistUiState();
    renderSongList();
    renderListFilter();
    if (state.module === "scripture") renderDetail();
    syncBrowserHistory();
  });
  refs.songList.addEventListener("scroll", saveCurrentListScroll, { passive: true });

  refs.songList.addEventListener("click", async (event) => {
    const globalSongItem = event.target.closest("[data-global-song-id]");
    if (globalSongItem) {
      await openGlobalSongResult(globalSongItem.dataset.globalSongId);
      return;
    }

    const globalBookItem = event.target.closest("[data-global-book-code]");
    if (globalBookItem) {
      await openGlobalBookResult(globalBookItem.dataset.globalBookCode, {
        chapter: globalBookItem.dataset.globalChapter,
        verse: globalBookItem.dataset.globalVerse,
      });
      return;
    }

    const globalBibleTextItem = event.target.closest("[data-global-bible-text]");
    if (globalBibleTextItem) {
      await openGlobalBibleTextResult();
      return;
    }

    const globalServiceItem = event.target.closest("[data-global-service-id]");
    if (globalServiceItem) {
      await openGlobalServiceResult(globalServiceItem.dataset.globalServiceId);
      return;
    }

    const songItem = event.target.closest("[data-song-id]");
    if (songItem) {
      selectSong(songItem.dataset.songId);
      return;
    }

    const scriptureItem = event.target.closest("[data-scripture-id]");
    if (scriptureItem) {
      selectScripture(scriptureItem.dataset.scriptureId);
      return;
    }

    const bookItem = event.target.closest("[data-book-code]");
    if (bookItem) {
      const reference = parseBibleReference(state.search);
      if (reference?.book?.code === bookItem.dataset.bookCode) {
        selectScriptureBook(bookItem.dataset.bookCode, {
          chapter: reference.chapter,
          verse: reference.verse,
          force: true,
        });
      } else {
        selectScriptureBook(bookItem.dataset.bookCode);
      }
    }

    const serviceTypeItem = event.target.closest("[data-service-type-id]");
    if (serviceTypeItem) {
      if (!confirmDiscardServiceChanges()) return;
      state.selectedServiceTypeId = serviceTypeItem.dataset.serviceTypeId;
      state.selectedServiceId = null;
      renderServiceList();
      renderServiceDetail();
      syncBrowserHistory();
      return;
    }

    const serviceItem = event.target.closest("[data-service-id]");
    if (serviceItem) {
      selectService(serviceItem.dataset.serviceId);
      return;
    }
  });

  refs.detailPane.addEventListener("click", handleDetailClick);
  refs.detailPane.addEventListener("keydown", handleDetailKeydown);
  refs.detailPane.addEventListener("input", handleDetailInput);
  refs.detailPane.addEventListener("change", handleDetailChange);
  refs.detailPane.addEventListener("pointerdown", handleDetailPointerDown);
  refs.detailPane.addEventListener("pointerover", handleDetailPointerOver);

  // Calendar inline-edit
  refs.detailPane.addEventListener("focusin", (e) => {
    const cell = e.target.closest(".cal-cell");
    if (cell) cell.dataset.initialValue = cell.textContent;
  });
  refs.detailPane.addEventListener("focusout", (e) => {
    const cell = e.target.closest(".cal-cell");
    if (!cell) return;
    const id = cell.dataset.calId;
    const field = cell.dataset.calField;
    const newVal = cell.textContent.replace(/\n/g, " ").trim();
    const oldVal = cell.dataset.initialValue || "";
    if (newVal !== oldVal) saveCalendarCell(id, field, newVal);
  });
  refs.detailPane.addEventListener("keydown", (e) => {
    const cell = e.target.closest(".cal-cell");
    if (!cell) return;
    if (e.key === "Enter") { e.preventDefault(); cell.blur(); }
    if (e.key === "Escape") {
      cell.textContent = cell.dataset.initialValue || "";
      cell.blur();
    }
  }, true);
  window.addEventListener("pointerup", handleWindowPointerUp);
  window.addEventListener("mousedown", handleMouseSideButtonNavigation, { capture: true });
  window.addEventListener("popstate", handleBrowserHistoryPop);

  SYSTEM_THEME_QUERY?.addEventListener("change", () => {
    if (!localStorage.getItem(STORAGE.theme)) applyTheme(readTheme());
  });

  window.addEventListener("keydown", (event) => {
    const isThemeToggle =
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "l";
    if (isThemeToggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleTheme();
      return;
    }

    const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
    if (isSave) {
      event.preventDefault();
      saveAll();
      return;
    }

    const isCopy = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
    if (isCopy && copySelectedBibleVersesFromShortcut(event)) return;

    if (event.key === "Escape" && state.metadataPopupOpen) {
      event.preventDefault();
      state.metadataPopupOpen = false;
      renderDetail();
      return;
    }

    handleSongNavigationKeydown(event);
    handleHorizontalNavigationKeydown(event);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!hasDirtyChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function handleSearchKeydown(event) {
  if (event.key !== "Enter") return;

  const scriptureShortcut = await getScriptureSearchShortcut(state.search);
  if (scriptureShortcut && (state.module !== "scripture" || scriptureShortcut.type !== "text")) {
    event.preventDefault();
    await runScriptureSearchShortcut(scriptureShortcut);
    return;
  }

  if (state.module !== "scripture") return;
  event.preventDefault();
  await runScriptureSearchShortcut(scriptureShortcut || { type: "text", query: state.search });
}

function handleSongNavigationKeydown(event) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (shouldKeepArrowKeyInFocusedControl(event.target)) return;

  const down = event.key === "ArrowDown";

  if (state.module === "service") {
    if (!confirmDiscardServiceChanges()) return;
    const types = getFilteredServiceTypes();
    if (!types.length) return;
    const currentIndex = types.findIndex((t) => t.id === state.selectedServiceTypeId);
    const nextIndex = down
      ? Math.min(currentIndex < 0 ? 0 : currentIndex + 1, types.length - 1)
      : Math.max(currentIndex < 0 ? types.length - 1 : currentIndex - 1, 0);
    const next = types[nextIndex];
    if (!next || next.id === state.selectedServiceTypeId) return;
    event.preventDefault();
    state.selectedServiceTypeId = next.id;
    state.selectedServiceId = null;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    refs.songList.querySelector(".song-item.active")?.scrollIntoView({ block: "nearest" });
    return;
  }

  const items = state.module === "scripture" ? getFilteredBibleBooks() : getFilteredSongs();
  if (!items.length) return;

  const selectedId = state.module === "scripture" ? state.selectedBookCode : state.selectedSongId;
  const foundIndex = items.findIndex((item) => (state.module === "scripture" ? item.code : item.id) === selectedId);
  const currentIndex = foundIndex >= 0 ? foundIndex : down ? -1 : items.length;
  const nextIndex = down
    ? Math.min(currentIndex + 1, items.length - 1)
    : Math.max(currentIndex - 1, 0);
  const nextItem = items[nextIndex];

  event.preventDefault();
  const nextId = state.module === "scripture" ? nextItem?.code : nextItem?.id;
  if (!nextId || nextId === selectedId) return;
  if (state.module === "scripture") selectScriptureBook(nextId);
  else selectSong(nextItem.id);
  requestAnimationFrame(() => {
    refs.songList.querySelector(".song-item.active")?.scrollIntoView({ block: "nearest" });
  });
}

function handleHorizontalNavigationKeydown(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (shouldKeepHorizontalNavigationInFocusedControl(event.target)) return;

  const handled = navigateHorizontal(event.key === "ArrowRight" ? 1 : -1);
  if (!handled) return;
  event.preventDefault();
}

function handleMouseSideButtonNavigation(event) {
  if (event.button !== 3 && event.button !== 4) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (shouldKeepHorizontalNavigationInFocusedControl(event.target)) return;

  const handled = navigateHorizontal(event.button === 4 ? 1 : -1);
  if (!handled) return;
  event.preventDefault();
  event.stopPropagation();
}

function navigateHorizontal(delta) {
  if (!delta) return false;
  if (state.module === "scripture") return navigateBibleChapter(delta);
  if (state.module === "service") return navigateServiceDate(delta);
  return navigatePraiseVersion(delta);
}

function navigateServiceDate(delta) {
  if (!state.selectedServiceTypeId) return false;
  if (!confirmDiscardServiceChanges()) return false;
  const services = state.services.filter((s) => s.type_id === state.selectedServiceTypeId);
  if (!services.length) return false;
  const currentIndex = services.findIndex((s) => s.id === state.selectedServiceId);
  const nextIndex = currentIndex < 0 ? (delta > 0 ? 0 : services.length - 1) : currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= services.length) return false;
  const next = services[nextIndex];
  if (!next || next.id === state.selectedServiceId) return false;
  selectService(next.id);
  return true;
}

function navigateBibleChapter(delta) {
  if (!state.selectedBookCode) return false;
  const chapters = getBibleChapterOptions();
  const currentIndex = chapters.indexOf(state.selectedBibleChapter);
  if (currentIndex < 0) return false;
  const nextChapter = chapters[currentIndex + delta];
  if (!nextChapter) return false;
  changeBibleChapter(delta);
  return true;
}

function navigatePraiseVersion(delta) {
  const song = getSelectedSong();
  const versions = song?.versions || [];
  if (versions.length < 2) return false;
  const currentIndex = versions.findIndex((version) => version.id === getSelectedVersionId());
  if (currentIndex < 0) return false;
  const nextVersion = versions[currentIndex + delta];
  if (!nextVersion) return false;
  selectVersion(nextVersion.id);
  return true;
}

function shouldKeepArrowKeyInFocusedControl(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element === refs.searchInput) return false;
  return Boolean(element.closest("textarea, select, input, [contenteditable='true']"));
}

function shouldKeepHorizontalNavigationInFocusedControl(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  return Boolean(element.closest("textarea, select, input, [contenteditable='true']"));
}

function readTheme() {
  const saved = localStorage.getItem(STORAGE.theme);
  if (saved === "dark" || saved === "light") return saved;
  return SYSTEM_THEME_QUERY?.matches ? "dark" : "light";
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  if (!refs.themeBtn) return;
  refs.themeBtn.title = theme === "dark" ? "Use light mode" : "Use dark mode";
  refs.themeBtn.innerHTML = `<i data-lucide="${theme === "dark" ? "sun" : "moon"}"></i>`;
  refreshIcons();
  resizeFormTextareas();
}

function toggleTheme() {
  const next = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE.theme, next);
  applyTheme(next);
}

function readUiState() {
  const moduleName = sessionStorage.getItem(STORAGE.module);
  const praiseFilter = sessionStorage.getItem(STORAGE.praiseFilter);
  const scriptureFilter = sessionStorage.getItem(STORAGE.scriptureFilter);
  const serviceFilter = sessionStorage.getItem(STORAGE.serviceFilter);
  const bibleChapter = Number(sessionStorage.getItem(STORAGE.bibleChapter));
  const bibleCopyReference = sessionStorage.getItem(STORAGE.bibleCopyReference);

  if (["praise", "scripture", "service"].includes(moduleName)) state.module = moduleName;
  if (["all", "hymns", "ccm"].includes(praiseFilter)) state.praiseFilter = praiseFilter;
  if (["all", "old", "new"].includes(scriptureFilter)) state.scriptureFilter = scriptureFilter;
  if (["all", "public", "ministry"].includes(serviceFilter)) state.serviceFilter = serviceFilter;

  state.selectedSongId = sessionStorage.getItem(STORAGE.selectedSongId) || null;
  state.selectedVersionId = sessionStorage.getItem(STORAGE.selectedVersionId) || null;
  state.selectedScriptureId = sessionStorage.getItem(STORAGE.selectedScriptureId) || null;
  state.selectedBookCode = sessionStorage.getItem(STORAGE.selectedBookCode) || null;
  state.selectedBibleTranslationId = sessionStorage.getItem(STORAGE.bibleTranslationId) || null;
  state.selectedBibleChapter = Number.isFinite(bibleChapter) && bibleChapter > 0 ? bibleChapter : 1;
  state.bibleCopyReference = bibleCopyReference !== "false";
}

function persistUiState() {
  sessionStorage.setItem(STORAGE.module, state.module);
  sessionStorage.setItem(STORAGE.praiseFilter, state.praiseFilter);
  sessionStorage.setItem(STORAGE.scriptureFilter, state.scriptureFilter);
  sessionStorage.setItem(STORAGE.serviceFilter, state.serviceFilter);
  writeStorageValue(STORAGE.selectedSongId, state.selectedSongId);
  writeStorageValue(STORAGE.selectedVersionId, state.selectedVersionId);
  writeStorageValue(STORAGE.selectedScriptureId, state.selectedScriptureId);
  writeStorageValue(STORAGE.selectedBookCode, state.selectedBookCode);
  writeStorageValue(STORAGE.bibleTranslationId, state.selectedBibleTranslationId);
  writeStorageValue(STORAGE.bibleChapter, state.selectedBibleChapter > 0 ? String(state.selectedBibleChapter) : "");
  sessionStorage.setItem(STORAGE.bibleCopyReference, String(state.bibleCopyReference));
}

function writeStorageValue(key, value) {
  if (value) sessionStorage.setItem(key, value);
  else sessionStorage.removeItem(key);
}

function currentBrowserHistorySnapshot() {
  return {
    module: state.module,
    search: state.search,
    praiseFilter: state.praiseFilter,
    scriptureFilter: state.scriptureFilter,
    serviceFilter: state.serviceFilter,
    selectedSongId: state.selectedSongId,
    selectedVersionId: state.selectedVersionId,
    selectedScriptureId: state.selectedScriptureId,
    selectedBookCode: state.selectedBookCode,
    selectedBibleTranslationId: state.selectedBibleTranslationId,
    selectedBibleChapter: state.selectedBibleChapter,
    selectedBibleVerse: state.selectedBibleVerse,
    selectedServiceTypeId: state.selectedServiceTypeId,
    selectedServiceId: state.selectedServiceId,
    bibleTextSearchQuery: state.bibleTextSearchQuery,
    bibleTextSearchPage: state.bibleTextSearchPage,
  };
}

function syncBrowserHistory({ replace = false } = {}) {
  if (state.applyingBrowserHistory || !window.history?.pushState) return;
  const snapshot = currentBrowserHistorySnapshot();
  const current = history.state?.mindex;
  if (current && JSON.stringify(current) === JSON.stringify(snapshot)) return;
  history[replace ? "replaceState" : "pushState"]({ mindex: snapshot }, "", window.location.href);
}

async function handleBrowserHistoryPop(event) {
  const snapshot = event.state?.mindex;
  if (!snapshot) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) {
    syncBrowserHistory({ replace: true });
    return;
  }
  await applyBrowserHistorySnapshot(snapshot);
}

async function applyBrowserHistorySnapshot(snapshot) {
  state.applyingBrowserHistory = true;
  try {
    state.module = ["praise", "scripture", "service"].includes(snapshot.module) ? snapshot.module : "praise";
    state.search = snapshot.search || "";
    refs.searchInput.value = state.search;
    if (["all", "hymns", "ccm"].includes(snapshot.praiseFilter)) state.praiseFilter = snapshot.praiseFilter;
    if (["all", "old", "new"].includes(snapshot.scriptureFilter)) state.scriptureFilter = snapshot.scriptureFilter;
    if (["all", "public", "ministry"].includes(snapshot.serviceFilter)) state.serviceFilter = snapshot.serviceFilter;
    state.selectedSongId = snapshot.selectedSongId || null;
    state.selectedVersionId = snapshot.selectedVersionId || null;
    state.selectedScriptureId = snapshot.selectedScriptureId || null;
    state.selectedBookCode = snapshot.selectedBookCode || null;
    state.selectedBibleTranslationId = snapshot.selectedBibleTranslationId || state.selectedBibleTranslationId;
    state.selectedBibleChapter = Number(snapshot.selectedBibleChapter) || 1;
    state.selectedBibleVerse = Number(snapshot.selectedBibleVerse) || null;
    state.selectedBibleVerses = state.selectedBibleVerse ? [state.selectedBibleVerse] : [];
    state.lastSelectedBibleVerse = state.selectedBibleVerse || null;
    state.selectedServiceTypeId = snapshot.selectedServiceTypeId || null;
    state.selectedServiceId = snapshot.selectedServiceId || null;
    clearBibleTextSearch();
    state.bibleTextSearchQuery = snapshot.bibleTextSearchQuery || "";
    state.bibleTextSearchPage = Math.max(0, Number(snapshot.bibleTextSearchPage) || 0);
    persistUiState();
    render();
    if (state.module === "praise" && state.selectedVersionId) await loadForms(state.selectedVersionId);
    if (state.module === "scripture" && state.bibleTextSearchQuery) {
      state.search = state.bibleTextSearchQuery;
      refs.searchInput.value = state.search;
      await runBibleTextSearch(state.bibleTextSearchQuery, { page: state.bibleTextSearchPage });
    } else if (state.module === "scripture" && state.selectedBookCode) {
      await loadBibleBookVerses({ silent: true });
      focusSelectedBibleVerseAfterRender();
    }
    if (state.module === "service" && state.selectedServiceId) await loadServiceItems(state.selectedServiceId);
  } finally {
    state.applyingBrowserHistory = false;
  }
}

function readConfig() {
  const params = readLinkParams();
  const injected = window.MINDEX_SUPABASE || {};
  return {
    url:
      params.get("supabaseUrl") ||
      params.get("supabase_url") ||
      params.get("url") ||
      injected.url ||
      localStorage.getItem(STORAGE.url) ||
      "",
    anonKey:
      params.get("supabaseAnonKey") ||
      params.get("supabase_anon_key") ||
      params.get("anonKey") ||
      params.get("key") ||
      injected.anonKey ||
      injected.anon_key ||
      localStorage.getItem(STORAGE.key) ||
      "",
  };
}

function readLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash.startsWith("/")) return params;
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function rememberConfig(config) {
  if (!config.url || !config.anonKey) return;
  localStorage.setItem(STORAGE.url, config.url);
  localStorage.setItem(STORAGE.key, config.anonKey);
}

function connectClient() {
  state.connectionError = "";
  if (!state.config.url || !state.config.anonKey) {
    state.client = null;
    return;
  }

  if (!window.supabase?.createClient) {
    state.client = null;
    state.connectionError = "Supabase library did not load.";
    return;
  }

  try {
    state.client = window.supabase.createClient(state.config.url, state.config.anonKey, {
      auth: { persistSession: false },
      global: { headers: { "X-Client-Info": "mindex-prototype" } },
    });
  } catch (error) {
    state.client = null;
    state.connectionError = error.message || "Supabase connection failed.";
  }
}

async function switchModule(moduleName, options = {}) {
  if (!["praise", "scripture", "service"].includes(moduleName)) return;
  if (moduleName === state.module) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  const clearSearch = options.clearSearch !== false;
  const syncHistory = options.syncHistory !== false;
  saveCurrentListScroll();
  state.module = moduleName;
  if (clearSearch) {
    state.search = "";
    refs.searchInput.value = "";
    clearBibleTextSearch();
  }
  state.dirty.song = false;
  state.dirty.forms = false;
  state.dirty.scripture = false;
  state.dirty.service = false;
  state.dirtyServiceTypeIds.clear();
  persistUiState();
  render();
  if (syncHistory) syncBrowserHistory();

  if (moduleName === "scripture" && !state.scriptures.length && !state.scriptureError) {
    if (!state.scriptureBooks.length) await loadScriptureBooks();
    await loadScriptures();
  }

  if (moduleName === "praise" && state.selectedSongId && state.selectedVersionId && !state.forms.length) {
    await loadForms(state.selectedVersionId);
  }

  if (moduleName === "service" && !state.serviceTypes.length && !state.serviceError) {
    await loadServiceData();
  }
}

async function loadSongs() {
  if (!requireClient()) return;

  state.loading = true;
  renderConnectionStatus();

  let data = [];
  let error = null;

  try {
    const response = await state.client
      .from("mindex_songs")
      .select("*")
      .order("title", { ascending: true });
    data = response.data;
    error = response.error;
  } catch (caughtError) {
    error = caughtError;
  } finally {
    state.loading = false;
  }

  if (error) {
    state.connectionError = error.message || "Could not load songs.";
    showToast(state.connectionError, "error");
    render();
    return;
  }

  state.connectionError = "";
  state.songs = (data || []).map(normalizeServerSong).sort(sortSongs);
  if (state.selectedSongId && !state.songs.some((song) => song.id === state.selectedSongId)) {
    state.selectedSongId = null;
    state.selectedVersionId = null;
    state.forms = [];
  }

  const selectedSong = getSelectedSong();
  if (selectedSong) {
    const validVersionId = selectedSong.versions?.some((version) => version.id === state.selectedVersionId)
      ? state.selectedVersionId
      : getPreferredVersionId(selectedSong);
    state.selectedVersionId = validVersionId;
    persistUiState();
    await loadForms(validVersionId);
    return;
  }

  persistUiState();
  render();
}

async function loadScriptures({ silent = false } = {}) {
  if (!requireClient()) return;

  state.loading = true;
  renderConnectionStatus();

  let data = [];
  let error = null;

  try {
    const response = await state.client
      .from("mindex_scriptures")
      .select("*")
      .eq("is_active", true)
      .order("title", { ascending: true });
    data = response.data;
    error = response.error;
  } catch (caughtError) {
    error = caughtError;
  } finally {
    state.loading = false;
  }

  if (error) {
    state.scriptureError = error.message || "Could not load scripture.";
    if (!silent && state.module === "scripture") showToast(state.scriptureError, "error");
    render();
    return;
  }

  state.scriptureError = "";
  state.scriptures = (data || []).map(normalizeServerScripture).sort(sortScriptures);
  if (state.selectedScriptureId && !state.scriptures.some((scripture) => scripture.id === state.selectedScriptureId)) {
    state.selectedScriptureId = null;
  }

  persistUiState();
  render();
}

async function loadScriptureBooks({ silent = false } = {}) {
  if (!requireClient()) return;

  try {
    const { data, error } = await state.client
      .from("mindex_scripture_books")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    state.scriptureBooks = (data || []).map(normalizeServerScriptureBook).sort(sortBibleBooks);
    if (state.selectedBookCode && !state.scriptureBooks.some((book) => book.code === state.selectedBookCode)) {
      state.selectedBookCode = null;
    }
    clearSelectedBookOutsideFilter();
    persistUiState();
    render();
  } catch (error) {
    state.scriptureBooks = [];
    if (!silent && state.module === "scripture") showToast(error.message || "Could not load Bible books.", "error");
  }
}

async function loadServiceData({ silent = false } = {}) {
  if (!requireClient()) {
    state.serviceError = "No connection.";
    render();
    return;
  }
  try {
    const typesRes = await state.client.from("mindex_service_types").select("*").order("sort_order");
    if (typesRes.error) throw typesRes.error;
    const servicesRes = await state.client.from("mindex_services").select("*").order("date");
    if (servicesRes.error) throw servicesRes.error;
    const itemsRes = await state.client
      .from("mindex_service_items")
      .select("id,service_id,sort_order,label,raw_title,song_id")
      .order("service_id")
      .order("sort_order");
    if (itemsRes.error) throw itemsRes.error;
    state.serviceTypes = typesRes.data || [];
    state.services = servicesRes.data || [];
    state.serviceItems = groupServiceItems(itemsRes.data || []);
    state.dirtyServiceTypeIds.clear();
    state.dirty.service = false;
    state.serviceError = "";
    render();
  } catch (err) {
    console.error("[Service] loadServiceData failed:", err);
    state.serviceError = err.message || String(err) || "Could not load service data.";
    if (!silent && state.module === "service") showToast(state.serviceError, "error");
    render();
  }
}

async function loadCalendarData({ silent = false } = {}) {
  if (!state.client) return;
  try {
    const { data, error } = await state.client
      .from("mindex_sunday_calendar")
      .select("*")
      .order("date");
    if (error) throw error;
    state.calendarData = data || [];
    state.calendarLoaded = true;
    if (state.serviceFilter === "calendar") renderCalendarView();
  } catch (e) {
    if (!silent) showToast(e.message || "교회력 로드 실패", "error");
  }
}

async function saveCalendarCell(id, field, value) {
  if (!state.client) return false;
  const { error } = await state.client
    .from("mindex_sunday_calendar")
    .update({ [field]: value })
    .eq("id", id);
  if (error) { showToast(error.message || "저장 실패", "error"); return false; }
  const row = state.calendarData.find((r) => r.id === id);
  if (row) row[field] = value;
  return true;
}

function renderCalendarView() {
  if (!state.calendarLoaded) {
    refs.detailPane.innerHTML = `<div class="empty-detail"><div class="empty-detail-inner"><p class="empty-verse">Loading…</p></div></div>`;
    return;
  }
  if (!state.calendarData.length) {
    refs.detailPane.innerHTML = `<div class="empty-detail"><div class="empty-detail-inner"><p class="empty-verse">교회력 데이터가 없습니다.</p></div></div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const KO_MONTH = ["","1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const DOW = ["일","월","화","수","목","금","토"];

  let tbodyHtml = "";
  let prevMonth = "";
  for (const row of state.calendarData) {
    const ym = row.date.slice(0, 7);
    if (ym !== prevMonth) {
      const [y, m] = ym.split("-");
      tbodyHtml += `<tr class="cal-month-row"><td colspan="9">${y}년 ${KO_MONTH[parseInt(m)]}</td></tr>`;
      prevMonth = ym;
    }
    const d = new Date(row.date + "T00:00:00");
    const dateLabel = `${d.getMonth()+1}/${d.getDate()} (${DOW[d.getDay()]})`;
    const isToday = row.date === today;
    const isPast = row.date < today;
    const isSpecial = (row.church_schedule || "").includes("온세대 찬양예배");
    const rowCls = ["cal-row", isToday ? "is-today" : isPast ? "is-past" : "", isSpecial ? "is-special" : ""].filter(Boolean).join(" ");

    const editField = (field) => {
      const val = escapeHtml(row[field] || "");
      return `<td class="cal-cell" data-cal-id="${row.id}" data-cal-field="${field}" contenteditable="plaintext-only">${val}</td>`;
    };

    tbodyHtml += `
      <tr class="${rowCls}">
        <td class="cal-date">${dateLabel}</td>
        <td class="cal-lit">${escapeHtml(row.liturgical || "")}</td>
        ${editField("note")}
        ${editField("church_schedule")}
        ${editField("preacher")}
        ${editField("nursery_prayer")}
        ${editField("children_prayer")}
        ${editField("youth_prayer")}
        ${editField("young_adult_prayer")}
      </tr>`;
  }

  refs.detailPane.innerHTML = `
    <div class="cal-view">
      <div class="cal-header">
        <h2 class="cal-title">교육부서 교회력</h2>
        <span class="cal-subtitle">${state.calendarData.length}주 · 클릭하여 편집</span>
      </div>
      <div class="cal-table-wrap">
        <table class="cal-table">
          <thead>
            <tr>
              <th class="cal-th-date">날짜</th>
              <th class="cal-th-lit">교회력</th>
              <th class="cal-th-note">기념주일</th>
              <th class="cal-th-note">교회 일정</th>
              <th class="cal-th-person">설교</th>
              <th class="cal-th-person">유치부 🙏</th>
              <th class="cal-th-person">어린이부 🙏</th>
              <th class="cal-th-person">청소년부 🙏</th>
              <th class="cal-th-person">청년부 🙏</th>
            </tr>
          </thead>
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>
    </div>`;
}

function groupServiceItems(items) {
  return items.reduce((grouped, item) => {
    const serviceId = item.service_id;
    if (!serviceId) return grouped;
    if (!grouped[serviceId]) grouped[serviceId] = [];
    grouped[serviceId].push(normalizeServiceItem(item));
    return grouped;
  }, {});
}

async function loadServiceItems(serviceId) {
  if (!requireClient() || !serviceId) return;
  if (state.serviceItems[serviceId]) return; // already loaded
  try {
    const { data, error } = await state.client
      .from("mindex_service_items")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order");
    if (error) throw error;
    state.serviceItems[serviceId] = normalizeServiceItems(data || []);
    renderServiceDetail();
  } catch (err) {
    showToast(err.message || "Could not load items.", "error");
  }
}

async function loadBibleTranslations({ silent = false } = {}) {
  if (!requireClient()) return;

  try {
    const { data, error } = await state.client
      .from("mindex_bible_translations")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    state.bibleReaderError = "";
    state.bibleTranslations = (data || []).map(normalizeServerBibleTranslation).sort(sortBibleTranslations);
    if (state.selectedBibleTranslationId && !state.bibleTranslations.some((translation) => translation.id === state.selectedBibleTranslationId)) {
      state.selectedBibleTranslationId = null;
    }
    if (!state.selectedBibleTranslationId && state.bibleTranslations.length) {
      state.selectedBibleTranslationId = state.bibleTranslations[0].id;
    }
    persistUiState();
    syncBrowserHistory({ replace: true });
    if (state.selectedBookCode && state.selectedBibleTranslationId) {
      await loadBibleBookVerses({ silent: true });
    } else if (state.module === "scripture") {
      render();
    }
  } catch (error) {
    state.bibleTranslations = [];
    state.bibleBookVerses = [];
    state.bibleReaderError = "Bible verse tables are not ready.";
    if (!silent && state.module === "scripture") showToast(error.message || state.bibleReaderError, "error");
    if (state.module === "scripture") render();
  }
}

async function loadBibleBookVerses({ silent = false } = {}) {
  if (!requireClient()) return;
  if (!state.selectedBookCode || !state.selectedBibleTranslationId) {
    state.bibleBookVerses = [];
    return;
  }

  const chapters = getBibleChapterOptions();
  if (chapters.length && !chapters.includes(state.selectedBibleChapter)) {
    state.selectedBibleChapter = chapters[0];
  }
  const selectedTranslationId = state.selectedBibleTranslationId;
  const selectedBookCode = state.selectedBookCode;
  const selectedChapter = state.selectedBibleChapter;
  const cacheKey = bibleVerseCacheKey(selectedTranslationId, selectedBookCode, selectedChapter);
  if (state.bibleVerseCache.has(cacheKey)) {
    state.bibleReaderError = "";
    state.bibleBookVerses = state.bibleVerseCache.get(cacheKey);
    persistUiState();
    if (state.module === "scripture") render();
    return;
  }

  state.bibleReaderLoading = true;
  if (state.module === "scripture") render();

  try {
    const { data, error } = await state.client
      .from("mindex_bible_verses")
      .select("book_code,chapter,verse,verse_end,text,section_title")
      .eq("is_active", true)
      .eq("translation_id", selectedTranslationId)
      .eq("book_code", selectedBookCode)
      .eq("chapter", selectedChapter)
      .order("verse", { ascending: true });

    if (error) throw error;
    state.bibleVerseCache.set(cacheKey, data || []);
    if (cacheKey !== bibleVerseCacheKey(state.selectedBibleTranslationId, state.selectedBookCode, state.selectedBibleChapter)) {
      return;
    }
    state.bibleReaderError = "";
    state.bibleBookVerses = data || [];
    persistUiState();
  } catch (error) {
    if (cacheKey !== bibleVerseCacheKey(state.selectedBibleTranslationId, state.selectedBookCode, state.selectedBibleChapter)) {
      return;
    }
    state.bibleBookVerses = [];
    state.bibleReaderError = "Bible verses could not be loaded.";
    if (!silent && state.module === "scripture") showToast(error.message || state.bibleReaderError, "error");
  } finally {
    if (cacheKey === bibleVerseCacheKey(state.selectedBibleTranslationId, state.selectedBookCode, state.selectedBibleChapter)) {
      state.bibleReaderLoading = false;
      if (state.module === "scripture") render();
    }
  }
}

async function runBibleTextSearch(value, options = {}) {
  const query = String(value || "").trim();
  if (!query) {
    clearBibleTextSearch();
    renderDetail();
    return;
  }
  if (!requireClient()) return;
  if (!state.bibleTranslations.length && !state.bibleReaderError) await loadBibleTranslations({ silent: true });

  const page = Math.max(0, Number(options.page) || 0);
  state.bibleTextSearchQuery = query;
  state.bibleTextSearchAllResults = [];
  state.bibleTextSearchResults = [];
  state.bibleTextSearchError = "";
  state.bibleTextSearchTotal = null;
  state.bibleTextSearchPage = page;
  state.selectedScriptureId = null;

  if (!state.selectedBibleTranslationId) {
    state.bibleTextSearchError = "No Bible translation is selected.";
    renderDetail();
    return;
  }

  const requestId = [state.selectedBibleTranslationId, query, Date.now()].join(":");
  state.bibleTextSearchRequestId = requestId;
  state.bibleTextSearchLoading = true;
  persistUiState();
  syncBrowserHistory();
  renderDetail();

  try {
    const { rows, count } = await fetchBibleTextSearchRows(query, state.selectedBibleTranslationId);
    if (state.bibleTextSearchRequestId !== requestId) return;
    state.bibleTextSearchAllResults = rows.map(normalizeServerBibleVerse).sort(sortBibleVerseRows);
    state.bibleTextSearchTotal = Number.isFinite(count) ? count : state.bibleTextSearchAllResults.length;
    setBibleTextSearchPage(page);
  } catch (error) {
    if (state.bibleTextSearchRequestId !== requestId) return;
    state.bibleTextSearchAllResults = [];
    state.bibleTextSearchResults = [];
    state.bibleTextSearchTotal = null;
    state.bibleTextSearchError = error.message || "Bible text search failed.";
  } finally {
    if (state.bibleTextSearchRequestId === requestId) {
      state.bibleTextSearchLoading = false;
      renderDetail();
    }
  }
}

async function fetchBibleTextSearchRows(query, translationId) {
  const pageSize = 1000;
  const rows = [];
  let totalCount = null;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error, count } = await state.client
      .from("mindex_bible_verses")
      .select("id,book_code,chapter,verse,verse_end,text,section_title", { count: "exact" })
      .eq("is_active", true)
      .eq("translation_id", translationId)
      .ilike("text", `%${escapePostgrestLikePattern(query)}%`)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (Number.isFinite(count)) totalCount = count;
    rows.push(...(data || []));
    if (!data?.length || data.length < pageSize || (Number.isFinite(totalCount) && rows.length >= totalCount)) break;
  }

  return { rows, count: Number.isFinite(totalCount) ? totalCount : rows.length };
}

function setBibleTextSearchPage(page) {
  const total = state.bibleTextSearchAllResults.length;
  const maxPage = Math.max(0, Math.ceil(total / BIBLE_TEXT_SEARCH_PAGE_SIZE) - 1);
  state.bibleTextSearchPage = Math.min(Math.max(0, Number(page) || 0), maxPage);
  const start = state.bibleTextSearchPage * BIBLE_TEXT_SEARCH_PAGE_SIZE;
  state.bibleTextSearchResults = state.bibleTextSearchAllResults.slice(start, start + BIBLE_TEXT_SEARCH_PAGE_SIZE);
}

function changeBibleTextSearchPage(delta) {
  if (!delta) return;
  setBibleTextSearchPage(state.bibleTextSearchPage + delta);
  syncBrowserHistory();
  renderDetail();
}

async function selectSong(songId) {
  if (songId === state.selectedSongId) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  state.selectedSongId = songId;
  state.selectedVersionId = getPreferredVersionId(getSelectedSong());
  state.forms = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  persistUiState();
  render();
  syncBrowserHistory();
  focusSelectedItemAfterRender();
  await loadForms(state.selectedVersionId);
  focusSelectedItemAfterRender();
}

async function selectScripture(scriptureId) {
  if (scriptureId === state.selectedScriptureId) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  state.selectedScriptureId = scriptureId;
  state.dirty.song = false;
  state.dirty.forms = false;
  state.dirty.scripture = false;
  persistUiState();
  render();
  syncBrowserHistory();
  focusSelectedItemAfterRender();
}

async function selectScriptureBook(bookCode, options = {}) {
  const nextChapter = Number(options.chapter) || 1;
  const nextVerse = Number(options.verse) || null;
  clearBibleTextSearch();
  if (bookCode === state.selectedBookCode && !options.force) {
    if (nextChapter !== state.selectedBibleChapter || nextVerse !== state.selectedBibleVerse) {
      state.selectedBibleChapter = nextChapter;
      state.selectedBibleVerse = nextVerse;
      state.selectedBibleVerses = nextVerse ? [nextVerse] : [];
      state.lastSelectedBibleVerse = nextVerse || null;
      persistUiState();
      syncBrowserHistory();
      await loadBibleBookVerses({ silent: true });
      focusSelectedBibleVerseAfterRender();
    }
    return;
  }
  state.selectedBookCode = bookCode;
  state.selectedScriptureId = null;
  state.selectedBibleChapter = nextChapter;
  state.selectedBibleVerse = nextVerse;
  state.selectedBibleVerses = nextVerse ? [nextVerse] : [];
  state.lastSelectedBibleVerse = nextVerse || null;
  state.bibleBookVerses = [];
  state.dirty.scripture = false;
  persistUiState();
  render();
  syncBrowserHistory();
  focusSelectedItemAfterRender();
  if (!state.bibleTranslations.length && !state.bibleReaderError) await loadBibleTranslations({ silent: true });
  await loadBibleBookVerses({ silent: true });
  focusSelectedBibleVerseAfterRender();
}

async function loadForms(versionId) {
  if (!requireClient()) return;
  if (!versionId) return;

  const version = getSelectedVersion();
  state.forms = normalizeForms((version?.forms || []).map((form) => withLocalId({ ...form, song_id: versionId })));
  render();
}

async function createSong() {
  if (!requireClient()) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  const title = nextUntitledTitle();
  const defaultVersion = {
    id: createLocalId(),
    name: "Default",
    is_primary: true,
    forms: [],
  };
  const payload = {
    title,
    alt_titles: [],
    memo: JSON.stringify({ versions: [defaultVersion] }),
    is_active: true,
  };

  const { data, error } = await state.client
    .from("mindex_songs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    showToast(error.message, "error");
    return;
  }

  state.songs = [normalizeServerSong(data), ...state.songs].sort(sortSongs);
  state.selectedSongId = data.id;
  state.selectedVersionId = data.id;
  state.forms = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  persistUiState();
  render();
  showToast("Song created.");
}

async function createCurrentItem() {
  if (state.module === "service") return;
  if (state.module === "scripture") {
    await createScripture();
    return;
  }

  await createSong();
}

async function createScripture() {
  if (!requireClient()) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  const title = nextUntitledScriptureTitle();
  const payload = {
    title,
    book_code: null,
    book: "",
    reference: "",
    translation: "",
    text: "",
    memo: null,
    is_active: true,
  };

  const { data, error } = await state.client
    .from("mindex_scriptures")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    showToast(error.message, "error");
    return;
  }

  state.scriptureError = "";
  state.scriptures = [normalizeServerScripture(data), ...state.scriptures].sort(sortScriptures);
  state.selectedScriptureId = data.id;
  state.dirty.scripture = false;
  persistUiState();
  render();
  showToast("Scripture created.");
}

async function deleteSelectedSong() {
  const song = getSelectedSong();
  if (!song || !requireClient()) return;
  if (!confirm(`Delete "${song.title}"?`)) return;

  const { error } = await state.client.from("mindex_songs").delete().eq("id", song.id);

  if (error) {
    showToast(error.message, "error");
    return;
  }

  state.songs = state.songs.filter((item) => item.id !== song.id);
  state.selectedSongId = null;
  state.selectedVersionId = null;
  state.forms = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  persistUiState();
  render();
  showToast("Song deleted.");
}

async function saveAll() {
  if (state.module === "service") {
    await saveService();
    return;
  }
  if (state.module === "scripture") {
    await saveScripture();
    return;
  }

  const song = getSelectedSong();
  if (!song || !requireClient() || state.saving) return;

  const title = (song.title || "").trim();
  if (!title) {
    showToast("Title is required.", "error");
    return;
  }

  state.saving = true;
  updateSaveState();

  try {
    writeFormsToSelectedVersion();
    await saveSongMeta(song);
    state.songs = state.songs.sort(sortSongs);
    state.dirty.song = false;
    state.dirty.forms = false;
    showToast("Saved.");
    render();
  } catch (error) {
    showToast(error.message || "Save failed.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveScripture() {
  const scripture = getSelectedScripture();
  if (!scripture || !requireClient() || state.saving) return;

  const title = (scripture.title || "").trim();
  if (!title) {
    showToast("Title is required.", "error");
    return;
  }

  state.saving = true;
  updateSaveState();

  try {
    const { data, error } = await state.client
      .from("mindex_scriptures")
      .update({
        title,
        book_code: scripture.book_code || null,
        book: scripture.book || "",
        reference: scripture.reference || "",
        translation: scripture.translation || "",
        text: scripture.text || "",
        memo: scripture.memo || null,
      })
      .eq("id", scripture.id)
      .select("*")
      .single();

    if (error) throw error;

    Object.assign(scripture, normalizeServerScripture(data));
    state.scriptures = state.scriptures.sort(sortScriptures);
    state.dirty.scripture = false;
    showToast("Saved.");
    render();
  } catch (error) {
    showToast(error.message || "Save failed.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveService() {
  const service = state.services.find((svc) => svc.id === state.selectedServiceId);
  if (!service || !requireClient() || state.saving) return;

  const items = normalizeServiceItems(getServiceItems(service.id));
  const invalid = items.find((item) => !String(item.raw_title || "").trim());
  if (invalid) {
    showToast("Service item text is required.", "error");
    return;
  }

  state.saving = true;
  updateSaveState();

  try {
    if (state.dirtyServiceTypeIds.has(service.type_id)) {
      const typeObj = serviceTypeById(service.type_id);
      const fixedItems = serializeServiceDefaultItems(service.type_id);
      const { data: typeData, error: typeError } = await state.client
        .from("mindex_service_types")
        .update({ fixed_items: fixedItems })
        .eq("id", service.type_id)
        .select("*")
        .single();
      if (typeError) {
        const message = /policy|permission|rls/i.test(typeError.message || "")
          ? "Service defaults need mindex_service_types update permission. Run the service type write-policy SQL."
          : typeError.message;
        throw new Error(message);
      }
      if (typeObj && typeData) Object.assign(typeObj, typeData);
      state.dirtyServiceTypeIds.delete(service.type_id);
    }

    const { error: deleteError } = await state.client
      .from("mindex_service_items")
      .delete()
      .eq("service_id", service.id);
    if (deleteError) throw deleteError;

    if (items.length) {
      const rows = items.map((item, index) => ({
        service_id: service.id,
        sort_order: index + 1,
        label: nullIfBlank(item.label),
        raw_title: String(item.raw_title || "").trim(),
        song_id: item.song_id || null,
      }));
      const { data, error } = await state.client
        .from("mindex_service_items")
        .insert(rows)
        .select("id,service_id,sort_order,label,raw_title,song_id")
        .order("sort_order");
      if (error) throw error;
      state.serviceItems[service.id] = normalizeServiceItems(data || []);
    } else {
      state.serviceItems[service.id] = [];
    }

    // Save service metadata (leader, tags)
    const { error: metaError } = await state.client
      .from("mindex_services")
      .update({
        leader: nullIfBlank(service.leader),
        tags: service.tags || [],
      })
      .eq("id", service.id);
    if (metaError) throw metaError;

    state.dirty.service = false;
    showToast("Service saved.");
    render();
  } catch (error) {
    showToast(error.message || "Service save failed.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveSongMeta(song) {
  const metadata = normalizeSongMetadata(song.metadata);
  const hasPromotedColumns = hasPromotedSongMetadataColumns(song);
  const hasScriptureRefsColumn = hasSongColumn(song, "scripture_refs");
  const payload = {
    title: cleanSongTitleForSave(song),
    alt_titles: cleanList(song.alt_titles),
    subtitle: nullIfBlank(song.subtitle),
    original_title: nullIfBlank(song.original_title),
    hymn_no: nullIfBlank(song.hymn_no),
    memo: serializeSongMemo(song, {
      omitPromotedMetadata: hasPromotedColumns,
      omitScripture: hasScriptureRefsColumn,
    }),
  };

  if (hasPromotedColumns) {
    Object.assign(payload, promotedSongMetadataPayload(song, metadata));
  }

  if (hasScriptureRefsColumn) {
    payload.scripture_refs = cleanList(song.scripture);
  }

  const { data, error } = await state.client
    .from("mindex_songs")
    .update(payload)
    .eq("id", song.id)
    .select("*")
    .single();

  if (error) throw error;

  Object.assign(song, normalizeServerSong(data));
}

function writeFormsToSelectedVersion() {
  state.forms = normalizeForms(state.forms);
  const version = getSelectedVersion();
  if (!version) return;
  version.forms = state.forms.map((form, index) => ({
    id: form.id || createLocalId(),
    part_type: form.part_type,
    part_number: form.part_number,
    lyrics: form.lyrics || "",
    sort_order: index + 1,
    ...(form.review_status && form.review_status !== "reviewed" ? { review_status: form.review_status } : {}),
    ...(form.review_status === "reviewed" ? { review_status: "reviewed" } : {}),
    ...(form.import_source ? { import_source: form.import_source } : {}),
  }));
}

function handleDetailClick(event) {
  const openSongBtn = event.target.closest("[data-open-song]");
  if (openSongBtn) {
    openGlobalSongResult(openSongBtn.dataset.openSong);
    return;
  }

  const copyServiceDraftButton = event.target.closest("[data-copy-service-draft]");
  if (copyServiceDraftButton) {
    copyServicePptDraft(copyServiceDraftButton.dataset.copyServiceDraft);
    return;
  }

  const newServiceBtn = event.target.closest("[data-new-service]");
  if (newServiceBtn) {
    if (!confirmDiscardServiceChanges()) return;
    const typeId = newServiceBtn.dataset.newService;
    state.newServiceForm = { type_id: typeId, date: "", leader: "", tags: "" };
    renderServiceDetail();
    return;
  }

  const cancelNewServiceBtn = event.target.closest("[data-cancel-new-service]");
  if (cancelNewServiceBtn) {
    state.newServiceForm = null;
    renderServiceDetail();
    return;
  }

  const createServiceBtn = event.target.closest("[data-create-service]");
  if (createServiceBtn) {
    createService();
    return;
  }

  const deleteServiceBtn = event.target.closest("[data-delete-service]");
  if (deleteServiceBtn) {
    deleteService(deleteServiceBtn.dataset.deleteService);
    return;
  }

  const serviceDefaultAction = event.target.closest("[data-service-default-action]");
  if (serviceDefaultAction) {
    runServiceDefaultItemAction(
      serviceDefaultAction.dataset.serviceDefaultAction,
      Number(serviceDefaultAction.dataset.serviceDefaultIndex),
    );
    return;
  }

  const serviceItemAction = event.target.closest("[data-service-item-action]");
  if (serviceItemAction) {
    runServiceItemAction(
      serviceItemAction.dataset.serviceItemAction,
      Number(serviceItemAction.dataset.serviceItemIndex),
      serviceItemAction.dataset.serviceItemLabel || "",
      serviceItemAction.dataset.serviceItemTitle || "",
    );
    return;
  }

  const copyServiceButton = event.target.closest("[data-copy-service]");
  if (copyServiceButton) {
    copyService(copyServiceButton.dataset.copyService);
    return;
  }

  const serviceTypeCard = event.target.closest("[data-select-service-type]");
  if (serviceTypeCard) {
    if (!confirmDiscardServiceChanges()) return;
    state.selectedServiceTypeId = serviceTypeCard.dataset.selectServiceType;
    state.selectedServiceId = null;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    return;
  }

  const serviceDateCard = event.target.closest(".service-date-card[data-service-id]");
  if (serviceDateCard) {
    selectService(serviceDateCard.dataset.serviceId);
    renderServiceList();
    return;
  }

  const closeMetadata = event.target.closest("[data-close-metadata]");
  if (closeMetadata || (state.metadataPopupOpen && event.target.matches(".metadata-popover-layer"))) {
    state.metadataPopupOpen = false;
    renderDetail();
    return;
  }

  const openMetadata = event.target.closest("[data-open-metadata]");
  if (openMetadata) {
    state.metadataPopupOpen = true;
    renderDetail();
    return;
  }

  const bibleReaderAction = event.target.closest("[data-bible-reader-action]");
  if (bibleReaderAction) {
    changeBibleChapter(Number(bibleReaderAction.dataset.bibleReaderAction) || 0);
    return;
  }

  const copyBibleVerse = event.target.closest("[data-copy-bible-verse]");
  if (copyBibleVerse) {
    copyBibleVerses([Number(copyBibleVerse.dataset.copyBibleVerse)]);
    return;
  }

  const copyBibleSearchResult = event.target.closest("[data-copy-bible-search-result]");
  if (copyBibleSearchResult) {
    copyBibleSearchResultAt(Number(copyBibleSearchResult.dataset.copyBibleSearchResult));
    return;
  }

  const bibleSearchResult = event.target.closest("[data-bible-search-result]");
  if (bibleSearchResult) {
    navigateToBibleSearchResult(Number(bibleSearchResult.dataset.bibleSearchResult));
    return;
  }

  const bibleSearchPage = event.target.closest("[data-bible-search-page]");
  if (bibleSearchPage) {
    changeBibleTextSearchPage(Number(bibleSearchPage.dataset.bibleSearchPage || 0));
    return;
  }

  const bibleVerse = event.target.closest("[data-bible-verse]");
  if (bibleVerse) {
    if (state.suppressBibleVerseClick) {
      state.suppressBibleVerseClick = false;
      return;
    }
    selectBibleVerse(Number(bibleVerse.dataset.bibleVerse), {
      additive: event.metaKey || event.ctrlKey,
      range: event.shiftKey,
    });
    return;
  }

  const addButton = event.target.closest("[data-add-form]");
  if (addButton) {
    addForm(addButton.dataset.addForm);
    return;
  }

  const addVersionButton = event.target.closest("[data-add-version]");
  if (addVersionButton) {
    addVersion(addVersionButton.dataset.sourceVersionId);
    return;
  }

  const formAction = event.target.closest("[data-form-action]");
  if (formAction) {
    runFormAction(formAction.dataset.formAction, Number(formAction.dataset.index));
    return;
  }

  const copyAction = event.target.closest("[data-copy-action]");
  if (copyAction) {
    runCopyAction(copyAction.dataset.copyAction, Number(copyAction.dataset.index));
    return;
  }

  const versionTarget = event.target.closest("[data-version-id]");
  if (versionTarget) {
    selectVersion(versionTarget.dataset.versionId);
    return;
  }

  const deleteSongButton = event.target.closest("[data-delete-song]");
  if (deleteSongButton) {
    deleteSelectedSong();
  }
}

function handleDetailKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("button, input, textarea, select, a")) return;

  const bibleVerse = event.target.closest("[data-bible-verse]");
  if (bibleVerse) {
    event.preventDefault();
    selectBibleVerse(Number(bibleVerse.dataset.bibleVerse), {
      additive: event.metaKey || event.ctrlKey,
      range: event.shiftKey,
    });
    return;
  }

  const bibleSearchResult = event.target.closest("[data-bible-search-result]");
  if (bibleSearchResult) {
    event.preventDefault();
    navigateToBibleSearchResult(Number(bibleSearchResult.dataset.bibleSearchResult));
    return;
  }

  const versionTarget = event.target.closest(".version-picker[data-version-id]");
  if (!versionTarget) return;

  event.preventDefault();
  selectVersion(versionTarget.dataset.versionId);
}

function handleDetailPointerDown(event) {
  if (state.module !== "scripture" || event.button !== 0) return;
  if (event.target.closest("button, input, textarea, select, a")) return;

  const bibleVerse = event.target.closest("[data-bible-verse]");
  if (!bibleVerse) return;

  const verse = Number(bibleVerse.dataset.bibleVerse);
  if (!verse) return;
  state.bibleDragSelection = {
    start: verse,
    last: verse,
    additive: event.metaKey || event.ctrlKey,
    base: new Set(state.selectedBibleVerses),
    moved: false,
  };
}

function handleDetailPointerOver(event) {
  const drag = state.bibleDragSelection;
  if (!drag) return;
  const bibleVerse = event.target.closest("[data-bible-verse]");
  if (!bibleVerse) return;

  const verse = Number(bibleVerse.dataset.bibleVerse);
  if (!verse || verse === drag.last) return;
  drag.last = verse;
  drag.moved = true;
  applyBibleVerseDragSelection(drag);
}

function handleWindowPointerUp() {
  const drag = state.bibleDragSelection;
  if (!drag) return;
  state.suppressBibleVerseClick = drag.moved;
  if (drag.moved) {
    state.lastSelectedBibleVerse = drag.start;
    state.selectedBibleVerse = state.selectedBibleVerses[0] || null;
  }
  state.bibleDragSelection = null;
}

function handleDetailInput(event) {
  const serviceMetaField = event.target.closest("[data-service-meta-field]");
  if (serviceMetaField) {
    updateServiceMetaField(serviceMetaField);
    return;
  }

  const newServiceField = event.target.closest("[data-new-service-field]");
  if (newServiceField) {
    updateNewServiceFormField(newServiceField);
    return;
  }

  const serviceDefaultField = event.target.closest("[data-service-default-field]");
  if (serviceDefaultField) {
    updateServiceDefaultItemField(serviceDefaultField);
    return;
  }

  const serviceField = event.target.closest("[data-service-item-field]");
  if (serviceField) {
    updateServiceItemField(serviceField);
    return;
  }

  const scriptureField = event.target.closest("[data-scripture-field]");
  if (scriptureField) {
    updateScriptureField(scriptureField);
    return;
  }

  const songField = event.target.closest("[data-song-field]");
  if (songField) {
    updateSongField(songField);
    return;
  }

  const songMetaField = event.target.closest("[data-song-meta-field]");
  if (songMetaField) {
    updateSongMetadataField(songMetaField);
    return;
  }

  const formField = event.target.closest("[data-form-field]");
  if (formField) {
    updateFormField(formField);
    return;
  }

}

function handleDetailChange(event) {
  const serviceMetaField = event.target.closest("[data-service-meta-field]");
  if (serviceMetaField) {
    updateServiceMetaField(serviceMetaField);
    return;
  }

  const newServiceField = event.target.closest("[data-new-service-field]");
  if (newServiceField) {
    updateNewServiceFormField(newServiceField);
    return;
  }

  const serviceDefaultField = event.target.closest("[data-service-default-field]");
  if (serviceDefaultField) {
    updateServiceDefaultItemField(serviceDefaultField);
    return;
  }

  const serviceField = event.target.closest("[data-service-item-field]");
  if (serviceField) {
    updateServiceItemField(serviceField);
    return;
  }

  const bibleReaderField = event.target.closest("[data-bible-reader-field]");
  if (bibleReaderField) {
    updateBibleReaderField(bibleReaderField);
    return;
  }

  const scriptureField = event.target.closest("[data-scripture-field]");
  if (scriptureField) {
    updateScriptureField(scriptureField);
    return;
  }

  const songField = event.target.closest("[data-song-field]");
  if (songField) {
    updateSongField(songField);
    return;
  }

  const songMetaField = event.target.closest("[data-song-meta-field]");
  if (songMetaField) {
    updateSongMetadataField(songMetaField);
    return;
  }

  const formField = event.target.closest("[data-form-field]");
  if (formField) {
    updateFormField(formField);
    if (formField.dataset.formField === "part_type") {
      state.forms = normalizeForms(state.forms);
      renderDetail();
    }
    return;
  }

}

function updateBibleReaderField(field) {
  const key = field.dataset.bibleReaderField;
  if (key === "copy_reference") {
    state.bibleCopyReference = field.checked;
    persistUiState();
    return;
  }
  if (key === "translation") {
    state.selectedBibleTranslationId = field.value || null;
    state.selectedBibleChapter = 1;
    state.selectedBibleVerse = null;
    state.selectedBibleVerses = [];
    state.lastSelectedBibleVerse = null;
    state.bibleBookVerses = [];
    persistUiState();
    syncBrowserHistory();
    if (isBibleTextSearchActive()) {
      runBibleTextSearch(state.bibleTextSearchQuery, { page: 0 });
      return;
    }
    loadBibleBookVerses();
    return;
  }
  if (key === "chapter") {
    state.selectedBibleChapter = Number(field.value) || 1;
    state.selectedBibleVerse = null;
    state.selectedBibleVerses = [];
    state.lastSelectedBibleVerse = null;
    persistUiState();
    syncBrowserHistory();
    loadBibleBookVerses();
  }
}

function changeBibleChapter(delta) {
  const chapters = getBibleChapterOptions();
  if (!chapters.length || !delta) return;
  const currentIndex = chapters.indexOf(state.selectedBibleChapter);
  const nextIndex = currentIndex >= 0 ? currentIndex + delta : 0;
  const nextChapter = chapters[nextIndex];
  if (!nextChapter) return;
  state.selectedBibleChapter = nextChapter;
  state.selectedBibleVerse = null;
  state.selectedBibleVerses = [];
  state.lastSelectedBibleVerse = null;
  persistUiState();
  syncBrowserHistory();
  loadBibleBookVerses();
}

function selectBibleVerse(verse, options = {}) {
  if (!verse || verse < 1) return;
  const additive = Boolean(options.additive);
  const range = Boolean(options.range);
  const selected = new Set(additive ? state.selectedBibleVerses : []);

  if (range) {
    const anchor = Number(state.lastSelectedBibleVerse || state.selectedBibleVerse || state.selectedBibleVerses.at(-1) || verse);
    const rangeVerses = bibleVerseRange(anchor, verse);
    if (!additive) selected.clear();
    rangeVerses.forEach((item) => selected.add(item));
  } else if (additive) {
    if (selected.has(verse)) selected.delete(verse);
    else selected.add(verse);
    state.lastSelectedBibleVerse = verse;
  } else {
    selected.clear();
    selected.add(verse);
    state.lastSelectedBibleVerse = verse;
  }

  state.selectedBibleVerses = [...selected].sort((a, b) => a - b);
  state.selectedBibleVerse = state.selectedBibleVerses[0] || null;
  syncBibleVerseSelectionClasses();
}

function applyBibleVerseDragSelection(drag) {
  const selected = new Set(drag.additive ? [...drag.base] : []);
  bibleVerseRange(drag.start, drag.last).forEach((verse) => selected.add(verse));
  state.selectedBibleVerses = [...selected].sort((a, b) => a - b);
  state.selectedBibleVerse = state.selectedBibleVerses[0] || null;
  syncBibleVerseSelectionClasses();
}

function bibleVerseRange(start, end) {
  const [from, to] = [Number(start), Number(end)].sort((a, b) => a - b);
  return state.bibleBookVerses
    .filter((verse) => Number(verse.chapter) === state.selectedBibleChapter)
    .map((verse) => Number(verse.verse))
    .filter((verse) => verse >= from && verse <= to)
    .sort((a, b) => a - b);
}

function syncBibleVerseSelectionClasses() {
  const selected = new Set(state.selectedBibleVerses);
  refs.detailPane?.querySelectorAll("[data-bible-verse]").forEach((node) => {
    node.classList.toggle("selected", selected.has(Number(node.dataset.bibleVerse)));
    node.setAttribute("aria-selected", String(selected.has(Number(node.dataset.bibleVerse))));
  });
}

function copySelectedBibleVersesFromShortcut(event) {
  if (state.module !== "scripture" || !state.selectedBibleVerses.length) return false;
  if (shouldKeepHorizontalNavigationInFocusedControl(event.target)) return false;
  event.preventDefault();
  copyBibleVerses(state.selectedBibleVerses);
  return true;
}

function copyBibleVerses(verseNumbers) {
  const text = formatBibleVersesForCopy(verseNumbers);
  if (!text) return;
  copyText(text);
}

function copyBibleSearchResultAt(index) {
  const verse = state.bibleTextSearchResults[index];
  if (!verse) return;
  copyText(formatBibleSearchResultForCopy(verse));
}

function navigateToBibleSearchResult(index) {
  const verse = state.bibleTextSearchResults[index];
  if (!verse) return;
  resetScriptureSearchInput();
  selectScriptureBook(verse.book_code, {
    chapter: verse.chapter,
    verse: verse.verse,
    force: true,
  });
}

function updateSongField(field) {
  const song = getSelectedSong();
  if (!song) return;

  const key = field.dataset.songField;
  if (key === "is_active") {
    song[key] = field.checked;
  } else if (key === "alt_titles") {
    song[key] = parseList(field.value);
  } else if (key === "scripture") {
    song.scripture = parseList(field.value);
  } else {
    song[key] = field.value;
  }

  if (key === "title") {
    updateEditorTitle(song);
  }

  state.dirty.song = true;
  updateSaveState();
}

function updateSongMetadataField(field) {
  const song = getSelectedSong();
  if (!song) return;

  const key = field.dataset.songMetaField;
  const metadata = normalizeSongMetadata(song.metadata);
  if (key === "praiseTypes") {
    metadata.praiseTypes = normalizePraiseTypes(parseList(field.value));
  } else {
    metadata[key] = field.value;
  }
  song.metadata = normalizeSongMetadata(metadata);
  state.dirty.song = true;
  updateSaveState();
}

function updateScriptureField(field) {
  const scripture = getSelectedScripture();
  if (!scripture) return;

  const key = field.dataset.scriptureField;
  scripture[key] = field.value;
  if (key === "book_code") {
    const book = findBibleBookByCode(field.value);
    scripture.book_code = field.value;
    scripture.book = book?.koreanName || "";
  }

  if (key === "title") {
    updateEditorTitle(scripture);
  }

  state.dirty.scripture = true;
  updateSaveState();
}

function updateFormField(field) {
  const index = Number(field.dataset.index);
  const form = state.forms[index];
  if (!form) return;

  const key = field.dataset.formField;
  form[key] = field.value;
  if (key === "part_type" || key === "lyrics") {
    delete form.review_status;
    delete form.import_source;
  }
  if (key === "part_type" && !PART_TYPES.includes(form.part_type)) {
    form.part_type = "Verse";
  }
  if (key === "lyrics") {
    resizeFormTextarea(field);
  }

  state.dirty.forms = true;
  updateSaveState();
}

function addForm(type) {
  const song = getSelectedSong();
  if (!song) return;

  state.forms.push(
    withLocalId({
      id: null,
      song_id: getSelectedVersionId(),
      part_type: type,
      part_number: null,
      lyrics: "",
      sort_order: state.forms.length + 1,
    }),
  );
  state.forms = normalizeForms(state.forms);
  state.dirty.forms = true;
  renderDetail();
  updateSaveState();
}

function addVersion(sourceVersionId = getSelectedVersionId()) {
  const song = getSelectedSong();
  if (!song) return;

  try {
    writeFormsToSelectedVersion();
  } catch {
    return;
  }

  const versions = song.versions || [];
  const sourceVersion = versions.find((version) => version.id === sourceVersionId) || getSelectedVersion() || versions[0] || {
    id: getSelectedVersionId(),
    forms: state.forms,
  };
  const defaultName = `Version ${versions.length + 1}`;
  const name = prompt("Version name", defaultName);
  if (name === null) return;

  const cleanName = name.trim() || defaultName;
  const versionId = createLocalId();
  const sourceForms = getFormsForVersion(sourceVersion).map((form, index) =>
    withLocalId({
      id: createLocalId(),
      song_id: versionId,
      part_type: form.part_type,
      part_number: form.part_number,
      lyrics: form.lyrics || "",
      sort_order: index + 1,
    }),
  );

  song.versions = [
    ...(song.versions || []),
    {
      id: versionId,
      name: cleanName,
      raw_section_name: cleanName,
      hymn_no: null,
      is_primary: false,
      forms: sourceForms.map(({ _localId, ...form }) => form),
    },
  ];
  state.selectedVersionId = versionId;
  state.forms = normalizeForms(sourceForms);
  state.dirty.forms = true;
  persistUiState();
  renderDetail();
  updateSaveState();
}

function runFormAction(action, index) {
  const form = state.forms[index];
  if (!form) return;

  if (action === "up" && index > 0) {
    [state.forms[index - 1], state.forms[index]] = [state.forms[index], state.forms[index - 1]];
  }

  if (action === "down" && index < state.forms.length - 1) {
    [state.forms[index + 1], state.forms[index]] = [state.forms[index], state.forms[index + 1]];
  }

  if (action === "copy") {
    copyText(formatBlockForCopy(form));
    return;
  }

  if (action === "mark-reviewed") {
    form.review_status = "reviewed";
    delete form.import_source;
  }

  if (action === "delete") {
    state.forms.splice(index, 1);
  }

  state.forms = normalizeForms(state.forms);
  state.dirty.forms = true;
  renderDetail();
  updateSaveState();
}

function updateServiceMetaField(field) {
  const service = state.services.find((s) => s.id === state.selectedServiceId);
  if (!service) return;
  const key = field.dataset.serviceMetaField;
  if (key === "leader") {
    service.leader = field.value;
  } else if (key === "tags") {
    service.tags = field.value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  state.dirty.service = true;
  updateSaveState();
}

function updateNewServiceFormField(field) {
  if (!state.newServiceForm) return;
  const key = field.dataset.newServiceField;
  if (["date", "leader", "tags"].includes(key)) {
    state.newServiceForm[key] = field.value;
  }
}

function updateServiceItemField(field) {
  const items = getServiceItems(state.selectedServiceId);
  const index = Number(field.dataset.serviceItemIndex);
  const item = items[index];
  if (!item) return;

  const key = field.dataset.serviceItemField;
  if (key === "label" || key === "raw_title") {
    item[key] = field.value;
  }
  state.serviceItems[state.selectedServiceId] = normalizeServiceItems(items);
  state.dirty.service = true;
  updateSaveState();
}

function updateServiceDefaultItemField(field) {
  const typeId = state.selectedServiceTypeId;
  const index = Number(field.dataset.serviceDefaultIndex);
  const key = field.dataset.serviceDefaultField;
  if (!typeId || !Number.isFinite(index) || !["label", "raw_title"].includes(key)) return;

  const items = getServiceDefaultItems(typeId);
  if (!items[index]) return;
  items[index][key] = field.value;
  setServiceDefaultItems(typeId, items);
}

function runServiceItemAction(action, index, label = "", title = "") {
  const serviceId = state.selectedServiceId;
  if (!serviceId) return;
  const items = normalizeServiceItems(getServiceItems(serviceId));

  if (action === "add") {
    items.push(normalizeServiceItem({
      service_id: serviceId,
      sort_order: items.length + 1,
      label,
      raw_title: title,
    }, items.length));
  }

  const item = items[index];
  if (action === "up" && item && index > 0) {
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
  }
  if (action === "down" && item && index < items.length - 1) {
    [items[index + 1], items[index]] = [items[index], items[index + 1]];
  }
  if (action === "duplicate" && item) {
    items.splice(index + 1, 0, normalizeServiceItem({ ...item, id: createLocalId() }, index + 1));
  }
  if (action === "delete" && item) {
    items.splice(index, 1);
  }

  state.serviceItems[serviceId] = normalizeServiceItems(items);
  state.dirty.service = true;
  renderServiceDetail();
  updateSaveState();
}

function runServiceDefaultItemAction(action, index) {
  const typeId = state.selectedServiceTypeId;
  if (!typeId) return;

  const items = getServiceDefaultItems(typeId);
  const item = items[index];
  if (!item && action !== "add") return;

  if (action === "add") {
    items.push(normalizeServiceDefaultItem({ label: "", raw_title: "" }, items.length));
  }
  if (action === "up" && item && index > 0) {
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
  }
  if (action === "down" && item && index < items.length - 1) {
    [items[index + 1], items[index]] = [items[index], items[index + 1]];
  }
  if (action === "duplicate" && item) {
    items.splice(index + 1, 0, normalizeServiceDefaultItem({ ...item, id: createLocalId() }, index + 1));
  }
  if (action === "delete" && item) {
    items.splice(index, 1);
  }
  if (action === "sort") {
    const template = serviceOrderTemplate(typeId);
    const labelOrder = new Map(template.map((step, i) => [step.label, i]));
    const ranked = items.map((it) => ({ it, rank: labelOrder.has(it.label) ? labelOrder.get(it.label) : Infinity }));
    ranked.sort((a, b) => a.rank - b.rank || items.indexOf(a.it) - items.indexOf(b.it));
    items.splice(0, items.length, ...ranked.map((r) => r.it));
  }

  setServiceDefaultItems(typeId, items);
  renderServiceDetail();
}

function runCopyAction(action, index) {
  if (state.module === "scripture") {
    const scripture = getSelectedScripture();
    if (action === "scripture-slides") {
      copyText(formatScriptureSlidesForCopy(scripture));
      return;
    }
    copyText(formatScriptureForCopy(scripture));
    return;
  }

  if (action === "plain") {
    copyText(formatFullLyrics());
    return;
  }

  if (action === "download-freeshow") {
    try {
      downloadTextFile(formatFreeShowShowJson(), getShowFileName(getSelectedSong(), getSelectedVersion()), "application/json");
    } catch (error) {
      showToast(error.message || "FreeShow file export failed.", "error");
    }
    return;
  }

  if (action === "download-xml") {
    try {
      downloadTextFile(formatSongXml(), getXmlFileName(getSelectedSong(), getSelectedVersion()), "application/xml");
    } catch (error) {
      showToast(error.message || "XML export failed.", "error");
    }
    return;
  }

  if (action === "block") {
    const form = state.forms[index];
    if (form) copyText(formatBlockForCopy(form));
    return;
  }

  if (action === "lyrics") {
    const form = state.forms[index];
    if (form) copyText(form.lyrics || "");
    return;
  }

  if (action === "label") {
    const form = state.forms[index];
    if (form) copyText(displayLabel(form));
  }
}

function render() {
  document.body.dataset.module = state.module;
  renderModuleSwitcher();
  renderConnectionStatus();
  renderSongList();
  renderDetail();
  updateSaveState();
  refreshIcons();
}

function renderModuleSwitcher() {
  for (const button of refs.moduleButtons) {
    const active = button.dataset.module === state.module;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  refs.searchInput.placeholder =
    state.module === "scripture"
      ? "Book, ref, text..."
      : state.module === "service"
        ? "Setlist, date, praise lead..."
        : "Title, lyrics, #...";
  refs.searchInput.title =
    state.module === "scripture"
      ? "Search or jump: 창 1:1, Gen 1:1, 히브리서, 태초"
      : state.module === "service"
        ? "Search setlists by song, date, tag, or praise lead."
        : "Search songs by title, lyrics, hymn number, or metadata.";
  refs.searchInput.setAttribute("aria-label", refs.searchInput.title);
  refs.newSongBtn.title =
    state.module === "scripture"
      ? "New scripture"
      : state.module === "service"
        ? "Service items are edited in the detail pane"
        : "New song";
  refs.newSongBtn.disabled = state.module === "service";
  refs.saveAllBtn.title =
    state.module === "scripture"
      ? "Save scripture"
      : state.module === "service"
        ? "Save service"
        : "Save song";
  refs.saveAllBtn.setAttribute("aria-label", refs.saveAllBtn.title);
  renderListFilter();
}

const SERVICE_CATEGORIES = {
  public: ["sunday-main","sunday-afternoon","wednesday","friday","monthly","dawn","omer"],
  ministry: ["children","youth","young-adult"],
};

function renderListFilter() {
  if (state.module === "service") {
    refs.listFilter.hidden = false;
    refs.listFilter.setAttribute("aria-label", "Service filter");
    const filters = [["all","전체"],["public","공예배"],["ministry","부서예배"],["calendar","교회력"]];
    const active = state.serviceFilter || "all";
    refs.listFilterButtons.forEach((btn, i) => {
      if (i < filters.length) {
        const [val, lbl] = filters[i];
        btn.dataset.listFilter = val;
        btn.textContent = lbl;
        btn.hidden = false;
        btn.classList.toggle("active", val === active);
        btn.setAttribute("aria-pressed", String(val === active));
      } else {
        btn.hidden = true;
      }
    });
    return;
  }

  refs.listFilter.hidden = false;
  refs.listFilter.setAttribute("aria-label", state.module === "scripture" ? "Scripture filter" : "Praise filter");
  const filters = state.module === "scripture"
    ? [["all", "All"], ["old", "OT"], ["new", "NT"]]
    : [["all", "All"], ["hymns", "Hymns"], ["ccm", "CCM"]];
  const activeFilter = state.module === "scripture" ? state.scriptureFilter : state.praiseFilter;
  refs.listFilterButtons.forEach((button, index) => {
    if (index < filters.length) {
      const [value, label] = filters[index];
      button.dataset.listFilter = value;
      button.textContent = label;
      button.hidden = false;
      const active = value === activeFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    } else {
      button.hidden = true;
    }
  });
}

function renderConnectionStatus() {
  const hasClient = Boolean(state.client);
  const hasDirty = hasDirtyChanges();
  function setStatusIcon(icon, cls, title) {
    refs.connectionStatus.className = "status-icon" + (cls ? " " + cls : "");
    refs.connectionStatus.title = title;
    refs.connectionStatus.innerHTML = `<i data-lucide="${icon}"></i>`;
    refreshIcons();
  }

  if (state.loading) {
    setStatusIcon("loader-2", "", "Loading…");
    return;
  }

  if (state.connectionError) {
    setStatusIcon("database", "error", state.connectionError);
    return;
  }

  if (!hasClient) {
    setStatusIcon("database", "", "Disconnected");
    return;
  }

  if (hasDirty) {
    setStatusIcon("database", "unsaved", "Unsaved changes");
    return;
  }

  setStatusIcon("database", "connected", "Connected");
}

function renderSongList() {
  if (isGlobalSearchActive()) {
    renderGlobalSearchList();
    return;
  }

  if (state.module === "scripture") {
    renderScriptureList();
    return;
  }
  if (state.module === "service") {
    renderServiceList();
    return;
  }

  const filtered = getFilteredSongs();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  const filterBase = getSongsForPraiseFilter();
  refs.songCount.textContent = hasSearch
    ? `${filtered.length} of ${filterBase.length} songs`
    : `${filtered.length} ${filtered.length === 1 ? "song" : "songs"}`;

  if (!filtered.length) {
    refs.songList.innerHTML = renderListEmptyState(
      "No songs",
      hasSearch ? "Try a different title, lyric, or number." : "Songs will appear here once connected.",
    );
    return;
  }

  refs.songList.innerHTML = filtered
    .map((song) => {
      const active = song.id === state.selectedSongId ? " active" : "";
      const muted = song._outOfFilter ? " muted" : "";
      const view = songListView(song);
      return `
        <button class="song-item${active}${muted}" type="button" data-song-id="${escapeAttr(song.id)}">
          <span class="song-title">
            ${view.showHymnMarker ? `<span class="song-hymn-no">${escapeHtml(formatHymnMarker(song.hymn_no))}</span>` : ""}
            <span class="song-title-text">${escapeHtml(view.title)}</span>
            ${song.versions?.length > 1 ? `<span class="song-count-badge">${song.versions.length}</span>` : ""}
            ${renderSongAttentionIcon(song)}
          </span>
          ${view.meta ? `<span class="song-meta-line">${escapeHtml(view.meta)}</span>` : ""}
        </button>
      `;
    })
    .join("");
  finishListRender();
}

function isGlobalSearchActive() {
  return Boolean(normalizeSearchValue(state.search));
}

function renderGlobalSearchList() {
  const results = getGlobalSearchResults();
  const total = results.praise.length + results.scripture.length + results.service.length;
  refs.songCount.textContent = `${total} ${total === 1 ? "result" : "results"}`;

  if (!total) {
    refs.songList.innerHTML = renderListEmptyState("No results", "Search songs, books, references, Bible text, or services.");
    return;
  }

  refs.songList.innerHTML = [
    renderGlobalSearchSection("Praise", results.praise.map(renderGlobalPraiseResult).join("")),
    renderGlobalSearchSection("Scripture", results.scripture.map(renderGlobalScriptureResult).join("")),
    renderGlobalSearchSection("Service", results.service.map(renderGlobalServiceResult).join("")),
  ].filter(Boolean).join("");
  finishListRender();
}

function renderGlobalSearchSection(title, itemsHtml) {
  if (!itemsHtml) return "";
  return `
    <section class="global-search-section">
      <h3 class="global-search-heading">${escapeHtml(title)}</h3>
      ${itemsHtml}
    </section>
  `;
}

function getGlobalSearchResults() {
  const query = normalizeSearchValue(state.search);
  const tokens = getSearchTokens(query);
  return {
    praise: getGlobalPraiseResults(tokens),
    scripture: getGlobalScriptureResults(query, tokens),
    service: getGlobalServiceResults(query),
  };
}

function getGlobalPraiseResults(tokens) {
  if (!tokens.length) return [];
  return state.songs
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens) }))
    .filter((item) => item.match)
    .sort((a, b) => b.match.score - a.match.score || sortSongsForCurrentList(a.song, b.song))
    .slice(0, 8)
    .map((item) => item.song);
}

function getGlobalScriptureResults(query, tokens) {
  if (!query) return [];

  const results = [];
  const reference = parseBibleReference(query);
  const exactBook = findBibleBookByReferenceName(query) || findBibleBookByName(query);

  if (reference) {
    results.push({ kind: "reference", book: reference.book, chapter: reference.chapter, verse: reference.verse });
  }

  const bookMatches = getBibleBooks()
    .map((book) => ({ book, match: getBibleBookSearchMatch(book, tokens) }))
    .filter((item) => item.match)
    .sort((a, b) => sortBibleBooks(a.book, b.book))
    .slice(0, reference ? 4 : 5)
    .map((item) => ({ kind: "book", book: item.book }));

  for (const match of bookMatches) {
    if (results.some((result) => result.book.code === match.book.code)) continue;
    results.push(match);
  }

  if (!reference && !exactBook) results.push({ kind: "text", query: state.search });
  return results.slice(0, 6);
}

function getGlobalServiceResults(query) {
  if (!query) return [];
  return sortServicesByDate(state.services.filter((service) => serviceMatchesSearch(service, query)), "desc").slice(0, 8);
}

function renderGlobalPraiseResult(song) {
  const view = songListView(song);
  return `
    <button class="song-item global-search-result" type="button" data-global-song-id="${escapeAttr(song.id)}">
      <span class="song-title">
        ${view.showHymnMarker ? `<span class="song-hymn-no">${escapeHtml(formatHymnMarker(song.hymn_no))}</span>` : ""}
        <span class="song-title-text">${escapeHtml(view.title)}</span>
        ${song.versions?.length > 1 ? `<span class="song-count-badge">${song.versions.length}</span>` : ""}
        ${renderSongAttentionIcon(song)}
      </span>
      ${view.meta ? `<span class="song-meta-line">${escapeHtml(view.meta)}</span>` : ""}
    </button>
  `;
}

function renderGlobalScriptureResult(result) {
  if (result.kind === "text") {
    return `
      <button class="song-item global-search-result" type="button" data-global-bible-text="true">
        <span class="song-title">
          <span class="song-title-text">Search Bible text</span>
        </span>
        <span class="song-meta-line">${escapeHtml(String(result.query || "").trim())}</span>
      </button>
    `;
  }

  const book = result.book;
  const suffix = result.kind === "reference"
    ? ` ${result.chapter}${result.verse ? `:${result.verse}` : ""}`
    : "";
  const marker = formatBookMarker(book.sortOrder);
  const meta = [book.englishName, book.testament].filter(Boolean).join(META_SEPARATOR);
  return `
    <button
      class="song-item global-search-result"
      type="button"
      data-global-book-code="${escapeAttr(book.code)}"
      ${result.chapter ? `data-global-chapter="${escapeAttr(result.chapter)}"` : ""}
      ${result.verse ? `data-global-verse="${escapeAttr(result.verse)}"` : ""}
    >
      <span class="song-title">
        <span class="song-hymn-no">${escapeHtml(marker)}</span>
        <span class="song-title-text">${escapeHtml(`${book.koreanName || book.englishName}${suffix}`)}</span>
      </span>
      ${meta ? `<span class="song-meta-line">${escapeHtml(meta)}</span>` : ""}
    </button>
  `;
}

function renderGlobalServiceResult(service) {
  const meta = [
    serviceTypeName(service.type_id),
    serviceLeaderLabel(service) ? `찬양 인도: ${serviceLeaderLabel(service)}` : "",
  ].filter(Boolean).join(META_SEPARATOR);
  const preview = serviceItemPreview(service.id);
  return `
    <button class="song-item global-search-result" type="button" data-global-service-id="${escapeAttr(service.id)}">
      <span class="song-title">
        <span class="song-title-text">${escapeHtml(formatServiceDate(service))}</span>
      </span>
      <span class="song-meta-line">${escapeHtml([meta, preview].filter(Boolean).join(" · "))}</span>
    </button>
  `;
}

async function openGlobalSongResult(songId) {
  if (!songId) return;
  if (state.module !== "praise") {
    await switchModule("praise", { clearSearch: false, syncHistory: false });
    if (state.module !== "praise") return;
  }
  await selectSong(songId);
  if (state.selectedSongId !== songId) return;
  clearGlobalSearchInput();
  renderSongList();
  syncBrowserHistory();
}

async function openGlobalBookResult(bookCode, options = {}) {
  if (!bookCode) return;
  if (state.module !== "scripture") {
    await switchModule("scripture", { clearSearch: false, syncHistory: false });
    if (state.module !== "scripture") return;
  }
  clearGlobalSearchInput();
  await selectScriptureBook(bookCode, {
    chapter: toPositiveNumber(options.chapter),
    verse: toPositiveNumber(options.verse),
    force: Boolean(options.chapter || options.verse),
  });
}

async function openGlobalBibleTextResult() {
  const query = state.search;
  if (!normalizeSearchValue(query)) return;
  if (state.module !== "scripture") {
    await switchModule("scripture", { clearSearch: false, syncHistory: false });
    if (state.module !== "scripture") return;
  }
  await runBibleTextSearch(query);
}

async function openGlobalServiceResult(serviceId) {
  if (!serviceId) return;
  if (state.module !== "service") {
    await switchModule("service", { clearSearch: false, syncHistory: false });
    if (state.module !== "service") return;
  }
  selectService(serviceId);
  if (state.selectedServiceId !== serviceId) return;
  clearGlobalSearchInput();
  renderServiceList();
  syncBrowserHistory();
}

function clearGlobalSearchInput() {
  state.search = "";
  if (refs.searchInput) refs.searchInput.value = "";
  clearBibleTextSearch();
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function renderScriptureList() {
  const reference = parseBibleReference(state.search);
  const books = reference ? getBibleBooks() : getBibleBooksForScriptureFilter();
  const filtered = getFilteredBibleBooks();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  refs.songCount.textContent = hasSearch
    ? `${filtered.length} of ${books.length} books`
    : `${filtered.length} ${filtered.length === 1 ? "book" : "books"}`;

  if (state.scriptureError) {
    refs.songList.innerHTML = `<div class="song-list-empty">Run Scripture SQL first.</div>`;
    return;
  }

  if (!filtered.length) {
    refs.songList.innerHTML = renderListEmptyState(
      "No books",
      hasSearch && !reference
        ? "Press Enter to search Bible text."
        : "Try a book name or reference like 창 1:1 or Gen 1:1.",
    );
    return;
  }

  refs.songList.innerHTML = filtered
    .map((book) => {
      const active = book.code === state.selectedBookCode ? " active" : "";
      return `
        <button class="song-item${active}" type="button" data-book-code="${escapeAttr(book.code)}">
          <span class="song-title">
            <span class="song-hymn-no">${formatBookMarker(book.sortOrder)}</span>
            <span class="song-title-text">${escapeHtml(book.koreanName || book.englishName)}</span>
          </span>
        </button>
      `;
    })
    .join("");
  finishListRender();
}

function renderListEmptyState(title, detail) {
  return `
    <div class="song-list-empty">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function finishListRender() {
  restoreCurrentListScroll();
  refreshIcons();
}

function getListScrollKey() {
  const search = normalizeSearchValue(state.search);
  if (isGlobalSearchActive()) return `global:${search}`;
  if (state.module === "scripture") return `scripture:${state.scriptureFilter}:${search}`;
  if (state.module === "service") return `service:${state.serviceFilter}:${search}`;
  return `praise:${state.praiseFilter}:${search}`;
}

function saveCurrentListScroll() {
  if (!refs.songList) return;
  state.listScroll[getListScrollKey()] = refs.songList.scrollTop;
}

function restoreCurrentListScroll() {
  if (!refs.songList) return;
  const top = state.listScroll[getListScrollKey()] || 0;
  requestAnimationFrame(() => {
    refs.songList.scrollTop = top;
  });
}

function focusSelectedItem() {
  const selector =
    state.module === "scripture" && state.selectedBookCode
      ? `[data-book-code="${CSS.escape(state.selectedBookCode)}"]`
      : state.selectedSongId
        ? `[data-song-id="${CSS.escape(state.selectedSongId)}"]`
        : "";
  if (!selector) return;
  const selected = refs.songList.querySelector(selector);
  selected?.focus({ preventScroll: true });
  scrollListItemIntoView(selected);
}

function focusSelectedItemAfterRender() {
  requestAnimationFrame(focusSelectedItem);
}

function focusSelectedBibleVerseAfterRender() {
  if (!state.selectedBibleVerses.length && state.selectedBibleVerse) {
    state.selectedBibleVerses = [state.selectedBibleVerse];
  }
  const verseNumber = state.selectedBibleVerses[0] || state.selectedBibleVerse;
  if (!verseNumber) return;
  requestAnimationFrame(() => {
    const verse = refs.detailPane?.querySelector(`[data-bible-verse="${CSS.escape(String(verseNumber))}"]`);
    verse?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function scrollListItemIntoView(item) {
  if (!item || !refs.songList) return;
  const listRect = refs.songList.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  if (itemRect.top < listRect.top) {
    refs.songList.scrollTop -= listRect.top - itemRect.top + 8;
  } else if (itemRect.bottom > listRect.bottom) {
    refs.songList.scrollTop += itemRect.bottom - listRect.bottom + 8;
  }
}

function renderDetail() {
  if (state.module === "scripture") {
    renderScriptureDetail();
    return;
  }
  if (state.module === "service") {
    renderServiceDetail();
    return;
  }

  const song = getSelectedSong();

  if (!song) {
    refs.detailPane.innerHTML = `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <p class="empty-verse">
            Sing to the Lord a new song;<br />
            sing to the Lord, all the earth.
          </p>
          <span>Psalm 96:1</span>
        </div>
      </div>
    `;
    refreshIcons();
    return;
  }

  const titleMetaLine = songTitleMetaLine(song);
  const supportMetaItems = songSupportMetaItems(song);
  refs.detailPane.innerHTML = `
    <div class="editor-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml((song.hymn_no ? stripHymnNumber(song.title) : song.title) || "Untitled Song")}</span>
            ${song.hymn_no ? `<span class="scripture-book-marker">${escapeHtml(song.hymn_no)}</span>` : ""}
          </h2>
          ${renderEditorMeta(titleMetaLine, supportMetaItems)}
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
          <button class="icon-btn quiet" type="button" data-open-metadata title="Edit metadata" aria-label="Edit metadata">
            <i data-lucide="sliders-horizontal"></i>
          </button>
        </div>
      </header>

      ${renderFormsTab(song)}
      ${state.metadataPopupOpen ? renderSongMetadataDialog(song) : ""}
    </div>
  `;

  refreshIcons();
  resizeFormTextareas();
}

function renderEditorMeta(primary, items = []) {
  const supportItems = items.filter(Boolean);
  if (!primary && !supportItems.length) return "";
  return `
    <div class="editor-meta-stack">
      <div class="editor-title-meta${primary ? "" : " empty"}">${escapeHtml(primary || "Metadata")}</div>
      <div class="editor-support-meta${supportItems.length ? "" : " empty"}">
        ${
          supportItems.length
            ? supportItems.map(renderMetaItem).join("")
            : `<span>Support metadata</span>`
        }
      </div>
    </div>
  `;
}

function renderMetaItem(item) {
  if (item && typeof item === "object" && "label" in item) {
    return `
      <span class="meta-attribute">
        <span class="meta-attribute-label">${escapeHtml(item.label)}:</span>
        <strong>${escapeHtml(item.value)}</strong>
      </span>
    `;
  }
  return `<span>${escapeHtml(item)}</span>`;
}


function renderSongMetadataDialog(song) {
  const metadata = normalizeSongMetadata(song?.metadata);
  return `
    <div class="metadata-popover-layer">
      <section class="metadata-popover" role="dialog" aria-label="Song metadata">
        <header class="metadata-popover-head">
          <h3>Metadata</h3>
          <button class="icon-btn" type="button" data-close-metadata title="Close metadata" aria-label="Close metadata">
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="metadata-popover-grid">
          ${renderInput("Title", "title", (song.hymn_no ? stripHymnNumber(song.title) : song.title) || "", "compact meta-title")}
          ${renderInput("Subtitle", "subtitle", song.subtitle || "", "compact")}
          ${renderInput("Original", "original_title", song.original_title || "", "compact")}
          ${renderMetadataInput("Artist", "artist", metadata.artist || "", "compact")}
          ${renderMetadataInput("Lyricist", "lyricist", metadata.lyricist || "", "compact")}
          ${renderMetadataInput("Composer", "composer", metadata.composer || "", "compact")}
          ${renderMetadataInput("Album", "album", metadata.album || "", "compact meta-album")}
          ${renderMetadataInput("Track", "track", metadata.track || "", "compact meta-track")}
          ${renderInput("References", "scripture", joinMetaItems(cleanList(song.scripture)), "compact meta-ref")}
        </div>
        <p class="metadata-popover-note">Use semicolons for multiple references.</p>
      </section>
    </div>
  `;
}

function metaAttribute(label, value) {
  const text = String(value || "").trim();
  return text ? { label, value: text } : null;
}

function metaAttributeText(label, value) {
  const text = String(value || "").trim();
  return text ? `${label}: ${text}` : "";
}

function renderScriptureDetail() {
  const scripture = getSelectedScripture();
  const selectedBook = findBibleBookByCode(scripture?.book_code) || findBibleBookByCode(state.selectedBookCode) || findBibleBookByName(scripture?.book);

  if (state.scriptureError) {
    refs.detailPane.innerHTML = `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <h2>Mindex Scripture</h2>
          <p>Run the Scripture SQL in supabase-schema.sql.</p>
        </div>
      </div>
    `;
    refreshIcons();
    return;
  }

  if (isBibleTextSearchActive()) {
    refs.detailPane.innerHTML = renderBibleTextSearchDetail();
    refreshIcons();
    return;
  }

  if (!scripture && !selectedBook) {
    refs.detailPane.innerHTML = `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <p class="empty-verse">
            Your word is a lamp for my feet,<br />
            a light on my path.
          </p>
          <span>Psalm 119:105</span>
        </div>
      </div>
    `;
    refreshIcons();
    return;
  }

  if (!scripture) {
    const titleMetaLine = selectedBook?.canonicalEnglishTitle || `${getBibleBooks().length} books`;
    const supportMetaItems = scriptureBookSupportMetaItems(selectedBook);
    refs.detailPane.innerHTML = `
      <div class="editor-shell scripture-editor scripture-taxonomy-editor">
        <header class="editor-head">
          <div class="editor-title">
            <h2>
              <span>${escapeHtml(selectedBook?.koreanName || "Bible Books")}</span>
              ${renderScriptureBookMarker(selectedBook)}
            </h2>
            ${renderEditorMeta(titleMetaLine, supportMetaItems)}
          </div>
        </header>
        <section class="panel scripture-panel">
          ${selectedBook ? renderScriptureBookDetail(selectedBook) : renderScriptureBookTaxonomy()}
        </section>
      </div>
    `;
    refreshIcons();
    return;
  }

  const titleMetaLine = scripture.reference || selectedBook?.canonicalEnglishTitle || "";
  const supportMetaItems = [
    metaAttribute("Translation", scripture.translation),
    selectedBook?.koreanName && scripture.book !== selectedBook.koreanName ? metaAttribute("Book", selectedBook.koreanName) : null,
    metaAttribute("Christian", selectedBook?.division),
  ].filter(Boolean);
  refs.detailPane.innerHTML = `
    <div class="editor-shell scripture-editor">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml(scripture.title || "Untitled Scripture")}</span>
          </h2>
          ${renderEditorMeta(titleMetaLine, supportMetaItems)}
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
          <button class="btn secondary" type="button" data-copy-action="scripture" title="Copy scripture text">
            <i data-lucide="clipboard"></i>
            <span>Text</span>
          </button>
          <button class="btn secondary" type="button" data-copy-action="scripture-slides" title="Copy scripture slide blocks">
            <i data-lucide="copy"></i>
            <span>Slides</span>
          </button>
        </div>
      </header>

      <section class="panel scripture-panel">
        <div class="meta-grid scripture-meta-grid">
          ${renderScriptureInput("Title", "title", scripture.title)}
          ${renderScriptureBookSelect(scripture)}
          ${renderScriptureInput("Reference", "reference", scripture.reference)}
          ${renderScriptureInput("Translation", "translation", scripture.translation)}
        </div>
        ${renderScriptureTextarea("Passage", "text", scripture.text)}
        <div class="scripture-foot">
          <span>${scriptureBlockCount(scripture)} ${scriptureBlockCount(scripture) === 1 ? "block" : "blocks"}</span>
        </div>
        ${renderScriptureTextarea("Note", "memo", scripture.memo || "", "scripture-memo")}
      </section>
    </div>
  `;

  refreshIcons();
}

function renderSongAttentionIcon(song) {
  const emptyStatus = songEmptyStatus(song);
  const labels = [];
  if (emptyStatus) labels.push(emptyStatus === "all-empty" ? "Empty" : "Partial");
  if (songNeedsReview(song)) labels.push("Needs review");
  if (!labels.length) return "";
  const tone = emptyStatus === "all-empty" ? "all-empty" : labels.includes("Needs review") ? "needs-review" : "some-empty";
  return renderAttentionIcon(joinMetaItems(labels), tone);
}

function renderAttentionIcon(label, tone = "needs-review") {
  return `
    <span class="attention-icon ${tone}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">
      <i data-lucide="circle-alert"></i>
    </span>
  `;
}

function songNeedsReview(song) {
  return (song?.versions || []).some((version) => versionNeedsFormReview(song, version));
}

function versionNeedsFormReview(song, version) {
  const allowStructuralReview = shouldReviewVersionStructure(song, version);
  return (version?.forms || []).some((form) => formNeedsReview(form, { allowStructuralReview }));
}

function shouldReviewVersionStructure(song, version, forms = version?.forms || []) {
  if (isHymnBookVersion(song, version)) return false;
  if (!forms.length) return false;
  return forms.every((form) => form.part_type === "Verse");
}

function renderFormsTab(song) {
  const versions = song.versions || [];
  return `
    <section class="panel">
      ${renderFormToolbar(song)}
      ${
        versions.length > 1
          ? renderVersionCompare(song, versions)
          : renderSingleVersionForms()
      }
    </section>
  `;
}

function renderSingleVersionForms() {
  const song = getSelectedSong();
  const version = getSelectedVersion();
  const versionName = versionDisplayName(song, version || {});
  const gridStyle = "grid-template-columns: minmax(320px, 1fr);";
  return `
    <div class="version-compare-grid single-version">
      <div class="version-compare-head" style="${gridStyle}">
        <div class="version-compare-title active">
          <span>${escapeHtml(versionName)}</span>
          ${renderAddVersionButton(version?.id)}
        </div>
      </div>
      <div class="version-compare-rows">
        ${
          state.forms.length
            ? state.forms.map((form, index) => `
                <div class="version-compare-row" style="${gridStyle}">
                  ${renderFormBlock(form, index, { song, version })}
                </div>
              `).join("")
            : ""
        }
      </div>
    </div>
  `;
}

function renderVersionCompare(song, versions) {
  const versionForms = versions.map((version) => ({
    version,
    forms: getFormsForVersion(version),
  }));
  const maxRows = Math.max(0, ...versionForms.map((item) => item.forms.length));
  const gridStyle = `grid-template-columns: repeat(${versions.length}, minmax(320px, 1fr));`;

  return `
    <div class="version-compare-grid">
      <div class="version-compare-head" style="${gridStyle}">
        ${versions.map((version) => renderVersionCompareHead(song, version)).join("")}
      </div>
      <div class="version-compare-rows">
        ${
          maxRows
            ? Array.from({ length: maxRows }, (_, index) => `
                <div class="version-compare-row" style="${gridStyle}">
                  ${versionForms.map(({ version, forms }) => renderVersionCompareCell(version, forms[index], index)).join("")}
                </div>
              `).join("")
            : ""
        }
      </div>
    </div>
  `;
}

function renderAddVersionButton(sourceVersionId) {
  return `
    <button class="version-add-btn" type="button" data-add-version data-source-version-id="${escapeAttr(sourceVersionId || "")}" title="Duplicate as new version" aria-label="Duplicate as new version">
      <i data-lucide="copy-plus"></i>
    </button>
  `;
}

function renderVersionCompareHead(song, version) {
  const active = version.id === getSelectedVersionId();
  return `
    <div class="version-compare-title version-picker${active ? " active" : ""}" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
      <span>${escapeHtml(versionDisplayName(song, version))}</span>
      ${renderAddVersionButton(version.id)}
    </div>
  `;
}

function renderVersionCompareCell(version, form, index) {
  const active = version.id === getSelectedVersionId();
  if (!form) {
    return active
      ? `<div class="version-empty-cell" aria-hidden="true"></div>`
      : `<div class="version-empty-cell version-picker" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0" aria-label="Select version"></div>`;
  }

  if (active) return renderFormBlock(form, index, { song: getSelectedSong(), version });

  return `
    <div class="version-picker" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
      ${renderReadonlyFormBlock(form, { song: getSelectedSong(), version })}
    </div>
  `;
}

function getFormsForVersion(version) {
  if (version.id === getSelectedVersionId()) return state.forms;
  return normalizeForms((version.forms || []).map((form) => ({ ...form, song_id: version.id })));
}


function renderFormToolbar(song) {
  const hasForms = state.forms.length > 0;
  const hasLyrics = getCopyableForms().length > 0;
  return `
    <div class="section-bar form-toolbar" aria-label="Add song form">
      <div class="form-buttons">
        ${PART_TYPES
          .map(
            (type) => `
              <button class="btn secondary" type="button" data-add-form="${type}" title="Add ${type}">
                <i data-lucide="plus"></i>
                <span>${FORM_ADD_LABELS[type] || type}</span>
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="toolbar-output-stack">
        <div class="copy-actions" aria-label="Copy and export lyrics">
          <button class="btn secondary" type="button" data-copy-action="plain" ${hasLyrics ? "" : "disabled"} title="Copy text with form labels">
            <i data-lucide="clipboard"></i>
            <span>Text</span>
          </button>
          <button class="btn secondary" type="button" data-copy-action="download-freeshow" ${hasLyrics ? "" : "disabled"} title="Download FreeShow .show">
            <i data-lucide="presentation"></i>
            <span>Show</span>
          </button>
          <button class="btn secondary" type="button" data-copy-action="download-xml" ${hasLyrics ? "" : "disabled"} title="Download XML">
            <i data-lucide="file-code-2"></i>
            <span>XML</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEditableFormList() {
  return `
    <div class="form-list">
      ${
        state.forms.length
          ? state.forms.map(renderFormBlock).join("")
          : ""
      }
    </div>
  `;
}

function renderInput(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <input type="text" data-song-field="${field}" value="${escapeAttr(value)}" />
    </label>
  `;
}

function renderTextarea(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <textarea data-song-field="${field}" rows="4">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderMetadataInput(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <input type="text" data-song-meta-field="${field}" value="${escapeAttr(value)}" />
    </label>
  `;
}

function renderMetadataTextarea(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <textarea data-song-meta-field="${field}" rows="3">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderScriptureInput(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <input type="text" data-scripture-field="${field}" value="${escapeAttr(value || "")}" />
    </label>
  `;
}

function renderScriptureBookSelect(scripture) {
  const value = scripture.book_code || findBibleBookByName(scripture.book)?.code || "";
  return `
    <label class="field">
      <span>Book</span>
      <select data-scripture-field="book_code">
        <option value="">Select book</option>
        ${renderBibleBookOptions("Old Testament", value)}
        ${renderBibleBookOptions("New Testament", value)}
      </select>
    </label>
  `;
}

function renderBibleBookOptions(testament, selectedCode) {
  const label = testament === "Old Testament" ? "Old Testament" : "New Testament";
  return `
    <optgroup label="${label}">
      ${getBibleBooks()
        .filter((book) => book.testament === testament)
        .sort(sortBibleBooks)
        .map((book) => `<option value="${book.code}" ${book.code === selectedCode ? "selected" : ""}>${escapeHtml(book.koreanName)}</option>`)
        .join("")}
    </optgroup>
  `;
}

function renderScriptureBookMarker(book) {
  if (!book?.shortName) return "";
  const label = book.koreanName || book.canonicalEnglishTitle || book.englishName || book.code;
  return `<span class="scripture-book-marker" title="${escapeAttr(label)}">${escapeHtml(book.shortName)}</span>`;
}

function scriptureBookSupportMetaItems(book) {
  if (!book) return [];
  return [
    metaAttribute("Christian", book.division),
    metaAttribute("Jewish", book.jewishCategory),
    metaAttribute("Author", book.author),
  ].filter(Boolean);
}

function renderScriptureBookTaxonomy() {
  const groups = groupBibleBooksByTestament(getFilteredBibleBooks());
  if (!groups.length) return `<div class="taxonomy-empty">No books match this search.</div>`;
  return groups.map(({ testament, books }) => `
    <section class="taxonomy-section">
      <div class="taxonomy-section-head">
        <h3>${escapeHtml(testament)}</h3>
        <span>${books.length}</span>
      </div>
      <div class="taxonomy-grid">
        ${books.map(renderScriptureBookCard).join("")}
      </div>
    </section>
  `).join("");
}

function renderBibleTextSearchDetail() {
  const translation = getSelectedBibleTranslation();
  const totalCount = Number.isFinite(state.bibleTextSearchTotal) ? state.bibleTextSearchTotal : state.bibleTextSearchResults.length;
  const supportMetaItems = [
    metaAttribute("Translation", translation?.abbreviation || translation?.name),
    !state.bibleTextSearchLoading ? metaAttribute("Results", String(totalCount)) : null,
  ].filter(Boolean);
  return `
    <div class="editor-shell scripture-editor bible-search-editor">
      <header class="editor-head">
        <div class="editor-title">
          <h2>
            <span>Search Results</span>
          </h2>
          ${renderEditorMeta(`"${state.bibleTextSearchQuery}"`, supportMetaItems)}
        </div>
      </header>
      <section class="panel scripture-panel">
        ${renderBibleTextSearchControls()}
        ${renderBibleTextSearchResults()}
      </section>
    </div>
  `;
}

function renderBibleTextSearchControls() {
  return renderBibleReaderControls({ className: "bible-search-controls" });
}

function renderBibleTextSearchResults() {
  if (state.bibleTextSearchLoading) return renderBibleVerseSkeleton();
  if (state.bibleTextSearchError) return `<div class="bible-reader-note">${escapeHtml(state.bibleTextSearchError)}</div>`;
  if (!state.bibleTextSearchResults.length) {
    return `<div class="bible-reader-note">No verses found for "${escapeHtml(state.bibleTextSearchQuery)}".</div>`;
  }

  const translation = getSelectedBibleTranslation();
  const totalCount = Number.isFinite(state.bibleTextSearchTotal) ? state.bibleTextSearchTotal : state.bibleTextSearchResults.length;
  const shownCount = state.bibleTextSearchResults.length;
  const firstResult = totalCount && shownCount ? state.bibleTextSearchPage * BIBLE_TEXT_SEARCH_PAGE_SIZE + 1 : 0;
  const lastResult = firstResult ? firstResult + shownCount - 1 : 0;
  return `
    <div class="bible-search-summary">
      <span>${escapeHtml(formatBibleSearchRange(firstResult, lastResult, totalCount))}</span>
      ${renderBibleSearchPagination(totalCount)}
    </div>
    <div class="bible-verse-list bible-search-results">
      ${state.bibleTextSearchResults.map((verse, index) => {
        const book = findBibleBookByCode(verse.book_code);
        const reference = formatBibleVerseReference(book, verse.chapter, verse.verse, translation);
        return `
          <p class="bible-verse bible-search-result" data-bible-search-result="${index}" role="button" tabindex="0" aria-label="Open ${escapeAttr(reference)}">
            <span class="bible-search-reference">${escapeHtml(reference)}</span>
            <strong>${highlightBibleSearchText(verse.text || "", state.bibleTextSearchQuery)}</strong>
            <button class="bible-verse-copy" type="button" data-copy-bible-search-result="${index}" title="Copy verse" aria-label="Copy ${escapeAttr(reference)}">
              <i data-lucide="copy"></i>
            </button>
          </p>
        `;
      }).join("")}
    </div>
  `;
}

function formatBibleSearchRange(firstResult, lastResult, totalCount) {
  if (!totalCount) return "0 results";
  return `${firstResult}-${lastResult} of ${totalCount} results`;
}

function renderBibleSearchPagination(totalCount) {
  const hasPrevious = state.bibleTextSearchPage > 0;
  const hasNext = (state.bibleTextSearchPage + 1) * BIBLE_TEXT_SEARCH_PAGE_SIZE < totalCount;
  if (!hasPrevious && !hasNext) return "";
  return `
    <span class="bible-search-pagination">
      <button class="icon-btn" type="button" data-bible-search-page="-1" title="Previous results" aria-label="Previous results" ${hasPrevious ? "" : "disabled"}>
        <i data-lucide="chevron-left"></i>
      </button>
      <button class="icon-btn" type="button" data-bible-search-page="1" title="Next results" aria-label="Next results" ${hasNext ? "" : "disabled"}>
        <i data-lucide="chevron-right"></i>
      </button>
    </span>
  `;
}

function renderScriptureBookDetail(book) {
  return `
    <section class="taxonomy-book-detail">
      ${renderBibleReader(book)}
    </section>
  `;
}

function renderBibleReader(book) {
  if (state.bibleReaderError) {
    return `<div class="bible-reader-note">${escapeHtml(state.bibleReaderError)} Run the Bible verse schema before importing XML.</div>`;
  }
  if (!state.bibleTranslations.length) {
    return `<div class="bible-reader-note">No Bible translations imported yet.</div>`;
  }

  const chapters = getBibleChapterOptions();
  const verses = state.bibleBookVerses.filter((verse) => Number(verse.chapter) === state.selectedBibleChapter);
  const chapterIndex = chapters.indexOf(state.selectedBibleChapter);
  const hasPreviousChapter = chapterIndex > 0;
  const hasNextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1;
  return `
    <section class="bible-reader" aria-label="${escapeAttr(book.koreanName)} Bible reader">
      ${renderBibleReaderControls({
        chapterControl: renderBibleChapterControl(chapters, hasPreviousChapter, hasNextChapter),
      })}
      ${
        state.bibleReaderLoading
          ? renderBibleVerseSkeleton()
          : renderBibleVerseList(verses)
      }
    </section>
  `;
}

function renderBibleReaderControls(options = {}) {
  if (!state.bibleTranslations.length) return "";
  return `
    <div class="bible-reader-controls ${escapeAttr(options.className || "")}">
      ${renderBibleTranslationControl()}
      ${options.chapterControl || ""}
      ${renderBibleCopyReferenceToggle()}
    </div>
  `;
}

function renderBibleTranslationControl() {
  return `
    <label class="bible-control">
      <span>Translation</span>
      <select data-bible-reader-field="translation">
        ${state.bibleTranslations.map((translation) => `
          <option value="${escapeAttr(translation.id)}" ${translation.id === state.selectedBibleTranslationId ? "selected" : ""}>
            ${escapeHtml(translation.abbreviation || translation.name)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderBibleChapterControl(chapters, hasPreviousChapter, hasNextChapter) {
  return `
    <label class="bible-control bible-control--chapter">
      <span>Chapter</span>
      <span class="bible-chapter-control">
        <button class="icon-btn" type="button" data-bible-reader-action="-1" title="Previous chapter" aria-label="Previous chapter" ${hasPreviousChapter ? "" : "disabled"}>
          <i data-lucide="chevron-left"></i>
        </button>
        <select data-bible-reader-field="chapter" ${chapters.length ? "" : "disabled"}>
          ${chapters.length
            ? chapters.map((chapter) => `<option value="${chapter}" ${chapter === state.selectedBibleChapter ? "selected" : ""}>${chapter}</option>`).join("")
            : `<option value="1">1</option>`}
        </select>
        <button class="icon-btn" type="button" data-bible-reader-action="1" title="Next chapter" aria-label="Next chapter" ${hasNextChapter ? "" : "disabled"}>
          <i data-lucide="chevron-right"></i>
        </button>
      </span>
    </label>
  `;
}

function renderBibleCopyReferenceToggle() {
  return `
    <label class="bible-copy-option" title="Include reference when copying verses">
      <input type="checkbox" data-bible-reader-field="copy_reference" ${state.bibleCopyReference ? "checked" : ""} />
      <span>Reference</span>
    </label>
  `;
}

function renderBibleVerseSkeleton() {
  return `
    <div class="bible-verse-list bible-verse-list-loading" aria-busy="true" aria-label="Loading verses">
      ${Array.from({ length: 6 }, (_, index) => `
        <p class="bible-verse-placeholder" style="--line-width: ${index % 3 === 0 ? "82%" : index % 3 === 1 ? "68%" : "74%"}"></p>
      `).join("")}
    </div>
  `;
}

function renderBibleVerseList(verses) {
  if (!state.bibleBookVerses.length) return `<div class="bible-reader-note">No verses loaded for this book.</div>`;
  if (!verses.length) return `<div class="bible-reader-note">No verses in this chapter.</div>`;
  let previousSection = "";
  const selectedVerses = new Set(state.selectedBibleVerses.length ? state.selectedBibleVerses : [state.selectedBibleVerse].filter(Boolean));
  return `
    <div class="bible-verse-list">
      ${verses.map((verse) => {
        const sectionTitle = verse.section_title && verse.section_title !== previousSection ? verse.section_title : "";
        previousSection = verse.section_title || previousSection;
        const selected = selectedVerses.has(Number(verse.verse));
        return `
          ${sectionTitle ? `<div class="bible-section-title">${escapeHtml(sectionTitle)}</div>` : ""}
          <p class="bible-verse${selected ? " selected" : ""}" data-bible-verse="${escapeAttr(String(verse.verse))}" role="button" tabindex="0" aria-selected="${selected ? "true" : "false"}" aria-label="Select verse ${escapeAttr(String(verse.verse))}">
            <span>${escapeHtml(String(verse.verse))}</span>
            <strong>${escapeHtml(verse.text || "")}</strong>
            <button class="bible-verse-copy" type="button" data-copy-bible-verse="${escapeAttr(String(verse.verse))}" title="Copy verse" aria-label="Copy verse ${escapeAttr(String(verse.verse))}">
              <i data-lucide="copy"></i>
            </button>
          </p>
        `;
      }).join("")}
    </div>
  `;
}

function renderScriptureBookCard(book) {
  const details = scriptureBookSupportMetaItems(book);
  return `
    <article class="taxonomy-book-card">
      <div class="taxonomy-book-order">${String(book.sortOrder).padStart(2, "0")}</div>
      <div class="taxonomy-book-main">
        <div class="taxonomy-book-title">${escapeHtml(book.koreanName)}</div>
        <div class="taxonomy-book-subtitle">${escapeHtml(book.canonicalEnglishTitle || book.englishName)}</div>
        <div class="taxonomy-book-meta">${details.map(renderMetaItem).join("")}</div>
      </div>
    </article>
  `;
}

function renderScriptureTextarea(label, field, value, className = "") {
  return `
    <label class="field wide ${className}">
      <span>${label}</span>
      <textarea class="scripture-textarea" data-scripture-field="${field}" rows="${field === "text" ? "14" : "3"}">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function renderFormBlock(form, index, options = {}) {
  const label = displayLabel(form);
  const song = options.song || getSelectedSong();
  const version = options.version || getSelectedVersion();
  const versionForms = options.forms || (version?.id === getSelectedVersionId() ? state.forms : version?.forms || []);
  const needsReview = formNeedsReview(form, {
    allowStructuralReview: shouldReviewVersionStructure(song, version, versionForms),
  });
  return `
    <article class="form-block${needsReview ? " needs-review" : ""}">
      <div class="form-head">
        <div class="form-meta">
          <select class="form-type-select" data-form-field="part_type" data-index="${index}" aria-label="Form type">
            ${PART_TYPES.map(
              (type) =>
                `<option value="${type}" ${form.part_type === type ? "selected" : ""}>${escapeHtml(form.part_type === type ? label : type)}</option>`,
            ).join("")}
          </select>
          ${needsReview ? renderAttentionIcon("Needs review", "needs-review") : ""}
        </div>
        <div class="form-actions">
          ${needsReview ? `
            <button class="icon-btn review-action" type="button" data-form-action="mark-reviewed" data-index="${index}" title="Mark reviewed">
              <i data-lucide="check"></i>
            </button>
          ` : ""}
          <button class="icon-btn" type="button" data-form-action="up" data-index="${index}" title="Move up" ${index === 0 ? "disabled" : ""}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="down" data-index="${index}" title="Move down" ${index === state.forms.length - 1 ? "disabled" : ""}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="copy" data-index="${index}" title="Copy block">
            <i data-lucide="copy"></i>
          </button>
          <button class="icon-btn danger" type="button" data-form-action="delete" data-index="${index}" title="Delete block">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <textarea class="form-textarea" data-form-field="lyrics" data-index="${index}" rows="1" aria-label="${escapeAttr(label)} lyrics">${escapeHtml(form.lyrics || "")}</textarea>
    </article>
  `;
}

function renderReadonlyFormBlock(form, options = {}) {
  const song = options.song || getSelectedSong();
  const version = options.version || getSelectedVersion();
  const versionForms = options.forms || (version?.id === getSelectedVersionId() ? state.forms : version?.forms || []);
  const needsReview = formNeedsReview(form, {
    allowStructuralReview: shouldReviewVersionStructure(song, version, versionForms),
  });
  return `
    <article class="form-block readonly${needsReview ? " needs-review" : ""}">
      <div class="form-head">
        <div class="form-meta">
          <span class="form-label-text">${escapeHtml(displayLabel(form))}</span>
          ${needsReview ? renderAttentionIcon("Needs review", "needs-review") : ""}
        </div>
      </div>
      <div class="form-preview-text">${escapeHtml(form.lyrics || "")}</div>
    </article>
  `;
}

function normalizeForms(forms) {
  const next = forms.map((form, index) => ({
    ...withLocalId(form),
    part_type: PART_TYPES.includes(form.part_type) ? form.part_type : "Verse",
    lyrics: form.lyrics || "",
    review_status: form.review_status || null,
    import_source: form.import_source || null,
    sort_order: index + 1,
  }));

  const counts = next.reduce((map, form) => {
    map.set(form.part_type, (map.get(form.part_type) || 0) + 1);
    return map;
  }, new Map());
  const seen = new Map();
  return next.map((form) => {
    if ((counts.get(form.part_type) || 0) <= 1) return { ...form, part_number: null };
    const partNumber = (seen.get(form.part_type) || 0) + 1;
    seen.set(form.part_type, partNumber);
    return { ...form, part_number: partNumber };
  });
}

function computePartNumberSuggestion(forms, type) {
  const count = forms.filter((form) => form.part_type === type).length;
  return count + 1;
}

function displayLabel(form) {
  if (form.part_number) return `${form.part_type} ${form.part_number}`;
  return form.part_type;
}

function formNeedsReview(form, options = {}) {
  if (form?.review_status === "reviewed") return false;
  const allowStructuralReview = options.allowStructuralReview !== false;
  return form?.review_status === "needs_review" || Boolean(form?.import_source) || (allowStructuralReview && formLooksUnsplit(form));
}

function formLooksUnsplit(form) {
  const lyrics = String(form?.lyrics || "").trim();
  if (!lyrics) return false;
  if (/\[(?:Verse|Chorus|Pre-Chorus|Bridge|Coda|Amen)(?:\s+\d+)?\]/i.test(lyrics)) return true;
  return lyrics.split(/\n\s*\n/g).filter((block) => block.trim()).length >= 3;
}

function isHymnBookVersion(song, version) {
  if (!song?.hymn_no || !version) return false;
  const rawName = version.name || version.curated_version_name || "";
  if (isDefaultVersionName(rawName)) return true;
  const values = [version.name, version.curated_version_name, version.raw_section_name, version.version_label]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return values.some((value) => value === "새찬송가" || /^통일(?:\s|\d|$)/.test(value) || value.includes("통일 찬송가"));
}

function formatBlockForCopy(form) {
  return [`[${displayLabel(form)}]`, form.lyrics || ""].filter(Boolean).join("\n");
}

function formatFullLyrics(forms = state.forms) {
  return normalizeForms(forms)
    .map(formatBlockForCopy)
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

function formatScriptureForCopy(scripture) {
  if (!scripture) return "";
  const book = findBibleBookByCode(scripture.book_code) || findBibleBookByName(scripture.book);
  const translation = findBibleTranslation(scripture.translation) || getSelectedBibleTranslation();
  const reference = formatScriptureReferenceForCopy(scripture.reference, book, translation) || scripture.title || scripture.book || "";
  return joinScriptureReferenceAndText(reference, scripture.text);
}

function formatScriptureSlidesForCopy(scripture) {
  if (!scripture) return "";
  const heading = scriptureHeading(scripture) || scripture.title || "Scripture";
  const blocks = splitScriptureBlocks(scripture.text);
  if (!blocks.length) return heading;
  return blocks
    .map((block, index) => [`[Scripture ${index + 1}]`, index === 0 ? heading : "", block].filter(Boolean).join("\n"))
    .join("\n\n");
}

function scriptureHeading(scripture) {
  const reference = scripture?.reference || scripture?.book || "";
  return [reference, scripture?.translation].filter(Boolean).join(" · ");
}

function formatBibleVersesForCopy(verseNumbers = state.selectedBibleVerses) {
  const verses = selectedBibleVerseRows(verseNumbers);
  if (!verses.length) return "";
  return verses.map(formatBibleVerseForCopy).join("\n");
}

function selectedBibleVerseRows(verseNumbers = state.selectedBibleVerses) {
  const selected = new Set(verseNumbers.map(Number).filter((verse) => verse > 0));
  if (!selected.size) return [];
  return state.bibleBookVerses
    .filter((verse) => Number(verse.chapter) === state.selectedBibleChapter && selected.has(Number(verse.verse)))
    .sort((a, b) => Number(a.verse) - Number(b.verse));
}

function formatBibleVerseForCopy(verse) {
  const book = findBibleBookByCode(state.selectedBookCode);
  const reference = formatBibleVerseReference(book, state.selectedBibleChapter, verse.verse, getSelectedBibleTranslation());
  return state.bibleCopyReference ? joinScriptureReferenceAndText(reference, verse.text) : collapseInlineText(verse.text);
}

function formatBibleSearchResultForCopy(verse) {
  const book = findBibleBookByCode(verse.book_code);
  const reference = formatBibleVerseReference(book, verse.chapter, verse.verse, getSelectedBibleTranslation());
  return state.bibleCopyReference ? joinScriptureReferenceAndText(reference, verse.text) : collapseInlineText(verse.text);
}

function formatBibleVerseReference(book, chapter, verse, translation) {
  return [scriptureBookCopyName(book, translation), `${chapter}:${verse}`].filter(Boolean).join(" ");
}

function formatScriptureReferenceForCopy(reference, book, translation) {
  const text = String(reference || "").trim();
  if (!text) return "";
  const copyName = scriptureBookCopyName(book, translation);
  if (!copyName) return text;
  const bookNames = [
    book?.koreanName,
    book?.englishName,
    book?.canonicalEnglishTitle,
    book?.shortName,
    book?.code,
  ].map((item) => String(item || "").trim()).filter(Boolean);
  for (const name of bookNames.sort((a, b) => b.length - a.length)) {
    if (text === name) return copyName;
    if (text.startsWith(`${name} `)) return `${copyName}${text.slice(name.length)}`;
  }
  return text;
}

function scriptureBookCopyName(book, translation = getSelectedBibleTranslation()) {
  if (isKoreanBibleTranslation(translation)) {
    return book?.shortName || KOREAN_BIBLE_BOOK_ABBREVIATIONS[book?.code] || makeKoreanBibleBookAbbreviation(book?.koreanName) || book?.koreanName || book?.code || "";
  }
  return ENGLISH_BIBLE_BOOK_ABBREVIATIONS[book?.code] || book?.englishName || book?.canonicalEnglishTitle || book?.code || "";
}

function makeKoreanBibleBookAbbreviation(name) {
  const text = String(name || "").trim();
  if (!text) return "";
  return text
    .replace(/(?:복음|서|기|애가|행전)$/u, "")
    .replace(/전서$/u, "전")
    .replace(/후서$/u, "후")
    .slice(0, 2)
    .replace(/[상하]$/u, "");
}

function collapseInlineText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function highlightBibleSearchText(text, query) {
  const source = String(text || "");
  const needle = String(query || "").trim();
  if (!needle) return escapeHtml(source);

  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!pattern) return escapeHtml(source);

  const regex = new RegExp(pattern, "gi");
  let output = "";
  let lastIndex = 0;
  for (const match of source.matchAll(regex)) {
    output += escapeHtml(source.slice(lastIndex, match.index));
    output += `<mark>${escapeHtml(match[0])}</mark>`;
    lastIndex = match.index + match[0].length;
  }
  output += escapeHtml(source.slice(lastIndex));
  return output;
}

function joinScriptureReferenceAndText(reference, text) {
  return [String(reference || "").trim(), collapseInlineText(text)].filter(Boolean).join("   ");
}

function splitScriptureBlocks(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function scriptureBlockCount(scripture) {
  return splitScriptureBlocks(scripture?.text).length;
}

function formatFreeShowShowJson(song = getSelectedSong(), version = getSelectedVersion(), forms = state.forms) {
  return JSON.stringify(buildFreeShowShow(song, version, forms), null, 2);
}

function formatSongXml(song = getSelectedSong(), version = getSelectedVersion(), forms = state.forms) {
  const copyableForms = getCopyableForms(forms);
  if (!copyableForms.length) throw new Error("Lyrics are required for XML.");
  const versionName = versionDisplayName(song, version || {}) || "";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<song title="${escapeXml(song?.title || "Untitled Song")}"${song?.hymn_no ? ` hymn-no="${escapeXml(song.hymn_no)}"` : ""} version="${escapeXml(versionName)}">`,
    ...copyableForms.map((form) =>
      [
        `  <section type="${escapeXml(form.part_type)}" label="${escapeXml(displayLabel(form))}">`,
        `    <lyrics>${escapeXml(normalizeLyricsForCopy(form.lyrics))}</lyrics>`,
        "  </section>",
      ].join("\n"),
    ),
    "</song>",
  ].join("\n");
}

function buildFreeShowShow(song = getSelectedSong(), version = getSelectedVersion(), forms = state.forms) {
  const copyableForms = getCopyableForms(forms);
  if (!copyableForms.length) throw new Error("Lyrics are required for FreeShow .show.");

  const now = Date.now();
  const title = nullIfBlank(song?.title) || nullIfBlank(version?.name) || "Untitled Song";
  const layoutId = "default";
  const slides = {};
  const layoutSlides = [];

  copyableForms.forEach((form, formIndex) => {
    const paragraphs = splitFreeShowParagraphs(form.lyrics);
    const parentId = `slide_${formIndex + 1}`;
    const childIds = paragraphs.slice(1).map((_, paragraphIndex) => `${parentId}_${paragraphIndex + 2}`);
    slides[parentId] = buildFreeShowSlide({
      group: displayLabel(form),
      color: freeShowGroupColor(form.part_type),
      lyrics: paragraphs[0] || "",
      children: childIds,
    });
    childIds.forEach((childId, childIndex) => {
      slides[childId] = buildFreeShowSlide({
        group: null,
        color: null,
        lyrics: paragraphs[childIndex + 1] || "",
        children: [],
      });
    });
    layoutSlides.push({ id: parentId });
  });

  return {
    name: title,
    category: null,
    settings: {
      activeLayout: layoutId,
      template: null,
    },
    timestamps: {
      created: now,
      modified: now,
      used: null,
    },
    meta: {
      number: song?.hymn_no ? String(song.hymn_no) : "",
      title,
      artist: "",
      author: "",
      composer: "",
      publisher: "",
      copyright: "",
      CCLI: "",
      year: "",
      key: "",
      version: versionDisplayName(song, version || {}) || "",
      source: "",
    },
    slides,
    layouts: {
      [layoutId]: {
        name: "Default",
        notes: "",
        slides: layoutSlides,
      },
    },
    media: {},
  };
}

function buildFreeShowSlide({ group, color, lyrics, children }) {
  return {
    group,
    color,
    settings: {},
    children: children.length ? children : undefined,
    notes: "",
    items: [
      {
        type: "text",
        lines: splitFreeShowLines(lyrics).map((line) => ({
          align: "",
          text: [{ value: line, style: "" }],
        })),
        style: "top:120px;left:50px;height:840px;width:1820px;",
        align: "",
        language: "",
      },
    ],
  };
}

function splitFreeShowParagraphs(lyrics) {
  const text = normalizeLyricsForCopy(lyrics);
  if (!text) return [];
  return text.split(/\n\s*\n/g).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function splitFreeShowLines(lyrics) {
  return String(lyrics || "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

function freeShowGroupColor(type) {
  return {
    Verse: "#4F7CAC",
    "Pre-Chorus": "#C77D33",
    Chorus: "#2F8F83",
    Bridge: "#8E5DB7",
    Coda: "#6B7280",
  }[type] || "#6B7280";
}

function getCopyableForms(forms = state.forms) {
  return normalizeForms(forms).filter((form) => normalizeLyricsForCopy(form.lyrics).length > 0);
}

function normalizeLyricsForCopy(lyrics) {
  return String(lyrics || "").replace(/\r\n?/g, "\n").trim();
}

function getShowFileName(song, version) {
  const versionName = version ? versionDisplayName(song, version) : "";
  const base = [song?.title || "song", versionName].filter(Boolean).join(" ");
  return `${slugify(base)}.show`;
}

function getXmlFileName(song, version) {
  const versionName = version ? versionDisplayName(song, version) : "";
  const base = [song?.title || "song", versionName].filter(Boolean).join(" ");
  return `${slugify(base)}.xml`;
}

function slugify(value) {
  const slug = normalizeTitle(value)
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return slug || "song";
}

function downloadTextFile(text, fileName, mimeType = "text/plain") {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("File downloaded.");
}

async function copyText(text) {
  const value = text || "";
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      fallbackCopy(value);
    }
    showToast("Copied.");
  } catch (error) {
    try {
      fallbackCopy(value);
      showToast("Copied.");
    } catch (fallbackError) {
      showToast(fallbackError.message || "Copy failed.", "error");
    }
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  try {
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Copy failed.");
  } finally {
    textarea.remove();
  }
}

function normalizeServerScripture(row) {
  const book = findBibleBookByCode(row.book_code) || findBibleBookByName(row.book);
  return {
    id: row.id,
    title: row.title || "Untitled Scripture",
    book_code: row.book_code || book?.code || "",
    book: row.book || book?.koreanName || "",
    reference: row.reference || "",
    translation: row.translation || "",
    text: row.text || "",
    memo: row.memo || "",
    is_active: row.is_active !== false,
  };
}

function normalizeServerBibleVerse(row) {
  return {
    id: row.id || [row.book_code, row.chapter, row.verse].join(":"),
    book_code: row.book_code || "",
    chapter: Number(row.chapter) || 0,
    verse: Number(row.verse) || 0,
    verse_end: Number(row.verse_end) || null,
    text: row.text || "",
    section_title: row.section_title || "",
  };
}

function normalizeServerScriptureBook(row) {
  const shortName = cleanScriptureBookShortName(row.short_name);
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    code: row.code || "",
    koreanName: row.korean_name || "",
    englishName: row.english_name || "",
    testament: row.testament || "",
    division: row.division || "",
    canonicalEnglishTitle: row.canonical_english_title || row.english_name || "",
    shortName,
    aliases: cleanList(row.aliases),
    jewishCategory: row.jewish_category || "",
    author: row.author || "",
    metadata,
    chapterCount: Number(metadata.chapters || metadata.chapter_count || BIBLE_CHAPTER_COUNTS[row.code]) || 0,
    sortOrder: Number(row.sort_order) || 999,
  };
}

function normalizeServerBibleTranslation(row) {
  return {
    id: row.id,
    translationKey: row.translation_key || "",
    name: row.name || row.translation_key || "Bible",
    language: row.language || "",
    abbreviation: row.abbreviation || "",
    source: row.source || "",
  };
}

function sortBibleTranslations(a, b) {
  const languageRank = (translation) => {
    const language = String(translation.language || "").trim().toLowerCase();
    const label = `${translation.translationKey || ""} ${translation.name || ""} ${translation.abbreviation || ""}`;
    if (language.startsWith("ja") || label.includes("일본어") || /[ぁ-んァ-ン一-龯]/.test(label)) return 2;
    if (language.startsWith("ko") || /[가-힣]/.test(label)) return 0;
    return 1;
  };
  return languageRank(a) - languageRank(b)
    || String(a.name || "").localeCompare(String(b.name || ""), "ko")
    || String(a.translationKey || "").localeCompare(String(b.translationKey || ""), "ko");
}

function getSelectedBibleTranslation() {
  return state.bibleTranslations.find((translation) => translation.id === state.selectedBibleTranslationId) || null;
}

function findBibleTranslation(value) {
  const key = normalizeTitle(value);
  if (!key) return null;
  return state.bibleTranslations.find((translation) => [
    translation.id,
    translation.translationKey,
    translation.name,
    translation.abbreviation,
  ].some((item) => normalizeTitle(item) === key)) || null;
}

function isKoreanBibleTranslation(translation) {
  if (!translation) return true;
  const language = String(translation.language || "").trim().toLowerCase();
  const label = `${translation.translationKey || ""} ${translation.name || ""} ${translation.abbreviation || ""}`;
  return language.startsWith("ko") || /[가-힣]/.test(label);
}

function cleanScriptureBookShortName(value) {
  const text = String(value || "").trim();
  if (!text || /^\[.*\]$/.test(text) || /\bSHORT\b/i.test(text)) return "";
  return text;
}

function normalizeServerSong(row) {
  const memo = parseSongMemo(row.memo);
  const scriptureRefs = cleanList(row.scripture_refs).length ? cleanList(row.scripture_refs) : cleanList(memo.scripture);
  const metadata = mergePromotedSongMetadata(row, memo.metadata);
  const versions = memo.versions.length
    ? memo.versions
    : [
        {
          id: row.id,
          name: "Default",
          is_primary: true,
          forms: [],
        },
      ];

  return {
    ...row,
    scripture: scriptureRefs,
    metadata,
    versions: versions.map((version, index) => ({
      ...version,
      id: version.id || `${row.id}:version:${index + 1}`,
      name: normalizeGeneratedVersionName(version.name || version.version_label || `Version ${index + 1}`),
      is_primary: Boolean(version.is_primary) || index === 0,
      metadata: normalizeSongMetadata(version.metadata),
      forms: Array.isArray(version.forms) ? version.forms : [],
    })),
  };
}

function parseSongMemo(value) {
  if (!value) return { versions: [], scripture: [], metadata: {} };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      versions: Array.isArray(parsed?.versions) ? parsed.versions : [],
      scripture: cleanList(parsed?.scripture),
      metadata: normalizeSongMetadata(parsed?.metadata),
    };
  } catch {
    return { versions: [], scripture: [], metadata: {} };
  }
}

function serializeSongMemo(song, options = {}) {
  const scripture = options.omitScripture ? [] : cleanList(song.scripture);
  const metadata = options.omitPromotedMetadata
    ? omitPromotedSongMetadata(song, normalizeSongMetadata(song.metadata))
    : normalizeSongMetadata(song.metadata);
  return JSON.stringify(
    {
      ...(scripture.length ? { scripture } : {}),
      ...(Object.keys(metadata).length ? { metadata } : {}),
      versions: (song.versions || []).map((version, index) => {
        const versionMetadata = normalizeSongMetadata(version.metadata);
        return {
          id: version.id,
          name: normalizeGeneratedVersionName(version.name || `Version ${index + 1}`),
          raw_section_name: version.raw_section_name || null,
          hymn_no: version.hymn_no || null,
          is_primary: Boolean(version.is_primary) || index === 0,
          ...(Object.keys(versionMetadata).length ? { metadata: versionMetadata } : {}),
          forms: (version.forms || []).map((form, formIndex) => ({
            id: form.id || createLocalId(),
            part_type: form.part_type,
            part_number: form.part_number,
            lyrics: form.lyrics || "",
            sort_order: formIndex + 1,
            ...(form.review_status && form.review_status !== "reviewed" ? { review_status: form.review_status } : {}),
            ...(form.review_status === "reviewed" ? { review_status: "reviewed" } : {}),
            ...(form.import_source ? { import_source: form.import_source } : {}),
          })),
        };
      }),
    },
    null,
    0,
  );
}

function hasSongColumn(song, column) {
  return Boolean(song && Object.prototype.hasOwnProperty.call(song, column));
}

function hasPromotedSongMetadataColumns(song) {
  return Object.values(PROMOTED_SONG_METADATA_COLUMNS).some((column) => hasSongColumn(song, column));
}

function mergePromotedSongMetadata(row, memoMetadata) {
  const metadata = normalizeSongMetadata(memoMetadata);
  for (const [key, column] of Object.entries(PROMOTED_SONG_METADATA_COLUMNS)) {
    if (!hasSongColumn(row, column)) continue;
    if (key === "praiseTypes") {
      const types = normalizePraiseTypes(row[column]);
      if (types.length) metadata.praiseTypes = types;
      continue;
    }
    const value = nullIfBlank(row[column]);
    if (value) metadata[key] = value;
  }
  return normalizeSongMetadata(metadata);
}

function promotedSongMetadataPayload(song, metadata) {
  const payload = {};
  for (const [key, column] of Object.entries(PROMOTED_SONG_METADATA_COLUMNS)) {
    if (!hasSongColumn(song, column)) continue;
    payload[column] = key === "praiseTypes" ? cleanList(metadata[key]) : metadata[key] || null;
  }
  return payload;
}

function omitPromotedSongMetadata(song, metadata) {
  const next = { ...metadata };
  for (const [key, column] of Object.entries(PROMOTED_SONG_METADATA_COLUMNS)) {
    if (!hasSongColumn(song, column)) continue;
    delete next[key];
  }
  return normalizeSongMetadata(next);
}

function getDefaultVersionId(song) {
  if (!song) return null;
  const versions = song.versions || [];
  return versions.find((version) => version.is_primary)?.id || versions[0]?.id || song.id;
}

function getPreferredVersionId(song) {
  return getPraiseFilterListVersion(song)?.id || getDefaultVersionId(song);
}

function getSelectedVersionId() {
  const song = getSelectedSong();
  if (!song) return state.selectedVersionId;
  if (song.versions?.some((version) => version.id === state.selectedVersionId)) return state.selectedVersionId;
  return getDefaultVersionId(song);
}

function getSelectedVersion() {
  const song = getSelectedSong();
  const versionId = getSelectedVersionId();
  return song?.versions?.find((version) => version.id === versionId) || null;
}

async function selectVersion(versionId) {
  if (!versionId || versionId === getSelectedVersionId()) return;

  writeFormsToSelectedVersion();
  const dirtyState = { ...state.dirty };
  state.selectedVersionId = versionId;
  state.forms = [];
  state.dirty = dirtyState;
  persistUiState();
  render();
  syncBrowserHistory();
  await loadForms(versionId);
  state.dirty = dirtyState;
  updateSaveState();
}

function versionDisplayName(song, version) {
  const legacyName = legacyHymnVersionName(song, version);
  if (legacyName) return legacyName;
  if (song?.hymn_no && isDefaultVersionName(version.name || version.curated_version_name)) return "새찬송가";
  if (isRedundantSingleVersionName(song, version, version.name || version.curated_version_name)) return "Default";
  if (version.name) return displayVersionName(version.name);
  if (version.curated_version_name) return displayVersionName(version.curated_version_name);
  const raw = version.raw_section_name || version.version_label || "";
  const canonicalTitle = song?.title || "";
  const canonicalHymnNo = song?.hymn_no ? `${song.hymn_no} ${canonicalTitle}` : canonicalTitle;
  const trailingLegacyMatch = raw.match(/^(.*?)\s*\((통\s*\d+)\)\s*$/);
  if (trailingLegacyMatch) {
    const legacyTitle = trailingLegacyMatch[1].trim();
    const legacyNumber = trailingLegacyMatch[2].replace(/\s+/g, " ").trim();
    if (normalizeTitle(legacyTitle) !== normalizeTitle(canonicalTitle)) return `${legacyNumber} ${legacyTitle}`;
    return legacyNumber;
  }
  const legacyMatch = raw.match(/통\s*\d+(?:\s+.*)?$/);
  if (legacyMatch) return legacyMatch[0].replace(/\s+/g, " ").trim();
  const subtitleMatch = raw.match(/\(([^)]*?)\)\s*$/);
  if (subtitleMatch) return subtitleMatch[1].trim();
  if (raw === canonicalTitle || raw === canonicalHymnNo) return "Default";
  return raw || "Default";
}

function isRedundantSingleVersionName(song, version, name) {
  const versions = song?.versions || [];
  if (versions.length !== 1) return false;
  const value = normalizeTitle(stripTitleDecorations(name));
  if (!value || isDefaultVersionName(name)) return false;
  const title = normalizeTitle(song?.title);
  const hymnTitle = normalizeTitle(song?.hymn_no ? `${song.hymn_no} ${song.title || ""}` : "");
  const raw = normalizeTitle(stripTitleDecorations(version?.raw_section_name || version?.version_label || ""));
  return value === title || value === hymnTitle || (raw && value === raw);
}

function stripTitleDecorations(value) {
  return String(value || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]*?\)\s*$/g, "")
    .trim();
}

function songTitleMetaLine(song) {
  const titles = new Set();
  const metadata = normalizeSongMetadata(song?.metadata);
  for (const value of [song?.subtitle, song?.original_title, metadata.otherTitle]) {
    addTitleMeta(titles, value);
  }
  addSongMetaFromRaw(titles, song?.title, "", { includeSubtitle: !song?.hymn_no });
  for (const version of song?.versions || []) {
    const displayName = versionDisplayName(song, version);
    addSongMetaFromRaw(titles, version.name || version.curated_version_name || "", displayName);
    addSongMetaFromRaw(titles, version.raw_section_name || version.version_label || "", displayName);
  }
  return joinMetaItems([...titles]);
}

function songListView(song) {
  const listVersion = getPraiseFilterListVersion(song);
  const title = listVersion ? versionRawName(listVersion) : song?.hymn_no ? stripHymnNumber(song.title) : song?.title || "";
  const canonicalMeta = songTitleMetaLine(song);
  return {
    listVersion,
    title,
    meta: listVersion ? joinMetaItems([song.title, canonicalMeta]) : canonicalMeta,
    showHymnMarker: Boolean(song?.hymn_no && !listVersion),
  };
}

function getPraiseFilterListVersion(song) {
  if (state.praiseFilter !== "ccm" || !song?.hymn_no || !songHasPraiseType(song, "ccm")) return null;
  const canonicalTitle = stripHymnNumber(song.title || "");
  return (song.versions || []).find((version) => {
    const name = versionRawName(version);
    return name && !isDefaultVersionName(name) && !isHymnVersionName(name) && name !== canonicalTitle;
  }) || null;
}

function versionRawName(version) {
  return normalizeGeneratedVersionName(version?.name || version?.curated_version_name || "") || "";
}

function isHymnVersionName(name) {
  return /^새찬송가$/i.test(name) || /^통(?:일)?\s*\d+/i.test(name) || /^\d+\s+/.test(name);
}

function songPraiseTypes(song) {
  const explicitTypes = normalizePraiseTypes(song?.metadata?.praiseTypes);
  const types = new Set(explicitTypes);
  if (song?.hymn_no) types.add("hymn");
  if (!song?.hymn_no && !explicitTypes.length) types.add("ccm");
  return [...types];
}

function songHasPraiseType(song, type) {
  return songPraiseTypes(song).includes(type);
}

function songSupportMetaItems(song) {
  const metadata = normalizeSongMetadata(song?.metadata);
  const structuredCreditItems = songCreditMetaItems(metadata);
  return [
    metaAttribute("Scripture", cleanList(song?.scripture).join(" · ") || null),
    metaAttribute("Artist", metadata.artist),
    ...structuredCreditItems,
    metaAttribute("Translator", metadata.translator),
    metaAttribute("Album", metadata.album ? formatAlbumMeta(metadata) : ""),
  ].filter(Boolean);
}

function songCreditMetaItems(metadata) {
  const lyricist = String(metadata?.lyricist || "").trim();
  const composer = String(metadata?.composer || "").trim();
  if (lyricist && composer && lyricist === composer) return [metaAttribute("Words/Music", lyricist)];
  return [metaAttribute("Lyricist", lyricist), metaAttribute("Composer", composer)].filter(Boolean);
}

function formatAlbumMeta(metadata) {
  const album = metadata.album || "";
  const track = formatTrackNumber(metadata.track);
  return track ? `${album} · #${track}` : album;
}

function formatTrackNumber(track) {
  const value = String(track || "").trim();
  if (!value) return "";
  return /^\d+$/.test(value) ? String(Number(value)) : value;
}

function addSongMetaFromRaw(target, rawValue, versionName = "", options = {}) {
  const raw = rawValue || "";
  const original = raw.match(/\[([^\]]+)\]/)?.[1]?.trim();
  const subtitle = options.includeSubtitle === false ? "" : raw.match(/\(([^)]*?)\)\s*$/)?.[1]?.trim();
  const versionText = raw.replace(/\[[^\]]+\]/g, "").replace(/\([^)]*?\)\s*$/, "").trim();
  for (const rawMeta of [subtitle, original]) {
    const value = normalizeRawTitleMeta(rawMeta);
    if (value && !/^통(?:일)?\s*\d+/.test(value) && value !== versionText && value !== versionName) addTitleMeta(target, value);
  }
}

function addTitleMeta(target, value) {
  const text = String(value || "").trim();
  if (!text) return;
  for (const existing of target) {
    if (existing === text) return;
    if (existing.length > 4 && text.length > 4 && (existing.includes(text) || text.includes(existing))) return;
  }
  target.add(text);
}

function normalizeRawTitleMeta(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const psalmTitle = text.match(/^Psalm\s*\d+(?::[\d,-]+)?\s*[–-]\s*(.+)$/i);
  if (psalmTitle) return psalmTitle[1].trim();
  return text;
}


function normalizeGeneratedVersionName(name) {
  const value = String(name || "").trim();
  const koreanGenerated = value.match(/^버전\s*(\d+)$/);
  if (koreanGenerated) return `Version ${koreanGenerated[1]}`;
  if (value === "기본") return "Default";
  return value;
}

function displayVersionName(name) {
  return normalizeGeneratedVersionName(name) || "Default";
}

function isDefaultVersionName(name) {
  const value = String(name || "").trim().toLowerCase();
  return value === "default" || value === "기본";
}

function legacyHymnVersionName(song, version) {
  if (!song?.hymn_no) return "";
  const values = [version.name, version.curated_version_name, version.hymn_no, version.raw_section_name, version.version_label];
  for (const value of values) {
    const text = value || "";
    const match = text.match(/(?:^|\(|\s)통(?:일)?\s*(\d+)(?:\s+([^)]*?))?(?:\)|$)/);
    if (!match) continue;
    const rawTitle = (match[2] || "").trim();
    const title = rawTitle || legacyTitleFromRaw(version) || stripHymnNumber(song.title || "");
    return `통일 ${match[1]} ${title}`.trim();
  }
  return "";
}

function legacyTitleFromRaw(version) {
  const raw = version.raw_section_name || version.version_label || "";
  const trailing = raw.match(/^(.*?)\s*\(\s*통(?:일)?\s*\d+\s*\)\s*$/);
  if (trailing) return trailing[1].trim();
  const leading = raw.match(/^통(?:일)?\s*\d+\s+(.+)$/);
  if (leading) return leading[1].trim();
  return "";
}

function stripHymnNumber(value) {
  return (value || "").replace(/^\d+\.?\s*/, "").trim();
}

function cleanSongTitleForSave(song) {
  const title = String(song?.title || "").trim();
  return song?.hymn_no ? stripHymnNumber(title) : title;
}

function getFilteredSongs() {
  const tokens = getSearchTokens(state.search);
  const filterSongs = getSongsForPraiseFilter();
  if (!tokens.length) return [...filterSongs].sort(sortSongsForCurrentList);

  const filterSet = new Set(filterSongs.map((s) => s.id));
  const allMatched = state.songs
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens), inFilter: filterSet.has(song.id) }))
    .filter((item) => item.match);
  const phraseMatched = allMatched.filter((item) => item.match.phraseMatched);
  const results = phraseMatched.length ? phraseMatched : allMatched;

  return results
    .sort((a, b) => {
      if (a.inFilter !== b.inFilter) return a.inFilter ? -1 : 1;
      return b.match.score - a.match.score || sortSongsForCurrentList(a.song, b.song);
    })
    .map((item) => ({ ...item.song, _outOfFilter: !item.inFilter }));
}

function getSongsForPraiseFilter() {
  if (state.praiseFilter === "hymns") return state.songs.filter((song) => songHasPraiseType(song, "hymn"));
  if (state.praiseFilter === "ccm") return state.songs.filter((song) => songHasPraiseType(song, "ccm"));
  return state.songs;
}

function joinMetaItems(items) {
  return cleanList(items).join(META_SEPARATOR);
}


function getScriptureSearchMatch(scripture, tokens = getSearchTokens(state.search)) {
  if (!tokens.length) return null;

  const book = findBibleBookByCode(scripture.book_code);
  const fields = [
    searchField("title", scripture.title, 120),
    searchField("meta", scripture.book, 112),
    searchField("meta", scripture.reference, 110),
    searchField("meta", scripture.translation, 70),
    searchField("meta", book?.englishName, 68),
    searchField("meta", book?.canonicalEnglishTitle, 68),
    searchField("meta", book?.division, 48),
    searchField("meta", book?.jewishCategory, 40),
    searchField("meta", book?.author, 36),
    searchField("lyrics", scripture.text, 48),
    searchField("meta", scripture.memo, 36),
  ].filter((field) => field.text);
  const phrase = getSearchPhrase(tokens);
  let bestMatch = null;

  for (const field of fields) {
    const matches = tokens.map((token) => matchSearchField(field, token));
    if (matches.some((match) => !match)) continue;

    const candidate = field.candidate;
    const phraseMatched = phrase.compact.length > 1 && candidate.compact.includes(phrase.compact);
    const phraseBoost = phraseMatched ? (candidate.compact === phrase.compact ? 64 : 26) : 0;
    const score = matches.reduce((sum, match) => sum + match.score, 0) + phraseBoost;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, field, phraseMatched };
    }
  }

  return bestMatch;
}


function formatBookMarker(value) {
  return formatNumericMarker(value, 2);
}

function formatHymnMarker(value) {
  return formatNumericMarker(value, 3);
}

function formatNumericMarker(value, width) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? text.padStart(width, "0") : text;
}

function getBibleBooks() {
  return state.scriptureBooks.length ? state.scriptureBooks : BIBLE_BOOKS;
}

function getBibleChapterOptions() {
  const selectedBook = findBibleBookByCode(state.selectedBookCode);
  const chapterCount = getBibleChapterCount(selectedBook);
  if (chapterCount) return Array.from({ length: chapterCount }, (_, index) => index + 1);
  return [...new Set(state.bibleBookVerses.map((verse) => Number(verse.chapter)).filter((chapter) => chapter > 0))].sort((a, b) => a - b);
}

function getBibleChapterCount(book) {
  const count = Number(book?.chapterCount || book?.metadata?.chapters || BIBLE_CHAPTER_COUNTS[book?.code]);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function bibleVerseCacheKey(translationId, bookCode, chapter) {
  return [translationId, bookCode, chapter].join(":");
}

function sortBibleVerseRows(a, b) {
  const bookA = findBibleBookByCode(a.book_code);
  const bookB = findBibleBookByCode(b.book_code);
  return (
    Number(bookA?.sortOrder || 999) - Number(bookB?.sortOrder || 999) ||
    Number(a.chapter) - Number(b.chapter) ||
    Number(a.verse) - Number(b.verse)
  );
}

function isBibleTextSearchActive() {
  return Boolean(state.bibleTextSearchQuery);
}

function shouldClearBibleTextSearchOnInput() {
  return (
    state.module === "scripture" &&
    isBibleTextSearchActive() &&
    normalizeSearchValue(state.search) !== normalizeSearchValue(state.bibleTextSearchQuery)
  );
}

function clearBibleTextSearch() {
  state.bibleTextSearchQuery = "";
  state.bibleTextSearchAllResults = [];
  state.bibleTextSearchResults = [];
  state.bibleTextSearchLoading = false;
  state.bibleTextSearchError = "";
  state.bibleTextSearchRequestId = "";
  state.bibleTextSearchTotal = null;
  state.bibleTextSearchPage = 0;
}

async function getScriptureSearchShortcut(value) {
  const query = String(value || "").trim();
  if (!query) return null;
  await ensureBibleBookLookups();

  const reference = parseBibleReference(query);
  if (reference) return { type: "reference", reference };

  const book = findBibleBookByReferenceName(query) || findBibleBookByName(query);
  if (book) return { type: "book", book };

  if (state.module === "scripture") return { type: "text", query };
  return null;
}

async function ensureBibleBookLookups() {
  if (getBibleBooks().length || !state.client || state.scriptureError) return;
  await loadScriptureBooks({ silent: true });
}

async function runScriptureSearchShortcut(shortcut) {
  if (!shortcut) return;

  if (state.module !== "scripture") {
    await switchModule("scripture", { clearSearch: false, syncHistory: false });
    if (state.module !== "scripture") return;
  }

  if (shortcut.type === "reference") {
    navigateToBibleReference(shortcut.reference);
    return;
  }
  if (shortcut.type === "book") {
    navigateToBibleBook(shortcut.book);
    return;
  }
  await runBibleTextSearch(shortcut.query);
}

function escapePostgrestLikePattern(value) {
  return String(value || "").replace(/[\\%_]/g, (match) => `\\${match}`);
}

function getBibleBooksForScriptureFilter() {
  const books = getBibleBooks();
  if (state.scriptureFilter === "old") return books.filter((book) => book.testament === "Old Testament");
  if (state.scriptureFilter === "new") return books.filter((book) => book.testament === "New Testament");
  return books;
}

function getFilteredBibleBooks() {
  const reference = parseBibleReference(state.search);
  if (reference) return [reference.book];
  const books = getBibleBooksForScriptureFilter();
  if (isBibleTextSearchActive()) return books;
  const tokens = getSearchTokens(state.search);
  if (!tokens.length) return books;
  return books.filter((book) => getBibleBookSearchMatch(book, tokens));
}

function clearSelectedBookOutsideFilter() {
  const books = getBibleBooksForScriptureFilter();
  if (books.some((book) => book.code === state.selectedBookCode)) return;
  state.selectedBookCode = null;
}

function getBibleBookSearchMatch(book, tokens = getSearchTokens(state.search)) {
  if (!tokens.length) return null;
  const fields = [
    searchField("title", book.koreanName, 110),
    searchField("meta", book.englishName, 90),
    searchField("meta", book.canonicalEnglishTitle, 90),
    searchField("meta", book.shortName, 80),
    ...(book.aliases || []).map((alias) => searchField("meta", alias, 78)),
    ...(BIBLE_BOOK_ALIASES[book.code] || []).map((alias) => searchField("meta", alias, 78)),
    searchField("meta", book.testament, 55),
    searchField("meta", book.division, 55),
    searchField("meta", book.jewishCategory, 45),
    searchField("meta", book.author, 40),
  ].filter((field) => field.text);
  return fields.some((field) => tokens.every((token) => matchSearchField(field, token)));
}

function groupBibleBooksByTestament(books) {
  return ["Old Testament", "New Testament"]
    .map((testament) => ({ testament, books: books.filter((book) => book.testament === testament).sort(sortBibleBooks) }))
    .filter((group) => group.books.length);
}

function findBibleBookByCode(code) {
  return getBibleBookLookups().byCode.get(code) || null;
}

function findBibleBookByReferenceName(name) {
  const value = normalizeReferenceBookName(name);
  if (!value) return null;
  return getBibleBookLookups().byReferenceName.get(value) || null;
}

function getBibleBookReferenceNames(book) {
  if (!book) return [];
  return [
    book.code,
    book.koreanName,
    book.englishName,
    book.canonicalEnglishTitle,
    book.shortName,
    KOREAN_BIBLE_BOOK_ABBREVIATIONS[book.code],
    ENGLISH_BIBLE_BOOK_ABBREVIATIONS[book.code],
    ...(book.aliases || []),
    ...(BIBLE_BOOK_ALIASES[book.code] || []),
  ].filter(Boolean);
}

function normalizeReferenceBookName(value) {
  return normalizeSearchValue(value)
    .replace(/^(first|i)\s+/, "1")
    .replace(/^(second|ii)\s+/, "2")
    .replace(/^(third|iii)\s+/, "3")
    .replace(/\s+/g, "");
}

function findBibleBookByName(name) {
  const value = normalizeTitle(name);
  if (!value) return null;
  return getBibleBookLookups().byName.get(value) || null;
}

function getBibleBookLookups() {
  const books = getBibleBooks();
  if (bibleBookLookupCache.books === books) return bibleBookLookupCache;

  const byCode = new Map();
  const byName = new Map();
  const byReferenceName = new Map();
  for (const book of books) {
    byCode.set(book.code, book);
    for (const name of [book.koreanName, book.englishName, book.canonicalEnglishTitle, book.shortName]) {
      const normalizedName = normalizeTitle(name);
      if (normalizedName && !byName.has(normalizedName)) byName.set(normalizedName, book);
    }
    for (const name of getBibleBookReferenceNames(book)) {
      const referenceName = normalizeReferenceBookName(name);
      if (referenceName && !byReferenceName.has(referenceName)) byReferenceName.set(referenceName, book);
    }
  }
  bibleBookLookupCache.books = books;
  bibleBookLookupCache.byCode = byCode;
  bibleBookLookupCache.byName = byName;
  bibleBookLookupCache.byReferenceName = byReferenceName;
  return bibleBookLookupCache;
}


function getSongSearchMatch(song, tokens = getSearchTokens(state.search)) {
  if (!tokens.length) return null;

  const fields = getSongSearchFields(song);
  const phrase = getSearchPhrase(tokens);
  let bestMatch = null;

  for (const field of fields) {
    const matches = tokens.map((token) => matchSearchField(field, token));
    if (matches.some((match) => !match)) continue;

    const candidate = field.candidate;
    const phraseMatched = phrase.compact.length > 1 && candidate.compact.includes(phrase.compact);
    const exactMatch = phrase.compact.length > 1 && candidate.compact === phrase.compact;
    const phraseBoost = exactMatch ? 200 : phraseMatched ? 26 : 0;
    const score = matches.reduce((sum, match) => sum + match.score, 0) + phraseBoost;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, field, phraseMatched };
    }
  }

  return bestMatch;
}

function getSongSearchFields(song) {
  const metadata = normalizeSongMetadata(song?.metadata);
  const fields = [
    searchField("title", song.title, 120),
    searchField("hymn", song.hymn_no, 125),
    searchField("meta", song.subtitle, 88),
    searchField("meta", song.original_title, 88),
    ...cleanList(song.alt_titles).map((title) => searchField("meta", title, 78)),
    ...cleanList(song.scripture).map((reference) => searchField("meta", reference, 70)),
    searchField("meta", metadata.otherTitle, 78),
    ...songPraiseTypes(song).map((type) => searchField("meta", type, 40)),
    searchField("meta", metadata.artist, 62),
    searchField("meta", metadata.lyricist, 58),
    searchField("meta", metadata.composer, 58),
    searchField("meta", metadata.translator, 54),
    searchField("meta", metadata.album, 48),
    searchField("meta", metadata.track, 32),
  ];

  for (const version of song.versions || []) {
    const versionMetadata = normalizeSongMetadata(version.metadata);
    fields.push(searchField("version", versionDisplayName(song, version), 74));
    fields.push(searchField("version", version.raw_section_name, 58));
    fields.push(searchField("version", version.version_label, 52));
    fields.push(searchField("version", versionMetadata.otherTitle, 58));
    fields.push(searchField("version", versionMetadata.artist, 46));
    fields.push(searchField("version", versionMetadata.lyricist, 42));
    fields.push(searchField("version", versionMetadata.composer, 42));
    fields.push(searchField("version", versionMetadata.translator, 38));
    fields.push(searchField("version", versionMetadata.album, 36));
    for (const form of version.forms || []) {
      fields.push(searchField("lyrics", form.lyrics, 24));
    }
  }

  return fields.filter((field) => field.text);
}

function searchField(kind, text, weight) {
  const fieldText = String(text || "").trim();
  return { kind, text: fieldText, weight, candidate: fieldText ? getSearchCandidate(fieldText) : null };
}

function matchSearchField(field, token) {
  const candidate = field.candidate;
  if (!candidate) return null;
  const exact = Boolean(token.normalized && candidate.normalized === token.normalized) || Boolean(token.compact && candidate.compact === token.compact);
  const prefix =
    Boolean(token.normalized && candidate.normalized.startsWith(token.normalized)) ||
    Boolean(token.compact && candidate.compact.startsWith(token.compact));
  const normalHit = token.normalized && candidate.normalized.includes(token.normalized);
  const compactHit = token.compact && candidate.compact.includes(token.compact);
  const initialHit = token.initials.length > 1 && candidate.initials.includes(token.initials);

  if (!exact && !prefix && !normalHit && !compactHit && !initialHit) return null;

  let score = field.weight;
  if (exact) score += 70;
  else if (prefix) score += 44;
  else if (normalHit || compactHit) score += 22;
  else if (initialHit) score += 12;
  if (field.kind === "lyrics") score -= 6;

  return { field, score };
}

function getSearchTokens(value) {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map((token) => getSearchCandidate(token))
    .filter((token) => token.compact || token.initials);
}

function parseBibleReference(value) {
  const text = normalizeReferenceInput(value);
  if (!text) return null;
  const match = text.match(/^(.+?)\s+(\d{1,3})(?::\s*(\d{1,3}))?$/);
  if (!match) return null;
  const book = findBibleBookByReferenceName(match[1]);
  if (!book) return null;
  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : null;
  if (!chapter || chapter < 1 || (verse !== null && verse < 1)) return null;
  return { book, chapter, verse };
}

function normalizeReferenceInput(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/[：.]/g, ":")
    .replace(/\s*:\s*/g, ":")
    .replace(/^([1-3])\s+([A-Za-z가-힣])/, "$1$2")
    .replace(/([^\s\d])(\d{1,3})(?::\d{1,3})?$/u, (match, prefix) => {
      const numberPart = match.slice(prefix.length);
      return `${prefix} ${numberPart}`;
    })
    .replace(/\s+/g, " ");
}

function navigateToBibleReference(reference) {
  if (!reference?.book) return;
  resetScriptureSearchInput();
  selectScriptureBook(reference.book.code, {
    chapter: reference.chapter,
    verse: reference.verse,
    force: true,
  });
}

function navigateToBibleBook(book) {
  if (!book?.code) return;
  resetScriptureSearchInput();
  selectScriptureBook(book.code, { force: true });
}

function resetScriptureSearchInput() {
  state.search = "";
  refs.searchInput.value = "";
  clearBibleTextSearch();
  renderListFilter();
  renderSongList();
}

function getSearchPhrase(tokens) {
  return {
    compact: tokens.map((token) => token.compact).join(""),
  };
}

function getSearchCandidate(value) {
  const normalized = normalizeSearchValue(value);
  return {
    normalized,
    compact: compactSearchValue(normalized),
    initials: getHangulInitials(normalized),
  };
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compactSearchValue(value) {
  return Array.from(normalizeSearchValue(value))
    .filter(isSearchCharacter)
    .join("");
}

function getHangulInitials(value) {
  return Array.from(normalizeSearchValue(value))
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) return HANGUL_INITIALS[Math.floor((code - 0xac00) / 588)];
      if (code >= 0x1100 && code <= 0x1112) return HANGUL_INITIALS[code - 0x1100];
      if (isAsciiAlphaNumeric(code) || isHangulConsonant(code)) return char;
      return "";
    })
    .join("");
}

function isSearchCharacter(char) {
  const code = char.charCodeAt(0);
  return (
    isAsciiAlphaNumeric(code) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0x1100 && code <= 0x1112) ||
    (code >= 0x3131 && code <= 0x318e) ||
    (code >= 0x4e00 && code <= 0x9fff)
  );
}

function isAsciiAlphaNumeric(code) {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
}

function isHangulConsonant(code) {
  return code >= 0x3131 && code <= 0x314e;
}

function getSearchSnippet(value, tokens) {
  const lines = String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const source = lines.length ? lines : [String(value || "").trim()].filter(Boolean);
  const matched = source.find((line) => tokens.some((token) => matchSearchField(searchField("snippet", line, 0), token))) || source[0] || "";
  return matched.length > 72 ? `${matched.slice(0, 70).trim()}...` : matched;
}

function sortSongs(a, b) {
  return TITLE_COLLATOR.compare(a.title || "", b.title || "");
}

function sortSongsForCurrentList(a, b) {
  if (state.praiseFilter === "hymns") {
    const aNo = parseInt(a.hymn_no, 10);
    const bNo = parseInt(b.hymn_no, 10);
    if (!isNaN(aNo) && !isNaN(bNo)) return aNo - bNo;
    if (!isNaN(aNo)) return -1;
    if (!isNaN(bNo)) return 1;
  }
  const titleCompare = TITLE_COLLATOR.compare(songListView(a).title, songListView(b).title);
  return titleCompare || sortSongs(a, b);
}

function sortScriptures(a, b) {
  return TITLE_COLLATOR.compare(a.title || "", b.title || "");
}

function sortBibleBooks(a, b) {
  return (a.sortOrder || 999) - (b.sortOrder || 999);
}

function songEmptyStatus(song) {
  const versions = song?.versions || [];
  if (!versions.length) return null;
  const emptyCount = versions.filter((version) => !versionHasLyrics(version)).length;
  if (!emptyCount) return null;
  return emptyCount === versions.length ? "all-empty" : "some-empty";
}

function versionHasLyrics(version) {
  return Boolean((version?.forms || []).some((form) => (form.lyrics || "").trim()));
}

function getSelectedSong() {
  return state.songs.find((song) => song.id === state.selectedSongId) || null;
}

function getSelectedScripture() {
  return state.scriptures.find((scripture) => scripture.id === state.selectedScriptureId) || null;
}

function requireClient() {
  if (state.client) return true;
  showToast("Open Mindex with a connection link first.", "error");
  return false;
}

function hasDirtyChanges() {
  return state.dirty.song || state.dirty.forms || state.dirty.scripture || state.dirty.service;
}

function updateSaveState() {
  if (state.module === "service") {
    const selectedService = state.services.find((svc) => svc.id === state.selectedServiceId);
    refs.saveAllBtn.disabled = !selectedService || !state.dirty.service || state.saving;
    renderConnectionStatus();
    const dirtyPill = refs.detailPane.querySelector(".dirty-pill");
    if (dirtyPill) dirtyPill.hidden = !state.dirty.service;
    return;
  }
  const selectedItem = state.module === "scripture" ? getSelectedScripture() : getSelectedSong();
  refs.saveAllBtn.disabled = !selectedItem || !hasDirtyChanges() || state.saving;
  renderConnectionStatus();

  const dirtyPill = refs.detailPane.querySelector(".dirty-pill");
  if (dirtyPill) {
    dirtyPill.hidden = !hasDirtyChanges();
  }
}

function updateEditorTitle(song) {
  const title = refs.detailPane.querySelector("#editorSongTitle");
  if (title) title.textContent = song.title || "Untitled Song";
}

function parseList(value) {
  if (Array.isArray(value)) return cleanList(value);
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanList(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function normalizeSongMetadata(value) {
  const source = value && typeof value === "object" ? value : {};
  const metadata = {
    otherTitle: nullIfBlank(source.otherTitle),
    praiseTypes: normalizePraiseTypes(source.praiseTypes || source.categories || source.type),
    artist: nullIfBlank(source.artist || source.performer),
    lyricist: nullIfBlank(source.lyricist),
    composer: nullIfBlank(source.composer),
    translator: nullIfBlank(source.translator),
    album: nullIfBlank(source.album),
    track: nullIfBlank(source.track),
  };
  return Object.fromEntries(Object.entries(metadata).filter(([, item]) => (Array.isArray(item) ? item.length : item)));
}

function normalizePraiseTypes(value) {
  const aliases = {
    hymn: "hymn",
    hymns: "hymn",
    찬송가: "hymn",
    ccm: "ccm",
    contemporary: "ccm",
    praise: "ccm",
    찬양: "ccm",
    복음성가: "ccm",
  };
  return [...new Set(parseList(value).map((item) => aliases[normalizeTitle(item)]).filter((item) => PRAISE_TYPES.includes(item)))];
}

function nullIfBlank(value) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function nextUntitledTitle() {
  const base = "Untitled Song";
  const titles = new Set(state.songs.map((song) => song.title));
  if (!titles.has(base)) return base;

  let index = 2;
  while (titles.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function nextUntitledScriptureTitle() {
  const base = "Untitled Scripture";
  const titles = new Set(state.scriptures.map((scripture) => scripture.title));
  if (!titles.has(base)) return base;
  let index = 2;
  while (titles.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function withLocalId(form) {
  return {
    ...form,
    _localId: form._localId || form.id || createLocalId(),
  };
}

function createLocalId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  refs.toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function resizeFormTextareas() {
  document.querySelectorAll(".form-textarea").forEach(resizeFormTextarea);
}

function resizeFormTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

// ─── Service module ───────────────────────────────────────────────────────────

const SERVICE_ORDER_TEMPLATE_FALLBACKS = {
  "sunday-main": ["사도신경", "찬양", "참회기도", "기도", "성경봉독", "특송", "설교", "결단기도", "봉헌", "봉헌기도", "교회소식", "송영", "축도"],
  "sunday-afternoon": ["찬양", "묵도", "찬송", "기도", "성경봉독", "설교", "결단기도", "교회소식", "송영", "축도"],
  wednesday: ["찬양", "기도", "교회소식", "성경봉독", "설교", "결단찬양", "결단기도", "축도"],
  friday: ["찬양", "기도", "특송", "교회소식", "성경봉독", "설교", "결단찬양", "기도회", "찬양", "통성기도", "자율기도"],
  monthly: ["찬양", "기도", "성경봉독", "특송", "설교", "결단찬양", "기도", "봉헌", "봉헌기도", "교회소식", "축도"],
  dawn: ["찬양", "기도", "성경봉독", "설교", "기도"],
  omer: ["찬양", "기도", "특송", "결단"],
  children: ["사도신경", "찬양", "예배의 부름", "성경봉독", "설교", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "나래파송", "주기도문", "광고", "교제"],
  youth: ["사도신경", "찬양", "통성기도", "대표기도", "봉헌", "봉헌찬양", "봉헌기도", "성경봉독", "설교", "결단찬양", "결단기도", "주기도문", "광고", "교제"],
  "young-adult": ["사도신경", "대표기도", "찬양", "통성기도", "성경봉독", "설교", "결단찬양", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "광고", "파송찬양", "축도", "교제"],
};

function normalizeServiceItem(item = {}, index = 0) {
  return {
    id: item.id || createLocalId(),
    service_id: item.service_id || state.selectedServiceId || null,
    sort_order: Number(item.sort_order) || index + 1,
    label: item.label || "",
    raw_title: item.raw_title || "",
    song_id: item.song_id || null,
  };
}

function normalizeServiceDefaultItem(item = {}, index = 0) {
  return {
    id: item.id || createLocalId(),
    sort_order: Number(item.sort_order) || index + 1,
    label: item.label || "",
    raw_title: item.raw_title || item.title || item.default_text || "",
  };
}

function normalizeServiceItems(items) {
  return [...(items || [])]
    .map(normalizeServiceItem)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function normalizeServiceDefaultItems(items) {
  return [...(items || [])]
    .map(normalizeServiceDefaultItem)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function serializeServiceDefaultItems(typeId) {
  return getServiceDefaultItems(typeId)
    .filter((item) => String(item.label || item.raw_title || "").trim())
    .map((item, index) => ({
      sort_order: index + 1,
      label: nullIfBlank(item.label),
      raw_title: String(item.raw_title || "").trim(),
    }));
}

function confirmDiscardServiceChanges() {
  if (!state.dirty.service) return true;
  return window.confirm("Discard unsaved service changes?");
}

function getFilteredServiceTypes() {
  const f = state.serviceFilter;
  let types = state.serviceTypes;
  if (f === "public") types = types.filter((t) => SERVICE_CATEGORIES.public.includes(t.id));
  else if (f === "ministry") types = types.filter((t) => SERVICE_CATEGORIES.ministry.includes(t.id));
  const q = normalizeSearchValue(state.search);
  if (!q) return types;
  return types.filter((t) => getServicesByType(t.id).some((s) => serviceMatchesSearch(s, q)));
}

function getServicesByType(typeId) {
  return sortServicesByDate(state.services.filter((s) => s.type_id === typeId));
}

function sortServicesByDate(services, direction = "asc") {
  const weight = direction === "desc" ? -1 : 1;
  return [...services].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare) return dateCompare * weight;
    return serviceTypeSortOrder(a.type_id) - serviceTypeSortOrder(b.type_id);
  });
}

function serviceTypeSortOrder(typeId) {
  return state.serviceTypes.find((type) => type.id === typeId)?.sort_order || 999;
}

function serviceTypeName(typeId) {
  return state.serviceTypes.find((type) => type.id === typeId)?.name || typeId || "";
}

function serviceTypeById(typeId) {
  return state.serviceTypes.find((type) => type.id === typeId) || null;
}

function serviceOrderTemplate(typeId) {
  const template = serviceTypeById(typeId)?.order_template;
  if (Array.isArray(template) && template.length) return template.filter((step) => step && typeof step === "object");
  return (SERVICE_ORDER_TEMPLATE_FALLBACKS[typeId] || []).map((label, index) => ({
    label,
    name: label,
    phase: index < 4 ? "Gathering" : index < 8 ? "Word/Response" : "Sending",
    required: !["찬양", "특송", "결단찬양", "통성기도", "교제", "기도회"].includes(label),
    flex: ["찬양", "특송", "결단찬양", "통성기도", "교제", "기도회", "기도"].includes(label),
    repeatable: label === "찬양" || label === "기도",
    source: "Fallback",
  }));
}

function getServiceItems(serviceId) {
  return state.serviceItems[serviceId] || [];
}

function getServiceDefaultItems(typeId) {
  return normalizeServiceDefaultItems(serviceTypeById(typeId)?.fixed_items || []);
}

function setServiceDefaultItems(typeId, items) {
  const typeObj = serviceTypeById(typeId);
  if (!typeObj) return;
  typeObj.fixed_items = normalizeServiceDefaultItems(items);
  state.dirtyServiceTypeIds.add(typeId);
  state.dirty.service = true;
  updateSaveState();
}

function getServiceOutputItems(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const items = normalizeServiceItems(getServiceItems(serviceId));
  if (!service) return items;
  const defaults = getServiceDefaultItems(service.type_id).map((item, index) => ({
    ...item,
    sort_order: items.length + index + 1,
  }));
  return normalizeServiceItems([...items, ...defaults]);
}

function normalizeServiceLeader(rawLeader, typeId) {
  const raw = String(rawLeader || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const titleRules = [
    ["목사님", "목사"],
    ["목사", "목사"],
    ["전도사님", "전도사"],
    ["전도사", "전도사"],
    ["집사님", "집사"],
    ["집사", "집사"],
    ["장로님", "장로"],
    ["장로", "장로"],
    ["권사님", "권사"],
    ["권사", "권사"],
    ["선생님", "선생님"],
    ["선생", "선생님"],
    ["청년", "청년"],
  ];

  for (const [suffix, title] of titleRules) {
    if (!raw.endsWith(suffix)) continue;
    const name = raw.slice(0, -suffix.length).trim();
    return name ? `${name} ${title}` : title;
  }

  return `${raw} ${defaultServiceLeaderTitle(typeId)}`;
}

function defaultServiceLeaderTitle(typeId) {
  return typeId === "children" || typeId === "youth" ? "선생님" : "청년";
}

function serviceLeaderLabel(service) {
  return normalizeServiceLeader(service?.leader, service?.type_id);
}

function serviceMatchesSearch(svc, q) {
  if (!q) return true;
  const norm = (s) => normalizeSearchValue(s);
  const praiseLead = norm([svc.leader, serviceLeaderLabel(svc)].filter(Boolean).join(" "));
  const tags = norm((svc.tags || []).join(" "));
  const date = svc.date || "";
  const d = new Date(date + "T00:00:00");
  const dateFmt = `${d.getMonth()+1}/${d.getDate()}`;
  const type = norm(serviceTypeName(svc.type_id));
  const items = norm([
    ...getServiceItems(svc.id),
    ...getServiceDefaultItems(svc.type_id),
  ].map((item) => `${item.label || ""} ${item.raw_title || ""}`).join(" "));
  return praiseLead.includes(q) || date.includes(q) || tags.includes(q) || dateFmt.includes(q) || type.includes(q) || items.includes(q);
}

function getFilteredServicesForType(typeId) {
  const q = normalizeSearchValue(state.search);
  const all = getServicesByType(typeId);
  return q ? all.filter((s) => serviceMatchesSearch(s, q)) : all;
}

function getFilteredServices() {
  const allowedTypes = new Set(getFilteredServiceTypes().map((type) => type.id));
  const q = normalizeSearchValue(state.search);
  return sortServicesByDate(
    state.services.filter((service) => allowedTypes.has(service.type_id) && (!q || serviceMatchesSearch(service, q))),
  );
}

function getServiceDashboardServices() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  const upcoming = getFilteredServices().filter((service) => {
    const serviceDate = new Date(`${service.date}T00:00:00`);
    return serviceDate >= today && serviceDate <= end;
  });
  if (upcoming.length) return upcoming;
  return sortServicesByDate(getFilteredServices(), "desc").slice(0, 8);
}

function renderServiceList() {
  if (state.serviceFilter === "calendar") {
    const n = state.calendarData.length;
    refs.songCount.textContent = n ? `${n}주` : "";
    refs.songList.innerHTML = "";
    return;
  }

  if (state.serviceError || !state.serviceTypes.length) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = state.serviceError
      ? renderListEmptyState("Service unavailable", state.serviceError)
      : renderListEmptyState("Loading…", "");
    return;
  }

  const types = getFilteredServiceTypes();
  const q = normalizeSearchValue(state.search);
  const serviceTotal = types.reduce((sum, type) => sum + (q ? getFilteredServicesForType(type.id).length : getServicesByType(type.id).length), 0);
  refs.songCount.textContent = `${types.length} types · ${serviceTotal} services`;

  refs.songList.innerHTML = types.map((t) => {
    const active = t.id === state.selectedServiceTypeId ? " active" : "";
    const count = q ? getFilteredServicesForType(t.id).length : getServicesByType(t.id).length;
    return `
      <button class="song-item${active}" type="button" data-service-type-id="${escapeAttr(t.id)}">
        <span class="song-title">
          <span class="song-title-text">${escapeHtml(t.name)}</span>
          ${count ? `<span class="song-count-badge">${count}</span>` : ""}
        </span>
      </button>`;
  }).join("");

  finishListRender();
}

function renderServiceDetail() {
  if (state.serviceFilter === "calendar") {
    renderCalendarView();
    return;
  }

  const serviceId = state.selectedServiceId;

  if (!state.selectedServiceTypeId) {
    renderServiceDashboard();
    return;
  }

  if (!serviceId) {
    const typeId = state.selectedServiceTypeId;
    const services = sortServicesByDate(getFilteredServicesForType(typeId), "desc");
    const typeName = serviceTypeName(typeId);
    const q = normalizeSearchValue(state.search);
    const form = state.newServiceForm;
    refs.detailPane.innerHTML = `
      <div class="service-date-list">
        <div class="service-section-head">
          <h2 class="service-date-list-title">${escapeHtml(typeName)}</h2>
          <div class="service-section-head-actions">
            <span class="service-search-count">${services.length}${q ? " results" : " services"}</span>
            ${!q ? `<button class="icon-btn svc-new-btn" type="button" data-new-service="${escapeAttr(typeId)}" title="새 예배 추가" aria-label="새 예배 추가"><i data-lucide="plus"></i></button>` : ""}
          </div>
        </div>
        ${form ? `
        <div class="svc-new-form">
          <div class="svc-new-form-fields">
            <div class="svc-new-field">
              <label class="svc-new-label">날짜</label>
              <input class="svc-new-input" type="date" data-new-service-field="date" value="${escapeAttr(form.date)}" required />
            </div>
            <div class="svc-new-field">
              <label class="svc-new-label">인도자</label>
              <input class="svc-new-input" type="text" data-new-service-field="leader" value="${escapeAttr(form.leader)}" placeholder="이름 칭호" />
            </div>
            <div class="svc-new-field">
              <label class="svc-new-label">비고</label>
              <input class="svc-new-input" type="text" data-new-service-field="tags" value="${escapeAttr(form.tags)}" placeholder="쉼표로 구분" />
            </div>
          </div>
          <div class="svc-new-form-actions">
            <button class="btn primary" type="button" data-create-service>추가</button>
            <button class="btn secondary" type="button" data-cancel-new-service>취소</button>
          </div>
        </div>` : ""}
        ${services.length ? `<div class="service-date-grid">
          ${services.map((service) => renderServiceDateCard(service)).join("")}
        </div>` : `<p class="service-no-results">${q ? "검색 결과가 없습니다." : "등록된 예배가 없습니다."}</p>`}
      </div>`;
    refreshIcons();
    return;
  }

  const svc = state.services.find((s) => s.id === serviceId);
  if (!svc) return;

  const items = state.serviceItems[serviceId];
  if (!items) {
    refs.detailPane.innerHTML = `<div class="empty-detail"><div class="empty-detail-inner"><p>Loading…</p></div></div>`;
    loadServiceItems(serviceId);
    return;
  }

  const dateStr = formatServiceDate(svc);
  const typeName = serviceTypeName(svc.type_id);
  const typeObj = serviceTypeById(svc.type_id);

  const sorted = normalizeServiceItems(items);
  const itemsHtml = renderServiceItemGroups(sorted);
  refs.detailPane.innerHTML = `
    <div class="service-viewer">
      <div class="svc-header">
        <div class="svc-header-date">
          <span class="svc-type-name">${escapeHtml(typeName)}</span>
          <h2 class="svc-date-text">${escapeHtml(dateStr)}</h2>
        </div>
        <div class="svc-header-meta">
          <div class="svc-meta-fields">
            <input class="svc-meta-input" type="text" data-service-meta-field="leader"
              value="${escapeAttr(svc.leader || "")}"
              placeholder="찬양 인도자"
              aria-label="찬양 인도자" />
            <input class="svc-meta-input" type="text" data-service-meta-field="tags"
              value="${escapeAttr((svc.tags || []).join(", "))}"
              placeholder="비고"
              aria-label="비고" />
          </div>
          <button class="btn secondary svc-copy-btn" type="button" data-copy-service="${escapeAttr(svc.id)}" title="Copy service setlist">
            <i data-lucide="clipboard"></i>
            <span>Text</span>
          </button>
          <button class="btn secondary svc-copy-btn" type="button" data-copy-service-draft="${escapeAttr(svc.id)}" title="Copy PPT draft">
            <i data-lucide="presentation"></i>
            <span>Draft</span>
          </button>
          <button class="icon-btn danger" type="button" data-delete-service="${escapeAttr(svc.id)}" title="예배 삭제" aria-label="예배 삭제">
            <i data-lucide="trash-2"></i>
          </button>
          <span class="dirty-pill" ${state.dirty.service ? "" : "hidden"}>Unsaved changes</span>
        </div>
      </div>
      ${renderServiceOrderTemplate(typeObj)}
      <div class="svc-items svc-editor-items">${itemsHtml || `<p class="service-no-results">예배 순서를 추가해 주세요.</p>`}</div>
    </div>`;
  refreshIcons();
  updateSaveState();
}

function renderServiceDefaultItems(typeObj) {
  const typeId = typeObj?.id;
  const items = getServiceDefaultItems(typeId);
  if (!typeId || !items.length) return "";
  return `
    <section class="svc-default-section" aria-label="Every service components">
      <div class="svc-default-head">
        <span>Every Service</span>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" type="button" data-service-default-action="sort" data-service-default-index="0" title="Sort by service order" aria-label="Sort by service order">
            <i data-lucide="arrow-up-down"></i>
          </button>
          <button class="icon-btn" type="button" data-service-default-action="add" data-service-default-index="${items.length}" title="Add default component" aria-label="Add default component">
            <i data-lucide="plus"></i>
          </button>
        </div>
      </div>
      <div class="svc-items svc-default-items">
        ${items.map((item, index) => renderServiceDefaultEditorItem(item, index, items.length)).join("")}
      </div>
    </section>`;
}

function renderServiceOrderTemplate(typeObj) {
  const template = serviceOrderTemplate(typeObj?.id);
  if (!template.length) return "";
  return `
    <section class="svc-template-guide" aria-label="Service order guide">
      <div class="svc-template-head">
        <span>Components</span>
      </div>
      <div class="svc-template-flow">
        ${template.map((step, index) => renderServiceTemplateStep(step, index)).join("")}
      </div>
    </section>`;
}

function renderServiceTemplateStep(step, index) {
  const label = step.label || step.name || `Step ${index + 1}`;
  return `
    <button
      class="svc-template-step${step.required ? " is-required" : ""}${step.flex ? " is-flex" : ""}"
      type="button"
      data-service-item-action="add"
      data-service-item-label="${escapeAttr(step.label || "")}"
      data-service-item-title="${escapeAttr(step.default_text || "")}"
      title="${escapeAttr([step.name, step.notes, step.source ? `Source: ${step.source}` : ""].filter(Boolean).join(" · "))}"
    >
      <span class="svc-template-step-label">${escapeHtml(label)}</span>
    </button>`;
}

function renderServiceItemGroups(items) {
  if (!items.length) return `<p class="service-no-results">예배 순서를 추가해 주세요.</p>`;
  const total = items.length;

  // Group consecutive items with the same non-empty label
  const groups = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item.label || "";
    const last = groups[groups.length - 1];
    if (label && last && last.label === label) {
      last.entries.push({ item, realIndex: i });
    } else {
      groups.push({ label, entries: [{ item, realIndex: i }] });
    }
  }

  let html = "";
  let groupNum = 0;
  for (const group of groups) {
    groupNum++;
    if (group.entries.length === 1) {
      html += renderServiceEditorItem(group.entries[0].item, group.entries[0].realIndex, total, groupNum);
    } else {
      // Group header
      html += `<div class="svc-group">
        <div class="svc-group-head">
          <span class="svc-edit-order">${groupNum}</span>
          <span class="svc-group-label">${escapeHtml(group.label)}</span>
        </div>`;
      for (const { item, realIndex } of group.entries) {
        html += `
        <article class="svc-edit-item svc-edit-item--sub">
          <div class="svc-edit-title-wrap">
            <input
              class="svc-edit-title"
              type="text"
              data-service-item-field="raw_title"
              data-service-item-index="${realIndex}"
              value="${escapeAttr(item.raw_title || "")}"
              placeholder="찬양 제목"
              aria-label="Service item text"
            />
            ${item.song_id ? `<button class="icon-btn svc-song-link" type="button" data-open-song="${escapeAttr(item.song_id)}" title="Praise에서 열기" aria-label="Praise에서 열기"><i data-lucide="music"></i></button>` : ""}
          </div>
          <div class="svc-edit-actions">
            <button class="icon-btn" type="button" data-service-item-action="up" data-service-item-index="${realIndex}" ${realIndex === 0 ? "disabled" : ""} title="Move up" aria-label="Move up"><i data-lucide="arrow-up"></i></button>
            <button class="icon-btn" type="button" data-service-item-action="down" data-service-item-index="${realIndex}" ${realIndex === total - 1 ? "disabled" : ""} title="Move down" aria-label="Move down"><i data-lucide="arrow-down"></i></button>
            <button class="icon-btn" type="button" data-service-item-action="duplicate" data-service-item-index="${realIndex}" title="Duplicate" aria-label="Duplicate"><i data-lucide="copy"></i></button>
            <button class="icon-btn danger" type="button" data-service-item-action="delete" data-service-item-index="${realIndex}" title="Delete" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </article>`;
      }
      html += `</div>`;
    }
  }
  return html;
}

function renderServiceEditorItem(item, index, total, groupNum) {
  return `
    <article class="svc-edit-item">
      <span class="svc-edit-order">${groupNum ?? index + 1}</span>
      <input
        class="svc-edit-label"
        type="text"
        data-service-item-field="label"
        data-service-item-index="${index}"
        value="${escapeAttr(item.label || "")}"
        placeholder="찬양"
        aria-label="Service item label"
      />
      <div class="svc-edit-title-wrap">
        <input
          class="svc-edit-title"
          type="text"
          data-service-item-field="raw_title"
          data-service-item-index="${index}"
          value="${escapeAttr(item.raw_title || "")}"
          placeholder="${item.label ? "내용" : "찬양 제목"}"
          aria-label="Service item text"
        />
        ${item.song_id ? `<button class="icon-btn svc-song-link" type="button" data-open-song="${escapeAttr(item.song_id)}" title="Praise에서 열기" aria-label="Praise에서 열기"><i data-lucide="music"></i></button>` : ""}
      </div>
      <div class="svc-edit-actions">
        <button class="icon-btn" type="button" data-service-item-action="up" data-service-item-index="${index}" ${index === 0 ? "disabled" : ""} title="Move up" aria-label="Move up"><i data-lucide="arrow-up"></i></button>
        <button class="icon-btn" type="button" data-service-item-action="down" data-service-item-index="${index}" ${index === total - 1 ? "disabled" : ""} title="Move down" aria-label="Move down"><i data-lucide="arrow-down"></i></button>
        <button class="icon-btn" type="button" data-service-item-action="duplicate" data-service-item-index="${index}" title="Duplicate" aria-label="Duplicate"><i data-lucide="copy"></i></button>
        <button class="icon-btn danger" type="button" data-service-item-action="delete" data-service-item-index="${index}" title="Delete" aria-label="Delete"><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
}

function renderServiceDefaultEditorItem(item, index, total) {
  return `
    <article class="svc-edit-item svc-edit-item--default">
      <span class="svc-edit-order">${index + 1}</span>
      <input
        class="svc-edit-label"
        type="text"
        data-service-default-field="label"
        data-service-default-index="${index}"
        value="${escapeAttr(item.label || "")}"
        placeholder="구성"
        aria-label="Default service component label"
      />
      <div class="svc-edit-title-wrap">
        <input
          class="svc-edit-title"
          type="text"
          data-service-default-field="raw_title"
          data-service-default-index="${index}"
          value="${escapeAttr(item.raw_title || "")}"
          placeholder="매 예배에 적용할 내용"
          aria-label="Default service component text"
        />
      </div>
      <div class="svc-edit-actions">
        <button class="icon-btn" type="button" data-service-default-action="up" data-service-default-index="${index}" ${index === 0 ? "disabled" : ""} title="Move up" aria-label="Move up"><i data-lucide="arrow-up"></i></button>
        <button class="icon-btn" type="button" data-service-default-action="down" data-service-default-index="${index}" ${index === total - 1 ? "disabled" : ""} title="Move down" aria-label="Move down"><i data-lucide="arrow-down"></i></button>
        <button class="icon-btn" type="button" data-service-default-action="duplicate" data-service-default-index="${index}" title="Duplicate" aria-label="Duplicate"><i data-lucide="copy"></i></button>
        <button class="icon-btn danger" type="button" data-service-default-action="delete" data-service-default-index="${index}" title="Delete" aria-label="Delete"><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
}

function renderServiceDashboard() {
  if (!state.serviceTypes.length) {
    refs.detailPane.innerHTML = `
      <div class="empty-detail"><div class="empty-detail-inner">
        <p class="empty-verse">Ascribe to the Lord the glory due his name;<br>worship the Lord in the splendor of his holiness.</p>
        <span>PSALM 29:2</span>
      </div></div>`;
    return;
  }

  const services = getServiceDashboardServices();
  const q = normalizeSearchValue(state.search);
  refs.detailPane.innerHTML = `
    <div class="service-dashboard">
      <section class="service-dashboard-section">
        <div class="service-section-head">
          <h2 class="service-date-list-title">${q ? "Search Results" : "This Week"}</h2>
          <span class="service-search-count">${services.length} services</span>
        </div>
        ${services.length ? `<div class="service-date-grid service-date-grid--dashboard">
          ${services.map((service) => renderServiceDateCard(service, { showType: true })).join("")}
        </div>` : `<p class="service-no-results">예정된 예배가 없습니다.</p>`}
      </section>
      <section class="service-dashboard-section">
        <div class="service-section-head">
          <h2 class="service-date-list-title">Service Types</h2>
        </div>
        <div class="service-type-picker">
          ${getFilteredServiceTypes().map((t) => `
            <button class="service-type-card" type="button" data-select-service-type="${escapeAttr(t.id)}">
              <span>${escapeHtml(t.name)}</span>
              <small>${getFilteredServicesForType(t.id).length}</small>
            </button>`).join("")}
        </div>
      </section>
    </div>`;
  refreshIcons();
}

function renderServiceDateCard(service, options = {}) {
  const preview = serviceItemPreview(service.id);
  const note = (service.tags || []).join(", ");
  const praiseLead = serviceLeaderLabel(service);
  return `
    <button class="service-date-card" type="button" data-service-id="${escapeAttr(service.id)}">
      <span class="service-date-card-date">${escapeHtml(formatServiceDate(service, { compact: true }))}</span>
      ${options.showType ? `<span class="service-date-card-type">${escapeHtml(serviceTypeName(service.type_id))}</span>` : ""}
      ${praiseLead ? `<span class="service-date-card-leader">찬양 인도: ${escapeHtml(praiseLead)}</span>` : ""}
      ${note ? `<span class="service-date-card-note">${escapeHtml(note)}</span>` : ""}
      ${preview ? `<span class="service-date-card-preview">${escapeHtml(preview)}</span>` : ""}
    </button>`;
}

function formatServiceDate(service, options = {}) {
  const weekdays = ["일","월","화","수","목","금","토"];
  const start = new Date(`${service.date}T00:00:00`);
  const startText = options.compact
    ? `${start.getMonth() + 1}/${start.getDate()} ${weekdays[start.getDay()]}`
    : `${start.getMonth() + 1}월 ${start.getDate()}일 (${weekdays[start.getDay()]})`;
  if (!service.date_end) return startText;
  const end = new Date(`${service.date_end}T00:00:00`);
  const endText = options.compact
    ? `${end.getMonth() + 1}/${end.getDate()} ${weekdays[end.getDay()]}`
    : `${end.getMonth() + 1}월 ${end.getDate()}일 (${weekdays[end.getDay()]})`;
  return `${startText} - ${endText}`;
}

function serviceItemPreview(serviceId) {
  const items = getServiceItems(serviceId)
    .filter((item) => item.raw_title && item.raw_title !== "-")
    .slice(0, 3)
    .map((item) => item.raw_title);
  return items.join(" · ");
}

function splitHymnNo(raw) {
  const match = /^(통\s*\d+|\d+)\s+/.exec(raw || "");
  return match ? { no: match[1].replace(/\s+/, " "), title: raw.slice(match[0].length) } : { no: null, title: raw || "—" };
}

function formatServiceForCopy(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return "";
  const typeName = serviceTypeName(service.type_id);
  const tags = (service.tags || []).join("; ");
  const header = [`${typeName} ${formatServiceDate(service)}`, tags].filter(Boolean).join(" / ");
  const praiseLead = serviceLeaderLabel(service);
  const meta = praiseLead ? [`찬양 인도: ${praiseLead}`] : [];
  const lines = getServiceOutputItems(serviceId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => `${item.label ? `${item.label}/ ` : `${index + 1}. `}${item.raw_title || "-"}`);
  return [header, ...meta, "", ...lines].join("\n");
}

function copyService(serviceId) {
  const text = formatServiceForCopy(serviceId);
  if (!text) return;
  copyText(text);
}

function formatServicePptDraft(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return "";
  const typeName = serviceTypeName(service.type_id);
  const header = [typeName, formatServiceDate(service)].filter(Boolean).join("\n");
  const slides = getServiceOutputItems(serviceId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => {
      const label = item.label || `찬양 ${index + 1}`;
      return [label, item.raw_title || "-"].join("\n");
    });
  return [header, ...slides].join("\n\n---\n\n");
}

function copyServicePptDraft(serviceId) {
  const text = formatServicePptDraft(serviceId);
  if (!text) return;
  copyText(text);
}

async function createService() {
  if (!state.newServiceForm || !requireClient()) return;
  const { type_id, date, leader, tags } = state.newServiceForm;
  if (!date) { showToast("날짜를 입력해주세요.", "error"); return; }

  try {
    const payload = {
      type_id,
      date,
      leader: nullIfBlank(leader),
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };
    const { data, error } = await state.client
      .from("mindex_services")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    state.services.push(data);
    state.services = sortServicesByDate(state.services, "asc");
    state.serviceItems[data.id] = [];
    state.newServiceForm = null;
    state.selectedServiceId = data.id;
    state.selectedServiceTypeId = data.type_id;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    showToast("예배가 추가되었습니다.");
  } catch (e) {
    showToast(e.message || "예배 생성 실패.", "error");
  }
}

async function deleteService(serviceId) {
  if (!serviceId || !requireClient()) return;
  const svc = state.services.find((s) => s.id === serviceId);
  if (!svc) return;
  const label = `${serviceTypeName(svc.type_id)} ${formatServiceDate(svc)}`;
  if (!window.confirm(`"${label}" 예배를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  try {
    const { error: itemsErr } = await state.client
      .from("mindex_service_items")
      .delete()
      .eq("service_id", serviceId);
    if (itemsErr) throw itemsErr;

    const { error: svcErr } = await state.client
      .from("mindex_services")
      .delete()
      .eq("id", serviceId);
    if (svcErr) throw svcErr;

    state.services = state.services.filter((s) => s.id !== serviceId);
    delete state.serviceItems[serviceId];
    if (state.selectedServiceId === serviceId) {
      state.selectedServiceId = null;
      state.dirty.service = false;
    }
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    showToast("예배가 삭제되었습니다.");
  } catch (e) {
    showToast(e.message || "예배 삭제 실패.", "error");
  }
}

function selectService(id) {
  if (id !== state.selectedServiceId && !confirmDiscardServiceChanges()) return;
  state.selectedServiceId = id;
  const service = state.services.find((svc) => svc.id === id);
  if (service) state.selectedServiceTypeId = service.type_id;
  renderServiceDetail();
  renderServiceList();
  syncBrowserHistory();
  if (id) loadServiceItems(id);
}

// ─── end Service module ───────────────────────────────────────────────────────

window.Mindex = {
  normalizeTitle,
  normalizeForms,
  displayLabel,
  computePartNumberSuggestion,
  formatFullLyrics,
  formatScriptureForCopy,
  formatScriptureSlidesForCopy,
  formatFreeShowShowJson,
  formatSongXml,
  buildFreeShowShow,
};
