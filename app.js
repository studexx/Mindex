const MINDEX_CONSTANTS = window.MINDEX_APP_CONSTANTS || {};
const {
  PART_TYPES,
  STRUCTURAL_PART_TYPES,
  FORM_ADD_LABELS,
  PRAISE_TYPES,
  PROMOTED_SONG_METADATA_COLUMNS,
  META_SEPARATOR,
  LIST_INPUT_SEPARATOR,
  BIBLE_TEXT_SEARCH_PAGE_SIZE,
} = MINDEX_CONSTANTS;
const TABLE_COLUMN_SUPPORT_CACHE = new Map();
let presenterThumbClickTimer = null;
let songLoadPromise = null;
let songCatalogLoaded = false;
let backgroundSongLoadScheduled = false;

const { BIBLE_CHAPTER_COUNTS } = MINDEX_CONSTANTS;

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

const { STORAGE } = MINDEX_CONSTANTS;

const PRESENTER_CHANNEL = "mindex.presenter";
const PRESENTER_STORAGE_KEY = "mindex.presenter.state";
const PRESENTER_SIGNAL_KEY = "mindex.presenter.signal";
const PRESENTER_JUMP_MAX_DIGITS = 3;
const PRESENTER_OUTPUT_HEARTBEAT_INTERVAL_MS = 1000;
const PRESENTER_OUTPUT_HEARTBEAT_TTL_MS = 3000;
const PRESENTER_FULLSCREEN_RETRY_DELAYS_MS = [0, 80, 240, 600];
const PRESENTER_OUTPUT_ESCAPE_EXIT_MS = 1600;
const UI_DEFAULT_LOCALE = "ko";
const UI_FALLBACK_LOCALE = "en";
const UI_MESSAGES = {
  ko: {
    "presenter.controls": "프레젠터 컨트롤",
    "presenter.action.present": "SHOW",
    "presenter.action.detectDisplays": "화면 감지",
    "presenter.action.jump": "이동",
    "presenter.action.prev": "이전 슬라이드",
    "presenter.action.next": "다음 슬라이드",
    "presenter.action.jumpToSlide": "슬라이드로 이동",
    "presenter.action.showScripture": "성구 송출",
    "presenter.action.hideScripture": "성구 숨김",
    "presenter.action.loadPraise": "찬양 불러오기",
    "presenter.action.hidePraise": "찬양 숨김",
    "presenter.action.load": "불러오기",
    "presenter.action.send": "송출",
    "presenter.action.hide": "숨김",
    "presenter.action.help": "도움말",
    "presenter.option.auto": "자동",
    "presenter.aria.status": "프레젠터 상태: {status}",
    "presenter.aria.mode": "프레젠터 모드: {mode}",
    "presenter.aria.slideCount": "슬라이드 {current} / {count}",
    "presenter.aria.slideNumber": "슬라이드 번호",
    "presenter.aria.slideNav": "슬라이드 이동",
    "presenter.label.status": "상태",
    "presenter.label.slide": "슬라이드",
    "presenter.label.volume": "음량",
    "presenter.status.live": "송출 중",
    "presenter.status.otherLive": "다른 예배 송출",
    "presenter.status.ready": "준비",
    "presenter.status.preview": "미리보기",
    "presenter.mode.otherService": "다른 예배",
    "presenter.mode.blank": "빈 화면",
    "presenter.mode.scripture": "성구",
    "presenter.mode.praise": "찬양",
    "presenter.mode.slide": "{number}번",
    "presenter.mode.noSlides": "슬라이드 없음",
    "presenter.music.default": "음악",
    "presenter.music.play": "음악 재생",
    "presenter.music.pause": "음악 정지",
    "presenter.music.volume": "음악 볼륨",
    "presenter.scripture.placeholder": "성구 입력",
    "presenter.praise.placeholder": "찬양 입력",
    "presenter.help.title": "프레젠터 도움말",
  },
  en: {
    "presenter.controls": "Presenter controls",
    "presenter.action.present": "Present",
    "presenter.action.detectDisplays": "Detect displays",
    "presenter.action.jump": "Go",
    "presenter.action.prev": "Previous slide",
    "presenter.action.next": "Next slide",
    "presenter.action.jumpToSlide": "Jump to slide",
    "presenter.action.showScripture": "Show scripture",
    "presenter.action.hideScripture": "Hide scripture",
    "presenter.action.loadPraise": "Load song",
    "presenter.action.hidePraise": "Hide song",
    "presenter.action.load": "Load",
    "presenter.action.send": "Send",
    "presenter.action.hide": "Hide",
    "presenter.action.help": "Help",
    "presenter.option.auto": "Auto",
    "presenter.aria.status": "Presenter status: {status}",
    "presenter.aria.mode": "Presenter mode: {mode}",
    "presenter.aria.slideCount": "Slide {current} of {count}",
    "presenter.aria.slideNumber": "Slide number",
    "presenter.aria.slideNav": "Slide navigation",
    "presenter.label.status": "Status",
    "presenter.label.slide": "Slide",
    "presenter.label.volume": "Vol",
    "presenter.status.live": "Live",
    "presenter.status.otherLive": "Other live",
    "presenter.status.ready": "Ready",
    "presenter.status.preview": "Preview",
    "presenter.mode.otherService": "Other service",
    "presenter.mode.blank": "Blank",
    "presenter.mode.scripture": "Scripture",
    "presenter.mode.praise": "Song",
    "presenter.mode.slide": "Slide {number}",
    "presenter.mode.noSlides": "No slides",
    "presenter.music.default": "Music",
    "presenter.music.play": "Play music",
    "presenter.music.pause": "Pause music",
    "presenter.music.volume": "Music volume",
    "presenter.scripture.placeholder": "Scripture reference",
    "presenter.praise.placeholder": "Song title",
    "presenter.help.title": "Presenter help",
  },
};
let currentUiLocale = UI_DEFAULT_LOCALE;
let presenterMiniPreviewResizeObserver = null;

const SYSTEM_THEME_QUERY = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
const TITLE_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

const HANGUL_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const ACTIVITY_MODULE_ENABLED = false;
const CONTENT_MODULES = ["service", "scripture", "praise", "calendar", "references", "order-sheets"];
const ROUTE_MODULES = ["home", ...CONTENT_MODULES];
const SERVICE_FILTERS = ["all", "public", "ministry", "special"];
const HYMN_SCORE_MANIFEST_URL = "assets/hymn-scores/manifest.json";
const SERVICE_ELEMENT_LABELS = {
  blank: "빈 화면",
  video: "동영상",
  image: "이미지",
  score: "악보",
  praise: "찬양",
  scripture: "말씀",
  live_praise: "실시간 찬양",
  scripture_reading: "성경봉독",
  scripture_body: "성경 본문",
  plain_text: "일반 텍스트",
  title_person: "제목 / 담당자",
  body: "본문",
  activity: "Activity",
  template: "슬라이드 템플릿",
  file: "파일",
};
const PRESENTER_ELEMENT_TYPES = {
  BLANK: "blank",
  PLAIN_TEXT: "plain_text",
  TITLE_ASSIGNEE: "title_assignee",
  BODY_TEXT: "body_text",
  PRAISE: "praise",
  SCRIPTURE_READING: "scripture_reading",
  SCRIPTURE_TEXT: "scripture_text",
  IMAGE: "image",
  VIDEO: "video",
  FILE: "file",
  FREEFORM: "freeform",
};
const PRESENTER_SLIDE_LAYOUTS = {
  BLANK: "blank",
  CENTER_TEXT: "center_text",
  LOWER_BAR_TEXT: "lower_bar_text",
  MEDIA: "media",
  FILE: "file",
};
const ACTIVITY_GAME_TYPE_LABELS = {
  puzzle_hunt: "Puzzle Hunt",
  quiz: "Quiz",
  physical: "Physical",
};
const SERVICE_FUTURE_LOOKAHEAD_DAYS = 7;
const CALENDAR_MIN_DATE = "2025-11-30";
const {
  SUPABASE_PAGE_SIZE,
  UI_SCRIPTURE_PREFIX,
  UI_VERSE_SLOTS,
  LOADING_MESSAGE,
  CONNECTION_LIST_TITLE,
  DB_CONNECTION_EMPTY_VERSE,
  DB_CONNECTION_EMPTY_MESSAGE,
} = MINDEX_CONSTANTS;
const CALENDAR_DETAIL_TABS = ["departments", "lectionary"];
const CALENDAR_DEPARTMENT_FIELDS = [
  ["nursery_prayer", "유치부", "기도자"],
  ["children_prayer", "어린이부", "기도자"],
  ["youth_prayer", "청소년부", "기도자"],
  ["youth_offering_prayer", "청소년부", "봉헌기도자"],
  ["preacher", "청소년부", "설교자"],
];
const CALENDAR_LECTIONARY_FIELDS = [
  ["liturgical_color", "색깔", ""],
  ["first_reading", "첫째 읽기", ""],
  ["psalm", "시편", ""],
  ["second_reading", "둘째 읽기", ""],
  ["gospel", "복음서", ""],
];
const CALENDAR_LECTIONARY_FOOTNOTE = [
  "* 부활절 기간 동안 사도행전을 읽는 것으로 구약성경의 교훈을 대체할 수 있습니다.",
  "오순절 날에 민수기 구절이 첫째 읽기로 선택되면, 사도행전 구절이 둘째 읽기로 사용됩니다.",
];
const { LINK_CONFIG_KEYS, LINK_ROUTE_KEYS } = MINDEX_CONSTANTS;

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} type_id
 * @property {string} date
 * @property {string=} title
 * @property {string=} leader
 * @property {string=} status
 * @property {string[]=} tags
 */

/**
 * @typedef {Object} ServiceItem
 * @property {string} id
 * @property {string} service_id
 * @property {string=} element_type semantic output/input kind
 * @property {string=} component_type compatibility output/input kind
 * @property {string} title
 * @property {number} sort_order
 * @property {string=} song_id
 * @property {string=} version_id
 * @property {string=} scripture_id
 * @property {string=} assignee
 * @property {string=} memo
 */

/**
 * @typedef {Object} PresenterSlide
 * @property {string} id
 * @property {string=} type compatibility render class
 * @property {string=} elementType
 * @property {string=} layout
 * @property {string} title
 * @property {string[]=} lines
 * @property {string=} label
 * @property {string=} background
 */

/**
 * @typedef {Object} ReferenceLink
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} group_name
 * @property {number} sort_order
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} ActivityEvent
 * @property {string} id
 * @property {string} title
 * @property {string=} date
 * @property {string=} status
 * @property {string=} location
 * @property {string=} memo
 */

/**
 * @typedef {Object} ActivityGame
 * @property {string} id
 * @property {string} event_id
 * @property {string} title
 * @property {"puzzle_hunt"|"quiz"|"physical"} game_type
 * @property {number} sort_order
 * @property {string=} status
 * @property {string=} owner
 * @property {string=} location
 */

/**
 * @typedef {Object} ActivityTeam
 * @property {string} id
 * @property {string} event_id
 * @property {string} name
 * @property {string} color
 * @property {number} score
 * @property {number} sort_order
 */

/**
 * @typedef {Object} ActivityScoreEvent
 * @property {string} id
 * @property {string} event_id
 * @property {string=} game_id
 * @property {string} team_id
 * @property {number} points
 * @property {string=} reason
 * @property {string=} created_at
 */

const state = {
  module: "home",
  client: null,
  config: { url: "", anonKey: "", authRequired: false },
  auth: {
    loading: false,
    session: null,
    user: null,
    email: "",
    message: "",
    error: "",
    subscription: null,
  },
  songs: [],
  scriptureBooks: [],
  scriptures: [],
  bibleTranslations: [],
  bibleBookVerses: [],
  bibleVerseCache: new Map(),
  bibleTextSearchQuery: "",
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
  orderSheetDrafts: {},
  worshipSections: [],
  worshipElements: [],
  worshipTemplates: [],
  worshipTemplateItems: [],
  worshipPresenterSlides: {},
  hymnScoreManifest: {},
  hymnScoreManifestLoaded: false,
  activityEvents: [],
  activityGames: [],
  activityTeams: [],
  activityScoreEvents: [],
  activityLoaded: false,
  activityError: "",
  selectedActivityEventId: null,
  referenceLinks: [],
  referenceLinksLoaded: false,
  referenceError: "",
  referenceGroupSupported: false,
  songRelationsSupported: false,
  editingReferenceId: null,
  editingReferenceGroupKey: null,
  uiVerses: {
    home: [],
    activities: [],
    praise: [],
    scripture: [],
  },
  songVersionTablesSupported: false,
  songVersionPraiseTypesSupported: false,
  dirtyServiceTypeIds: new Set(),
  serviceItemAssigneeSupported: false,
  serviceItemVersionSupported: false,
  serviceItemMemoSupported: false,
  serviceTitleSupported: false,
  homeVerseIndex: Math.floor(Math.random() * 3),
  selectedServiceTypeId: null,
  selectedServiceId: null,
  selectedServiceItemIndex: null,
  serviceFilter: "all",
  serviceError: "",
  newServiceForm: null,
  presenter: {
    channel: null,
    outputWindow: null,
    outputWindowMonitor: null,
    outputConnectedAt: 0,
    outputClientId: "",
    serviceId: null,
    slides: [],
    index: 0,
    safetyBlank: false,
    jumpDraft: "",
    exitArmedAt: 0,
    screens: [],
    selectedScreenId: null,
    liveScripture: {
      reference: "",
      draft: "",
      active: false,
      slide: null,
    },
    livePraise: {
      query: "",
      draft: "",
      active: false,
      slides: [],
      index: 0,
      songId: "",
      versionId: "",
    },
  },
  serviceMusic: {
    audio: null,
    objectUrl: "",
    fileName: "",
    playing: false,
    volumeLevel: 3,
  },
  calendarData: [],
  calendarLoaded: false,
  calendarLoading: false,
  calendarError: "",
  calendarScrollTargetMonth: null,
  calendarAutoScrolledMonth: null,
  calendarDetailTab: "departments",
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
    references: false,
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

async function init() {
  if (isPresenterOutputRoute()) {
    initPresenterOutput();
    return;
  }
  cacheRefs();
  applyTheme(readTheme());
  const linkParams = readLinkParams();
  state.config = readConfig(linkParams);
  rememberConfig(state.config);
  readUiState();
  applyLinkState(linkParams);
  bindStaticEvents();
  bindPresenterChannel();
  connectClient();
  render();
  syncBrowserHistory({ replace: true });

  if (state.client) {
    await initializeAuth();
    if (canUseClientData()) loadInitialData();
  } else if (state.connectionError) {
    showToast(state.connectionError, "error");
  }
}

function loadInitialData() {
  if (state.module === "praise" || state.selectedSongId) {
    loadSongs();
  } else {
    scheduleBackgroundSongLoad();
  }
  loadScriptureBooks({ silent: true });
  loadScriptures({ silent: true });
  loadBibleTranslations({ silent: true });
  loadHymnScoreManifest({ silent: true });
  loadServiceData({ silent: true });
  loadReferenceLinks({ silent: true });
  if (ACTIVITY_MODULE_ENABLED && state.module === "activities") loadActivities({ silent: true });
  if (state.module === "calendar") loadCalendarData({ silent: true });
}

async function loadHymnScoreManifest({ silent = false } = {}) {
  if (state.hymnScoreManifestLoaded) return;
  try {
    const response = await fetch(HYMN_SCORE_MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.hymnScoreManifest = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    state.hymnScoreManifestLoaded = true;
    if (state.module === "service") render();
  } catch (err) {
    state.hymnScoreManifest = {};
    state.hymnScoreManifestLoaded = true;
    if (!silent) console.warn("[Presenter] hymn score manifest unavailable:", err);
  }
}

function cacheRefs() {
  refs.brandHome = document.getElementById("brandHome");
  refs.brandNameHome = document.getElementById("brandNameHome");
  refs.sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
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
  refs.brandHome?.addEventListener("click", goHome);
  refs.brandNameHome?.addEventListener("click", goHome);
  refs.sidebarToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    syncSidebarCollapsedState();
  });
  refs.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => switchModule(button.dataset.module));
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
    if (state.module === "home") renderDetail();
    if (state.module === "scripture") renderDetail();
    if (state.module === "service") renderServiceDetail();
    if (state.module === "activities") renderActivitiesDetail();
    if (state.module === "order-sheets") renderOrderSheetsDetail();
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
      state.selectedServiceItemIndex = null;
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
  refs.songList.addEventListener("input", handleDetailInput);
  refs.songList.addEventListener("change", handleDetailChange);
  refs.detailPane.addEventListener("dblclick", handleDetailDoubleClick);

  refs.songList.addEventListener("click", async (event) => {
    const homeModule = event.target.closest("[data-home-module]");
    if (homeModule) {
      await switchModule(homeModule.dataset.homeModule);
      return;
    }

    const referenceItem = event.target.closest("[data-reference-id]");
    if (referenceItem) {
      const link = getReferenceLinks().find((item) => item.id === referenceItem.dataset.referenceId);
      if (link?.url) window.open(link.url, "_blank", "noopener,noreferrer");
      return;
    }

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

    const globalActivityItem = event.target.closest("[data-global-activity-event-id]");
    if (globalActivityItem) {
      await openGlobalActivityResult(globalActivityItem.dataset.globalActivityEventId);
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
      state.selectedServiceTypeId = worshipAppServiceTypeId(serviceTypeItem.dataset.serviceTypeId);
      state.selectedServiceId = null;
      state.selectedServiceItemIndex = null;
      renderServiceList();
      renderServiceDetail();
      syncBrowserHistory();
      return;
    }

    const serviceListItem = event.target.closest("[data-service-list]");
    if (serviceListItem) {
      if (!confirmDiscardServiceChanges()) return;
      state.selectedServiceTypeId = SERVICE_LIST_PANEL_ID;
      state.selectedServiceId = null;
      state.selectedServiceItemIndex = null;
      state.newServiceForm = null;
      renderServiceList();
      renderServiceDetail();
      syncBrowserHistory();
      return;
    }

    const serviceTemplatesItem = event.target.closest("[data-service-templates]");
    if (serviceTemplatesItem) {
      if (!confirmDiscardServiceChanges()) return;
      state.selectedServiceTypeId = SERVICE_TEMPLATES_PANEL_ID;
      state.selectedServiceId = null;
      state.selectedServiceItemIndex = null;
      state.newServiceForm = null;
      renderServiceList();
      renderServiceDetail();
      syncBrowserHistory();
      return;
    }

    const serviceOutlineItem = event.target.closest("[data-service-outline-slide]");
    if (serviceOutlineItem) {
      const itemIndex = Number(serviceOutlineItem.dataset.serviceOutlineItemIndex);
      if (Number.isFinite(itemIndex) && itemIndex >= 0) state.selectedServiceItemIndex = itemIndex;
      const slideIndex = Number(serviceOutlineItem.dataset.serviceOutlineSlide);
      const serviceId = serviceOutlineItem.dataset.serviceOutlineService || state.selectedServiceId;
      if (Number.isFinite(slideIndex) && slideIndex >= 0) runPresenterAction("jump", serviceId, { index: slideIndex });
      renderServiceList();
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
      renderServiceList();
      return;
    }

    const serviceItem = event.target.closest("[data-service-id]");
    if (serviceItem) {
      selectService(serviceItem.dataset.serviceId);
      return;
    }

    const activityEventItem = event.target.closest("[data-activity-event-id]");
    if (activityEventItem) {
      selectActivityEvent(activityEventItem.dataset.activityEventId);
      return;
    }
  });

  refs.detailPane.addEventListener("click", handleDetailClick);
  refs.detailPane.addEventListener("keydown", handleDetailKeydown);
  refs.detailPane.addEventListener("input", handleDetailInput);
  refs.detailPane.addEventListener("change", handleDetailChange);
  refs.detailPane.addEventListener("submit", handleDetailSubmit);
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
    const oldVal = String(cell.dataset.initialValue || "").replace(/\n/g, " ").trim();
    cell.textContent = newVal;
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
  refs.detailPane.addEventListener("paste", (e) => {
    const cell = e.target.closest(".cal-cell");
    if (!cell) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });
  window.addEventListener("pointerup", handleWindowPointerUp);
  window.addEventListener("mousedown", handleMouseSideButtonNavigation, { capture: true });
  window.addEventListener("popstate", handleBrowserHistoryPop);

  SYSTEM_THEME_QUERY?.addEventListener("change", () => {
    if (!safeStorageGet("local", STORAGE.theme)) applyTheme(readTheme());
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

    if (handlePresenterShortcut(event)) return;

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

function handleDetailDoubleClick(event) {
  const slideThumb = event.target.closest("[data-presenter-index][data-service-id]");
  if (!slideThumb || !slideThumb.classList.contains("svc-slide-thumb")) return;
  event.preventDefault();
  clearPresenterThumbClickTimer();
  const serviceId = slideThumb.dataset.serviceId;
  const index = Number(slideThumb.dataset.presenterIndex);
  startPresenterAtSlide(serviceId, index);
}

function clearPresenterThumbClickTimer() {
  if (!presenterThumbClickTimer) return;
  window.clearTimeout(presenterThumbClickTimer);
  presenterThumbClickTimer = null;
}

async function handleSearchKeydown(event) {
  if (event.key !== "Enter") return;

  const scriptureShortcut = await getScriptureSearchShortcut(state.search);
  if (scriptureShortcut && (state.module !== "scripture" || scriptureShortcut.type !== "text")) {
    event.preventDefault();
    await runScriptureSearchShortcut(scriptureShortcut);
    return;
  }

  if (state.module === "home") {
    const results = getGlobalSearchResults();
    const firstSong = results.praise[0];
    const firstScripture = results.scripture[0];
    const firstService = results.service[0];
    const firstActivity = results.activities[0];
    event.preventDefault();
    if (firstSong) {
      await openGlobalSongResult(firstSong.id);
      return;
    }
    if (firstScripture?.kind === "text") {
      await openGlobalBibleTextResult();
      return;
    }
    if (firstScripture?.book) {
      await openGlobalBookResult(firstScripture.book.code, {
        chapter: firstScripture.chapter,
        verse: firstScripture.verse,
      });
      return;
    }
    if (firstService) {
      await openGlobalServiceResult(firstService.id);
      return;
    }
    if (firstActivity) {
      await openGlobalActivityResult(firstActivity.id);
    }
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
  if (state.module !== "praise" && state.module !== "scripture") return;

  const down = event.key === "ArrowDown";

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
  if (state.module !== "praise") return false;
  return navigatePraiseVersion(delta);
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

function safeStorageArea(scope) {
  try {
    return scope === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function safeStorageGet(scope, key, fallback = "") {
  try {
    return safeStorageArea(scope)?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(scope, key, value) {
  try {
    safeStorageArea(scope)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeStorageRemove(scope, key) {
  try {
    safeStorageArea(scope)?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function uiText(key, params = {}) {
  const messages = UI_MESSAGES[currentUiLocale] || UI_MESSAGES[UI_DEFAULT_LOCALE] || {};
  const fallback = UI_MESSAGES[UI_FALLBACK_LOCALE] || {};
  const template = messages[key] || fallback[key] || key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : ""
  );
}

function setUiLocale(locale) {
  if (!UI_MESSAGES[locale]) return false;
  currentUiLocale = locale;
  return true;
}

function readTheme() {
  const saved = safeStorageGet("local", STORAGE.theme);
  if (saved === "dark" || saved === "light") return saved;
  return SYSTEM_THEME_QUERY?.matches ? "dark" : "light";
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  if (!refs.themeBtn) return;
  refs.themeBtn.setAttribute("aria-label", theme === "dark" ? "Use light mode" : "Use dark mode");
  refs.themeBtn.innerHTML = `<i data-lucide="${theme === "dark" ? "sun" : "moon"}"></i>`;
  refreshIcons();
  resizeFormTextareas();
}

function toggleTheme() {
  const next = state.theme === "dark" ? "light" : "dark";
  safeStorageSet("local", STORAGE.theme, next);
  applyTheme(next);
}

function readUiState() {
  const moduleName = safeStorageGet("session", STORAGE.module);
  const praiseFilter = safeStorageGet("session", STORAGE.praiseFilter);
  const scriptureFilter = safeStorageGet("session", STORAGE.scriptureFilter);
  const serviceFilter = safeStorageGet("session", STORAGE.serviceFilter);
  const bibleChapter = Number(safeStorageGet("session", STORAGE.bibleChapter));
  const bibleCopyReference = safeStorageGet("session", STORAGE.bibleCopyReference);

  if (ROUTE_MODULES.includes(moduleName)) state.module = moduleName;
  if (["all", "hymns", "ccm", "children"].includes(praiseFilter)) state.praiseFilter = praiseFilter;
  if (["all", "old", "new"].includes(scriptureFilter)) state.scriptureFilter = scriptureFilter;
  if (SERVICE_FILTERS.includes(serviceFilter)) state.serviceFilter = serviceFilter;

  state.selectedSongId = safeStorageGet("session", STORAGE.selectedSongId) || null;
  state.selectedVersionId = safeStorageGet("session", STORAGE.selectedVersionId) || null;
  state.selectedScriptureId = safeStorageGet("session", STORAGE.selectedScriptureId) || null;
  state.selectedBookCode = safeStorageGet("session", STORAGE.selectedBookCode) || null;
  state.selectedBibleTranslationId = safeStorageGet("session", STORAGE.bibleTranslationId) || null;
  state.selectedBibleChapter = Number.isFinite(bibleChapter) && bibleChapter > 0 ? bibleChapter : 1;
  state.bibleCopyReference = bibleCopyReference !== "false";
}

function persistUiState() {
  safeStorageSet("session", STORAGE.module, state.module);
  safeStorageSet("session", STORAGE.praiseFilter, state.praiseFilter);
  safeStorageSet("session", STORAGE.scriptureFilter, state.scriptureFilter);
  safeStorageSet("session", STORAGE.serviceFilter, state.serviceFilter);
  writeStorageValue(STORAGE.selectedSongId, state.selectedSongId);
  writeStorageValue(STORAGE.selectedVersionId, state.selectedVersionId);
  writeStorageValue(STORAGE.selectedScriptureId, state.selectedScriptureId);
  writeStorageValue(STORAGE.selectedBookCode, state.selectedBookCode);
  writeStorageValue(STORAGE.bibleTranslationId, state.selectedBibleTranslationId);
  writeStorageValue(STORAGE.bibleChapter, state.selectedBibleChapter > 0 ? String(state.selectedBibleChapter) : "");
  safeStorageSet("session", STORAGE.bibleCopyReference, String(state.bibleCopyReference));
}

function writeStorageValue(key, value) {
  if (value) safeStorageSet("session", key, value);
  else safeStorageRemove("session", key);
}

function clearDirtyState() {
  state.dirty.song = false;
  state.dirty.forms = false;
  state.dirty.scripture = false;
  state.dirty.service = false;
  state.dirty.references = false;
  state.dirtyServiceTypeIds.clear();
}

function getDirtyModules() {
  return {
    praise: state.dirty.song || state.dirty.forms,
    scripture: state.dirty.scripture,
    service: state.dirty.service,
    references: state.dirty.references,
  };
}

async function reloadDiscardedChanges(dirtyModules) {
  if (!state.client) return;
  const reloads = [];
  if (dirtyModules.praise) reloads.push(loadSongs());
  if (dirtyModules.scripture) reloads.push(loadScriptures({ silent: true }));
  if (dirtyModules.service) reloads.push(loadServiceData({ silent: true }));
  if (dirtyModules.references) reloads.push(loadReferenceLinks({ silent: true }));
  await Promise.all(reloads);
}

function resetHomeState() {
  saveCurrentListScroll();
  state.module = "home";
  state.search = "";
  state.praiseFilter = "all";
  state.scriptureFilter = "all";
  state.serviceFilter = "all";
  state.selectedSongId = null;
  state.selectedVersionId = null;
  state.selectedScriptureId = null;
  state.selectedBookCode = null;
  state.selectedBibleChapter = 1;
  state.selectedBibleVerse = null;
  state.selectedBibleVerses = [];
  state.lastSelectedBibleVerse = null;
  state.bibleDragSelection = null;
  state.suppressBibleVerseClick = false;
  state.selectedServiceTypeId = null;
  state.selectedServiceId = null;
  state.newServiceForm = null;
  state.metadataPopupOpen = false;
  state.forms = [];
  state.listScroll[getListScrollKey()] = 0;
  refs.searchInput.value = "";
  clearBibleTextSearch();
  clearDirtyState();
  persistUiState();
}

async function goHome() {
  if (!(await confirmSaveBeforeLeaving())) return;
  const dirtyModules = getDirtyModules();
  resetHomeState();
  render();
  if (refs.songList) refs.songList.scrollTop = 0;
  syncBrowserHistory();
  await reloadDiscardedChanges(dirtyModules);
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
  const targetUrl = buildMindexLink(snapshot);
  const sameSnapshot = current && JSON.stringify(current) === JSON.stringify(snapshot);
  if (sameSnapshot && window.location.href === targetUrl) return;
  history[replace || sameSnapshot ? "replaceState" : "pushState"]({ mindex: snapshot }, "", targetUrl);
}

async function handleBrowserHistoryPop(event) {
  const snapshot = event.state?.mindex || linkStateFromParams(readLinkParams());
  if (!snapshot) return;
  if (!(await confirmSaveBeforeLeaving())) {
    syncBrowserHistory({ replace: true });
    return;
  }
  await applyBrowserHistorySnapshot(snapshot);
}

async function applyBrowserHistorySnapshot(snapshot) {
  state.applyingBrowserHistory = true;
  try {
    state.module = ROUTE_MODULES.includes(snapshot.module) ? snapshot.module : "home";
    state.search = snapshot.search || "";
    refs.searchInput.value = state.search;
    if (["all", "hymns", "ccm", "children"].includes(snapshot.praiseFilter)) state.praiseFilter = snapshot.praiseFilter;
    if (["all", "old", "new"].includes(snapshot.scriptureFilter)) state.scriptureFilter = snapshot.scriptureFilter;
    if (SERVICE_FILTERS.includes(snapshot.serviceFilter)) state.serviceFilter = snapshot.serviceFilter;
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
    state.selectedServiceItemIndex = null;
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

function readConfig(params = readLinkParams()) {
  const injected = window.MINDEX_SUPABASE || {};
  const config = {
    url:
      params.get("supabaseUrl") ||
      params.get("supabase_url") ||
      params.get("url") ||
      injected.url ||
      safeStorageGet("local", STORAGE.url) ||
      "",
    anonKey:
      params.get("supabaseAnonKey") ||
      params.get("supabase_anon_key") ||
      params.get("anonKey") ||
      params.get("key") ||
      injected.anonKey ||
      injected.anon_key ||
      safeStorageGet("local", STORAGE.key) ||
      "",
    authRequired:
      params.get("authRequired") ||
      params.get("auth_required") ||
      params.get("auth") ||
      injected.authRequired ||
      injected.auth_required ||
      false,
  };
  return sanitizeSupabaseConfig(config);
}

function sanitizeSupabaseConfig(config = {}) {
  const url = String(config.url || "").trim();
  const anonKey = String(config.anonKey || "").trim();
  return {
    url: isPlaceholderSupabaseValue(url) ? "" : url,
    anonKey: isPlaceholderSupabaseValue(anonKey) ? "" : anonKey,
    authRequired: normalizeBooleanFlag(config.authRequired),
  };
}

function normalizeBooleanFlag(value) {
  if (value === true) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "required", "auth", "login"].includes(normalized);
}

function isPlaceholderSupabaseValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return [
    "anon_key",
    "anon-key",
    "<anon_key>",
    "<anon-key>",
    "<anon key>",
    "supabase_anon_key",
    "<supabase_anon_key>",
    "project_url",
    "<project_url>",
    "<project-url>",
  ].includes(normalized);
}

function readLinkParams() {
  const params = new URLSearchParams(window.location.search);
  readHashParams().forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

function readHashParams() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return new URLSearchParams();
  const queryStart = hash.indexOf("?");
  const hashQuery = queryStart >= 0 ? hash.slice(queryStart + 1) : hash;
  if (!hashQuery.includes("=")) return new URLSearchParams();
  return new URLSearchParams(hashQuery);
}

function firstParam(params, keys) {
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null && value !== "") return value;
  }
  return "";
}

function linkStateFromParams(params) {
  const snapshot = {};
  const moduleName = firstParam(params, ["module"]);
  if (ROUTE_MODULES.includes(moduleName)) snapshot.module = moduleName;
  const search = firstParam(params, ["search"]);
  if (search) snapshot.search = search;

  const praiseFilter = firstParam(params, ["praiseFilter"]);
  if (["all", "hymns", "ccm", "children"].includes(praiseFilter)) snapshot.praiseFilter = praiseFilter;
  const scriptureFilter = firstParam(params, ["scriptureFilter"]);
  if (["all", "old", "new"].includes(scriptureFilter)) snapshot.scriptureFilter = scriptureFilter;
  const serviceFilter = firstParam(params, ["serviceFilter"]);
  if (SERVICE_FILTERS.includes(serviceFilter)) snapshot.serviceFilter = serviceFilter;

  snapshot.selectedSongId = firstParam(params, ["songId", "selectedSongId"]) || undefined;
  snapshot.selectedVersionId = firstParam(params, ["versionId", "selectedVersionId"]) || undefined;
  snapshot.selectedScriptureId = firstParam(params, ["scriptureId", "selectedScriptureId"]) || undefined;
  snapshot.selectedBookCode = firstParam(params, ["book", "selectedBookCode"]) || undefined;
  snapshot.selectedBibleTranslationId = firstParam(params, ["translation", "selectedBibleTranslationId"]) || undefined;
  snapshot.selectedServiceTypeId = firstParam(params, ["serviceType", "selectedServiceTypeId"]) || undefined;
  snapshot.selectedServiceId = firstParam(params, ["service", "selectedServiceId"]) || undefined;
  snapshot.bibleTextSearchQuery = firstParam(params, ["bibleSearch", "bibleTextSearchQuery"]) || undefined;

  const chapter = Number(firstParam(params, ["chapter", "selectedBibleChapter"]));
  if (Number.isFinite(chapter) && chapter > 0) snapshot.selectedBibleChapter = chapter;
  const verse = Number(firstParam(params, ["verse", "selectedBibleVerse"]));
  if (Number.isFinite(verse) && verse > 0) snapshot.selectedBibleVerse = verse;
  const biblePage = Number(firstParam(params, ["biblePage", "bibleTextSearchPage"]));
  if (Number.isFinite(biblePage) && biblePage >= 0) snapshot.bibleTextSearchPage = biblePage;

  return Object.keys(snapshot).length ? snapshot : null;
}

function applyLinkState(params) {
  const snapshot = linkStateFromParams(params);
  if (!snapshot) return;
  if (ROUTE_MODULES.includes(snapshot.module)) state.module = snapshot.module;
  if (typeof snapshot.search === "string") state.search = snapshot.search;
  if (snapshot.praiseFilter) state.praiseFilter = snapshot.praiseFilter;
  if (snapshot.scriptureFilter) state.scriptureFilter = snapshot.scriptureFilter;
  if (snapshot.serviceFilter) state.serviceFilter = snapshot.serviceFilter;
  state.selectedSongId = snapshot.selectedSongId || state.selectedSongId;
  state.selectedVersionId = snapshot.selectedVersionId || state.selectedVersionId;
  state.selectedScriptureId = snapshot.selectedScriptureId || state.selectedScriptureId;
  state.selectedBookCode = snapshot.selectedBookCode || state.selectedBookCode;
  state.selectedBibleTranslationId = snapshot.selectedBibleTranslationId || state.selectedBibleTranslationId;
  state.selectedBibleChapter = snapshot.selectedBibleChapter || state.selectedBibleChapter;
  state.selectedBibleVerse = snapshot.selectedBibleVerse || state.selectedBibleVerse;
  state.selectedBibleVerses = state.selectedBibleVerse ? [state.selectedBibleVerse] : [];
  state.lastSelectedBibleVerse = state.selectedBibleVerse || null;
  state.selectedServiceTypeId = snapshot.selectedServiceTypeId || state.selectedServiceTypeId;
  state.selectedServiceId = snapshot.selectedServiceId || state.selectedServiceId;
  state.selectedServiceItemIndex = null;
  state.bibleTextSearchQuery = snapshot.bibleTextSearchQuery || state.bibleTextSearchQuery;
  state.bibleTextSearchPage = Number.isFinite(snapshot.bibleTextSearchPage) ? snapshot.bibleTextSearchPage : state.bibleTextSearchPage;
  if (refs.searchInput) refs.searchInput.value = state.search;
  persistUiState();
}

function buildMindexLink(snapshot = currentBrowserHistorySnapshot()) {
  const url = new URL(window.location.href);
  for (const key of [...LINK_CONFIG_KEYS, ...LINK_ROUTE_KEYS]) {
    url.searchParams.delete(key);
  }
  url.searchParams.delete("mindex-output");
  url.searchParams.delete("output");

  const params = new URLSearchParams();
  if (state.config.url) params.set("supabaseUrl", state.config.url);
  if (state.config.anonKey) params.set("supabaseAnonKey", state.config.anonKey);
  if (state.config.authRequired) params.set("auth", "required");
  appendRouteParams(params, snapshot);
  url.hash = params.toString();
  return url.toString();
}

function appendRouteParams(params, snapshot) {
  if (!snapshot) return;
  if (snapshot.module && snapshot.module !== "home") params.set("module", snapshot.module);
  if (snapshot.search) params.set("search", snapshot.search);
  if (snapshot.module === "praise" && snapshot.praiseFilter && snapshot.praiseFilter !== "all") params.set("praiseFilter", snapshot.praiseFilter);
  if (snapshot.module === "scripture" && snapshot.scriptureFilter && snapshot.scriptureFilter !== "all") params.set("scriptureFilter", snapshot.scriptureFilter);
  if (snapshot.module === "service" && snapshot.serviceFilter && snapshot.serviceFilter !== "all") params.set("serviceFilter", snapshot.serviceFilter);
  if (snapshot.selectedSongId) params.set("songId", snapshot.selectedSongId);
  if (snapshot.selectedVersionId) params.set("versionId", snapshot.selectedVersionId);
  if (snapshot.selectedScriptureId) params.set("scriptureId", snapshot.selectedScriptureId);
  if (snapshot.selectedBookCode) params.set("book", snapshot.selectedBookCode);
  if (snapshot.selectedBibleTranslationId) params.set("translation", snapshot.selectedBibleTranslationId);
  if (snapshot.selectedBibleChapter > 1) params.set("chapter", String(snapshot.selectedBibleChapter));
  if (snapshot.selectedBibleVerse) params.set("verse", String(snapshot.selectedBibleVerse));
  if (snapshot.selectedServiceTypeId) params.set("serviceType", snapshot.selectedServiceTypeId);
  if (snapshot.selectedServiceId) params.set("service", snapshot.selectedServiceId);
  if (snapshot.bibleTextSearchQuery) params.set("bibleSearch", snapshot.bibleTextSearchQuery);
  if (snapshot.bibleTextSearchPage > 0) params.set("biblePage", String(snapshot.bibleTextSearchPage));
}

function rememberConfig(config) {
  if (!config.url || !config.anonKey) return;
  safeStorageSet("local", STORAGE.url, config.url);
  safeStorageSet("local", STORAGE.key, config.anonKey);
}

function connectClient() {
  state.connectionError = "";
  if (!state.config.url || !state.config.anonKey) {
    state.client = null;
    state.connectionError = DB_CONNECTION_EMPTY_MESSAGE;
    return;
  }

  if (!window.supabase?.createClient) {
    state.client = null;
    state.connectionError = "Supabase library did not load.";
    return;
  }

  try {
    state.client = window.supabase.createClient(state.config.url, state.config.anonKey, {
      auth: {
        persistSession: state.config.authRequired,
        autoRefreshToken: state.config.authRequired,
        detectSessionInUrl: state.config.authRequired,
      },
      global: { headers: { "X-Client-Info": "mindex-prototype" } },
    });
  } catch (error) {
    state.client = null;
    state.connectionError = error.message || "Supabase connection failed.";
  }
}

function isAuthRequired() {
  return Boolean(state.config.authRequired);
}

function canUseClientData() {
  return Boolean(state.client) && (!isAuthRequired() || Boolean(state.auth.session));
}

async function initializeAuth() {
  if (!isAuthRequired() || !state.client?.auth) return;
  state.auth.loading = true;
  state.auth.error = "";
  render();
  try {
    const { data, error } = await state.client.auth.getSession();
    if (error) throw error;
    applyAuthSession(data?.session || null);
    state.auth.subscription?.unsubscribe?.();
    const { data: subscriptionData } = state.client.auth.onAuthStateChange((_event, session) => {
      const wasSignedOut = !state.auth.session;
      applyAuthSession(session);
      render();
      if (session && wasSignedOut) loadInitialData();
    });
    state.auth.subscription = subscriptionData?.subscription || null;
  } catch (error) {
    state.auth.error = error.message || "Could not check sign-in.";
  } finally {
    state.auth.loading = false;
    render();
  }
}

function applyAuthSession(session) {
  state.auth.session = session || null;
  state.auth.user = session?.user || null;
  state.auth.error = "";
}

async function requestAdminSignIn(email) {
  if (!state.client?.auth) return;
  state.auth.email = String(email || "").trim();
  state.auth.message = "";
  state.auth.error = "";
  if (!state.auth.email) {
    state.auth.error = "Email is required.";
    render();
    return;
  }
  state.auth.loading = true;
  render();
  try {
    const { error } = await state.client.auth.signInWithOtp({
      email: state.auth.email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) throw error;
    state.auth.message = "Check your email for the sign-in link.";
  } catch (error) {
    state.auth.error = error.message || "Sign-in failed.";
  } finally {
    state.auth.loading = false;
    render();
  }
}

async function signOutAdmin() {
  if (!state.client?.auth) return;
  state.auth.loading = true;
  render();
  try {
    const { error } = await state.client.auth.signOut();
    if (error) throw error;
    applyAuthSession(null);
  } catch (error) {
    state.auth.error = error.message || "Sign-out failed.";
  } finally {
    state.auth.loading = false;
    render();
  }
}

function authRedirectUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  const params = new URLSearchParams();
  if (state.config.url) params.set("supabaseUrl", state.config.url);
  if (state.config.anonKey) params.set("supabaseAnonKey", state.config.anonKey);
  params.set("auth", "required");
  appendRouteParams(params, currentBrowserHistorySnapshot());
  url.hash = params.toString();
  return url.toString();
}

async function switchModule(moduleName, options = {}) {
  if (!CONTENT_MODULES.includes(moduleName)) return;
  if (moduleName === state.module) return;
  if (!(await confirmSaveBeforeLeaving())) return;

  const clearSearch = options.clearSearch !== false;
  const syncHistory = options.syncHistory !== false;
  saveCurrentListScroll();
  state.module = moduleName;
  if (moduleName === "calendar") {
    state.calendarScrollTargetMonth = toLocalDateStr(new Date()).slice(0, 7);
    state.calendarAutoScrolledMonth = null;
  }
  if (clearSearch) {
    state.search = "";
    refs.searchInput.value = "";
    clearBibleTextSearch();
  }
  clearDirtyState();
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

  if (moduleName === "praise" && !songCatalogLoaded && !state.connectionError) {
    await loadSongs();
  }

  if (moduleName === "service" && !state.serviceTypes.length && !state.serviceError) {
    await loadServiceData();
  }

  if (moduleName === "order-sheets" && !state.serviceTypes.length && !state.serviceError) {
    await loadServiceData();
  }

  if (moduleName === "activities" && !state.activityLoaded && !state.activityError) {
    await loadActivities();
  }

  if (moduleName === "calendar" && !state.calendarLoaded && !state.calendarLoading && !state.calendarError) {
    await loadCalendarData();
  }

  if (moduleName === "references" && !state.referenceLinksLoaded && !state.referenceError) {
    await loadReferenceLinks();
  }
}

async function loadSongs() {
  if (songLoadPromise) return songLoadPromise;
  songLoadPromise = loadSongsOnce();
  try {
    return await songLoadPromise;
  } finally {
    songLoadPromise = null;
  }
}

function scheduleBackgroundSongLoad() {
  if (backgroundSongLoadScheduled || songLoadPromise || songCatalogLoaded || !canUseClientData()) return;
  backgroundSongLoadScheduled = true;
  const run = () => {
    backgroundSongLoadScheduled = false;
    if (!songLoadPromise && !songCatalogLoaded && canUseClientData()) void loadSongs();
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3500 });
  } else {
    window.setTimeout(run, 1800);
  }
}

async function loadSongsOnce() {
  if (!requireClient()) return;

  state.loading = true;
  renderConnectionStatus();

  let data = [];
  let error = null;

  try {
    const response = await fetchAllRows(() =>
      state.client
        .from("mindex_songs")
        .select("*")
        .order("title", { ascending: true })
    );
    data = response.data;
    error = response.error;
  } catch (caughtError) {
    error = caughtError;
  }

  if (error) {
    state.loading = false;
    state.connectionError = error.message || "Could not load songs.";
    showToast(state.connectionError, "error");
    render();
    return;
  }

  state.connectionError = "";
  state.songs = (data || []).map(normalizeServerSong).sort(sortSongs);
  await attachRelationalSongVersions();
  if (!state.songs.some((song) => cleanList(song.related_song_ids).length)) {
    await attachSongRelations();
  }
  songCatalogLoaded = true;
  if (state.selectedSongId && !state.songs.some((song) => song.id === state.selectedSongId)) {
    state.selectedSongId = null;
    state.selectedVersionId = null;
    state.forms = [];
  }
  if (state.presenter.serviceId) {
    refreshPresenterForService(state.presenter.serviceId);
  }

  const selectedSong = getSelectedSong();
  if (selectedSong) {
    const validVersionId = selectedSong.versions?.some((version) => version.id === state.selectedVersionId)
      ? state.selectedVersionId
      : getPreferredVersionId(selectedSong);
    state.selectedVersionId = validVersionId;
    persistUiState();
    await loadForms(validVersionId);
    state.loading = false;
    updateSaveState();
    return;
  }

  state.loading = false;
  persistUiState();
  render();
}

async function loadSongsForIds(songIds = []) {
  if (!state.client) return;
  if (songCatalogLoaded) return;
  const ids = [...new Set(songIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const missingIds = ids.filter((id) => !state.songs.some((song) => song.id === id));
  if (!missingIds.length) return;

  let songRows = [];
  try {
    for (const batch of chunkArray(missingIds, 80)) {
      const { data, error } = await state.client
        .from("mindex_songs")
        .select("*")
        .in("id", batch)
        .order("title", { ascending: true });
      if (error) throw error;
      songRows.push(...(data || []));
    }
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load linked praise songs.", error);
    return;
  }

  if (!songRows.length) return;

  const songMap = new Map(state.songs.map((song) => [song.id, song]));
  const linkedSongs = songRows.map(normalizeServerSong);
  for (const song of linkedSongs) songMap.set(song.id, song);
  state.songs = [...songMap.values()].sort(sortSongs);
  await attachRelationalSongVersionsForSongs(linkedSongs.map((song) => song.id));
}

async function attachRelationalSongVersionsForSongs(songIds = []) {
  const ids = [...new Set(songIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return;

  let versionRows = [];
  try {
    for (const batch of chunkArray(ids, 80)) {
      const [sourceResponse, canonicalResponse] = await Promise.all([
        state.client
          .from("mindex_song_versions")
          .select("*")
          .in("source_song_id", batch)
          .order("source_song_id", { ascending: true })
          .order("version_order", { ascending: true }),
        state.client
          .from("mindex_song_versions")
          .select("*")
          .in("canonical_song_id", batch)
          .order("canonical_song_id", { ascending: true })
          .order("version_order", { ascending: true }),
      ]);
      if (sourceResponse.error) throw sourceResponse.error;
      if (canonicalResponse.error) throw canonicalResponse.error;
      versionRows.push(...(sourceResponse.data || []), ...(canonicalResponse.data || []));
    }
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load linked song versions.", error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  versionRows = [...new Map(versionRows.map((row) => [row.id, row])).values()];
  if (!versionRows.length) return;

  let unitRows = [];
  try {
    for (const batch of chunkArray(versionRows.map((row) => row.id), 80)) {
      const { data, error } = await state.client
        .from("mindex_version_units")
        .select("*")
        .in("version_id", batch)
        .order("version_id", { ascending: true })
        .order("curated_order", { ascending: true })
        .order("unit_order", { ascending: true });
      if (error) throw error;
      unitRows.push(...(data || []));
    }
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load linked song units.", error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  state.songVersionTablesSupported = true;
  state.songVersionPraiseTypesSupported = state.songVersionPraiseTypesSupported
    || versionRows.some((row) => Object.prototype.hasOwnProperty.call(row, "praise_types"));
  attachRelationalSongVersionRows(versionRows, unitRows, ids);
}

async function attachRelationalSongVersions() {
  let versionResponse;
  try {
    versionResponse = await fetchAllRows(() =>
      state.client
        .from("mindex_song_versions")
        .select("*")
        .order("source_song_id", { ascending: true })
        .order("canonical_song_id", { ascending: true })
        .order("version_order", { ascending: true })
    );
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load song versions.", error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  if (versionResponse.error) {
    if (!isUnavailableRelationError(versionResponse.error)) console.warn("Could not load song versions.", versionResponse.error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  let unitResponse;
  try {
    unitResponse = await fetchAllRows(() =>
      state.client
        .from("mindex_version_units")
        .select("*")
        .order("version_id", { ascending: true })
        .order("curated_order", { ascending: true })
        .order("unit_order", { ascending: true })
    );
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load version units.", error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  if (unitResponse.error) {
    if (!isUnavailableRelationError(unitResponse.error)) console.warn("Could not load version units.", unitResponse.error);
    state.songVersionTablesSupported = false;
    state.songVersionPraiseTypesSupported = false;
    return;
  }

  state.songVersionTablesSupported = true;
  state.songVersionPraiseTypesSupported =
    (versionResponse.data || []).some((row) => Object.prototype.hasOwnProperty.call(row, "praise_types"))
    || await detectSongVersionPraiseTypesSupport();

  attachRelationalSongVersionRows(versionResponse.data || [], unitResponse.data || []);
}

function attachRelationalSongVersionRows(versionRows = [], unitRows = [], targetSongIds = null) {
  const allowedSongIds = targetSongIds ? new Set(targetSongIds) : null;

  const songIds = new Set(state.songs.map((song) => song.id));
  const unitsByVersion = new Map();
  for (const row of unitRows || []) {
    if (!row.version_id) continue;
    const units = unitsByVersion.get(row.version_id) || [];
    units.push(normalizeRelationalUnit(row, units.length));
    unitsByVersion.set(row.version_id, units);
  }

  const sourceVersionsBySong = new Map();
  const fallbackVersionsBySong = new Map();
  for (const row of versionRows || []) {
    const sourceSongId = row.source_song_id || null;
    const canonicalSongId = row.canonical_song_id || null;
    if (sourceSongId && songIds.has(sourceSongId)) {
      const rows = sourceVersionsBySong.get(sourceSongId) || [];
      rows.push(row);
      sourceVersionsBySong.set(sourceSongId, rows);
    } else if (canonicalSongId && songIds.has(canonicalSongId)) {
      const rows = fallbackVersionsBySong.get(canonicalSongId) || [];
      rows.push(row);
      fallbackVersionsBySong.set(canonicalSongId, rows);
    }
  }

  for (const song of state.songs) {
    if (allowedSongIds && !allowedSongIds.has(song.id)) continue;
    const rows = sourceVersionsBySong.get(song.id) || fallbackVersionsBySong.get(song.id) || [];
    if (!rows.length) continue;
    const versions = rows
      .sort(sortVersionRows)
      .map((row, index) => {
        const version = normalizeRelationalVersion(row, index);
        version.forms = normalizeForms(unitsByVersion.get(version.id) || []);
        return version;
      });
    song.versions = normalizeSongVersions(song, versions);
    song._memoHasVersions = false;
    updateSongPraiseTypesFromVersions(song);
  }
}

async function attachSongRelations() {
  if (!state.client || !state.songs.length) return;
  let relationResponse;
  try {
    relationResponse = await fetchAllRows(() =>
      state.client
        .from("mindex_song_relations")
        .select("source_song_id,related_song_id,relation_type")
        .eq("relation_type", "related")
        .order("source_song_id", { ascending: true })
        .order("related_song_id", { ascending: true })
    );
  } catch (error) {
    if (!isUnavailableRelationError(error)) console.warn("Could not load song relations.", error);
    state.songRelationsSupported = false;
    return;
  }

  if (relationResponse.error) {
    if (!isUnavailableRelationError(relationResponse.error)) console.warn("Could not load song relations.", relationResponse.error);
    state.songRelationsSupported = false;
    return;
  }

  state.songRelationsSupported = true;
  const songIds = new Set(state.songs.map((song) => song.id));
  const relatedBySong = new Map(state.songs.map((song) => [song.id, new Set()]));
  for (const row of relationResponse.data || []) {
    const sourceId = row.source_song_id;
    const relatedId = row.related_song_id;
    if (!songIds.has(sourceId) || !songIds.has(relatedId) || sourceId === relatedId) continue;
    relatedBySong.get(sourceId)?.add(relatedId);
    relatedBySong.get(relatedId)?.add(sourceId);
  }
  for (const song of state.songs) {
    song.related_song_ids = [...(relatedBySong.get(song.id) || [])].sort();
  }
}

async function fetchAllRows(buildQuery, { pageSize = SUPABASE_PAGE_SIZE } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const response = await buildQuery().range(from, to);
    if (response.error) return { data: rows, error: response.error };
    const page = response.data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

function chunkArray(items = [], size = 80) {
  const chunks = [];
  const chunkSize = Math.max(1, Number(size) || 80);
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function loadScriptures({ silent = false } = {}) {
  if (!requireClient({ silent })) return;

  state.loading = true;
  renderConnectionStatus();

  let data = [];
  let error = null;

  try {
    const response = await fetchAllRows(() =>
      state.client
        .from("mindex_scriptures")
        .select("*")
        .eq("is_active", true)
        .order("title", { ascending: true })
    );
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
  const scriptures = (data || []).map(normalizeServerScripture);
  state.uiVerses = extractUiVerses(scriptures);
  state.scriptures = scriptures.filter((scripture) => !uiVerseSlot(scripture)).sort(sortScriptures);
  if (state.selectedScriptureId && !state.scriptures.some((scripture) => scripture.id === state.selectedScriptureId)) {
    state.selectedScriptureId = null;
  }

  persistUiState();
  render();
}

async function loadScriptureBooks({ silent = false } = {}) {
  if (!requireClient({ silent })) return;

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
  if (!requireClient({ silent })) {
    state.serviceError = "No connection.";
    render();
    return;
  }
  try {
    await loadHymnScoreManifest();
    await loadWorshipData();
    state.dirtyServiceTypeIds.clear();
    state.dirty.service = false;
    state.serviceError = "";
    render();
    return;
  } catch (err) {
    if (!silent) console.error("[Service] loadWorshipData failed:", err);
    state.serviceError = err.message || String(err) || "Could not load worship data.";
    if (!silent && state.module === "service") showToast(state.serviceError, "error");
    render();
  }
}

async function fetchSupabasePaged(table, select = "*", buildQuery = (query) => query, pageSize = 1000) {
  const rows = [];
  for (let start = 0; ; start += pageSize) {
    const end = start + pageSize - 1;
    const query = buildQuery(state.client.from(table).select(select)).range(start, end);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

const WORSHIP_SERVICE_TYPE_ALIASES = {
  sun_1st: "sunday-first",
  sun_2nd: "sunday-second",
  sun_3rd: "sunday-main",
  sun_pm: "sunday-afternoon",
  wed: "wednesday",
  fri: "friday",
  young_adult: "young-adult",
  holy_week_dawn: "holy-week-dawn",
};

function worshipAppServiceTypeId(typeId) {
  return WORSHIP_SERVICE_TYPE_ALIASES[typeId] || typeId || "";
}

async function loadWorshipData() {
  const [types, services, sections, elements, templates, templateItems, presenterRows] = await Promise.all([
    fetchSupabasePaged("mindex_worship_service_types", "*", (query) => query.order("sort_order", { ascending: true })),
    fetchSupabasePaged("mindex_worship_services", "*", (query) =>
      query.order("service_date", { ascending: true }).order("service_type_id", { ascending: true })),
    fetchSupabasePaged("mindex_worship_sections", "*", (query) =>
      query.order("service_id", { ascending: true }).order("sort_order", { ascending: true })),
    fetchSupabasePaged("mindex_worship_elements", "*", (query) =>
      query.order("section_id", { ascending: true }).order("sort_order", { ascending: true })),
    fetchSupabasePaged("mindex_worship_templates", "*", (query) =>
      query.order("template_level", { ascending: true }).order("name", { ascending: true })),
    fetchSupabasePaged("mindex_worship_template_items", "*", (query) =>
      query.order("template_id", { ascending: true }).order("sort_order", { ascending: true })),
    fetchSupabasePaged("mindex_worship_presenter_slides", "*", (query) =>
      query
        .order("service_date", { ascending: true })
        .order("section_order", { ascending: true })
        .order("element_order", { ascending: true })
        .order("slide_order", { ascending: true })),
  ]);

  await loadSongsForIds(elements.map((item) => item.song_id));

  const resolvedTypes = types.length ? types : defaultWorshipServiceTypes();
  state.serviceTypes = resolvedTypes.map(normalizeWorshipServiceType);
  state.services = services.map(normalizeWorshipService);
  state.worshipSections = sections;
  state.worshipElements = elements;
  state.worshipTemplates = templates;
  state.worshipTemplateItems = templateItems;
  state.serviceItems = groupWorshipElements(sections, elements);
  state.worshipPresenterSlides = groupWorshipPresenterSlides(presenterRows);
  state.serviceItemAssigneeSupported = true;
  state.serviceItemVersionSupported = true;
  state.serviceItemMemoSupported = true;
  state.serviceTitleSupported = true;
}

function defaultWorshipServiceTypes() {
  return Object.values(SERVICE_CATEGORIES)
    .flat()
    .map((id, index) => ({
      id,
      display_name: SERVICE_TYPE_DISPLAY_NAMES[id] || id,
      short_name: SERVICE_TYPE_DISPLAY_NAMES[id] || id,
      sort_order: index + 1,
      group_key: serviceTypeGroupKey(id),
    }));
}

function normalizeWorshipServiceType(type = {}) {
  const config = type.config && typeof type.config === "object" ? type.config : {};
  return {
    id: worshipAppServiceTypeId(type.id),
    name: type.display_name || type.id || "",
    short_name: type.short_name || "",
    sort_order: Number(type.sort_order) || 0,
    fixed_items: normalizeServiceDefaultItems(config.fixedItems || config.fixed_items || []),
    order_template: normalizeServiceOrderTemplateConfig(config.orderTemplate || config.order_template || []),
    _worship: true,
    _worshipId: type.id || "",
    _worshipGroupKey: type.group_key || "",
    _worshipOutputContext: type.default_output_context || "auto",
    _worshipChromakey: Boolean(type.chromakey_enabled),
  };
}

function normalizeServiceOrderTemplateConfig(value) {
  return Array.isArray(value) ? value.filter((step) => step && typeof step === "object") : [];
}

function normalizeWorshipService(service = {}) {
  return {
    id: service.id,
    type_id: worshipAppServiceTypeId(service.service_type_id),
    date: service.service_date,
    date_end: service.service_date_end || null,
    title: service.title || "",
    leader: service.praise_leader || service.worship_leader || "",
    tags: Array.isArray(service.tags) ? service.tags : [],
    raw_text: service.notes || "",
    created_at: service.created_at,
    _worship: true,
    _worshipServiceTypeId: service.service_type_id,
    _worshipStatus: service.status || "draft",
    _worshipSourceRef: service.source_ref || {},
  };
}

function groupWorshipElements(sections = [], elements = []) {
  const sectionById = Object.fromEntries(sections.map((section) => [section.id, section]));
  return elements.reduce((grouped, element) => {
    const section = sectionById[element.section_id];
    const serviceId = section?.service_id;
    if (!serviceId) return grouped;
    if (!grouped[serviceId]) grouped[serviceId] = [];
    const sourceRef = element.source_ref && typeof element.source_ref === "object" ? element.source_ref : {};
    const config = element.config && typeof element.config === "object" ? element.config : {};
    const orderSheet = mergeServiceOrderSheetPayloads(
      normalizeServiceOrderSheetPayload(config.orderSheet),
      normalizeServiceOrderSheetPayload(config.order_sheet),
      normalizeServiceOrderSheetPayload(sourceRef.orderSheet),
      normalizeServiceOrderSheetPayload(sourceRef.order_sheet),
    );
    const asset = normalizeServiceAsset(config.asset || config.media || sourceRef.asset);
    const formHint = serviceFormHintFromConfig(config);
    const formPreset = normalizeServiceFormPreset(config.formPreset || config.form_preset, formHint);
    const formPresetRules = normalizeServiceFormPresetRules(config.formPresetRules || config.form_preset_rules);
    grouped[serviceId].push(normalizeServiceItem({
      id: element.id,
      service_id: serviceId,
      sort_order: (Number(section.sort_order) || 0) * 1000 + (Number(element.sort_order) || 0),
      label: sourceRef.label || section.title || "",
      assignee: element.person || section.person || "",
      raw_title: worshipElementDisplayTitle(element, section, sourceRef, config, orderSheet),
      song_id: element.song_id || null,
      song_version_id: element.song_version_id || null,
      memo: serializeServiceItemMemo({
        elementType: element.element_type,
        outputMode: config.outputMode || config.output_mode || config.renderMode || config.render_mode,
        formHint,
        formPreset,
        formPresetRules,
        asset,
        orderSheet,
        reviewStatus: element.review_status,
        reviewFlags: sourceRef.review_flags || [],
      }),
      _worship: true,
      _worshipSectionId: section.id,
      _worshipSectionKey: section.section_key || "",
      _worshipSectionTitle: section.title || "",
      _worshipSectionOrder: Number(section.sort_order) || 0,
      _worshipElementOrder: Number(element.sort_order) || 0,
      _worshipOrderSheetPlaceholder: Boolean(sourceRef.placeholder || sourceRef.order_sheet_placeholder || config.orderSheetPlaceholder),
    }));
    return grouped;
  }, {});
}

function serviceFormHintFromConfig(config = {}) {
  const preset = normalizeServiceFormPreset(config.formPreset || config.form_preset, config.formHint || config.form_hint);
  return String(config.formHint || config.form_hint || preset?.hint || "").trim();
}

function worshipElementDisplayTitle(element = {}, section = {}, sourceRef = {}, config = {}, orderSheet = null) {
  const title = String(element.title || "").trim();
  if (title) return title;
  const placeholder = Boolean(sourceRef.placeholder || sourceRef.order_sheet_placeholder || config.orderSheetPlaceholder);
  if (placeholder && orderSheet?.order) return "";
  return sourceRef.label || section.title || "";
}

function groupWorshipPresenterSlides(rows = []) {
  return rows.reduce((grouped, row, index) => {
    const serviceId = row.service_id;
    if (!serviceId) return grouped;
    if (!grouped[serviceId]) grouped[serviceId] = [];
    grouped[serviceId].push(normalizeWorshipPresenterSlide(row, index));
    return grouped;
  }, {});
}

function normalizeWorshipPresenterSlide(row = {}, index = 0) {
  const elementType = worshipPresenterElementType(row.element_type, row.slide_type);
  const layout = worshipPresenterLayout(row.slide_type, elementType);
  const title = row.slide_title || row.element_title || row.section_title || "";
  const assignee = row.element_person || row.section_person || "";
  const text = row.slide_body || row.slide_title || row.element_title || "";
  const marker = row.slide_marker || inferWorshipSlideMarker(row, elementType);
  return {
    id: row.slide_id || `${row.element_id || "worship"}:${index}`,
    sectionId: row.section_id || row.element_id || `section:${index}`,
    elementId: row.element_id || row.section_id || `element:${index}`,
    sectionIndex: Number(row.section_order) || index + 1,
    sectionKey: row.section_key || "",
    sectionLabel: row.section_title || "",
    sectionRole: row.section_key === "praise" ? "main-praise" : "",
    sectionTitle: row.section_title || "",
    elementLabel: row.element_label || row.section_title || "",
    elementTitle: row.element_title || title,
    sectionAssignee: assignee,
    sectionName: presenterNameParts(row.section_title, row.element_title, assignee).join(" / "),
    elementType,
    layout,
    type: worshipPresenterSlideType(row.slide_type, elementType, layout),
    label: row.section_title || "",
    title,
    assignee,
    marker,
    formKey: `${row.element_id || "element"}:${marker || row.slide_order || index}`,
    text: elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE ? cleanList([title, assignee]).join("\n") : text,
    sort: (Number(row.section_order) || 0) * 10000 + (Number(row.element_order) || 0) * 100 + (Number(row.slide_order) || 0),
    media: row.media || {},
    asset: row.media || {},
  };
}

function inferWorshipSlideMarker(row = {}, elementType = "") {
  if (elementType !== PRESENTER_ELEMENT_TYPES.PRAISE) return "";
  const text = String(row.slide_body || "").trim();
  const bracket = text.match(/^\[([^\]]{1,24})\]/);
  if (bracket) return bracket[1].trim();
  const named = text.match(/^(verse|chorus|pre-chorus|prechorus|bridge|coda|ending|intro|outro|amen|후렴|브릿지|아멘)\s*(\d+)?/i);
  if (named) return [named[1], named[2]].filter(Boolean).join(" ");
  const numbered = text.match(/^(\d{1,2})[\s.]/);
  if (numbered) return `Verse ${numbered[1]}`;
  return "";
}

function worshipPresenterElementType(elementType, slideType) {
  if (elementType === "praise" || /^praise_/.test(String(slideType || ""))) return PRESENTER_ELEMENT_TYPES.PRAISE;
  if (slideType === "scripture_body" || elementType === "scripture_body") return PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT;
  if (slideType === "scripture_reading" || elementType === "scripture_reading") return PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE;
  if (elementType === "body") return PRESENTER_ELEMENT_TYPES.BODY_TEXT;
  if (elementType === "title_person") return PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE;
  if (elementType === "image") return PRESENTER_ELEMENT_TYPES.IMAGE;
  if (elementType === "video") return PRESENTER_ELEMENT_TYPES.VIDEO;
  if (["file", "ppt", "pptx", "pdf", "key", "score"].includes(elementType)) return PRESENTER_ELEMENT_TYPES.FILE;
  if (elementType === "blank") return PRESENTER_ELEMENT_TYPES.BLANK;
  return PRESENTER_ELEMENT_TYPES.PLAIN_TEXT;
}

function worshipPresenterLayout(slideType, elementType) {
  if (elementType === PRESENTER_ELEMENT_TYPES.PRAISE) return PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  if (elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  if (elementType === PRESENTER_ELEMENT_TYPES.IMAGE || elementType === PRESENTER_ELEMENT_TYPES.VIDEO) return PRESENTER_SLIDE_LAYOUTS.MEDIA;
  if (elementType === PRESENTER_ELEMENT_TYPES.FILE) return PRESENTER_SLIDE_LAYOUTS.FILE;
  if (slideType === "blank" || elementType === PRESENTER_ELEMENT_TYPES.BLANK) return PRESENTER_SLIDE_LAYOUTS.BLANK;
  return PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT;
}

function worshipPresenterSlideType(slideType, elementType, layout) {
  if (elementType === PRESENTER_ELEMENT_TYPES.PRAISE) return slideType === "praise_title" ? "song-title" : "lyrics";
  if (elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return "title-assignee";
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT && elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT) return "scripture";
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA) return elementType === PRESENTER_ELEMENT_TYPES.IMAGE ? "image" : "video";
  if (layout === PRESENTER_SLIDE_LAYOUTS.FILE) return "file";
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return "blank";
  return "component";
}

async function loadActivities({ silent = false } = {}) {
  if (!requireClient({ silent })) {
    resetActivityState();
    state.activityLoaded = true;
    state.activityError = "No connection.";
    render();
    return;
  }

  try {
    const [eventsRes, gamesRes, teamsRes, scoresRes] = await Promise.all([
      fetchAllRows(() => state.client.from("mindex_activity_events").select("*").order("date", { ascending: false }).order("created_at", { ascending: false })),
      fetchAllRows(() => state.client.from("mindex_activity_games").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true })),
      fetchAllRows(() => state.client.from("mindex_activity_teams").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true })),
      fetchAllRows(() => state.client.from("mindex_activity_score_events").select("*").order("created_at", { ascending: false })),
    ]);
    const error = eventsRes.error || gamesRes.error || teamsRes.error || scoresRes.error;
    if (error) throw error;

    state.activityEvents = (eventsRes.data || []).map(normalizeActivityEvent);
    state.activityGames = (gamesRes.data || []).map(normalizeActivityGame);
    state.activityTeams = (teamsRes.data || []).map(normalizeActivityTeam);
    state.activityScoreEvents = (scoresRes.data || []).map(normalizeActivityScoreEvent);
    if (state.selectedActivityEventId && !state.activityEvents.some((event) => event.id === state.selectedActivityEventId)) {
      state.selectedActivityEventId = null;
    }
    if (!state.selectedActivityEventId && state.activityEvents.length) {
      state.selectedActivityEventId = state.activityEvents[0].id;
    }
    state.activityLoaded = true;
    state.activityError = "";
    render();
  } catch (error) {
    resetActivityState();
    state.activityLoaded = true;
    state.activityError = isUnavailableRelationError(error) ? "setup" : (error.message || "error");
    if (!silent && state.module === "activities") showToast(state.activityError, "error");
    render();
  }
}

function resetActivityState() {
  state.activityEvents = [];
  state.activityGames = [];
  state.activityTeams = [];
  state.activityScoreEvents = [];
}

function normalizeActivityEvent(row = {}) {
  return {
    id: row.id || createLocalId(),
    title: row.title || row.name || "Untitled Activity Event",
    date: row.date || "",
    status: row.status || "draft",
    location: row.location || "",
    memo: row.memo || "",
    created_at: row.created_at || "",
  };
}

function normalizeActivityGame(row = {}) {
  return {
    id: row.id || createLocalId(),
    event_id: row.event_id || "",
    title: row.title || row.name || "Untitled Game",
    game_type: row.game_type || "physical",
    status: row.status || "draft",
    sort_order: Number(row.sort_order) || 0,
    owner: row.owner || row.assignee || "",
    location: row.location || "",
    supplies: row.supplies || "",
    memo: row.memo || "",
    config: row.config || {},
  };
}

function normalizeActivityTeam(row = {}) {
  return {
    id: row.id || createLocalId(),
    event_id: row.event_id || "",
    name: row.name || "Team",
    color: row.color || "#6ee7b7",
    score: Number(row.score) || 0,
    sort_order: Number(row.sort_order) || 0,
  };
}

function normalizeActivityScoreEvent(row = {}) {
  return {
    id: row.id || createLocalId(),
    event_id: row.event_id || "",
    game_id: row.game_id || "",
    team_id: row.team_id || "",
    points: Number(row.points) || 0,
    reason: row.reason || "",
    created_at: row.created_at || "",
  };
}

async function loadReferenceLinks({ silent = false } = {}) {
  if (!requireClient({ silent })) {
    state.referenceLinks = [];
    state.referenceError = "No connection.";
    state.referenceLinksLoaded = true;
    render();
    return;
  }

  try {
    state.referenceGroupSupported = await detectTableColumnSupport("mindex_reference_links", "group_name");
    const response = await fetchAllRows(() =>
      state.client
        .from("mindex_reference_links")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true })
    );

    if (response.error) throw response.error;
    state.referenceLinks = (response.data || []).map(normalizeReferenceLink).sort(sortReferenceLinks);
    state.referenceLinksLoaded = true;
    state.referenceError = "";
    state.dirty.references = false;
    render();
  } catch (error) {
    state.referenceLinks = [];
    state.referenceLinksLoaded = true;
    state.referenceError = isUnavailableRelationError(error) ? "setup" : (error.message || "error");
    if (!silent && state.module === "references") showToast(state.referenceError, "error");
    render();
  }
}

function normalizeReferenceLink(row = {}) {
  return {
    id: row.id || createLocalId(),
    title: row.title || "",
    url: row.url || "",
    group_name: row.group_name || row.group || row.category || "",
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
  };
}

function sortReferenceLinks(a, b) {
  return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
    || String(a.group_name || "").localeCompare(String(b.group_name || ""), "ko")
    || TITLE_COLLATOR.compare(String(a.title || ""), String(b.title || ""));
}

async function detectServiceItemAssigneeSupport() {
  return detectServiceItemColumnSupport("assignee");
}

async function detectServiceItemVersionSupport() {
  return detectServiceItemColumnSupport("version_id");
}

async function detectServiceItemMemoSupport() {
  return detectServiceItemColumnSupport("memo");
}

async function detectServiceTitleSupport() {
  return true;
}

async function detectSongVersionPraiseTypesSupport() {
  return detectTableColumnSupport("mindex_song_versions", "praise_types");
}

async function detectServiceItemColumnSupport(column) {
  void column;
  return true;
}

async function detectTableColumnSupport(table, column) {
  if (!state.client || !/^[a-z_][a-z0-9_]*$/i.test(table) || !/^[a-z_][a-z0-9_]*$/i.test(column)) return false;
  const cacheKey = `${table}.${column}`;
  if (TABLE_COLUMN_SUPPORT_CACHE.has(cacheKey)) return TABLE_COLUMN_SUPPORT_CACHE.get(cacheKey);
  try {
    const { error } = await state.client
      .from(table)
      .select(column)
      .limit(1);
    const supported = !error;
    TABLE_COLUMN_SUPPORT_CACHE.set(cacheKey, supported);
    return supported;
  } catch {
    TABLE_COLUMN_SUPPORT_CACHE.set(cacheKey, false);
    return false;
  }
}

async function loadCalendarData({ silent = false } = {}) {
  if (!state.client || state.calendarLoading) return;
  state.calendarLoading = true;
  state.calendarError = "";
  try {
    const { data, error } = await state.client
      .from("mindex_sunday_calendar")
      .select("*")
      .gte("date", CALENDAR_MIN_DATE)
      .order("date");
    if (error) throw error;
    state.calendarData = data || [];
    state.calendarLoaded = true;
    state.calendarError = "";
  } catch (e) {
    state.calendarError = e.message || "Could not load calendar.";
    if (!silent) showToast(e.message || "Could not load calendar.", "error");
  } finally {
    state.calendarLoading = false;
    if (state.module === "calendar") {
      renderHomeList();
      renderCalendarView();
    }
  }
}

async function saveCalendarCell(id, field, value) {
  if (!state.client) return false;
  const { error } = await state.client
    .from("mindex_sunday_calendar")
    .update({ [field]: value })
    .eq("id", id);
  if (error) { showToast(error.message || "Save failed.", "error"); return false; }
  const row = state.calendarData.find((r) => r.id === id);
  if (row) row[field] = value;
  return true;
}

function renderCalendarView() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    return;
  }
  if (!state.calendarLoaded && !state.calendarLoading && !state.calendarError) {
    void loadCalendarData({ silent: true });
  }
  if (state.calendarError) {
    refs.detailPane.innerHTML = isConnectionUnavailableMessage(state.calendarError)
      ? renderConnectionEmptyDetail(state.connectionError || state.calendarError)
      : `
        <div class="empty-detail">
          <div class="empty-detail-inner">
            <p class="empty-verse">Calendar unavailable</p>
            <span>${escapeHtml(state.calendarError)}</span>
          </div>
        </div>`;
    return;
  }
  if (!state.calendarLoaded) {
    refs.detailPane.innerHTML = renderLoadingDetail();
    return;
  }
  const calendarRows = getCalendarDisplayRows();
  if (!calendarRows.length) {
    refs.detailPane.innerHTML = `<div class="empty-detail"><div class="empty-detail-inner"><p class="empty-verse">교회력 데이터가 없습니다.</p></div></div>`;
    return;
  }

  const today = toLocalDateStr(new Date());
  const currentMonth = today.slice(0, 7);
  if (!state.calendarScrollTargetMonth && state.calendarAutoScrolledMonth !== currentMonth) {
    state.calendarScrollTargetMonth = currentMonth;
  }
  const KO_MONTH = ["","1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const DOW = ["일","월","화","수","목","금","토"];
  const calendarDetailFields = getCalendarDetailFields();

  let tbodyHtml = "";
  let prevMonth = "";
  for (const row of calendarRows) {
    const ym = row.date.slice(0, 7);
    if (ym !== prevMonth) {
      const [y, m] = ym.split("-");
      tbodyHtml += `<tr class="cal-month-row" data-cal-month="${escapeAttr(ym)}"><td colspan="${4 + calendarDetailFields.length}">${y}년 ${KO_MONTH[parseInt(m)]}</td></tr>`;
      prevMonth = ym;
    }
    const d = parseLocalDate(row.date);
    const dateLabel = `${d.getMonth()+1}/${d.getDate()} (${DOW[d.getDay()]})`;
    const isToday = row.date === today;
    const isPast = row.date < today;
    const isUpcomingSunday = row.date === nextSundayDate(today);

    if (isCalendarInlineFeast(row)) {
      tbodyHtml += renderCalendarInlineFeastRow(row, dateLabel, { isToday, isPast, isUpcomingSunday });
      continue;
    }

    const rowCls = [
      "cal-row",
      isToday ? "is-today" : isPast ? "is-past" : "",
      isUpcomingSunday ? "is-upcoming-sunday" : "",
    ].filter(Boolean).join(" ");

    tbodyHtml += `
      <tr class="${rowCls}">
        <td class="cal-date">${dateLabel}</td>
        <td class="cal-lit">${escapeHtml(row.liturgical || "")}</td>
        ${renderCalendarEditCell(row, "note")}
        ${renderCalendarEditCell(row, "church_schedule")}
        ${calendarDetailFields.map(([field]) => renderCalendarEditCell(row, field)).join("")}
      </tr>`;
  }

  refs.detailPane.innerHTML = `
    <div class="cal-view">
      <div class="cal-header">
        <div>
          <h2 class="cal-title">교회력</h2>
          <span class="cal-subtitle">${escapeHtml(churchYearSeriesSummary(calendarRows))}</span>
        </div>
        ${renderCalendarDetailTabs()}
      </div>
      <div class="cal-table-wrap">
        <table class="cal-table">
          <thead>
            <tr>
              <th class="cal-th-date">날짜</th>
              <th class="cal-th-lit">절기</th>
              <th class="cal-th-note">기념/메모</th>
              <th class="cal-th-note">교회 일정</th>
              ${calendarDetailFields.map(([, department, role]) => renderCalendarRoleHeader(department, role)).join("")}
            </tr>
          </thead>
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>
      <p class="cal-footnote">${escapeHtml(CALENDAR_LECTIONARY_FOOTNOTE.join(" "))}</p>
    </div>`;
  scrollCalendarToTargetMonth();
}

function scrollCalendarToTargetMonth() {
  const targetMonth = state.calendarScrollTargetMonth;
  if (!targetMonth || state.module !== "calendar") return;
  state.calendarScrollTargetMonth = null;
  const applyScroll = () => {
    const wrap = refs.detailPane?.querySelector(".cal-table-wrap");
    const row = [...(wrap?.querySelectorAll(".cal-month-row") || [])]
      .find((monthRow) => monthRow.dataset.calMonth === targetMonth);
    if (!wrap || !row) return;
    const wrapTop = wrap.getBoundingClientRect().top;
    const rowTop = row.getBoundingClientRect().top;
    wrap.scrollTop = Math.max(0, wrap.scrollTop + rowTop - wrapTop - 8);
    state.calendarAutoScrolledMonth = targetMonth;
  };
  applyScroll();
  queueMicrotask(applyScroll);
  setTimeout(applyScroll, 50);
  setTimeout(applyScroll, 250);
  setTimeout(applyScroll, 600);
}

function nextSundayDate(todayValue = toLocalDateStr(new Date())) {
  const date = parseLocalDate(todayValue);
  if (Number.isNaN(date.getTime())) return todayValue;
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return toLocalDateStr(date);
}

function renderCalendarRoleHeader(department, role) {
  if (!role) {
    return `<th class="cal-th-person cal-th-simple"><span class="cal-th-role">${escapeHtml(department)}</span></th>`;
  }
  return `
    <th class="cal-th-person">
      <span class="cal-th-dept">${escapeHtml(department)}</span>
      <span class="cal-th-role">${escapeHtml(role)}</span>
    </th>`;
}

function getCalendarDetailFields() {
  return state.calendarDetailTab === "lectionary"
    ? CALENDAR_LECTIONARY_FIELDS
    : CALENDAR_DEPARTMENT_FIELDS;
}

function renderCalendarDetailTabs() {
  const tabs = [
    ["departments", "부서 일과"],
    ["lectionary", "성서일과"],
  ];
  return `
    <div class="cal-tabs" role="tablist" aria-label="교회력 표시">
      ${tabs.map(([key, label]) => `
        <button
          class="cal-tab${state.calendarDetailTab === key ? " active" : ""}"
          type="button"
          data-calendar-detail-tab="${escapeAttr(key)}"
          role="tab"
          aria-selected="${state.calendarDetailTab === key ? "true" : "false"}"
        >${escapeHtml(label)}</button>
      `).join("")}
    </div>`;
}

function renderCalendarEditCell(row, field) {
  const val = escapeHtml(row[field] || "");
  return `<td class="cal-cell" data-cal-id="${escapeAttr(row.id)}" data-cal-field="${escapeAttr(field)}" data-placeholder="—" contenteditable="true" spellcheck="false">${val}</td>`;
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
  if (!serviceId || state.serviceItems[serviceId]) return;
  state.serviceItems[serviceId] = [];
  renderServiceDetail();
}

async function loadBibleTranslations({ silent = false } = {}) {
  if (!requireClient({ silent })) return;

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
  if (!requireClient({ silent })) return;
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
    const { rows, count, page: resolvedPage } = await fetchBibleTextSearchRows(query, state.selectedBibleTranslationId, page);
    if (state.bibleTextSearchRequestId !== requestId) return;
    state.bibleTextSearchResults = rows.map(normalizeServerBibleVerse).sort(sortBibleVerseRows);
    state.bibleTextSearchTotal = Number.isFinite(count) ? count : state.bibleTextSearchResults.length;
    state.bibleTextSearchPage = resolvedPage;
  } catch (error) {
    if (state.bibleTextSearchRequestId !== requestId) return;
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

async function fetchBibleTextSearchRows(query, translationId, page = 0) {
  const rpcRows = await fetchBibleTextSearchRowsViaRpc(query, translationId, page);
  if (rpcRows) return rpcRows;
  return fetchBibleTextSearchRowsByBook(query, translationId, page);
}

async function fetchBibleTextSearchRowsViaRpc(query, translationId, page = 0) {
  try {
    const { data, error } = await state.client.rpc("search_bible_verses", {
      p_query: query,
      p_translation_id: translationId,
      p_page: Math.max(0, Number(page) || 0),
      p_page_size: BIBLE_TEXT_SEARCH_PAGE_SIZE,
    });
    if (error) throw error;

    const responseRows = data || [];
    const firstRow = responseRows[0] || {};
    const count = Number(firstRow.total_count);
    const resolvedPage = Number(firstRow.resolved_page);
    const rows = responseRows.map(({ total_count, resolved_page, ...row }) => row);
    return {
      rows,
      count: Number.isFinite(count) ? count : rows.length,
      page: Number.isFinite(resolvedPage) ? resolvedPage : 0,
    };
  } catch (error) {
    if (isUnavailableRpcError(error)) return null;
    throw error;
  }
}

async function fetchBibleTextSearchRowsByBook(query, translationId, page = 0) {
  const pageSize = BIBLE_TEXT_SEARCH_PAGE_SIZE;
  const requestedPage = Math.max(0, Number(page) || 0);
  const requestedStart = requestedPage * pageSize;
  const requestedEnd = requestedStart + pageSize - 1;
  const rows = [];
  let totalCount = 0;
  let seenBeforeBook = 0;

  for (const book of getBibleBooks().sort(sortBibleBooks)) {
    const { error: countError, count } = await state.client
      .from("mindex_bible_verses")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("translation_id", translationId)
      .eq("book_code", book.code)
      .ilike("text", `%${escapePostgrestLikePattern(query)}%`);

    if (countError) throw countError;
    const bookCount = Number(count) || 0;
    const bookStart = seenBeforeBook;
    const bookEnd = seenBeforeBook + bookCount - 1;
    totalCount += bookCount;

    if (bookCount && requestedStart <= bookEnd && requestedEnd >= bookStart && rows.length < pageSize) {
      const localFrom = Math.max(0, requestedStart - bookStart);
      const localTo = Math.min(bookCount - 1, requestedEnd - bookStart);
      const { data, error } = await state.client
        .from("mindex_bible_verses")
        .select("id,book_code,chapter,verse,verse_end,text,section_title")
        .eq("is_active", true)
        .eq("translation_id", translationId)
        .eq("book_code", book.code)
        .ilike("text", `%${escapePostgrestLikePattern(query)}%`)
        .order("chapter", { ascending: true })
        .order("verse", { ascending: true })
        .range(localFrom, localTo);

      if (error) throw error;
      rows.push(...(data || []));
    }

    seenBeforeBook += bookCount;
  }

  const maxPage = Math.max(0, Math.ceil(totalCount / pageSize) - 1);
  if (requestedPage > maxPage && totalCount > 0) {
    return fetchBibleTextSearchRowsByBook(query, translationId, maxPage);
  }
  return { rows, count: totalCount, page: Math.min(requestedPage, maxPage) };
}

async function changeBibleTextSearchPage(delta) {
  if (!delta) return;
  const total = Number(state.bibleTextSearchTotal) || state.bibleTextSearchResults.length;
  const maxPage = Math.max(0, Math.ceil(total / BIBLE_TEXT_SEARCH_PAGE_SIZE) - 1);
  const page = Math.min(Math.max(0, state.bibleTextSearchPage + delta), maxPage);
  if (page === state.bibleTextSearchPage) return;
  await runBibleTextSearch(state.bibleTextSearchQuery, { page });
}

async function selectSong(songId) {
  if (songId === state.selectedSongId) return;
  if (!(await confirmSaveBeforeLeaving())) return;

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
  if (!(await confirmSaveBeforeLeaving())) return;

  state.selectedScriptureId = scriptureId;
  state.dirty.song = false;
  state.dirty.forms = false;
  state.dirty.scripture = false;
  persistUiState();
  render();
  syncBrowserHistory();
  focusSelectedItemAfterRender();
}

function buildVerseRange(start, end) {
  if (!start) return [];
  if (!end || end <= start) return [start];
  const range = [];
  for (let v = start; v <= end; v += 1) range.push(v);
  return range;
}

async function selectScriptureBook(bookCode, options = {}) {
  const nextChapter = Number(options.chapter) || 1;
  const nextVerse = Number(options.verse) || null;
  const nextVerseEnd = Number(options.verseEnd) || null;
  const nextVerseRange = buildVerseRange(nextVerse, nextVerseEnd);
  clearBibleTextSearch();
  if (bookCode === state.selectedBookCode && !options.force) {
    if (nextChapter !== state.selectedBibleChapter || nextVerse !== state.selectedBibleVerse) {
      state.selectedBibleChapter = nextChapter;
      state.selectedBibleVerse = nextVerse;
      state.selectedBibleVerses = nextVerseRange;
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
  state.selectedBibleVerses = nextVerseRange;
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

async function createReferenceLink(options = {}) {
  if (!requireClient() || state.saving) return;

  const nextOrder = Math.max(0, ...state.referenceLinks.map((link) => Number(link.sort_order) || 0)) + 10;
  const payload = {
    title: options.title || "New reference",
    url: "https://",
    sort_order: nextOrder,
    is_active: true,
  };
  if (state.referenceGroupSupported) payload.group_name = nullIfBlank(options.groupName || "");

  state.saving = true;
  updateSaveState();
  try {
    const { data, error } = await state.client
      .from("mindex_reference_links")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    state.referenceError = "";
    state.referenceLinks = [...state.referenceLinks, normalizeReferenceLink(data)].sort(sortReferenceLinks);
    state.editingReferenceId = data.id;
    state.dirty.references = false;
    render();
    focusEditingReference(data.id);
    showToast("Reference added.");
  } catch (error) {
    showToast(referenceTableErrorMessage(error), "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
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
  if (state.module === "home") return;
  if (state.module === "references") {
    await saveReferenceLinks();
    return;
  }
  if (state.module === "service") {
    await saveService();
    return;
  }
  if (state.module === "scripture") {
    await saveScripture();
    return;
  }

  if (state.module === "praise" && songLoadPromise) {
    showToast("Song data is still loading.", "error");
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

async function saveReferenceLinks() {
  if (!requireClient() || state.saving) return;

  const links = state.referenceLinks.map(normalizeReferenceLink).sort(sortReferenceLinks);
  const invalid = links.find((link) => !link.title.trim() || !link.url.trim() || link.url.trim() === "https://");
  if (invalid) {
    showToast("Reference title and URL are required.", "error");
    return;
  }

  state.saving = true;
  updateSaveState();
  try {
    const payload = links.map((link, index) => ({
      id: link.id,
      title: link.title.trim(),
      url: link.url.trim(),
      sort_order: Number(link.sort_order) || (index + 1) * 10,
      is_active: link.is_active !== false,
    }));
    payload.forEach((row, index) => {
      const groupName = nullIfBlank(links[index].group_name);
      if (state.referenceGroupSupported) row.group_name = groupName;
    });
    const { data, error } = await state.client
      .from("mindex_reference_links")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;

    state.referenceLinks = (data || []).map(normalizeReferenceLink).sort(sortReferenceLinks);
    state.referenceError = "";
    state.referenceLinksLoaded = true;
    state.dirty.references = false;
    showToast("References saved.");
    render();
  } catch (error) {
    showToast(referenceTableErrorMessage(error), "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

function updateReferenceLinkField(field) {
  const link = state.referenceLinks.find((item) => item.id === field.dataset.referenceId);
  if (!link) return;

  const key = field.dataset.referenceField;
  if (!["title", "url", "group_name", "is_active"].includes(key)) return;
  link[key] = field.value;
  if (key === "is_active") link[key] = field.checked;
  state.dirty.references = true;
  updateSaveState();
}

function updateReferenceGroupName(field) {
  const originalKey = field.dataset.referenceGroupKey || "ungrouped";
  const nextName = String(field.value || "").trim();
  const links = state.referenceLinks.filter((link) =>
    link._editingGroupKey === originalKey || referenceGroupKey(link.group_name) === originalKey);
  if (!links.length) return;
  links.forEach((link) => {
    link.group_name = nextName;
    link._editingGroupKey = originalKey;
  });
  state.editingReferenceGroupKey = referenceGroupKey(nextName);
  state.dirty.references = true;
  updateSaveState();
}

function beginEditReferenceGroup(key) {
  const groupKey = key || "ungrouped";
  state.editingReferenceGroupKey = groupKey;
  state.referenceLinks.forEach((link) => {
    if (referenceGroupKey(link.group_name) === groupKey) link._editingGroupKey = groupKey;
  });
  requestAnimationFrame(() => {
    refs.detailPane?.querySelector("[data-reference-group-field]")?.focus();
  });
}

function endEditReferenceGroup() {
  state.editingReferenceGroupKey = null;
  state.referenceLinks.forEach((link) => {
    delete link._editingGroupKey;
  });
}

function cssEscape(value) {
  return window.CSS?.escape
    ? window.CSS.escape(String(value || ""))
    : String(value || "").replace(/["\\]/g, "\\$&");
}

function focusEditingReference(id, field = "title") {
  requestAnimationFrame(() => {
    const selector = `[data-reference-id="${cssEscape(id)}"][data-reference-field="${cssEscape(field)}"]`;
    const input = refs.detailPane?.querySelector(selector);
    if (!input) return;
    input.focus();
    if (typeof input.select === "function") input.select();
  });
}

function referenceGroupKey(groupName) {
  const text = String(groupName || "").trim();
  return text || "ungrouped";
}

function nextReferenceGroupName() {
  const existing = new Set(state.referenceLinks.map((link) => normalizeSearchValue(link.group_name)).filter(Boolean));
  let index = 1;
  while (existing.has(normalizeSearchValue(`Group ${index}`))) index += 1;
  return `Group ${index}`;
}

function moveReferenceLink(id, delta) {
  const groups = referenceGroupBlocks();
  const group = groups.find((item) => item.links.some((link) => link.id === id));
  if (!group) return;
  const index = group.links.findIndex((link) => link.id === id);
  const nextIndex = index + delta;
  if (index < 0 || nextIndex < 0 || nextIndex >= group.links.length) return;

  const [link] = group.links.splice(index, 1);
  group.links.splice(nextIndex, 0, link);
  updateReferenceOrderFromGroups(groups);
}

function moveReferenceGroup(key, delta) {
  const groups = referenceGroupBlocks();
  const index = groups.findIndex((group) => group.key === referenceGroupKey(key));
  const nextIndex = index + delta;
  if (index < 0 || nextIndex < 0 || nextIndex >= groups.length) return;

  const [group] = groups.splice(index, 1);
  groups.splice(nextIndex, 0, group);
  updateReferenceOrderFromGroups(groups);
}

function referenceGroupBlocks() {
  const groups = [];
  for (const link of [...state.referenceLinks].map(normalizeReferenceLink).sort(sortReferenceLinks)) {
    const key = referenceGroupKey(link.group_name);
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, links: [] };
      groups.push(group);
    }
    group.links.push(link);
  }
  return groups;
}

function updateReferenceOrderFromGroups(groups) {
  const links = groups.flatMap((group) => group.links);
  state.referenceLinks = links.map((item, itemIndex) => ({
    ...item,
    sort_order: (itemIndex + 1) * 10,
  }));
  state.dirty.references = true;
  render();
  updateSaveState();
}

async function deleteReferenceLink(id) {
  const link = state.referenceLinks.find((item) => item.id === id);
  if (!link || !requireClient() || state.saving) return;
  if (!confirm(`Delete "${link.title || "reference"}"?`)) return;

  state.saving = true;
  updateSaveState();
  try {
    const { error } = await state.client.from("mindex_reference_links").delete().eq("id", id);
    if (error) throw error;
    state.referenceLinks = state.referenceLinks.filter((item) => item.id !== id);
    state.dirty.references = false;
    render();
    showToast("Reference deleted.");
  } catch (error) {
    showToast(referenceTableErrorMessage(error), "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

function referenceTableErrorMessage(error) {
  if (isUnavailableRelationError(error)) return "References table is missing.";
  if (/permission|policy|rls/i.test(error?.message || "")) return "Permission needed.";
  return error?.message || "Reference link update failed.";
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
  state.dirty.service = false;
  state.dirtyServiceTypeIds.clear();
  updateSaveState();
}

async function saveDirtyServiceTypes() {
  state.dirtyServiceTypeIds.clear();
}

async function saveSongMeta(song) {
  const metadata = normalizeSongMetadata(song.metadata);
  const hasPromotedColumns = hasPromotedSongMetadataColumns(song);
  const hasScriptureRefsColumn = hasSongColumn(song, "scripture_refs");
  const aggregatePraiseTypes = aggregateSongPraiseTypes(song);
  let useVersionTables = state.songVersionTablesSupported === true;

  if (useVersionTables) {
    try {
      await saveSongVersions(song);
    } catch (error) {
      if (!isUnavailableRelationError(error)) throw error;
      console.warn("Fell back to memo-backed song versions.", error);
      state.songVersionTablesSupported = false;
      useVersionTables = false;
    }
  }
  const useRelationTable = await saveSongRelationsIfAvailable(song);

  const payload = {
    title: cleanSongTitleForSave(song),
    subtitle: nullIfBlank(song.subtitle),
    original_title: nullIfBlank(song.original_title),
    hymn_no: nullIfBlank(song.hymn_no),
    ...(hasSongColumn(song, "praise_types") ? { praise_types: aggregatePraiseTypes } : {}),
    memo: serializeSongMemo(song, {
      omitPromotedMetadata: hasPromotedColumns,
      omitScripture: hasScriptureRefsColumn,
      omitVersions: useVersionTables,
      omitRelatedSongs: useRelationTable,
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

  const versions = song.versions || [];
  Object.assign(song, normalizeServerSong(data));
  if (useVersionTables) {
    song.versions = normalizeSongVersions(song, versions);
    song._memoHasVersions = false;
  }
}

async function saveSongVersions(song) {
  if (!song?.id || !state.client) return;

  await ensureCanonicalSongRow(song);
  if (!state.songVersionPraiseTypesSupported) {
    state.songVersionPraiseTypesSupported = await detectSongVersionPraiseTypesSupport();
  }

  const versions = normalizeSongVersions(song, song.versions?.length ? song.versions : [{
    id: createUuid(),
    name: "Default",
    is_primary: true,
    forms: [],
  }]);
  const previousSelectedVersionId = state.selectedVersionId;
  const versionIdMap = new Map();

  for (const version of versions) {
    const oldId = version.id;
    if (!isUuid(version.id)) version.id = createUuid();
    if (oldId && oldId !== version.id) versionIdMap.set(oldId, version.id);
    if (previousSelectedVersionId === oldId) state.selectedVersionId = version.id;
  }

  if (versionIdMap.size) {
    for (const form of state.forms) {
      if (versionIdMap.has(form.song_id)) form.song_id = versionIdMap.get(form.song_id);
    }
  }

  song.versions = versions;
  const versionOrders = assignStableVersionOrders(versions);
  const versionRows = versions.map((version, index) => ({
    id: version.id,
    canonical_song_id: song.id,
    source_song_id: song.id,
    version_order: versionOrders.get(version.id) || index + 1,
    version_label: version.raw_section_name || version.version_label || version.name || `Version ${index + 1}`,
    curated_version_name: normalizeGeneratedVersionName(version.name || `Version ${index + 1}`),
    version_review_status: versionNeedsFormReview(song, version) ? "pending" : "reviewed",
    deck_key: nullIfBlank(version.deck_key),
    raw_section_name: nullIfBlank(version.raw_section_name || version.version_label),
    subtitle: nullIfBlank(version.subtitle),
    original_title: nullIfBlank(version.original_title),
    hymn_no: nullIfBlank(version.hymn_no),
    ...(state.songVersionPraiseTypesSupported ? { praise_types: normalizePraiseTypes(version.praise_types) } : {}),
    lyric_signature: versionLyricSignature(version),
    source_count: Number(version.source_count) > 0 ? Number(version.source_count) : 1,
    is_primary: Boolean(version.is_primary) || index === 0,
  }));

  const existingVersions = await fetchExistingSongVersions(song.id);
  const existingCanonicalVersions = await fetchExistingCanonicalSongVersions(song.id);
  const existingVersionIds = existingVersions.map((version) => version.id);
  assignUniqueVersionLyricSignatures(versionRows, existingCanonicalVersions);

  const { error: versionError } = await state.client
    .from("mindex_song_versions")
    .upsert(versionRows, { onConflict: "id" });
  if (versionError) throw versionError;

  const nextVersionIds = new Set(versionRows.map((version) => version.id));
  const deletedVersionIds = existingVersionIds.filter((id) => !nextVersionIds.has(id));
  if (deletedVersionIds.length) {
    const { error: deleteError } = await state.client
      .from("mindex_song_versions")
      .delete()
      .in("id", deletedVersionIds);
    if (deleteError) throw deleteError;
  }

  const unitRows = [];
  const versionIds = versions.map((version) => version.id);
  for (const version of versions) {
    version.forms = normalizeForms(version.forms || []);
    version.forms.forEach((form, index) => {
      if (!isUuid(form.id)) form.id = createUuid();
      form.song_id = version.id;
      const label = displayLabel(form);
      unitRows.push({
        id: form.id,
        version_id: version.id,
        canonical_song_id: song.id,
        source_unit_id: null,
        unit_order: index + 1,
        unit_label: label || `u${index + 1}`,
        unit_kind: normalizeTitle(form.part_type || "Lyrics") || "lyrics",
        trigger: "",
        slide_numbers: [],
        text: form.lyrics || "",
        curated_unit_type: PART_TYPES.includes(form.part_type) ? form.part_type : "Lyrics",
        curated_unit_label: label,
        curated_order: index + 1,
        review_status: form.review_status && form.review_status !== "pending" ? form.review_status : "reviewed",
        review_note: null,
        reviewed_at: form.review_status === "reviewed" ? new Date().toISOString() : null,
      });
    });
  }

  const existingUnits = await fetchExistingVersionUnits(versionIds);
  if (unitRows.length) {
    const { error: unitError } = await state.client
      .from("mindex_version_units")
      .upsert(unitRows, { onConflict: "id" });
    if (unitError) throw unitError;
  }

  const nextUnitIds = new Set(unitRows.map((unit) => unit.id));
  const deletedUnitIds = existingUnits.map((unit) => unit.id).filter((id) => !nextUnitIds.has(id));
  if (deletedUnitIds.length) {
    const { error: deleteUnitError } = await state.client
      .from("mindex_version_units")
      .delete()
      .in("id", deletedUnitIds);
    if (deleteUnitError) throw deleteUnitError;
  }

  const selectedVersion = getSelectedVersion();
  if (selectedVersion) {
    state.forms = normalizeForms((selectedVersion.forms || []).map((form) => withLocalId({ ...form, song_id: selectedVersion.id })));
  }
}

async function ensureCanonicalSongRow(song) {
  const title = cleanSongTitleForSave(song) || "Untitled Song";
  const payload = {
    id: song.id,
    title,
    normalized_title: normalizeCanonicalTitle(title),
    subtitle: nullIfBlank(song.subtitle),
    original_title: nullIfBlank(song.original_title),
    hymn_no: nullIfBlank(song.hymn_no),
    source_count: 1,
  };
  const { error } = await state.client
    .from("mindex_canonical_songs")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

async function fetchExistingSongVersions(songId) {
  const { data, error } = await state.client
    .from("mindex_song_versions")
    .select("id")
    .eq("source_song_id", songId);
  if (error) throw error;
  return data || [];
}

async function fetchExistingCanonicalSongVersions(canonicalSongId) {
  const { data, error } = await state.client
    .from("mindex_song_versions")
    .select("id,lyric_signature")
    .eq("canonical_song_id", canonicalSongId);
  if (error) throw error;
  return data || [];
}

function assignUniqueVersionLyricSignatures(versionRows = [], existingRows = []) {
  const nextIds = new Set(versionRows.map((row) => row.id));
  const used = new Set(
    (existingRows || [])
      .filter((row) => row?.lyric_signature && !nextIds.has(row.id))
      .map((row) => row.lyric_signature),
  );

  versionRows.forEach((row, index) => {
    const baseSignature = row.lyric_signature || "mindex-0";
    let signature = baseSignature;
    if (used.has(signature)) {
      const source = String(row.source_song_id || row.id || index + 1).replace(/-/g, "").slice(0, 12) || index + 1;
      signature = `${baseSignature}:${source}:${index + 1}`;
      let suffix = 2;
      while (used.has(signature)) {
        signature = `${baseSignature}:${source}:${index + 1}:${suffix}`;
        suffix += 1;
      }
      row.lyric_signature = signature;
    }
    used.add(signature);
  });
}

async function fetchExistingVersionUnits(versionIds) {
  if (!versionIds.length) return [];
  const { data, error } = await state.client
    .from("mindex_version_units")
    .select("id")
    .in("version_id", versionIds);
  if (error) throw error;
  return data || [];
}

function assignStableVersionOrders(versions) {
  const orders = new Map();
  const used = new Set();
  let nextOrder = 1;

  for (const version of versions || []) {
    const explicitOrder = Number(version?.version_order) || 0;
    if (explicitOrder > 0 && !used.has(explicitOrder)) {
      orders.set(version.id, explicitOrder);
      used.add(explicitOrder);
      nextOrder = Math.max(nextOrder, explicitOrder + 1);
    }
  }

  for (const version of versions || []) {
    if (orders.has(version.id)) continue;
    while (used.has(nextOrder)) nextOrder += 1;
    orders.set(version.id, nextOrder);
    used.add(nextOrder);
    nextOrder += 1;
  }

  return orders;
}

async function saveSongRelationsIfAvailable(song) {
  if (!song?.id || !state.client) return false;
  if (!state.songRelationsSupported) {
    state.songRelationsSupported = await detectTableColumnSupport("mindex_song_relations", "source_song_id");
  }
  if (!state.songRelationsSupported) return false;

  const relatedIds = cleanList(song.related_song_ids).filter((id) => id && id !== song.id);
  const { error: deleteError } = await state.client
    .from("mindex_song_relations")
    .delete()
    .eq("source_song_id", song.id)
    .eq("relation_type", "related");
  if (deleteError) throw deleteError;

  if (!relatedIds.length) return true;
  const rows = relatedIds.map((relatedId) => ({
    source_song_id: song.id,
    related_song_id: relatedId,
    relation_type: "related",
    note: "",
  }));
  const { error } = await state.client
    .from("mindex_song_relations")
    .upsert(rows, { onConflict: "source_song_id,related_song_id,relation_type" });
  if (error) throw error;
  return true;
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
  const authAction = event.target.closest("[data-auth-action]");
  if (authAction?.dataset.authAction === "sign-out") {
    void signOutAdmin();
    return;
  }

  const calendarDetailTab = event.target.closest("[data-calendar-detail-tab]");
  if (calendarDetailTab) {
    const tab = calendarDetailTab.dataset.calendarDetailTab;
    if (CALENDAR_DETAIL_TABS.includes(tab) && state.calendarDetailTab !== tab) {
      state.calendarDetailTab = tab;
      renderCalendarView();
    }
    return;
  }

  const globalSongItem = event.target.closest("[data-global-song-id]");
  if (globalSongItem) {
    void openGlobalSongResult(globalSongItem.dataset.globalSongId);
    return;
  }

  const globalBookItem = event.target.closest("[data-global-book-code]");
  if (globalBookItem) {
    void openGlobalBookResult(globalBookItem.dataset.globalBookCode, {
      chapter: globalBookItem.dataset.globalChapter,
      verse: globalBookItem.dataset.globalVerse,
    });
    return;
  }

  const globalBibleTextItem = event.target.closest("[data-global-bible-text]");
  if (globalBibleTextItem) {
    void openGlobalBibleTextResult();
    return;
  }

  const globalServiceItem = event.target.closest("[data-global-service-id]");
  if (globalServiceItem) {
    void openGlobalServiceResult(globalServiceItem.dataset.globalServiceId);
    return;
  }

  const homeModule = event.target.closest("[data-home-module]");
  if (homeModule) {
    void switchModule(homeModule.dataset.homeModule);
    return;
  }

  const openSongBtn = event.target.closest("[data-open-song]");
  if (openSongBtn) {
    openGlobalSongResult(openSongBtn.dataset.openSong);
    return;
  }

  const openScriptureReferenceBtn = event.target.closest("[data-open-scripture-reference]");
  if (openScriptureReferenceBtn) {
    openGlobalBibleReference(openScriptureReferenceBtn.dataset.openScriptureReference);
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

  const newServiceBtn = event.target.closest("[data-new-service]");
  if (newServiceBtn) {
    startNewServiceForm(newServiceBtn.dataset.newService || state.selectedServiceTypeId);
    return;
  }

  const serviceTemplatesBtn = event.target.closest("[data-service-templates]");
  if (serviceTemplatesBtn) {
    if (!confirmDiscardServiceChanges()) return;
    state.selectedServiceTypeId = SERVICE_TEMPLATES_PANEL_ID;
    state.selectedServiceId = null;
    state.newServiceForm = null;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    return;
  }

  const serviceTemplateElementAction = event.target.closest("[data-service-template-element-action]");
  if (serviceTemplateElementAction) {
    runServiceTemplateElementAction(
      serviceTemplateElementAction.dataset.serviceTemplateElementAction,
      serviceTemplateElementAction.dataset.serviceTypeId,
      Number(serviceTemplateElementAction.dataset.stepIndex),
      Number(serviceTemplateElementAction.dataset.elementIndex),
    );
    return;
  }

  const serviceTemplateStepAction = event.target.closest("[data-service-template-step-action]");
  if (serviceTemplateStepAction) {
    runServiceTemplateStepAction(
      serviceTemplateStepAction.dataset.serviceTemplateStepAction,
      serviceTemplateStepAction.dataset.serviceTypeId,
      Number(serviceTemplateStepAction.dataset.stepIndex),
    );
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

  const serviceSetlistApply = event.target.closest("[data-service-setlist-apply]");
  if (serviceSetlistApply) {
    void applyServiceSetlistComposer(serviceSetlistApply.dataset.serviceSetlistApply);
    return;
  }

  const serviceSongCreate = event.target.closest("[data-service-song-create]");
  if (serviceSongCreate) {
    createPraiseSongFromServiceItem(Number(serviceSongCreate.dataset.serviceSongCreate));
    return;
  }

  const presenterAction = event.target.closest("[data-presenter-action]");
  if (presenterAction) {
    const presenterThumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
    if (presenterThumb && presenterAction.dataset.presenterAction === "jump") {
      event.preventDefault();
      if (event.detail > 1) {
        clearPresenterThumbClickTimer();
        return;
      }
      clearPresenterThumbClickTimer();
      const serviceId = presenterThumb.dataset.serviceId;
      const index = presenterThumb.dataset.presenterIndex;
      presenterThumbClickTimer = window.setTimeout(() => {
        presenterThumbClickTimer = null;
        runPresenterAction("jump", serviceId, { index });
      }, 300);
      return;
    }
    if (presenterAction.dataset.presenterAction === "detect-screens") {
      void requestPresenterScreens();
      return;
    }
    runPresenterAction(presenterAction.dataset.presenterAction, presenterAction.dataset.serviceId, {
      index: presenterAction.dataset.presenterIndex,
    });
    return;
  }

  const serviceMusicAction = event.target.closest("[data-service-music-action]");
  if (serviceMusicAction) {
    runServiceMusicAction(serviceMusicAction.dataset.serviceMusicAction);
    return;
  }

  const liveScriptureAction = event.target.closest("[data-live-scripture-action]");
  if (liveScriptureAction) {
    void runLiveScriptureAction(liveScriptureAction.dataset.liveScriptureAction, liveScriptureAction.dataset.serviceId);
    return;
  }

  const livePraiseAction = event.target.closest("[data-live-praise-action]");
  if (livePraiseAction) {
    void runLivePraiseAction(livePraiseAction.dataset.livePraiseAction, livePraiseAction.dataset.serviceId);
    return;
  }

  const orderSheetService = event.target.closest("[data-order-sheet-service]");
  if (orderSheetService) {
    state.selectedServiceId = orderSheetService.dataset.orderSheetService;
    renderOrderSheetsDetail();
    syncBrowserHistory();
    return;
  }

  const presenterJumpButton = event.target.closest("[data-presenter-jump-button]");
  if (presenterJumpButton) {
    const input = presenterJumpButton.closest(".svc-slide-counter")?.querySelector("[data-presenter-jump-input]");
    jumpPresenterToSlideInput(input);
    return;
  }

  const printOrderSheetButton = event.target.closest("[data-print-service-order]");
  if (printOrderSheetButton) {
    printServiceOrderSheet(printOrderSheetButton.dataset.printServiceOrder);
    return;
  }

  const referenceAction = event.target.closest("[data-reference-action]");
  if (referenceAction) {
    const action = referenceAction.dataset.referenceAction;
    const id = referenceAction.dataset.referenceId;
    if (action === "new") createReferenceLink();
    if (action === "new-group") createReferenceLink({ title: "New reference", groupName: nextReferenceGroupName() });
    if (action === "delete") deleteReferenceLink(id);
    if (action === "move-up") moveReferenceLink(id, -1);
    if (action === "move-down") moveReferenceLink(id, 1);
    if (action === "move-group-up") moveReferenceGroup(referenceAction.dataset.referenceGroupKey || "", -1);
    if (action === "move-group-down") moveReferenceGroup(referenceAction.dataset.referenceGroupKey || "", 1);
    if (action === "edit-group") {
      beginEditReferenceGroup(referenceAction.dataset.referenceGroupKey || "");
      renderReferencesDetail();
    }
    if (action === "done-group") {
      endEditReferenceGroup();
      renderReferencesDetail();
    }
    if (action === "edit") {
      state.editingReferenceId = id;
      renderReferencesDetail();
      focusEditingReference(id);
    }
    if (action === "done") {
      state.editingReferenceId = null;
      renderReferencesDetail();
    }
    if (action === "open") {
      const link = state.referenceLinks.find((item) => item.id === id);
      if (link?.url) window.open(link.url, "_blank", "noopener,noreferrer");
    }
    return;
  }

  const activityAction = event.target.closest("[data-activity-action]");
  if (activityAction) {
    runActivityAction(activityAction.dataset.activityAction, activityAction.dataset.activityEventId);
    return;
  }

  const copyOrderSheetButton = event.target.closest("[data-copy-service-order]");
  if (copyOrderSheetButton) {
    copyServiceOrderSheet(copyOrderSheetButton.dataset.copyServiceOrder);
    return;
  }

  const serviceTypeCard = event.target.closest("[data-select-service-type]");
  if (serviceTypeCard) {
    if (!confirmDiscardServiceChanges()) return;
    state.selectedServiceTypeId = worshipAppServiceTypeId(serviceTypeCard.dataset.selectServiceType);
    state.selectedServiceId = null;
    state.selectedServiceItemIndex = null;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    return;
  }

  const serviceDateCard = event.target.closest(".service-date-card[data-service-id], .service-week-card[data-service-id]");
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

  const copyBibleChapter = event.target.closest("[data-copy-bible-chapter]");
  if (copyBibleChapter) {
    copyBibleCurrentChapter();
    return;
  }

  const switchTranslation = event.target.closest("[data-switch-bible-translation]");
  if (switchTranslation) {
    switchBibleTranslation(switchTranslation.dataset.switchBibleTranslation);
    return;
  }

  const copyBibleVerse = event.target.closest("[data-copy-bible-verse]");
  if (copyBibleVerse) {
    const selectedText = getSelectedTextWithin(copyBibleVerse.closest("[data-bible-verse]"));
    if (selectedText) copyText(selectedText);
    else copyBibleVerses([Number(copyBibleVerse.dataset.copyBibleVerse)]);
    return;
  }

  const copyBibleSearchResult = event.target.closest("[data-copy-bible-search-result]");
  if (copyBibleSearchResult) {
    const selectedText = getSelectedTextWithin(copyBibleSearchResult.closest("[data-bible-search-result]"));
    if (selectedText) copyText(selectedText);
    else copyBibleSearchResultAt(Number(copyBibleSearchResult.dataset.copyBibleSearchResult));
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

  const versionTypeToggle = event.target.closest("[data-version-type-toggle]");
  if (versionTypeToggle) {
    toggleVersionPraiseType(versionTypeToggle.dataset.versionTypeToggle);
    return;
  }

  const formAction = event.target.closest("[data-form-action]");
  if (formAction) {
    event.preventDefault();
    event.stopPropagation();
    void runFormAction(formAction.dataset.formAction, Number(formAction.dataset.index));
    return;
  }

  const versionAction = event.target.closest("[data-version-action]");
  if (versionAction) {
    void runVersionAction(versionAction.dataset.versionAction);
    return;
  }

  const copyAction = event.target.closest("[data-copy-action]");
  if (copyAction) {
    runCopyAction(copyAction.dataset.copyAction, Number(copyAction.dataset.index), copyAction.dataset.versionId || "");
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
  const presenterJumpInput = event.target.closest("[data-presenter-jump-input]");
  if (presenterJumpInput) {
    if (event.key === "Enter") {
      event.preventDefault();
      jumpPresenterToSlideInput(presenterJumpInput);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      clearPresenterJumpDraft(presenterJumpInput.dataset.serviceId || state.presenter.serviceId);
      return;
    }
  }

  const liveScriptureInput = event.target.closest("[data-live-scripture-input]");
  if (liveScriptureInput) {
    if (event.key === "Enter") {
      event.preventDefault();
      void runLiveScriptureAction("show", liveScriptureInput.dataset.serviceId);
    } else if (event.key === "Escape") {
      event.preventDefault();
      void runLiveScriptureAction("clear", liveScriptureInput.dataset.serviceId);
    }
    return;
  }

  const livePraiseInput = event.target.closest("[data-live-praise-input]");
  if (livePraiseInput) {
    if (event.key === "Enter") {
      event.preventDefault();
      void runLivePraiseAction("show", livePraiseInput.dataset.serviceId);
    } else if (event.key === "Escape") {
      event.preventDefault();
      void runLivePraiseAction("clear", livePraiseInput.dataset.serviceId);
    }
    return;
  }

  const referenceField = event.target.closest("[data-reference-field]");
  if (referenceField && (event.key === "Enter" || event.key === "Escape")) {
    event.preventDefault();
    updateReferenceLinkField(referenceField);
    state.editingReferenceId = null;
    renderReferencesDetail();
    return;
  }

  const referenceGroupField = event.target.closest("[data-reference-group-field]");
  if (referenceGroupField && (event.key === "Enter" || event.key === "Escape")) {
    event.preventDefault();
    updateReferenceGroupName(referenceGroupField);
    endEditReferenceGroup();
    renderReferencesDetail();
    return;
  }

  if (event.key === "Enter" && event.target.matches("input[data-song-field], input[data-song-meta-field]")) {
    event.preventDefault();
    saveAll();
    return;
  }
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
  if (event.target.closest("[data-form-action], [data-version-action], [data-service-item-action], [data-service-template-step-action], [data-service-template-action], [data-presenter-action]")) {
    event.stopPropagation();
    return;
  }
  if (state.module !== "scripture" || event.button !== 0) return;
  if (event.target.closest("[data-copy-bible-verse], [data-copy-bible-search-result]") && getSelectedTextWithin(refs.detailPane)) {
    event.preventDefault();
    return;
  }
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
    clearNativeTextSelection();
  }
  state.bibleDragSelection = null;
}

function handleDetailInput(event) {
  const orderSheetCell = event.target.closest("[data-order-sheet-cell]");
  if (orderSheetCell) {
    updateOrderSheetDraftFromCell(orderSheetCell);
    return;
  }

  const authEmail = event.target.closest("[data-auth-email]");
  if (authEmail) {
    state.auth.email = authEmail.value;
    return;
  }

  const liveScriptureInput = event.target.closest("[data-live-scripture-input]");
  if (liveScriptureInput) {
    updateLiveScriptureDraft(liveScriptureInput.value);
    return;
  }

  const livePraiseInput = event.target.closest("[data-live-praise-input]");
  if (livePraiseInput) {
    updateLivePraiseDraft(livePraiseInput.value);
    return;
  }

  const serviceTemplateElementField = event.target.closest("[data-service-template-element-field]");
  if (serviceTemplateElementField) {
    updateServiceTemplateElementField(serviceTemplateElementField);
    return;
  }

  const serviceTemplateStepField = event.target.closest("[data-service-template-step-field]");
  if (serviceTemplateStepField) {
    updateServiceTemplateStepField(serviceTemplateStepField);
    return;
  }

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

  const referenceField = event.target.closest("[data-reference-field]");
  if (referenceField) {
    updateReferenceLinkField(referenceField);
    return;
  }

  const referenceGroupField = event.target.closest("[data-reference-group-field]");
  if (referenceGroupField) {
    updateReferenceGroupName(referenceGroupField);
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

function handleDetailSubmit(event) {
  const authForm = event.target.closest("[data-auth-form]");
  if (!authForm) return;
  event.preventDefault();
  const email = authForm.querySelector("[data-auth-email]")?.value || state.auth.email;
  void requestAdminSignIn(email);
}

function handleDetailChange(event) {
  const serviceMusicFile = event.target.closest("[data-service-music-file]");
  if (serviceMusicFile) {
    loadServiceMusicFile(serviceMusicFile.files?.[0]);
    serviceMusicFile.value = "";
    return;
  }

  const serviceTemplateStepField = event.target.closest("[data-service-template-step-field]");
  if (serviceTemplateStepField) {
    updateServiceTemplateStepField(serviceTemplateStepField);
    return;
  }

  const serviceTemplateElementField = event.target.closest("[data-service-template-element-field]");
  if (serviceTemplateElementField) {
    updateServiceTemplateElementField(serviceTemplateElementField);
    return;
  }

  const serviceMusicVolume = event.target.closest("[data-service-music-volume]");
  if (serviceMusicVolume) {
    setServiceMusicVolume(serviceMusicVolume.value);
    return;
  }

  const presenterJumpInput = event.target.closest("[data-presenter-jump-input]");
  if (presenterJumpInput) {
    return;
  }

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

  const referenceField = event.target.closest("[data-reference-field]");
  if (referenceField) {
    updateReferenceLinkField(referenceField);
    return;
  }

  const referenceGroupField = event.target.closest("[data-reference-group-field]");
  if (referenceGroupField) {
    updateReferenceGroupName(referenceGroupField);
    renderReferencesDetail();
    return;
  }

  const bibleReaderField = event.target.closest("[data-bible-reader-field]");
  if (bibleReaderField) {
    updateBibleReaderField(bibleReaderField);
    return;
  }

  const presenterScreenSelect = event.target.closest("[data-presenter-screen-select]");
  if (presenterScreenSelect) {
    state.presenter.selectedScreenId = presenterScreenSelect.value || null;
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

function switchBibleTranslation(translationId) {
  state.selectedBibleTranslationId = translationId || null;
  state.bibleBookVerses = [];
  persistUiState();
  syncBrowserHistory();
  if (isBibleTextSearchActive()) {
    runBibleTextSearch(state.bibleTextSearchQuery, { page: 0 });
    return;
  }
  loadBibleBookVerses();
}

function updateBibleReaderField(field) {
  const key = field.dataset.bibleReaderField;
  if (key === "copy_format") {
    state.bibleCopyReference = field.value !== "text_only";
    persistUiState();
    return;
  }
  if (key === "copy_reference") {
    state.bibleCopyReference = field.checked;
    persistUiState();
    return;
  }
  if (key === "translation") {
    switchBibleTranslation(field.value || null);
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
  if (state.selectedBibleVerses.length === 1 && getSelectedTextWithin(refs.detailPane)) return false;
  event.preventDefault();
  copyBibleVerses(state.selectedBibleVerses);
  return true;
}

function clearNativeTextSelection() {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed) return;
  selection.removeAllRanges();
}

function getSelectedTextWithin(root) {
  const selection = window.getSelection?.();
  if (!root || !selection || selection.isCollapsed || !selection.rangeCount) return "";
  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (!text) return "";

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    if (rangeBelongsToElement(range, root)) return text;
  }
  return "";
}

function rangeBelongsToElement(range, root) {
  const start = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentElement;
  const end = range.endContainer.nodeType === Node.ELEMENT_NODE
    ? range.endContainer
    : range.endContainer.parentElement;

  if (start && root.contains(start)) return true;
  if (end && root.contains(end)) return true;
  try {
    return range.intersectsNode(root);
  } catch {
    return false;
  }
}

function copyBibleVerses(verseNumbers) {
  const text = formatBibleVersesForCopy(verseNumbers);
  if (!text) return;
  copyText(text);
}

function copyBibleCurrentChapter() {
  const verseNumbers = state.bibleBookVerses
    .filter((verse) => Number(verse.chapter) === state.selectedBibleChapter)
    .map((verse) => Number(verse.verse))
    .filter((verse) => verse > 0);
  copyBibleVerses(verseNumbers);
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
  if (key === "scripture") {
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
  metadata[key] = field.value;
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

function toggleVersionPraiseType(type) {
  const song = getSelectedSong();
  const version = getSelectedVersion();
  if (!version) return;
  const types = normalizePraiseTypes(version.praise_types);
  const idx = types.indexOf(type);
  if (idx >= 0) types.splice(idx, 1);
  else types.push(type);
  version.praise_types = types;
  updateSongPraiseTypesFromVersions(song);
  state.dirty.song = true;
  updateSaveState();
  renderDetail();
}

function renderVersionPraiseTypeTags(version) {
  if (!version) return "";
  const active = versionEffectivePraiseTypes(getSelectedSong(), version);
  const labels = { hymn: "찬송가", ccm: "CCM", children: "어린이" };
  return `<div class="version-type-tags">${
    PRAISE_TYPES.map(type => `
      <button class="version-type-tag${active.includes(type) ? " on" : ""}" type="button"
              data-version-type-toggle="${escapeAttr(type)}">
        ${escapeHtml(labels[type])}
      </button>`).join("")
  }</div>`;
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
      praise_types: versionEffectivePraiseTypes(song, sourceVersion),
      forms: sourceForms.map(({ _localId, ...form }) => form),
    },
  ];
  updateSongPraiseTypesFromVersions(song);
  state.selectedVersionId = versionId;
  state.forms = normalizeForms(sourceForms);
  state.dirty.forms = true;
  state.dirty.song = true;
  persistUiState();
  renderDetail();
  updateSaveState();
}

async function runFormAction(action, index) {
  const form = state.forms[index];
  if (!form) return;
  const shouldAutoSave = action === "mark-reviewed";

  if (action === "up" && index > 0) {
    [state.forms[index - 1], state.forms[index]] = [state.forms[index], state.forms[index - 1]];
  }

  if (action === "down" && index < state.forms.length - 1) {
    [state.forms[index + 1], state.forms[index]] = [state.forms[index], state.forms[index + 1]];
  }

  if (action === "copy") {
    copyText(form.lyrics || "");
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
  if (shouldAutoSave) await saveAll();
}

async function runVersionAction(action) {
  if (action === "mark-all-reviewed") {
    for (const form of state.forms) {
      form.review_status = "reviewed";
      delete form.import_source;
    }
    state.forms = normalizeForms(state.forms);
    writeFormsToSelectedVersion();
    state.dirty.forms = true;
    renderSongList();
    renderDetail();
    updateSaveState();
    await saveAll();
  }
}

function updateServiceMetaField(field) {
  const service = state.services.find((s) => s.id === state.selectedServiceId);
  if (!service) return;
  const key = field.dataset.serviceMetaField;
  if (key === "title") {
    service.title = field.value;
  } else if (key === "leader") {
    if (!serviceUsesPraiseLeader(service.type_id)) {
      service.leader = "";
      return;
    }
    service.leader = field.value;
  } else if (key === "tags") {
    service.tags = field.value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  state.dirty.service = true;
  refreshPresenterForService(service.id);
  updateSaveState();
}

function updateNewServiceFormField(field) {
  if (!state.newServiceForm) return;
  const key = field.dataset.newServiceField;
  if (["date", "title", "leader", "tags"].includes(key)) {
    if (key === "leader" && !serviceUsesPraiseLeader(state.newServiceForm.type_id)) {
      state.newServiceForm[key] = "";
      return;
    }
    state.newServiceForm[key] = field.value;
  }
}

function updateServiceItemField(field) {
  const items = getServiceItems(state.selectedServiceId);
  const index = Number(field.dataset.serviceItemIndex);
  const item = items[index];
  if (!item) return;

  const key = field.dataset.serviceItemField;
  if (key === "label" || key === "assignee" || key === "raw_title") {
    item[key] = key === "raw_title" ? normalizeServiceItemRawTitle(item.label, field.value) : field.value;
    if (key === "raw_title") applyServiceSongSelection(item);
  }
  if (key === "memo_note" || key === "slide_overrides" || key === "form_hint" || key === "element_type" || key === "component_type" || key === "asset_name" || key === "asset_url") {
    const parsed = parseServiceItemMemo(item.memo);
    if (key === "memo_note") parsed.note = field.value;
    if (key === "slide_overrides") parsed.slides = parseServiceSlideOverrideInput(field.value);
    if (key === "form_hint") {
      parsed.formHint = field.value;
      parsed.formPreset = field.value
        ? normalizeServiceFormPreset(field.value, field.value, "manual")
        : null;
    }
    if (key === "element_type" || key === "component_type") {
      parsed.elementType = normalizeServiceElementType(field.value);
      parsed.componentType = parsed.elementType;
      const assetKind = serviceAssetKindForElementType(parsed.elementType);
      if (assetKind) parsed.asset = { ...normalizeServiceAsset(parsed.asset), kind: assetKind };
    }
    if (key === "asset_name" || key === "asset_url") {
      const asset = normalizeServiceAsset(parsed.asset);
      asset[key === "asset_name" ? "name" : "url"] = field.value;
      const elementType = serviceMemoElementType(parsed);
      const assetKind = serviceAssetKindForElementType(elementType);
      if (!asset.kind && assetKind) asset.kind = assetKind;
      parsed.asset = asset;
    }
    item.memo = serializeServiceItemMemo(parsed);
  }
  if (key === "label") {
    item.raw_title = normalizeServiceItemRawTitle(item.label, item.raw_title);
    applyServiceSongSelection(item);
  }
  applyServicePreparationDefaults(item, state.selectedServiceId);
  state.serviceItems[state.selectedServiceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  refreshServiceOrderSheetPreview();
  refreshPresenterForService(state.selectedServiceId);
  updateSaveState();
}

const SERVICE_ELEMENT_TYPES = new Set(["", ...Object.keys(SERVICE_ELEMENT_LABELS)]);
const SERVICE_ELEMENT_TYPE_ALIASES = {
  title_person: "title_person",
  title_assignee: "title_person",
  "title-person": "title_person",
  "제목/담당자": "title_person",
  "제목 / 담당자": "title_person",
  "제목담당자": "title_person",
  scripture_reading: "scripture_reading",
  "성경봉독": "scripture_reading",
  scripture_body: "scripture_body",
  "성경본문": "scripture_body",
  "성경 본문": "scripture_body",
  plain_text: "plain_text",
  "일반텍스트": "plain_text",
  "일반 텍스트": "plain_text",
  body: "body",
  "본문": "body",
  image: "image",
  "이미지": "image",
  video: "video",
  "동영상": "video",
  praise: "praise",
  "찬양": "praise",
  scripture: "scripture",
  "말씀": "scripture",
  blank: "blank",
  "빈화면": "blank",
  "빈 화면": "blank",
  ppt: "file",
  pptx: "file",
  powerpoint: "file",
  key: "file",
  keynote: "file",
  pdf: "file",
  score: "score",
  music_score: "score",
  sheet_music: "score",
  "악보": "score",
  live_praise: "live_praise",
  realtime_praise: "live_praise",
  live_song: "live_praise",
  realtime_song: "live_praise",
  "실시간찬양": "live_praise",
  "실시간 찬양": "live_praise",
  "실시간불러오기": "live_praise",
  "실시간 불러오기": "live_praise",
};
const SERVICE_ASSET_KIND_ALIASES = {
  ppt: "file",
  pptx: "file",
  powerpoint: "file",
  key: "file",
  keynote: "file",
  score: "score",
  music_score: "score",
  sheet_music: "score",
  "악보": "score",
};
const SERVICE_ASSET_KINDS = new Set(["", "file", "video", "pdf", "image", "score"]);

function serviceAssetKindForElementType(elementType) {
  return ["file", "video", "image", "score"].includes(elementType) ? elementType : "";
}

function normalizeServiceElementType(value) {
  const type = String(value || "").trim().toLowerCase();
  const normalized = SERVICE_ELEMENT_TYPE_ALIASES[type] || type;
  return SERVICE_ELEMENT_TYPES.has(normalized) ? normalized : "";
}

function serviceMemoElementType(memo = {}) {
  return normalizeServiceElementType(memo.elementType || memo.element_type || memo.componentType || memo.component_type);
}

function normalizeServiceAsset(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "", name: "", url: "" };
  const rawKind = String(value.kind || value.type || "").trim().toLowerCase();
  const kind = SERVICE_ASSET_KIND_ALIASES[rawKind] || rawKind;
  const slides = normalizeServiceAssetSlides(value.slides || value.images || value.urls || value.pages || value.files || value.items);
  return {
    kind: SERVICE_ASSET_KINDS.has(kind) ? kind : "",
    name: String(value.name || value.title || "").trim(),
    url: String(value.url || value.path || value.href || "").trim(),
    ...(slides.length ? { slides } : {}),
  };
}

function normalizeServiceAssetSlides(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((slide, index) => {
      if (typeof slide === "string") {
        const url = String(slide || "").trim();
        return url ? { url, name: "" } : null;
      }
      if (!slide || typeof slide !== "object") return null;
      const url = String(slide.url || slide.path || slide.href || slide.src || "").trim();
      if (!url) return null;
      return {
        url,
        name: String(slide.name || slide.title || slide.label || "").trim(),
        order: Number(slide.order || slide.sort || slide.index || index + 1) || index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function applyServicePreparationDefaults(item, serviceId = state.selectedServiceId) {
  const parsed = parseServiceItemMemo(item?.memo);
  if (!isServicePreparationItem(item, parsed)) return item;
  const elementType = servicePreparationElementTypeForServiceId(serviceId);
  const asset = normalizeServiceAsset(parsed.asset);
  asset.kind = elementType;
  item.label = "준비";
  item.raw_title = "준비";
  parsed.elementType = elementType;
  parsed.componentType = elementType;
  parsed.asset = asset;
  item.memo = serializeServiceItemMemo(parsed);
  return item;
}

function isLegacyImportArtifactName(value) {
  const name = presenterMediaFileName(value);
  return /^(?:Elem|Element|Section|Slide)_\d*[_-]/i.test(name) || /^(?:Elem|Element|Section|Slide)_/i.test(name);
}

function hasServiceAsset(asset) {
  return Boolean(asset && (asset.kind || asset.name || asset.url || asset.slides?.length));
}

function firstDefinedValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstNonBlankString(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeOrderSheetBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "hidden", "hide", "skip", "exclude", "제외", "숨김"].includes(text)) return true;
  if (["false", "0", "no", "n", "off", "show", "include", "visible", "표시", "포함"].includes(text)) return false;
  return null;
}

function parseObjectPayload(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || (!raw.startsWith("{") && !raw.startsWith("["))) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeServiceOrderSheetPayload(value) {
  const source = parseObjectPayload(value);
  if (!source) return null;
  const order = firstNonBlankString(
    source.order,
    source.label,
    source.title,
    source.name,
    source.row,
    source.rowLabel,
    source.row_label,
    source.orderLabel,
    source.order_label,
  );
  const assignee = firstNonBlankString(source.assignee, source.owner, source.person, source.leader, source["담당"]);
  const note = firstNonBlankString(source.note, source.memo, source.detail, source.details, source.reference, source.text);
  const group = firstNonBlankString(source.group, source.groupKey, source.group_key, source.section, source.sectionKey, source.section_key);
  const role = firstNonBlankString(source.role, source.type, source.kind);
  const hidden = normalizeOrderSheetBoolean(firstDefinedValue(source.hidden, source.hide, source.skip, source.exclude, source.excluded));
  const include = normalizeOrderSheetBoolean(firstDefinedValue(source.include, source.included, source.visible));
  const payload = {};
  if (order) payload.order = order;
  if (assignee) payload.assignee = assignee;
  if (note) payload.note = note;
  if (group) payload.group = group;
  if (role) payload.role = role;
  if (hidden === true || include === false) payload.hidden = true;
  return Object.keys(payload).length ? payload : null;
}

function mergeServiceOrderSheetPayloads(...payloads) {
  const merged = {};
  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") continue;
    Object.assign(merged, payload);
  }
  return Object.keys(merged).length ? merged : null;
}

function hasServiceOrderSheetPayload(payload) {
  return Boolean(payload && typeof payload === "object" && Object.keys(payload).length);
}

function normalizeServiceFormPreset(value, fallbackHint = "", fallbackStrength = "") {
  const source = parseObjectPayload(value);
  const forms = Array.isArray(value)
    ? normalizeServiceFormPresetForms(value)
    : typeof value === "string"
      ? normalizeServiceFormPresetForms(value)
      : source
        ? normalizeServiceFormPresetForms(source.forms || source.form || source.sequence || source.labels || source.items)
        : [];
  const hint = firstNonBlankString(
    source?.hint,
    source?.formHint,
    source?.form_hint,
    source?.label,
    fallbackHint,
    forms.join("-"),
  );
  const strength = firstNonBlankString(source?.strength, source?.defaultStrength, source?.default_strength, fallbackStrength);
  const preset = {};
  if (forms.length) preset.forms = forms;
  if (hint) preset.hint = hint;
  if (strength) preset.strength = strength;
  return Object.keys(preset).length ? preset : null;
}

function normalizeServiceFormPresetForms(value) {
  if (Array.isArray(value)) return cleanList(value);
  return String(value || "")
    .split(/\s*(?:,|[-+>→])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeServiceFormPresetRules(value) {
  const source = Array.isArray(value) ? value : parseObjectPayload(value);
  if (!Array.isArray(source)) return [];
  return source
    .map((rule) => {
      const parsedRule = parseObjectPayload(rule);
      if (!parsedRule) return null;
      const preset = normalizeServiceFormPreset(
        parsedRule.formPreset || parsedRule.form_preset || parsedRule.preset,
        parsedRule.formHint || parsedRule.form_hint,
        parsedRule.strength || parsedRule.defaultStrength || parsedRule.default_strength,
      );
      const when = parseObjectPayload(parsedRule.when || parsedRule.condition || parsedRule.conditions) || {};
      return preset ? { when, formPreset: preset } : null;
    })
    .filter(Boolean);
}

function pickServiceOrderSheetFields(item = {}) {
  const orderSheet = mergeServiceOrderSheetPayloads(
    normalizeServiceOrderSheetPayload(item.order_sheet),
    normalizeServiceOrderSheetPayload(item.orderSheet),
    normalizeServiceOrderSheetPayload(item.order_sheet_row),
    normalizeServiceOrderSheetPayload(item.orderSheetRow),
  );
  return {
    ...(orderSheet ? { order_sheet: orderSheet } : {}),
    order_sheet_label: firstNonBlankString(item.order_sheet_label, item.orderSheetLabel, item.order_sheet_order, item.orderSheetOrder),
    order_sheet_assignee: firstNonBlankString(item.order_sheet_assignee, item.orderSheetAssignee),
    order_sheet_note: firstNonBlankString(item.order_sheet_note, item.orderSheetNote),
    order_sheet_group: firstNonBlankString(item.order_sheet_group, item.orderSheetGroup),
    order_sheet_role: firstNonBlankString(item.order_sheet_role, item.orderSheetRole, item.order_sheet_type, item.orderSheetType),
    order_sheet_hidden: normalizeOrderSheetBoolean(firstDefinedValue(item.order_sheet_hidden, item.orderSheetHidden, item.order_sheet_skip, item.orderSheetSkip)) === true,
  };
}

function emptyServiceItemMemo(rawNote = "") {
  return {
    note: String(rawNote || "").trim(),
    slides: [],
    formHint: "",
    formPreset: null,
    formPresetRules: [],
    templateKey: "",
    templateVariant: "",
    elementType: "",
    componentType: "",
    outputMode: "",
    asset: { kind: "", name: "", url: "" },
    orderSheet: null,
  };
}

function parseServiceItemMemo(value) {
  const raw = String(value || "").trim();
  if (!raw) return emptyServiceItemMemo();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const elementType = serviceMemoElementType({ ...parsed, elementType: parsed.elementType || parsed.element_type || parsed.type });
      const asset = normalizeServiceAsset(parsed.asset || parsed.file || parsed.media);
      const orderSheet = mergeServiceOrderSheetPayloads(
        normalizeServiceOrderSheetPayload(parsed.orderSheet),
        normalizeServiceOrderSheetPayload(parsed.order_sheet),
        normalizeServiceOrderSheetPayload(parsed.orderSheetRow),
        normalizeServiceOrderSheetPayload(parsed.order_sheet_row),
        normalizeServiceOrderSheetPayload({
          order: firstNonBlankString(parsed.orderSheetLabel, parsed.order_sheet_label, parsed.orderSheetOrder, parsed.order_sheet_order),
          assignee: firstNonBlankString(parsed.orderSheetAssignee, parsed.order_sheet_assignee),
          note: firstNonBlankString(parsed.orderSheetNote, parsed.order_sheet_note),
          group: firstNonBlankString(parsed.orderSheetGroup, parsed.order_sheet_group),
          role: firstNonBlankString(parsed.orderSheetRole, parsed.order_sheet_role, parsed.orderSheetType, parsed.order_sheet_type),
          hidden: firstDefinedValue(parsed.orderSheetHidden, parsed.order_sheet_hidden, parsed.orderSheetSkip, parsed.order_sheet_skip),
        }),
      );
      return {
        note: String(parsed.note || parsed.memo || "").trim(),
        slides: Array.isArray(parsed.slides)
          ? parsed.slides.map((slide) => String(slide || "").trim()).filter(Boolean)
          : [],
        formHint: String(parsed.formHint || parsed.form_hint || parsed.forms || "").trim(),
        formPreset: normalizeServiceFormPreset(parsed.formPreset || parsed.form_preset, parsed.formHint || parsed.form_hint),
        formPresetRules: normalizeServiceFormPresetRules(parsed.formPresetRules || parsed.form_preset_rules),
        templateKey: String(parsed.templateKey || parsed.template_key || "").trim(),
        templateVariant: String(parsed.templateVariant || parsed.template_variant || "").trim(),
        elementType,
        componentType: elementType,
        outputMode: normalizeServiceOutputMode(parsed.outputMode || parsed.output_mode || parsed.renderMode || parsed.render_mode),
        asset,
        orderSheet,
      };
    }
  } catch {
    // Plain-text notes from older rows stay valid.
  }
  return emptyServiceItemMemo(raw);
}

function parseServiceSlideOverrideInput(value) {
  return String(value || "")
    .split(/\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function formatServiceSlideOverrideInput(memo) {
  return parseServiceItemMemo(memo).slides.join("\n---\n");
}

function serializeServiceItemMemo(value = {}) {
  const note = String(value.note || "").trim();
  const slides = Array.isArray(value.slides)
    ? value.slides.map((slide) => String(slide || "").trim()).filter(Boolean)
    : [];
  const formHint = String(value.formHint || value.form_hint || "").trim();
  const formPreset = normalizeServiceFormPreset(value.formPreset || value.form_preset, formHint);
  const formPresetRules = normalizeServiceFormPresetRules(value.formPresetRules || value.form_preset_rules);
  const templateKey = String(value.templateKey || value.template_key || "").trim();
  const templateVariant = String(value.templateVariant || value.template_variant || "").trim();
  const elementType = serviceMemoElementType(value);
  const outputMode = normalizeServiceOutputMode(value.outputMode || value.output_mode || value.renderMode || value.render_mode);
  const asset = normalizeServiceAsset(value.asset);
  const defaultAssetKind = serviceAssetKindForElementType(elementType);
  if (!asset.kind && defaultAssetKind && hasServiceAsset(asset)) asset.kind = defaultAssetKind;
  const orderSheet = mergeServiceOrderSheetPayloads(
    normalizeServiceOrderSheetPayload(value.orderSheet),
    normalizeServiceOrderSheetPayload(value.order_sheet),
  );
  if (!slides.length && !formHint && !formPreset && !formPresetRules.length && !templateKey && !templateVariant && !elementType && !outputMode && !hasServiceAsset(asset) && !hasServiceOrderSheetPayload(orderSheet)) return note;
  const payload = { note };
  if (formHint) payload.formHint = formHint;
  if (formPreset) payload.formPreset = formPreset;
  if (formPresetRules.length) payload.formPresetRules = formPresetRules;
  if (templateKey) payload.templateKey = templateKey;
  if (templateVariant) payload.templateVariant = templateVariant;
  if (elementType) payload.elementType = elementType;
  if (outputMode) payload.outputMode = outputMode;
  if (hasServiceAsset(asset)) payload.asset = asset;
  if (hasServiceOrderSheetPayload(orderSheet)) payload.orderSheet = orderSheet;
  if (slides.length) payload.slides = slides;
  return JSON.stringify(payload);
}

function normalizeServiceOutputMode(value) {
  const mode = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = {
    score: "score",
    music_score: "score",
    sheet_music: "score",
    "악보": "score",
    lyrics: "lyrics",
    lyric: "lyrics",
    "가사": "lyrics",
  };
  return aliases[mode] || "";
}

function applyServiceSongSelection(item) {
  applyServiceSongSelectionWithService(item, state.services.find((service) => service.id === state.selectedServiceId));
}

async function createPraiseSongFromServiceItem(index) {
  if (!requireClient() || !Number.isFinite(index)) return;
  const serviceId = state.selectedServiceId;
  const service = state.services.find((svc) => svc.id === serviceId);
  const items = getServiceItems(serviceId);
  const item = items[index];
  if (!service || !item) return;
  const title = stripHymnNo(String(item.raw_title || "").trim()).title.trim();
  if (!title) return;

  const existing = findServicePraiseSong(title);
  if (existing) {
    item.song_id = existing.id;
    item.version_id = getServiceItemVersion(existing, item, service)?.id || getDefaultVersionId(existing) || null;
    state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
    state.dirty.service = true;
    renderServiceDetail();
    updateSaveState();
    showToast("기존 Praise 곡에 연결했습니다.");
    return;
  }

  const praiseType = service?.type_id === "children" ? "children" : "ccm";
  const defaultVersion = {
    id: createUuid(),
    name: "Default",
    is_primary: true,
    praise_types: [praiseType],
    forms: [],
  };
  const useVersionTables = state.songVersionTablesSupported === true;
  const payload = {
    title,
    praise_types: [praiseType],
    memo: useVersionTables ? null : serializeSongMemo({ versions: [defaultVersion] }),
  };

  try {
    const { data, error } = await state.client
      .from("mindex_songs")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    const song = normalizeServerSong(data);
    if (useVersionTables) {
      song.versions = normalizeSongVersions(song, [defaultVersion]);
      try {
        await saveSongVersions(song);
      } catch (saveError) {
        state.songVersionTablesSupported = false;
        await state.client
          .from("mindex_songs")
          .update({ memo: serializeSongMemo(song) })
          .eq("id", song.id);
        console.warn("Fell back to memo-backed song versions.", saveError);
      }
    }
    state.songs = [song, ...state.songs].sort(sortSongs);
    item.song_id = song.id;
    item.version_id = getDefaultVersionId(song);
    state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
    state.dirty.service = true;
    renderServiceDetail();
    updateSaveState();
    showToast("Praise에 빈 곡을 만들었습니다. 가사를 추가해 주세요.", "info");
  } catch (error) {
    showToast(error.message || "Praise 곡 추가 실패.", "error");
  }
}

function getActiveServiceTypeId() {
  return state.services.find((service) => service.id === state.selectedServiceId)?.type_id
    || state.selectedServiceTypeId
    || null;
}

function updateServiceDefaultItemField(field) {
  const typeId = getActiveServiceTypeId();
  const index = Number(field.dataset.serviceDefaultIndex);
  const key = field.dataset.serviceDefaultField;
  if (!typeId || !Number.isFinite(index) || !["label", "assignee", "raw_title"].includes(key)) return;

  const items = getServiceDefaultItems(typeId);
  if (!items[index]) return;
  items[index][key] = key === "raw_title" ? normalizeServiceItemRawTitle(items[index].label, field.value) : field.value;
  if (key === "label") items[index].raw_title = normalizeServiceItemRawTitle(items[index].label, items[index].raw_title);
  setServiceDefaultItems(typeId, normalizeServiceDefaultItemsInCurrentOrder(items));
  refreshServiceOrderSheetPreview();
  refreshPresenterForServiceType(typeId);
}

function runServiceItemAction(action, index, label = "", title = "") {
  const serviceId = state.selectedServiceId;
  if (!serviceId) return;
  const typeId = state.services.find((service) => service.id === serviceId)?.type_id || state.selectedServiceTypeId;
  const items = normalizeServiceItems(getServiceItems(serviceId));
  let nextSelectedIndex = Number.isInteger(Number(state.selectedServiceItemIndex)) ? Number(state.selectedServiceItemIndex) : index;

  if (action === "add") {
    const nextItem = normalizeServiceItem({
      service_id: serviceId,
      sort_order: items.length + 1,
      label,
      raw_title: title,
    }, items.length);
    applyServiceSongSelection(nextItem);
    insertServiceItemInTemplateOrder(items, nextItem, typeId);
    nextSelectedIndex = items.findIndex((candidate) => candidate.id === nextItem.id);
  }

  const item = items[index];
  if (action === "up" && item && index > 0) {
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    nextSelectedIndex = index - 1;
  }
  if (action === "down" && item && index < items.length - 1) {
    [items[index + 1], items[index]] = [items[index], items[index + 1]];
    nextSelectedIndex = index + 1;
  }
  if (action === "duplicate" && item) {
    items.splice(index + 1, 0, normalizeServiceItem({ ...item, id: createLocalId() }, index + 1));
    nextSelectedIndex = index + 1;
  }
  if (action === "delete" && item) {
    items.splice(index, 1);
    nextSelectedIndex = Math.min(index, items.length - 1);
  }

  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.selectedServiceItemIndex = Number.isFinite(nextSelectedIndex) && nextSelectedIndex >= 0 ? nextSelectedIndex : null;
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderServiceDetail();
  renderServiceList();
  updateSaveState();
}

async function applyServiceSetlistComposer(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  const root = [...(refs.detailPane?.querySelectorAll("[data-service-setlist]") || [])]
    .find((node) => node.dataset.serviceSetlist === serviceId);
  if (!root) return;

  const label = root.querySelector("[data-service-setlist-label]")?.value?.trim() || "찬양";
  const assignee = root.querySelector("[data-service-setlist-assignee]")?.value?.trim() || "";
  const lines = root.querySelector("[data-service-setlist-lines]")?.value || "";
  const titles = parseServiceSetlistLines(lines);
  if (!titles.length) {
    showToast("콘티에 곡명을 입력해 주세요.", "error");
    return;
  }

  const service = state.services.find((svc) => svc.id === serviceId);
  const items = normalizeServiceItems(getServiceItems(serviceId));
  if (!state.songs.length && state.client) {
    await loadSongs();
  }
  let matchedCount = 0;
  const nextItems = titles.map((title, offset) => {
    const item = normalizeServiceItem({
      service_id: serviceId,
      sort_order: items.length + offset + 1,
      label,
      assignee,
      raw_title: title,
    }, items.length + offset);
    applyServiceSongSelectionWithService(item, service);
    if (item.song_id) matchedCount += 1;
    return item;
  });

  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder([...items, ...nextItems]);
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderServiceDetail();
  updateSaveState();
  showToast(`콘티 ${titles.length}곡 추가 · ${matchedCount}곡 DB 연결`);
}

function parseServiceSetlistLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s+\+\s+|\s*\+\s*/))
    .map(cleanServiceSetlistTitle)
    .filter(Boolean);
}

function cleanServiceSetlistTitle(value) {
  return String(value || "")
    .replace(/^\s*(?:\d+[\).]|[-*•])\s*/, "")
    .replace(/^\s*(?:찬양|찬송|특송|결단찬양|봉헌찬양|파송찬양)\s*[/：:]\s*/u, "")
    .trim();
}

function applyServiceSongSelectionWithService(item, service = null) {
  if (!item || !isSongServiceLabel(item.label)) {
    if (item) {
      item.song_id = null;
      item.version_id = null;
    }
    return;
  }
  const song = findServicePraiseSong(item.raw_title);
  if (!song) return;
  item.song_id = song.id;
  const version = getServiceItemVersion(song, item, service || state.services.find((svc) => svc.id === state.selectedServiceId));
  item.version_id = version?.id || getDefaultVersionId(song) || null;
}

function runServiceDefaultItemAction(action, index) {
  const typeId = getActiveServiceTypeId();
  if (!typeId) return;

  const items = getServiceDefaultItems(typeId);
  const item = items[index];
  if (!item && action !== "add") return;

  if (action === "add") {
    insertServiceItemInTemplateOrder(items, normalizeServiceDefaultItem({ label: "", raw_title: "" }, items.length), typeId);
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

  setServiceDefaultItems(typeId, normalizeServiceDefaultItemsInCurrentOrder(items));
  refreshPresenterForServiceType(typeId);
  renderServiceDetail();
}

function insertServiceItemInTemplateOrder(items, item, typeId) {
  if (!String(item?.label || item?.raw_title || "").trim()) {
    items.push(item);
    return;
  }
  const rank = serviceItemTemplateRank(typeId, item);
  const insertIndex = items.findIndex((candidate) => serviceItemTemplateRank(typeId, candidate) > rank);
  items.splice(insertIndex === -1 ? items.length : insertIndex, 0, item);
}

function startNewServiceForm(typeId = state.selectedServiceTypeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  if (!appTypeId || appTypeId === SERVICE_TEMPLATES_PANEL_ID) return;
  state.selectedServiceTypeId = appTypeId;
  state.selectedServiceId = null;
  state.newServiceForm = {
    type_id: appTypeId,
    date: toLocalDateStr(new Date()),
    title: "",
    leader: defaultServicePraiseLeader(appTypeId),
    tags: "",
  };
  renderServiceList();
  renderServiceDetail();
}

function defaultServicePraiseLeader(typeId) {
  return String(typeId || "") === "friday" ? "이재희 청년" : "";
}

function canonicalWorshipServiceTypeId(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return serviceTypeById(appTypeId)?._worshipId || typeId || "";
}

function buildWorshipServiceScaffold(serviceId, typeId) {
  const steps = serviceOrderTemplate(typeId).map((step, index) => normalizeServiceTemplateStep(step, index, typeId));
  const sections = [];
  const elements = [];
  steps.forEach((step, index) => {
    const label = String(step.label || step.name || "").trim();
    if (!label) return;
    const sectionId = createUuid();
    const ready = isReadyServiceTemplateLabel(label);
    const hiddenOrderSheet = isOrderSheetHiddenServiceTemplateLabel(label);
    const elementSteps = worshipTemplateElementSteps(step, label);
    sections.push({
      id: sectionId,
      service_id: serviceId,
      sort_order: index,
      section_key: worshipTemplateSectionKey(label, index, step),
      title: label,
      person: "",
      source_kind: "mindex",
      source_ref: { label, template: true, placeholder: true },
      config: ready ? { presenterRole: "ready" } : hiddenOrderSheet ? {} : { orderSheetPlaceholder: true },
    });
    elementSteps.forEach((elementStep, elementIndex) => {
      const elementLabel = String(elementStep.label || elementStep.name || label).trim() || label;
      const hiddenElementOrderSheet = isOrderSheetHiddenServiceTemplateLabel(elementLabel);
      const elementType = ready ? servicePreparationElementTypeForType(typeId) : worshipTemplateElementType(elementStep, elementLabel);
      const orderSheet = ready || hiddenElementOrderSheet
        ? { hidden: true }
        : normalizeServiceOrderSheetPayload(elementStep.orderSheet || elementStep.order_sheet) || { order: elementLabel };
      const defaultStrength = String(elementStep.defaultStrength || elementStep.default_strength || "").trim();
      const formPreset = normalizeServiceFormPreset(
        elementStep.formPreset || elementStep.form_preset,
        elementStep.formHint || elementStep.form_hint,
        defaultStrength,
      );
      const formPresetRules = normalizeServiceFormPresetRules(elementStep.formPresetRules || elementStep.form_preset_rules);
      const formHint = String(elementStep.formHint || elementStep.form_hint || formPreset?.hint || "").trim();
      const outputMode = normalizeServiceOutputMode(elementStep.outputMode || elementStep.output_mode || elementStep.renderMode || elementStep.render_mode);
      const asset = worshipTemplateElementAsset(elementStep, elementLabel);
      elements.push({
        id: createUuid(),
        section_id: sectionId,
        sort_order: elementIndex + 1,
        element_type: elementType,
        title: ready ? "준비" : String(elementStep.default_text || elementStep.title || "").trim(),
        person: "",
        body: "",
        scripture_reference: "",
        source_kind: "mindex",
        source_ref: { label: elementLabel, template: true, placeholder: !ready },
        config: {
          orderSheet,
          ...(formHint ? { formHint } : {}),
          ...(formPreset ? { formPreset } : {}),
          ...(formPresetRules.length ? { formPresetRules } : {}),
          ...(defaultStrength ? { defaultStrength } : {}),
          ...(outputMode ? { outputMode } : {}),
          ...(asset.url ? { asset: { ...asset, kind: asset.kind || elementType } } : {}),
          ...(ready ? { presenterRole: "ready" } : hiddenElementOrderSheet ? {} : { orderSheetPlaceholder: true }),
        },
      });
    });
  });
  return { sections, elements };
}

function worshipTemplateElementSteps(step = {}, label = "") {
  const elements = Array.isArray(step.elements) ? step.elements : [];
  if (elements.length) return elements.filter((element) => element && typeof element === "object");
  return [{
    ...step,
    label,
    orderSheet: step.orderSheet || step.order_sheet || (isOrderSheetHiddenServiceTemplateLabel(label) ? { hidden: true } : { order: label }),
  }];
}

function isReadyServiceTemplateLabel(label) {
  const compact = compactSearchValue(label);
  return compact === "준비" || compact === "예배준비" || compact === "예배준비영상";
}

function isOrderSheetHiddenServiceTemplateLabel(label) {
  const compact = compactSearchValue(label);
  return isReadyServiceTemplateLabel(label) || compact === "마무리" || compact === "마침";
}

function worshipTemplateElementAsset(step = {}, label = "") {
  const asset = normalizeServiceAsset(step.asset || step.media || step.file);
  if (asset.url) return asset;
  const compact = compactSearchValue(label);
  if (compact === "마무리" || compact === "마침") {
    return {
      kind: "image",
      name: "마무리",
      url: "assets/worship-templates/public-closing.png",
    };
  }
  return asset;
}

function worshipTemplateSectionKey(label, index = 0, step = {}) {
  const explicit = String(step.sectionKey || step.section_key || "").trim();
  if (explicit) return explicit;
  const compact = compactSearchValue(label);
  const known = {
    "준비": "ready",
    "예배준비": "ready",
    "예배준비영상": "ready",
    "찬양": "praise",
    "경배와찬양": "praise",
    "찬송": "praise",
    "기도": "prayer",
    "대표기도": "prayer",
    "성경봉독": "scripture_reading",
    "성경": "scripture_reading",
    "특송": "special_song",
    "설교": "sermon",
    "말씀": "sermon",
    "말씀선포": "sermon",
    "결단": "response_song",
    "결단찬양": "response_song",
    "결단기도": "response_prayer",
    "결단의기도": "response_prayer",
    "월삭기도": "monthly_prayer",
    "기도회": "prayer_meeting",
    "통성기도": "prayer_meeting",
    "자율기도": "prayer_meeting",
    "봉헌": "offering",
    "봉헌기도": "offering_prayer",
    "교회소식": "announcements",
    "광고": "announcements",
    "송영": "closing_song",
    "폐회찬송": "closing_hymn",
    "축도": "benediction",
    "마무리": "closing_visual",
    "마침": "closing_visual",
    "주기도문": "lords_prayer",
    "사도신경": "creed",
    "참회기도": "confession",
  };
  return known[compact] || `section_${index + 1}`;
}

function worshipTemplateElementType(step = {}, label = "") {
  const explicit = normalizeWorshipElementType(step.elementType || step.element_type || step.componentType || step.component_type);
  if (explicit) return explicit;
  const compact = compactSearchValue(label);
  if (isReadyServiceTemplateLabel(label)) return "video";
  if (/찬양|찬송|송영/.test(compact) || /^(결단|봉헌|파송)찬양$/.test(compact) || compact === "폐회찬송") return "praise";
  if (/성경봉독|성경/.test(compact)) return "scripture_reading";
  if (/설교|말씀/.test(compact)) return "body";
  if (/기도|특송|축도|사도신경/.test(compact)) return "title_person";
  if (/마무리|마침/.test(compact)) return "image";
  if (/교회소식|광고/.test(compact)) return "plain_text";
  return "plain_text";
}

function normalizeWorshipElementType(value) {
  const raw = String(value || "").trim().toLowerCase();
  const canonical = raw.replace(/-/g, "_");
  if (["title_person", "plain_text", "body", "scripture_reading", "scripture_body", "live_praise", "editable", "ppt"].includes(canonical)) return canonical;
  const type = normalizeServiceElementType(value);
  if (type === "template") return "plain_text";
  if (type === "score") return "score";
  if (type === "file") return "ppt";
  if (type === "scripture") return "scripture_reading";
  return ["blank", "plain_text", "title_person", "body", "praise", "live_praise", "scripture_reading", "scripture_body", "image", "video", "editable", "ppt", "pdf", "score"].includes(type)
    ? type
    : "";
}

function runCopyAction(action, index, versionId = "") {
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
    copyText(formatFullLyrics(getFormsForVersionId(versionId)));
    return;
  }

  if (action === "download-freeshow") {
    try {
      const song = getSelectedSong();
      const version = getVersionById(versionId) || getSelectedVersion();
      downloadTextFile(formatFreeShowShowJson(song, version, getFormsForVersionId(versionId)), getShowFileName(song, version), "application/json");
    } catch (error) {
      showToast(error.message || "FreeShow file export failed.", "error");
    }
    return;
  }

  if (action === "download-xml") {
    try {
      const song = getSelectedSong();
      const version = getVersionById(versionId) || getSelectedVersion();
      downloadTextFile(formatSongXml(song, version, getFormsForVersionId(versionId)), getXmlFileName(song, version), "application/xml");
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

function isCalendarInlineFeast(row) {
  if (row?._generatedFeast) return true;
  if (!row?.date) return false;
  const day = parseLocalDate(row.date).getDay();
  if (day === 0) return false;
  const serviceFields = cleanList([
    row.preacher,
    row.nursery_prayer,
    row.children_prayer,
    row.youth_prayer,
    row.youth_offering_prayer,
    row.young_adult_prayer,
  ]);
  if (serviceFields.length) return false;
  return cleanList([row.liturgical, row.note, row.church_schedule]).length > 0;
}

function getCalendarDisplayRows() {
  const rows = (state.calendarData || []).filter((row) => isCalendarDisplayDate(row?.date));
  const years = [...new Set(rows.map((row) => Number(String(row.date).slice(0, 4))).filter((year) => year > 0))];
  if (!years.length) years.push(new Date().getFullYear());
  const generated = years
    .flatMap(majorChurchFeastsForYear)
    .filter((feast) => isCalendarDisplayDate(feast.date))
    .filter((feast) => !calendarRowsContainFeast(rows, feast));
  return [...rows, ...generated].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare) return dateCompare;
    const generatedCompare = Number(Boolean(b._generatedFeast)) - Number(Boolean(a._generatedFeast));
    if (generatedCompare) return generatedCompare;
    return String(a.liturgical || "").localeCompare(String(b.liturgical || ""), "ko");
  });
}

function isCalendarDisplayDate(value) {
  return Boolean(value) && String(value) >= CALENDAR_MIN_DATE;
}

function calendarRowsContainFeast(rows, feast) {
  const label = normalizeSearchValue(feast.liturgical);
  return rows.some((row) =>
    row.date === feast.date &&
    normalizeSearchValue(cleanList([row.liturgical, row.note, row.church_schedule]).join(" ")).includes(label),
  );
}

function majorChurchFeastsForYear(year) {
  const easter = easterDate(year);
  return [
    generatedChurchFeast(year, 1, 6, "주현절"),
    generatedRelativeFeast(easter, -46, "재의 수요일"),
    generatedRelativeFeast(easter, -3, "성목요일"),
    generatedRelativeFeast(easter, -2, "성금요일"),
    generatedRelativeFeast(easter, -1, "성토요일"),
    generatedRelativeFeast(easter, 0, "부활주일"),
    generatedRelativeFeast(easter, 39, "주님의 승천일"),
    generatedChurchFeast(year, 12, 25, "성탄절"),
    generatedChurchFeast(year, 12, 31, "송구영신예배"),
  ];
}

function generatedChurchFeast(year, month, day, label) {
  return {
    id: `generated-feast:${year}:${month}:${day}:${label}`,
    date: toLocalDateStr(new Date(year, month - 1, day)),
    liturgical: label,
    note: "",
    church_schedule: "",
    preacher: "",
    nursery_prayer: "",
    children_prayer: "",
    youth_prayer: "",
    youth_offering_prayer: "",
    young_adult_prayer: "",
    liturgical_color: "",
    first_reading: "",
    psalm: "",
    second_reading: "",
    gospel: "",
    _generatedFeast: true,
  };
}

function generatedRelativeFeast(baseDate, offsetDays, label) {
  const date = parseLocalDate(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return generatedChurchFeast(date.getFullYear(), date.getMonth() + 1, date.getDate(), label);
}

function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function renderCalendarInlineFeastRow(row, dateLabel, options = {}) {
  const textParts = cleanList([row.liturgical, row.note, row.church_schedule]);
  const title = textParts[0] || "절기";
  const details = textParts.slice(1);
  const rowCls = [
    "cal-inline-row",
    options.isToday ? "is-today" : options.isPast ? "is-past" : "",
    options.isUpcomingSunday ? "is-upcoming-sunday" : "",
  ].filter(Boolean).join(" ");

  return `
    <tr class="${rowCls}">
      <td class="cal-inline-date">${escapeHtml(dateLabel)}</td>
      <td class="cal-inline-summary" colspan="8">
        <span class="cal-inline-title">${escapeHtml(title)}</span>
        ${details.map((item) => `<span class="cal-inline-chip">${escapeHtml(item)}</span>`).join("")}
      </td>
	    </tr>`;
}

function churchYearSeriesSummary(rows = state.calendarData) {
  return cleanList([calendarYearLabel(rows), churchYearSeriesValue(rows)]).join(" · ");
}

function calendarYearValue(rows = state.calendarData) {
  const firstDisplayDate = rows.find((row) => isCalendarDisplayDate(row?.date))?.date;
  return churchYearForCalendarDate(firstDisplayDate) || churchYearForCalendarDate(toLocalDateStr(new Date())) || new Date().getFullYear();
}

function calendarYearLabel(rows = state.calendarData) {
  return `${calendarYearValue(rows)}년`;
}

function churchYearSeriesValue(rows = state.calendarData) {
  const year = churchYearForCalendarDate(rows.find((row) => isCalendarDisplayDate(row?.date))?.date) || new Date().getFullYear();
  return `Series ${["C", "A", "B"][year % 3]}`;
}

function churchYearForCalendarDate(value) {
  if (!value) return null;
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return null;
  const nextChurchYear = date.getFullYear() + 1;
  return date >= adventStartDate(nextChurchYear) ? nextChurchYear : date.getFullYear();
}

function adventStartDate(churchYear) {
  const start = new Date(churchYear - 1, 10, 27);
  start.setDate(start.getDate() + ((7 - start.getDay()) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

function renderModuleSwitcher() {
  for (const button of refs.moduleButtons) {
    const active = button.dataset.module === state.module;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const homeActive = state.module === "home";
  refs.brandHome?.setAttribute("aria-disabled", String(homeActive));
  refs.brandHome?.setAttribute("aria-current", homeActive ? "page" : "false");
  refs.brandNameHome?.setAttribute("aria-current", homeActive ? "page" : "false");
  syncSidebarCollapsedState();
  refs.searchInput.placeholder = "Search...";
  refs.searchInput.setAttribute("aria-label", "Search");
  const canCreate = state.module === "praise";
  refs.newSongBtn.hidden = !canCreate;
  refs.newSongBtn.disabled = !canCreate;
  refs.saveAllBtn.hidden = false;
  const saveLabel =
    state.module === "scripture"
      ? "Save scripture"
      : state.module === "service"
        ? "Save service"
      : state.module === "activities"
        ? "Save activities"
      : state.module === "references"
          ? "Save references"
        : state.module === "calendar"
          ? "Calendar is read-only here"
          : state.module === "praise"
          ? "Save song"
          : "Save";
  refs.saveAllBtn.setAttribute("aria-label", saveLabel);
  renderListFilter();
}

function syncSidebarCollapsedState() {
  const collapsed = document.body.classList.contains("sidebar-collapsed");
  refs.sidebarToggleBtn?.classList.toggle("active", !collapsed);
  refs.sidebarToggleBtn?.setAttribute("aria-pressed", String(!collapsed));
}

const SERVICE_CATEGORIES = {
  public: ["sunday-first","sunday-second","sunday-main","sunday-afternoon","wednesday","friday","monthly"],
  ministry: ["children","youth","young-adult"],
  special: ["special","holy-week-dawn","omer"],
};

const SERVICE_TYPE_DISPLAY_NAMES = {
  "sunday-first": "주일예배 (1부)",
  "sunday-second": "주일예배 (2부)",
  "sunday-main": "주일예배 (3부)",
  "sunday-afternoon": "주일오후예배",
  wednesday: "수요예배",
  friday: "금요기도회",
  monthly: "월삭예배",
  "주일예배": "주일예배 (3부)",
  "새벽기도회": "특별예배",
  children: "어린이부 예배",
  youth: "청소년부 예배",
  "young-adult": "청년부 예배",
  special: "특별예배",
  "holy-week-dawn": "특별새벽기도회",
  omer: "오멜세기기도회",
};

const SERVICE_TYPE_LEGACY_NAMES = {
  sun_1st: "주일예배 (1부)",
  sun_2nd: "주일예배 (2부)",
  sun_3rd: "주일예배 (3부)",
  sun_pm: "주일오후예배",
  wed: "수요예배",
  fri: "금요기도회",
  monthly: "월삭예배",
  children: "어린이부 예배",
  youth: "청소년부 예배",
  young_adult: "청년부 예배",
  holy_week_dawn: "특별새벽기도회",
  omer: "오멜세기기도회",
  special: "특별예배",
};

const CHROMAKEY_SERVICE_TYPES = new Set([
  "sunday-second",
  "sunday-main",
  "sunday-afternoon",
  "wednesday",
  "monthly",
  "sun_2nd",
  "sun_3rd",
  "sun_pm",
  "wed",
]);
const WORSHIP_BACKGROUND_BASE = "assets/worship-backgrounds";
const WORSHIP_BACKGROUND_GROUPS = {
  children: "C",
  youth: "B",
  "young-adult": "A",
};
const WORSHIP_SEASON_BACKGROUNDS = {
  palm: "26-S4.jpg",
  easter: "26-S5.jpg",
  pentecost: "26-S6.jpg",
};

function presenterServiceUsesChromakey(service) {
  return serviceTypeUsesChromakey(service?.type_id);
}

function serviceTypeUsesChromakey(typeId) {
  const rawId = String(typeId || "");
  const appId = worshipAppServiceTypeId(rawId);
  const type = serviceTypeById(appId) || state.serviceTypes.find((candidate) => candidate._worshipId === rawId) || null;
  if (type?._worship) {
    return Boolean(type._worshipChromakey || type._worshipOutputContext === "chromakey");
  }
  return CHROMAKEY_SERVICE_TYPES.has(appId) || CHROMAKEY_SERVICE_TYPES.has(rawId);
}

function servicePreparationElementTypeForType(typeId) {
  return serviceTypeUsesChromakey(typeId) ? "video" : "image";
}

function servicePreparationElementTypeForServiceId(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  return servicePreparationElementTypeForType(service?.type_id || state.selectedServiceTypeId);
}

function presenterOutputTheme(typeId) {
  const id = String(typeId || "");
  if (id === "children") return "children";
  if (id === "youth") return "youth";
  if (id === "young-adult") return "young-adult";
  if (id === "sunday-first") return "formal";
  return "chromakey";
}

function presenterBackgroundForService(service) {
  if (!service || presenterServiceUsesChromakey(service)) return "";
  const season = presenterSeasonBackgroundKey(service);
  if (season) return `${WORSHIP_BACKGROUND_BASE}/${WORSHIP_SEASON_BACKGROUNDS[season]}`;
  const group = WORSHIP_BACKGROUND_GROUPS[service.type_id] || "A";
  const slot = presenterBackgroundSlotForDate(service.date);
  return `${WORSHIP_BACKGROUND_BASE}/26-${group}${slot}.jpg`;
}

function presenterSeasonBackgroundKey(service) {
  const tags = Array.isArray(service?.tags) ? service.tags.map((tag) => String(tag).replace(/\s+/g, "")) : [];
  const haystack = [serviceDisplayTypeName(service), ...tags].join(" ");
  if (/종려|수난/.test(haystack)) return "palm";
  if (/부활/.test(haystack)) return "easter";
  if (/성령강림/.test(haystack)) return "pentecost";
  return "";
}

const WORSHIP_BACKGROUND_SLOTS_AVAILABLE = 3;

function presenterBackgroundSlotForDate(value) {
  const month = parseLocalDate(value).getMonth() + 1;
  // 2-month windows: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec.
  const bucket = Math.floor((month - 1) / 2);
  // Only WORSHIP_BACKGROUND_SLOTS_AVAILABLE images exist per group so far;
  // cycle through them until the remaining bucket images are added.
  return (bucket % WORSHIP_BACKGROUND_SLOTS_AVAILABLE) + 1;
}

const SERVICE_RECURRENCE = {
  "sunday-first": { kind: "weekly", weekday: 0 },
  "sunday-second": { kind: "weekly", weekday: 0 },
  "sunday-main": { kind: "weekly", weekday: 0 },
  "sunday-afternoon": { kind: "weekly", weekday: 0 },
  children: { kind: "weekly", weekday: 0 },
  youth: { kind: "weekly", weekday: 0 },
  "young-adult": { kind: "weekly", weekday: 0 },
  wednesday: { kind: "weekly", weekday: 3 },
  friday: { kind: "weekly", weekday: 5 },
  monthly: { kind: "first-weekday", weekday: 5 },
};

function renderListFilter() {
  if (state.module === "home" || state.module === "calendar" || state.module === "references" || state.module === "order-sheets" || state.module === "service" || state.module === "activities") {
    refs.listFilter.hidden = true;
    refs.listFilterButtons.forEach((button) => {
      button.hidden = true;
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    return;
  }

  refs.listFilter.hidden = false;
  refs.listFilter.setAttribute("aria-label", state.module === "scripture" ? "Scripture filter" : "Praise filter");
  const filters = state.module === "scripture"
    ? [["all", "All"], ["old", "OT"], ["new", "NT"]]
    : [["all", "All"], ["hymns", "Hymns"], ["ccm", "CCM"], ["children", "Kids"]];
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
  function setStatusIcon(icon, cls, label) {
    refs.connectionStatus.className = "status-icon" + (cls ? " " + cls : "");
    refs.connectionStatus.setAttribute("aria-label", label);
    refs.connectionStatus.innerHTML = `<i data-lucide="${icon}"></i>`;
    refreshIcons();
  }

  if (state.loading) {
    setStatusIcon("loader-2", "", LOADING_MESSAGE);
    return;
  }

  if (state.connectionError) {
    setStatusIcon("database", "error", state.connectionError);
    return;
  }

  if (isAuthRequired() && state.auth.loading) {
    setStatusIcon("loader-2", "", "Checking sign-in");
    return;
  }

  if (isAuthRequired() && !state.auth.session) {
    setStatusIcon("lock", "error", "Sign in required");
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
  if (isAuthRequired() && !state.auth.session) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList("Sign in required.");
    return;
  }

  if (isGlobalSearchActive()) {
    renderGlobalSearchList();
    return;
  }

  if (state.module === "home") {
    renderHomeList();
    return;
  }

  if (state.connectionError && !["calendar", "references", "order-sheets"].includes(state.module)) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList(state.connectionError);
    return;
  }

  if (state.module === "references" || state.module === "order-sheets") {
    renderHomeList();
    return;
  }
  if (state.module === "activities") {
    renderActivitiesList();
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
  if (state.module === "calendar") {
    renderHomeList();
    return;
  }

  if (!state.client) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList();
    return;
  }

  const filtered = getFilteredSongs();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  const filterBase = getSongsForPraiseFilter();
  refs.songCount.textContent = hasSearch
    ? `${formatCount(filtered.length)} of ${formatCount(filterBase.length)} songs`
    : `${formatCount(filtered.length)} ${filtered.length === 1 ? "song" : "songs"}`;

  if (!filtered.length) {
    refs.songList.innerHTML = renderListEmptyState(
      hasSearch ? "No matches" : "No songs yet",
      hasSearch ? "Try another title, lyric, or number." : "Connect a database to load songs.",
    );
    return;
  }

  refs.songList.innerHTML = filtered
    .map((song) => {
      const active = song.id === state.selectedSongId ? " active" : "";
      const muted = song._outOfFilter ? " muted" : "";
      const view = songListView(song);
      const hasMeta = view.meta ? " has-meta" : "";
      return `
        <button class="song-item${active}${muted}${hasMeta}" type="button" data-song-id="${escapeAttr(song.id)}">
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
    refs.songList.innerHTML = renderListEmptyState("No results", "Search songs, scripture, or worship.");
    return;
  }

  refs.songList.innerHTML = renderGlobalSearchSections(results);
  finishListRender();
}

function renderGlobalSearchSections(results) {
  return getGlobalSearchSectionOrder().map((section) =>
    renderGlobalSearchSection(section.label, section.items(results).join(""))
  ).filter(Boolean).join("");
}

function getGlobalSearchSectionOrder() {
  const sections = [
    { id: "praise", label: "Praise", items: (results) => results.praise.map(renderGlobalPraiseResult) },
    { id: "scripture", label: "Scripture", items: (results) => results.scripture.map(renderGlobalScriptureResult) },
    { id: "service", label: "Service", items: (results) => results.service.map(renderGlobalServiceResult) },
    ...(ACTIVITY_MODULE_ENABLED ? [{ id: "activities", label: "Activities", items: (results) => results.activities.map(renderGlobalActivityResult) }] : []),
  ];
  const modulePriority = {
    praise: "praise",
    scripture: "scripture",
    service: "service",
    ...(ACTIVITY_MODULE_ENABLED ? { activities: "activities" } : {}),
  }[state.module];
  if (!modulePriority) return sections;
  return [
    ...sections.filter((section) => section.id === modulePriority),
    ...sections.filter((section) => section.id !== modulePriority),
  ];
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
    activities: ACTIVITY_MODULE_ENABLED ? getGlobalActivityResults(query) : [],
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

  if (!reference && !exactBook) results.unshift({ kind: "text", query: state.search });
  return results.slice(0, 6);
}

function getGlobalServiceResults(query) {
  if (!query) return [];
  return sortServicesByDate(state.services.filter((service) => serviceMatchesSearch(service, query)), "desc").slice(0, 8);
}

function getGlobalActivityResults(query) {
  if (!query || !state.activityLoaded || state.activityError) return [];
  return getFilteredActivityEvents(query).slice(0, 6);
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
    const query = String(result.query || "").trim();
    return `
      <button class="song-item global-search-result global-search-result--primary" type="button" data-global-bible-text="true">
        <span class="song-title">
          <span class="song-title-text">Search Bible text</span>
        </span>
        <span class="song-meta-line">${escapeHtml(query ? `"${query}" in selected translation` : "Selected translation")}</span>
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
        ${renderScriptureChapterBadge(book)}
      </span>
      ${meta ? `<span class="song-meta-line">${escapeHtml(meta)}</span>` : ""}
    </button>
  `;
}

function renderGlobalServiceResult(service) {
  const meta = [
    serviceDisplayTypeName(service),
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

function renderGlobalActivityResult(event) {
  const games = activityGamesForEvent(event.id);
  const teams = activityTeamsForEvent(event.id);
  return `
    <button class="song-item global-search-result" type="button" data-global-activity-event-id="${escapeAttr(event.id)}">
      <span class="song-title">
        <span class="song-title-text">${escapeHtml(event.title)}</span>
      </span>
      <span class="song-meta-line">${escapeHtml(cleanList([formatActivityDate(event.date), `${games.length} games`, `${teams.length} teams`]).join(" · "))}</span>
    </button>
  `;
}

async function openGlobalActivityResult(eventId) {
  if (!ACTIVITY_MODULE_ENABLED) return;
  if (!eventId) return;
  if (state.module !== "activities") {
    await switchModule("activities", { clearSearch: false, syncHistory: false });
    if (state.module !== "activities") return;
  }
  state.selectedActivityEventId = eventId;
  clearGlobalSearchInput();
  renderActivitiesList();
  renderActivitiesDetail();
  syncBrowserHistory();
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

async function openGlobalBibleReference(value) {
  const reference = parseBibleReference(value);
  if (!reference) return;
  if (state.module !== "scripture") {
    await switchModule("scripture", { clearSearch: false, syncHistory: false });
    if (state.module !== "scripture") return;
  }
  clearGlobalSearchInput();
  navigateToBibleReference(reference);
  syncBrowserHistory();
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

function renderHomeList() {
  const modules = homeModuleCards();
  const service = modules.find((module) => module.id === "service");
  const contentModules = ["scripture", "praise"]
    .map((id) => modules.find((module) => module.id === id))
    .filter(Boolean);
  const utilityModules = ["calendar", "references", "order-sheets", "activities"]
    .map((id) => modules.find((module) => module.id === id))
    .filter((module) => module && (ACTIVITY_MODULE_ENABLED || module.id !== "activities"))
    .filter(Boolean);
  const disabledModules = ["activities"]
    .map((id) => modules.find((module) => module.id === id))
    .filter((module) => module && !ACTIVITY_MODULE_ENABLED);
  refs.songCount.textContent = "";
  refs.songList.innerHTML = `
    <div class="home-sidebar">
      ${service ? `<section class="home-sidebar-section home-sidebar-section--primary">
        ${renderHomeSidebarCard(service)}
      </section>` : ""}
      <section class="home-sidebar-section">
        ${contentModules.map(renderHomeSidebarCard).join("")}
      </section>
      <section class="home-sidebar-section home-sidebar-section--utility">
        ${utilityModules.map(renderHomeSidebarCard).join("")}
      </section>
      ${disabledModules.length ? `<section class="home-sidebar-section home-sidebar-section--disabled">
        <span class="home-sidebar-heading">Disabled</span>
        ${disabledModules.map((module) => renderHomeSidebarCard(module, { disabled: true })).join("")}
      </section>` : ""}
    </div>
  `;
  finishListRender();
}

function renderHomeSidebarCard(module, options = {}) {
  const active = module.id === state.module ? " active" : "";
  const disabled = options.disabled ? " disabled" : "";
  return `
    <button class="home-sidebar-card ${escapeAttr(module.id)}${active}${disabled}" type="button"${options.disabled ? " disabled aria-disabled=\"true\"" : ` data-home-module="${escapeAttr(module.id)}"`}>
      <i data-lucide="${escapeAttr(module.icon)}"></i>
      <span>${escapeHtml(module.title)}</span>
      <small>${escapeHtml(options.disabled ? "Disabled" : module.sidebarMeta)}</small>
    </button>
  `;
}

function renderHomeDetail() {
  if (isGlobalSearchActive()) {
    renderHomeSearchDetail();
    return;
  }

  const modules = homeModuleCards();
  const service = modules.find((module) => module.id === "service");
  const contentModules = ["scripture", "praise"]
    .map((id) => modules.find((module) => module.id === id))
    .filter(Boolean);
  const utilityModules = ["calendar", "references", "order-sheets", "activities"]
    .map((id) => modules.find((module) => module.id === id))
    .filter((module) => module && (ACTIVITY_MODULE_ENABLED || module.id !== "activities"))
    .filter(Boolean);
  const verse = homeVerse();
  refs.detailPane.innerHTML = `
    <div class="home-screen">
      ${service ? `<section class="home-section home-section--primary" aria-label="Worship">
        ${renderHomePrimaryCard(service)}
      </section>` : ""}
      <section class="home-section" aria-label="Library">
        <div class="home-section-label">Library</div>
        <div class="home-module-grid">
          ${contentModules.map((module) => renderHomeCompactCard(module)).join("")}
        </div>
      </section>
      <section class="home-section" aria-label="Utilities">
        <div class="home-section-label">Utilities</div>
        <div class="home-module-grid">
          ${utilityModules.map((module) => renderHomeCompactCard(module)).join("")}
        </div>
      </section>
      ${verse.text ? `<section class="home-verse-card" aria-label="Home verse">
        <p>${renderHomeVerseText(verse.text)}</p>
        <span>${escapeHtml(verse.reference)}</span>
      </section>` : ""}
    </div>
  `;
  refreshIcons();
}

function renderHomeSearchDetail() {
  const results = getGlobalSearchResults();
  const total = results.praise.length + results.scripture.length + results.service.length;
  refs.detailPane.innerHTML = `
    <div class="home-search-screen">
      <header class="home-search-head">
        <span>Search</span>
        <strong>${escapeHtml(state.search.trim())}</strong>
        <small>${total} ${total === 1 ? "result" : "results"}</small>
      </header>
      ${total ? `
        <div class="home-search-results">
          ${renderGlobalSearchSections(results)}
        </div>
      ` : `
        <div class="empty-detail">
          <div class="empty-detail-inner">
            <h2>No results</h2>
            <p>Search praise, scripture, or worship.</p>
          </div>
        </div>
      `}
    </div>
  `;
  refreshIcons();
}

function homeVerse() {
  const verses = state.uiVerses.home || [];
  return verses[state.homeVerseIndex % verses.length] || { reference: "", text: "" };
}

function renderHomeVerseText(text) {
  return splitHomeVerseLines(text)
    .map((line) => escapeHtml(line))
    .join("<br />");
}

function renderConnectionEmptyDetail(message = DB_CONNECTION_EMPTY_MESSAGE) {
  const verse = DB_CONNECTION_EMPTY_VERSE;
  const meta = cleanList([verse.reference, message]).join(" · ");
  return `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <p class="empty-verse">${renderHomeVerseText(verse.text)}</p>
          ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
        </div>
      </div>
    `;
}

function renderAuthRequiredDetail() {
  const email = state.auth.email || state.auth.user?.email || "";
  return `
      <div class="empty-detail">
        <form class="empty-detail-inner auth-panel" data-auth-form>
          <p class="empty-verse">Sign in required</p>
          <span>관리자 계정으로 로그인해야 Mindex 데이터를 열 수 있습니다.</span>
          <label class="auth-field">
            <span>Email</span>
            <input type="email" data-auth-email value="${escapeAttr(email)}" autocomplete="email" placeholder="name@example.com" />
          </label>
          <button class="btn primary" type="submit" data-auth-action="sign-in" ${state.auth.loading ? "disabled" : ""}>
            <i data-lucide="${state.auth.loading ? "loader-2" : "mail"}"></i>
            <span>${state.auth.loading ? "Sending..." : "Send sign-in link"}</span>
          </button>
          ${state.auth.message ? `<span class="auth-message">${escapeHtml(state.auth.message)}</span>` : ""}
          ${state.auth.error ? `<span class="auth-message error">${escapeHtml(state.auth.error)}</span>` : ""}
        </form>
      </div>
    `;
}

function renderLoadingDetail() {
  return `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <p class="empty-verse">${escapeHtml(LOADING_MESSAGE)}</p>
        </div>
      </div>
    `;
}

function renderLoadingList() {
  return renderListEmptyState(LOADING_MESSAGE, "");
}

function renderConnectionList(message = DB_CONNECTION_EMPTY_MESSAGE) {
  return renderListEmptyState(CONNECTION_LIST_TITLE, message);
}

function isConnectionUnavailableMessage(message) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;
  return (
    text === DB_CONNECTION_EMPTY_MESSAGE.toLowerCase() ||
    text === "no connection." ||
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("supabase connection failed") ||
    text.includes("supabase library did not load") ||
    text.includes("invalid api key") ||
    text.includes("jwt") ||
    text.includes("connection")
  );
}

function renderUnavailableDetail(slot, title, message) {
  const connectionMessage = state.connectionError || (isConnectionUnavailableMessage(message) ? message : "");
  if (connectionMessage) return renderConnectionEmptyDetail(connectionMessage);
  return renderModuleEmptyDetail(slot, title, message);
}

function renderModuleEmptyDetail(slot, title, fallback) {
  const verse = moduleUiVerse(slot);
  const verseHtml = verse?.text
    ? `
          <p class="empty-verse">${renderHomeVerseText(verse.text)}</p>
          ${verse.reference ? `<span>${escapeHtml(verse.reference)}</span>` : ""}
      `
    : `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(fallback)}</p>
      `;
  return `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          ${verseHtml}
        </div>
      </div>
    `;
}

function moduleUiVerse(slot) {
  const verses = state.uiVerses[slot] || [];
  return verses[0] || null;
}

function extractUiVerses(scriptures) {
  const slots = Object.fromEntries(UI_VERSE_SLOTS.map((slot) => [slot, []]));
  for (const scripture of scriptures || []) {
    const slot = uiVerseSlot(scripture);
    if (!slot) continue;
    slots[slot].push({
      reference: scripture.reference || scripture.title.replace(`${UI_SCRIPTURE_PREFIX} ${slot}`, "").trim(),
      text: scripture.text || "",
    });
  }
  return slots;
}

function uiVerseSlot(scripture) {
  const title = String(scripture?.title || "").trim();
  if (!title.startsWith(UI_SCRIPTURE_PREFIX)) return "";
  const rawSlot = title.slice(UI_SCRIPTURE_PREFIX.length).trim().split(/\s+/)[0]?.toLowerCase() || "";
  return UI_VERSE_SLOTS.includes(rawSlot) ? rawSlot : "";
}

function splitHomeVerseLines(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const maxLineLength = 56;
  const punctuationSegments = normalized
    .match(/[^;.?!:]+[;.?!:]?/g)
    ?.map((segment) => segment.trim())
    .filter(Boolean) || [normalized];

  const lines = [];
  for (const segment of punctuationSegments) {
    if (segment.length <= maxLineLength) {
      lines.push(segment);
      continue;
    }
    const commaParts = segment
      .match(/[^,]+,?/g)
      ?.map((part) => part.trim())
      .filter(Boolean) || [segment];
    let line = "";
    for (const part of commaParts) {
      if (part.length > maxLineLength) {
        const words = part.split(/\s+/).filter(Boolean);
        for (const word of words) {
          const nextWordLine = line ? `${line} ${word}` : word;
          if (line && nextWordLine.length > maxLineLength) {
            lines.push(line);
            line = word;
          } else {
            line = nextWordLine;
          }
        }
        continue;
      }
      const next = line ? `${line} ${part}` : part;
      if (line && next.length > maxLineLength) {
        lines.push(line);
        line = part;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [normalized];
}

function homeModuleCards() {
  const bibleBookCount = getBibleBooks().length;
  const translationCount = state.bibleTranslations.length;
  const services = getServiceDashboardServices();
  const nextService = services[0];
  const calendarRows = getCalendarDisplayRows();
  const referencesSummary = referenceSummaryText();
  const activitiesSummary = activitySummaryText();

  return [
    {
      id: "service",
      title: "Worship",
      eyebrow: "",
      icon: "screen-share",
      sidebarMeta: nextService ? formatServiceDate(nextService, { compact: true }) : `${state.services.length} services`,
      detail: nextService ? formatServiceDate(nextService) : `${state.services.length} services`,
      compactMeta: null,
      meta: cleanList([
        nextService ? serviceDisplayTypeName(nextService) : "",
        nextService ? serviceItemPreview(nextService.id) : "",
      ]),
    },
    {
      id: "activities",
      title: "Activities",
      eyebrow: "",
      icon: "trophy",
      sidebarMeta: activitiesSummary || "Games",
      detail: activitiesSummary || "Games",
      compactMeta: state.activityLoaded
        ? { value: formatCount(state.activityEvents.length), label: "events" }
        : { value: state.activityError === "setup" ? "Setup" : "Games", label: "" },
      meta: cleanList([
        activitiesSummary,
      ]),
    },
    {
      id: "praise",
      title: "Praise",
      eyebrow: "",
      icon: "music-2",
      sidebarMeta: `${formatCount(state.songs.length)} songs`,
      detail: `${formatCount(state.songs.length)} songs`,
      compactMeta: { value: formatCount(state.songs.length), label: "songs" },
      meta: cleanList([
        `${formatCount(state.songs.length)} songs`,
      ]),
    },
    {
      id: "scripture",
      title: "Scripture",
      eyebrow: "",
      icon: "book-open",
      sidebarMeta: `${bibleBookCount} books`,
      detail: `${bibleBookCount} books`,
      compactMeta: { value: formatCount(translationCount), label: "translations" },
      meta: cleanList([
        translationCount ? `${formatCount(translationCount)} translations` : "",
      ]),
    },
    {
      id: "calendar",
      title: "Calendar",
      eyebrow: "",
      icon: "calendar-days",
      sidebarMeta: calendarRows.length ? calendarYearLabel(calendarRows) : "Church year",
      detail: calendarRows.length ? calendarYearLabel(calendarRows) : "Church year calendar",
      compactMeta: { value: churchYearSeriesValue(calendarRows), label: "" },
      meta: cleanList([
        churchYearSeriesSummary(calendarRows),
      ]),
    },
    {
      id: "references",
      title: "References",
      eyebrow: "",
      icon: "external-link",
      sidebarMeta: referencesSummary || "Links",
      detail: referencesSummary || "Links",
      compactMeta: state.referenceLinksLoaded
        ? { value: formatCount(state.referenceLinks.length), label: "links" }
        : { value: "Links", label: "" },
      meta: cleanList([
        referencesSummary,
      ]),
    },
    {
      id: "order-sheets",
      title: "Order Sheets",
      eyebrow: "",
      icon: "newspaper",
      sidebarMeta: orderSheetSummaryText(),
      detail: orderSheetSummaryText(),
      compactMeta: { value: formatCount(getOrderSheetServices().length), label: "services" },
      meta: cleanList([
        orderSheetSummaryText(),
      ]),
    },
  ];
}

function orderSheetSummaryText() {
  const count = getOrderSheetServices().length;
  return `${formatCount(count)} ${count === 1 ? "service" : "services"}`;
}

function activitySummaryText() {
  if (state.activityError === "setup") return "Setup needed";
  if (state.activityError) return "Unavailable";
  if (!state.activityLoaded) return "";
  return `${formatCount(state.activityGames.length)} ${state.activityGames.length === 1 ? "game" : "games"}`;
}

function referenceSummaryText() {
  if (!state.referenceLinksLoaded) return "";
  return `${formatCount(state.referenceLinks.length)} ${state.referenceLinks.length === 1 ? "link" : "links"}`;
}

function renderHomePrimaryCard(module) {
  return `
    <button class="home-primary-card ${escapeAttr(module.id)}" type="button" data-home-module="${escapeAttr(module.id)}">
      ${module.eyebrow ? `<span class="home-module-eyebrow">${escapeHtml(module.eyebrow)}</span>` : ""}
      <span class="home-module-title">
        <i data-lucide="${escapeAttr(module.icon)}"></i>
        ${escapeHtml(module.title)}
      </span>
      <span class="home-module-detail">${escapeHtml(module.detail)}</span>
      ${module.meta.length ? `<span class="home-module-meta">${module.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</span>` : ""}
    </button>
  `;
}

function renderHomeCompactCard(module, options = {}) {
  const compactMeta = module.compactMeta
    ? `<span class="home-compact-meta"><strong>${escapeHtml(module.compactMeta.value)}</strong>${module.compactMeta.label ? ` <span>${escapeHtml(module.compactMeta.label)}</span>` : ""}</span>`
    : "";
  return `
    <button class="home-compact-card ${escapeAttr(module.id)}${options.wide ? " wide" : ""}" type="button" data-home-module="${escapeAttr(module.id)}">
      <span class="home-compact-icon"><i data-lucide="${escapeAttr(module.icon)}"></i></span>
      <span class="home-compact-copy">
        <strong>${escapeHtml(module.title)}</strong>
        <small>${escapeHtml(module.detail)}</small>
      </span>
      ${compactMeta}
    </button>
  `;
}

function toPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function renderActivitiesList() {
  const query = normalizeSearchValue(state.search);
  if (!state.client) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList();
    return;
  }

  refs.songCount.textContent = state.activityLoaded
    ? `${formatCount(state.activityEvents.length)} ${state.activityEvents.length === 1 ? "event" : "events"}`
    : "";

  if (state.activityError === "setup") {
    refs.songList.innerHTML = renderListEmptyState("Activities unavailable", "Run the activities SQL first.");
    return;
  }
  if (state.activityError && state.activityError !== "setup") {
    refs.songList.innerHTML = isConnectionUnavailableMessage(state.activityError)
      ? renderConnectionList(state.connectionError || state.activityError)
      : renderListEmptyState("Activities unavailable", state.activityError);
    return;
  }
  if (!state.activityLoaded) {
    refs.songList.innerHTML = renderLoadingList();
    return;
  }

  const events = getFilteredActivityEvents(query);
  if (!events.length) {
    refs.songList.innerHTML = renderListEmptyState(query ? "No matches" : "No events", query ? "Try another search." : "");
    return;
  }

  refs.songList.innerHTML = events.map((event) => {
    const active = event.id === state.selectedActivityEventId ? " active" : "";
    const games = activityGamesForEvent(event.id);
    const teams = activityTeamsForEvent(event.id);
    return `
      <button class="activity-list-item${active}" type="button" data-activity-event-id="${escapeAttr(event.id)}">
        <span>
          <strong>${escapeHtml(event.title)}</strong>
          <small>${escapeHtml(cleanList([formatActivityDate(event.date), `${games.length} games`, `${teams.length} teams`]).join(" · "))}</small>
        </span>
      </button>
    `;
  }).join("");
  finishListRender();
}

function getFilteredActivityEvents(query = normalizeSearchValue(state.search)) {
  if (!query) return state.activityEvents;
  return state.activityEvents.filter((event) => {
    const games = activityGamesForEvent(event.id);
    const teams = activityTeamsForEvent(event.id);
    const haystack = normalizeSearchValue([
      event.title,
      event.location,
      event.memo,
      ...games.map((game) => [game.title, game.game_type, game.owner, game.location].join(" ")),
      ...teams.map((team) => team.name),
    ].join(" "));
    return haystack.includes(query);
  });
}

function selectActivityEvent(id) {
  if (!id || id === state.selectedActivityEventId) return;
  state.selectedActivityEventId = id;
  renderActivitiesList();
  renderActivitiesDetail();
  syncBrowserHistory();
}

function getSelectedActivityEvent() {
  return state.activityEvents.find((event) => event.id === state.selectedActivityEventId) || state.activityEvents[0] || null;
}

function activityGamesForEvent(eventId) {
  return state.activityGames
    .filter((game) => game.event_id === eventId)
    .sort((a, b) => (a.sort_order - b.sort_order) || TITLE_COLLATOR.compare(a.title, b.title));
}

function activityTeamsForEvent(eventId) {
  return state.activityTeams
    .filter((team) => team.event_id === eventId)
    .sort((a, b) => (a.sort_order - b.sort_order) || TITLE_COLLATOR.compare(a.name, b.name));
}

function activityScoresForEvent(eventId) {
  return state.activityScoreEvents.filter((event) => event.event_id === eventId);
}

async function runActivityAction(action, eventId) {
  if (!requireClient()) return;
  if (state.activityError === "setup") {
    showToast("Run the Activities SQL first.", "error");
    return;
  }
  if (action === "new-event") {
    await createActivityEvent();
    return;
  }
  if (action === "add-team") {
    await createActivityTeam(eventId);
    return;
  }
  if (action === "add-game") {
    await createActivityGame(eventId);
    return;
  }
  if (action === "add-score") {
    await createActivityScore(eventId);
  }
}

async function createActivityEvent() {
  const title = prompt("Activity event name", "New Activity Event");
  if (title === null) return;
  const payload = {
    title: title.trim() || "New Activity Event",
    date: toLocalDateStr(new Date()),
    status: "draft",
  };
  const { data, error } = await state.client
    .from("mindex_activity_events")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    showToast(error.message || "Could not create activity event.", "error");
    return;
  }
  const event = normalizeActivityEvent(data);
  state.activityEvents = [event, ...state.activityEvents.filter((item) => item.id !== event.id)];
  state.selectedActivityEventId = event.id;
  state.activityLoaded = true;
  state.activityError = "";
  renderActivitiesList();
  renderActivitiesDetail();
  syncBrowserHistory();
  showToast("Activity event created.");
}

async function createActivityTeam(eventId) {
  const event = state.activityEvents.find((item) => item.id === eventId) || getSelectedActivityEvent();
  if (!event) return;
  const name = prompt("Team name", `Team ${activityTeamsForEvent(event.id).length + 1}`);
  if (name === null) return;
  const payload = {
    event_id: event.id,
    name: name.trim() || `Team ${activityTeamsForEvent(event.id).length + 1}`,
    color: nextActivityTeamColor(event.id),
    score: 0,
    sort_order: activityTeamsForEvent(event.id).length + 1,
  };
  const { data, error } = await state.client
    .from("mindex_activity_teams")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    showToast(error.message || "Could not create team.", "error");
    return;
  }
  state.activityTeams.push(normalizeActivityTeam(data));
  renderActivitiesList();
  renderActivitiesDetail();
  showToast("Team added.");
}

async function createActivityGame(eventId) {
  const event = state.activityEvents.find((item) => item.id === eventId) || getSelectedActivityEvent();
  if (!event) return;
  const title = prompt("Game name", `Game ${activityGamesForEvent(event.id).length + 1}`);
  if (title === null) return;
  const type = prompt("Game type: puzzle_hunt, quiz, physical", "physical");
  if (type === null) return;
  const gameType = normalizeActivityGameType(type);
  const payload = {
    event_id: event.id,
    title: title.trim() || `Game ${activityGamesForEvent(event.id).length + 1}`,
    game_type: gameType,
    status: "draft",
    sort_order: activityGamesForEvent(event.id).length + 1,
  };
  const { data, error } = await state.client
    .from("mindex_activity_games")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    showToast(error.message || "Could not create game.", "error");
    return;
  }
  state.activityGames.push(normalizeActivityGame(data));
  renderActivitiesList();
  renderActivitiesDetail();
  showToast("Game added.");
}

async function createActivityScore(eventId) {
  const event = state.activityEvents.find((item) => item.id === eventId) || getSelectedActivityEvent();
  if (!event) return;
  const form = refs.detailPane.querySelector(".activity-score-form");
  const teamId = form?.querySelector('[data-activity-score-field="team"]')?.value || "";
  const gameId = form?.querySelector('[data-activity-score-field="game"]')?.value || null;
  const points = Number(form?.querySelector('[data-activity-score-field="points"]')?.value || 0);
  const reason = form?.querySelector('[data-activity-score-field="reason"]')?.value?.trim() || "";
  if (!teamId || !Number.isFinite(points) || points === 0) {
    showToast("Choose a team and points.", "error");
    return;
  }
  const payload = {
    event_id: event.id,
    game_id: gameId || null,
    team_id: teamId,
    points,
    reason: nullIfBlank(reason),
  };
  const { data, error } = await state.client
    .from("mindex_activity_score_events")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    showToast(error.message || "Could not record score.", "error");
    return;
  }

  const team = state.activityTeams.find((item) => item.id === teamId);
  if (team) {
    const nextScore = Number(team.score || 0) + points;
    const { error: scoreError } = await state.client
      .from("mindex_activity_teams")
      .update({ score: nextScore })
      .eq("id", teamId);
    if (scoreError) {
      showToast(scoreError.message || "Score log saved, but team total was not updated.", "error");
    } else {
      team.score = nextScore;
    }
  }

  state.activityScoreEvents.unshift(normalizeActivityScoreEvent(data));
  renderActivitiesList();
  renderActivitiesDetail();
  showToast("Score recorded.");
}

function normalizeActivityGameType(value) {
  const type = String(value || "").trim().toLowerCase().replaceAll("-", "_").replace(/\s+/g, "_");
  return ACTIVITY_GAME_TYPE_LABELS[type] ? type : "physical";
}

function nextActivityTeamColor(eventId) {
  const palette = ["#6ee7b7", "#93c5fd", "#f9a8d4", "#fcd34d", "#c4b5fd", "#fca5a5"];
  return palette[activityTeamsForEvent(eventId).length % palette.length];
}

function formatActivityDate(value) {
  const date = toLocalDateStr(value);
  return date ? date.slice(5).replace("-", "/") : "";
}

function renderScriptureList() {
  if (!state.client) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList();
    return;
  }

  const reference = parseBibleReference(state.search);
  const books = reference ? getBibleBooks() : getBibleBooksForScriptureFilter();
  const filtered = getFilteredBibleBooks();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  refs.songCount.textContent = hasSearch
    ? `${filtered.length} of ${books.length} books`
    : `${filtered.length} ${filtered.length === 1 ? "book" : "books"}`;

  if (state.scriptureError) {
    refs.songList.innerHTML = isConnectionUnavailableMessage(state.scriptureError)
      ? renderConnectionList(state.connectionError || state.scriptureError)
      : renderListEmptyState("Scripture unavailable", state.scriptureError);
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
            ${renderScriptureChapterBadge(book)}
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
      ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
    </div>
  `;
}

function getReferenceLinks() {
  const query = normalizeSearchValue(state.search);
  const links = [...state.referenceLinks]
    .filter((link) => link.is_active !== false)
    .sort(sortReferenceLinks);
  if (!query) return links;
  return links.filter((link) =>
    normalizeSearchValue([link.title, link.group_name, link.url].filter(Boolean).join(" ")).includes(query),
  );
}

function finishListRender() {
  restoreCurrentListScroll();
  refreshIcons();
}

function finishDetailRender() {
  refreshIcons();
  updateSaveState();
}

function getListScrollKey() {
  const search = normalizeSearchValue(state.search);
  if (isGlobalSearchActive()) return `global:${search}`;
  if (state.module === "home") return `home:${search}`;
  if (state.module === "scripture") return `scripture:${state.scriptureFilter}:${search}`;
  if (state.module === "service") return `service:${state.serviceFilter}:${search}`;
  if (state.module === "calendar") return `calendar:${search}`;
  if (state.module === "activities") return `activities:${search}`;
  if (state.module === "references") return `references:${search}`;
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
  if (isAuthRequired() && !state.auth.session) {
    refs.detailPane.innerHTML = renderAuthRequiredDetail();
    refreshIcons();
    return;
  }

  if (isGlobalSearchActive() && (state.module === "home" || state.module === "calendar" || state.module === "references")) {
    renderHomeSearchDetail();
    return;
  }

  if (state.module === "home") {
    renderHomeDetail();
    return;
  }

  if (state.connectionError) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail(state.connectionError);
    refreshIcons();
    return;
  }

  if (state.module === "scripture") {
    renderScriptureDetail();
    return;
  }
  if (state.module === "service") {
    renderServiceDetail();
    return;
  }
  if (state.module === "activities") {
    renderActivitiesDetail();
    return;
  }
  if (state.module === "calendar") {
    renderCalendarView();
    return;
  }
  if (state.module === "references") {
    renderReferencesDetail();
    return;
  }
  if (state.module === "order-sheets") {
    renderOrderSheetsDetail();
    return;
  }

  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  const song = getSelectedSong();

  if (!song && state.loading && !state.songs.length) {
    refs.detailPane.innerHTML = renderLoadingDetail();
    refreshIcons();
    return;
  }

  if (!song) {
    refs.detailPane.innerHTML = renderModuleEmptyDetail("praise", "Praise", "Select a song.");
    refreshIcons();
    return;
  }

  const titleMetaLine = songTitleMetaLine(song);
  const supportMetaItems = songSupportMetaItems(song);
  const relatedSongs = relatedSongsForSong(song);
  refs.detailPane.innerHTML = `
    <div class="editor-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml((song.hymn_no ? stripHymnNumber(song.title) : song.title) || "Untitled Song")}</span>
            ${song.hymn_no ? `<span class="scripture-book-marker">${escapeHtml(song.hymn_no)}</span>` : ""}
          </h2>
          ${renderSongDescription(song, titleMetaLine, [], relatedSongs)}
        </div>
        <div class="editor-head-right">
          <div class="song-header-meta-row">
            ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
            <button class="icon-btn quiet metadata-edit-btn" type="button" data-open-metadata aria-label="Edit song info">
              <i data-lucide="pencil"></i>
            </button>
          </div>
          <div class="head-actions">
            <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
          </div>
        </div>
      </header>

      ${renderFormsTab(song)}
      ${state.metadataPopupOpen ? renderSongMetadataDialog(song) : ""}
    </div>
  `;

  refreshIcons();
  resizeFormTextareas();
}

function renderActivitiesDetail() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  if (state.activityError === "setup") {
    refs.detailPane.innerHTML = renderModuleEmptyDetail("activities", "Activities", "Activities unavailable.");
    refreshIcons();
    return;
  }

  if (state.activityError && state.activityError !== "setup") {
    refs.detailPane.innerHTML = renderUnavailableDetail("activities", "Activities", state.activityError);
    refreshIcons();
    return;
  }

  if (!state.activityLoaded) {
    refs.detailPane.innerHTML = renderLoadingDetail();
    refreshIcons();
    return;
  }

  const event = getSelectedActivityEvent();
  if (!event) {
    refs.detailPane.innerHTML = renderModuleEmptyDetail("activities", "Activities", "Activities");
    refreshIcons();
    return;
  }

  const teams = activityTeamsForEvent(event.id);
  const games = activityGamesForEvent(event.id);
  const scoreEvents = activityScoresForEvent(event.id).slice(0, 8);
  refs.detailPane.innerHTML = `
    <div class="editor-shell activities-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2>${escapeHtml(event.title)}</h2>
          <section class="song-description" aria-label="Activity event description">
            <p class="song-description-title">${escapeHtml(cleanList([formatActivityDate(event.date), event.location, event.status]).join(" · ") || "Activity Event")}</p>
          </section>
        </div>
        <div class="head-actions">
          <button class="reference-new-btn secondary" type="button" data-activity-action="new-event">
            <i data-lucide="plus"></i>
            <span>Event</span>
          </button>
          <button class="reference-new-btn secondary" type="button" data-activity-action="add-team" data-activity-event-id="${escapeAttr(event.id)}">
            <i data-lucide="users"></i>
            <span>Team</span>
          </button>
          <button class="reference-new-btn secondary" type="button" data-activity-action="add-game" data-activity-event-id="${escapeAttr(event.id)}">
            <i data-lucide="gamepad-2"></i>
            <span>Game</span>
          </button>
          <button class="icon-btn quiet" type="button" aria-label="Open activity presenter" disabled>
            <i data-lucide="screen-share"></i>
          </button>
        </div>
      </header>

      <section class="activities-board">
        <div class="activities-panel">
          <header><span>Teams</span><small>${teams.length}</small></header>
          <div class="activity-teams">
            ${teams.length ? teams.map(renderActivityTeamCard).join("") : `<p class="activity-empty">No teams yet.</p>`}
          </div>
        </div>
        <div class="activities-panel">
          <header><span>Games</span><small>${games.length}</small></header>
          <div class="activity-games">
            ${games.length ? games.map(renderActivityGameCard).join("") : `<p class="activity-empty">No games yet.</p>`}
          </div>
        </div>
        <div class="activities-panel">
          <header><span>Score log</span><small>${scoreEvents.length}</small></header>
          ${renderActivityScoreForm(event, teams, games)}
          <div class="activity-score-log">
            ${scoreEvents.length ? scoreEvents.map(renderActivityScoreEvent).join("") : `<p class="activity-empty">No score events yet.</p>`}
          </div>
        </div>
      </section>
    </div>
  `;
  refreshIcons();
}

function renderActivityScoreForm(event, teams, games) {
  if (!teams.length) return `<p class="activity-empty">Add teams to record scores.</p>`;
  return `
    <div class="activity-score-form">
      <select data-activity-score-field="team" aria-label="Team">
        ${teams.map((team) => `<option value="${escapeAttr(team.id)}">${escapeHtml(team.name)}</option>`).join("")}
      </select>
      <select data-activity-score-field="game" aria-label="Game">
        <option value="">Event</option>
        ${games.map((game) => `<option value="${escapeAttr(game.id)}">${escapeHtml(game.title)}</option>`).join("")}
      </select>
      <input data-activity-score-field="points" type="number" value="1" inputmode="numeric" aria-label="Points" />
      <input data-activity-score-field="reason" type="text" placeholder="Reason" aria-label="Reason" />
      <button class="icon-btn" type="button" data-activity-action="add-score" data-activity-event-id="${escapeAttr(event.id)}" aria-label="Add score">
        <i data-lucide="plus"></i>
      </button>
    </div>
  `;
}

function renderActivityTeamCard(team) {
  return `
    <article class="activity-team-card" style="--team-color: ${escapeAttr(team.color)}">
      <span class="activity-team-dot"></span>
      <strong>${escapeHtml(team.name)}</strong>
      <b>${formatCount(team.score)}</b>
    </article>
  `;
}

function renderActivityGameCard(game) {
  return `
    <article class="activity-game-card">
      <span>${escapeHtml(activityGameTypeLabel(game.game_type))}</span>
      <strong>${escapeHtml(game.title)}</strong>
      <small>${escapeHtml(cleanList([game.owner, game.location, game.status]).join(" · "))}</small>
    </article>
  `;
}

function renderActivityScoreEvent(event) {
  const team = state.activityTeams.find((item) => item.id === event.team_id);
  const game = state.activityGames.find((item) => item.id === event.game_id);
  const sign = event.points > 0 ? "+" : "";
  return `
    <article class="activity-score-event">
      <strong>${escapeHtml(team?.name || "Team")}</strong>
      <span>${escapeHtml(`${sign}${event.points}`)}</span>
      <small>${escapeHtml(cleanList([game?.title, event.reason]).join(" · "))}</small>
    </article>
  `;
}

function activityGameTypeLabel(type) {
  return ACTIVITY_GAME_TYPE_LABELS[String(type || "").trim()] || "Game";
}

function renderReferencesDetail() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  if (!state.referenceLinksLoaded) {
    refs.detailPane.innerHTML = renderLoadingDetail();
    refreshIcons();
    return;
  }

  if (state.referenceError && state.referenceError !== "setup") {
    refs.detailPane.innerHTML = renderUnavailableDetail("references", "References", state.referenceError);
    refreshIcons();
    return;
  }

  const links = getReferenceLinks();
  const hasLinks = links.length && !state.referenceError;
  refs.detailPane.innerHTML = `
    <div class="editor-shell references-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2>References</h2>
          <section class="song-description" aria-label="Reference description">
            <p class="song-description-title">${escapeHtml(referenceDetailSummary())}</p>
          </section>
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${state.dirty.references ? "" : "hidden"}>Unsaved changes</span>
          <button class="reference-new-btn secondary" type="button" data-reference-action="new-group" aria-label="New group">
            <i data-lucide="folder-plus"></i>
            <span>New group</span>
          </button>
          <button class="reference-new-btn" type="button" data-reference-action="new" aria-label="New link">
            <i data-lucide="plus"></i>
            <span>New link</span>
          </button>
        </div>
      </header>
      ${hasLinks ? `
        ${renderReferenceGroups(links)}
      ` : ""}
      ${!hasLinks ? renderReferenceSetupNotice() : ""}
    </div>
  `;
  refreshIcons();
}

function getReferenceEditorLinks() {
  const query = normalizeSearchValue(state.search);
  const links = [...state.referenceLinks].sort(sortReferenceLinks);
  if (!query) return links;
  return links.filter((link) =>
    normalizeSearchValue([link.title, link.group_name, link.url].filter(Boolean).join(" ")).includes(query),
  );
}

function referenceDetailSummary() {
  if (state.referenceError) return "";
  if (!state.referenceLinks.length) return "";
  return `${formatCount(state.referenceLinks.length)} links`;
}

function renderReferenceSetupNotice() {
  return `
    <div class="reference-setup-notice">
      <strong>No references</strong>
    </div>
  `;
}

function renderReferenceGroups(links) {
  const groups = [];
  for (const link of links) {
    const groupName = String(link.group_name || "").trim();
    const key = referenceGroupKey(groupName);
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, title: groupName || "Ungrouped", links: [] };
      groups.push(group);
    }
    group.links.push(link);
  }
  return `
    <div class="reference-group-stack">
      ${groups.map((group, index) => `
        <section class="reference-group">
          <div class="reference-group-head">
            ${state.editingReferenceGroupKey === group.key ? `
              <input
                class="reference-group-title-input"
                data-reference-group-field="name"
                data-reference-group-key="${escapeAttr(group.key)}"
                value="${escapeAttr(group.title === "Ungrouped" ? "" : group.title)}"
                placeholder="Group name"
                aria-label="Reference group name"
              />
            ` : `<h3>${escapeHtml(group.title)}</h3>`}
            <span>${escapeHtml(formatCount(group.links.length))}</span>
            <div class="reference-group-actions" aria-label="Move reference group">
              <button class="icon-btn quiet" type="button"
                data-reference-action="move-group-up"
                data-reference-group-key="${escapeAttr(group.key)}"
                ${index <= 0 ? "disabled" : ""}
                aria-label="Move group up">
                <i data-lucide="arrow-up"></i>
              </button>
              <button class="icon-btn quiet" type="button"
                data-reference-action="move-group-down"
                data-reference-group-key="${escapeAttr(group.key)}"
                ${index >= groups.length - 1 ? "disabled" : ""}
                aria-label="Move group down">
                <i data-lucide="arrow-down"></i>
              </button>
            </div>
            <button class="icon-btn quiet reference-group-edit" type="button"
              data-reference-action="${state.editingReferenceGroupKey === group.key ? "done-group" : "edit-group"}"
              data-reference-group-key="${escapeAttr(group.key)}"
              aria-label="${state.editingReferenceGroupKey === group.key ? "Done editing group" : "Edit group"}">
              <i data-lucide="${state.editingReferenceGroupKey === group.key ? "check" : "pencil"}"></i>
              <span>${state.editingReferenceGroupKey === group.key ? "Done" : "Rename"}</span>
            </button>
          </div>
          <div class="reference-link-grid">
            ${group.links.map((link) => renderReferenceCard(link, group.links)).join("")}
          </div>
        </section>
      `).join("")}
    </div>`;
}

function renderReferenceEditorRow(link, index = 0, total = 1) {
  const disabled = link.is_active === false ? " inactive" : "";
  return `
    <article class="reference-card reference-card--editing${disabled}">
      <div class="reference-editor-main">
        <label>
          <span>Title</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="title" value="${escapeAttr(link.title)}" placeholder="Site title" />
        </label>
        <label>
          <span>URL</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="url" value="${escapeAttr(link.url)}" placeholder="https://..." inputmode="url" />
        </label>
        <label>
          <span>Group</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="group_name" value="${escapeAttr(link.group_name)}" placeholder="Group" />
        </label>
      </div>
      <div class="reference-editor-actions">
        <div class="reference-editor-action-group">
          <div class="reference-move-actions" aria-label="Move reference">
            <button class="icon-btn quiet" type="button" data-reference-action="move-up" data-reference-id="${escapeAttr(link.id)}" ${index <= 0 ? "disabled" : ""} aria-label="Move up">
              <i data-lucide="arrow-up"></i>
            </button>
            <button class="icon-btn quiet" type="button" data-reference-action="move-down" data-reference-id="${escapeAttr(link.id)}" ${index >= total - 1 ? "disabled" : ""} aria-label="Move down">
              <i data-lucide="arrow-down"></i>
            </button>
          </div>
          <label class="reference-active-toggle">
            <input type="checkbox" data-reference-id="${escapeAttr(link.id)}" data-reference-field="is_active" ${link.is_active !== false ? "checked" : ""} />
            <span>Show</span>
          </label>
        </div>
        <div class="reference-editor-action-group">
          <button class="icon-btn quiet" type="button" data-reference-action="open" data-reference-id="${escapeAttr(link.id)}" aria-label="Open reference">
            <i data-lucide="external-link"></i>
          </button>
          <button class="icon-btn quiet" type="button" data-reference-action="done" data-reference-id="${escapeAttr(link.id)}" aria-label="Done editing">
            <i data-lucide="check"></i>
          </button>
          <button class="icon-btn danger" type="button" data-reference-action="delete" data-reference-id="${escapeAttr(link.id)}" aria-label="Delete reference">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderReferenceCard(link, allLinks = getReferenceEditorLinks()) {
  const index = allLinks.findIndex((item) => item.id === link.id);
  if (state.editingReferenceId === link.id) return renderReferenceEditorRow(link, index, allLinks.length);
  return `
    <article class="reference-card">
      <a class="reference-card-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
        <span>
          <strong>${escapeHtml(link.title)}</strong>
          <em>${escapeHtml(shortUrl(link.url))}</em>
        </span>
      </a>
      <div class="reference-card-actions">
        <button class="icon-btn quiet" type="button" data-reference-action="move-up" data-reference-id="${escapeAttr(link.id)}" ${index <= 0 ? "disabled" : ""} aria-label="Move up">
          <i data-lucide="arrow-up"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="move-down" data-reference-id="${escapeAttr(link.id)}" ${index >= allLinks.length - 1 ? "disabled" : ""} aria-label="Move down">
          <i data-lucide="arrow-down"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="edit" data-reference-id="${escapeAttr(link.id)}" aria-label="Edit link">
          <i data-lucide="pencil"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="open" data-reference-id="${escapeAttr(link.id)}" aria-label="Open reference">
          <i data-lucide="external-link"></i>
        </button>
      </div>
    </article>
  `;
}

function shortUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  } catch {
    return value || "";
  }
}

function renderSongDescription(song, primary, items = [], relatedSongs = []) {
  const supportItems = items.filter(Boolean);
  return `
    <section class="song-description song-description--song" aria-label="Song description">
      ${primary ? `<p class="song-description-title">${escapeHtml(primary)}</p>` : `<p class="song-description-title empty" aria-hidden="true">&nbsp;</p>`}
      ${supportItems.length ? `
        <div class="song-description-meta">
          ${supportItems.map(renderDescriptionMetaItem).join("")}
        </div>
      ` : ""}
      ${renderRelatedSongLinks(relatedSongs)}
    </section>
  `;
}

function renderSongHeaderMeta(items = [], options = {}) {
  const supportItems = items.filter(Boolean);
  if (!supportItems.length && !options.reserve) return "";
  return `
    <div class="song-description-meta song-description-meta--head${supportItems.length ? "" : " empty"}" ${supportItems.length ? "" : `aria-hidden="true"`}>
      ${supportItems.length ? supportItems.map(renderDescriptionMetaItem).join("") : "&nbsp;"}
    </div>
  `;
}

function renderDescriptionMetaItem(item) {
  if (item && typeof item === "object" && "label" in item) {
    return `
      <span class="meta-attribute">
        <span class="meta-attribute-label">${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </span>
    `;
  }
  return `<span>${escapeHtml(item)}</span>`;
}

function renderEditorMeta(primary, items = []) {
  const supportItems = items.filter(Boolean);
  return `
    <section class="song-description" aria-label="Metadata">
      ${primary ? `<p class="song-description-title">${escapeHtml(primary)}</p>` : `<p class="song-description-title empty" aria-hidden="true">&nbsp;</p>`}
      ${supportItems.length ? `
        <div class="song-description-meta">
          ${supportItems.map(renderDescriptionMetaItem).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderMetaItem(item) {
  if (item && typeof item === "object" && "label" in item) {
    return `
      <span class="meta-attribute">
        <span class="meta-attribute-label">${escapeHtml(item.label)}</span>
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
          <button class="icon-btn" type="button" data-close-metadata aria-label="Close metadata">
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
          ${renderMetadataInput("Translator", "translator", metadata.translator || "", "compact")}
          ${renderMetadataInput("Album", "album", metadata.album || "", "compact meta-album")}
          ${renderMetadataInput("Track", "track", metadata.track || "", "compact meta-track")}
          ${renderInput("References", "scripture", cleanList(song.scripture).join(LIST_INPUT_SEPARATOR), "compact meta-ref")}
        </div>
      </section>
    </div>
  `;
}

function renderScriptureMetadataDialog(scripture) {
  return `
    <div class="metadata-popover-layer">
      <section class="metadata-popover" role="dialog" aria-label="Scripture metadata">
        <header class="metadata-popover-head">
          <h3>Metadata</h3>
          <button class="icon-btn" type="button" data-close-metadata aria-label="Close metadata">
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="metadata-popover-grid scripture-metadata-popover-grid">
          ${renderScriptureInput("Title", "title", scripture.title)}
          ${renderScriptureBookSelect(scripture)}
          ${renderScriptureInput("Reference", "reference", scripture.reference)}
          ${renderScriptureInput("Translation", "translation", scripture.translation)}
        </div>
      </section>
    </div>
  `;
}

function metaAttribute(label, value) {
  const text = String(value || "").trim();
  return text ? { label, value: text } : null;
}

function relatedSongsForSong(song) {
  if (!song) return [];
  const relatedIds = new Set(cleanList(song.related_song_ids));
  for (const candidate of state.songs || []) {
    if (candidate?.id !== song.id && cleanList(candidate.related_song_ids).includes(song.id)) {
      relatedIds.add(candidate.id);
    }
  }
  relatedIds.delete(song.id);
  return [...relatedIds]
    .map((id) => (state.songs || []).find((candidate) => candidate.id === id))
    .filter(Boolean)
    .sort(sortSongs);
}

function renderRelatedSongLinks(songs) {
  if (!songs?.length) return "";
  return `
    <div class="related-song-links" aria-label="Related songs">
      <span>Linked</span>
      ${songs.map((song) => `
        <button class="related-song-link" type="button" data-open-song="${escapeAttr(song.id)}">
          <span>${escapeHtml(songListView(song).title || song.title || "Untitled")}</span>
          ${song.hymn_no ? `<span class="related-song-marker">${escapeHtml(song.hymn_no)}</span>` : ""}
        </button>
      `).join("")}
    </div>
  `;
}


function renderScriptureDetail() {
  const scripture = getSelectedScripture();
  const selectedBook = findBibleBookByCode(scripture?.book_code) || findBibleBookByCode(state.selectedBookCode) || findBibleBookByName(scripture?.book);

  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  if (state.scriptureError) {
    refs.detailPane.innerHTML = renderUnavailableDetail("scripture", "Scripture", state.scriptureError);
    refreshIcons();
    return;
  }

  if (isBibleTextSearchActive()) {
    refs.detailPane.innerHTML = renderBibleTextSearchDetail();
    refreshIcons();
    return;
  }

  if (!scripture && !selectedBook) {
    refs.detailPane.innerHTML = renderModuleEmptyDetail("scripture", "Scripture", "Select a book.");
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
          ${renderEditorMeta(titleMetaLine, [])}
          </div>
          <div class="editor-head-right">
            <div class="song-header-meta-row">
              ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
            </div>
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
          ${renderEditorMeta(titleMetaLine, [])}
        </div>
        <div class="editor-head-right">
          <div class="song-header-meta-row">
            ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
          </div>
          <div class="head-actions">
            <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
            <button class="btn secondary" type="button" data-copy-action="scripture">
              <i data-lucide="clipboard"></i>
              <span>Text</span>
            </button>
            <button class="btn secondary" type="button" data-copy-action="scripture-slides">
              <i data-lucide="copy"></i>
              <span>Slides</span>
            </button>
          </div>
        </div>
      </header>

      <section class="panel scripture-panel">
        ${renderScriptureTextarea("Passage", "text", scripture.text)}
        <div class="scripture-foot">
          <span>${scriptureBlockCount(scripture)} ${scriptureBlockCount(scripture) === 1 ? "block" : "blocks"}</span>
        </div>
        ${renderScriptureTextarea("Note", "memo", scripture.memo || "", "scripture-memo")}
      </section>
      ${state.metadataPopupOpen ? renderScriptureMetadataDialog(scripture) : ""}
    </div>
  `;

  refreshIcons();
}

function renderSongAttentionIcon(song) {
  const emptyStatus = songEmptyStatus(song);
  const needsReview = songNeedsReview(song);
  const labels = [];
  if (emptyStatus) labels.push(emptyStatus === "all-empty" ? "Empty" : "Partial");
  if (needsReview) labels.push("Review");
  if (!labels.length) return "";
  const detailLabel = songAttentionLabel(song, labels);
  const tone = emptyStatus === "all-empty"
    ? "all-empty"
    : needsReview && songAllVersionsNeedReview(song)
      ? "all-needs-review"
      : needsReview
        ? (songNeedsReviewFromImport(song) ? "needs-review" : "needs-review-original")
        : "some-empty";
  return renderAttentionIcon(detailLabel, tone);
}

function songAttentionLabel(song, summaryLabels) {
  const versionLabels = (song?.versions || [])
    .map((version) => versionAttentionLabel(song, version))
    .filter(Boolean);
  if (versionLabels.length) return versionLabels.join(" / ");
  return joinMetaItems(summaryLabels);
}

function versionAttentionLabel(song, version, forms = version?.forms || []) {
  const info = versionAttentionInfo(song, version, forms);
  if (!info.hasIssue) return "";
  const name = versionDisplayName(song, version);
  const reasons = info.reasons.length ? ` (${info.reasons.join(", ")})` : "";
  return `${name}: ${info.labels.join(", ")}${reasons}`;
}

function versionAttentionInfo(song, version, forms = version?.forms || []) {
  const normalizedForms = normalizeForms((forms || []).map((form) => ({ ...form, song_id: version?.id })));
  const empty = !versionHasLyrics({ ...version, forms: normalizedForms });
  const reasons = versionReviewReasons(song, version, normalizedForms);
  const needsReview = reasons.length > 0;
  const labels = [];
  if (empty) labels.push("Empty");
  if (needsReview) labels.push("Review");
  return {
    empty,
    needsReview,
    hasIssue: empty || needsReview,
    labels,
    reasons,
    tone: empty && !needsReview ? "some-empty" : "needs-review",
  };
}

function versionReviewReasons(song, version, forms = version?.forms || []) {
  const allowStructuralReview = shouldReviewVersionStructure(song, version, forms);
  const reasons = new Set();
  for (const form of forms || []) {
    if (form?.review_status === "reviewed") continue;
    if (form?.review_status === "needs_review") reasons.add("Marked");
    if (form?.review_status === "soft_review") reasons.add("Review");
    if (form?.import_source === "amen-coda-audit") reasons.add("Amen split check");
    else if (form?.import_source === "ccm-children-duplicate-lyrics") reasons.add("CCM/children duplicate lyrics");
    else if (form?.import_source) reasons.add("Lyrics check");
    if (allowStructuralReview && formLooksUnsplit(form)) reasons.add("Unsplit lyrics");
  }
  if (allowStructuralReview && (forms || []).some((form) => form?.review_status !== "reviewed")) {
    reasons.add("Verse-only structure");
  }
  return [...reasons];
}

function songNeedsReviewFromImport(song) {
  return (song?.versions || []).some((version) =>
    (version?.forms || []).some((form) =>
      form?.review_status === "soft_review" || (Boolean(form?.import_source) && form?.review_status !== "reviewed")),
  );
}

function renderAttentionIcon(label, tone = "needs-review") {
  return `
    <span class="attention-icon ${tone}" aria-label="${escapeAttr(label)}">
      !
    </span>
  `;
}

function songNeedsReview(song) {
  return (song?.versions || []).some((version) => versionNeedsFormReview(song, version));
}

function songAllVersionsNeedReview(song) {
  const versionsWithForms = (song?.versions || []).filter((version) => (version?.forms || []).length > 0);
  if (versionsWithForms.length < 2) return false;
  return versionsWithForms.every((version) => versionNeedsFormReview(song, version));
}

function versionNeedsFormReview(song, version) {
  return versionReviewReasons(song, version).length > 0;
}

function shouldReviewVersionStructure(song, version, forms = version?.forms || []) {
  if (isHymnBookVersion(song, version)) return false;
  if (forms.length < 2) return false;
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
  const gridStyle = "grid-template-columns: minmax(320px, 1fr);";
  return `
    <div class="version-compare-grid single-version">
      <div class="version-compare-head" style="${gridStyle}">
        <div class="version-compare-title active">
          ${renderVersionTitleContent(song, version, state.forms, { active: true })}
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
  const gridStyle = `grid-template-columns: repeat(${versions.length}, minmax(320px, 1fr));`;

  return `
    <div class="version-compare-grid">
      <div class="version-compare-head" style="${gridStyle}">
        ${versions.map((version) => renderVersionCompareHead(song, version)).join("")}
      </div>
      <div class="version-compare-columns" style="${gridStyle}">
        ${versionForms.map(({ version, forms }) => renderVersionCompareColumn(version, forms)).join("")}
      </div>
    </div>
  `;
}

function renderVersionCompareColumn(version, forms) {
  const active = version.id === getSelectedVersionId();
  const song = getSelectedSong();
  const content = forms.length
    ? forms.map((form, index) => {
        if (active) return renderFormBlock(form, index, { song, version });
        return `
          <div class="version-picker" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
            ${renderReadonlyFormBlock(form, { song, version })}
          </div>
        `;
      }).join("")
    : `<div class="version-empty-cell" aria-hidden="true"></div>`;
  return `<div class="version-compare-column${active ? " active" : ""}">${content}</div>`;
}

function renderAddVersionButton(sourceVersionId) {
  return `
    <button class="version-add-btn" type="button" data-add-version data-source-version-id="${escapeAttr(sourceVersionId || "")}" aria-label="Duplicate as new version">
      <i data-lucide="copy-plus"></i>
    </button>
  `;
}

function renderCopyVersionButton(version, forms) {
  const hasLyrics = getCopyableForms(forms).length > 0;
  return `
    <button class="version-copy-btn" type="button" data-copy-action="plain" data-version-id="${escapeAttr(version?.id || "")}" aria-label="Copy version lyrics" ${hasLyrics ? "" : "disabled"}>
      <i data-lucide="clipboard"></i>
    </button>
  `;
}

function renderVersionCompareHead(song, version) {
  const active = version.id === getSelectedVersionId();
  const forms = getFormsForVersion(version);
  return `
    <div class="version-compare-title version-picker${active ? " active" : ""}" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
      ${renderVersionTitleContent(song, version, forms, { active })}
    </div>
  `;
}

function renderVersionTitleContent(song, version, forms, options = {}) {
  const active = Boolean(options.active);
  return `
    <div class="version-title-main">
      <span class="version-title-text">${escapeHtml(versionDisplayName(song, version || {}))}</span>
      ${renderVersionAttentionStatus(song, version, forms, { active })}
    </div>
    <div class="version-title-actions">
      ${active ? renderVersionPraiseTypeTags(version) : ""}
      ${renderCopyVersionButton(version, forms)}
      ${renderAddVersionButton(version?.id)}
    </div>
  `;
}

function renderVersionAttentionStatus(song, version, forms, options = {}) {
  const info = versionAttentionInfo(song, version, forms);
  if (!info.hasIssue) return "";
  const label = versionAttentionLabel(song, version, forms);
  const visibleLabel = info.needsReview ? "Review" : "Empty";
  return `
    <span class="version-attention-status ${escapeAttr(info.tone)}" aria-label="${escapeAttr(label)}">
      <span class="version-attention-mark">!</span>
      <span>${escapeHtml(visibleLabel)}</span>
      ${options.active && info.needsReview ? `
        <button class="version-review-btn review-action" type="button" data-version-action="mark-all-reviewed" aria-label="Mark this version reviewed">
          <i data-lucide="check"></i>
        </button>
      ` : ""}
    </span>
  `;
}

function getFormsForVersion(version) {
  if (version.id === getSelectedVersionId()) return state.forms;
  return normalizeForms((version.forms || []).map((form) => ({ ...form, song_id: version.id })));
}

function getVersionById(versionId) {
  const song = getSelectedSong();
  if (!versionId) return null;
  return (song?.versions || []).find((version) => version.id === versionId) || null;
}

function getFormsForVersionId(versionId) {
  const version = getVersionById(versionId);
  return version ? getFormsForVersion(version) : state.forms;
}


function renderFormToolbar(song) {
  return `
    <div class="section-bar form-toolbar" aria-label="Add song form">
      <div class="form-buttons">
        ${STRUCTURAL_PART_TYPES
          .map(
            (type) => `
              <button class="btn secondary" type="button" data-add-form="${type}">
                <i data-lucide="plus"></i>
                <span>${FORM_ADD_LABELS[type] || type}</span>
              </button>
            `,
          )
          .join("")}
      </div>
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

function renderMetadataInput(label, field, value, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      <input type="text" data-song-meta-field="${field}" value="${escapeAttr(value)}" />
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
  return `<span class="scripture-book-marker" aria-label="${escapeAttr(label)}">${escapeHtml(book.shortName)}</span>`;
}

function renderScriptureChapterBadge(book) {
  const count = getBibleChapterCount(book);
  if (!count) return "";
  const label = `${count} ${count === 1 ? "chapter" : "chapters"}`;
  return `<span class="song-count-badge scripture-chapter-badge" aria-label="${escapeAttr(label)}">${escapeHtml(String(count))}</span>`;
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
          ${renderEditorMeta(`"${state.bibleTextSearchQuery}"`, [])}
        </div>
        <div class="editor-head-right">
          <div class="song-header-meta-row">
            ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
          </div>
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
    return `<div class="bible-reader-note">No verses found for "${escapeHtml(state.bibleTextSearchQuery)}".${renderOtherTranslationOptions()}</div>`;
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
            <button class="bible-verse-copy" type="button" data-copy-bible-search-result="${index}" aria-label="Copy ${escapeAttr(reference)}">
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
      <button class="icon-btn" type="button" data-bible-search-page="-1" aria-label="Previous results" ${hasPrevious ? "" : "disabled"}>
        <i data-lucide="chevron-left"></i>
      </button>
      <button class="icon-btn" type="button" data-bible-search-page="1" aria-label="Next results" ${hasNext ? "" : "disabled"}>
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
    return `<div class="bible-reader-note">${escapeHtml(state.bibleReaderError)}</div>`;
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
      ${renderBibleCopyFormatControl()}
      ${options.chapterControl ? renderBibleChapterCopyButton() : ""}
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
        <button class="icon-btn" type="button" data-bible-reader-action="-1" aria-label="Previous chapter" ${hasPreviousChapter ? "" : "disabled"}>
          <i data-lucide="chevron-left"></i>
        </button>
        <select data-bible-reader-field="chapter" ${chapters.length ? "" : "disabled"}>
          ${chapters.length
            ? chapters.map((chapter) => `<option value="${chapter}" ${chapter === state.selectedBibleChapter ? "selected" : ""}>${chapter}</option>`).join("")
            : `<option value="1">1</option>`}
        </select>
        <button class="icon-btn" type="button" data-bible-reader-action="1" aria-label="Next chapter" ${hasNextChapter ? "" : "disabled"}>
          <i data-lucide="chevron-right"></i>
        </button>
      </span>
    </label>
  `;
}

function renderBibleCopyFormatControl() {
  const copyFormat = state.bibleCopyReference ? "with_reference" : "text_only";
  return `
    <label class="bible-control bible-control--copy">
      <span>Copy format</span>
      <select data-bible-reader-field="copy_format">
        <option value="with_reference" ${copyFormat === "with_reference" ? "selected" : ""}>Reference + text</option>
        <option value="text_only" ${copyFormat === "text_only" ? "selected" : ""}>Text only</option>
      </select>
    </label>
  `;
}

function renderBibleChapterCopyButton() {
  return `
    <button class="btn secondary bible-copy-chapter" type="button" data-copy-bible-chapter aria-label="Copy this chapter">
      <i data-lucide="copy"></i>
      <span>Copy chapter</span>
    </button>
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

function renderOtherTranslationOptions() {
  const others = state.bibleTranslations.filter((translation) => translation.id !== state.selectedBibleTranslationId);
  if (!others.length) return "";
  return `
    <div class="bible-reader-translation-fallback">
      <span>다른 역본 보기</span>
      ${others.map((translation) => `
        <button class="btn secondary" type="button" data-switch-bible-translation="${escapeAttr(translation.id)}">
          ${escapeHtml(translation.abbreviation || translation.name)}
        </button>
      `).join("")}
    </div>`;
}

function renderBibleVerseList(verses) {
  if (!state.bibleBookVerses.length) return `<div class="bible-reader-note">No verses loaded for this book.${renderOtherTranslationOptions()}</div>`;
  if (!verses.length) return `<div class="bible-reader-note">No verses in this chapter.${renderOtherTranslationOptions()}</div>`;
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
            <button class="bible-verse-copy" type="button" data-copy-bible-verse="${escapeAttr(String(verse.verse))}" aria-label="Copy verse ${escapeAttr(String(verse.verse))}">
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
  return `
    <article class="form-block">
      <div class="form-head">
        <div class="form-meta">
          <select class="form-type-select" data-form-field="part_type" data-index="${index}" aria-label="Form type">
            ${PART_TYPES.map(
              (type) =>
                `<option value="${type}" ${form.part_type === type ? "selected" : ""}>${escapeHtml(form.part_type === type ? label : type)}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="form-actions">
          <button class="icon-btn" type="button" data-form-action="up" data-index="${index}" aria-label="Move block up" ${index === 0 ? "disabled" : ""}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="down" data-index="${index}" aria-label="Move block down" ${index === state.forms.length - 1 ? "disabled" : ""}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="copy" data-index="${index}" aria-label="Copy block">
            <i data-lucide="copy"></i>
          </button>
          <button class="icon-btn danger" type="button" data-form-action="delete" data-index="${index}" aria-label="Delete block">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <textarea class="form-textarea" data-form-field="lyrics" data-index="${index}" rows="1" aria-label="${escapeAttr(label)} lyrics">${escapeHtml(form.lyrics || "")}</textarea>
    </article>
  `;
}

function renderReadonlyFormBlock(form, options = {}) {
  return `
    <article class="form-block readonly">
      <div class="form-head">
        <div class="form-meta">
          <span class="form-label-text">${escapeHtml(displayLabel(form))}</span>
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
    if (form.part_type === "Lyrics") return { ...form, part_number: null };
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

function formLooksUnsplit(form) {
  if (form?.part_type === "Lyrics") return false;
  const lyrics = String(form?.lyrics || "").trim();
  if (!lyrics) return false;
  if (/\[(?:Verse|Chorus|Pre-Chorus|Bridge|Coda|Amen|Lyrics)(?:\s+\d+)?\]/i.test(lyrics)) return true;
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
    Lyrics: "#6B7280",
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
    related_song_ids: cleanList(memo.related_song_ids),
    _memoHasVersions: memo.versions.length > 0,
    versions: normalizeSongVersions(row, versions),
  };
}

function normalizeSongVersions(song, versions) {
  const normalized = (versions || []).map((version, index) => ({
    ...version,
    id: version.id || `${song.id}:version:${index + 1}`,
    name: normalizeGeneratedVersionName(version.name || version.curated_version_name || version.version_label || `Version ${index + 1}`),
    version_label: version.version_label || null,
    raw_section_name: version.raw_section_name || null,
    hymn_no: version.hymn_no || null,
    is_primary: Boolean(version.is_primary) || index === 0,
    metadata: normalizeSongMetadata(version.metadata),
    forms: normalizeForms(Array.isArray(version.forms) ? version.forms : []),
    praise_types: normalizePraiseTypes(version.praise_types),
  }));
  if (normalized.length && !normalized.some((version) => version.is_primary)) normalized[0].is_primary = true;
  return normalized;
}

function normalizeRelationalVersion(row, index) {
  return {
    id: row.id,
    version_order: Number(row.version_order) || index + 1,
    name: normalizeGeneratedVersionName(row.curated_version_name || row.version_label || `Version ${index + 1}`),
    version_label: row.version_label || null,
    raw_section_name: row.raw_section_name || null,
    hymn_no: row.hymn_no || null,
    is_primary: Boolean(row.is_primary) || index === 0,
    praise_types: normalizePraiseTypes(row.praise_types),
    source_song_id: row.source_song_id || null,
    canonical_song_id: row.canonical_song_id || null,
    forms: [],
  };
}

function sortVersionRows(a, b) {
  return (Number(a?.version_order) || 9999) - (Number(b?.version_order) || 9999)
    || String(a?.version_label || "").localeCompare(String(b?.version_label || ""), "ko")
    || String(a?.id || "").localeCompare(String(b?.id || ""));
}

function normalizeRelationalUnit(row, index) {
  const partType = row.curated_unit_type || row.part_type || row.unit_kind || "Lyrics";
  return {
    id: row.id,
    song_id: row.version_id,
    part_type: PART_TYPES.includes(partType) ? partType : "Lyrics",
    part_number: row.part_number || null,
    label: row.curated_unit_label || row.unit_label || null,
    lyrics: row.text || row.lyrics || "",
    sort_order: Number(row.curated_order || row.unit_order || index + 1),
    review_status: row.review_status === "pending" ? null : row.review_status || null,
    import_source: row.import_source || null,
  };
}

function parseSongMemo(value) {
  if (!value) return { versions: [], scripture: [], metadata: {}, related_song_ids: [] };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      versions: Array.isArray(parsed?.versions) ? parsed.versions : [],
      scripture: cleanList(parsed?.scripture),
      metadata: normalizeSongMetadata(parsed?.metadata),
      related_song_ids: cleanList(parsed?.related_song_ids || parsed?.relatedSongIds),
    };
  } catch {
    return { versions: [], scripture: [], metadata: {}, related_song_ids: [] };
  }
}

function serializeSongMemo(song, options = {}) {
  const scripture = options.omitScripture ? [] : cleanList(song.scripture);
  const relatedSongIds = options.omitRelatedSongs
    ? []
    : cleanList(song.related_song_ids).filter((id) => id !== song.id);
  const metadata = options.omitPromotedMetadata
    ? omitPromotedSongMetadata(song, normalizeSongMetadata(song.metadata))
    : normalizeSongMetadata(song.metadata);
  const payload = {
    ...(scripture.length ? { scripture } : {}),
    ...(relatedSongIds.length ? { related_song_ids: relatedSongIds } : {}),
    ...(Object.keys(metadata).length ? { metadata } : {}),
    ...(!options.omitVersions
      ? {
        versions: (song.versions || []).map((version, index) => {
        const versionMetadata = normalizeSongMetadata(version.metadata);
        return {
          id: version.id,
          name: normalizeGeneratedVersionName(version.name || `Version ${index + 1}`),
          raw_section_name: version.raw_section_name || null,
          hymn_no: version.hymn_no || null,
          is_primary: Boolean(version.is_primary) || index === 0,
          ...(version.praise_types?.length ? { praise_types: version.praise_types } : {}),
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
      }
      : {}),
  };
  return Object.keys(payload).length ? JSON.stringify(payload, null, 0) : null;
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
    const value = nullIfBlank(row[column]);
    if (value) metadata[key] = value;
  }
  return normalizeSongMetadata(metadata);
}

function promotedSongMetadataPayload(song, metadata) {
  const payload = {};
  for (const [key, column] of Object.entries(PROMOTED_SONG_METADATA_COLUMNS)) {
    if (!hasSongColumn(song, column)) continue;
    payload[column] = metadata[key] || null;
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

function versionDisplayName(song, version = {}) {
  version = version || {};
  const hymnalName = hymnalVersionName(song, version);
  if (hymnalName) return hymnalName;
  if (song?.hymn_no && isDefaultVersionName(version.name || version.curated_version_name)) return "새찬송가";
  if (isRedundantSingleVersionName(song, version, version.name || version.curated_version_name)) return "Default";
  if (version.name) return displayVersionName(version.name);
  if (version.curated_version_name) return displayVersionName(version.curated_version_name);
  const raw = version.raw_section_name || version.version_label || "";
  const canonicalTitle = song?.title || "";
  const canonicalHymnNo = song?.hymn_no ? `${song.hymn_no} ${canonicalTitle}` : canonicalTitle;
  const trailingLegacyMatch = raw.match(/^(.*?)\s*\((통\s*\d+)\)\s*$/);
  if (trailingLegacyMatch) {
    const hymnTitle = trailingLegacyMatch[1].trim();
    const hymnNumber = trailingLegacyMatch[2].replace(/\s+/g, " ").trim();
    if (normalizeTitle(hymnTitle) !== normalizeTitle(canonicalTitle)) return `${hymnNumber} ${hymnTitle}`;
    return hymnNumber;
  }
  const hymnNumberMatch = raw.match(/통\s*\d+(?:\s+.*)?$/);
  if (hymnNumberMatch) return hymnNumberMatch[0].replace(/\s+/g, " ").trim();
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
  for (const value of [song?.subtitle, song?.original_title]) {
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
  const title = song?.hymn_no ? stripHymnNumber(song.title) : song?.title || "";
  const canonicalMeta = songTitleMetaLine(song);
  return {
    listVersion,
    title,
    meta: canonicalMeta,
    showHymnMarker: Boolean(song?.hymn_no && !listVersion),
  };
}

function versionEffectivePraiseTypes(song, version) {
  const explicitTypes = normalizePraiseTypes(version?.praise_types);
  if (explicitTypes.length) return explicitTypes;
  if (song?.hymn_no && isHymnBookVersion(song, version)) return ["hymn"];
  if (!song?.hymn_no) return ["ccm"];
  return [];
}

function aggregateSongPraiseTypes(song) {
  const types = new Set();
  for (const version of song?.versions || []) {
    versionEffectivePraiseTypes(song, version).forEach((type) => types.add(type));
  }
  if (!types.size && song?.hymn_no) types.add("hymn");
  if (!types.size && !song?.hymn_no) types.add("ccm");
  return PRAISE_TYPES.filter((type) => types.has(type));
}

function updateSongPraiseTypesFromVersions(song) {
  if (!song || !hasSongColumn(song, "praise_types")) return;
  song.praise_types = aggregateSongPraiseTypes(song);
}

function computeSongTypes(song) {
  return new Set(aggregateSongPraiseTypes(song));
}

function resolveSongForFilter(song, filterKey) {
  if (!song) return { matches: false, version: null };
  if (filterKey === "all") return { matches: true, version: null };

  const types = computeSongTypes(song);
  const matches = types.has(filterKey);
  if (!matches) return { matches: false, version: null };

  let version = null;
  if (filterKey === "ccm" || filterKey === "children") {
    version = (song.versions || []).find((v) =>
      versionEffectivePraiseTypes(song, v).includes(filterKey)
    ) || null;
  }

  return { matches, version };
}

function getPraiseFilterListVersion(song) {
  return resolveSongForFilter(song, state.praiseFilter).version;
}

function songPraiseTypes(song) {
  return [...computeSongTypes(song)];
}

function songHasPraiseType(song, type) {
  return resolveSongForFilter(song, type).matches;
}

function songSupportMetaItems(song) {
  const metadata = normalizeSongMetadata(song?.metadata);
  const structuredCreditItems = songCreditMetaItems(metadata);
  return [
    metaAttribute("Scripture", cleanList(song?.scripture).join(" · ") || null),
    songArtistAlbumMetaItem(metadata),
    ...structuredCreditItems,
    metaAttribute("Translator", metadata.translator),
  ].filter(Boolean);
}

function songArtistAlbumMetaItem(metadata) {
  const artist = String(metadata?.artist || "").trim();
  const album = formatAlbumMeta(metadata);
  if (artist && album) return metaAttribute("Artist/Album", `${artist} – ${album}`);
  if (artist) return metaAttribute("Artist", artist);
  if (album) return metaAttribute("Album", album);
  return null;
}

function songCreditMetaItems(metadata) {
  const lyricist = String(metadata?.lyricist || "").trim();
  const composer = String(metadata?.composer || "").trim();
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
  const normalizedText = normalizeTitle(text);
  for (const existing of target) {
    const normalizedExisting = normalizeTitle(existing);
    if (normalizedExisting && normalizedExisting === normalizedText) return;
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
  return value === "default" || value === "기본" || value === "어린이" || value === "children";
}

function hymnalVersionName(song, version) {
  if (!song?.hymn_no) return "";
  const values = [version.name, version.curated_version_name, version.hymn_no, version.raw_section_name, version.version_label];
  for (const value of values) {
    const text = value || "";
    const match = text.match(/(?:^|\(|\s)통(?:일)?\s*(\d+)(?:\s+([^)]*?))?(?:\)|$)/);
    if (!match) continue;
    const rawTitle = (match[2] || "").trim();
    const title = rawTitle || hymnTitleFromRaw(version) || stripHymnNumber(song.title || "");
    return `통일 ${match[1]} ${title}`.trim();
  }
  return "";
}

function hymnTitleFromRaw(version) {
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
  if (state.praiseFilter === "children") return state.songs.filter((song) => songHasPraiseType(song, "children"));
  return state.songs;
}

function joinMetaItems(items) {
  return cleanList(items).join(META_SEPARATOR);
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
    searchField("hymn", formatHymnMarker(song.hymn_no), 125),
    searchField("meta", song.subtitle, 88),
    searchField("meta", song.original_title, 88),
    ...cleanList(song.scripture).map((reference) => searchField("meta", reference, 70)),
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
    fields.push(searchField("version", versionDisplayName(song, version), 118));
    fields.push(searchField("version", version.raw_section_name, 58));
    fields.push(searchField("version", version.version_label, 52));
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
  const match =
    text.match(/^(.+?)\s+(\d{1,3})\s+(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/) ||
    text.match(/^(.+?)\s+(\d{1,3})(?::\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?$/);
  if (!match) return null;
  const book = findBibleBookByReferenceName(match[1]);
  if (!book) return null;
  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : null;
  const verseEnd = match[4] ? Number(match[4]) : null;
  if (!chapter || chapter < 1 || (verse !== null && verse < 1) || (verseEnd !== null && verseEnd < verse)) return null;
  return { book, chapter, verse, verseEnd };
}

function normalizeReferenceInput(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/[：.]/g, ":")
    .replace(/[–~]/g, "-")
    .replace(/(\d{1,3})\s*장\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*절?/g, (_, chapter, verse, verseEnd) =>
      `${chapter} ${verse}${verseEnd ? `-${verseEnd}` : ""}`)
    .replace(/(\d{1,3})\s*장/g, "$1")
    .replace(/(\d{1,3})\s*절/g, "$1")
    .replace(/\s*:\s*/g, ":")
    .replace(/^([1-3])\s+([A-Za-z가-힣])/, "$1$2")
    .replace(/([^\s\d:-])(\d{1,3})(?::\d{1,3}(?:-\d{1,3})?)?$/u, (match, prefix) => {
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
    verseEnd: reference.verseEnd,
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

function requireClient({ silent = false } = {}) {
  if (state.client) return true;
  if (!silent) showToast(state.connectionError || DB_CONNECTION_EMPTY_MESSAGE, "error");
  return false;
}

function hasDirtyChanges() {
  return state.dirty.song || state.dirty.forms || state.dirty.scripture || state.dirty.service || state.dirty.references;
}

async function confirmSaveBeforeLeaving() {
  if (!hasDirtyChanges()) return true;
  if (!confirm("Save changes before leaving?")) return false;
  await saveAll();
  return !hasDirtyChanges();
}

function updateSaveState() {
  if (state.module === "home" || state.module === "calendar" || state.module === "activities") {
    refs.saveAllBtn.disabled = true;
    renderConnectionStatus();
    return;
  }

  if (state.module === "references") {
    refs.saveAllBtn.disabled = !state.dirty.references || state.saving;
    renderConnectionStatus();
    const dirtyPill = refs.detailPane.querySelector(".dirty-pill");
    if (dirtyPill) dirtyPill.hidden = !state.dirty.references;
    return;
  }

  if (state.module === "service") {
    const selectedService = state.services.find((svc) => svc.id === state.selectedServiceId);
    refs.saveAllBtn.disabled = !selectedService || !state.dirty.service || state.saving;
    renderConnectionStatus();
    const dirtyPill = refs.detailPane.querySelector(".dirty-pill");
    if (dirtyPill) dirtyPill.hidden = !state.dirty.service;
    return;
  }
  const selectedItem = state.module === "scripture" ? getSelectedScripture() : getSelectedSong();
  refs.saveAllBtn.disabled = !selectedItem || !hasDirtyChanges() || state.saving || state.loading;
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
    children: "children",
    어린이: "children",
    파이디온: "children",
    elem: "children",
    어린이찬양: "children",
  };
  return [...new Set(parseList(value).map((item) => aliases[normalizeTitle(item)]).filter((item) => PRAISE_TYPES.includes(item)))];
}

function nullIfBlank(value) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function createUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return createLocalId();
}

function normalizeCanonicalTitle(value) {
  return normalizeTitle(value).replace(/\s+/g, "");
}

function versionLyricSignature(version) {
  const text = (version?.forms || []).map((form) => form.lyrics || "").join("\n\n");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `mindex-${Math.abs(hash).toString(16) || "0"}`;
}

function isUnavailableRelationError(error) {
  const code = String(error?.code || "");
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return code === "42P01"
    || code === "42501"
    || code === "PGRST205"
    || /permission denied|schema cache|could not find the table|relation .* does not exist/i.test(message);
}

function isUnavailableRpcError(error) {
  const code = String(error?.code || "");
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return code === "42883"
    || code === "PGRST202"
    || code === "PGRST203"
    || /could not find .*function|function .* does not exist|schema cache/i.test(message);
}

function isWorshipNotReadyError(error) {
  return String(error?.code || "") === "MINDEX_WORSHIP_NOT_READY";
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const text = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(value);
}

function toLocalDateStr(value) {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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
  if (!message || !refs.toastRegion) return;
  const toastKey = `${type}:${message}`;
  const existingToast = Array.from(refs.toastRegion.children).find((toast) => toast.dataset.toastKey === toastKey);
  if (existingToast) {
    refs.toastRegion.appendChild(existingToast);
    window.clearTimeout(existingToast.removeTimer);
    existingToast.removeTimer = window.setTimeout(() => existingToast.remove(), 3200);
    return;
  }

  while (refs.toastRegion.children.length >= 3) {
    refs.toastRegion.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.dataset.toastKey = toastKey;
  toast.textContent = message;
  refs.toastRegion.appendChild(toast);
  toast.removeTimer = window.setTimeout(() => toast.remove(), 3200);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  refreshPresenterMiniPreviewScales();
}

function refreshPresenterMiniPreviewScales(root = document) {
  const previews = Array.from(root.querySelectorAll(".svc-slide-mini-output"));
  if (!previews.length) return;
  previews.forEach(syncPresenterMiniPreviewScale);
  if (!window.ResizeObserver) return;
  if (!presenterMiniPreviewResizeObserver) {
    presenterMiniPreviewResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => syncPresenterMiniPreviewScale(entry.target));
    });
  } else {
    presenterMiniPreviewResizeObserver.disconnect();
  }
  previews.forEach((preview) => presenterMiniPreviewResizeObserver.observe(preview));
}

function syncPresenterMiniPreviewScale(preview) {
  if (!(preview instanceof Element)) return;
  const width = preview.getBoundingClientRect().width;
  if (!width) return;
  preview.style.setProperty("--svc-mini-scale", String(width / 1280));
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

const MONTHLY_ORDER_TEMPLATE_FALLBACK = [
  {
    label: "찬양",
    name: "찬양",
    phase: "Gathering",
    required: true,
    flex: true,
    repeatable: true,
    sectionKey: "praise",
    elements: Array.from({ length: 5 }, (_, index) => ({
      label: "찬양",
      name: `찬양 ${index + 1}`,
      elementType: "praise",
      orderSheet: { order: "찬양", group: "praise" },
    })),
  },
  { label: "대표기도", name: "대표기도", phase: "Gathering", required: true, flex: false, sectionKey: "prayer", elementType: "title_person", default_text: "기도", orderSheet: { order: "대표기도" } },
  { label: "성경봉독", name: "성경봉독", phase: "Word", required: true, flex: false, sectionKey: "scripture_reading", elementType: "scripture_reading" },
  { label: "특송", name: "특송", phase: "Word", required: false, flex: true, sectionKey: "special_song", elementType: "title_person" },
  { label: "설교", name: "설교", phase: "Word", required: true, flex: false, sectionKey: "sermon", elementType: "title_person" },
  {
    label: "결단",
    name: "결단",
    phase: "Response",
    required: false,
    flex: true,
    sectionKey: "response_song",
    elements: [
      { label: "결단찬양", name: "결단찬양", elementType: "praise", orderSheet: { order: "결단찬양", group: "praise" } },
      { label: "결단기도", name: "결단기도", elementType: "title_person", orderSheet: { order: "결단기도" } },
    ],
  },
  {
    label: "월삭기도",
    name: "월삭기도",
    phase: "Response",
    required: true,
    flex: true,
    sectionKey: "monthly_prayer",
    elements: [
      { label: "월삭기도", name: "기도 1", elementType: "title_person", orderSheet: { order: "기도 1" } },
      { label: "월삭기도", name: "기도 2", elementType: "title_person", orderSheet: { order: "기도 2" } },
      { label: "찬양", name: "기도 찬양", elementType: "praise", orderSheet: { order: "찬양", group: "praise" } },
      { label: "월삭기도", name: "기도 3", elementType: "title_person", orderSheet: { order: "기도 3" } },
      { label: "월삭기도", name: "기도 4", elementType: "title_person", orderSheet: { order: "기도 4" } },
    ],
  },
  {
    label: "봉헌",
    name: "봉헌",
    phase: "Response",
    required: true,
    flex: false,
    sectionKey: "offering",
    elements: [
      {
        label: "봉헌",
        name: "봉헌찬양",
        elementType: "praise",
        default_text: "이런 교회 되게 하소서",
        formHint: "V-C",
        formPreset: { forms: ["V", "C"], strength: "suggested" },
        defaultStrength: "suggested",
        orderSheet: { order: "봉헌", group: "praise" },
      },
      { label: "봉헌기도", name: "봉헌기도", elementType: "title_person", orderSheet: { order: "봉헌기도" } },
    ],
  },
  { label: "교회소식", name: "교회소식", phase: "Sending", required: true, flex: false, sectionKey: "announcements", elementType: "plain_text" },
  {
    label: "찬양",
    name: "찬양",
    phase: "Sending",
    required: true,
    flex: false,
    sectionKey: "closing_song",
    elementType: "praise",
    default_text: "여기에 모인 우리",
    formHint: "V1-C-C",
    formPreset: { forms: ["V1", "C", "C"], strength: "default" },
    defaultStrength: "default",
    orderSheet: { order: "찬양", group: "praise" },
  },
  { label: "축도", name: "축도", phase: "Sending", required: true, flex: false, sectionKey: "benediction", elementType: "title_person" },
  {
    label: "마무리",
    name: "마무리",
    phase: "Sending",
    required: true,
    flex: false,
    sectionKey: "closing_visual",
    elementType: "image",
    orderSheet: { hidden: true },
  },
];

function responseSectionTemplate() {
  return {
    label: "결단",
    name: "결단",
    phase: "Response",
    required: false,
    flex: true,
    sectionKey: "response_song",
    elements: [
      { label: "결단찬양", name: "결단찬양", elementType: "praise", orderSheet: { order: "결단찬양", group: "praise" } },
      { label: "결단기도", name: "결단기도", elementType: "title_person", orderSheet: { order: "결단기도" } },
    ],
  };
}

const PUBLIC_SPECIAL_HYMN_FORM_PRESET_RULE = {
  when: { songType: "hymn" },
  formPreset: {
    forms: ["1절", "2절", "간주", "마지막 절"],
    hint: "1절-2절-간주-마지막 절",
    strength: "default",
  },
};

function publicWorshipImageClosingStep() {
  return {
    label: "마무리",
    name: "마무리",
    phase: "Sending",
    required: true,
    flex: false,
    sectionKey: "closing_visual",
    elementType: "image",
    orderSheet: { hidden: true },
  };
}

function scoreOutputMode(enabled = true) {
  return enabled ? { outputMode: "score" } : {};
}

function publicWorshipOfferingStep(options = {}) {
  const score = Boolean(options.score);
  const praiseLabel = options.praiseLabel || "봉헌찬양";
  return {
    label: "봉헌",
    name: "봉헌",
    phase: "Response",
    required: true,
    flex: false,
    sectionKey: "offering",
    elements: [
      { label: praiseLabel, name: praiseLabel, elementType: "praise", orderSheet: { order: "봉헌", group: "praise" }, ...scoreOutputMode(score) },
      { label: "봉헌기도", name: "봉헌기도", elementType: "title_person", orderSheet: { order: "봉헌기도" } },
    ],
  };
}

function publicWorshipSpecialSongStep(options = {}) {
  return {
    label: "특송",
    name: "특송",
    phase: "Word",
    required: false,
    flex: true,
    sectionKey: "special_song",
    elementType: "praise",
    ...scoreOutputMode(Boolean(options.score)),
  };
}

function publicSundayFirstSecondTemplate(options = {}) {
  const score = Boolean(options.score);
  const specialScore = options.specialScore !== undefined ? Boolean(options.specialScore) : score;
  return [
    { label: "신앙고백", name: "신앙고백", phase: "Gathering", required: true, flex: false, sectionKey: "creed", elements: [
      { label: "사도신경", name: "사도신경", elementType: "body", orderSheet: { order: "신앙고백" } },
    ] },
    { label: "찬양", name: "찬양", phase: "Gathering", required: false, flex: true, repeatable: true, sectionKey: "praise", elementType: "praise", orderSheet: { order: "찬양", group: "praise" }, ...scoreOutputMode(score) },
    { label: "참회기도", name: "참회기도", phase: "Gathering", required: false, flex: true, sectionKey: "confession", elementType: "body" },
    { label: "대표기도", name: "대표기도", phase: "Gathering", required: true, flex: false, sectionKey: "prayer", elementType: "title_person", orderSheet: { order: "대표기도" } },
    { label: "성경봉독", name: "성경봉독", phase: "Word", required: true, flex: false, sectionKey: "scripture_reading", elementType: "scripture_reading" },
    publicWorshipSpecialSongStep({ score: specialScore }),
    { label: "설교", name: "설교", phase: "Word", required: true, flex: false, sectionKey: "sermon", elementType: "title_person" },
    { label: "결단", name: "결단", phase: "Response", required: false, flex: true, sectionKey: "response_song", elements: [
      { label: "결단기도", name: "결단기도", elementType: "title_person", orderSheet: { order: "결단기도" } },
    ] },
    publicWorshipOfferingStep({ score }),
    { label: "교회소식", name: "교회소식", phase: "Sending", required: true, flex: false, sectionKey: "announcements", elementType: "plain_text" },
    { label: "새가족환영", name: "새가족환영", phase: "Sending", required: false, flex: true, sectionKey: "new_family", elementType: "plain_text" },
    { label: "송영", name: "송영", phase: "Sending", required: true, flex: false, sectionKey: "doxology", elementType: "praise", orderSheet: { order: "송영", group: "praise" }, ...scoreOutputMode(score) },
    { label: "축도", name: "축도", phase: "Sending", required: true, flex: false, sectionKey: "benediction", elementType: "title_person" },
    publicWorshipImageClosingStep(),
  ];
}

function publicSundayThirdTemplate() {
  return [
    { label: "찬양", name: "찬양", phase: "Gathering", required: true, flex: true, repeatable: true, sectionKey: "praise", elementType: "praise", orderSheet: { order: "찬양", group: "praise" } },
    { label: "참회기도", name: "참회기도", phase: "Gathering", required: false, flex: true, sectionKey: "confession", elementType: "body" },
    { label: "찬송", name: "찬송", phase: "Gathering", required: false, flex: true, sectionKey: "hymn_praise", elementType: "praise", orderSheet: { order: "찬송", group: "praise" }, ...scoreOutputMode() },
    { label: "대표기도", name: "대표기도", phase: "Gathering", required: true, flex: false, sectionKey: "prayer", elementType: "title_person", orderSheet: { order: "대표기도" } },
    { label: "성경봉독", name: "성경봉독", phase: "Word", required: true, flex: false, sectionKey: "scripture_reading", elementType: "scripture_reading" },
    publicWorshipSpecialSongStep(),
    { label: "설교", name: "설교", phase: "Word", required: true, flex: false, sectionKey: "sermon", elementType: "title_person" },
    { label: "결단", name: "결단", phase: "Response", required: false, flex: true, sectionKey: "response_song", elements: [
      { label: "결단기도", name: "결단기도", elementType: "title_person", orderSheet: { order: "결단기도" } },
    ] },
    { label: "신앙고백", name: "신앙고백", phase: "Response", required: true, flex: false, sectionKey: "creed", elements: [
      { label: "사도신경", name: "사도신경", elementType: "body", orderSheet: { order: "신앙고백" } },
    ] },
    publicWorshipOfferingStep({ score: true, praiseLabel: "봉헌찬송" }),
    { label: "교회소식", name: "교회소식", phase: "Sending", required: true, flex: false, sectionKey: "announcements", elementType: "plain_text" },
    { label: "새가족환영", name: "새가족환영", phase: "Sending", required: false, flex: true, sectionKey: "new_family", elementType: "plain_text" },
    { label: "공동체고백", name: "공동체고백", phase: "Sending", required: false, flex: true, sectionKey: "community_confession", elementType: "body" },
    { label: "찬양", name: "찬양", phase: "Sending", required: true, flex: false, sectionKey: "closing_song", elementType: "praise", orderSheet: { order: "찬양", group: "praise" } },
    {
      label: "폐회찬송",
      name: "폐회찬송",
      phase: "Sending",
      required: true,
      flex: false,
      sectionKey: "closing_hymn",
      elementType: "praise",
      default_text: "십자가 군병들아",
      orderSheet: { hidden: true },
    },
    { label: "축도", name: "축도", phase: "Sending", required: true, flex: false, sectionKey: "benediction", elementType: "title_person" },
    publicWorshipImageClosingStep(),
  ];
}

function publicSundayAfternoonTemplate() {
  return [
    { label: "찬양", name: "찬양", phase: "Gathering", required: true, flex: true, repeatable: true, sectionKey: "praise", elementType: "praise", orderSheet: { order: "찬양", group: "praise" } },
    { label: "묵도", name: "묵도", phase: "Gathering", required: true, flex: false, sectionKey: "silent_prayer", elementType: "body" },
    { label: "찬송", name: "찬송", phase: "Gathering", required: true, flex: false, sectionKey: "hymn_praise", elementType: "praise", orderSheet: { order: "찬송", group: "praise" }, ...scoreOutputMode() },
    { label: "대표기도", name: "대표기도", phase: "Gathering", required: true, flex: false, sectionKey: "prayer", elementType: "title_person", orderSheet: { order: "대표기도" } },
    { label: "성경봉독", name: "성경봉독", phase: "Word", required: true, flex: false, sectionKey: "scripture_reading", elementType: "scripture_reading" },
    { label: "설교", name: "설교", phase: "Word", required: true, flex: false, sectionKey: "sermon", elementType: "title_person" },
    { label: "결단", name: "결단", phase: "Response", required: false, flex: true, sectionKey: "response_song", elements: [
      { label: "결단기도", name: "결단기도", elementType: "title_person", orderSheet: { order: "결단기도" } },
    ] },
    { label: "교회소식", name: "교회소식", phase: "Sending", required: true, flex: false, sectionKey: "announcements", elementType: "plain_text" },
    { label: "송영", name: "송영", phase: "Sending", required: true, flex: false, sectionKey: "doxology", elementType: "praise", orderSheet: { order: "송영", group: "praise" }, ...scoreOutputMode() },
    { label: "축도", name: "축도", phase: "Sending", required: true, flex: false, sectionKey: "benediction", elementType: "title_person" },
    publicWorshipImageClosingStep(),
  ];
}

const SERVICE_ORDER_TEMPLATE_FALLBACKS = {
  "sunday-first": publicSundayFirstSecondTemplate({ score: true }),
  "sunday-second": publicSundayFirstSecondTemplate({ score: true, specialScore: false }),
  "sunday-main": publicSundayThirdTemplate(),
  "sunday-afternoon": publicSundayAfternoonTemplate(),
  wednesday: ["찬양", "대표기도", "교회소식", "성경봉독", "설교", responseSectionTemplate(), "축도", "마무리"],
  friday: ["찬양", "대표기도", "특송", "교회소식", "성경봉독", "설교", responseSectionTemplate(), "기도회", "찬양", "통성기도", "자율기도", "마무리"],
  monthly: MONTHLY_ORDER_TEMPLATE_FALLBACK,
  "holy-week-dawn": ["찬양", "기도", "성경봉독", "설교", "기도"],
  omer: ["찬양", "기도", "특송", "결단"],
  special: [],
  children: ["사도신경", "찬양", "예배의 부름", "성경봉독", "설교", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "나래파송", "주기도문", "광고", "교제"],
  youth: ["사도신경", "찬양", "통성기도", "대표기도", "봉헌", "봉헌찬양", "봉헌기도", "성경봉독", "설교", responseSectionTemplate(), "주기도문", "광고", "교제"],
  "young-adult": ["사도신경", "대표기도", "찬양", "통성기도", "성경봉독", "설교", responseSectionTemplate(), "봉헌", "봉헌찬양", "봉헌기도", "광고", "찬양", "축도", "교제"],
};
const SERVICE_LIST_PANEL_ID = "__list";
const SERVICE_TEMPLATES_PANEL_ID = "__templates";

function normalizeServiceItem(item = {}, index = 0) {
  const label = item.label || "";
  return {
    id: item.id || createLocalId(),
    service_id: item.service_id || state.selectedServiceId || null,
    sort_order: Number(item.sort_order) || index + 1,
    label,
    assignee: item.assignee || "",
    raw_title: normalizeServiceItemRawTitle(label, item.raw_title || ""),
    song_id: item.song_id || null,
    version_id: item.version_id || item.song_version_id || null,
    memo: item.memo || "",
    ...pickServiceOrderSheetFields(item),
    _worshipSectionId: item._worshipSectionId || "",
    _worshipSectionKey: item._worshipSectionKey || "",
    _worshipSectionTitle: item._worshipSectionTitle || "",
    _worshipSectionOrder: Number(item._worshipSectionOrder) || 0,
    _worshipElementOrder: Number(item._worshipElementOrder) || 0,
    _worshipOrderSheetPlaceholder: Boolean(item._worshipOrderSheetPlaceholder),
  };
}

function normalizeServiceDefaultItem(item = {}, index = 0) {
  const label = item.label || "";
  return {
    id: item.id || createLocalId(),
    sort_order: Number(item.sort_order) || index + 1,
    label,
    assignee: item.assignee || "",
    raw_title: normalizeServiceItemRawTitle(label, item.raw_title || item.title || item.default_text || ""),
    ...pickServiceOrderSheetFields(item),
  };
}

function normalizeServiceItems(items) {
  return [...(items || [])]
    .map(normalizeServiceItem)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function normalizeServiceItemsInCurrentOrder(items) {
  return [...(items || [])]
    .map(normalizeServiceItem)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function normalizeServiceDefaultItems(items) {
  return [...(items || [])]
    .map(normalizeServiceDefaultItem)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function normalizeServiceDefaultItemsInCurrentOrder(items) {
  return [...(items || [])]
    .map(normalizeServiceDefaultItem)
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
}

function serializeServiceDefaultItems(typeId) {
  return getServiceDefaultItems(typeId)
    .filter((item) => String(item.label || item.raw_title || "").trim())
    .map((item, index) => ({
      sort_order: index + 1,
      label: nullIfBlank(item.label),
      assignee: nullIfBlank(item.assignee),
      raw_title: normalizeServiceItemRawTitle(item.label, item.raw_title),
    }));
}

function confirmDiscardServiceChanges() {
  if (!state.dirty.service) return true;
  return window.confirm("Discard unsaved service changes?");
}

function getFilteredServiceTypes() {
  let types = state.serviceTypes;
  const q = normalizeSearchValue(state.search);
  if (!q) return types.filter((t) => SERVICE_RECURRENCE[t.id] || getServicesByType(t.id).length);
  return types.filter((t) => getServicesByType(t.id).some((s) => serviceMatchesSearch(s, q)));
}

function serviceTypeGroupKey(typeId) {
  if (SERVICE_CATEGORIES.public.includes(typeId)) return "public";
  if (SERVICE_CATEGORIES.ministry.includes(typeId)) return "ministry";
  if (SERVICE_CATEGORIES.special.includes(typeId)) return "special";
  return "other";
}

function serviceTypeGroupLabel(key) {
  return {
    public: "공예배",
    ministry: "부서",
    special: "특별예배",
    other: "기타",
  }[key] || key;
}

function getServicesByType(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return sortServicesByDate(state.services.filter((s) => worshipAppServiceTypeId(s.type_id) === appTypeId));
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
  const appTypeId = worshipAppServiceTypeId(typeId);
  return state.serviceTypes.find((type) => type.id === appTypeId)?.sort_order || 999;
}

function serviceTypeName(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return state.serviceTypes.find((type) => type.id === appTypeId)?.name || typeId || "";
}

function serviceTypeDisplayName(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  const rawName = String(serviceTypeName(appTypeId) || "").trim();
  if (rawName && !SERVICE_TYPE_LEGACY_NAMES[rawName]) return rawName;
  return SERVICE_TYPE_DISPLAY_NAMES[appTypeId] || SERVICE_TYPE_LEGACY_NAMES[rawName] || rawName || appTypeId || "";
}

function serviceCustomTitle(service) {
  return String(service?.title || "").trim();
}

function serviceDisplayTypeName(service) {
  if (!service) return "";
  const customTitle = serviceCustomTitle(service);
  if (customTitle) return customTitle;
  const tags = Array.isArray(service.tags) ? service.tags : [];
  if (service.type_id === "sunday-main" && tags.some((tag) => String(tag).includes("2·3부 통합"))) {
    return "주일예배 (2·3부 통합)";
  }
  return serviceTypeDisplayName(service.type_id);
}

function serviceTypeById(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return state.serviceTypes.find((type) => type.id === appTypeId) || null;
}

function serviceOrderTemplate(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  const template = serviceTypeById(appTypeId)?.order_template;
  if (Array.isArray(template) && template.length) {
    return template
      .filter((step) => step && typeof step === "object")
      .map((step) => withServiceTemplateImplicitRules(step, appTypeId));
  }
  const fallbackSteps = [
    { label: "준비", name: "준비", phase: "Gathering", required: false, flex: true, sectionKey: "ready", elementType: "video" },
    ...(SERVICE_ORDER_TEMPLATE_FALLBACKS[appTypeId] || []),
  ];
  return fallbackSteps
    .map((step, index) => normalizeFallbackServiceTemplateStep(step, index, appTypeId))
    .filter((step) => step.label || step.name);
}

function normalizeFallbackServiceTemplateStep(step, index = 0, typeId = "") {
  const value = step && typeof step === "object" ? step : { label: String(step || ""), name: String(step || "") };
  const label = String(value.label || value.name || "").trim();
  const elementType = value.elementType || value.element_type || value.componentType || value.component_type || serviceTemplateDefaultElementType(label);
  const formPresetRules = serviceTemplateImplicitFormPresetRules(value, typeId, label);
  return {
    ...value,
    label,
    name: String(value.name || label).trim(),
    phase: String(value.phase || (index < 4 ? "Gathering" : index < 8 ? "Word/Response" : "Sending")).trim(),
    required: value.required !== undefined ? Boolean(value.required) : !["찬양", "특송", "결단", "결단찬양", "통성기도", "교제", "기도회"].includes(label),
    flex: value.flex !== undefined ? Boolean(value.flex) : ["찬양", "특송", "결단", "결단찬양", "통성기도", "교제", "기도회", "기도"].includes(label),
    repeatable: value.repeatable !== undefined ? Boolean(value.repeatable) : label === "찬양" || label === "기도",
    elementType,
    componentType: value.componentType || value.component_type || elementType,
    ...(formPresetRules.length ? { formPresetRules } : {}),
    source: value.source || "Fallback",
  };
}

function withServiceTemplateImplicitRules(step = {}, typeId = "") {
  const label = String(step.label || step.name || "").trim();
  const formPresetRules = serviceTemplateImplicitFormPresetRules(step, typeId, label);
  return formPresetRules.length ? { ...step, formPresetRules } : step;
}

function serviceTemplateImplicitFormPresetRules(step = {}, typeId = "", label = "") {
  const rules = normalizeServiceFormPresetRules(step.formPresetRules || step.form_preset_rules);
  if (serviceTypeGroupKey(typeId) === "public" && compactSearchValue(label || step.label || step.name) === "특송" && !rules.length) {
    rules.push(PUBLIC_SPECIAL_HYMN_FORM_PRESET_RULE);
  }
  return rules;
}

function serviceTemplateDefaultElementType(label) {
  const compact = compactSearchValue(label);
  if (compact === "준비" || compact === "예배준비" || compact === "예배준비영상") return "video";
  return "";
}

function serializeServiceOrderTemplate(typeId) {
  const typeObj = serviceTypeById(typeId);
  const current = Array.isArray(typeObj?.order_template) ? typeObj.order_template : [];
  const fallback = serviceOrderTemplate(typeId);
  return (current.length ? current : fallback)
    .map((step, index) => {
      const normalized = normalizeServiceTemplateStep(step, index, typeId);
      const formPresetRules = normalizeServiceFormPresetRules(normalized.formPresetRules || normalized.form_preset_rules);
      const orderSheet = normalizeServiceOrderSheetPayload(normalized.orderSheet || normalized.order_sheet);
      const outputMode = normalizeServiceOutputMode(normalized.outputMode || normalized.output_mode || normalized.renderMode || normalized.render_mode);
      return {
        label: nullIfBlank(normalized.label || normalized.name || ""),
        name: nullIfBlank(normalized.name || normalized.label || ""),
        phase: nullIfBlank(normalized.phase),
        sectionKey: nullIfBlank(normalized.sectionKey || normalized.section_key),
        required: Boolean(normalized.required),
        flex: Boolean(normalized.flex),
        repeatable: Boolean(normalized.repeatable),
        elementType: nullIfBlank(normalized.elementType),
        default_text: nullIfBlank(normalized.default_text),
        formHint: nullIfBlank(normalized.formHint || normalized.form_hint),
        formPreset: normalizeServiceFormPreset(normalized.formPreset || normalized.form_preset) || undefined,
        formPresetRules: formPresetRules.length ? formPresetRules : undefined,
        defaultStrength: nullIfBlank(normalized.defaultStrength || normalized.default_strength),
        outputMode: nullIfBlank(outputMode),
        orderSheet: orderSheet || undefined,
        elements: serializeServiceTemplateElements(normalized.elements),
        notes: nullIfBlank(serializeServiceItemMemo({
          ...parseServiceItemMemo(normalized.notes),
          templateKey: normalized.templateKey,
          templateVariant: normalized.templateVariant,
          elementType: normalized.elementType,
        })),
        sort_order: index + 1,
      };
    })
    .filter((step) => step.label || step.name);
}

function serializeServiceTemplateElements(elements = []) {
  if (!Array.isArray(elements) || !elements.length) return undefined;
  const serialized = elements
    .filter((element) => element && typeof element === "object")
    .map((element, index) => {
      const elementType = normalizeWorshipElementType(element.elementType || element.element_type || element.componentType || element.component_type);
      const formPresetRules = normalizeServiceFormPresetRules(element.formPresetRules || element.form_preset_rules);
      const outputMode = normalizeServiceOutputMode(element.outputMode || element.output_mode || element.renderMode || element.render_mode);
      return {
        label: nullIfBlank(element.label || element.name || ""),
        name: nullIfBlank(element.name || element.label || ""),
        elementType: nullIfBlank(elementType),
        default_text: nullIfBlank(element.default_text || element.title || ""),
        formHint: nullIfBlank(element.formHint || element.form_hint),
        formPreset: normalizeServiceFormPreset(element.formPreset || element.form_preset) || undefined,
        formPresetRules: formPresetRules.length ? formPresetRules : undefined,
        defaultStrength: nullIfBlank(element.defaultStrength || element.default_strength),
        outputMode: nullIfBlank(outputMode),
        orderSheet: normalizeServiceOrderSheetPayload(element.orderSheet || element.order_sheet) || undefined,
        sort_order: index + 1,
      };
    })
    .filter((element) => element.label || element.name || element.elementType || element.default_text);
  return serialized.length ? serialized : undefined;
}

function defaultServiceTemplateStep(index = 0, typeId = "") {
  const serviceGroup = serviceTypeGroupKey(typeId);
  return {
    label: "새 섹션",
    name: "새 섹션",
    phase: index < 4 ? "Gathering" : index < 8 ? "Word/Response" : "Sending",
    required: false,
    flex: true,
    repeatable: false,
    elementType: "",
    componentType: "",
    templateKey: "",
    templateVariant: serviceGroup === "ministry" ? "부서예배" : serviceGroup === "public" ? "공예배" : "",
    default_text: "",
    sort_order: index + 1,
  };
}

function defaultServiceTemplateElement(index = 0, step = {}) {
  const label = "새 엘리먼트";
  const elementType = normalizeWorshipElementType(step.elementType || step.element_type || step.componentType || step.component_type) || "plain_text";
  return {
    label,
    name: label,
    elementType,
    default_text: "",
    sort_order: index + 1,
  };
}

function normalizeServiceTemplateStep(step = {}, index = 0, typeId = "") {
  const label = String(step.label || step.name || "").trim();
  const memo = parseServiceItemMemo(step.notes || step.memo || "");
  const fallback = defaultServiceTemplateStep(index);
  const elementTypeValue = step.elementType || step.element_type || step.componentType || step.component_type || memo.elementType || memo.componentType;
  const elementType = normalizeServiceElementType(elementTypeValue) || normalizeWorshipElementType(elementTypeValue);
  const defaultStrength = String(step.defaultStrength || step.default_strength || "").trim();
  const formPreset = normalizeServiceFormPreset(step.formPreset || step.form_preset, step.formHint || step.form_hint, defaultStrength);
  const orderSheet = normalizeServiceOrderSheetPayload(step.orderSheet || step.order_sheet || memo.orderSheet || memo.order_sheet);
  const formPresetRules = serviceTemplateImplicitFormPresetRules(
    { ...step, formPresetRules: step.formPresetRules || step.form_preset_rules || memo.formPresetRules },
    typeId,
    label,
  );
  const outputMode = normalizeServiceOutputMode(step.outputMode || step.output_mode || step.renderMode || step.render_mode);
  return {
    ...fallback,
    ...step,
    label: label || fallback.label,
    name: String(step.name || label || fallback.name).trim(),
    phase: String(step.phase || fallback.phase).trim(),
    required: Boolean(step.required),
    flex: Boolean(step.flex),
    repeatable: Boolean(step.repeatable),
    elementType,
    componentType: elementType,
    templateKey: String(step.templateKey || step.template_key || memo.templateKey || "").trim(),
    templateVariant: String(step.templateVariant || step.template_variant || memo.templateVariant || "").trim(),
    default_text: String(step.default_text || "").trim(),
    formHint: String(step.formHint || step.form_hint || formPreset?.hint || "").trim(),
    formPreset,
    formPresetRules,
    defaultStrength,
    outputMode,
    orderSheet: orderSheet || undefined,
    notes: nullIfBlank(step.notes),
    sort_order: index + 1,
  };
}

function ensureServiceOrderTemplate(typeId) {
  const typeObj = serviceTypeById(typeId);
  if (!typeObj) return [];
  if (!Array.isArray(typeObj.order_template) || !typeObj.order_template.length) {
    typeObj.order_template = serviceOrderTemplate(typeId).map((step, index) => normalizeServiceTemplateStep(step, index, typeId));
  } else {
    typeObj.order_template = typeObj.order_template.map((step, index) => normalizeServiceTemplateStep(step, index, typeId));
  }
  return typeObj.order_template;
}

function markServiceTypeTemplateDirty(typeId) {
  state.dirtyServiceTypeIds.add(typeId);
  state.dirty.service = true;
  updateSaveState();
}

function updateServiceTemplateStepField(field) {
  const typeId = field.dataset.serviceTypeId;
  const steps = ensureServiceOrderTemplate(typeId);
  const index = Number(field.dataset.stepIndex);
  const step = steps[index];
  if (!step) return;
  const key = field.dataset.serviceTemplateStepField;
  if (key === "required" || key === "flex" || key === "repeatable") {
    step[key] = Boolean(field.checked);
  } else if (key === "label") {
    const value = String(field.value || "").trim();
    step.label = value;
    step.name = value;
  } else if (key === "default_text") {
    step.default_text = String(field.value || "").trim();
  } else if (key === "phase") {
    step.phase = String(field.value || "").trim();
  } else if (key === "element_type" || key === "component_type") {
    step.elementType = normalizeServiceElementType(field.value);
    step.componentType = step.elementType;
  } else if (key === "template_key") {
    step.templateKey = String(field.value || "").trim();
  } else if (key === "template_variant") {
    step.templateVariant = String(field.value || "").trim();
  } else if (key === "form_hint") {
    step.formHint = String(field.value || "").trim();
    step.formPreset = step.formHint ? normalizeServiceFormPreset(step.formHint, step.formHint, "manual") : null;
    step.defaultStrength = step.formHint ? "manual" : "";
  }
  steps.forEach((item, itemIndex) => { item.sort_order = itemIndex + 1; });
  markServiceTypeTemplateDirty(typeId);
}

function updateServiceTemplateElementField(field) {
  const typeId = field.dataset.serviceTypeId;
  const steps = ensureServiceOrderTemplate(typeId);
  const stepIndex = Number(field.dataset.stepIndex);
  const elementIndex = Number(field.dataset.elementIndex);
  const step = steps[stepIndex];
  if (!step) return;
  if (!Array.isArray(step.elements)) step.elements = [];
  const element = step.elements[elementIndex];
  if (!element || typeof element !== "object") return;
  const key = field.dataset.serviceTemplateElementField;
  if (key === "label") {
    const value = String(field.value || "").trim();
    element.label = value;
    if (!String(element.name || "").trim()) element.name = value;
  } else if (key === "name") {
    element.name = String(field.value || "").trim();
  } else if (key === "default_text") {
    element.default_text = String(field.value || "").trim();
  } else if (key === "element_type" || key === "component_type") {
    const elementType = normalizeWorshipElementType(field.value);
    element.elementType = elementType;
    element.componentType = elementType;
  } else if (key === "order_sheet") {
    const order = String(field.value || "").trim();
    const previous = normalizeServiceOrderSheetPayload(element.orderSheet || element.order_sheet);
    element.orderSheet = order ? { ...(previous || {}), order } : null;
  } else if (key === "form_hint") {
    element.formHint = String(field.value || "").trim();
    element.formPreset = element.formHint ? normalizeServiceFormPreset(element.formHint, element.formHint, "manual") : null;
    element.defaultStrength = element.formHint ? "manual" : "";
  }
  step.elements = step.elements
    .filter((item) => item && typeof item === "object")
    .map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 }));
  markServiceTypeTemplateDirty(typeId);
}

function runServiceTemplateElementAction(action, typeId, stepIndex, elementIndex) {
  const steps = ensureServiceOrderTemplate(typeId);
  const step = steps[stepIndex];
  if (!step) return;
  if (!Array.isArray(step.elements)) step.elements = [];
  const elements = step.elements;
  if (!elements.length && action !== "add") return;
  if (action === "add") {
    elements.push(defaultServiceTemplateElement(elements.length, step));
  } else if (action === "add-after") {
    const targetIndex = Number.isFinite(elementIndex) ? elementIndex + 1 : elements.length;
    elements.splice(targetIndex, 0, defaultServiceTemplateElement(targetIndex, step));
  } else if (action === "delete") {
    if (!Number.isFinite(elementIndex)) return;
    elements.splice(elementIndex, 1);
  } else if (action === "up") {
    if (!Number.isFinite(elementIndex) || elementIndex <= 0) return;
    [elements[elementIndex - 1], elements[elementIndex]] = [elements[elementIndex], elements[elementIndex - 1]];
  } else if (action === "down") {
    if (!Number.isFinite(elementIndex) || elementIndex >= elements.length - 1) return;
    [elements[elementIndex + 1], elements[elementIndex]] = [elements[elementIndex], elements[elementIndex + 1]];
  }
  step.elements = elements
    .filter((element) => element && typeof element === "object")
    .map((element, index) => ({
      ...element,
      sort_order: index + 1,
      name: String(element.name || element.label || `엘리먼트 ${index + 1}`).trim(),
    }));
  markServiceTypeTemplateDirty(typeId);
  renderServiceTemplatesDetail();
}

function runServiceTemplateStepAction(action, typeId, index) {
  const steps = ensureServiceOrderTemplate(typeId);
  if (!steps.length && action !== "add") return;
  if (action === "add") {
    steps.push(defaultServiceTemplateStep(steps.length, typeId));
  } else if (action === "add-after") {
    const targetIndex = Number.isFinite(index) ? index + 1 : steps.length;
    steps.splice(targetIndex, 0, defaultServiceTemplateStep(targetIndex, typeId));
  } else if (action === "delete") {
    if (!Number.isFinite(index)) return;
    steps.splice(index, 1);
  } else if (action === "up") {
    if (!Number.isFinite(index) || index <= 0) return;
    [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
  } else if (action === "down") {
    if (!Number.isFinite(index) || index >= steps.length - 1) return;
    [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
  }
  steps.forEach((step, stepIndex) => {
    step.sort_order = stepIndex + 1;
    if (!step.name) step.name = step.label || `섹션 ${stepIndex + 1}`;
  });
  markServiceTypeTemplateDirty(typeId);
  renderServiceTemplatesDetail();
}

function serviceSectionTemplateMeta(typeId, label, memo = "") {
  const parsed = parseServiceItemMemo(memo);
  const explicitName = String(parsed.templateKey || "").trim();
  const explicitVariant = String(parsed.templateVariant || "").trim();
  if (explicitName || explicitVariant) {
    return {
      name: explicitName || String(label || "").trim(),
      variant: explicitVariant,
    };
  }
  return null;
}

function renderServiceTemplateBadge(typeId, itemOrStep = {}) {
  const meta = serviceSectionTemplateMeta(typeId, itemOrStep.label || itemOrStep.name, itemOrStep.memo);
  if (!meta?.name && !meta?.variant) return "";
  const text = cleanList([meta.name, meta.variant]).join(" · ");
  if (!text) return "";
  return `<span class="svc-template-badge">${escapeHtml(text)}</span>`;
}

function serviceItemFormHint(item) {
  return parseServiceItemMemo(item?.memo).formHint || "";
}

function serviceItemFormPreset(item) {
  return parseServiceItemMemo(item?.memo).formPreset || null;
}

function serviceItemFormPresetRules(item) {
  return parseServiceItemMemo(item?.memo).formPresetRules || [];
}

function serviceFormPresetSummary(preset) {
  const normalized = normalizeServiceFormPreset(preset);
  if (!normalized) return "";
  return normalized.hint || (normalized.forms || []).join("-");
}

function serviceFormPresetRuleSummary(rule = {}) {
  const presetText = serviceFormPresetSummary(rule.formPreset || rule.form_preset || rule.preset);
  if (!presetText) return "";
  const when = rule.when && typeof rule.when === "object" ? rule.when : {};
  const types = normalizePraiseTypes(when.songType || when.song_type || when.praiseType || when.praise_type);
  const condition = types.includes("hymn") ? "찬송가" : types.includes("ccm") ? "CCM" : types.includes("children") ? "어린이" : "";
  return cleanList([condition, presetText]).join(" ");
}

function renderServiceFormPresetBadges(item, options = {}) {
  if (!item || item._isDefault) return "";
  const presetText = serviceFormPresetSummary(serviceItemFormPreset(item));
  const ruleTexts = serviceItemFormPresetRules(item)
    .map(serviceFormPresetRuleSummary)
    .filter(Boolean);
  if (!presetText && !ruleTexts.length) return "";
  return `<span class="svc-form-preset-badges${options.compact ? " compact" : ""}">` + [
    presetText ? `<span class="svc-form-preset-badge">송폼 ${escapeHtml(presetText)}</span>` : "",
    ...ruleTexts.map((text) => `<span class="svc-form-preset-badge rule">${escapeHtml(text)}</span>`),
  ].filter(Boolean).join(" ") + `</span>`;
}

function renderServiceFormHintInput(item, index, options = {}) {
  if (!item || item._isDefault) return "";
  return `
    <input
      class="svc-form-hint${options.compact ? " compact" : ""}"
      type="text"
      data-service-item-field="form_hint"
      data-service-item-index="${index}"
      value="${escapeAttr(serviceItemFormHint(item))}"
      placeholder="${escapeAttr(options.placeholder || "송폼/범위")}"
      aria-label="섹션 송폼/범위"
    />`;
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

function getServiceOutputItems(serviceId, options = {}) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const items = normalizeServiceItems(getServiceItems(serviceId));
  if (!service) return items;
  const defaults = getServiceDefaultItems(service.type_id)
    .filter((item) => serviceDefaultItemVisibleInOutput(item, options))
    .map((item, index) => ({
      ...item,
      id: item.id || `default:${service.type_id}:${index}`,
      service_id: serviceId,
      song_id: item.song_id || null,
      _isDefault: true,
      _sourceOrder: index,
    }));
  if (!defaults.length) return items;
  return mergeServiceItemsWithDefaults(service.type_id, items, defaults);
}

function serviceDefaultItemVisibleInOutput(item = {}, options = {}) {
  if (String(item.label || item.raw_title || "").trim()) return true;
  if (!options.includeOrderSheetRows) return false;
  return hasServiceOrderSheetPayload(serviceOrderSheetMeta(item));
}

function mergeServiceItemsWithDefaults(typeId, items, defaults) {
  const output = items.map((item, index) => ({
    ...item,
    _isDefault: false,
    _sourceOrder: index,
  }));

  for (const item of defaults) {
    const rank = serviceItemTemplateRank(typeId, item);
    const insertIndex = output.findIndex((candidate) => serviceItemTemplateRank(typeId, candidate) > rank);
    output.splice(insertIndex === -1 ? output.length : insertIndex, 0, item);
  }

  return output.map(({ _isDefault, _sourceOrder, ...item }, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}

function mergeServiceItemsForDisplay(typeId, items, defaultItems) {
  const customs = items.map((item, index) => ({ ...item, _isDefault: false, _origIndex: index }));
  const defaults = (defaultItems || []).map((item, index) => ({ ...item, _isDefault: true, _origIndex: index }));
  const output = customs.slice();
  for (const item of defaults) {
    const rank = serviceItemTemplateRank(typeId, item);
    const insertIndex = output.findIndex((candidate) => serviceItemTemplateRank(typeId, candidate) > rank);
    output.splice(insertIndex === -1 ? output.length : insertIndex, 0, item);
  }
  return output;
}

function findAdjacentSameType(items, mergedIndex, direction) {
  const isDefault = items[mergedIndex]._isDefault;
  for (let i = mergedIndex + direction; i >= 0 && i < items.length; i += direction) {
    if (items[i]._isDefault === isDefault) return i;
  }
  return -1;
}

function serviceItemTemplateRank(typeId, item) {
  const label = item?.label || "";
  const fallbackLabel = normalizeServiceOrderTemplateLabel(label || "찬양");
  const key = compactSearchValue(fallbackLabel);
  const template = serviceOrderTemplate(typeId);
  if (!key || !template.length) return Number.POSITIVE_INFINITY;

  const templateKeys = template.map((step, index) => ({
    index,
    key: compactSearchValue(normalizeServiceOrderTemplateLabel(step.label || step.name || "")),
  })).filter((step) => step.key);

  const exact = templateKeys.find((step) => step.key === key);
  if (exact) return exact.index;

  const containsTemplate = templateKeys
    .filter((step) => key.includes(step.key))
    .sort((a, b) => b.key.length - a.key.length || a.index - b.index)[0];
  if (containsTemplate) return containsTemplate.index;

  const containsLabel = templateKeys.find((step) => step.key.includes(key));
  return containsLabel ? containsLabel.index : Number.POSITIVE_INFINITY;
}

function normalizeServiceOrderTemplateLabel(value) {
  const text = String(value || "").trim();
  const compact = compactSearchValue(text);
  if (compact === "경배와찬양") return "찬양";
  if (compact === "말씀선포" || compact === "말씀") return "설교";
  if (compact === "결단의기도") return "결단기도";
  return text;
}

function cleanServiceAssignee(value) {
  return String(value || "").replace(/\s+/g, " ").trim().replace(/^[:：]\s*/, "");
}

function servicePraiseLeaderLabel(service) {
  if (!serviceUsesPraiseLeader(service?.type_id)) return "";
  return cleanServiceAssignee(service?.leader);
}

function serviceMatchesSearch(svc, q) {
  if (!q) return true;
  const norm = (s) => normalizeSearchValue(s);
  const praiseLead = norm([svc.leader, servicePraiseLeaderLabel(svc)].filter(Boolean).join(" "));
  const tags = norm((svc.tags || []).join(" "));
  const date = svc.date || "";
  const d = new Date(date + "T00:00:00");
  const dateFmt = `${d.getMonth()+1}/${d.getDate()}`;
  const dateDisplay = norm([dateFmt, formatServiceDate(svc, { compact: true }), formatServiceDate(svc), serviceOrderSheetTitle(svc)].join(" "));
  const type = norm([serviceTypeName(svc.type_id), serviceTypeDisplayName(svc.type_id), serviceDisplayTypeName(svc), serviceCustomTitle(svc)].join(" "));
  const items = norm([
    ...getServiceItems(svc.id),
    ...getServiceDefaultItems(svc.type_id),
  ].map((item) => `${item.label || ""} ${item.raw_title || ""}`).join(" "));
  return praiseLead.includes(q) || date.includes(q) || tags.includes(q) || dateDisplay.includes(q) || type.includes(q) || items.includes(q);
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

function getExpectedServicesInRange(startDate, endDate) {
  void startDate;
  void endDate;
  return [];
}

function getExpectedServicesForType(typeId, daySpan = SERVICE_FUTURE_LOOKAHEAD_DAYS) {
  void typeId;
  void daySpan;
  return [];
}

function getServiceDashboardServices() {
  const { start, end } = currentServiceWeekRange();
  const upcoming = getFilteredServices().filter((service) => {
    const serviceDate = new Date(`${service.date}T00:00:00`);
    return serviceDate >= start && serviceDate <= end;
  });
  return sortServicesByDate([...upcoming, ...getExpectedServicesInRange(start, end)]);
}

function currentServiceWeekRange(base = new Date()) {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function serviceWeekDays(base = new Date()) {
  const { start } = currentServiceWeekRange(base);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getServiceSidebarServices() {
  const q = normalizeSearchValue(state.search);
  if (q) return getFilteredServices().slice(0, 40);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + SERVICE_FUTURE_LOOKAHEAD_DAYS);
  const upcoming = getFilteredServices().filter((service) => {
    const serviceDate = new Date(`${service.date}T00:00:00`);
    return serviceDate >= today && serviceDate <= end;
  });
  return sortServicesByDate([...upcoming, ...getExpectedServicesInRange(today, end)]).slice(0, 36);
}

function getRecentServiceShortcuts(limit = 8) {
  return sortServicesByDate(state.services, "desc").slice(0, limit);
}

function renderServiceList() {
  if (!state.client) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList();
    return;
  }

  if (state.connectionError) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList(state.connectionError);
    return;
  }

  if (state.serviceError || !state.serviceTypes.length) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = state.serviceError
      ? (isConnectionUnavailableMessage(state.serviceError)
        ? renderConnectionList(state.connectionError || state.serviceError)
        : renderListEmptyState("예배 데이터를 불러올 수 없습니다", state.serviceError))
      : renderLoadingList();
    return;
  }

  const q = normalizeSearchValue(state.search);
  const services = q ? getServiceSidebarServices() : [];
  refs.songCount.textContent = q ? `${services.length}개 결과` : "";
  const selectedService = state.services.find((service) => service.id === state.selectedServiceId);
  const sidebarPrimary = q ? `
    ${services.length
      ? `<div class="service-sidebar-stack">${services.map(renderServiceSidebarCard).join("")}</div>`
      : `<p class="service-no-results">검색 결과가 없습니다.</p>`}
  ` : `
    <button class="service-type-row${state.selectedServiceTypeId === SERVICE_LIST_PANEL_ID && !state.selectedServiceId ? " active" : ""}" type="button" data-service-list>
      <span>전체 예배</span>
      <small>${state.services.length}</small>
    </button>
    <button class="service-type-row service-type-row--templates${state.selectedServiceTypeId === SERVICE_TEMPLATES_PANEL_ID && !state.selectedServiceId ? " active" : ""}" type="button" data-service-templates>
      <span>템플릿</span>
    </button>
  `;

  refs.songList.innerHTML = `
    <div class="service-sidebar">
      <section class="service-sidebar-section">
        <div class="service-sidebar-head">
          <span>${q ? "검색 결과" : "예배"}</span>
          ${q ? `<small>${services.length}</small>` : ""}
        </div>
        ${sidebarPrimary}
      </section>
      ${q ? "" : renderRecentServiceShortcuts()}
      ${selectedService ? renderServiceCurrentSidebar(selectedService) : ""}
    </div>`;

  finishListRender();
}

function renderRecentServiceShortcuts() {
  const services = getRecentServiceShortcuts();
  if (!services.length) return "";
  return `
    <section class="service-sidebar-section service-sidebar-section--recent">
      <div class="service-sidebar-head">
        <span>최근 예배</span>
        <small>${services.length}</small>
      </div>
      <div class="service-sidebar-stack">
        ${services.map(renderServiceSidebarCard).join("")}
      </div>
    </section>`;
}

function renderServiceSidebarCard(service) {
  const active = service.id === state.selectedServiceId ? " active" : "";
  return `
    <button
      class="service-sidebar-card${active}"
      type="button"
      data-service-id="${escapeAttr(service.id)}"
    >
      <span class="service-sidebar-date">${escapeHtml(formatServiceDate(service, { compact: true }))}</span>
      <span class="service-sidebar-title">${escapeHtml(serviceDisplayTypeName(service))}</span>
    </button>`;
}

function renderServiceSidebarType(type) {
  const active = type.id === getActiveServiceTypeId() && !state.selectedServiceId ? " active" : "";
  const count = getFilteredServicesForType(type.id).length;
  return `
    <button class="service-type-row${active}" type="button" data-service-type-id="${escapeAttr(type.id)}">
      <span>${escapeHtml(serviceTypeDisplayName(type.id))}</span>
      ${count ? `<small>${count}</small>` : ""}
    </button>`;
}

function renderServiceCurrentSidebar(service) {
  const items = normalizeServiceItems(getServiceItems(service.id));
  const presenterActive = state.presenter.serviceId === service.id;
  const slides = presenterActive ? state.presenter.slides : buildServicePresenterSlides(service.id);
  const selectedIndex = serviceSidebarSelectedItemIndex(service.id, items, slides);
  const readyRow = renderServiceReadyOutlineRow(service, slides, items);
  return `
    <section class="service-sidebar-section service-sidebar-section--current">
      <div class="service-sidebar-head">
        <span>순서</span>
        <small>${items.length}</small>
      </div>
      <div class="service-outline-list">
        ${readyRow}
        ${items.length
          ? items.map((item, index) => renderServiceOutlineRow(service, item, index, selectedIndex, slides)).join("")
          : `<p class="service-no-results">순서가 없습니다.</p>`}
      </div>
    </section>
    ${renderServiceSidebarItemEditor(service, items, selectedIndex)}
  `;
}

function renderServiceReadyOutlineRow(service, slides = [], items = getServiceItems(service.id)) {
  const readyIndex = slides.findIndex((slide) => isPresenterPreparationSlide(slide));
  const readySlide = readyIndex >= 0 ? slides[readyIndex] : null;
  if (!readySlide || items.some((item) => presenterSlideBelongsToItem(readySlide, item))) return "";
  const active = state.presenter.serviceId === service.id && readyIndex >= 0 && state.presenter.index === readyIndex;
  return `
    <button class="service-outline-row service-outline-row--ready${active ? " active" : ""}" type="button"
      data-service-outline-slide="${escapeAttr(readyIndex >= 0 ? readyIndex : 0)}"
      data-service-outline-service="${escapeAttr(service.id)}">
      <span class="service-outline-no">0</span>
      <span class="service-outline-main">
        <strong>준비</strong>
        <small>${escapeHtml(serviceDisplayTypeName(service))}</small>
      </span>
    </button>`;
}

function renderServiceOutlineRow(service, item, index, selectedIndex, slides = []) {
  const slideIndex = firstPresenterSlideIndexForServiceItem(item, slides);
  const activeSlide = state.presenter.serviceId === service.id && slideIndex >= 0 && presenterSlideBelongsToItem(state.presenter.slides[state.presenter.index], item);
  const selected = index === selectedIndex;
  const title = serviceSidebarItemTitle(item);
  const meta = cleanList([
    item.assignee,
    slideIndex >= 0 ? `${slideCountForServiceItem(item, slides)} 슬라이드` : "",
  ]).join(" · ");
  return `
    <button class="service-outline-row${selected ? " selected" : ""}${activeSlide ? " active" : ""}" type="button"
      data-service-outline-slide="${escapeAttr(slideIndex >= 0 ? slideIndex : "")}"
      data-service-outline-item-index="${index}"
      data-service-outline-service="${escapeAttr(service.id)}"
      ${slideIndex >= 0 ? "" : "disabled"}>
      <span class="service-outline-no">${escapeHtml(index + 1)}</span>
      <span class="service-outline-main">
        <strong>${escapeHtml(title)}</strong>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
      </span>
    </button>`;
}

function serviceSidebarItemTitle(item) {
  const label = String(item?.label || "").trim();
  const title = serviceItemDisplayText(item);
  if (label && title && compactSearchValue(label) !== compactSearchValue(title)) return `${label} · ${title}`;
  return title || label || "항목";
}

function serviceSidebarSelectedItemIndex(serviceId, items = getServiceItems(serviceId), slides = buildServicePresenterSlides(serviceId)) {
  if (!items.length) return -1;
  const currentIndex = Number(state.selectedServiceItemIndex);
  if (Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < items.length) return currentIndex;
  const activeSlide = state.presenter.serviceId === serviceId ? slides[state.presenter.index] : null;
  const activeIndex = activeSlide ? items.findIndex((item) => presenterSlideBelongsToItem(activeSlide, item)) : -1;
  return activeIndex >= 0 ? activeIndex : 0;
}

function firstPresenterSlideIndexForServiceItem(item, slides = []) {
  return slides.findIndex((slide) => presenterSlideBelongsToItem(slide, item));
}

function slideCountForServiceItem(item, slides = []) {
  return slides.filter((slide) => presenterSlideBelongsToItem(slide, item)).length;
}

function presenterSlideBelongsToItem(slide, item) {
  if (!slide || !item) return false;
  const id = String(item.id || "").trim();
  if (!id) return false;
  return String(slide.elementId || "") === id
    || String(slide.sectionId || "") === id
    || String(slide.id || "").startsWith(`${id}:`);
}

function renderServiceSidebarItemEditor(service, items, selectedIndex) {
  const item = items[selectedIndex];
  if (!item) return "";
  const elementType = serviceMemoElementType(parseServiceItemMemo(item.memo));
  return `
    <section class="service-sidebar-section service-sidebar-section--editor">
      <div class="service-sidebar-head">
        <span>편집</span>
        <small>${escapeHtml(selectedIndex + 1)}</small>
      </div>
      <div class="service-sidebar-editor">
        <label>
          <span>섹션</span>
          <input type="text" data-service-item-field="label" data-service-item-index="${selectedIndex}"
            value="${escapeAttr(item.label || "")}" placeholder="찬양" />
        </label>
        <label>
          <span>담당</span>
          <input type="text" data-service-item-field="assignee" data-service-item-index="${selectedIndex}"
            value="${escapeAttr(item.assignee || "")}" placeholder="${escapeAttr(inferOrderSheetAssignee(item))}" />
        </label>
        <label>
          <span>항목</span>
          <input type="text" data-service-item-field="raw_title" data-service-item-index="${selectedIndex}"
            value="${escapeAttr(item.raw_title || "")}"
            placeholder="${isScriptureServiceLabel(item.label) ? "성경 구절" : "내용"}"
            ${isSongServiceLabel(item.label) ? `list="servicePraiseOptions"` : ""}
            ${isScriptureServiceLabel(item.label) ? `list="serviceScriptureOptions"` : ""} />
        </label>
        <label>
          <span>타입</span>
          <select data-service-item-field="element_type" data-service-item-index="${selectedIndex}">
            ${renderServiceElementTypeOptions(elementType)}
          </select>
        </label>
        <div class="service-sidebar-editor-actions">
          <button class="icon-btn" type="button" data-service-item-action="up" data-service-item-index="${selectedIndex}" ${selectedIndex <= 0 ? "disabled" : ""} aria-label="항목 위로 이동"><i data-lucide="arrow-up"></i></button>
          <button class="icon-btn" type="button" data-service-item-action="down" data-service-item-index="${selectedIndex}" ${selectedIndex >= items.length - 1 ? "disabled" : ""} aria-label="항목 아래로 이동"><i data-lucide="arrow-down"></i></button>
          <button class="icon-btn" type="button" data-service-item-action="duplicate" data-service-item-index="${selectedIndex}" aria-label="항목 복제"><i data-lucide="copy"></i></button>
          <button class="icon-btn danger" type="button" data-service-item-action="delete" data-service-item-index="${selectedIndex}" aria-label="항목 삭제"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    </section>`;
}

function renderServiceTemplatesDetail() {
  const types = [...state.serviceTypes].sort((a, b) => serviceTypeSortOrder(a.id) - serviceTypeSortOrder(b.id));
  const summary = buildWorshipTemplateDraftSummary(types);
  refs.detailPane.innerHTML = `
    <div class="service-templates">
      <div class="service-section-head">
        <h2 class="service-date-list-title">템플릿 설계</h2>
        <div class="service-section-head-actions">
          <span class="service-search-count">${summary.templateTotal} 템플릿</span>
        </div>
      </div>
      <div class="svc-template-level-grid">
        ${renderWorshipTemplateLevelCard("Service", summary.levelCounts.service)}
        ${renderWorshipTemplateLevelCard("Section", summary.levelCounts.section)}
        ${renderWorshipTemplateLevelCard("Element", summary.levelCounts.element)}
        ${renderWorshipTemplateLevelCard("Slide", summary.levelCounts.slide)}
      </div>
      ${summary.templateTotal ? renderWorshipTemplateInventory() : ""}
      <div class="svc-template-draft-grid">
        ${summary.types.map(renderWorshipTemplateDraftCard).join("")}
      </div>
    </div>`;
  finishDetailRender();
}

function buildWorshipTemplateDraftSummary(types = []) {
  const serviceById = Object.fromEntries(state.services.map((service) => [service.id, service]));
  const sectionsByType = {};
  const elementTypesByType = {};
  const slideCountsByType = {};

  state.worshipSections.forEach((section) => {
    const service = serviceById[section.service_id];
    if (!service) return;
    const typeId = service.type_id;
    if (!sectionsByType[typeId]) sectionsByType[typeId] = new Map();
    const title = String(section.title || section.section_key || "Section").trim();
    const current = sectionsByType[typeId].get(title) || { title, count: 0, orderTotal: 0 };
    current.count += 1;
    current.orderTotal += Number(section.sort_order) || 0;
    sectionsByType[typeId].set(title, current);
  });

  state.worshipElements.forEach((element) => {
    const service = serviceById[state.worshipSections.find((section) => section.id === element.section_id)?.service_id];
    if (!service) return;
    const typeId = service.type_id;
    if (!elementTypesByType[typeId]) elementTypesByType[typeId] = new Map();
    const key = String(element.element_type || "plain_text").trim();
    elementTypesByType[typeId].set(key, (elementTypesByType[typeId].get(key) || 0) + 1);
  });

  Object.entries(state.worshipPresenterSlides).forEach(([serviceId, slides]) => {
    const service = serviceById[serviceId];
    if (!service) return;
    slideCountsByType[service.type_id] = (slideCountsByType[service.type_id] || 0) + slides.length;
  });

  const levelCounts = { service: 0, section: 0, element: 0, slide: 0 };
  state.worshipTemplates.forEach((template) => {
    const level = String(template.template_level || "").trim();
    if (Object.prototype.hasOwnProperty.call(levelCounts, level)) levelCounts[level] += 1;
  });

  return {
    templateTotal: state.worshipTemplates.length,
    levelCounts,
    types: types.map((type) => {
      const services = getFilteredServicesForType(type.id);
      const sections = [...(sectionsByType[type.id] || new Map()).values()]
        .sort((a, b) => (b.count - a.count) || ((a.orderTotal / a.count) - (b.orderTotal / b.count)))
        .slice(0, 10);
      const elementTypes = [...(elementTypesByType[type.id] || new Map()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([key, count]) => ({ key, count }));
      return {
        id: type.id,
        name: serviceTypeDisplayName(type.id),
        services: services.length,
        sections,
        elementTypes,
        slides: slideCountsByType[type.id] || 0,
      };
    }),
  };
}

function renderWorshipTemplateLevelCard(label, count) {
  return `
    <article class="svc-template-level-card">
      <strong>${escapeHtml(label)}</strong>
      <span>${count}</span>
    </article>`;
}

function renderWorshipTemplateInventory() {
  const templatesById = Object.fromEntries(state.worshipTemplates.map((template) => [template.id, template]));
  const itemsByTemplateId = state.worshipTemplateItems.reduce((grouped, item) => {
    const templateId = item.template_id;
    if (!templateId) return grouped;
    if (!grouped[templateId]) grouped[templateId] = [];
    grouped[templateId].push(item);
    return grouped;
  }, {});
  Object.values(itemsByTemplateId).forEach((items) => items.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)));
  const serviceTemplates = state.worshipTemplates
    .filter((template) => template.template_level === "service")
    .sort((a, b) => serviceTypeSortOrder(worshipAppServiceTypeId(a.service_type_id)) - serviceTypeSortOrder(worshipAppServiceTypeId(b.service_type_id)));
  if (!serviceTemplates.length) return "";
  return `
    <section class="svc-template-inventory">
      <div class="svc-template-inventory-head">
        <h3>Draft Templates</h3>
        <small>${serviceTemplates.length} service</small>
      </div>
      <div class="svc-template-inventory-list">
        ${serviceTemplates.map((template) => renderWorshipTemplateInventoryCard(template, templatesById, itemsByTemplateId)).join("")}
      </div>
    </section>`;
}

function renderWorshipTemplateInventoryCard(template, templatesById, itemsByTemplateId) {
  const sectionItems = itemsByTemplateId[template.id] || [];
  const status = template.is_active ? "Active" : "Draft";
  return `
    <details class="svc-template-inventory-card" open>
      <summary>
        <span>${escapeHtml(template.name || "Service Template")}</span>
        <small>${escapeHtml(status)} · ${sectionItems.length} sections</small>
      </summary>
      <div class="svc-template-inventory-sections">
        ${sectionItems.map((item, index) => renderWorshipTemplateSectionRow(item, index, templatesById, itemsByTemplateId)).join("")}
      </div>
    </details>`;
}

function renderWorshipTemplateSectionRow(item, index, templatesById, itemsByTemplateId) {
  const section = templatesById[item.child_template_id] || {};
  const elementItems = itemsByTemplateId[section.id] || [];
  const elementChips = elementItems.length
    ? elementItems.map((elementItem) => renderWorshipTemplateElementChip(elementItem, templatesById)).join("")
    : `<span class="svc-template-empty-chip">요소 없음</span>`;
  const flags = [
    item.required ? "필수" : "",
    item.flexible ? "유동" : "",
    item.repeatable ? "반복" : "",
  ].filter(Boolean).join(" · ");
  return `
    <article class="svc-template-inventory-section">
      <span class="svc-template-inventory-no">${index + 1}</span>
      <div class="svc-template-inventory-section-main">
        <div class="svc-template-inventory-section-title">
          <strong>${escapeHtml(section.name || item.default_title || "Section")}</strong>
          ${flags ? `<small>${escapeHtml(flags)}</small>` : ""}
        </div>
        <div class="svc-template-chip-list">${elementChips}</div>
      </div>
    </article>`;
}

function renderWorshipTemplateElementChip(item, templatesById) {
  const element = templatesById[item.child_template_id] || {};
  const count = element.config && typeof element.config === "object" ? element.config.count : "";
  return `
    <span class="svc-template-type-chip">
      <strong>${escapeHtml(element.name || worshipElementTypeLabel(element.element_type))}</strong>
      ${count ? `<small>${escapeHtml(count)}</small>` : ""}
    </span>`;
}

function renderWorshipTemplateDraftCard(type) {
  const sectionChips = type.sections.length
    ? type.sections.map((section) => `
        <span class="svc-template-pattern-chip">
          <strong>${escapeHtml(section.title)}</strong>
          <small>${section.count}</small>
        </span>`).join("")
    : `<span class="svc-template-empty-chip">섹션 없음</span>`;
  const elementChips = type.elementTypes.length
    ? type.elementTypes.map((element) => `
        <span class="svc-template-type-chip">
          <strong>${escapeHtml(worshipElementTypeLabel(element.key))}</strong>
          <small>${element.count}</small>
        </span>`).join("")
    : `<span class="svc-template-empty-chip">요소 없음</span>`;
  return `
    <details class="svc-template-draft-card">
      <summary>
        <span>${escapeHtml(type.name)}</span>
        <small>${type.services} 예배 · ${type.slides} 슬라이드</small>
      </summary>
      <div class="svc-template-draft-body">
        <div class="svc-template-draft-block">
          <h3>Sections</h3>
          <div class="svc-template-chip-list">${sectionChips}</div>
        </div>
        <div class="svc-template-draft-block">
          <h3>Elements</h3>
          <div class="svc-template-chip-list">${elementChips}</div>
        </div>
      </div>
    </details>`;
}

function worshipElementTypeLabel(type) {
  const normalized = String(type || "").trim();
  return {
    title_person: "제목 / 담당자",
    scripture_reading: "성경봉독",
    scripture_body: "성경 본문",
    plain_text: "일반 텍스트",
    body: "본문",
  }[normalized] || serviceElementTypeLabel(normalized) || normalized || "요소";
}

function renderServiceOrderTemplateEditor(type) {
  const steps = serviceOrderTemplate(type.id).map((step, index) => normalizeServiceTemplateStep(step, index, type.id));
  return `
    <details class="svc-template-card">
      <summary>
        <span>${escapeHtml(serviceTypeDisplayName(type.id))}</span>
        <small>${steps.length} 섹션</small>
      </summary>
      <div class="svc-template-step-list">
        ${steps.map((step, index) => renderServiceTemplateStepRow(type.id, step, index, steps.length)).join("")}
        <button class="svc-template-add" type="button" data-service-template-step-action="add" data-service-type-id="${escapeAttr(type.id)}">+ 섹션</button>
      </div>
    </details>`;
}

function renderServiceTemplateStepRow(typeId, step, index, total) {
  const elementRows = renderServiceTemplateElementRows(typeId, step, index);
  return `
    <div class="svc-template-step-row">
      <span class="svc-template-step-number">${index + 1}</span>
      <label class="svc-template-step-field">
        <small>섹션</small>
        <input
          type="text"
          data-service-template-step-field="label"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.label || step.name || "")}"
        >
      </label>
      <label class="svc-template-step-field svc-template-step-field--wide">
        <small>기본 항목</small>
        <input
          type="text"
          data-service-template-step-field="default_text"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.default_text || "")}"
        >
      </label>
      <label class="svc-template-step-field">
        <small>흐름</small>
        <input
          type="text"
          data-service-template-step-field="phase"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.phase || "")}"
        >
      </label>
      <label class="svc-template-step-field">
        <small>타입</small>
        <select
          data-service-template-step-field="element_type"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
        >
          ${renderServiceElementTypeOptions(step.elementType || step.componentType)}
        </select>
      </label>
      <label class="svc-template-step-field">
        <small>템플릿</small>
        <input
          type="text"
          data-service-template-step-field="template_key"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.templateKey || "")}"
          placeholder="공통 양식"
        >
      </label>
      <label class="svc-template-step-field">
        <small>출력</small>
        <input
          type="text"
          data-service-template-step-field="template_variant"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.templateVariant || "")}"
          placeholder="공예배 / 부서예배"
        >
      </label>
      <label class="svc-template-step-field svc-template-step-field--form">
        <small>송폼</small>
        <input
          type="text"
          data-service-template-step-field="form_hint"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          value="${escapeAttr(step.formHint || step.form_hint || serviceFormPresetSummary(step.formPreset || step.form_preset) || "")}"
          placeholder="V1-C-C"
        >
      </label>
      <label class="svc-template-step-toggle">
        <input
          type="checkbox"
          data-service-template-step-field="required"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          ${step.required ? "checked" : ""}
        >
        <span>필수</span>
      </label>
      <label class="svc-template-step-toggle">
        <input
          type="checkbox"
          data-service-template-step-field="flex"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          ${step.flex ? "checked" : ""}
        >
        <span>유동</span>
      </label>
      <label class="svc-template-step-toggle">
        <input
          type="checkbox"
          data-service-template-step-field="repeatable"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${index}"
          ${step.repeatable ? "checked" : ""}
        >
        <span>반복</span>
      </label>
      <div class="svc-template-step-actions">
        <button class="icon-btn tiny" type="button" data-service-template-element-action="add" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${index}" aria-label="세부 엘리먼트 추가">E＋</button>
        <button class="icon-btn tiny" type="button" data-service-template-step-action="up" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${index}" aria-label="섹션 위로 이동" ${index <= 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn tiny" type="button" data-service-template-step-action="down" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${index}" aria-label="섹션 아래로 이동" ${index >= total - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn tiny" type="button" data-service-template-step-action="add-after" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${index}" aria-label="아래에 섹션 추가">＋</button>
        <button class="icon-btn tiny danger" type="button" data-service-template-step-action="delete" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${index}" aria-label="섹션 삭제">×</button>
      </div>
    </div>
    ${elementRows}`;
}

function renderServiceTemplateElementRows(typeId, step, stepIndex) {
  const elements = Array.isArray(step.elements) ? step.elements.filter((element) => element && typeof element === "object") : [];
  if (!elements.length) return "";
  return `
    <div class="svc-template-element-list" aria-label="${escapeAttr(step.label || step.name || "섹션")} 세부 요소">
      ${elements.map((element, elementIndex) => renderServiceTemplateElementRow(typeId, element, stepIndex, elementIndex, elements.length)).join("")}
    </div>`;
}

function renderServiceTemplateElementRow(typeId, element, stepIndex, elementIndex, total) {
  const orderSheet = normalizeServiceOrderSheetPayload(element.orderSheet || element.order_sheet);
  const formHint = element.formHint || element.form_hint || serviceFormPresetSummary(element.formPreset || element.form_preset) || "";
  return `
    <div class="svc-template-element-row">
      <span class="svc-template-element-number">${stepIndex + 1}.${elementIndex + 1}</span>
      <label class="svc-template-step-field svc-template-element-field">
        <small>엘리먼트</small>
        <input
          type="text"
          data-service-template-element-field="label"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${stepIndex}"
          data-element-index="${elementIndex}"
          value="${escapeAttr(element.label || element.name || "")}"
        >
      </label>
      <label class="svc-template-step-field svc-template-element-field">
        <small>기본 항목</small>
        <input
          type="text"
          data-service-template-element-field="default_text"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${stepIndex}"
          data-element-index="${elementIndex}"
          value="${escapeAttr(element.default_text || element.title || "")}"
        >
      </label>
      <label class="svc-template-step-field svc-template-element-field">
        <small>타입</small>
        <select
          data-service-template-element-field="element_type"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${stepIndex}"
          data-element-index="${elementIndex}"
        >
          ${renderServiceElementTypeOptions(element.elementType || element.element_type || element.componentType || element.component_type)}
        </select>
      </label>
      <label class="svc-template-step-field svc-template-element-field">
        <small>순서지</small>
        <input
          type="text"
          data-service-template-element-field="order_sheet"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${stepIndex}"
          data-element-index="${elementIndex}"
          value="${escapeAttr(orderSheet?.order || "")}"
          placeholder="순서지 항목"
        >
      </label>
      <label class="svc-template-step-field svc-template-step-field--form svc-template-element-field">
        <small>송폼</small>
        <input
          type="text"
          data-service-template-element-field="form_hint"
          data-service-type-id="${escapeAttr(typeId)}"
          data-step-index="${stepIndex}"
          data-element-index="${elementIndex}"
          value="${escapeAttr(formHint)}"
          placeholder="V-C"
        >
      </label>
      <div class="svc-template-element-actions">
        <button class="icon-btn tiny" type="button" data-service-template-element-action="up" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${stepIndex}" data-element-index="${elementIndex}" aria-label="엘리먼트 위로 이동" ${elementIndex <= 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn tiny" type="button" data-service-template-element-action="down" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${stepIndex}" data-element-index="${elementIndex}" aria-label="엘리먼트 아래로 이동" ${elementIndex >= total - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn tiny" type="button" data-service-template-element-action="add-after" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${stepIndex}" data-element-index="${elementIndex}" aria-label="아래에 엘리먼트 추가">＋</button>
        <button class="icon-btn tiny danger" type="button" data-service-template-element-action="delete" data-service-type-id="${escapeAttr(typeId)}" data-step-index="${stepIndex}" data-element-index="${elementIndex}" aria-label="엘리먼트 삭제">×</button>
      </div>
    </div>`;
}

function renderServiceListDetail() {
  const types = getFilteredServiceTypes();
  const q = normalizeSearchValue(state.search);
  const groups = ["public", "ministry", "special", "other"]
    .map((key) => ({
      key,
      types: types
        .filter((type) => serviceTypeGroupKey(type.id) === key)
        .map((type) => ({
          type,
          services: getFilteredServicesForType(type.id),
        }))
        .filter((entry) => entry.services.length || !q),
    }))
    .filter((group) => group.types.length);
  const count = groups.reduce((total, group) => total + group.types.reduce((sum, entry) => sum + entry.services.length, 0), 0);
  refs.detailPane.innerHTML = `
    <div class="service-date-list service-date-list--all">
      <div class="service-section-head">
        <h2 class="service-date-list-title">${q ? "검색 결과" : "목록"}</h2>
        <div class="service-section-head-actions">
          <span class="service-search-count">${count}${q ? "개 결과" : "개 예배"}</span>
        </div>
      </div>
      <div class="service-list-groups">
        ${groups.map((group) => `
          <section class="service-list-group">
            <h3>${escapeHtml(serviceTypeGroupLabel(group.key))}</h3>
            <div class="service-list-type-stack">
              ${group.types.map(({ type, services }) => renderServiceListTypeBlock(type, services, q)).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </div>`;
  finishDetailRender();
}

function renderServiceListTypeBlock(type, services, query) {
  const sorted = sortServicesByDate(services, "desc");
  return `
    <section class="service-list-type-block">
      <header>
        <button class="service-list-type-open" type="button" data-select-service-type="${escapeAttr(type.id)}">
          <strong>${escapeHtml(serviceTypeDisplayName(type.id))}</strong>
          <small>${escapeHtml(sorted.length)}${query ? "개 결과" : "개 예배"}</small>
        </button>
        <button class="icon-btn quiet svc-new-btn" type="button" data-new-service="${escapeAttr(type.id)}" aria-label="예배 추가">
          <i data-lucide="plus"></i>
        </button>
      </header>
      ${sorted.length ? `<div class="service-date-grid">
        ${sorted.map((service) => renderServiceDateCard(service, { showType: true })).join("")}
      </div>` : `<p class="service-no-results">등록된 예배가 없습니다.</p>`}
    </section>`;
}

function renderServiceDetail() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  const serviceId = state.selectedServiceId;
  const selectedService = state.services.find((service) => service.id === serviceId);
  if (selectedService && state.selectedServiceTypeId !== selectedService.type_id) {
    state.selectedServiceTypeId = selectedService.type_id;
  }

  if (state.selectedServiceTypeId === SERVICE_TEMPLATES_PANEL_ID) {
    renderServiceTemplatesDetail();
    return;
  }

  if (!state.selectedServiceTypeId) {
    renderServiceDashboard();
    return;
  }

  if (state.selectedServiceTypeId === SERVICE_LIST_PANEL_ID) {
    renderServiceListDetail();
    return;
  }

  if (!serviceId) {
    const typeId = state.selectedServiceTypeId;
    const actualServices = getFilteredServicesForType(typeId);
    const q = normalizeSearchValue(state.search);
    const expectedServices = q ? [] : getExpectedServicesForType(typeId);
    const services = sortServicesByDate([...actualServices, ...expectedServices], "desc");
    const typeName = serviceTypeDisplayName(typeId);
    const form = state.newServiceForm;
    refs.detailPane.innerHTML = `
      <div class="service-date-list">
        <div class="service-section-head">
          <h2 class="service-date-list-title">${escapeHtml(typeName)}</h2>
          <div class="service-section-head-actions">
            <span class="service-search-count">${services.length}${q ? "개 결과" : "개 예배"}</span>
            <button class="reference-new-btn" type="button" data-new-service="${escapeAttr(typeId)}" aria-label="예배 추가">
              <i data-lucide="plus"></i>
              <span>추가</span>
            </button>
          </div>
        </div>
        ${form ? `
        <div class="svc-new-form">
          <div class="svc-new-form-fields">
            <div class="svc-new-field">
              <label class="svc-new-label">날짜</label>
              <input class="svc-new-input" type="date" data-new-service-field="date" value="${escapeAttr(form.date)}" required />
            </div>
            ${state.serviceTitleSupported ? `
              <div class="svc-new-field">
                <label class="svc-new-label">예배명</label>
                <input class="svc-new-input" type="text" data-new-service-field="title" value="${escapeAttr(form.title || "")}" placeholder="${typeId === "special" ? "고난주간 특별새벽기도회" : "필요할 때만"}" />
              </div>
            ` : ""}
            ${serviceUsesPraiseLeader(typeId) ? `
              <div class="svc-new-field">
                <label class="svc-new-label">찬양 인도자</label>
                <input class="svc-new-input" type="text" data-new-service-field="leader" value="${escapeAttr(form.leader)}" placeholder="이름 칭호" />
              </div>
            ` : ""}
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
    refs.detailPane.innerHTML = renderLoadingDetail();
    loadServiceItems(serviceId);
    return;
  }

  const dateStr = formatServiceIsoDate(svc);
  const presenterActive = state.presenter.serviceId === serviceId;
  const presenterSlides = presenterActive ? state.presenter.slides : buildServicePresenterSlides(serviceId);
  const presenterIndex = presenterActive ? clampPresenterIndex(state.presenter.index, presenterSlides.length) : 0;
  refs.detailPane.innerHTML = `
    <div class="service-viewer">
      <div class="svc-header">
        <div class="svc-header-date">
          <h2 class="svc-service-title">${escapeHtml(serviceDisplayTypeName(svc))}</h2>
          <span class="svc-date-text">${escapeHtml(dateStr)}</span>
        </div>
        <span class="dirty-pill" ${state.dirty.service ? "" : "hidden"}>Unsaved changes</span>
      </div>
      ${renderServicePresenterControls(svc, presenterSlides, presenterActive, presenterIndex)}
      ${renderServicePraiseDatalist()}
      ${renderServiceScriptureDatalist()}
    </div>`;
  refreshIcons();
  updateSaveState();
}

function buildWorshipServiceStructure(service, presenterSlides = []) {
  const sections = state.worshipSections
    .filter((section) => section.service_id === service.id)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const sectionIds = new Set(sections.map((section) => section.id));
  const elements = state.worshipElements
    .filter((element) => sectionIds.has(element.section_id))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const elementsBySection = elements.reduce((grouped, element) => {
    const sectionId = element.section_id;
    if (!grouped[sectionId]) grouped[sectionId] = [];
    grouped[sectionId].push(element);
    return grouped;
  }, {});
  const slideCountsByElement = presenterSlides.reduce((counts, slide) => {
    const elementId = slide.elementId || "";
    if (!elementId || /:ready$/.test(elementId)) return counts;
    counts[elementId] = (counts[elementId] || 0) + 1;
    return counts;
  }, {});
  return { sections, elements, elementsBySection, slideCountsByElement };
}

function renderWorshipServiceStructure(structure) {
  if (!structure || !structure.sections.length) {
    return `<p class="service-no-results">섹션과 요소가 없습니다.</p>`;
  }
  return `
    <div class="svc-worship-structure">
      ${structure.sections.map((section, index) => renderWorshipSectionBlock(section, index, structure)).join("")}
    </div>`;
}

function renderWorshipSectionBlock(section, index, structure) {
  const elements = structure.elementsBySection[section.id] || [];
  const slideCount = elements.reduce((total, element) => total + (structure.slideCountsByElement[element.id] || 0), 0);
  return `
    <section class="svc-worship-section-block">
      <div class="svc-worship-section-head">
        <span class="svc-worship-section-no">${index + 1}</span>
        <div class="svc-worship-section-title">
          <strong>${escapeHtml(section.title || section.section_key || "Section")}</strong>
          <small>${elements.length} 요소 · ${slideCount} 슬라이드</small>
        </div>
      </div>
      <div class="svc-worship-element-list">
        ${elements.length
          ? elements.map((element, elementIndex) => renderWorshipElementRow(element, elementIndex, structure)).join("")
          : `<p class="service-no-results">요소가 없습니다.</p>`}
      </div>
    </section>`;
}

function renderWorshipElementRow(element, index, structure) {
  const typeLabel = worshipElementTypeLabel(element.element_type);
  const title = cleanList([element.title, element.body]).join(" · ") || typeLabel;
  const meta = cleanList([
    element.person,
    element.song_id ? "Praise 연결" : "",
    element.scripture_reference || element.scripture_id ? "Scripture 연결" : "",
    element.review_status === "needs_review" ? "검토 필요" : "",
  ]).join(" · ");
  const slideCount = structure.slideCountsByElement[element.id] || 0;
  return `
    <article class="svc-worship-outline-row">
      <span class="svc-worship-outline-no">${index + 1}</span>
      <div class="svc-worship-outline-main">
        <span class="svc-worship-outline-label">${escapeHtml(typeLabel)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(cleanList([meta, `${slideCount} 슬라이드`]).join(" · "))}</small>
      </div>
    </article>`;
}

function renderServicePraiseDatalist() {
  const options = state.songs
    .map((song) => songServiceOptionLabel(song))
    .filter(Boolean)
    .slice(0, 1200)
    .map((label) => `<option value="${escapeAttr(label)}"></option>`)
    .join("");
  return `<datalist id="servicePraiseOptions">${options}</datalist>`;
}

function renderServiceScriptureDatalist() {
  const options = getBibleBooks()
    .flatMap((book) => [
      book.koreanName,
      book.shortName,
      KOREAN_BIBLE_BOOK_ABBREVIATIONS[book.code],
      book.englishName,
      book.canonicalEnglishTitle,
    ])
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .map((label) => `<option value="${escapeAttr(label)} 1:1"></option>`)
    .join("");
  return `<datalist id="serviceScriptureOptions">${options}</datalist>`;
}

function renderServiceEditorHeader(typeId) {
  const defaultCount = typeId ? getServiceDefaultItems(typeId).length : 0;
  return `
    <div class="svc-editor-header">
      <span></span>
      <span>섹션</span>
      <span>담당</span>
      <span>항목</span>
      <span>
        ${typeId ? `<button class="icon-btn" type="button" data-service-default-action="add" data-service-default-index="${defaultCount}" aria-label="공통 항목 추가">
          <i data-lucide="plus"></i>
        </button>` : ""}
      </span>
    </div>`;
}

function serviceVisibleTags(service) {
  return (service?.tags || [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && tag !== "PPT 확인" && tag !== "2·3부 통합");
}

function serviceUsesPraiseLeader(typeId) {
  return typeId !== "sunday-first" && typeId !== "sunday-second";
}

function renderServiceMetaEditor(service) {
  if (!service) return "";
  const leaderHidden = !serviceUsesPraiseLeader(service.type_id);
  return `
    <div class="svc-meta-editor">
      ${state.serviceTitleSupported ? `
      <label>
        <span>예배명</span>
        <input class="svc-meta-input svc-meta-input--title" type="text" data-service-meta-field="title"
          value="${escapeAttr(service.title || "")}"
          placeholder="${service.type_id === "special" ? "특별예배명" : "필요할 때만"}"
          aria-label="예배명" />
      </label>` : ""}
      <label>
        <span>${leaderHidden ? "찬양 인도자 없음" : "찬양 인도자"}</span>
        <input class="svc-meta-input" type="text" data-service-meta-field="leader"
          value="${escapeAttr(leaderHidden ? "" : service.leader || "")}"
          placeholder="${leaderHidden ? "1·2부는 표시하지 않음" : "이름 칭호"}"
          aria-label="${leaderHidden ? "찬양 인도자 없음" : "찬양 인도자"}"
          ${leaderHidden ? "disabled" : ""} />
      </label>
      <label>
        <span>비고</span>
        <input class="svc-meta-input" type="text" data-service-meta-field="tags"
          value="${escapeAttr(serviceVisibleTags(service).join(", "))}"
          placeholder="온세대 찬양예배, 2·3부 통합..."
          aria-label="비고" />
      </label>
      <button class="icon-btn danger" type="button" data-delete-service="${escapeAttr(service.id)}" aria-label="예배 삭제">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;
}

function renderServiceOrderTemplate(typeObj) {
  const template = serviceOrderTemplate(typeObj?.id);
  if (!template.length) return "";
  return `
    <details class="svc-template-guide" aria-label="섹션 템플릿">
      <summary class="svc-template-head">
        <span>섹션 추가</span>
        <small>${template.length}</small>
      </summary>
      <div class="svc-template-flow">
        ${template.map((step, index) => renderServiceTemplateStep(step, index, typeObj?.id)).join("")}
      </div>
    </details>`;
}

function renderServiceSetlistComposer(service) {
  if (!service) return "";
  const assigneePlaceholder = serviceUsesPraiseLeader(service.type_id) ? "찬양 인도자" : "담당자";
  return `
    <details class="svc-setlist-composer" data-service-setlist="${escapeAttr(service.id)}">
      <summary>
        <span>찬양 불러오기</span>
        <small>곡명 한 줄씩</small>
      </summary>
      <div class="svc-setlist-grid">
        <label>
          <span>섹션</span>
          <input type="text" data-service-setlist-label value="찬양" placeholder="찬양" />
        </label>
        <label>
          <span>담당</span>
          <input type="text" data-service-setlist-assignee placeholder="${escapeAttr(assigneePlaceholder)}" />
        </label>
        <label class="svc-setlist-lines">
          <span>콘티</span>
          <textarea data-service-setlist-lines rows="4" placeholder="주만 의지해&#10;마음 속에 근심 있는 사람&#10;갈 길을 밝히 보이시니"></textarea>
        </label>
        <button class="svc-setlist-apply" type="button" data-service-setlist-apply="${escapeAttr(service.id)}">반영</button>
      </div>
    </details>`;
}

function renderServiceTemplateStep(step, index, typeId = "") {
  const label = step.label || step.name || `Step ${index + 1}`;
  const badge = renderServiceTemplateBadge(typeId, step);
  return `
    <button
      class="svc-template-step${step.required ? " is-required" : ""}${step.flex ? " is-flex" : ""}"
      type="button"
      data-service-item-action="add"
      data-service-item-label="${escapeAttr(step.label || "")}"
      data-service-item-title="${escapeAttr(step.default_text || "")}"
    >
      <span class="svc-template-step-label">${escapeHtml(label)}</span>
      ${badge}
    </button>`;
}

function renderServiceItemGroups(items) {
  if (!items.length) return `<p class="service-no-results">섹션과 항목을 추가해 주세요.</p>`;

  const selectedService = state.services.find((service) => service.id === state.selectedServiceId);
  const groups = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const groupInfo = serviceEditorGroupInfo(item);
    const last = groups[groups.length - 1];
    if (!item._isDefault && groupInfo.key && last && !last.entries[0].item._isDefault && last.key === groupInfo.key) {
      last.entries.push({ item, mergedIndex: i });
    } else {
      groups.push({
        key: groupInfo.key,
        kind: groupInfo.kind,
        label: groupInfo.label,
        assignee: groupInfo.kind === "main-praise" ? servicePraiseAssignee(selectedService, [item]) : "",
        entries: [{ item, mergedIndex: i }],
      });
    }
  }

  let html = "";
  let groupNum = 0;
  for (const group of groups) {
    groupNum++;
    if (group.kind === "main-praise") {
      group.assignee = servicePraiseAssignee(selectedService, group.entries.map((entry) => entry.item));
    }
    if (group.entries.length === 1) {
      html += renderServiceEditorItem(group.entries[0].item, group.entries[0].mergedIndex, items, groupNum);
    } else {
      const groupFirst = group.entries[0].item;
      const groupFirstIndex = groupFirst._origIndex;
      html += `<div class="svc-group${group.kind === "main-praise" ? " svc-group--praise" : ""}">
        <div class="svc-group-head">
          <span class="svc-edit-order">${groupNum}</span>
          <span class="svc-group-label-wrap">
            <span class="svc-group-label">${escapeHtml(group.label)}</span>
            ${renderServiceTemplateBadge(selectedService?.type_id, groupFirst)}
            ${renderServiceFormHintInput(groupFirst, groupFirstIndex, { compact: true, placeholder: "송폼/범위" })}
            ${renderServiceFormPresetBadges(groupFirst, { compact: true })}
          </span>
          ${group.kind === "main-praise" && serviceUsesPraiseLeader(selectedService?.type_id) ? `
            <input
              class="svc-group-assignee svc-group-assignee-input"
              type="text"
              data-service-meta-field="leader"
              value="${escapeAttr(selectedService?.leader || "")}"
              placeholder="${escapeAttr(group.assignee && group.assignee !== "다같이" ? group.assignee : "찬양 인도자")}"
              aria-label="찬양 섹션 인도자"
            />`
            : group.assignee ? `<span class="svc-group-assignee">${escapeHtml(group.assignee)}</span>` : ""}
        </div>
        ${renderServiceItemMemoEditor(groupFirst, groupFirstIndex, { compact: true })}`;
      for (const { item, mergedIndex } of group.entries) {
        const origIndex = item._origIndex;
        const upDisabled = findAdjacentSameType(items, mergedIndex, -1) === -1;
        const downDisabled = findAdjacentSameType(items, mergedIndex, 1) === -1;
        const localNumber = group.entries.findIndex((entry) => entry.item === item && entry.mergedIndex === mergedIndex) + 1;
        html += `
        <article class="svc-edit-item svc-edit-item--sub${group.kind === "main-praise" ? " svc-edit-item--praise-sub" : ""}">
          ${group.kind === "main-praise" ? "" : `
          <input
            class="svc-edit-assignee"
            type="text"
            data-service-item-field="assignee"
            data-service-item-index="${origIndex}"
            value="${escapeAttr(item.assignee || "")}"
            placeholder="${escapeAttr(inferOrderSheetAssignee(item))}"
            aria-label="항목 담당"
	          />`}
	          <div class="svc-edit-title-wrap">
	            <span class="svc-subsection-chip">${escapeHtml(`${group.label} ${localNumber}`)}</span>
	            <input
	              class="svc-edit-title"
	              type="text"
              data-service-item-field="raw_title"
              data-service-item-index="${origIndex}"
              value="${escapeAttr(item.raw_title || "")}"
              placeholder="${isScriptureServiceLabel(item.label) ? "성경 구절" : "찬양 제목"}"
              ${isSongServiceLabel(item.label) ? `list="servicePraiseOptions"` : ""}
              ${isScriptureServiceLabel(item.label) ? `list="serviceScriptureOptions"` : ""}
	              aria-label="항목 내용"
	            />
	            ${group.kind === "main-praise" ? renderServiceFormHintInput(item, origIndex, { compact: true, placeholder: "송폼" }) : ""}
	            ${group.kind === "main-praise" ? renderServiceFormPresetBadges(item, { compact: true }) : ""}
	            ${renderServiceItemLinkControl(item, origIndex)}
	          </div>
          <div class="svc-edit-actions">
            <button class="icon-btn" type="button" data-service-item-action="up" data-service-item-index="${origIndex}" ${upDisabled ? "disabled" : ""} aria-label="항목 위로 이동"><i data-lucide="arrow-up"></i></button>
            <button class="icon-btn" type="button" data-service-item-action="down" data-service-item-index="${origIndex}" ${downDisabled ? "disabled" : ""} aria-label="항목 아래로 이동"><i data-lucide="arrow-down"></i></button>
            <button class="icon-btn" type="button" data-service-item-action="duplicate" data-service-item-index="${origIndex}" aria-label="항목 복제"><i data-lucide="copy"></i></button>
            <button class="icon-btn danger" type="button" data-service-item-action="delete" data-service-item-index="${origIndex}" aria-label="항목 삭제"><i data-lucide="trash-2"></i></button>
          </div>
        </article>`;
      }
      html += `</div>`;
    }
  }
  return html;
}

function serviceEditorGroupInfo(item) {
  const label = String(item?.label || "").trim();
  if (isMainPraiseServiceItem(item)) {
    return { key: "main-praise", kind: "main-praise", label: "찬양" };
  }
  return label
    ? { key: `label:${label}`, kind: "label", label }
    : { key: "", kind: "", label: "" };
}

function renderServiceEditorItem(item, mergedIndex, mergedItems, groupNum) {
  const isDefault = item._isDefault;
  const origIndex = item._origIndex;
  const actionAttr = isDefault ? "data-service-default-action" : "data-service-item-action";
  const indexAttr = isDefault ? "data-service-default-index" : "data-service-item-index";
  const fieldAttr = isDefault ? "data-service-default-field" : "data-service-item-field";
  const upDisabled = findAdjacentSameType(mergedItems, mergedIndex, -1) === -1;
  const downDisabled = findAdjacentSameType(mergedItems, mergedIndex, 1) === -1;
  return `
    <article class="svc-edit-item${isDefault ? " svc-edit-item--default" : ""}">
      <span class="svc-edit-order">${groupNum || mergedIndex + 1}</span>
      <span class="svc-edit-section-cell">
        <input
          class="svc-edit-label"
          type="text"
          ${fieldAttr}="label"
          ${indexAttr}="${origIndex}"
          value="${escapeAttr(item.label || "")}"
          placeholder="${isDefault ? "섹션" : "찬양"}"
          aria-label="${isDefault ? "기본 섹션" : "섹션"}"
        />
        ${!isDefault ? renderServiceTemplateBadge(state.services.find((service) => service.id === state.selectedServiceId)?.type_id, item) : ""}
        ${!isDefault ? renderServiceFormHintInput(item, origIndex) : ""}
        ${!isDefault ? renderServiceFormPresetBadges(item) : ""}
      </span>
      <input
        class="svc-edit-assignee"
        type="text"
        ${fieldAttr}="assignee"
        ${indexAttr}="${origIndex}"
        value="${escapeAttr(item.assignee || "")}"
        placeholder="${escapeAttr(inferOrderSheetAssignee(item))}"
        aria-label="${isDefault ? "기본 항목 담당" : "항목 담당"}"
      />
      <div class="svc-edit-title-wrap">
        <input
          class="svc-edit-title"
          type="text"
          ${fieldAttr}="raw_title"
          ${indexAttr}="${origIndex}"
          value="${escapeAttr(item.raw_title || "")}"
          placeholder="${isDefault ? "매 예배에 적용할 내용" : (item.label ? "내용" : "찬양 제목")}"
          ${!isDefault && isSongServiceLabel(item.label) ? `list="servicePraiseOptions"` : ""}
          ${!isDefault && isScriptureServiceLabel(item.label) ? `list="serviceScriptureOptions"` : ""}
          aria-label="${isDefault ? "기본 항목 내용" : "항목 내용"}"
        />
        ${!isDefault ? renderServiceItemLinkControl(item, origIndex) : ""}
      </div>
      <div class="svc-edit-actions">
        <button class="icon-btn" type="button" ${actionAttr}="up" ${indexAttr}="${origIndex}" ${upDisabled ? "disabled" : ""} aria-label="${isDefault ? "기본 항목 위로 이동" : "항목 위로 이동"}"><i data-lucide="arrow-up"></i></button>
        <button class="icon-btn" type="button" ${actionAttr}="down" ${indexAttr}="${origIndex}" ${downDisabled ? "disabled" : ""} aria-label="${isDefault ? "기본 항목 아래로 이동" : "항목 아래로 이동"}"><i data-lucide="arrow-down"></i></button>
        <button class="icon-btn" type="button" ${actionAttr}="duplicate" ${indexAttr}="${origIndex}" aria-label="${isDefault ? "기본 항목 복제" : "항목 복제"}"><i data-lucide="copy"></i></button>
        <button class="icon-btn danger" type="button" ${actionAttr}="delete" ${indexAttr}="${origIndex}" aria-label="${isDefault ? "기본 항목 삭제" : "항목 삭제"}"><i data-lucide="trash-2"></i></button>
      </div>
    </article>
    ${!isDefault ? renderServiceItemMemoEditor(item, origIndex) : ""}`;
}

function renderServiceItemMemoEditor(item, index, options = {}) {
  const parsed = parseServiceItemMemo(item?.memo);
  const preparation = isServicePreparationItem(item, parsed);
  const elementType = preparation ? servicePreparationElementTypeForServiceId(item?.service_id || state.selectedServiceId) : serviceMemoElementType(parsed);
  const assetNameLabel = elementType === "image" ? "이미지명" : "파일명";
  const assetNamePlaceholder = elementType === "image" ? "예배 첫 슬라이드 이미지" : "준비 영상";
  const assetUrlPlaceholder = elementType === "image" ? "assets/.../first-slide.jpg" : "assets/.../ready.mp4";
  const hasContent = Boolean(preparation || parsed.note || parsed.slides.length || parsed.formHint || parsed.formPreset || parsed.formPresetRules?.length || elementType || hasServiceAsset(parsed.asset));
  return `
    <details class="svc-item-note${options.compact ? " compact" : ""}"${hasContent ? " open" : ""}>
      <summary>
        <span>항목 · 메모 · 슬라이드</span>
        ${hasContent ? `<small>적용됨</small>` : ""}
      </summary>
      <div class="svc-item-note-grid">
        <label>
          <span>타입</span>
          <select
            data-service-item-field="element_type"
            data-service-item-index="${index}"
          >
            ${renderServiceElementTypeOptions(elementType)}
          </select>
        </label>
        <label>
          <span>메모</span>
          <input
            type="text"
            data-service-item-field="memo_note"
            data-service-item-index="${index}"
            value="${escapeAttr(parsed.note)}"
            placeholder="카메라 2 · 조명 낮게 · 마이크 4"
          />
        </label>
        <label>
          <span>${escapeHtml(assetNameLabel)}</span>
          <input
            type="text"
            data-service-item-field="asset_name"
            data-service-item-index="${index}"
            value="${escapeAttr(parsed.asset?.name || "")}"
            placeholder="${escapeAttr(assetNamePlaceholder)}"
          />
        </label>
        <label>
          <span>파일/링크</span>
          <input
            type="text"
            data-service-item-field="asset_url"
            data-service-item-index="${index}"
            value="${escapeAttr(parsed.asset?.url || "")}"
            placeholder="${escapeAttr(assetUrlPlaceholder)}"
          />
        </label>
        <label>
          <span>슬라이드 직접 지정</span>
          <textarea
            data-service-item-field="slide_overrides"
            data-service-item-index="${index}"
            rows="3"
            placeholder="Verse 1&#10;가사 두 줄&#10;---&#10;Chorus&#10;후렴 두 줄"
          >${escapeHtml(formatServiceSlideOverrideInput(item?.memo))}</textarea>
        </label>
      </div>
    </details>`;
}

function renderServiceElementTypeOptions(selectedType = "") {
  const selected = normalizeServiceElementType(selectedType) || normalizeWorshipElementType(selectedType);
  const options = [
    ["", "자동"],
    ["blank", "빈 화면"],
    ["video", "동영상"],
    ["image", "이미지"],
    ["score", "악보"],
    ["praise", "찬양"],
    ["live_praise", "실시간 찬양"],
    ["scripture", "말씀"],
    ["scripture_reading", "성경봉독"],
    ["scripture_body", "성경 본문"],
    ["title_person", "제목 / 담당자"],
    ["plain_text", "일반 텍스트"],
    ["body", "본문"],
    ["activity", "Activity"],
    ["template", "슬라이드 템플릿"],
    ["file", "파일"],
  ];
  return options
    .map(([value, label]) => `<option value="${escapeAttr(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}


function renderServicePraiseLinkControl(item, index) {
  if (!isSongServiceLabel(item?.label)) return "";
  if (item?.song_id) {
    return `<button class="svc-item-link svc-item-link--linked" type="button" data-open-song="${escapeAttr(item.song_id)}" aria-label="Praise에서 열기">DB</button>`;
  }
  const title = String(item?.raw_title || "").trim();
  if (!title) return "";
  return `
    <button class="svc-song-create" type="button" data-service-song-create="${index}">
      <span>추가</span>
    </button>`;
}

function renderServiceItemLinkControl(item, index) {
  return renderServicePraiseLinkControl(item, index) || renderServiceScriptureLinkControl(item);
}

function renderServiceScriptureLinkControl(item) {
  if (!isScriptureServiceLabel(item?.label)) return "";
  const reference = normalizeServiceItemReferenceSpacing(item?.raw_title);
  if (!parseBibleReference(reference)) return "";
  return `<button class="svc-item-link" type="button" data-open-scripture-reference="${escapeAttr(reference)}" aria-label="Scripture에서 열기">Scripture</button>`;
}

function renderServiceDashboard() {
  if (!state.serviceTypes.length) {
    refs.detailPane.innerHTML = state.serviceError
      ? renderUnavailableDetail("service", "Worship", state.serviceError)
      : renderLoadingDetail();
    return;
  }

  const services = getServiceDashboardServices();
  const recentServices = getRecentServiceShortcuts(12);
  const q = normalizeSearchValue(state.search);
  const weekDays = serviceWeekDays();
  const servicesByDate = new Map();
  for (const service of services) {
    const key = service.date;
    if (!servicesByDate.has(key)) servicesByDate.set(key, []);
    servicesByDate.get(key).push(service);
  }
  const { start, end } = currentServiceWeekRange();
  refs.detailPane.innerHTML = `
    <div class="service-dashboard">
      <section class="service-dashboard-section">
        <div class="service-section-head">
          <div>
            <h2 class="service-date-list-title">${q ? "검색 결과" : "이번 주 예배"}</h2>
            ${!q ? `<p class="service-week-range">${escapeHtml(formatServiceWeekRange(start, end))}</p>` : ""}
          </div>
          <button class="reference-new-btn" type="button" data-service-templates aria-label="템플릿 열기">
            <i data-lucide="layout-template"></i>
            <span>템플릿</span>
          </button>
        </div>
        ${q ? (services.length ? `<div class="service-date-grid service-date-grid--dashboard">
          ${services.map((service) => renderServiceDateCard(service, { showType: true })).join("")}
        </div>` : `<p class="service-no-results">검색 결과가 없습니다.</p>`) : `
          <div class="service-week-board">
            ${weekDays.map((date) => renderServiceWeekDay(date, servicesByDate.get(toLocalDateStr(date)) || [])).join("")}
          </div>`}
      </section>
      ${!q && recentServices.length ? `
        <section class="service-dashboard-section">
          <div class="service-section-head">
            <h2 class="service-date-list-title">최근 예배</h2>
            <button class="reference-new-btn secondary" type="button" data-service-list aria-label="전체 예배 보기">
              <span>전체</span>
            </button>
          </div>
          <div class="service-date-grid service-date-grid--dashboard">
            ${recentServices.map((service) => renderServiceDateCard(service, { showType: true })).join("")}
          </div>
        </section>
      ` : ""}
    </div>`;
  refreshIcons();
}

function formatServiceWeekRange(start, end) {
  return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

function renderServiceWeekDay(date, services) {
  const weekdays = ["일","월","화","수","목","금","토"];
  const dateStr = toLocalDateStr(date);
  const today = toLocalDateStr(new Date());
  return `
    <section class="service-week-day${dateStr === today ? " is-today" : ""}">
      <header>
        <strong>${escapeHtml(weekdays[date.getDay()])}</strong>
        <span>${escapeHtml(`${date.getMonth() + 1}/${date.getDate()}`)}</span>
      </header>
      <div class="service-week-stack">
        ${services.length
          ? services.map((service) => renderServiceWeekCard(service)).join("")
          : `<button class="service-week-empty" type="button" data-service-templates>템플릿</button>`}
      </div>
    </section>`;
}

function renderServiceWeekCard(service) {
  const preview = serviceItemPreview(service.id);
  return `
    <button
      class="service-week-card"
      type="button"
      data-service-id="${escapeAttr(service.id)}"
    >
      <strong>${escapeHtml(serviceDisplayTypeName(service))}</strong>
      <span class="service-week-card-preview">${escapeHtml(preview || "순서 확인")}</span>
    </button>`;
}

function renderServiceDateCard(service, options = {}) {
  const preview = serviceItemPreview(service.id);
  const note = (service.tags || []).join(", ");
  return `
    <button
      class="service-date-card"
      type="button"
      data-service-id="${escapeAttr(service.id)}"
    >
      <span class="service-date-card-date">${escapeHtml(formatServiceDate(service, { compact: true }))}</span>
      ${options.showType ? `<span class="service-date-card-type">${escapeHtml(serviceDisplayTypeName(service))}</span>` : ""}
      ${note ? `<span class="service-date-card-note">${escapeHtml(note)}</span>` : ""}
      ${preview ? `<span class="service-date-card-preview">${escapeHtml(preview)}</span>` : ""}
    </button>`;
}

function formatServiceDate(service, options = {}) {
  const start = new Date(`${service.date}T00:00:00`);
  const startText = options.compact
    ? `${start.getMonth() + 1}/${start.getDate()} ${serviceWeekdayLabel(start)}`
    : `${start.getMonth() + 1}월 ${start.getDate()}일 (${serviceWeekdayLabel(start)})`;
  if (!service.date_end) return startText;
  const end = new Date(`${service.date_end}T00:00:00`);
  const endText = options.compact
    ? `${end.getMonth() + 1}/${end.getDate()} ${serviceWeekdayLabel(end)}`
    : `${end.getMonth() + 1}월 ${end.getDate()}일 (${serviceWeekdayLabel(end)})`;
  return `${startText} - ${endText}`;
}

function serviceWeekdayLabel(date) {
  return ["주일","월","화","수","목","금","토"][date.getDay()] || "";
}

function formatServiceIsoDate(service) {
  const start = String(service?.date || "").trim();
  const end = String(service?.date_end || "").trim();
  if (!start) return "";
  const startLabel = formatServiceIsoDatePart(start);
  if (!end || end === start) return startLabel;
  return `${startLabel} - ${formatServiceIsoDatePart(end)}`;
}

function formatServiceIsoDatePart(value) {
  const date = new Date(`${value}T00:00:00`);
  const label = Number.isNaN(date.getTime()) ? "" : serviceWeekdayLabel(date);
  return label ? `${value} (${label})` : value;
}

function serviceItemPreview(serviceId) {
  const items = getServiceOutputItems(serviceId)
    .filter((item) => serviceItemDisplayText(item) && serviceItemDisplayText(item) !== "-")
  if (!items.length) return "";
  const songCount = items.filter((item) => isMainPraisePreviewItem(item)).length;
  const markers = [];
  for (const item of items) {
    const marker = servicePreviewMarker(item);
    if (marker && !markers.includes(marker)) markers.push(marker);
  }
  const parts = [];
  if (songCount) parts.push(`찬양 ${songCount}곡`);
  parts.push(...markers.filter((marker) => marker !== "찬양").slice(0, 4));
  if (parts.length) return parts.join(" · ");
  return `${items.length}개 순서`;
}

function serviceItemDisplayText(item) {
  return normalizeServiceItemReferenceSpacing(String(item?.raw_title || item?.label || "").trim());
}

function isMainPraisePreviewItem(item) {
  const label = compactSearchValue(item?.label || "");
  if (!label) return Boolean(item?.song_id);
  if (/특송|송영|결단|봉헌|파송/.test(label)) return false;
  return /찬양|찬송/.test(label) || Boolean(item?.song_id && isSongServiceLabel(item.label));
}

function servicePreviewMarker(item) {
  const label = compactSearchValue(item?.label || "");
  if (!label) return "";
  if (/특송/.test(label)) return "특송";
  if (/성경봉독|성경/.test(label)) return "성경봉독";
  if (/설교/.test(label)) return "설교";
  if (/결단/.test(label)) return "결단";
  if (/기도회|통성기도|자율기도/.test(label)) return "기도회";
  if (/봉헌/.test(label)) return "봉헌";
  if (/축도/.test(label)) return "축도";
  if (/찬양|찬송/.test(label)) return "찬양";
  return "";
}

function normalizeServiceItemReferenceSpacing(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const wholeReference = parseBibleReference(text);
  if (wholeReference) return formatServiceBibleReference(wholeReference, text);

  return text
    .replace(/([1-3]?\s?[A-Za-z가-힣.]{1,16})\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–—~]\s*(\d{1,3}))?/g, (match, book, chapter, verse, verseEnd) =>
      formatServiceBibleReferenceMatch(book, chapter, verse, verseEnd) || match)
    .replace(/\s+/g, " ");
}

function normalizeServiceItemRawTitle(label, value) {
  const raw = String(value || "").trim();
  return isScriptureServiceLabel(label) ? normalizeServiceItemReferenceSpacing(raw) : raw;
}

function isScriptureServiceLabel(label) {
  return /성경|봉독|말씀/.test(compactSearchValue(label || ""));
}

function formatServiceBibleReferenceMatch(bookName, chapter, verse, verseEnd) {
  const book = String(bookName || "").replace(/\s+/g, " ").trim();
  const candidate = `${book} ${chapter}:${verse}${verseEnd ? `-${verseEnd}` : ""}`;
  if (!parseBibleReference(candidate)) return "";
  return `${book} ${chapter}:${verse}${verseEnd ? `–${verseEnd}` : ""}`;
}

function formatServiceBibleReference(reference, fallback = "") {
  if (!reference?.book || !reference?.chapter) return normalizeServiceItemReferenceSpacing(fallback);
  const fallbackBook = String(fallback || "").match(/^(.+?)\s*\d/u)?.[1]?.trim();
  const book = fallbackBook && findBibleBookByReferenceName(fallbackBook)
    ? fallbackBook
    : KOREAN_BIBLE_BOOK_ABBREVIATIONS[reference.book.code] || reference.book.shortName || reference.book.koreanName || reference.book.code;
  const versePart = reference.verse
    ? `${reference.chapter}:${reference.verse}${reference.verseEnd ? `–${reference.verseEnd}` : ""}`
    : String(reference.chapter);
  return [book, versePart].filter(Boolean).join(" ");
}

function songServiceOptionLabel(song) {
  if (!song) return "";
  const no = String(song.hymn_no || "").trim();
  const title = stripHymnNumber(song.title || "").trim();
  return [no, title].filter(Boolean).join(" ");
}

const SERVICE_PRAISE_TITLE_ALIASES = new Map([
  [normalizeTitle("내 안에 부어주소서"), "내 안에 부어 주소서"],
  [normalizeTitle("능력의 이름 예수"), "예수 예수"],
  [normalizeTitle("하나님의 뜻 이뤄지네 꿈꾸는 어린이부"), "하나님의 뜻 이뤄지네"],
  [normalizeTitle("모든 이름 위에 뛰어난 이름"), "이 땅 위에 오신"],
]);

function servicePraiseLookupCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const hymnless = stripHymnNo(raw).title || raw;
  const withoutPrefix = hymnless
    .replace(/^\s*(?:response|찬양|찬송|특송|결단찬양|봉헌찬양|파송찬양)\s*[/：:-]?\s*/i, "")
    .trim();
  const primary = withoutPrefix
    .split(/\s*[+＋]\s*/)[0]
    .replace(/^\s*메들리\s*[(（]\s*/u, "")
    .trim();
  const candidates = [
    hymnless,
    withoutPrefix,
    primary,
    stripTitleDecorations(withoutPrefix),
    stripTitleDecorations(primary),
  ];
  for (const match of withoutPrefix.matchAll(/[(\[（]([^)\]）]+)[)\]）]/g)) {
    candidates.push(match[1]);
  }
  const expanded = [];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (!text) continue;
    expanded.push(text);
    const alias = SERVICE_PRAISE_TITLE_ALIASES.get(normalizeTitle(text));
    if (alias) expanded.push(alias);
  }
  return [...new Set(expanded)];
}

function findServicePraiseSong(value) {
  const lookups = servicePraiseLookupCandidates(value)
    .map((candidate) => ({
      lookup: normalizeTitle(candidate),
      compact: compactSearchValue(candidate),
    }))
    .filter((candidate) => candidate.lookup || candidate.compact);
  if (!lookups.length) return null;
  return state.songs.find((song) => {
    const names = [
      songServiceOptionLabel(song),
      song.title,
      stripHymnNumber(song.title || ""),
      song.subtitle,
      song.original_title,
      ...(song.versions || []).map((version) => versionDisplayName(song, version)),
    ];
    return names.some((name) => {
      const stripped = stripTitleDecorations(stripHymnNo(name).title || name);
      const normalized = normalizeTitle(stripped);
      const compact = compactSearchValue(stripped);
      return lookups.some((candidate) => normalized === candidate.lookup || compact === candidate.compact);
    });
  }) || null;
}

function splitHymnNo(raw) {
  const match = /^(통\s*\d+|\d+)\s+/.exec(raw || "");
  return match ? { no: match[1].replace(/\s+/, " "), title: raw.slice(match[0].length) } : { no: null, title: raw || "—" };
}

function serviceOrderSheetTitle(service) {
  if (!service) return "예배 순서";
  if (service.type_id === "friday") return "금요기도회 순서";
  if (service.type_id === "monthly") {
    const date = new Date(`${service.date}T00:00:00`);
    const month = Number.isFinite(date.getMonth()) ? date.getMonth() + 1 : "";
    return `월삭기도회 순서${month ? `(${month}월)` : ""}`;
  }
  const typeName = serviceDisplayTypeName(service);
  return typeName ? `${typeName} 순서` : "예배 순서";
}

function formatServiceOrderSheetDate(service) {
  if (!service?.date || service.type_id === "monthly") return "";
  const date = new Date(`${service.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일(${weekdays[date.getDay()]})`;
}

function serviceOrderSheetRows(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return [];
  const rows = [];
  let praiseGroup = [];
  const flushPraiseGroup = () => {
    if (!praiseGroup.length) return;
    const praiseMetas = praiseGroup.map(serviceOrderSheetMeta);
    const explicitOrder = praiseMetas.map((meta) => meta.order).find(Boolean);
    const explicitAssignee = praiseMetas.map((meta) => meta.assignee).find(Boolean);
    rows.push({
      order: explicitOrder || "찬양",
      assignee: explicitAssignee || serviceOrderSheetPraiseAssignee(praiseGroup),
      note: praiseGroup.map((item, index) => serviceOrderSheetNote(item, praiseMetas[index])).filter(Boolean).join("\n"),
    });
    praiseGroup = [];
  };

  getServiceOutputItems(serviceId, { includeOrderSheetRows: true })
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((item) => {
      const meta = serviceOrderSheetMeta(item);
      if (meta.hidden) {
        flushPraiseGroup();
        return;
      }
      if (isServiceSeparatorItem(item)) {
        flushPraiseGroup();
        return;
      }
      if (isOrderSheetPraiseItem(item, meta)) {
        praiseGroup.push(item);
        return;
      }
      flushPraiseGroup();
      const order = serviceOrderSheetLabel(item, meta);
      const note = serviceOrderSheetNote(item, meta);
      rows.push({
        order,
        assignee: serviceOrderSheetAssignee(item, meta),
        note,
      });
    });
  flushPraiseGroup();
  return rows;
}

function orderSheetRowsForOutput(serviceId) {
  const rows = serviceOrderSheetRows(serviceId);
  const draft = state.orderSheetDrafts[serviceId] || {};
  if (!Object.keys(draft).length) return rows;
  return rows.map((row, rowIndex) => ({
    order: orderSheetDraftValue(draft, rowIndex, "order", row.order),
    assignee: orderSheetDraftValue(draft, rowIndex, "assignee", row.assignee),
    note: orderSheetDraftValue(draft, rowIndex, "note", row.note),
  }));
}

function orderSheetDraftKey(rowIndex, field) {
  return `${rowIndex}:${field}`;
}

function orderSheetDraftValue(draft, rowIndex, field, fallback = "") {
  const key = orderSheetDraftKey(rowIndex, field);
  return Object.prototype.hasOwnProperty.call(draft, key) ? draft[key] : fallback;
}

function normalizeOrderSheetCellText(value, field) {
  const text = String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (field === "note") return text.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  return text.replace(/\s+/g, " ");
}

function updateOrderSheetDraftFromCell(cell) {
  const serviceId = cell.dataset.orderSheetService || state.selectedServiceId;
  const rowIndex = Number(cell.dataset.orderSheetRow);
  const field = cell.dataset.orderSheetField;
  if (!serviceId || !Number.isInteger(rowIndex) || !["order", "assignee", "note"].includes(field)) return;

  const rawRows = serviceOrderSheetRows(serviceId);
  const rawValue = normalizeOrderSheetCellText(rawRows[rowIndex]?.[field] || "", field);
  const value = normalizeOrderSheetCellText(cell.textContent, field);

  const draft = { ...(state.orderSheetDrafts[serviceId] || {}) };
  const key = orderSheetDraftKey(rowIndex, field);
  if (value === rawValue) delete draft[key];
  else draft[key] = value;

  if (Object.keys(draft).length) state.orderSheetDrafts[serviceId] = draft;
  else delete state.orderSheetDrafts[serviceId];

  syncOrderSheetCells(serviceId, rowIndex, field, value, cell);
}

function syncOrderSheetCells(serviceId, rowIndex, field, value, sourceCell = null) {
  const selector = `[data-order-sheet-cell][data-order-sheet-service="${cssEscape(serviceId)}"][data-order-sheet-row="${rowIndex}"][data-order-sheet-field="${field}"]`;
  document.querySelectorAll(selector).forEach((cell) => {
    if (cell !== sourceCell) cell.textContent = value;
  });
}

function isMainPraiseServiceItem(item, options = {}) {
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  if (sectionKey) return sectionKey === "praise";
  const label = String(item?.label || "").trim();
  if (isMainPraiseLabel(label)) return true;
  return Boolean(options.allowUnlabeled && !label && serviceOrderSheetNote(item));
}

function isMainPraiseLabel(label) {
  const compact = String(label || "").replace(/\s+/g, "");
  return /^찬양\d*$/.test(compact);
}

function orderSheetGroupKey(value) {
  return compactSearchValue(String(value || ""));
}

function serviceOrderSheetMeta(item = {}) {
  const memo = parseServiceItemMemo(item.memo);
  return mergeServiceOrderSheetPayloads(
    memo.orderSheet,
    normalizeServiceOrderSheetPayload(item.order_sheet),
    normalizeServiceOrderSheetPayload({
      order: firstNonBlankString(item.order_sheet_label, item.order_sheet_order),
      assignee: item.order_sheet_assignee,
      note: item.order_sheet_note,
      group: item.order_sheet_group,
      role: item.order_sheet_role,
      hidden: item.order_sheet_hidden,
    }),
  ) || {};
}

function isOrderSheetPraiseItem(item, meta = serviceOrderSheetMeta(item)) {
  const key = orderSheetGroupKey(meta.group || meta.role);
  if (["praise", "song", "songs", "찬양"].includes(key)) return true;
  if (meta.order && !isMainPraiseLabel(meta.order)) return false;
  return isMainPraiseServiceItem(item, { allowUnlabeled: true });
}

function servicePraiseAssignee(service, items = []) {
  if (!serviceUsesPraiseLeader(service?.type_id)) return "";
  const itemAssignee = items.map((item) => cleanServiceAssignee(item?.assignee)).find(Boolean);
  if (itemAssignee) return itemAssignee;
  const leader = servicePraiseLeaderLabel(service);
  if (leader) return leader;
  return "다같이";
}

function serviceOrderSheetPraiseAssignee(items = []) {
  const itemAssignee = items
    .map((item) => serviceOrderSheetMeta(item).assignee || cleanServiceAssignee(item?.assignee))
    .find(Boolean);
  return itemAssignee || "다같이";
}

function serviceOrderSheetLabel(item, meta = serviceOrderSheetMeta(item)) {
  if (meta.order) return meta.order;
  const label = String(item?.label || "").trim();
  if (label === "—") return "";
  return label || (serviceOrderSheetNote(item, meta) ? "찬양" : "");
}

function isServiceSeparatorItem(item) {
  return String(item?.label || "").trim() === "—" && !String(item?.raw_title || "").trim();
}

function serviceOrderSheetAssignee(item, meta = serviceOrderSheetMeta(item)) {
  if (meta.assignee) return meta.assignee;
  const assignee = cleanServiceAssignee(item?.assignee);
  if (assignee) return assignee;
  return inferOrderSheetAssignee(item);
}

function inferOrderSheetAssignee(item) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  const note = String(item?.raw_title || "").trim();
  if (!label) return "";
  if (/특송/.test(label)) return "담당기관";
  if (/말씀|설교/.test(label)) return "담임목사";
  if (/성경봉독|교회소식|예배기도|축복기도|축도/.test(label)) return "인도자";
  if (/^기도$/.test(label) && looksLikePersonOrGroup(note)) return "담당자";
  if (/찬양|찬송|결단|봉헌|기도|자율기도|공동기도/.test(label)) return "다같이";
  return "";
}

function looksLikePersonOrGroup(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /(목사|전도사|장로|권사|집사|청년|구역|전도회|기관|일동)$/.test(text);
}

function serviceOrderSheetNote(item, meta = serviceOrderSheetMeta(item)) {
  if (meta.note) return normalizeServiceItemReferenceSpacing(meta.note);
  return normalizeServiceItemReferenceSpacing(String(item?.raw_title || "").trim());
}

function formatOrderSheetText(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return "";
  const header = [serviceOrderSheetTitle(service), formatServiceOrderSheetDate(service)].filter(Boolean).join("\n");
  const rows = orderSheetRowsForOutput(serviceId).map((row) => [row.order, row.assignee, row.note.replace(/\n/g, " / ")].join("\t"));
  return [header, "", "순서\t담당\t비고", ...rows].join("\n");
}

function copyServiceOrderSheet(serviceId) {
  const text = formatOrderSheetText(serviceId);
  if (!text) return;
  copyText(text);
}

function printServiceOrderSheet(serviceId) {
  if (!serviceId) return;
  refreshServiceOrderSheetPreview(serviceId);
  window.print();
}

function refreshServiceOrderSheetPreview(serviceId = state.selectedServiceId) {
  const root = document.getElementById("orderSheetPrintArea");
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!root || !service) return;
  const rows = orderSheetRowsForOutput(service.id);
  const title = serviceOrderSheetTitle(service);
  const dateLabel = formatServiceOrderSheetDate(service);
  root.innerHTML = `${renderOrderSheetCopy(title, dateLabel, rows, { serviceId: service.id })}${renderOrderSheetCopy(title, dateLabel, rows, { serviceId: service.id })}`;
}

function renderServiceOrderSheetPanel(service) {
  if (!service) return "";
  if (service.type_id !== "friday" && service.type_id !== "monthly") return "";
  const rows = orderSheetRowsForOutput(service.id);
  const title = serviceOrderSheetTitle(service);
  const dateLabel = formatServiceOrderSheetDate(service);
  const panelMeta = [dateLabel, `${formatCount(rows.length)} ${rows.length === 1 ? "row" : "rows"}`].filter(Boolean).join(" · ");
  return `
    <aside class="svc-print-panel" aria-label="Order sheet">
      <div class="svc-print-panel-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(panelMeta)}</p>
        </div>
        <div class="svc-print-actions">
          <button class="icon-btn" type="button" data-copy-service-order="${escapeAttr(service.id)}" aria-label="Copy order sheet text">
            <i data-lucide="clipboard"></i>
          </button>
          <button class="icon-btn primary" type="button" data-print-service-order="${escapeAttr(service.id)}" aria-label="Print order sheet">
            <i data-lucide="printer"></i>
          </button>
        </div>
      </div>
      <div id="orderSheetPrintArea" class="order-sheet-a4" aria-label="A4 order sheet preview">
        ${renderOrderSheetCopy(title, dateLabel, rows, { serviceId: service.id })}
        ${renderOrderSheetCopy(title, dateLabel, rows, { serviceId: service.id })}
      </div>
    </aside>`;
}

function getOrderSheetServices(query = normalizeSearchValue(state.search)) {
  const eligible = state.services.filter((service) => service.type_id === "friday" || service.type_id === "monthly");
  const filtered = query
    ? eligible.filter((service) => serviceMatchesSearch(service, query))
    : eligible;
  return sortServicesByDate(filtered, "desc");
}

function renderOrderSheetsDetail() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  if (state.serviceError || !state.serviceTypes.length) {
    refs.detailPane.innerHTML = state.serviceError
      ? renderUnavailableDetail("service", "순서지", state.serviceError)
      : renderLoadingDetail();
    refreshIcons();
    return;
  }

  const services = getOrderSheetServices();
  const selected = services.find((service) => service.id === state.selectedServiceId) || services[0] || null;
  if (selected && state.selectedServiceId !== selected.id) state.selectedServiceId = selected.id;
  const serviceCountLabel = `${formatCount(services.length)}개 예배`;
  const serviceListItems = services.map((service) => {
    const title = serviceOrderSheetTitle(service);
    const dateLabel = formatServiceDate(service, { compact: true });
    const rowCount = serviceOrderSheetRows(service.id).length;
    const preview = serviceItemPreview(service.id);
    const meta = cleanList([rowCount ? `${formatCount(rowCount)}개 행` : "", preview]).join(" · ");
    return `
      <button class="order-sheet-service${selected?.id === service.id ? " active" : ""}" type="button" data-order-sheet-service="${escapeAttr(service.id)}">
        <strong>${escapeHtml(dateLabel || title)}</strong>
        <span>${escapeHtml(title)}</span>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
      </button>
    `;
  }).join("");

  refs.detailPane.innerHTML = `
    <div class="order-sheet-tool">
      <header class="order-sheet-tool-head">
        <div>
          <h2>순서지</h2>
        </div>
        <span>${escapeHtml(serviceCountLabel)}</span>
      </header>
      ${services.length ? `
        <div class="order-sheet-tool-layout">
          <aside class="order-sheet-service-list" aria-label="Order sheet services">
            ${serviceListItems}
          </aside>
          <div class="order-sheet-preview-shell">
            ${selected ? renderServiceOrderSheetPanel(selected) : ""}
          </div>
        </div>` : ""}
    </div>`;
  refreshServiceOrderSheetPreview(selected?.id);
  refreshIcons();
}

function renderOrderSheetCopy(title, dateLabel, rows, options = {}) {
  const serviceId = options.serviceId || state.selectedServiceId || "";
  return `
    <section class="order-sheet-copy">
      <header class="order-sheet-header">
        <h4>${escapeHtml(title)}</h4>
        ${dateLabel ? `<span>${escapeHtml(dateLabel)}</span>` : ""}
      </header>
      <table class="order-sheet-table">
        <thead>
          <tr>
            <th>순서</th>
            <th>담당</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row, rowIndex) => `
            <tr>
              ${renderOrderSheetCell(serviceId, rowIndex, "order", row.order)}
              ${renderOrderSheetCell(serviceId, rowIndex, "assignee", row.assignee)}
              ${renderOrderSheetCell(serviceId, rowIndex, "note", row.note)}
            </tr>`).join("") : `
            <tr>
              <td colspan="3" class="order-sheet-empty">예배 순서를 추가해 주세요.</td>
            </tr>`}
        </tbody>
      </table>
    </section>`;
}

function renderOrderSheetCell(serviceId, rowIndex, field, value) {
  return `
    <td
      contenteditable="true"
      spellcheck="false"
      data-order-sheet-cell
      data-order-sheet-service="${escapeAttr(serviceId)}"
      data-order-sheet-row="${escapeAttr(rowIndex)}"
      data-order-sheet-field="${escapeAttr(field)}"
    >${escapeHtml(value)}</td>`;
}

function renderPresenterScreenControl() {
  if (!window.getScreenDetails || !window.isSecureContext) return "";
  if (state.presenter.screens.length > 1) {
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
    <button class="icon-btn" type="button" data-presenter-action="detect-screens" aria-label="${escapeAttr(uiText("presenter.action.detectDisplays"))}">
      <i data-lucide="monitor"></i>
    </button>`;
}

function renderPresenterHelpControl() {
  const rows = [
    ["SHOW", "출력 창 열기 · 가능하면 다른 화면 전체화면"],
    ["Space / →", "다음 슬라이드"],
    ["←", "이전 슬라이드"],
    ["번호 + Enter", "해당 슬라이드로 이동"],
    ["0 또는 없는 번호", "빈 화면"],
    ["Esc Esc", "프레젠터 종료"],
    ["성구 입력 + Enter", "하단 bar에 레퍼런스 포함 송출"],
    ["찬양 입력 + Enter", "실시간 찬양 송출"],
    ["전체화면 안 될 때", "Mac: ⌃⌘F · Windows/Linux: F11"],
  ];
  return `
    <details class="svc-presenter-help" data-presenter-help>
      <summary class="icon-btn" aria-label="${escapeAttr(uiText("presenter.action.help"))}">
        <i data-lucide="circle-help"></i>
      </summary>
      <div class="svc-presenter-help-panel" role="dialog" aria-label="${escapeAttr(uiText("presenter.help.title"))}">
        <div class="svc-presenter-help-head">
          <strong>${escapeHtml(uiText("presenter.help.title"))}</strong>
          <small>전체화면이 안 되면 출력 창에서 브라우저 전체화면 단축키를 눌러 주세요</small>
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
  const count = slides.length;
  const safeIndex = clampPresenterIndex(index, count);
  const current = active && state.presenter.safetyBlank ? 0 : count ? safeIndex + 1 : 0;
  const anyOutputOpen = isPresenterOutputWindowOpen();
  const outputOpen = active && anyOutputOpen;
  const outputOpenElsewhere = anyOutputOpen && state.presenter.serviceId && state.presenter.serviceId !== service.id;
  const chromakey = presenterServiceUsesChromakey(service);
  const jumpInputValue = active && state.presenter.jumpDraft
    ? state.presenter.jumpDraft
    : (count || current === 0 ? current : "");
  const statusLabel = outputOpen
    ? uiText("presenter.status.live")
    : outputOpenElsewhere
      ? uiText("presenter.status.otherLive")
      : active
        ? uiText("presenter.status.ready")
        : uiText("presenter.status.preview");
  const statusTone = outputOpen ? "live" : outputOpenElsewhere ? "other" : active ? "ready" : "preview";
  const transientOutput = active && (state.presenter.safetyBlank || state.presenter.liveScripture?.active || state.presenter.livePraise?.active);
  const boardActiveIndex = active && !transientOutput ? safeIndex : -1;
  const mode = presenterControllerMode(service, { active, count, current, outputOpen, outputOpenElsewhere, safeIndex });
  return `
    <section id="servicePresenterControls" class="svc-presenter-strip${active ? " is-active" : ""}${chromakey ? "" : " is-clean-output"}" aria-label="${escapeAttr(uiText("presenter.controls"))}">
      <div class="svc-presenter-top">
        <button class="svc-present-btn svc-presenter-launch" type="button" data-presenter-action="open" data-service-id="${escapeAttr(service.id)}">
          <i data-lucide="screen-share"></i>
          <span>${escapeHtml(uiText("presenter.action.present"))}</span>
        </button>
        ${renderPresenterScreenControl()}
        <div class="svc-presenter-main" aria-live="polite">
          <span class="svc-presenter-state-group">
            <span class="svc-presenter-mini-label">${escapeHtml(uiText("presenter.label.status"))}</span>
            <span class="svc-presenter-status svc-presenter-status--${escapeAttr(statusTone)}" aria-label="${escapeAttr(uiText("presenter.aria.status", { status: statusLabel }))}">${escapeHtml(statusLabel)}</span>
            ${mode.label ? `<span class="svc-presenter-mode svc-presenter-mode--${escapeAttr(mode.tone)}" aria-label="${escapeAttr(uiText("presenter.aria.mode", { mode: mode.label }))}">${escapeHtml(mode.label)}</span>` : ""}
          </span>
          <span class="svc-slide-counter" aria-label="${escapeAttr(uiText("presenter.aria.slideCount", { current, count }))}">
            <span class="svc-presenter-mini-label">${escapeHtml(uiText("presenter.label.slide"))}</span>
            <input class="svc-slide-jump-input" type="number" inputmode="numeric" min="0" max="${escapeAttr(count || 1)}" value="${escapeAttr(jumpInputValue)}" data-presenter-jump-input data-service-id="${escapeAttr(service.id)}" aria-label="${escapeAttr(uiText("presenter.aria.slideNumber"))}" ${count ? "" : "disabled"} />
            <span>/ ${escapeHtml(count)}</span>
            <button class="svc-slide-jump-btn" type="button" data-presenter-jump-button data-service-id="${escapeAttr(service.id)}" aria-label="${escapeAttr(uiText("presenter.action.jumpToSlide"))}" ${count ? "" : "disabled"}>
              <i data-lucide="corner-down-left"></i>
              <span>${escapeHtml(uiText("presenter.action.jump"))}</span>
            </button>
          </span>
        </div>
        <div class="svc-presenter-actions">
          <span class="svc-presenter-action-group svc-presenter-action-group--music">
            ${renderServiceMusicPlayer()}
          </span>
          <span class="svc-presenter-action-group svc-presenter-action-group--praise">
            ${renderLivePraiseControl(service.id)}
          </span>
          <span class="svc-presenter-action-group svc-presenter-action-group--scripture">
            ${renderLiveScriptureControl(service.id)}
          </span>
          <span class="svc-presenter-action-group svc-presenter-action-group--nav" aria-label="${escapeAttr(uiText("presenter.aria.slideNav"))}">
            <button class="icon-btn" type="button" data-presenter-action="prev" data-service-id="${escapeAttr(service.id)}" ${count ? "" : "disabled"} aria-label="${escapeAttr(uiText("presenter.action.prev"))}">
              <i data-lucide="chevron-left"></i>
            </button>
            <button class="icon-btn" type="button" data-presenter-action="next" data-service-id="${escapeAttr(service.id)}" ${count ? "" : "disabled"} aria-label="${escapeAttr(uiText("presenter.action.next"))}">
              <i data-lucide="chevron-right"></i>
            </button>
          </span>
          ${renderPresenterHelpControl()}
        </div>
      </div>
      ${renderPresenterSlideBoard(slides, boardActiveIndex, service.id)}
    </section>`;
}

function presenterControllerMode(service, context = {}) {
  if (context.outputOpenElsewhere) return { label: uiText("presenter.mode.otherService"), tone: "other" };
  if (!context.active) return { label: "", tone: "preview" };
  if (state.presenter.safetyBlank) return { label: uiText("presenter.mode.blank"), tone: "blank" };
  if (state.presenter.livePraise?.active) return { label: uiText("presenter.mode.praise"), tone: "praise" };
  if (state.presenter.liveScripture?.active) return { label: uiText("presenter.mode.scripture"), tone: "scripture" };
  if (context.count) return { label: uiText("presenter.mode.slide", { number: context.safeIndex + 1 }), tone: context.outputOpen ? "slide-live" : "slide-ready" };
  return { label: uiText("presenter.mode.noSlides"), tone: "empty" };
}

function renderServiceMusicPlayer() {
  const music = state.serviceMusic;
  const fileLabel = music.fileName ? music.fileName : uiText("presenter.music.default");
  const volumeOptions = Array.from({ length: 6 }, (_, level) =>
    `<option value="${level}"${level === music.volumeLevel ? " selected" : ""}>${level}</option>`).join("");
  return `
    <span class="svc-music-player">
      <input class="svc-music-file" type="file" accept="audio/*" data-service-music-file hidden />
      <button class="svc-music-name" type="button" data-service-music-action="choose">
        <i data-lucide="music"></i>
        <span>${escapeHtml(fileLabel)}</span>
      </button>
      <button class="icon-btn svc-music-toggle${music.playing ? " is-active" : ""}" type="button" data-service-music-action="toggle" aria-label="${escapeAttr(music.playing ? uiText("presenter.music.pause") : uiText("presenter.music.play"))}" ${music.objectUrl ? "" : "disabled"}>
        <i data-lucide="${music.playing ? "pause" : "play"}"></i>
      </button>
      <span class="svc-volume-control">
        <span class="svc-presenter-mini-label">${escapeHtml(uiText("presenter.label.volume"))}</span>
        <select class="svc-music-volume" data-service-music-volume aria-label="${escapeAttr(uiText("presenter.music.volume"))}">
          ${volumeOptions}
        </select>
      </span>
    </span>`;
}

function renderLivePraiseControl(serviceId) {
  const live = state.presenter.livePraise || {};
  return `
    <span class="svc-live-praise${live.active ? " is-active" : ""}">
      <input class="svc-live-praise-input" type="text" value="${escapeAttr(live.draft || live.query || "")}" data-live-praise-input data-service-id="${escapeAttr(serviceId)}" placeholder="${escapeAttr(uiText("presenter.praise.placeholder"))}" />
      <button class="icon-btn svc-action-text-btn svc-live-praise-show" type="button" data-live-praise-action="show" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.loadPraise"))}">
        <i data-lucide="music-2"></i>
        <span>${escapeHtml(uiText("presenter.action.load"))}</span>
      </button>
      <button class="icon-btn svc-action-text-btn svc-live-praise-clear" type="button" data-live-praise-action="clear" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.hidePraise"))}" ${live.active ? "" : "disabled"}>
        <i data-lucide="eye-off"></i>
        <span>${escapeHtml(uiText("presenter.action.hide"))}</span>
      </button>
    </span>`;
}

function renderLiveScriptureControl(serviceId) {
  const live = state.presenter.liveScripture || {};
  return `
    <span class="svc-live-scripture${live.active ? " is-active" : ""}">
      <input class="svc-live-scripture-input" type="text" value="${escapeAttr(live.draft || live.reference || "")}" data-live-scripture-input data-service-id="${escapeAttr(serviceId)}" placeholder="${escapeAttr(uiText("presenter.scripture.placeholder"))}" />
      <button class="icon-btn svc-action-text-btn svc-live-scripture-show" type="button" data-live-scripture-action="show" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.showScripture"))}">
        <i data-lucide="send"></i>
        <span>${escapeHtml(uiText("presenter.action.send"))}</span>
      </button>
      <button class="icon-btn svc-action-text-btn svc-live-scripture-clear" type="button" data-live-scripture-action="clear" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.hideScripture"))}" ${live.active ? "" : "disabled"}>
        <i data-lucide="eye-off"></i>
        <span>${escapeHtml(uiText("presenter.action.hide"))}</span>
      </button>
    </span>`;
}

function getServiceMusicAudio() {
  if (!state.serviceMusic.audio) {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    state.serviceMusic.audio = audio;
  }
  state.serviceMusic.audio.volume = state.serviceMusic.volumeLevel / 5;
  return state.serviceMusic.audio;
}

function runServiceMusicAction(action) {
  if (action === "choose") {
    document.querySelector("[data-service-music-file]")?.click();
    return;
  }
  if (action !== "toggle") return;
  const audio = getServiceMusicAudio();
  if (!state.serviceMusic.objectUrl) {
    showToast("음악 파일을 먼저 선택해 주세요.", "error");
    return;
  }
  if (state.serviceMusic.playing) {
    audio.pause();
    state.serviceMusic.playing = false;
    renderPresenterControlState();
    return;
  }
  audio.play()
    .then(() => {
      state.serviceMusic.playing = true;
      renderPresenterControlState();
    })
    .catch(() => showToast("브라우저가 음악 재생을 막았습니다. 다시 눌러 주세요.", "error"));
}

function loadServiceMusicFile(file) {
  if (!file) return;
  const audio = getServiceMusicAudio();
  if (state.serviceMusic.objectUrl) URL.revokeObjectURL(state.serviceMusic.objectUrl);
  state.serviceMusic.objectUrl = URL.createObjectURL(file);
  state.serviceMusic.fileName = file.name || "음악";
  state.serviceMusic.playing = false;
  audio.pause();
  audio.src = state.serviceMusic.objectUrl;
  audio.volume = state.serviceMusic.volumeLevel / 5;
  renderPresenterControlState();
}

function setServiceMusicVolume(value) {
  const level = Math.min(Math.max(Number(value) || 0, 0), 5);
  state.serviceMusic.volumeLevel = level;
  getServiceMusicAudio().volume = level / 5;
  renderPresenterControlState();
}

function updateLiveScriptureDraft(value) {
  state.presenter.liveScripture.draft = String(value || "");
}

function emptyLivePraiseState(draft = "") {
  return {
    query: "",
    draft: String(draft || ""),
    active: false,
    slides: [],
    index: 0,
    songId: "",
    versionId: "",
  };
}

function updateLivePraiseDraft(value) {
  state.presenter.livePraise = {
    ...(state.presenter.livePraise || emptyLivePraiseState()),
    draft: String(value || ""),
  };
}

async function runLivePraiseAction(action, serviceId = state.selectedServiceId) {
  const live = state.presenter.livePraise || emptyLivePraiseState();
  if (action === "clear") {
    state.presenter.livePraise = emptyLivePraiseState(live.draft || live.query || "");
    publishPresenterState({ force: true });
    renderPresenterControlState(serviceId);
    return;
  }
  if (action !== "show") return;

  const input = document.querySelector("[data-live-praise-input]");
  const query = String(input?.value || live.draft || "").trim();
  state.presenter.livePraise = { ...live, draft: query };
  if (!query) {
    showToast("찬양 제목을 입력해 주세요.", "error");
    return;
  }

  try {
    if (serviceId) preparePresenterService(serviceId);
    const result = buildLivePraisePayload(query, serviceId);
    if (!result?.slides?.length) return;
    state.presenter.livePraise = {
      query,
      draft: query,
      active: true,
      slides: result.slides,
      index: 0,
      songId: result.song.id,
      versionId: result.version.id,
    };
    state.presenter.liveScripture = {
      ...state.presenter.liveScripture,
      active: false,
      slide: null,
    };
    state.presenter.safetyBlank = false;
    publishPresenterState({ force: true });
    renderPresenterControlState(serviceId);
  } catch (error) {
    showToast(error.message || "찬양을 불러오지 못했습니다.", "error");
  }
}

function buildLivePraisePayload(query, serviceId = state.presenter.serviceId) {
  const match = findLivePraiseSong(query);
  if (!match?.song) {
    showToast("해당 찬양을 찾지 못했습니다.", "error");
    return null;
  }
  const version = findLivePraiseVersion(match.song, query);
  if (!version) {
    showToast("가사가 있는 찬양 버전을 찾지 못했습니다.", "error");
    return null;
  }
  const service = state.services.find((svc) => svc.id === serviceId) || null;
  const section = presenterLivePraiseSection(match.song, serviceId);
  const titleSlide = presenterSongTitleSlide(
    { id: `live-praise:${match.song.id}:${version.id}`, label: "찬양", song_id: match.song.id },
    section,
    match.song,
    version,
    match.song.title || query,
    0,
  );
  const forms = normalizeForms(version.forms || []).filter((form) => normalizeLyricsForCopy(form.lyrics));
  const lyricsSlides = forms.flatMap((form, formIndex) => {
    const chunks = splitPresenterLyricChunks(form.lyrics);
    const formId = form._localId || form.id || formIndex;
    const formKey = `${formId}:${formIndex}`;
    return chunks.map((chunk, chunkIndex) => ({
      id: `live-praise:${match.song.id}:${version.id}:form:${formId}:chunk:${chunkIndex}`,
      ...section,
      elementType: PRESENTER_ELEMENT_TYPES.PRAISE,
      layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
      type: "lyrics",
      label: "실시간 찬양",
      title: presenterPraiseTitle(match.song, query),
      subtitle: versionDisplayName(match.song, version),
      marker: chunkIndex === 0 ? presenterFormMarker(form) : "",
      formKey,
      segment: "",
      text: chunk,
      live: true,
      sort: formIndex + chunkIndex / 100,
    }));
  });
  const slides = [titleSlide, ...lyricsSlides].map((slide) => ({ ...slide, live: true }));
  return { song: match.song, version, service, slides };
}

function findLivePraiseSong(query) {
  const tokens = getSearchTokens(query);
  if (!tokens.length) return null;
  return state.songs
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens) }))
    .filter((item) => item.match && songHasPresenterLyrics(item.song))
    .sort((a, b) => b.match.score - a.match.score || sortSongsForCurrentList(a.song, b.song))[0] || null;
}

function songHasPresenterLyrics(song) {
  return Boolean((song?.versions || []).some((version) => versionHasLyrics(version)));
}

function findLivePraiseVersion(song, query = "") {
  const versions = song?.versions || [];
  const tokens = getSearchTokens(query);
  const matchedVersion = tokens.length
    ? versions
      .map((version) => ({
        version,
        score: serviceVersionLookupNames(song, version)
          .filter(Boolean)
          .reduce((sum, name) => sum + (tokens.every((token) => matchSearchField(searchField("version", name, 1), token)) ? 1 : 0), 0),
      }))
      .filter((item) => item.score && versionHasLyrics(item.version))
      .sort((a, b) => b.score - a.score)[0]?.version
    : null;
  return matchedVersion
    || versions.find((version) => version.is_primary && versionHasLyrics(version))
    || versions.find((version) => versionHasLyrics(version))
    || null;
}

function presenterLivePraiseSection(song, serviceId = state.presenter.serviceId) {
  const title = presenterPraiseTitle(song, song?.title || "");
  return {
    sectionId: `live-praise:${serviceId || "service"}`,
    elementId: `live-praise:${song?.id || normalizeTitle(title)}`,
    sectionIndex: 0,
    sectionKey: "live_praise",
    sectionLabel: "실시간 찬양",
    sectionFormHint: "",
    sectionRole: "live-praise",
    sectionTitle: "실시간 찬양",
    elementLabel: "실시간 찬양",
    elementTitle: title,
    sectionAssignee: "",
    sectionName: ["실시간 찬양", title].filter(Boolean).join(" / "),
  };
}

function moveLivePraiseSlide(delta) {
  const live = state.presenter.livePraise;
  const count = live?.slides?.length || 0;
  if (!live?.active || !count) return false;
  live.index = Math.min(Math.max((Number(live.index) || 0) + delta, 0), count - 1);
  return true;
}

async function runLiveScriptureAction(action, serviceId = state.selectedServiceId) {
  if (action === "clear") {
    state.presenter.liveScripture = { reference: "", draft: state.presenter.liveScripture.draft || "", active: false, slide: null };
    publishPresenterState({ force: true });
    renderPresenterControlState(serviceId);
    return;
  }
  if (action !== "show") return;

  const input = document.querySelector("[data-live-scripture-input]");
  const query = String(input?.value || state.presenter.liveScripture.draft || "").trim();
  state.presenter.liveScripture.draft = query;
  if (!query) {
    showToast("성구를 입력해 주세요.", "error");
    return;
  }

  try {
    if (serviceId) preparePresenterService(serviceId);
    const slide = await buildLiveScriptureSlide(query);
    if (!slide) return;
    state.presenter.liveScripture = {
      reference: slide.title,
      draft: query,
      active: true,
      slide,
    };
    state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
    state.presenter.safetyBlank = false;
    publishPresenterState({ force: true });
    renderPresenterControlState(serviceId);
  } catch (error) {
    showToast(error.message || "성구를 불러오지 못했습니다.", "error");
  }
}

async function buildLiveScriptureSlide(query) {
  if (!requireClient()) return null;
  await ensureBibleBookLookups();
  if (!state.bibleTranslations.length && !state.bibleReaderError) await loadBibleTranslations({ silent: true });

  const reference = parseBibleReference(query);
  if (!reference) {
    showToast("성구 형식을 확인해 주세요.", "error");
    return null;
  }
  const translation = selectedPresenterBibleTranslation();
  if (!translation?.id) {
    showToast("사용 가능한 역본이 없습니다.", "error");
    return null;
  }

  let request = state.client
    .from("mindex_bible_verses")
    .select("book_code,chapter,verse,text")
    .eq("is_active", true)
    .eq("translation_id", translation.id)
    .eq("book_code", reference.book.code)
    .eq("chapter", reference.chapter)
    .order("verse", { ascending: true });

  if (reference.verse !== null) {
    request = request
      .gte("verse", reference.verse)
      .lte("verse", reference.verseEnd || reference.verse);
  }

  const { data, error } = await request;
  if (error) throw error;
  const verses = data || [];
  if (!verses.length) {
    showToast("해당 성구를 찾지 못했습니다.", "error");
    return null;
  }

  const title = formatLiveScriptureReference(reference);
  return {
    id: `live-scripture:${Date.now()}`,
    elementType: PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "scripture",
    label: "성구",
    title,
    marker: title,
    text: formatLiveScriptureSlideText(title, verses),
    live: true,
  };
}

function formatLiveScriptureSlideText(reference, verses = []) {
  const title = String(reference || "").trim();
  const multipleVerses = verses.length > 1;
  return verses.map((verse, index) => {
    const verseText = String(verse?.text || "").trim();
    const versePrefix = multipleVerses ? `${verse?.verse || ""} `.trim() : "";
    const line = [versePrefix, verseText].filter(Boolean).join(" ");
    return [index === 0 ? title : "", line].filter(Boolean).join("   ");
  }).join("\n");
}

function selectedPresenterBibleTranslation() {
  return state.bibleTranslations.find((translation) => translation.id === state.selectedBibleTranslationId)
    || state.bibleTranslations.find((translation) => /개역개정|KRV|Korean/i.test(`${translation.name || ""} ${translation.code || ""}`))
    || state.bibleTranslations[0]
    || null;
}

function formatLiveScriptureReference(reference) {
  const bookName = KOREAN_BIBLE_BOOK_ABBREVIATIONS[reference.book.code] || reference.book.koreanName || reference.book.code;
  if (reference.verse === null) return `${bookName} ${reference.chapter}장`;
  const verseRange = reference.verseEnd && reference.verseEnd !== reference.verse
    ? `${reference.verse}-${reference.verseEnd}`
    : `${reference.verse}`;
  return `${bookName} ${reference.chapter}:${verseRange}`;
}

function renderPresenterSlideBoard(slides, index, serviceId) {
  if (!slides.length) {
    return `<div class="svc-slide-board svc-slide-board--empty">슬라이드 없음</div>`;
  }
  const groups = groupPresenterSlidesBySection(slides, serviceId);
  const service = state.services.find((svc) => svc.id === serviceId);
  const theme = presenterOutputTheme(service?.type_id);
  const chromakey = presenterServiceUsesChromakey(service);
  return `
    <div class="svc-slide-board svc-slide-board--${escapeAttr(theme)}${chromakey ? "" : " svc-slide-board--clean"}" role="list" aria-label="Presenter slide board">
      ${groups.map((group) => renderPresenterBoardSection(group, index, serviceId)).join("")}
    </div>`;
}

function groupPresenterSlidesBySection(slides, serviceId = state.selectedServiceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const groups = [];
  slides.forEach((slide, slideIndex) => {
    const mainPraise = isPresenterMainPraiseSlide(slide);
    const id = mainPraise ? `main-praise:${groups.length}` : slide.sectionId || `section:${slideIndex}`;
    const previous = groups[groups.length - 1];
    let group = mainPraise && previous?.kind === "main-praise"
      ? previous
      : !mainPraise && previous?.id === id
        ? previous
        : null;

    if (!group) {
      group = createPresenterSlideGroup(slide, slideIndex, {
        id,
        kind: mainPraise ? "main-praise" : "item",
        praiseLead: mainPraise ? servicePraiseAssignee(service, [{ assignee: slide.sectionAssignee }]) : "",
      });
      groups.push(group);
    }

    const entry = { slide, slideIndex };
    group.slides.push(entry);
    addPresenterSlideToSubgroup(group, entry);
  });
  return groups;
}

function isPresenterMainPraiseSlide(slide = {}) {
  const sectionKey = String(slide.sectionKey || "").trim();
  if (sectionKey) return sectionKey === "praise";
  if (slide.sectionRole === "main-praise") return true;
  return isMainPraiseLabel(slide.sectionLabel);
}

function createPresenterSlideGroup(slide, slideIndex, options = {}) {
  const mainPraise = options.kind === "main-praise";
  const label = mainPraise ? "찬양" : slide.sectionLabel || "";
  const title = mainPraise ? "찬양" : slide.sectionTitle || slide.title || presenterSlideMainText(slide);
  const meta = mainPraise && options.praiseLead ? `인도 ${options.praiseLead}` : "";
  return {
    id: options.id || slide.sectionId || `section:${slideIndex}`,
    kind: options.kind || "item",
    index: slide.sectionIndex || slideIndex + 1,
    label,
    title,
    meta,
    name: presenterNameParts(label, title, meta).join(" / ") || presenterSlideTitle(slide),
    slides: [],
    subgroups: [],
  };
}

function addPresenterSlideToSubgroup(group, entry) {
  const { slide } = entry;
  const id = slide.elementId || slide.sectionId || `${group.id}:slide:${entry.slideIndex}`;
  let subgroup = group.subgroups.find((item) => item.id === id);
  if (!subgroup) {
    const number = group.kind === "main-praise" ? group.subgroups.length + 1 : group.subgroups.length;
    const label = group.kind === "main-praise"
      ? presenterPraiseSubgroupLabel(slide.sectionLabel, number)
      : slide.elementLabel || slide.sectionLabel || "";
    subgroup = {
      id,
      label,
      title: slide.elementTitle || slide.title || presenterSlideMainText(slide),
      name: presenterNameParts(label, slide.elementTitle || slide.title).join(" / ") || presenterSlideTitle(slide),
      slides: [],
    };
    group.subgroups.push(subgroup);
  }
  subgroup.slides.push(entry);
}

function presenterNameParts(...parts) {
  const seen = new Set();
  return cleanList(parts).filter((part) => {
    const key = compactSearchValue(part);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function presenterPraiseSubgroupLabel(label, number) {
  const raw = String(label || "").trim();
  if (/^찬양\s*\d+$/i.test(raw)) return raw.replace(/\s+/g, " ");
  return `찬양 ${number}`;
}

function renderPresenterBoardSection(group, activeIndex, serviceId) {
  const active = group.slides.some(({ slideIndex }) => slideIndex === activeIndex);
  const firstIndex = group.slides[0]?.slideIndex ?? 0;
  const visibleTitle = group.title || group.label || group.name;
  return `
    <section class="svc-board-section${active ? " active" : ""}" role="listitem" aria-label="${escapeAttr(group.name)}">
      <button class="svc-board-section-head" type="button"
        data-presenter-action="jump"
        data-presenter-index="${firstIndex}"
        data-service-id="${escapeAttr(serviceId)}"
        aria-label="${escapeAttr(group.name)}">
        <span class="svc-board-section-title${visibleTitle ? "" : " is-empty"}">
          ${visibleTitle ? `<strong>${escapeHtml(visibleTitle)}</strong>` : ""}
          ${group.meta ? `<small>${escapeHtml(group.meta)}</small>` : ""}
        </span>
      </button>
      <div class="svc-board-subgroups">
        ${group.subgroups.map((subgroup) => renderPresenterBoardSubgroup(subgroup, activeIndex, serviceId, {
          showHead: true,
        })).join("")}
      </div>
    </section>`;
}

function renderPresenterBoardSubgroup(subgroup, activeIndex, serviceId, options = {}) {
  const active = subgroup.slides.some(({ slideIndex }) => slideIndex === activeIndex);
  const firstIndex = subgroup.slides[0]?.slideIndex ?? 0;
  const slides = annotatePresenterFormStarts(subgroup.slides);
  const visibleTitle = subgroup.title || subgroup.name;
  const visibleLabel = presenterVisibleLabel(subgroup.label || "항목", subgroup.title || subgroup.name);
  const warnings = presenterWarningsForEntries(subgroup.slides);
  return `
    <div class="svc-board-subgroup${active ? " active" : ""}">
      ${options.showHead ? `
        <button class="svc-board-subgroup-head" type="button"
          data-presenter-action="jump"
          data-presenter-index="${firstIndex}"
          data-service-id="${escapeAttr(serviceId)}"
          aria-label="${escapeAttr(subgroup.name)}">
          ${visibleLabel ? `<span>${escapeHtml(visibleLabel)}</span>` : ""}
          ${visibleTitle ? `<strong>${escapeHtml(visibleTitle)}</strong>` : ""}
          ${renderPresenterWarnings(warnings)}
        </button>` : ""}
      <div class="svc-board-grid">
        ${slides.map(({ slide, slideIndex, formLabel }) =>
          renderPresenterSlideThumb(slide, slideIndex, activeIndex, serviceId, formLabel)).join("")}
      </div>
    </div>`;
}

function presenterWarningsForEntries(entries = []) {
  const seen = new Set();
  return entries
    .flatMap((entry) => Array.isArray(entry?.slide?.warnings) ? entry.slide.warnings : [])
    .map((warning) => String(warning || "").trim())
    .filter((warning) => {
      const key = compactSearchValue(warning);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderPresenterWarnings(warnings = []) {
  if (!warnings.length) return "";
  return `<span class="svc-presenter-warnings">${
    warnings.map((warning) => `<span class="svc-presenter-warning">${escapeHtml(warning)}</span>`).join("")
  }</span>`;
}

function presenterVisibleTitle(label, title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "";
  return compactSearchValue(cleanTitle) === compactSearchValue(label) ? "" : cleanTitle;
}

function presenterVisibleLabel(label, title) {
  const cleanLabel = String(label || "").trim();
  if (!cleanLabel) return "";
  const labelKey = compactSearchValue(cleanLabel);
  const titleKey = compactSearchValue(title);
  if (titleKey && labelKey && titleKey !== labelKey && titleKey.includes(labelKey)) return "";
  return cleanLabel;
}

function annotatePresenterFormStarts(entries = []) {
  let previousKey = "";
  let currentFormLabel = "";
  return entries.map((entry) => {
    const { slide, slideIndex } = entry;
    const lyrics = presenterSlideElementType(slide) === PRESENTER_ELEMENT_TYPES.PRAISE
      && presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
    const key = lyrics ? `lyrics:${slide.formKey || slideIndex}` : "";
    const startsForm = Boolean(lyrics && key !== previousKey);
    if (startsForm) currentFormLabel = presenterFormGroupLabel(slide);
    if (!lyrics) currentFormLabel = "";
    previousKey = key;
    return {
      ...entry,
      formLabel: startsForm ? currentFormLabel : "",
    };
  });
}

function presenterFormGroupLabel(slide) {
  const label = String(slide?.marker || "").trim();
  return isGenericPresenterFormLabel(label) ? "" : label;
}

function presenterLabelDuplicatesSlideText(label, slide) {
  const normalizedLabel = normalizeTitle(label);
  if (!normalizedLabel) return true;
  const candidates = [
    slide?.title,
    slide?.text,
    ...String(slide?.text || "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  ];
  return candidates.some((candidate) => normalizeTitle(candidate) === normalizedLabel);
}

function renderPresenterSlideThumb(slide, slideIndex, activeIndex, serviceId, formLabel = "") {
  const active = slideIndex === activeIndex;
  const visibleFormLabel = presenterLabelDuplicatesSlideText(formLabel, slide) ? "" : formLabel;
  const ariaPrefix = `${slideIndex + 1}번 슬라이드로 이동`;
  const slideNumber = slideIndex + 1;
  const formBadge = visibleFormLabel ? `
      <button class="svc-slide-form-badge" type="button"
        data-presenter-action="jump"
        data-presenter-index="${slideIndex}"
        data-service-id="${escapeAttr(serviceId)}"
        aria-label="${escapeAttr(visibleFormLabel)}">
        ${escapeHtml(visibleFormLabel)}
      </button>` : "";
  return `
    <span class="svc-slide-thumb-wrap${active ? " active" : ""}${visibleFormLabel ? " has-form-label" : ""}">
    <span class="svc-slide-thumb-no" aria-hidden="true">${slideNumber}</span>
    ${formBadge}
    <button class="svc-slide-thumb${active ? " active" : ""}" type="button"
      data-presenter-action="jump"
      data-presenter-index="${slideIndex}"
      data-service-id="${escapeAttr(serviceId)}"
      aria-label="${escapeAttr(`${ariaPrefix}: ${presenterSlideTitle(slide)}`)}">
      <span class="svc-slide-thumb-frame svc-slide-thumb-frame--${escapeAttr(presenterSlideRenderClass(slide))}" data-element-type="${escapeAttr(presenterSlideElementType(slide))}" data-slide-layout="${escapeAttr(presenterSlideLayout(slide))}">
        ${renderPresenterSlideMiniPreview(slide, serviceId)}
      </span>
    </button>
    </span>`;
}

function renderPresenterSlideMiniPreview(slide, serviceId = state.presenter.serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const chromakey = presenterServiceUsesChromakey(service);
  const backgroundImage = presenterBackgroundForService(service);
  const theme = presenterOutputTheme(service?.type_id);
  const bgStyle = backgroundImage && !chromakey ? ` style="--presenter-bg-image: url('${escapeAttr(backgroundImage)}')"` : "";
  const outputClasses = [
    "svc-slide-mini-output",
    chromakey ? "" : "no-chromakey",
    backgroundImage && !chromakey ? "has-background" : "",
  ].filter(Boolean).join(" ");
  if (!slide) {
    return `<span class="${escapeAttr(outputClasses)}" data-output-theme="${escapeAttr(theme)}"${bgStyle}><span class="svc-slide-mini-canvas"></span></span>`;
  }
  return `
    <span class="${escapeAttr(outputClasses)}" data-output-theme="${escapeAttr(theme)}"${bgStyle}>
      <span class="svc-slide-mini-canvas">
        ${renderPresenterSlideFrame(slide, { preview: true })}
      </span>
    </span>`;
}

function presenterMediaFileName(source) {
  const text = String(source || "").split(/[?#]/)[0];
  const parts = text.split("/");
  return parts[parts.length - 1] || source;
}

function presenterFileDisplayTitle(slide, fallback = "파일") {
  const title = String(slide?.title || "").trim();
  if (title && !isLegacyImportArtifactName(title) && !isLegacyPresentationLabel(title)) return title;
  const assetName = String(slide?.asset?.name || "").trim();
  if (assetName && !isLegacyImportArtifactName(assetName) && !isLegacyPresentationLabel(assetName)) return assetName;
  const fileName = presenterMediaFileName(slide?.asset?.url);
  if (fileName && !isLegacyImportArtifactName(fileName) && !isLegacyPresentationLabel(fileName)) return fileName;
  return fallback;
}

function presenterFileTypeLabel(type = "") {
  const normalized = String(type || "").trim().toLowerCase();
  if (normalized === "score") return "악보";
  return normalized === "pdf" ? "PDF 파일" : "파일";
}

function isLegacyPresentationLabel(value) {
  return /^(?:pptx?|powerpoint|keynote|key)$/i.test(String(value || "").trim());
}

function presenterSlideTitle(slide) {
  if (!slide) return "프레젠터 준비";
  const marker = presenterSlideMarker(slide);
  const renderClass = presenterSlideRenderClass(slide);
  if (renderClass === "lyrics") return marker || slide.title || "Lyrics";
  if (presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.FILE) {
    const typeLabel = presenterFileTypeLabel(slide.sourceType || slide.componentType || slide.asset?.kind || "file");
    return cleanList([marker, presenterFileDisplayTitle(slide, typeLabel)]).join(" — ") || typeLabel;
  }
  const text = renderClass === "lyrics" ? slide.title : presenterSlideMainText(slide);
  return cleanList([marker, text]).join(" — ") || "제목 없는 슬라이드";
}

function presenterSlideMarker(slide) {
  if (presenterSlideRenderClass(slide) === "lyrics") return slide?.marker || "";
  return [slide?.marker, slide?.label].filter(Boolean).join(" · ");
}

function presenterSlideMainText(slide) {
  return slide?.text || slide?.title || "";
}

function findPresenterJumpInput(serviceId = state.presenter.serviceId) {
  const scope = refs.detailPane || document;
  return [...scope.querySelectorAll("[data-presenter-jump-input]")]
    .find((input) => input.dataset.serviceId === serviceId) || null;
}

function setPresenterJumpDraft(value, serviceId = state.presenter.serviceId) {
  if (!serviceId) return;
  const draft = String(value || "").replace(/\D/g, "").slice(0, PRESENTER_JUMP_MAX_DIGITS);
  state.presenter.jumpDraft = draft;
  const input = findPresenterJumpInput(serviceId);
  if (input) input.value = draft;
}

function clearPresenterJumpDraft(serviceId = state.presenter.serviceId) {
  state.presenter.jumpDraft = "";
  const input = findPresenterJumpInput(serviceId);
  if (input) {
    const count = state.presenter.serviceId === serviceId
      ? state.presenter.slides.length
      : buildServicePresenterSlides(serviceId).length;
    input.value = state.presenter.serviceId === serviceId && state.presenter.safetyBlank
      ? "0"
      : count ? String(clampPresenterIndex(state.presenter.index, count) + 1) : "";
  }
}

function commitPresenterJumpDraft(serviceId = state.presenter.serviceId) {
  if (!serviceId || !state.presenter.jumpDraft) return;
  const requested = Number(state.presenter.jumpDraft);
  if (!Number.isFinite(requested)) return;
  state.presenter.jumpDraft = "";
  runPresenterAction("jump", serviceId, { index: requested - 1 });
}

function runPresenterAction(action, serviceId = state.selectedServiceId, options = {}) {
  if (!["open", "stop", "next", "prev", "first", "last", "jump"].includes(action)) return;
  if (action === "stop") {
    stopPresenterOutput(serviceId || state.presenter.serviceId);
    return;
  }
  if (!serviceId) return;
  if (action !== "open" && isPresenterOutputWindowOpen() && state.presenter.serviceId && state.presenter.serviceId !== serviceId) return;
  preparePresenterService(serviceId);

  if (action === "open") {
    openPresenterOutput(serviceId);
    return;
  }

  state.presenter.jumpDraft = "";
  if (state.presenter.livePraise?.active && ["next", "prev", "first", "last"].includes(action)) {
    if (action === "next") moveLivePraiseSlide(1);
    else if (action === "prev") moveLivePraiseSlide(-1);
    else if (action === "first") state.presenter.livePraise.index = 0;
    else if (action === "last") state.presenter.livePraise.index = Math.max((state.presenter.livePraise.slides?.length || 1) - 1, 0);
    state.presenter.safetyBlank = false;
    publishPresenterState();
    renderPresenterControlState(serviceId);
    return;
  }
  if (["next", "prev", "first", "last", "jump"].includes(action)) {
    state.presenter.liveScripture = {
      ...state.presenter.liveScripture,
      active: false,
      slide: null,
    };
    state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
  }

  if (action === "next") {
    state.presenter.safetyBlank = false;
    movePresenterSlide(1);
  } else if (action === "prev") {
    state.presenter.safetyBlank = false;
    movePresenterSlide(-1);
  } else if (action === "first") {
    state.presenter.safetyBlank = false;
    state.presenter.index = 0;
  } else if (action === "last") {
    state.presenter.safetyBlank = false;
    state.presenter.index = Math.max(state.presenter.slides.length - 1, 0);
  } else if (action === "jump") {
    const requestedIndex = Number(options.index);
    if (isValidPresenterIndex(requestedIndex, state.presenter.slides.length)) {
      state.presenter.index = requestedIndex;
      state.presenter.safetyBlank = false;
    } else {
      state.presenter.safetyBlank = true;
    }
  }

  publishPresenterState();
  renderPresenterControlState(serviceId);
}

function stopPresenterOutput(serviceId = state.presenter.serviceId) {
  const activeServiceId = serviceId || state.presenter.serviceId;
  const outputWindow = state.presenter.outputWindow;
  state.presenter.jumpDraft = "";
  state.presenter.exitArmedAt = 0;
  state.presenter.safetyBlank = false;
  state.presenter.liveScripture = {
    ...state.presenter.liveScripture,
    active: false,
    slide: null,
  };
  state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
  state.presenter.outputWindow = null;
  state.presenter.outputConnectedAt = 0;
  state.presenter.outputClientId = "";
  stopPresenterOutputWindowMonitor();
  try {
    if (outputWindow && !outputWindow.closed) outputWindow.close?.();
  } catch {
    // Closing may be blocked for manually opened output tabs.
  }
  publishPresenterPayload(presenterStoppedPayload());
  refreshPresenterOutputConnectionState();
  if (activeServiceId) renderPresenterControlState(activeServiceId);
}

function presenterStoppedPayload() {
  return {
    serviceId: null,
    serviceType: "",
    serviceTitle: "",
    chromakey: true,
    outputTheme: presenterOutputTheme(""),
    backgroundImage: "",
    slides: [],
    index: 0,
    safetyBlank: false,
    liveScripture: null,
    livePraise: null,
    updatedAt: Date.now(),
  };
}

function isValidPresenterIndex(index, count) {
  return Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < count;
}

function jumpPresenterToSlideInput(input) {
  const serviceId = input?.dataset?.serviceId || state.selectedServiceId;
  const requested = Number(input?.value);
  if (!serviceId || !Number.isFinite(requested)) return;
  state.presenter.jumpDraft = "";
  runPresenterAction("jump", serviceId, { index: requested - 1 });
}

async function openPresenterOutput(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  preparePresenterService(serviceId);
  publishPresenterState();

  const existingWindow = presenterOutputWindowRef();
  if (existingWindow) {
    startPresenterOutputWindowMonitor(serviceId);
    existingWindow.focus?.();
    requestOutputFullscreen(existingWindow, { retry: true });
    window.setTimeout(() => publishPresenterState(), 250);
    renderPresenterControlState(serviceId);
    return;
  }
  if (isPresenterOutputHeartbeatOpen()) {
    startPresenterOutputWindowMonitor(serviceId);
    window.setTimeout(() => publishPresenterState(), 250);
    renderPresenterControlState(serviceId);
    return;
  }

  // Resolve the target display BEFORE creating the window. Chrome appears to
  // associate a popup's fullscreen target with whichever screen it was
  // created on; moving an already-open window with moveTo/resizeTo and then
  // requesting fullscreen can snap back to the origin screen. Opening the
  // window with left/top already set to the target display avoids that.
  const targetRect = await resolvePresenterTargetScreenRect();
  if (!state.presenter.screens.length) void requestPresenterScreens();

  const url = presenterOutputUrl({ fullscreen: true });
  const features = presenterOutputWindowFeatures(targetRect);
  const outputWindow = window.open(url, "mindexPresenterOutput", features);
  if (!outputWindow) {
    showToast("브라우저가 출력 창을 차단했습니다.", "error");
    return;
  }

  state.presenter.outputWindow = outputWindow;
  startPresenterOutputWindowMonitor(serviceId);
  outputWindow.focus();
  if (!targetRect) await positionPresenterOutputWindow(outputWindow);
  outputWindow.addEventListener?.("load", () => {
    publishPresenterState();
    requestOutputFullscreen(outputWindow, { retry: true });
  }, { once: true });
  requestOutputFullscreen(outputWindow, { retry: true });
  window.setTimeout(() => publishPresenterState(), 250);
  renderPresenterControlState(serviceId);
}

function presenterOutputWindowRef() {
  try {
    return state.presenter.outputWindow && !state.presenter.outputWindow.closed
      ? state.presenter.outputWindow
      : null;
  } catch {
    return null;
  }
}

function presenterOutputWindowFeatures(targetRect = null) {
  const features = [
    "popup=yes",
    "fullscreen=yes",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "scrollbars=no",
    "resizable=yes",
  ];
  if (targetRect) {
    features.push(
      `left=${Math.round(targetRect.left)}`,
      `top=${Math.round(targetRect.top)}`,
      `width=${Math.round(targetRect.width)}`,
      `height=${Math.round(targetRect.height)}`,
    );
  } else {
    features.push("width=1280", "height=720");
  }
  return features.join(",");
}

function isPresenterOutputWindowOpen() {
  try {
    return Boolean((state.presenter.outputWindow && !state.presenter.outputWindow.closed) || isPresenterOutputHeartbeatOpen());
  } catch {
    return isPresenterOutputHeartbeatOpen();
  }
}

function isPresenterOutputHeartbeatOpen() {
  return Boolean(
    state.presenter.outputConnectedAt
    && Date.now() - state.presenter.outputConnectedAt <= PRESENTER_OUTPUT_HEARTBEAT_TTL_MS,
  );
}

function startPresenterOutputWindowMonitor(serviceId) {
  stopPresenterOutputWindowMonitor();
  state.presenter.outputWindowMonitor = window.setInterval(() => {
    if (isPresenterOutputWindowOpen()) return;
    stopPresenterOutputWindowMonitor();
    state.presenter.outputWindow = null;
    state.presenter.outputConnectedAt = 0;
    state.presenter.outputClientId = "";
    refreshPresenterOutputConnectionState();
    if (serviceId) renderPresenterControlState(serviceId);
  }, 1000);
}

function stopPresenterOutputWindowMonitor() {
  if (!state.presenter.outputWindowMonitor) return;
  window.clearInterval(state.presenter.outputWindowMonitor);
  state.presenter.outputWindowMonitor = null;
}

function renderPresenterControlState(serviceId = state.selectedServiceId) {
  if (state.module === "service" && state.selectedServiceId === serviceId) {
    const root = document.getElementById("servicePresenterControls");
    const service = state.services.find((svc) => svc.id === serviceId);
    if (root?.isConnected && root.parentNode && service) {
      const active = state.presenter.serviceId === serviceId;
      const slides = active ? state.presenter.slides : buildServicePresenterSlides(serviceId);
      const index = active ? clampPresenterIndex(state.presenter.index, slides.length) : 0;
      const template = document.createElement("template");
      template.innerHTML = renderServicePresenterControls(service, slides, active, index).trim();
      try {
        root.replaceWith(template.content.firstElementChild);
      } catch (error) {
        if (error?.name !== "NotFoundError") throw error;
        renderServiceDetail();
        return;
      }
      refreshIcons();
      updateSaveState();
      renderServiceList();
      requestAnimationFrame(() => scrollActivePresenterThumbIntoView(serviceId));
      return;
    }
    renderServiceDetail();
    return;
  }
  updateSaveState();
}

function scrollActivePresenterThumbIntoView(serviceId = state.presenter.serviceId) {
  const root = document.getElementById("servicePresenterControls");
  if (!root || state.presenter.serviceId !== serviceId) return;
  if (state.presenter.safetyBlank || state.presenter.liveScripture?.active || state.presenter.livePraise?.active) return;
  root.querySelector(".svc-slide-thumb.active")?.scrollIntoView({
    block: "center",
    inline: "nearest",
  });
}

function startPresenterAtSlide(serviceId, index) {
  if (!serviceId || !Number.isFinite(Number(index))) return;
  preparePresenterService(serviceId);
  state.presenter.index = clampPresenterIndex(index, state.presenter.slides.length);
  state.presenter.safetyBlank = false;
  state.presenter.jumpDraft = "";
  state.presenter.liveScripture = {
    ...state.presenter.liveScripture,
    active: false,
    slide: null,
  };
  state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
  publishPresenterState();
  openPresenterOutput(serviceId);
  renderPresenterControlState(serviceId);
}

function preparePresenterService(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  const slides = buildServicePresenterSlides(serviceId);
  if (state.presenter.serviceId !== serviceId) {
    state.presenter.index = 0;
    state.presenter.safetyBlank = false;
    state.presenter.jumpDraft = "";
    state.presenter.liveScripture = { reference: "", draft: "", active: false, slide: null };
    state.presenter.livePraise = emptyLivePraiseState();
  }
  state.presenter.serviceId = serviceId;
  state.presenter.slides = slides;
  state.presenter.index = clampPresenterIndex(state.presenter.index, slides.length);
  if (!slides.length) state.presenter.safetyBlank = false;
}

function refreshPresenterForService(serviceId, options = {}) {
  if (!serviceId) return;
  const isActive = state.presenter.serviceId === serviceId;
  if (!isActive) {
    if (state.module === "service" && state.selectedServiceId === serviceId) renderPresenterControlState(serviceId);
    return;
  }
  state.presenter.slides = buildServicePresenterSlides(serviceId);
  state.presenter.index = clampPresenterIndex(state.presenter.index, state.presenter.slides.length);
  if (!state.presenter.slides.length) state.presenter.safetyBlank = false;
  if (options.publish !== false) publishPresenterState();
  if (state.module === "service" && state.selectedServiceId === serviceId) renderPresenterControlState(serviceId);
}

function refreshPresenterForServiceType(typeId, options = {}) {
  const service = state.services.find((svc) => svc.id === state.presenter.serviceId);
  if (service?.type_id === typeId) refreshPresenterForService(service.id, options);
  const selectedService = state.services.find((svc) => svc.id === state.selectedServiceId);
  if (selectedService?.type_id === typeId && selectedService.id !== service?.id) {
    refreshPresenterForService(selectedService.id, { publish: false });
  }
}

function movePresenterSlide(delta) {
  const count = state.presenter.slides.length;
  if (!count) return;
  state.presenter.index = Math.min(Math.max(state.presenter.index + delta, 0), count - 1);
}

function clampPresenterIndex(index, count) {
  if (!count) return 0;
  return Math.min(Math.max(Number(index) || 0, 0), count - 1);
}

function buildServicePresenterSlides(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return [];

  const worshipSlides = state.worshipPresenterSlides[serviceId] || [];
  if (worshipSlides.length) {
    const slides = worshipSlides.slice().sort((a, b) => a.sort - b.sort);
    if (slides[0] && isPresenterPreparationSlide(slides[0])) return slides;
    return [presenterReadySlide(service), ...slides];
  }

  const slides = getServiceOutputItems(serviceId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((item, index) => buildPresenterSlidesForServiceItem(item, service, index))
    .filter(Boolean);
  if (slides[0] && isPresenterPreparationSlide(slides[0])) return slides;
  return [presenterReadySlide(service), ...slides];
}

function isPresenterPreparationSlide(slide) {
  if (slide?.type === "ready" || slide?.sectionRole === "ready") return true;
  return /(?:예배\s*)?준비|대기/i.test(`${slide.sectionLabel || ""} ${slide.title || ""}`);
}

function presenterReadySlide(service) {
  const title = "준비";
  const serviceName = serviceDisplayTypeName(service) || "예배";
  return {
    id: `${service?.id || "service"}:ready`,
    sectionId: `${service?.id || "service"}:ready`,
    sectionIndex: 0,
    sectionLabel: "준비",
    sectionRole: "ready",
    sectionTitle: title,
    elementLabel: "준비",
    elementTitle: title,
    sectionName: title,
    elementType: PRESENTER_ELEMENT_TYPES.VIDEO,
    layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
    type: "ready",
    label: "준비",
    title,
    marker: "",
    text: `잠시 후\n${serviceName}\n가 시작됩니다`,
    sort: -1,
  };
}

function presenterSlideElementType(slide) {
  if (slide?.elementType) return slide.elementType;
  if (slide?.type === "lyrics" || slide?.type === "song-title") return PRESENTER_ELEMENT_TYPES.PRAISE;
  if (slide?.type === "video") return PRESENTER_ELEMENT_TYPES.VIDEO;
  if (slide?.type === "image") return PRESENTER_ELEMENT_TYPES.IMAGE;
  if (slide?.type === "file") return PRESENTER_ELEMENT_TYPES.FILE;
  if (slide?.type === "blank") return PRESENTER_ELEMENT_TYPES.BLANK;
  return PRESENTER_ELEMENT_TYPES.PLAIN_TEXT;
}

function presenterSlideLayout(slide) {
  if (slide?.layout) return slide.layout;
  if (slide?.type === "lyrics" || slide?.type === "song-title") return PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  if (slide?.type === "video") return PRESENTER_SLIDE_LAYOUTS.MEDIA;
  if (slide?.type === "image") return PRESENTER_SLIDE_LAYOUTS.MEDIA;
  if (slide?.type === "file") return PRESENTER_SLIDE_LAYOUTS.FILE;
  if (slide?.type === "blank") return PRESENTER_SLIDE_LAYOUTS.BLANK;
  return PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT;
}

function presenterSlideRenderClass(slide) {
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT) {
    if (elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT) return "scripture";
    if (elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return "title-assignee";
    return slide?.type === "song-title" ? "song-title" : "lyrics";
  }
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA) return elementType === PRESENTER_ELEMENT_TYPES.IMAGE ? "image" : "video";
  if (layout === PRESENTER_SLIDE_LAYOUTS.FILE) return "file";
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return "blank";
  if (slide?.type === "ready") return "ready";
  if (elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT || elementType === PRESENTER_ELEMENT_TYPES.BODY_TEXT) return "component";
  return "component";
}

function presenterSlideHasMeta(slide) {
  return presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT && slide?.type !== "ready";
}

function buildPresenterSlidesForServiceItem(item, service, index) {
  const song = item.song_id ? state.songs.find((candidate) => candidate.id === item.song_id) : null;
  const version = song ? getServiceItemVersion(song, item, service) : null;
  const formPlan = version ? presenterFormPlanForServiceItem(version, item, song) : { forms: [], warnings: [] };
  const forms = formPlan.forms;
  const formWarnings = formPlan.warnings;
  const label = item.label || "";
  const displayText = serviceItemDisplayText(item);
  const memo = parseServiceItemMemo(item?.memo);
  const memoElementType = serviceMemoElementType(memo);
  const outputMode = serviceItemOutputMode(item, memo);
  if (isServicePreparationItem(item, memo)) {
    return [presenterPreparationSlide(service, item, index)];
  }
  if (isOrderSheetOnlyPlaceholderItem(item)) return [];
  if (!displayText && !memoElementType) return [];
  const section = presenterSectionForServiceItem(item, index, displayText, song);
  const elementSlide = presenterElementSlideFromMemo(item, section, index, memo, displayText);
  if (Array.isArray(elementSlide)) return elementSlide;
  if (elementSlide) return [elementSlide];
  const videoSrc = presenterVideoSourceFromServiceItem(item, displayText);

  if (videoSrc) {
    const videoTitle = label || "Video";
    return [{
      id: `${item.id || index}:video`,
      ...section,
      sectionLabel: label || "Video",
      sectionTitle: videoTitle,
      sectionName: videoTitle,
      elementType: PRESENTER_ELEMENT_TYPES.VIDEO,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "video",
      label,
      title: videoTitle,
      marker: label || "Video",
      text: videoTitle,
      videoSrc,
      sort: index,
    }];
  }

  const customSlides = buildPresenterCustomSlides(item, section, index);
  if (customSlides.length) return customSlides;

  const scriptureTextSlides = buildPresenterScriptureTextSlides(item, section, index);
  if (scriptureTextSlides.length) return scriptureTextSlides;

  if (outputMode === "score" && (song || isSongServiceLabel(label))) {
    return presenterScoreSlidesForServiceItem(item, section, index, song, version, displayText, memo);
  }

  if (song && forms.length) {
    const lyricsSlides = forms.flatMap((form, formIndex) => {
      if (form._presenterBlank) {
        return [{
          id: `${item.id || index}:blank:${form._presenterToken || formIndex}:${formIndex}`,
          ...section,
          elementType: PRESENTER_ELEMENT_TYPES.BLANK,
          layout: PRESENTER_SLIDE_LAYOUTS.BLANK,
          type: "blank",
          label,
          title: form.label || "빈 화면",
          marker: "",
          formKey: `blank:${form._presenterToken || formIndex}:${formIndex}`,
          segment: "",
          text: "",
          warnings: formWarnings,
          sort: index + formIndex / 100,
        }];
      }
      const chunks = splitPresenterLyricChunks(form.lyrics);
      const formId = form._localId || form.id || formIndex;
      const formKey = `${formId}:${formIndex}`;
      return chunks.map((chunk, chunkIndex) => ({
        id: `${item.id || index}:form:${formId}:seq:${formIndex}:chunk:${chunkIndex}`,
        ...section,
        elementType: PRESENTER_ELEMENT_TYPES.PRAISE,
        layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
        type: "lyrics",
        label,
        title: presenterPraiseTitle(song, displayText),
        subtitle: versionDisplayName(song, version),
        marker: chunkIndex === 0 ? presenterFormMarker(form) : "",
        formKey,
        segment: "",
        text: chunk,
        warnings: formWarnings,
        sort: index + formIndex / 100 + chunkIndex / 10000,
      }));
    });
    return shouldIncludeSongTitleSlide(item, label)
      ? [presenterSongTitleSlide(item, section, song, version, displayText, index), ...lyricsSlides]
      : lyricsSlides;
  }

  const { no, title } = splitHymnNo(displayText);
  if (!isSongServiceLabel(label)) return [];
  return [{
    id: `${item.id || index}:title`,
    ...section,
    elementType: isSongServiceLabel(label) ? PRESENTER_ELEMENT_TYPES.PRAISE : PRESENTER_ELEMENT_TYPES.PLAIN_TEXT,
    layout: isSongServiceLabel(label) ? PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT : PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
    type: isSongServiceLabel(label) ? "song-title" : "component",
    label,
    title,
    marker: no || "",
    text: formatPresenterSongTitleText(title),
    sort: index,
  }];
}

function serviceItemOutputMode(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  return normalizeServiceOutputMode(
    memo.outputMode
    || item.outputMode
    || item.output_mode
    || item.renderMode
    || item.render_mode,
  );
}

function presenterScoreSlidesForServiceItem(item, section, index, song, version, displayText, memo = parseServiceItemMemo(item?.memo)) {
  const label = item?.label || "";
  const asset = normalizeServiceAsset(memo.asset || item.asset);
  const title = presenterPraiseTitle(song, displayText) || displayText || label || "악보";
  const imageSlides = presenterScoreImageSlidesFromAsset(asset, item, section, index, title, label, song, version, displayText);
  if (imageSlides.length) return imageSlides;
  const scoreAsset = { ...asset, kind: asset.kind || "score" };
  const fileTitle = presenterFileDisplayTitle({ title, asset: scoreAsset }, "악보");
  return [{
    id: `${item.id || index}:score`,
    ...section,
    sectionLabel: label || "악보",
    sectionTitle: fileTitle,
    sectionName: presenterNameParts(label, fileTitle).join(" / ") || fileTitle,
    elementType: PRESENTER_ELEMENT_TYPES.FILE,
    layout: PRESENTER_SLIDE_LAYOUTS.FILE,
    type: "file",
    label,
    title: fileTitle,
    subtitle: versionDisplayName(song, version),
    marker: "악보",
    text: [fileTitle, scoreAsset.url].filter(Boolean).join("\n"),
    asset: scoreAsset,
    sourceType: "score",
    componentType: "score",
    sort: index,
  }];
}

function presenterScoreImageSlidesFromAsset(asset, item, section, index, title, label, song = null, version = null, displayText = "") {
  const explicitSources = [
    ...normalizeServiceAssetSlides(asset?.slides),
    ...normalizeServiceAssetSlides(asset?.images),
    ...normalizeServiceAssetSlides(asset?.urls),
    ...presenterImageSourcesFromAssetUrl(asset?.url),
  ];
  const sources = explicitSources.length ? explicitSources : presenterHymnScoreAssetSlides(song, version, displayText);
  const imageSources = sources
    .map((slide, slideIndex) => ({
      url: normalizePresenterMediaSource(slide.url),
      name: String(slide.name || "").trim(),
      order: Number(slide.order) || slideIndex + 1,
    }))
    .filter((slide) => slide.url && presenterMediaSourceIsImage(slide.url));
  const count = imageSources.length;
  return imageSources.map((slide, slideIndex) => {
    const marker = count > 1 ? `악보 ${slideIndex + 1}` : "악보";
    return {
      id: `${item.id || index}:score-image:${slideIndex}`,
      ...section,
      sectionLabel: label || "악보",
      sectionTitle: title,
      sectionName: presenterNameParts(label, title).join(" / ") || title,
      elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "image",
      label,
      title,
      subtitle: versionDisplayName(song, version),
      marker,
      text: slide.name || title,
      imageSrc: slide.url,
      asset: { ...asset, kind: asset.kind || "score", url: slide.url, name: slide.name || asset.name || "" },
      scoreBackground: true,
      sourceType: "score",
      componentType: "score",
      sort: index + slideIndex / 100,
    };
  });
}

function presenterHymnScoreAssetSlides(song = null, version = null, displayText = "") {
  const hymnNo = normalizedHymnScoreNumber(song?.hymn_no || version?.hymn_no || displayText);
  if (!hymnNo) return [];
  const entry = state.hymnScoreManifest?.[hymnNo];
  const slides = Array.isArray(entry?.slides) ? entry.slides : [];
  return slides
    .map((slide, index) => ({
      url: slide.src || slide.url,
      name: slide.name || `${hymnNo} ${entry.title || stripHymnNumber(song?.title || "")} ${index + 1}`,
      order: index + 1,
    }))
    .filter((slide) => slide.url);
}

function normalizedHymnScoreNumber(value = "") {
  const match = String(value || "").match(/\d{1,3}/);
  return match ? String(Number(match[0])) : "";
}

function presenterImageSourcesFromAssetUrl(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split(/[\s,|]+/g)
    .map((part) => normalizePresenterMediaSource(part))
    .filter((source) => source && presenterMediaSourceIsImage(source))
    .map((url, index) => ({ url, name: index === 0 ? "" : "", order: index + 1 }));
}

function presenterFormsForServiceItem(version, item, song = null) {
  return presenterFormPlanForServiceItem(version, item, song).forms;
}

function presenterFormPlanForServiceItem(version = {}, item, song = null) {
  version = version || {};
  const forms = normalizeForms(version.forms || []).filter((form) => normalizeLyricsForCopy(form.lyrics));
  const preset = serviceItemFormPreset(item) || matchedServiceItemFormPresetRule(item, song, version)?.formPreset || null;
  if (!preset?.forms?.length) return { forms, warnings: [] };
  const resolved = resolvePresenterFormPresetSequence(forms, preset.forms);
  const warnings = resolved.missing.map((label) => `${label} 없음`);
  return {
    forms: resolved.items.length ? resolved.items : forms,
    warnings,
  };
}

function matchedServiceItemFormPresetRule(item, song, version) {
  return serviceItemFormPresetRules(item).find((rule) => serviceItemFormPresetRuleMatches(rule, item, song, version)) || null;
}

function serviceItemFormPresetRuleMatches(rule = {}, item = {}, song = null, version = null) {
  const when = rule.when && typeof rule.when === "object" ? rule.when : {};
  const songType = String(when.songType || when.song_type || when.praiseType || when.praise_type || "").trim();
  if (songType) {
    const requiredTypes = normalizePraiseTypes(songType);
    const versionTypes = versionEffectivePraiseTypes(song, version);
    if (requiredTypes.length && !requiredTypes.some((type) => versionTypes.includes(type))) return false;
  }
  const sectionKey = String(when.sectionKey || when.section_key || "").trim();
  if (sectionKey && sectionKey !== String(item?._worshipSectionKey || "").trim()) return false;
  const label = String(when.label || "").trim();
  if (label && compactSearchValue(label) !== compactSearchValue(item?.label || "")) return false;
  return true;
}

function resolvePresenterFormPresetSequence(forms = [], presetForms = []) {
  const items = [];
  const missing = [];
  for (const label of cleanList(presetForms)) {
    const resolved = findPresenterFormForPresetLabel(forms, label);
    if (resolved) items.push(resolved);
    else missing.push(normalizePresenterMissingFormLabel(label));
  }
  return { items, missing };
}

function findPresenterFormForPresetLabel(forms = [], label = "") {
  const target = normalizePresenterFormPresetLabel(label);
  if (!target.key) return null;
  if (target.blank) return presenterBlankFormPresetItem(label, target);
  if (target.lastVerse) {
    return [...forms].reverse().find((form) => normalizePresenterFormPresetLabel(displayLabel(form)).type === "verse") || null;
  }
  return forms.find((form) => {
    const candidate = normalizePresenterFormPresetLabel(displayLabel(form));
    if (target.key === candidate.key) return true;
    return target.type && target.type === candidate.type && (!target.number || target.number === candidate.number);
  }) || null;
}

function normalizePresenterFormPresetLabel(value = "") {
  const raw = String(value || "").trim();
  const compact = compactSearchValue(raw);
  const lastVerse = /^(마지막절|lastverse|last)$/i.test(compact);
  if (lastVerse) return { key: "last-verse", type: "verse", number: 0, lastVerse: true };
  const hymnVerse = raw.match(/^(\d+)\s*절$/u);
  if (hymnVerse) return { key: `verse:${hymnVerse[1]}`, type: "verse", number: Number(hymnVerse[1]) };
  const shorthand = raw.match(/^(v|verse)\s*(\d*)$/i);
  if (shorthand) {
    const number = shorthand[2] ? Number(shorthand[2]) : 0;
    return { key: number ? `verse:${number}` : "verse", type: "verse", number };
  }
  const chorus = /^(c|chorus|후렴|코러스)$/i.test(compact);
  if (chorus) return { key: "chorus", type: "chorus", number: 0 };
  const bridge = /^(b|bridge|브릿지)$/i.test(compact);
  if (bridge) return { key: "bridge", type: "bridge", number: 0 };
  const preChorus = /^(pc|prechorus|pre-chorus|프리코러스)$/i.test(compact);
  if (preChorus) return { key: "pre-chorus", type: "pre-chorus", number: 0 };
  const instrumental = /^(간주|interlude|instrumental)$/i.test(compact);
  if (instrumental) return { key: "instrumental", type: "instrumental", number: 0, blank: true };
  const display = raw.match(/^([A-Za-z][A-Za-z -]*?)(?:\s+(\d+))?$/);
  if (display) {
    const type = normalizePresenterFormType(display[1]);
    const number = display[2] ? Number(display[2]) : 0;
    return { key: number ? `${type}:${number}` : type, type, number };
  }
  return { key: compact, type: compact, number: 0 };
}

function normalizePresenterFormType(value = "") {
  const compact = compactSearchValue(value);
  if (/^verse$/i.test(compact)) return "verse";
  if (/^chorus$/i.test(compact)) return "chorus";
  if (/^bridge$/i.test(compact)) return "bridge";
  if (/^prechorus$/i.test(compact)) return "pre-chorus";
  if (/^(interlude|instrumental)$/i.test(compact)) return "instrumental";
  return compact;
}

function normalizePresenterMissingFormLabel(value = "") {
  const raw = String(value || "").trim();
  const target = normalizePresenterFormPresetLabel(raw);
  if (target.lastVerse) return "마지막 절";
  if (target.type === "verse" && target.number) return `${target.number}절`;
  if (target.key === "chorus") return "C";
  if (target.key === "bridge") return "Bridge";
  if (target.key === "pre-chorus") return "Pre-Chorus";
  return raw || "송폼";
}

function presenterBlankFormPresetItem(label = "", target = {}) {
  const text = String(label || "").trim() || "빈 화면";
  return {
    _presenterBlank: true,
    _presenterToken: target.key || compactSearchValue(text) || "blank",
    id: `preset-blank:${target.key || compactSearchValue(text) || "blank"}`,
    part_type: text,
    part_number: null,
    lyrics: "",
    label: text,
  };
}

function isOrderSheetOnlyPlaceholderItem(item = {}) {
  return Boolean(item._worshipOrderSheetPlaceholder);
}

function isServicePreparationItem(item, memo = parseServiceItemMemo(item?.memo)) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  const title = String(item?.raw_title || "").replace(/\s+/g, "");
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  const role = String(memo?.templateKey || memo?.templateVariant || "").replace(/\s+/g, "");
  return sectionKey === "ready"
    || label === "준비"
    || label === "예배준비"
    || title === "준비"
    || title === "예배준비"
    || role === "ready"
    || role === "preparation";
}

function presenterPreparationSlide(service, item, index) {
  const memo = parseServiceItemMemo(item?.memo);
  const asset = normalizeServiceAsset(memo.asset);
  const elementType = servicePreparationElementTypeForType(service?.type_id);
  const source = normalizePresenterMediaSource(asset.url || "");
  if (source) {
    const title = asset.name || item?.raw_title || "준비";
    const base = {
      ...presenterReadySlide(service),
      id: `${item?.id || index}:ready-media`,
      sectionId: item?.id || `${service?.id || "service"}:ready`,
      elementId: item?.id || `${service?.id || "service"}:ready`,
      sectionIndex: index + 1,
      sectionTitle: title,
      elementTitle: title,
      sectionName: title,
      title,
      text: title,
      asset: { ...asset, kind: asset.kind || elementType },
      sort: index,
    };
    if (elementType === "image") {
      return {
        ...base,
        elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
        layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
        type: "image",
        imageSrc: source,
      };
    }
    return {
      ...base,
      elementType: PRESENTER_ELEMENT_TYPES.VIDEO,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "video",
      videoSrc: source,
    };
  }
  return {
    ...presenterReadySlide(service),
    id: `${item?.id || index}:ready`,
    sectionId: item?.id || `${service?.id || "service"}:ready`,
    elementId: item?.id || `${service?.id || "service"}:ready`,
    sectionIndex: index + 1,
    sort: index,
  };
}

function presenterElementSlideFromMemo(item, section, index, memo, displayText) {
  const elementType = serviceMemoElementType(memo);
  if (!elementType || elementType === "praise" || elementType === "scripture") return null;
  const label = item?.label || "";
  const asset = normalizeServiceAsset(memo?.asset);
  const safeLabel = isLegacyPresentationLabel(label) ? "" : label;
  const assetTitle = asset.name && !isLegacyImportArtifactName(asset.name) ? asset.name : "";
  const title = assetTitle || displayText || label || serviceElementTypeLabel(elementType);
  if (presenterMemoElementIsTitleSlide(elementType)) {
    const titleText = presenterTitleAssigneeTitle(item, safeLabel, displayText, elementType);
    const assigneeText = presenterTitleAssigneePerson(item, safeLabel, displayText, titleText);
    if (!titleText && !assigneeText) return null;
    return {
      id: `${item.id || index}:title-assignee`,
      ...section,
      sectionLabel: safeLabel || titleText || serviceElementTypeLabel(elementType),
      sectionTitle: titleText,
      sectionName: presenterNameParts(safeLabel, titleText, assigneeText).join(" / ") || titleText,
      elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
      layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
      type: "title-assignee",
      label: safeLabel,
      title: titleText,
      assignee: assigneeText,
      marker: "",
      text: cleanList([titleText, assigneeText]).join("\n"),
      sort: index,
    };
  }
  if (elementType === "blank") {
    return {
      id: `${item.id || index}:blank`,
      ...section,
      elementType: PRESENTER_ELEMENT_TYPES.BLANK,
      layout: PRESENTER_SLIDE_LAYOUTS.BLANK,
      type: "blank",
      label,
      title: title || "Blank",
      marker: "",
      text: "",
      sort: index,
    };
  }
  if (elementType === "video") {
    const source = normalizePresenterMediaSource(asset.url || displayText);
    if (!source) return null;
    return {
      id: `${item.id || index}:video`,
      ...section,
      sectionLabel: label || "Video",
      sectionTitle: title,
      sectionName: title,
      elementType: PRESENTER_ELEMENT_TYPES.VIDEO,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "video",
      label,
      title,
      marker: label || "Video",
      text: title,
      videoSrc: source,
      sort: index,
    };
  }
  if (elementType === "image") {
    const source = normalizePresenterMediaSource(asset.url || displayText);
    if (!source) return null;
    return {
      id: `${item.id || index}:image`,
      ...section,
      sectionLabel: label || "Image",
      sectionTitle: title,
      sectionName: title,
      elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "image",
      label,
      title,
      marker: label || "Image",
      text: title,
      imageSrc: source,
      asset,
      sort: index,
    };
  }
  if (elementType === "score") {
    const source = normalizePresenterMediaSource(asset.url || displayText);
    const scoreAsset = source ? { ...asset, url: source } : asset;
    const imageSlides = presenterScoreImageSlidesFromAsset(scoreAsset, item, section, index, title, safeLabel || "악보", null, null, displayText);
    if (imageSlides.length) return imageSlides;
    const fileLabel = presenterFileTypeLabel("score");
    const fileTitle = presenterFileDisplayTitle({ title: assetTitle || displayText || safeLabel, asset }, fileLabel);
    return {
      id: `${item.id || index}:score`,
      ...section,
      sectionLabel: safeLabel || fileLabel,
      sectionTitle: fileTitle,
      sectionName: fileTitle,
      elementType: PRESENTER_ELEMENT_TYPES.FILE,
      layout: PRESENTER_SLIDE_LAYOUTS.FILE,
      type: "file",
      label: safeLabel,
      title: fileTitle,
      marker: fileLabel,
      text: [fileTitle, asset.url].filter(Boolean).join("\n"),
      asset,
      sourceType: "score",
      componentType: "score",
      sort: index,
    };
  }
  if (elementType === "activity") {
    return {
      id: `${item.id || index}:activity`,
      ...section,
      sectionLabel: label || "Activity",
      sectionTitle: title,
      sectionName: title,
      elementType: PRESENTER_ELEMENT_TYPES.FREEFORM,
      layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: "activity",
      label,
      title,
      marker: "Activity",
      text: [title, memo.note].filter(Boolean).join("\n"),
      sort: index,
    };
  }
  if (elementType === "file" || elementType === "template") {
    const fileLabel = presenterFileTypeLabel(asset.kind || elementType);
    const fileTitle = presenterFileDisplayTitle({ title: assetTitle || displayText || safeLabel, asset }, fileLabel);
    return {
      id: `${item.id || index}:${elementType}`,
      ...section,
      sectionLabel: safeLabel || fileLabel,
      sectionTitle: fileTitle,
      sectionName: fileTitle,
      elementType: elementType === "file" ? PRESENTER_ELEMENT_TYPES.FILE : PRESENTER_ELEMENT_TYPES.FREEFORM,
      layout: PRESENTER_SLIDE_LAYOUTS.FILE,
      type: "file",
      label: safeLabel,
      title: fileTitle,
      marker: fileLabel,
      text: [fileTitle, asset.url].filter(Boolean).join("\n"),
      asset,
      sourceType: asset.kind || elementType,
      componentType: elementType,
      sort: index,
    };
  }
  return null;
}

function presenterMemoElementIsTitleSlide(elementType) {
  return ["title_person", "scripture_reading", "plain_text", "body"].includes(elementType);
}

function presenterTitleAssigneeTitle(item = {}, label = "", displayText = "", elementType = "") {
  const compact = compactSearchValue(label);
  const text = String(displayText || "").trim();
  if (compact === "대표기도" || compact === "기도") return "기도";
  if (compact === "성경봉독") return "성경봉독";
  if (compact === "특송") return "특송";
  if (compact === "봉헌기도") return "봉헌기도";
  if (compact === "축도") return "축도";
  if (compact === "교회소식" || compact === "광고") return "교회소식";
  if (compact === "월삭기도") return text || "월삭기도";
  if (compact === "설교") return text || "설교";
  return text || label || serviceElementTypeLabel(elementType);
}

function presenterTitleAssigneePerson(item = {}, label = "", displayText = "", titleText = "") {
  const assignee = cleanServiceAssignee(item.assignee);
  if (assignee) return assignee;
  const compact = compactSearchValue(label);
  const text = String(displayText || "").trim();
  if (!text || text === titleText) return "";
  if (["대표기도", "기도", "성경봉독", "특송", "봉헌기도", "축도"].includes(compact)) return text;
  return "";
}

function serviceElementTypeLabel(type) {
  return SERVICE_ELEMENT_LABELS[normalizeServiceElementType(type)] || "항목";
}

function buildPresenterCustomSlides(item, section, index) {
  const slides = parseServiceItemMemo(item?.memo).slides;
  if (!slides.length) return [];
  const label = item.label || "";
  return slides.map((block, blockIndex) => {
    const parsed = parsePresenterCustomSlideBlock(block);
    return {
      id: `${item.id || index}:custom:${blockIndex}`,
      ...section,
      elementType: isSongServiceLabel(label) ? PRESENTER_ELEMENT_TYPES.PRAISE : PRESENTER_ELEMENT_TYPES.FREEFORM,
      layout: isSongServiceLabel(label) ? PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT : PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: isSongServiceLabel(label) ? "lyrics" : "component",
      label,
      title: section.sectionTitle || item.raw_title || label || "Slide",
      marker: parsed.marker,
      formKey: `custom:${blockIndex}`,
      text: parsed.text,
      sort: index + blockIndex / 100,
    };
  }).filter((slide) => String(slide.text || "").trim());
}

function parsePresenterCustomSlideBlock(block) {
  const lines = String(block || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { marker: "", text: "" };
  const first = lines[0];
  const bracketed = first.match(/^\[([^\]]+)\]$/)?.[1]?.trim();
  const markerCandidate = bracketed || first;
  if (/^(Verse|Chorus|Pre-Chorus|Bridge|Coda|Amen|Lyrics)(?:\s+\d+)?$/i.test(markerCandidate)) {
    return { marker: normalizePresenterCustomMarker(markerCandidate), text: lines.slice(1).join("\n") };
  }
  return { marker: "", text: lines.join("\n") };
}

function normalizePresenterCustomMarker(value) {
  return String(value || "")
    .replace(/^pre[\s-]?chorus/i, "Pre-Chorus")
    .replace(/^verse/i, "Verse")
    .replace(/^chorus/i, "Chorus")
    .replace(/^bridge/i, "Bridge")
    .replace(/^coda/i, "Coda")
    .replace(/^amen/i, "Amen")
    .replace(/^lyrics/i, "Lyrics");
}

function buildPresenterScriptureTextSlides(item, section, index) {
  if (!isScriptureBodyServiceItem(item)) return [];
  const payload = parsePresenterScriptureTextPayload(item.raw_title);
  if (!payload.verses.length) return [];
  return payload.verses.map((verse, verseIndex) => ({
    id: `${item.id || index}:scripture:${verse.number || verseIndex + 1}`,
    ...section,
    elementType: PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
    layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
    type: "component",
    label: item.label || "본문",
    title: payload.reference || section.sectionTitle || "본문",
    marker: payload.reference || "",
    text: verse.number ? `${verse.number}   ${verse.text}` : verse.text,
    sort: index + verseIndex / 100,
  }));
}

function isScriptureBodyServiceItem(item) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  return label === "본문" || label === "성경본문";
}

function parsePresenterScriptureTextPayload(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const verses = [];
  let reference = "";
  for (const line of lines) {
    const match = line.match(/^(\d{1,3})\s{3,}(.+)$/);
    if (match) {
      verses.push({ number: match[1], text: match[2].trim() });
    } else if (!reference) {
      reference = line;
    }
  }
  return { reference, verses };
}

function shouldIncludeSongTitleSlide(item, label) {
  return Boolean(item?.song_id && (isSongServiceLabel(label) || isMainPraiseServiceItem(item, { allowUnlabeled: true })));
}

function presenterSongTitleSlide(item, section, song, version, displayText, index) {
  const songTitle = presenterPraiseTitle(song, displayText);
  const marker = presenterPraiseMarker(song, displayText);
  return {
    id: `${item.id || index}:song-title`,
    ...section,
    elementType: PRESENTER_ELEMENT_TYPES.PRAISE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "song-title",
    label: item.label || "",
    title: songTitle,
    subtitle: versionDisplayName(song, version),
    marker,
    text: formatPresenterSongTitleText(songTitle),
    sort: index - 0.001,
  };
}

function formatPresenterSongTitleText(title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return "";
  return cleanTitle.startsWith("♪") ? cleanTitle : `♪ ${cleanTitle}`;
}

function presenterPraiseTitle(song, fallbackText = "") {
  const linkedTitle = String(song?.title || "").trim();
  const cleanLinkedTitle = song?.hymn_no ? stripHymnNumber(linkedTitle) : linkedTitle;
  const normalizedLinkedTitle = cleanLinkedTitle.replace(/^찬송가\s*\d+\s*장\s*/i, "").trim();
  if (normalizedLinkedTitle) return normalizedLinkedTitle;
  const { title } = splitHymnNo(fallbackText);
  return title || fallbackText || "";
}

function presenterPraiseMarker(song, fallbackText = "") {
  void song;
  void fallbackText;
  return "";
}

function presenterFormMarker(form) {
  const label = displayLabel(form);
  return isGenericPresenterFormLabel(label) ? "" : label;
}

function isGenericPresenterFormLabel(value) {
  return /^(lyrics|가사)$/i.test(String(value || "").trim());
}

function presenterSectionForServiceItem(item, index, displayText, song = null) {
  const label = String(item?.label || "").trim();
  const sectionLabel = String(item?._worshipSectionTitle || label).trim();
  const formHint = serviceItemFormHint(item);
  const { no, title } = splitHymnNo(displayText);
  const linkedSongTitle = song ? presenterPraiseTitle(song, displayText) : "";
  const elementTitle = linkedSongTitle || [no, title].filter(Boolean).join(" ") || displayText || label || `항목 ${index + 1}`;
  const sectionLabelText = cleanList([label, formHint]).join(" · ");
  return {
    sectionId: item?._worshipSectionId || item?.id || `section:${index}:${normalizeTitle([label, displayText].filter(Boolean).join(" "))}`,
    elementId: item?.id || `element:${index}:${normalizeTitle([label, displayText].filter(Boolean).join(" "))}`,
    sectionIndex: Number(item?._worshipSectionOrder) || index + 1,
    sectionKey: item?._worshipSectionKey || "",
    sectionLabel,
    sectionFormHint: formHint,
    sectionRole: isMainPraiseServiceItem(item, { allowUnlabeled: true }) ? "main-praise" : "",
    sectionTitle: sectionLabel,
    elementLabel: label,
    elementTitle,
    sectionAssignee: item?.assignee || "",
    sectionName: [sectionLabel || sectionLabelText, elementTitle].filter(Boolean).join(" / "),
  };
}

function presenterVideoSourceFromServiceItem(item, displayText) {
  const label = String(item?.label || "").trim();
  const rawTitle = String(item?.raw_title || "").trim();
  const source = extractPresenterVideoSource(rawTitle) || extractPresenterVideoSource(displayText);
  if (!source) return "";
  const labelLooksLikeVideo = /영상|비디오|video|movie|media/i.test(label);
  const sourceLooksLikeVideo = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(source);
  return labelLooksLikeVideo || sourceLooksLikeVideo ? source : "";
}

function extractPresenterVideoSource(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const cleaned = text.replace(/^(?:대기\s*)?(?:영상|비디오|video|movie)\s*:?\s*/i, "").trim();
  const direct = normalizePresenterMediaSource(cleaned);
  if (direct) return direct;
  const match = text.match(/(?:https?:\/\/[^\s"'<>]+|\.{0,2}\/[^\s"'<>]+|[^\s"'<>]+\.(?:mp4|webm|mov|m4v)(?:[?#][^\s"'<>]*)?)/i);
  return normalizePresenterMediaSource(match?.[0] || "");
}

function normalizePresenterMediaSource(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^(javascript|data):/i.test(source)) return "";
  if (/^(https?:\/\/|\/|\.{1,2}\/)/i.test(source)) return source;
  if (/\.(mp4|webm|mov|m4v|png|jpe?g|gif|webp|svg|pdf)(?:[?#].*)?$/i.test(source)) return source;
  return "";
}

function presenterMediaSourceIsImage(value) {
  return /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(String(value || "").trim());
}

function splitPresenterLyricChunks(lyrics, linesPerSlide = 2) {
  const lines = splitFreeShowLines(normalizeLyricsForCopy(lyrics))
    .map((line) => line.trim())
    .filter(Boolean);
  const chunkSize = Math.max(1, Number(linesPerSlide) || 2);
  const chunks = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize).join("\n"));
  }
  return chunks;
}

function getServiceItemVersion(song, item, service) {
  const versions = song?.versions || [];
  if (!versions.length) return null;

  const explicitVersionId = item?.version_id || item?.song_version_id;
  if (explicitVersionId) {
    const explicit = versions.find((version) => version.id === explicitVersionId);
    if (explicit) return explicit;
  }

  const displayText = serviceItemDisplayText(item);
  const { no, title } = splitHymnNo(displayText);
  const lookupTitles = serviceItemVersionLookupTitles(displayText, title, item?.raw_title);
  const directMatch = versions.find((version) =>
    serviceVersionLookupNames(song, version).some((name) =>
      lookupTitles.some((target) => name === target || name.startsWith(target) || target.startsWith(name)),
    ),
  );
  if (directMatch) return directMatch;

  const byServiceType = versions.find((version) =>
    serviceTypePreferredPraiseTypes(service?.type_id).some((type) =>
      versionEffectivePraiseTypes(song, version).includes(type),
    ),
  );
  if (byServiceType) return byServiceType;

  if (no) {
    const hymnVersion = versions.find((version) => versionEffectivePraiseTypes(song, version).includes("hymn"));
    if (hymnVersion) return hymnVersion;
  } else if (song?.hymn_no) {
    const nonHymnVersion = versions.find((version) =>
      versionEffectivePraiseTypes(song, version).some((type) => type === "ccm" || type === "children"),
    );
    if (nonHymnVersion) return nonHymnVersion;
  }

  return versions.find((version) => version.id === getDefaultVersionId(song)) || versions[0];
}

function serviceTypePreferredPraiseTypes(typeId) {
  if (typeId === "children") return ["children"];
  if (typeId === "youth" || typeId === "young-adult") return ["ccm"];
  return [];
}

function serviceItemVersionLookupTitles(...values) {
  return [...new Set(
    values
      .flatMap((value) => [value, stripTitleDecorations(value)])
      .map(normalizeTitle)
      .filter((value) => value && value.length > 1),
  )];
}

function serviceVersionLookupNames(song, version) {
  return serviceItemVersionLookupTitles(
    version?.name,
    version?.curated_version_name,
    version?.raw_section_name,
    version?.version_label,
    versionDisplayName(song, version),
  );
}

function isSongServiceLabel(label) {
  const compact = String(label || "").replace(/\s+/g, "");
  if (!compact) return false;
  if (/찬양|찬송|특송|송영/.test(compact)) return true;
  return /^(결단|봉헌|파송)찬양$/.test(compact);
}

function presenterStatePayload(serviceId = state.presenter.serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const slides = state.presenter.serviceId === serviceId
    ? state.presenter.slides
    : buildServicePresenterSlides(serviceId);
  return {
    serviceId,
    serviceType: service?.type_id || "",
    serviceTitle: [serviceDisplayTypeName(service), service ? formatServiceDate(service) : ""].filter(Boolean).join(" · "),
    chromakey: presenterServiceUsesChromakey(service),
    outputTheme: presenterOutputTheme(service?.type_id),
    backgroundImage: presenterBackgroundForService(service),
    slides,
    index: clampPresenterIndex(state.presenter.index, slides.length),
    safetyBlank: Boolean(state.presenter.safetyBlank),
    liveScripture: state.presenter.liveScripture?.active ? state.presenter.liveScripture : null,
    livePraise: state.presenter.livePraise?.active ? state.presenter.livePraise : null,
    updatedAt: Date.now(),
  };
}

function bindPresenterChannel() {
  window.addEventListener("storage", handlePresenterStorageSignal);
  if (!("BroadcastChannel" in window)) return;
  state.presenter.channel = new BroadcastChannel(PRESENTER_CHANNEL);
  state.presenter.channel.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === "presenter-ready") {
      markPresenterOutputConnected(message.clientId);
      publishPresenterState();
      return;
    }
    if (message.type === "presenter-heartbeat") {
      markPresenterOutputConnected(message.clientId);
      return;
    }
    if (message.type === "presenter-output-disconnect") {
      markPresenterOutputDisconnected(message.clientId);
      return;
    }
    if (message.type === "presenter-control") {
      markPresenterOutputConnected(message.clientId);
      runPresenterAction(message.action, state.presenter.serviceId, {
        index: Number.isFinite(Number(message.index)) ? Number(message.index) : undefined,
      });
      return;
    }
    if (message.type === "presenter-jump-draft") {
      if (message.value) setPresenterJumpDraft(message.value, state.presenter.serviceId);
      else clearPresenterJumpDraft(state.presenter.serviceId);
    }
  };
}

function handlePresenterStorageSignal(event) {
  if (event.key !== PRESENTER_SIGNAL_KEY || !event.newValue) return;
  try {
    const message = JSON.parse(event.newValue);
    if (message.type === "presenter-output-disconnect") markPresenterOutputDisconnected(message.clientId);
  } catch {
    // Ignore malformed cross-window presenter signals.
  }
}

function markPresenterOutputConnected(clientId = "") {
  const wasConnected = state.presenter.outputConnectedAt
    && Date.now() - state.presenter.outputConnectedAt <= PRESENTER_OUTPUT_HEARTBEAT_TTL_MS;
  state.presenter.outputConnectedAt = Date.now();
  if (clientId) state.presenter.outputClientId = clientId;
  if (!state.presenter.outputWindowMonitor) startPresenterOutputWindowMonitor(state.presenter.serviceId);
  if (!wasConnected) refreshPresenterOutputConnectionState();
}

function markPresenterOutputDisconnected(clientId = "") {
  if (clientId && state.presenter.outputClientId && clientId !== state.presenter.outputClientId) return;
  state.presenter.outputWindow = null;
  state.presenter.outputConnectedAt = 0;
  state.presenter.outputClientId = "";
  stopPresenterOutputWindowMonitor();
  refreshPresenterOutputConnectionState();
  if (state.presenter.serviceId) renderPresenterControlState(state.presenter.serviceId);
}

function refreshPresenterOutputConnectionState() {
  const serviceIds = new Set([state.presenter.serviceId, state.selectedServiceId].filter(Boolean));
  serviceIds.forEach((serviceId) => renderPresenterControlState(serviceId));
}

function publishPresenterState(options = {}) {
  const payload = presenterStatePayload();
  if (!options.force && !payload.serviceId && !payload.slides.length) return;
  publishPresenterPayload(payload);
}

function publishPresenterPayload(payload) {
  safeStorageSet("local", PRESENTER_STORAGE_KEY, JSON.stringify(payload));
  state.presenter.channel?.postMessage({ type: "presenter-state", payload });
}

function presenterOutputUrl(options = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("output", "presenter");
  if (options.fullscreen) url.searchParams.set("fullscreen", "1");
  url.hash = "";
  return url.toString();
}

function presenterScreenKey(screen) {
  return `${screen.left ?? 0},${screen.top ?? 0}`;
}

async function requestPresenterScreens() {
  if (!window.getScreenDetails || !window.isSecureContext) return;
  try {
    const details = await window.getScreenDetails();
    const apply = () => {
      state.presenter.screens = [...(details.screens || [])].map((screen, index) => ({
        key: presenterScreenKey(screen),
        label: screen.isPrimary ? `Display ${index + 1} (Primary)` : `Display ${index + 1}`,
        isPrimary: Boolean(screen.isPrimary),
      }));
      if (state.presenter.serviceId) renderPresenterControlState(state.presenter.serviceId);
    };
    apply();
    details.addEventListener?.("screenschange", apply);
  } catch {
    showToast("디스플레이 정보를 읽지 못했습니다. 브라우저 권한을 확인해 주세요.", "error");
  }
}

function findPresenterTargetScreen(screens, currentScreen) {
  const selectedKey = state.presenter.selectedScreenId;
  return (selectedKey && screens.find((screen) => presenterScreenKey(screen) === selectedKey))
    || screens.find((screen) => !screen.isPrimary)
    || screens.find((screen) => screen !== currentScreen);
}

async function resolvePresenterTargetScreenRect() {
  if (!window.getScreenDetails || !window.isSecureContext) return null;
  try {
    const details = await window.getScreenDetails();
    const target = findPresenterTargetScreen([...(details.screens || [])], details.currentScreen);
    if (!target) return null;
    return {
      left: target.availLeft ?? target.left ?? 0,
      top: target.availTop ?? target.top ?? 0,
      width: target.availWidth || target.width || 1280,
      height: target.availHeight || target.height || 720,
    };
  } catch {
    return null;
  }
}

async function positionPresenterOutputWindow(outputWindow) {
  if (!outputWindow || !window.getScreenDetails || !window.isSecureContext) return;
  try {
    const details = await window.getScreenDetails();
    const screens = [...(details.screens || [])];
    const target = findPresenterTargetScreen(screens, details.currentScreen);
    if (!target) return;
    const left = target.availLeft ?? target.left ?? 0;
    const top = target.availTop ?? target.top ?? 0;
    const width = target.availWidth || target.width || 1280;
    const height = target.availHeight || target.height || 720;
    outputWindow.moveTo?.(left, top);
    outputWindow.resizeTo?.(width, height);
  } catch {
    // Manual placement remains the fallback when window-management permission is unavailable.
  }
}

function requestOutputFullscreen(outputWindow, options = {}) {
  const delays = options.retry ? PRESENTER_FULLSCREEN_RETRY_DELAYS_MS : [0];
  delays.forEach((delay) => {
    window.setTimeout(() => {
      try {
        if (!outputWindow || outputWindow.closed) return;
        outputWindow.document?.documentElement?.requestFullscreen?.().catch?.(() => {});
      } catch {
        // Browsers often require a direct activation in the output window.
      }
    }, delay);
  });
}

function handlePresenterShortcut(event) {
  const presenterServiceId = state.presenter.serviceId;
  if (state.module !== "service" || !presenterServiceId) return false;
  if (shouldKeepHorizontalNavigationInFocusedControl(event.target)) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const activeServiceSelected = state.selectedServiceId === presenterServiceId;

  if (event.key === "Escape") {
    event.preventDefault();
    if (activeServiceSelected && state.presenter.jumpDraft) {
      clearPresenterJumpDraft(presenterServiceId);
      return true;
    }
    const now = Date.now();
    if (now - (state.presenter.exitArmedAt || 0) <= PRESENTER_OUTPUT_ESCAPE_EXIT_MS) {
      stopPresenterOutput(presenterServiceId);
      return true;
    }
    state.presenter.exitArmedAt = now;
    return true;
  }

  if (!activeServiceSelected) return false;

  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    setPresenterJumpDraft(`${state.presenter.jumpDraft || ""}${event.key}`, presenterServiceId);
    return true;
  }

  if (event.key === "Enter" && state.presenter.jumpDraft) {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    commitPresenterJumpDraft(presenterServiceId);
    return true;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    runPresenterAction("next", presenterServiceId);
    return true;
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    runPresenterAction("prev", presenterServiceId);
    return true;
  }

  if (event.key === "Home") {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    runPresenterAction("first", presenterServiceId);
    return true;
  }

  if (event.key === "End") {
    event.preventDefault();
    state.presenter.exitArmedAt = 0;
    runPresenterAction("last", presenterServiceId);
    return true;
  }

  return false;
}

function isPresenterOutputRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get("output") === "presenter" || params.get("mindex-output") === "presenter";
}

function initPresenterOutput() {
  document.title = "MINDEX Output";
  document.documentElement.classList.add("presenter-output-document");
  document.body.className = "presenter-output-body";
  document.body.innerHTML = `
    <main id="presenterOutputRoot" class="presenter-output-root no-chromakey" aria-live="polite"></main>
  `;

  let currentPayload = null;
  let channel = null;
  let jumpDraft = "";
  let exitArmedAt = 0;
  const outputClientId = `presenter-output:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let heartbeatTimer = null;
  const applyPayload = (payload) => {
    currentPayload = normalizePresenterPayload(payload);
    renderPresenterOutput(currentPayload);
  };
  const postHeartbeat = () => {
    channel?.postMessage({ type: "presenter-heartbeat", clientId: outputClientId });
  };
  const closeOutputChannel = () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    channel?.close?.();
    channel = null;
  };
  const requestPresenterOutputStop = () => {
    channel?.postMessage({ type: "presenter-control", action: "stop", clientId: outputClientId });
    currentPayload = normalizePresenterPayload(presenterStoppedPayload());
    renderPresenterOutput(currentPayload);
    window.setTimeout(() => {
      closeOutputChannel();
      window.close();
    }, 40);
  };
  const postDisconnect = () => {
    const payload = {
      type: "presenter-output-disconnect",
      clientId: outputClientId,
      updatedAt: Date.now(),
    };
    channel?.postMessage(payload);
    safeStorageSet("local", PRESENTER_SIGNAL_KEY, JSON.stringify(payload));
  };

  const renderStoredState = () => {
    try {
      const stored = JSON.parse(safeStorageGet("local", PRESENTER_STORAGE_KEY, "null") || "null");
      applyPayload(stored);
    } catch {
      applyPayload(null);
    }
  };

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(PRESENTER_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === "presenter-state") applyPayload(event.data.payload);
    };
    window.setTimeout(() => {
      channel.postMessage({ type: "presenter-ready", clientId: outputClientId });
      postHeartbeat();
    }, 50);
    heartbeatTimer = window.setInterval(postHeartbeat, PRESENTER_OUTPUT_HEARTBEAT_INTERVAL_MS);
  }
  window.addEventListener("pagehide", () => {
    postDisconnect();
    closeOutputChannel();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PRESENTER_STORAGE_KEY) renderStoredState();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      document.documentElement.requestFullscreen?.().catch?.(() => {});
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && /^\d$/.test(event.key)) {
      event.preventDefault();
      jumpDraft = `${jumpDraft}${event.key}`.slice(0, PRESENTER_JUMP_MAX_DIGITS);
      channel?.postMessage({ type: "presenter-jump-draft", value: jumpDraft });
      postHeartbeat();
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "Enter" && jumpDraft) {
      event.preventDefault();
      const index = Number(jumpDraft) - 1;
      jumpDraft = "";
      channel?.postMessage({ type: "presenter-jump-draft", value: "" });
      postHeartbeat();
      if (channel) {
        channel.postMessage({ type: "presenter-control", action: "jump", index, clientId: outputClientId });
      } else {
        currentPayload = applyPresenterActionToPayload(currentPayload, "jump", { index });
        publishPresenterPayload(currentPayload);
        renderPresenterOutput(currentPayload);
      }
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "Escape" && jumpDraft) {
      event.preventDefault();
      jumpDraft = "";
      channel?.postMessage({ type: "presenter-jump-draft", value: "" });
      postHeartbeat();
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "Escape") {
      event.preventDefault();
      const now = Date.now();
      if (now - exitArmedAt <= PRESENTER_OUTPUT_ESCAPE_EXIT_MS) {
        requestPresenterOutputStop();
        return;
      }
      exitArmedAt = now;
      postHeartbeat();
      return;
    }
    const action = presenterOutputKeyAction(event);
    if (action) {
      event.preventDefault();
      jumpDraft = "";
      channel?.postMessage({ type: "presenter-jump-draft", value: "" });
      postHeartbeat();
      if (channel) {
        channel.postMessage({ type: "presenter-control", action, clientId: outputClientId });
      } else {
        currentPayload = applyPresenterActionToPayload(currentPayload, action);
        publishPresenterPayload(currentPayload);
        renderPresenterOutput(currentPayload);
      }
    }
  });
  window.addEventListener("pointerdown", () => {
    document.documentElement.requestFullscreen?.().catch?.(() => {});
  }, { once: true });
  document.addEventListener("fullscreenchange", () => {
    if (shouldAutoFullscreenPresenterOutput() && !document.fullscreenElement) exitArmedAt = Date.now();
  });

  renderStoredState();
  if (shouldAutoFullscreenPresenterOutput()) requestLocalPresenterFullscreen({ retry: true });
}

function shouldAutoFullscreenPresenterOutput() {
  return new URLSearchParams(window.location.search).get("fullscreen") === "1";
}

function requestLocalPresenterFullscreen(options = {}) {
  const delays = options.retry ? PRESENTER_FULLSCREEN_RETRY_DELAYS_MS : [0];
  delays.forEach((delay) => {
    window.setTimeout(() => {
      document.documentElement.requestFullscreen?.().catch?.(() => {});
    }, delay);
  });
}

function presenterOutputKeyAction(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return "";
  if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") return "next";
  if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") return "prev";
  if (event.key === "Home") return "first";
  if (event.key === "End") return "last";
  return "";
}

function normalizePresenterPayload(payload) {
  const slides = Array.isArray(payload?.slides) ? payload.slides : [];
  return {
    serviceId: payload?.serviceId || null,
    serviceType: payload?.serviceType || "",
    serviceTitle: payload?.serviceTitle || "",
    chromakey: payload ? payload.chromakey !== false : false,
    outputTheme: payload?.outputTheme || presenterOutputTheme(payload?.serviceType),
    backgroundImage: payload?.backgroundImage || "",
    slides,
    index: clampPresenterIndex(payload?.index, slides.length),
    safetyBlank: Boolean(payload?.safetyBlank),
    liveScripture: normalizeLiveScripturePayload(payload?.liveScripture),
    livePraise: normalizeLivePraisePayload(payload?.livePraise),
    updatedAt: Number(payload?.updatedAt) || Date.now(),
  };
}

function normalizeLiveScripturePayload(value) {
  if (!value?.active || !value?.slide) return null;
  return {
    reference: value.reference || value.slide.title || "",
    active: true,
    slide: value.slide,
  };
}

function normalizeLivePraisePayload(value) {
  const slides = Array.isArray(value?.slides) ? value.slides.filter(Boolean) : [];
  if (!value?.active || !slides.length) return null;
  return {
    query: value.query || value.draft || "",
    active: true,
    slides,
    index: clampPresenterIndex(value.index, slides.length),
    songId: value.songId || "",
    versionId: value.versionId || "",
  };
}

function applyPresenterActionToPayload(payload, action, options = {}) {
  const next = normalizePresenterPayload(payload);
  if (next.livePraise?.active && ["next", "prev", "first", "last"].includes(action)) {
    const count = next.livePraise.slides.length;
    if (action === "next") next.livePraise.index = Math.min(next.livePraise.index + 1, count - 1);
    else if (action === "prev") next.livePraise.index = Math.max(next.livePraise.index - 1, 0);
    else if (action === "first") next.livePraise.index = 0;
    else if (action === "last") next.livePraise.index = count - 1;
    next.safetyBlank = false;
    next.updatedAt = Date.now();
    return next;
  }
  if (["next", "prev", "first", "last", "jump"].includes(action)) {
    next.liveScripture = null;
    next.livePraise = null;
  }
  if (action === "next" && next.slides.length) {
    next.safetyBlank = false;
    next.index = Math.min(next.index + 1, next.slides.length - 1);
  } else if (action === "prev" && next.slides.length) {
    next.safetyBlank = false;
    next.index = Math.max(next.index - 1, 0);
  } else if (action === "first" && next.slides.length) {
    next.safetyBlank = false;
    next.index = 0;
  } else if (action === "last" && next.slides.length) {
    next.safetyBlank = false;
    next.index = next.slides.length - 1;
  } else if (action === "jump" && next.slides.length) {
    const requestedIndex = Number(options.index);
    if (isValidPresenterIndex(requestedIndex, next.slides.length)) {
      next.index = requestedIndex;
      next.safetyBlank = false;
    } else {
      next.safetyBlank = true;
    }
  }
  next.updatedAt = Date.now();
  return next;
}

function renderPresenterOutput(payload) {
  const root = document.getElementById("presenterOutputRoot");
  if (!root) return;
  const slides = Array.isArray(payload?.slides) ? payload.slides : [];
  const livePraiseSlide = payload?.livePraise?.active
    ? payload.livePraise.slides?.[clampPresenterIndex(payload.livePraise.index, payload.livePraise.slides.length)]
    : null;
  const liveSlide = livePraiseSlide || (payload?.liveScripture?.active ? payload.liveScripture.slide : null);
  const slide = payload?.safetyBlank
    ? presenterSafetyBlankSlide()
    : liveSlide || slides[clampPresenterIndex(payload?.index, slides.length)];
  const backgroundImage = payload?.backgroundImage || "";
  const cleanOutput = payload?.chromakey === false;
  document.body.classList.toggle("presenter-output-body--clean", cleanOutput);
  document.body.classList.toggle("has-background", Boolean(backgroundImage && cleanOutput));
  root.classList.toggle("no-chromakey", payload?.chromakey === false);
  root.classList.toggle("has-background", Boolean(backgroundImage && payload?.chromakey === false));
  root.dataset.serviceType = payload?.serviceType || "";
  root.dataset.outputTheme = payload?.outputTheme || presenterOutputTheme(payload?.serviceType);
  if (backgroundImage && cleanOutput) {
    document.body.style.setProperty("--presenter-bg-image", `url("${backgroundImage}")`);
    root.style.setProperty("--presenter-bg-image", `url("${backgroundImage}")`);
  } else {
    document.body.style.removeProperty("--presenter-bg-image");
    root.style.removeProperty("--presenter-bg-image");
  }

  if (!slide) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = renderPresenterSlideFrame(slide);
}

function renderPresenterSlideFrame(slide, options = {}) {
  const slideClass = presenterSlideRenderClass(slide);
  const extraClasses = presenterSlideExtraClasses(slide);
  const body = options.preview ? renderPresenterSlidePreviewBody(slide) : renderPresenterSlideBody(slide);
  return `
    <section class="presenter-slide presenter-slide--${escapeAttr(slideClass)}${extraClasses ? ` ${escapeAttr(extraClasses)}` : ""}" data-element-type="${escapeAttr(presenterSlideElementType(slide))}" data-slide-layout="${escapeAttr(presenterSlideLayout(slide))}">
      ${renderPresenterSlideMeta(slide)}
      ${body}
    </section>
  `;
}

function presenterSlideExtraClasses(slide) {
  return slide?.sourceType === "score" || slide?.componentType === "score" || slide?.scoreBackground
    ? "presenter-slide--score"
    : "";
}

function presenterSafetyBlankSlide() {
  return {
    id: "presenter:safety-blank",
    elementType: PRESENTER_ELEMENT_TYPES.BLANK,
    layout: PRESENTER_SLIDE_LAYOUTS.BLANK,
    type: "blank",
    title: "빈 화면",
    text: "",
  };
}

function renderPresenterSlideMeta(slide) {
  if (!presenterSlideHasMeta(slide)) return "";
  const marker = presenterVisibleMeta(slide);
  if (!marker) return "";
  return `<div class="presenter-slide-meta">${escapeHtml(marker)}</div>`;
}

function presenterVisibleMeta(slide) {
  const marker = [slide?.marker, slide?.label].filter(Boolean).join(" · ").trim();
  if (!marker) return "";
  if (presenterLabelDuplicatesSlideText(marker, slide)) return "";
  return marker;
}

function renderPresenterSlideBody(slide) {
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA && elementType === PRESENTER_ELEMENT_TYPES.VIDEO) return renderPresenterVideoSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA && elementType === PRESENTER_ELEMENT_TYPES.IMAGE) return renderPresenterImageSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.FILE) return renderPresenterFileSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT && elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return renderPresenterTitleAssigneeSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return "";
  return `<div class="presenter-slide-text">${renderPresenterSlideText(slide)}</div>`;
}

function renderPresenterSlidePreviewBody(slide) {
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA && elementType === PRESENTER_ELEMENT_TYPES.VIDEO) {
    const source = normalizePresenterMediaSource(slide.videoSrc || slide.text);
    if (!source) return "";
    return renderPresenterPreviewFileSlide(slide, "VIDEO", source);
  }
  return renderPresenterSlideBody(slide);
}

function renderPresenterPreviewFileSlide(slide, typeLabel, source) {
  return `
    <div class="presenter-slide-file">
      <small>${escapeHtml(typeLabel)}</small>
      <strong>${escapeHtml(presenterFileDisplayTitle({ ...slide, asset: { ...slide.asset, url: source } }, typeLabel))}</strong>
    </div>
  `;
}

function renderPresenterVideoSlide(slide) {
  const source = normalizePresenterMediaSource(slide.videoSrc || slide.text);
  if (!source) return "";
  return `
    <video class="presenter-video" src="${escapeAttr(source)}" autoplay muted loop playsinline preload="auto"></video>
  `;
}

function renderPresenterImageSlide(slide) {
  const source = normalizePresenterMediaSource(slide.imageSrc || slide.asset?.url || slide.text);
  if (!source) return "";
  return `<img class="presenter-image" src="${escapeAttr(source)}" alt="" />`;
}

function renderPresenterTitleAssigneeSlide(slide) {
  const title = String(slide.title || slide.text || slide.label || "").trim();
  const assignee = String(slide.assignee || slide.subtitle || "").trim();
  return `
    <div class="presenter-slide-text presenter-title-assignee">
      <span class="presenter-title-assignee-title" style="--line-chars: ${escapeAttr(Math.max(1, title.length))}">${escapeHtml(title)}</span>
      ${assignee ? `<span class="presenter-title-assignee-person" style="--line-chars: ${escapeAttr(Math.max(1, assignee.length))}">${escapeHtml(assignee)}</span>` : ""}
    </div>
  `;
}

function renderPresenterFileSlide(slide) {
  const asset = normalizeServiceAsset(slide.asset);
  const typeLabel = presenterFileTypeLabel(slide.sourceType || slide.componentType || asset.kind || "file");
  const title = presenterFileDisplayTitle({ ...slide, asset }, typeLabel);
  return `
    <div class="presenter-slide-file">
      <small>${escapeHtml(typeLabel)}</small>
      <strong>${escapeHtml(title)}</strong>
    </div>
  `;
}

function renderPresenterSlideText(slide) {
  return presenterDisplayLines(slide)
    .map((line) => `<span style="--line-chars: ${presenterLineCharEstimate(line)}">${escapeHtml(line || " ")}</span>`)
    .join("");
}

function presenterDisplayLines(slide) {
  const baseText = slide?.text || slide?.title || "";
  const lowerBar = presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  const text = lowerBar ? slide?.text : baseText;
  const lines = String(text || "").split(/\n/);
  if (lowerBar) return lines;

  const deduped = [];
  for (const line of lines) {
    const previous = deduped[deduped.length - 1];
    if (previous !== undefined && normalizeTitle(previous) === normalizeTitle(line)) continue;
    deduped.push(line);
  }
  return deduped.length ? deduped : [""];
}

function presenterLineCharEstimate(line) {
  const text = String(line || "").replace(/\s+/g, " ").trim();
  if (!text) return 1;
  let score = 0;
  for (const char of text) {
    if (/\s/.test(char)) score += 0.35;
    else if (/[A-Za-z0-9]/.test(char)) score += 0.58;
    else score += 1;
  }
  return Math.max(1, Math.ceil(score));
}

async function createService() {
  if (!state.newServiceForm || !requireClient() || state.saving) return;
  const form = state.newServiceForm;
  const typeId = form.type_id || state.selectedServiceTypeId;
  const date = String(form.date || "").trim();
  if (!typeId || !date) {
    showToast("예배 날짜를 입력해 주세요.", "error");
    return;
  }

  const serviceId = createUuid();
  const tags = String(form.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const servicePayload = {
    id: serviceId,
    service_type_id: canonicalWorshipServiceTypeId(typeId),
    service_date: date,
    title: String(form.title || "").trim(),
    status: "draft",
    worship_leader: "",
    praise_leader: serviceUsesPraiseLeader(typeId) ? String(form.leader || "").trim() : "",
    tags,
    source_kind: "mindex",
    source_ref: { created_from: "mindex_template", app_service_type_id: typeId },
    notes: "",
  };
  const scaffold = buildWorshipServiceScaffold(serviceId, typeId);

  state.saving = true;
  updateSaveState();
  try {
    const { data: serviceRow, error: serviceError } = await state.client
      .from("mindex_worship_services")
      .insert(servicePayload)
      .select("*")
      .single();
    if (serviceError) throw serviceError;

    if (scaffold.sections.length) {
      const { data: sectionRows, error: sectionError } = await state.client
        .from("mindex_worship_sections")
        .insert(scaffold.sections)
        .select("*");
      if (sectionError) throw sectionError;
      state.worshipSections.push(...(sectionRows || scaffold.sections));
    }
    if (scaffold.elements.length) {
      const { data: elementRows, error: elementError } = await state.client
        .from("mindex_worship_elements")
        .insert(scaffold.elements)
        .select("*");
      if (elementError) throw elementError;
      state.worshipElements.push(...(elementRows || scaffold.elements));
    }

    const service = normalizeWorshipService(serviceRow || servicePayload);
    state.services = sortServicesByDate([service, ...state.services]);
    state.serviceItems[service.id] = groupWorshipElements(scaffold.sections, scaffold.elements)[service.id] || [];
    state.selectedServiceTypeId = service.type_id;
    state.selectedServiceId = service.id;
    state.selectedServiceItemIndex = 0;
    state.newServiceForm = null;
    state.dirty.service = false;
    renderServiceList();
    renderServiceDetail();
    syncBrowserHistory();
    showToast("예배와 기본 요소를 추가했습니다.");
  } catch (error) {
    showToast(error.message || "예배 추가 실패.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function deleteService(serviceId) {
  void serviceId;
}

function selectService(id) {
  if (id !== state.selectedServiceId && !confirmDiscardServiceChanges()) return;
  state.selectedServiceId = id;
  state.selectedServiceItemIndex = 0;
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
