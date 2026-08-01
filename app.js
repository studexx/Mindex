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
let songLoadPromise = null;
let serviceDataLoadPromise = null;
let songCatalogLoaded = false;
let backgroundSongLoadScheduled = false;
const serviceScriptureChapterLoadPromises = new Map();

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
const PRESENTER_OUTPUT_IMAGE_PRELOAD_RADIUS = 8;
const PRESENTER_OUTPUT_SCORE_PRELOAD_LIMIT = 32;
const PRESENTER_OUTPUT_IMAGE_PRELOAD_LIMIT = 360;
const PRESENTER_OUTPUT_WARMUP_EAGER_COUNT = 24;
const PRESENTER_OUTPUT_WARMUP_BATCH_SIZE = 2;
const PRESENTER_OUTPUT_WARMUP_IDLE_TIMEOUT_MS = 900;
const PRESENTER_CONTROLLER_RESTORE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const presenterOutputImagePreloadCache = new Map();
const presenterOutputRenderState = { token: 0, commitToken: 0, autoAdvanceTimer: null };
const presenterOutputImageWarmupState = {
  key: "",
  serviceId: "",
  sources: [],
  index: 0,
  handle: null,
  onProgress: null,
};
const PRESENTER_ROLE_ALIASES = {
  ready: "ready",
  preparation: "ready",
  prep: "ready",
  "준비": "ready",
  waiting: "waiting_loop",
  wait: "waiting_loop",
  waiting_loop: "waiting_loop",
  wait_loop: "waiting_loop",
  loop: "waiting_loop",
  "대기": "waiting_loop",
  "대기영상": "waiting_loop",
  "대기 영상": "waiting_loop",
  intro: "intro",
  countdown: "intro",
  count_down: "intro",
  opening: "intro",
  "인트로": "intro",
  "카운트다운": "intro",
  "시작영상": "intro",
  "시작 영상": "intro",
  still: "still",
  first_screen: "still",
  first_slide: "still",
  fallback: "still",
  "첫화면": "still",
  "첫 화면": "still",
  "정지화면": "still",
  "정지 화면": "still",
};
const UI_DEFAULT_LOCALE = "ko";
const UI_FALLBACK_LOCALE = "en";
const UI_MESSAGES = {
  ko: {
    "presenter.controls": "프레젠터 컨트롤",
    "presenter.action.present": "송출 시작",
    "presenter.action.stop": "송출 종료",
    "presenter.action.detectDisplays": "화면 감지",
    "presenter.action.jump": "이동",
    "presenter.action.prev": "이전 슬라이드",
    "presenter.action.next": "다음 슬라이드",
    "presenter.action.jumpToSlide": "슬라이드로 이동",
    "presenter.action.showScripture": "성구 송출",
    "presenter.action.hideScripture": "성구 숨김",
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
    "presenter.help.title": "프레젠터 도움말",
  },
  en: {
    "presenter.controls": "Presenter controls",
    "presenter.action.present": "Present",
    "presenter.action.stop": "Stop",
    "presenter.action.detectDisplays": "Detect displays",
    "presenter.action.jump": "Go",
    "presenter.action.prev": "Previous slide",
    "presenter.action.next": "Next slide",
    "presenter.action.jumpToSlide": "Jump to slide",
    "presenter.action.showScripture": "Show scripture",
    "presenter.action.hideScripture": "Hide scripture",
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
    "presenter.help.title": "Presenter help",
  },
};
let currentUiLocale = UI_DEFAULT_LOCALE;

const SYSTEM_THEME_QUERY = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
const TITLE_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

const HANGUL_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CONTENT_MODULES = ["service", "presenter", "scripture", "praise", "calendar", "references"];
const ROUTE_MODULES = ["home", ...CONTENT_MODULES];
const SERVICE_FILTERS = ["all", "public", "ministry", "special"];
const MINDEX_TAB_STATE_STORAGE_KEY = "mindex.pageTabs.v1";
const HOME_PAGE_TAB_ID = "tab-home";
const HYMN_SCORE_MANIFEST_URL = "assets/hymn-scores/manifest.json";
const SERVICE_ELEMENT_LABELS = {
  blank: "빈 화면",
  title: "제목",
  video: "동영상",
  image: "이미지",
  score: "악보",
  audio: "오디오",
  praise: "찬양",
  scripture: "말씀",
  scripture_reading: "성경봉독",
  scripture_body: "성경 본문",
  plain_text: "일반 텍스트",
  title_content: "제목 / 내용",
  title_person: "제목 / 담당자",
  body: "본문",
  live_scripture: "실시간 성구",
  template: "슬라이드 템플릿",
  file: "파일",
};
const PRESENTER_ELEMENT_TYPES = {
  BLANK: "blank",
  TITLE: "title",
  PLAIN_TEXT: "plain_text",
  TITLE_CONTENT: "title_content",
  TITLE_ASSIGNEE: "title_assignee",
  BODY_TEXT: "body_text",
  PRAISE: "praise",
  SCRIPTURE_READING: "scripture_reading",
  SCRIPTURE_TEXT: "scripture_text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
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
const PRESENTER_CHROMAKEY_VIDEO_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%2300ff00'/%3E%3C/svg%3E";
const PRESENTER_MEDIA_STORAGE_BUCKET = "mindex-worship-media";
const PRESENTER_REFERENCE_MEDIA_SECTION_KEYS = new Set(["sermon", "announcements"]);
const PRESENTER_REFERENCE_MEDIA_ACCEPT = "image/*,video/*,audio/*";
const PRESENTER_REFERENCE_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
const SERVICE_FUTURE_LOOKAHEAD_DAYS = 7;
const SERVICE_LIST_PANEL_ID = "__list";
const SERVICE_TEMPLATES_PANEL_ID = "__templates";
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
  ["young_adult_prayer", "청년부", "기도자"],
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
  songLookupSource: null,
  songById: new Map(),
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
  pageTabs: [],
  pageTabIndex: 0,
  applyingPageTab: false,
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
  worshipSections: [],
  worshipElements: [],
  loadedWorshipServiceIds: new Set(),
  templateElementSuppressions: new Map(),
  worshipTemplates: [],
  worshipTemplateItems: [],
  worshipPresenterSlides: {},
  worshipPresenterSlidesLoaded: false,
  loadedWorshipPresenterServiceIds: new Set(),
  hymnScoreManifest: {},
  hymnScoreManifestLoaded: false,
  selectedWorshipBackgroundFile: "",
  referenceLinks: [],
  referenceLinksLoaded: false,
  referenceError: "",
  worshipBackgroundRegistry: {},
  referenceGroupSupported: false,
  songRelationsSupported: false,
  editingReferenceId: null,
  editingReferenceGroupKey: null,
  uiVerses: {
    home: [],
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
  selectedServiceTypeId: null,
  selectedServiceId: null,
  selectedServiceItemIndex: null,
  presenterBoardSelection: {
    serviceId: null,
    elementKey: "",
    indexes: [],
    anchorIndex: null,
    drag: null,
    clipboard: null,
  },
  presenterPreparationDrafts: {},
  presenterPreparationApplyingServiceIds: new Set(),
  presenterSectionEditor: null,
  presenterBulletinServiceId: null,
  serviceFilter: "all",
  serviceError: "",
  newServiceForm: null,
  presenter: {
    channel: null,
    outputWindow: null,
    outputWindowMonitor: null,
    outputConnectedAt: 0,
    outputStopAt: 0,
    outputStoppingClientId: "",
    outputClientId: "",
    outputWarmup: null,
    serviceId: null,
    slides: [],
    sourceItems: null,
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
    restorePayload: null,
  },
  serviceMusic: {
    audio: null,
    objectUrl: "",
    fileName: "",
    mode: "manual",
    sourceKey: "",
    playing: false,
    volumeLevel: 3,
  },
  servicePrepEditorOpenId: null,
  calendarData: [],
  calendarLoaded: false,
  calendarLoading: false,
  calendarError: "",
  calendarScrollTargetMonth: null,
  calendarAutoScrolledMonth: null,
  calendarDetailTab: "departments",
  calendarCellSaves: new Map(),
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
  state.worshipBackgroundRegistry = readWorshipBackgroundRegistry();
  applyLinkState(linkParams);
  readPageTabsState();
  primePresenterControllerRestore();
  bindStaticEvents();
  bindElectronDesktopEvents();
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

function bindElectronDesktopEvents() {
  const desktop = window.mindexElectron;
  if (!desktop?.isDesktop) return;
  desktop.onUpdateAvailable?.((info) => {
    const version = info?.version ? ` ${info.version}` : "";
    showToast(`새 버전${version}이 있습니다.`);
    window.setTimeout(() => {
      if (window.confirm("Mindex 새 버전을 내려받을까요?")) {
        desktop.downloadUpdate?.().catch((error) => {
          showToast(error?.message || "업데이트 다운로드를 시작하지 못했습니다.", "error");
        });
      }
    }, 300);
  });
  desktop.onUpdateProgress?.((progress) => {
    const percent = Number(progress?.percent);
    if (Number.isFinite(percent) && percent >= 99) showToast("업데이트 다운로드를 마무리하고 있습니다.");
  });
  desktop.onUpdateDownloaded?.(() => {
    showToast("업데이트 준비가 끝났습니다.");
    window.setTimeout(() => {
      if (window.confirm("지금 재시작해서 업데이트할까요?")) {
        desktop.installUpdate?.().catch((error) => {
          showToast(error?.message || "업데이트를 설치하지 못했습니다.", "error");
        });
      }
    }, 300);
  });
  desktop.onUpdateError?.((error) => {
    showToast(error?.message || "업데이트 확인에 실패했습니다.", "error");
  });
  desktop.checkForUpdates?.().catch(() => {});
}

function loadInitialData() {
  if (state.module === "praise" || state.selectedSongId) {
    loadSongs();
  } else if (!isServiceDataModule()) {
    scheduleBackgroundSongLoad();
  }
  if (state.module === "scripture" || state.selectedScriptureId || state.selectedBookCode) {
    loadScriptureBooks({ silent: true });
    loadScriptures({ silent: true });
    loadBibleTranslations({ silent: true });
  }
  if (isServiceDataModule()) loadServiceData({ silent: true });
  if (state.module === "references") loadReferenceLinks({ silent: true });
  if (state.module === "calendar") loadCalendarData({ silent: true });
}

function isServiceDataModule(moduleName = state.module) {
  // The home screen is the weekly worship board, so it needs the same data.
  return moduleName === "home" || moduleName === "service" || moduleName === "presenter";
}

function renderCurrentServiceModuleDetail() {
  if (state.module === "presenter") renderPresenterDetail();
  else renderServiceDetail();
}

async function loadHymnScoreManifest({ silent = false } = {}) {
  if (state.hymnScoreManifestLoaded) return;
  try {
    const response = await fetch(HYMN_SCORE_MANIFEST_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.hymnScoreManifest = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    state.hymnScoreManifestLoaded = true;
    if (isServiceDataModule()) render();
  } catch (err) {
    state.hymnScoreManifest = {};
    state.hymnScoreManifestLoaded = true;
    if (!silent) console.warn("[Presenter] hymn score manifest unavailable:", err);
  }
}

function cacheRefs() {
  refs.brandNameHome = document.getElementById("brandNameHome");
  refs.sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  refs.moduleButtons = [...document.querySelectorAll(".module-tab[data-module]")];
  refs.pageTabs = document.getElementById("pageTabs");
  refs.pageTabAddBtn = document.getElementById("pageTabAddBtn");
  refs.pageTabLabel = document.getElementById("pageTabLabel");
  refs.navSidebar = document.querySelector(".nav-sidebar");
  refs.navButtons = [...document.querySelectorAll(".nav-sidebar [data-home-module]")];
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
  refs.sidebarToggleBtn?.addEventListener("click", handleSidebarToggle);
  refs.brandNameHome?.addEventListener("click", goHome);
  refs.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => switchModule(button.dataset.module));
  });
  refs.pageTabAddBtn?.addEventListener("click", openNewPageTab);
  refs.pageTabs?.addEventListener("click", handlePageTabClick);
  refs.pageTabs?.addEventListener("dragstart", handlePageTabDragStart);
  refs.pageTabs?.addEventListener("dragover", handlePageTabDragOver);
  refs.pageTabs?.addEventListener("drop", handlePageTabDrop);
  refs.pageTabs?.addEventListener("dragend", clearPageTabDragState);
  refs.navButtons?.forEach((button) => {
    button.addEventListener("click", () => handleNavigationRailClick(button));
  });
  refs.themeBtn.addEventListener("click", toggleTheme);
  refs.newSongBtn?.addEventListener("click", () => createPraiseSong());
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
    if (state.module === "references") renderDetail();
    if (isServiceDataModule()) renderCurrentServiceModuleDetail();
  });
  refs.searchInput.addEventListener("keydown", handleSearchKeydown);
  refs.listFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-list-filter]");
    if (!button) return;
    saveCurrentListScroll();
    if (isServiceDataModule()) {
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
  refs.songList.addEventListener("keydown", handleDetailKeydown);
  refs.songList.addEventListener("input", handleDetailInput);
  refs.songList.addEventListener("paste", handlePresenterPreparationPaste);
  refs.songList.addEventListener("change", handleDetailChange);

  refs.songList.addEventListener("click", async (event) => {
    const preparationApply = event.target.closest("[data-presenter-preparation-apply]");
    if (preparationApply) {
      applyPresenterPreparationInput(preparationApply.dataset.serviceId || state.selectedServiceId);
      return;
    }

    if (isPresenterPreparationInputEvent(event)) return;

    const homeNextServiceAction = event.target.closest("[data-home-next-service-action]");
    if (homeNextServiceAction) {
      await openHomeNextService(homeNextServiceAction.dataset.homeNextServiceAction, homeNextServiceAction.dataset.homeServiceId);
      return;
    }

    const homeModule = event.target.closest("[data-home-module]");
    if (homeModule) {
      await switchModule(homeModule.dataset.homeModule);
      return;
    }

    const referenceItem = event.target.closest("[data-reference-id]");
    if (referenceItem) {
      const link = getReferenceLinks().find((item) => item.id === referenceItem.dataset.referenceId);
      openReferenceLink(link);
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
      renderCurrentServiceModuleDetail();
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
      renderCurrentServiceModuleDetail();
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
      renderCurrentServiceModuleDetail();
      syncBrowserHistory();
      return;
    }

    const presenterServiceItem = event.target.closest("[data-open-presenter-service]");
    if (presenterServiceItem) {
      void openServiceInPresenter(presenterServiceItem.dataset.openPresenterService);
      return;
    }

    const serviceOutlineItem = event.target.closest("[data-service-outline-slide]");
    if (serviceOutlineItem) {
      handleServiceOutlineSlideClick(serviceOutlineItem);
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
  });

  refs.detailPane.addEventListener("click", handleDetailClick);
  refs.detailPane.addEventListener("dblclick", handlePresenterBoardDoubleClick);
  refs.detailPane.addEventListener("keydown", handleDetailKeydown);
  refs.detailPane.addEventListener("input", handleDetailInput);
  refs.detailPane.addEventListener("change", handleDetailChange);
  refs.detailPane.addEventListener("submit", handleDetailSubmit);
  refs.detailPane.addEventListener("paste", handlePresenterPreparationPaste);
  refs.detailPane.addEventListener("contextmenu", handleDetailContextMenu);
  refs.detailPane.addEventListener("pointerdown", handleDetailPointerDown);
  refs.detailPane.addEventListener("pointerover", handleDetailPointerOver);

  // Calendar inline-edit
  refs.detailPane.addEventListener("focusin", (e) => {
    const serviceTextField = e.target.closest("input[data-service-item-field]");
    if (isDeferredServiceTextInput(serviceTextField)) {
      serviceTextField.dataset.initialValue = serviceTextField.value;
    }
    const cell = e.target.closest(".cal-cell");
    if (cell) cell.dataset.initialValue = cell.textContent;
  });
  refs.detailPane.addEventListener("focusout", (e) => {
    const serviceTextField = e.target.closest("input[data-service-item-field]");
    if (isDeferredServiceTextInput(serviceTextField)) {
      commitDeferredServiceTextInput(serviceTextField, { save: true });
      return;
    }
    const cell = e.target.closest(".cal-cell");
    if (!cell) return;
    const id = cell.dataset.calId;
    const field = cell.dataset.calField;
    const newVal = cell.textContent.replace(/\n/g, " ").trim();
    const oldVal = String(cell.dataset.initialValue || "").replace(/\n/g, " ").trim();
    cell.textContent = newVal;
    if (newVal !== oldVal) saveCalendarCell(id, field, newVal, { cell, previousValue: oldVal });
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

    if (handleServicePrepEditorKeydown(event)) return;

    if (handlePresenterSorterKeydown(event)) return;

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

const handleSidebarToggle = () => {
  document.body.classList.toggle("sidebar-collapsed");
  safeStorageSet("local", STORAGE.sidebarCollapsed, String(document.body.classList.contains("sidebar-collapsed")));
  syncSidebarCollapsedState();
};

function serviceOutlineSlideTarget(serviceOutlineItem) {
  const itemIndex = Number(serviceOutlineItem?.dataset?.serviceOutlineItemIndex);
  const serviceId = serviceOutlineItem?.dataset?.serviceOutlineService || state.selectedServiceId;
  const slideValue = String(serviceOutlineItem?.dataset?.serviceOutlineSlide || "").trim();
  let slideIndex = slideValue ? Number(slideValue) : -1;
  const service = state.services.find((svc) => svc.id === serviceId);
  const slides = presenterSlidesForService(serviceId);
  const outlineItems = service ? getServiceOutlineItems(service) : [];
  const currentItem = Number.isFinite(itemIndex)
    ? outlineItems.find((item, index) => (Number.isInteger(item._serviceItemIndex) ? item._serviceItemIndex : index) === itemIndex)
    : null;
  const currentSlideIndex = currentItem ? firstPresenterSlideIndexForServiceItem(currentItem, slides) : -1;
  if (currentSlideIndex >= 0) slideIndex = currentSlideIndex;
  if (!Number.isFinite(slideIndex) || slideIndex < 0 || !serviceId) return null;
  if (slideIndex >= slides.length) slideIndex = Math.max(slides.length - 1, 0);
  return { itemIndex, serviceId, slideIndex };
}

function handleServiceOutlineSlideClick(serviceOutlineItem) {
  const target = serviceOutlineSlideTarget(serviceOutlineItem);
  if (!target) {
    const serviceId = serviceOutlineItem?.dataset?.serviceOutlineService || state.selectedServiceId;
    const itemIndex = Number(serviceOutlineItem?.dataset?.serviceOutlineItemIndex);
    const service = state.services.find((entry) => entry.id === serviceId);
    const items = service ? getServiceOutlineItems(service) : [];
    const item = Number.isInteger(itemIndex) && itemIndex >= 0
      ? items.find((entry, index) => (Number.isInteger(entry._serviceItemIndex) ? entry._serviceItemIndex : index) === itemIndex)
      : null;
    if (!serviceId || !item) return;

    // A missing slide means this item needs preparation, not that it cannot be selected.
    state.selectedServiceItemIndex = itemIndex;
    openPresenterSectionEditor(serviceId, {
      itemId: item.id,
      sectionKey: item._worshipSectionKey || "",
    });
    renderServiceList();
    return;
  }
  const selectionChanged = Number.isFinite(target.itemIndex)
    && target.itemIndex >= 0
    && state.selectedServiceItemIndex !== target.itemIndex;
  if (Number.isFinite(target.itemIndex) && target.itemIndex >= 0) state.selectedServiceItemIndex = target.itemIndex;
  const outputIsShowingAnotherService = isPresenterOutputWindowOpen()
    && state.presenter.serviceId
    && state.presenter.serviceId !== target.serviceId;
  if (!outputIsShowingAnotherService) {
    runPresenterAction("jump", target.serviceId, { index: target.slideIndex });
  } else {
    selectPresenterBoardSlide(target.serviceId, target.slideIndex);
  }
  openPresenterSectionEditorForSlide(target.serviceId, target.slideIndex);
  syncServiceOutlineSelection(serviceOutlineItem);
  if (selectionChanged) renderServiceList();
  scrollPresenterBoardToIndex(target.serviceId, target.slideIndex, { force: true });
}

function syncServiceOutlineSelection(serviceOutlineItem) {
  const outline = serviceOutlineItem?.closest(".service-outline-list");
  if (!outline) return;
  outline.querySelectorAll(".service-outline-row.selected, .service-outline-group.selected")
    .forEach((node) => node.classList.remove("selected"));
  serviceOutlineItem.classList.add("selected");
  serviceOutlineItem.closest(".service-outline-group")?.classList.add("selected");
}

function syncSelectedServiceItemToPresenterSlide(serviceId = state.presenter.serviceId, slideIndex = state.presenter.index) {
  const service = state.services.find((item) => item.id === serviceId);
  const slides = serviceId === state.presenter.serviceId
    ? state.presenter.slides
    : presenterSlidesForService(serviceId);
  const slide = slides[slideIndex];
  if (!service || !slide) return;
  const items = getServiceOutlineItems(service);
  const index = items.findIndex((item) => presenterSlideBelongsToItem(slide, item));
  if (index >= 0) state.selectedServiceItemIndex = index;
}

function handleServiceOutlineSlideEvent(event) {
  const serviceOutlineItem = event.target.closest("[data-service-outline-slide]");
  if (!serviceOutlineItem) return false;
  handleServiceOutlineSlideClick(serviceOutlineItem);
  return true;
}

function handleDetailContextMenu(event) {
  const presenterThumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
  const sectionEditButton = event.target.closest("[data-presenter-section-edit]");
  if (!presenterThumb && !sectionEditButton) return;
  event.preventDefault();
  if (sectionEditButton) {
    openPresenterSectionEditor(sectionEditButton.dataset.serviceId || state.selectedServiceId, {
      sectionKey: sectionEditButton.dataset.presenterSectionEdit,
    });
    return;
  }
  openPresenterSectionEditorForSlide(
    presenterThumb.dataset.serviceId,
    Number(presenterThumb.dataset.presenterIndex),
  );
}

function handlePresenterBoardPointerDown(event) {
  if (state.module !== "presenter" || event.button !== 0) return false;
  const thumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
  if (!thumb || presenterControllerIsLive(thumb.dataset.serviceId)) return false;
  if (event.target.closest("[data-presenter-section-edit], [data-presenter-section-editor]")) return false;
  event.preventDefault();
  const serviceId = thumb.dataset.serviceId;
  const index = Number(thumb.dataset.presenterIndex);
  const elementKey = thumb.dataset.presenterElementKey || presenterSlideElementKey(serviceId, index);
  selectPresenterBoardSlide(serviceId, index, {
    additive: event.metaKey || event.ctrlKey,
    range: event.shiftKey,
    elementKey,
  });
  state.presenterBoardSelection.drag = {
    serviceId,
    startIndex: index,
    elementKey,
    additive: event.metaKey || event.ctrlKey,
  };
  return true;
}

function handlePresenterBoardDoubleClick(event) {
  if (state.module !== "presenter") return false;
  const thumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
  if (!thumb || event.target.closest("[data-presenter-section-edit], [data-presenter-section-editor]")) return false;
  event.preventDefault();
  event.stopPropagation();
  const serviceId = thumb.dataset.serviceId;
  const index = Number(thumb.dataset.presenterIndex);
  if (!serviceId || !Number.isFinite(index)) return false;
  if (presenterControllerIsLive(serviceId)) {
    runPresenterAction("jump", serviceId, { index });
  } else {
    startPresenterAtSlide(serviceId, index);
  }
  return true;
}

function handlePresenterBoardPointerOver(event) {
  const drag = state.presenterBoardSelection.drag;
  if (!drag) return false;
  const thumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
  if (!thumb || thumb.dataset.serviceId !== drag.serviceId) return true;
  const index = Number(thumb.dataset.presenterIndex);
  if (!Number.isFinite(index)) return true;
  const elementKey = thumb.dataset.presenterElementKey || presenterSlideElementKey(drag.serviceId, index);
  if (elementKey !== drag.elementKey) return true;
  selectPresenterBoardSlide(drag.serviceId, index, {
    range: true,
    additive: drag.additive,
    anchorIndex: drag.startIndex,
    elementKey,
    render: false,
  });
  syncPresenterBoardSelectionClasses();
  return true;
}

async function handleSearchKeydown(event) {
  if (event.key !== "Enter") return;

  const scriptureShortcut = await getScriptureSearchShortcut(state.search);
  if (state.module !== "references" && scriptureShortcut && (state.module !== "scripture" || scriptureShortcut.type !== "text")) {
    event.preventDefault();
    await runScriptureSearchShortcut(scriptureShortcut);
    return;
  }

  if (["home", "praise", "service", "presenter"].includes(state.module)) {
    const results = getGlobalSearchResults();
    for (const section of getGlobalSearchSectionOrder()) {
      const firstResult = section.items(results)[0];
      if (!firstResult) continue;
      event.preventDefault();
      if (section.id === "praise") {
        await openGlobalSongResult(firstResult.id);
      } else if (section.id === "scripture") {
        if (firstResult.kind === "text") {
          await openGlobalBibleTextResult();
        } else if (firstResult.book) {
          await openGlobalBookResult(firstResult.book.code, {
            chapter: firstResult.chapter,
            verse: firstResult.verse,
          });
        }
      } else if (section.id === "service") {
        await openGlobalServiceResult(firstResult.id);
      }
      return;
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

function readTheme() {
  const saved = safeStorageGet("local", STORAGE.theme);
  if (saved === "dark" || saved === "light") return saved;
  return SYSTEM_THEME_QUERY?.matches ? "dark" : "light";
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  if (!refs.themeBtn) return;
  const themeLabel = theme === "dark" ? "Use light mode" : "Use dark mode";
  refs.themeBtn.setAttribute("aria-label", themeLabel);
  refs.themeBtn.setAttribute("title", themeLabel);
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
  const storedSidebarState = safeStorageGet("local", STORAGE.sidebarCollapsed);
  const useCompactSidebar = window.matchMedia?.("(max-width: 560px)")?.matches;
  document.body.classList.toggle(
    "sidebar-collapsed",
    storedSidebarState === "true" || (!storedSidebarState && useCompactSidebar),
  );
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
  if (!state.pageTabs.length) normalizePageTabsState([], 0);
  const activeTab = state.pageTabs[state.pageTabIndex];
  if (activeTab) {
    activeTab.snapshot = homePageTabSnapshot();
    activeTab.label = "홈";
  }
  persistPageTabsState();
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
    if (state.module === "scripture" && !state.scriptures.length && !state.scriptureError) {
      if (!state.scriptureBooks.length) await loadScriptureBooks({ silent: true });
      await loadScriptures({ silent: true });
    }
    if (state.module === "praise" && !songCatalogLoaded && !state.connectionError) {
      await loadSongs();
    }
    if (isServiceDataModule() && !state.serviceTypes.length && !state.serviceError) {
      await loadServiceData({ silent: true });
    }
    if (state.module === "presenter" && !state.serviceError) {
      await loadWorshipPresenterSlides(state.selectedServiceId || state.presenter.serviceId);
    }
    if (state.module === "calendar" && !state.calendarLoaded && !state.calendarLoading && !state.calendarError) {
      await loadCalendarData({ silent: true });
    }
    if (state.module === "references" && !state.referenceLinksLoaded && !state.referenceError) {
      await loadReferenceLinks({ silent: true });
    }
    if (state.module === "praise" && state.selectedVersionId) await loadForms(state.selectedVersionId);
    if (state.module === "scripture" && state.bibleTextSearchQuery) {
      state.search = state.bibleTextSearchQuery;
      refs.searchInput.value = state.search;
      await runBibleTextSearch(state.bibleTextSearchQuery, { page: state.bibleTextSearchPage });
    } else if (state.module === "scripture" && state.selectedBookCode) {
      await loadBibleBookVerses({ silent: true });
      focusSelectedBibleVerseAfterRender();
    }
    if (isServiceDataModule() && state.selectedServiceId) await loadServiceItems(state.selectedServiceId);
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

  if (isServiceDataModule(moduleName) && !state.serviceTypes.length && !state.serviceError) {
    await loadServiceData();
  }

  if (moduleName === "presenter" && !state.serviceError) {
    await loadWorshipPresenterSlides(state.selectedServiceId || state.presenter.serviceId);
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
    if (!silent && state.module === "scripture") showToast(error.message || "성경 권 목록을 불러오지 못했습니다.", "error");
  }
}

async function loadServiceData({ silent = false } = {}) {
  if (serviceDataLoadPromise) return serviceDataLoadPromise;
  serviceDataLoadPromise = loadServiceDataOnce({ silent });
  try {
    return await serviceDataLoadPromise;
  } finally {
    serviceDataLoadPromise = null;
  }
}

async function loadServiceDataOnce({ silent = false } = {}) {
  if (!requireClient({ silent })) {
    state.serviceError = "연결 없음";
    render();
    return;
  }
  try {
    await Promise.all([
      loadHymnScoreManifest({ silent }),
      loadWorshipData(),
    ]);
    restorePresenterControllerSession();
    if (state.module === "presenter") await loadWorshipPresenterSlides(state.selectedServiceId || state.presenter.serviceId);
    state.dirtyServiceTypeIds.clear();
    state.dirty.service = false;
    state.serviceError = "";
    render();
    return;
  } catch (err) {
    if (!silent) console.error("[Service] loadWorshipData failed:", err);
    state.serviceError = err.message || String(err) || "Could not load worship data.";
    if (!silent && isServiceDataModule()) showToast(state.serviceError, "error");
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

const WORSHIP_INITIAL_ELEMENT_PAST_DAYS = 45;
const WORSHIP_INITIAL_ELEMENT_FUTURE_DAYS = 120;

function localDateStringFromDate(date) {
  const target = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(target.getTime())) return "";
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateStringWithOffset(baseDate = new Date(), offsetDays = 0) {
  const date = parseLocalDate(baseDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + offsetDays);
  return localDateStringFromDate(date);
}

function initialWorshipElementServiceIds(services = []) {
  const from = localDateStringWithOffset(new Date(), -WORSHIP_INITIAL_ELEMENT_PAST_DAYS);
  const to = localDateStringWithOffset(new Date(), WORSHIP_INITIAL_ELEMENT_FUTURE_DAYS);
  const pinned = new Set([state.selectedServiceId, state.presenter.serviceId].filter(Boolean));
  return services
    .filter((service) => {
      if (!service?.id) return false;
      if (pinned.has(service.id)) return true;
      const date = String(service.date || service.service_date || "").trim();
      return date && (!from || date >= from) && (!to || date <= to);
    })
    .map((service) => service.id);
}

async function fetchWorshipRowsForServiceIds(serviceIds = []) {
  const ids = [...new Set(serviceIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return { sections: [], elements: [] };

  const sections = [];
  for (const batch of chunkArray(ids, 80)) {
    const rows = await fetchSupabasePaged("mindex_worship_sections", "*", (query) =>
      query
        .in("service_id", batch)
        .order("service_id", { ascending: true })
        .order("sort_order", { ascending: true }));
    sections.push(...rows);
  }

  const sectionIds = sections.map((section) => section.id).filter(Boolean);
  const elements = [];
  for (const batch of chunkArray(sectionIds, 80)) {
    const rows = await fetchSupabasePaged("mindex_worship_elements", "*", (query) =>
      query
        .in("section_id", batch)
        .order("section_id", { ascending: true })
        .order("sort_order", { ascending: true }));
    elements.push(...rows);
  }

  return { sections, elements };
}

function autoUpcomingPublicServiceTargets(baseDate = new Date()) {
  const today = parseLocalDate(baseDate);
  if (Number.isNaN(today.getTime())) return [];
  today.setHours(0, 0, 0, 0);
  if (today.getDay() === 0 || today.getDay() === 6) return [];

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const nextDateForWeekday = (weekday) => {
    const date = new Date(weekStart);
    const offset = weekday === 0 ? 7 : weekday;
    date.setDate(weekStart.getDate() + offset);
    if (date < today) date.setDate(date.getDate() + 7);
    return toLocalDateStr(date);
  };

  const wednesday = nextDateForWeekday(3);
  const friday = nextDateForWeekday(5);
  const sunday = nextDateForWeekday(0);
  const integratedSunday = isAllGenerationsWorshipDate(sunday);
  return [
    { typeId: "wednesday", date: wednesday },
    { typeId: "friday", date: friday },
    { typeId: "sunday-first", date: sunday },
    { typeId: "sunday-second", date: sunday },
    { typeId: "sunday-main", date: sunday },
    { typeId: "children", date: sunday },
    { typeId: "youth", date: sunday },
    { typeId: "young-adult", date: sunday },
    { typeId: "sunday-afternoon", date: sunday },
  ].filter((target) =>
    AUTO_UPCOMING_PUBLIC_SERVICE_TYPES.includes(target.typeId)
    && target.date
    && !(integratedSunday && SUNDAY_MINISTRY_SERVICE_TYPES.has(target.typeId)));
}

function isAllGenerationsWorshipDate(date) {
  const targetDate = String(date || "").trim();
  if (!targetDate) return false;
  const calendarText = (state.calendarData || [])
    .filter((row) => String(row?.date || "").trim() === targetDate)
    .map((row) => cleanList([
      row.liturgical,
      row.note,
      row.church_schedule,
      ...CALENDAR_DEPARTMENT_FIELDS.map(([field]) => row[field]),
    ]).join(" "))
    .join(" ");
  const serviceText = (state.services || [])
    .filter((service) =>
      String(service?.date || "").trim() === targetDate
      && worshipAppServiceTypeId(service?.type_id) === "sunday-main")
    .map((service) => cleanList([
      service.title,
      service.raw_text,
      ...(Array.isArray(service.tags) ? service.tags : []),
    ]).join(" "))
    .join(" ");
  const compact = compactSearchValue([calendarText, serviceText].filter(Boolean).join(" "));
  return compact.includes("온세대") || compact.includes("찬양예배");
}

function worshipServiceExistsForTarget(target = {}) {
  const targetTypeId = worshipAppServiceTypeId(target.typeId);
  const targetDate = String(target.date || "").trim();
  if (!targetTypeId || !targetDate) return true;
  return state.services.some((service) =>
    worshipAppServiceTypeId(service.type_id) === targetTypeId
    && String(service.date || "").trim() === targetDate);
}

function autoWorshipServicePayload(target = {}) {
  const typeId = worshipAppServiceTypeId(target.typeId);
  return {
    id: createUuid(),
    service_type_id: canonicalWorshipServiceTypeId(typeId),
    service_date: target.date,
    title: "",
    status: "draft",
    worship_leader: defaultServiceWorshipLeader(typeId),
    praise_leader: serviceUsesPraiseLeader(typeId) ? defaultServicePraiseLeader(typeId) : "",
    tags: [],
    source_kind: "mindex",
    source_ref: {
      created_from: "mindex_auto_schedule",
      app_service_type_id: typeId,
      auto_generated: true,
    },
    notes: "",
  };
}

async function ensureUpcomingPublicWorshipServices(baseDate = new Date()) {
  if (!state.client) return [];
  const missingTargets = autoUpcomingPublicServiceTargets(baseDate).filter((target) => !worshipServiceExistsForTarget(target));
  if (!missingTargets.length) return [];
  const payloads = missingTargets.map(autoWorshipServicePayload);
  const { data, error } = await state.client
    .from("mindex_worship_services")
    .insert(payloads)
    .select("*");
  if (error) throw error;
  return (data || payloads).map(normalizeWorshipService);
}

const WORSHIP_SERVICE_TYPE_ALIASES = {
  sun_1st: "sunday-first",
  sun_2nd: "sunday-second",
  sun_3rd: "sunday-main",
  sun_4th: "sunday-afternoon",
  sunday_4th: "sunday-afternoon",
  "sunday-fourth": "sunday-afternoon",
  sunday_fourth: "sunday-afternoon",
  sunday_afternoon: "sunday-afternoon",
  "주일예배": "sunday-main",
  "주일예배 [1부]": "sunday-first",
  "주일예배 (1부)": "sunday-first",
  "주일예배 [2부]": "sunday-second",
  "주일예배 (2부)": "sunday-second",
  "주일예배 [3부]": "sunday-main",
  "주일예배 (3부)": "sunday-main",
  "주일오후예배": "sunday-afternoon",
  "주일예배 [4부]": "sunday-afternoon",
  "주일예배 (4부)": "sunday-afternoon",
  wed: "wednesday",
  "수요예배": "wednesday",
  fri: "friday",
  "금요기도회": "friday",
  "월삭예배": "monthly",
  young_adult: "young-adult",
  "어린이부 예배": "children",
  "청소년부 예배": "youth",
  "청년부 예배": "young-adult",
  holy_week_dawn: "holy-week-dawn",
  "특별새벽기도회": "holy-week-dawn",
  "특별예배": "special",
};

function worshipAppServiceTypeId(typeId) {
  return WORSHIP_SERVICE_TYPE_ALIASES[typeId] || typeId || "";
}

async function loadWorshipData() {
  const [types, services, templates, templateItems] = await Promise.all([
    fetchSupabasePaged("mindex_worship_service_types", "*", (query) => query.order("sort_order", { ascending: true })),
    fetchSupabasePaged("mindex_worship_services", "*", (query) =>
      query.order("service_date", { ascending: true }).order("service_type_id", { ascending: true })),
    fetchSupabasePaged("mindex_worship_templates", "*", (query) =>
      query.order("template_level", { ascending: true }).order("name", { ascending: true })),
    fetchSupabasePaged("mindex_worship_template_items", "*", (query) =>
      query.order("template_id", { ascending: true }).order("sort_order", { ascending: true })),
  ]);

  const resolvedTypes = types.length ? types : defaultWorshipServiceTypes();
  state.serviceTypes = resolvedTypes.map(normalizeWorshipServiceType);
  state.services = services.map(normalizeWorshipService);
  const autoServices = await ensureUpcomingPublicWorshipServices();
  if (autoServices.length) state.services = sortServicesByDate([...state.services, ...autoServices]);
  const preloadServiceIds = initialWorshipElementServiceIds(state.services);
  const { sections, elements } = await fetchWorshipRowsForServiceIds(preloadServiceIds);
  state.worshipSections = sections;
  state.worshipElements = elements;
  state.loadedWorshipServiceIds = new Set(preloadServiceIds);
  state.templateElementSuppressions.clear();
  state.worshipTemplates = templates;
  state.worshipTemplateItems = templateItems;
  state.serviceItems = projectGroupedWorshipItemsFromTemplates(groupWorshipElements(sections, elements));
  state.worshipPresenterSlides = {};
  state.worshipPresenterSlidesLoaded = false;
  state.loadedWorshipPresenterServiceIds = new Set();
  state.serviceItemAssigneeSupported = true;
  state.serviceItemVersionSupported = true;
  state.serviceItemMemoSupported = true;
  state.serviceTitleSupported = true;

  await loadSongsForIds(elements.map((item) => item.song_id));
  warmWorshipScriptureReferencesForService(state.selectedServiceId);
}

async function loadWorshipPresenterSlides(serviceId = "") {
  if (!state.client) return;
  const targetServiceId = String(serviceId || "").trim();
  if (targetServiceId && state.loadedWorshipPresenterServiceIds.has(targetServiceId)) return;
  if (!targetServiceId && state.worshipPresenterSlidesLoaded) return;
  const presenterRows = await fetchSupabasePaged("mindex_worship_presenter_slides", "*", (query) =>
    (targetServiceId ? query.eq("service_id", targetServiceId) : query)
      .order("service_date", { ascending: true })
      .order("section_order", { ascending: true })
      .order("element_order", { ascending: true })
      .order("slide_order", { ascending: true }));
  const hiddenElementIds = new Set(
    state.worshipElements
      .filter((element) => {
        const config = element?.config && typeof element.config === "object" ? element.config : {};
        return Boolean(config.hiddenInPresentation || config.hidden_in_presentation || config.hidden);
      })
      .map((element) => element.id)
      .filter(Boolean),
  );
  const groupedSlides = groupWorshipPresenterSlides(presenterRows, hiddenElementIds);
  if (targetServiceId) {
    state.worshipPresenterSlides = {
      ...state.worshipPresenterSlides,
      [targetServiceId]: groupedSlides[targetServiceId] || [],
    };
    state.loadedWorshipPresenterServiceIds.add(targetServiceId);
    refreshPresenterForService(targetServiceId, { publish: false });
  } else {
    state.worshipPresenterSlides = groupedSlides;
    state.worshipPresenterSlidesLoaded = true;
  }
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
    _worship: true,
    _worshipId: type.id || "",
    _worshipGroupKey: type.group_key || "",
    _worshipOutputContext: type.default_output_context || "auto",
    _worshipChromakey: Boolean(type.chromakey_enabled),
    _worshipConfig: config,
  };
}

function normalizeWorshipService(service = {}) {
  const typeId = worshipAppServiceTypeId(service.service_type_id);
  const worshipLeader = cleanServiceAssignee(service.worship_leader);
  const praiseLeader = cleanServiceAssignee(service.praise_leader);
  const serviceDate = service.service_date;
  return {
    id: service.id,
    type_id: typeId,
    date: serviceDate,
    date_end: service.service_date_end || null,
    title: normalizeWorshipServiceTitle(service.title || "", { type_id: typeId, date: serviceDate }),
    leader: praiseLeader,
    worshipLeader,
    praiseLeader,
    tags: Array.isArray(service.tags) ? service.tags : [],
    raw_text: service.notes || "",
    created_at: service.created_at,
    _worship: true,
    _worshipServiceTypeId: service.service_type_id,
    _worshipStatus: service.status || "draft",
    _worshipSourceRef: service.source_ref || {},
  };
}

function normalizeWorshipServiceTitle(title = "", service = {}) {
  const text = String(title || "").trim();
  const typeId = service?.type_id || service?.service_type_id;
  const typeName = serviceTypeDisplayName(typeId);
  if (serviceTypeUsesCanonicalTitle(typeId)) return typeName;
  if (!text) return "";
  return normalizeServiceDisplayName(text);
}

function serviceTypeUsesCanonicalTitle(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return SERVICE_CATEGORIES.public.includes(appTypeId);
}

function groupWorshipElements(sections = [], elements = []) {
  const sectionById = Object.fromEntries(sections.map((section) => [section.id, section]));
  return elements.reduce((grouped, element) => {
    const section = sectionById[element.section_id];
    const serviceId = section?.service_id;
    if (!serviceId) return grouped;
    const sourceRef = element.source_ref && typeof element.source_ref === "object" ? element.source_ref : {};
    const config = element.config && typeof element.config === "object" ? element.config : {};
    const sectionKey = String(section.section_key || "").trim();
    const elementLabel = sourceRef.label || section.title || element.title || "";
    if (!grouped[serviceId]) grouped[serviceId] = [];
    const configuredElementType = serviceMemoElementType({
      elementType: config.elementType || config.element_type || config.componentType || config.component_type,
      componentType: config.componentType || config.component_type,
    }) || normalizeWorshipElementType(element.element_type);
    if (configuredElementType === "live_scripture" && compactSearchValue(elementLabel) === "실시간성구송출") return grouped;
    const youthAnnouncementBody = sectionKey === "announcements"
      && compactSearchValue(elementLabel) === "청소년부광고";
    const elementType = sectionKey === "announcements" && !youthAnnouncementBody
      ? "title"
      : configuredElementType;
    const inputMode = normalizeServiceInputMode(
      element.input_mode
      || element.content_state?.inputMode
      || element.content_state?.input_mode
      || config.inputMode
      || config.input_mode
      || config.contentState?.inputMode
      || config.content_state?.input_mode,
    );
    const asset = normalizeServiceAsset(config.asset || config.media || element.asset || sourceRef.asset);
    const playback = normalizeServicePlaybackConfig(config.playback, elementType);
    const presenterRole = normalizeServicePresenterRole(
      config.presenterRole || config.presenter_role || config.role || sourceRef.presenterRole || sourceRef.presenter_role || sourceRef.role,
    );
    const formPresetDisabled = Boolean(
      config.formPresetDisabled
      || config.form_preset_disabled
      || config.disableFormPreset
      || config.disable_form_preset,
    );
    const formHint = formPresetDisabled ? "" : serviceFormHintFromConfig(config);
    const formPreset = formPresetDisabled ? null : normalizeServiceFormPreset(config.formPreset || config.form_preset, formHint);
    const formPresetRules = formPresetDisabled ? [] : normalizeServiceFormPresetRules(config.formPresetRules || config.form_preset_rules);
    const scriptureReference = serviceElementScriptureReference(element, section, sourceRef, config);
    const scriptureReferences = serviceElementScriptureReferences(element, section, sourceRef, config);
    const textHighlights = normalizeServiceTextHighlights(
      config.textHighlights || config.text_highlights || config.highlights
      || sourceRef.textHighlights || sourceRef.text_highlights || sourceRef.highlights,
    );
    const introSlide = normalizeServiceIntroSlide(
      config.introSlide || config.intro_slide || config.titleSlide || config.title_slide
      || sourceRef.introSlide || sourceRef.intro_slide || sourceRef.titleSlide || sourceRef.title_slide,
    );
    const manualSlides = serviceElementManualSlides(element, config, { section, sourceRef });
    grouped[serviceId].push(normalizeServiceItem({
      id: element.id,
      service_id: serviceId,
      sort_order: (Number(section.sort_order) || 0) * 1000 + (Number(element.sort_order) || 0),
      label: sourceRef.label || section.title || "",
      assignee: element.person || section.person || "",
      raw_title: worshipElementDisplayTitle(element, section, sourceRef, config),
      song_id: element.song_id || null,
      song_version_id: element.song_version_id || null,
      memo: serializeServiceItemMemo({
        elementType,
        inputMode,
        outputMode: config.outputMode || config.output_mode || config.renderMode || config.render_mode,
        formHint,
        formPreset,
        formPresetDisabled,
        formPresetRules,
        scriptureReference,
        scriptureReferences,
        scriptureTranslationId: config.scriptureTranslationId || config.scripture_translation_id,
        scriptureReferencePayloads: config.scriptureReferencePayloads || config.scripture_reference_payloads,
        manualScripture: config.manualScripture || config.manual_scripture,
        textHighlights,
        introSlide,
        slides: manualSlides,
        asset,
        playback,
        presenterRole,
        hiddenInPresentation: Boolean(config.hiddenInPresentation || config.hidden_in_presentation),
        templateSuppressed: Boolean(config.templateSuppressed || config.template_suppressed),
        reviewStatus: element.review_status,
        reviewFlags: sourceRef.review_flags || [],
      }),
      _worship: true,
      _worshipSectionId: section.id,
      _worshipSectionKey: section.section_key || "",
      _worshipSectionTitle: section.title || "",
      _worshipSectionOrder: Number(section.sort_order) || 0,
      _worshipElementOrder: Number(element.sort_order) || 0,
      _worshipSectionTemplateModified: Boolean(section.template_modified),
      _worshipElementTemplateModified: Boolean(element.template_modified),
    }));
    return grouped;
  }, {});
}

function serviceElementManualSlides(element = {}, config = {}, context = {}) {
  if (isScriptureBodyWorshipElement(element, context.section, context.sourceRef)) return [];
  if (isConfessionPrayerElement(element, context.section, context.sourceRef)) return [];
  const configured = config.slides || config.slideOverrides || config.slide_overrides;
  if (Array.isArray(configured)) return configured.map((slide) => String(slide || "").trim()).filter(Boolean);
  const body = String(element.body || "").trim();
  if (!body) return [];
  if (!["praise", "plain_text", "body"].includes(normalizeWorshipElementType(element.element_type))) return [];
  return body
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function serviceFormHintFromConfig(config = {}) {
  if (
    config.formPresetDisabled
    || config.form_preset_disabled
    || config.disableFormPreset
    || config.disable_form_preset
  ) return "";
  const preset = normalizeServiceFormPreset(config.formPreset || config.form_preset, config.formHint || config.form_hint);
  return String(config.formHint || config.form_hint || preset?.hint || "").trim();
}

function worshipElementDisplayTitle(element = {}, section = {}, sourceRef = {}, config = {}) {
  if (isScriptureBodyWorshipElement(element, section, sourceRef)) {
    const references = serviceElementScriptureReferences(element, section, sourceRef, config);
    if (references.length) return formatServiceScriptureReferenceList(references);
    return serviceElementScriptureReference(element, section, sourceRef, config);
  }
  const title = String(element.title || "").trim();
  // An element label is structural metadata, not user-entered content.  Keep
  // empty template slots empty unless the template explicitly supplied a title.
  return title;
}

function isScriptureBodyWorshipElement(element = {}, section = {}, sourceRef = {}) {
  const elementType = normalizeWorshipElementType(element.element_type);
  if (elementType === "scripture_body") return true;
  if (elementType === "scripture_reading") return false;
  const sectionKey = String(section?.section_key || section?._worshipSectionKey || "").trim();
  const label = String(sourceRef?.label || section?.title || element?.title || "").replace(/\s+/g, "");
  return label === "본문"
    || label === "성경본문"
    || label === "설교본문"
    || (sectionKey === "scripture_reading" && label === "성경봉독");
}

function serviceElementScriptureReference(element = {}, section = {}, sourceRef = {}, config = {}) {
  const candidates = [
    element.scripture_reference,
    config.scriptureReference,
    config.scripture_reference,
    sourceRef.scriptureReference,
    sourceRef.scripture_reference,
    firstBibleReferenceLine(element.title),
    firstBibleReferenceLine(element.body),
    section.title,
  ];
  for (const candidate of candidates) {
    const referenceText = firstBibleReferenceLine(candidate);
    if (!referenceText) continue;
    const parsed = parseBibleReference(referenceText);
    if (parsed) return formatServiceBibleReference(parsed, referenceText);
  }
  return "";
}

function serviceElementScriptureReferences(element = {}, section = {}, sourceRef = {}, config = {}) {
  const configured = config.scriptureReferences || config.scripture_references
    || sourceRef.scriptureReferences || sourceRef.scripture_references;
  const references = preferCompleteServiceScriptureReferenceList(
    normalizeServiceScriptureReferenceList(configured),
    normalizeServiceScriptureReferenceList(element.title),
  );
  if (references.length) return references;
  const reference = serviceElementScriptureReference(element, section, sourceRef, config);
  return reference ? [reference] : [];
}

function firstBibleReferenceLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function groupWorshipPresenterSlides(rows = [], hiddenElementIds = new Set()) {
  return rows.reduce((grouped, row, index) => {
    const serviceId = row.service_id;
    if (!serviceId) return grouped;
    if (!grouped[serviceId]) grouped[serviceId] = [];
    grouped[serviceId].push(normalizeWorshipPresenterSlide(row, index, {
      hiddenInPresentation: hiddenElementIds.has(row.element_id),
    }));
    return grouped;
  }, {});
}

function normalizeWorshipPresenterSlide(row = {}, index = 0, options = {}) {
  const elementType = worshipPresenterElementType(row.element_type, row.slide_type);
  const layout = worshipPresenterLayout(row.slide_type, elementType);
  const scriptureReading = isPresenterScriptureReadingSource({
    elementType: row.element_type,
    sectionKey: row.section_key,
    label: row.section_title,
  });
  const title = scriptureReading
    ? (row.slide_title || row.section_title || "성경봉독")
    : (row.slide_title || row.element_title || row.section_title || "");
  const assignee = scriptureReading
    ? cleanPresenterAssignee(row.element_title || row.slide_body || "")
    : cleanPresenterAssignee(row.element_person || row.section_person || "");
  const text = row.slide_body || row.slide_title || row.element_title || "";
  const marker = row.slide_marker || inferWorshipSlideMarker(row, elementType);
  const hasTitleContent = presenterElementTypeSupportsTitleContent(elementType)
    && String(title || "").trim()
    && String(row.slide_body || "").trim();
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
    type: hasTitleContent ? "title-content" : worshipPresenterSlideType(row.slide_type, elementType, layout),
    label: row.section_title || "",
    title,
    assignee,
    marker,
    formKey: `${row.element_id || "element"}:${marker || row.slide_order || index}`,
    bodyText: row.slide_body || "",
    text: elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE ? cleanList([title, assignee]).join("\n") : text,
    hiddenInPresentation: Boolean(
      options.hiddenInPresentation
      || row.hiddenInPresentation
      || row.hidden_in_presentation
      || row.hidden,
    ),
    sort: (Number(row.section_order) || 0) * 10000 + (Number(row.element_order) || 0) * 100 + (Number(row.slide_order) || 0),
    media: row.media || {},
    asset: row.media || {},
  };
}

function inferWorshipSlideMarker(row = {}, elementType = "") {
  if (elementType !== PRESENTER_ELEMENT_TYPES.PRAISE) return "";
  const text = String(row.slide_body || "").trim();
  const bracket = text.match(/^\[([^\]]{1,24})\]/);
  if (bracket) return normalizeImportedPraiseMarker(bracket[1].trim());
  const named = text.match(/^(verse|chorus|pre-chorus|prechorus|bridge|coda|ending|intro|outro|후렴|브릿지)\s*(\d+)?/i);
  if (named) return normalizeImportedPraiseMarker([named[1], named[2]].filter(Boolean).join(" "));
  const numbered = text.match(/^(\d{1,2})[\s.]/);
  if (numbered) return `Verse ${numbered[1]}`;
  return "";
}

function normalizeImportedPraiseMarker(value = "") {
  const raw = String(value || "").trim();
  if (/^(ending|엔딩)(?:\s+\d+)?$/i.test(raw)) return "Coda";
  return raw;
}

function worshipPresenterElementType(elementType, slideType) {
  if (elementType === "praise" || /^praise_/.test(String(slideType || ""))) return PRESENTER_ELEMENT_TYPES.PRAISE;
  if (slideType === "scripture_body" || elementType === "scripture_body") return PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT;
  if (slideType === "scripture_reading" || elementType === "scripture_reading") return PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE;
  if (elementType === "title") return PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE;
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
  if (elementType === PRESENTER_ELEMENT_TYPES.TITLE) return "title";
  return "component";
}

async function loadReferenceLinks({ silent = false } = {}) {
  if (!requireClient({ silent })) {
    state.referenceLinks = [];
    state.referenceError = "연결 없음";
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
    state.calendarLoaded = false;
    state.calendarError = e.message || "Could not load calendar.";
    if (!silent) showToast(e.message || "Could not load calendar.", "error");
  } finally {
    state.calendarLoading = false;
    if (state.module === "calendar") {
      renderSongList();
      renderCalendarView();
    }
  }
}

async function saveCalendarCell(id, field, value, options = {}) {
  const cell = options.cell || null;
  const previousValue = String(options.previousValue || "");
  const row = state.calendarData.find((item) => String(item.id) === String(id));
  const allowedFields = new Set([
    "note",
    "church_schedule",
    ...CALENDAR_DEPARTMENT_FIELDS.map(([fieldName]) => fieldName),
    ...CALENDAR_LECTIONARY_FIELDS.map(([fieldName]) => fieldName),
  ]);
  if (!state.client || !row || row._generatedFeast || !allowedFields.has(field)) {
    if (cell) {
      cell.textContent = previousValue;
      cell.dataset.initialValue = previousValue;
    }
    return false;
  }

  const key = calendarCellSaveKey(id, field);
  const token = createLocalId();
  state.calendarCellSaves.set(key, token);
  setCalendarCellSaveState(cell, "saving");
  try {
    const { error } = await state.client
      .from("mindex_sunday_calendar")
      .update({ [field]: value })
      .eq("id", id);
    if (error) throw error;
    row[field] = value;
    if (state.calendarCellSaves.get(key) === token) {
      state.calendarCellSaves.delete(key);
      setCalendarCellSaveState(cell, "saved");
      if (cell) cell.dataset.initialValue = value;
    }
    return true;
  } catch (error) {
    if (state.calendarCellSaves.get(key) === token) {
      state.calendarCellSaves.delete(key);
      if (cell) {
        cell.textContent = previousValue;
        cell.dataset.initialValue = previousValue;
      }
      setCalendarCellSaveState(cell, "error");
    }
    showToast(error.message || "저장하지 못했습니다.", "error");
    return false;
  }
}

function calendarCellSaveKey(id, field) {
  return `${id || ""}:${field || ""}`;
}

function setCalendarCellSaveState(cell, status) {
  if (!cell) return;
  cell.classList.remove("is-saving", "is-saved", "is-save-error");
  cell.removeAttribute("aria-busy");
  if (status === "saving") {
    cell.classList.add("is-saving");
    cell.setAttribute("aria-busy", "true");
    return;
  }
  if (status === "saved") {
    cell.classList.add("is-saved");
    window.setTimeout(() => cell.classList.remove("is-saved"), 700);
    return;
  }
  if (status === "error") {
    cell.classList.add("is-save-error");
    window.setTimeout(() => cell.classList.remove("is-save-error"), 1600);
  }
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
            <p class="empty-verse">교회력을 불러올 수 없습니다</p>
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
  const existingTable = refs.detailPane.querySelector(".cal-table");
  if (
    existingTable?.classList.contains(`cal-table--${state.calendarDetailTab}`) &&
    !state.calendarScrollTargetMonth
  ) return;

  const today = toLocalDateStr(new Date());
  const currentMonth = today.slice(0, 7);
  const visibleMonth = currentCalendarViewportMonth();
  if (!state.calendarScrollTargetMonth && visibleMonth) {
    state.calendarScrollTargetMonth = visibleMonth;
  }
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
      tbodyHtml += `<tr class="cal-month-row" data-cal-month="${escapeAttr(ym)}"><td colspan="${3 + calendarDetailFields.length}">${y}년 ${KO_MONTH[parseInt(m)]}</td></tr>`;
      prevMonth = ym;
    }
    const d = parseLocalDate(row.date);
    const dateLabel = `${d.getMonth()+1}/${d.getDate()} (${DOW[d.getDay()]})`;
    const isToday = row.date === today;
    const isPast = row.date < today;
    const isUpcomingSunday = row.date === nextSundayDate(today);

    if (isCalendarInlineFeast(row)) {
      tbodyHtml += renderCalendarInlineFeastRow(row, dateLabel, {
        isToday,
        isPast,
        isUpcomingSunday,
        summaryColspan: 2 + calendarDetailFields.length,
      });
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
        ${renderCalendarOccasionScheduleCell(row)}
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
        <table class="cal-table cal-table--${escapeAttr(state.calendarDetailTab)}">
          ${renderCalendarColumnGroup(calendarDetailFields)}
          <thead>
            <tr>
              <th class="cal-th-date">날짜</th>
              <th class="cal-th-lit">절기</th>
              <th class="cal-th-occasion-schedule">기념/일정</th>
              ${calendarDetailFields.map(([field, department, role]) => renderCalendarRoleHeader(field, department, role)).join("")}
            </tr>
          </thead>
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>
      <p class="cal-footnote">${escapeHtml(CALENDAR_LECTIONARY_FOOTNOTE.join(" "))}</p>
    </div>`;
  scrollCalendarToTargetMonth();
}

function renderCalendarColumnGroup(calendarDetailFields = []) {
  const columns = [
    "cal-col-date",
    "cal-col-lit",
    "cal-col-occasion-schedule",
    ...calendarDetailFields.map(([field]) => calendarColumnClassForField(field)),
  ];
  return `<colgroup>${columns.map((className) => `<col class="${escapeAttr(className)}">`).join("")}</colgroup>`;
}

function calendarColumnClassForField(field) {
  if (field === "liturgical_color") return "cal-col-color";
  if (field === "psalm") return "cal-col-psalm";
  if (["first_reading", "second_reading", "gospel"].includes(field)) return "cal-col-reading";
  if (field === "youth_offering_prayer") return "cal-col-person-wide";
  return "cal-col-person";
}

function scrollCalendarToTargetMonth({ smooth = false } = {}) {
  const targetMonth = state.calendarScrollTargetMonth;
  if (!targetMonth || state.module !== "calendar") return;
  const wrap = refs.detailPane?.querySelector(".cal-table-wrap");
  const row = [...(wrap?.querySelectorAll(".cal-month-row") || [])]
    .find((monthRow) => monthRow.dataset.calMonth === targetMonth);
  if (!wrap || !row) return;
  const headerHeight = wrap.querySelector("thead")?.getBoundingClientRect().height || 0;
  const wrapTop = wrap.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top;
  const targetScrollTop = Math.max(0, wrap.scrollTop + rowTop - wrapTop - headerHeight);
  if (smooth) {
    wrap.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!wrap.isConnected || state.module !== "calendar") return;
        wrap.scrollTo({ top: targetScrollTop, behavior: "smooth" });
      });
    });
  } else {
    wrap.scrollTop = targetScrollTop;
  }
  state.calendarScrollTargetMonth = null;
  state.calendarAutoScrolledMonth = targetMonth;
}

function currentCalendarViewportMonth() {
  const wrap = refs.detailPane?.querySelector(".cal-table-wrap");
  const monthRows = [...(wrap?.querySelectorAll(".cal-month-row") || [])];
  if (!wrap || !monthRows.length) return null;
  const headerHeight = wrap.querySelector("thead")?.getBoundingClientRect().height || 0;
  const anchorTop = wrap.getBoundingClientRect().top + headerHeight + 1;
  let month = monthRows[0].dataset.calMonth || null;
  for (const row of monthRows) {
    if (row.getBoundingClientRect().top > anchorTop + 1) break;
    month = row.dataset.calMonth || month;
  }
  return month;
}

function nextSundayDate(todayValue = toLocalDateStr(new Date())) {
  const date = parseLocalDate(todayValue);
  if (Number.isNaN(date.getTime())) return todayValue;
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return toLocalDateStr(date);
}

function renderCalendarRoleHeader(field, department, role) {
  const className = `cal-th-person ${calendarColumnClassForField(field).replace("cal-col-", "cal-th-")}`;
  if (!role) {
    return `<th class="${escapeAttr(className)} cal-th-simple"><span class="cal-th-role">${escapeHtml(department)}</span></th>`;
  }
  return `
    <th class="${escapeAttr(className)}">
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
  return `<td class="cal-cell ${escapeAttr(calendarCellClassForField(field))}" data-cal-id="${escapeAttr(row.id)}" data-cal-field="${escapeAttr(field)}" data-placeholder="—" contenteditable="true" spellcheck="false">${val}</td>`;
}

function renderCalendarOccasionScheduleCell(row) {
  return `
    <td class="cal-occasion-schedule">
      ${renderCalendarOccasionScheduleItem(row, "note", "기념")}
      ${renderCalendarOccasionScheduleItem(row, "church_schedule", "일정")}
    </td>`;
}

function renderCalendarOccasionScheduleItem(row, field, label) {
  const val = escapeHtml(row[field] || "");
  return `
    <div class="cal-occasion-schedule-item">
      <span class="cal-occasion-schedule-label">${escapeHtml(label)}</span>
      <span class="cal-cell cal-occasion-schedule-value ${escapeAttr(calendarCellClassForField(field))}" data-cal-id="${escapeAttr(row.id)}" data-cal-field="${escapeAttr(field)}" contenteditable="true" spellcheck="false">${val}</span>
    </div>`;
}

function calendarCellClassForField(field) {
  if (field === "note") return "cal-cell-note";
  if (field === "church_schedule") return "cal-cell-schedule";
  if (field === "liturgical_color") return "cal-cell-color";
  if (field === "psalm") return "cal-cell-reading cal-cell-psalm";
  if (["first_reading", "second_reading", "gospel"].includes(field)) return "cal-cell-reading";
  return "cal-cell-person";
}

async function loadServiceItems(serviceId) {
  if (!serviceId || state.loadedWorshipServiceIds.has(serviceId)) return;
  if (!state.client) {
    state.serviceItems[serviceId] = state.serviceItems[serviceId] || [];
    return;
  }
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return;
  const previousSectionIds = new Set(
    state.worshipSections
      .filter((section) => section.service_id === serviceId)
      .map((section) => section.id)
      .filter(Boolean),
  );
  const { sections, elements } = await fetchWorshipRowsForServiceIds([serviceId]);
  const loadedSectionIds = new Set([
    ...previousSectionIds,
    ...sections.map((section) => section.id).filter(Boolean),
  ]);
  state.worshipSections = [
    ...state.worshipSections.filter((section) => section.service_id !== serviceId),
    ...sections,
  ];
  state.worshipElements = [
    ...state.worshipElements.filter((element) => !loadedSectionIds.has(element.section_id)),
    ...elements,
  ];
  state.loadedWorshipServiceIds.add(serviceId);
  state.serviceItems[serviceId] = projectWorshipServiceItemsFromTemplate(
    service,
    groupWorshipElements(sections, elements)[serviceId] || [],
  );
  await loadSongsForIds(elements.map((item) => item.song_id));
  warmWorshipScriptureReferencesForService(serviceId);
  renderCurrentServiceModuleDetail();
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
    state.bibleTextSearchError = "선택된 성경 역본이 없습니다.";
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
    state.bibleTextSearchError = error.message || "본문 검색에 실패했습니다.";
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
  if (songId === state.selectedSongId) {
    const preferredVersionId = getPreferredVersionId(getSelectedSong());
    if (preferredVersionId && preferredVersionId !== state.selectedVersionId && !state.dirty.forms) {
      state.selectedVersionId = preferredVersionId;
      state.forms = [];
    }
    render();
    syncBrowserHistory();
    focusSelectedItemAfterRender();
    if (state.selectedVersionId && !state.forms.length && !state.dirty.forms) {
      await loadForms(state.selectedVersionId);
      focusSelectedItemAfterRender();
    }
    return;
  }
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
    title: options.title || "새 링크",
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
    showToast("링크를 추가했습니다.");
  } catch (error) {
    showToast(referenceTableErrorMessage(error), "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function createPraiseSong(options = {}) {
  if (!requireClient() || state.saving) return;
  if (state.loading || songLoadPromise) return;
  if (state.module !== "praise") await switchModule("praise", { clearSearch: false });
  if (state.module !== "praise") return;

  const draft = buildNewPraiseSongDraft(options);
  state.saving = true;
  updateSaveState();
  try {
    const useVersionTables = state.songVersionTablesSupported === true;
    const payload = {
      title: draft.title,
      praise_types: draft.praise_types,
      memo: useVersionTables ? null : serializeSongMemo(draft),
    };
    const { data, error } = await state.client
      .from("mindex_songs")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    const song = normalizeServerSong(data);
    song.versions = normalizeSongVersions(song, draft.versions);
    song._memoHasVersions = !useVersionTables;
    if (useVersionTables) {
      try {
        await saveSongVersions(song);
      } catch (saveError) {
        if (!isUnavailableRelationError(saveError)) throw saveError;
        state.songVersionTablesSupported = false;
        song._memoHasVersions = true;
        await state.client
          .from("mindex_songs")
          .update({ memo: serializeSongMemo(song) })
          .eq("id", song.id);
      }
    }

    state.songs = [song, ...state.songs.filter((item) => item.id !== song.id)].sort(sortSongs);
    state.selectedSongId = song.id;
    state.selectedVersionId = getDefaultVersionId(song);
    state.forms = normalizeForms((getSelectedVersion()?.forms || []).map((form) => withLocalId({ ...form, song_id: state.selectedVersionId })));
    state.search = "";
    refs.searchInput.value = "";
    state.metadataPopupOpen = true;
    state.dirty.song = false;
    state.dirty.forms = false;
    persistUiState();
    render();
    requestAnimationFrame(() => refs.detailPane.querySelector('[data-song-field="title"]')?.focus());
    showToast("곡을 추가했습니다.");
  } catch (error) {
    showToast(error.message || "곡 추가 실패.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

function buildNewPraiseSongDraft(options = {}) {
  const praiseTypes = normalizePraiseTypes(options.praiseTypes || options.praise_types || state.praiseFilter);
  const version = {
    id: createUuid(),
    name: "Default",
    raw_section_name: "Default",
    is_primary: true,
    praise_types: praiseTypes.length ? praiseTypes : ["ccm"],
    forms: [],
  };
  return {
    title: firstNonBlankString(options.title, nextPraiseSongTitle()),
    praise_types: version.praise_types,
    versions: [version],
    scripture: [],
    metadata: {},
    related_song_ids: [],
  };
}

function nextPraiseSongTitle() {
  const base = "새 찬양";
  const used = new Set((state.songs || []).map((song) => normalizeTitle(song.title)));
  if (!used.has(normalizeTitle(base))) return base;
  for (let index = 2; index < 1000; index += 1) {
    const title = `${base} ${index}`;
    if (!used.has(normalizeTitle(title))) return title;
  }
  return `${base} ${Date.now()}`;
}

function songHasDeleteProtectedContent(song = {}) {
  if (song.hymn_no || song.subtitle || song.original_title) return true;
  if (cleanList(song.scripture).length || cleanList(song.related_song_ids).length) return true;
  if (Object.keys(normalizeSongMetadata(song.metadata)).length) return true;
  return (song.versions || []).some((version) => {
    if (Object.keys(normalizeSongMetadata(version.metadata)).length) return true;
    return normalizeForms(version.forms || []).some((form) => normalizeLyricsForCopy(form.lyrics));
  });
}

function canDeletePraiseSong(song = getSelectedSong()) {
  return Boolean(song && !songHasDeleteProtectedContent(song));
}

async function deleteSelectedSong() {
  const song = getSelectedSong();
  if (!song || !requireClient() || state.saving) return;
  if (!canDeletePraiseSong(song)) {
    showToast("내용이 비어 있는 곡만 바로 삭제할 수 있어요.", "error");
    return;
  }
  if (!confirm(`"${song.title}"을 삭제할까요?`)) return;

  state.saving = true;
  updateSaveState();
  try {
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
    showToast("빈 곡을 삭제했습니다.");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveAll() {
  if (state.module === "home") return;
  if (state.module === "references") {
    await saveReferenceLinks();
    return;
  }
  if (isServiceDataModule()) {
    await saveService();
    return;
  }
  if (state.module === "scripture") {
    await saveScripture();
    return;
  }

  if (state.module === "praise" && songLoadPromise) return;

  const song = getSelectedSong();
  if (!song || !requireClient() || state.saving) return;

  const title = (song.title || "").trim();
  if (!title) {
    showToast("제목을 입력해 주세요.", "error");
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
    showToast("저장했습니다.");
    render();
  } catch (error) {
    showToast(error.message || "저장하지 못했습니다.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveReferenceLinks() {
  if (!requireClient() || state.saving) return;

  const links = state.referenceLinks.map(normalizeReferenceLink).sort(sortReferenceLinks);
  const invalid = links.find((link) => !link.title.trim() || !referenceUrlIsValid(link.url));
  if (invalid) {
    showToast("링크 제목과 URL을 입력해 주세요.", "error");
    return;
  }

  state.saving = true;
  updateSaveState();
  try {
    const payload = links.map((link, index) => ({
      id: link.id,
      title: link.title.trim(),
      url: normalizeReferenceUrl(link.url),
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
    showToast("링크를 저장했습니다.");
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

function normalizeReferenceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function referenceUrlIsValid(value) {
  return Boolean(normalizeReferenceUrl(value));
}

function openReferenceLink(link) {
  const url = normalizeReferenceUrl(link?.url);
  if (!url) {
    showToast("열 수 없는 링크입니다.", "error");
    return false;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
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
  while (existing.has(normalizeSearchValue(`그룹 ${index}`))) index += 1;
  return `그룹 ${index}`;
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
  if (!confirm(`"${link.title || "링크"}"을(를) 삭제할까요?`)) return;

  state.saving = true;
  updateSaveState();
  try {
    const { error } = await state.client.from("mindex_reference_links").delete().eq("id", id);
    if (error) throw error;
    state.referenceLinks = state.referenceLinks.filter((item) => item.id !== id);
    state.dirty.references = false;
    render();
    showToast("링크를 삭제했습니다.");
  } catch (error) {
    showToast(referenceTableErrorMessage(error), "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

function referenceTableErrorMessage(error) {
  if (isUnavailableRelationError(error)) return "링크 테이블이 없습니다.";
  if (/permission|policy|rls/i.test(error?.message || "")) return "권한이 필요합니다.";
  return error?.message || "링크를 업데이트하지 못했습니다.";
}

async function saveScripture() {
  const scripture = getSelectedScripture();
  if (!scripture || !requireClient() || state.saving) return;

  const title = (scripture.title || "").trim();
  if (!title) {
    showToast("제목을 입력해 주세요.", "error");
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
    showToast("저장했습니다.");
    render();
  } catch (error) {
    showToast(error.message || "저장하지 못했습니다.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveService(serviceId = state.selectedServiceId, options = {}) {
  if (!requireClient() || state.saving) return;
  commitActiveDeferredServiceTextInput(serviceId);

  const service = state.services.find((svc) => svc.id === serviceId);
  const inputProblem = service ? serviceInputSaveProblem(service) : null;
  if (inputProblem) {
    showToast(inputProblem, "error");
    return;
  }

  state.saving = true;
  updateSaveState();
  try {
    await saveDirtyServiceTypes();
    if (service && !service._isExpected) {
      await saveWorshipServiceInstance(service);
    }
    state.dirty.service = false;
    if (!options.silent) showToast("예배를 저장했습니다.");
    // Field-level commits already refreshed the affected presenter content. Avoid
    // rebuilding the whole application after a small inline edit.
    if (options.renderAfterSave !== false) render();
    else renderServiceList();
  } catch (error) {
    showToast(error.message || "예배를 저장하지 못했습니다.", "error");
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function saveDirtyServiceTypes() {
  if (!state.dirtyServiceTypeIds.size || !state.client) return;
  const types = [...state.dirtyServiceTypeIds]
    .map((typeId) => serviceTypeById(typeId))
    .filter(Boolean);
  for (const type of types) {
    const configRest = type._worshipConfig && typeof type._worshipConfig === "object" ? { ...type._worshipConfig } : {};
    delete configRest.orderTemplate;
    delete configRest.order_template;
    delete configRest.fixedItems;
    delete configRest.fixed_items;
    const payload = {
      display_name: type.name || type.id,
      short_name: type.short_name || type.name || type.id,
      group_key: type._worshipGroupKey || serviceTypeGroupKey(type.id),
      sort_order: Number(type.sort_order) || serviceTypeSortOrder(type.id),
      default_output_context: type._worshipOutputContext || "auto",
      chromakey_enabled: Boolean(type._worshipChromakey),
      config: {
        ...configRest,
        fixedItems: serializeServiceDefaultItems(type.id),
      },
    };
    const { error } = await state.client
      .from("mindex_worship_service_types")
      .update(payload)
      .eq("id", type._worshipId || canonicalWorshipServiceTypeId(type.id));
    if (error) throw error;
  }
  state.dirtyServiceTypeIds.clear();
}

async function saveWorshipServiceInstance(service) {
  const serviceId = service.id;
  const canonicalTypeId = canonicalWorshipServiceTypeId(service.type_id);
  const worshipLeader = cleanServiceAssignee(service.worshipLeader || service._worshipLeader);
  const praiseLeader = serviceUsesPraiseLeader(service.type_id)
    ? cleanServiceAssignee(service.praiseLeader || service.leader)
    : "";
  const servicePayload = {
    service_type_id: canonicalTypeId,
    service_date: service.date,
    service_date_end: service.date_end || null,
    title: normalizeWorshipServiceTitle(service.title || "", service),
    status: service._worshipStatus || "draft",
    worship_leader: worshipLeader,
    praise_leader: praiseLeader,
    tags: Array.isArray(service.tags) ? service.tags : [],
    notes: service.raw_text || "",
  };
  const { error: serviceError } = await state.client
    .from("mindex_worship_services")
    .update(servicePayload)
    .eq("id", serviceId);
  if (serviceError) throw serviceError;

  const existingSections = state.worshipSections.filter((section) => section.service_id === serviceId);
  const existingElements = state.worshipElements.filter((element) =>
    existingSections.some((section) => section.id === element.section_id));
  const existingSectionById = Object.fromEntries(existingSections.map((section) => [section.id, section]));
  const existingElementById = Object.fromEntries(existingElements.map((element) => [element.id, element]));
  const items = normalizeServiceItemsForTemplateHierarchy(
    service,
    normalizeServiceItemsInCurrentOrder(getServiceItems(serviceId)),
  ).filter((item) => !isUnmodifiedTemplatePlaceholder(item));
  const elementTypedStateColumns = {
    inputMode: await detectTableColumnSupport("mindex_worship_elements", "input_mode"),
    contentState: await detectTableColumnSupport("mindex_worship_elements", "content_state"),
  };
  const rows = buildWorshipPersistenceRows(service, items, existingSectionById, existingElementById, {
    elementTypedStateColumns,
  });
  const suppressedItems = [...state.templateElementSuppressions.values()]
    .filter((item) => item?.service_id === serviceId);
  const suppressedIds = state.templateElementSuppressions;
  const suppressedElements = existingElements.filter((element) =>
    suppressedIds.has(element.id) || Boolean(element.config?.templateSuppressed || element.config?.template_suppressed));
  const suppressedSectionIds = new Set(suppressedElements.map((element) => element.section_id));
  suppressedElements.forEach((element) => {
    if (rows.elements.some((row) => row.id === element.id)) return;
    rows.elements.push({
      ...element,
      template_modified: true,
      config: { ...(element.config || {}), templateSuppressed: true },
    });
  });
  existingSections
    .filter((section) => suppressedSectionIds.has(section.id) && !rows.sections.some((row) => row.id === section.id))
    .forEach((section) => rows.sections.push(section));

  // A projected item has no database row yet. Persist a suppression marker so a
  // deliberate delete still survives the next template projection.
  const virtualSuppressedItems = suppressedItems
    .filter((item) => !existingElementById[item.id])
    .map((item) => ({
      ...item,
      memo: serializeServiceItemMemo({ ...parseServiceItemMemo(item.memo), templateSuppressed: true }),
      _worshipElementTemplateModified: true,
    }));
  if (virtualSuppressedItems.length) {
    const virtualRows = buildWorshipPersistenceRows(
      service,
      virtualSuppressedItems,
      existingSectionById,
      existingElementById,
      { elementTypedStateColumns },
    );
    virtualRows.sections.forEach((section) => {
      if (!rows.sections.some((row) => row.id === section.id)) rows.sections.push(section);
    });
    virtualRows.elements.forEach((element) => {
      if (!rows.elements.some((row) => row.id === element.id)) rows.elements.push(element);
    });
  }

  if (rows.sections.length) {
    const { error } = await state.client
      .from("mindex_worship_sections")
      .upsert(rows.sections, { onConflict: "id" });
    if (error) throw error;
  }
  if (rows.elements.length) {
    const { error } = await state.client
      .from("mindex_worship_elements")
      .upsert(rows.elements, { onConflict: "id" });
    if (error) throw error;
  }

  const nextElementIds = new Set(rows.elements.map((element) => element.id));
  const removedElementIds = existingElements.map((element) => element.id).filter((id) => !nextElementIds.has(id));
  if (removedElementIds.length) {
    const { error } = await state.client
      .from("mindex_worship_elements")
      .delete()
      .in("id", removedElementIds);
    if (error) throw error;
  }

  const nextSectionIds = new Set(rows.sections.map((section) => section.id));
  const removedSectionIds = existingSections.map((section) => section.id).filter((id) => !nextSectionIds.has(id));
  if (removedSectionIds.length) {
    const { error } = await state.client
      .from("mindex_worship_sections")
      .delete()
      .in("id", removedSectionIds);
    if (error) throw error;
  }

  state.worshipSections = [
    ...state.worshipSections.filter((section) => section.service_id !== serviceId),
    ...rows.sections,
  ];
  const existingSectionIdsForService = new Set(existingSections.map((section) => section.id));
  state.worshipElements = [
    ...state.worshipElements.filter((element) => !existingSectionIdsForService.has(element.section_id)),
    ...rows.elements,
  ];
  state.serviceItems[serviceId] = projectWorshipServiceItemsFromTemplate(
    service,
    groupWorshipElements(rows.sections, rows.elements)[serviceId] || [],
  );
  suppressedItems.forEach((item) => suppressedIds.delete(item.id));
  await syncSharedSundayContentAfterSave(service, items, { elementTypedStateColumns });
  refreshPresenterForService(serviceId);
}

async function syncSharedSundayContentAfterSave(sourceService, sourceItems = [], options = {}) {
  if (!state.client || !sourceService?.id) return;
  const serviceDate = String(sourceService.date || "").trim();
  if (!serviceDate) return;
  const changedSharedItems = sourceItems
    .filter((item) => Boolean(item?._worshipSharedContentDirty))
    .filter((item) => sundaySharedContentKey(item) && sundaySharedContentTypesForItem(item, sourceService).length);
  if (!changedSharedItems.length) return;

  for (const sourceItem of changedSharedItems) {
    const key = sundaySharedContentKey(sourceItem);
    const targetTypeIds = sundaySharedContentTypesForItem(sourceItem, sourceService)
      .filter((typeId) => typeId !== worshipAppServiceTypeId(sourceService.type_id));
    const targetServices = state.services.filter((service) =>
      service.id !== sourceService.id
      && String(service.date || "").trim() === serviceDate
      && targetTypeIds.includes(worshipAppServiceTypeId(service.type_id)));
    for (const targetService of targetServices) {
      await syncSharedSundayContentToService(targetService, key, sourceItem, options);
    }
  }
}

async function syncSharedSundayContentToService(targetService, key, sourceItem, options = {}) {
  const targetItems = normalizeServiceItemsForTemplateHierarchy(
    targetService,
    normalizeServiceItemsInCurrentOrder(getServiceItems(targetService.id)),
  );
  const targetIndex = targetItems.findIndex((item) => sundaySharedContentKey(item) === key);
  if (targetIndex < 0) return;
  targetItems[targetIndex] = applySharedSundayContentToItem(targetItems[targetIndex], sourceItem);
  await persistSharedSundayServiceItems(targetService, targetItems, options);
}

function applySharedSundayContentToItem(targetItem = {}, sourceItem = {}) {
  const key = sundaySharedContentKey(targetItem) || sundaySharedContentKey(sourceItem);
  const next = {
    ...targetItem,
    _worshipElementTemplateModified: true,
    _worshipTemplatePlaceholder: false,
  };
  delete next._worshipSharedContentDirty;

  if (key === "scripture-reading" || key === "sermon-scripture" || key.startsWith("sermon-citation:")) {
    const targetMemo = parseServiceItemMemo(targetItem.memo);
    const sourceMemo = parseServiceItemMemo(sourceItem.memo);
    const references = serviceItemDirectScriptureReferences(sourceItem, sourceMemo);
    next.song_id = null;
    next.version_id = null;
    next.song_version_id = null;
    next.raw_title = formatServiceScriptureReferenceList(references);
    next.memo = serializeServiceItemMemo({
      ...targetMemo,
      elementType: "scripture_body",
      componentType: "scripture_body",
      inputMode: "scripture",
      scriptureReference: references[0] || "",
      scriptureReferences: references,
      slides: [],
    });
    return next;
  }

  if (key === "sermon-title") {
    next.raw_title = String(sourceItem.raw_title || "").trim();
    next.assignee = cleanServiceAssignee(sourceItem.assignee);
    next.song_id = null;
    next.version_id = null;
    next.song_version_id = null;
    return next;
  }

  if (key.startsWith("main-praise:") || key === "offering-hymn") {
    const versionId = sourceItem.version_id || sourceItem.song_version_id || null;
    const sourceMemo = parseServiceItemMemo(sourceItem.memo);
    const targetMemo = parseServiceItemMemo(targetItem.memo);
    next.song_id = sourceItem.song_id || null;
    next.version_id = versionId;
    next.song_version_id = versionId;
    next.raw_title = sourceItem.song_id ? "" : String(sourceItem.raw_title || "").trim();
    next.memo = serializeServiceItemMemo({
      ...targetMemo,
      formHint: sourceMemo.formHint || "",
      formPreset: sourceMemo.formPreset || null,
      formPresetDisabled: Boolean(sourceMemo.formPresetDisabled),
      formPresetRules: sourceMemo.formPresetRules || [],
      outputMode: sourceMemo.outputMode || targetMemo.outputMode || "",
      slides: sourceItem.song_id ? [] : [...(sourceMemo.slides || [])],
    });
  }

  return next;
}

async function persistSharedSundayServiceItems(service, items = [], options = {}) {
  if (!state.client || !service?.id) return;
  const serviceId = service.id;
  const existingSections = state.worshipSections.filter((section) => section.service_id === serviceId);
  const existingElements = state.worshipElements.filter((element) =>
    existingSections.some((section) => section.id === element.section_id));
  const existingSectionById = Object.fromEntries(existingSections.map((section) => [section.id, section]));
  const existingElementById = Object.fromEntries(existingElements.map((element) => [element.id, element]));
  const rows = buildWorshipPersistenceRows(
    service,
    items.filter((item) => !isUnmodifiedTemplatePlaceholder(item)),
    existingSectionById,
    existingElementById,
    options,
  );
  if (rows.sections.length) {
    const { error } = await state.client
      .from("mindex_worship_sections")
      .upsert(rows.sections, { onConflict: "id" });
    if (error) throw error;
  }
  if (rows.elements.length) {
    const { error } = await state.client
      .from("mindex_worship_elements")
      .upsert(rows.elements, { onConflict: "id" });
    if (error) throw error;
  }

  const replaceSectionIds = new Set([
    ...existingSections.map((section) => section.id),
    ...rows.sections.map((section) => section.id),
  ]);
  state.worshipSections = [
    ...state.worshipSections.filter((section) => section.service_id !== serviceId),
    ...rows.sections,
  ];
  state.worshipElements = [
    ...state.worshipElements.filter((element) => !replaceSectionIds.has(element.section_id)),
    ...rows.elements,
  ];
  state.serviceItems[serviceId] = projectWorshipServiceItemsFromTemplate(
    service,
    groupWorshipElements(rows.sections, rows.elements)[serviceId] || [],
  );
  refreshPresenterForService(serviceId);
}

function isUnmodifiedTemplatePlaceholder(item = {}) {
  return Boolean(
    item._worshipTemplateProjected
    && item._worshipTemplatePlaceholder
    && !item._worshipSectionTemplateModified
    && !item._worshipElementTemplateModified,
  );
}

function buildWorshipPersistenceRows(service, items, existingSectionById = {}, existingElementById = {}, options = {}) {
  const sectionRows = [];
  const elementRows = [];
  const sectionSort = new Map();
  const sectionElementCounts = new Map();
  const generatedSectionIds = new Map();
  const persistedAt = new Date().toISOString();

  items.forEach((item, index) => {
    const existingElement = isUuid(item.id) ? existingElementById[item.id] : null;
    const targetSection = isUuid(item._worshipSectionId) ? existingSectionById[item._worshipSectionId] : null;
    const existingElementSection = existingElement
      ? existingSectionById[existingElement.section_id]
      : null;
    const requestedSectionKey = String(item._worshipSectionKey || "").trim();
    // An item can be reclassified into a different template section. In that
    // case, retaining the element's old section silently moves the new label
    // back into the old group on every save.
    const existingSection = targetSection || (
      existingElementSection
      && (!requestedSectionKey || existingElementSection.section_key === requestedSectionKey)
        ? existingElementSection
        : null
    );
    const projectedSectionKey = [
      item._worshipSectionId,
      item._worshipSectionKey,
      item._worshipSectionTitle,
    ].map((value) => String(value || "").trim()).filter(Boolean).join(":") || `item:${index}`;
    const sectionId = existingSection?.id
      || generatedSectionIds.get(projectedSectionKey)
      || createUuid();
    if (!existingSection) generatedSectionIds.set(projectedSectionKey, sectionId);
    const elementId = existingElement?.id || createUuid();
    if (!sectionSort.has(sectionId)) sectionSort.set(sectionId, sectionSort.size + 1);
    sectionElementCounts.set(sectionId, (sectionElementCounts.get(sectionId) || 0) + 1);

    const sectionModified = Boolean(existingSection?.template_modified || item._worshipSectionTemplateModified);
    const sectionLabel = String(
      (item._worshipSectionTitle || existingSection?.title)
      || item.label
      || "",
    ).trim() || "섹션";
    const existingSectionRef = existingSection?.source_ref && typeof existingSection.source_ref === "object" ? existingSection.source_ref : {};
    const existingSectionConfig = existingSection?.config && typeof existingSection.config === "object" ? existingSection.config : {};
    if (!sectionRows.some((section) => section.id === sectionId)) {
      sectionRows.push({
        id: sectionId,
        service_id: service.id,
        sort_order: sectionSort.get(sectionId),
        section_key: sectionModified ? (existingSection?.section_key || item._worshipSectionKey || "") : (item._worshipSectionKey || existingSection?.section_key || ""),
        title: sectionLabel,
        person: existingSection?.person || "",
        template_id: existingSection?.template_id || null,
        template_modified: sectionModified,
        source_kind: existingSection?.source_kind || "mindex",
        source_ref: { ...existingSectionRef, label: sectionLabel },
        config: existingSectionConfig,
      });
    }

    const existingSourceRef = existingElement?.source_ref && typeof existingElement.source_ref === "object" ? existingElement.source_ref : {};
    const existingConfig = existingElement?.config && typeof existingElement.config === "object" ? existingElement.config : {};
    const parsed = parseServiceItemMemo(item.memo);
    const elementType = serviceElementTypeForSave(item, parsed, existingElement);
    const scriptureBody = isScriptureBodyServiceItem(item) || normalizeWorshipElementType(elementType) === "scripture_body";
    const manualBody = serviceItemManualBodyForSave(item, parsed, elementType);
    const config = serviceElementConfigForSave(existingConfig, parsed, {
      item,
      service,
      omitSlides: Boolean(manualBody) || scriptureBody,
    });
    const asset = normalizeServiceAsset(parsed.asset || existingElement?.asset);
    const sourceRef = serviceElementSourceRefForSave(existingSourceRef, item, parsed, Boolean(manualBody));
    const contentState = serviceElementContentStateForSave(item, parsed, service);
    const scriptureReferences = scriptureBody
      ? serviceItemScriptureReferences(item, parsed)
      : [];
    const scriptureReference = scriptureBody
      ? (scriptureReferences[0] || normalizeServiceItemReferenceSpacing(parsed.scriptureReference || item.raw_title || existingElement?.scripture_reference || ""))
      : (existingElement?.scripture_reference || "");
    const elementRow = {
      id: elementId,
      section_id: sectionId,
      // The table does not supply a database default. New projected elements
      // therefore need both audit timestamps in the client payload.
      created_at: existingElement?.created_at || persistedAt,
      updated_at: persistedAt,
      sort_order: sectionElementCounts.get(sectionId),
      element_type: worshipDbElementTypeForSave(elementType) || "plain_text",
      title: scriptureBody ? formatServiceScriptureReferenceList(scriptureReferences) || scriptureReference : (manualBody ? String(item.raw_title || "").trim() : serviceElementTitleForSave(item, elementType)),
      person: cleanServiceAssignee(item.assignee),
      body: manualBody || "",
      song_id: item.song_id || null,
      song_version_id: serviceItemSongVersionIdForSave(item, service),
      scripture_id: existingElement?.scripture_id || null,
      scripture_reference: scriptureReference,
      asset,
      template_id: existingElement?.template_id || null,
      template_modified: Boolean(existingElement?.template_modified || item._worshipElementTemplateModified),
      source_kind: manualBody ? "manual" : (existingElement?.source_kind || (item.song_id ? "mindex" : "manual")),
      source_ref: sourceRef,
      review_status: existingElement?.review_status || (manualBody ? "needs_review" : "draft"),
      config,
    };
    if (options.elementTypedStateColumns?.inputMode) elementRow.input_mode = contentState.inputMode || "";
    if (options.elementTypedStateColumns?.contentState) elementRow.content_state = contentState;
    elementRows.push(elementRow);
  });

  sectionRows.forEach((section) => {
    section.sort_order = sectionSort.get(section.id) || section.sort_order;
  });
  return { sections: sectionRows, elements: elementRows };
}

function serviceElementContentStateForSave(item = {}, parsed = parseServiceItemMemo(item.memo), service = null) {
  const contentState = resolvePresenterServiceItemContentState(
    item,
    parsed,
    serviceItemLinkedSong(item),
    service,
  );
  return {
    state: contentState.state,
    reason: contentState.reason,
    inputMode: contentState.inputMode,
    elementType: contentState.elementType,
    required: Boolean(contentState.required),
  };
}

function serviceItemManualBodyForSave(item = {}, parsed = parseServiceItemMemo(item.memo), elementType = "") {
  if (item.song_id) return "";
  const normalizedType = normalizeWorshipElementType(elementType);
  if (normalizedType === "scripture_body" || isScriptureBodyServiceItem(item)) return "";
  if (!["praise", "plain_text", "body"].includes(normalizedType)) return "";
  if (parsed.slides.length) return parsed.slides.join("\n\n");
  return "";
}

function serviceElementTypeForSave(item = {}, parsed = parseServiceItemMemo(item.memo), existingElement = null) {
  const explicit = serviceMemoElementType(parsed);
  if (explicit) return explicit;
  if (!item.song_id && (isSongServiceLabel(item.label) || isSpecialSongServiceItem(item)) && parsed.slides.length) return "praise";
  return normalizeWorshipElementType(existingElement?.element_type) || worshipTemplateElementType({}, item.label);
}

function worshipDbElementTypeForSave(elementType = "") {
  const type = normalizeWorshipElementType(elementType) || normalizeServiceElementType(elementType);
  if (type === "title" || type === "title_content") return "plain_text";
  if (type === "file" || type === "template") return "ppt";
  if (type === "scripture") return "scripture_reading";
  if (type === "live_praise") return "praise";
  if (type === "live_scripture") return "plain_text";
  if (type === "audio") return "plain_text";
  return type;
}

function serviceElementTitleForSave(item = {}, elementType = "") {
  const rawTitle = String(item.raw_title || "").trim();
  if (item.song_id && (isSongServiceLabel(item.label) || isSpecialSongServiceItem(item))) return "";
  if (["video", "image", "score", "audio", "file"].includes(normalizeServiceElementType(elementType))) {
    const parsed = parseServiceItemMemo(item.memo);
    return parsed.asset?.name || rawTitle;
  }
  return rawTitle;
}

function serviceElementConfigForSave(existingConfig = {}, parsed = emptyServiceItemMemo(), options = {}) {
  const config = { ...(existingConfig && typeof existingConfig === "object" ? existingConfig : {}) };
  const outputMode = serviceItemUsesFlexibleOfferingSlot(options.item) ? "" : parsed.outputMode;
  const contentState = serviceElementContentStateForSave(options.item || {}, parsed, options.service || null);
  delete config.slides;
  delete config.slideOverrides;
  delete config.slide_overrides;
  if (parsed.note) config.note = parsed.note;
  else delete config.note;
  if (parsed.formHint) {
    config.formHint = parsed.formHint;
    delete config.form_hint;
  } else {
    delete config.formHint;
    delete config.form_hint;
  }
  if (parsed.formPreset) {
    config.formPreset = parsed.formPreset;
    delete config.form_preset;
  } else {
    delete config.formPreset;
    delete config.form_preset;
  }
  if (parsed.formPresetRules?.length) {
    config.formPresetRules = parsed.formPresetRules;
    delete config.form_preset_rules;
  } else {
    delete config.formPresetRules;
    delete config.form_preset_rules;
  }
  if (parsed.formPresetDisabled) {
    config.formPresetDisabled = true;
    delete config.formHint;
    delete config.form_hint;
    delete config.formPreset;
    delete config.form_preset;
    delete config.formPresetRules;
    delete config.form_preset_rules;
    delete config.form_preset_disabled;
    delete config.disableFormPreset;
    delete config.disable_form_preset;
  } else {
    delete config.formPresetDisabled;
    delete config.form_preset_disabled;
    delete config.disableFormPreset;
    delete config.disable_form_preset;
  }
  if (hasServiceIntroSlide(parsed.introSlide)) config.introSlide = normalizeServiceIntroSlide(parsed.introSlide);
  else {
    delete config.introSlide;
    delete config.intro_slide;
    delete config.titleSlide;
    delete config.title_slide;
  }
  if (outputMode) config.outputMode = outputMode;
  else delete config.outputMode;
  if (contentState.inputMode) config.inputMode = contentState.inputMode;
  else {
    delete config.inputMode;
    delete config.input_mode;
  }
  config.contentState = {
    state: contentState.state,
    reason: contentState.reason,
    inputMode: contentState.inputMode,
    elementType: contentState.elementType,
    required: Boolean(contentState.required),
  };
  if (parsed.scriptureReferences?.length) config.scriptureReferences = [...parsed.scriptureReferences];
  else {
    delete config.scriptureReferences;
    delete config.scripture_references;
  }
  if (parsed.scriptureTranslationId) {
    config.scriptureTranslationId = parsed.scriptureTranslationId;
    delete config.scripture_translation_id;
  } else {
    delete config.scriptureTranslationId;
    delete config.scripture_translation_id;
  }
  if (parsed.scriptureReferencePayloads?.length) {
    config.scriptureReferencePayloads = normalizeServiceScriptureReferencePayloads(parsed.scriptureReferencePayloads, parsed.scriptureReferences);
    delete config.scripture_reference_payloads;
  } else {
    delete config.scriptureReferencePayloads;
    delete config.scripture_reference_payloads;
  }
  if (parsed.manualScripture) {
    config.manualScripture = parsed.manualScripture;
    delete config.manual_scripture;
  } else {
    delete config.manualScripture;
    delete config.manual_scripture;
  }
  delete config.content_state;
  if (parsed.textHighlights?.length) config.textHighlights = parsed.textHighlights;
  else {
    delete config.textHighlights;
    delete config.text_highlights;
    delete config.highlights;
  }
  if (parsed.elementType) config.elementType = parsed.elementType;
  else {
    delete config.elementType;
    delete config.element_type;
    delete config.componentType;
    delete config.component_type;
  }
  if (hasServiceAsset(parsed.asset)) config.asset = parsed.asset;
  else delete config.asset;
  if (hasServicePlaybackConfig(parsed.playback)) config.playback = parsed.playback;
  else delete config.playback;
  if (parsed.presenterRole) config.presenterRole = parsed.presenterRole;
  else {
    delete config.presenterRole;
    delete config.presenter_role;
    delete config.role;
  }
  if (parsed.hiddenInPresentation) config.hiddenInPresentation = true;
  else delete config.hiddenInPresentation;
  if (!options.omitSlides && parsed.slides.length) config.slides = parsed.slides;
  return config;
}

function serviceElementSourceRefForSave(existingSourceRef = {}, item = {}, parsed = emptyServiceItemMemo(), manualBody = false) {
  const sourceRef = { ...(existingSourceRef && typeof existingSourceRef === "object" ? existingSourceRef : {}) };
  sourceRef.label = String(item.label || sourceRef.label || "").trim();
  if (manualBody) {
    sourceRef.content_source = sourceRef.content_source || "manual_worship_element_body";
    sourceRef.note = sourceRef.note || "일회성 예배 본문은 Praise DB가 아니라 Worship element body에 보관";
  }
  return sourceRef;
}

async function saveSongMeta(song) {
  const metadata = normalizeSongMetadata(song.metadata);
  const hasPromotedColumns = hasPromotedSongMetadataColumns(song);
  const hasScriptureRefsColumn = hasSongColumn(song, "scripture_refs");
  const aggregatePraiseTypes = aggregateSongPraiseTypes(song);
  let useVersionTables = state.songVersionTablesSupported === true;

  if (useVersionTables && state.dirty.forms) {
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

  const canonicalSongId = await ensureCanonicalSongRow(song);
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
  const [existingVersions, existingCanonicalVersions] = await Promise.all([
    fetchExistingSongVersions(song.id),
    fetchExistingCanonicalSongVersions(canonicalSongId),
  ]);
  const versionOrders = assignStableVersionOrders(versions, existingCanonicalVersions, song.id);
  const versionRows = versions.map((version, index) => ({
    id: version.id,
    canonical_song_id: canonicalSongId,
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

  const existingVersionIds = existingVersions.map((version) => version.id);
  assignUniqueVersionLyricSignatures(versionRows, existingCanonicalVersions);

  const { error: versionError } = await state.client
    .from("mindex_song_versions")
    .upsert(versionRows, { onConflict: "id" });
  if (versionError) throw versionError;
  versions.forEach((version) => {
    version._worshipVersionPersisted = true;
  });

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
        canonical_song_id: canonicalSongId,
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
  await reserveExistingVersionUnitOrders(existingUnits);
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
  const title = cleanSongTitleForSave(song) || "제목 없는 찬양";
  const normalizedTitle = await resolveCanonicalNormalizedTitle(song, title);
  const payload = {
    id: song.id,
    title,
    normalized_title: normalizedTitle,
    subtitle: nullIfBlank(song.subtitle),
    original_title: nullIfBlank(song.original_title),
    hymn_no: nullIfBlank(song.hymn_no),
    source_count: 1,
  };

  const existing = await fetchCanonicalSongByNormalizedTitle(normalizedTitle);
  if (existing?.id) {
    song._canonicalSongId = existing.id;
    return existing.id;
  }

  const { data, error } = await state.client
    .from("mindex_canonical_songs")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();
  if (error) {
    if (isUniqueConstraintError(error, "mindex_canonical_songs_normalized_title_key")) {
      const racedExisting = await fetchCanonicalSongByNormalizedTitle(normalizedTitle);
      if (racedExisting?.id) {
        song._canonicalSongId = racedExisting.id;
        return racedExisting.id;
      }
    }
    throw error;
  }
  song._canonicalSongId = data?.id || song.id;
  return song._canonicalSongId;
}

async function resolveCanonicalNormalizedTitle(song, title) {
  const baseTitle = normalizeCanonicalTitle(title);
  const candidateVariant = canonicalSongVariantKey(song);
  const candidateTitle = candidateVariant ? canonicalVariantTitle(baseTitle, candidateVariant) : baseTitle;
  const candidates = [candidateTitle, baseTitle].filter(Boolean);
  const existingRows = await fetchCanonicalSongsByNormalizedTitles(candidates);
  const exactVariant = existingRows.find((row) => row.normalized_title === candidateTitle);
  if (exactVariant && isCompatibleCanonicalSong(rowMetadataForCanonicalCompare(exactVariant), song)) {
    return candidateTitle;
  }
  const exactBase = existingRows.find((row) => row.normalized_title === baseTitle);
  if (!exactBase) return candidateTitle;
  if (isCompatibleCanonicalSong(rowMetadataForCanonicalCompare(exactBase), song)) return baseTitle;
  return candidateTitle;
}

function canonicalSongVariantKey(song) {
  const title = cleanSongTitleForSave(song);
  const types = normalizePraiseTypes(song?.praise_types || aggregateSongPraiseTypes(song));
  if (types.includes("children")) return "children";
  const subtitle = nullIfBlank(song?.subtitle);
  if (subtitle && normalizeCanonicalTitle(subtitle) !== normalizeCanonicalTitle(title)) {
    return normalizeCanonicalTitle(subtitle);
  }
  return "";
}

function canonicalVariantTitle(baseTitle, variantKey) {
  const base = String(baseTitle || "").trim();
  const variant = normalizeCanonicalTitle(variantKey);
  return base && variant ? `${base}::${variant}` : base;
}

function rowMetadataForCanonicalCompare(row = {}) {
  return {
    title: row.title,
    subtitle: row.subtitle,
    hymn_no: row.hymn_no,
    original_title: row.original_title,
  };
}

function isCompatibleCanonicalSong(existing, song) {
  const existingSubtitle = normalizeCanonicalTitle(existing?.subtitle || "");
  const songSubtitle = normalizeCanonicalTitle(song?.subtitle || "");
  if (existingSubtitle && songSubtitle && existingSubtitle !== songSubtitle) return false;

  const existingTypes = normalizePraiseTypes(existing?.praise_types || []);
  const songTypes = normalizePraiseTypes(song?.praise_types || aggregateSongPraiseTypes(song));
  if (existingTypes.includes("children") !== songTypes.includes("children")) return false;

  return true;
}

async function fetchCanonicalSongByNormalizedTitle(normalizedTitle) {
  if (!normalizedTitle) return null;
  const { data, error } = await state.client
    .from("mindex_canonical_songs")
    .select("id,title,subtitle,original_title,hymn_no,normalized_title")
    .eq("normalized_title", normalizedTitle)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchCanonicalSongsByNormalizedTitles(normalizedTitles = []) {
  const titles = [...new Set(normalizedTitles.filter(Boolean))];
  if (!titles.length) return [];
  const rows = [];
  for (const title of titles) {
    const row = await fetchCanonicalSongByNormalizedTitle(title);
    if (row) rows.push(row);
  }
  return rows;
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
    .select("id,source_song_id,version_order,lyric_signature")
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
    .select("id,version_id,unit_order,curated_order")
    .in("version_id", versionIds);
  if (error) throw error;
  return data || [];
}

async function reserveExistingVersionUnitOrders(existingUnits = []) {
  const units = (existingUnits || []).filter((unit) => isUuid(unit?.id));
  if (!units.length || !state.client) return;

  const byVersion = new Map();
  units.forEach((unit) => {
    const versionId = unit.version_id || "";
    const list = byVersion.get(versionId) || [];
    list.push(unit);
    byVersion.set(versionId, list);
  });

  await Promise.all([...byVersion.values()].map(async (list) => {
    const offset = Math.max(10000, list.length + 1000);
    await Promise.all(list.map(async (unit, index) => {
      const reservedOrder = offset + index + 1;
      const { error } = await state.client
        .from("mindex_version_units")
        .update({
          unit_order: reservedOrder,
          curated_order: reservedOrder,
        })
        .eq("id", unit.id);
      if (error) throw error;
    }));
  }));
}

function assignStableVersionOrders(versions, existingCanonicalRows = [], sourceSongId = "") {
  const orders = new Map();
  const versionIds = new Set((versions || []).map((version) => version?.id).filter(Boolean));
  const used = new Set(
    (existingCanonicalRows || [])
      .filter((row) => row?.source_song_id !== sourceSongId && !versionIds.has(row?.id))
      .map((row) => Number(row?.version_order) || 0)
      .filter((order) => order > 0),
  );
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
  if (handleServiceOutlineSlideEvent(event)) return;

  const homeNextServiceAction = event.target.closest("[data-home-next-service-action]");
  if (homeNextServiceAction) {
    void openHomeNextService(homeNextServiceAction.dataset.homeNextServiceAction, homeNextServiceAction.dataset.homeServiceId);
    return;
  }

  const backgroundSelect = event.target.closest("[data-background-select]");
  if (backgroundSelect) {
    state.selectedWorshipBackgroundFile = backgroundSelect.dataset.backgroundSelect || state.selectedWorshipBackgroundFile;
    renderWorshipBackgroundsDetail();
    return;
  }

  const backgroundAction = event.target.closest("[data-background-action]");
  if (backgroundAction) {
    void handleWorshipBackgroundAction(backgroundAction);
    return;
  }

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

  const worshipEditorBtn = event.target.closest("[data-open-worship-editor]");
  if (worshipEditorBtn) {
    state.selectedServiceId = worshipEditorBtn.dataset.openWorshipEditor || state.selectedServiceId;
    const service = state.services.find((svc) => svc.id === state.selectedServiceId);
    if (service) state.selectedServiceTypeId = service.type_id;
    void switchModule("service", { clearSearch: false });
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
    renderCurrentServiceModuleDetail();
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

  const servicePrepEditorOpenBtn = event.target.closest("[data-service-prep-editor-open]");
  if (servicePrepEditorOpenBtn) {
    openServicePrepEditor(servicePrepEditorOpenBtn.dataset.servicePrepEditorOpen || state.selectedServiceId);
    return;
  }

  const servicePrepEditorCloseBtn = event.target.closest("[data-service-prep-editor-close]");
  if (servicePrepEditorCloseBtn) {
    closeServicePrepEditor();
    return;
  }

  const serviceTemplatesBtn = event.target.closest("[data-service-templates]");
  if (serviceTemplatesBtn) {
    if (!confirmDiscardServiceChanges()) return;
    state.selectedServiceTypeId = SERVICE_TEMPLATES_PANEL_ID;
    state.selectedServiceId = null;
    state.newServiceForm = null;
    renderServiceList();
    renderCurrentServiceModuleDetail();
    syncBrowserHistory();
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

  const serviceSongCreate = event.target.closest("[data-service-song-create]");
  if (serviceSongCreate) {
    createPraiseSongFromServiceItem(Number(serviceSongCreate.dataset.serviceSongCreate));
    return;
  }

  const serviceSongSelect = event.target.closest("[data-service-song-select]");
  if (serviceSongSelect) {
    selectServiceSongForItem(Number(serviceSongSelect.dataset.serviceSongIndex), serviceSongSelect.dataset.serviceSongSelect);
    return;
  }

  const serviceSongClear = event.target.closest("[data-service-song-clear]");
  if (serviceSongClear) {
    clearServiceSongForItem(Number(serviceSongClear.dataset.serviceSongClear));
    return;
  }

  const serviceBulletinAction = event.target.closest("[data-service-bulletin-action]");
  if (serviceBulletinAction) {
    void runServiceBulletinAction(
      serviceBulletinAction.dataset.serviceBulletinAction,
      serviceBulletinAction.dataset.serviceId || state.selectedServiceId,
    );
    return;
  }

  if (handlePresenterDetailClick(event)) return;

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

  const presenterJumpButton = event.target.closest("[data-presenter-jump-button]");
  if (presenterJumpButton) {
    const input = presenterJumpButton.closest(".svc-slide-counter")?.querySelector("[data-presenter-jump-input]");
    jumpPresenterToSlideInput(input);
    return;
  }

  const referenceAction = event.target.closest("[data-reference-action]");
  if (referenceAction) {
    const action = referenceAction.dataset.referenceAction;
    const id = referenceAction.dataset.referenceId;
    if (action === "new") createReferenceLink();
    if (action === "new-group") {
      createReferenceLink(state.referenceGroupSupported
        ? { title: "새 링크", groupName: nextReferenceGroupName() }
        : { title: "새 링크" });
    }
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
      openReferenceLink(link);
    }
    return;
  }

  const serviceTypeCard = event.target.closest("[data-select-service-type]");
  if (serviceTypeCard) {
    if (!confirmDiscardServiceChanges()) return;
    state.selectedServiceTypeId = worshipAppServiceTypeId(serviceTypeCard.dataset.selectServiceType);
    state.selectedServiceId = null;
    state.selectedServiceItemIndex = null;
    renderServiceList();
    renderCurrentServiceModuleDetail();
    syncBrowserHistory();
    return;
  }

  const serviceDateCard = event.target.closest(".service-date-card[data-service-id], .service-week-card[data-service-id]");
  if (serviceDateCard) {
    if (state.module === "home") {
      void openHomeNextService("service", serviceDateCard.dataset.serviceId);
      return;
    }
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

  const createSongButton = event.target.closest("[data-create-song]");
  if (createSongButton) {
    createPraiseSong();
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
    if (event.target.closest("[data-version-name-field]")) return;
    selectVersion(versionTarget.dataset.versionId);
    return;
  }

  const deleteSongButton = event.target.closest("[data-delete-song]");
  if (deleteSongButton) {
    if (deleteSongButton.disabled) return;
    deleteSelectedSong();
  }
}

function handlePresenterDetailClick(event) {
  const preparationApply = event.target.closest("[data-presenter-preparation-apply]");
  if (preparationApply) {
    applyPresenterPreparationInput(preparationApply.dataset.serviceId || state.selectedServiceId);
    return true;
  }

  if (isPresenterPreparationInputEvent(event)) return true;

  const sectionEditButton = event.target.closest("[data-presenter-section-edit]");
  if (sectionEditButton) {
    openPresenterSectionEditor(sectionEditButton.dataset.serviceId || state.selectedServiceId, {
      sectionKey: sectionEditButton.dataset.presenterSectionEdit,
    });
    return true;
  }

  const presenterSectionEditorClose = event.target.closest("[data-presenter-section-editor-close]");
  if (presenterSectionEditorClose) {
    closePresenterSectionEditor();
    return true;
  }

  const presenterSectionItemAction = event.target.closest("[data-presenter-section-item-action]");
  if (presenterSectionItemAction) {
    runPresenterSectionItemAction(
      presenterSectionItemAction.dataset.presenterSectionItemAction,
      Number(presenterSectionItemAction.dataset.serviceItemIndex),
    );
    return true;
  }

  const presenterSectionAdd = event.target.closest("[data-presenter-section-add]");
  if (presenterSectionAdd) {
    runPresenterSectionItemAction("add", -1);
    return true;
  }

  const referenceMediaAdd = event.target.closest("[data-presenter-reference-media-add]");
  if (referenceMediaAdd) {
    addPresenterReferenceMedia(
      referenceMediaAdd.dataset.serviceId || state.selectedServiceId,
      referenceMediaAdd.dataset.presenterReferenceMediaSection,
    );
    return true;
  }

  const presenterAction = event.target.closest("[data-presenter-action]");
  if (!presenterAction) return false;

  const presenterThumb = event.target.closest(".svc-slide-thumb[data-presenter-index][data-service-id]");
  if (presenterThumb && presenterAction.dataset.presenterAction === "jump") {
    event.preventDefault();
    const serviceId = presenterThumb.dataset.serviceId;
    const index = Number(presenterThumb.dataset.presenterIndex);
    if (presenterControllerIsLive(serviceId)) {
      runPresenterAction("jump", serviceId, { index });
    } else {
      selectPresenterBoardSlide(serviceId, index, {
        additive: event.metaKey || event.ctrlKey,
        range: event.shiftKey,
      });
      syncSelectedServiceItemToPresenterSlide(serviceId, index);
      renderPresenterControlState(serviceId);
    }
    scrollPresenterBoardToIndex(serviceId, index);
    return true;
  }

  if (presenterAction.dataset.presenterAction === "jump") {
    event.preventDefault();
    const serviceId = presenterAction.dataset.serviceId;
    const index = Number(presenterAction.dataset.presenterIndex);
    if (presenterControllerIsLive(serviceId)) {
      runPresenterAction("jump", serviceId, { index });
    } else {
      selectPresenterBoardSlide(serviceId, index, {
        additive: event.metaKey || event.ctrlKey,
        range: event.shiftKey,
      });
      syncSelectedServiceItemToPresenterSlide(serviceId, index);
      renderPresenterControlState(serviceId);
    }
    scrollPresenterBoardToIndex(serviceId, index, { force: true });
    return true;
  }

  if (presenterAction.dataset.presenterAction === "detect-screens") {
    void requestPresenterScreens();
    return true;
  }

  runPresenterAction(presenterAction.dataset.presenterAction, presenterAction.dataset.serviceId, {
    index: presenterAction.dataset.presenterIndex,
    nextServiceId: presenterAction.dataset.nextServiceId,
    nextServiceType: presenterAction.dataset.nextServiceType,
    nextServiceDate: presenterAction.dataset.nextServiceDate,
  });
  return true;
}

function isPresenterPreparationInputEvent(event) {
  return Boolean(event?.target?.closest?.("[data-presenter-preparation-input]"));
}

function handleDetailKeydown(event) {
  const preparationInput = event.target.closest("[data-presenter-preparation-input]");
  if (preparationInput) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      void applyPresenterPreparationInput(preparationInput.dataset.serviceId || state.selectedServiceId);
      return;
    }
    event.stopPropagation();
    return;
  }

  const presenterJumpInput = event.target.closest("[data-presenter-jump-input]");
  if (presenterJumpInput) {
    const serviceId = presenterJumpInput.dataset.serviceId || state.presenter.serviceId;
    const presenterAction = presenterKeyboardActionForJumpInput(event.key);
    if (presenterAction) {
      event.preventDefault();
      event.stopPropagation();
      state.presenter.jumpDraft = "";
      runPresenterAction(presenterAction, serviceId);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      jumpPresenterToSlideInput(presenterJumpInput);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      clearPresenterJumpDraft(presenterJumpInput.dataset.serviceId || state.presenter.serviceId);
      return;
    }
    event.stopPropagation();
    return;
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

  const citationReferenceInput = event.target.closest("[data-presenter-citation-reference-input]");
  if (citationReferenceInput) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void appendPresenterCitationReference(citationReferenceInput);
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

  if (event.key === "Enter" && event.target.matches("input[data-song-field], input[data-song-meta-field], input[data-version-name-field]")) {
    event.preventDefault();
    saveAll();
    return;
  }
  const serviceTextField = event.target.closest("input[data-service-item-field]");
  if (serviceTextField && event.key === "Enter") {
    event.preventDefault();
    if (isDeferredServiceTextInput(serviceTextField)) {
      commitDeferredServiceTextInput(serviceTextField, { save: true });
    } else {
      updateServiceItemField(serviceTextField);
      saveCommittedServiceItem(serviceTextField.dataset.serviceItemIndex, serviceTextField.dataset.serviceId || state.selectedServiceId);
    }
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

  const openSongTarget = event.target.closest("[data-open-song]");
  if (openSongTarget) {
    event.preventDefault();
    void openGlobalSongResult(openSongTarget.dataset.openSong);
    return;
  }

  const versionTarget = event.target.closest(".version-picker[data-version-id]");
  if (!versionTarget) return;

  event.preventDefault();
  selectVersion(versionTarget.dataset.versionId);
}

function handleDetailPointerDown(event) {
  if (handlePresenterBoardPointerDown(event)) return;
  if (event.target.closest("[data-form-action], [data-version-action], [data-version-name-field], [data-service-item-action], [data-presenter-action]")) {
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
  if (handlePresenterBoardPointerOver(event)) return;
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
  if (state.presenterBoardSelection.drag) {
    state.presenterBoardSelection.drag = null;
  }
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

  const preparationInput = event.target.closest("[data-presenter-preparation-input]");
  if (preparationInput) {
    const serviceId = preparationInput.dataset.serviceId || state.selectedServiceId;
    if (serviceId) state.presenterPreparationDrafts[serviceId] = preparationInput.value;
    event.stopPropagation();
    return;
  }

  const presenterJumpInput = event.target.closest("[data-presenter-jump-input]");
  if (presenterJumpInput) {
    setPresenterJumpDraft(presenterJumpInput.value, presenterJumpInput.dataset.serviceId || state.presenter.serviceId);
    event.stopPropagation();
    return;
  }

  const presenterSectionField = event.target.closest("[data-presenter-section-field]");
  if (presenterSectionField) {
    updatePresenterSectionField(presenterSectionField);
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
    if (isDeferredServiceTextInput(serviceField)) {
      if (isDeferredServiceScriptureReferenceInput(serviceField)) {
        scheduleDeferredServiceScriptureReferenceCommit(serviceField);
      }
      return;
    }
    updateServiceItemField(serviceField);
    if (serviceField.matches("select")) saveCommittedServiceItem(serviceField.dataset.serviceItemIndex, serviceField.dataset.serviceId || state.selectedServiceId);
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

  const versionNameField = event.target.closest("[data-version-name-field]");
  if (versionNameField) {
    updateVersionNameField(versionNameField);
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

function handlePresenterPreparationPaste(event) {
  const input = event.target.closest("[data-presenter-preparation-input]");
  if (!input) return;
  const text = (event.clipboardData || window.clipboardData)?.getData("text/plain");
  if (!text) return;
  event.preventDefault();
  event.stopPropagation();
  const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
  input.setRangeText(text, start, end, "end");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function handleDetailSubmit(event) {
  const authForm = event.target.closest("[data-auth-form]");
  if (!authForm) return;
  event.preventDefault();
  const email = authForm.querySelector("[data-auth-email]")?.value || state.auth.email;
  void requestAdminSignIn(email);
}

function handleDetailChange(event) {
  const backgroundTarget = event.target.closest("[data-background-target]");
  if (backgroundTarget) {
    state.selectedWorshipBackgroundFile = backgroundTarget.value;
    renderWorshipBackgroundsDetail();
    return;
  }

  const serviceMusicFile = event.target.closest("[data-service-music-file]");
  if (serviceMusicFile) {
    loadServiceMusicFile(serviceMusicFile.files?.[0]);
    serviceMusicFile.value = "";
    return;
  }

  const serviceMusicVolume = event.target.closest("[data-service-music-volume]");
  if (serviceMusicVolume) {
    setServiceMusicVolume(serviceMusicVolume.value);
    return;
  }

  const referenceMediaFile = event.target.closest("[data-presenter-reference-media-file]");
  if (referenceMediaFile) {
    void uploadPresenterReferenceMediaFile(referenceMediaFile);
    return;
  }

  const referenceMediaDirectFile = event.target.closest("[data-presenter-reference-media-direct-file]");
  if (referenceMediaDirectFile) {
    void addAndUploadPresenterReferenceMedia(referenceMediaDirectFile);
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
    if (isDeferredServiceTextInput(serviceField)) return;
    updateServiceItemField(serviceField);
    if (serviceField.matches("select")) saveCommittedServiceItem(serviceField.dataset.serviceItemIndex, serviceField.dataset.serviceId || state.selectedServiceId);
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

  const versionNameField = event.target.closest("[data-version-name-field]");
  if (versionNameField) {
    updateVersionNameField(versionNameField);
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

function isPresenterAdvanceShortcutKey(key = "") {
  return ["Enter", "ArrowRight", "ArrowDown", "PageDown", " ", "ArrowLeft", "ArrowUp", "PageUp"].includes(key);
}

function presenterKeyboardActionForJumpInput(key = "") {
  if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(key)) return "next";
  if (["ArrowLeft", "ArrowUp", "PageUp"].includes(key)) return "prev";
  if (key === "Home") return "first";
  if (key === "End") return "last";
  return "";
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

function updateVersionNameField(field) {
  const song = getSelectedSong();
  if (!song) return;
  const versionId = field.dataset.versionNameField;
  const version = (song.versions || []).find((item) => item.id === versionId);
  if (!version) return;

  const cleanName = normalizeGeneratedVersionName(field.value) || "Default";
  version.name = cleanName;
  version.curated_version_name = cleanName;
  version.raw_section_name = cleanName === "Default" ? null : cleanName;
  version.version_label = cleanName;
  state.dirty.forms = true;
  state.dirty.song = true;
  updateSaveState();
}

function updateSongMetadataField(field) {
  const song = getSelectedSong();
  if (!song) return;

  const key = field.dataset.songMetaField;
  const metadata = normalizeSongMetadata(song.metadata);
  if (key === "presenter_form") {
    metadata[key] = normalizeServiceFormPreset(field.value, field.value, "song-default");
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
  state.dirty.forms = true;
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
    service.title = normalizeWorshipServiceTitle(field.value, service);
  } else if (key === "leader") {
    if (!serviceUsesPraiseLeader(service.type_id)) {
      service.leader = "";
      service.praiseLeader = "";
      return;
    }
    service.leader = field.value;
    service.praiseLeader = field.value;
  } else if (key === "praiseTeam") {
    setServicePraiseTeamName(service, field.value);
  } else if (key === "tags") {
    const praiseTeam = servicePraiseTeamName(service);
    service.tags = field.value.split(",").map((t) => t.trim()).filter(Boolean);
    setServicePraiseTeamName(service, praiseTeam);
  }
  state.dirty.service = true;
  refreshPresenterForService(service.id);
  updateSaveState();
}

function updateNewServiceFormField(field) {
  if (!state.newServiceForm) return;
  const key = field.dataset.newServiceField;
  if (["date", "title", "leader", "praiseTeam", "tags"].includes(key)) {
    if (key === "leader" && !serviceUsesPraiseLeader(state.newServiceForm.type_id)) {
      state.newServiceForm[key] = "";
      return;
    }
    state.newServiceForm[key] = field.value;
  }
}

function isDeferredServiceTextInput(field) {
  if (!field?.matches?.('input[type="text"][data-service-item-field], input:not([type])[data-service-item-field]')) return false;
  return !field.hasAttribute("data-service-song-required");
}

function isDeferredServiceScriptureReferenceInput(field) {
  if (!isDeferredServiceTextInput(field) || field.dataset.serviceItemField !== "raw_title") return false;
  const serviceId = field.dataset.serviceId || state.selectedServiceId;
  const item = getServiceItems(serviceId)[Number(field.dataset.serviceItemIndex)];
  return Boolean(item && isScriptureBodyServiceItem(item));
}

const deferredServiceScriptureReferenceTimers = new Map();

function scheduleDeferredServiceScriptureReferenceCommit(field) {
  const serviceId = field.dataset.serviceId || state.selectedServiceId;
  const index = Number(field.dataset.serviceItemIndex);
  if (!serviceId || !Number.isFinite(index)) return;
  const key = `${serviceId}:${index}`;
  const existingTimer = deferredServiceScriptureReferenceTimers.get(key);
  if (existingTimer) window.clearTimeout(existingTimer);

  const commit = () => {
    deferredServiceScriptureReferenceTimers.delete(key);
    if (!field.isConnected) return;
    commitDeferredServiceTextInput(field, { save: true });
  };
  if (!String(field.value || "").trim()) {
    commit();
    return;
  }
  deferredServiceScriptureReferenceTimers.set(key, window.setTimeout(commit, 520));
}

function commitDeferredServiceTextInput(field, options = {}) {
  if (!isDeferredServiceTextInput(field)) return false;
  const initialValue = String(field.dataset.initialValue ?? field.value);
  if (field.value === initialValue) return false;
  const serviceId = field.dataset.serviceId || state.selectedServiceId;
  updateServiceItemField(field, { deferPresenterRefresh: true });
  field.dataset.initialValue = field.value;
  if (options.save) {
    saveCommittedServiceItem(field.dataset.serviceItemIndex, serviceId, {
      renderAfterSave: false,
      silent: true,
    });
  }
  return true;
}

function commitActiveDeferredServiceTextInput(serviceId = state.selectedServiceId) {
  const field = document.activeElement?.closest?.("input[data-service-item-field]");
  if (!field || !isDeferredServiceTextInput(field)) return false;
  const fieldServiceId = field.dataset.serviceId || state.selectedServiceId;
  if (serviceId && fieldServiceId !== serviceId) return false;
  return commitDeferredServiceTextInput(field);
}

function saveCommittedServiceItem(index, serviceId = state.selectedServiceId, options = {}) {
  const item = getServiceItems(serviceId)[Number(index)];
  const service = state.services.find((candidate) => candidate.id === serviceId);
  if (!item || !service || serviceItemSongSelectionInvalid(item, service) || serviceItemScriptureInputInvalid(item)) return;
  void resolveAndSaveCommittedServiceItem(serviceId, Number(index), options);
}

async function resolveAndSaveCommittedServiceItem(serviceId, index, options = {}) {
  await resolveServiceScriptureBeforeSave(serviceId, index);
  const item = getServiceItems(serviceId)[index];
  const service = state.services.find((candidate) => candidate.id === serviceId);
  if (!item || !service || serviceItemSongSelectionInvalid(item, service) || serviceItemScriptureInputInvalid(item)) return;
  await saveService(serviceId, options);
}

function updateServiceItemField(field, options = {}) {
  const serviceId = field.dataset.serviceId || state.selectedServiceId;
  const items = getServiceItems(serviceId);
  const index = Number(field.dataset.serviceItemIndex);
  const item = items[index];
  if (!item) return;

  const key = field.dataset.serviceItemField;
  const service = state.services.find((candidate) => candidate.id === serviceId) || selectedServiceForEditor();
  item._worshipElementTemplateModified = true;
  markServiceItemSharedContentDirty(item, service);
  item._worshipTemplatePlaceholder = false;
  const strictSongInput = key === "raw_title" && serviceItemRequiresSongSelection(item, service);
  if (key === "label" || key === "assignee" || key === "raw_title") {
    item[key] = key === "raw_title" ? normalizeServiceItemRawTitleForItem(item, field.value) : field.value;
    if (key === "raw_title") {
      if (strictSongInput) {
        item.song_id = null;
        item.version_id = null;
        item.song_version_id = null;
      }
      const parsed = clearGeneratedServiceScriptureSlides(item);
      if (isScriptureBodyServiceItem(item)) {
        const references = serviceItemSupportsScriptureReferenceList(item)
          ? normalizeServiceScriptureReferenceList(field.value)
          : [];
        parsed.scriptureReferences = references;
        parsed.scriptureReference = references[0] || normalizeServiceItemReferenceSpacing(item.raw_title || "");
        parsed.scriptureReferencePayloads = normalizeServiceScriptureReferencePayloads(parsed.scriptureReferencePayloads, references);
        parsed.slides = [];
        if (references.length) item.raw_title = formatServiceScriptureReferenceList(references);
      } else if (isLiturgicalBodyServiceItem(item)) {
        const bodyText = String(item.raw_title || "").trim();
        parsed.slides = bodyText ? [bodyText] : [];
      }
      if (serviceItemUsesFlexibleOfferingSlot(item)) parsed.outputMode = "";
      item.memo = serializeServiceItemMemo(parsed);
      applyServiceSongSelectionWithService(item, service);
      scheduleServiceScriptureBodyResolve(serviceId, index);
    }
  }
  if (key === "version_id") {
    const song = serviceItemLinkedSong(item);
    const versions = serviceSelectableSongVersions(song, item, service);
    item.version_id = versions.some((version) => version.id === field.value) ? field.value : null;
    item.song_version_id = item.version_id;
  }
  if (key === "scripture_translation_id") {
    const parsed = parseServiceItemMemo(item.memo);
    const translationId = String(field.value || "").trim();
    if (state.bibleTranslations.some((translation) => translation.id === translationId)) parsed.scriptureTranslationId = translationId;
    else delete parsed.scriptureTranslationId;
    item.memo = serializeServiceItemMemo(parsed);
    scheduleServiceScriptureBodyResolve(serviceId, index);
  }
  if (key === "scripture_reference_translation_id" || key === "manual_scripture_translation_label" || key === "manual_scripture_text") {
    const referenceIndex = Number(field.dataset.scriptureReferenceIndex);
    const parsed = parseServiceItemMemo(item.memo);
    updateServiceScriptureReferencePayload(parsed, Number.isFinite(referenceIndex) ? referenceIndex : 0, (payload) => {
      if (key === "scripture_reference_translation_id") {
        const translationId = String(field.value || "").trim();
        if (serviceBibleTranslationById(translationId)) payload.scriptureTranslationId = translationId;
        else delete payload.scriptureTranslationId;
      }
      const manual = normalizeServiceManualScripture(payload.manualScripture) || { reference: payload.reference, verses: [] };
      if (key === "manual_scripture_translation_label") {
        const label = String(field.value || "").trim();
        if (label) payload.manualTranslationLabel = label;
        else delete payload.manualTranslationLabel;
        payload.manualScripture = normalizeServiceManualScripture({
          ...manual,
          reference: payload.reference,
          translationLabel: label,
        });
      }
      if (key === "manual_scripture_text") {
        payload.manualScripture = parseServiceManualScriptureInput(
          field.value,
          payload.reference,
          normalizeServiceManualScripture(payload.manualScripture)?.translationLabel || payload.manualTranslationLabel || "",
        );
      }
      return payload;
    });
    item.memo = serializeServiceItemMemo(parsed);
    scheduleServiceScriptureBodyResolve(serviceId, index);
  }
  if (key === "memo_note" || key === "slide_overrides" || key === "form_hint" || key === "element_type" || key === "component_type" || key === "asset_name" || key === "asset_url" || key === "presenter_role" || key === "auto_advance_at") {
    const parsed = parseServiceItemMemo(item.memo);
    if (key === "memo_note") parsed.note = field.value;
    if (key === "slide_overrides") parsed.slides = parseServiceSlideOverrideInput(field.value);
    if (key === "form_hint") {
      const formHint = String(field.value || "").trim();
      parsed.formHint = formHint;
      parsed.formPreset = formHint
        ? normalizeServiceFormPreset(formHint, formHint, "manual")
        : null;
      parsed.formPresetDisabled = !formHint;
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
    if (key === "presenter_role") {
      parsed.presenterRole = normalizeServicePresenterRole(field.value);
    }
    if (key === "auto_advance_at") {
      const playback = { ...(parsed.playback || {}) };
      const autoAdvanceAt = String(field.value || "").trim();
      if (autoAdvanceAt) playback.autoAdvanceAt = autoAdvanceAt;
      else delete playback.autoAdvanceAt;
      parsed.playback = normalizeServicePlaybackConfig(playback, serviceMemoElementType(parsed));
    }
    item.memo = serializeServiceItemMemo(parsed);
  }
  if (key === "label") {
    item.raw_title = normalizeServiceItemRawTitle(item.label, item.raw_title);
    if (serviceItemRequiresSongSelection(item, service)) {
      item.song_id = null;
      item.version_id = null;
      item.song_version_id = null;
    } else {
      applyServiceSongSelection(item);
    }
    scheduleServiceScriptureBodyResolve(serviceId, index);
  }
  applyServicePreparationDefaults(item, serviceId);
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  if (options.deferPresenterRefresh) {
    requestAnimationFrame(() => refreshPresenterForService(serviceId));
  } else {
    refreshPresenterForService(serviceId);
  }
  updateSaveState();
}

const SERVICE_ELEMENT_TYPES = new Set(["", ...Object.keys(SERVICE_ELEMENT_LABELS)]);
const SERVICE_ELEMENT_TYPE_ALIASES = {
  title: "title",
  "제목": "title",
  "제목만": "title",
  "제목 만": "title",
  title_content: "title_content",
  title_body: "title_content",
  "title-content": "title_content",
  "title-body": "title_content",
  "제목/내용": "title_content",
  "제목 / 내용": "title_content",
  "제목본문": "title_content",
  "제목 본문": "title_content",
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
  audio: "audio",
  "오디오": "audio",
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
  live_scripture: "live_scripture",
  activity: "live_scripture",
  "활동": "live_scripture",
  "실시간성구": "live_scripture",
  "실시간 성구": "live_scripture",
  "실시간성구송출": "live_scripture",
  "실시간 성구 송출": "live_scripture",
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
  audio: "audio",
  youtube: "youtube",
  "오디오": "audio",
  "유튜브": "youtube",
};
const SERVICE_ASSET_KINDS = new Set(["", "file", "video", "pdf", "image", "score", "audio", "youtube"]);

function serviceAssetKindForElementType(elementType) {
  return ["file", "video", "image", "score", "audio"].includes(elementType) ? elementType : "";
}

function normalizeServiceElementType(value) {
  const type = String(value || "").trim().toLowerCase();
  const normalized = SERVICE_ELEMENT_TYPE_ALIASES[type] || type;
  return SERVICE_ELEMENT_TYPES.has(normalized) ? normalized : "";
}

function serviceMemoElementType(memo = {}) {
  return normalizeServiceElementType(memo.elementType || memo.element_type || memo.componentType || memo.component_type);
}

function normalizeServiceInputMode(value) {
  const mode = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = {
    praise: "praise_db",
    praise_db: "praise_db",
    song: "praise_db",
    song_db: "praise_db",
    text: "text",
    manual_text: "text",
    person: "text",
    assignee: "text",
    scripture: "scripture",
    bible: "scripture",
    asset: "asset",
    media: "asset",
    file: "asset",
    config: "config",
    none: "none",
  };
  return aliases[mode] || "";
}

function serviceInputModeForElementType(elementType = "") {
  const type = normalizeServiceElementType(elementType) || normalizeWorshipElementType(elementType);
  if (["praise", "live_praise", "score"].includes(type)) return "praise_db";
  if (["scripture_reading", "scripture_body"].includes(type)) return "scripture";
  if (["image", "video", "audio", "file", "pdf", "ppt", "template"].includes(type)) return "asset";
  if (["live_scripture", "editable"].includes(type)) return "config";
  if (type === "blank") return "none";
  if (["title", "title_content", "title_person", "plain_text", "body"].includes(type)) return "text";
  return "text";
}

function serviceMemoInputMode(memo = {}, item = {}) {
  const explicit = normalizeServiceInputMode(memo.inputMode || memo.input_mode || item.inputMode || item.input_mode);
  return explicit || serviceInputModeForElementType(serviceMemoElementType(memo));
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
        formLabel: String(slide.formLabel || slide.form_label || slide.scoreFormLabel || slide.score_form_label || slide.form || "").trim(),
        formKey: String(slide.formKey || slide.form_key || slide.scoreFormKey || slide.score_form_key || "").trim(),
        order: Number(slide.order || slide.sort || slide.index || index + 1) || index + 1,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function applyServicePreparationDefaults(item, serviceId = state.selectedServiceId) {
  const parsed = parseServiceItemMemo(item?.memo);
  if (!isServicePreparationItem(item, parsed)) return item;
  const role = normalizeServicePresenterRole(parsed.presenterRole) || presenterPreparationRole(item, parsed);
  const elementType = servicePreparationElementTypeForRole(role, serviceId);
  const asset = normalizeServiceAsset(parsed.asset);
  asset.kind = elementType;
  const rawTitle = String(item.raw_title || "").trim();
  item.label = servicePreparationElementLabel(role);
  if (!rawTitle || isReadyServiceTemplateLabel(rawTitle) || isPreparationRoleTitle(rawTitle)) item.raw_title = "";
  parsed.elementType = elementType;
  parsed.componentType = elementType;
  parsed.presenterRole = role;
  parsed.asset = asset;
  item.memo = serializeServiceItemMemo(parsed);
  return item;
}

function servicePreparationElementLabel(role = "") {
  const normalized = normalizeServicePresenterRole(role);
  if (normalized === "intro") return "인트로";
  if (normalized === "still") return "첫 화면";
  return "대기 영상";
}

function servicePreparationElementTypeForRole(role = "", serviceId = state.selectedServiceId) {
  const normalized = normalizeServicePresenterRole(role);
  if (normalized === "waiting_loop" || normalized === "intro") return "video";
  if (normalized === "still") return "image";
  return servicePreparationElementTypeForServiceId(serviceId);
}

function presenterPreparationRoleLabel(role = "") {
  const normalized = normalizeServicePresenterRole(role);
  if (normalized === "waiting_loop") return "대기 영상";
  if (normalized === "intro") return "인트로";
  if (normalized === "still") return "첫 화면";
  return "준비";
}

function isPreparationRoleTitle(value = "") {
  const compact = compactSearchValue(value);
  return ["대기영상", "인트로", "카운트다운", "시작영상", "첫화면", "정지화면"].includes(compact);
}

function isLegacyImportArtifactName(value) {
  const name = presenterMediaFileName(value);
  return /^(?:Elem|Element|Section|Slide)_\d*[_-]/i.test(name) || /^(?:Elem|Element|Section|Slide)_/i.test(name);
}

function hasServiceAsset(asset) {
  return Boolean(asset && (asset.kind || asset.name || asset.url || asset.slides?.length));
}

function normalizeServicePlaybackConfig(value, elementType = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output = String(value.output || value.mode || value.target || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const normalizedOutput = {
    controller: "controller",
    controller_audio: "controller-audio",
    audio_controller: "controller-audio",
    presenter: "presenter",
    presenter_video: "presenter-video",
    external: "external",
    external_open: "external-open",
  }[output] || output;
  const playback = {};
  if (normalizedOutput) playback.output = normalizedOutput;
  ["autoplay", "muted", "loop", "controls", "autoAdvanceOnEnd"].forEach((key) => {
    const raw = firstDefinedValue(value[key], value[key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)]);
    const normalized = normalizeServicePlaybackBoolean(raw);
    if (normalized !== null) playback[key] = normalized;
  });
  const advanceOnEnd = normalizeServicePlaybackBoolean(firstDefinedValue(value.advanceOnEnd, value.advance_on_end, value.autoAdvance, value.auto_advance));
  if (advanceOnEnd !== null) playback.autoAdvanceOnEnd = advanceOnEnd;
  const autoAdvanceAt = String(firstDefinedValue(value.autoAdvanceAt, value.auto_advance_at, value.advanceAt, value.advance_at, value.scheduledAdvanceAt, value.scheduled_advance_at) || "").trim();
  if (autoAdvanceAt) playback.autoAdvanceAt = autoAdvanceAt;
  const startAt = String(firstDefinedValue(value.startAt, value.start_at, value.scheduledStartAt, value.scheduled_start_at) || "").trim();
  if (startAt) playback.startAt = startAt;
  const durationSeconds = Number(firstDefinedValue(value.durationSeconds, value.duration_seconds, value.duration, value.lengthSeconds, value.length_seconds));
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) playback.durationSeconds = durationSeconds;
  const volume = Number(firstDefinedValue(value.volume, value.volumeLevel, value.volume_level));
  if (Number.isFinite(volume)) playback.volume = Math.min(Math.max(volume, 0), 1);
  const type = normalizeServiceElementType(elementType);
  if (!playback.output && type === "audio") playback.output = "controller-audio";
  return Object.keys(playback).length ? playback : null;
}

function normalizeServicePresenterRole(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compactKey = raw.replace(/\s+/g, "");
  const normalizedKey = raw.toLowerCase().replace(/[-\s]+/g, "_");
  return PRESENTER_ROLE_ALIASES[raw]
    || PRESENTER_ROLE_ALIASES[compactKey]
    || PRESENTER_ROLE_ALIASES[normalizedKey]
    || "";
}

function hasServicePlaybackConfig(playback) {
  return Boolean(playback && typeof playback === "object" && Object.keys(playback).length);
}

function normalizeServicePlaybackBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off", "아니오", "아님"].includes(text)) return false;
  if (["true", "1", "yes", "on", "예", "맞음"].includes(text)) return true;
  return Boolean(text);
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

function normalizeOptionalBoolean(value) {
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

const LEGACY_PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS = ["1절", "2절", "간주", "마지막 절"];
const PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS = ["1절", "후렴", "2절", "후렴", "간주", "마지막 절", "후렴"];
const PUBLIC_SPECIAL_HYMN_FORM_PRESET_HINT = "1절-후렴-2절-후렴-간주-마지막 절-후렴";

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
  if (source?.omitUnlisted || source?.omit_unlisted) preset.omitUnlisted = true;
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
      const appendCodaWhenAvailable = Boolean(parsedRule.appendCodaWhenAvailable || parsedRule.append_coda_when_available);
      const omitUnlisted = Boolean(parsedRule.omitUnlisted || parsedRule.omit_unlisted);
      return preset
        ? { when, formPreset: normalizeServiceFormPresetRulePreset(preset, when), ...(appendCodaWhenAvailable ? { appendCodaWhenAvailable } : {}), ...(omitUnlisted ? { omitUnlisted } : {}) }
        : null;
    })
    .filter(Boolean);
}

function normalizeServiceFormPresetRulePreset(preset, when = {}) {
  if (!preset?.forms?.length) return preset;
  const songTypes = normalizePraiseTypes(when.songType || when.song_type || when.praiseType || when.praise_type);
  const isHymnRule = songTypes.includes("hymn");
  if (!isHymnRule) return preset;
  const formsKey = preset.forms.map((item) => compactSearchValue(item)).join("|");
  const legacyKey = LEGACY_PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS.map((item) => compactSearchValue(item)).join("|");
  if (formsKey !== legacyKey) return preset;
  const legacyHint = LEGACY_PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS.join("-");
  const hint = compactSearchValue(preset.hint || "") === compactSearchValue(legacyHint)
    ? PUBLIC_SPECIAL_HYMN_FORM_PRESET_HINT
    : firstNonBlankString(preset.hint, PUBLIC_SPECIAL_HYMN_FORM_PRESET_HINT);
  return {
    ...preset,
    forms: [...PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS],
    hint,
    omitUnlisted: true,
  };
}

function emptyServiceItemMemo(rawNote = "") {
  return {
    note: String(rawNote || "").trim(),
    slides: [],
    scriptureReference: "",
    scriptureReferences: [],
    scriptureTranslationId: "",
    scriptureReferencePayloads: [],
    manualScripture: null,
    introSlide: null,
    formHint: "",
    formPreset: null,
    formPresetDisabled: false,
    formPresetRules: [],
    templateKey: "",
    templateVariant: "",
    elementType: "",
    componentType: "",
    outputMode: "",
    inputMode: "",
    textHighlights: [],
    asset: { kind: "", name: "", url: "" },
    playback: null,
    presenterRole: "",
    hiddenInPresentation: false,
    templateSuppressed: false,
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
      const presenterRole = normalizeServicePresenterRole(parsed.presenterRole || parsed.presenter_role || parsed.role);
      const introSlide = normalizeServiceIntroSlide(parsed.introSlide || parsed.intro_slide || parsed.titleSlide || parsed.title_slide);
      return {
        note: String(parsed.note || parsed.memo || "").trim(),
        slides: Array.isArray(parsed.slides)
          ? parsed.slides.map((slide) => String(slide || "").trim()).filter(Boolean)
          : [],
        scriptureReference: String(parsed.scriptureReference || parsed.scripture_reference || "").trim(),
        scriptureReferences: normalizeServiceScriptureReferenceList(parsed.scriptureReferences || parsed.scripture_references),
        scriptureTranslationId: String(parsed.scriptureTranslationId || parsed.scripture_translation_id || "").trim(),
        scriptureReferencePayloads: normalizeServiceScriptureReferencePayloads(parsed.scriptureReferencePayloads || parsed.scripture_reference_payloads),
        manualScripture: normalizeServiceManualScripture(parsed.manualScripture || parsed.manual_scripture),
        introSlide,
        formHint: String(parsed.formHint || parsed.form_hint || parsed.forms || "").trim(),
        formPreset: normalizeServiceFormPreset(parsed.formPreset || parsed.form_preset, parsed.formHint || parsed.form_hint),
        formPresetDisabled: Boolean(parsed.formPresetDisabled || parsed.form_preset_disabled || parsed.disableFormPreset || parsed.disable_form_preset),
        formPresetRules: normalizeServiceFormPresetRules(parsed.formPresetRules || parsed.form_preset_rules),
        templateKey: String(parsed.templateKey || parsed.template_key || "").trim(),
        templateVariant: String(parsed.templateVariant || parsed.template_variant || "").trim(),
        elementType,
        componentType: elementType,
        outputMode: normalizeServiceOutputMode(parsed.outputMode || parsed.output_mode || parsed.renderMode || parsed.render_mode),
        inputMode: normalizeServiceInputMode(parsed.inputMode || parsed.input_mode),
        textHighlights: normalizeServiceTextHighlights(parsed.textHighlights || parsed.text_highlights || parsed.highlights),
        asset,
        playback: normalizeServicePlaybackConfig(parsed.playback, elementType),
        presenterRole,
        hiddenInPresentation: Boolean(parsed.hiddenInPresentation || parsed.hidden_in_presentation || parsed.hidden),
        templateSuppressed: Boolean(parsed.templateSuppressed || parsed.template_suppressed),
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

function normalizeServiceIntroSlide(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const title = firstNonBlankString(value.title, value.heading, value.label, value.sectionTitle, value.section_title);
  const body = firstNonBlankString(value.body, value.content, value.subtitle, value.text, value.elementTitle, value.element_title);
  const enabled = value.enabled === undefined ? true : normalizeOptionalBoolean(value.enabled) !== false;
  if (!enabled || (!title && !body)) return null;
  return { title, body };
}

function normalizeServiceManualScripture(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const verses = (Array.isArray(value.verses) ? value.verses : [])
    .map((verse) => {
      if (!verse || typeof verse !== "object") return null;
      const text = String(verse.text || verse.content || "").trim();
      if (!text) return null;
      const number = Number(verse.number || verse.verse);
      const verseEnd = Number(verse.verseEnd || verse.verse_end);
      return {
        ...(Number.isFinite(number) && number > 0 ? { number } : {}),
        ...(Number.isFinite(verseEnd) && verseEnd > 0 ? { verseEnd } : {}),
        text,
      };
    })
    .filter(Boolean);
  if (!verses.length) return null;
  const reference = String(value.reference || value.scriptureReference || value.scripture_reference || "").trim();
  const translationLabel = String(value.translationLabel || value.translation_label || value.translation || "").trim();
  return { ...(reference ? { reference } : {}), ...(translationLabel ? { translationLabel } : {}), verses };
}

function normalizeServiceScriptureReferenceKey(value = "") {
  const text = normalizeServiceItemReferenceSpacing(value);
  const reference = parseBibleReference(text);
  return compactSearchValue(reference ? formatServiceBibleReference(reference, text) : text);
}

function normalizeServiceScriptureReferencePayloads(value, references = []) {
  const source = Array.isArray(value)
    ? value
    : (Array.isArray(value?.items) ? value.items : []);
  const normalized = source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const reference = normalizeServiceItemReferenceSpacing(firstNonBlankString(
        item.reference,
        item.scriptureReference,
        item.scripture_reference,
      ));
      if (!reference) return null;
      const scriptureTranslationId = String(item.scriptureTranslationId || item.scripture_translation_id || item.translationId || item.translation_id || "").trim();
      const manualTranslationLabel = String(item.manualTranslationLabel || item.manual_translation_label || "").trim();
      const manualScripture = normalizeServiceManualScripture(item.manualScripture || item.manual_scripture);
      if (!scriptureTranslationId && !manualTranslationLabel && !manualScripture) return null;
      return {
        reference,
        ...(scriptureTranslationId ? { scriptureTranslationId } : {}),
        ...(manualTranslationLabel ? { manualTranslationLabel } : {}),
        ...(manualScripture ? { manualScripture: { ...manualScripture, reference: manualScripture.reference || reference } } : {}),
      };
    })
    .filter(Boolean);
  if (!references?.length) return normalized;
  const byReference = new Map(normalized.map((item) => [normalizeServiceScriptureReferenceKey(item.reference), item]));
  return references
    .map((reference) => {
      const normalizedReference = normalizeServiceItemReferenceSpacing(reference);
      const item = byReference.get(normalizeServiceScriptureReferenceKey(normalizedReference));
      return item ? { ...item, reference: normalizedReference } : null;
    })
    .filter(Boolean);
}

function parseServiceManualScriptureInput(value = "", reference = "", translationLabel = "") {
  const text = String(value || "").trim();
  if (!text) return null;
  const verses = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^(?:\*\*)?(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?(?:\*\*)?[\s.:：]*(.+)$/u);
    if (match) {
      const number = Number(match[1]);
      const verseEnd = Number(match[2]);
      verses.push({
        ...(Number.isFinite(number) && number > 0 ? { number } : {}),
        ...(Number.isFinite(verseEnd) && verseEnd > number ? { verseEnd } : {}),
        text: match[3].trim(),
      });
    } else if (verses.length) {
      verses[verses.length - 1].text = [verses[verses.length - 1].text, line].filter(Boolean).join(" ");
    } else {
      verses.push({ text: line });
    }
  }
  return normalizeServiceManualScripture({ reference, translationLabel, verses });
}

function formatServiceManualScriptureInput(manualScripture = null) {
  const normalized = normalizeServiceManualScripture(manualScripture);
  if (!normalized) return "";
  return normalized.verses.map((verse) => {
    const start = Number(verse.number) || 0;
    const end = Number(verse.verseEnd) || 0;
    const number = start ? (end > start ? `${start}–${end}` : String(start)) : "";
    return [number, verse.text].filter(Boolean).join(" ");
  }).join("\n");
}

function updateServiceScriptureReferencePayload(parsed = {}, referenceIndex = 0, updater = () => {}) {
  const references = normalizeServiceScriptureReferenceList(parsed.scriptureReferences || parsed.scripture_references);
  const reference = references[referenceIndex];
  if (!reference) return parsed;
  const payloads = normalizeServiceScriptureReferencePayloads(parsed.scriptureReferencePayloads || parsed.scripture_reference_payloads, references);
  const byReference = new Map(payloads.map((payload) => [normalizeServiceScriptureReferenceKey(payload.reference), payload]));
  const key = normalizeServiceScriptureReferenceKey(reference);
  const current = byReference.get(key) || { reference };
  const next = updater({ ...current, reference }) || null;
  if (next && (next.scriptureTranslationId || next.manualTranslationLabel || next.manualScripture)) {
    byReference.set(key, { ...next, reference });
  } else {
    byReference.delete(key);
  }
  parsed.scriptureReferencePayloads = references
    .map((itemReference) => byReference.get(normalizeServiceScriptureReferenceKey(itemReference)))
    .filter(Boolean);
  return parsed;
}

function normalizeServiceTextHighlights(value) {
  let source = value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      source = JSON.parse(raw);
    } catch {
      source = raw.split(/[,;\n]/).map((text) => ({ text }));
    }
  }
  const list = Array.isArray(source)
    ? source
    : (Array.isArray(source?.items) ? source.items : []);
  return list
    .map((item) => {
      if (typeof item === "string") return { text: item.trim(), color: "", bold: true };
      if (!item || typeof item !== "object") return null;
      const text = firstNonBlankString(item.text, item.value, item.phrase, item.word);
      if (!text) return null;
      const color = normalizeServiceTextHighlightColor(item.color || item.fg || item.foreground || item.hex);
      const bold = item.bold === undefined ? true : normalizeOptionalBoolean(item.bold) !== false;
      return { text, ...(color ? { color } : {}), ...(bold ? { bold: true } : {}) };
    })
    .filter(Boolean);
}

function normalizeServiceTextHighlightColor(value) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color.toUpperCase()}`;
  return "";
}

function hasServiceIntroSlide(value) {
  const introSlide = normalizeServiceIntroSlide(value);
  return Boolean(introSlide?.title || introSlide?.body);
}

function formatServiceSlideOverrideInput(memo) {
  return parseServiceItemMemo(memo).slides.join("\n---\n");
}

function serializeServiceItemMemo(value = {}) {
  const note = String(value.note || "").trim();
  const slides = Array.isArray(value.slides)
    ? value.slides.map((slide) => String(slide || "").trim()).filter(Boolean)
    : [];
  const scriptureReference = String(value.scriptureReference || value.scripture_reference || "").trim();
  const scriptureReferences = normalizeServiceScriptureReferenceList(value.scriptureReferences || value.scripture_references);
  const scriptureTranslationId = String(value.scriptureTranslationId || value.scripture_translation_id || "").trim();
  const scriptureReferencePayloads = normalizeServiceScriptureReferencePayloads(value.scriptureReferencePayloads || value.scripture_reference_payloads, scriptureReferences);
  const manualScripture = normalizeServiceManualScripture(value.manualScripture || value.manual_scripture);
  const formHint = String(value.formHint || value.form_hint || "").trim();
  const formPreset = normalizeServiceFormPreset(value.formPreset || value.form_preset, formHint);
  const formPresetDisabled = Boolean(value.formPresetDisabled || value.form_preset_disabled || value.disableFormPreset || value.disable_form_preset);
  const formPresetRules = normalizeServiceFormPresetRules(value.formPresetRules || value.form_preset_rules);
  const introSlide = normalizeServiceIntroSlide(value.introSlide || value.intro_slide || value.titleSlide || value.title_slide);
  const templateKey = String(value.templateKey || value.template_key || "").trim();
  const templateVariant = String(value.templateVariant || value.template_variant || "").trim();
  const elementType = serviceMemoElementType(value);
  const outputMode = normalizeServiceOutputMode(value.outputMode || value.output_mode || value.renderMode || value.render_mode);
  const inputMode = normalizeServiceInputMode(value.inputMode || value.input_mode);
  const textHighlights = normalizeServiceTextHighlights(value.textHighlights || value.text_highlights || value.highlights);
  const asset = normalizeServiceAsset(value.asset);
  const playback = normalizeServicePlaybackConfig(value.playback, elementType);
  const presenterRole = normalizeServicePresenterRole(value.presenterRole || value.presenter_role || value.role);
  const hiddenInPresentation = Boolean(value.hiddenInPresentation || value.hidden_in_presentation || value.hidden);
  const templateSuppressed = Boolean(value.templateSuppressed || value.template_suppressed);
  const defaultAssetKind = serviceAssetKindForElementType(elementType);
  if (!asset.kind && defaultAssetKind && hasServiceAsset(asset)) asset.kind = defaultAssetKind;
  if (!slides.length && !scriptureReference && !scriptureReferences.length && !scriptureTranslationId && !scriptureReferencePayloads.length && !manualScripture && !hasServiceIntroSlide(introSlide) && !formHint && !formPreset && !formPresetDisabled && !formPresetRules.length && !templateKey && !templateVariant && !elementType && !outputMode && !inputMode && !textHighlights.length && !hasServiceAsset(asset) && !hasServicePlaybackConfig(playback) && !presenterRole && !hiddenInPresentation && !templateSuppressed) return note;
  const payload = { note };
  if (scriptureReference) payload.scriptureReference = scriptureReference;
  if (scriptureReferences.length) payload.scriptureReferences = scriptureReferences;
  if (scriptureTranslationId) payload.scriptureTranslationId = scriptureTranslationId;
  if (scriptureReferencePayloads.length) payload.scriptureReferencePayloads = scriptureReferencePayloads;
  if (manualScripture) payload.manualScripture = manualScripture;
  if (hasServiceIntroSlide(introSlide)) payload.introSlide = introSlide;
  if (formHint) payload.formHint = formHint;
  if (formPreset) payload.formPreset = formPreset;
  if (formPresetDisabled) payload.formPresetDisabled = true;
  if (formPresetRules.length) payload.formPresetRules = formPresetRules;
  if (templateKey) payload.templateKey = templateKey;
  if (templateVariant) payload.templateVariant = templateVariant;
  if (elementType) payload.elementType = elementType;
  if (outputMode) payload.outputMode = outputMode;
  if (inputMode) payload.inputMode = inputMode;
  if (textHighlights.length) payload.textHighlights = textHighlights;
  if (presenterRole) payload.presenterRole = presenterRole;
  if (hiddenInPresentation) payload.hiddenInPresentation = true;
  if (templateSuppressed) payload.templateSuppressed = true;
  if (hasServiceAsset(asset)) payload.asset = asset;
  if (hasServicePlaybackConfig(playback)) payload.playback = playback;
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

function serviceItemUsesFlexibleOfferingSlot(item = {}) {
  const label = compactSearchValue(item.label || "");
  const title = compactSearchValue(item.raw_title || item.title || "");
  const sectionKey = String(item._worshipSectionKey || item.sectionKey || item.section_key || "").trim();
  if (sectionKey && sectionKey !== "offering") return false;
  return label === "봉헌찬송" && title.includes("봉헌특송");
}

function isSpecialSongServiceItem(item = {}) {
  const sectionKey = String(item._worshipSectionKey || item.sectionKey || item.section_key || "").trim();
  if (sectionKey === "special_song") return true;
  const sectionTitle = compactSearchValue(item._worshipSectionTitle || item.sectionTitle || item.section_title || "");
  if (sectionTitle === "특송") return true;
  return compactSearchValue(item.label || "") === "특송";
}

function applyServiceSongSelection(item) {
  applyServiceSongSelectionWithService(item, state.services.find((service) => service.id === state.selectedServiceId));
}

function selectedServiceForEditor() {
  return state.services.find((service) => service.id === state.selectedServiceId) || null;
}

function serviceItemAllowsManualSongText(item = {}, service = selectedServiceForEditor()) {
  const label = compactSearchValue(item.label || "");
  if (isSpecialSongServiceItem(item)) return true;
  const titleText = compactSearchValue([
    service?.title,
    service?.type_id,
    ...(Array.isArray(service?.tags) ? service.tags : []),
  ].filter(Boolean).join(" "));
  if (titleText.includes("온세대") && isMainPraiseServiceItem(item, { allowUnlabeled: true })) return true;
  return false;
}

function serviceItemRequiresSongSelection(item = {}, service = selectedServiceForEditor()) {
  if (isPublicFixedDoxologyServiceItem(item, parseServiceItemMemo(item.memo), service)) return false;
  const songLikeItem = isSongServiceLabel(item.label) || isSpecialSongServiceItem(item);
  return Boolean(songLikeItem && !serviceItemAllowsManualSongText(item, service));
}

function serviceItemSongSelectionInvalid(item = {}, service = selectedServiceForEditor(), resolvedSong = null) {
  if (!serviceItemRequiresSongSelection(item, service)) return false;
  const song = resolvedSong || serviceItemLinkedSong(item);
  if (!song) return Boolean(String(item.raw_title || "").trim());
  if (serviceItemRequiresNewHymnalScoreSong(item) && !isNewHymnalScoreSong(song)) return true;
  if (resolvedSong && !item.song_id) return false;
  return serviceItemVersionSelectionInvalid(item, service);
}

function serviceItemVersionSelectionInvalid(item = {}, service = selectedServiceForEditor()) {
  if (!serviceItemRequiresSongSelection(item, service)) return false;
  const song = serviceItemLinkedSong(item);
  if (!song) return false;
  const versions = serviceSelectableSongVersions(song, item, service);
  const selectedId = item.version_id || item.song_version_id || "";
  if (selectedId && !versions.some((version) => version.id === selectedId)) return true;
  if (versions.length <= 1) return false;
  return !versions.some((version) => version.id === selectedId);
}

function serviceItemSongVersionIdForSave(item = {}, service = selectedServiceForEditor()) {
  const song = serviceItemLinkedSong(item);
  if (!song) return null;
  const selectedId = String(item.version_id || item.song_version_id || "").trim();
  if (!selectedId) return null;
  const version = serviceSelectableSongVersions(song, item, service)
    .find((candidate) => candidate.id === selectedId);
  if (!version) return null;
  // mindex_worship_elements.song_version_id is an FK to mindex_song_versions.
  // Memo/default-only versions can render, but cannot be persisted as FK ids.
  return version._worshipVersionPersisted ? version.id : null;
}

function serviceInputSaveProblem(service = selectedServiceForEditor()) {
  if (!service) return "예배를 찾을 수 없습니다.";
  const item = getServiceItems(service.id).find((candidate) => {
    return serviceItemSongSelectionInvalid(candidate, service) || serviceItemScriptureInputInvalid(candidate);
  });
  if (!item) return "";
  const label = String(item.label || "이 항목").trim();
  if (serviceItemVersionSelectionInvalid(item, service)) return `${label}의 찬양 버전을 선택해 주세요.`;
  if (serviceItemSongSelectionInvalid(item, service)) return `${label}에서 찬양 DB 곡을 선택해 주세요.`;
  return `${label}의 성경 주소를 확인해 주세요.`;
}

function serviceItemLinkedSong(item = {}) {
  const songId = item?.song_id || "";
  return songById(songId);
}

function songById(songId = "") {
  const id = String(songId || "").trim();
  if (!id) return null;
  if (state.songLookupSource !== state.songs) {
    state.songById = new Map((state.songs || []).map((song) => [String(song.id || ""), song]));
    state.songLookupSource = state.songs;
  }
  return state.songById.get(id) || null;
}

function serviceItemLinkedVersion(item = {}, song = serviceItemLinkedSong(item)) {
  const versionId = item?.version_id || item?.song_version_id || "";
  if (!song || !versionId) return null;
  return (song.versions || []).find((version) => version.id === versionId) || null;
}

function serviceItemRequiresNewHymnalScoreSong(item = {}) {
  if (!isSongServiceLabel(item?.label) && !isSpecialSongServiceItem(item)) return false;
  return serviceItemOutputMode(item, parseServiceItemMemo(item?.memo)) === "score";
}

function isNewHymnalScoreSong(song = null) {
  return Boolean(song?.hymn_no && songHasPraiseType(song, "hymn"));
}

function serviceSelectableSongVersions(song = null, item = {}, service = selectedServiceForEditor()) {
  void service;
  const versions = song?.versions || [];
  if (!versions.length) return [];
  if (!serviceItemRequiresNewHymnalScoreSong(item)) return versions;
  const hymnVersions = versions.filter((version) => serviceVersionIsNewHymnalScoreVersion(song, version));
  return hymnVersions.length ? hymnVersions : versions;
}

function serviceVersionIsNewHymnalScoreVersion(song = null, version = null) {
  if (!song?.hymn_no || !version) return false;
  if (!isHymnBookVersion(song, version)) return false;
  const values = [version.name, version.curated_version_name, version.raw_section_name, version.version_label, version.hymn_no]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return !values.some((value) => /^통(?:일)?(?:\s|\d|$)/.test(value) || value.includes("통일 찬송가"));
}

function preferredNewHymnalVersion(song = null, versions = song?.versions || []) {
  if (!song?.hymn_no || !songHasPraiseType(song, "hymn")) return null;
  return versions.find((version) => serviceVersionIsNewHymnalScoreVersion(song, version)) || null;
}

function serviceItemEditableAssigneeValue(item = {}, service = selectedServiceForEditor()) {
  const direct = String(item.assignee || "").trim();
  if (direct) return direct;
  const templateDefault = serviceItemDefaultAssignee(item, service);
  if (templateDefault) return templateDefault;
  const compact = compactSearchValue(item.label || "");
  return presenterTitleAssigneeUsesWorshipLeader(compact) ? serviceWorshipLeaderLabel(service) : "";
}

function serviceItemEditorModel(item = {}, options = {}) {
  const service = options.service || selectedServiceForEditor();
  const isDefault = Boolean(options.isDefault || item._isDefault);
  const parsed = parseServiceItemMemo(item.memo);
  const preparation = isServicePreparationItem(item, parsed);
  const compactLabel = compactSearchValue(item.label || "");
  const specialSong = isSpecialSongServiceItem(item);
  const song = isSongServiceLabel(item.label) || specialSong;
  const scriptureBody = isScriptureBodyServiceItem(item);
  const scripture = isScriptureBodyServiceItem(item) || isScriptureServiceLabel(item.label);
  const worshipLeaderItem = presenterTitleAssigneeUsesWorshipLeader(compactLabel);
  const genericRawTitle = presenterTitleAssigneeTitleIsGeneric(item.raw_title || "", item.label || "");
  const strictSong = serviceItemRequiresSongSelection(item, service);
  const linkedSong = serviceItemLinkedSong(item);
  const songVersions = linkedSong ? serviceSelectableSongVersions(linkedSong, item, service) : [];
  const titleInvalid = serviceItemSongSelectionInvalid(item, service) || serviceItemScriptureInputInvalid(item);
  const editableAssignee =
    !isDefault
    && !preparation
    && (!song || compactLabel === "특송" || specialSong)
    && (
      worshipLeaderItem
      || ["대표기도", "기도", "성경봉독", "특송", "설교", "축도"].includes(compactLabel)
      || specialSong
      || Boolean(String(item.assignee || "").trim())
    );
  const editableTitle =
    isDefault
    || (
      !preparation
      && (
        song
        || scripture
        || (!worshipLeaderItem && !genericRawTitle && Boolean(String(item.raw_title || "").trim()))
      )
    );
  const scripturePayload = scriptureBody ? serviceScriptureTextPayload(item, parsed) : null;
  const scriptureTitleValue = scripture
    ? serviceItemEditorScriptureTitleValue(item, parsed, service, scripturePayload)
    : "";
  return {
    service,
    parsed,
    preparation,
    song,
    scripture,
    scriptureBody,
    strictSong,
    linkedSong,
    songVersions,
    titleInvalid,
    showLabelInput: isDefault,
    showAssignee: editableAssignee,
    showTitle: editableTitle,
    assigneeValue: serviceItemEditableAssigneeValue(item, service),
    titleValue: strictSong && linkedSong ? songServiceOptionLabel(linkedSong) : scriptureTitleValue,
    titlePlaceholder: strictSong ? "찬양 DB 곡 검색 후 선택" : song ? "곡 검색" : scripture ? "성경 구절" : isDefault ? "기본 내용" : "내용",
  };
}

function serviceItemEditorScriptureTitleValue(item = {}, parsed = parseServiceItemMemo(item.memo), service = null, scripturePayload = null) {
  if (isScriptureBodyServiceItem(item)) {
    const references = serviceItemScriptureReferences(item, parsed, service);
    if (references.length) return formatServiceScriptureReferenceList(references);
  }
  return scripturePayload?.reference || normalizeServiceItemReferenceSpacing(parsed.scriptureReference || item.raw_title || "");
}

function serviceItemScriptureInputInvalid(item = {}) {
  if (!isScriptureBodyServiceItem(item)) return false;
  const memo = parseServiceItemMemo(item.memo);
  if (serviceItemSupportsScriptureReferenceList(item)) {
    const raw = String(item.raw_title || "").trim();
    return Boolean(raw) && !normalizeServiceScriptureReferenceList(raw).length;
  }
  const raw = String(memo.scriptureReference || item.raw_title || "").trim();
  if (!raw) return false;
  return !parseBibleReference(raw);
}

function clearGeneratedServiceScriptureSlides(item = {}, parsed = parseServiceItemMemo(item.memo)) {
  if (serviceItemSupportsScriptureReferenceList(item)) {
    parsed.scriptureReferences = [];
    parsed.scriptureReference = "";
    parsed.slides = [];
    return parsed;
  }
  if (!parsed.scriptureReference) return parsed;
  if (normalizeServiceItemReferenceSpacing(parsed.scriptureReference) === normalizeServiceItemReferenceSpacing(item.raw_title)) return parsed;
  parsed.scriptureReference = "";
  parsed.slides = [];
  return parsed;
}

const serviceScriptureResolveTimers = new Map();

function clearScheduledServiceScriptureResolve(serviceId, index) {
  const key = `${serviceId}:${index}`;
  const timer = serviceScriptureResolveTimers.get(key);
  if (timer) window.clearTimeout(timer);
  serviceScriptureResolveTimers.delete(key);
}

function scheduleServiceScriptureBodyResolve(serviceId = state.selectedServiceId, index = -1) {
  if (!serviceId || !Number.isFinite(index)) return;
  const items = getServiceItems(serviceId);
  const item = items[index];
  if (!item || !isScriptureBodyServiceItem(item)) return;
  if (parseServiceItemMemo(item.memo).manualScripture) return;
  const references = serviceItemScriptureReferences(item);
  if (!references.length || !state.client) return;
  const key = `${serviceId}:${index}`;
  const itemId = String(item.id || "").trim();
  clearScheduledServiceScriptureResolve(serviceId, index);
  serviceScriptureResolveTimers.set(key, window.setTimeout(() => {
    serviceScriptureResolveTimers.delete(key);
    void resolveServiceScriptureBodyReference(serviceId, index, { itemId });
  }, 420));
}

async function resolveServiceScriptureBeforeSave(serviceId = state.selectedServiceId, index = -1) {
  const item = getServiceItems(serviceId)[index];
  if (!item || !isScriptureBodyServiceItem(item)) return;
  clearScheduledServiceScriptureResolve(serviceId, index);
  await resolveServiceScriptureBodyReference(serviceId, index, { itemId: item.id });
}

async function resolveServiceScriptureBodyReference(serviceId, index, options = {}) {
  const items = getServiceItems(serviceId);
  const targetId = String(options.itemId || "").trim();
  const targetIndex = targetId ? items.findIndex((candidate) => String(candidate.id || "").trim() === targetId) : -1;
  const safeIndex = targetIndex >= 0 ? targetIndex : index;
  const item = items[safeIndex];
  if (!item || !isScriptureBodyServiceItem(item)) return;
  if (parseServiceItemMemo(item.memo).manualScripture) return;
  const memo = parseServiceItemMemo(item.memo);
  const references = serviceItemScriptureReferences(item, memo);
  if (!references.length) return;
  const referenceSignature = references.join(";");
  try {
    const resolved = await Promise.all(references.map(async (referenceText) => {
      const reference = parseBibleReference(referenceText);
      if (!reference) return null;
      const verses = await fetchServiceScriptureVerses(reference, serviceItemBibleTranslationForReference(item, memo, referenceText));
      return verses.length ? formatLiveScriptureReference(reference) : null;
    }));
    if (!resolved.some(Boolean)) return;
    if (serviceItemScriptureReferences(item).join(";") !== referenceSignature) return;
    const parsed = parseServiceItemMemo(item.memo);
    parsed.scriptureReferences = references;
    parsed.scriptureReference = references[0] || "";
    parsed.slides = [];
    item.raw_title = formatServiceScriptureReferenceList(references);
    item.memo = serializeServiceItemMemo(parsed);
    state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
    state.dirty.service = true;
    refreshPresenterForService(serviceId);
    renderCurrentServiceModuleDetail();
    updateSaveState();
  } catch (error) {
    showToast(error.message || "성구를 불러오지 못했습니다.", "error");
  }
}

async function fetchServiceScriptureVerses(reference, requestedTranslation = null) {
  if (!requireClient()) return [];
  await ensureBibleBookLookups();
  if (!state.bibleTranslations.length && !state.bibleReaderError) await loadBibleTranslations({ silent: true });
  const translation = requestedTranslation || selectedPresenterBibleTranslation();
  if (!isUuid(translation?.id)) return [];
  const cacheKey = bibleVerseCacheKey(translation.id, reference.book.code, reference.chapter);
  if (state.bibleVerseCache.has(cacheKey)) return getCachedServiceScriptureVerses(reference, translation);
  if (serviceScriptureChapterLoadPromises.has(cacheKey)) {
    await serviceScriptureChapterLoadPromises.get(cacheKey);
    return getCachedServiceScriptureVerses(reference, translation);
  }

  const requestPromise = (async () => {
    const { data, error } = await state.client
      .from("mindex_bible_verses")
      .select("book_code,chapter,verse,verse_end,text,section_title")
      .eq("is_active", true)
      .eq("translation_id", translation.id)
      .eq("book_code", reference.book.code)
      .eq("chapter", reference.chapter)
      .order("verse", { ascending: true });
    if (error) throw error;
    cacheServiceScriptureVerses(reference, (data || []).map(normalizeServerBibleVerse), translation);
  })();
  serviceScriptureChapterLoadPromises.set(cacheKey, requestPromise);
  try {
    await requestPromise;
  } finally {
    serviceScriptureChapterLoadPromises.delete(cacheKey);
  }
  return getCachedServiceScriptureVerses(reference, translation);
}

function warmWorshipScriptureReferencesForService(serviceId = state.selectedServiceId) {
  if (!serviceId || !state.worshipSections.length || !state.worshipElements.length) return;
  void preloadWorshipScriptureReferences(state.worshipSections, state.worshipElements, { serviceId });
}

async function preloadWorshipScriptureReferences(sections = [], elements = [], options = {}) {
  if (!state.client || !elements.length) return;
  try {
    await ensureBibleBookLookups();
    if (!state.bibleTranslations.length && !state.bibleReaderError) await loadBibleTranslations({ silent: true });
    if (!selectedPresenterBibleTranslation()?.id) return;
    const serviceId = String(options.serviceId || "").trim();
    const matchingSections = serviceId
      ? sections.filter((section) => String(section.service_id || "") === serviceId)
      : sections;
    const sectionById = Object.fromEntries(matchingSections.map((section) => [section.id, section]));
    const matchingSectionIds = new Set(matchingSections.map((section) => section.id));
    const references = uniqueList(elements
      .filter((element) => !serviceId || matchingSectionIds.has(element.section_id))
      .flatMap((element) => serviceElementScriptureReferences(
        element,
        sectionById[element.section_id] || {},
        element.source_ref && typeof element.source_ref === "object" ? element.source_ref : {},
        element.config && typeof element.config === "object" ? element.config : {},
      ))
      .filter(Boolean));
    await Promise.all(references.map(async (referenceText) => {
      const reference = parseBibleReference(referenceText);
      if (!reference || getCachedServiceScriptureVerses(reference).length) return;
      await fetchServiceScriptureVerses(reference);
    }));
  } catch (error) {
    console.warn("Worship scripture preload failed", error);
  }
}

function serviceScriptureTextPayloadFromBible(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  const manualScripture = normalizeServiceManualScripture(memo.manualScripture);
  if (manualScripture) {
    const referenceText = manualScripture.reference || serviceItemScriptureReferences(item, memo)[0] || item.raw_title || "";
    const reference = parseBibleReference(referenceText);
    const normalizedReference = reference ? formatServiceBibleReference(reference, referenceText) : referenceText;
    const parts = serviceScriptureReferenceParts(reference, normalizedReference);
    const fullReference = [parts.referenceBook, parts.referenceRange].filter(Boolean).join(" ") || normalizedReference;
    return {
      reference: fullReference,
      referenceBook: parts.referenceBook,
      referenceBookFull: parts.referenceBookFull,
      referenceRange: parts.referenceRange,
      translationLabel: manualScripture.translationLabel || serviceBibleTranslationDisplayLabel(serviceItemBibleTranslation(item, memo)),
      verses: manualScripture.verses.map((verse) => ({
        number: String(verse.number || "").trim(),
        verseEnd: Number(verse.verseEnd) || null,
        text: verse.text,
        reference: fullReference,
        referenceBook: parts.referenceBook,
        referenceBookFull: parts.referenceBookFull,
        referenceRange: parts.referenceRange,
      })),
    };
  }
  const references = serviceItemScriptureReferences(item, memo);
  if (!references.length) return { reference: "", verses: [] };
  const resolved = references.map((referenceText) => {
    const reference = parseBibleReference(referenceText);
    if (!reference) return null;
    const normalizedReference = formatServiceBibleReference(reference, referenceText);
    const parts = serviceScriptureReferenceParts(reference, normalizedReference);
    const fullReference = [parts.referenceBook, parts.referenceRange].filter(Boolean).join(" ") || normalizedReference;
    return { reference, normalizedReference: fullReference, ...parts };
  }).filter(Boolean);
  if (!resolved.length) return { reference: references.join("; "), verses: [] };
  const primary = resolved[0];
  const payloads = normalizeServiceScriptureReferencePayloads(memo.scriptureReferencePayloads, references);
  const payloadByReference = new Map(payloads.map((payload) => [normalizeServiceScriptureReferenceKey(payload.reference), payload]));
  const defaultTranslation = serviceItemBibleTranslation(item, memo);
  const translationLabels = [];
  const verses = resolved.flatMap(({ reference, normalizedReference, referenceBook, referenceBookFull, referenceRange }) => {
    const perReference = payloadByReference.get(normalizeServiceScriptureReferenceKey(normalizedReference))
      || payloadByReference.get(normalizeServiceScriptureReferenceKey(referenceRange))
      || payloadByReference.get(normalizeServiceScriptureReferenceKey(formatServiceBibleReference(reference, normalizedReference)));
    const manual = normalizeServiceManualScripture(perReference?.manualScripture);
    const translation = serviceItemBibleTranslationForReference(item, memo, normalizedReference) || defaultTranslation;
    const label = manual?.translationLabel || perReference?.manualTranslationLabel || serviceBibleTranslationDisplayLabel(translation);
    if (label && !translationLabels.includes(label)) translationLabels.push(label);
    if (manual) {
      return manual.verses.map((verse) => ({
        number: String(verse.number || "").trim(),
        verseEnd: Number(verse.verseEnd) || null,
        text: verse.text,
        reference: normalizedReference,
        referenceBook,
        referenceBookFull,
        referenceRange,
        translationLabel: label,
      }));
    }
    return getCachedServiceScriptureVerses(reference, translation).map((verse) => ({
      number: String(verse.verse || "").trim(),
      verseEnd: Number(verse.verse_end) || null,
      text: String(verse.text || "").trim(),
      reference: normalizedReference,
      referenceBook,
      referenceBookFull,
      referenceRange,
      translationLabel: label,
    })).filter((verse) => verse.text);
  });
  return {
    reference: primary.normalizedReference,
    referenceBook: primary.referenceBook,
    referenceBookFull: primary.referenceBookFull,
    referenceRange: primary.referenceRange,
    translationLabel: translationLabels.join(" / ") || serviceBibleTranslationDisplayLabel(defaultTranslation),
    verses,
  };
}

function serviceScriptureReferenceParts(reference, fallback = "") {
  if (!reference?.book || !reference?.chapter) return { referenceBook: "", referenceRange: fallback };
  const fullBook = reference.book.koreanName
    || reference.book.shortName
    || KOREAN_BIBLE_BOOK_ABBREVIATIONS[reference.book.code]
    || reference.book.code
    || "";
  const book = KOREAN_BIBLE_BOOK_ABBREVIATIONS[reference.book.code]
    || reference.book.shortName
    || reference.book.koreanName
    || reference.book.code
    || "";
  const range = reference.verse
    ? `${reference.chapter}:${reference.verse}${reference.verseEnd ? `–${reference.verseEnd}` : ""}`
    : String(reference.chapter);
  return { referenceBook: book, referenceBookFull: fullBook, referenceRange: range };
}

function serviceBibleTranslationDisplayLabel(translation = null) {
  if (!translation) return "";
  return String(translation.abbreviation || translation.name || translation.translationKey || "").trim();
}

function serviceItemBibleTranslation(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  const translationId = String(memo?.scriptureTranslationId || memo?.scripture_translation_id || "").trim();
  return serviceBibleTranslationById(translationId)
    || selectedPresenterBibleTranslation();
}

function serviceItemBibleTranslationForReference(item = {}, memo = parseServiceItemMemo(item?.memo), referenceText = "") {
  const references = serviceItemScriptureReferences(item, memo);
  const payloads = normalizeServiceScriptureReferencePayloads(memo?.scriptureReferencePayloads || memo?.scripture_reference_payloads, references);
  const key = normalizeServiceScriptureReferenceKey(referenceText);
  const payload = payloads.find((candidate) => normalizeServiceScriptureReferenceKey(candidate.reference) === key);
  return serviceBibleTranslationById(payload?.scriptureTranslationId) || serviceItemBibleTranslation(item, memo);
}

function serviceBibleTranslationById(id = "") {
  const translationId = String(id || "").trim();
  return state.bibleTranslations.find((translation) => translation.id === translationId) || null;
}

function getCachedServiceScriptureVerses(reference, translation = selectedPresenterBibleTranslation()) {
  if (!reference?.book || !translation?.id) return [];
  const rows = state.bibleVerseCache.get(bibleVerseCacheKey(translation.id, reference.book.code, reference.chapter)) || [];
  const start = reference.verse ?? 1;
  const end = reference.verseEnd || reference.verse || Number.MAX_SAFE_INTEGER;
  return rows
    .map(normalizeServerBibleVerse)
    .filter((verse) => verse.verse >= start && verse.verse <= end)
    .sort(sortBibleVerseRows);
}

function cacheServiceScriptureVerses(reference, verses = [], translation = selectedPresenterBibleTranslation()) {
  if (!reference?.book || !translation?.id || !Array.isArray(verses)) return;
  const key = bibleVerseCacheKey(translation.id, reference.book.code, reference.chapter);
  const existing = state.bibleVerseCache.get(key) || [];
  const byVerse = new Map(existing.map((row) => [Number(row.verse), normalizeServerBibleVerse(row)]));
  verses.map(normalizeServerBibleVerse).forEach((verse) => {
    if (verse.verse) byVerse.set(verse.verse, verse);
  });
  state.bibleVerseCache.set(key, inferBibleVerseEndRanges([...byVerse.values()].sort(sortBibleVerseRows)));
}

function inferBibleVerseEndRanges(verses = []) {
  const rows = (Array.isArray(verses) ? verses : [])
    .map(normalizeServerBibleVerse)
    .sort(sortBibleVerseRows);
  return rows.map((verse, index) => {
    const next = rows[index + 1];
    const start = Number(verse.verse) || 0;
    const explicitEnd = Number(verse.verse_end) || 0;
    const nextStart = Number(next?.verse) || 0;
    // Preserve source rows whose printed label covers skipped verse numbers.
    const inferredEnd = !explicitEnd
      && next
      && String(next.book_code || "") === String(verse.book_code || "")
      && Number(next.chapter) === Number(verse.chapter)
      && nextStart > start + 1
      ? nextStart - 1
      : 0;
    return { ...verse, verse_end: explicitEnd || inferredEnd || null };
  });
}

function formatServiceScriptureBodySlideBlocks(verses = []) {
  return verses
    .map((verse) => {
      const number = String(verse?.verse || "").trim();
      const text = String(verse?.text || "").trim();
      return [number, text].filter(Boolean).join("   ");
    })
    .filter(Boolean);
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
    const versions = serviceSelectableSongVersions(existing, item, service);
    item.version_id = preferredNewHymnalVersion(existing, versions)?.id
      || (versions.length === 1 ? versions[0].id : null);
    item.song_version_id = item.version_id;
    state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
    state.dirty.service = true;
    renderCurrentServiceModuleDetail();
    updateSaveState();
    showToast("기존 찬양 DB 곡에 연결했습니다.");
    return;
  }

  const praiseType = service?.type_id === "children" ? "children" : "ccm";
  const defaultVersion = {
    id: createUuid(),
    name: "기본",
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
    item.song_version_id = item.version_id;
    state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
    state.dirty.service = true;
    renderCurrentServiceModuleDetail();
    updateSaveState();
    showToast("찬양 DB에 빈 곡을 만들었습니다. 가사를 추가해 주세요.", "info");
  } catch (error) {
    showToast(error.message || "찬양 DB 곡 추가 실패.", "error");
  }
}

function selectServiceSongForItem(index, songId) {
  const serviceId = state.selectedServiceId;
  const service = selectedServiceForEditor();
  const items = getServiceItems(serviceId);
  const item = items[index];
  const song = state.songs.find((candidate) => candidate.id === songId);
  if (!serviceId || !item || !song) return;
  if (serviceItemRequiresNewHymnalScoreSong(item) && !isNewHymnalScoreSong(song)) {
    showToast("악보 항목은 새찬송가 곡만 선택할 수 있습니다.", "error");
    return;
  }
  item.song_id = song.id;
  item.raw_title = "";
  const versions = serviceSelectableSongVersions(song, item, service);
  item.version_id = preferredNewHymnalVersion(song, versions)?.id
    || (versions.length === 1 ? versions[0].id : null);
  item.song_version_id = item.version_id;
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderCurrentServiceModuleDetail();
  updateSaveState();
  saveCommittedServiceItem(index, serviceId);
}

function clearServiceSongForItem(index) {
  const serviceId = state.selectedServiceId;
  const items = getServiceItems(serviceId);
  const item = items[index];
  if (!serviceId || !item) return;
  item.song_id = null;
  item.version_id = null;
  item.song_version_id = null;
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderCurrentServiceModuleDetail();
  updateSaveState();
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
    markServiceItemSharedContentDirty(nextItem, state.services.find((service) => service.id === serviceId));
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
    items.splice(index + 1, 0, normalizeServiceItem({
      ...item,
      id: createLocalId(),
      _worshipSectionId: "",
      _worshipSectionKey: "",
      _worshipSectionTitle: "",
      _worshipSectionOrder: 0,
      _worshipElementOrder: 0,
    }, index + 1));
    nextSelectedIndex = index + 1;
  }
  if (action === "delete" && item) {
    markServiceItemSharedContentDirty(item, state.services.find((service) => service.id === serviceId));
    items.splice(index, 1);
    nextSelectedIndex = Math.min(index, items.length - 1);
  }

  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.selectedServiceItemIndex = Number.isFinite(nextSelectedIndex) && nextSelectedIndex >= 0 ? nextSelectedIndex : null;
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderCurrentServiceModuleDetail();
  renderServiceList();
  updateSaveState();
}

function runPresenterSectionItemAction(action, index) {
  const editor = state.presenterSectionEditor;
  const serviceId = editor?.serviceId || state.selectedServiceId;
  if (!serviceId) return;
  const service = state.services.find((svc) => svc.id === serviceId);
  const context = presenterSectionEditorContext(service);
  if (!context) return;
  const items = normalizeServiceItemsInCurrentOrder(getServiceItems(serviceId));
  const sectionIndexes = context.sectionItems
    .map((item) => Number(item._origIndex))
    .filter((itemIndex) => Number.isInteger(itemIndex) && items[itemIndex]);
  const position = sectionIndexes.indexOf(index);
  if (action === "up" && position > 0) {
    const previousIndex = sectionIndexes[position - 1];
    [items[previousIndex], items[index]] = [items[index], items[previousIndex]];
    sectionIndexes.forEach((itemIndex, elementIndex) => {
      if (!items[itemIndex]) return;
      items[itemIndex]._worshipElementTemplateModified = true;
      items[itemIndex]._worshipElementOrder = elementIndex + 1;
    });
  }
  if (action === "down" && position >= 0 && position < sectionIndexes.length - 1) {
    const nextIndex = sectionIndexes[position + 1];
    [items[nextIndex], items[index]] = [items[index], items[nextIndex]];
    sectionIndexes.forEach((itemIndex, elementIndex) => {
      if (!items[itemIndex]) return;
      items[itemIndex]._worshipElementTemplateModified = true;
      items[itemIndex]._worshipElementOrder = elementIndex + 1;
    });
  }
  if (action === "delete" && position >= 0) {
    const item = items[index];
    if (item?._worshipTemplateProjected && isUuid(item.id)) {
      state.templateElementSuppressions.set(item.id, item);
    }
    items.splice(index, 1);
  }
  if (action === "add") {
    const root = refs.detailPane?.querySelector("[data-presenter-section-editor]");
    const type = normalizeServiceElementType(root?.querySelector("[data-presenter-section-new-type]")?.value || "");
    const name = String(root?.querySelector("[data-presenter-section-new-name]")?.value || "").trim();
    if (!name || !type) {
      showToast("새 엘리멘트는 이름과 타입이 필요합니다.", "error");
      return;
    }
    const insertAt = sectionIndexes.length ? Math.max(...sectionIndexes) + 1 : items.length;
    const first = context.sectionItems[0] || {};
    const memo = serializeServiceItemMemo({
      elementType: type,
      componentType: type,
    });
    items.splice(insertAt, 0, normalizeServiceItem({
      service_id: serviceId,
      sort_order: insertAt + 1,
      label: name,
      raw_title: "",
      memo,
      _worshipSectionId: first._worshipSectionId || "",
      _worshipSectionKey: first._worshipSectionKey || "",
      _worshipSectionTitle: first._worshipSectionTitle || context.sectionTitle,
      _worshipSectionTemplateModified: Boolean(first._worshipSectionTemplateModified),
      _worshipSectionOrder: first._worshipSectionOrder || 0,
      _worshipElementOrder: sectionIndexes.length + 1,
      _worshipElementTemplateModified: true,
    }, insertAt));
    state.selectedServiceItemIndex = insertAt;
    state.presenterSectionEditor = {
      ...state.presenterSectionEditor,
      itemId: "",
      sectionKey: context.groupKey,
    };
  }
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderCurrentServiceModuleDetail();
  renderServiceList();
  updateSaveState();
}

function presenterReferenceMediaSectionLabel(sectionKey = "") {
  return String(sectionKey || "").trim() === "announcements" ? "광고" : "설교";
}

function presenterReferenceMediaItemSectionKey(item = {}) {
  return String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
}

function isPresenterReferenceMediaItem(item = {}, memo = parseServiceItemMemo(item.memo)) {
  const sectionKey = presenterReferenceMediaItemSectionKey(item);
  return PRESENTER_REFERENCE_MEDIA_SECTION_KEYS.has(sectionKey)
    && compactSearchValue(item?.label || "") === "참고화면"
    && serviceMemoInputMode(memo, item) === "asset";
}

function presenterReferenceMediaKindForFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(name)) return "image";
  if (type.startsWith("video/") || /\.(m4v|mov|mp4|webm)$/.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(aac|flac|m4a|mp3|ogg|wav)$/.test(name)) return "audio";
  return "";
}

function presenterReferenceMediaUploadPath(serviceId, item, file) {
  const safeName = String(file?.name || "media")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
  const itemId = String(item?.id || item?._localId || createLocalId()).replace(/[^a-zA-Z0-9_-]/g, "");
  return `services/${String(serviceId || "draft").replace(/[^a-zA-Z0-9_-]/g, "")}/${itemId}/${Date.now()}-${safeName}`;
}

async function uploadPresenterReferenceMediaFile(input) {
  const file = input?.files?.[0];
  const serviceId = input?.dataset?.serviceId || state.selectedServiceId;
  const index = Number(input?.dataset?.serviceItemIndex);
  return uploadPresenterReferenceMediaAsset({
    file,
    serviceId,
    item: getServiceItems(serviceId)[index],
    input,
  });
}

async function uploadPresenterReferenceMediaAsset({ file, serviceId, item, input = null } = {}) {
  const kind = presenterReferenceMediaKindForFile(file);
  if (!file || !item || !isPresenterReferenceMediaItem(item) || !kind) {
    showToast("이미지, 영상, 음원 파일만 참고 화면에 넣을 수 있습니다.", "error");
    if (input) input.value = "";
    return;
  }
  if (Number(file.size) > PRESENTER_REFERENCE_MEDIA_MAX_BYTES) {
    showToast("참고 화면 파일은 50MB 이하로 올려 주세요.", "error");
    input.value = "";
    return;
  }
  if (!state.client?.storage) {
    showToast("미디어 저장소에 연결되지 않았습니다. 연결 상태를 확인해 주세요.", "error");
    input.value = "";
    return;
  }

  input.disabled = true;
  try {
    const path = presenterReferenceMediaUploadPath(serviceId, item, file);
    const { error } = await state.client.storage
      .from(PRESENTER_MEDIA_STORAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", contentType: file.type || undefined, upsert: false });
    if (error) throw error;
    const { data } = state.client.storage.from(PRESENTER_MEDIA_STORAGE_BUCKET).getPublicUrl(path);
    const url = String(data?.publicUrl || "").trim();
    if (!url) throw new Error("업로드한 파일의 공개 주소를 만들지 못했습니다.");

    const memo = parseServiceItemMemo(item.memo);
    memo.elementType = kind;
    memo.componentType = kind;
    memo.inputMode = "asset";
    memo.asset = { kind, name: file.name, url };
    item.memo = serializeServiceItemMemo(memo);
    item._worshipElementTemplateModified = true;
    state.dirty.service = true;
    refreshPresenterForService(serviceId);
    await saveService(serviceId, { silent: true, renderAfterSave: false });
    renderCurrentServiceModuleDetail();
    renderServiceList();
    showToast(`${kind === "image" ? "이미지" : kind === "video" ? "영상" : "음원"}을 참고 화면에 추가했습니다.`);
  } catch (error) {
    showToast(error?.message || "참고 화면 파일을 올리지 못했습니다.", "error");
  } finally {
    input.disabled = false;
    input.value = "";
  }
}

async function addAndUploadPresenterReferenceMedia(input) {
  const file = input?.files?.[0];
  const serviceId = input?.dataset?.serviceId || state.selectedServiceId;
  const sectionKey = input?.dataset?.presenterReferenceMediaSection || "sermon";
  if (!file) return;
  const kind = presenterReferenceMediaKindForFile(file);
  if (!kind) {
    showToast("이미지, 영상, 음원 파일만 참고 화면에 넣을 수 있습니다.", "error");
    input.value = "";
    return;
  }
  if (Number(file.size) > PRESENTER_REFERENCE_MEDIA_MAX_BYTES) {
    showToast("참고 화면 파일은 50MB 이하로 올려 주세요.", "error");
    input.value = "";
    return;
  }
  input.disabled = true;
  const item = addPresenterReferenceMedia(serviceId, sectionKey, { focus: false });
  if (!item) {
    input.disabled = false;
    input.value = "";
    return;
  }
  await uploadPresenterReferenceMediaAsset({ file, serviceId, item, input });
}

function addPresenterReferenceMedia(serviceId = state.selectedServiceId, requestedSectionKey = "", options = {}) {
  if (!serviceId) return;
  const items = normalizeServiceItemsInCurrentOrder(getServiceItems(serviceId));
  const sectionKey = PRESENTER_REFERENCE_MEDIA_SECTION_KEYS.has(String(requestedSectionKey || "").trim())
    ? String(requestedSectionKey).trim()
    : "sermon";
  const sectionIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => presenterReferenceMediaItemSectionKey(item) === sectionKey);
  const lastSectionItem = sectionIndexes.at(-1);
  if (!lastSectionItem) {
    showToast(`${presenterReferenceMediaSectionLabel(sectionKey)} 섹션을 찾지 못했습니다.`, "info");
    return;
  }

  const source = lastSectionItem.item;
  const insertAt = lastSectionItem.index + 1;
  const item = normalizeServiceItem({
    service_id: serviceId,
    sort_order: insertAt + 1,
    label: "참고 화면",
    raw_title: "",
    memo: serializeServiceItemMemo({
      elementType: "image",
      componentType: "image",
      inputMode: "asset",
      asset: { kind: "image", name: "", url: "" },
    }),
    _worshipSectionId: source._worshipSectionId || "",
    _worshipSectionKey: sectionKey,
    _worshipSectionTitle: source._worshipSectionTitle || presenterReferenceMediaSectionLabel(sectionKey),
    _worshipSectionTemplateModified: Boolean(source._worshipSectionTemplateModified),
    _worshipSectionOrder: source._worshipSectionOrder || 0,
    _worshipElementOrder: (Number(source._worshipElementOrder) || sectionIndexes.length) + 1,
    _worshipElementTemplateModified: true,
  }, insertAt);
  items.splice(insertAt, 0, item);
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  const createdItem = state.serviceItems[serviceId].find((candidate) => candidate.id === item.id) || null;
  const createdIndex = state.serviceItems[serviceId].findIndex((candidate) => candidate.id === item.id);
  state.selectedServiceItemIndex = createdIndex;
  state.dirty.service = true;
  refreshPresenterForService(serviceId);
  renderCurrentServiceModuleDetail();
  renderServiceList();
  updateSaveState();
  if (options.focus !== false) {
    requestAnimationFrame(() => {
      refs.detailPane?.querySelector(`[data-service-item-index="${createdIndex}"][data-service-item-field="asset_name"]`)?.focus();
    });
  }
  return createdItem;
}

function updatePresenterSectionField(field) {
  const editor = state.presenterSectionEditor;
  const serviceId = editor?.serviceId || state.selectedServiceId;
  const service = state.services.find((svc) => svc.id === serviceId);
  const context = presenterSectionEditorContext(service);
  if (!context || field.dataset.presenterSectionField !== "label") return;
  const nextLabel = String(field.value || "").trim();
  if (!nextLabel) return;
  const items = getServiceItems(serviceId);
  const previousLabel = context.sectionTitle;
  for (const sectionItem of context.sectionItems) {
    const item = items[sectionItem._origIndex];
    if (!item) continue;
    if (item._worshipSectionTitle || item._worshipSectionKey || item._worshipSectionId) {
      item._worshipSectionTitle = nextLabel;
      item._worshipSectionTemplateModified = true;
    } else if (normalizeTitle(item.label) === normalizeTitle(previousLabel)) {
      item.label = nextLabel;
    }
  }
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;
  refreshPresenterForService(serviceId, { publish: false });
  const editorRoot = field.closest("[data-presenter-section-editor]");
  const titleNode = editorRoot?.querySelector(".presenter-section-editor-head h3");
  if (titleNode) titleNode.textContent = nextLabel;
  updateSaveState();
}

function applyServiceSongSelectionWithService(item, service = null) {
  if (!item || (!isSongServiceLabel(item.label) && !isSpecialSongServiceItem(item))) {
    if (item) {
      item.song_id = null;
      item.version_id = null;
      item.song_version_id = null;
    }
    return;
  }
  const memo = parseServiceItemMemo(item.memo);
  const manualSpecialSong = isSpecialSongServiceItem(item)
    && (memo.slides.length || memo.note || item.config?.manualSong || item.config?.disableAutoSongMatch);
  if (manualSpecialSong) {
    item.song_id = null;
    item.version_id = null;
    item.song_version_id = null;
    return;
  }
  const song = resolvePresenterPreparationSong(item.raw_title, item, service || selectedServiceForEditor())
    || findServicePraiseSong(item.raw_title);
  if (!song) {
    item.song_id = null;
    item.version_id = null;
    item.song_version_id = null;
    return;
  }
  item.song_id = song.id;
  item.raw_title = "";
  const versions = serviceSelectableSongVersions(song, item, service || state.services.find((svc) => svc.id === state.selectedServiceId));
  item.version_id = preferredNewHymnalVersion(song, versions)?.id
    || (versions.length === 1 ? versions[0].id : null);
  item.song_version_id = item.version_id;
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
  renderCurrentServiceModuleDetail();
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
    praiseTeam: "",
    tags: "",
  };
  renderServiceList();
  renderCurrentServiceModuleDetail();
}

const SERVICE_MINISTER_DEFAULTS = Object.freeze({
  "sunday-first": { sermon: "김석범 목사", benediction: "김석범 목사" },
  "sunday-second": { sermon: "김남영 목사", benediction: "김남영 목사" },
  "sunday-main": { sermon: "김남영 목사", benediction: "김남영 목사" },
  "sunday-afternoon": { sermon: "김남영 목사", benediction: "김남영 목사" },
  wednesday: { sermon: "김남영 목사", benediction: "김남영 목사" },
  friday: { sermon: "김남영 목사" },
  monthly: { sermon: "김남영 목사", benediction: "김남영 목사" },
});

function serviceMinisterDefaults(typeId = "") {
  return SERVICE_MINISTER_DEFAULTS[worshipAppServiceTypeId(typeId)] || {};
}

function defaultServiceSermonLeader(typeId = "") {
  return serviceMinisterDefaults(typeId).sermon || "";
}

function defaultServiceBenedictionLeader(typeId = "") {
  return serviceMinisterDefaults(typeId).benediction || "";
}

function serviceItemDefaultAssignee(item = {}, service = selectedServiceForEditor()) {
  const label = compactSearchValue(item?.label || "");
  if (label === "설교" || label === "설교제목") return defaultServiceSermonLeader(service?.type_id);
  if (label === "축도") return defaultServiceBenedictionLeader(service?.type_id);
  return "";
}

function defaultServicePraiseLeader(typeId) {
  return String(typeId || "") === "friday" ? "이재희 청년" : "";
}

function defaultServiceWorshipLeader(typeId) {
  return worshipAppServiceTypeId(typeId) === "monthly" ? "김남영 목사" : "";
}

function canonicalWorshipServiceTypeId(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return serviceTypeById(appTypeId)?._worshipId || typeId || "";
}

function serviceTemplateVersionName(typeId, service = null) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  if (!SERVICE_CATEGORIES.public.includes(appTypeId)) return "";
  const version = resolvePublicWorshipTemplateVersion(appTypeId, { service })?.version || PUBLIC_WORSHIP_TEMPLATE_VERSION;
  return `${serviceTypeDisplayName(appTypeId)} - ${version}`;
}

function buildWorshipServiceScaffold(serviceId, typeId, options = {}) {
  const service = options.service || state.services.find((item) => item.id === serviceId) || null;
  const steps = serviceOrderTemplate(typeId, { service, items: options.items || [] }).map((step, index) => normalizeServiceTemplateStep(step, index, typeId));
  const templateVersion = serviceTemplateVersionName(typeId, service);
  const sections = [];
  const elements = [];
  steps.forEach((step, index) => {
    const label = String(step.label || step.name || "").trim();
    if (!label) return;
    const sectionId = createUuid();
    const ready = isReadyServiceTemplateLabel(label);
    const elementSteps = worshipTemplateElementSteps(step, label);
    sections.push({
      id: sectionId,
      service_id: serviceId,
      sort_order: index + 1,
      section_key: worshipTemplateSectionKey(label, index, step),
      title: label,
      person: "",
      source_kind: "mindex",
      source_ref: { label, template: true, placeholder: true, ...(templateVersion ? { template_version: templateVersion } : {}) },
      config: ready ? { presenterRole: "ready" } : {},
    });
    elementSteps.forEach((elementStep, elementIndex) => {
      const elementLabel = ready
        ? servicePreparationElementLabel(elementStep.presenterRole || elementStep.presenter_role || "ready")
        : String(elementStep.label || elementStep.name || label).trim() || label;
      const elementType = ready ? servicePreparationElementTypeForType(typeId) : worshipTemplateElementType(elementStep, elementLabel);
      const defaultStrength = String(elementStep.defaultStrength || elementStep.default_strength || "").trim();
      const formPreset = normalizeServiceFormPreset(
        elementStep.formPreset || elementStep.form_preset,
        elementStep.formHint || elementStep.form_hint,
        defaultStrength,
      );
      const formPresetRules = normalizeServiceFormPresetRules(elementStep.formPresetRules || elementStep.form_preset_rules);
      const formHint = String(elementStep.formHint || elementStep.form_hint || formPreset?.hint || "").trim();
      const outputMode = normalizeServiceOutputMode(elementStep.outputMode || elementStep.output_mode || elementStep.renderMode || elementStep.render_mode);
      const introSlide = normalizeServiceIntroSlide(elementStep.introSlide || elementStep.intro_slide || elementStep.titleSlide || elementStep.title_slide);
      const textHighlights = normalizeServiceTextHighlights(elementStep.textHighlights || elementStep.text_highlights || elementStep.highlights);
      const asset = worshipTemplateElementAsset(elementStep, elementLabel);
      const defaultSong = worshipTemplateDefaultSong(elementStep, elementType);
      const defaultSongVersionId = defaultSong?.version?._worshipVersionPersisted ? defaultSong.version.id : null;
      elements.push({
        id: createUuid(),
        section_id: sectionId,
        sort_order: elementIndex + 1,
        element_type: elementType,
        title: ready ? "" : (defaultSong ? "" : String(elementStep.default_text || elementStep.title || "").trim()),
        person: cleanServiceAssignee(elementStep.person || elementStep.assignee || ""),
        body: "",
        scripture_reference: "",
        song_id: defaultSong?.song.id || null,
        song_version_id: defaultSongVersionId,
        source_kind: "mindex",
        source_ref: { label: elementLabel, template: true, placeholder: !ready, ...(templateVersion ? { template_version: templateVersion } : {}) },
        config: {
          ...(formHint ? { formHint } : {}),
          ...(formPreset ? { formPreset } : {}),
          ...(formPresetRules.length ? { formPresetRules } : {}),
          ...(defaultStrength ? { defaultStrength } : {}),
          ...(outputMode ? { outputMode } : {}),
          ...(introSlide ? { introSlide } : {}),
          ...(textHighlights.length ? { textHighlights } : {}),
          ...(asset.url ? { asset: { ...asset, kind: asset.kind || elementType } } : {}),
          ...(elementStep.hiddenInPresentation || elementStep.hidden_in_presentation ? { hiddenInPresentation: true } : {}),
          ...(ready ? { presenterRole: "ready" } : {}),
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
  }];
}

function worshipTemplateDefaultSong(step = {}, elementType = "") {
  if (normalizeWorshipElementType(elementType) !== "praise") return null;
  const spec = step.defaultSong && typeof step.defaultSong === "object" ? step.defaultSong : null;
  const title = String(spec?.title || "").trim();
  if (!title) return null;
  const hymnNo = String(spec?.hymnNo || spec?.hymn_no || "").trim();
  const song = findServicePraiseSong([hymnNo, title].filter(Boolean).join(" "))
    || findServicePraiseSong(title);
  if (!song || (hymnNo && String(song.hymn_no || "").trim() !== hymnNo)) return null;
  const versions = Array.isArray(song.versions) ? song.versions : [];
  const version = versions.find((item) => item.id === getPreferredVersionId(song)) || versions[0] || null;
  return version ? { song, version } : null;
}

function isReadyServiceTemplateLabel(label) {
  const compact = compactSearchValue(label);
  return compact === "준비" || compact === "예배준비" || compact === "예배준비영상" || compact === "대기영상";
}

function isClosingVisualServiceTemplateLabel(label) {
  const compact = compactSearchValue(label);
  return compact === "마무리" || compact === "마침" || compact === "폐회";
}

function isPublicClosingImageServiceItem(item = {}, memo = emptyServiceItemMemo()) {
  if (serviceMemoElementType(memo) !== "image") return false;
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  return sectionKey === "closing_visual" || isClosingVisualServiceTemplateLabel(item?.label || "");
}

function isPublicFixedDoxologyServiceItem(item = {}, memo = emptyServiceItemMemo(), service = null) {
  if (compactSearchValue(item?.label || "") !== "송영") return false;
  const itemService = service || state.services.find((candidate) => candidate.id === item?.service_id) || null;
  return Boolean(publicFixedDoxologySpec(itemService));
}

function publicFixedDoxologySpec(service = null) {
  return {
    "sunday-first": { hymnNo: "5", title: "이 천지간 만물들아" },
    "sunday-second": { hymnNo: "5", title: "이 천지간 만물들아" },
    "sunday-afternoon": { hymnNo: "1", title: "만복의 근원 하나님" },
  }[worshipAppServiceTypeId(service?.type_id)] || null;
}

function publicFixedDoxologyDisplayText(service = null) {
  const spec = publicFixedDoxologySpec(service) || { hymnNo: "5", title: "이 천지간 만물들아" };
  return `${spec.hymnNo} ${spec.title}`;
}

function isPublicFixedDoxologyDisplayText(value = "") {
  const compact = compactSearchValue(value);
  return [
    publicFixedDoxologyDisplayText({ type_id: "sunday-first" }),
    publicFixedDoxologyDisplayText({ type_id: "sunday-afternoon" }),
  ].some((title) => compact === compactSearchValue(title));
}

function worshipTemplateElementAsset(step = {}, label = "") {
  const asset = normalizeServiceAsset(step.asset || step.media || step.file);
  if (asset.url) return asset;
  const compact = compactSearchValue(label);
  if (compact === "마무리" || compact === "마침") {
    return PUBLIC_WORSHIP_CLOSING_IMAGE_ASSET;
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
    "공동기도": "corporate_prayer",
    "기도회": "prayer_meeting",
    "통성기도": "prayer_meeting",
    "자율기도": "prayer_meeting",
    "봉헌": "offering",
    "봉헌기도": "offering_prayer",
    "교회소식": "announcements",
    "광고": "announcements",
    "파송": "sending",
    "폐회": "closing_visual",
    "송영": "sending",
    "폐회찬송": "closing_visual",
    "축도": "sending",
    "마무리": "closing_visual",
    "마침": "closing_visual",
    "주기도문": "sending",
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
  if (compact === "참회기도" || compact === "참회의기도") return "title";
  if (compact === "사도신경" || compact === "주기도문") return "body";
  if (/기도|특송|축도/.test(compact)) return "title_person";
  if (/마무리|마침/.test(compact)) return "image";
  if (/교회소식|광고/.test(compact)) return "plain_text";
  return "plain_text";
}

function normalizeWorshipElementType(value) {
  const raw = String(value || "").trim().toLowerCase();
  const canonical = raw.replace(/-/g, "_");
  if (["title", "title_content", "title_person", "plain_text", "body", "scripture_reading", "scripture_body", "live_praise", "live_scripture", "editable", "ppt"].includes(canonical)) return canonical;
  const type = normalizeServiceElementType(value);
  if (type === "template") return "plain_text";
  if (type === "title" || type === "title_content") return type;
  if (type === "score") return "score";
  if (type === "file") return "ppt";
  if (type === "scripture") return "scripture_reading";
  return ["blank", "title", "title_content", "plain_text", "title_person", "body", "praise", "live_praise", "live_scripture", "scripture_reading", "scripture_body", "image", "video", "editable", "ppt", "pdf", "score"].includes(type)
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
  if (!row?.date) return false;
  return parseLocalDate(row.date).getDay() !== 0;
}

function calendarRowHasLectionaryData(row = {}) {
  return cleanList(CALENDAR_LECTIONARY_FIELDS.map(([field]) => row[field])).length > 0;
}

function getCalendarDisplayRows() {
  const rows = (state.calendarData || []).filter((row) => {
    if (!isCalendarDisplayDate(row?.date)) return false;
    if (parseLocalDate(row.date).getDay() === 0) return true;
    return cleanList([
      row.liturgical,
      row.note,
      row.church_schedule,
      ...CALENDAR_DEPARTMENT_FIELDS.map(([field]) => row[field]),
      ...CALENDAR_LECTIONARY_FIELDS.map(([field]) => row[field]),
    ]).length > 0;
  });
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
      <td class="cal-inline-summary" colspan="${Number(options.summaryColspan) || 8}">
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
  return `Year ${["C", "A", "B"][year % 3]}`;
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
  const moduleButtons = Array.isArray(refs.moduleButtons)
    ? refs.moduleButtons
    : [...document.querySelectorAll(".module-tab[data-module]")];
  refs.moduleButtons = moduleButtons;
  for (const button of moduleButtons) {
    const buttonModule = button.dataset.module;
    const active = buttonModule === state.module || (buttonModule === "service" && state.module === "presenter");
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-current", active ? "page" : "false");
  }
  const homeActive = state.module === "home";
  refs.brandNameHome?.setAttribute("aria-current", homeActive ? "page" : "false");
  renderPageTabTitle();
  renderNavigationSidebarState();
  syncSidebarCollapsedState();
  refs.searchInput.placeholder = "검색...";
  refs.searchInput.setAttribute("aria-label", "검색");
  syncPraiseCreateControls();
  refs.saveAllBtn.hidden = false;
  const saveLabel =
    state.module === "scripture"
      ? "말씀 저장"
      : isServiceDataModule()
        ? "예배 저장"
      : state.module === "references"
          ? "참고자료 저장"
        : state.module === "calendar"
          ? "교회력은 여기서 읽기 전용입니다"
          : state.module === "praise"
          ? "찬양 저장"
          : "저장";
  refs.saveAllBtn.setAttribute("aria-label", saveLabel);
  renderListFilter();
}

function renderPageTabTitle() {
  syncActivePageTabState();
  renderPageTabs();
}

function currentPageTabTitle() {
  if (state.module === "presenter") {
    const service = state.services.find((svc) => svc.id === state.presenter.serviceId || svc.id === state.selectedServiceId);
    return service ? serviceDisplayTypeName(service) : "예배";
  }
  if (state.module === "service") {
    const service = state.services.find((svc) => svc.id === state.selectedServiceId);
    return service ? serviceDisplayTypeName(service) : "예배";
  }
  if (state.module === "scripture") {
    const book = getBibleBooks().find((item) => item.code === state.selectedBookCode);
    return book ? book.koreanName || book.englishName || "말씀" : "말씀";
  }
  if (state.module === "praise") {
    const song = getSelectedSong();
    return song ? songListView(song).title || song.title || "찬양" : "찬양";
  }
  if (state.module === "calendar") return "교회력";
  if (state.module === "references") return "참고자료";
  return "홈";
}

const homePageTabSnapshot = () => ({
    module: "home",
    search: "",
    praiseFilter: "all",
    scriptureFilter: "all",
    serviceFilter: "all",
    selectedBibleChapter: 1,
});

const defaultPageTabSnapshot = () => homePageTabSnapshot();

function newPageTab(snapshot = currentBrowserHistorySnapshot()) {
  const cleanSnapshot = sanitizePageTabSnapshot(snapshot);
  return {
    id: `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    label: pageTabTitleForSnapshot(cleanSnapshot),
    snapshot: cleanSnapshot,
  };
}

const sanitizePageTabSnapshot = (snapshot = {}) => ({
    ...homePageTabSnapshot(),
    ...snapshot,
    module: ROUTE_MODULES.includes(snapshot.module) ? snapshot.module : "home",
});

function sanitizePageTab(tab) {
  const snapshot = sanitizePageTabSnapshot(tab?.snapshot || defaultPageTabSnapshot());
  return {
    id: String(tab?.id || `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
    label: String(tab?.label || "").trim() || pageTabTitleForSnapshot(snapshot),
    snapshot,
  };
}

function homePageTab() {
  return {
    id: HOME_PAGE_TAB_ID,
    label: "홈",
    snapshot: homePageTabSnapshot(),
  };
}

function normalizePageTabsState(tabs = [], activeIndex = 0) {
  const sanitized = tabs.map(sanitizePageTab).filter(Boolean);
  state.pageTabs = sanitized.length ? sanitized : [homePageTab()];
  state.pageTabIndex = Math.max(0, Math.min(Number(activeIndex) || 0, state.pageTabs.length - 1));
}

function pageTabTitleForSnapshot(snapshot = {}) {
  const moduleName = snapshot.module || "home";
  if (moduleName === "presenter") {
    const service = state.services.find((svc) => svc.id === snapshot.selectedServiceId);
    return service ? serviceDisplayTypeName(service) : "예배";
  }
  if (moduleName === "service") {
    const service = state.services.find((svc) => svc.id === snapshot.selectedServiceId);
    if (service) return serviceDisplayTypeName(service);
    if (snapshot.selectedServiceTypeId === SERVICE_LIST_PANEL_ID) return "전체 예배";
    if (snapshot.selectedServiceTypeId === SERVICE_TEMPLATES_PANEL_ID) return "템플릿";
    return "예배";
  }
  if (moduleName === "scripture") {
    const book = getBibleBooks().find((item) => item.code === snapshot.selectedBookCode);
    return book ? book.koreanName || book.englishName || "말씀" : "말씀";
  }
  if (moduleName === "praise") {
    const song = state.songs.find((item) => item.id === snapshot.selectedSongId);
    return song ? songListView(song).title || song.title || "찬양" : "찬양";
  }
  if (moduleName === "calendar") return "교회력";
  if (moduleName === "references") return "참고자료";
  return "홈";
}

function readPageTabsState() {
  const raw = safeStorageGet("session", MINDEX_TAB_STATE_STORAGE_KEY);
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const tabs = Array.isArray(parsed?.tabs) ? parsed.tabs : [];
  normalizePageTabsState(tabs, Number(parsed?.index) || 0);
}

function persistPageTabsState() {
  const payload = {
    tabs: state.pageTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      snapshot: tab.snapshot,
    })),
    index: state.pageTabIndex,
  };
  safeStorageSet("session", MINDEX_TAB_STATE_STORAGE_KEY, JSON.stringify(payload));
}

function syncActivePageTabState() {
  if (state.applyingPageTab) return;
  if (!state.pageTabs.length) normalizePageTabsState([], 0);
  const tab = state.pageTabs[state.pageTabIndex];
  if (!tab) return;
  tab.snapshot = sanitizePageTabSnapshot(currentBrowserHistorySnapshot());
  tab.label = currentPageTabTitle();
  persistPageTabsState();
}

function renderPageTabs() {
  if (!refs.pageTabs) {
    if (refs.pageTabLabel) refs.pageTabLabel.textContent = currentPageTabTitle();
    return;
  }
  if (!state.pageTabs.length) normalizePageTabsState([], 0);
  const addButton = refs.pageTabAddBtn;
  refs.pageTabs.innerHTML = state.pageTabs.map((tab, index) => {
    const active = index === state.pageTabIndex;
    const close = state.pageTabs.length > 1 || tab.snapshot?.module !== "home"
      ? `<button class="page-tab-close" type="button" data-page-tab-close="${escapeAttr(String(index))}" aria-label="Close ${escapeAttr(tab.label)}"><i data-lucide="x"></i></button>`
      : "";
    return `
      <button class="page-tab${active ? " active" : ""}" type="button" role="tab" draggable="${state.pageTabs.length > 1 ? "true" : "false"}" data-page-tab-index="${escapeAttr(String(index))}" aria-selected="${active ? "true" : "false"}" ${active ? 'aria-current="page"' : ""}>
        <span>${escapeHtml(tab.label)}</span>
        ${close}
      </button>
    `;
  }).join("");
  if (addButton) refs.pageTabs.appendChild(addButton);
}

let pageTabDragIndex = null;
let pageTabDropIndex = null;

function clearPageTabDragState() {
  pageTabDragIndex = null;
  pageTabDropIndex = null;
  refs.pageTabs?.querySelectorAll(".page-tab.dragging, .page-tab.drag-before, .page-tab.drag-after").forEach((tab) => {
    tab.classList.remove("dragging", "drag-before", "drag-after");
    tab.removeAttribute("aria-grabbed");
  });
}

function handlePageTabDragStart(event) {
  if (event.target.closest("[data-page-tab-close]")) {
    event.preventDefault();
    return;
  }
  const tab = event.target.closest("[data-page-tab-index]");
  if (!tab || state.pageTabs.length < 2) return;
  pageTabDragIndex = Number(tab.dataset.pageTabIndex);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(pageTabDragIndex));
  tab.classList.add("dragging");
  tab.setAttribute("aria-grabbed", "true");
}

function handlePageTabDragOver(event) {
  if (!Number.isInteger(pageTabDragIndex)) return;
  const tab = event.target.closest("[data-page-tab-index]");
  if (!tab) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const targetIndex = Number(tab.dataset.pageTabIndex);
  const bounds = tab.getBoundingClientRect();
  const after = event.clientX >= bounds.left + bounds.width / 2;
  pageTabDropIndex = targetIndex + (after ? 1 : 0);
  refs.pageTabs.querySelectorAll(".page-tab.drag-before, .page-tab.drag-after").forEach((item) => {
    item.classList.remove("drag-before", "drag-after");
  });
  tab.classList.add(after ? "drag-after" : "drag-before");
}

function reorderPageTab(fromIndex, insertionIndex) {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(insertionIndex)) return false;
  if (fromIndex < 0 || fromIndex >= state.pageTabs.length) return false;
  const activeId = state.pageTabs[state.pageTabIndex]?.id;
  const [tab] = state.pageTabs.splice(fromIndex, 1);
  const targetIndex = Math.max(0, Math.min(insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex, state.pageTabs.length));
  state.pageTabs.splice(targetIndex, 0, tab);
  state.pageTabIndex = Math.max(0, state.pageTabs.findIndex((item) => item.id === activeId));
  persistPageTabsState();
  renderPageTabs();
  refreshIcons();
  return targetIndex !== fromIndex;
}

function handlePageTabDrop(event) {
  if (!Number.isInteger(pageTabDragIndex) || !Number.isInteger(pageTabDropIndex)) return;
  event.preventDefault();
  const fromIndex = pageTabDragIndex;
  const insertionIndex = pageTabDropIndex;
  clearPageTabDragState();
  reorderPageTab(fromIndex, insertionIndex);
}

async function handlePageTabClick(event) {
  const close = event.target.closest("[data-page-tab-close]");
  if (close) {
    event.stopPropagation();
    await closePageTab(Number(close.dataset.pageTabClose));
    return;
  }
  const tab = event.target.closest("[data-page-tab-index]");
  if (!tab) return;
  await activatePageTab(Number(tab.dataset.pageTabIndex));
}

async function openNewPageTab() {
  syncActivePageTabState();
  state.pageTabs.splice(state.pageTabIndex + 1, 0, newPageTab(defaultPageTabSnapshot()));
  state.pageTabIndex += 1;
  persistPageTabsState();
  await applyPageTabSnapshot(state.pageTabIndex);
}

async function closePageTab(index) {
  if (!Number.isInteger(index)) return;
  if (state.pageTabs.length === 1) {
    if (state.pageTabs[0]?.snapshot?.module === "home") return;
    await goHome();
    return;
  }
  const closingActive = index === state.pageTabIndex;
  state.pageTabs.splice(index, 1);
  if (index < state.pageTabIndex) state.pageTabIndex -= 1;
  state.pageTabIndex = Math.max(0, Math.min(state.pageTabIndex, state.pageTabs.length - 1));
  persistPageTabsState();
  if (closingActive) await applyPageTabSnapshot(state.pageTabIndex);
  else {
    renderPageTabs();
    refreshIcons();
  }
}

async function activatePageTab(index, { force = false } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= state.pageTabs.length) return;
  if (!force && index === state.pageTabIndex) return;
  if (!(await confirmSaveBeforeLeaving())) return;
  syncActivePageTabState();
  state.pageTabIndex = index;
  await applyPageTabSnapshot(index);
}

async function applyPageTabSnapshot(index) {
  state.applyingPageTab = true;
  try {
    await applyBrowserHistorySnapshot(state.pageTabs[index].snapshot || defaultPageTabSnapshot());
  } finally {
    state.applyingPageTab = false;
  }
  state.pageTabs[index].label = pageTabTitleForSnapshot(state.pageTabs[index].snapshot);
  persistPageTabsState();
  renderPageTabs();
  syncBrowserHistory({ replace: true });
  refreshIcons();
}

function renderNavigationSidebarState() {
  refs.navButtons?.forEach((button) => {
    const moduleName = button.dataset.homeModule;
    const active = moduleName === state.module || (moduleName === "service" && state.module === "presenter");
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

async function handleNavigationRailClick(button) {
  const moduleName = button.dataset.homeModule;
  if (moduleName === "home") {
    await goHome();
    return;
  }
  await switchModule(moduleName);
}

function renderWorshipModeTabs(serviceId, activeMode = state.module === "presenter" ? "presenter" : "service") {
  if (!serviceId) return "";
  if (activeMode === "presenter") return "";
  return `
    <button class="svc-output-action" type="button" data-open-presenter-service="${escapeAttr(serviceId)}" aria-label="프레젠터 열기">
      <i data-lucide="screen-share"></i>
      <span>송출</span>
    </button>`;
}

function serviceSupportsBulletin(service = null) {
  return worshipAppServiceTypeId(service?.type_id) === "young-adult";
}

async function runServiceBulletinAction(action = "", serviceId = "") {
  const service = state.services.find((candidate) => candidate.id === serviceId);
  if (!service || !serviceSupportsBulletin(service)) return;
  if (action === "close") {
    state.presenterBulletinServiceId = null;
    renderCurrentServiceModuleDetail();
    return;
  }
  if (action === "print") {
    document.body.classList.add("printing-service-bulletin");
    const clearPrintMode = () => document.body.classList.remove("printing-service-bulletin");
    window.addEventListener("afterprint", clearPrintMode, { once: true });
    window.setTimeout(clearPrintMode, 1000);
    window.print();
    return;
  }
  if (action !== "open") return;
  state.presenterBulletinServiceId = service.id;
  renderCurrentServiceModuleDetail();
  if (!state.calendarLoaded && !state.calendarLoading) {
    await loadCalendarData({ silent: true });
    if (state.module === "presenter" && state.presenterBulletinServiceId === service.id) {
      renderCurrentServiceModuleDetail();
    }
  }
}

function canCreatePraiseSong() {
  return state.module === "praise" && !state.loading && !songLoadPromise;
}

function syncPraiseCreateControls() {
  const canCreate = canCreatePraiseSong();
  if (refs.newSongBtn) {
    refs.newSongBtn.hidden = !canCreate;
    refs.newSongBtn.disabled = !canCreate;
  }
  refs.detailPane?.querySelectorAll("[data-create-song]").forEach((button) => {
    button.hidden = !canCreate;
    button.disabled = !canCreate;
  });
}

function syncSidebarCollapsedState() {
  const collapsed = document.body.classList.contains("sidebar-collapsed");
  refs.sidebarToggleBtn?.classList.toggle("active", !collapsed);
  refs.sidebarToggleBtn?.setAttribute("aria-pressed", String(!collapsed));
  refs.sidebarToggleBtn?.setAttribute("aria-expanded", String(!collapsed));
  refs.sidebarToggleBtn?.setAttribute("aria-label", collapsed ? "사이드바 열기" : "사이드바 닫기");
  refs.sidebarToggleBtn?.setAttribute("title", collapsed ? "사이드바 열기" : "사이드바 닫기");
  if (refs.sidebarToggleBtn) {
    refs.sidebarToggleBtn.innerHTML = `<i data-lucide="panel-left"></i>`;
    refreshIcons();
  }
  if (refs.sidebarToggleBtn) refs.sidebarToggleBtn.disabled = false;
  if (refs.sidebar) {
    refs.sidebar.inert = collapsed;
    refs.sidebar.setAttribute("aria-hidden", String(collapsed));
    if (collapsed && refs.sidebar.contains(document.activeElement)) refs.sidebarToggleBtn?.focus();
  }
}

const SERVICE_CATEGORIES = {
  public: ["sunday-first","sunday-second","sunday-main","sunday-afternoon","wednesday","friday","monthly"],
  ministry: ["children","youth","young-adult"],
  special: ["special","holy-week-dawn","omer"],
};

// Ministry services remain independently configurable, but youth services use a
// verified weekly scaffold so a newly created service is ready for input.
const TEMPLATE_PROJECTED_SERVICE_TYPES = new Set([
  ...SERVICE_CATEGORIES.public,
  "youth",
  "young-adult",
]);

const SERVICE_TYPE_DISPLAY_NAMES = {
  "sunday-first": "주일예배 [1부]",
  "sunday-second": "주일예배 [2부]",
  "sunday-main": "주일예배 [3부]",
  "sunday-afternoon": "주일오후예배",
  wednesday: "수요예배",
  friday: "금요기도회",
  monthly: "월삭예배",
  "주일예배": "주일예배 [3부]",
  "새벽기도회": "특별예배",
  children: "어린이부 예배",
  youth: "청소년부 예배",
  "young-adult": "청년부 예배",
  special: "특별예배",
  "holy-week-dawn": "특별새벽기도회",
  omer: "오멜세기기도회",
};

const SERVICE_TYPE_LEGACY_NAMES = {
  sun_1st: "주일예배 [1부]",
  sun_2nd: "주일예배 [2부]",
  sun_3rd: "주일예배 [3부]",
  sun_4th: "주일오후예배",
  sunday_4th: "주일오후예배",
  "sunday-fourth": "주일오후예배",
  sunday_fourth: "주일오후예배",
  sunday_afternoon: "주일오후예배",
  "주일예배 (4부)": "주일오후예배",
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
  "sun_4th",
  "sunday_4th",
  "sunday-fourth",
  "sunday_fourth",
  "sunday_afternoon",
  "wed",
]);
const CLEAN_OUTPUT_SERVICE_TYPES = new Set([
  "sunday-first",
  "sun_1st",
  "friday",
  "fri",
  "children",
  "youth",
  "young-adult",
  "young_adult",
]);
const WORSHIP_BACKGROUND_BASE = "assets/worship-backgrounds";
const PRESENTER_READY_ASSET_BASE = "assets/presenter";
const PRESENTER_READY_BACKGROUND_BLOCKLIST = new Set([
  "friday-prayer-ready.png",
]);
const WORSHIP_BACKGROUND_REGISTRY_STORAGE_KEY = "mindex.worshipBackgroundRegistry";
const WORSHIP_BACKGROUND_ASSET_EXTENSIONS = ["png"];
const WORSHIP_BACKGROUND_REGISTRY_GROUPS = ["A", "B", "C"];
const WORSHIP_BACKGROUND_REGISTRY_SLOTS = [1, 2, 3, 4, 5, 6];
const WORSHIP_BACKGROUND_SEASON_CODES = ["S1", "S2", "S3", "S4", "S5", "S6", "SH", "ST"];
const SERVICE_DEFAULT_BACKGROUND_GROUPS = {
  "sunday-first": "A",
  "sunday-second": "A",
  "sunday-main": "A",
  "young-adult": "A",
  friday: "B",
  youth: "B",
  children: "C",
};
const SERVICE_DEFAULT_BACKGROUND_FILES = {};
const WORSHIP_BACKGROUND_STATIC_FILES = new Set([
  "26-A1.png",
  "26-A2.png",
  "26-A3.png",
  "26-A4.png",
  "26-B1.png",
  "26-B2.png",
  "26-B3.png",
  "26-B4.png",
  "26-C1.png",
  "26-C2.png",
  "26-C3.png",
  "26-S4.png",
  "26-S5.png",
  "26-S6.png",
]);
function presenterServiceUsesChromakey(service) {
  return serviceTypeUsesChromakey(service?.type_id);
}

function serviceTypeUsesChromakey(typeId) {
  const rawId = String(typeId || "");
  const appId = worshipAppServiceTypeId(rawId);
  if (CLEAN_OUTPUT_SERVICE_TYPES.has(appId) || CLEAN_OUTPUT_SERVICE_TYPES.has(rawId)) return false;
  const type = serviceTypeById(appId) || state.serviceTypes.find((candidate) => candidate._worshipId === rawId) || null;
  if (type?._worship) {
    const outputContext = normalizePresenterOutputContext(type._worshipOutputContext || "");
    if (outputContext === "clean") return false;
    if (outputContext === "chromakey") return true;
    return Boolean(type._worshipChromakey || CHROMAKEY_SERVICE_TYPES.has(appId) || CHROMAKEY_SERVICE_TYPES.has(rawId));
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

function presenterBackgroundSourcesForService(service, options = {}) {
  if (!service) return [];
  const includeChromakeyCleanSlides = Boolean(options.includeChromakeyCleanSlides);
  if (presenterServiceUsesChromakey(service) && !includeChromakeyCleanSlides) return [];
  const seasonFileName = presenterSeasonBackgroundFileNameForService(service);
  if (seasonFileName) {
    const seasonSources = worshipBackgroundSourcesForFileName(seasonFileName);
    if (seasonSources.length) return seasonSources;
  }
  const sourceRef = service?._worshipSourceRef && typeof service._worshipSourceRef === "object" ? service._worshipSourceRef : {};
  const value = firstNonBlankString(
    service?.presenter_background,
    service?.presenter_background_file,
    service?.presenterBackground,
    service?.background_image,
    service?.backgroundImage,
    service?.background,
    sourceRef.presenter_background,
    sourceRef.presenter_background_file,
    sourceRef.presenterBackground,
    sourceRef.background_image,
    sourceRef.backgroundImage,
    sourceRef.background,
  );
  if (!value) {
    const defaultFileName = presenterDefaultBackgroundFileNameForService(service);
    return defaultFileName ? worshipBackgroundSourcesForFileName(defaultFileName) : [];
  }
  if (presenterBackgroundValueIsReadyAsset(value)) return [];
  if (/^(?:data:|https?:|blob:)/i.test(value)) return [resolveWorshipBackgroundSource(value)];
  if (value.includes("/")) return [resolveWorshipBackgroundSource(value)];
  if (/\.(?:jpe?g|png)$/i.test(value)) {
    const fileName = worshipBackgroundFileNameFromPath(value);
    return [
      state.worshipBackgroundRegistry[fileName]?.dataUrl,
      ...worshipBackgroundSourcesForFileName(fileName),
    ].filter((item, index, list) => item && list.indexOf(item) === index);
  }
  return worshipBackgroundSourcesForFileName(value);
}

function presenterDefaultBackgroundFileNameForService(service) {
  const serviceType = worshipAppServiceTypeId(service?.type_id || "");
  const fixedFileName = SERVICE_DEFAULT_BACKGROUND_FILES[serviceType];
  if (fixedFileName) return fixedFileName;
  const group = SERVICE_DEFAULT_BACKGROUND_GROUPS[serviceType];
  const serviceDate = service?.date || new Date();
  return group ? worshipBackgroundFileName(group, presenterBackgroundSlotForDate(serviceDate), serviceDate) : "";
}

function presenterBackgroundValueIsReadyAsset(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const fileName = worshipBackgroundFileNameFromPath(text);
  return text.includes(`${PRESENTER_READY_ASSET_BASE}/`)
    || PRESENTER_READY_BACKGROUND_BLOCKLIST.has(fileName);
}

function presenterSeasonBackgroundFileNameForService(service) {
  const code = presenterSeasonBackgroundCode(service);
  return code ? worshipBackgroundFileName(code, "", service?.date || new Date()) : "";
}

function presenterSeasonBackgroundCode(service) {
  const tags = Array.isArray(service?.tags) ? service.tags.map((tag) => String(tag).replace(/\s+/g, "")) : [];
  const haystack = [serviceDisplayTypeName(service), ...tags].join(" ");
  if (/맥추|harvest/i.test(haystack)) return "SH";
  if (/추수|thanksgiving/i.test(haystack)) return "ST";
  if (/대림|advent/i.test(haystack)) return "S1";
  if (/성탄|christmas/i.test(haystack)) return "S2";
  if (/주현|epiphany/i.test(haystack)) return "S3";
  if (/종려|사순|수난|lent|palm/i.test(haystack)) return "S4";
  if (/부활|easter/i.test(haystack)) return "S5";
  if (/성령강림|pentecost/i.test(haystack)) return "S6";
  return "";
}

function presenterBackgroundSlotForDate(value) {
  const month = parseLocalDate(value).getMonth() + 1;
  const bucket = Math.floor((month - 1) / 2);
  return bucket + 1;
}

function worshipBackgroundYearCode(value = new Date()) {
  const date = parseLocalDate(value);
  const year = Number.isFinite(date.getFullYear()) ? date.getFullYear() : new Date().getFullYear();
  return String(year % 100).padStart(2, "0");
}

function worshipBackgroundFileName(group, slot, yearSource = new Date()) {
  const code = String(group || "A").trim().toUpperCase();
  const year = worshipBackgroundYearCode(yearSource);
  if (code === "SH" || code === "ST") return `${year}-${code}.png`;
  if (/^S[1-6]$/.test(code)) return `${year}-${code}.png`;
  if (code === "S") return `${year}-S${Number(slot) || 1}.png`;
  return `${year}-${code}${Number(slot) || 1}.png`;
}

function worshipBackgroundCandidateFileNames(fileName) {
  const baseName = worshipBackgroundFileNameFromPath(fileName).replace(/\.(?:jpe?g|png)$/i, "");
  return WORSHIP_BACKGROUND_ASSET_EXTENSIONS.map((extension) => `${baseName}.${extension}`);
}

function worshipBackgroundPath(fileName) {
  return `${WORSHIP_BACKGROUND_BASE}/${fileName}`;
}

function worshipBackgroundFileNameFromPath(value) {
  const clean = String(value || "").split(/[?#]/)[0];
  return clean.split("/").pop() || clean;
}

function resolveWorshipBackgroundSource(source) {
  const fileName = worshipBackgroundFileNameFromPath(source);
  return state.worshipBackgroundRegistry[fileName]?.dataUrl || source;
}

function worshipBackgroundSourcesForFileName(fileName) {
  const candidateFileNames = worshipBackgroundCandidateFileNames(fileName);
  const registeredSources = candidateFileNames
    .map((candidate) => state.worshipBackgroundRegistry[candidate]?.dataUrl)
    .filter(Boolean);
  const assetSources = candidateFileNames
    .filter((candidate) => WORSHIP_BACKGROUND_STATIC_FILES.has(candidate))
    .map(worshipBackgroundPath);
  return [...new Set([...registeredSources, ...assetSources])];
}

function presenterBackgroundCssValue(sources = []) {
  return sources
    .filter(Boolean)
    .map((source) => `url("${escapeCssUrl(source)}")`)
    .join(", ");
}

const escapeCssUrl = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function readWorshipBackgroundRegistry() {
  const raw = safeStorageGet("local", WORSHIP_BACKGROUND_REGISTRY_STORAGE_KEY, "{}");
  try {
    return sanitizeWorshipBackgroundRegistry(JSON.parse(raw || "{}"));
  } catch {
    return {};
  }
}

function sanitizeWorshipBackgroundRegistry(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) return {};
  return Object.entries(registry).reduce((next, [key, entry]) => {
    const fileName = worshipBackgroundFileNameFromPath(entry?.fileName || key);
    const dataUrl = String(entry?.dataUrl || "");
    if (!fileName || !/^data:image\//.test(dataUrl)) return next;
    next[fileName] = {
      fileName,
      dataUrl,
      originalName: String(entry?.originalName || ""),
      type: String(entry?.type || "image/png"),
      size: Number(entry?.size) || 0,
      updatedAt: String(entry?.updatedAt || ""),
    };
    return next;
  }, {});
}

function saveWorshipBackgroundRegistry(registry) {
  return safeStorageSet("local", WORSHIP_BACKGROUND_REGISTRY_STORAGE_KEY, JSON.stringify(registry || {}));
}

function worshipBackgroundTargets() {
  const currentYear = new Date();
  return [...new Set([
    ...WORSHIP_BACKGROUND_REGISTRY_GROUPS.flatMap((group) =>
      WORSHIP_BACKGROUND_REGISTRY_SLOTS.map((slot) => worshipBackgroundFileName(group, slot, currentYear))
    ),
    ...WORSHIP_BACKGROUND_SEASON_CODES.map((code) => worshipBackgroundFileName(code, "", currentYear)),
    ...WORSHIP_BACKGROUND_STATIC_FILES,
    ...Object.keys(state.worshipBackgroundRegistry || {}),
  ])]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((fileName) => ({ fileName, path: worshipBackgroundPath(fileName) }));
}

function registeredWorshipBackgroundCount() {
  return Object.keys(state.worshipBackgroundRegistry || {}).length;
}

function currentWorshipBackgroundFileName() {
  const now = new Date();
  return worshipBackgroundFileName("A", presenterBackgroundSlotForDate(now), now);
}

function selectedWorshipBackgroundFileName() {
  return state.selectedWorshipBackgroundFile || currentWorshipBackgroundFileName();
}

async function handleWorshipBackgroundAction(button) {
  const action = button.dataset.backgroundAction;
  const fileName = worshipBackgroundFileNameFromPath(button.dataset.backgroundFile || selectedWorshipBackgroundFileName());
  if (action === "register") {
    await registerSelectedWorshipBackground(fileName);
  } else if (action === "download") {
    downloadWorshipBackground(fileName);
  } else if (action === "clear") {
    clearRegisteredWorshipBackground(fileName);
  } else if (action === "manifest") {
    downloadWorshipBackgroundManifest();
  }
}

async function registerSelectedWorshipBackground(fileName) {
  const input = refs.detailPane?.querySelector("[data-background-file]");
  const file = input?.files?.[0] || null;
  if (!fileName || !file) {
    showToast("등록할 PNG 이미지를 선택해 주세요.", "error");
    return;
  }
  if (file.type && !file.type.startsWith("image/")) {
    showToast("이미지 파일만 등록할 수 있습니다.", "error");
    return;
  }

  let dataUrl = "";
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch (error) {
    showToast(error.message || "File read failed.", "error");
    return;
  }

  const nextRegistry = {
    ...state.worshipBackgroundRegistry,
    [fileName]: {
      fileName,
      dataUrl,
      originalName: file.name || "",
      type: file.type || "image/png",
      size: file.size || dataUrlByteSize(dataUrl),
      updatedAt: new Date().toISOString(),
    },
  };
  if (!saveWorshipBackgroundRegistry(nextRegistry)) {
    showToast("Image is too large for local storage.", "error");
    return;
  }
  state.worshipBackgroundRegistry = nextRegistry;
  state.selectedWorshipBackgroundFile = fileName;
  if (input) input.value = "";
  refreshPresenterBackgrounds();
  renderWorshipBackgroundsDetail();
  renderSongList();
  showToast(`${fileName} registered.`);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function dataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",", 2)[1] || "";
  return Math.max(0, Math.floor((base64.length * 3) / 4));
}

function clearRegisteredWorshipBackground(fileName) {
  if (!state.worshipBackgroundRegistry[fileName]) return;
  const nextRegistry = { ...state.worshipBackgroundRegistry };
  delete nextRegistry[fileName];
  if (!saveWorshipBackgroundRegistry(nextRegistry)) {
    showToast("Background update failed.", "error");
    return;
  }
  state.worshipBackgroundRegistry = nextRegistry;
  refreshPresenterBackgrounds();
  renderWorshipBackgroundsDetail();
  renderSongList();
  showToast(`${fileName} cleared.`);
}

function refreshPresenterBackgrounds() {
  const serviceIds = new Set([state.presenter.serviceId, state.selectedServiceId].filter(Boolean));
  serviceIds.forEach((serviceId) => refreshPresenterForService(serviceId, { publish: true }));
}

function downloadWorshipBackground(fileName) {
  const entry = state.worshipBackgroundRegistry[fileName];
  if (entry?.dataUrl) {
    downloadDataUrlFile(entry.dataUrl, fileName);
    return;
  }
  if (WORSHIP_BACKGROUND_STATIC_FILES.has(fileName)) {
    downloadUrlFile(worshipBackgroundPath(fileName), fileName);
    return;
  }
  showToast("No background to download.", "error");
}

function downloadWorshipBackgroundManifest() {
  const manifest = {
    basePath: WORSHIP_BACKGROUND_BASE,
    entries: Object.values(state.worshipBackgroundRegistry || {}).map((entry) => ({
      fileName: entry.fileName,
      path: worshipBackgroundPath(entry.fileName),
      originalName: entry.originalName || "",
      type: entry.type || "",
      size: entry.size || 0,
      updatedAt: entry.updatedAt || "",
    })),
  };
  downloadTextFile(JSON.stringify(manifest, null, 2), "worship-backgrounds-manifest.json", "application/json");
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

// Home chooses public services by their actual meeting window, not only by date.
const SERVICE_TIME_WINDOWS = {
  wednesday: { start: "19:10", end: "20:30" },
  friday: { start: "20:00", end: "22:00" },
  "sunday-first": { start: "07:00", end: "08:00" },
  "sunday-second": { start: "08:50", end: "10:00" },
  "sunday-main": { start: "10:50", end: "12:00" },
  children: { start: "10:50", end: "12:00" },
  youth: { start: "10:50", end: "12:00" },
  "sunday-afternoon": { start: "13:20", end: "14:30" },
  monthly: { start: "20:00", end: "22:00" },
};

const SUNDAY_MINISTRY_SERVICE_TYPES = new Set(["children", "youth", "young-adult"]);

const AUTO_UPCOMING_PUBLIC_SERVICE_TYPES = [
  "wednesday",
  "friday",
  "sunday-first",
  "sunday-second",
  "sunday-main",
  "children",
  "youth",
  "young-adult",
  "sunday-afternoon",
];

function renderListFilter() {
  if (state.module !== "praise" && state.module !== "scripture") {
    refs.listFilter.hidden = true;
    refs.listFilterButtons.forEach((button) => {
      button.hidden = true;
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    return;
  }

  refs.listFilter.hidden = false;
  refs.listFilter.setAttribute("aria-label", state.module === "scripture" ? "말씀 필터" : "찬양 필터");
  const filters = state.module === "scripture"
    ? [["all", "전체"], ["old", "구약"], ["new", "신약"]]
    : [["all", "전체"], ["hymns", "찬송가"], ["ccm", "CCM"], ["children", "어린이"]];
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
  syncPraiseCreateControls();
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
    setStatusIcon("loader-2", "", "로그인 확인 중");
    return;
  }

  if (isAuthRequired() && !state.auth.session) {
    setStatusIcon("lock", "error", "로그인 필요");
    return;
  }

  if (!hasClient) {
    setStatusIcon("database", "", "연결 끊김");
    return;
  }

  if (hasDirty) {
    setStatusIcon("database", "unsaved", "저장되지 않은 변경");
    return;
  }

  setStatusIcon("database", "connected", "연결됨");
}

function renderSongList() {
  if (isAuthRequired() && !state.auth.session) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList("로그인이 필요합니다.");
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

  if (state.connectionError && !["calendar", "references"].includes(state.module)) {
    refs.songCount.textContent = "";
    refs.songList.innerHTML = renderConnectionList(state.connectionError);
    return;
  }

  if (["calendar", "references"].includes(state.module)) {
    renderModuleSidebarContext();
    return;
  }
  if (state.module === "scripture") {
    renderScriptureList();
    return;
  }
  if (isServiceDataModule()) {
    renderServiceList();
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
    ? `${formatCount(filterBase.length)}곡 중 ${formatCount(filtered.length)}곡`
    : `${formatCount(filtered.length)}곡`;

  if (!filtered.length) {
    refs.songList.innerHTML = renderListEmptyState(
      hasSearch ? "검색 결과 없음" : "찬양 없음",
      hasSearch ? "다른 제목, 가사, 번호로 검색해 보세요." : "데이터베이스를 연결하면 찬양을 불러옵니다.",
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
  return Boolean(normalizeSearchValue(state.search)) && state.module !== "references";
}

function renderGlobalSearchList() {
  const results = getGlobalSearchResults();
  const total = results.praise.length + results.scripture.length + results.service.length;
  refs.songCount.textContent = `${formatCount(total)}개 결과`;

  if (!total) {
    refs.songList.innerHTML = renderListEmptyState("검색 결과 없음", "찬양, 말씀, 예배를 검색해 보세요.");
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
    { id: "praise", label: "찬양", items: (results) => results.praise.map(renderGlobalPraiseResult) },
    { id: "scripture", label: "말씀", items: (results) => results.scripture.map(renderGlobalScriptureResult) },
    { id: "service", label: "예배", items: (results) => results.service.map(renderGlobalServiceResult) },
  ];
  const modulePriority = {
    praise: "praise",
    scripture: "scripture",
    service: "service",
    presenter: "service",
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
  const restoredQuery = restoreKoreanKeyboardInput(query);
  const exactBook = findBibleBookByReferenceName(query)
    || findBibleBookByName(query)
    || findBibleBookByReferenceName(restoredQuery)
    || findBibleBookByName(restoredQuery);

  if (reference) {
    results.push({ kind: "reference", book: reference.book, chapter: reference.chapter, verse: reference.verse });
  } else if (exactBook) {
    results.push({ kind: "book", book: exactBook });
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
          <span class="song-title-text">성경 본문 검색</span>
        </span>
        <span class="song-meta-line">${escapeHtml(query ? `선택된 역본에서 "${query}" 검색` : "선택된 역본")}</span>
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
  const targetModule = state.module === "presenter" ? "presenter" : "service";
  if (state.module !== targetModule) {
    await switchModule(targetModule, { clearSearch: false, syncHistory: false });
    if (state.module !== targetModule) return;
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
  renderServiceList();
}

function renderHomeNextServiceSidebarCard(service) {
  return `
    <button class="home-sidebar-card service has-meta" type="button"
      data-home-next-service-action="presenter"
      data-home-service-id="${escapeAttr(service.id)}"
      aria-label="${escapeAttr(`${serviceDisplayTypeName(service)} 송출 준비`)}">
      <i data-lucide="screen-share"></i>
      <span>${escapeHtml(serviceDisplayTypeName(service))}</span>
      <small>${escapeHtml(homeServiceScheduleLabel(service, { compact: true }))}</small>
    </button>
  `;
}

function renderModuleSidebarContext() {
  refs.songCount.textContent = "";
  refs.songList.innerHTML = "";
  finishListRender();
}

function renderHomeSidebarCard(module, options = {}) {
  const active = module.id === state.module ? " active" : "";
  const disabled = options.disabled ? " disabled" : "";
  const meta = options.disabled ? "Disabled" : module.sidebarMeta;
  const hasMeta = meta ? " has-meta" : "";
  return `
    <button class="home-sidebar-card ${escapeAttr(module.id)}${active}${disabled}${hasMeta}" type="button"${options.disabled ? " disabled aria-disabled=\"true\"" : ` data-home-module="${escapeAttr(module.id)}"`}>
      <i data-lucide="${escapeAttr(module.icon)}"></i>
      <span>${escapeHtml(module.title)}</span>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </button>
  `;
}

function renderHomeDetail() {
  if (isGlobalSearchActive()) {
    renderHomeSearchDetail();
    return;
  }
  renderServiceDashboard();
}

function renderHomeSearchDetail() {
  const results = getGlobalSearchResults();
  const total = results.praise.length + results.scripture.length + results.service.length;
  refs.detailPane.innerHTML = `
    <div class="home-search-screen">
      <header class="home-search-head">
        <span>검색</span>
        <strong>${escapeHtml(state.search.trim())}</strong>
        <small>${formatCount(total)}개 결과</small>
      </header>
      ${total ? `
        <div class="home-search-results">
          ${renderGlobalSearchSections(results)}
        </div>
      ` : `
        <div class="empty-detail">
          <div class="empty-detail-inner">
            <h2>검색 결과 없음</h2>
            <p>찬양, 말씀, 예배를 검색해 보세요.</p>
          </div>
        </div>
      `}
    </div>
  `;
  refreshIcons();
}

function renderWorshipBackgroundsDetail() {
  const targets = worshipBackgroundTargets();
  const fallbackFileName = currentWorshipBackgroundFileName();
  const selectedFileName = targets.some((target) => target.fileName === selectedWorshipBackgroundFileName())
    ? selectedWorshipBackgroundFileName()
    : fallbackFileName;
  state.selectedWorshipBackgroundFile = selectedFileName;
  const selectedEntry = state.worshipBackgroundRegistry[selectedFileName];
  const selectedCanDownload = Boolean(selectedEntry) || WORSHIP_BACKGROUND_STATIC_FILES.has(selectedFileName);
  refs.detailPane.innerHTML = `
    <div class="background-manager">
      <header class="background-manager-head">
        <div>
          <span>예배</span>
          <h2>배경</h2>
        </div>
        <button class="reference-new-btn secondary" type="button" data-background-action="manifest" ${registeredWorshipBackgroundCount() ? "" : "disabled"}>
          <i data-lucide="file-json"></i>
          <span>Manifest</span>
        </button>
      </header>
      <div class="background-toolbar">
        <label class="background-field">
          <span>대상</span>
          <select data-background-target>
            ${targets.map((target) => `
              <option value="${escapeAttr(target.fileName)}" ${target.fileName === selectedFileName ? "selected" : ""}>
                ${escapeHtml(target.fileName)}${target.fileName === fallbackFileName ? " · 현재" : ""}
              </option>
            `).join("")}
          </select>
        </label>
        <label class="background-field background-file-field">
          <span>이미지</span>
          <input type="file" accept="image/png,image/*" data-background-file />
        </label>
        <button class="reference-new-btn" type="button" data-background-action="register" data-background-file="${escapeAttr(selectedFileName)}">
          <i data-lucide="upload"></i>
          <span>등록</span>
        </button>
        <button class="reference-new-btn secondary" type="button" data-background-action="download" data-background-file="${escapeAttr(selectedFileName)}" ${selectedCanDownload ? "" : "disabled"}>
          <i data-lucide="download"></i>
          <span>다운로드</span>
        </button>
      </div>
      <div class="background-path-row">
        <span>${escapeHtml(worshipBackgroundPath(selectedFileName))}</span>
        ${renderWorshipBackgroundStatus(selectedFileName)}
      </div>
      <section class="background-grid" aria-label="예배 배경">
        ${targets.map((target) => renderWorshipBackgroundTile(target, selectedFileName)).join("")}
      </section>
    </div>
  `;
  refreshIcons();
}

function renderWorshipBackgroundTile(target, selectedFileName) {
  const entry = state.worshipBackgroundRegistry[target.fileName];
  const isStatic = WORSHIP_BACKGROUND_STATIC_FILES.has(target.fileName);
  const source = entry?.dataUrl || (isStatic ? target.path : "");
  const active = target.fileName === selectedFileName ? " active" : "";
  const canDownload = Boolean(entry) || isStatic;
  return `
    <article class="background-tile${active}">
      <button class="background-preview-button" type="button" data-background-select="${escapeAttr(target.fileName)}" aria-label="${escapeAttr(target.fileName)}">
        ${source
          ? `<img src="${escapeAttr(source)}" alt="" loading="lazy" />`
          : `<span>${escapeHtml(target.fileName.replace(/\.(?:jpe?g|png)$/i, ""))}</span>`}
      </button>
      <div class="background-tile-main">
        <strong>${escapeHtml(target.fileName)}</strong>
        <small>${entry?.originalName ? escapeHtml(entry.originalName) : escapeHtml(worshipBackgroundPath(target.fileName))}</small>
        ${entry?.size ? `<em>${escapeHtml(formatFileSize(entry.size))}</em>` : ""}
      </div>
      <div class="background-tile-actions">
        ${renderWorshipBackgroundStatus(target.fileName)}
        <button class="icon-btn quiet" type="button" data-background-action="download" data-background-file="${escapeAttr(target.fileName)}" aria-label="${escapeAttr(target.fileName)} 다운로드" ${canDownload ? "" : "disabled"}>
          <i data-lucide="download"></i>
        </button>
        <button class="icon-btn quiet danger" type="button" data-background-action="clear" data-background-file="${escapeAttr(target.fileName)}" aria-label="${escapeAttr(target.fileName)} 비우기" ${entry ? "" : "disabled"}>
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </article>
  `;
}

function renderWorshipBackgroundStatus(fileName) {
  if (state.worshipBackgroundRegistry[fileName]) return `<span class="background-status registered">등록됨</span>`;
  if (WORSHIP_BACKGROUND_STATIC_FILES.has(fileName)) return `<span class="background-status static">기본</span>`;
  return `<span class="background-status missing">없음</span>`;
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
          <p class="empty-verse">로그인이 필요합니다</p>
          <span>관리자 계정으로 로그인해야 Mindex 데이터를 열 수 있습니다.</span>
          <label class="auth-field">
            <span>Email</span>
            <input type="email" data-auth-email value="${escapeAttr(email)}" autocomplete="email" placeholder="name@example.com" />
          </label>
          <button class="btn primary" type="submit" data-auth-action="sign-in" ${state.auth.loading ? "disabled" : ""}>
            <i data-lucide="${state.auth.loading ? "loader-2" : "mail"}"></i>
            <span>${state.auth.loading ? "보내는 중..." : "로그인 링크 보내기"}</span>
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
  const nextService = getHomeNextService();
  const calendarRows = getCalendarDisplayRows();
  const referencesSummary = referenceSummaryText();
  const serviceCountText = formatServiceCountLabel(state.services.length);
  return [
    {
      id: "service",
      title: "예배",
      actionTitle: "전체 예배",
      eyebrow: "다음 예배",
      icon: "layout-template",
      sidebarMeta: nextService ? cleanList([
        homeServiceScheduleLabel(nextService, { compact: true }),
        serviceDisplayTypeName(nextService),
      ]).join(" · ") : serviceCountText,
      detail: nextService ? homeServiceScheduleLabel(nextService) : serviceCountText,
      actionDetail: "목록/템플릿",
      compactMeta: null,
      meta: cleanList([
        nextService ? serviceDisplayTypeName(nextService) : "",
        nextService ? serviceItemPreview(nextService.id) : "",
      ]),
      actions: [
        { id: "presenter", label: "송출" },
      ],
    },
    {
      id: "presenter",
      title: "송출",
      actionTitle: "송출",
      eyebrow: "",
      icon: "screen-share",
      sidebarMeta: nextService ? serviceDisplayTypeName(nextService) : serviceCountText,
      detail: "송출",
      actionDetail: nextService ? serviceDisplayTypeName(nextService) : "송출 화면",
      compactMeta: nextService
        ? { value: serviceDisplayTypeName(nextService), label: "" }
        : { value: formatCount(state.services.length), label: "예배" },
      meta: cleanList([
        nextService ? homeServiceScheduleLabel(nextService, { compact: true }) : serviceCountText,
      ]),
    },
    {
      id: "praise",
      title: "찬양",
      eyebrow: "",
      icon: "music-2",
      sidebarMeta: `${formatCount(state.songs.length)}곡`,
      detail: "찬양 DB",
      actionDetail: "찬양 DB",
      compactMeta: { value: formatCount(state.songs.length), label: "곡" },
      meta: cleanList([
        `${formatCount(state.songs.length)}곡`,
      ]),
    },
    {
      id: "scripture",
      title: "말씀",
      eyebrow: "",
      icon: "book-open",
      sidebarMeta: `${formatCount(bibleBookCount)}권`,
      detail: `${formatCount(bibleBookCount)}권`,
      actionDetail: "성경/성구",
      compactMeta: { value: formatCount(translationCount), label: "역본" },
      meta: cleanList([
        translationCount ? `${formatCount(translationCount)}역본` : "",
      ]),
    },
    {
      id: "calendar",
      title: "교회력",
      eyebrow: "",
      icon: "calendar-days",
      sidebarMeta: calendarRows.length ? calendarYearLabel(calendarRows) : "교회력",
      detail: calendarRows.length ? calendarYearLabel(calendarRows) : "교회력",
      compactMeta: { value: churchYearSeriesValue(calendarRows), label: "" },
      meta: cleanList([
        churchYearSeriesSummary(calendarRows),
      ]),
    },
    {
      id: "references",
      title: "참고자료",
      eyebrow: "",
      icon: "link-2",
      sidebarMeta: referencesSummary || "참고자료",
      detail: "공유 참고자료",
      compactMeta: state.referenceLinksLoaded
        ? { value: formatCount(state.referenceLinks.length), label: "링크" }
        : { value: "링크", label: "" },
      meta: cleanList([
        referencesSummary,
      ]),
    },
  ];
}

function pluralizeCountLabel(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}

function formatServiceCountLabel(count) {
  return `${formatCount(count)}개 예배`;
}

function referenceSummaryText() {
  if (!state.referenceLinksLoaded) return "";
  return `${formatCount(state.referenceLinks.length)}개 링크`;
}

function renderHomePrimaryCard(module) {
  return `
    <article class="home-primary-card ${escapeAttr(module.id)}">
      <button class="home-primary-main" type="button" data-home-module="${escapeAttr(module.id)}">
        ${module.eyebrow ? `<span class="home-module-eyebrow">${escapeHtml(module.eyebrow)}</span>` : ""}
        <span class="home-module-title">
          <i data-lucide="${escapeAttr(module.icon)}"></i>
          ${escapeHtml(module.title)}
        </span>
        <span class="home-module-detail">${escapeHtml(module.detail)}</span>
        ${module.meta.length ? `<span class="home-module-meta">${module.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</span>` : ""}
      </button>
      ${module.actions?.length ? `<div class="home-primary-actions">
        ${module.actions.map((action) => `<button type="button" data-home-module="${escapeAttr(action.id)}">${escapeHtml(action.label)}</button>`).join("")}
      </div>` : ""}
    </article>
  `;
}

function renderHomeActionTile(module) {
  const title = module.actionTitle || module.title;
  const detail = module.actionDetail || module.detail;
  return `
    <button class="home-action-tile ${escapeAttr(module.id)}" type="button" data-home-module="${escapeAttr(module.id)}">
      <i data-lucide="${escapeAttr(module.icon)}"></i>
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(detail)}</small>
    </button>
  `;
}

function homeMetricText(metric = {}) {
  const value = String(metric.value || "").trim();
  const label = String(metric.label || "").trim();
  if (!value) return label;
  if (!label) return value;
  if (label === "곡") return `${value}곡`;
  if (label === "역본") return `${value}개 역본`;
  if (label === "링크") return `${value}개 링크`;
  if (label === "등록") return `${value}개 등록`;
  if (label === "예배") return `${value}개 예배`;
  return `${value} ${label}`;
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
    ? `${formatCount(books.length)}권 중 ${formatCount(filtered.length)}권`
    : `전체 ${formatCount(filtered.length)}권`;

  if (state.scriptureError) {
    refs.songList.innerHTML = isConnectionUnavailableMessage(state.scriptureError)
      ? renderConnectionList(state.connectionError || state.scriptureError)
      : renderListEmptyState("Scripture unavailable", state.scriptureError);
    return;
  }

  if (!filtered.length) {
    refs.songList.innerHTML = renderListEmptyState(
      "성경 권 없음",
      hasSearch && !reference
        ? "Enter를 누르면 본문 검색으로 전환합니다."
        : "성경 이름이나 장절을 검색해 보세요.",
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
  syncPraiseCreateControls();
}

function getListScrollKey() {
  const search = normalizeSearchValue(state.search);
  if (isGlobalSearchActive()) return `global:${search}`;
  if (state.module === "home") return `home:${search}`;
  if (state.module === "scripture") return `scripture:${state.scriptureFilter}:${search}`;
  if (state.module === "service") return `service:${state.serviceFilter}:${search}`;
  if (state.module === "presenter") return `presenter:${search}`;
  if (state.module === "calendar") return `calendar:${search}`;
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

  if (isGlobalSearchActive() && (state.module === "home" || state.module === "calendar")) {
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
  if (state.module === "presenter") {
    renderPresenterDetail();
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
    refs.detailPane.innerHTML = renderPraiseEmptyDetail();
    refreshIcons();
    return;
  }

  const titleMetaLine = songTitleMetaLine(song);
  const supportMetaItems = songSupportMetaItems(song);
  const relatedSongs = relatedSongsForSong(song);
  const canDeleteSong = canDeletePraiseSong(song);
  refs.detailPane.innerHTML = `
    <div class="editor-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml((song.hymn_no ? stripHymnNumber(song.title) : song.title) || "제목 없는 찬양")}</span>
            ${song.hymn_no ? `<span class="scripture-book-marker">${escapeHtml(song.hymn_no)}</span>` : ""}
          </h2>
          ${renderSongDescription(song, titleMetaLine, [], relatedSongs)}
        </div>
        <div class="editor-head-right">
          <div class="song-header-meta-row">
            ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
            <button class="icon-btn quiet metadata-edit-btn" type="button" data-open-metadata aria-label="곡 정보 수정" title="곡 정보 수정">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-btn quiet danger song-delete-btn" type="button" data-delete-song aria-label="${canDeleteSong ? "빈 곡 삭제" : "내용이 비어 있는 곡만 바로 삭제할 수 있습니다"}" title="${canDeleteSong ? "빈 곡 삭제" : "내용이 비어 있는 곡만 바로 삭제할 수 있습니다"}" ${canDeleteSong ? "" : "disabled"}>
              <i data-lucide="trash-2"></i>
              <span>삭제</span>
            </button>
          </div>
          <div class="head-actions">
            ${canCreatePraiseSong() ? `
              <button class="reference-new-btn praise-create-btn" type="button" data-create-song>
                <i data-lucide="plus"></i>
                <span>곡 추가</span>
              </button>
            ` : ""}
            <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>저장되지 않은 변경</span>
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

function renderPraiseEmptyDetail() {
  const verse = moduleUiVerse("praise");
  const content = verse?.text
    ? `
        <p class="empty-verse">${renderHomeVerseText(verse.text)}</p>
        ${verse.reference ? `<span>${escapeHtml(verse.reference)}</span>` : ""}
      `
    : `
        <h2>찬양</h2>
        <p>찬양을 선택하세요.</p>
      `;
  return `
    <div class="empty-detail">
      ${canCreatePraiseSong() ? `
        <div class="empty-detail-actions">
          <button class="reference-new-btn praise-empty-create-btn" type="button" data-create-song>
            <i data-lucide="plus"></i>
            <span>곡 추가</span>
          </button>
        </div>
      ` : ""}
      <div class="empty-detail-inner">
        ${content}
      </div>
    </div>
  `;
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
    refs.detailPane.innerHTML = renderUnavailableDetail("references", "링크", state.referenceError);
    refreshIcons();
    return;
  }

  const links = getReferenceLinks();
  const hasLinks = links.length && !state.referenceError;
  refs.detailPane.innerHTML = `
    <div class="editor-shell references-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2>링크</h2>
          <section class="song-description" aria-label="링크 설명">
            <p class="song-description-title">${escapeHtml(referenceDetailSummary())}</p>
          </section>
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${state.dirty.references ? "" : "hidden"}>저장되지 않은 변경</span>
          ${state.referenceGroupSupported ? `<button class="reference-new-btn secondary" type="button" data-reference-action="new-group" aria-label="새 그룹">
            <i data-lucide="folder-plus"></i>
            <span>새 그룹</span>
          </button>` : ""}
          <button class="reference-new-btn" type="button" data-reference-action="new" aria-label="새 링크">
            <i data-lucide="plus"></i>
            <span>새 링크</span>
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
  return `${formatCount(state.referenceLinks.length)}개 링크`;
}

function renderReferenceSetupNotice() {
  return `
    <div class="reference-setup-notice">
      <strong>링크 없음</strong>
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
      group = { key, title: groupName || "그룹 없음", links: [] };
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
                value="${escapeAttr(group.title === "그룹 없음" ? "" : group.title)}"
                placeholder="그룹 이름"
                aria-label="링크 그룹 이름"
              />
            ` : `<h3>${escapeHtml(group.title)}</h3>`}
            <span>${escapeHtml(formatCount(group.links.length))}</span>
            ${state.referenceGroupSupported ? `<div class="reference-group-actions" aria-label="링크 그룹 이동">
              <button class="icon-btn quiet" type="button"
                data-reference-action="move-group-up"
                data-reference-group-key="${escapeAttr(group.key)}"
                ${index <= 0 ? "disabled" : ""}
                aria-label="그룹 위로 이동">
                <i data-lucide="arrow-up"></i>
              </button>
              <button class="icon-btn quiet" type="button"
                data-reference-action="move-group-down"
                data-reference-group-key="${escapeAttr(group.key)}"
                ${index >= groups.length - 1 ? "disabled" : ""}
                aria-label="그룹 아래로 이동">
                <i data-lucide="arrow-down"></i>
              </button>
            </div>
            <button class="icon-btn quiet reference-group-edit" type="button"
              data-reference-action="${state.editingReferenceGroupKey === group.key ? "done-group" : "edit-group"}"
              data-reference-group-key="${escapeAttr(group.key)}"
              aria-label="${state.editingReferenceGroupKey === group.key ? "그룹 편집 완료" : "그룹 이름 변경"}">
              <i data-lucide="${state.editingReferenceGroupKey === group.key ? "check" : "pencil"}"></i>
              <span>${state.editingReferenceGroupKey === group.key ? "완료" : "이름 변경"}</span>
            </button>` : ""}
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
          <span>제목</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="title" value="${escapeAttr(link.title)}" placeholder="사이트 제목" />
        </label>
        <label>
          <span>URL</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="url" value="${escapeAttr(link.url)}" placeholder="https://..." inputmode="url" />
        </label>
        ${state.referenceGroupSupported ? `<label>
          <span>그룹</span>
          <input data-reference-id="${escapeAttr(link.id)}" data-reference-field="group_name" value="${escapeAttr(link.group_name)}" placeholder="그룹" />
        </label>` : ""}
      </div>
      <div class="reference-editor-actions">
        <div class="reference-editor-action-group">
          <div class="reference-move-actions" aria-label="링크 이동">
            <button class="icon-btn quiet" type="button" data-reference-action="move-up" data-reference-id="${escapeAttr(link.id)}" ${index <= 0 ? "disabled" : ""} aria-label="위로 이동">
              <i data-lucide="arrow-up"></i>
            </button>
            <button class="icon-btn quiet" type="button" data-reference-action="move-down" data-reference-id="${escapeAttr(link.id)}" ${index >= total - 1 ? "disabled" : ""} aria-label="아래로 이동">
              <i data-lucide="arrow-down"></i>
            </button>
          </div>
          <label class="reference-active-toggle">
            <input type="checkbox" data-reference-id="${escapeAttr(link.id)}" data-reference-field="is_active" ${link.is_active !== false ? "checked" : ""} />
            <span>표시</span>
          </label>
        </div>
        <div class="reference-editor-action-group">
          <button class="icon-btn quiet" type="button" data-reference-action="open" data-reference-id="${escapeAttr(link.id)}" aria-label="링크 열기">
            <i data-lucide="external-link"></i>
          </button>
          <button class="icon-btn quiet" type="button" data-reference-action="done" data-reference-id="${escapeAttr(link.id)}" aria-label="편집 완료">
            <i data-lucide="check"></i>
          </button>
          <button class="icon-btn danger" type="button" data-reference-action="delete" data-reference-id="${escapeAttr(link.id)}" aria-label="링크 삭제">
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
  const safeUrl = normalizeReferenceUrl(link.url);
  return `
    <article class="reference-card">
      <a class="reference-card-link${safeUrl ? "" : " disabled"}" href="${escapeAttr(safeUrl || "#")}" target="_blank" rel="noopener noreferrer" ${safeUrl ? "" : "aria-disabled=\"true\" tabindex=\"-1\""}>
        <span>
          <strong>${escapeHtml(link.title)}</strong>
          <em>${escapeHtml(shortUrl(link.url))}</em>
        </span>
      </a>
      <div class="reference-card-actions">
        <button class="icon-btn quiet" type="button" data-reference-action="move-up" data-reference-id="${escapeAttr(link.id)}" ${index <= 0 ? "disabled" : ""} aria-label="위로 이동">
          <i data-lucide="arrow-up"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="move-down" data-reference-id="${escapeAttr(link.id)}" ${index >= allLinks.length - 1 ? "disabled" : ""} aria-label="아래로 이동">
          <i data-lucide="arrow-down"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="edit" data-reference-id="${escapeAttr(link.id)}" aria-label="링크 편집">
          <i data-lucide="pencil"></i>
        </button>
        <button class="icon-btn quiet" type="button" data-reference-action="open" data-reference-id="${escapeAttr(link.id)}" aria-label="링크 열기">
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
    <section class="song-description song-description--song" aria-label="찬양 설명">
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
    <section class="song-description" aria-label="메타데이터">
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
      <section class="metadata-popover" role="dialog" aria-label="찬양 메타데이터">
        <header class="metadata-popover-head">
          <h3>메타데이터</h3>
          <button class="icon-btn" type="button" data-close-metadata aria-label="메타데이터 닫기">
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="metadata-popover-grid">
          ${renderInput("제목", "title", (song.hymn_no ? stripHymnNumber(song.title) : song.title) || "", "compact meta-title")}
          ${renderInput("부제", "subtitle", song.subtitle || "", "compact")}
          ${renderInput("원제", "original_title", song.original_title || "", "compact")}
          ${renderMetadataInput("아티스트", "artist", metadata.artist || "", "compact")}
          ${renderMetadataInput("작사", "lyricist", metadata.lyricist || "", "compact")}
          ${renderMetadataInput("작곡", "composer", metadata.composer || "", "compact")}
          ${renderMetadataInput("번역", "translator", metadata.translator || "", "compact")}
          ${renderMetadataInput("앨범", "album", metadata.album || "", "compact meta-album")}
          ${renderMetadataInput("트랙", "track", metadata.track || "", "compact meta-track")}
          ${renderMetadataInput("송폼", "presenter_form", serviceFormPresetSummary(metadata.presenter_form) || "", "compact")}
          ${renderInput("성구", "scripture", cleanList(song.scripture).join(LIST_INPUT_SEPARATOR), "compact meta-ref")}
        </div>
      </section>
    </div>
  `;
}

function renderScriptureMetadataDialog(scripture) {
  return `
    <div class="metadata-popover-layer">
      <section class="metadata-popover" role="dialog" aria-label="말씀 메타데이터">
        <header class="metadata-popover-head">
          <h3>메타데이터</h3>
          <button class="icon-btn" type="button" data-close-metadata aria-label="메타데이터 닫기">
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="metadata-popover-grid scripture-metadata-popover-grid">
          ${renderScriptureInput("제목", "title", scripture.title)}
          ${renderScriptureBookSelect(scripture)}
          ${renderScriptureInput("장절", "reference", scripture.reference)}
          ${renderScriptureInput("역본", "translation", scripture.translation)}
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
    <div class="related-song-links" aria-label="연결된 찬양">
      <span>연결됨</span>
      ${songs.map((song) => `
        <button class="related-song-link" type="button" data-open-song="${escapeAttr(song.id)}">
          <span>${escapeHtml(songListView(song).title || song.title || "제목 없음")}</span>
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
    refs.detailPane.innerHTML = renderUnavailableDetail("scripture", "말씀", state.scriptureError);
    refreshIcons();
    return;
  }

  if (isBibleTextSearchActive()) {
    refs.detailPane.innerHTML = renderBibleTextSearchDetail();
    refreshIcons();
    return;
  }

  if (!scripture && !selectedBook) {
    refs.detailPane.innerHTML = renderModuleEmptyDetail("scripture", "말씀", "성경 권을 선택하세요.");
    refreshIcons();
    return;
  }

  if (!scripture) {
    const titleMetaLine = selectedBook?.canonicalEnglishTitle || `전체 ${formatCount(getBibleBooks().length)}권`;
    const supportMetaItems = scriptureBookSupportMetaItems(selectedBook);
    refs.detailPane.innerHTML = `
      <div class="editor-shell scripture-editor scripture-taxonomy-editor">
        <header class="editor-head">
          <div class="editor-title">
          <h2>
            <span>${escapeHtml(selectedBook?.koreanName || "성경")}</span>
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
    metaAttribute("역본", scripture.translation),
    selectedBook?.koreanName && scripture.book !== selectedBook.koreanName ? metaAttribute("권", selectedBook.koreanName) : null,
    metaAttribute("구분", selectedBook?.division),
  ].filter(Boolean);
  refs.detailPane.innerHTML = `
    <div class="editor-shell scripture-editor">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml(scripture.title || "제목 없는 말씀")}</span>
          </h2>
          ${renderEditorMeta(titleMetaLine, [])}
        </div>
        <div class="editor-head-right">
          <div class="song-header-meta-row">
            ${renderSongHeaderMeta(supportMetaItems, { reserve: true })}
          </div>
          <div class="head-actions">
            <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>저장되지 않은 변경</span>
            <button class="btn secondary" type="button" data-copy-action="scripture">
              <i data-lucide="clipboard"></i>
              <span>본문</span>
            </button>
            <button class="btn secondary" type="button" data-copy-action="scripture-slides">
              <i data-lucide="copy"></i>
              <span>슬라이드</span>
            </button>
          </div>
        </div>
      </header>

      <section class="panel scripture-panel">
        ${renderScriptureTextarea("본문", "text", scripture.text)}
        <div class="scripture-foot">
          <span>${scriptureBlockCount(scripture)}개 단락</span>
        </div>
        ${renderScriptureTextarea("설명", "memo", scripture.memo || "", "scripture-memo")}
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
    if (form?.import_source === "coda-split-audit") reasons.add("Coda split check");
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
  const linkedEntries = linkedSongVersionEntries(song);
  return `
    <section class="panel">
      ${renderFormToolbar(song)}
      ${
        versions.length > 1 || linkedEntries.length
          ? renderVersionCompare(song, versions, linkedEntries)
          : renderSingleVersionForms()
      }
    </section>
  `;
}

function linkedSongVersionEntries(song) {
  return relatedSongsForSong(song).flatMap((linkedSong) =>
    (linkedSong.versions?.length ? linkedSong.versions : normalizeSongVersions(linkedSong, [])).map((version) => ({
      song: linkedSong,
      version,
      forms: normalizeForms((version.forms || []).map((form) => ({ ...form, song_id: version.id }))),
    })),
  );
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

function renderVersionCompare(song, versions, linkedEntries = []) {
  const versionForms = versions.map((version) => ({
    version,
    forms: getFormsForVersion(version),
  }));
  const columnCount = Math.max(1, versions.length + linkedEntries.length);
  const gridStyle = `grid-template-columns: repeat(${columnCount}, minmax(320px, 1fr));`;

  return `
    <div class="version-compare-grid">
      <div class="version-compare-head" style="${gridStyle}">
        ${versions.map((version) => renderVersionCompareHead(song, version)).join("")}
        ${linkedEntries.map(renderLinkedSongVersionHead).join("")}
      </div>
      <div class="version-compare-columns" style="${gridStyle}">
        ${versionForms.map(({ version, forms }) => renderVersionCompareColumn(version, forms)).join("")}
        ${linkedEntries.map(renderLinkedSongVersionColumn).join("")}
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

function renderLinkedSongVersionColumn(entry) {
  const content = entry.forms.length
    ? entry.forms.map((form) => `
        <div class="version-picker linked-version-picker" data-open-song="${escapeAttr(entry.song.id)}" role="button" tabindex="0">
          ${renderReadonlyFormBlock(form, { song: entry.song, version: entry.version })}
        </div>
      `).join("")
    : `<div class="version-empty-cell" aria-hidden="true"></div>`;
  return `<div class="version-compare-column linked-version-column">${content}</div>`;
}

function renderAddVersionButton(sourceVersionId) {
  return `
    <button class="version-add-btn" type="button" data-add-version data-source-version-id="${escapeAttr(sourceVersionId || "")}" aria-label="이 버전으로 새 버전 추가" title="이 버전으로 새 버전 추가">
      <i data-lucide="copy-plus"></i>
    </button>
  `;
}

function renderCopyVersionButton(version, forms) {
  const hasLyrics = getCopyableForms(forms).length > 0;
  return `
    <button class="version-copy-btn" type="button" data-copy-action="plain" data-version-id="${escapeAttr(version?.id || "")}" aria-label="이 버전 가사 복사" title="이 버전 가사 복사" ${hasLyrics ? "" : "disabled"}>
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

function renderLinkedSongVersionHead(entry) {
  return `
    <div class="version-compare-title linked-version-title" data-open-song="${escapeAttr(entry.song.id)}" role="button" tabindex="0">
      <div class="version-title-main">
        <span class="version-title-text">${escapeHtml(linkedSongVersionTitle(entry.song, entry.version))}</span>
        <span class="linked-version-badge">Linked</span>
      </div>
      <div class="version-title-actions">
        <span class="linked-version-open" aria-hidden="true"><i data-lucide="external-link"></i></span>
      </div>
    </div>
  `;
}

function linkedSongVersionTitle(song, version) {
  const title = songListView(song).title || song.title || "제목 없음";
  const versionName = versionDisplayName(song, version);
  if ((song.versions || []).length <= 1 || isDefaultVersionName(versionName)) return title;
  return `${title} · ${versionName}`;
}

function versionEditableName(song, version = {}) {
  if (!version) return "기본";
  if (version.name && !isDefaultVersionName(version.name)) return displayVersionName(version.name);
  if (version.curated_version_name && !isDefaultVersionName(version.curated_version_name)) return displayVersionName(version.curated_version_name);
  return versionDisplayName(song, version);
}

function renderVersionTitleContent(song, version, forms, options = {}) {
  const active = Boolean(options.active);
  const versionName = versionEditableName(song, version || {});
  return `
    <div class="version-title-main">
      <input class="version-title-input" type="text" data-version-name-field="${escapeAttr(version?.id || "")}" value="${escapeAttr(versionName)}" aria-label="버전 이름" />
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
  if (!groups.length) return `<div class="taxonomy-empty">검색 결과가 없습니다.</div>`;
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
    metaAttribute("역본", translation?.abbreviation || translation?.name),
    !state.bibleTextSearchLoading ? metaAttribute("결과", String(totalCount)) : null,
  ].filter(Boolean);
  return `
    <div class="editor-shell scripture-editor bible-search-editor">
      <header class="editor-head">
        <div class="editor-title">
          <h2>
            <span>검색 결과</span>
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
    return `<div class="bible-reader-note">"${escapeHtml(state.bibleTextSearchQuery)}" 검색 결과가 없습니다.${renderOtherTranslationOptions()}</div>`;
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
          <p class="bible-verse bible-search-result" data-bible-search-result="${index}" role="button" tabindex="0" aria-label="${escapeAttr(reference)} 열기">
            <span class="bible-search-reference">${escapeHtml(reference)}</span>
            <strong>${highlightBibleSearchText(verse.text || "", state.bibleTextSearchQuery)}</strong>
            <button class="bible-verse-copy" type="button" data-copy-bible-search-result="${index}" aria-label="${escapeAttr(reference)} 복사">
              <i data-lucide="copy"></i>
            </button>
          </p>
        `;
      }).join("")}
    </div>
  `;
}

function formatBibleSearchRange(firstResult, lastResult, totalCount) {
  if (!totalCount) return "0개 결과";
  return `${totalCount}개 중 ${firstResult}-${lastResult}`;
}

function renderBibleSearchPagination(totalCount) {
  const hasPrevious = state.bibleTextSearchPage > 0;
  const hasNext = (state.bibleTextSearchPage + 1) * BIBLE_TEXT_SEARCH_PAGE_SIZE < totalCount;
  if (!hasPrevious && !hasNext) return "";
  return `
    <span class="bible-search-pagination">
      <button class="icon-btn" type="button" data-bible-search-page="-1" aria-label="이전 결과" ${hasPrevious ? "" : "disabled"}>
        <i data-lucide="chevron-left"></i>
      </button>
      <button class="icon-btn" type="button" data-bible-search-page="1" aria-label="다음 결과" ${hasNext ? "" : "disabled"}>
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
    return `<div class="bible-reader-note">가져온 성경 역본이 없습니다.</div>`;
  }

  const chapters = getBibleChapterOptions();
  const verses = state.bibleBookVerses.filter((verse) => Number(verse.chapter) === state.selectedBibleChapter);
  const chapterIndex = chapters.indexOf(state.selectedBibleChapter);
  const hasPreviousChapter = chapterIndex > 0;
  const hasNextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1;
  return `
    <section class="bible-reader" aria-label="${escapeAttr(book.koreanName)} 본문">
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
      <span>역본</span>
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
      <span>장</span>
      <span class="bible-chapter-control">
        <button class="icon-btn" type="button" data-bible-reader-action="-1" aria-label="이전 장" ${hasPreviousChapter ? "" : "disabled"}>
          <i data-lucide="chevron-left"></i>
        </button>
        <select data-bible-reader-field="chapter" ${chapters.length ? "" : "disabled"}>
          ${chapters.length
            ? chapters.map((chapter) => `<option value="${chapter}" ${chapter === state.selectedBibleChapter ? "selected" : ""}>${chapter}</option>`).join("")
            : `<option value="1">1</option>`}
        </select>
        <button class="icon-btn" type="button" data-bible-reader-action="1" aria-label="다음 장" ${hasNextChapter ? "" : "disabled"}>
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
      <span>복사 형식</span>
      <select data-bible-reader-field="copy_format">
        <option value="with_reference" ${copyFormat === "with_reference" ? "selected" : ""}>장절 + 본문</option>
        <option value="text_only" ${copyFormat === "text_only" ? "selected" : ""}>본문만</option>
      </select>
    </label>
  `;
}

function renderBibleChapterCopyButton() {
  return `
    <button class="btn secondary bible-copy-chapter" type="button" data-copy-bible-chapter aria-label="이 장 복사">
      <i data-lucide="copy"></i>
      <span>장 복사</span>
    </button>
  `;
}

function renderBibleVerseSkeleton() {
  return `
    <div class="bible-verse-list bible-verse-list-loading" aria-busy="true" aria-label="본문 불러오는 중">
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
  if (!state.bibleBookVerses.length) return `<div class="bible-reader-note">이 권의 본문을 불러오지 못했습니다.${renderOtherTranslationOptions()}</div>`;
  if (!verses.length) return `<div class="bible-reader-note">이 장에 본문이 없습니다.${renderOtherTranslationOptions()}</div>`;
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
          <p class="bible-verse${selected ? " selected" : ""}" data-bible-verse="${escapeAttr(String(verse.verse))}" role="button" tabindex="0" aria-selected="${selected ? "true" : "false"}" aria-label="${escapeAttr(String(verse.verse))}절 선택">
            <span>${escapeHtml(String(verse.verse))}</span>
            <strong>${escapeHtml(verse.text || "")}</strong>
            <button class="bible-verse-copy" type="button" data-copy-bible-verse="${escapeAttr(String(verse.verse))}" aria-label="${escapeAttr(String(verse.verse))}절 복사">
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
          <select class="form-type-select" data-form-field="part_type" data-index="${index}" aria-label="가사 블록 형식">
            ${PART_TYPES.map(
              (type) =>
                `<option value="${type}" ${form.part_type === type ? "selected" : ""}>${escapeHtml(form.part_type === type ? label : type)}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="form-actions">
          <button class="icon-btn" type="button" data-form-action="up" data-index="${index}" aria-label="블록 위로 이동" ${index === 0 ? "disabled" : ""}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="down" data-index="${index}" aria-label="블록 아래로 이동" ${index === state.forms.length - 1 ? "disabled" : ""}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="icon-btn" type="button" data-form-action="copy" data-index="${index}" aria-label="블록 복사">
            <i data-lucide="copy"></i>
          </button>
          <button class="icon-btn danger" type="button" data-form-action="delete" data-index="${index}" aria-label="블록 삭제">
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
    part_type: normalizeFormPartType(form.part_type),
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

function normalizeFormPartType(value = "") {
  const raw = String(value || "").trim();
  return PART_TYPES.includes(raw) ? raw : "Verse";
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
  if (/\[(?:Verse|Chorus|Pre-Chorus|Bridge|Coda|Lyrics)(?:\s+\d+)?\]/i.test(lyrics)) return true;
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
  const heading = scriptureHeading(scripture) || scripture.title || "말씀";
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

function downloadDataUrlFile(dataUrl, fileName) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  showToast("File downloaded.");
}

function downloadUrlFile(url, fileName) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
    _worshipVersionPersisted: true,
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
    part_type: normalizeRelationalUnitPartType(partType),
    part_number: row.part_number || null,
    label: row.curated_unit_label || row.unit_label || null,
    lyrics: row.text || row.lyrics || "",
    sort_order: Number(row.curated_order || row.unit_order || index + 1),
    review_status: row.review_status === "pending" ? null : row.review_status || null,
    import_source: row.import_source || null,
  };
}

function normalizeRelationalUnitPartType(value = "") {
  const raw = String(value || "").trim();
  return PART_TYPES.includes(raw) ? raw : "Lyrics";
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
  return preferredNewHymnalVersion(song, versions)?.id
    || versions.find((version) => version.is_primary)?.id
    || versions[0]?.id
    || song.id;
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
  if (isRedundantSingleVersionName(song, version, version.name || version.curated_version_name)) return "기본";
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
  if (raw === canonicalTitle || raw === canonicalHymnNo) return "기본";
  return raw || "기본";
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
    metaAttribute("성구", cleanList(song?.scripture).join(" · ") || null),
    songArtistAlbumMetaItem(metadata),
    ...structuredCreditItems,
    metaAttribute("번역", metadata.translator),
  ].filter(Boolean);
}

function songArtistAlbumMetaItem(metadata) {
  const artist = String(metadata?.artist || "").trim();
  const album = formatAlbumMeta(metadata);
  if (artist && album) return metaAttribute("아티스트/앨범", `${artist} – ${album}`);
  if (artist) return metaAttribute("아티스트", artist);
  if (album) return metaAttribute("앨범", album);
  return null;
}

function songCreditMetaItems(metadata) {
  const lyricist = String(metadata?.lyricist || "").trim();
  const composer = String(metadata?.composer || "").trim();
  return [metaAttribute("작사", lyricist), metaAttribute("작곡", composer)].filter(Boolean);
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

  const restoredQuery = restoreKoreanKeyboardInput(query);
  const book = findBibleBookByReferenceName(query)
    || findBibleBookByName(query)
    || findBibleBookByReferenceName(restoredQuery)
    || findBibleBookByName(restoredQuery);
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
  return getBibleBookLookups().byReferenceName.get(value) || fallbackBibleBookByReferenceName(value);
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

function fallbackBibleBookByReferenceName(normalizedName = "") {
  const codes = Object.keys(KOREAN_BIBLE_BOOK_ABBREVIATIONS);
  for (const [index, code] of codes.entries()) {
    const names = [
      code,
      KOREAN_BIBLE_BOOK_ABBREVIATIONS[code],
      ENGLISH_BIBLE_BOOK_ABBREVIATIONS[code],
      ...(BIBLE_BOOK_ALIASES[code] || []),
    ];
    if (!names.some((name) => normalizeReferenceBookName(name) === normalizedName)) continue;
    const koreanName = KOREAN_BIBLE_BOOK_ABBREVIATIONS[code] || code;
    const englishName = ENGLISH_BIBLE_BOOK_ABBREVIATIONS[code] || code;
    return {
      code,
      koreanName,
      shortName: koreanName,
      englishName,
      canonicalEnglishTitle: englishName,
      chapterCount: Number(BIBLE_CHAPTER_COUNTS?.[code]) || 0,
      sortOrder: index + 1,
      aliases: BIBLE_BOOK_ALIASES[code] || [],
    };
  }
  return null;
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
  const candidates = uniqueList([
    normalizeReferenceInput(value),
    normalizeReferenceInput(restoreKoreanKeyboardInput(value)),
  ]);
  for (const text of candidates) {
    const reference = parseBibleReferenceFromNormalizedText(text);
    if (reference) return reference;
  }
  return null;
}

function parseBibleReferenceFromNormalizedText(text) {
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
    .replace(/[–—~]/g, "-")
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

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function restoreKoreanKeyboardInput(value) {
  const raw = String(value || "");
  if (!/[A-Za-z]/.test(raw)) return raw;
  const choseongKeys = {
    r: 0, R: 1, s: 2, e: 3, E: 4, f: 5, a: 6, q: 7, Q: 8, t: 9, T: 10,
    d: 11, w: 12, W: 13, c: 14, z: 15, x: 16, v: 17, g: 18,
  };
  const jungseongKeys = {
    k: 0, o: 1, i: 2, O: 3, j: 4, p: 5, u: 6, P: 7, h: 8, y: 12,
    n: 13, b: 17, m: 18, l: 20,
  };
  const jongseongKeys = {
    r: 1, R: 2, rt: 3, s: 4, sw: 5, sg: 6, e: 7, f: 8, fr: 9, fa: 10,
    fq: 11, ft: 12, fx: 13, fv: 14, fg: 15, a: 16, q: 17, qt: 18, t: 19,
    T: 20, d: 21, w: 22, c: 23, z: 24, x: 25, v: 26, g: 27,
  };
  const compoundVowels = {
    hk: 9, ho: 10, hl: 11, nj: 14, np: 15, nl: 16, ml: 19,
  };
  const compose = (cho, jung, jong = 0) =>
    String.fromCharCode(0xac00 + ((cho * 21) + jung) * 28 + jong);
  let output = "";
  for (let i = 0; i < raw.length;) {
    const char = raw[i];
    if (choseongKeys[char] === undefined || jungseongKeys[raw[i + 1]] === undefined) {
      output += char;
      i += 1;
      continue;
    }
    const cho = choseongKeys[char];
    let vowelKey = raw[i + 1];
    let consumed = 2;
    const compoundKey = raw.slice(i + 1, i + 3);
    if (compoundVowels[compoundKey] !== undefined) {
      vowelKey = compoundKey;
      consumed = 3;
    }
    const jung = compoundVowels[vowelKey] ?? jungseongKeys[vowelKey];
    let jong = 0;
    const nextTwo = raw.slice(i + consumed, i + consumed + 2);
    const nextOne = raw[i + consumed];
    const afterTwoStartsSyllable = choseongKeys[raw[i + consumed + 2]] !== undefined
      && jungseongKeys[raw[i + consumed + 3]] !== undefined;
    const afterOneStartsSyllable = choseongKeys[raw[i + consumed + 1]] !== undefined
      && jungseongKeys[raw[i + consumed + 2]] !== undefined;
    if (jongseongKeys[nextTwo] !== undefined && !afterTwoStartsSyllable) {
      jong = jongseongKeys[nextTwo];
      consumed += 2;
    } else if (jongseongKeys[nextOne] !== undefined && !afterOneStartsSyllable) {
      jong = jongseongKeys[nextOne];
      consumed += 1;
    }
    output += compose(cho, jung, jong);
    i += consumed;
  }
  return output;
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
  if (state.module === "home" || state.module === "calendar") {
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

  if (isServiceDataModule()) {
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
  if (title) title.textContent = song.title || "제목 없는 찬양";
}

function parseList(value) {
  if (Array.isArray(value)) return cleanList(value);
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanList(value) {
  return Array.isArray(value)
    ? value.filter((item) => item != null).map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function normalizeSongMetadata(value) {
  const source = value && typeof value === "object" ? value : {};
  const presenterFormSource = firstDefinedValue(
    source.presenter_form,
    source.presenterForm,
    source.presenterFormPreset,
    source.presenter_form_preset,
    source.songForm,
    source.song_form,
    source.defaultForm,
    source.default_form,
  );
  const presenterForm = presenterFormSource
    ? normalizeServiceFormPreset(presenterFormSource, "", "song-default")
    : null;
  const metadata = {
    artist: nullIfBlank(source.artist || source.performer),
    lyricist: nullIfBlank(source.lyricist),
    composer: nullIfBlank(source.composer),
    translator: nullIfBlank(source.translator),
    album: nullIfBlank(source.album),
    track: nullIfBlank(source.track),
    presenter_form: presenterForm,
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

function isUniqueConstraintError(error, constraintName = "") {
  const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  return String(error?.code || "") === "23505"
    && (!constraintName || message.includes(constraintName));
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

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatFileSize(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
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

// Public-worship templates begin from one reviewed quarterly baseline. Add a
// later entry only when a lasting rule changes; one-off service edits stay local.
const PUBLIC_WORSHIP_TEMPLATE_VERSION = "2026-q3";
const PUBLIC_WORSHIP_TEMPLATE_EFFECTIVE_FROM = "2026-07-01";

function publicWorshipTemplateVersion(build, version = PUBLIC_WORSHIP_TEMPLATE_VERSION, effectiveFrom = PUBLIC_WORSHIP_TEMPLATE_EFFECTIVE_FROM) {
  return {
    version,
    effectiveFrom,
    build,
  };
}

const PUBLIC_WORSHIP_CLOSING_IMAGE_ASSET = {
  kind: "image",
  name: "2026 표어 이미지",
  url: "assets/worship-templates/public-closing.png",
};

const PUBLIC_WORSHIP_TEMPLATE_VERSIONS = {
  "sunday-first": [
    publicWorshipTemplateVersion((options = {}) => {
        const pastorLeader = serviceHasPastorSermonLeader(options.service, options.items);
        return publicSundayFirstTemplate({ score: true, benediction: pastorLeader, lordsPrayer: !pastorLeader });
      }),
  ],
  "sunday-second": [
    publicWorshipTemplateVersion(() => publicSundaySecondTemplate({ score: true, specialScore: false })),
  ],
  "sunday-main": [
    publicWorshipTemplateVersion((options = {}) => publicSundayThirdTemplate({
      specialSong: sundayThirdSpecialSongTemplateForDate(options.service?.date || options.service?.service_date || ""),
    })),
    publicWorshipTemplateVersion(
      (options = {}) => publicSundayThirdTemplate({
        specialSong: sundayThirdSpecialSongTemplateForDate(options.service?.date || options.service?.service_date || ""),
      }),
      "2026-q3-07-26",
      "2026-07-26",
    ),
  ],
  "sunday-afternoon": [
    publicWorshipTemplateVersion((options = {}) => publicSundayAfternoonTemplate(options)),
  ],
  monthly: [
    publicWorshipTemplateVersion(() => publicMonthlyTemplate()),
  ],
  wednesday: [
    publicWorshipTemplateVersion((options = {}) => publicWednesdayTemplate(options)),
  ],
  friday: [
    publicWorshipTemplateVersion(() => publicFridayTemplate()),
  ],
};

function sundayThirdSpecialSongTemplateForDate(dateValue = "") {
  const targetDate = String(dateValue || "").slice(0, 10);
  if (targetDate < "2026-07-26") return null;
  return {
    defaultText: `주 은혜임을 / 할렐루야 찬양대

주 나의 모습 보네
상한 나의 맘 보시네

주 나의 눈물 아네
홀로 울던 맘 아시네

주 사랑 내게 있네
그 사랑이 날 채우네

주 은혜 내게 있네
그 은혜로 날 세우네

세상 소망 다 사라져 가도
주의 사랑은 끝이 없으니

살아가는 이 모든 순간이
주 은혜임을 나는 믿네

주 사랑 내게 있네
그 사랑이 날 채우네

주 은혜 내게 있네
그 은혜로 날 세우네

세상 소망 다 사라져 가도
주의 사랑은 끝이 없으니

살아가는 이 모든 순간이
주 은혜임을 나는 믿네

은혜임을 나는 믿네
나는 믿네`,
    defaultAssignee: "할렐루야 찬양대",
  };
}

function responseSectionTemplate() {
  return {
    label: "결단",
    name: "결단",
    required: false,
    flex: true,
    sectionKey: "response_song",
    elements: [
      { label: "결단찬양", name: "결단찬양", elementType: "praise" },
      { label: "결단기도", name: "결단기도", elementType: "title_person" },
    ],
  };
}

const PUBLIC_SPECIAL_HYMN_FORM_PRESET_RULE = {
  when: { songType: "hymn" },
  omitUnlisted: true,
  formPreset: {
    forms: [...PUBLIC_SPECIAL_HYMN_FORM_PRESET_FORMS],
    hint: PUBLIC_SPECIAL_HYMN_FORM_PRESET_HINT,
    strength: "default",
    omitUnlisted: true,
  },
};

const PUBLIC_LORDS_PRAYER_TEXT = `하늘에 계신 우리 아버지,
아버지의 이름을 거룩하게 하시며
아버지의 나라가 오게 하시며,
아버지의 뜻이 하늘에서와 같이 땅에서도 이루어지게 하소서.
오늘 우리에게 일용할 양식을 주시고,
우리가 우리에게 잘못한 사람을 용서하여 준 것같이,
우리 죄를 용서하여 주시고,
우리를 시험에 빠지지 않게 하시고, 악에서 구하소서.
나라와 권능과 영광이 영원히 아버지의 것입니다. 아멘.`;

const PUBLIC_APOSTLES_CREED_TEXT = `나는 전능하신 아버지 하나님, 천지의 창조주를 믿습니다.
나는 그의 유일하신 아들, 우리 주 예수 그리스도를 믿습니다.
그는 성령으로 잉태되어 동정녀 마리아에게서 나시고,
본디오 빌라도에게 고난을 받아 십자가에 못 박혀 죽으시고,
장사된 지 사흘 만에 죽은 자 가운데서 다시 살아나셨으며,
하늘에 오르시어 전능하신 아버지 하나님 우편에 앉아 계시다가,
거기로부터 살아 있는 자와 죽은 자를 심판하러 오십니다.
나는 성령을 믿으며, 거룩한 공교회와 성도의 교제와
죄를 용서받는 것과 몸의 부활과 영생을 믿습니다. 아멘.`;

const PUBLIC_COMMUNITY_CONFESSION_TEXT = `우리는 세상으로부터 부름 받은 하나님의 거룩한 백성입니다.
또한 세상으로 보냄 받은 그리스도의 제자입니다.
하나님을 기쁘게 찬양하는 성령 충만한 예배자가 되겠습니다.
진리를 배우고 수호하는 은혜에 빚진 훈련자가 되겠습니다.
땅 끝까지 복음을 전파하는 전도자가 되겠습니다.
이웃의 아픔을 함께하는 치유자가 되겠습니다.
온 성도가 하나 되는 화해자가 되겠습니다.
사회적 책임을 다하는 소명자가 되겠습니다.
그리하여 우리 모두 하나님을 영화롭게 하는
검단우리교회 공동체가 되겠습니다.`;

const PUBLIC_COMMUNITY_CONFESSION_HIGHLIGHTS = [
  { text: "하나님의 거룩한 백성", bold: true },
  { text: "그리스도의 제자", bold: true },
  { text: "성령 충만한", bold: true },
  { text: "은혜에 빚진", bold: true },
  { text: "예배자", color: "#FFC832", bold: true },
  { text: "훈련자", color: "#C8FF32", bold: true },
  { text: "전도자", color: "#FF96C8", bold: true },
  { text: "치유자", color: "#FF6432", bold: true },
  { text: "화해자", color: "#32C8FF", bold: true },
  { text: "소명자", color: "#9696FF", bold: true },
  { text: "검단우리교회 공동체", bold: true },
];

function publicWorshipImageClosingStep() {
  return publicWorshipClosingStep();
}

function legacyImageClosingStep() {
  return {
    label: "마무리",
    name: "마무리",
    required: true,
    flex: false,
    sectionKey: "closing_visual",
    elementType: "image",
    asset: PUBLIC_WORSHIP_CLOSING_IMAGE_ASSET,
  };
}

function publicWorshipClosingImageElement() {
  return {
    label: "마무리",
    name: "마무리",
    elementType: "image",
    asset: PUBLIC_WORSHIP_CLOSING_IMAGE_ASSET,
  };
}

function publicWorshipClosingHymnElement() {
  return {
    label: "폐회찬송",
    name: "폐회찬송",
    elementType: "praise",
    sectionKey: "closing_visual",
    default_text: "352 십자가 군병들아",
    defaultSong: { title: "십자가 군병들아", hymnNo: "352" },
    formHint: "V1A-간주-V1-V2-간주-V4-V1B",
    formPreset: { forms: ["V1A", "간주", "V1", "V2", "간주", "V4", "V1B"], strength: "default" },
    defaultStrength: "default",
  };
}

function publicWorshipClosingStep(elements = []) {
  return {
    label: "폐회",
    name: "폐회",
    required: true,
    flex: false,
    sectionKey: "closing_visual",
    elements: [
      ...elements,
      publicWorshipClosingImageElement(),
    ],
  };
}

function publicSundayThirdClosingStep() {
  return {
    label: "폐회",
    name: "폐회",
    required: true,
    flex: false,
    sectionKey: "closing_visual",
    elements: [
      publicWorshipClosingImageElement(),
      publicWorshipClosingHymnElement(),
    ],
  };
}

function publicWorshipReadyStep() {
  return {
    label: "준비",
    name: "준비",
    required: true,
    flex: false,
    sectionKey: "ready",
    elementType: "video",
  };
}

function scoreOutputMode(enabled = true) {
  return enabled ? { outputMode: "score" } : {};
}

function publicWorshipOfferingStep(options = {}) {
  const score = Boolean(options.score);
  const praiseLabel = options.praiseLabel || "봉헌찬송";
  return {
    label: "봉헌",
    name: "봉헌",
    required: true,
    flex: false,
    sectionKey: "offering",
    elements: [
      { label: praiseLabel, name: praiseLabel, elementType: "praise", ...scoreOutputMode(score) },
      { label: "봉헌기도", name: "봉헌기도", elementType: "title_person" },
    ],
  };
}

function publicWorshipSpecialSongStep(options = {}) {
  const score = Boolean(options.score);
  const defaultText = String(options.defaultText || "").trim();
  const defaultAssignee = String(options.defaultAssignee || "").trim();
  return {
    label: "특송",
    name: "특송",
    required: false,
    flex: true,
    sectionKey: "special_song",
    elementType: "praise",
    default_text: defaultText,
    assignee: defaultAssignee,
    formPresetRules: [PUBLIC_SPECIAL_HYMN_FORM_PRESET_RULE],
    ...scoreOutputMode(score),
  };
}

function publicWorshipCreedStep() {
  return {
    label: "신앙고백",
    name: "신앙고백",
    required: true,
    flex: false,
    sectionKey: "creed",
    elements: [
      { label: "사도신경", name: "사도신경", elementType: "body", default_text: PUBLIC_APOSTLES_CREED_TEXT, introSlide: { title: "신앙고백", body: "사도신경" } },
    ],
  };
}

function publicWorshipMainPraiseIntroElement(defaultTeamName = "") {
  const teamName = String(defaultTeamName || "").trim();
  return {
    label: "환영",
    name: "환영",
    elementType: "title_content",
    default_text: ["환영", teamName].filter(Boolean).join("\n"),
  };
}

function publicWorshipPraiseStep(options = {}) {
  const score = Boolean(options.score);
  const count = Number(options.count) || 1;
  const introTeamName = String(options.introTeamName || options.introAssignee || "").trim();
  const required = options.required !== undefined ? Boolean(options.required) : false;
  const extraElements = Array.isArray(options.extraElements) ? options.extraElements.filter(Boolean) : [];
  const elements = [
    ...(introTeamName ? [publicWorshipMainPraiseIntroElement(introTeamName)] : []),
    ...Array.from({ length: count }, (_, index) => ({
    label: `찬양 ${index + 1}`,
    name: `찬양 ${index + 1}`,
    elementType: "praise",
    ...scoreOutputMode(score),
    })),
    ...extraElements,
  ];
  return {
    label: "찬양",
    name: "찬양",
    required,
    flex: true,
    repeatable: true,
    sectionKey: "praise",
    elements,
  };
}

function publicWorshipConfessionStep() {
  return {
    label: "참회기도",
    name: "참회기도",
    required: false,
    flex: true,
    sectionKey: "confession",
    elementType: "title",
    default_text: "참회기도",
  };
}

function publicWorshipPrayerStep() {
  return {
    label: "대표기도",
    name: "대표기도",
    required: true,
    flex: false,
    sectionKey: "prayer",
    elements: [
      { label: "대표기도", name: "대표기도", elementType: "title_person" },
    ],
  };
}

function publicWorshipScriptureReadingStep() {
  return {
    label: "성경봉독",
    name: "성경봉독",
    required: true,
    flex: false,
    sectionKey: "scripture_reading",
    elements: [
      { label: "성경봉독", name: "성경봉독", elementType: "scripture_body" },
    ],
  };
}

function publicWorshipSermonStep(options = {}) {
  const defaultPerson = cleanServiceAssignee(
    options.defaultPerson || options.person || defaultServiceSermonLeader(options.typeId || options.type_id),
  );
  const includeSermonBody = options.includeSermonBody !== undefined
    ? Boolean(options.includeSermonBody)
    : true;
  const elements = [{ label: "설교 제목", name: "설교 제목", elementType: "title_person", person: defaultPerson }];
  if (includeSermonBody) {
    elements.push({ label: "설교 본문", name: "설교 본문", elementType: "scripture_body" });
  }
  elements.push({ label: "인용 구절", name: "인용 구절", elementType: "scripture_body" });
  return {
    label: "설교",
    name: "설교",
    required: true,
    flex: false,
    sectionKey: "sermon",
    elements,
  };
}

function publicWorshipThirdSermonStep(options = {}) {
  const defaultPerson = cleanServiceAssignee(
    options.defaultPerson || options.person || defaultServiceSermonLeader(options.typeId || options.type_id),
  );
  return {
    label: "설교",
    name: "설교",
    required: true,
    flex: false,
    sectionKey: "sermon",
    elements: [
      { label: "설교 제목", name: "설교 제목", elementType: "title_person", person: defaultPerson },
      { label: "설교 본문", name: "설교 본문", elementType: "scripture_body" },
      { label: "인용 구절", name: "인용 구절", elementType: "scripture_body" },
    ],
  };
}

function publicWorshipResponseStep() {
  return {
    label: "결단",
    name: "결단",
    required: false,
    flex: true,
    sectionKey: "response_song",
    elements: [
      { label: "결단기도", name: "결단기도", elementType: "title", default_text: "결단기도" },
    ],
  };
}

function youthWorshipTemplate() {
  return [
    publicWorshipReadyStep(),
    publicWorshipCreedStep(),
    publicWorshipPraiseStep({ count: 3, required: true }),
    publicWorshipPrayerStep(),
    {
      label: "봉헌",
      name: "봉헌",
      required: true,
      flex: false,
      sectionKey: "offering",
      elements: [
        {
          label: "봉헌찬양",
          name: "봉헌찬양",
          elementType: "praise",
          default_text: "대단한 믿음 없어도",
          defaultSong: { title: "대단한 믿음 없어도" },
          formHint: "V1-C",
          formPreset: { forms: ["V1", "C"], strength: "default" },
          defaultStrength: "default",
        },
        { label: "봉헌기도", name: "봉헌기도", elementType: "title_person" },
      ],
    },
    publicWorshipScriptureReadingStep(),
    publicWorshipSermonStep({ typeId: "youth" }),
    publicWorshipResponseStep(),
    publicWorshipLordsPrayerStep(),
    youthWorshipAnnouncementsStep(),
    {
      label: "교제",
      name: "교제",
      required: false,
      flex: true,
      sectionKey: "fellowship",
      elements: [{ label: "반별 모임", name: "반별 모임", elementType: "title", default_text: "반별 모임" }],
    },
  ];
}

function youngAdultWorshipTemplate() {
  return [
    publicWorshipReadyStep(),
    publicWorshipCreedStep(),
    publicWorshipPrayerStep(),
    publicWorshipPraiseStep({ count: 4, required: true }),
    publicWorshipScriptureReadingStep(),
    publicWorshipSermonStep({ typeId: "young-adult" }),
    responseSectionTemplate(),
    {
      label: "봉헌",
      name: "봉헌",
      required: true,
      flex: false,
      sectionKey: "offering",
      elements: [
        { label: "봉헌찬양", name: "봉헌찬양", elementType: "praise" },
        { label: "봉헌기도", name: "봉헌기도", elementType: "title", default_text: "봉헌기도" },
      ],
    },
    publicWorshipAnnouncementsStep(),
    publicWorshipSendingStep({
      doxology: false,
      extraElements: [{ label: "파송찬양", name: "파송찬양", elementType: "praise" }],
    }),
    {
      label: "교제",
      name: "교제",
      required: false,
      flex: true,
      sectionKey: "fellowship",
      elements: [{ label: "셀 모임", name: "셀 모임", elementType: "title", default_text: "셀 모임" }],
    },
  ];
}

function publicWorshipAnnouncementsStep() {
  return {
    label: "광고",
    name: "광고",
    required: true,
    flex: false,
    sectionKey: "announcements",
    elements: [{ label: "교회소식", name: "교회소식", elementType: "title", default_text: "교회소식" }],
  };
}

function youthWorshipAnnouncementsStep() {
  return {
    label: "광고",
    name: "광고",
    required: false,
    flex: true,
    sectionKey: "announcements",
    elements: [{ label: "청소년부 광고", name: "청소년부 광고", elementType: "body" }],
  };
}

function publicSundayThirdAnnouncementsStep() {
  return {
    ...publicWorshipAnnouncementsStep(),
    elements: [
      { label: "교회소식", name: "교회소식", elementType: "title" },
      { label: "새가족환영", name: "새가족환영", elementType: "title", hiddenInPresentation: true },
    ],
  };
}

function publicSundayThirdConfessionStep() {
  return {
    label: "참회기도",
    name: "참회기도",
    required: false,
    flex: true,
    sectionKey: "confession",
    elements: [
      { label: "참회기도", name: "참회기도", elementType: "title" },
      { label: "사죄의 선언", name: "사죄의 선언", elementType: "title", hiddenInPresentation: true },
    ],
  };
}

function publicWorshipDoxologyStep(options = {}) {
  return {
    ...publicWorshipDoxologyElement(options),
    required: true,
    flex: false,
    sectionKey: "doxology",
  };
}

function publicWorshipDoxologyElement(options = {}) {
  const defaultSong = options.defaultSong || (options.defaultText ? null : {
    title: "이 천지간 만물들아",
    hymnNo: "5",
  });
  return {
    label: "송영",
    name: "송영",
    elementType: "praise",
    default_text: options.defaultText || publicFixedDoxologyDisplayText(),
    ...(defaultSong ? { defaultSong } : {}),
    ...scoreOutputMode(options.score !== false),
  };
}

function publicWorshipBenedictionStep() {
  return { label: "축도", name: "축도", required: true, flex: false, sectionKey: "benediction", elementType: "title_person" };
}

function publicWorshipBenedictionElement(options = {}) {
  const defaultPerson = cleanServiceAssignee(
    options.defaultPerson
    || options.person
    || options.benedictionPerson
    || defaultServiceBenedictionLeader(options.typeId || options.type_id),
  );
  return {
    label: "축도",
    name: "축도",
    elementType: "title_person",
    person: defaultPerson,
  };
}

function publicWorshipLordsPrayerStep() {
  return {
    label: "주기도문",
    name: "주기도문",
    required: false,
    flex: true,
    sectionKey: "lords_prayer",
    elements: [
      { label: "주기도문", name: "주기도문", elementType: "body", default_text: PUBLIC_LORDS_PRAYER_TEXT, introSlide: { title: "주기도문" } },
    ],
  };
}

function publicWorshipLordsPrayerElement() {
  return {
    label: "주기도문",
    name: "주기도문",
    elementType: "body",
    default_text: PUBLIC_LORDS_PRAYER_TEXT,
    introSlide: { title: "주기도문" },
  };
}

function publicWorshipCommunityConfessionStep() {
  return {
    label: "공동체고백",
    name: "공동체고백",
    required: false,
    flex: true,
    sectionKey: "community_confession",
    elements: [
      {
        label: "공동체고백",
        name: "공동체고백",
        elementType: "body",
        default_text: PUBLIC_COMMUNITY_CONFESSION_TEXT,
        introSlide: { title: "공동체고백" },
        textHighlights: PUBLIC_COMMUNITY_CONFESSION_HIGHLIGHTS,
      },
    ],
  };
}

function publicWorshipSendingStep(options = {}) {
  const includeDoxology = options.doxology !== false;
  const includeBenediction = options.benediction !== false;
  const includeLordsPrayer = Boolean(options.lordsPrayer);
  const extraElements = Array.isArray(options.extraElements) ? options.extraElements.filter(Boolean) : [];
  const elements = [
    ...(includeDoxology ? [publicWorshipDoxologyElement(options)] : []),
    ...extraElements,
    ...(includeBenediction ? [publicWorshipBenedictionElement(options)] : []),
    ...(includeLordsPrayer ? [publicWorshipLordsPrayerElement()] : []),
  ];
  return {
    label: "파송",
    name: "파송",
    required: true,
    flex: false,
    sectionKey: "sending",
    elements,
  };
}

function publicSundayThirdEntrancePraiseElement() {
  return {
    label: "입례찬양",
    name: "입례찬양",
    elementType: "praise",
    default_text: "내 한 가지 소원",
    defaultSong: { title: "내 한 가지 소원" },
    formHint: "V-V-C-V-V-C",
    formPreset: { forms: ["V", "V", "C", "V", "V", "C"], strength: "default" },
    defaultStrength: "default",
  };
}

function publicSundayThirdSendingPraiseElement() {
  return {
    label: "파송찬송",
    name: "파송찬송",
    elementType: "praise",
    default_text: "359 천성을 향해 가는 성도들아",
    defaultSong: { title: "천성을 향해 가는 성도들아", hymnNo: "359" },
    formHint: "V1-V2-C-간주-V3-C-C",
    formPreset: { forms: ["V1", "V2", "C", "간주", "V3", "C", "C"], strength: "default" },
    defaultStrength: "default",
  };
}

function publicSundayFirstTemplate(options = {}) {
  const typeId = "sunday-first";
  const score = Boolean(options.score);
  const benediction = Boolean(options.benediction);
  const lordsPrayer = options.lordsPrayer !== undefined ? Boolean(options.lordsPrayer) : !benediction;
  return [
    publicWorshipReadyStep(),
    publicWorshipCreedStep(),
    publicWorshipPraiseStep({ score, count: 3 }),
    publicWorshipConfessionStep(),
    publicWorshipScriptureReadingStep(),
    publicWorshipSermonStep({ typeId }),
    publicWorshipResponseStep(),
    publicWorshipOfferingStep({ score }),
    publicWorshipAnnouncementsStep(),
    publicWorshipSendingStep({ score, benediction, lordsPrayer, typeId }),
    publicWorshipClosingStep(),
  ];
}

function publicSundaySecondTemplate(options = {}) {
  const typeId = "sunday-second";
  const score = Boolean(options.score);
  const specialScore = options.specialScore !== undefined ? Boolean(options.specialScore) : score;
  return [
    publicWorshipReadyStep(),
    publicWorshipCreedStep(),
    publicWorshipPraiseStep({ score, count: 3 }),
    publicWorshipConfessionStep(),
    publicWorshipPrayerStep(),
    publicWorshipScriptureReadingStep(),
    publicWorshipSpecialSongStep({ score: specialScore }),
    publicWorshipSermonStep({ typeId }),
    publicWorshipResponseStep(),
    publicWorshipOfferingStep({ score }),
    publicWorshipAnnouncementsStep(),
    publicWorshipSendingStep({ score, typeId }),
    publicWorshipClosingStep(),
  ];
}

function publicSundayThirdTemplate(options = {}) {
  const typeId = "sunday-main";
  const specialSong = options.specialSong || null;
  return [
    publicWorshipReadyStep(),
    publicWorshipPraiseStep({
      count: 4,
      introTeamName: "헤세드 찬양단",
      required: true,
      extraElements: [publicSundayThirdEntrancePraiseElement()],
    }),
    publicSundayThirdConfessionStep(),
    { label: "찬송", name: "찬송", required: false, flex: true, sectionKey: "hymn_praise", elementType: "praise", ...scoreOutputMode() },
    { label: "대표기도", name: "대표기도", required: true, flex: false, sectionKey: "prayer", elements: [
      { label: "대표기도", name: "대표기도", elementType: "title_person" },
    ] },
    publicWorshipScriptureReadingStep(),
    publicWorshipSpecialSongStep(specialSong ? {
      defaultText: String(specialSong.defaultText || "").trim(),
      defaultAssignee: String(specialSong.defaultAssignee || "").trim(),
    } : {}),
    publicWorshipThirdSermonStep({ typeId }),
    { label: "결단", name: "결단", required: false, flex: true, sectionKey: "response_song", elements: [
      { label: "결단기도", name: "결단기도", elementType: "title_person" },
    ] },
    publicWorshipCreedStep(),
    publicWorshipOfferingStep({ score: true, praiseLabel: "봉헌찬송" }),
    publicSundayThirdAnnouncementsStep(),
    publicWorshipCommunityConfessionStep(),
    publicWorshipSendingStep({ typeId, doxology: false, extraElements: [publicSundayThirdSendingPraiseElement()] }),
    publicSundayThirdClosingStep(),
  ];
}

function serviceIsDedicationWorship(service = null) {
  const tags = Array.isArray(service?.tags) ? service.tags : [];
  const sourceRef = service?._worshipSourceRef && typeof service._worshipSourceRef === "object" ? service._worshipSourceRef : {};
  const text = compactSearchValue([
    service?.title,
    service?.raw_text,
    ...tags,
  ].filter(Boolean).join(" "));
  return Boolean(sourceRef.dedication_service || text.includes("헌신예배"));
}

function publicSundayAfternoonTemplate(options = {}) {
  const typeId = "sunday-afternoon";
  return [
    publicWorshipReadyStep(),
    publicWorshipPraiseStep({ count: 4, required: true }),
    { label: "묵도", name: "묵도", required: true, flex: false, sectionKey: "silent_prayer", elementType: "title", default_text: "묵도" },
    { label: "찬송", name: "찬송", required: true, flex: false, sectionKey: "hymn_praise", elementType: "praise", ...scoreOutputMode() },
    publicWorshipPrayerStep(),
    publicWorshipScriptureReadingStep(),
    publicWorshipSpecialSongStep({ score: false }),
    publicWorshipSermonStep({ typeId }),
    publicWorshipResponseStep(),
    publicWorshipOfferingStep({ score: true, praiseLabel: "봉헌찬송" }),
    publicWorshipAnnouncementsStep(),
    publicWorshipSendingStep({
      score: true,
      defaultText: "1 만복의 근원 하나님",
      defaultSong: { title: "만복의 근원 하나님", hymnNo: "1" },
      typeId,
    }),
    publicWorshipClosingStep(),
  ];
}

function publicMonthlyCorporatePrayerStep() {
  const topics = [
    "교회 부흥을 위해",
    "선교와 민족을 위해",
    "치유와 회복을 위해",
    "교회학교를 위해",
  ];
  const prayerElements = topics.map((topic, index) => ({
    label: `공동기도 ${index + 1}`,
    name: `공동기도 ${index + 1}`,
    elementType: "title_person",
    default_text: `'${topic}'`,
  }));
  prayerElements.splice(2, 0, {
    label: "기도 찬양",
    name: "기도 찬양",
    elementType: "praise",
  });
  return {
    label: "공동기도",
    name: "공동기도",
    required: true,
    flex: true,
    sectionKey: "corporate_prayer",
    elements: prayerElements,
  };
}

function publicMonthlyOfferingStep() {
  return {
    label: "봉헌",
    name: "봉헌",
    required: true,
    flex: false,
    sectionKey: "offering",
    elements: [
      {
        label: "봉헌찬양",
        name: "봉헌찬양",
        elementType: "praise",
        defaultSong: { title: "이런 교회 되게 하소서" },
        formHint: "V-C",
        formPreset: { forms: ["V", "C"], strength: "suggested" },
        defaultStrength: "suggested",
      },
      { label: "봉헌기도", name: "봉헌기도", elementType: "title_person", person: defaultServiceSermonLeader("monthly") },
    ],
  };
}

function publicMonthlySendingStep() {
  return publicWorshipSendingStep({
    typeId: "monthly",
    doxology: false,
    extraElements: [{
      label: "파송찬송",
      name: "파송찬송",
      elementType: "praise",
      defaultSong: { title: "여기에 모인 우리", hymnNo: "620" },
      formHint: "V1-C-C",
      formPreset: { forms: ["V1", "C", "C"], strength: "default" },
      defaultStrength: "default",
    }],
  });
}

function publicMonthlyTemplate() {
  return [
    publicWorshipReadyStep(),
    publicWorshipPraiseStep({ count: 5, introTeamName: "썸프레이즈", required: true }),
    publicWorshipPrayerStep(),
    publicWorshipScriptureReadingStep(),
    publicWorshipSpecialSongStep(),
    publicWorshipSermonStep({ typeId: "monthly" }),
    {
      label: "결단",
      name: "결단",
      required: true,
      flex: true,
      sectionKey: "response_song",
      elements: [
        { label: "결단찬양", name: "결단찬양", elementType: "praise" },
        { label: "결단기도", name: "결단기도", elementType: "title_person" },
      ],
    },
    publicMonthlyCorporatePrayerStep(),
    publicMonthlyOfferingStep(),
    publicWorshipAnnouncementsStep(),
    publicMonthlySendingStep(),
    publicWorshipClosingStep(),
  ];
}

function publicWednesdayTemplate(options = {}) {
  const hasExistingBenediction = (Array.isArray(options.items) ? options.items : []).some((item) => {
    const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
    return sectionKey === "benediction" || compactSearchValue(item?.label || "") === "축도";
  });
  const pastorLeader = hasExistingBenediction || serviceHasPastorSermonLeader(options.service, options.items);
  const benedictionPerson = serviceSermonLeaderLabel(options.service, options.items);
  return [
    publicWorshipReadyStep(),
    publicWorshipPraiseStep({ count: 4, required: true }),
    publicWorshipPrayerStep(),
    publicWorshipAnnouncementsStep(),
    publicWorshipScriptureReadingStep(),
    publicWorshipSermonStep({ typeId: "wednesday" }),
    responseSectionTemplate(),
    publicWorshipSendingStep({
      doxology: false,
      benediction: pastorLeader,
      benedictionPerson,
      lordsPrayer: !pastorLeader,
      typeId: "wednesday",
    }),
    publicWorshipClosingStep(),
  ];
}

function publicFridayTemplate() {
  return [
    publicWorshipPraiseStep({
      count: 5,
      required: true,
    }),
    publicWorshipPrayerStep(),
    publicWorshipSpecialSongStep(),
    publicWorshipAnnouncementsStep(),
    publicWorshipScriptureReadingStep(),
    {
      label: "입례찬양",
      name: "입례찬양",
      required: true,
      flex: false,
      sectionKey: "entrance_praise",
      elements: [
        { label: "입례찬양", name: "입례찬양", elementType: "praise" },
      ],
    },
    publicWorshipSermonStep({ typeId: "friday" }),
    responseSectionTemplate(),
    {
      label: "기도회",
      name: "기도회",
      required: false,
      flex: true,
      sectionKey: "prayer_meeting_praise",
      elements: [
        { label: "기도 찬양 1", name: "기도 찬양 1", elementType: "praise" },
        { label: "기도 찬양 2", name: "기도 찬양 2", elementType: "praise" },
        { label: "자율기도", name: "자율기도", elementType: "title", default_text: "자율기도" },
      ],
    },
  ];
}

const SERVICE_ORDER_TEMPLATE_FALLBACKS = {
  "sunday-first": publicSundayFirstTemplate({ score: true }),
  "sunday-second": publicSundaySecondTemplate({ score: true, specialScore: false }),
  "sunday-main": publicSundayThirdTemplate(),
  "sunday-afternoon": publicSundayAfternoonTemplate(),
  wednesday: publicWednesdayTemplate(),
  friday: publicFridayTemplate(),
  monthly: publicMonthlyTemplate(),
  "holy-week-dawn": ["찬양", "기도", "성경봉독", "설교", "기도"],
  omer: ["찬양", "기도", "특송", "결단"],
  special: [],
  children: ["사도신경", "찬양", "예배의 부름", "성경봉독", "설교", "결단기도", "봉헌", "봉헌찬양", "봉헌기도", "나래파송", "주기도문", "광고", "교제"],
  youth: youthWorshipTemplate(),
  "young-adult": youngAdultWorshipTemplate(),
};

const SERVICE_ORDER_TEMPLATE_OPTIONS = {
  friday: { appendClosing: false },
  children: { appendClosing: false },
  youth: { appendClosing: false },
  "young-adult": { appendClosing: false },
};

function normalizeServiceItem(item = {}, index = 0) {
  const label = item.label || "";
  const normalized = {
    id: item.id || createLocalId(),
    service_id: item.service_id || state.selectedServiceId || null,
    sort_order: Number(item.sort_order) || index + 1,
    label,
    assignee: item.assignee || "",
    raw_title: normalizeServiceItemRawTitle(label, item.raw_title || ""),
    song_id: item.song_id || null,
    version_id: item.version_id || item.song_version_id || null,
    memo: item.memo || "",
    _worshipSectionId: item._worshipSectionId || "",
    _worshipSectionKey: item._worshipSectionKey || "",
    _worshipSectionTitle: item._worshipSectionTitle || "",
    _worshipSectionOrder: Number(item._worshipSectionOrder) || 0,
    _worshipElementOrder: Number(item._worshipElementOrder) || 0,
    _worshipSectionTemplateModified: Boolean(item._worshipSectionTemplateModified),
    _worshipElementTemplateModified: Boolean(item._worshipElementTemplateModified),
    _worshipTemplateProjected: Boolean(item._worshipTemplateProjected),
    _worshipTemplatePlaceholder: Boolean(item._worshipTemplatePlaceholder),
    _worshipSharedContentDirty: Boolean(item._worshipSharedContentDirty),
  };
  return applyServicePreparationDefaults(normalized, normalized.service_id);
}

function normalizeServiceDefaultItem(item = {}, index = 0) {
  const label = item.label || "";
  return {
    id: item.id || createLocalId(),
    sort_order: Number(item.sort_order) || index + 1,
    label,
    assignee: item.assignee || "",
    raw_title: normalizeServiceItemRawTitle(label, item.raw_title || item.title || item.default_text || ""),
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

function normalizeGroupedServiceItemsForTemplateHierarchy(grouped = {}) {
  return Object.fromEntries(Object.entries(grouped).map(([serviceId, items]) => {
    const service = state.services.find((svc) => svc.id === serviceId);
    return [serviceId, normalizeServiceItemsForTemplateHierarchy(service, items)];
  }));
}

function projectGroupedWorshipItemsFromTemplates(grouped = {}) {
  const serviceIds = new Set([
    ...state.services.map((service) => service.id).filter(Boolean),
    ...Object.keys(grouped),
  ]);
  return Object.fromEntries([...serviceIds].map((serviceId) => {
    const service = state.services.find((svc) => svc.id === serviceId);
    return [serviceId, projectWorshipServiceItemsFromTemplate(service, grouped[serviceId] || [])];
  }));
}

function projectWorshipServiceItemsFromTemplate(service, items = []) {
  const appTypeId = worshipAppServiceTypeId(service?.type_id);
  if (!TEMPLATE_PROJECTED_SERVICE_TYPES.has(appTypeId)) {
    return normalizeServiceItemsForTemplateHierarchy(service, items);
  }

  // Migrate legacy section ownership before hierarchy normalization. Otherwise
  // normalization recognizes the entrance-praise label but preserves its old
  // main-praise section ID, making the error impossible to repair on save.
  const existing = collapseLegacyPresenterCitationItems(
    collapseLegacyScriptureReadingItems(
      normalizeServiceItemsForTemplateHierarchy(
        service,
        migrateLegacyFridayTemplateItems(service, items),
        { preserveSourceIndex: true },
      ),
    ),
  );
  const suppressedTemplateKeys = new Set(existing
    .filter(isTemplateSuppressedServiceItem)
    .map((item) => serviceItemTemplateProjectionKey(item, { includeLabel: true })));
  const visibleExisting = existing.filter((item) => !isTemplateSuppressedServiceItem(item));
  const scaffold = buildWorshipServiceScaffold(service?.id || "__service__", appTypeId, { service, items: existing });
  const scaffoldItems = normalizeServiceItemsForTemplateHierarchy(
    service,
    groupWorshipElements(scaffold.sections, scaffold.elements)[service?.id || "__service__"] || [],
    { referenceItems: existing },
  ).filter((item) => !suppressedTemplateKeys.has(serviceItemTemplateProjectionKey(item, { includeLabel: true })));
  const templateSectionCounts = countTemplateProjectionSections(scaffoldItems);

  const unmatched = new Set(visibleExisting.map((_, index) => index));
  let projected = scaffoldItems.map((templateItem) => {
    const matchIndex = findTemplateProjectionMatchIndex(templateItem, visibleExisting, unmatched, templateSectionCounts);
    if (matchIndex < 0) return {
      ...templateItem,
      _worshipTemplateProjected: true,
      _worshipTemplatePlaceholder: !(templateItem.song_id && templateItem.version_id),
    };
    unmatched.delete(matchIndex);
    // matchIndex is an index into visibleExisting. Using the unfiltered array
    // here shifts every later item whenever an earlier template item is hidden.
    return mergeTemplateProjectionItem(templateItem, visibleExisting[matchIndex]);
  });

  for (const index of unmatched) {
    const item = visibleExisting[index];
    if (shouldDropUnmodifiedTemplateProjectionExtra(item)) continue;
    projected.push(item);
  }
  projected = normalizeSendingConclusionProjectionItems(projected);

  return normalizeServiceItemsForTemplateHierarchy(service, projected);
}

function migrateLegacyFridayTemplateItems(service = null, items = []) {
  if (worshipAppServiceTypeId(service?.type_id || "") !== "friday") return items;
  return items.map((item) => {
    const sectionKey = String(item?._worshipSectionKey || "").trim();
    const entrancePraiseText = compactSearchValue([
      item?.label,
      item?.raw_title,
      item?._worshipSectionTitle,
    ].filter(Boolean).join(" "));
    // Older Friday records placed entrance praise under several section keys.
    // Its explicit label is authoritative: always project it as its own section.
    const isLegacyEntrancePraise = sectionKey !== "entrance_praise"
      && /(성경봉독전찬양|입례찬양)/.test(entrancePraiseText);
    const isLegacyPrayerMeeting = sectionKey === "prayer_meeting_praise"
      && compactSearchValue(item?._worshipSectionTitle || "") === "기도찬양";
    const isLegacyFreePrayer = sectionKey === "free_prayer"
      && compactSearchValue(item?.label || "") === "자율기도";
    return {
      ...item,
      ...(isLegacyEntrancePraise ? {
        label: "입례찬양",
        _worshipSectionId: "",
        _worshipSectionKey: "entrance_praise",
        _worshipSectionTitle: "입례찬양",
        _worshipElementOrder: 1,
      } : {}),
      ...(isLegacyPrayerMeeting ? { _worshipSectionTitle: "기도회" } : {}),
      ...(isLegacyFreePrayer ? {
        _worshipSectionKey: "prayer_meeting_praise",
        _worshipSectionTitle: "기도회",
        _worshipElementOrder: 3,
      } : {}),
    };
  });
}

function normalizeSendingConclusionProjectionItems(items = []) {
  const withoutDuplicateBenedictions = collapseDuplicateBenedictionProjectionItems(items);
  return collapseBenedictionLordsPrayerProjectionItems(withoutDuplicateBenedictions);
}

function collapseDuplicateBenedictionProjectionItems(items = []) {
  const benedictionIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
      return templateProjectionSectionKey(item) === "sending" && labelKey === "축도";
    });
  if (benedictionIndexes.length <= 1) return items;

  const keep = benedictionIndexes
    .slice()
    .sort((a, b) => {
      const explicitDiff = serviceItemProjectionSpecificity(b.item) - serviceItemProjectionSpecificity(a.item);
      if (explicitDiff) return explicitDiff;
      return a.index - b.index;
    })[0];

  return items.filter((_, index) => index === keep.index || !benedictionIndexes.some((entry) => entry.index === index));
}

function collapseBenedictionLordsPrayerProjectionItems(items = []) {
  const hasBenediction = items.some((item) => {
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    return templateProjectionSectionKey(item) === "sending" && labelKey === "축도";
  });
  if (!hasBenediction) return items;
  return items.filter((item) => {
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    return !(templateProjectionSectionKey(item) === "sending" && labelKey === "주기도문");
  });
}

function serviceItemProjectionSpecificity(item = {}) {
  const parsed = parseServiceItemMemo(item.memo);
  const labelKey = compactSearchValue(item.label || "");
  const rawTitle = String(item.raw_title || "").trim();
  const hasNonGenericTitle = rawTitle && compactSearchValue(rawTitle) !== labelKey;
  return [
    item._worshipElementTemplateModified,
    item._worshipSectionTemplateModified,
    cleanServiceAssignee(item.assignee),
    hasNonGenericTitle,
    item.song_id,
    parsed.note,
    parsed.slides?.length,
    !item._worshipTemplatePlaceholder,
  ].filter(Boolean).length;
}

function isTemplateSuppressedServiceItem(item = {}) {
  const config = parseServiceItemMemo(item.memo);
  return Boolean(config.templateSuppressed);
}

function collapseLegacyScriptureReadingItems(items = []) {
  const groups = new Map();
  items.forEach((item, index) => {
    const sectionKey = String(item._worshipSectionId || item._worshipSectionKey || "").trim();
    if (!sectionKey || templateProjectionSectionKey(item) !== "scripture_reading") return;
    if (!groups.has(sectionKey)) groups.set(sectionKey, { bodies: [], reading: null, readingIndex: -1 });
    const group = groups.get(sectionKey);
    if (isScriptureBodyServiceItem(item)) {
      group.bodies.push({ item, index });
    } else if (normalizeWorshipElementType(serviceMemoElementType(parseServiceItemMemo(item.memo))) === "scripture_reading") {
      group.reading = item;
      group.readingIndex = index;
    }
  });

  const replacements = new Map();
  const removed = new Set();
  groups.forEach((group) => {
    const body = group.bodies[0];
    if (!body || (group.bodies.length < 2 && !group.reading)) return;
    const sourceItems = [
      ...group.bodies,
      ...(group.reading ? [{ item: group.reading, index: group.readingIndex }] : []),
    ];
    const firstIndex = Math.min(...sourceItems.map((source) => source.index));
    const assignee = sourceItems
      .map((source) => cleanServiceAssignee(source.item.assignee))
      .find(Boolean) || "";
    replacements.set(firstIndex, {
      ...body.item,
      label: "성경봉독",
      assignee,
      raw_title: sourceItems
        .map((source) => String(source.item.raw_title || "").trim())
        .find(Boolean) || "",
      _worshipElementOrder: Math.min(
        ...sourceItems.map((source) => Number(source.item._worshipElementOrder) || Number.MAX_SAFE_INTEGER),
      ),
    });
    sourceItems.forEach((source) => removed.add(source.index));
  });

  return items.flatMap((item, index) => {
    if (replacements.has(index)) return [replacements.get(index)];
    if (removed.has(index)) return [];
    return [item];
  });
}

function collapseLegacyPresenterCitationItems(items = []) {
  const groups = new Map();
  items.forEach((item, index) => {
    if (!/^인용구절\d*$/.test(compactSearchValue(item.label || ""))) return;
    const sectionKey = String(item._worshipSectionId || item._worshipSectionKey || "").trim();
    if (!sectionKey) return;
    const group = groups.get(sectionKey) || [];
    group.push({ item, index });
    groups.set(sectionKey, group);
  });

  const replacements = new Map();
  const removed = new Set();
  groups.forEach((group) => {
    const references = uniqueList(group.flatMap(({ item }) => serviceItemScriptureReferences(item)));
    const first = group[0];
    if (!first) return;
    const parsed = parseServiceItemMemo(first.item.memo);
    parsed.elementType = "scripture_body";
    parsed.componentType = "scripture_body";
    parsed.inputMode = "scripture";
    parsed.scriptureReference = references[0] || "";
    parsed.scriptureReferences = references;
    parsed.slides = [];
    replacements.set(first.index, {
      ...first.item,
      label: "인용 구절",
      raw_title: formatServiceScriptureReferenceList(references),
      memo: serializeServiceItemMemo(parsed),
    });
    group.slice(1).forEach(({ index }) => removed.add(index));
  });

  return items.flatMap((item, index) => {
    if (replacements.has(index)) return [replacements.get(index)];
    if (removed.has(index)) return [];
    return [item];
  });
}

function findTemplateProjectionMatchIndex(templateItem = {}, existingItems = [], unmatched = new Set(), templateSectionCounts = new Map()) {
  const exactKey = serviceItemTemplateProjectionKey(templateItem, { includeLabel: true });
  const sectionOrderKey = serviceItemTemplateProjectionKey(templateItem, { includeElementOrder: true });
  const sectionOnlyKey = serviceItemTemplateProjectionKey(templateItem, { sectionOnly: true });
  const templateSectionCount = templateSectionCounts.get(sectionOnlyKey) || 0;
  const candidates = [...unmatched].map((index) => ({ index, item: existingItems[index] }));

  const exact = candidates.find(({ item }) => serviceItemTemplateProjectionKey(item, { includeLabel: true }) === exactKey);
  if (exact) return exact.index;

  const ordered = candidates.find(({ item }) =>
    templateSectionCount <= 1
    && serviceItemTemplateProjectionKey(item, { includeElementOrder: true }) === sectionOrderKey);
  if (ordered) return ordered.index;

  const sectionCandidates = candidates.filter(({ item }) =>
    serviceItemTemplateProjectionKey(item, { sectionOnly: true }) === sectionOnlyKey);
  if (sectionCandidates.length === 1 && templateSectionCount === 1) {
    return sectionCandidates[0].index;
  }

  return -1;
}

function countTemplateProjectionSections(items = []) {
  const counts = new Map();
  items.forEach((item) => {
    const key = serviceItemTemplateProjectionKey(item, { sectionOnly: true });
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function serviceItemTemplateProjectionKey(item = {}, options = {}) {
  const sectionKey = templateProjectionSectionKey(item);
  if (options.sectionOnly) return sectionKey;
  if (options.includeElementOrder) return `${sectionKey}:${Number(item._worshipElementOrder) || 0}`;
  const labelKey = compactSearchValue(item.label || "");
  return `${sectionKey}:${labelKey}`;
}

function templateProjectionSectionKey(item = {}) {
  const sectionKey = String(item._worshipSectionKey || item.sectionKey || item.section_key || "").trim();
  return PUBLIC_TEMPLATE_SECTION_KEY_ALIASES[sectionKey] || sectionKey;
}

function mergeTemplateProjectionItem(templateItem = {}, existingItem = {}) {
  const sectionModified = Boolean(existingItem._worshipSectionTemplateModified);
  const elementModified = Boolean(existingItem._worshipElementTemplateModified);
  const merged = {
    ...templateItem,
    id: existingItem.id || templateItem.id,
    service_id: existingItem.service_id || templateItem.service_id,
    song_id: existingItem.song_id || templateItem.song_id || null,
    version_id: existingItem.version_id || existingItem.song_version_id || templateItem.version_id || null,
    assignee: cleanServiceAssignee(existingItem.assignee) || templateItem.assignee || "",
    raw_title: templateProjectionRawTitle(templateItem, existingItem, elementModified),
    memo: elementModified
      ? existingItem.memo
      : mergeTemplateProjectionMemo(templateItem.memo, existingItem.memo),
    _serviceItemIndex: existingItem._serviceItemIndex,
    _worshipTemplateProjected: true,
    _worshipTemplatePlaceholder: false,
    _worshipSectionId: existingItem._worshipSectionId || templateItem._worshipSectionId,
    _worshipSectionTemplateModified: sectionModified,
    _worshipElementTemplateModified: elementModified,
    _worshipSharedContentDirty: Boolean(existingItem._worshipSharedContentDirty || templateItem._worshipSharedContentDirty),
  };
  if (sectionModified) {
    merged._worshipSectionKey = existingItem._worshipSectionKey || templateItem._worshipSectionKey;
    merged._worshipSectionTitle = existingItem._worshipSectionTitle || templateItem._worshipSectionTitle;
    merged._worshipSectionOrder = existingItem._worshipSectionOrder || templateItem._worshipSectionOrder;
  }
  if (elementModified) {
    merged.label = existingItem.label || templateItem.label;
    merged._worshipElementOrder = existingItem._worshipElementOrder || templateItem._worshipElementOrder;
  }
  return merged;
}

function templateProjectionRawTitle(templateItem = {}, existingItem = {}, elementModified = false) {
  if (elementModified) return existingItem.raw_title || "";
  if (existingItem.song_id || templateItem.song_id) return String(existingItem.raw_title || "").trim();
  const templateType = serviceMemoElementType(parseServiceItemMemo(templateItem.memo));
  const sectionKey = templateProjectionSectionKey(templateItem);
  const existingTitle = String(existingItem.raw_title || "").trim();
  const templateLabel = String(templateItem.label || "").trim();
  if (compactSearchValue(templateLabel) === "청소년부광고"
    && ["교회소식", "광고"].includes(compactSearchValue(existingTitle))) return "";
  // A generated slot name such as "찬양 1" is not a song query. Keep real
  // template defaults (for example a hymn title), but clear this placeholder.
  if (isSongServiceLabel(templateLabel)
    && !existingItem.song_id
    && compactSearchValue(existingTitle) === compactSearchValue(templateLabel)) return "";
  if (["creed", "lords_prayer", "community_confession"].includes(sectionKey)) return templateItem.raw_title || existingItem.raw_title || "";
  if (compactSearchValue(templateItem.label || "") === "송영"
    && templateType === "praise"
    && isPublicFixedDoxologyDisplayText(templateItem.raw_title)) {
    return templateItem.raw_title;
  }
  if (templateType === "image" || templateType === "video") return templateItem.raw_title || existingItem.raw_title || "";
  return existingTitle || templateItem.raw_title || "";
}

function mergeTemplateProjectionMemo(templateMemo = "", existingMemo = "") {
  const template = parseServiceItemMemo(templateMemo);
  const existing = parseServiceItemMemo(existingMemo);
  const formPresetDisabled = Boolean(existing.formPresetDisabled);
  return serializeServiceItemMemo({
    ...existing,
    elementType: template.elementType || existing.elementType,
    componentType: template.componentType || template.elementType || existing.componentType,
    outputMode: template.outputMode || existing.outputMode,
    formHint: formPresetDisabled ? "" : template.formHint || existing.formHint,
    formPreset: formPresetDisabled ? null : template.formPreset || existing.formPreset,
    formPresetDisabled,
    formPresetRules: formPresetDisabled ? [] : template.formPresetRules.length ? template.formPresetRules : existing.formPresetRules,
    textHighlights: template.textHighlights.length ? template.textHighlights : existing.textHighlights,
    introSlide: template.introSlide || existing.introSlide,
    asset: template.asset?.url ? template.asset : existing.asset,
    playback: template.playback || existing.playback,
    presenterRole: template.presenterRole || existing.presenterRole,
    slides: existing.slides,
    reviewStatus: existing.reviewStatus,
    reviewFlags: existing.reviewFlags,
  });
}

function shouldDropUnmodifiedTemplateProjectionExtra(item = {}) {
  if (item._worshipSectionTemplateModified || item._worshipElementTemplateModified) return false;
  const parsed = parseServiceItemMemo(item.memo);
  const templateish = !String(item.raw_title || "").trim();
  return templateish && !item.song_id && !cleanServiceAssignee(item.assignee);
}

function normalizeServiceItemsForTemplateHierarchy(service, items = [], options = {}) {
  const appTypeId = worshipAppServiceTypeId(service?.type_id);
  if (!TEMPLATE_PROJECTED_SERVICE_TYPES.has(appTypeId)) {
    return items.map((item, index) => ({
      ...item,
      ...(options.preserveSourceIndex ? { _serviceItemIndex: index } : {}),
    }));
  }

  const normalizedItems = normalizeSundayFirstSendingItems(service, items, options.referenceItems);
  const hierarchy = serviceTemplateHierarchyIndex(appTypeId, {
    service,
    items: normalizedItems,
  });
  if (!hierarchy.sections.length) return normalizedItems;
  const annotated = normalizedItems.map((item, index) => ({
    ...item,
    _templateSourceOrder: index,
    ...(options.preserveSourceIndex ? { _serviceItemIndex: index } : {}),
  }));
  const classified = annotated.map((item) => ({
    item,
    meta: serviceTemplateHierarchyMetaForItem(hierarchy, item),
  }));
  const sectionIdByGroup = canonicalServiceSectionIds(classified);
  const sectionTitleByGroup = canonicalServiceSectionTitles(classified);

  const ordered = classified
    .map(({ item, meta }) => canonicalizeServiceItemForTemplateHierarchy(item, meta, sectionIdByGroup, sectionTitleByGroup))
    .sort(compareServiceItemsByTemplateHierarchy)
    .map(({ _templateSourceOrder, ...item }, index) => ({
      ...item,
      sort_order: index + 1,
    }));
  return collapseBenedictionLordsPrayerProjectionItems(ordered).map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}

function normalizeSundayFirstSendingItems(service = null, items = [], referenceItems = null) {
  if (worshipAppServiceTypeId(service?.type_id) !== "sunday-first") return items;
  const pastorLeader = serviceHasPastorSermonLeader(service, referenceItems || items);
  return items.filter((item) => {
    const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    const isBenediction = sectionKey === "benediction" || labelKey === "축도";
    const isLordsPrayer = sectionKey === "lords_prayer" || labelKey === "주기도문";
    const parsed = parseServiceItemMemo(item?.memo);
    const rawTitle = String(item?.raw_title || "").trim();
    const hasNonGenericTitle = rawTitle && compactSearchValue(rawTitle) !== labelKey;
    const hasExplicitContent = Boolean(
      item?._worshipElementTemplateModified
      || hasNonGenericTitle
      || cleanServiceAssignee(item?.assignee)
      || parsed.note
      || parsed.slides?.length
    );
    if ((isBenediction || isLordsPrayer) && hasExplicitContent) return true;
    if (pastorLeader) return !isLordsPrayer;
    return !isBenediction;
  });
}

function serviceTemplateHierarchyIndex(typeId, options = {}) {
  const sections = serviceOrderTemplate(typeId, options).map((step, index) => {
    const normalized = normalizeServiceTemplateStep(step, index, typeId);
    const label = String(normalized.label || normalized.name || "").trim();
    const sectionKey = worshipTemplateSectionKey(label, index, normalized);
    const section = {
      key: sectionKey,
      groupKey: `${sectionKey}:${index + 1}`,
      title: label,
      order: index + 1,
      elements: [],
    };
    section.elements = worshipTemplateElementSteps(normalized, label).map((elementStep, elementIndex) => {
      const elementLabel = String(elementStep.label || elementStep.name || label).trim() || label;
      return {
        ...section,
        label: elementLabel,
        elementOrder: elementIndex + 1,
      };
    });
    return section;
  });
  const index = {
    sections,
    sectionByKey: uniqueBy(sections, (section) => section.key),
    sectionByLabel: uniqueBy(sections, (section) => compactSearchValue(section.title)),
    elementBySectionAndLabel: new Map(),
    elementByLabel: uniqueBy(sections.flatMap((section) => section.elements), (element) => compactSearchValue(element.label)),
  };
  sections.forEach((section) => {
    if (!index.sectionByKey.has(section.key)) return;
    section.elements.forEach((element) => {
      const labelKey = compactSearchValue(element.label);
      if (labelKey) index.elementBySectionAndLabel.set(`${section.key}:${labelKey}`, element);
    });
  });
  return index;
}

function uniqueBy(items = [], keyFn) {
  const values = new Map();
  const duplicates = new Set();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    if (values.has(key)) duplicates.add(key);
    else values.set(key, item);
  });
  duplicates.forEach((key) => values.delete(key));
  return values;
}

const PUBLIC_TEMPLATE_SECTION_KEY_ALIASES = {
  closing_hymn: "closing_visual",
  closing_song: "closing_visual",
  doxology: "sending",
  benediction: "sending",
  lords_prayer: "sending",
};

function serviceTemplateHierarchyMetaForItem(hierarchy, item = {}) {
  const sectionKey = String(item._worshipSectionKey || item.sectionKey || item.section_key || "").trim();
  const labelKey = compactSearchValue(item.label || "");
  const exactElement = sectionKey && labelKey ? hierarchy.elementBySectionAndLabel.get(`${sectionKey}:${labelKey}`) : null;
  if (exactElement) return exactElement;

  const labelElement = labelKey ? hierarchy.elementByLabel.get(labelKey) : null;
  if (labelElement) return labelElement;

  const aliasKey = PUBLIC_TEMPLATE_SECTION_KEY_ALIASES[sectionKey] || "";
  if (aliasKey) {
    const aliasElement = labelKey ? hierarchy.elementBySectionAndLabel.get(`${aliasKey}:${labelKey}`) : null;
    if (aliasElement) return aliasElement;
    const aliasSection = hierarchy.sectionByKey.get(aliasKey);
    if (aliasSection) return { ...aliasSection, elementOrder: Number(item._worshipElementOrder) || 0 };
  }

  const section = (sectionKey ? hierarchy.sectionByKey.get(sectionKey) : null)
    || (labelKey ? hierarchy.sectionByLabel.get(labelKey) : null);
  return section ? { ...section, elementOrder: Number(item._worshipElementOrder) || 0 } : null;
}

function canonicalServiceSectionIds(classified = []) {
  const sectionIdByGroup = new Map();
  classified.forEach(({ item, meta }) => {
    if (!meta?.groupKey || !isUuid(item._worshipSectionId)) return;
    if (item._worshipSectionKey === meta.key && !sectionIdByGroup.has(meta.groupKey)) {
      sectionIdByGroup.set(meta.groupKey, item._worshipSectionId);
    }
  });
  classified.forEach(({ item, meta }) => {
    if (!meta?.groupKey || !isUuid(item._worshipSectionId) || sectionIdByGroup.has(meta.groupKey)) return;
    sectionIdByGroup.set(meta.groupKey, item._worshipSectionId);
  });
  return sectionIdByGroup;
}

function canonicalServiceSectionTitles(classified = []) {
  const titlesByGroup = new Map();
  classified.forEach(({ item, meta }) => {
    if (!meta?.groupKey || !item._worshipSectionTemplateModified) return;
    const title = String(item._worshipSectionTitle || "").trim();
    if (!title || normalizeTitle(title) === normalizeTitle(meta.title)) return;
    if (!titlesByGroup.has(meta.groupKey)) titlesByGroup.set(meta.groupKey, new Set());
    titlesByGroup.get(meta.groupKey).add(title);
  });
  const titleByGroup = new Map();
  titlesByGroup.forEach((titles, groupKey) => {
    if (titles.size !== 1) return;
    titleByGroup.set(groupKey, [...titles][0]);
  });
  return titleByGroup;
}

function canonicalizeServiceItemForTemplateHierarchy(item = {}, meta = null, sectionIdByGroup = new Map(), sectionTitleByGroup = new Map()) {
  if (!meta) return item;
  const existingLabel = String(item.label || "").trim();
  const metaLabel = String(meta.label || "").trim();
  const shouldUseAnnouncementDefaultLabel = meta.key === "announcements"
    && !item._worshipElementTemplateModified
    && (!existingLabel
      || compactSearchValue(existingLabel) === compactSearchValue(meta.title || "")
      || compactSearchValue(existingLabel) === "광고");
  const shouldUsePrayerDefaultLabel = meta.key === "prayer"
    && !item._worshipElementTemplateModified
    && ["기도", "대표기도"].includes(compactSearchValue(existingLabel));
  const canonicalElementLabel = shouldUseAnnouncementDefaultLabel
    ? (metaLabel || "교회소식")
    : shouldUsePrayerDefaultLabel
      ? (metaLabel || "대표기도")
      : item.label;
  return {
    ...item,
    label: canonicalElementLabel || item.label,
    _worshipSectionId: sectionIdByGroup.get(meta.groupKey) || item._worshipSectionId || "",
    _worshipSectionKey: meta.key,
    _worshipSectionTitle: sectionTitleByGroup.get(meta.groupKey) || meta.title,
    _worshipSectionOrder: meta.order,
    _worshipElementOrder: item._worshipElementTemplateModified
      ? (Number(item._worshipElementOrder) || Number(meta.elementOrder) || 0)
      : (Number(meta.elementOrder) || Number(item._worshipElementOrder) || 0),
  };
}

function compareServiceItemsByTemplateHierarchy(a = {}, b = {}) {
  const sectionA = Number(a._worshipSectionOrder) || Number.POSITIVE_INFINITY;
  const sectionB = Number(b._worshipSectionOrder) || Number.POSITIVE_INFINITY;
  if (sectionA !== sectionB) return sectionA - sectionB;
  const elementA = Number(a._worshipElementOrder) || Number.POSITIVE_INFINITY;
  const elementB = Number(b._worshipElementOrder) || Number.POSITIVE_INFINITY;
  if (elementA !== elementB) return elementA - elementB;
  return (Number(a._templateSourceOrder) || 0) - (Number(b._templateSourceOrder) || 0);
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
  if (rawName && rawName !== appTypeId && !SERVICE_TYPE_LEGACY_NAMES[rawName]) return normalizeServiceDisplayName(rawName);
  return normalizeServiceDisplayName(SERVICE_TYPE_DISPLAY_NAMES[appTypeId] || SERVICE_TYPE_LEGACY_NAMES[rawName] || rawName || appTypeId || "");
}

function serviceCustomTitle(service) {
  return String(service?.title || "").trim();
}

function normalizeServiceDisplayName(value) {
  return String(value || "").replace(/주일예배 \((1부|2부|3부)\)/g, "주일예배 [$1]");
}

function serviceDisplayTypeName(service) {
  if (!service) return "";
  const tags = Array.isArray(service.tags) ? service.tags : [];
  if (service.type_id === "sunday-main" && tags.some((tag) => String(tag).includes("2·3부 통합"))) {
    return "주일예배 [2·3부 통합]";
  }
  if (serviceTypeUsesCanonicalTitle(service.type_id)) return serviceTypeDisplayName(service.type_id);
  const customTitle = serviceCustomTitle(service);
  if (customTitle) return normalizeWorshipServiceTitle(customTitle, service);
  return serviceTypeDisplayName(service.type_id);
}

function serviceTypeById(typeId) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  return state.serviceTypes.find((type) => type.id === appTypeId) || null;
}

function serviceOrderTemplate(typeId, options = {}) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  const fallbackTemplate = serviceOrderTemplateFallback(appTypeId, options);
  const hasReadyStep = fallbackTemplate.some((step) => {
    const value = step && typeof step === "object" ? step : { label: String(step || ""), name: String(step || "") };
    const label = String(value.label || value.name || "").trim();
    const sectionKey = String(value.sectionKey || value.section_key || "").trim();
    return sectionKey === "ready" || isReadyServiceTemplateLabel(label);
  });
  const fallbackSteps = [
    ...(hasReadyStep ? [] : [publicWorshipReadyStep()]),
    ...fallbackTemplate,
  ];
  const steps = fallbackSteps
    .map((step, index) => normalizeFallbackServiceTemplateStep(step, index, appTypeId))
    .filter((step) => step.label || step.name);
  return withCommonServiceTemplateSteps(steps, appTypeId);
}

function serviceOrderTemplateFallback(appTypeId = "", options = {}) {
  const versionedPublicTemplate = materializePublicWorshipTemplate(appTypeId, options);
  if (versionedPublicTemplate) return versionedPublicTemplate.steps;
  return SERVICE_ORDER_TEMPLATE_FALLBACKS[appTypeId] || [];
}

function materializePublicWorshipTemplate(typeId = "", options = {}) {
  const appTypeId = worshipAppServiceTypeId(typeId);
  const versions = publicWorshipTemplateVersionsForDate(appTypeId, serviceTemplateDate(options.service));
  if (!versions.length) return null;
  let steps = [];
  let activeVersion = null;
  versions.forEach((version) => {
    if (typeof version.build === "function") {
      steps = cloneTemplateSteps(version.build(options));
    } else if (version.patch) {
      steps = applyServiceTemplatePatch(steps, version.patch);
    }
    activeVersion = version;
  });
  return { steps, version: activeVersion };
}

function resolvePublicWorshipTemplateVersion(typeId = "", options = {}) {
  return materializePublicWorshipTemplate(typeId, options)?.version || null;
}

function publicWorshipTemplateVersionsForDate(typeId = "", dateValue = "") {
  const versions = PUBLIC_WORSHIP_TEMPLATE_VERSIONS[worshipAppServiceTypeId(typeId)] || [];
  const serviceDate = normalizeTemplateEffectiveDate(dateValue) || toLocalDateStr(new Date());
  const active = versions
    .filter((version) => templateVersionStartsOnOrBefore(version, serviceDate))
    .sort(compareTemplateVersions);
  if (active.length) return active;
  return versions.slice(0, 1).sort(compareTemplateVersions);
}

function serviceTemplateDate(service = null) {
  return service?.date || service?.service_date || service?.serviceDate || state.newServiceForm?.date || "";
}

function templateVersionStartsOnOrBefore(version = {}, dateValue = "") {
  const date = normalizeTemplateEffectiveDate(dateValue);
  const from = normalizeTemplateEffectiveDate(version.effectiveFrom || version.effective_from);
  if (version.active === false) return false;
  if (!date || !from) return true;
  if (from && date < from) return false;
  return true;
}

function normalizeTemplateEffectiveDate(value = "") {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  return "";
}

function compareTemplateVersions(a = {}, b = {}) {
  return String(a.effectiveFrom || a.effective_from || "").localeCompare(String(b.effectiveFrom || b.effective_from || ""))
    || String(a.version || "").localeCompare(String(b.version || ""));
}

function cloneTemplateSteps(steps = []) {
  if (typeof structuredClone === "function") return structuredClone(steps || []);
  return JSON.parse(JSON.stringify(steps || []));
}

function applyServiceTemplatePatch(steps = [], patch = {}) {
  let next = cloneTemplateSteps(steps);
  const removeKeys = new Set((patch.removeSections || patch.remove_sections || []).map(compactTemplatePatchKey));
  if (removeKeys.size) {
    next = next.filter((step, index) => !removeKeys.has(templateStepPatchKey(step, index)));
  }
  arrayItems(patch.replaceSections || patch.replace_sections).forEach((entry) => {
    const key = compactTemplatePatchKey(entry.sectionKey || entry.section_key || entry.key || entry.label);
    const step = entry.step || entry.template || entry;
    const index = next.findIndex((candidate, candidateIndex) => templateStepPatchKey(candidate, candidateIndex) === key);
    if (index >= 0) next[index] = cloneTemplateSteps([step])[0];
  });
  arrayItems(patch.mergeSections || patch.merge_sections).forEach((entry) => {
    const key = compactTemplatePatchKey(entry.sectionKey || entry.section_key || entry.key || entry.label);
    const index = next.findIndex((candidate, candidateIndex) => templateStepPatchKey(candidate, candidateIndex) === key);
    if (index < 0) return;
    next[index] = mergeServiceTemplateStep(next[index], entry.values || entry.patch || entry);
  });
  arrayItems(patch.insertSections || patch.insert_sections).forEach((entry) => {
    const step = entry.step || entry.template || entry;
    const afterKey = compactTemplatePatchKey(entry.after || entry.afterSection || entry.after_section);
    const beforeKey = compactTemplatePatchKey(entry.before || entry.beforeSection || entry.before_section);
    const beforeIndex = beforeKey ? next.findIndex((candidate, index) => templateStepPatchKey(candidate, index) === beforeKey) : -1;
    const afterIndex = afterKey ? next.findIndex((candidate, index) => templateStepPatchKey(candidate, index) === afterKey) : -1;
    const insertIndex = beforeIndex >= 0 ? beforeIndex : afterIndex >= 0 ? afterIndex + 1 : next.length;
    next.splice(insertIndex, 0, cloneTemplateSteps([step])[0]);
  });
  return next;
}

function mergeServiceTemplateStep(step = {}, patch = {}) {
  const next = { ...step, ...patch };
  delete next.sectionKey;
  delete next.section_key;
  delete next.key;
  if (Array.isArray(patch.elements)) next.elements = cloneTemplateSteps(patch.elements);
  if (Array.isArray(patch.appendElements) || Array.isArray(patch.append_elements)) {
    next.elements = [
      ...worshipTemplateElementSteps(step, step.label || step.name),
      ...cloneTemplateSteps(patch.appendElements || patch.append_elements),
    ];
  }
  return next;
}

function compactTemplatePatchKey(value = "") {
  return compactSearchValue(String(value || ""));
}

function templateStepPatchKey(step = {}, index = 0) {
  return compactTemplatePatchKey(step.sectionKey || step.section_key || step.label || step.name || `step-${index + 1}`);
}

function arrayItems(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function serviceHasPastorSermonLeader(service = null, items = []) {
  const sermonTitle = (Array.isArray(items) ? items : []).find((item) => {
    const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
    const label = compactSearchValue(item?.label || "");
    return sectionKey === "sermon" && (label === "설교제목" || label === "설교");
  });
  const sermonMinister = cleanServiceAssignee(sermonTitle?.assignee || sermonTitle?.person || "");
  const resolvedMinister = sermonMinister
    || serviceWorshipLeaderLabel(service)
    || defaultServiceSermonLeader(service?.type_id);
  return compactSearchValue(resolvedMinister).includes("목사");
}

function serviceSermonLeaderLabel(service = null, items = []) {
  const sermonTitle = (Array.isArray(items) ? items : []).find((item) => {
    const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
    const label = compactSearchValue(item?.label || "");
    return sectionKey === "sermon" && (label === "설교제목" || label === "설교");
  });
  return cleanServiceAssignee(sermonTitle?.assignee || sermonTitle?.person || "")
    || serviceWorshipLeaderLabel(service)
    || defaultServiceSermonLeader(service?.type_id);
}

function serviceHasPastorWorshipLeader(service = null) {
  return compactSearchValue(serviceWorshipLeaderLabel(service)).includes("목사");
}

function serviceHasPastorWorshipLeader(service = null) {
  return compactSearchValue(serviceWorshipLeaderLabel(service)).includes("목사");
}

function withCommonServiceTemplateSteps(steps = [], typeId = "") {
  const hasClosingVisual = steps.some((step) => {
    const label = String(step?.label || step?.name || "").trim();
    const sectionKey = String(step?.sectionKey || step?.section_key || "").trim();
    return sectionKey === "closing_visual" || isClosingVisualServiceTemplateLabel(label);
  });
  const appTypeId = worshipAppServiceTypeId(typeId);
  const appendClosing = SERVICE_ORDER_TEMPLATE_OPTIONS[appTypeId]?.appendClosing !== false;
  if (hasClosingVisual || !appendClosing) return steps;
  const closingStep = SERVICE_CATEGORIES.public.includes(appTypeId)
    ? publicWorshipClosingStep()
    : legacyImageClosingStep();
  return [...steps, closingStep];
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
    required: value.required !== undefined ? Boolean(value.required) : !["찬양", "특송", "결단", "결단찬양", "통성기도", "교제", "기도회"].includes(label),
    flex: value.flex !== undefined ? Boolean(value.flex) : ["찬양", "특송", "결단", "결단찬양", "교제", "기도회", "기도"].includes(label),
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
  const sectionKey = String(step.sectionKey || step.section_key || "").trim();
  const isSpecialSong = sectionKey === "special_song" || compactSearchValue(label || step.label || step.name) === "특송";
  if (isSpecialSong && !rules.length) {
    rules.push(PUBLIC_SPECIAL_HYMN_FORM_PRESET_RULE);
  }
  return rules;
}

function serviceTemplateDefaultElementType(label) {
  const compact = compactSearchValue(label);
  if (compact === "준비" || compact === "예배준비" || compact === "예배준비영상") return "video";
  return "";
}

function defaultServiceTemplateStep(index = 0, typeId = "") {
  const serviceGroup = serviceTypeGroupKey(typeId);
  return {
    label: "새 섹션",
    name: "새 섹션",
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

function normalizeServiceTemplateStep(step = {}, index = 0, typeId = "") {
  const label = String(step.label || step.name || "").trim();
  const memo = parseServiceItemMemo(step.notes || step.memo || "");
  const fallback = defaultServiceTemplateStep(index);
  const elementTypeValue = step.elementType || step.element_type || step.componentType || step.component_type || memo.elementType || memo.componentType;
  const elementType = normalizeServiceElementType(elementTypeValue) || normalizeWorshipElementType(elementTypeValue);
  const defaultStrength = String(step.defaultStrength || step.default_strength || "").trim();
  const formPreset = normalizeServiceFormPreset(step.formPreset || step.form_preset, step.formHint || step.form_hint, defaultStrength);
  const textHighlights = normalizeServiceTextHighlights(step.textHighlights || step.text_highlights || step.highlights || memo.textHighlights);
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
    textHighlights,
    defaultStrength,
    outputMode,
    notes: nullIfBlank(step.notes),
    sort_order: index + 1,
  };
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
  const parsed = parseServiceItemMemo(item?.memo);
  return parsed.formPresetDisabled ? null : parsed.formPreset || null;
}

function serviceItemFormPresetDisabled(item) {
  return Boolean(parseServiceItemMemo(item?.memo).formPresetDisabled);
}

function serviceItemFormPresetRules(item) {
  return parseServiceItemMemo(item?.memo).formPresetRules || [];
}

function serviceItemMetadataFormPreset(item = {}) {
  const song = serviceItemLinkedSong(item);
  const version = serviceItemLinkedVersion(item, song);
  const versionMeta = normalizeSongMetadata(version?.metadata);
  const songMeta = normalizeSongMetadata(song?.metadata);
  return versionMeta.presenter_form || songMeta.presenter_form || null;
}

function serviceItemEffectiveFormHint(item = {}) {
  const parsed = parseServiceItemMemo(item?.memo);
  if (parsed.formPresetDisabled) return "";
  return parsed.formHint || serviceFormPresetSummary(serviceItemMetadataFormPreset(item));
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
      data-service-id="${escapeAttr(item.service_id || options.serviceId || state.selectedServiceId || "")}"
      data-service-item-index="${index}"
      value="${escapeAttr(serviceItemEffectiveFormHint(item))}"
      placeholder="${escapeAttr(options.placeholder || "송폼/범위")}"
      aria-label="섹션 송폼/범위"
    />`;
}

function getServiceItems(serviceId) {
  if (!serviceId) return [];
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service || !TEMPLATE_PROJECTED_SERVICE_TYPES.has(worshipAppServiceTypeId(service.type_id))) {
    return state.serviceItems[serviceId] || [];
  }
  const projected = projectWorshipServiceItemsFromTemplate(service, state.serviceItems[serviceId] || []);
  state.serviceItems[serviceId] = projected;
  return projected;
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
  const items = normalizeServiceItemsForTemplateHierarchy(service, normalizeServiceItems(getServiceItems(serviceId)));
  if (!service) return items;
  const useLegacyDefaults = !TEMPLATE_PROJECTED_SERVICE_TYPES.has(worshipAppServiceTypeId(service.type_id));
  const defaults = useLegacyDefaults ? getServiceDefaultItems(service.type_id)
    .filter((item) => serviceDefaultItemVisibleInOutput(item, options))
    .map((item, index) => ({
      ...item,
      id: item.id || `default:${service.type_id}:${index}`,
      service_id: serviceId,
      song_id: item.song_id || null,
      _isDefault: true,
      _sourceOrder: index,
    })) : [];
  const merged = defaults.length ? mergeServiceItemsWithDefaults(service.type_id, items, defaults) : items;
  return adaptServiceItemsForPresenterView(service, merged);
}

function getServiceOutlineItems(service) {
  if (!service?.id) return [];
  return adaptServiceItemsForPresenterView(service, normalizeServiceItemsForTemplateHierarchy(service, normalizeServiceItems(getServiceItems(service.id))), {
    preserveSourceIndex: true,
  });
}

function adaptServiceItemsForPresenterView(service, items = [], options = {}) {
  const annotated = normalizeServicePresenterConclusionItems(service,
    normalizeSendingConclusionProjectionItems(
    normalizeServiceItemsForTemplateHierarchy(service, items, options),
    ));
  return annotated.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}

function normalizeServicePresenterConclusionItems(service = null, items = []) {
  if (worshipAppServiceTypeId(service?.type_id) !== "sunday-first") return items;
  const hasBenediction = items.some((item) => {
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    return templateProjectionSectionKey(item) === "sending" && labelKey === "축도";
  });
  const hasLordsPrayer = items.some((item) => {
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    return templateProjectionSectionKey(item) === "sending" && labelKey === "주기도문";
  });
  if (!hasBenediction || !hasLordsPrayer) return items;
  const pastorLeader = serviceHasPastorSermonLeader(service, items);
  return items.filter((item) => {
    const labelKey = compactSearchValue(item?.label || item?.raw_title || "");
    if (templateProjectionSectionKey(item) !== "sending") return true;
    if (pastorLeader) return labelKey !== "주기도문";
    return labelKey !== "축도";
  });
}

function serviceDefaultItemVisibleInOutput(item = {}) {
  return Boolean(String(item.label || item.raw_title || "").trim());
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

const GENERIC_PRESENTER_ASSIGNEE_KEYS = new Set([
  "인도자",
  "예배인도자",
  "찬양인도자",
  "담당",
  "담당자",
  "담당기관",
  "이름직분",
]);

function cleanPresenterAssignee(value) {
  const assignee = cleanServiceAssignee(value);
  if (!assignee) return "";
  return GENERIC_PRESENTER_ASSIGNEE_KEYS.has(compactSearchValue(assignee)) ? "" : assignee;
}

function serviceWorshipLeaderLabel(service) {
  const sourceRef = service?._worshipSourceRef && typeof service._worshipSourceRef === "object" ? service._worshipSourceRef : {};
  const direct = cleanPresenterAssignee(
    service?.worshipLeader
    || service?._worshipLeader
    || sourceRef.worship_leader
    || sourceRef.worshipLeader,
  );
  if (direct) return direct;
  return "";
}

function servicePraiseLeaderLabel(service) {
  if (!serviceUsesPraiseLeader(service?.type_id)) return "";
  return cleanServiceAssignee(service?.praiseLeader || service?.leader);
}

function serviceMatchesSearch(svc, q) {
  if (!q) return true;
  const norm = (s) => normalizeSearchValue(s);
  const leaders = norm([serviceWorshipLeaderLabel(svc), servicePraiseLeaderLabel(svc)].filter(Boolean).join(" "));
  const tags = norm((svc.tags || []).join(" "));
  const date = svc.date || "";
  const d = new Date(date + "T00:00:00");
  const dateFmt = `${d.getMonth()+1}/${d.getDate()}`;
  const dateDisplay = norm([dateFmt, formatServiceDate(svc, { compact: true }), formatServiceDate(svc)].join(" "));
  const type = norm([serviceTypeName(svc.type_id), serviceTypeDisplayName(svc.type_id), serviceDisplayTypeName(svc), serviceCustomTitle(svc)].join(" "));
  const items = norm([
    ...getServiceItems(svc.id),
    ...getServiceDefaultItems(svc.type_id),
  ].map((item) => `${item.label || ""} ${item.raw_title || ""}`).join(" "));
  return leaders.includes(q) || date.includes(q) || tags.includes(q) || dateDisplay.includes(q) || type.includes(q) || items.includes(q);
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

function serviceTimeWindow(service) {
  const day = parseLocalDate(service?.date);
  if (Number.isNaN(day.getTime())) return null;
  const range = SERVICE_TIME_WINDOWS[worshipAppServiceTypeId(service?.type_id)];
  if (!range) {
    const finalDay = parseLocalDate(service?.date_end || service?.date);
    finalDay.setHours(23, 59, 59, 999);
    return { start: day, end: finalDay, timed: false };
  }
  const atTime = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    const value = new Date(day);
    value.setHours(hour, minute, 0, 0);
    return value;
  };
  return { start: atTime(range.start), end: atTime(range.end), timed: true };
}

function homeServiceScheduleLabel(service, options = {}) {
  const date = formatServiceDate(service, options);
  const range = SERVICE_TIME_WINDOWS[worshipAppServiceTypeId(service?.type_id)];
  return range ? `${date} · ${range.start}-${range.end}` : date;
}

function getHomeNextService(baseDate = new Date()) {
  const now = new Date(baseDate);
  if (Number.isNaN(now.getTime())) return null;
  const candidates = state.services
    .map((service) => ({ service, window: serviceTimeWindow(service) }))
    .filter(({ window }) => window && window.end >= now);
  const ongoing = candidates
    .filter(({ window }) => window.timed && window.start <= now)
    .sort((a, b) => a.window.start - b.window.start);
  if (ongoing.length) return ongoing[0].service;

  candidates.sort((a, b) => {
    const dayOrder = toLocalDateStr(a.window.start).localeCompare(toLocalDateStr(b.window.start));
    if (dayOrder) return dayOrder;
    if (a.window.timed !== b.window.timed) return a.window.timed ? -1 : 1;
    const timeOrder = a.window.start - b.window.start;
    if (timeOrder) return timeOrder;
    return Number(a.service.sort_order || 0) - Number(b.service.sort_order || 0);
  });
  return candidates[0]?.service || null;
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

function getUpcomingServiceShortcuts(limit = 8, baseDate = new Date()) {
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);
  return sortServicesByDate(state.services.filter((service) => {
    const serviceDate = parseLocalDate(service?.date);
    return !Number.isNaN(serviceDate.getTime()) && serviceDate >= today;
  })).slice(0, limit);
}

function homeSidebarServiceWeekRange(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getHomeSidebarRecentServiceShortcuts(limit = 8, baseDate = new Date()) {
  const { start, end } = homeSidebarServiceWeekRange(baseDate);
  return sortServicesByDate(state.services.filter((service) => {
    const serviceDate = parseLocalDate(service?.date);
    return !Number.isNaN(serviceDate.getTime()) && serviceDate >= start && serviceDate <= end;
  })).slice(0, limit);
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
  if (state.module === "presenter") {
    refs.songList.innerHTML = renderPresenterSidebar(q, services, selectedService);
    finishListRender();
    return;
  }
  const sidebarPrimary = q ? `
    ${services.length
      ? renderServiceSidebarDateGroups(services)
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
      ${q ? "" : (state.module === "home"
        ? renderHomeSidebarRecentServiceShortcuts()
        : renderUpcomingServiceShortcuts())}
    </div>`;

  finishListRender();
}

function renderPresenterSidebar(query, services, selectedService) {
  const visibleServices = query ? services : [];
  const searchSection = query ? `
      <section class="service-sidebar-section">
        <div class="service-sidebar-head">
          <span>검색 결과</span>
          <small>${visibleServices.length}</small>
        </div>
        ${visibleServices.length
          ? renderServiceSidebarDateGroups(visibleServices)
          : `<p class="service-no-results">검색 결과가 없습니다.</p>`}
      </section>` : "";
  return `
    <div class="service-sidebar service-sidebar--presenter">
      ${searchSection}
      ${selectedService ? renderPresenterSidebarPreparationInput(selectedService) : ""}
      ${selectedService ? renderServiceCurrentSidebar(selectedService) : renderUpcomingServiceShortcuts()}
    </div>`;
}

function renderPresenterSidebarPreparationInput(service) {
  if (!service?.id) return "";
  const inputCount = presenterServiceEditableInputCount(service);
  const draft = state.presenterPreparationDrafts[service.id] || "";
  const applying = state.presenterPreparationApplyingServiceIds.has(service.id);
  const examples = presenterPreparationPlaceholderForService(service);
  return `
    <section class="service-sidebar-section service-sidebar-section--preparation-input" aria-label="예배 입력 붙여넣기">
      <div class="service-sidebar-head">
        <span>예배 입력</span>
        <small>${escapeHtml(inputCount ? `${inputCount}개 항목` : "입력 없음")}</small>
      </div>
      <div class="svc-presenter-preparation-input svc-presenter-preparation-input--sidebar">
        <textarea class="svc-presenter-preparation-text svc-presenter-preparation-text--sidebar" data-presenter-preparation-input data-service-id="${escapeAttr(service.id)}" rows="4" placeholder="여기에 붙여넣기" aria-label="예배 입력 붙여넣기">${escapeHtml(draft)}</textarea>
        ${renderPresenterPreparationExamples(examples)}
        <div class="svc-presenter-preparation-actions">
          <button class="svc-presenter-preparation-apply svc-presenter-preparation-apply--sidebar" type="button" data-presenter-preparation-apply data-service-id="${escapeAttr(service.id)}" ${applying ? "disabled" : ""}>
            <i data-lucide="wand-sparkles"></i>
            <span>${applying ? "반영 중" : "반영"}</span>
          </button>
        </div>
      </div>
    </section>`;
}

function renderUpcomingServiceShortcuts() {
  const services = getUpcomingServiceShortcuts();
  if (!services.length) return "";
  return `
    <section class="service-sidebar-section service-sidebar-section--recent">
      <div class="service-sidebar-head">
        <span>다가오는 예배</span>
        <small>${services.length}</small>
      </div>
      ${renderServiceSidebarDateGroups(services)}
    </section>`;
}

function renderHomeSidebarRecentServiceShortcuts() {
  const services = getHomeSidebarRecentServiceShortcuts();
  if (!services.length) return "";
  return `
    <section class="service-sidebar-section service-sidebar-section--recent">
      <div class="service-sidebar-head">
        <span>최근 예배</span>
        <small>${services.length}</small>
      </div>
      ${renderServiceSidebarDateGroups(services)}
    </section>`;
}

function renderServiceSidebarDateGroups(services = []) {
  const groups = [];
  for (const service of services) {
    const key = serviceSidebarDateKey(service);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.services.push(service);
    } else {
      groups.push({
        key,
        label: formatServiceDate(service, { compact: true }),
        services: [service],
      });
    }
  }
  return `
    <div class="service-sidebar-date-groups">
      ${groups.map((group) => `
        <section class="service-sidebar-date-group">
          <div class="service-sidebar-date-head">
            <span>${escapeHtml(group.label)}</span>
          </div>
          <div class="service-sidebar-stack">
            ${group.services.map((service) => renderServiceSidebarCard(service, { showDate: false })).join("")}
          </div>
        </section>
      `).join("")}
    </div>`;
}

function serviceSidebarDateKey(service) {
  return [service?.date || "", service?.date_end || ""].join("::");
}

function renderServiceSidebarCard(service, options = {}) {
  const active = service.id === state.selectedServiceId ? " active" : "";
  const showDate = options.showDate !== false;
  const cardButton = `
    <button
      class="service-sidebar-card${showDate ? "" : " service-sidebar-card--compact"}${active}"
      type="button"
      data-service-id="${escapeAttr(service.id)}"
    >
      ${showDate ? `<span class="service-sidebar-date">${escapeHtml(formatServiceDate(service, { compact: true }))}</span>` : ""}
      <span class="service-sidebar-title">${escapeHtml(serviceDisplayTypeName(service))}</span>
    </button>`;
  if (!showDate) {
    return `
      <div class="service-sidebar-card-row${active}">
        ${cardButton}
        <button class="service-sidebar-presenter" type="button" data-open-presenter-service="${escapeAttr(service.id)}" aria-label="Presenter에서 열기">
          <i data-lucide="screen-share"></i>
        </button>
      </div>`;
  }
  return `
    ${cardButton}`;
}

function renderServiceCurrentSidebar(service) {
  const items = getServiceOutlineItems(service);
  const editorItems = normalizeServiceItems(getServiceItems(service.id));
  const slides = presenterSlidesForService(service.id);
  const selectedIndex = serviceSidebarSelectedItemIndex(service.id, editorItems, slides);
  const outlineGroups = groupServiceSidebarOutlineItems(items);
  const readyRow = renderServiceReadyOutlineRow(service, slides, items);
  return `
    <section class="service-sidebar-section service-sidebar-section--current">
      <div class="service-sidebar-head">
        <span>순서</span>
        <small>시작</small>
      </div>
      <div class="service-outline-list">
        ${readyRow}
        ${items.length
          ? outlineGroups.map((group, index) => renderServiceOutlineGroup(service, group, index, selectedIndex, slides)).join("")
          : `<p class="service-no-results">순서가 없습니다.</p>`}
      </div>
    </section>
  `;
}

function groupServiceSidebarOutlineItems(items = []) {
  const groups = [];
  const bySection = new Map();
  items.forEach((item, index) => {
    const sectionId = String(item?._worshipSectionId || "").trim();
    const key = sectionId || `item:${index}`;
    let group = bySection.get(key);
    if (!group) {
      group = {
        key,
        sectionId,
        sectionKey: item?._worshipSectionKey || "",
        sectionTitle: item?._worshipSectionTitle || item?.label || "",
        sectionOrder: Number(item?._worshipSectionOrder) || index + 1,
        items: [],
      };
      bySection.set(key, group);
      groups.push(group);
    }
    group.items.push({
      item,
      index: Number.isInteger(item._serviceItemIndex) ? item._serviceItemIndex : index,
    });
  });
  return groups;
}

function renderServiceReadyOutlineRow(service, slides = [], items = getServiceItems(service.id)) {
  const readyIndex = slides.findIndex((slide) => isPresenterPreparationSlide(slide));
  const readySlide = readyIndex >= 0 ? slides[readyIndex] : null;
  if (!readySlide || items.some((item) => presenterSlideBelongsToItem(readySlide, item))) return "";
  const active = state.presenter.serviceId === service.id && readyIndex >= 0 && state.presenter.index === readyIndex;
  const interactionHint = presenterSlideInteractionHint(service.id, "준비");
  return `
    <button class="service-outline-row service-outline-row--ready${active ? " active" : ""}" type="button"
      data-service-outline-slide="${escapeAttr(readyIndex >= 0 ? readyIndex : 0)}"
      data-service-outline-service="${escapeAttr(service.id)}"
      aria-label="${escapeAttr(interactionHint)}"
      title="${escapeAttr(interactionHint)}">
      <span class="service-outline-no">0</span>
      <span class="service-outline-main">
        <strong>준비</strong>
      </span>
      <span class="service-outline-start">${escapeHtml(serviceOutlineStartLabel(readyIndex))}</span>
    </button>`;
}

function renderServiceOutlineGroup(service, group, groupIndex, selectedIndex, slides = []) {
  if (!group?.items?.length) return "";
  const firstEntry = group.items[0];
  const childEntries = group.items.filter(({ item }) => !isServiceSidebarSectionMarkerItem(item, group));
  const firstSlideIndex = firstPresenterSlideIndexForServiceItem(firstEntry.item, slides);
  const selected = group.items.some(({ index }) => index === selectedIndex);
  const activeSlide = state.presenter.serviceId === service.id
    && group.items.some(({ item }) => presenterSlideBelongsToItem(state.presenter.slides[state.presenter.index], item));
  const title = serviceSidebarSectionTitle(group, firstEntry.item);
  const interactionHint = presenterSlideInteractionHint(service.id, title);
  return `
    <div class="service-outline-group${selected ? " selected" : ""}${activeSlide ? " active" : ""}">
      <button class="service-outline-row service-outline-row--section${activeSlide ? " active" : ""}" type="button"
        data-service-outline-slide="${escapeAttr(firstSlideIndex >= 0 ? firstSlideIndex : "")}"
        data-service-outline-item-index="${escapeAttr(firstEntry.index)}"
        data-service-outline-service="${escapeAttr(service.id)}"
        aria-label="${escapeAttr(interactionHint)}"
        title="${escapeAttr(interactionHint)}"
        >
        <span class="service-outline-no">${escapeHtml(groupIndex + 1)}</span>
        <span class="service-outline-main">
          <strong>${escapeHtml(title)}</strong>
        </span>
        <span class="service-outline-start">${escapeHtml(serviceOutlineStartLabel(firstSlideIndex))}</span>
      </button>
      ${childEntries.length ? `
        <div class="service-outline-children">
          ${childEntries.map(({ item, index }) => renderServiceOutlineChildRow(service, item, index, selectedIndex, slides)).join("")}
        </div>` : ""}
    </div>`;
}

function renderServiceOutlineChildRow(service, item, index, selectedIndex, slides = []) {
  const slideIndex = firstPresenterSlideIndexForServiceItem(item, slides);
  const activeSlide = state.presenter.serviceId === service.id && slideIndex >= 0 && presenterSlideBelongsToItem(state.presenter.slides[state.presenter.index], item);
  const selected = index === selectedIndex;
  const title = serviceSidebarChildItemTitle(item);
  const interactionHint = presenterSlideInteractionHint(service.id, title);
  const missing = serviceOutlineMissingState(item, slides);
  return `
    <button class="service-outline-row service-outline-row--child${selected ? " selected" : ""}${activeSlide ? " active" : ""}" type="button"
      data-service-outline-slide="${escapeAttr(slideIndex >= 0 ? slideIndex : "")}"
      data-service-outline-item-index="${index}"
      data-service-outline-service="${escapeAttr(service.id)}"
      aria-label="${escapeAttr(interactionHint)}"
      title="${escapeAttr(interactionHint)}"
      >
      <span class="service-outline-no"></span>
      <span class="service-outline-main">
        <strong>${escapeHtml(title)}</strong>
        ${renderServiceOutlineMissingBadge(missing)}
      </span>
      <span class="service-outline-start"></span>
    </button>`;
}

function serviceOutlineMissingState(item = {}, slides = []) {
  return slides.find((slide) => slide?.missingContent && presenterSlideBelongsToItem(slide, item)) || null;
}

function renderServiceOutlineMissingBadge(missing = null) {
  if (!missing?.missingContent) return "";
  const inputMode = String(missing.inputMode || "").trim();
  const label = inputMode === "praise_db"
    ? "찬양 입력 필요"
    : inputMode === "scripture"
      ? "성경 입력 필요"
      : inputMode === "asset"
        ? "파일 입력 필요"
        : "입력 필요";
  return `<span class="service-outline-badge">${escapeHtml(label)}</span>`;
}

function serviceOutlineStartLabel(slideIndex) {
  return slideIndex >= 0 ? String(slideIndex + 1) : "";
}

function serviceSidebarSectionTitle(group, fallbackItem = null) {
  const sectionKey = String(group?.sectionKey || fallbackItem?._worshipSectionKey || "").trim();
  const rawTitle = String(group?.sectionTitle || fallbackItem?.label || "").trim() || serviceSidebarItemTitle(fallbackItem) || "섹션";
  return serviceSectionDisplayTitle(sectionKey, rawTitle);
}

function isServiceSidebarSectionMarkerItem(item, group = {}) {
  if (!item || item.song_id) return false;
  const sectionTitle = compactSearchValue(group.sectionTitle || "");
  const label = compactSearchValue(item.label || "");
  const title = compactSearchValue(serviceItemDisplayText(item));
  if (!sectionTitle || (label !== sectionTitle && title !== sectionTitle)) return false;
  return group.sectionKey === "praise" || isMainPraiseLabel(group.sectionTitle);
}

function serviceSidebarChildItemTitle(item) {
  const label = String(item?.label || "").trim();
  if (serviceSidebarUsesLabelOnly(item)) return label || "항목";
  const title = serviceItemDisplayText(item);
  if (!label) return title || "항목";
  if (!title) return label;
  const labelCompact = compactSearchValue(label);
  const titleCompact = compactSearchValue(title);
  if (labelCompact === titleCompact) return label;
  return `${label} · ${title}`;
}

function serviceSidebarUsesLabelOnly(item = {}) {
  const label = compactSearchValue(item.label || "");
  return isCreedServiceItem(item)
    || label === "주기도문"
    || label === "공동체고백";
}

function serviceSidebarItemTitle(item) {
  const label = String(item?.label || "").trim();
  const title = serviceItemDisplayText(item);
  if (item?._worshipSectionKey === "announcements" && (!title || compactSearchValue(label) === compactSearchValue(title) || compactSearchValue(label) === "교회소식" || compactSearchValue(label) === "광고")) return "광고";
  if (label && title && compactSearchValue(label) !== compactSearchValue(title)) return `${label} · ${title}`;
  return title || label || "항목";
}

function serviceSidebarSelectedItemIndex(serviceId, items = getServiceItems(serviceId), slides = buildServicePresenterSlides(serviceId)) {
  if (!items.length) return -1;
  const currentIndex = Number(state.selectedServiceItemIndex);
  if (Number.isInteger(currentIndex) && currentIndex >= 0
    && items.some((item, index) => (Number.isInteger(item._origIndex) ? item._origIndex : index) === currentIndex)) {
    return currentIndex;
  }
  const activeSlide = state.presenter.serviceId === serviceId ? slides[state.presenter.index] : null;
  const activeIndex = activeSlide ? items.findIndex((item) => presenterSlideBelongsToItem(activeSlide, item)) : -1;
  if (activeIndex >= 0) return Number.isInteger(items[activeIndex]._origIndex) ? items[activeIndex]._origIndex : activeIndex;
  return Number.isInteger(items[0]._origIndex) ? items[0]._origIndex : 0;
}

function firstPresenterSlideIndexForServiceItem(item, slides = []) {
  return slides.findIndex((slide) => presenterSlideBelongsToItem(slide, item));
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
            value="${escapeAttr(item.assignee || "")}" placeholder="${escapeAttr(inferServiceItemAssignee(item))}" />
        </label>
        <label>
          <span>항목</span>
          <input type="text" data-service-item-field="raw_title" data-service-item-index="${selectedIndex}"
            value="${escapeAttr(item.raw_title || "")}"
            placeholder="${isScriptureServiceLabel(item.label) ? "성경 구절" : "내용"}"
            ${isSongServiceLabel(item.label) || isSpecialSongServiceItem(item) ? `list="servicePraiseOptions"` : ""}
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
        <h2 class="service-date-list-title">템플릿 구조</h2>
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
  const title = q ? "예배 검색 결과" : "전체 예배";
  const helperText = q
    ? `"${state.search.trim()}" 검색 결과입니다. 카드를 선택하면 바로 예배 입력 화면으로 이동합니다.`
    : "유형별 최근 예배입니다. 카드를 선택해 입력/송출을 준비하고, 추가로 같은 유형의 예배를 만들 수 있습니다.";
  refs.detailPane.innerHTML = `
    <div class="service-date-list service-date-list--all">
      <div class="service-section-head">
        <div class="service-section-title-block">
          <h2 class="service-date-list-title">${escapeHtml(title)}</h2>
          <p class="service-date-list-helper">${escapeHtml(helperText)}</p>
        </div>
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
  const typeName = serviceTypeDisplayName(type.id);
  return `
    <section class="service-list-type-block">
      <header>
        <button class="service-list-type-open" type="button" data-select-service-type="${escapeAttr(type.id)}">
          <strong>${escapeHtml(typeName)}</strong>
          <small>${escapeHtml(sorted.length)}${query ? "개 결과" : "개 예배"}</small>
        </button>
        <button class="service-list-new-btn" type="button" data-new-service="${escapeAttr(type.id)}" aria-label="${escapeAttr(`${typeName} 추가`)}">
          <i data-lucide="plus"></i>
          <span>추가</span>
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
                <input class="svc-new-input" type="text" data-new-service-field="leader" value="${escapeAttr(form.leader)}" placeholder="이름/직분" />
              </div>
            ` : ""}
            <div class="svc-new-field">
              <label class="svc-new-label">찬양팀</label>
              <input class="svc-new-input" type="text" data-new-service-field="praiseTeam" value="${escapeAttr(form.praiseTeam || "")}" placeholder="OOO 찬양단" />
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
    refs.detailPane.innerHTML = renderLoadingDetail();
    loadServiceItems(serviceId);
    return;
  }

  const prepEditorOpen = state.servicePrepEditorOpenId === serviceId;
  if (prepEditorOpen) {
    refs.detailPane.innerHTML = renderServicePrepEditorDialog(svc);
    refreshIcons();
    updateSaveState();
    return;
  }

  // A concrete service has one working surface: the presenter. Do not open a
  // duplicate read-only outline between the service list and the presenter.
  void openServiceInPresenter(serviceId);
}

function serviceAuthoringSummary(service, items) {
  const sectionKeys = [];
  for (const item of items) {
    const groupInfo = serviceEditorGroupInfo(item);
    const label = groupInfo.label || item.label || "섹션";
    if (sectionKeys[sectionKeys.length - 1] !== label) sectionKeys.push(label);
  }
  const slideCount = buildServicePresenterSlides(service.id).length;
  return {
    services: service ? 1 : 0,
    sections: sectionKeys.length,
    elements: items.length,
    slides: slideCount,
  };
}

function renderServiceAuthoringLevels(summary) {
  const levels = [
    ["섹션", summary.sections],
    ["항목", summary.elements],
    ["슬라이드", summary.slides],
  ];
  return `
    <div class="svc-authoring-levels" aria-label="예배 구성 단위">
      ${levels.map(([label, count]) => `
        <span class="svc-authoring-level">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(formatCount(count))}</span>
        </span>
      `).join("")}
    </div>`;
}

function renderServiceAuthoringPanel(kicker, title, body) {
  if (!body) return "";
  return `
    <details class="svc-authoring-panel"${title === "예배 정보" ? " open" : ""}>
      <summary class="svc-authoring-panel-head">
        <span>${escapeHtml(kicker)}</span>
        <strong>${escapeHtml(title)}</strong>
      </summary>
      <div class="svc-authoring-panel-body">
        ${body}
      </div>
    </details>`;
}

function renderPresenterDetail() {
  if (!state.client) {
    refs.detailPane.innerHTML = renderConnectionEmptyDetail();
    refreshIcons();
    return;
  }

  if (state.serviceError || !state.serviceTypes.length) {
    refs.detailPane.innerHTML = state.serviceError
      ? renderUnavailableDetail("service", "Presenter", state.serviceError)
      : renderLoadingDetail();
    refreshIcons();
    return;
  }

  const serviceId = state.selectedServiceId;
  const svc = state.services.find((s) => s.id === serviceId);
  if (!svc) {
    renderPresenterDashboard();
    return;
  }

  const items = state.serviceItems[serviceId];
  if (!items) {
    refs.detailPane.innerHTML = renderLoadingDetail();
    loadServiceItems(serviceId);
    return;
  }

  if (state.presenterBulletinServiceId === serviceId && serviceSupportsBulletin(svc)) {
    refs.detailPane.innerHTML = renderServiceBulletinWorkbench(svc);
    refreshIcons();
    updateSaveState();
    return;
  }

  const dateStr = formatServiceIsoDate(svc);
  const presenterActive = state.presenter.serviceId === serviceId;
  const presenterSlides = presenterSlidesForService(serviceId);
  const presenterIndex = presenterActive ? clampPresenterIndex(state.presenter.index, presenterSlides.length) : 0;
  refs.detailPane.innerHTML = `
    <div class="service-viewer presenter-viewer">
      <div class="svc-header">
        <div class="svc-header-date">
          <h2 class="svc-service-title">${escapeHtml(serviceDisplayTypeName(svc))}</h2>
          <span class="svc-date-text">${escapeHtml(dateStr)}</span>
        </div>
        <div class="svc-header-actions">
          ${serviceSupportsBulletin(svc) ? `
            <button class="svc-output-action svc-output-action--quiet" type="button" data-service-bulletin-action="open" data-service-id="${escapeAttr(serviceId)}" aria-label="청년부 주보 열기">
              <i data-lucide="newspaper"></i>
              <span>주보</span>
            </button>` : ""}
          ${renderWorshipModeTabs(serviceId, "presenter")}
        </div>
      </div>
      ${renderServicePresenterControls(svc, presenterSlides, presenterActive, presenterIndex)}
      ${renderPresenterSectionEditorLayer(svc)}
      ${renderServicePraiseDatalist()}
      ${renderServiceScriptureDatalist()}
    </div>`;
  refreshIcons();
  mountDeferredPresenterBoardSections(document.getElementById("servicePresenterControls"), serviceId, presenterSlides);
  updateSaveState();
  requestAnimationFrame(() => {
    fitPresenterChromakeyScripturePreviews(refs.detailPane);
    fitPresenterSongTitlePreviews(refs.detailPane);
    fitPresenterSermonTitlePreviews(refs.detailPane);
  });
  if (state.module === "presenter") renderServiceList();
}

function serviceBulletinSectionTitle(item = {}) {
  return String(item._worshipSectionTitle || item._worshipSectionKey || item.label || "").trim();
}

function serviceBulletinItemText(item = {}, service = null) {
  const model = serviceItemEditorModel(item, { service });
  if (model.scripture) return serviceItemEditorScriptureTitleValue(item, model.parsed, service) || "";
  const label = String(item.label || "").trim();
  const labelKey = compactSearchValue(label);
  if (labelKey === "사도신경" || labelKey === "주기도문" || labelKey === "공동체고백") return label;
  const text = serviceItemDisplayText(item);
  const assignee = serviceItemEditableAssigneeValue(item, service);
  if (!text || compactSearchValue(text) === labelKey) return assignee;
  return assignee && !text.includes(assignee) ? `${text} · ${assignee}` : text;
}

function serviceBulletinOrderRows(service) {
  const groups = new Map();
  getServiceItems(service.id).forEach((item) => {
    if (item._isDefault || parseServiceItemMemo(item.memo).hiddenInPresentation) return;
    const title = serviceBulletinSectionTitle(item);
    if (!title || title === "준비" || title === "폐회") return;
    const key = String(item._worshipSectionId || item._worshipSectionKey || title);
    if (!groups.has(key)) groups.set(key, { title, entries: [] });
    const text = serviceBulletinItemText(item, service);
    if (text) groups.get(key).entries.push(text);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...new Set(group.entries)],
    }))
    .filter((group) => group.title && group.entries.length);
}

function serviceBulletinCalendarRow(service) {
  return (state.calendarData || []).find((row) => String(row.date || "") === String(service.date || "")) || null;
}

function serviceBulletinPrayerLeader(service, rows = serviceBulletinOrderRows(service)) {
  const calendarValue = String(serviceBulletinCalendarRow(service)?.young_adult_prayer || "").trim();
  if (calendarValue) return calendarValue;
  const prayerRow = rows.find((row) => compactSearchValue(row.title).includes("대표기도"));
  return prayerRow?.entries.join(" · ") || "-";
}

function serviceBulletinSermonSummary(rows = []) {
  const sermon = rows.find((row) => compactSearchValue(row.title) === "설교");
  return sermon?.entries.join(" · ") || "설교 내용을 입력해 주세요.";
}

function renderServiceBulletinWorkbench(service) {
  const rows = serviceBulletinOrderRows(service);
  const dateLabel = formatServiceDate(service);
  const prayerLeader = serviceBulletinPrayerLeader(service, rows);
  const sermonSummary = serviceBulletinSermonSummary(rows);
  return `
    <div class="service-bulletin-workbench">
      <header class="service-bulletin-toolbar">
        <div>
          <span class="service-bulletin-eyebrow">청년부 예배</span>
          <h2>주보 미리보기</h2>
        </div>
        <div class="service-bulletin-toolbar-actions">
          <button class="icon-btn" type="button" data-service-bulletin-action="close" data-service-id="${escapeAttr(service.id)}" aria-label="프레젠터로 돌아가기"><i data-lucide="arrow-left"></i></button>
          <button class="svc-output-action" type="button" data-service-bulletin-action="print" data-service-id="${escapeAttr(service.id)}"><i data-lucide="printer"></i><span>인쇄</span></button>
        </div>
      </header>
      <p class="service-bulletin-source-note">예배 순서와 대표기도자는 현재 예배·교회력 데이터를 그대로 사용합니다.</p>
      <div class="service-bulletin-pages" aria-label="청년부 양면 주보 미리보기">
        <article class="service-bulletin-page service-bulletin-page--front">
          <div class="service-bulletin-front-top">
            <span>${escapeHtml(dateLabel)}</span>
            <span>${escapeHtml(serviceDisplayTypeName(service))}</span>
          </div>
          <div class="service-bulletin-front-welcome">
            <p>오늘도 청년부 예배에 오신 여러분을 환영하고 축복합니다.</p>
            <h3>청년부 주보</h3>
          </div>
          <div class="service-bulletin-front-footer">
            <div>
              <span>이번 주 예배 위원</span>
              <strong>대표기도 ${escapeHtml(prayerLeader)}</strong>
            </div>
            <strong class="service-bulletin-mark">RIA</strong>
          </div>
        </article>
        <article class="service-bulletin-page service-bulletin-page--back">
          <header class="service-bulletin-back-head">
            <div><span>WORSHIP ORDER</span><h3>${escapeHtml(dateLabel)}</h3></div>
            <div><span>예배 위원</span><strong>대표기도 ${escapeHtml(prayerLeader)}</strong></div>
          </header>
          <div class="service-bulletin-back-body">
            <ol class="service-bulletin-order">
              ${rows.map((row) => `<li><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.entries.join(" · "))}</span></li>`).join("") || `<li><strong>예배 순서</strong><span>순서를 준비해 주세요.</span></li>`}
            </ol>
            <section class="service-bulletin-sermon-note">
              <span>말씀</span>
              <strong>${escapeHtml(sermonSummary)}</strong>
              <div class="service-bulletin-note-lines" aria-hidden="true"></div>
            </section>
          </div>
        </article>
      </div>
    </div>`;
}

function renderPresenterDashboard() {
  const services = getRecentServiceShortcuts(12);
  refs.detailPane.innerHTML = `
    <div class="service-dashboard presenter-dashboard">
      <section class="service-dashboard-section">
        <div class="service-section-head">
          <div>
            <h2 class="service-date-list-title">프레젠터</h2>
            <p class="service-week-range">송출할 예배를 선택하세요.</p>
          </div>
        </div>
        ${services.length ? `<div class="service-date-grid service-date-grid--dashboard">
          ${services.map((service) => renderServiceDateCard(service, { showType: true })).join("")}
        </div>` : `<p class="service-no-results">최근 예배가 없습니다.</p>`}
      </section>
    </div>`;
  refreshIcons();
  updateSaveState();
}

function openPresenterSectionEditorForSlide(serviceId, slideIndex) {
  const slides = presenterSlidesForService(serviceId);
  const slide = slides[slideIndex];
  if (!slide) return;
  openPresenterSectionEditor(serviceId, {
    itemId: slide.elementId || slide.sectionId || "",
    sectionKey: presenterSlideElementGroupKey(slide),
  });
}

function openPresenterSectionEditor(serviceId = state.selectedServiceId, options = {}) {
  if (!serviceId) return;
  state.presenterSectionEditor = {
    serviceId,
    itemId: options.itemId || "",
    sectionKey: options.sectionKey || "",
  };
  renderCurrentServiceModuleDetail();
}

function closePresenterSectionEditor() {
  state.presenterSectionEditor = null;
  renderCurrentServiceModuleDetail();
}

function presenterSectionEditorContext(service) {
  const editor = state.presenterSectionEditor;
  if (!editor || editor.serviceId !== service?.id) return null;
  const items = servicePrepEditorItems(service.id);
  const rawItems = getServiceItems(service.id);
  const target = items.find((item) => item.id === editor.itemId) || null;
  const groupKey = target ? presenterSectionEditorGroupKey(target) : editor.sectionKey;
  const sectionItems = items.filter((item) => presenterSectionEditorMatches(item, groupKey, target));
  if (!sectionItems.length) return null;
  return {
    service,
    rawItems,
    items,
    groupKey,
    sectionItems,
    sectionTitle: presenterSectionEditorTitle(sectionItems),
  };
}

function presenterSectionEditorGroupKey(item = {}) {
  if (isMainPraiseServiceItem(item)) return "main-praise";
  if (item._worshipSectionId) return `section-id:${item._worshipSectionId}`;
  if (item._worshipSectionKey) return `section-key:${item._worshipSectionKey}`;
  return serviceEditorGroupInfo(item).key || `item:${item.id || ""}`;
}

function presenterSectionEditorMatches(item = {}, groupKey = "", target = null) {
  if (!groupKey) return target ? item.id === target.id : false;
  if (groupKey.startsWith("main-praise")) return isMainPraiseServiceItem(item);
  if (groupKey === "section-key:closing_visual") return ["closing_visual", "closing_hymn"].includes(item._worshipSectionKey);
  if (groupKey.startsWith("section-id:")) return item._worshipSectionId === groupKey.replace(/^section-id:/, "");
  if (groupKey.startsWith("section-key:")) return item._worshipSectionKey === groupKey.replace(/^section-key:/, "");
  return presenterSectionEditorGroupKey(item) === groupKey || item.id === groupKey;
}

function presenterSectionEditorTitle(items = []) {
  const first = items[0] || {};
  if (isMainPraiseServiceItem(first)) return first._worshipSectionTitle || "찬양";
  return first._worshipSectionTitle || first.label || "섹션";
}

function renderPresenterSectionEditorLayer(service) {
  const context = presenterSectionEditorContext(service);
  if (!context) return "";
  return `
    <div class="presenter-section-editor-layer" data-presenter-section-editor>
      <section class="presenter-section-editor" role="dialog" aria-label="${escapeAttr(`${context.sectionTitle} 수정`)}">
        <header class="presenter-section-editor-head">
          <div>
            <span class="svc-prep-editor-kicker">Section</span>
            <h3>${escapeHtml(context.sectionTitle)}</h3>
          </div>
          <button class="icon-btn" type="button" data-presenter-section-editor-close aria-label="편집기 닫기">
            <i data-lucide="x"></i>
          </button>
        </header>
        <div class="presenter-section-editor-body">
          <label class="presenter-section-editor-field">
            <span>섹션 이름</span>
            <input type="text" data-presenter-section-field="label" value="${escapeAttr(context.sectionTitle)}" />
          </label>
          <div class="presenter-section-editor-list">
            ${context.sectionItems.map((item, localIndex) => renderPresenterSectionEditorItem(item, localIndex, context)).join("")}
          </div>
          <div class="presenter-section-editor-add">
            <select data-presenter-section-new-type aria-label="새 엘리멘트 타입">
              ${renderServiceElementTypeOptions("")}
            </select>
            <input type="text" data-presenter-section-new-name placeholder="새 엘리멘트 이름" aria-label="새 엘리멘트 이름" />
            <button class="reference-new-btn" type="button" data-presenter-section-add>
              <i data-lucide="plus"></i>
              <span>추가</span>
            </button>
          </div>
        </div>
      </section>
    </div>`;
}

function renderPresenterSectionEditorItem(item, localIndex, context) {
  const origIndex = item._origIndex;
  const model = serviceItemEditorModel(item, { service: context.service });
  const first = localIndex === 0;
  const last = localIndex === context.sectionItems.length - 1;
  return `
    <article class="presenter-section-editor-item">
      <span class="svc-edit-order">${localIndex + 1}</span>
      <input class="svc-edit-label" type="text" data-service-item-field="label" data-service-item-index="${origIndex}" value="${escapeAttr(item.label || "")}" aria-label="엘리멘트 이름" />
      ${renderServiceEditorAssigneeControl(item, origIndex, { service: context.service }, model)}
      ${renderServiceEditorTitleControl(item, origIndex, { service: context.service }, model)}
      <select class="presenter-section-editor-type" data-service-item-field="element_type" data-service-item-index="${origIndex}" aria-label="엘리멘트 타입">
        ${renderServiceElementTypeOptions(serviceMemoElementType(model.parsed))}
      </select>
      <div class="svc-edit-actions">
        <button class="icon-btn" type="button" data-presenter-section-item-action="up" data-service-item-index="${origIndex}" ${first ? "disabled" : ""} aria-label="엘리멘트 위로 이동"><i data-lucide="arrow-up"></i></button>
        <button class="icon-btn" type="button" data-presenter-section-item-action="down" data-service-item-index="${origIndex}" ${last ? "disabled" : ""} aria-label="엘리멘트 아래로 이동"><i data-lucide="arrow-down"></i></button>
        <button class="icon-btn danger" type="button" data-presenter-section-item-action="delete" data-service-item-index="${origIndex}" aria-label="엘리멘트 삭제"><i data-lucide="trash-2"></i></button>
      </div>
    </article>`;
}

function renderServicePrepEditorDialog(service) {
  const items = servicePrepEditorItems(service.id);
  const typeObj = serviceTypeById(service.type_id);
  return `
    <div class="svc-prep-editor-layer" role="presentation">
      <section class="svc-prep-editor" role="dialog" aria-labelledby="svcPrepEditorTitle">
        <header class="svc-prep-editor-head">
          <div>
            <span class="svc-prep-editor-kicker">${escapeHtml(formatServiceIsoDate(service))}</span>
            <h3 id="svcPrepEditorTitle">${escapeHtml(serviceDisplayTypeName(service))}</h3>
          </div>
          <div class="svc-prep-editor-head-actions">
            <button class="reference-new-btn" type="button" data-service-item-action="add" data-service-item-index="${escapeAttr(getServiceItems(service.id).length)}" aria-label="순서 항목 추가">
              <i data-lucide="plus"></i>
              <span>항목 추가</span>
            </button>
            <button class="icon-btn" type="button" data-service-prep-editor-close aria-label="편집창 닫기">
              <i data-lucide="x"></i>
            </button>
          </div>
        </header>
        <div class="svc-prep-editor-body">
          <div class="svc-authoring-tools">
            ${renderServiceAuthoringPanel("Service", "예배 정보", renderServiceMetaEditor(service))}
            ${renderServiceAuthoringPanel("Section", "기본 섹션 추가", renderServiceOrderTemplate(typeObj))}
          </div>
          <section class="svc-prep-editor-section" aria-label="예배 순서 편집">
            ${renderServiceEditorHeader("")}
            <div class="svc-editor-items">
              ${renderServiceItemGroups(items)}
            </div>
          </section>
        </div>
        ${renderPresenterSectionEditorLayer(service)}
      </section>
    </div>`;
}

function openServicePrepEditor(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  state.servicePrepEditorOpenId = serviceId;
  renderServiceDetail();
  requestAnimationFrame(() => {
    focusFirstServicePrepEditorControl();
  });
}

function closeServicePrepEditor(options = {}) {
  const serviceId = state.servicePrepEditorOpenId;
  if (!serviceId) return;
  state.servicePrepEditorOpenId = null;
  renderServiceDetail();
  if (options.restoreFocus === false) return;
  requestAnimationFrame(() => {
    refs.detailPane
      ?.querySelector(`[data-service-prep-editor-open="${cssEscape(serviceId)}"]`)
      ?.focus?.({ preventScroll: true });
  });
}

function focusFirstServicePrepEditorControl() {
  const dialog = refs.detailPane?.querySelector(".svc-prep-editor");
  const target = dialog?.querySelector("[data-service-prep-editor-close], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
  target?.focus?.({ preventScroll: true });
}

function handleServicePrepEditorKeydown(event) {
  if (!state.servicePrepEditorOpenId) return false;
  const dialog = refs.detailPane?.querySelector(".svc-prep-editor");
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeServicePrepEditor();
    return true;
  }
  if (event.key !== "Tab" || !dialog) return false;

  const focusable = [...dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")]
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== "hidden";
    });
  if (!focusable.length) return false;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!dialog.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}

function servicePrepEditorItems(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  return normalizeServiceItemsForTemplateHierarchy(service, normalizeServiceItems(getServiceItems(serviceId)), {
    preserveSourceIndex: true,
  })
    .map((item, index) => ({
      ...item,
      _isDefault: false,
      _origIndex: Number.isInteger(item._serviceItemIndex) ? item._serviceItemIndex : index,
    }));
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
    element.song_id ? "찬양 연결" : "",
    element.scripture_reference || element.scripture_id ? "말씀 연결" : "",
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
  return serviceTagsWithoutPraiseTeam(service?.tags || [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && tag !== "PPT 확인" && tag !== "2·3부 통합");
}

function parseServicePraiseTeamTag(tag) {
  const text = String(tag || "").trim();
  const match = text.match(/^(?:찬양\s*(?:팀|단)|praise\s*team)\s*[:：]\s*(.+)$/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function isServicePraiseTeamTag(tag) {
  return Boolean(parseServicePraiseTeamTag(tag));
}

function serviceTagsWithoutPraiseTeam(tags = []) {
  return (Array.isArray(tags) ? tags : []).filter((tag) => !isServicePraiseTeamTag(tag));
}

function servicePraiseTeamName(service) {
  return (Array.isArray(service?.tags) ? service.tags : [])
    .map(parseServicePraiseTeamTag)
    .find(Boolean) || "";
}

function serviceDefaultMainPraiseTeamName(service) {
  const typeId = worshipAppServiceTypeId(service?.type_id);
  if (typeId === "monthly") return "썸프레이즈";
  if (typeId === "sunday-main") {
    const context = compactSearchValue([
      service?.title,
      ...(Array.isArray(service?.tags) ? service.tags : []),
    ].filter(Boolean).join(" "));
    return context.includes("온세대") || context.includes("찬양예배")
      ? "테힐라 찬양단"
      : "헤세드 찬양단";
  }
  return "";
}

function serviceMainPraiseTeamName(service, fallback = "") {
  return servicePraiseTeamName(service) || serviceDefaultMainPraiseTeamName(service) || cleanServiceAssignee(fallback);
}

function setServicePraiseTeamName(service, value) {
  if (!service) return;
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  const tags = serviceTagsWithoutPraiseTeam(service.tags || []);
  service.tags = clean ? [`찬양팀: ${clean}`, ...tags] : tags;
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
      ${leaderHidden ? "" : `
      <label>
        <span>찬양 인도자</span>
        <input class="svc-meta-input" type="text" data-service-meta-field="leader"
          value="${escapeAttr(servicePraiseLeaderLabel(service))}"
          placeholder="이름/직분"
          aria-label="찬양 인도자" />
      </label>`}
      <label>
        <span>찬양팀</span>
        <input class="svc-meta-input" type="text" data-service-meta-field="praiseTeam"
          value="${escapeAttr(servicePraiseTeamName(service))}"
          placeholder="OOO 찬양단"
          aria-label="찬양팀" />
      </label>
      <label>
        <span>비고</span>
        <input class="svc-meta-input" type="text" data-service-meta-field="tags"
          value="${escapeAttr(serviceVisibleTags(service).join(", "))}"
          placeholder="온세대 찬양예배, 2·3부 통합..."
          aria-label="비고" />
      </label>
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
      </summary>
      <div class="svc-template-flow">
        ${template.map((step, index) => renderServiceTemplateStep(step, index, typeObj?.id)).join("")}
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
      const groupFirstModel = serviceItemEditorModel(groupFirst, { service: selectedService });
      html += `<div class="svc-group${group.kind === "main-praise" ? " svc-group--praise" : ""}">
        <div class="svc-group-head">
          <span class="svc-edit-order">${groupNum}</span>
          <span class="svc-group-label-wrap">
            <span class="svc-group-label">${escapeHtml(group.label)}</span>
            ${renderServiceTemplateBadge(selectedService?.type_id, groupFirst)}
            ${renderServiceEditorFormControls(groupFirst, groupFirstIndex, groupFirstModel, { compact: true, placeholder: "송폼/범위" })}
          </span>
          ${group.kind === "main-praise" && serviceUsesPraiseLeader(selectedService?.type_id) ? `
            <input
              class="svc-group-assignee svc-group-assignee-input"
              type="text"
              data-service-meta-field="leader"
              value="${escapeAttr(servicePraiseLeaderLabel(selectedService))}"
              placeholder="인도자"
              aria-label="찬양 인도자"
            />`
            : group.assignee ? `<span class="svc-group-assignee">${escapeHtml(group.assignee)}</span>` : ""}
        </div>
        ${renderServiceItemMemoEditor(groupFirst, groupFirstIndex, { compact: true })}`;
      for (const { item, mergedIndex } of group.entries) {
        const origIndex = item._origIndex;
        const upDisabled = findAdjacentSameType(items, mergedIndex, -1) === -1;
        const downDisabled = findAdjacentSameType(items, mergedIndex, 1) === -1;
        const localNumber = group.entries.findIndex((entry) => entry.item === item && entry.mergedIndex === mergedIndex) + 1;
        const subModel = serviceItemEditorModel(item, { service: selectedService });
        html += `
        <article class="svc-edit-item svc-edit-item--sub${group.kind === "main-praise" ? " svc-edit-item--praise-sub" : ""}">
          ${group.kind === "main-praise" ? "" : renderServiceEditorAssigneeControl(item, origIndex, { service: selectedService }, subModel)}
          <div class="svc-edit-title-wrap${subModel.strictSong ? " svc-edit-title-wrap--song" : ""}${subModel.titleInvalid ? " is-invalid" : ""}">
            <span class="svc-subsection-chip">${escapeHtml(`${group.label} ${localNumber}`)}</span>
            ${subModel.showTitle ? `
              <input
                class="svc-edit-title${subModel.titleInvalid ? " is-invalid" : ""}"
                type="text"
                data-service-item-field="raw_title"
                data-service-item-index="${origIndex}"
                value="${escapeAttr(item.raw_title || "")}"
                placeholder="${escapeAttr(subModel.titlePlaceholder)}"
                ${subModel.song && !subModel.strictSong ? `list="servicePraiseOptions"` : ""}
                ${subModel.scripture ? `list="serviceScriptureOptions"` : ""}
                ${subModel.strictSong ? `data-service-song-required="true"` : ""}
                ${subModel.titleInvalid ? `aria-invalid="true"` : ""}
                aria-label="항목 내용"
              />`
              : `<span class="svc-edit-empty" aria-hidden="true"></span>`}
            ${renderServiceSongPicker(item, origIndex, subModel)}
            ${renderServiceEditorFormControls(item, origIndex, subModel, { compact: true, placeholder: "송폼" })}
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

function renderServiceEditorLabelCell(item, origIndex, attrs = {}, model = serviceItemEditorModel(item, attrs)) {
  const isDefault = Boolean(attrs.isDefault);
  const fieldAttr = attrs.fieldAttr || "data-service-item-field";
  const indexAttr = attrs.indexAttr || "data-service-item-index";
  const service = model.service || selectedServiceForEditor();
  if (model.showLabelInput) {
    return `
      <input
        class="svc-edit-label"
        type="text"
        ${fieldAttr}="label"
        ${indexAttr}="${origIndex}"
        value="${escapeAttr(item.label || "")}"
        placeholder="${isDefault ? "섹션" : "찬양"}"
        aria-label="${isDefault ? "기본 섹션" : "섹션"}"
      />`;
  }
  return `
    <span class="svc-edit-label svc-edit-label--static">${escapeHtml(item.label || "항목")}</span>
    ${renderServiceTemplateBadge(service?.type_id, item)}
    ${model.showTitle ? "" : renderServiceEditorFormControls(item, origIndex, model)}`;
}

function renderServiceEditorFormControls(item, origIndex, model = serviceItemEditorModel(item), options = {}) {
  const parsed = model.parsed || parseServiceItemMemo(item?.memo);
  const hasFormData = Boolean(parsed.formHint || parsed.formPreset || parsed.formPresetRules?.length);
  if (!model.song && !hasFormData) return "";
  return `
    ${renderServiceFormHintInput(item, origIndex, options)}
    ${renderServiceFormPresetBadges(item, options)}`;
}

function renderServiceEditorAssigneeControl(item, origIndex, attrs = {}, model = serviceItemEditorModel(item, attrs)) {
  if (!model.showAssignee) return `<span class="svc-edit-empty" aria-hidden="true"></span>`;
  const fieldAttr = attrs.fieldAttr || "data-service-item-field";
  const indexAttr = attrs.indexAttr || "data-service-item-index";
  return `
    <input
      class="svc-edit-assignee"
      type="text"
      ${fieldAttr}="assignee"
      ${indexAttr}="${origIndex}"
      value="${escapeAttr(model.assigneeValue || "")}"
      placeholder="${escapeAttr(inferServiceItemAssignee(item))}"
      aria-label="${attrs.isDefault ? "기본 항목 담당" : "항목 담당"}"
    />`;
}

function renderServiceEditorTitleControl(item, origIndex, attrs = {}, model = serviceItemEditorModel(item, attrs)) {
  const fieldAttr = attrs.fieldAttr || "data-service-item-field";
  const indexAttr = attrs.indexAttr || "data-service-item-index";
  const listAttr = model.song
    ? (model.strictSong ? "" : `list="servicePraiseOptions"`)
    : model.scripture
      ? `list="serviceScriptureOptions"`
      : "";
  const invalidAttr = model.titleInvalid ? ` aria-invalid="true"` : "";
  const invalidClass = model.titleInvalid ? " is-invalid" : "";
  const strictAttr = model.strictSong ? ` data-service-song-required="true"` : "";
  if (!model.showTitle) {
    return `<div class="svc-edit-title-wrap svc-edit-title-wrap--empty">${renderServiceItemLinkControl(item, origIndex)}</div>`;
  }
  return `
    <div class="svc-edit-title-wrap${model.strictSong ? " svc-edit-title-wrap--song" : ""}${invalidClass}">
      <input
        class="svc-edit-title${invalidClass}"
        type="text"
        ${fieldAttr}="raw_title"
        ${indexAttr}="${origIndex}"
        value="${escapeAttr(model.titleValue || (model.strictSong ? "" : item.raw_title || ""))}"
        placeholder="${escapeAttr(model.titlePlaceholder)}"
        ${listAttr}
        ${strictAttr}
        ${invalidAttr}
        aria-label="${attrs.isDefault ? "기본 항목 내용" : "항목 내용"}"
      />
      ${renderServiceSongPicker(item, origIndex, model)}
      ${attrs.hideFormControls ? "" : renderServiceEditorFormControls(item, origIndex, model, { compact: true, placeholder: "송폼" })}
      ${renderServiceItemLinkControl(item, origIndex)}
    </div>`;
}

function renderServiceSongPicker(item, index, model = serviceItemEditorModel(item)) {
  if (!model.strictSong) return "";
  const song = model.linkedSong;
  const query = String(item?.raw_title || "").trim();
  const versionPicker = renderServiceSongVersionPicker(item, index, model);
  if (song) {
    const typeWarning = serviceItemRequiresNewHymnalScoreSong(item) && !isNewHymnalScoreSong(song)
      ? `<span class="svc-song-picker-warning">새찬송가 곡만 선택 가능</span>`
      : "";
    return `
      <div class="svc-song-picker svc-song-picker--linked">
        ${versionPicker}
        ${typeWarning}
        <button class="svc-song-clear" type="button" data-service-song-clear="${index}" aria-label="곡 연결 해제">변경</button>
      </div>`;
  }
  if (!query) {
    const modeHint = serviceItemRequiresNewHymnalScoreSong(item) ? "새찬송가에서 검색" : "찬양 DB에서 검색";
    return `<div class="svc-song-picker svc-song-picker--hint"><span class="svc-song-picker-hint">${escapeHtml(modeHint)}</span></div>`;
  }
  const results = serviceSongPickerResults(query, item, model.service);
  if (!results.length) {
    return `<div class="svc-song-picker"><span class="svc-song-picker-warning">검색 결과 없음</span></div>`;
  }
  return `
    <div class="svc-song-picker" role="listbox" aria-label="찬양 검색 결과">
      ${results.map((songResult) => renderServiceSongPickerResult(songResult, index)).join("")}
    </div>`;
}

function renderServiceSongVersionPicker(item, index, model = serviceItemEditorModel(item)) {
  const versions = model.songVersions || [];
  if (versions.length <= 1) return "";
  const selectedId = item.version_id || item.song_version_id || "";
  return `
    <select
      class="svc-song-version-select${selectedId ? "" : " is-invalid"}"
      data-service-item-field="version_id"
      data-service-item-index="${index}"
      aria-label="찬양 버전"
      ${selectedId ? "" : `aria-invalid="true"`}
    >
      <option value="">버전 선택</option>
      ${versions.map((version) => `
        <option value="${escapeAttr(version.id)}"${version.id === selectedId ? " selected" : ""}>
          ${escapeHtml(versionDisplayName(model.linkedSong, version))}
        </option>
      `).join("")}
    </select>`;
}

function serviceSongPickerResults(query, item = {}, service = selectedServiceForEditor(), limit = 6) {
  const tokens = getSearchTokens(query);
  if (!tokens.length) return [];
  const requiresNewHymnal = serviceItemRequiresNewHymnalScoreSong(item);
  const candidates = state.songs
    .filter((song) => !requiresNewHymnal || isNewHymnalScoreSong(song))
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens) }))
    .filter((entry) => entry.match);
  const phraseMatches = candidates.filter((entry) => entry.match.phraseMatched);
  const results = phraseMatches.length ? phraseMatches : candidates;
  return results
    .sort((a, b) => b.match.score - a.match.score || sortSongsForCurrentList(a.song, b.song))
    .slice(0, limit)
    .map((entry) => entry.song);
}

function renderServiceSongPickerResult(song, index) {
  const meta = joinMetaItems([
    song.subtitle,
    song.original_title,
    songPraiseTypes(song).join(" · "),
  ]);
  return `
    <button
      class="svc-song-picker-result"
      type="button"
      data-service-song-select="${escapeAttr(song.id)}"
      data-service-song-index="${index}"
      role="option"
    >
      <strong>${escapeHtml(songServiceOptionLabel(song) || song.title || "제목 없음")}</strong>
      ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
    </button>`;
}

function renderServiceEditorItem(item, mergedIndex, mergedItems, groupNum) {
  const isDefault = item._isDefault;
  const origIndex = item._origIndex;
  const actionAttr = isDefault ? "data-service-default-action" : "data-service-item-action";
  const indexAttr = isDefault ? "data-service-default-index" : "data-service-item-index";
  const fieldAttr = isDefault ? "data-service-default-field" : "data-service-item-field";
  const upDisabled = findAdjacentSameType(mergedItems, mergedIndex, -1) === -1;
  const downDisabled = findAdjacentSameType(mergedItems, mergedIndex, 1) === -1;
  const model = serviceItemEditorModel(item, { isDefault, service: selectedServiceForEditor() });
  const attrs = { isDefault, fieldAttr, indexAttr, service: model.service };
  return `
    <article class="svc-edit-item${isDefault ? " svc-edit-item--default" : ""}">
      <span class="svc-edit-order">${groupNum || mergedIndex + 1}</span>
      <span class="svc-edit-section-cell">
        ${renderServiceEditorLabelCell(item, origIndex, attrs, model)}
      </span>
      ${renderServiceEditorAssigneeControl(item, origIndex, attrs, model)}
      ${renderServiceEditorTitleControl(item, origIndex, attrs, model)}
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
  const generatedScriptureSlides = Boolean(isScriptureBodyServiceItem(item) && parsed.scriptureReference && parsed.slides.length);
  const operationalSettings = Boolean(
    preparation
    || parsed.note
    || (parsed.slides.length && !generatedScriptureSlides)
    || parsed.formHint
    || parsed.formPreset
    || parsed.formPresetRules?.length
    || hasServiceAsset(parsed.asset)
    || parsed.presenterRole
    || parsed.playback?.autoAdvanceAt
  );
  if (!operationalSettings) return "";
  const assetNameLabel = elementType === "image" ? "이미지명" : elementType === "audio" ? "음원명" : "파일명";
  const assetNamePlaceholder = elementType === "image" ? "예배 첫 슬라이드 이미지" : elementType === "audio" ? "MR · 성가대 음원 · 광고 BGM" : "준비 영상";
  const assetUrlPlaceholder = elementType === "image" ? "assets/.../first-slide.jpg" : elementType === "audio" ? "assets/.../song.mp3 또는 YouTube 링크" : "assets/.../ready.mp4";
  const autoAdvanceAt = String(parsed.playback?.autoAdvanceAt || "").trim();
  const hasContent = Boolean(preparation || parsed.note || parsed.slides.length || parsed.formHint || parsed.formPreset || parsed.formPresetRules?.length || elementType || hasServiceAsset(parsed.asset) || parsed.presenterRole || autoAdvanceAt);
  const summary = renderServiceItemMemoSummary({ parsed, preparation, elementType, autoAdvanceAt });
  return `
    <details class="svc-item-note${options.compact ? " compact" : ""}${hasContent ? " has-content" : ""}">
      <summary>
        <span>설정</span>
        ${summary}
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
          <span>설명</span>
          <input
            type="text"
            data-service-item-field="memo_note"
            data-service-item-index="${index}"
            value="${escapeAttr(parsed.note)}"
            placeholder="카메라 2 · 조명 낮게 · 마이크 4"
          />
        </label>
        <label>
          <span>역할</span>
          <select
            data-service-item-field="presenter_role"
            data-service-item-index="${index}"
          >
            ${renderPresenterRoleOptions(parsed.presenterRole)}
          </select>
        </label>
        <label>
          <span>자동 전환 시각</span>
          <input
            type="text"
            data-service-item-field="auto_advance_at"
            data-service-item-index="${index}"
            value="${escapeAttr(autoAdvanceAt)}"
            placeholder="10:40 또는 2026-07-12T10:40:00+09:00"
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

function renderServiceItemMemoSummary({ parsed, preparation, elementType, autoAdvanceAt } = {}) {
  const asset = normalizeServiceAsset(parsed?.asset);
  const role = normalizeServicePresenterRole(parsed?.presenterRole);
  const chips = [];
  cleanList([
    elementType ? worshipElementTypeLabel(elementType) : "",
    role ? presenterPreparationRoleLabel(role) : "",
    parsed?.note ? "설명" : "",
    autoAdvanceAt ? "자동 전환" : "",
    parsed?.slides?.length ? `슬라이드 ${parsed.slides.length}장` : "",
    parsed?.formHint || parsed?.formPreset || parsed?.formPresetRules?.length ? "송폼" : "",
    hasServiceAsset(asset) ? (asset.name || (asset.url ? "파일" : "")) : "",
    preparation && !role ? "준비" : "",
  ]).forEach((chip) => {
    if (!chips.some((existing) => compactSearchValue(existing) === compactSearchValue(chip))) chips.push(chip);
  });
  chips.splice(4);
  if (!chips.length) return `<span class="svc-item-note-summary is-empty">자동</span>`;
  return `
    <span class="svc-item-note-summary">
      ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
    </span>`;
}

function renderServiceElementTypeOptions(selectedType = "") {
  const selected = normalizeServiceElementType(selectedType) || normalizeWorshipElementType(selectedType);
  const visibleSelected = selected === "scripture_reading" ? "scripture_body" : selected;
  const options = [
    ["", "자동"],
    ["blank", "빈 화면"],
    ["title", "제목"],
    ["video", "동영상"],
    ["audio", "오디오"],
    ["image", "이미지"],
    ["score", "악보"],
    ["praise", "찬양"],
    ["scripture", "말씀"],
    ["scripture_body", "성경봉독"],
    ["title_person", "제목 / 담당자"],
    ["title_content", "제목 / 내용"],
    ["plain_text", "일반 텍스트"],
    ["body", "본문"],
    ["live_scripture", "실시간 성구"],
    ["template", "슬라이드 템플릿"],
    ["file", "파일"],
  ];
  return options
    .map(([value, label]) => `<option value="${escapeAttr(value)}"${value === visibleSelected ? " selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

function renderPresenterRoleOptions(selectedRole = "") {
  const selected = normalizeServicePresenterRole(selectedRole);
  const options = [
    ["", "자동"],
    ["ready", "준비"],
    ["waiting_loop", "대기 영상"],
    ["intro", "인트로"],
    ["still", "첫 화면"],
  ];
  return options
    .map(([value, label]) => `<option value="${escapeAttr(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}


function renderServicePraiseLinkControl(item, index) {
  if (!isSongServiceLabel(item?.label) && !isSpecialSongServiceItem(item)) return "";
  if (item?.song_id) {
    return `<button class="svc-item-link svc-item-link--linked" type="button" data-open-song="${escapeAttr(item.song_id)}" aria-label="찬양 DB에서 열기">찬양 DB</button>`;
  }
  if (isOneOffSpecialPraiseItem(item, selectedServiceForEditor())) {
    return `<span class="svc-item-link svc-item-link--manual" aria-label="일회성 특송">일회성</span>`;
  }
  if (serviceItemRequiresSongSelection(item, selectedServiceForEditor())) return "";
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

function isOneOffSpecialPraiseItem(item = {}, service = selectedServiceForEditor()) {
  return isSpecialSongServiceItem(item) && !item.song_id && serviceItemAllowsManualSongText(item, service);
}

function renderServiceScriptureLinkControl(item) {
  if (!isScriptureBodyServiceItem(item) && !isScriptureServiceLabel(item?.label)) return "";
  const parsed = parseServiceItemMemo(item?.memo);
  const payload = isScriptureBodyServiceItem(item) ? serviceScriptureTextPayload(item, parsed) : null;
  const reference = normalizeServiceItemReferenceSpacing(payload?.reference || item?.raw_title);
  if (!parseBibleReference(reference)) return "";
  return `<button class="svc-item-link" type="button" data-open-scripture-reference="${escapeAttr(reference)}" aria-label="말씀에서 열기">말씀</button>`;
}

function renderServiceDashboard() {
  if (!state.serviceTypes.length) {
    refs.detailPane.innerHTML = state.serviceError
      ? renderUnavailableDetail("service", "예배", state.serviceError)
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
  const serviceName = serviceDisplayTypeName(service);
  return `
    <button
      class="service-date-card"
      type="button"
      data-service-id="${escapeAttr(service.id)}"
      aria-label="${escapeAttr(`${formatServiceDate(service, { compact: true })} ${serviceName} 열기`)}"
    >
      <span class="service-date-card-top">
        <span class="service-date-card-date">${escapeHtml(formatServiceDate(service, { compact: true }))}</span>
        <span class="service-date-card-open">열기</span>
      </span>
      ${options.showType ? `<span class="service-date-card-type">${escapeHtml(serviceName)}</span>` : ""}
      ${note ? `<span class="service-date-card-note">${escapeHtml(note)}</span>` : ""}
      ${preview ? `<span class="service-date-card-preview">${escapeHtml(preview)}</span>` : `<span class="service-date-card-preview">순서 확인</span>`}
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

function homeServicePrepSummary(serviceId) {
  const slides = buildServicePresenterSlides(serviceId);
  const missingCount = slides.filter((slide) => slide?.missingContent).length;
  const preview = serviceItemPreview(serviceId) || "순서 구성 필요";
  const slideCount = slides.length;
  const status = missingCount
    ? `${missingCount}개 입력 필요`
    : slideCount
      ? `준비됨 · ${slideCount} 슬라이드`
      : "슬라이드 없음";
  return { preview, missingCount, slideCount, status };
}

function serviceItemDisplayText(item) {
  const service = state.services.find((candidate) => candidate.id === item?.service_id) || null;
  item = serviceItemWithSharedSundayContent(item, service);
  const linkedSong = serviceItemLinkedSong(item);
  if (linkedSong) return songServiceOptionLabel(linkedSong) || cleanSongTitleForSave(linkedSong) || linkedSong.title || "";
  const rawTitle = String(item?.raw_title || "").trim();
  if (rawTitle) {
    const contentTitle = serviceItemContentTitleWithoutElementName(item, rawTitle);
    return normalizeServiceItemReferenceSpacing(contentTitle ?? rawTitle);
  }
  return normalizeServiceItemReferenceSpacing(String(item?.label || "").trim());
}

function serviceItemContentTitleWithoutElementName(item = {}, rawTitle = "") {
  const memo = parseServiceItemMemo(item.memo);
  if (serviceMemoElementType(memo) !== "title_content") return null;
  const labelKey = compactSearchValue(item.label || "");
  if (!labelKey) return null;
  const lines = String(rawTitle || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || compactSearchValue(lines[0]) !== labelKey) return null;
  return lines.slice(1).join("\n");
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
  if (/기도회|통성기도/.test(label)) return "통성기도";
  if (/자율기도/.test(label)) return "자율기도";
  if (/봉헌/.test(label)) return "봉헌";
  if (/축도/.test(label)) return "축도";
  if (/찬양|찬송/.test(label)) return "찬양";
  return "";
}

function normalizeServiceItemReferenceSpacing(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const references = normalizeServiceScriptureReferenceList(text);
  if (references.length > 1) return formatServiceScriptureReferenceList(references);

  const wholeReference = parseBibleReference(text);
  if (wholeReference) return formatServiceBibleReference(wholeReference, text);

  return text
    .replace(/([1-3]?\s?[A-Za-z가-힣.]{1,16})\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–—~]\s*(\d{1,3}))?/g, (match, book, chapter, verse, verseEnd) =>
      formatServiceBibleReferenceMatch(book, chapter, verse, verseEnd) || match)
    .replace(/\s+/g, " ");
}

function normalizeServiceScriptureReferenceList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\n;；]/);
  return uniqueList(mergeConsecutiveServiceScriptureReferences(source.flatMap(expandServiceScriptureReferenceText)));
}

function formatServiceScriptureReferenceList(value) {
  const references = normalizeServiceScriptureReferenceList(value);
  return references.reduce((formatted, referenceText, index) => {
    const reference = parseBibleReference(referenceText);
    const previous = index > 0 ? parseBibleReference(references[index - 1]) : null;
    if (!reference) {
      const separator = index ? "; " : "";
      return `${formatted}${separator}${referenceText}`;
    }
    const versePart = reference.verse
      ? `${reference.chapter}:${reference.verse}${reference.verseEnd ? `–${reference.verseEnd}` : ""}`
      : String(reference.chapter);
    const sameBookAndChapter = previous
      && previous.book?.code === reference.book?.code
      && previous.chapter === reference.chapter;
    const display = sameBookAndChapter
      ? versePart.replace(`${reference.chapter}:`, "")
      : formatServiceBibleReference(reference, referenceText);
    const separator = index ? (sameBookAndChapter ? ", " : "; ") : "";
    return `${formatted}${separator}${display}`;
  }, "");
}

function mergeConsecutiveServiceScriptureReferences(references = []) {
  return references.reduce((merged, referenceText) => {
    const reference = parseBibleReference(referenceText);
    const previousText = merged.at(-1);
    const previous = previousText ? parseBibleReference(previousText) : null;
    if (
      reference?.book?.code
      && previous?.book?.code === reference.book.code
      && previous.chapter === reference.chapter
      && previous.verse
      && reference.verse
      && reference.verse === ((previous.verseEnd || previous.verse) + 1)
    ) {
      merged[merged.length - 1] = formatServiceBibleReference({
        ...previous,
        verseEnd: reference.verseEnd || reference.verse,
      }, previousText);
      return merged;
    }
    merged.push(referenceText);
    return merged;
  }, []);
}

function expandServiceScriptureReferenceText(value = "") {
  const parts = String(value || "")
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const references = [];
  let lastBookName = "";
  let lastChapter = null;

  for (const part of parts) {
    const candidates = [part];
    if (lastBookName) {
      if (lastChapter && /^\d{1,3}(?:\s*[-–—~]\s*\d{1,3})?$/.test(part)) {
        candidates.push(`${lastBookName} ${lastChapter}:${part}`);
      }
      candidates.push(`${lastBookName} ${part}`);
    }
    const reference = candidates.map(parseBibleReference).find(Boolean);
    if (!reference) continue;
    references.push(formatServiceBibleReference(reference, part));
    lastBookName = KOREAN_BIBLE_BOOK_ABBREVIATIONS[reference.book.code]
      || reference.book.shortName
      || reference.book.koreanName
      || reference.book.code;
    lastChapter = reference.chapter || lastChapter;
  }

  return references;
}

function serviceItemSupportsScriptureReferenceList(item = {}) {
  return compactSearchValue(item.label || "") === "인용구절"
    || isSermonScriptureBodyServiceItem(item)
    || isSharedScriptureReadingServiceItem(item);
}

function markServiceItemSharedContentDirty(item = {}, service = null) {
  if (!item || !sundaySharedContentKey(item) || !sundaySharedContentTypesForItem(item, service).length) return;
  item._worshipSharedContentDirty = true;
}

function sundaySharedContentKey(item = {}) {
  const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
  const label = compactSearchValue(item?.label || item?.raw_title || "");
  const praiseMatch = label.match(/^찬양(\d+)$/);
  if (sectionKey === "praise" && praiseMatch && Number(praiseMatch[1]) >= 1 && Number(praiseMatch[1]) <= 3) {
    return `main-praise:${Number(praiseMatch[1])}`;
  }
  if (sectionKey === "scripture_reading" && label === "성경봉독") return "scripture-reading";
  if (sectionKey === "sermon" && ["설교", "설교제목"].includes(label)) return "sermon-title";
  if (sectionKey === "sermon" && ["설교본문", "본문", "성경본문"].includes(label)) return "sermon-scripture";
  if (sectionKey === "sermon" && /^인용구절(\d*)$/.test(label)) {
    const match = label.match(/^인용구절(\d*)$/);
    return `sermon-citation:${match?.[1] ? Number(match[1]) : 1}`;
  }
  if (sectionKey === "offering" && label === "봉헌찬송") return "offering-hymn";
  return "";
}

function sundaySharedContentTypesForItem(item = {}, service = null) {
  const typeId = worshipAppServiceTypeId(service?.type_id);
  const key = sundaySharedContentKey(item);
  if (!key) return [];
  if (key.startsWith("main-praise:") && ["sunday-first", "sunday-second"].includes(typeId)) {
    return ["sunday-first", "sunday-second"];
  }
  if ((["scripture-reading", "sermon-title", "sermon-scripture"].includes(key) || key.startsWith("sermon-citation:")) && ["sunday-second", "sunday-main"].includes(typeId)) {
    return ["sunday-second", "sunday-main"];
  }
  if (key === "offering-hymn" && ["sunday-first", "sunday-second", "sunday-main"].includes(typeId)) {
    return ["sunday-first", "sunday-second", "sunday-main"];
  }
  return [];
}

function serviceItemHasDirectSundaySharedContent(item = {}, service = null) {
  const key = sundaySharedContentKey(item);
  if (!key) return false;
  const memo = parseServiceItemMemo(item?.memo);
  if (key === "scripture-reading" || key === "sermon-scripture" || key.startsWith("sermon-citation:")) {
    return Boolean(serviceItemDirectScriptureReferences(item, memo).length || serviceScriptureTextPayload(item, memo).verses.length);
  }
  if (key === "sermon-title") {
    const rawTitle = String(item?.raw_title || "").trim();
    const hasSpecificTitle = Boolean(rawTitle && !presenterTitleAssigneeTitleIsGeneric(rawTitle, item?.label || ""));
    return hasSpecificTitle;
  }
  if (key.startsWith("main-praise:") || key === "offering-hymn") {
    if (serviceItemRequiresSongSelection(item, service)) {
      return Boolean(item?.song_id && !serviceItemSongSelectionInvalid(item, service));
    }
    return Boolean(item?.song_id || String(item?.raw_title || "").trim() || (memo.slides || []).some((slide) => String(slide || "").trim()));
  }
  void service;
  return false;
}

function sharedSundayContentSourceItem(item = {}, service = null) {
  const key = sundaySharedContentKey(item);
  const serviceDate = String(service?.date || "").trim();
  const sharedTypes = sundaySharedContentTypesForItem(item, service);
  if (!key || !serviceDate || !sharedTypes.length || serviceItemHasDirectSundaySharedContent(item, service)) return null;
  const currentType = worshipAppServiceTypeId(service?.type_id);
  return sharedTypes
    .filter((typeId) => typeId !== currentType)
    .flatMap((typeId) => state.services.filter((candidate) =>
      worshipAppServiceTypeId(candidate.type_id) === typeId
      && String(candidate.date || "").trim() === serviceDate))
    .map((candidateService) => {
      const sourceItem = (state.serviceItems[candidateService.id] || []).find((candidate) => sundaySharedContentKey(candidate) === key);
      return sourceItem ? { item: sourceItem, service: candidateService } : null;
    })
    .find((entry) => entry && serviceItemHasDirectSundaySharedContent(entry.item, entry.service)) || null;
}

function serviceItemWithSharedSundayContent(item = {}, service = null) {
  const source = sharedSundayContentSourceItem(item, service);
  if (!source?.item) return item;
  const sourceItem = source.item;
  const key = sundaySharedContentKey(item);
  const next = { ...item };
  if (key === "scripture-reading" || key === "sermon-scripture" || key.startsWith("sermon-citation:")) {
    const memo = parseServiceItemMemo(item.memo);
    const references = serviceItemDirectScriptureReferences(sourceItem, parseServiceItemMemo(sourceItem.memo));
    if (references.length) {
      next.raw_title = formatServiceScriptureReferenceList(references);
      next.memo = serializeServiceItemMemo({
        ...memo,
        elementType: memo.elementType || "scripture_body",
        inputMode: memo.inputMode || "scripture",
        scriptureReference: references[0],
        scriptureReferences: references,
        slides: [],
      });
    }
    return next;
  }
  if (key === "sermon-title") {
    const currentTitle = String(next.raw_title || "").trim();
    const sourceTitle = String(sourceItem.raw_title || "").trim();
    if (!currentTitle || presenterTitleAssigneeTitleIsGeneric(currentTitle, next.label || "")) {
      next.raw_title = sourceTitle;
    }
    next.assignee = next.assignee || sourceItem.assignee || "";
    return next;
  }
  if (key.startsWith("main-praise:") || key === "offering-hymn") {
    next.song_id = next.song_id || sourceItem.song_id || "";
    next.version_id = next.version_id || sourceItem.version_id || sourceItem.song_version_id || "";
    next.song_version_id = next.song_version_id || sourceItem.song_version_id || sourceItem.version_id || "";
    next.raw_title = next.raw_title || sourceItem.raw_title || "";
  }
  return next;
}

function isSharedScriptureReadingServiceItem(item = {}) {
  return String(item?._worshipSectionKey || "").trim() === "scripture_reading"
    && compactSearchValue(item?.label || "") === "성경봉독";
}

function isSermonScriptureBodyServiceItem(item = {}) {
  const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
  const label = compactSearchValue(item?.label || "");
  const memo = parseServiceItemMemo(item?.memo);
  const elementType = serviceMemoElementType(memo);
  const citation = isOptionalCitationScriptureServiceItem(item);
  // A projected or newly pasted item can briefly lack its section metadata.
  // Its explicit sermon-body label must still retain the scripture workflow.
  return ["설교본문", "성경본문", "말씀본문"].includes(label)
    || (sectionKey === "sermon" && !citation && (elementType === "scripture_body" || label === "본문"));
}

function isOptionalCitationScriptureServiceItem(item = {}) {
  return /^인용구절\d*$/.test(compactSearchValue(item?.label || ""));
}

function serviceItemDirectScriptureReferences(item = {}, memo = parseServiceItemMemo(item.memo)) {
  const configured = normalizeServiceScriptureReferenceList(memo.scriptureReferences);
  const titleReferences = normalizeServiceScriptureReferenceList(item.raw_title);
  const references = preferCompleteServiceScriptureReferenceList(configured, titleReferences);
  if (references.length) return references;
  return normalizeServiceScriptureReferenceList(memo.scriptureReference);
}

function preferCompleteServiceScriptureReferenceList(configured = [], displayed = []) {
  if (!displayed.length) return configured;
  if (!configured.length || displayed.length > configured.length) return displayed;
  if (displayed.length < configured.length) return configured;
  return displayed.every((reference, index) => reference === configured[index]) ? configured : displayed;
}

function serviceScriptureReadingReferencesForService(service = null) {
  const serviceId = String(service?.id || "").trim();
  if (!serviceId) return [];
  const readingItem = (state.serviceItems[serviceId] || []).find((candidate) => isSharedScriptureReadingServiceItem(candidate));
  if (!readingItem) return [];
  return serviceItemScriptureReferences(readingItem, parseServiceItemMemo(readingItem.memo), service);
}

function serviceItemScriptureReferences(item = {}, memo = parseServiceItemMemo(item.memo), service = null) {
  const effectiveItem = serviceItemWithSharedSundayContent(item, service);
  const effectiveMemo = effectiveItem !== item ? parseServiceItemMemo(effectiveItem.memo) : memo;
  const direct = serviceItemDirectScriptureReferences(effectiveItem, effectiveMemo);
  if (!direct.length && isSermonScriptureBodyServiceItem(item)) {
    return serviceScriptureReadingReferencesForService(service);
  }
  return direct;
}

function normalizeServiceItemRawTitle(label, value) {
  const raw = String(value || "").trim();
  if (isSongServiceLabel(label) && compactSearchValue(raw) === compactSearchValue(label)) return "";
  return isScriptureServiceLabel(label) ? normalizeServiceItemReferenceSpacing(raw) : raw;
}

function normalizeServiceItemRawTitleForItem(item = {}, value = "") {
  const raw = String(value || "").trim();
  if (serviceItemSupportsScriptureReferenceList(item)) {
    const references = normalizeServiceScriptureReferenceList(raw);
    return references.length ? formatServiceScriptureReferenceList(references) : raw;
  }
  if (isSongServiceLabel(item?.label) && compactSearchValue(raw) === compactSearchValue(item?.label)) return "";
  return isScriptureBodyServiceItem(item) || isScriptureServiceLabel(item?.label)
    ? normalizeServiceItemReferenceSpacing(raw)
    : raw;
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

var SERVICE_PRAISE_TITLE_ALIASES;

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
    if (!SERVICE_PRAISE_TITLE_ALIASES) {
      SERVICE_PRAISE_TITLE_ALIASES = new Map([
        [normalizeTitle("내 안에 부어주소서"), "내 안에 부어 주소서"],
        [normalizeTitle("능력의 이름 예수"), "예수 예수"],
        [normalizeTitle("하나님의 뜻 이뤄지네 꿈꾸는 어린이부"), "하나님의 뜻 이뤄지네"],
        [normalizeTitle("모든 이름 위에 뛰어난 이름"), "이 땅 위에 오신"],
      ]);
    }
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

function stripHymnNo(raw) {
  const { no, title } = splitHymnNo(String(raw || "").trim());
  return { no, title: title === "—" ? "" : title };
}

function isMainPraiseServiceItem(item, options = {}) {
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  if (sectionKey) return sectionKey === "praise";
  const label = String(item?.label || "").trim();
  if (isMainPraiseLabel(label)) return true;
  return Boolean(options.allowUnlabeled && !label && String(item?.raw_title || "").trim());
}

function isMainPraiseLabel(label) {
  const compact = String(label || "").replace(/\s+/g, "");
  return /^찬양\d*$/.test(compact);
}

function servicePraiseAssignee(service, items = []) {
  if (!serviceUsesPraiseLeader(service?.type_id)) return "";
  const itemAssignee = items.map((item) => cleanServiceAssignee(item?.assignee)).find(Boolean);
  if (itemAssignee) return itemAssignee;
  const leader = servicePraiseLeaderLabel(service);
  if (leader) return leader;
  return "";
}

function servicePraiseBoardMetaCandidate(service, items = []) {
  const team = servicePraiseTeamName(service);
  if (team) return { text: team, priority: 3 };
  const introAssignee = items
    .map((item) => item?.praiseIntro ? cleanServiceAssignee(item.assignee) : "")
    .find(Boolean);
  if (introAssignee) return { text: introAssignee, priority: 2.75 };
  const itemAssignee = items.map((item) => cleanServiceAssignee(item?.assignee)).find(Boolean);
  if (itemAssignee && isPraiseTeamName(itemAssignee)) return { text: itemAssignee, priority: 2.6 };
  const leader = servicePraiseLeaderLabel(service);
  if (leader && isPraiseTeamName(leader)) return { text: leader, priority: 2.6 };
  const defaultTeam = serviceDefaultMainPraiseTeamName(service);
  if (defaultTeam) return { text: defaultTeam, priority: 2.5 };
  if (itemAssignee) return { text: `인도 ${itemAssignee}`, priority: 1 };
  if (!leader) return { text: "", priority: 0 };
  return { text: `인도 ${leader}`, priority: 1 };
}

function isPraiseTeamName(value = "") {
  return /(?:찬양\s*(?:팀|단)|성가대|콰이어|워십|밴드|썸프레이즈|praise\s*team|choir|worship|band|sum\s*praise|sumpraise)/i.test(String(value || ""));
}

function isServiceSeparatorItem(item) {
  return String(item?.label || "").trim() === "—" && !String(item?.raw_title || "").trim();
}

function isCreedServiceItem(item = {}) {
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  if (sectionKey === "creed") return true;
  const label = compactSearchValue(item?.label || "");
  const title = compactSearchValue(item?.raw_title || item?.title || "");
  return label === "사도신경" || (label === "신앙고백" && title === "사도신경");
}

function isCreedPresenterItem(item = {}, label = "", displayText = "") {
  if (isCreedServiceItem(item)) return true;
  const compactLabel = compactSearchValue(label || item?.label || "");
  const compactText = compactSearchValue(displayText || item?.raw_title || item?.title || "");
  return compactLabel === "사도신경" || (compactLabel === "신앙고백" && compactText === "사도신경");
}

function inferServiceItemAssignee(item) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  const note = String(item?.raw_title || "").trim();
  if (!label) return "";
  if (/특송/.test(label)) return "담당기관";
  if (/말씀|설교/.test(label)) return "담임목사";
  if (/성경봉독|교회소식|광고|예배기도|축복기도|축도/.test(label)) return "인도자";
  if (/^기도$/.test(label) && looksLikePersonOrGroup(note)) return "담당자";
  return "";
}

function looksLikePersonOrGroup(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /(목사|전도사|장로|권사|집사|청년|구역|전도회|기관|일동)$/.test(text);
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
    <button class="icon-btn" type="button" data-presenter-action="detect-screens" aria-label="${escapeAttr(uiText("presenter.action.detectDisplays"))}" title="${escapeAttr(uiText("presenter.action.detectDisplays"))}">
      <i data-lucide="monitor"></i>
    </button>`;
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
    ["출력 전체화면", "컨트롤러 F11 · 출력 창 F / Space / Enter"],
  ];
  return `
    <details class="svc-presenter-help" data-presenter-help>
      <summary class="icon-btn" aria-label="${escapeAttr(uiText("presenter.action.help"))}" title="${escapeAttr(uiText("presenter.action.help"))}">
        <i data-lucide="circle-help"></i>
      </summary>
      <div class="svc-presenter-help-panel" role="dialog" aria-label="${escapeAttr(uiText("presenter.help.title"))}">
        <div class="svc-presenter-help-head">
          <strong>${escapeHtml(uiText("presenter.help.title"))}</strong>
          <small>출력 창이 열려 있으면 컨트롤러 F11도 출력 창 전체화면을 우선 적용합니다</small>
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
    <section id="servicePresenterControls" class="${escapeAttr(presenterControlsClassName(active, presenterServiceUsesChromakey(service)))}" aria-label="${escapeAttr(uiText("presenter.controls"))}" data-board-key="${escapeAttr(boardKey)}">
      ${renderPresenterControlsTop(service, slides, active, index)}
      <div class="svc-presenter-board-column">
        ${renderPresenterSlideBoard(slides, presenterBoardActiveIndex(slides, active, index), service.id)}
      </div>
    </section>`;
}

function renderPresenterServiceInputRail(service) {
  const draft = state.presenterPreparationDrafts[service.id] || "";
  const examples = presenterPreparationPlaceholderForService(service);
  return `
    <aside class="svc-presenter-input-rail" aria-label="예배 입력">
      <header class="svc-presenter-input-rail-head">
        <span>예배 입력</span>
        <small>빠른 반영</small>
      </header>
      <section class="svc-presenter-preparation-input">
        <textarea class="svc-presenter-preparation-text" data-presenter-preparation-input data-service-id="${escapeAttr(service.id)}" rows="5" placeholder="여기에 붙여넣기" aria-label="예배 준비 입력">${escapeHtml(draft)}</textarea>
        ${renderPresenterPreparationExamples(examples)}
        <div class="svc-presenter-preparation-actions">
          <button class="svc-presenter-preparation-apply" type="button" data-presenter-preparation-apply data-service-id="${escapeAttr(service.id)}">
            <i data-lucide="wand-sparkles"></i>
            <span>반영</span>
          </button>
        </div>
      </section>
    </aside>`;
}

function renderPresenterPreparationExamples(examples = "") {
  const text = String(examples || "").trim();
  if (!text) return "";
  return `
    <details class="svc-presenter-preparation-examples">
      <summary>예시</summary>
      <pre>${escapeHtml(text)}</pre>
    </details>`;
}

function presenterPreparationPlaceholderForService(service) {
  if (!service?.id) return "";
  const lines = [];
  const seen = new Set();
  const addLine = (line) => {
    const text = String(line || "").trim();
    const key = compactSearchValue(text);
    if (!text || seen.has(key)) return;
    seen.add(key);
    lines.push(text);
  };
  const items = servicePrepEditorItems(service.id)
    .filter((item) => presenterServiceInputHasEditableField(item, service));
  for (const item of items) {
    const context = presenterServiceInputItem(item, service);
    if (!context) continue;
    for (const line of presenterPreparationPlaceholderLinesForItem(item, service, context)) {
      addLine(line);
    }
  }
  return lines.length ? lines.slice(0, 10).join("\n") : "입력할 항목이 없습니다";
}

function presenterPreparationPlaceholderLinesForItem(item, service, context) {
  const label = compactSearchValue(item?.label || "");
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  const mode = context.mode;
  if (mode === "praise_db" || serviceItemRequiresSongSelection(item, service) || isSpecialSongServiceItem(item)) {
    const base = presenterPreparationPlaceholderSongLabel(item);
    if (!base) return [];
    const assignee = isSpecialSongServiceItem(item) ? " / 담당기관" : "";
    return [`${base} 곡명${assignee}`];
  }
  if (mode === "scripture" || isScriptureBodyServiceItem(item)) {
    return [`${presenterPreparationPlaceholderTextLabel(item) || "성경봉독"} 히 10:38-39`];
  }
  const { needsTitle, needsAssignee } = presenterServiceTextInputSpec(item, context.model, context.memo);
  if (sectionKey === "sermon" && ["설교", "설교제목"].includes(label)) {
    const lines = [];
    if (needsTitle) lines.push('말씀 "설교 제목"');
    if (needsAssignee) lines.push("설교 김남영 목사");
    return lines;
  }
  const inputLabel = presenterPreparationPlaceholderTextLabel(item);
  if (!inputLabel) return [];
  if (needsTitle && needsAssignee) return [`${inputLabel} 제목 / 담당`];
  if (needsAssignee) return [`${inputLabel} 이름 직분`];
  if (needsTitle) return [`${inputLabel} 제목`];
  return [];
}

function presenterPreparationPlaceholderSongLabel(item) {
  const label = String(item?.label || "").replace(/\s+/g, "").trim();
  if (!label) return "";
  const numberedPraise = label.match(/^찬양(\d+)$/);
  if (numberedPraise) return `찬양${Number(numberedPraise[1])}`;
  const numberedPrayerPraise = label.match(/^기도찬양(\d+)$/);
  if (numberedPrayerPraise) return `기도찬양${Number(numberedPrayerPraise[1])}`;
  const numberedCommonPrayer = label.match(/^공동기도(\d+)$/);
  if (numberedCommonPrayer) return `공동기도${Number(numberedCommonPrayer[1])}`;
  return normalizePresenterPreparationInputLabel(item.label || "");
}

function presenterPreparationPlaceholderTextLabel(item) {
  const key = compactSearchValue(item?.label || "");
  if (key === "기도" || key === "대표기도") return "대표기도";
  if (key === "성경봉독") return "성경봉독";
  if (key === "설교본문" || key === "본문" || key === "성경본문") return "설교 본문";
  if (key === "설교" || key === "설교제목") return "말씀";
  if (key === "봉헌기도") return "봉헌기도";
  if (key === "축도") return "축도";
  if (key === "인용구절") return "인용구절";
  return normalizePresenterPreparationInputLabel(item?.label || "");
}

function parsePresenterPreparationInput(value = "") {
  const entries = [];
  const errors = [];
  const seenKeys = new Set();
  let nextImplicitPraiseNumber = 1;
  String(value || "").split(/\r?\n/).forEach((line, index) => {
    const text = normalizePresenterPreparationLineText(line);
    if (!text) return;
    if (isPresenterPreparationContextLine(text)) return;
    const parsedLine = parsePresenterPreparationLine(text)
      || inferPresenterPreparationShorthandLine(text, nextImplicitPraiseNumber);
    if (!parsedLine) {
      errors.push(`${index + 1}번째 줄 형식을 확인해 주세요.`);
      return;
    }
    const lineEntries = expandPresenterPreparationParsedLine(parsedLine, nextImplicitPraiseNumber);
    for (const entry of lineEntries) {
      const label = String(entry.label || "").trim();
      const rawLabel = String(entry.rawLabel || label).trim();
      const content = cleanPresenterPreparationContent(entry.content);
      const key = compactSearchValue(label);
      const rawKey = compactSearchValue(rawLabel);
      if (!label || !content) {
        errors.push(`${index + 1}번째 줄에 항목과 내용을 모두 입력해 주세요.`);
        return;
      }
      const duplicateKey = presenterPreparationDuplicateKey(key, rawKey);
      if (seenKeys.has(duplicateKey)) {
        errors.push(`${label} 항목이 두 번 입력되었습니다.`);
        return;
      }
      seenKeys.add(duplicateKey);
      const praiseMatch = key.match(/^찬양(\d+)$/);
      if (praiseMatch) nextImplicitPraiseNumber = Math.max(nextImplicitPraiseNumber, Number(praiseMatch[1]) + 1);
      entries.push({ label, key, rawLabel, rawKey, content, line: index + 1 });
    }
  });
  return { entries, errors };
}

function isPresenterPreparationContextLine(text = "") {
  const value = String(text || "").trim();
  if (!value) return true;
  if (/^\[[^\]]{1,120}\]$/.test(value)) return true;
  return /(?:예배|기도회|찬양예배|집회)입니다[!.。]?$/u.test(value);
}

function cleanPresenterPreparationContent(value = "") {
  let text = String(value || "").trim();
  const quotePairs = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
    ["「", "」"],
    ["『", "』"],
  ];
  for (const [open, close] of quotePairs) {
    if (text.startsWith(open) && text.endsWith(close)) {
      text = text.slice(open.length, text.length - close.length).trim();
      break;
    }
  }
  return text;
}

function normalizePresenterPreparationLineText(line = "") {
  return String(line || "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePresenterPreparationLine(text = "") {
  const known = parseKnownPresenterPreparationLine(text);
  if (known) return known;
  const match = String(text || "").match(/^([^:：]+?)\s*[:：]\s*(.+)$/);
  if (!match) return null;
  return {
    rawLabel: match[1],
    label: normalizePresenterPreparationInputLabel(match[1]),
    content: String(match[2] || "").trim(),
  };
}

function inferPresenterPreparationShorthandLine(text = "", praiseNumber = 1) {
  const content = String(text || "").trim();
  if (!content) return null;
  return {
    rawLabel: `찬양 ${Math.max(1, Number(praiseNumber) || 1)}`,
    label: `찬양 ${Math.max(1, Number(praiseNumber) || 1)}`,
    content,
  };
}

function expandPresenterPreparationParsedLine(parsedLine = {}, praiseNumber = 1) {
  const label = String(parsedLine.label || "").trim();
  const rawLabel = String(parsedLine.rawLabel || label).trim();
  const content = String(parsedLine.content || "").trim();
  if (compactSearchValue(label) !== "찬송가") return [{ rawLabel, label, content }];
  const hymnNumbers = presenterPreparationHymnNumbers(content);
  if (!hymnNumbers.length) return [{ rawLabel, label: `찬양 ${Math.max(1, Number(praiseNumber) || 1)}`, content }];
  return hymnNumbers.map((hymnNo, offset) => ({
    rawLabel: "찬송가",
    label: `찬양 ${Math.max(1, Number(praiseNumber) || 1) + offset}`,
    content: `찬 ${hymnNo}장`,
  }));
}

function presenterPreparationHymnNumbers(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const normalized = raw
    .replace(/[，、]/g, ",")
    .replace(/\s*(?:찬송가|찬|장)\s*/g, " ")
    .trim();
  return normalized
    .split(/[,\s/]+/)
    .map((part) => String(part || "").trim())
    .filter((part) => /^\d{1,3}$/.test(part));
}

function presenterPreparationDuplicateKey(key = "", rawKey = "") {
  if (["말씀", "설교"].includes(rawKey)) return rawKey;
  return key;
}

function parseKnownPresenterPreparationLine(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const patterns = [
    /^(찬양)\s*(\d+)\s*(?:[:：.-]\s*)?(.+)$/,
    /^(기도\s*찬양)\s*(\d+)\s*(?:[:：.-]\s*)?(.+)$/,
    /^(공동기도)\s*(\d+)\s*(?:[:：.-]\s*)?(.+)$/,
    /^(찬송가|찬송)\s*(?:[:：.-]\s*)?(.+)$/,
    /^((?:대표\s*)?기도|성경\s*봉독\s*본문|성경\s*봉독|성경\s*본문|설교\s*본문|설교\s*제목|인용\s*구절|특송|입례\s*찬양|봉헌\s*찬송|봉헌\s*기도|결단\s*찬양|결단\s*기도|말씀|본문|설교)\s*(?:[:：.-]\s*)?(.+)$/,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    if (match.length === 4) {
      return {
        rawLabel: `${match[1]} ${match[2]}`,
        label: normalizePresenterPreparationInputLabel(`${match[1]} ${match[2]}`),
        content: String(match[3] || "").trim(),
      };
    }
    return {
      rawLabel: match[1],
      label: normalizePresenterPreparationInputLabel(match[1]),
      content: String(match[2] || "").trim(),
    };
  }
  return null;
}

function normalizePresenterPreparationInputLabel(label = "") {
  const raw = String(label || "").replace(/\s+/g, " ").trim();
  const key = compactSearchValue(raw);
  const aliases = {
    기도: "대표기도",
    성경: "성경봉독",
    성경본문: "성경봉독",
    성경봉독본문: "성경봉독",
    본문: "설교 본문",
    설교본문: "설교 본문",
    말씀본문: "설교 본문",
    말씀: "설교 본문",
    설교: "설교 제목",
    설교제목: "설교 제목",
    인용구절: "인용 구절",
    봉헌: "봉헌찬송",
    결단: "결단찬양",
  };
  if (aliases[key]) return aliases[key];
  const numbered = key.match(/^(찬양|기도찬양|공동기도)(\d+)$/);
  if (numbered) return `${numbered[1]} ${Number(numbered[2])}`;
  return raw;
}

function presenterPreparationSermonBodyTargetLabel(service = null) {
  const items = service?.id ? servicePrepEditorItems(service.id) : [];
  const hasSermonBody = items.some((item) =>
    String(item?._worshipSectionKey || "").trim() === "sermon"
    && ["설교본문", "본문", "성경본문"].includes(compactSearchValue(item?.label || "")));
  if (hasSermonBody) return "설교 본문";
  const hasScriptureReading = items.some((item) =>
    String(item?._worshipSectionKey || "").trim() === "scripture_reading"
    && compactSearchValue(item?.label || "") === "성경봉독");
  return hasScriptureReading ? "성경봉독" : "설교 본문";
}

function presenterPreparationContentLooksScriptureReference(value = "") {
  return Boolean(parseBibleReference(normalizeServiceItemReferenceSpacing(String(value || "").trim())));
}

function presenterPreparationContentLooksAssignee(value = "") {
  return /(목사|전도사|강도사|장로|권사|집사|간사|선교사|일동)\s*$/.test(String(value || "").trim());
}

function isPresenterPreparationSermonTitleItem(item = {}) {
  return String(item?._worshipSectionKey || "").trim() === "sermon"
    && ["설교", "설교제목"].includes(compactSearchValue(item?.label || ""));
}

function presenterPreparationTargetLabel(key = "", service = null, content = "") {
  const sermonBodyTarget = presenterPreparationSermonBodyTargetLabel(service);
  const compactKey = compactSearchValue(key);
  if (compactKey === "말씀" && !presenterPreparationContentLooksScriptureReference(content)) {
    return "설교 제목";
  }
  return {
    대표기도: "기도",
    기도: "기도",
    성경: "성경봉독",
    성경봉독: "성경봉독",
    성경본문: "성경봉독",
    성경봉독본문: "성경봉독",
    본문: sermonBodyTarget,
    설교: "설교 제목",
    설교제목: "설교 제목",
    설교본문: sermonBodyTarget,
    말씀본문: sermonBodyTarget,
    말씀: sermonBodyTarget,
    인용구절: "인용 구절",
    봉헌: "봉헌찬송",
    결단: "결단찬양",
  }[compactKey] || String(key || "").trim();
}

function findPresenterPreparationProjectedItem(service, label) {
  const labelKey = compactSearchValue(label);
  const items = servicePrepEditorItems(service.id);
  const exact = items.find((item) => compactSearchValue(item.label || "") === labelKey);
  if (exact) return exact;
  const numbered = labelKey.match(/^(.*?)(\d+)$/);
  if (numbered) {
    const baseKey = numbered[1];
    const ordinal = Number(numbered[2]);
    const matches = items.filter((item) => {
      const itemKey = compactSearchValue(item.label || "");
      return itemKey === baseKey || itemKey.replace(/\d+$/, "") === baseKey;
    });
    if (ordinal > 0 && matches[ordinal - 1]) return matches[ordinal - 1];
  }
  if (labelKey === "기도" || labelKey === "대표기도") {
    return items.find((item) =>
      String(item._worshipSectionKey || "") === "prayer"
      && ["기도", "대표기도"].includes(compactSearchValue(item.label || "")));
  }
  if (labelKey === "설교제목") {
    return items.find((item) =>
      String(item._worshipSectionKey || "") === "sermon"
      && ["설교", "설교제목"].includes(compactSearchValue(item.label || "")));
  }
  return null;
}

function materializePresenterPreparationItem(service, items, projectedItem) {
  const existingIndex = items.findIndex((item) => item.id === projectedItem.id);
  if (existingIndex >= 0) return existingIndex;
  const { _serviceItemIndex, _origIndex, ...projected } = projectedItem;
  items.push(normalizeServiceItem({
    ...projected,
    id: createLocalId(),
    service_id: service.id,
    sort_order: items.length + 1,
    _worshipTemplateProjected: false,
    _worshipTemplatePlaceholder: false,
    _worshipElementTemplateModified: true,
    _worshipSharedContentDirty: true,
  }, items.length));
  return items.length - 1;
}

function presenterPreparationSongLabels(song = {}) {
  const title = String(song.title || "").trim();
  const subtitle = String(song.subtitle || "").trim();
  const hymnNo = String(song.hymn_no || "").trim();
  return [
    title,
    songServiceOptionLabel(song),
    [title, subtitle].filter(Boolean).join(" "),
    [hymnNo, title].filter(Boolean).join(" "),
    String(song.original_title || "").trim(),
  ].filter(Boolean);
}

function parsePresenterPreparationHymnHint(value = "") {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return { title: "", hymnNo: "" };
  const paren = raw.match(/^(.+?)\s*[(（]\s*(?:새\s*)?(?:찬송가|찬)?\s*(\d+)\s*장?\s*[)）]\s*$/);
  if (paren) return { title: String(paren[1] || "").trim(), hymnNo: String(paren[2] || "").trim() };
  const leading = raw.match(/^(?:새\s*)?(?:찬송가|찬)\s*(\d+)\s*장?\s+(.+)$/);
  if (leading) return { title: String(leading[2] || "").trim(), hymnNo: String(leading[1] || "").trim() };
  const trailing = raw.match(/^(.+?)\s+(?:새\s*)?(?:찬송가|찬)\s*(\d+)\s*장?\s*$/);
  if (trailing) return { title: String(trailing[1] || "").trim(), hymnNo: String(trailing[2] || "").trim() };
  const only = raw.match(/^(?:새\s*)?(?:찬송가|찬)?\s*(\d+)\s*장\s*$/);
  if (only && /(?:찬|장)/.test(raw)) return { title: "", hymnNo: String(only[1] || "").trim() };
  return { title: raw, hymnNo: "" };
}

function resolvePresenterPreparationHymnSong(value = "") {
  const hint = parsePresenterPreparationHymnHint(value);
  if (!hint.hymnNo) return null;
  const hymnMatches = state.songs.filter((song) => String(song.hymn_no || "").trim() === hint.hymnNo);
  if (!hymnMatches.length) return null;
  if (!hint.title) return hymnMatches.length === 1 ? hymnMatches[0] : null;
  const titleKey = compactSearchValue(hint.title);
  const titled = hymnMatches.filter((song) => [
    song.title,
    stripHymnNumber(song.title || ""),
    songServiceOptionLabel(song),
    song.subtitle,
  ].some((label) => compactSearchValue(label) === titleKey));
  return titled.length === 1 ? titled[0] : (hymnMatches.length === 1 ? hymnMatches[0] : null);
}

function resolvePresenterPreparationSong(value, item, service) {
  const songInput = presenterPreparationSongContent(value);
  const query = compactSearchValue(songInput);
  if (!query) return null;
  const hymnSong = resolvePresenterPreparationHymnSong(songInput);
  if (hymnSong) return hymnSong;
  const praiseSong = findServicePraiseSong(songInput);
  if (praiseSong) return praiseSong;
  const exact = state.songs.filter((song) => presenterPreparationSongLabels(song)
    .some((label) => compactSearchValue(label) === query));
  if (exact.length === 1) return exact[0];
  const titleExact = state.songs.filter((song) => compactSearchValue(stripHymnNumber(song.title || "")) === query);
  if (titleExact.length === 1) return titleExact[0];
  const results = serviceSongPickerResults(songInput, item, service, 2);
  return results.length === 1 ? results[0] : null;
}

function presenterPreparationSongContent(value = "") {
  const text = cleanPresenterPreparationContent(value);
  // Keys such as G or D are notes for the instrumental team, not part of a song title.
  return text.replace(/\s+[A-G](?:#|b)?(?:m|M|maj7|sus[24]|add\d+|\d+)?$/u, "").trim();
}

async function createBlankPraiseSongForServiceInput(value, service = selectedServiceForEditor()) {
  if (!state.client) return null;
  const title = stripHymnNo(presenterPreparationSongContent(value)).title.trim();
  if (!title) return null;
  const existing = findServicePraiseSong(title);
  if (existing) return existing;

  const praiseType = service?.type_id === "children" ? "children" : "ccm";
  const defaultVersion = {
    id: createUuid(),
    name: "기본",
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
  const { data, error } = await state.client
    .from("mindex_songs")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;

  const song = normalizeServerSong(data);
  song.versions = normalizeSongVersions(song, song.versions?.length ? song.versions : [defaultVersion]);
  song._memoHasVersions = !useVersionTables;
  if (useVersionTables) {
    try {
      await saveSongVersions(song);
    } catch (saveError) {
      if (!isUnavailableRelationError(saveError)) throw saveError;
      state.songVersionTablesSupported = false;
      song._memoHasVersions = true;
      await state.client
        .from("mindex_songs")
        .update({ memo: serializeSongMemo(song) })
        .eq("id", song.id);
    }
  }
  state.songs = [song, ...state.songs.filter((candidate) => candidate.id !== song.id)].sort(sortSongs);
  return song;
}

function isPresenterPreparationCitationItem(item = {}) {
  return String(item._worshipSectionKey || "") === "sermon"
    && /^인용구절\d*$/.test(compactSearchValue(item.label || ""));
}

function presenterPreparationCitationItems(service, items, references) {
  const sermonBody = items.find((item) => compactSearchValue(item.label || "") === "설교본문")
    || (() => {
      const projected = findPresenterPreparationProjectedItem(service, "설교 본문");
      if (!projected) return null;
      return items[materializePresenterPreparationItem(service, items, projected)] || null;
    })();
  const anchor = sermonBody
    || items.find((item) =>
      String(item?._worshipSectionKey || "").trim() === "sermon"
      && ["설교", "설교제목"].includes(compactSearchValue(item?.label || "")))
    || (() => {
      const projected = findPresenterPreparationProjectedItem(service, "설교 제목");
      if (!projected) return null;
      return items[materializePresenterPreparationItem(service, items, projected)] || null;
    })();
  if (!anchor) return { error: "인용 구절을 넣을 설교 항목을 찾지 못했습니다.", items };

  const existing = items.filter(isPresenterPreparationCitationItem);
  const next = items.filter((item) => !isPresenterPreparationCitationItem(item));
  const insertionIndex = next.findIndex((item) => item.id === anchor.id) + 1;
  const baseOrder = Number(anchor._worshipElementOrder) || 2;
  const current = existing[0] || {};
  const parsed = parseServiceItemMemo(current.memo || sermonBody?.memo || "");
  parsed.elementType = "scripture_body";
  parsed.componentType = "scripture_body";
  parsed.inputMode = "scripture";
  parsed.scriptureReference = references[0] || "";
  parsed.scriptureReferences = [...references];
  parsed.slides = [];
  const citation = normalizeServiceItem({
    ...current,
    id: current.id || createLocalId(),
    service_id: service.id,
    label: "인용 구절",
    raw_title: formatServiceScriptureReferenceList(references),
    song_id: null,
    version_id: null,
    memo: serializeServiceItemMemo(parsed),
    _worshipSectionId: anchor._worshipSectionId || "",
    _worshipSectionKey: anchor._worshipSectionKey || "sermon",
    _worshipSectionTitle: anchor._worshipSectionTitle || "설교",
    _worshipSectionOrder: Number(anchor._worshipSectionOrder) || 0,
    _worshipElementOrder: baseOrder + 0.01,
    _worshipElementTemplateModified: true,
    _worshipSharedContentDirty: true,
    _worshipTemplateProjected: false,
    _worshipTemplatePlaceholder: false,
  }, insertionIndex);
  next.splice(Math.max(0, insertionIndex), 0, citation);
  return { items: next, citationIds: [citation.id] };
}

async function applyPresenterPreparationInput(serviceId = state.selectedServiceId) {
  const service = state.services.find((candidate) => candidate.id === serviceId);
  const draft = String(state.presenterPreparationDrafts[serviceId] || "").trim();
  if (!service || !draft) return;
  if (state.presenterPreparationApplyingServiceIds.has(serviceId)) return;

  state.presenterPreparationApplyingServiceIds.add(serviceId);
  renderServiceList();

  try {

    const { entries, errors } = parsePresenterPreparationInput(draft);
    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }

    let items = getServiceItems(serviceId).map((item) => ({ ...item }));
    const scriptureItemIds = new Set();
    const versionWarnings = [];
    const createdSongTitles = [];
    let citationReferences = null;

    for (const entry of entries) {
      if (entry.key === "인용구절") {
        const references = normalizeServiceScriptureReferenceList(entry.content);
        if (!references.length || references.some((reference) => !parseBibleReference(reference))) {
          errors.push("인용 구절의 성경 주소를 확인해 주세요.");
        } else {
          citationReferences = references;
        }
        continue;
      }

      const targetLabel = presenterPreparationTargetLabel(entry.rawLabel || entry.label, service, entry.content);
      const contentParts = entry.content.split(/\s+\/\s+/);
      const content = String(contentParts.shift() || "").trim();
      const assignee = contentParts.join(" / ").trim();
      const projected = findPresenterPreparationProjectedItem(service, targetLabel);
      if (!projected) {
        errors.push(`${entry.label} 항목을 이 예배에서 찾지 못했습니다.`);
        continue;
      }
      const targetIndex = materializePresenterPreparationItem(service, items, projected);
      const item = items[targetIndex];
      const memo = parseServiceItemMemo(item.memo);
      const mode = serviceMemoInputMode(memo, item);

      if (mode === "praise_db" || serviceItemRequiresSongSelection(item, service) || isSpecialSongServiceItem(item)) {
        let song = resolvePresenterPreparationSong(content, item, service);
        if (!song && !serviceItemRequiresNewHymnalScoreSong(item)) {
          try {
            song = await createBlankPraiseSongForServiceInput(content, service);
            if (song) createdSongTitles.push(song.title || content);
          } catch (error) {
            errors.push(error.message || `${entry.label} 빈 곡을 만들지 못했습니다.`);
            continue;
          }
        }
        if (!song) {
          errors.push(`${entry.label} 곡을 찬양 DB에서 하나로 찾지 못했습니다.`);
          continue;
        }
        if (serviceItemRequiresNewHymnalScoreSong(item) && !isNewHymnalScoreSong(song)) {
          errors.push(`${entry.label}은 새찬송가 곡만 선택할 수 있습니다.`);
          continue;
        }
        item.song_id = song.id;
        item.version_id = null;
        item.song_version_id = null;
        item.raw_title = "";
        if (assignee) item.assignee = assignee;
        item._worshipElementTemplateModified = true;
        markServiceItemSharedContentDirty(item, service);
        item._worshipTemplatePlaceholder = false;
        const versions = serviceSelectableSongVersions(song, item, service);
        const preferredVersion = preferredNewHymnalVersion(song, versions);
        if (preferredVersion) item.version_id = preferredVersion.id;
        else if (versions.length === 1) item.version_id = versions[0].id;
        else if (versions.length > 1) versionWarnings.push(entry.label);
        item.song_version_id = item.version_id;
        continue;
      }

      if (mode === "scripture" || isScriptureBodyServiceItem(item)) {
        const references = normalizeServiceScriptureReferenceList(content);
        if (!references.length || references.some((reference) => !parseBibleReference(reference))) {
          errors.push(`${entry.label}의 성경 주소를 확인해 주세요.`);
          continue;
        }
        item.raw_title = formatServiceScriptureReferenceList(references);
        item._worshipElementTemplateModified = true;
        markServiceItemSharedContentDirty(item, service);
        item._worshipTemplatePlaceholder = false;
        item.memo = serializeServiceItemMemo({
          ...memo,
          elementType: "scripture_body",
          inputMode: "scripture",
          scriptureReference: references[0] || "",
          scriptureReferences: references,
          slides: [],
        });
        scriptureItemIds.add(item.id);
        continue;
      }

      if (entry.key === "대표기도") {
        item.assignee = assignee || content;
      } else if ((entry.rawKey || entry.key) === "설교" && isPresenterPreparationSermonTitleItem(item) && !assignee && presenterPreparationContentLooksAssignee(content)) {
        item.assignee = content;
      } else if (assignee) {
        item.raw_title = normalizeServiceItemRawTitleForItem(item, content);
        item.assignee = assignee;
      } else {
        item.raw_title = normalizeServiceItemRawTitleForItem(item, content);
      }
      item._worshipElementTemplateModified = true;
      markServiceItemSharedContentDirty(item, service);
      item._worshipTemplatePlaceholder = false;
    }

    if (citationReferences) {
      const citations = presenterPreparationCitationItems(service, items, citationReferences);
      if (citations.error) errors.push(citations.error);
      else {
        items = citations.items;
        citations.citationIds.forEach((id) => scriptureItemIds.add(id));
      }
    }

    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }

    state.serviceItems[serviceId] = projectWorshipServiceItemsFromTemplate(
      service,
      normalizeServiceItemsInCurrentOrder(items),
    );
    state.dirty.service = true;
    delete state.presenterPreparationDrafts[serviceId];
    refreshPresenterForService(serviceId);
    updateSaveState();

    const scriptureIndexes = [...scriptureItemIds]
      .map((itemId) => state.serviceItems[serviceId].findIndex((item) => item.id === itemId))
      .filter((index) => index >= 0);
    await Promise.all(scriptureIndexes.map((index) => resolveServiceScriptureBeforeSave(serviceId, index)));

    if (versionWarnings.length) {
      renderCurrentServiceModuleDetail();
      renderServiceList();
      showToast(`${versionWarnings.join(", ")}의 찬양 버전을 선택한 뒤 저장해 주세요.`, "info");
      return;
    }

    renderCurrentServiceModuleDetail();
    renderServiceList();
    updateSaveState();
    const createdNote = createdSongTitles.length ? ` 빈 곡 ${createdSongTitles.length}개를 찬양 DB에 만들었습니다.` : "";
    showToast(`예배 입력 ${entries.length}개 항목을 반영했습니다.${createdNote} 상단 저장을 눌러 확정해 주세요.`, "info");
  } finally {
    state.presenterPreparationApplyingServiceIds.delete(serviceId);
    renderServiceList();
  }
}

function presenterServiceEditableInputCount(service) {
  if (!service?.id) return 0;
  return servicePrepEditorItems(service.id)
    .filter((item) => presenterServiceInputHasEditableField(item, service))
    .length;
}

function presenterServiceInputItem(item, service) {
  const model = serviceItemEditorModel(item, { service });
  const memo = model.parsed || parseServiceItemMemo(item.memo);
  const inputMode = model.strictSong ? "praise_db" : serviceMemoInputMode(memo, item);
  if (presenterServiceInputIsStatic(item, memo)) return null;
  if (inputMode === "none" || inputMode === "config") return null;
  if (inputMode === "praise_db" && !model.strictSong) return { mode: "text", model, memo };
  return { mode: inputMode, model, memo };
}

function presenterServiceInputIsStatic(item = {}, memo = parseServiceItemMemo(item.memo)) {
  const label = compactSearchValue(item.label || "");
  const sectionKey = String(item._worshipSectionKey || "").trim();
  const service = state.services.find((service) => service.id === item?.service_id) || null;
  const usesSharedSundayContent = Boolean(sharedSundayContentSourceItem(item, service));
  return !isPresenterReferenceMediaItem(item, memo) && (isServicePreparationItem(item, memo)
    || Boolean(presenterFixedTitleText(item))
    || isPublicFixedDoxologyServiceItem(
      item,
      memo,
      state.services.find((candidate) => candidate.id === item?.service_id) || null,
    )
    || (isLiturgicalBodyServiceItem(item) && compactSearchValue(item?.label || "") !== "청소년부광고")
    || isConfessionPrayerServiceItem(item)
    || usesSharedSundayContent
    || label === "환영"
    || (sectionKey === "announcements" && compactSearchValue(item?.label || "") !== "청소년부광고")
    || sectionKey === "closing_visual");
}

function presenterServiceInputControls(item, index, service) {
  const context = presenterServiceInputItem(item, service);
  if (!context) return "";
  const { mode, model, memo } = context;
  if (mode === "praise_db") {
    return renderPresenterServicePraiseInput(item, index, model);
  }
  if (mode === "scripture") {
    return renderPresenterServiceScriptureInput(item, index, memo);
  }
  if (mode === "asset") {
    return renderPresenterServiceAssetInput(item, index, memo);
  }
  return renderPresenterServiceTextInputs(item, index, model, memo);
}

function presenterServiceTextInputSpec(item, model, memo) {
  const elementType = serviceMemoElementType(memo);
  const label = compactSearchValue(item.label || "");
  const specialSong = isSpecialSongServiceItem(item);
  const genericTitle = presenterTitleAssigneeTitleIsGeneric(item.raw_title || "", item.label || "");
  const needsTitle = /설교제목|특송|공동기도/.test(label)
    || specialSong
    || label === "청소년부광고"
    || (Boolean(String(item.raw_title || "").trim()) && !genericTitle && elementType !== "title_person");
  const needsAssignee = (
    elementType === "title_person"
    && /설교|기도|특송|축도/.test(label)
  ) || specialSong;
  return { needsTitle, needsAssignee };
}

function presenterServiceInputHasEditableField(item, service) {
  const context = presenterServiceInputItem(item, service);
  if (!context) return false;
  if (["praise_db", "scripture", "asset"].includes(context.mode)) return true;
  const { needsTitle, needsAssignee } = presenterServiceTextInputSpec(item, context.model, context.memo);
  return needsTitle || needsAssignee;
}

function renderPresenterServicePraiseInput(item, index, model) {
  const assigneeLabel = serviceItemAssigneeInputLabel(item);
  return `
    <label class="svc-presenter-input-field svc-presenter-input-field--song">
      <span>곡</span>
      ${renderServiceEditorTitleControl(item, index, { service: model.service }, model)}
    </label>
    ${model.showAssignee ? `
      <label class="svc-presenter-input-field svc-presenter-input-field--assignee">
        <span>${escapeHtml(assigneeLabel)}</span>
        <input class="svc-presenter-input-control" type="text" data-service-item-field="assignee" data-service-item-index="${index}"
          value="${escapeAttr(model.assigneeValue || "")}" placeholder="${escapeAttr(inferServiceItemAssignee(item))}" aria-label="${escapeAttr(`${item.label || "항목"} 담당`)}" />
      </label>` : ""}`;
}

function renderPresenterServiceScriptureInput(item, index, memo) {
  const references = serviceItemScriptureReferences(item, memo);
  const value = references.length
    ? formatServiceScriptureReferenceList(references)
    : normalizeServiceItemReferenceSpacing(memo.scriptureReference || item.raw_title || "");
  const citation = isPresenterCitationScriptureItem(item);
  const selectedTranslationId = serviceItemBibleTranslation(item, memo)?.id || "";
  const perReferencePayloads = normalizeServiceScriptureReferencePayloads(memo.scriptureReferencePayloads, references);
  const payloadByReference = new Map(perReferencePayloads.map((payload) => [normalizeServiceScriptureReferenceKey(payload.reference), payload]));
  const translationControl = "";
  const hasPerReferenceManual = perReferencePayloads.some((payload) => {
    const manual = normalizeServiceManualScripture(payload.manualScripture);
    return Boolean(manual?.verses?.length || payload.manualTranslationLabel);
  });
  const perReferenceControls = citation && references.length ? `
    <details class="svc-presenter-input-field svc-presenter-input-field--scripture-parts">
      <summary>
        <span>인용별 역본</span>
        <small>${escapeHtml(`${references.length}개${hasPerReferenceManual ? " · 수동 입력 있음" : ""}`)}</small>
      </summary>
      <div class="svc-presenter-scripture-parts">
        ${references.map((reference, referenceIndex) => {
          const payload = payloadByReference.get(normalizeServiceScriptureReferenceKey(reference)) || {};
          const manual = normalizeServiceManualScripture(payload.manualScripture);
          const selectedId = payload.scriptureTranslationId || selectedTranslationId;
          const hasManual = Boolean(manual?.verses?.length || payload.manualTranslationLabel);
          return `
            <div class="svc-presenter-scripture-part">
              <strong>${escapeHtml(reference)}</strong>
              ${state.bibleTranslations.length ? `
                <select class="svc-presenter-input-control" data-service-item-field="scripture_reference_translation_id" data-service-item-index="${index}" data-scripture-reference-index="${referenceIndex}" aria-label="${escapeAttr(`${reference} 역본`)}">
                  ${state.bibleTranslations.map((translation) => `
                    <option value="${escapeAttr(translation.id)}"${translation.id === selectedId ? " selected" : ""}>
                      ${escapeHtml(serviceBibleTranslationDisplayLabel(translation))}
                    </option>`).join("")}
                </select>` : ""}
              <details class="svc-presenter-scripture-manual"${hasManual ? " open" : ""}>
                <summary>수동 입력</summary>
                <div>
                  <input class="svc-presenter-input-control" type="text" data-service-item-field="manual_scripture_translation_label" data-service-item-index="${index}" data-scripture-reference-index="${referenceIndex}"
                    value="${escapeAttr(manual?.translationLabel || payload.manualTranslationLabel || "")}" placeholder="수동 역본명" aria-label="${escapeAttr(`${reference} 수동 역본명`)}" />
                  <textarea class="svc-presenter-input-control" data-service-item-field="manual_scripture_text" data-service-item-index="${index}" data-scripture-reference-index="${referenceIndex}"
                    rows="2" placeholder="7 본문&#10;8 본문" aria-label="${escapeAttr(`${reference} 수동 본문`)}">${escapeHtml(formatServiceManualScriptureInput(manual))}</textarea>
                </div>
              </details>
            </div>`;
        }).join("")}
      </div>
    </details>` : "";
  return `
    <label class="svc-presenter-input-field">
      <span>구절</span>
      <div class="svc-presenter-input-control-wrap">
        <input class="svc-presenter-input-control${serviceItemScriptureInputInvalid(item) ? " is-invalid" : ""}" type="text"
          data-service-item-field="raw_title" data-service-item-index="${index}"
          value="${escapeAttr(value)}" list="serviceScriptureOptions" placeholder="${serviceItemSupportsScriptureReferenceList(item) ? "렘 3:22; 마 3:11" : "출애굽기 23:14-19"}" aria-label="${escapeAttr(`${item.label || "성경"} 구절`)}" />
        ${renderServiceItemLinkControl(item, index)}
      </div>
    </label>
    ${translationControl}
    ${perReferenceControls}`;
}

function renderPresenterServiceAssetInput(item, index, memo) {
  const asset = normalizeServiceAsset(memo.asset);
  if (isPresenterReferenceMediaItem(item, memo)) {
    const elementType = serviceMemoElementType(memo);
    const kind = ["image", "video", "audio"].includes(elementType) ? elementType : "image";
    const serviceId = item.service_id || state.selectedServiceId;
    return `
      <div class="svc-reference-media-input">
        <div class="svc-reference-media-toolbar">
          <label class="svc-presenter-input-field">
            <span>종류</span>
            <select class="svc-presenter-input-control" data-service-item-field="element_type" data-service-item-index="${index}" data-service-id="${escapeAttr(serviceId)}" aria-label="참고 화면 종류">
              <option value="image"${kind === "image" ? " selected" : ""}>이미지</option>
              <option value="video"${kind === "video" ? " selected" : ""}>영상</option>
              <option value="audio"${kind === "audio" ? " selected" : ""}>음원</option>
            </select>
          </label>
          <label class="svc-reference-media-upload">
            <input type="file" accept="${PRESENTER_REFERENCE_MEDIA_ACCEPT}" data-presenter-reference-media-file data-service-id="${escapeAttr(serviceId)}" data-service-item-index="${index}" />
            <i data-lucide="upload"></i><span>파일 선택</span>
          </label>
        </div>
        <label class="svc-presenter-input-field">
          <span>제목</span>
          <input class="svc-presenter-input-control" type="text" data-service-item-field="asset_name" data-service-item-index="${index}" data-service-id="${escapeAttr(serviceId)}"
            value="${escapeAttr(asset.name)}" placeholder="참고 화면 제목" aria-label="참고 화면 제목" />
        </label>
        <label class="svc-presenter-input-field">
          <span>공개 링크</span>
          <input class="svc-presenter-input-control" type="text" data-service-item-field="asset_url" data-service-item-index="${index}" data-service-id="${escapeAttr(serviceId)}"
            value="${escapeAttr(asset.url)}" placeholder="파일을 선택하거나 공개 URL 입력" aria-label="참고 화면 공개 링크" />
        </label>
        ${renderPresenterReferenceMediaPreview(asset, kind)}
      </div>`;
  }
  return `
    <label class="svc-presenter-input-field">
      <span>이름</span>
      <input class="svc-presenter-input-control" type="text" data-service-item-field="asset_name" data-service-item-index="${index}"
        value="${escapeAttr(asset.name)}" placeholder="영상 또는 이미지 이름" aria-label="${escapeAttr(`${item.label || "파일"} 이름`)}" />
    </label>
    <label class="svc-presenter-input-field">
      <span>파일/링크</span>
      <input class="svc-presenter-input-control" type="text" data-service-item-field="asset_url" data-service-item-index="${index}"
        value="${escapeAttr(asset.url)}" placeholder="assets/... 또는 YouTube 링크" aria-label="${escapeAttr(`${item.label || "파일"} 링크`)}" />
    </label>`;
}

function renderPresenterReferenceMediaPreview(asset, kind) {
  const source = String(asset?.url || "").trim();
  if (!source) return `<div class="svc-reference-media-preview is-empty"><i data-lucide="image-plus"></i><span>파일을 선택하면 이 예배의 참고 화면으로 바로 송출됩니다.</span></div>`;
  if (kind === "video") return `<div class="svc-reference-media-preview"><video src="${escapeAttr(source)}" muted playsinline preload="metadata"></video></div>`;
  if (kind === "audio") return `<div class="svc-reference-media-preview svc-reference-media-preview--audio"><i data-lucide="audio-lines"></i><strong>${escapeHtml(asset.name || "음원")}</strong><audio controls preload="metadata" src="${escapeAttr(source)}"></audio></div>`;
  return `<div class="svc-reference-media-preview"><img src="${escapeAttr(source)}" alt="${escapeAttr(asset.name || "참고 화면")}" loading="lazy" /></div>`;
}

function renderPresenterServiceTextInputs(item, index, model, memo) {
  const { needsTitle, needsAssignee } = presenterServiceTextInputSpec(item, model, memo);
  if (!needsTitle && !needsAssignee) return "";
  const specialSong = isSpecialSongServiceItem(item);
  const titleLabel = specialSong ? "곡" : "내용";
  const assigneeLabel = serviceItemAssigneeInputLabel(item);
  return `
    ${needsTitle ? `
      <label class="svc-presenter-input-field">
        <span>${escapeHtml(titleLabel)}</span>
        <input class="svc-presenter-input-control" type="text" data-service-item-field="raw_title" data-service-item-index="${index}"
          value="${escapeAttr(item.raw_title || "")}" placeholder="${escapeAttr(specialSong ? "곡명" : item.label || "내용")}" aria-label="${escapeAttr(`${item.label || "항목"} ${titleLabel}`)}" />
      </label>` : ""}
    ${needsAssignee ? `
      <label class="svc-presenter-input-field">
        <span>${escapeHtml(assigneeLabel)}</span>
        <input class="svc-presenter-input-control" type="text" data-service-item-field="assignee" data-service-item-index="${index}"
          value="${escapeAttr(model.assigneeValue || "")}" placeholder="${escapeAttr(inferServiceItemAssignee(item))}" aria-label="${escapeAttr(`${item.label || "항목"} 담당`)}" />
      </label>` : ""}`;
}

function serviceItemAssigneeInputLabel(item = {}) {
  return isSpecialSongServiceItem(item) ? "담당기관" : "담당";
}

function renderPresenterControlsTop(service, slides, active, index) {
  const count = slides.length;
  const safeIndex = clampPresenterIndex(index, count);
  const activeSlide = slides[safeIndex] || null;
  const showLiveScriptureControl = state.presenter.liveScripture?.active || presenterSlideIsLiveScriptureElement(activeSlide);
  const current = active && state.presenter.safetyBlank ? 0 : count ? safeIndex + 1 : 0;
  const anyOutputOpen = isPresenterOutputWindowOpen();
  const outputOpen = active && anyOutputOpen;
  const outputOpenElsewhere = anyOutputOpen && state.presenter.serviceId && state.presenter.serviceId !== service.id;
  const jumpInputValue = active && state.presenter.jumpDraft
    ? state.presenter.jumpDraft
    : (count || current === 0 ? current : "");
  const statusLabel = outputOpen
    ? uiText("presenter.status.live")
    : outputOpenElsewhere
      ? uiText("presenter.status.otherLive")
      : uiText("presenter.status.ready");
  const statusTone = outputOpen ? "live" : outputOpenElsewhere ? "other" : "ready";
  const mode = presenterControllerMode(service, { active, count, current, outputOpen, outputOpenElsewhere, safeIndex });
  const warmup = presenterOutputWarmupUiState(service.id, { active, outputOpen });
  const launchAction = anyOutputOpen ? "stop" : "open";
  const launchLabel = uiText(anyOutputOpen ? "presenter.action.stop" : "presenter.action.present");
  const launchIcon = anyOutputOpen ? "square" : "screen-share";
  return `
      <div class="svc-presenter-top">
        <button class="svc-present-btn svc-presenter-launch${anyOutputOpen ? " is-stop" : ""}" type="button" data-presenter-action="${escapeAttr(launchAction)}" data-service-id="${escapeAttr(service.id)}" aria-label="${escapeAttr(launchLabel)}">
          <i data-lucide="${escapeAttr(launchIcon)}"></i>
          <span>${escapeHtml(launchLabel)}</span>
        </button>
        ${renderPresenterScreenControl()}
        <div class="svc-presenter-main" aria-live="polite">
          <span class="svc-presenter-state-group">
            <span class="svc-presenter-status svc-presenter-status--${escapeAttr(statusTone)}" aria-label="${escapeAttr(uiText("presenter.aria.status", { status: statusLabel }))}">${escapeHtml(statusLabel)}</span>
            ${mode.label ? `<span class="svc-presenter-mode svc-presenter-mode--${escapeAttr(mode.tone)}" aria-label="${escapeAttr(uiText("presenter.aria.mode", { mode: mode.label }))}">${escapeHtml(mode.label)}</span>` : ""}
            ${warmup ? `<span class="svc-presenter-warmup svc-presenter-warmup--${escapeAttr(warmup.tone)}" aria-label="${escapeAttr(warmup.aria)}">${escapeHtml(warmup.label)}</span>` : ""}
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
          ${showLiveScriptureControl ? `
            <span class="svc-presenter-action-group svc-presenter-action-group--scripture">
              ${renderLiveScriptureControl(service.id)}
            </span>` : ""}
          <span class="svc-presenter-action-group svc-presenter-action-group--nav" aria-label="${escapeAttr(uiText("presenter.aria.slideNav"))}">
            <button class="icon-btn" type="button" data-presenter-action="prev" data-service-id="${escapeAttr(service.id)}" ${count ? "" : "disabled"} aria-label="${escapeAttr(uiText("presenter.action.prev"))}" title="${escapeAttr(uiText("presenter.action.prev"))}">
              <i data-lucide="chevron-left"></i>
            </button>
            <button class="icon-btn" type="button" data-presenter-action="next" data-service-id="${escapeAttr(service.id)}" ${count ? "" : "disabled"} aria-label="${escapeAttr(uiText("presenter.action.next"))}" title="${escapeAttr(uiText("presenter.action.next"))}">
              <i data-lucide="chevron-right"></i>
            </button>
          </span>
          ${renderPresenterHelpControl()}
        </div>
      </div>`;
}

function presenterSlideIsLiveScriptureElement(slide = null) {
  if (!slide) return false;
  return Boolean(slide.liveScriptureControl)
    || presenterSlideElementType(slide) === PRESENTER_ELEMENT_TYPES.LIVE_SCRIPTURE;
}

function presenterControlsClassName(active, chromakey) {
  return `svc-presenter-strip${active ? " is-active" : ""}${chromakey ? "" : " is-clean-output"}`;
}

function presenterControllerIsLive(serviceId = state.selectedServiceId) {
  return Boolean(serviceId && state.presenter.serviceId === serviceId && isPresenterOutputWindowOpen());
}

function presenterSlideInteractionHint(serviceId, title = "슬라이드") {
  return presenterControllerIsLive(serviceId)
    ? `${title} 송출 위치로 이동`
    : `${title} 선택`;
}

function presenterBoardActiveIndex(slides, active, index) {
  if (!active || !presenterControllerIsLive(state.presenter.serviceId) || state.presenter.safetyBlank || state.presenter.liveScripture?.active) return -1;
  return clampPresenterIndex(index, slides.length);
}

function presenterControlBoardKey(service, slides = [], active = false, chromakey = true) {
  const theme = presenterOutputTheme(service?.type_id);
  const slideKey = slides.map((slide, index) => [
    index,
    slide?.id || "",
    slide?.type || "",
    presenterSlideElementType(slide),
    presenterSlideLayout(slide),
    slide?.formKey || "",
    slide?.marker || "",
    slide?.imageSrc || "",
    slide?.videoSrc || "",
    slide?.audioSrc || "",
    compactSearchValue(`${slide?.title || ""} ${slide?.text || ""}`).slice(0, 80),
  ].join(":")).join("|");
  return [
    service?.id || "",
    theme,
    chromakey ? "chroma" : "clean",
    active ? "active" : "preview",
    slides.length,
    slideKey,
  ].join("::");
}

function presenterOutputWarmupUiState(serviceId, options = {}) {
  const warmup = state.presenter.outputWarmup;
  if (!options.active || !options.outputOpen || !warmup) return null;
  if (warmup.serviceId && serviceId && warmup.serviceId !== serviceId) return null;
  if (Date.now() - (Number(warmup.updatedAt) || 0) > PRESENTER_OUTPUT_HEARTBEAT_TTL_MS * 2) return null;
  const total = Math.max(0, Number(warmup.total) || 0);
  if (!total) return null;
  const ready = Math.max(0, Math.min(total, Number(warmup.ready) || 0));
  const complete = Boolean(warmup.complete) || ready >= total;
  return {
    label: complete ? "이미지 준비 완료" : `이미지 준비 ${ready}/${total}`,
    tone: complete ? "ready" : "warming",
    aria: complete ? "출력 이미지 준비 완료" : `출력 이미지 준비 중 ${ready} / ${total}`,
  };
}

function presenterControllerMode(service, context = {}) {
  if (context.outputOpenElsewhere) return { label: uiText("presenter.mode.otherService"), tone: "other" };
  if (!context.active) return { label: "", tone: "preview" };
  if (state.presenter.safetyBlank) return { label: uiText("presenter.mode.blank"), tone: "blank" };
  if (state.presenter.liveScripture?.active) return { label: uiText("presenter.mode.scripture"), tone: "scripture" };
  if (context.count) return { label: uiText("presenter.mode.slide", { number: context.safeIndex + 1 }), tone: context.outputOpen ? "slide-live" : "slide-ready" };
  return { label: uiText("presenter.mode.noSlides"), tone: "empty" };
}

function renderServiceMusicPlayer() {
  const music = state.serviceMusic;
  const context = currentPresenterAudioContext();
  const fileLabel = context.label || (music.fileName ? music.fileName : uiText("presenter.music.default"));
  const hasSource = Boolean(context.source || music.objectUrl);
  const volumeOptions = Array.from({ length: 6 }, (_, level) =>
    `<option value="${level}"${level === music.volumeLevel ? " selected" : ""}>${level}</option>`).join("");
  return `
    <span class="svc-music-player">
      <input class="svc-music-file" type="file" accept="audio/*" data-service-music-file hidden />
      <button class="svc-music-name" type="button" data-service-music-action="choose" title="음악 선택">
        <i data-lucide="${context.source ? "volume-2" : "music"}"></i>
        <span>${escapeHtml(fileLabel)}</span>
      </button>
      ${hasSource ? `
        <button class="icon-btn svc-music-toggle${music.playing ? " is-active" : ""}" type="button" data-service-music-action="toggle" aria-label="${escapeAttr(music.playing ? uiText("presenter.music.pause") : uiText("presenter.music.play"))}" title="${escapeAttr(music.playing ? uiText("presenter.music.pause") : uiText("presenter.music.play"))}">
          <i data-lucide="${music.playing ? "pause" : "play"}"></i>
        </button>
        <span class="svc-volume-control">
          <span class="svc-presenter-mini-label">${escapeHtml(uiText("presenter.label.volume"))}</span>
          <select class="svc-music-volume" data-service-music-volume aria-label="${escapeAttr(uiText("presenter.music.volume"))}">
            ${volumeOptions}
          </select>
        </span>` : ""}
    </span>`;
}

function renderLiveScriptureControl(serviceId) {
  const live = state.presenter.liveScripture || {};
  return `
    <span class="svc-live-scripture${live.active ? " is-active" : ""}">
      <input class="svc-live-scripture-input" type="text" value="${escapeAttr(live.draft || live.reference || "")}" data-live-scripture-input data-service-id="${escapeAttr(serviceId)}" placeholder="${escapeAttr(uiText("presenter.scripture.placeholder"))}" />
      <button class="icon-btn svc-action-text-btn svc-live-scripture-show" type="button" data-live-scripture-action="show" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.showScripture"))}" title="${escapeAttr(uiText("presenter.action.showScripture"))}">
        <i data-lucide="send"></i>
        <span>${escapeHtml(uiText("presenter.action.send"))}</span>
      </button>
      <button class="icon-btn svc-action-text-btn svc-live-scripture-clear" type="button" data-live-scripture-action="clear" data-service-id="${escapeAttr(serviceId)}" aria-label="${escapeAttr(uiText("presenter.action.hideScripture"))}" title="${escapeAttr(uiText("presenter.action.hideScripture"))}" ${live.active ? "" : "disabled"}>
        <i data-lucide="eye-off"></i>
        <span>${escapeHtml(uiText("presenter.action.hide"))}</span>
      </button>
    </span>`;
}

function currentPresenterAudioContext(serviceId = state.presenter.serviceId) {
  if (!serviceId || state.presenter.serviceId !== serviceId) return { source: "", label: "", slideId: "", playback: null };
  if (state.presenter.safetyBlank || state.presenter.liveScripture?.active) return { source: "", label: "", slideId: "", playback: null };
  const slide = state.presenter.slides[clampPresenterIndex(state.presenter.index, state.presenter.slides.length)];
  const source = presenterSlideAudioSource(slide);
  if (!source) return { source: "", label: "", slideId: "", playback: null };
  return {
    source,
    label: presenterFileDisplayTitle(slide, presenterFileTypeLabel(slide.sourceType || slide.asset?.kind || "audio")),
    slideId: slide.id || "",
    playback: presenterPlaybackConfig(slide.playback, "audio"),
  };
}

function getServiceMusicAudio() {
  if (!state.serviceMusic.audio) {
    const audio = new Audio();
    audio.preload = "auto";
    state.serviceMusic.audio = audio;
  }
  state.serviceMusic.audio.volume = state.serviceMusic.volumeLevel / 5;
  return state.serviceMusic.audio;
}

function setServiceMusicSource(audio, source, mode, playback = null) {
  if (state.serviceMusic.sourceKey === source && state.serviceMusic.mode === mode) return;
  audio.pause();
  audio.src = source;
  audio.loop = mode === "manual" ? true : Boolean(playback?.loop);
  state.serviceMusic.sourceKey = source;
  state.serviceMusic.mode = mode;
  state.serviceMusic.playing = false;
}

function stopServiceMusicPlayback(options = {}) {
  const audio = state.serviceMusic.audio;
  if (audio) {
    audio.pause();
    if (options.clearSource) audio.removeAttribute("src");
  }
  state.serviceMusic.playing = false;
  if (options.clearSource) state.serviceMusic.sourceKey = "";
  if (options.mode) state.serviceMusic.mode = options.mode;
  if (options.render !== false) renderPresenterControlState();
}

function syncServiceMusicWithPresenterContext(serviceId = state.presenter.serviceId, options = {}) {
  const context = currentPresenterAudioContext(serviceId);
  if (context.source && state.serviceMusic.mode === "presenter-audio" && state.serviceMusic.sourceKey === context.source) return;
  if (state.serviceMusic.mode !== "presenter-audio") return;
  stopServiceMusicPlayback({ clearSource: true, mode: "manual", render: options.render });
}

function runServiceMusicAction(action) {
  if (action === "choose") {
    document.querySelector("[data-service-music-file]")?.click();
    return;
  }
  if (action !== "toggle") return;
  const audio = getServiceMusicAudio();
  const context = currentPresenterAudioContext();
  const source = context.source || state.serviceMusic.objectUrl;
  const mode = context.source ? "presenter-audio" : "manual";
  if (!source) {
    showToast("음악 파일을 먼저 선택해 주세요.", "error");
    return;
  }
  if (context.source && presenterMediaSourceIsYoutube(context.source)) {
    showToast("YouTube 링크는 아직 컨트롤러 내 재생 대신 별도 영상/오디오 파일로 등록해 주세요.", "error");
    return;
  }
  setServiceMusicSource(audio, source, mode, context.playback);
  if (state.serviceMusic.playing) {
    stopServiceMusicPlayback({ render: true });
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
  setServiceMusicSource(audio, state.serviceMusic.objectUrl, "manual", { loop: true });
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

async function appendPresenterCitationReference(input) {
  const serviceId = String(input?.dataset?.serviceId || state.selectedServiceId || "").trim();
  const elementId = String(input?.dataset?.presenterCitationElementId || "").trim();
  const rawValue = String(input?.value || "").trim();
  if (!serviceId || !elementId || !rawValue) return;

  const service = state.services.find((candidate) => candidate.id === serviceId);
  const items = getServiceItems(serviceId);
  const index = items.findIndex((item) => String(item?.id || "").trim() === elementId);
  const item = items[index];
  if (!service || !item || !isOptionalCitationScriptureServiceItem(item)) {
    showToast("인용 구절 항목을 찾지 못했습니다.", "error");
    return;
  }

  const addedReferences = normalizeServiceScriptureReferenceList(rawValue);
  if (!addedReferences.length) {
    showToast("성경 주소를 확인해 주세요.", "error");
    return;
  }

  const memo = clearGeneratedServiceScriptureSlides(item);
  const existingReferences = serviceItemScriptureReferences(item, memo, service);
  const references = uniqueList([...existingReferences, ...addedReferences]);
  memo.scriptureReferences = references;
  memo.scriptureReference = references[0] || "";
  memo.scriptureReferencePayloads = normalizeServiceScriptureReferencePayloads(memo.scriptureReferencePayloads, references);
  memo.slides = [];
  item.raw_title = formatServiceScriptureReferenceList(references);
  item.memo = serializeServiceItemMemo(memo);
  item._worshipElementTemplateModified = true;
  item._worshipTemplatePlaceholder = false;
  state.serviceItems[serviceId] = normalizeServiceItemsInCurrentOrder(items);
  state.dirty.service = true;

  try {
    await resolveServiceScriptureBeforeSave(serviceId, index);
    const targetReference = parseBibleReference(addedReferences[0]);
    const targetIndex = presenterSlidesForService(serviceId).findIndex((slide) => (
      String(slide?.elementId || "") === elementId
      && slide?.type === "scripture"
      && presenterSlideMatchesScriptureReference(slide, targetReference)
    ));
    if (targetIndex < 0) {
      showToast("해당 성구를 찾지 못했습니다.", "error");
      return;
    }
    input.value = "";
    runPresenterAction("jump", serviceId, { index: targetIndex });
    scrollPresenterBoardToIndex(serviceId, targetIndex, { force: true });
    void saveService(serviceId, { renderAfterSave: false, silent: true });
  } catch (error) {
    showToast(error.message || "성구를 불러오지 못했습니다.", "error");
  }
}

function presenterSlideMatchesScriptureReference(slide = {}, targetReference = null) {
  if (!targetReference?.book?.code) return false;
  const slideReference = parseBibleReference(slide?.title || slide?.marker || "");
  return slideReference?.book?.code === targetReference.book.code
    && slideReference.chapter === targetReference.chapter
    && slideReference.verse === targetReference.verse
    && (slideReference.verseEnd || slideReference.verse) === (targetReference.verseEnd || targetReference.verse);
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
    outputContext: "chromakey",
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
    const versePrefix = multipleVerses ? String(verse?.verse || "").trim() : "";
    const line = [versePrefix, verseText].filter(Boolean).join("   ");
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
  const nextTarget = nextPreparationTarget(service);
  const theme = presenterOutputTheme(service?.type_id);
  const chromakey = presenterServiceUsesChromakey(service);
  const deferredGroups = presenterDeferredBoardGroupIndexes(groups, index, slides.length);
  return `
    <div class="svc-slide-board svc-slide-board--${escapeAttr(theme)}${chromakey ? "" : " svc-slide-board--clean"}" role="list" aria-label="Presenter slide board">
      ${groups.map((group, groupIndex) => {
        const options = { nextService: groupIndex === groups.length - 1 ? nextTarget : null };
        return deferredGroups.has(groupIndex)
          ? renderDeferredPresenterBoardSection(group, serviceId, groupIndex)
          : renderPresenterBoardSection(group, index, serviceId, options);
      }).join("")}
    </div>`;
}

function presenterDeferredBoardGroupIndexes(groups = [], activeIndex = -1, slideCount = 0) {
  // The normal board is more useful when fully expanded. Defer only unusually
  // large services, where hundreds of miniature slide trees delay the editor.
  if (slideCount < 180 || groups.length < 5) return new Set();
  const immediate = new Set([0, 1]);
  const activeGroupIndex = groups.findIndex((group) =>
    group.slides.some(({ slideIndex }) => slideIndex === activeIndex));
  if (activeGroupIndex >= 0) immediate.add(activeGroupIndex);
  return new Set(groups.map((_, index) => index).filter((index) => !immediate.has(index)));
}

function renderDeferredPresenterBoardSection(group, serviceId, groupIndex) {
  const firstIndex = group.slides[0]?.slideIndex ?? 0;
  const visibleTitle = group.title || group.label || group.name;
  const interactionLabel = presenterSlideInteractionHint(serviceId, group.name || visibleTitle);
  const estimatedRows = Math.max(1, Math.ceil(group.slides.length / 5));
  const estimatedHeight = 52 + estimatedRows * 146;
  return `
    <section class="svc-board-section svc-board-section--deferred" role="listitem"
      data-presenter-deferred-board-section
      data-service-id="${escapeAttr(serviceId)}"
      data-presenter-board-group-index="${groupIndex}"
      aria-label="${escapeAttr(group.name)}"
      style="--svc-deferred-board-height:${estimatedHeight}px">
      <div class="svc-board-section-head-row">
        <button class="svc-board-section-head" type="button"
          data-presenter-action="jump"
          data-presenter-index="${firstIndex}"
          data-service-id="${escapeAttr(serviceId)}"
          aria-label="${escapeAttr(interactionLabel)}"
          title="${escapeAttr(interactionLabel)}">
          <span class="svc-board-section-title${visibleTitle ? "" : " is-empty"}">
            ${visibleTitle ? `<strong>${escapeHtml(visibleTitle)}</strong>` : ""}
            ${group.meta ? `<small>${escapeHtml(group.meta)}</small>` : ""}
          </span>
        </button>
      </div>
      <div class="svc-board-section-deferred-body" aria-hidden="true"></div>
    </section>`;
}

function mountDeferredPresenterBoardSections(root, serviceId, slides) {
  if (!root?.isConnected || !serviceId || typeof IntersectionObserver === "undefined") return;
  const deferredSections = [...root.querySelectorAll("[data-presenter-deferred-board-section]")];
  if (!deferredSections.length) return;
  root._presenterBoardObserver?.disconnect?.();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      hydrateDeferredPresenterBoardSection(root, serviceId, slides, Number(entry.target.dataset.presenterBoardGroupIndex));
    });
  }, { rootMargin: "720px 0px" });
  root._presenterBoardObserver = observer;
  deferredSections.forEach((section) => observer.observe(section));
}

function hydrateDeferredPresenterBoardSection(root, serviceId, slides, groupIndex) {
  if (!root?.isConnected || !Number.isInteger(groupIndex)) return false;
  const placeholder = root.querySelector(`[data-presenter-deferred-board-section][data-presenter-board-group-index="${groupIndex}"]`);
  if (!placeholder) return false;
  const groups = groupPresenterSlidesBySection(slides, serviceId);
  const group = groups[groupIndex];
  if (!group) return false;
  const service = state.services.find((candidate) => candidate.id === serviceId);
  const nextService = groupIndex === groups.length - 1 ? nextPreparationTarget(service) : null;
  const activeIndex = presenterBoardActiveIndex(slides, state.presenter.serviceId === serviceId, state.presenter.index);
  const template = document.createElement("template");
  template.innerHTML = renderPresenterBoardSection(group, activeIndex, serviceId, { nextService }).trim();
  placeholder.replaceWith(template.content.firstElementChild);
  syncPresenterBoardSelectionClasses(root);
  refreshIcons();
  return true;
}

function hydrateDeferredPresenterBoardSectionForSlide(root, serviceId, slideIndex) {
  const slides = presenterSlidesForService(serviceId);
  const groupIndex = groupPresenterSlidesBySection(slides, serviceId)
    .findIndex((group) => group.slides.some((entry) => entry.slideIndex === slideIndex));
  if (groupIndex < 0) return false;
  return hydrateDeferredPresenterBoardSection(root, serviceId, slides, groupIndex);
}

function presenterSlideElementKey(serviceId, slideIndex) {
  const slides = presenterSlidesForService(serviceId);
  const slide = slides[slideIndex];
  return presenterSlideElementGroupKey(slide) || `slide:${slideIndex}`;
}

function selectedPresenterBoardIndexes(serviceId = state.selectedServiceId) {
  const selection = state.presenterBoardSelection || {};
  if (selection.serviceId !== serviceId) return new Set();
  return new Set((selection.indexes || []).map(Number).filter(Number.isFinite));
}

function selectPresenterBoardSlide(serviceId, slideIndex, options = {}) {
  const index = Number(slideIndex);
  if (!serviceId || !Number.isFinite(index) || index < 0) return;
  const slides = presenterSlidesForService(serviceId);
  const elementKey = options.elementKey || presenterSlideElementKey(serviceId, index);
  const current = state.presenterBoardSelection || {};
  const sameElement = current.serviceId === serviceId && current.elementKey === elementKey;
  const anchorIndex = Number.isFinite(Number(options.anchorIndex))
    ? Number(options.anchorIndex)
    : sameElement && Number.isFinite(Number(current.anchorIndex))
      ? Number(current.anchorIndex)
      : index;
  let indexes = [];
  if (options.range && sameElement) {
    const [from, to] = [anchorIndex, index].sort((a, b) => a - b);
    const rangeIndexes = slides
      .map((slide, candidateIndex) => ({ slide, candidateIndex }))
      .filter(({ slide, candidateIndex }) => {
        const candidateKey = presenterSlideElementGroupKey(slide) || `slide:${candidateIndex}`;
        return candidateIndex >= from && candidateIndex <= to && candidateKey === elementKey;
      })
      .map(({ candidateIndex }) => candidateIndex);
    indexes = options.additive
      ? [...new Set([...(current.indexes || []), ...rangeIndexes])]
      : rangeIndexes;
  } else if (options.additive && sameElement) {
    const selected = new Set((current.indexes || []).map(Number).filter(Number.isFinite));
    if (selected.has(index)) selected.delete(index);
    else selected.add(index);
    indexes = [...selected];
  } else {
    indexes = [index];
  }
  state.presenterBoardSelection = {
    ...current,
    serviceId,
    elementKey,
    indexes: indexes.sort((a, b) => a - b),
    anchorIndex: options.range && sameElement ? anchorIndex : index,
    drag: current.drag || null,
    clipboard: current.clipboard || null,
  };
  if (options.render === false) return;
  syncPresenterBoardSelectionClasses();
}

function clearPresenterBoardSelection(options = {}) {
  state.presenterBoardSelection = {
    ...state.presenterBoardSelection,
    serviceId: null,
    elementKey: "",
    indexes: [],
    anchorIndex: null,
    drag: null,
  };
  if (options.render !== false) syncPresenterBoardSelectionClasses();
}

function syncPresenterBoardSelectionClasses(root = document.getElementById("servicePresenterControls")) {
  if (!root) return;
  const selected = selectedPresenterBoardIndexes(state.selectedServiceId);
  root.querySelectorAll(".svc-slide-thumb[data-presenter-index][data-service-id]").forEach((thumb) => {
    const serviceId = thumb.dataset.serviceId;
    const index = Number(thumb.dataset.presenterIndex);
    const isSelected = state.presenterBoardSelection.serviceId === serviceId
      && selected.has(index);
    thumb.classList.toggle("selected", isSelected);
    thumb.closest(".svc-slide-thumb-wrap")?.classList.toggle("selected", isSelected);
  });
}

function handlePresenterSorterKeydown(event) {
  if (state.module !== "presenter") return false;
  if (presenterControllerIsLive(state.selectedServiceId)) return false;
  const key = event.key.toLowerCase();
  const command = event.metaKey || event.ctrlKey;
  if (!command || !["a", "c", "x", "v"].includes(key)) return false;
  if (shouldKeepHorizontalNavigationInFocusedControl(event.target)) return false;
  const serviceId = state.selectedServiceId;
  const selection = state.presenterBoardSelection || {};
  if (key === "a") {
    const focusedThumb = document.activeElement?.closest?.(".svc-slide-thumb[data-presenter-index][data-service-id]");
    const elementKey = focusedThumb?.dataset.presenterElementKey || selection.elementKey || "";
    if (!serviceId || !elementKey) return false;
    event.preventDefault();
    selectAllPresenterSlidesInElement(serviceId, elementKey);
    return true;
  }
  if (!selection.indexes?.length || selection.serviceId !== serviceId || !selection.elementKey) return false;
  event.preventDefault();
  if (key === "c") {
    copyPresenterSelectedCustomSlides();
    return true;
  }
  if (key === "x") {
    cutPresenterSelectedCustomSlides();
    return true;
  }
  if (key === "v") {
    pastePresenterCustomSlides();
    return true;
  }
  return false;
}

function selectAllPresenterSlidesInElement(serviceId, elementKey) {
  const slides = presenterSlidesForService(serviceId);
  const indexes = slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide, index }) => (presenterSlideElementGroupKey(slide) || `slide:${index}`) === elementKey)
    .map(({ index }) => index);
  state.presenterBoardSelection = {
    ...state.presenterBoardSelection,
    serviceId,
    elementKey,
    indexes,
    anchorIndex: indexes[0] ?? null,
    drag: null,
  };
  syncPresenterBoardSelectionClasses();
}

function presenterSelectedCustomSlideContext() {
  const selection = state.presenterBoardSelection || {};
  const serviceId = selection.serviceId || state.selectedServiceId;
  const items = getServiceItems(serviceId);
  const itemIndex = items.findIndex((item) => String(item.id || "") === String(selection.elementKey || ""));
  const item = items[itemIndex];
  if (!item) return null;
  const slides = presenterSlidesForService(serviceId);
  const customIndexes = (selection.indexes || [])
    .map((slideIndex) => {
      const slide = slides[slideIndex];
      const customIndex = String(slide?.formKey || "").match(/^custom:(\d+)$/)?.[1];
      return customIndex === undefined ? null : Number(customIndex);
    });
  if (!customIndexes.length || customIndexes.some((index) => !Number.isInteger(index))) return null;
  const parsed = parseServiceItemMemo(item.memo);
  if (!parsed.slides.length || customIndexes.some((index) => index < 0 || index >= parsed.slides.length)) return null;
  return {
    serviceId,
    items,
    item,
    itemIndex,
    parsed,
    customIndexes: [...new Set(customIndexes)].sort((a, b) => a - b),
  };
}

function commitPresenterCustomSlideContext(context, options = {}) {
  if (!context?.item) return;
  context.item.memo = serializeServiceItemMemo(context.parsed);
  state.serviceItems[context.serviceId] = normalizeServiceItemsInCurrentOrder(context.items);
  state.dirty.service = true;
  refreshPresenterForService(context.serviceId);
  if (options.render !== false) renderPresenterDetail();
  updateSaveState();
}

function copyPresenterSelectedCustomSlides() {
  const context = presenterSelectedCustomSlideContext();
  if (!context) {
    showToast("가사/악보/성경에서 생성된 슬라이드는 element 편집기에서 원본을 수정해 주세요.", "info");
    return false;
  }
  state.presenterBoardSelection.clipboard = {
    elementKey: state.presenterBoardSelection.elementKey,
    slides: context.customIndexes.map((index) => context.parsed.slides[index]),
  };
  showToast(`${context.customIndexes.length}개 슬라이드를 복사했습니다.`);
  return true;
}

function cutPresenterSelectedCustomSlides() {
  const context = presenterSelectedCustomSlideContext();
  if (!context) {
    showToast("자동 생성된 슬라이드는 직접 자를 수 없습니다. 엘리멘트 원본을 수정해 주세요.", "info");
    return false;
  }
  copyPresenterSelectedCustomSlides();
  for (const index of [...context.customIndexes].reverse()) {
    context.parsed.slides.splice(index, 1);
  }
  commitPresenterCustomSlideContext(context, { render: false });
  clearPresenterBoardSelection({ render: false });
  renderPresenterDetail();
  return true;
}

function pastePresenterCustomSlides() {
  const clipboard = state.presenterBoardSelection.clipboard;
  const context = presenterSelectedCustomSlideContext();
  if (!clipboard?.slides?.length || !context) {
    showToast("붙여넣기는 같은 element의 직접 지정 슬라이드에서만 가능합니다.", "info");
    return false;
  }
  const insertAt = Math.min(Math.max(...context.customIndexes) + 1, context.parsed.slides.length);
  context.parsed.slides.splice(insertAt, 0, ...clipboard.slides);
  commitPresenterCustomSlideContext(context, { render: false });
  renderPresenterDetail();
  return true;
}

const NEXT_PREPARATION_SERVICE_TYPES = {
  "sunday-first": "youth",
  youth: "young-adult",
  "sunday-second": "sunday-main",
  "sunday-main": "sunday-afternoon",
};

function nextPreparationService(service = null) {
  return nextPreparationTarget(service)?.service || null;
}

function nextPreparationTarget(service = null) {
  if (!service) return null;
  const nextType = NEXT_PREPARATION_SERVICE_TYPES[worshipAppServiceTypeId(service.type_id)];
  if (!nextType) return null;
  const sameDate = state.services.find((candidate) =>
    candidate.id !== service.id
    && worshipAppServiceTypeId(candidate.type_id) === nextType
    && candidate.date === service.date
  );
  const serviceDate = String(service.date || "").trim();
  if (sameDate) return { service: sameDate, typeId: nextType, date: serviceDate, exists: true };
  const nextService = sortServicesByDate(state.services.filter((candidate) =>
    candidate.id !== service.id
    && worshipAppServiceTypeId(candidate.type_id) === nextType
    && String(candidate.date || "") >= serviceDate
  ))[0] || null;
  if (nextService) return { service: nextService, typeId: nextType, date: nextService.date || serviceDate, exists: true };
  return null;
}

function groupPresenterSlidesBySection(slides, serviceId = state.selectedServiceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const groups = [];
  slides.forEach((slide, slideIndex) => {
    const mainPraise = isPresenterMainPraiseSlide(slide);
    const mainPraiseMarker = mainPraise && isPresenterPraiseSectionMarkerSlide(slide);
    const mainPraiseAssignee = mainPraiseMarker
      ? cleanPresenterAssignee(slide.bodyText || slide.subtitle || slide.assignee || slide.sectionAssignee)
      : slide.sectionAssignee;
    const praiseMeta = mainPraise
      ? servicePraiseBoardMetaCandidate(service, [{ assignee: mainPraiseAssignee, praiseIntro: mainPraiseMarker }])
      : { text: "", priority: 0 };
    const id = mainPraise ? `main-praise:${groups.length}` : presenterBoardSectionGroupId(slide, slideIndex);
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
        praiseMeta: praiseMeta.text,
        praiseMetaPriority: praiseMeta.priority,
      });
      groups.push(group);
    }

    if (mainPraise && praiseMeta.priority > (group.metaPriority || 0)) {
      group.meta = praiseMeta.text;
      group.metaPriority = praiseMeta.priority;
    }

    const entry = { slide, slideIndex };
    group.slides.push(entry);
    addPresenterSlideToSubgroup(group, entry);
  });
  return groups;
}

function isPresenterMainPraiseSlide(slide = {}) {
  if (isPresenterEntrancePraiseSlide(slide)) return false;
  const sectionKey = String(slide.sectionKey || "").trim();
  if (sectionKey) return sectionKey === "praise";
  if (slide.sectionRole === "main-praise") return true;
  const context = compactSearchValue([
    slide.sectionTitle,
    slide.sectionName,
    slide.sectionHeading,
    slide.elementLabel,
    slide.label,
  ].filter(Boolean).join(" "));
  if (/(특송|송영|결단|봉헌|파송|폐회)/.test(context)) return false;
  return isMainPraiseLabel(slide.sectionLabel);
}

function isPresenterEntrancePraiseSlide(slide = {}) {
  const context = compactSearchValue([
    slide.sectionKey,
    slide.sectionTitle,
    slide.sectionName,
    slide.sectionHeading,
    slide.elementLabel,
    slide.label,
  ].filter(Boolean).join(" "));
  return /입례찬양|성경봉독전찬양/.test(context);
}

function presenterBoardSectionGroupId(slide = {}, slideIndex = 0) {
  const sectionKey = String(slide.sectionKey || "").trim();
  if (sectionKey === "closing_visual" || sectionKey === "closing_hymn") return "section-key:closing_visual";
  return slide.sectionId || `section:${slideIndex}`;
}

function createPresenterSlideGroup(slide, slideIndex, options = {}) {
  const mainPraise = options.kind === "main-praise";
  const explicitSectionTitle = slide.sectionHeading || slide.sectionTitle || slide.sectionLabel || "";
  const sourceSectionTitle = serviceSectionDisplayTitle(slide.sectionKey, explicitSectionTitle)
    || presenterBoardSectionTitleForSlide(slide)
    || explicitSectionTitle;
  const label = mainPraise ? "찬양" : sourceSectionTitle;
  const title = mainPraise ? "찬양" : sourceSectionTitle;
  const meta = mainPraise && options.praiseMeta ? options.praiseMeta : "";
  return {
    id: options.id || slide.sectionId || `section:${slideIndex}`,
    kind: options.kind || "item",
    index: slide.sectionIndex || slideIndex + 1,
    label,
    title,
    meta,
    metaPriority: Number(options.praiseMetaPriority) || 0,
    name: presenterNameParts(label, title, meta).join(" / ") || presenterSlideTitle(slide),
    slides: [],
    subgroups: [],
  };
}

function presenterBoardSectionTitleForSlide(slide = {}) {
  const sectionKey = String(slide.sectionKey || "").trim();
  return serviceCanonicalSectionTitle(sectionKey);
}

function serviceCanonicalSectionTitle(sectionKey = "") {
  const canonicalByKey = {
    ready: "준비",
    creed: "신앙고백",
    praise: "찬양",
    confession: "참회기도",
    hymn_praise: "찬송",
    prayer: "대표기도",
    scripture_reading: "성경봉독",
    special_song: "특송",
    sermon: "설교",
    response_song: "결단",
    pre_scripture_praise: "찬양",
    entrance_praise: "입례찬양",
    prayer_meeting_praise: "기도회",
    offering: "봉헌",
    announcements: "광고",
    community_confession: "공동체고백",
    sending: "파송",
    doxology: "송영",
    benediction: "축도",
    closing_hymn: "폐회",
    closing_visual: "폐회",
  };
  return canonicalByKey[String(sectionKey || "").trim()] || "";
}

function serviceSectionDisplayTitle(sectionKey = "", title = "") {
  const rawTitle = String(title || "").trim();
  const canonical = serviceCanonicalSectionTitle(sectionKey);
  return canonical || rawTitle;
}

function addPresenterSlideToSubgroup(group, entry) {
  const { slide } = entry;
  const id = slide.elementId || slide.sectionId || `${group.id}:slide:${entry.slideIndex}`;
  let subgroup = group.subgroups.find((item) => item.id === id);
  if (!subgroup) {
    const mainPraiseMarker = group.kind === "main-praise" && isPresenterPraiseSectionMarkerSlide(slide);
    const number = group.kind === "main-praise" ? presenterMainPraiseSongSubgroupCount(group) + 1 : group.subgroups.length;
    const label = group.kind === "main-praise"
      ? mainPraiseMarker
        ? slide.elementLabel || "환영"
        : presenterPraiseSubgroupLabel(slide.sectionLabel, number)
      : slide.elementLabel || slide.sectionLabel || "";
    const title = presenterBoardSubgroupContentTitle(slide, label);
    subgroup = {
      id,
      label,
      title,
      name: presenterNameParts(label, title).join(" / ") || presenterSlideTitle(slide),
      slides: [],
    };
    group.subgroups.push(subgroup);
  }
  subgroup.slides.push(entry);
}

function presenterTitleAssigneeTitleIsGeneric(title = "", label = "") {
  const titleKey = compactSearchValue(title);
  if (!titleKey) return true;
  const labelKey = compactSearchValue(label);
  return titleKey === labelKey || [
    "기도",
    "대표기도",
    "봉헌기도",
    "성경봉독",
    "특송",
    "축도",
    "교회소식",
    "광고",
    "예배",
  ].includes(titleKey);
}

function presenterBoardSubgroupContentTitle(slide = {}, label = "") {
  if (slide?._praiseIntroSlide) return "";
  const linkedTitle = presenterBoardLinkedSongTitle(slide);
  if (linkedTitle) return linkedTitle;
  const sectionKey = String(slide.sectionKey || "").trim();
  if (sectionKey === "sermon" || ["설교", "설교제목"].includes(compactSearchValue(label))) {
    return slide.contentTitle || presenterSermonContentTitle(String(slide.assignee || "").split("\n")[0]);
  }
  const title = slide.elementTitle || slide.title || presenterSlideMainText(slide);
  const sectionTitle = serviceSectionDisplayTitle(
    sectionKey,
    slide.sectionHeading || slide.sectionTitle || slide.sectionLabel || "",
  );
  if (sectionTitle && compactSearchValue(title) === compactSearchValue(sectionTitle)) return "";
  if (isPresenterMainPraiseSlide(slide)) {
    const titleKey = compactSearchValue(title);
    const elementLabelKey = compactSearchValue(slide.elementLabel || "");
    if ((elementLabelKey && titleKey === elementLabelKey) || ["환영", "입례찬양"].includes(titleKey)) return "";
  }
  if (presenterTitleAssigneeTitleIsGeneric(title, label)) return "";
  return title;
}

function presenterSermonContentTitle(value = "") {
  const title = String(value || "").trim();
  if (!title) return "";
  const quotePairs = [
    ["'", "'"],
    ['"', '"'],
    ["‘", "’"],
    ["“", "”"],
    ["｢", "｣"],
    ["〈", "〉"],
    ["‹", "›"],
  ];
  const unwrapped = quotePairs.reduce((current, [open, close]) => (
    current.startsWith(open) && current.endsWith(close)
      ? current.slice(open.length, current.length - close.length).trim()
      : current
  ), title);
  return `｢${unwrapped}｣`;
}

function presenterBoardLinkedSongTitle(slide = {}) {
  if (!isSongServiceLabel(slide.elementLabel || slide.label || slide.sectionLabel || "")) return "";
  const song = serviceItemLinkedSong(slide);
  if (!song?.hymn_no) return "";
  const version = serviceItemLinkedVersion(slide, song);
  const fallback = slide.elementTitle || slide.title || presenterSlideMainText(slide);
  return presenterSongTitleDisplayTitle(song, version, fallback, presenterSongTitleSectionHeading(slide, slide));
}

function presenterMainPraiseSongSubgroupCount(group = {}) {
  return (group.subgroups || []).filter((subgroup) =>
    !subgroup.slides?.every(({ slide }) => isPresenterPraiseSectionMarkerSlide(slide))
  ).length;
}

function isPresenterPraiseSectionMarkerSlide(slide = {}) {
  if (slide?.type === "praise-section-title" || slide?._praiseIntroSlide) return true;
  if (!isPresenterMainPraiseSlide(slide)) return false;
  const titleKey = compactSearchValue(slide.title || slide.elementTitle || slide.sectionTitle || "");
  return slide?.type === "title-content"
    && slide.elementType === PRESENTER_ELEMENT_TYPES.TITLE_CONTENT
    && (titleKey === "찬양" || titleKey === "환영" || compactSearchValue(slide.elementLabel || "") === "환영");
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
  if (raw && !/^찬양\s*\d*$/i.test(raw)) return raw.replace(/\s+/g, " ");
  return `찬양 ${number}`;
}

function renderPresenterBoardSection(group, activeIndex, serviceId, options = {}) {
  const active = group.slides.some(({ slideIndex }) => slideIndex === activeIndex);
  const firstIndex = group.slides[0]?.slideIndex ?? 0;
  const visibleTitle = group.title || group.label || group.name;
  const interactionLabel = presenterSlideInteractionHint(serviceId, group.name || visibleTitle);
  const referenceMediaSectionKey = presenterBoardReferenceMediaSectionKey(group);
  const referenceMediaQuickAdd = referenceMediaSectionKey
    ? renderPresenterReferenceMediaQuickAdd(referenceMediaSectionKey, serviceId)
    : "";
  let previousFormKey = "";
  const subgroupsHtml = group.subgroups.map((subgroup) => {
    const annotated = annotatePresenterFormStarts(subgroup.slides, previousFormKey);
    previousFormKey = annotated.lastKey;
    return renderPresenterBoardSubgroup(subgroup, activeIndex, serviceId, {
      showHead: true,
      slides: annotated.entries,
    });
  }).join("");
  return `
    <section class="svc-board-section${active ? " active" : ""}" role="listitem" aria-label="${escapeAttr(group.name)}">
      <div class="svc-board-section-head-row">
        <button class="svc-board-section-head" type="button"
          data-presenter-action="jump"
          data-presenter-index="${firstIndex}"
          data-service-id="${escapeAttr(serviceId)}"
          aria-label="${escapeAttr(interactionLabel)}"
          title="${escapeAttr(interactionLabel)}">
          <span class="svc-board-section-title${visibleTitle ? "" : " is-empty"}">
            ${visibleTitle ? `<strong>${escapeHtml(visibleTitle)}</strong>` : ""}
            ${group.meta ? `<small>${escapeHtml(group.meta)}</small>` : ""}
          </span>
        </button>
      </div>
      ${referenceMediaQuickAdd}
      <div class="svc-board-subgroups">
        ${subgroupsHtml}
      </div>
      ${renderPresenterNextPreparationButton(serviceId, options.nextService)}
    </section>`;
}

function renderPresenterReferenceMediaQuickAdd(sectionKey, serviceId) {
  const sectionLabel = presenterReferenceMediaSectionLabel(sectionKey);
  return `
    <div class="svc-reference-media-quick-add">
      <div class="svc-reference-media-quick-add-copy">
        <strong>참고 화면</strong>
        <span>${escapeHtml(`${sectionLabel} 중 띄울 이미지, 영상 또는 음원`)}</span>
      </div>
      <label class="svc-reference-media-upload">
        <input type="file" accept="${PRESENTER_REFERENCE_MEDIA_ACCEPT}" data-presenter-reference-media-direct-file
          data-presenter-reference-media-section="${escapeAttr(sectionKey)}" data-service-id="${escapeAttr(serviceId)}" />
        <i data-lucide="upload"></i><span>파일 추가</span>
      </label>
    </div>`;
}

function presenterBoardReferenceMediaSectionKey(group = {}) {
  const sectionKey = (group?.slides || [])
    .map(({ slide }) => String(slide?.sectionKey || "").trim())
    .find((key) => PRESENTER_REFERENCE_MEDIA_SECTION_KEYS.has(key));
  return sectionKey || "";
}

function presenterBoardSectionEditKey(group = {}) {
  const id = String(group?.id || "").trim();
  if (!id) return "";
  const syntheticReadyOnly = (group.slides || []).length
    && group.slides.every(({ slide }) => isPresenterPreparationSlide(slide) && !String(slide?.elementId || "").trim());
  if (syntheticReadyOnly) return "";
  if (/^(main-praise|section-id:|section-key:|item:)/.test(id)) return id;
  return isUuid(id) ? `section-id:${id}` : id;
}

function renderPresenterNextPreparationButton(serviceId, nextTarget = null) {
  if (!nextTarget?.service?.id) return "";
  const nextService = nextTarget.service || null;
  const typeId = nextTarget.typeId || nextService?.type_id || "";
  const date = nextTarget.date || nextService?.date || "";
  const displayName = nextService ? serviceDisplayTypeName(nextService) : serviceTypeDisplayName(typeId);
  if (!displayName || !typeId || !date) return "";
  const label = `다음 예배 준비: ${displayName}`;
  return `
    <div class="svc-board-next-prep">
      <button class="svc-board-next-prep-btn" type="button"
        data-presenter-action="prepare-next-service"
        data-service-id="${escapeAttr(serviceId)}"
        data-next-service-id="${escapeAttr(nextService?.id || "")}"
        data-next-service-type="${escapeAttr(typeId)}"
        data-next-service-date="${escapeAttr(date)}"
        aria-label="${escapeAttr(label)}">
        <span>다음 예배 준비</span>
        <strong>${escapeHtml(displayName)}</strong>
        <i data-lucide="arrow-right"></i>
      </button>
    </div>`;
}

function renderPresenterBoardSubgroup(subgroup, activeIndex, serviceId, options = {}) {
  const active = subgroup.slides.some(({ slideIndex }) => slideIndex === activeIndex);
  const firstIndex = subgroup.slides[0]?.slideIndex ?? 0;
  const slides = options.slides || annotatePresenterFormStarts(subgroup.slides).entries;
  const rawLabel = subgroup.label || "항목";
  const rawTitle = subgroup.title || subgroup.name;
  const firstSlide = subgroup.slides[0]?.slide || slides[0]?.slide;
  const visibleTitle = isPresenterPreparationSlide(firstSlide)
    ? ""
    : presenterVisibleTitle(rawLabel, rawTitle);
  const visibleLabel = rawLabel;
  const interactionLabel = presenterSlideInteractionHint(serviceId, subgroup.name || visibleLabel);
  const warnings = presenterWarningsForEntries(subgroup.slides);
  const inputControls = renderPresenterBoardSubgroupInputControls(serviceId, subgroup);
  return `
    <div class="svc-board-subgroup${active ? " active" : ""}${options.showHead ? "" : " collapsed-head"}">
      ${options.showHead ? `
        <header class="svc-board-subgroup-head-row">
          <button class="svc-board-subgroup-head" type="button"
            data-presenter-action="jump"
            data-presenter-index="${firstIndex}"
            data-service-id="${escapeAttr(serviceId)}"
            aria-label="${escapeAttr(interactionLabel)}"
            title="${escapeAttr(interactionLabel)}">
            ${visibleLabel ? `<span>${escapeHtml(visibleLabel)}</span>` : ""}
            ${visibleTitle ? `<strong>${escapeHtml(visibleTitle)}</strong>` : ""}
            ${renderPresenterWarnings(warnings)}
          </button>
        </header>` : ""}
      ${inputControls}
      <div class="svc-board-grid">
        ${slides.map(({ slide, slideIndex, formLabel }) =>
          renderPresenterSlideThumb(slide, slideIndex, activeIndex, serviceId, formLabel)).join("")}
      </div>
    </div>`;
}

function renderPresenterBoardSubgroupInputControls(serviceId, subgroup = {}) {
  const context = presenterBoardSubgroupInputContext(serviceId, subgroup);
  if (!context) return "";
  const controls = presenterServiceInputControls(context.item, context.index, context.service);
  if (!controls) return "";
  return `
    <div class="svc-board-subgroup-controls" aria-label="${escapeAttr(`${context.item.label || "항목"} 입력`)}">
      ${controls}
    </div>`;
}

function presenterBoardSubgroupInputContext(serviceId, subgroup = {}) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return null;
  const elementId = String(subgroup.id || subgroup.slides?.[0]?.slide?.elementId || "").trim();
  if (!elementId) return null;
  const items = getServiceItems(serviceId);
  const itemIndex = items.findIndex((item) => String(item.id || "") === elementId);
  if (itemIndex < 0) return null;
  const item = items[itemIndex];
  if (!presenterServiceInputHasEditableField(item, service)) return null;
  return {
    service,
    item,
    index: Number.isInteger(item._origIndex) ? item._origIndex : itemIndex,
  };
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

function annotatePresenterFormStarts(entries = [], initialPreviousKey = "") {
  let previousKey = initialPreviousKey;
  let currentFormLabel = "";
  const annotatedEntries = entries.map((entry) => {
    const { slide, slideIndex } = entry;
    const formSlide = presenterSlideSupportsFormGrouping(slide);
    const key = formSlide ? `form:${slide.formKey || slideIndex}` : "";
    const startsForm = Boolean(formSlide && key !== previousKey);
    if (startsForm) currentFormLabel = presenterFormGroupLabel(slide);
    if (!formSlide) currentFormLabel = "";
    previousKey = key;
    return {
      ...entry,
      formLabel: startsForm ? currentFormLabel : "",
    };
  });
  return { entries: annotatedEntries, lastKey: previousKey };
}

function presenterSlideSupportsFormGrouping(slide) {
  if (!slide) return false;
  const praiseLowerBar = presenterSlideElementType(slide) === PRESENTER_ELEMENT_TYPES.PRAISE
    && presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  if (praiseLowerBar) return true;
  const sourceType = String(slide.sourceType || slide.componentType || "").trim().toLowerCase();
  return Boolean(slide.formKey && sourceType === "score");
}

function presenterFormGroupLabel(slide) {
  const label = String(slide?.formLabel || slide?.marker || "").trim();
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
  const hidden = Boolean(slide?.hiddenInPresentation || slide?.hidden_in_presentation || slide?.hidden);
  const elementKey = presenterSlideElementGroupKey(slide) || `slide:${slideIndex}`;
  const selected = state.presenterBoardSelection.serviceId === serviceId
    && state.presenterBoardSelection.elementKey === elementKey
    && (state.presenterBoardSelection.indexes || []).map(Number).includes(slideIndex);
  const visibleFormLabel = presenterLabelDuplicatesSlideText(formLabel, slide) ? "" : formLabel;
  const ariaPrefix = presenterSlideInteractionHint(serviceId, `${slideIndex + 1}번 슬라이드${hidden ? " · 숨김" : ""}`);
  const slideNumber = slideIndex + 1;
  const formBadge = visibleFormLabel ? `
      <button class="svc-slide-form-badge" type="button"
        data-presenter-action="jump"
        data-presenter-index="${slideIndex}"
        data-service-id="${escapeAttr(serviceId)}"
        aria-label="${escapeAttr(visibleFormLabel)}">
        ${escapeHtml(visibleFormLabel)}
      </button>` : "";
  const citationReferenceInput = (slide?.liveScriptureControl || (slide?.autoTrailingBlank && slide?.citationQuickInsert)) ? `
        <input class="svc-slide-citation-reference-input" type="text"
          data-presenter-citation-reference-input
          data-service-id="${escapeAttr(serviceId)}"
          data-presenter-citation-element-id="${escapeAttr(slide.elementId || "")}"
          placeholder="예: 롬 5:7~8; 요 15:9"
          aria-label="인용 구절 바로 추가" />` : "";
  return `
    <span class="svc-slide-thumb-wrap${active ? " active" : ""}${selected ? " selected" : ""}${hidden ? " hidden" : ""}${visibleFormLabel ? " has-form-label" : ""}">
      <span class="svc-slide-thumb-meta">
        <span class="svc-slide-thumb-no" aria-hidden="true">${slideNumber}</span>
        ${citationReferenceInput}
        ${hidden ? `<span class="svc-slide-hidden-badge">숨김</span>` : ""}
        ${formBadge}
      </span>
      <button class="svc-slide-thumb${active ? " active" : ""}${selected ? " selected" : ""}" type="button"
        data-presenter-action="jump"
        data-presenter-index="${slideIndex}"
        data-presenter-element-key="${escapeAttr(elementKey)}"
        data-service-id="${escapeAttr(serviceId)}"
        aria-label="${escapeAttr(`${ariaPrefix}: ${presenterSlideTitle(slide)}`)}"
        title="${escapeAttr(ariaPrefix)}">
        <span class="svc-slide-thumb-frame svc-slide-thumb-frame--${escapeAttr(presenterSlideRenderClass(slide))}" data-element-type="${escapeAttr(presenterSlideElementType(slide))}" data-slide-layout="${escapeAttr(presenterSlideLayout(slide))}">
          ${renderPresenterSlideMiniPreview(slide, serviceId)}
        </span>
      </button>
    </span>`;
}

function renderPresenterSlideMiniPreview(slide, serviceId = state.presenter.serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const serviceChromakey = presenterServiceUsesChromakey(service);
  const backgroundImages = presenterBackgroundSourcesForService(service, {
    includeChromakeyCleanSlides: presenterSlideOutputContext(slide, serviceChromakey) === "clean",
  });
  const theme = presenterOutputTheme(service?.type_id);
  const frameState = presenterOutputFrameStateForSlide(slide, {
    chromakey: serviceChromakey,
    backgroundImages,
    serviceType: service?.type_id || "",
    outputTheme: theme,
  });
  const frameClasses = presenterOutputFrameClassNames(frameState);
  const backgroundStyle = presenterOutputFrameBackgroundStyle(frameState);
  const outputClasses = [
    "svc-slide-mini-output",
    frameClasses,
  ].filter(Boolean).join(" ");
  const canvasClasses = [
    "svc-slide-mini-canvas",
    "presenter-output-root",
    frameClasses,
  ].filter(Boolean).join(" ");
  if (!slide) {
    return `<span class="${escapeAttr(outputClasses)}"><span class="${escapeAttr(canvasClasses)}" data-output-theme="${escapeAttr(theme)}"${backgroundStyle}></span></span>`;
  }
  return `
    <span class="${escapeAttr(outputClasses)}">
      <span class="${escapeAttr(canvasClasses)}" data-output-theme="${escapeAttr(theme)}"${backgroundStyle}>
        ${renderPresenterSlideFrame(slide, { noChromakey: frameState.noChromakey, previewStage: true })}
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
  if (normalized === "audio") return "오디오";
  if (normalized === "youtube") return "YouTube";
  if (normalized === "video") return "동영상";
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
  const index = requested - 1;
  runPresenterAction("jump", serviceId, { index });
  if (isValidPresenterIndex(index, state.presenter.slides.length)) {
    scrollPresenterBoardToIndex(serviceId, index, { force: true });
  }
}

function runPresenterAction(action, serviceId = state.selectedServiceId, options = {}) {
  if (!["open", "stop", "next", "prev", "first", "last", "jump", "prepare-next-service"].includes(action)) return;
  if (action === "stop") {
    stopPresenterOutput(serviceId || state.presenter.serviceId);
    return;
  }
  if (!serviceId) return;
  if (action === "prepare-next-service") {
    prepareNextServiceFromPresenter(serviceId, options);
    return;
  }
  if (action !== "open" && isPresenterOutputWindowOpen() && state.presenter.serviceId && state.presenter.serviceId !== serviceId) return;
  preparePresenterService(serviceId);

  if (action === "open") {
    clearPresenterBoardSelection({ render: false });
    state.presenter.safetyBlank = false;
    openPresenterOutput(serviceId);
    return;
  }

  state.presenter.jumpDraft = "";
  if (["next", "prev", "first", "last", "jump"].includes(action)) {
    const requestedIndex = Number(options.index);
    const appliesJump = action !== "jump"
      || requestedIndex === -1
      || isValidPresenterIndex(requestedIndex, state.presenter.slides.length);
    if (!appliesJump) {
      renderPresenterControlState(serviceId);
      return;
    }
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
    state.presenter.index = firstPresenterNavigableIndex(state.presenter.slides);
  } else if (action === "last") {
    state.presenter.safetyBlank = false;
    state.presenter.index = lastPresenterNavigableIndex(state.presenter.slides);
  } else if (action === "jump") {
    const requestedIndex = Number(options.index);
    if (requestedIndex === -1) {
      state.presenter.safetyBlank = true;
    } else if (isValidPresenterIndex(requestedIndex, state.presenter.slides.length)) {
      state.presenter.index = requestedIndex;
      state.presenter.safetyBlank = false;
    }
  }

  syncSelectedServiceItemToPresenterSlide(serviceId);
  syncServiceMusicWithPresenterContext(serviceId, { render: false });
  publishPresenterState();
  renderPresenterControlState(serviceId);
  scrollPresenterOutlineToActive(serviceId);
}

function prepareNextServiceFromPresenter(serviceId = state.selectedServiceId, options = {}) {
  const current = state.services.find((service) => service.id === serviceId);
  if (!current) return;
  const nextServiceId = typeof options === "string" ? options : options.nextServiceId;
  const next = state.services.find((service) => service.id === nextServiceId) || nextPreparationService(current);
  if (!next) return;
  const shouldSwitchPresenter = state.presenter.serviceId === serviceId;
  state.selectedServiceId = next.id;
  state.selectedServiceTypeId = next.type_id;
  state.selectedServiceItemIndex = null;
  state.presenter.jumpDraft = "";
  if (shouldSwitchPresenter) {
    preparePresenterService(next.id);
    state.presenter.index = 0;
    state.presenter.safetyBlank = false;
    state.presenter.liveScripture = {
      ...state.presenter.liveScripture,
      active: false,
      slide: null,
    };
    state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
    publishPresenterState();
  }
  renderServiceList();
  renderPresenterDetail();
  renderPresenterControlState(next.id);
  scrollPresenterBoardToTop(next.id);
  scrollPresenterOutlineToActive(next.id);
  syncBrowserHistory();
}

function scrollPresenterBoardToTop(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  const run = () => {
    const root = document.getElementById("servicePresenterControls");
    if (!root?.isConnected) return;
    const firstThumb = root.querySelector(`.svc-slide-thumb[data-service-id="${CSS.escape(serviceId)}"][data-presenter-index="0"]`);
    const target = firstThumb?.closest(".svc-board-section") || root;
    target.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "smooth",
    });
  };
  window.requestAnimationFrame(run);
}

function scrollPresenterBoardToIndex(serviceId, index, options = {}) {
  const targetIndex = Number(index);
  if (!serviceId || !Number.isFinite(targetIndex) || targetIndex < 0) return;
  const run = () => {
    const root = document.getElementById("servicePresenterControls");
    if (!root?.isConnected) return false;
    const serviceIds = [...new Set([serviceId, state.selectedServiceId].filter(Boolean))];
    let thumb = [...root.querySelectorAll(".svc-slide-thumb[data-presenter-index][data-service-id]")]
      .find((node) => serviceIds.includes(node.dataset.serviceId) && Number(node.dataset.presenterIndex) === targetIndex);
    if (!thumb && hydrateDeferredPresenterBoardSectionForSlide(root, serviceId, targetIndex)) {
      thumb = [...root.querySelectorAll(".svc-slide-thumb[data-presenter-index][data-service-id]")]
        .find((node) => serviceIds.includes(node.dataset.serviceId) && Number(node.dataset.presenterIndex) === targetIndex);
    }
    if (!thumb) return false;
    const viewportRect = root.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const fullyVisible = thumbRect.top >= viewportRect.top
      && thumbRect.bottom <= viewportRect.bottom
      && thumbRect.left >= viewportRect.left
      && thumbRect.right <= viewportRect.right;
    if (fullyVisible && !options.force) return true;
    thumb.scrollIntoView({
      block: options.block || "center",
      inline: "nearest",
      behavior: options.behavior || "smooth",
    });
    return true;
  };
  if (run()) return;
  window.requestAnimationFrame(() => {
    if (run()) return;
    window.setTimeout(run, 0);
  });
}

function scrollPresenterOutlineToActive(serviceId = state.presenter.serviceId) {
  if (state.module !== "presenter" || state.selectedServiceId !== serviceId) return;
  window.requestAnimationFrame(() => {
    const outline = refs.songList?.querySelector(".service-outline-list");
    if (!outline?.isConnected) return;
    const activeRow = outline.querySelector(".service-outline-row--child.active")
      || outline.querySelector(".service-outline-row--ready.active")
      || outline.querySelector(".service-outline-row--section.active");
    activeRow?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  });
}

function scrollPresenterOutlineToItem(serviceId, itemIndex) {
  if (state.module !== "presenter" || !serviceId || !Number.isInteger(itemIndex)) return;
  window.requestAnimationFrame(() => {
    const outline = refs.songList?.querySelector(".service-outline-list");
    if (!outline?.isConnected) return;
    const row = outline.querySelector(
      `.service-outline-row--child[data-service-outline-service="${CSS.escape(serviceId)}"][data-service-outline-item-index="${itemIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  });
}

function stopPresenterOutput(serviceId = state.presenter.serviceId) {
  const activeServiceId = serviceId || state.presenter.serviceId;
  const outputWindow = state.presenter.outputWindow;
  state.presenter.channel?.postMessage({ type: "presenter-output-close" });
  const closeDesktopOutput = window.mindexElectron?.closePresenterOutput;
  if (closeDesktopOutput) closeDesktopOutput().catch?.(() => {});
  state.presenter.jumpDraft = "";
  state.presenter.restorePayload = null;
  state.presenter.exitArmedAt = 0;
  state.presenter.safetyBlank = false;
  state.presenter.liveScripture = {
    ...state.presenter.liveScripture,
    active: false,
    slide: null,
  };
  state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
  stopServiceMusicPlayback({ clearSource: true, mode: "manual", render: false });
  state.presenter.outputWindow = null;
  state.presenter.outputConnectedAt = 0;
  state.presenter.outputStopAt = Date.now();
  state.presenter.outputStoppingClientId = state.presenter.outputClientId;
  state.presenter.outputClientId = "";
  state.presenter.outputWarmup = null;
  stopPresenterOutputWindowMonitor();
  if (!closeDesktopOutput) {
    try {
      if (outputWindow && !outputWindow.closed) outputWindow.close?.();
    } catch {
      // Closing may be blocked for manually opened output tabs.
    }
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
    // A stopped presenter has no keyed content. Keeping this false prevents a
    // green frame from being painted while the output window is closing.
    chromakey: false,
    outputTheme: presenterOutputTheme(""),
    backgroundImage: "",
    backgroundImages: [],
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
  const index = requested - 1;
  runPresenterAction("jump", serviceId, { index });
  const count = state.presenter.serviceId === serviceId
    ? state.presenter.slides.length
    : buildServicePresenterSlides(serviceId).length;
  if (isValidPresenterIndex(index, count)) {
    scrollPresenterBoardToIndex(serviceId, index, { force: true });
  }
}

async function openPresenterOutput(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  state.presenter.outputStopAt = 0;
  state.presenter.outputStoppingClientId = "";
  preparePresenterService(serviceId);
  publishPresenterState();

  const existingWindow = presenterOutputWindowRef();
  if (existingWindow) {
    startPresenterOutputWindowMonitor(serviceId);
    existingWindow.focus?.();
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
  if (window.mindexElectron?.openPresenterOutput) {
    try {
      await window.mindexElectron.openPresenterOutput({ url, targetRect });
      startPresenterOutputWindowMonitor(serviceId);
      window.setTimeout(() => publishPresenterState(), 250);
      renderPresenterControlState(serviceId);
      return;
    } catch (error) {
      console.warn("Electron presenter window failed; falling back to browser popup.", error);
    }
  }

  const features = presenterOutputWindowFeatures(targetRect);
  const outputWindow = window.open(url, "mindexPresenterOutput", features);
  if (!outputWindow) {
    showToast("브라우저가 출력 창을 차단했습니다.", "error");
    return;
  }

  state.presenter.outputWindow = outputWindow;
  startPresenterOutputWindowMonitor(serviceId);
  outputWindow.focus();
  requestPresenterOutputFullscreenOnce(outputWindow);
  if (!targetRect) await positionPresenterOutputWindow(outputWindow);
  outputWindow.addEventListener?.("load", () => {
    publishPresenterState();
  }, { once: true });
  window.setTimeout(() => publishPresenterState(), 250);
  renderPresenterControlState(serviceId);
}

function requestPresenterOutputFullscreenOnce(outputWindow) {
  try {
    if (!outputWindow || outputWindow.closed) return;
    outputWindow.document?.documentElement?.requestFullscreen?.().catch?.(() => {});
  } catch {
    // Browsers may reject cross-window fullscreen unless the Show click activation is still alive.
  }
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
    features.push("width=1920", "height=1080");
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
    !state.presenter.outputStopAt
    &&
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
    state.presenter.outputWarmup = null;
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
  if (state.module === "presenter" && state.selectedServiceId === serviceId) {
    const root = document.getElementById("servicePresenterControls");
    const service = state.services.find((svc) => svc.id === serviceId);
    if (root?.isConnected && root.parentNode && service) {
      const active = state.presenter.serviceId === serviceId;
      const slides = presenterSlidesForService(serviceId);
      const index = active ? clampPresenterIndex(state.presenter.index, slides.length) : 0;
      const boardKey = presenterControlBoardKey(service, slides, active, presenterServiceUsesChromakey(service));
      if (root.dataset.boardKey === boardKey) {
        root.className = presenterControlsClassName(active, presenterServiceUsesChromakey(service));
        patchPresenterControlsTop(root, service, slides, active, index);
        patchPresenterBoardActiveState(root, serviceId, active, index);
        clearPresenterTransientBoardActiveMarks(root, serviceId);
        refreshIcons();
        updateSaveState();
        renderServiceList();
        return;
      }
      const focusedInput = capturePresenterFocusedInput(root);
      const template = document.createElement("template");
      template.innerHTML = renderServicePresenterControls(service, slides, active, index).trim();
      const nextRoot = template.content.firstElementChild;
      try {
        root.replaceWith(nextRoot);
      } catch (error) {
        if (error?.name !== "NotFoundError") throw error;
        renderPresenterDetail();
        return;
      }
      clearPresenterTransientBoardActiveMarks(nextRoot, serviceId);
      restorePresenterFocusedInput(nextRoot, focusedInput);
      refreshIcons();
      mountDeferredPresenterBoardSections(nextRoot, serviceId, slides);
      updateSaveState();
      renderServiceList();
      return;
    }
    renderPresenterDetail();
    return;
  }
  updateSaveState();
}

function capturePresenterFocusedInput(root) {
  const field = document.activeElement;
  if (!root?.contains(field) || !field?.matches?.("input[data-service-item-field], textarea[data-service-item-field]")) return null;
  return {
    key: field.dataset.serviceItemField || "",
    index: field.dataset.serviceItemIndex || "",
    scriptureReferenceIndex: field.dataset.scriptureReferenceIndex || "",
    value: field.value,
    initialValue: field.dataset.initialValue,
    selectionStart: typeof field.selectionStart === "number" ? field.selectionStart : null,
    selectionEnd: typeof field.selectionEnd === "number" ? field.selectionEnd : null,
  };
}

function restorePresenterFocusedInput(root, snapshot) {
  if (!root || !snapshot?.key) return;
  const selector = [
    `[data-service-item-field="${CSS.escape(snapshot.key)}"]`,
    `[data-service-item-index="${CSS.escape(snapshot.index)}"]`,
    snapshot.scriptureReferenceIndex ? `[data-scripture-reference-index="${CSS.escape(snapshot.scriptureReferenceIndex)}"]` : "",
  ].join("");
  const field = root.querySelector(selector);
  if (!field) return;
  if (typeof snapshot.value === "string") field.value = snapshot.value;
  if (snapshot.initialValue !== undefined) field.dataset.initialValue = snapshot.initialValue;
  field.focus({ preventScroll: true });
  if (snapshot.selectionStart === null || typeof field.setSelectionRange !== "function") return;
  const end = snapshot.selectionEnd ?? snapshot.selectionStart;
  field.setSelectionRange(snapshot.selectionStart, end);
}

function clearPresenterTransientBoardActiveMarks(root = document.getElementById("servicePresenterControls"), serviceId = state.selectedServiceId) {
  if (!root) return;
  const shouldClear = !presenterControllerIsLive(serviceId)
    || state.presenter.serviceId !== serviceId
    || Boolean(state.presenter.safetyBlank || state.presenter.liveScripture?.active);
  if (!shouldClear) return;
  root.querySelectorAll(".svc-slide-thumb.active, .svc-slide-thumb-wrap.active, .svc-board-section.active, .svc-board-subgroup.active")
    .forEach((node) => node.classList.remove("active"));
  syncPresenterBoardSelectionClasses(root);
}

function patchPresenterControlsTop(root, service, slides, active, index) {
  if (!root || !service) return;
  root.setAttribute("aria-label", uiText("presenter.controls"));
  const currentTop = root.querySelector(".svc-presenter-top");
  const template = document.createElement("template");
  template.innerHTML = renderPresenterControlsTop(service, slides, active, index).trim();
  const nextTop = template.content.firstElementChild;
  if (!currentTop || !nextTop) return;
  currentTop.replaceWith(nextTop);
}

function patchPresenterBoardActiveState(root, serviceId, active, index) {
  if (!root) return;
  const activeIndex = presenterBoardActiveIndex(state.presenter.slides, active, index);
  root.querySelectorAll(".svc-slide-thumb[data-presenter-index][data-service-id]").forEach((thumb) => {
    const selected = activeIndex >= 0
      && thumb.dataset.serviceId === serviceId
      && Number(thumb.dataset.presenterIndex) === activeIndex;
    thumb.classList.toggle("active", selected);
    thumb.closest(".svc-slide-thumb-wrap")?.classList.toggle("active", selected);
  });
  root.querySelectorAll(".svc-board-subgroup").forEach((subgroup) => {
    subgroup.classList.toggle("active", Boolean(subgroup.querySelector(".svc-slide-thumb.active")));
  });
  root.querySelectorAll(".svc-board-section").forEach((section) => {
    section.classList.toggle("active", Boolean(section.querySelector(".svc-slide-thumb.active")));
  });
  syncPresenterBoardSelectionClasses(root);
}

function startPresenterAtSlide(serviceId, index) {
  if (!serviceId || !Number.isFinite(Number(index))) return;
  preparePresenterService(serviceId);
  state.presenter.index = clampPresenterIndex(index, state.presenter.slides.length);
  clearPresenterBoardSelection({ render: false });
  state.presenter.safetyBlank = false;
  state.presenter.jumpDraft = "";
  state.presenter.liveScripture = {
    ...state.presenter.liveScripture,
    active: false,
    slide: null,
  };
  state.presenter.livePraise = emptyLivePraiseState(state.presenter.livePraise?.draft || state.presenter.livePraise?.query || "");
  syncSelectedServiceItemToPresenterSlide(serviceId);
  syncServiceMusicWithPresenterContext(serviceId, { render: false });
  publishPresenterState();
  openPresenterOutput(serviceId);
  renderPresenterControlState(serviceId);
  scrollPresenterOutlineToActive(serviceId);
}

function preparePresenterService(serviceId = state.selectedServiceId) {
  if (!serviceId) return;
  if (!songCatalogLoaded && !songLoadPromise && canUseClientData()) {
    void loadSongs().then(() => refreshPresenterForService(serviceId));
  }
  if (
    canUseClientData()
    && !state.loadedWorshipPresenterServiceIds.has(serviceId)
    && !getServiceOutputItems(serviceId).length
  ) {
    void loadWorshipPresenterSlides(serviceId);
  }
  warmWorshipScriptureReferencesForService(serviceId);
  schedulePendingServiceScriptureResolves(serviceId);
  const slides = buildServicePresenterSlides(serviceId);
  if (state.presenter.serviceId !== serviceId) {
    state.presenter.restorePayload = null;
    stopServiceMusicPlayback({ clearSource: true, mode: "manual", render: false });
    state.presenter.index = 0;
    state.presenter.safetyBlank = false;
    state.presenter.jumpDraft = "";
    state.presenter.liveScripture = { reference: "", draft: "", active: false, slide: null };
    state.presenter.livePraise = emptyLivePraiseState();
  }
  state.presenter.serviceId = serviceId;
  state.presenter.slides = slides;
  // Building the output can normalize projected items into a new array.
  // Keep the post-build source reference so cached slides never outlive it.
  state.presenter.sourceItems = state.serviceItems[serviceId] || null;
  state.presenter.index = clampPresenterIndex(state.presenter.index, slides.length);
  if (!slides.length) state.presenter.safetyBlank = false;
  syncServiceMusicWithPresenterContext(serviceId, { render: false });
}

function schedulePendingServiceScriptureResolves(serviceId) {
  const items = getServiceItems(serviceId);
  items.forEach((item, index) => {
    if (!isScriptureBodyServiceItem(item)) return;
    const memo = parseServiceItemMemo(item.memo);
    if (!serviceItemScriptureReferences(item, memo).length) return;
    if (serviceScriptureTextPayload(item, memo).verses.length) return;
    scheduleServiceScriptureBodyResolve(serviceId, index);
  });
}

function refreshPresenterForService(serviceId, options = {}) {
  if (!serviceId) return;
  const isActive = state.presenter.serviceId === serviceId;
  if (!isActive) {
    if (state.module === "presenter" && state.selectedServiceId === serviceId) renderPresenterControlState(serviceId);
    return;
  }
  state.presenter.slides = buildServicePresenterSlides(serviceId);
  state.presenter.sourceItems = state.serviceItems[serviceId] || null;
  state.presenter.index = clampPresenterIndex(state.presenter.index, state.presenter.slides.length);
  if (!state.presenter.slides.length) state.presenter.safetyBlank = false;
  syncServiceMusicWithPresenterContext(serviceId, { render: false });
  if (options.publish !== false) publishPresenterState();
  if (state.module === "presenter" && state.selectedServiceId === serviceId) renderPresenterControlState(serviceId);
}

function refreshPresenterForServiceType(typeId, options = {}) {
  const service = state.services.find((svc) => svc.id === state.presenter.serviceId);
  if (service?.type_id === typeId) refreshPresenterForService(service.id, options);
  const selectedService = state.services.find((svc) => svc.id === state.selectedServiceId);
  if (state.module === "presenter" && selectedService?.type_id === typeId && selectedService.id !== service?.id) {
    refreshPresenterForService(selectedService.id, { publish: false });
  }
}

function movePresenterSlide(delta) {
  const count = state.presenter.slides.length;
  if (!count) return;
  const step = delta < 0 ? -1 : 1;
  let index = state.presenter.index + step;
  while (index >= 0 && index < count && state.presenter.slides[index]?.hiddenInPresentation) index += step;
  if (index >= 0 && index < count) state.presenter.index = index;
}

function firstPresenterNavigableIndex(slides = []) {
  const index = slides.findIndex((slide) => !slide?.hiddenInPresentation);
  return index >= 0 ? index : 0;
}

function lastPresenterNavigableIndex(slides = []) {
  for (let index = slides.length - 1; index >= 0; index -= 1) {
    if (!slides[index]?.hiddenInPresentation) return index;
  }
  return Math.max(slides.length - 1, 0);
}

function clampPresenterIndex(index, count) {
  if (!count) return 0;
  return Math.min(Math.max(Number(index) || 0, 0), count - 1);
}

function presenterSlidesForService(serviceId) {
  const sourceItems = state.serviceItems[serviceId] || null;
  if (state.presenter.serviceId === serviceId
    && state.presenter.sourceItems === sourceItems
    && Array.isArray(state.presenter.slides)
    && state.presenter.slides.length) {
    state.presenter.index = clampPresenterIndex(state.presenter.index, state.presenter.slides.length);
    return state.presenter.slides;
  }
  const slides = buildServicePresenterSlides(serviceId);
  if (state.presenter.serviceId === serviceId) {
    state.presenter.slides = slides;
    state.presenter.sourceItems = state.serviceItems[serviceId] || null;
    state.presenter.index = clampPresenterIndex(state.presenter.index, slides.length);
  }
  return slides;
}

function buildServicePresenterSlides(serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  if (!service) return [];

  const outputItems = getServiceOutputItems(serviceId);
  if (outputItems.length) {
    let slides = outputItems
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((item, index) => {
        const slides = buildPresenterSlidesForServiceItem(item, service, index);
        const hidden = parseServiceItemMemo(item?.memo).hiddenInPresentation;
        return hidden ? slides.map((slide) => ({ ...slide, hiddenInPresentation: true })) : slides;
      })
      .filter(Boolean);
    slides = normalizePresenterSlidesForServiceOutput(slides, service);
    if (!slides[0] || !isPresenterPreparationSlide(slides[0])) slides = [presenterReadySlide(service), ...slides];
    return withPresenterElementTrailingBlanks(slides, service);
  }

  const worshipSlides = state.worshipPresenterSlides[serviceId] || [];
  if (worshipSlides.length) {
    const slides = worshipSlides
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((slide) => presenterSlideWithServiceAssigneeFallback(slide, service));
    const normalizedSlides = normalizePresenterSlidesForServiceOutput(slides, service);
    const serviceSlides = slides[0] && isPresenterPreparationSlide(slides[0])
      ? normalizedSlides
      : [presenterReadySlide(service), ...normalizedSlides];
    return withPresenterElementTrailingBlanks(serviceSlides, service);
  }

  return withPresenterElementTrailingBlanks([presenterReadySlide(service)], service);
}

function normalizePresenterSlidesForServiceOutput(slides = [], service = null) {
  const chromakey = presenterServiceUsesChromakey(service);
  return slides.map((slide) => {
    const outputContext = presenterSlideOutputContext(slide, chromakey);
    if (outputContext === "clean") return normalizeCleanPresenterSlideLayout(slide);
    if (outputContext === "chromakey") return normalizeChromakeyPresenterSlideLayout(slide);
    return chromakey
      ? normalizeChromakeyPresenterSlideLayout(slide)
      : normalizeCleanPresenterSlideLayout(slide);
  });
}

function normalizeCleanPresenterSlideLayout(slide = {}) {
  if (!slide || presenterSlideOutputContext(slide, false) !== "clean") return slide;
  if (presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT) return slide;
  if (presenterSlideElementType(slide) !== PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return slide;
  const title = String(slide.title || slide.sectionTitle || slide.label || "").trim();
  const rawBodyText = String(slide.assignee || presenterTitleContentBodyText(slide)).trim();
  const bodyText = compactSearchValue(rawBodyText) === compactSearchValue(title) ? "" : rawBodyText;
  return {
    ...slide,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
    layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
    type: "title-content",
    title,
    assignee: "",
    bodyText,
    text: cleanList([title, bodyText]).join("\n"),
    outputContext: "clean",
  };
}

function normalizeChromakeyPresenterSlideLayout(slide = {}) {
  if (!slide || presenterSlideOutputContext(slide, true) !== "chromakey") return slide;
  if (presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT) return slide;
  const elementType = presenterSlideElementType(slide);
  if ([
    PRESENTER_ELEMENT_TYPES.IMAGE,
    PRESENTER_ELEMENT_TYPES.VIDEO,
    PRESENTER_ELEMENT_TYPES.FILE,
    PRESENTER_ELEMENT_TYPES.AUDIO,
  ].includes(elementType)) return slide;
  const title = String(slide.title || slide.sectionTitle || slide.label || "").trim();
  const rawBodyText = presenterTitleContentBodyText(slide);
  const bodyText = compactSearchValue(rawBodyText) === compactSearchValue(title) ? "" : rawBodyText;
  if (presenterSlideIsTitleContent(slide)) {
    return {
      ...slide,
      elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
      layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
      type: "title-assignee",
      title,
      assignee: bodyText,
      text: cleanList([title, bodyText]).join("\n"),
      outputContext: "chromakey",
    };
  }
  return {
    ...slide,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: slide.type === "liturgical-body" ? "lyrics" : slide.type,
    text: String(slide.text || bodyText || title || "").trim(),
    outputContext: "chromakey",
  };
}

function presenterSlideWithServiceAssigneeFallback(slide = {}, service = null) {
  if (isPresenterScriptureReadingSource(slide)) {
    if (presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.BLANK || slide.type === "blank") {
      return {
        ...slide,
        assignee: "",
        sectionAssignee: "",
        text: "",
      };
    }
    const reference = cleanPresenterAssignee(slide.assignee || slide.text);
    const title = slide.title || "성경봉독";
    return {
      ...slide,
      title,
      assignee: reference && compactSearchValue(reference) !== compactSearchValue(title) ? reference : "",
      sectionAssignee: "",
      text: slide.elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE
        ? cleanList([title, reference && compactSearchValue(reference) !== compactSearchValue(title) ? reference : ""]).join("\n")
        : slide.text,
    };
  }
  const assignee = cleanPresenterAssignee(slide.assignee || slide.sectionAssignee);
  const worshipLeader = presenterSlideUsesWorshipLeaderAssignee(slide) ? serviceWorshipLeaderLabel(service) : "";
  const resolvedAssignee = assignee || worshipLeader;
  if (resolvedAssignee === (slide.assignee || "") && resolvedAssignee === (slide.sectionAssignee || "")) return slide;
  return {
    ...slide,
    assignee: resolvedAssignee,
    sectionAssignee: resolvedAssignee || "",
    text: slide.elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE
      ? cleanList([slide.title, resolvedAssignee]).join("\n")
      : slide.text,
  };
}

function withPresenterElementTrailingBlanks(slides = [], service = null) {
  const prepared = [];
  slides.filter(Boolean).forEach((slide, index, list) => {
    prepared.push(slide);
    if (!shouldAppendPresenterElementTrailingBlank(slide, list[index + 1], { service, slides: list })) return;
    prepared.push(presenterElementTrailingBlankSlide(slide, prepared.length, service));
  });
  return prepared;
}

function shouldAppendPresenterElementTrailingBlank(slide, nextSlide, context = {}) {
  if (!slide || slide.autoTrailingBlank) return false;
  if (slide.skipTrailingBlank) return false;
  if (presenterSlideSuppressesTrailingBlank(slide)) return false;
  if (presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.BLANK) return false;
  const currentKey = presenterSlideElementGroupKey(slide);
  const nextKey = presenterSlideElementGroupKey(nextSlide);
  if (isPresenterMainPraiseSlide(slide) && isPresenterMainPraiseSlide(nextSlide)) {
    if (currentKey && currentKey === nextKey) return false;
    return shouldAppendMainPraiseElementBlank(slide, nextSlide, context);
  }
  return Boolean(currentKey && currentKey !== nextKey);
}

function shouldAppendMainPraiseElementBlank(slide, nextSlide, context = {}) {
  const serviceType = worshipAppServiceTypeId(context.service?.type_id || "");
  if ((serviceType === "sunday-first" || serviceType === "sunday-second")
    && presenterMainPraiseElementOrdinal(slide, context.slides) === 1
    && presenterMainPraiseElementOrdinal(nextSlide, context.slides) === 2) {
    return false;
  }
  return Boolean(presenterSlideElementGroupKey(slide) && presenterSlideElementGroupKey(nextSlide));
}

function presenterMainPraiseElementOrdinal(targetSlide, slides = []) {
  const targetKey = presenterSlideElementGroupKey(targetSlide);
  if (!targetKey || !Array.isArray(slides)) return 0;
  const keys = [];
  slides.forEach((slide) => {
    if (!isPresenterMainPraiseSlide(slide) || isPresenterPraiseSectionMarkerSlide(slide)) return;
    const key = presenterSlideElementGroupKey(slide);
    if (key && !keys.includes(key)) keys.push(key);
  });
  return keys.indexOf(targetKey) + 1;
}

function presenterSlideSuppressesTrailingBlank(slide = {}) {
  const sectionKey = String(slide.sectionKey || "").trim();
  const sectionRole = String(slide.sectionRole || "").trim();
  return (
    slide.type === "ready"
    || sectionRole === "ready"
    || sectionKey === "ready"
    || sectionKey === "closing_visual"
  );
}

function presenterSlideElementGroupKey(slide) {
  if (!slide) return "";
  return String(slide.elementId || slide.sectionId || slide.id || "").trim();
}

function presenterElementTrailingBlankSlide(slide, index, service = null) {
  const idBase = slide.id || slide.elementId || slide.sectionId || `slide:${index}`;
  const serviceChromakey = presenterServiceUsesChromakey(service);
  return {
    ...slide,
    id: `${idBase}:after-blank`,
    elementType: PRESENTER_ELEMENT_TYPES.BLANK,
    layout: PRESENTER_SLIDE_LAYOUTS.BLANK,
    type: "blank",
    title: "빈 화면",
    marker: "",
    formKey: "",
    segment: "",
    text: "",
    body: "",
    bodyText: "",
    assignee: "",
    sectionAssignee: "",
    sectionKey: "",
    sectionLabel: "",
    sectionTitle: "",
    sectionName: "",
    elementLabel: "",
    elementTitle: "",
    label: "",
    warnings: [],
    imageSrc: "",
    videoSrc: "",
    media: {},
    asset: {},
    sourceType: "",
    componentType: "",
    scoreBackground: false,
    // Do not carry scripture-reading metadata into a transition blank.
    scriptureContext: "",
    scriptureReadingFinal: false,
    referenceBook: "",
    referenceRange: "",
    translationLabel: "",
    suppressBackgroundImage: false,
    noBackgroundImage: false,
    // A transition blank belongs to the service output, never to the preceding element.
    // This keeps fullscreen services clean even when the preceding item has an explicit
    // chromakey context (for example a special-song element).
    outputContext: serviceChromakey ? "chromakey" : "clean",
    autoTrailingBlank: true,
    sort: (Number(slide.sort) || index) + 0.009,
  };
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
    readyServiceName: serviceName,
    outputContext: presenterServiceUsesChromakey(service) ? "chromakey" : "clean",
    sort: -1,
  };
}

function presenterSlideElementType(slide) {
  if (slide?.elementType) return slide.elementType;
  if (slide?.type === "title") return PRESENTER_ELEMENT_TYPES.TITLE;
  if (slide?.type === "title-content") return PRESENTER_ELEMENT_TYPES.TITLE_CONTENT;
  if (slide?.type === "lyrics" || slide?.type === "song-title") return PRESENTER_ELEMENT_TYPES.PRAISE;
  if (slide?.type === "video") return PRESENTER_ELEMENT_TYPES.VIDEO;
  if (slide?.type === "audio") return PRESENTER_ELEMENT_TYPES.AUDIO;
  if (slide?.type === "image") return PRESENTER_ELEMENT_TYPES.IMAGE;
  if (slide?.type === "file") return PRESENTER_ELEMENT_TYPES.FILE;
  if (slide?.type === "blank") return PRESENTER_ELEMENT_TYPES.BLANK;
  return PRESENTER_ELEMENT_TYPES.PLAIN_TEXT;
}

function presenterSlideLayout(slide) {
  if (slide?.layout) return slide.layout;
  if (slide?.type === "lyrics" || slide?.type === "song-title") return PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT;
  if (slide?.type === "video") return PRESENTER_SLIDE_LAYOUTS.MEDIA;
  if (slide?.type === "audio") return PRESENTER_SLIDE_LAYOUTS.FILE;
  if (slide?.type === "title") return PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT;
  if (slide?.type === "image") return PRESENTER_SLIDE_LAYOUTS.MEDIA;
  if (slide?.type === "file") return PRESENTER_SLIDE_LAYOUTS.FILE;
  if (slide?.type === "blank") return PRESENTER_SLIDE_LAYOUTS.BLANK;
  return PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT;
}

function presenterSlideOutputContext(slide, fallbackChromakey = true) {
  const explicit = normalizePresenterOutputContext(
    slide?.outputContext
    || slide?.output_context
    || slide?.presenterOutputContext
    || slide?.presenter_output_context
    || "",
  );
  if (explicit) return explicit;
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (slide?.live && elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT) return "chromakey";
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return fallbackChromakey ? "chromakey" : "clean";
  const scoreLike = slide?.sourceType === "score" || slide?.componentType === "score" || slide?.scoreBackground;
  if (scoreLike) return "clean";
  if (
    layout === PRESENTER_SLIDE_LAYOUTS.MEDIA
    || layout === PRESENTER_SLIDE_LAYOUTS.FILE
    || elementType === PRESENTER_ELEMENT_TYPES.IMAGE
    || elementType === PRESENTER_ELEMENT_TYPES.VIDEO
    || elementType === PRESENTER_ELEMENT_TYPES.FILE
    || elementType === PRESENTER_ELEMENT_TYPES.AUDIO
  ) {
    return "clean";
  }
  return fallbackChromakey ? "chromakey" : "clean";
}

function normalizePresenterOutputContext(value = "") {
  const key = compactSearchValue(value);
  if (!key) return "";
  if (["chromakey", "chroma", "key", "green", "greenkey", "크로마키"].includes(key)) return "chromakey";
  if (["clean", "fullscreen", "full", "media", "image", "video", "score", "nochromakey", "no-chromakey", "풀스크린", "전체화면"].includes(key)) return "clean";
  return "";
}

function presenterSlideUsesChromakey(slide, fallbackChromakey = true) {
  return presenterSlideOutputContext(slide, fallbackChromakey) === "chromakey";
}

function presenterSlideRenderClass(slide) {
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (slide?.sourceType === "score" || slide?.componentType === "score" || slide?.scoreBackground) return "score";
  if (slide?.type === "ready" && presenterSlideOutputContext(slide, true) === "clean") return "ready";
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT) {
    if (elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT) return "scripture";
    if (elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return "title-assignee";
    return slide?.type === "song-title" ? "song-title" : "lyrics";
  }
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA) return elementType === PRESENTER_ELEMENT_TYPES.IMAGE ? "image" : "video";
  if (elementType === PRESENTER_ELEMENT_TYPES.AUDIO) return "file";
  if (layout === PRESENTER_SLIDE_LAYOUTS.FILE) return "file";
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return "blank";
  if (slide?.type === "ready") return "ready";
  if (slide?.type === "title" || elementType === PRESENTER_ELEMENT_TYPES.TITLE) return "title";
  if (slide?.type === "liturgical-body") return "liturgical-body";
  if (presenterSlideIsTitleContent(slide)) return "title-content";
  if (elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT || elementType === PRESENTER_ELEMENT_TYPES.BODY_TEXT) return "component";
  return "component";
}

const PRESENTER_SLIDE_MODEL_LAYOUT_COMPATIBILITY = Object.freeze({
  [PRESENTER_SLIDE_LAYOUTS.BLANK]: [PRESENTER_ELEMENT_TYPES.BLANK],
  [PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT]: [
    PRESENTER_ELEMENT_TYPES.TITLE,
    PRESENTER_ELEMENT_TYPES.PLAIN_TEXT,
    PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
    PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    PRESENTER_ELEMENT_TYPES.BODY_TEXT,
    PRESENTER_ELEMENT_TYPES.SCRIPTURE_READING,
    PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
    PRESENTER_ELEMENT_TYPES.PRAISE,
    PRESENTER_ELEMENT_TYPES.FREEFORM,
  ],
  [PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT]: [
    PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    PRESENTER_ELEMENT_TYPES.PRAISE,
    PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
    PRESENTER_ELEMENT_TYPES.SCRIPTURE_READING,
    PRESENTER_ELEMENT_TYPES.PLAIN_TEXT,
    PRESENTER_ELEMENT_TYPES.BODY_TEXT,
    PRESENTER_ELEMENT_TYPES.FREEFORM,
  ],
  [PRESENTER_SLIDE_LAYOUTS.MEDIA]: [
    PRESENTER_ELEMENT_TYPES.IMAGE,
    PRESENTER_ELEMENT_TYPES.VIDEO,
  ],
  [PRESENTER_SLIDE_LAYOUTS.FILE]: [
    PRESENTER_ELEMENT_TYPES.AUDIO,
    PRESENTER_ELEMENT_TYPES.FILE,
    PRESENTER_ELEMENT_TYPES.FREEFORM,
  ],
});

function presenterSlideModelIssues(slide = {}) {
  const issues = [];
  const elementType = presenterSlideElementType(slide);
  const layout = presenterSlideLayout(slide);
  if (!Object.values(PRESENTER_ELEMENT_TYPES).includes(elementType)) {
    issues.push(`unknown elementType: ${elementType || "(empty)"}`);
  }
  if (!Object.values(PRESENTER_SLIDE_LAYOUTS).includes(layout)) {
    issues.push(`unknown layout: ${layout || "(empty)"}`);
  }
  const allowedElementTypes = PRESENTER_SLIDE_MODEL_LAYOUT_COMPATIBILITY[layout] || [];
  if (allowedElementTypes.length && !allowedElementTypes.includes(elementType)) {
    issues.push(`layout ${layout} cannot render elementType ${elementType}`);
  }
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) {
    const hasVisiblePayload = Boolean(
      String(slide.text || slide.body || slide.bodyText || "").trim()
      || slide.imageSrc
      || slide.videoSrc
      || slide.audioSrc
      || slide.asset?.url
    );
    if (hasVisiblePayload) issues.push("blank slide must not carry visible payload");
  }
  if (slide.missingContent && !String(slide.inputMode || "").trim()) {
    issues.push("missingContent slide must keep inputMode");
  }
  return issues;
}

function presenterSlidesModelIssues(slides = []) {
  return (Array.isArray(slides) ? slides : []).flatMap((slide, index) =>
    presenterSlideModelIssues(slide).map((issue) => ({
      index,
      id: slide?.id || "",
      title: slide?.title || "",
      issue,
    })));
}

function presenterSlideHasMeta(slide) {
  if (presenterSlideIsTitleContent(slide)) return false;
  if (slide?.type === "liturgical-body") return false;
  return presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT && slide?.type !== "ready";
}

function presenterElementTypeSupportsTitleContent(elementType) {
  return [
    PRESENTER_ELEMENT_TYPES.PLAIN_TEXT,
    PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
    PRESENTER_ELEMENT_TYPES.BODY_TEXT,
    PRESENTER_ELEMENT_TYPES.FREEFORM,
  ].includes(elementType);
}

function presenterSlideIsTitleContent(slide) {
  if (!slide || presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT) return false;
  if (slide.type === "title-content") return true;
  const elementType = presenterSlideElementType(slide);
  if (!presenterElementTypeSupportsTitleContent(elementType)) return false;
  const title = String(slide.title || "").trim();
  const body = presenterTitleContentBodyText(slide);
  if (!title || !body) return false;
  return normalizeTitle(title) !== normalizeTitle(body);
}

function presenterFixedTitleText(item = {}) {
  const label = compactSearchValue(item?.label || item?.raw_title || "");
  const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
  if (sectionKey === "confession" && label === "사죄의선언") return "사죄의 선언";
  if (sectionKey === "announcements" && ["교회소식", "광고"].includes(label)) return "교회소식";
  if (sectionKey === "announcements" && label === "새가족환영") return "새가족환영";
  if (sectionKey === "response_song" && label === "결단기도") return "결단기도";
  if (sectionKey === "prayer_meeting" || label === "기도회" || label === "통성기도") return "통성기도";
  if (sectionKey === "free_prayer" || label === "자율기도") return "자율기도";
  if (sectionKey === "fellowship" && label === "반별모임") return "반별 모임";
  return "";
}

function resolvePresenterServiceItemContentState(item = {}, memo = emptyServiceItemMemo(), song = null, service = null) {
  const effectiveItem = serviceItemWithSharedSundayContent(item, service);
  if (effectiveItem !== item) {
    item = effectiveItem;
    memo = parseServiceItemMemo(item.memo);
    song = serviceItemLinkedSong(item);
  }
  const elementType = serviceMemoElementType(memo);
  const inputMode = serviceMemoInputMode(memo, item);
  const requiresSongSelection = serviceItemRequiresSongSelection(item, service);
  const effectiveInputMode = requiresSongSelection ? "praise_db" : inputMode;
  const rawText = String(item?.raw_title || item?.title || "").trim();
  const labelKey = compactSearchValue(item?.label || "");
  const assignee = cleanServiceAssignee(item?.assignee);
  const asset = normalizeServiceAsset(memo?.asset);
  const hasCustomSlideText = (memo.slides || []).some((slide) => String(slide || "").trim());
  const result = (stateName, hasOutputContent, reason) => ({
    state: stateName,
    hasOutputContent,
    reason,
    elementType,
    inputMode: effectiveInputMode,
    required: stateName === "missing",
  });
  const filled = (reason) => result("filled", true, reason);
  const missing = (reason) => result("missing", false, reason);
  if (presenterFixedTitleText(item)) return filled("fixed_title");
  if (elementType === "title_content" && labelKey === "환영") return filled("title_content");
  if (isLiturgicalBodyServiceItem(item)) {
    return liturgicalBodyText(item, memo, rawText) ? filled("liturgical_body") : missing("liturgical_body_empty");
  }
  if (isPublicClosingImageServiceItem(item, memo)) return filled("closing_visual_asset");
  if (isPublicFixedDoxologyServiceItem(item, memo, service)) return filled("fixed_doxology");
  if (isOptionalCitationScriptureServiceItem(item) && !serviceItemScriptureReferences(item, memo, service).length) {
    return filled("optional_citation_empty");
  }
  if (item?._worshipTemplatePlaceholder) return missing("template_placeholder");
  if (isScriptureBodyServiceItem(item)) {
    return serviceItemScriptureReferences(item, memo, service).length || serviceScriptureTextPayload(item, memo).verses.length
      ? filled("scripture_body")
      : missing(rawText ? "scripture_reference_invalid" : "scripture_body_empty");
  }
  if (elementType === "blank") return filled("blank");
  if (elementType === "live_scripture" && compactSearchValue(item?.label || "").includes("실시간성구송출")) return filled("live_scripture");
  if (inputMode === "asset") {
    return hasServiceAsset(asset) ? filled("asset") : missing("asset_empty");
  }
  if (inputMode === "praise_db" || requiresSongSelection) {
    if (song && !serviceItemSongSelectionInvalid(item, service, song)) return filled("song");
    if (item?.song_id && !serviceItemSongSelectionInvalid(item, service, song)) return filled("song");
    if (!requiresSongSelection && (rawText || hasCustomSlideText)) return filled("manual_praise");
    return missing(rawText ? "song_selection_required" : "song_empty");
  }
  if (inputMode === "scripture") {
    return serviceItemScriptureReferences(item, memo, service).length || serviceScriptureTextPayload(item, memo).verses.length
      ? filled("scripture_reference")
      : missing(rawText ? "scripture_reference_invalid" : "scripture_empty");
  }
  if (elementType === "title_person") {
    const { needsTitle, needsAssignee } = presenterServiceTextInputSpec(
      item,
      serviceItemEditorModel(item, { service }),
      memo,
    );
    if (needsTitle && !rawText) return missing("title_empty");
    if (needsAssignee && !assignee) return missing("assignee_empty");
  }
  if (song || item?.song_id) return filled("song");
  if (rawText) return filled("raw_title");
  if (assignee) return filled("assignee");
  if (hasServiceAsset(asset)) return filled("asset");
  if (hasCustomSlideText) return filled("custom_slides");
  if (presenterMemoElementIsTitleSlide(elementType)) {
    const title = presenterTitleAssigneeTitle(item, item?.label || "", "", elementType);
    const person = presenterTitleAssigneePerson(item, item?.label || "", "", title, service);
    return (title || person) ? filled("title_slide") : missing("title_slide_empty");
  }
  return missing("empty");
}

function presenterServiceItemHasOutputContent(item = {}, memo = emptyServiceItemMemo(), song = null, service = null) {
  return resolvePresenterServiceItemContentState(item, memo, song, service).hasOutputContent;
}

function presenterMissingContentSlide(item = {}, section = {}, index = 0, contentState = null) {
  const label = String(item.label || section.elementLabel || section.sectionLabel || "항목").trim();
  // A missing item must identify the actionable element, never its grouping section.
  const title = label || "항목";
  const warning = "입력 필요";
  return {
    id: `${item.id || index}:missing-content`,
    ...section,
    elementLabel: label,
    elementTitle: title,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "title-assignee",
    label,
    title,
    assignee: warning,
    marker: "",
    text: cleanList([title, warning]).join("\n"),
    warnings: [warning],
    missingContent: true,
    missingReason: contentState?.reason || "",
    inputMode: contentState?.inputMode || "",
    contentState: contentState?.state || "missing",
    skipTrailingBlank: true,
    sort: index,
  };
}

function presenterOptionalCitationLiveControlSlide(item = {}, section = {}, index = 0) {
  const label = String(item.label || "인용 구절").trim() || "인용 구절";
  return {
    id: `${item.id || index}:live-scripture-control`,
    ...section,
    elementLabel: label,
    elementTitle: label,
    elementType: PRESENTER_ELEMENT_TYPES.BLANK,
    layout: PRESENTER_SLIDE_LAYOUTS.BLANK,
    type: "blank",
    label,
    title: "빈 화면",
    marker: "",
    text: "",
    liveScriptureControl: true,
    citationQuickInsert: true,
    skipTrailingBlank: true,
    sort: index,
  };
}

function buildPresenterSlidesForServiceItem(item, service, index) {
  item = serviceItemWithSharedSundayContent(item, service);
  const initialMemo = parseServiceItemMemo(item?.memo);
  if (isPublicFixedDoxologyServiceItem(item, initialMemo, service) && !item?._worshipElementTemplateModified) {
    item = { ...item, raw_title: publicFixedDoxologyDisplayText(service) };
  }
  const label = item.label || "";
  const displayText = serviceItemDisplayText(item);
  const song = presenterSongForServiceItem(item, displayText, label, service);
  const version = song ? getPresenterServiceItemVersion(song, item, service) : null;
  const formPlan = version ? presenterFormPlanForServiceItem(version, item, song) : { forms: [], warnings: [] };
  const forms = formPlan.forms;
  const formWarnings = formPlan.warnings;
  const memo = initialMemo;
  const linkedSongId = String(item.song_id || item.songId || "").trim();
  const templateOwnedScoreSong = isPublicFixedDoxologyServiceItem(item, memo, service);
  if (isPublicClosingImageServiceItem(item, memo) && !hasServiceAsset(memo.asset)) {
    memo.asset = { ...PUBLIC_WORSHIP_CLOSING_IMAGE_ASSET };
  }
  const memoElementType = serviceMemoElementType(memo);
  const requestedOutputMode = normalizeServiceOutputMode(
    memo.outputMode
    || item.outputMode
    || item.output_mode
    || item.renderMode
    || item.render_mode,
  );
  const outputMode = serviceItemOutputMode(item, memo);
  if (isServicePreparationItem(item, memo)) {
    return [presenterPreparationSlide(service, item, index)];
  }
  const confessionPrayer = isConfessionPrayerServiceItem(item);
  const section = presenterSectionForServiceItem(item, index, displayText, song, version);
  const withIntro = (slides) => presenterSlidesWithIntroSlide(item, section, index, memo, slides);
  const withSpecialTitle = (slides) => presenterSlidesWithSpecialSongTitle(item, section, slides, index, service);
  const withIntroAndSpecialTitle = (slides) => withIntro(withSpecialTitle(slides));
  const contentState = resolvePresenterServiceItemContentState(item, memo, song, service);
  const fixedTitle = presenterFixedTitleText(item);
  if (fixedTitle) return [presenterTitleOnlySlide(item, section, index, fixedTitle)];
  if (isOptionalCitationScriptureServiceItem(item)
    && !serviceItemScriptureReferences(item, memo, service).length
    && !serviceScriptureTextPayload(item, memo).verses.length) {
    return [presenterOptionalCitationLiveControlSlide(item, section, index)];
  }
  if (!confessionPrayer && !contentState.hasOutputContent) {
    return withIntroAndSpecialTitle([presenterMissingContentSlide(item, section, index, contentState)]);
  }
  if (confessionPrayer) return [presenterConfessionPrayerSlide(item, section, index)];
  if (memoElementType === "title") return withIntroAndSpecialTitle([presenterTitleOnlySlide(item, section, index, displayText || label || "제목")]);
  if (memoElementType === "title_content") {
    const titleContentSlide = presenterElementSlideFromMemo(item, section, index, memo, displayText, service);
    if (Array.isArray(titleContentSlide)) return withIntroAndSpecialTitle(titleContentSlide);
    if (titleContentSlide) return withIntroAndSpecialTitle([titleContentSlide]);
  }
  const liturgicalSlides = buildPresenterLiturgicalBodySlides(item, section, index, service, memo, displayText);
  if (liturgicalSlides.length) return withIntroAndSpecialTitle(liturgicalSlides);
  const elementSlide = presenterElementSlideFromMemo(item, section, index, memo, displayText, service);
  if (Array.isArray(elementSlide)) return withIntroAndSpecialTitle(elementSlide);
  if (elementSlide) return withIntroAndSpecialTitle([elementSlide]);
  const videoSrc = presenterVideoSourceFromServiceItem(item, displayText);

  if (videoSrc) {
    const videoTitle = label || "Video";
    return withIntroAndSpecialTitle([{
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
      playback: presenterPlaybackConfig(memo.playback, "video"),
      sourceType: "video",
      componentType: "video",
      sort: index,
    }]);
  }

  if (serviceItemRequiresSongSelection(item, service) && (!song || serviceItemSongSelectionInvalid(item, service, song))) return [];

  const customSlides = buildPresenterCustomSlides(item, section, index);
  if (customSlides.length) return withIntroAndSpecialTitle(customSlides);

  const scriptureTextSlides = buildPresenterScriptureTextSlides(item, section, index, service);
  if (scriptureTextSlides.length) {
    return withIntroAndSpecialTitle(presenterSlidesWithScriptureReadingTitle(item, section, scriptureTextSlides, index, service));
  }
  if (isScriptureBodyServiceItem(item)) return [];

  const specialSongItem = isSpecialSongServiceItem(item);
  const songLikeItem = isSongServiceLabel(label) || specialSongItem;
  const scoreOutput = !specialSongItem && (outputMode === "score" || requestedOutputMode === "score");
  if (scoreOutput && !linkedSongId && !song && !templateOwnedScoreSong) {
    return [];
  }
  if (scoreOutput) {
    if (!song) return [];
    const scoreSlides = presenterScoreSlidesForServiceItem(item, section, index, song, version, displayText, memo, forms, formWarnings);
    const slides = shouldSuppressMainPraiseScoreSongTitle(item, service)
      ? scoreSlides
      : [
	        ...(song && shouldIncludeSongTitleSlide(item, label) ? [presenterSongTitleSlide(item, section, song, version, displayText, index)] : []),
        ...scoreSlides,
      ];
    return withIntro(presenterSlidesWithSpecialSongTitle(item, section, slides, index, service));
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
    const slides = shouldIncludeSongTitleSlide(item, label)
      ? presenterSlidesWithSpecialSongTitle(item, section, [
          presenterSongTitleSlide(item, section, song, version, displayText, index),
          ...lyricsSlides,
        ], index, service)
      : lyricsSlides;
    return withIntro(slides);
  }

  if (!specialSongItem && song && presenterHymnScoreAssetSlides(song, version, displayText).length) {
    const scoreSlides = presenterScoreSlidesForServiceItem(item, section, index, song, version, displayText, memo, forms, formWarnings);
    const slides = [
	      ...(song && shouldIncludeSongTitleSlide(item, label) ? [presenterSongTitleSlide(item, section, song, version, displayText, index)] : []),
      ...scoreSlides,
    ];
    return withIntro(presenterSlidesWithSpecialSongTitle(item, section, slides, index, service));
  }

  const { no, title } = splitHymnNo(displayText);
  if (scoreOutput && !song && !templateOwnedScoreSong) return [];
  if (!songLikeItem) return [];
  if (serviceItemRequiresSongSelection(item, service) && (!song || serviceItemSongSelectionInvalid(item, service, song))) return [];
  const sectionHeading = presenterSongTitleSectionHeading(item, section);
  return withIntro(presenterSlidesWithSpecialSongTitle(item, section, [{
    id: `${item.id || index}:title`,
    ...section,
    elementType: songLikeItem ? PRESENTER_ELEMENT_TYPES.PRAISE : PRESENTER_ELEMENT_TYPES.PLAIN_TEXT,
    layout: songLikeItem ? PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT : PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
    type: songLikeItem ? "song-title" : "component",
    label,
    title,
    marker: no || "",
    sectionHeading,
    text: formatPresenterSongTitleText(presenterSongTitleDisplayTitle(null, null, displayText, sectionHeading)),
    sort: index,
  }], index, service));
}

function shouldSuppressMainPraiseScoreSongTitle(item = {}, service = {}) {
  const appTypeId = worshipAppServiceTypeId(service?.type_id);
  if (appTypeId !== "sunday-first" && appTypeId !== "sunday-second") return false;
  return isMainPraiseServiceItem(item);
}

function presenterElementSlideFromMemo(item, section, index, memo, displayText, service = null) {
  return presenterElementSlideFromMemoCore(item, section, index, memo, displayText, service);
}

function initPresenterOutput() {
  return initPresenterOutputCore();
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
  const praiseTeam = String(form.praiseTeam || "").replace(/\s+/g, " ").trim();
  if (praiseTeam) tags.unshift(`찬양팀: ${praiseTeam}`);
  const servicePayload = {
    id: serviceId,
    service_type_id: canonicalWorshipServiceTypeId(typeId),
    service_date: date,
    title: String(form.title || "").trim(),
    status: "draft",
    worship_leader: defaultServiceWorshipLeader(typeId),
    praise_leader: serviceUsesPraiseLeader(typeId) ? String(form.leader || "").trim() : "",
    tags,
    source_kind: "mindex",
    source_ref: { created_from: "mindex_template", app_service_type_id: typeId },
    notes: "",
  };
  state.saving = true;
  updateSaveState();
  try {
    const { data: serviceRow, error: serviceError } = await state.client
      .from("mindex_worship_services")
      .insert(servicePayload)
      .select("*")
      .single();
    if (serviceError) throw serviceError;

    const service = normalizeWorshipService(serviceRow || servicePayload);
    state.services = sortServicesByDate([service, ...state.services]);
    state.serviceItems[service.id] = projectWorshipServiceItemsFromTemplate(service, []);
    state.selectedServiceTypeId = service.type_id;
    state.selectedServiceId = service.id;
    state.selectedServiceItemIndex = 0;
    state.newServiceForm = null;
    state.dirty.service = false;
    renderServiceList();
    renderCurrentServiceModuleDetail();
    syncBrowserHistory();
    showToast("예배를 추가했습니다.");
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
  renderCurrentServiceModuleDetail();
  renderServiceList();
  syncBrowserHistory();
  if (id) loadServiceItems(id);
}

async function openHomeNextService(action = "presenter", serviceId = "") {
  const id = serviceId || getHomeNextService()?.id;
  if (!id) {
    showToast("준비된 다음 예배가 없습니다.", "info");
    return;
  }
  if (action === "presenter") {
    await openServiceInPresenter(id);
    return;
  }
  if (id !== state.selectedServiceId && !confirmDiscardServiceChanges()) return;
  state.selectedServiceId = id;
  state.selectedServiceItemIndex = 0;
  const service = state.services.find((entry) => entry.id === id);
  if (service) state.selectedServiceTypeId = service.type_id;
  await loadServiceItems(id);
  await switchModule("service", { clearSearch: false });
}

async function openServiceInPresenter(id) {
  if (!id) return;
  if (id !== state.selectedServiceId && !confirmDiscardServiceChanges()) return;
  state.selectedServiceId = id;
  state.selectedServiceItemIndex = 0;
  const service = state.services.find((svc) => svc.id === id);
  if (service) state.selectedServiceTypeId = service.type_id;
  await loadServiceItems(id);
  await switchModule("presenter", { clearSearch: false });
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
