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

const BIBLE_BOOKS = [
  ["GEN", "창세기", "Genesis", "Old Testament", "Pentateuch", "Book of Genesis", "Torah", "Moses"],
  ["EXO", "출애굽기", "Exodus", "Old Testament", "Pentateuch", "Book of Exodus", "Torah", "Moses"],
  ["LEV", "레위기", "Leviticus", "Old Testament", "Pentateuch", "Book of Leviticus", "Torah", "Moses"],
  ["NUM", "민수기", "Numbers", "Old Testament", "Pentateuch", "Book of Numbers", "Torah", "Moses"],
  ["DEU", "신명기", "Deuteronomy", "Old Testament", "Pentateuch", "Book of Deuteronomy", "Torah", "Moses"],
  ["JOS", "여호수아", "Joshua", "Old Testament", "Historical Books", "Book of Joshua", "Former Prophets, Nevi’im", "Joshua"],
  ["JDG", "사사기", "Judges", "Old Testament", "Historical Books", "Book of Judges", "Former Prophets, Nevi’im", "Samuel"],
  ["RUT", "룻기", "Ruth", "Old Testament", "Historical Books", "Book of Ruth", "Five Megillot, Ketuvim", "Samuel"],
  ["1SA", "사무엘상", "1 Samuel", "Old Testament", "Historical Books", "Books of Samuel", "Former Prophets, Nevi’im", "Samuel"],
  ["2SA", "사무엘하", "2 Samuel", "Old Testament", "Historical Books", "Books of Samuel", "Former Prophets, Nevi’im", "Samuel"],
  ["1KI", "열왕기상", "1 Kings", "Old Testament", "Historical Books", "Books of Kings", "Former Prophets, Nevi’im", "Jeremiah"],
  ["2KI", "열왕기하", "2 Kings", "Old Testament", "Historical Books", "Books of Kings", "Former Prophets, Nevi’im", "Jeremiah"],
  ["1CH", "역대상", "1 Chronicles", "Old Testament", "Historical Books", "Books of Chronicles", "Historical Books, Ketuvim", "Chronicler, Jeremiah"],
  ["2CH", "역대하", "2 Chronicles", "Old Testament", "Historical Books", "Books of Chronicles", "Historical Books, Ketuvim", "Chronicler, Jeremiah"],
  ["EZR", "에스라", "Ezra", "Old Testament", "Historical Books", "Book of Ezra", "Historical Books, Ketuvim", "Chronicler, Ezra"],
  ["NEH", "느헤미야", "Nehemiah", "Old Testament", "Historical Books", "Book of Nehemiah", "Historical Books, Ketuvim", "Chronicler, Nehemiah"],
  ["EST", "에스더", "Esther", "Old Testament", "Historical Books", "Book of Esther", "Five Megillot, Ketuvim", "?"],
  ["JOB", "욥기", "Job", "Old Testament", "Poetic Books", "Book of Job", "Ketuvim, Poetic Books", "?"],
  ["PSA", "시편", "Psalms", "Old Testament", "Poetic Books", "Book of Psalms", "Ketuvim, Poetic Books", "David"],
  ["PRO", "잠언", "Proverbs", "Old Testament", "Poetic Books", "Book of Proverbs", "Ketuvim, Poetic Books", "Solomon"],
  ["ECC", "전도서", "Ecclesiastes", "Old Testament", "Poetic Books", "Ecclesiastes", "Five Megillot, Ketuvim", "Solomon"],
  ["SNG", "아가", "Song of Songs", "Old Testament", "Poetic Books", "Song of Songs", "Five Megillot, Ketuvim", "Solomon"],
  ["ISA", "이사야", "Isaiah", "Old Testament", "Major Prophets, Prophetic Books", "Book of Isaiah", "Latter Prophets, Nevi’im", "Isaiah"],
  ["JER", "예레미야", "Jeremiah", "Old Testament", "Major Prophets, Prophetic Books", "Book of Jeremiah", "Latter Prophets, Nevi’im", "Jeremiah"],
  ["LAM", "예레미야애가", "Lamentations", "Old Testament", "Major Prophets, Prophetic Books", "Book of Lamentations", "Five Megillot, Ketuvim", "Jeremiah"],
  ["EZK", "에스겔", "Ezekiel", "Old Testament", "Major Prophets, Prophetic Books", "Book of Ezekiel", "Latter Prophets, Nevi’im", "Ezekiel"],
  ["DAN", "다니엘", "Daniel", "Old Testament", "Major Prophets, Prophetic Books", "Book of Daniel", "Historical Books, Ketuvim", "Daniel"],
  ["HOS", "호세아", "Hosea", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Hosea", "Latter Prophets, Nevi’im, Trei Asar", "Hosea"],
  ["JOL", "요엘", "Joel", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Joel", "Latter Prophets, Nevi’im, Trei Asar", "Joel"],
  ["AMO", "아모스", "Amos", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Amos", "Latter Prophets, Nevi’im, Trei Asar", "Amos"],
  ["OBA", "오바댜", "Obadiah", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Obadiah", "Latter Prophets, Nevi’im, Trei Asar", "Obadiah"],
  ["JON", "요나", "Jonah", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Jonah", "Latter Prophets, Nevi’im, Trei Asar", "Jonah"],
  ["MIC", "미가", "Micah", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Micah", "Latter Prophets, Nevi’im, Trei Asar", "Micah"],
  ["NAM", "나훔", "Nahum", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Nahum", "Latter Prophets, Nevi’im, Trei Asar", "Nahum"],
  ["HAB", "하박국", "Habakkuk", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Habakkuk", "Latter Prophets, Nevi’im, Trei Asar", "Habakkuk"],
  ["ZEP", "스바냐", "Zephaniah", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Zephaniah", "Latter Prophets, Nevi’im, Trei Asar", "Zephaniah"],
  ["HAG", "학개", "Haggai", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Haggai", "Latter Prophets, Nevi’im, Trei Asar", "Haggai"],
  ["ZEC", "스가랴", "Zechariah", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Zechariah", "Latter Prophets, Nevi’im, Trei Asar", "Zechariah"],
  ["MAL", "말라기", "Malachi", "Old Testament", "Minor Prophets, Prophetic Books", "Book of Malachi", "Latter Prophets, Nevi’im, Trei Asar", "Malachi"],
  ["MAT", "마태복음", "Matthew", "New Testament", "Gospels", "Gospel of Matthew", "", "Matthew"],
  ["MRK", "마가복음", "Mark", "New Testament", "Gospels", "Gospel of Mark", "", "Mark"],
  ["LUK", "누가복음", "Luke", "New Testament", "Gospels", "Gospel of Luke", "", "Luke"],
  ["JHN", "요한복음", "John", "New Testament", "Gospels", "Gospel of John", "", "John"],
  ["ACT", "사도행전", "Acts", "New Testament", "Acts", "Acts of the Apostles", "", "Luke"],
  ["ROM", "로마서", "Romans", "New Testament", "Pauline Epistles", "Epistle to the Romans", "", "Paul"],
  ["1CO", "고린도전서", "1 Corinthians", "New Testament", "Pauline Epistles", "Epistles to the Corinthians", "", "Paul"],
  ["2CO", "고린도후서", "2 Corinthians", "New Testament", "Pauline Epistles", "Epistles to the Corinthians", "", "Paul"],
  ["GAL", "갈라디아서", "Galatians", "New Testament", "Pauline Epistles", "Epistle to the Galatians", "", "Paul"],
  ["EPH", "에베소서", "Ephesians", "New Testament", "Pauline Epistles", "Epistle to the Ephesians", "", "Paul"],
  ["PHP", "빌립보서", "Philippians", "New Testament", "Pauline Epistles", "Epistle to the Philippians", "", "Paul"],
  ["COL", "골로새서", "Colossians", "New Testament", "Pauline Epistles", "Epistle to the Colossians", "", "Paul"],
  ["1TH", "데살로니가전서", "1 Thessalonians", "New Testament", "Pauline Epistles", "Epistles to the Thessalonians", "", "Paul"],
  ["2TH", "데살로니가후서", "2 Thessalonians", "New Testament", "Pauline Epistles", "Epistles to the Thessalonians", "", "Paul"],
  ["1TI", "디모데전서", "1 Timothy", "New Testament", "Pauline Epistles", "Epistles to Timothy", "", "Paul"],
  ["2TI", "디모데후서", "2 Timothy", "New Testament", "Pauline Epistles", "Epistles to Timothy", "", "Paul"],
  ["TIT", "디도서", "Titus", "New Testament", "Pauline Epistles", "Epistle to Titus", "", "Paul"],
  ["PHM", "빌레몬서", "Philemon", "New Testament", "Pauline Epistles", "Epistle to Philemon", "", "Paul"],
  ["HEB", "히브리서", "Hebrews", "New Testament", "Pauline Epistles", "Epistle to the Hebrews", "", "?"],
  ["JAS", "야고보서", "James", "New Testament", "Catholic Epistles", "Epistle of James", "", "James"],
  ["1PE", "베드로전서", "1 Peter", "New Testament", "Catholic Epistles", "Epistles of Peter", "", "Peter"],
  ["2PE", "베드로후서", "2 Peter", "New Testament", "Catholic Epistles", "Epistles of Peter", "", "Peter"],
  ["1JN", "요한일서", "1 John", "New Testament", "Catholic Epistles", "Epistles of John", "", "John"],
  ["2JN", "요한이서", "2 John", "New Testament", "Catholic Epistles", "Epistles of John", "", "John"],
  ["3JN", "요한삼서", "3 John", "New Testament", "Catholic Epistles", "Epistles of John", "", "John"],
  ["JUD", "유다서", "Jude", "New Testament", "Catholic Epistles", "Epistle of Jude", "", "Jude"],
  ["REV", "요한계시록", "Revelation", "New Testament", "Apocalypse", "Book of Revelation", "", "John"],
].map(([code, koreanName, englishName, testament, division, canonicalEnglishTitle, jewishCategory, author], index) => ({
  code,
  koreanName,
  englishName,
  testament,
  division,
  canonicalEnglishTitle,
  jewishCategory,
  author,
  sortOrder: index + 1,
}));

const STORAGE = {
  url: "mindex.supabase.url",
  key: "mindex.supabase.anonKey",
  theme: "mindex.theme",
  module: "mindex.ui.module",
  praiseFilter: "mindex.ui.praiseFilter",
  scriptureFilter: "mindex.ui.scriptureFilter",
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
  selectedSongId: null,
  selectedVersionId: null,
  selectedScriptureId: null,
  selectedBookCode: null,
  praiseFilter: "all",
  scriptureFilter: "all",
  listScroll: {},
  forms: [],
  search: "",
  loading: false,
  saving: false,
  theme: "light",
  connectionError: "",
  scriptureError: "",
  dirty: {
    song: false,
    forms: false,
    scripture: false,
  },
};

const refs = {};

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

  if (state.client) {
    loadSongs();
    loadScriptureBooks({ silent: true });
    loadScriptures({ silent: true });
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
  refs.praiseFilter = document.getElementById("praiseFilter");
  refs.praiseFilterButtons = [...document.querySelectorAll("[data-praise-filter]")];
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
    renderSongList();
    if (state.module === "scripture") renderDetail();
  });
  refs.praiseFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-praise-filter]");
    if (!button) return;
    saveCurrentListScroll();
    if (state.module === "scripture") {
      state.scriptureFilter = button.dataset.praiseFilter;
      clearSelectedBookOutsideFilter();
    } else {
      state.praiseFilter = button.dataset.praiseFilter;
    }
    persistUiState();
    renderSongList();
    renderPraiseFilter();
    if (state.module === "scripture") renderDetail();
  });
  refs.songList.addEventListener("scroll", saveCurrentListScroll, { passive: true });

  refs.songList.addEventListener("click", (event) => {
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
      selectScriptureBook(bookItem.dataset.bookCode);
    }
  });

  refs.detailPane.addEventListener("click", handleDetailClick);
  refs.detailPane.addEventListener("keydown", handleDetailKeydown);
  refs.detailPane.addEventListener("input", handleDetailInput);
  refs.detailPane.addEventListener("change", handleDetailChange);

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

    handleSongNavigationKeydown(event);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!hasDirtyChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

function handleSongNavigationKeydown(event) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (shouldKeepArrowKeyInFocusedControl(event.target)) return;

  const items = state.module === "scripture" ? getFilteredBibleBooks() : getFilteredSongs();
  if (!items.length) return;

  const selectedId = state.module === "scripture" ? state.selectedBookCode : state.selectedSongId;
  const foundIndex = items.findIndex((item) => (state.module === "scripture" ? item.code : item.id) === selectedId);
  const currentIndex = foundIndex >= 0 ? foundIndex : event.key === "ArrowDown" ? -1 : items.length;
  const nextIndex =
    event.key === "ArrowDown"
      ? Math.min(currentIndex + 1, items.length - 1)
      : Math.max(currentIndex - 1, 0);
  const nextItem = items[nextIndex];

  event.preventDefault();
  const nextId = state.module === "scripture" ? nextItem?.code : nextItem?.id;
  if (!nextId || nextId === selectedId) return;
  if (state.module === "scripture") selectScriptureBook(nextId);
  else selectSong(nextItem.id);
}

function shouldKeepArrowKeyInFocusedControl(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element === refs.searchInput) return false;
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

  if (["praise", "scripture"].includes(moduleName)) state.module = moduleName;
  if (["all", "hymns", "ccm"].includes(praiseFilter)) state.praiseFilter = praiseFilter;
  if (["all", "old", "new"].includes(scriptureFilter)) state.scriptureFilter = scriptureFilter;

  state.selectedSongId = sessionStorage.getItem(STORAGE.selectedSongId) || null;
  state.selectedVersionId = sessionStorage.getItem(STORAGE.selectedVersionId) || null;
  state.selectedScriptureId = sessionStorage.getItem(STORAGE.selectedScriptureId) || null;
  state.selectedBookCode = sessionStorage.getItem(STORAGE.selectedBookCode) || null;
}

function persistUiState() {
  sessionStorage.setItem(STORAGE.module, state.module);
  sessionStorage.setItem(STORAGE.praiseFilter, state.praiseFilter);
  sessionStorage.setItem(STORAGE.scriptureFilter, state.scriptureFilter);
  writeStorageValue(STORAGE.selectedSongId, state.selectedSongId);
  writeStorageValue(STORAGE.selectedVersionId, state.selectedVersionId);
  writeStorageValue(STORAGE.selectedScriptureId, state.selectedScriptureId);
  writeStorageValue(STORAGE.selectedBookCode, state.selectedBookCode);
}

function writeStorageValue(key, value) {
  if (value) sessionStorage.setItem(key, value);
  else sessionStorage.removeItem(key);
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

async function switchModule(moduleName) {
  if (!["praise", "scripture"].includes(moduleName)) return;
  if (moduleName === state.module) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  saveCurrentListScroll();
  state.module = moduleName;
  state.search = "";
  refs.searchInput.value = "";
  state.dirty.song = false;
  state.dirty.forms = false;
  state.dirty.scripture = false;
  persistUiState();
  render();

  if (moduleName === "scripture" && !state.scriptures.length && !state.scriptureError) {
    if (!state.scriptureBooks.length) await loadScriptureBooks();
    await loadScriptures();
  }

  if (moduleName === "praise" && state.selectedSongId && state.selectedVersionId && !state.forms.length) {
    await loadForms(state.selectedVersionId);
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
      : getDefaultVersionId(selectedSong);
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

async function selectSong(songId) {
  if (songId === state.selectedSongId) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  state.selectedSongId = songId;
  state.selectedVersionId = getDefaultVersionId(getSelectedSong());
  state.forms = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  persistUiState();
  render();
  focusSelectedSong();
  await loadForms(state.selectedVersionId);
  focusSelectedSong();
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
  focusSelectedItem();
}

function selectScriptureBook(bookCode) {
  if (bookCode === state.selectedBookCode) return;
  state.selectedBookCode = bookCode;
  state.selectedScriptureId = null;
  state.dirty.scripture = false;
  persistUiState();
  render();
  requestAnimationFrame(focusSelectedItem);
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

async function saveSongMeta(song) {
  const payload = {
    title: song.title.trim(),
    memo: serializeSongMemo(song),
  };

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
  }));
}

function handleDetailClick(event) {
  const addButton = event.target.closest("[data-add-form]");
  if (addButton) {
    addForm(addButton.dataset.addForm);
    return;
  }

  const addVersionButton = event.target.closest("[data-add-version]");
  if (addVersionButton) {
    addVersion();
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

  const versionTarget = event.target.closest(".version-picker[data-version-id]");
  if (!versionTarget) return;

  event.preventDefault();
  selectVersion(versionTarget.dataset.versionId);
}

function handleDetailInput(event) {
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

  const formField = event.target.closest("[data-form-field]");
  if (formField) {
    updateFormField(formField);
    return;
  }

}

function handleDetailChange(event) {
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

function updateSongField(field) {
  const song = getSelectedSong();
  if (!song) return;

  const key = field.dataset.songField;
  if (key === "is_active") {
    song[key] = field.checked;
  } else if (key === "alt_titles") {
    song[key] = parseList(field.value);
  } else {
    song[key] = field.value;
  }

  if (key === "title") {
    updateEditorTitle(song);
  }

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

function addVersion() {
  const song = getSelectedSong();
  if (!song) return;

  try {
    writeFormsToSelectedVersion();
  } catch {
    return;
  }

  const defaultName = `Version ${(song.versions || []).length + 1}`;
  const name = prompt("Version name", defaultName);
  if (name === null) return;

  const cleanName = name.trim() || defaultName;
  const versionId = createLocalId();
  const sourceForms = state.forms.map((form, index) =>
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

  if (action === "delete") {
    state.forms.splice(index, 1);
  }

  state.forms = normalizeForms(state.forms);
  state.dirty.forms = true;
  renderDetail();
  updateSaveState();
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
      ? "Search book, category, author..."
      : "Search title, lyrics, #...";
  refs.newSongBtn.title = state.module === "scripture" ? "New scripture" : "New song";
  refs.saveAllBtn.title = state.module === "scripture" ? "Save scripture" : "Save song";
  refs.saveAllBtn.setAttribute("aria-label", refs.saveAllBtn.title);
  renderPraiseFilter();
}

function renderPraiseFilter() {
  refs.praiseFilter.hidden = false;
  const filters = state.module === "scripture"
    ? [
        ["all", "All"],
        ["old", "OT"],
        ["new", "NT"],
      ]
    : [
        ["all", "All"],
        ["hymns", "Hymns"],
        ["ccm", "CCM"],
      ];
  const activeFilter = state.module === "scripture" ? state.scriptureFilter : state.praiseFilter;
  for (const button of refs.praiseFilterButtons) {
    const [value, label] = filters[refs.praiseFilterButtons.indexOf(button)] || filters[0];
    button.dataset.praiseFilter = value;
    button.textContent = label;
    const active = value === activeFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function renderConnectionStatus() {
  const hasClient = Boolean(state.client);
  const hasDirty = hasDirtyChanges();
  refs.connectionStatus.className = "status-pill";
  refs.connectionStatus.title = "";

  if (state.loading) {
    refs.connectionStatus.textContent = "Loading";
    return;
  }

  if (state.connectionError) {
    refs.connectionStatus.textContent = "Error";
    refs.connectionStatus.classList.add("error");
    refs.connectionStatus.title = state.connectionError;
    return;
  }

  if (!hasClient) {
    refs.connectionStatus.textContent = "Disconnected";
    return;
  }

  if (hasDirty) {
    refs.connectionStatus.textContent = "Unsaved";
    refs.connectionStatus.classList.add("unsaved");
    return;
  }

  refs.connectionStatus.textContent = "Connected";
  refs.connectionStatus.classList.add("connected");
}

function renderSongList() {
  if (state.module === "scripture") {
    renderScriptureList();
    return;
  }

  const filtered = getFilteredSongs();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  const filterBase = getSongsForPraiseFilter();
  refs.songCount.textContent = hasSearch
    ? `${filtered.length} of ${filterBase.length} songs`
    : `${filtered.length} ${filtered.length === 1 ? "song" : "songs"}`;

  if (!filtered.length) {
    refs.songList.innerHTML = `<div class="song-list-empty">No songs</div>`;
    return;
  }

  refs.songList.innerHTML = filtered
    .map((song) => {
      const active = song.id === state.selectedSongId ? " active" : "";
      const metaLine = hasSearch ? songSearchHint(song) || songTitleMetaLine(song) : songTitleMetaLine(song);
      const titleText = song.hymn_no ? stripHymnNumber(song.title) : song.title;
      return `
        <button class="song-item${active}" type="button" data-song-id="${escapeAttr(song.id)}">
          <span class="song-title">
            ${song.hymn_no ? `<span class="song-hymn-no">${escapeHtml(formatHymnMarker(song.hymn_no))}</span>` : ""}
            <span class="song-title-text">${escapeHtml(titleText)}</span>
            ${song.versions?.length > 1 ? `<span class="song-count-badge">${song.versions.length}</span>` : ""}
            ${renderSongAttentionIcon(song)}
          </span>
        </button>
      `;
    })
    .join("");
  restoreCurrentListScroll();
}

function renderScriptureList() {
  const books = getBibleBooksForScriptureFilter();
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
    refs.songList.innerHTML = `<div class="song-list-empty">No books</div>`;
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
  restoreCurrentListScroll();
}

function focusSelectedSong() {
  focusSelectedItem();
}

function getListScrollKey() {
  const search = normalizeSearchValue(state.search);
  if (state.module === "scripture") return `scripture:${state.scriptureFilter}:${search}`;
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
            <span>${escapeHtml(song.title || "Untitled Song")}</span>
          </h2>
          <div class="editor-meta-stack">
            <div class="editor-title-meta${titleMetaLine ? "" : " empty"}">${escapeHtml(titleMetaLine || "Metadata")}</div>
            <div class="editor-support-meta${supportMetaItems.length ? "" : " empty"}">
              ${
                supportMetaItems.length
                  ? supportMetaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")
                  : `<span>Support metadata</span>`
              }
            </div>
          </div>
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
          <button class="btn secondary" type="button" data-add-version title="Add version">
            <i data-lucide="copy-plus"></i>
            <span>Add Version</span>
          </button>
        </div>
      </header>

      ${renderFormsTab(song)}
    </div>
  `;

  refreshIcons();
  resizeFormTextareas();
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
    refs.detailPane.innerHTML = `
      <div class="editor-shell scripture-editor scripture-taxonomy-editor">
        <header class="editor-head">
          <div class="editor-title">
            <h2>
              <span>${escapeHtml(selectedBook?.koreanName || "Bible Books")}</span>
              ${renderScriptureBookMarker(selectedBook)}
            </h2>
            <div class="editor-meta-stack compact">
              <div class="editor-title-meta">${escapeHtml(selectedBook?.canonicalEnglishTitle || `${getBibleBooks().length} books`)}</div>
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

  refs.detailPane.innerHTML = `
    <div class="editor-shell scripture-editor">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml(scripture.title || "Untitled Scripture")}</span>
          </h2>
          <div class="editor-meta-stack">
            <div class="editor-title-meta${scripture.reference ? "" : " empty"}">${escapeHtml(scripture.reference || "Reference")}</div>
            <div class="editor-support-meta${scripture.translation ? "" : " empty"}">
              ${scripture.translation ? `<span>${escapeHtml(scripture.translation)}</span>` : `<span>Translation</span>`}
            </div>
          </div>
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
        ${renderScriptureBookInfo(selectedBook)}
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
  return renderAttentionIcon(labels.join(" / "), tone);
}

function renderAttentionIcon(label, tone = "needs-review") {
  return `
    <span class="attention-icon ${tone}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">
      <i data-lucide="circle-alert"></i>
    </span>
  `;
}

function songNeedsReview(song) {
  return (song?.versions || []).some((version) => (version.forms || []).some(formNeedsReview));
}

function renderFormsTab(song) {
  const versions = song.versions || [];
  return `
    <section class="panel">
      ${renderFormToolbar()}
      ${
        versions.length > 1
          ? renderVersionCompare(song, versions)
          : renderSingleVersionForms()
      }
    </section>
  `;
}

function renderSingleVersionForms() {
  const gridStyle = "grid-template-columns: minmax(320px, 1fr);";
  return `
    <div class="version-compare-grid single-version">
      <div class="version-compare-head" style="${gridStyle}">
        <div class="version-compare-title placeholder" aria-hidden="true">
          <span>Version</span>
        </div>
      </div>
      <div class="version-compare-rows">
        ${
          state.forms.length
            ? state.forms.map((form, index) => `
                <div class="version-compare-row" style="${gridStyle}">
                  ${renderFormBlock(form, index)}
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

function renderVersionCompareHead(song, version) {
  const active = version.id === getSelectedVersionId();
  return `
    <button class="version-compare-title${active ? " active" : ""}" type="button" data-version-id="${escapeAttr(version.id)}">
      <span>${escapeHtml(versionDisplayName(song, version))}</span>
      ${active ? `<span class="type-pill">Editing</span>` : ""}
    </button>
  `;
}

function renderVersionCompareCell(version, form, index) {
  const active = version.id === getSelectedVersionId();
  if (!form) {
    return active
      ? `<div class="version-empty-cell" aria-hidden="true"></div>`
      : `<div class="version-empty-cell version-picker" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0" aria-label="Select version"></div>`;
  }

  if (active) return renderFormBlock(form, index);

  return `
    <div class="version-picker" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
      ${renderReadonlyFormBlock(form)}
    </div>
  `;
}

function getFormsForVersion(version) {
  if (version.id === getSelectedVersionId()) return state.forms;
  return normalizeForms((version.forms || []).map((form) => ({ ...form, song_id: version.id })));
}

function renderVersionFormColumn(song, version) {
  const active = version.id === getSelectedVersionId();
  const forms = active
    ? state.forms
    : normalizeForms((version.forms || []).map((form) => ({ ...form, song_id: version.id })));

  return `
    <section class="version-form-column${active ? " active" : ""}" data-version-id="${escapeAttr(version.id)}" role="button" tabindex="0">
      <div class="version-column-head">
        <div class="version-column-title-block">
          <div class="version-column-title">
            ${escapeHtml(versionDisplayName(song, version))}
          </div>
        </div>
        ${active ? `<span class="type-pill">Editing</span>` : ""}
      </div>
      ${
        active
          ? renderEditableFormList()
          : `<div class="form-list readonly">${forms.length ? forms.map(renderReadonlyFormBlock).join("") : `<div class="empty-state">No form blocks</div>`}</div>`
      }
    </section>
  `;
}

function renderEditableForms() {
  return `
    ${renderFormToolbar()}
    ${renderEditableFormList()}
  `;
}

function renderFormToolbar() {
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

function renderScriptureBookInfo(book) {
  const chips = book
    ? [book.testament, book.division, book.jewishCategory, book.author ? `Author: ${book.author}` : ""].filter(Boolean)
    : ["Book taxonomy"];
  return `
    <div class="scripture-book-info${book ? "" : " empty"}">
      <span class="scripture-book-title">${escapeHtml(book?.canonicalEnglishTitle || "Select a book")}</span>
      <span class="scripture-book-chips">
        ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
      </span>
    </div>
  `;
}

function renderScriptureBookMarker(book) {
  if (!book?.shortName) return "";
  const label = book.koreanName || book.canonicalEnglishTitle || book.englishName || book.code;
  return `<span class="scripture-book-marker" title="${escapeAttr(label)}">${escapeHtml(book.shortName)}</span>`;
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

function renderScriptureBookDetail(book) {
  const details = [
    ["Order", formatBookMarker(book.sortOrder)],
    ["Christian", book.division],
    ["Jewish", book.jewishCategory],
    ["Author", book.author],
  ].filter(([, value]) => value);

  return `
    <section class="taxonomy-book-detail">
      <div class="taxonomy-detail-list">
        ${details.map(([label, value]) => `
          <div class="taxonomy-detail-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderScriptureBookCard(book) {
  const details = [book.division, book.jewishCategory, book.author ? `Author: ${book.author}` : ""].filter(Boolean);
  return `
    <article class="taxonomy-book-card">
      <div class="taxonomy-book-order">${String(book.sortOrder).padStart(2, "0")}</div>
      <div class="taxonomy-book-main">
        <div class="taxonomy-book-title">${escapeHtml(book.koreanName)}</div>
        <div class="taxonomy-book-subtitle">${escapeHtml(book.canonicalEnglishTitle || book.englishName)}</div>
        <div class="taxonomy-book-meta">${details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}</div>
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

function renderFormBlock(form, index) {
  const label = displayLabel(form);
  const needsReview = formNeedsReview(form);
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

function renderReadonlyFormBlock(form) {
  const needsReview = formNeedsReview(form);
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

function formNeedsReview(form) {
  return form?.review_status === "needs_review" || Boolean(form?.import_source);
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
  return [scripture.title, scriptureHeading(scripture), scripture.text || ""].filter(Boolean).join("\n");
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

function normalizeServerScriptureBook(row) {
  const shortName = cleanScriptureBookShortName(row.short_name);
  return {
    code: row.code || "",
    koreanName: row.korean_name || "",
    englishName: row.english_name || "",
    testament: row.testament || "",
    division: row.division || "",
    canonicalEnglishTitle: row.canonical_english_title || row.english_name || "",
    shortName,
    jewishCategory: row.jewish_category || "",
    author: row.author || "",
    sortOrder: Number(row.sort_order) || 999,
  };
}

function cleanScriptureBookShortName(value) {
  const text = String(value || "").trim();
  if (!text || /^\[.*\]$/.test(text) || /\bSHORT\b/i.test(text)) return "";
  return text;
}

function normalizeServerSong(row) {
  const memo = parseSongMemo(row.memo);
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
    scripture: cleanList(memo.scripture),
    metadata: normalizeSongMetadata(memo.metadata),
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

function serializeSongMemo(song) {
  const scripture = cleanList(song.scripture);
  const metadata = normalizeSongMetadata(song.metadata);
  return JSON.stringify(
    {
      ...(scripture.length ? { scripture } : {}),
      ...(Object.keys(metadata).length ? { metadata } : {}),
      versions: (song.versions || []).map((version, index) => ({
        id: version.id,
        name: normalizeGeneratedVersionName(version.name || `Version ${index + 1}`),
        raw_section_name: version.raw_section_name || null,
        hymn_no: version.hymn_no || null,
        is_primary: Boolean(version.is_primary) || index === 0,
        ...(Object.keys(normalizeSongMetadata(version.metadata)).length ? { metadata: normalizeSongMetadata(version.metadata) } : {}),
        forms: (version.forms || []).map((form, formIndex) => ({
          id: form.id || createLocalId(),
          part_type: form.part_type,
          part_number: form.part_number,
          lyrics: form.lyrics || "",
          sort_order: formIndex + 1,
          ...(form.review_status ? { review_status: form.review_status } : {}),
          ...(form.import_source ? { import_source: form.import_source } : {}),
        })),
      })),
    },
    null,
    0,
  );
}

function getDefaultVersionId(song) {
  if (!song) return null;
  const versions = song.versions || [];
  return versions.find((version) => version.is_primary)?.id || versions[0]?.id || song.id;
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
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  state.selectedVersionId = versionId;
  state.forms = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  persistUiState();
  render();
  await loadForms(versionId);
}

function versionDisplayName(song, version) {
  const legacyName = legacyHymnVersionName(song, version);
  if (legacyName) return legacyName;
  if (song?.hymn_no && isDefaultVersionName(version.name || version.curated_version_name)) return "새찬송가";
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

function songTitleMetaLine(song) {
  const titles = new Set();
  const metadata = normalizeSongMetadata(song?.metadata);
  for (const value of [song?.subtitle, song?.original_title, metadata.otherTitle]) {
    addTitleMeta(titles, value);
  }
  addSongMetaFromRaw(titles, song?.title, "", { includeSubtitle: !song?.hymn_no });
  for (const version of song?.versions || []) {
    addSongMetaFromRaw(titles, version.name || version.curated_version_name || "", versionDisplayName(song, version));
    addSongMetaFromRaw(titles, version.raw_section_name || version.version_label || "", versionDisplayName(song, version));
  }
  return [...titles].join(" / ");
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
  return [
    ...cleanList(song?.scripture).map((reference) => `Scripture ${reference}`),
    metadata.credits ? `Credits ${metadata.credits}` : "",
    metadata.album ? `Album ${formatAlbumMeta(metadata)}` : "",
  ].filter(Boolean);
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

function songVersionLine(song) {
  const versions = song?.versions || [];
  if (versions.length <= 1) return "";
  return versions
    .map((version) => versionDisplayName(song, version))
    .filter((name) => name && !isDefaultVersionName(name))
    .join(" / ");
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
  return (value || "").replace(/^\d+\s+/, "").trim();
}

function getFilteredSongs() {
  const tokens = getSearchTokens(state.search);
  const songs = getSongsForPraiseFilter();
  if (!tokens.length) return [...songs].sort(sortSongs);

  const matched = songs
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens) }))
    .filter((item) => item.match);
  const phraseMatched = matched.filter((item) => item.match.phraseMatched);
  const results = phraseMatched.length ? phraseMatched : matched;

  return results
    .sort((a, b) => b.match.score - a.match.score || sortSongs(a.song, b.song))
    .map((item) => item.song);
}

function getSongsForPraiseFilter() {
  if (state.praiseFilter === "hymns") return state.songs.filter((song) => songHasPraiseType(song, "hymn"));
  if (state.praiseFilter === "ccm") return state.songs.filter((song) => songHasPraiseType(song, "ccm"));
  return state.songs;
}

function getFilteredScriptures() {
  const tokens = getSearchTokens(state.search);
  if (!tokens.length) return [...state.scriptures].sort(sortScriptures);

  const matched = state.scriptures
    .map((scripture) => ({ scripture, match: getScriptureSearchMatch(scripture, tokens) }))
    .filter((item) => item.match);
  const phraseMatched = matched.filter((item) => item.match.phraseMatched);
  const results = phraseMatched.length ? phraseMatched : matched;

  return results
    .sort((a, b) => b.match.score - a.match.score || sortScriptures(a.scripture, b.scripture))
    .map((item) => item.scripture);
}

function getScriptureSearchMatch(scripture, tokens = getSearchTokens(state.search)) {
  if (!tokens.length) return null;

  const fields = [
    searchField("title", scripture.title, 120),
    searchField("meta", scripture.book, 112),
    searchField("meta", scripture.reference, 110),
    searchField("meta", scripture.translation, 70),
    searchField("meta", findBibleBookByCode(scripture.book_code)?.englishName, 68),
    searchField("meta", findBibleBookByCode(scripture.book_code)?.canonicalEnglishTitle, 68),
    searchField("meta", findBibleBookByCode(scripture.book_code)?.division, 48),
    searchField("meta", findBibleBookByCode(scripture.book_code)?.jewishCategory, 40),
    searchField("meta", findBibleBookByCode(scripture.book_code)?.author, 36),
    searchField("lyrics", scripture.text, 48),
    searchField("meta", scripture.memo, 36),
  ].filter((field) => field.text);
  const phrase = getSearchPhrase(tokens);
  let bestMatch = null;

  for (const field of fields) {
    const matches = tokens.map((token) => matchSearchField(field, token));
    if (matches.some((match) => !match)) continue;

    const candidate = getSearchCandidate(field.text);
    const phraseMatched = phrase.compact.length > 1 && candidate.compact.includes(phrase.compact);
    const phraseBoost = phraseMatched ? (candidate.compact === phrase.compact ? 64 : 26) : 0;
    const score = matches.reduce((sum, match) => sum + match.score, 0) + phraseBoost;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, field, phraseMatched };
    }
  }

  return bestMatch;
}

function scriptureListMeta(scripture) {
  const book = findBibleBookByCode(scripture.book_code) || findBibleBookByName(scripture.book);
  return [scripture.book, scripture.reference, scripture.translation, book?.division].filter(Boolean).join(" / ");
}

function bibleBookListMeta(book) {
  return [book.canonicalEnglishTitle || book.englishName, book.division, book.author].filter(Boolean).join(" / ");
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

function getBibleBooksForScriptureFilter() {
  const books = getBibleBooks();
  if (state.scriptureFilter === "old") return books.filter((book) => book.testament === "Old Testament");
  if (state.scriptureFilter === "new") return books.filter((book) => book.testament === "New Testament");
  return books;
}

function getFilteredBibleBooks() {
  const books = getBibleBooksForScriptureFilter();
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
  return getBibleBooks().find((book) => book.code === code) || null;
}

function findBibleBookByName(name) {
  const value = normalizeTitle(name);
  if (!value) return null;
  return getBibleBooks().find((book) => (
    normalizeTitle(book.koreanName) === value
    || normalizeTitle(book.englishName) === value
    || normalizeTitle(book.canonicalEnglishTitle) === value
    || normalizeTitle(book.shortName) === value
  )) || null;
}

function songSearchHint(song) {
  const tokens = getSearchTokens(state.search);
  if (!tokens.length) return "";
  const match = getSongSearchMatch(song, tokens);
  if (!match?.field) return "";
  const field = match.field;
  const value = getSearchSnippet(field.text, tokens);

  if (!value) return "";
  if (field.kind === "title" || field.kind === "hymn") return "";
  if (field.kind === "lyrics") return `Lyrics: ${value}`;
  if (field.kind === "version") return `Version: ${value}`;
  return value;
}

function getSongSearchMatch(song, tokens = getSearchTokens(state.search)) {
  if (!tokens.length) return null;

  const fields = getSongSearchFields(song);
  const phrase = getSearchPhrase(tokens);
  let bestMatch = null;

  for (const field of fields) {
    const matches = tokens.map((token) => matchSearchField(field, token));
    if (matches.some((match) => !match)) continue;

    const candidate = getSearchCandidate(field.text);
    const phraseMatched = phrase.compact.length > 1 && candidate.compact.includes(phrase.compact);
    const phraseBoost = phraseMatched ? (candidate.compact === phrase.compact ? 64 : 26) : 0;
    const score = matches.reduce((sum, match) => sum + match.score, 0) + phraseBoost;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, field, phraseMatched };
    }
  }

  return bestMatch;
}

function getSongSearchFields(song) {
  const fields = [
    searchField("title", song.title, 120),
    searchField("hymn", song.hymn_no, 125),
    searchField("meta", song.subtitle, 88),
    searchField("meta", song.original_title, 88),
    ...cleanList(song.alt_titles).map((title) => searchField("meta", title, 78)),
    ...cleanList(song.scripture).map((reference) => searchField("meta", reference, 70)),
    searchField("meta", song.metadata?.otherTitle, 78),
    ...songPraiseTypes(song).map((type) => searchField("meta", type, 40)),
    searchField("meta", song.metadata?.credits, 58),
    searchField("meta", song.metadata?.album, 48),
    searchField("meta", song.metadata?.track, 32),
  ];

  for (const version of song.versions || []) {
    fields.push(searchField("version", versionDisplayName(song, version), 74));
    fields.push(searchField("version", version.raw_section_name, 58));
    fields.push(searchField("version", version.version_label, 52));
    fields.push(searchField("version", version.metadata?.otherTitle, 58));
    fields.push(searchField("version", version.metadata?.credits, 42));
    fields.push(searchField("version", version.metadata?.album, 36));
    for (const form of version.forms || []) {
      fields.push(searchField("lyrics", form.lyrics, 24));
    }
  }

  return fields.filter((field) => field.text);
}

function searchField(kind, text, weight) {
  return { kind, text: String(text || "").trim(), weight };
}

function matchSearchField(field, token) {
  const candidate = getSearchCandidate(field.text);
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
  return state.dirty.song || state.dirty.forms || state.dirty.scripture;
}

function updateSaveState() {
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
    .split(",")
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
    credits: nullIfBlank(source.credits),
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
