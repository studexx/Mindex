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

const OPENLYRICS_PART_CODES = {
  Verse: "v",
  Chorus: "c",
  "Pre-Chorus": "p",
  Bridge: "b",
  Coda: "e",
};

const STORAGE = {
  url: "mindex.supabase.url",
  key: "mindex.supabase.anonKey",
  theme: "mindex.theme",
};

const SYSTEM_THEME_QUERY = window.matchMedia?.("(prefers-color-scheme: dark)") || null;
const TITLE_COLLATOR = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

const HANGUL_INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const state = {
  client: null,
  config: { url: "", anonKey: "" },
  songs: [],
  selectedSongId: null,
  selectedVersionId: null,
  forms: [],
  draftSlides: [],
  linesPerSlide: 4,
  search: "",
  activeTab: "forms",
  loading: false,
  saving: false,
  theme: "light",
  connectionError: "",
  dirty: {
    song: false,
    forms: false,
  },
};

const refs = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheRefs();
  applyTheme(readTheme());
  state.config = readConfig();
  rememberConfig(state.config);
  bindStaticEvents();
  connectClient();
  render();

  if (state.client) {
    loadSongs();
  } else {
    showToast(state.connectionError || "Connection settings are missing from the link.", "error");
  }
}

function cacheRefs() {
  refs.connectionStatus = document.getElementById("connectionStatus");
  refs.themeBtn = document.getElementById("themeBtn");
  refs.newSongBtn = document.getElementById("newSongBtn");
  refs.saveAllBtn = document.getElementById("saveAllBtn");
  refs.searchInput = document.getElementById("searchInput");
  refs.songCount = document.getElementById("songCount");
  refs.songList = document.getElementById("songList");
  refs.sidebar = document.querySelector(".sidebar");
  refs.detailPane = document.getElementById("detailPane");
  refs.toastRegion = document.getElementById("toastRegion");
}

function bindStaticEvents() {
  refs.themeBtn.addEventListener("click", toggleTheme);
  refs.newSongBtn.addEventListener("click", createSong);
  refs.saveAllBtn.addEventListener("click", saveAll);
  refs.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderSongList();
  });

  refs.songList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-song-id]");
    if (!item) return;
    selectSong(item.dataset.songId);
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

  const songs = getFilteredSongs();
  if (!songs.length) return;

  const foundIndex = songs.findIndex((song) => song.id === state.selectedSongId);
  const currentIndex = foundIndex >= 0 ? foundIndex : event.key === "ArrowDown" ? -1 : songs.length;
  const nextIndex =
    event.key === "ArrowDown"
      ? Math.min(currentIndex + 1, songs.length - 1)
      : Math.max(currentIndex - 1, 0);
  const nextSong = songs[nextIndex];

  event.preventDefault();
  if (!nextSong || nextSong.id === state.selectedSongId) return;
  selectSong(nextSong.id);
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
    state.draftSlides = [];
  }

  render();
}

async function selectSong(songId) {
  if (songId === state.selectedSongId) return;
  if (hasDirtyChanges() && !confirm("Discard unsaved changes?")) return;

  state.selectedSongId = songId;
  state.selectedVersionId = getDefaultVersionId(getSelectedSong());
  state.activeTab = "forms";
  state.forms = [];
  state.draftSlides = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  render();
  focusSelectedSong();
  await loadForms(state.selectedVersionId);
  focusSelectedSong();
}

async function loadForms(versionId) {
  if (!requireClient()) return;
  if (!versionId) return;

  const version = getSelectedVersion();
  state.forms = normalizeForms((version?.forms || []).map((form) => withLocalId({ ...form, song_id: versionId })));
  state.draftSlides = [];
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
    title_normalized: normalizeTitle(title),
    category: null,
    source: null,
    default_key: null,
    tempo_note: null,
    theme_tags: [],
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
  state.draftSlides = [];
  state.activeTab = "forms";
  state.dirty.song = false;
  state.dirty.forms = false;
  render();
  showToast("Song created.");
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
  state.draftSlides = [];
  state.dirty.song = false;
  state.dirty.forms = false;
  render();
  showToast("Song deleted.");
}

async function saveAll() {
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

async function saveSongMeta(song) {
  const payload = {
    title: song.title.trim(),
    title_normalized: normalizeTitle(song.title),
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
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    state.activeTab = tabButton.dataset.tab;
    renderDetail();
    return;
  }

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

  const draftAction = event.target.closest("[data-draft-action]");
  if (draftAction) {
    runDraftAction(draftAction.dataset.draftAction, Number(draftAction.dataset.index));
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

  const draftField = event.target.closest("[data-draft-field]");
  if (draftField) {
    updateDraftField(draftField);
  }
}

function handleDetailChange(event) {
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

  const option = event.target.closest("[data-draft-option]");
  if (option) {
    state.linesPerSlide = Number(option.value);
    generateDraftSlides();
  }
}

function updateSongField(field) {
  const song = getSelectedSong();
  if (!song) return;

  const key = field.dataset.songField;
  if (key === "is_active") {
    song[key] = field.checked;
  } else if (key === "alt_titles" || key === "theme_tags") {
    song[key] = parseList(field.value);
  } else {
    song[key] = field.value;
  }

  if (key === "title") {
    updateEditorTitle(song);
    invalidateDraftSlides();
  }

  state.dirty.song = true;
  updateSaveState();
}

function updateFormField(field) {
  const index = Number(field.dataset.index);
  const form = state.forms[index];
  if (!form) return;

  const key = field.dataset.formField;
  form[key] = field.value;
  if (key === "part_type" && !PART_TYPES.includes(form.part_type)) {
    form.part_type = "Verse";
  }
  if (key === "lyrics") {
    resizeFormTextarea(field);
  }

  invalidateDraftSlides();
  state.dirty.forms = true;
  updateSaveState();
}

function updateDraftField(field) {
  const slide = state.draftSlides[Number(field.dataset.index)];
  if (!slide) return;

  if (field.dataset.draftField === "text") {
    slide.text_lines = field.value.split("\n");
  }
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
  state.draftSlides = [];
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
  state.draftSlides = [];
  state.dirty.forms = true;
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
  state.draftSlides = [];
  state.dirty.forms = true;
  renderDetail();
  updateSaveState();
}

function runCopyAction(action, index) {
  if (action === "full") {
    copyText(formatFullLyrics({ includeLabels: true }));
    return;
  }

  if (action === "plain") {
    copyText(formatFullLyrics({ includeLabels: false }));
    return;
  }

  if (action === "freeshow") {
    copyText(formatFreeShowQuickLyrics());
    return;
  }

  if (action === "openlyrics") {
    try {
      copyText(formatOpenLyricsXml());
    } catch (error) {
      showToast(error.message || "OpenLyrics XML failed.", "error");
    }
    return;
  }

  if (action === "download-openlyrics") {
    try {
      downloadTextFile(formatOpenLyricsXml(), getXmlFileName(getSelectedSong()), "application/xml");
    } catch (error) {
      showToast(error.message || "OpenLyrics XML failed.", "error");
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

function runDraftAction(action, index) {
  if (action === "generate") {
    generateDraftSlides();
    return;
  }

  if (action === "copy-json") {
    copyText(JSON.stringify(getDraftPayload(), null, 2));
    return;
  }

  if (action === "copy-text") {
    copyText(formatDraftText());
    return;
  }

  if (action === "export-pptx") {
    exportDraftPptx();
    return;
  }

  if (action === "copy-slide") {
    const slide = state.draftSlides[index];
    if (slide) copyText(formatSlideText(slide));
    return;
  }

  if (action === "up" && index > 0) {
    [state.draftSlides[index - 1], state.draftSlides[index]] = [
      state.draftSlides[index],
      state.draftSlides[index - 1],
    ];
  }

  if (action === "down" && index < state.draftSlides.length - 1) {
    [state.draftSlides[index + 1], state.draftSlides[index]] = [
      state.draftSlides[index],
      state.draftSlides[index + 1],
    ];
  }

  if (action === "delete") {
    state.draftSlides.splice(index, 1);
  }

  renderDetail();
}

function generateDraftSlides() {
  const song = getSelectedSong();
  if (!song) return;

  const slides = [
    {
      id: createLocalId(),
      slide_type: "title",
      label: "Title",
      text_lines: [song.title || ""],
      song_id: song.id,
    },
  ];

  normalizeForms(state.forms).forEach((form) => {
    const chunks = splitLyricsForSlides(form.lyrics, state.linesPerSlide);
    chunks.forEach((chunk, chunkIndex) => {
      slides.push({
        id: createLocalId(),
        slide_type: "lyrics",
        label: displayLabel(form),
        text_lines: chunk,
        song_id: song.id,
        form_id: form.id || null,
        chunk_index: chunkIndex + 1,
      });
    });
  });

  state.draftSlides = slides;
  renderDetail();
}

function invalidateDraftSlides() {
  if (state.draftSlides.length) {
    state.draftSlides = [];
  }
}

async function exportDraftPptx() {
  const song = getSelectedSong();
  if (!song) return;

  if (!state.draftSlides.length) {
    generateDraftSlides();
  }

  if (!state.draftSlides.length) {
    showToast("Generate draft slides first.", "error");
    return;
  }

  try {
    const payload = getDraftPayload();
    const pptx = buildPptxPresentation(payload);
    await pptx.writeFile({ fileName: getPptxFileName(song) });
    showToast("PPTX exported.");
  } catch (error) {
    showToast(error.message || "PPTX export failed.", "error");
  }
}

function buildPptxPresentation(payload) {
  const PptxGenJS = window.PptxGenJS;
  if (!PptxGenJS) {
    throw new Error("PptxGenJS is not loaded.");
  }

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Mindex";
  pptx.company = "Mindex";
  pptx.subject = "Praise lyrics draft";
  pptx.title = payload.title || "Mindex Praise Draft";
  pptx.lang = "ko-KR";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Malgun Gothic",
    lang: "ko-KR",
  };

  payload.slides.forEach((draftSlide, index) => {
    if (draftSlide.slide_type === "title") {
      addTitleSlide(pptx, draftSlide, payload, index);
    } else {
      addLyricsSlide(pptx, draftSlide, payload, index);
    }
  });

  return pptx;
}

function addTitleSlide(pptx, draftSlide, payload, index) {
  const slide = pptx.addSlide();
  slide.background = { color: "F7F9F7" };
  addTemplateFooter(slide, payload, index, "2F6F68");
  slide.addText("Mindex Worship Draft", {
    x: 0.72,
    y: 0.58,
    w: 4.2,
    h: 0.28,
    margin: 0,
    color: "2F6F68",
    fontFace: "Aptos",
    fontSize: 9,
    bold: true,
    breakLine: false,
  });
  slide.addText(cleanSlideText(draftSlide.text_lines).join("\n") || payload.title || "Untitled Song", {
    x: 1.08,
    y: 2.55,
    w: 11.15,
    h: 1.25,
    margin: 0,
    align: "center",
    valign: "mid",
    color: "20251F",
    fontFace: "Malgun Gothic",
    fontSize: 38,
    bold: true,
    breakLine: false,
    fit: "shrink",
  });
  slide.addText("fixed template / text replacement", {
    x: 1.08,
    y: 4.02,
    w: 11.15,
    h: 0.32,
    margin: 0,
    align: "center",
    color: "667064",
    fontFace: "Aptos",
    fontSize: 10,
    breakLine: false,
  });
}

function addLyricsSlide(pptx, draftSlide, payload, index) {
  const lines = cleanSlideText(draftSlide.text_lines);
  const slide = pptx.addSlide();
  slide.background = { color: "111412" };
  addTemplateFooter(slide, payload, index, "BFD7D2");
  slide.addText(draftSlide.label || "Lyrics", {
    x: 0.72,
    y: 0.5,
    w: 4.5,
    h: 0.3,
    margin: 0,
    color: "BFD7D2",
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    breakLine: false,
  });
  slide.addText(lines.join("\n"), {
    x: 0.92,
    y: 1.75,
    w: 11.5,
    h: 3.95,
    margin: [0, 12, 0, 12],
    align: "center",
    valign: "mid",
    color: "FFFFFF",
    fontFace: "Malgun Gothic",
    fontSize: getLyricsFontSize(lines),
    bold: true,
    breakLine: false,
    fit: "shrink",
  });
}

function addTemplateFooter(slide, payload, index, color) {
  slide.addText(payload.title || "Mindex", {
    x: 0.72,
    y: 6.88,
    w: 7.2,
    h: 0.24,
    margin: 0,
    color,
    transparency: 18,
    fontFace: "Aptos",
    fontSize: 7,
    breakLine: false,
  });
  slide.addText(String(index + 1).padStart(2, "0"), {
    x: 12,
    y: 6.88,
    w: 0.58,
    h: 0.24,
    margin: 0,
    align: "right",
    color,
    transparency: 18,
    fontFace: "Aptos",
    fontSize: 7,
    breakLine: false,
  });
}

function getLyricsFontSize(lines) {
  const visibleLines = lines.filter(Boolean);
  const longest = visibleLines.reduce((max, line) => Math.max(max, Array.from(line).length), 0);
  let size = 42;

  if (visibleLines.length >= 4) size = 34;
  if (visibleLines.length === 3) size = 38;
  if (visibleLines.length <= 2) size = 44;
  if (longest > 28) size -= Math.min(8, Math.ceil((longest - 28) / 4) * 2);

  return Math.max(28, size);
}

function cleanSlideText(lines) {
  return (lines || []).map((line) => String(line || "").trim()).filter(Boolean);
}

function splitLyricsForSlides(lyrics, maxLines = 4) {
  const normalized = (lyrics || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  paragraphs.forEach((paragraph) => {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    for (let index = 0; index < lines.length; index += maxLines) {
      chunks.push(lines.slice(index, index + maxLines));
    }
  });

  return chunks;
}

function render() {
  renderConnectionStatus();
  renderSongList();
  renderDetail();
  updateSaveState();
  refreshIcons();
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
  const filtered = getFilteredSongs();
  const hasSearch = Boolean(normalizeSearchValue(state.search));
  refs.songCount.textContent = hasSearch
    ? `${filtered.length} of ${state.songs.length} songs`
    : `${filtered.length} ${filtered.length === 1 ? "song" : "songs"}`;

  if (!filtered.length) {
    refs.songList.innerHTML = `<div class="song-list-empty">No songs</div>`;
    return;
  }

  refs.songList.innerHTML = filtered
    .map((song) => {
      const active = song.id === state.selectedSongId ? " active" : "";
      const metaLine = hasSearch ? songSearchHint(song) || songOriginalTitleLine(song) : songOriginalTitleLine(song);
      return `
        <button class="song-item${active}" type="button" data-song-id="${escapeAttr(song.id)}">
          <span class="song-title">
            <span class="song-title-text">${escapeHtml(song.title)}</span>
            ${renderEmptyBadge(song)}
            ${song.versions?.length > 1 ? `<span class="song-count-badge">${song.versions.length}</span>` : ""}
          </span>
          ${metaLine ? `<span class="song-meta-line">${escapeHtml(metaLine)}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function focusSelectedSong() {
  if (!state.selectedSongId) return;
  const selected = refs.songList.querySelector(`[data-song-id="${CSS.escape(state.selectedSongId)}"]`);
  selected?.focus({ preventScroll: true });
  selected?.scrollIntoView({ block: "nearest" });
}

function renderDetail() {
  const song = getSelectedSong();

  if (!song) {
    refs.detailPane.innerHTML = `
      <div class="empty-detail">
        <div class="empty-detail-inner">
          <h2>Mindex</h2>
          <p>Select a song from the list.</p>
        </div>
      </div>
    `;
    refreshIcons();
    return;
  }

  const originalTitleLine = songOriginalTitleLine(song);
  refs.detailPane.innerHTML = `
    <div class="editor-shell">
      <header class="editor-head">
        <div class="editor-title">
          <h2 id="editorSongTitle">
            <span>${escapeHtml(song.title || "Untitled Song")}</span>
            ${renderEmptyBadge(song)}
          </h2>
          <div class="editor-original-title${originalTitleLine ? "" : " empty"}">${escapeHtml(originalTitleLine || "Metadata")}</div>
        </div>
        <div class="head-actions">
          <span class="dirty-pill" ${hasDirtyChanges() ? "" : "hidden"}>Unsaved changes</span>
          <button class="btn secondary" type="button" data-add-version title="Add version">
            <i data-lucide="copy-plus"></i>
            <span>Version</span>
          </button>
        </div>
      </header>

      <nav class="tabs" aria-label="Song editor tabs">
        ${renderTab("forms", "Forms")}
        ${renderTab("copy", "Copy")}
        ${renderTab("ppt", "PPT Draft")}
      </nav>

      ${state.activeTab === "forms" ? "" : renderVersionSwitcher(song)}
      ${renderActiveTab(song)}
    </div>
  `;

  refreshIcons();
  resizeFormTextareas();
}

function renderEmptyBadge(song) {
  return songHasLyrics(song) ? "" : `<span class="empty-badge">Empty</span>`;
}

function renderTab(id, label) {
  const active = state.activeTab === id ? " active" : "";
  return `<button class="tab-button${active}" type="button" data-tab="${id}">${label}</button>`;
}

function renderActiveTab(song) {
  if (state.activeTab === "copy") return renderCopyTab();
  if (state.activeTab === "ppt") return renderDraftTab();
  return renderFormsTab(song);
}

function renderVersionSwitcher(song) {
  const versions = song.versions || [];
  if (versions.length <= 1) return "";

  return `
    <div class="version-switcher" aria-label="Song versions">
      ${versions
        .map((version) => {
          const active = version.id === getSelectedVersionId() ? " active" : "";
          return `
            <button class="version-pill${active}" type="button" data-version-id="${escapeAttr(version.id)}">
              ${escapeHtml(versionDisplayName(song, version))}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFormsTab(song) {
  const versions = song.versions || [];
  if (versions.length > 1) {
    return `
      <section class="panel">
        ${renderFormToolbar()}
        ${renderVersionCompare(song, versions)}
      </section>
    `;
  }

  return `
    <section class="panel">
      ${renderEditableForms()}
    </section>
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
            : `<div class="empty-state">No form blocks</div>`
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
    </div>
  `;
}

function renderEditableFormList() {
  return `
    <div class="form-list">
      ${
        state.forms.length
          ? state.forms.map(renderFormBlock).join("")
          : `<div class="empty-state">No form blocks</div>`
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

function renderFormBlock(form, index) {
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

function renderCopyTab() {
  const hasForms = state.forms.length > 0;
  const hasLyrics = getCopyableForms().length > 0;
  return `
    <section class="panel">
      <div class="copy-actions">
        <button class="btn primary" type="button" data-copy-action="full" ${hasForms ? "" : "disabled"}>
          <i data-lucide="copy"></i>
          <span>Blocks</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="plain" ${hasLyrics ? "" : "disabled"}>
          <i data-lucide="clipboard"></i>
          <span>Text</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="freeshow" ${hasLyrics ? "" : "disabled"}>
          <i data-lucide="brackets"></i>
          <span>FreeShow</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="openlyrics" ${hasLyrics ? "" : "disabled"}>
          <i data-lucide="code-xml"></i>
          <span>XML</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="download-openlyrics" ${hasLyrics ? "" : "disabled"}>
          <i data-lucide="download"></i>
          <span>File</span>
        </button>
      </div>

      <div class="copy-list">
        ${
          hasForms
            ? state.forms.map(renderCopyRow).join("")
            : `<div class="empty-state">No lyrics to copy</div>`
        }
      </div>
    </section>
  `;
}

function renderCopyRow(form, index) {
  return `
    <article class="copy-row">
      <div>
        <div class="copy-head">
          <div class="copy-label">${escapeHtml(displayLabel(form))}</div>
        </div>
        <div class="copy-text">${escapeHtml(form.lyrics || "")}</div>
      </div>
      <div class="copy-buttons">
        <button class="btn secondary" type="button" data-copy-action="block" data-index="${index}">
          <i data-lucide="copy"></i>
          <span>Block</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="lyrics" data-index="${index}">
          <i data-lucide="text"></i>
          <span>Lyrics</span>
        </button>
        <button class="btn secondary" type="button" data-copy-action="label" data-index="${index}">
          <i data-lucide="tag"></i>
          <span>Label</span>
        </button>
      </div>
    </article>
  `;
}

function renderDraftTab() {
  const canExportPptx = state.draftSlides.length > 0 || state.forms.length > 0;

  return `
    <section class="panel">
      <div class="draft-control-row">
        <label class="field">
          <span>Lines per slide</span>
          <select class="draft-select" data-draft-option="linesPerSlide">
            ${[2, 3, 4]
              .map(
                (count) =>
                  `<option value="${count}" ${state.linesPerSlide === count ? "selected" : ""}>${count}</option>`,
              )
              .join("")}
          </select>
        </label>
        <div class="draft-actions">
          <button class="btn primary" type="button" data-draft-action="generate">
            <i data-lucide="file-plus-2"></i>
            <span>Generate Draft</span>
          </button>
          <button class="btn secondary" type="button" data-draft-action="copy-json" ${state.draftSlides.length ? "" : "disabled"}>
            <i data-lucide="braces"></i>
            <span>Copy JSON</span>
          </button>
          <button class="btn secondary" type="button" data-draft-action="copy-text" ${state.draftSlides.length ? "" : "disabled"}>
            <i data-lucide="clipboard"></i>
            <span>Copy Text</span>
          </button>
          <button class="btn secondary" type="button" data-draft-action="export-pptx" ${canExportPptx ? "" : "disabled"}>
            <i data-lucide="presentation"></i>
            <span>Export PPTX</span>
          </button>
        </div>
      </div>

      <div class="slide-list">
        ${
          state.draftSlides.length
            ? state.draftSlides.map(renderSlideCard).join("")
            : `<div class="empty-state">No draft slides</div>`
        }
      </div>
    </section>
  `;
}

function renderSlideCard(slide, index) {
  return `
    <article class="slide-card">
      <div class="slide-head">
        <div class="slide-label">
          <span class="type-pill">${escapeHtml(index + 1)}. ${escapeHtml(slide.label)}</span>
          <span class="muted">${escapeHtml(slide.slide_type)}</span>
        </div>
        <div class="slide-actions">
          <button class="icon-btn" type="button" data-draft-action="up" data-index="${index}" title="Move up" ${index === 0 ? "disabled" : ""}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="icon-btn" type="button" data-draft-action="down" data-index="${index}" title="Move down" ${index === state.draftSlides.length - 1 ? "disabled" : ""}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="icon-btn" type="button" data-draft-action="copy-slide" data-index="${index}" title="Copy slide">
            <i data-lucide="copy"></i>
          </button>
          <button class="icon-btn danger" type="button" data-draft-action="delete" data-index="${index}" title="Delete slide">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div class="slide-grid">
        <label class="field">
          <span>Label</span>
          <input type="text" value="${escapeAttr(slide.label)}" readonly />
        </label>
        <label class="field">
          <span>Text lines</span>
          <textarea class="draft-textarea" data-draft-field="text" data-index="${index}" rows="5">${escapeHtml((slide.text_lines || []).join("\n"))}</textarea>
        </label>
      </div>
    </article>
  `;
}

function normalizeForms(forms) {
  const next = forms.map((form, index) => ({
    ...withLocalId(form),
    part_type: PART_TYPES.includes(form.part_type) ? form.part_type : "Verse",
    lyrics: form.lyrics || "",
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

function formatBlockForCopy(form) {
  return [displayLabel(form), form.lyrics || ""].filter(Boolean).join("\n");
}

function formatFullLyrics({ includeLabels }, forms = state.forms) {
  return normalizeForms(forms)
    .map((form) => {
      if (includeLabels) return formatBlockForCopy(form);
      return form.lyrics || "";
    })
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

function formatFreeShowQuickLyrics(song = getSelectedSong(), forms = state.forms) {
  const metadata = [];
  const title = nullIfBlank(song?.title);
  if (title) metadata.push(`Title=${title}`);

  const blocks = getCopyableForms(forms).map((form) =>
    [`[${form.part_type}]`, normalizeLyricsForCopy(form.lyrics)].filter(Boolean).join("\n"),
  );

  return [metadata.join("\n"), blocks.join("\n\n")]
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

function formatOpenLyricsXml(song = getSelectedSong(), forms = state.forms) {
  const copyableForms = getCopyableForms(forms);
  const namedForms = getOpenLyricsNamedForms(copyableForms);
  const title = nullIfBlank(song?.title) || "Untitled Song";
  const titles = [title, ...cleanList(song?.alt_titles)];
  const themes = [...cleanList(song?.theme_tags), nullIfBlank(song?.category)].filter(Boolean);
  const modifiedDate = new Date().toISOString();

  if (!namedForms.length) {
    throw new Error("Lyrics are required for OpenLyrics XML.");
  }

  const propertyLines = [
    "  <properties>",
    "    <titles>",
    ...titles.map((item) => `      <title>${escapeXml(item)}</title>`),
    "    </titles>",
  ];

  if (song?.default_key) {
    propertyLines.push(`    <key>${escapeXml(song.default_key)}</key>`);
  }

  if (themes.length) {
    propertyLines.push("    <themes>");
    propertyLines.push(...themes.map((theme) => `      <theme>${escapeXml(theme)}</theme>`));
    propertyLines.push("    </themes>");
  }

  if (song?.source) {
    propertyLines.push("    <songbooks>");
    propertyLines.push(`      <songbook name="${escapeXml(song.source)}"/>`);
    propertyLines.push("    </songbooks>");
  }

  if (namedForms.length) {
    propertyLines.push(`    <verseOrder>${namedForms.map((form) => form.openLyricsName).join(" ")}</verseOrder>`);
  }

  if (song?.memo || song?.tempo_note) {
    propertyLines.push("    <comments>");
    if (song.tempo_note) {
      propertyLines.push(`      <comment>Tempo: ${escapeXml(song.tempo_note)}</comment>`);
    }
    if (song.memo) {
      propertyLines.push(`      <comment>${escapeXml(song.memo)}</comment>`);
    }
    propertyLines.push("    </comments>");
  }

  propertyLines.push("  </properties>");

  const lyricLines = [
    "  <lyrics>",
    ...namedForms.flatMap((form) => formatOpenLyricsVerse(form)),
    "  </lyrics>",
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.9" createdIn="Mindex" modifiedIn="Mindex" modifiedDate="${escapeXml(modifiedDate)}">`,
    ...propertyLines,
    ...lyricLines,
    "</song>",
  ].join("\n");
}

function getCopyableForms(forms = state.forms) {
  return normalizeForms(forms).filter((form) => normalizeLyricsForCopy(form.lyrics).length > 0);
}

function getOpenLyricsNamedForms(forms) {
  const normalized = normalizeForms(forms);
  const codeCounts = normalized.reduce((acc, form) => {
    const code = OPENLYRICS_PART_CODES[form.part_type] || "o";
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const seen = {};

  return normalized.map((form) => {
    const code = OPENLYRICS_PART_CODES[form.part_type] || "o";
    seen[code] = (seen[code] || 0) + 1;
    return {
      ...form,
      openLyricsName: codeCounts[code] === 1 ? code : `${code}${seen[code]}`,
    };
  });
}

function formatOpenLyricsVerse(form) {
  return [
    `    <verse name="${escapeXml(form.openLyricsName)}">`,
    ...formatOpenLyricsLineGroups(form.lyrics),
    "    </verse>",
  ];
}

function formatOpenLyricsLineGroups(lyrics) {
  const paragraphs = normalizeLyricsForCopy(lyrics)
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.flatMap((paragraph) => {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    if (!lines.length) return [];
    if (lines.length === 1) return [`      <lines>${escapeXml(lines[0])}</lines>`];

    return [
      "      <lines>",
      ...lines.map((line, index) => {
        const suffix = index < lines.length - 1 ? "<br/>" : "";
        return `        ${escapeXml(line)}${suffix}`;
      }),
      "      </lines>",
    ];
  });
}

function normalizeLyricsForCopy(lyrics) {
  return String(lyrics || "").replace(/\r\n?/g, "\n").trim();
}

function getDraftPayload() {
  const song = getSelectedSong();
  return {
    song_id: song?.id || null,
    title: song?.title || "",
    template: "fixed-text-replacement",
    template_version: "mindex-lyrics-v1",
    lines_per_slide: state.linesPerSlide,
    slides: state.draftSlides.map((slide, index) => ({
      slide_index: index + 1,
      slide_type: slide.slide_type,
      label: slide.label,
      text_lines: slide.text_lines || [],
      form_id: slide.form_id || null,
      chunk_index: slide.chunk_index || null,
    })),
  };
}

function formatDraftText() {
  return state.draftSlides.map(formatSlideText).join("\n\n");
}

function formatSlideText(slide) {
  return [`[${slide.label}]`, ...(slide.text_lines || [])].join("\n");
}

function getPptxFileName(song) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(song.title || "song");
  return `mindex-${slug}-${date}.pptx`;
}

function getXmlFileName(song) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(song?.title || "song");
  return `mindex-${slug}-${date}.xml`;
}

function slugify(value) {
  const slug = normalizeTitle(value)
    .replace(/[^a-z0-9]+/g, "-")
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
    title_normalized: row.title_normalized || normalizeTitle(row.title),
    versions: versions.map((version, index) => ({
      ...version,
      id: version.id || `${row.id}:version:${index + 1}`,
      name: normalizeGeneratedVersionName(version.name || version.version_label || `Version ${index + 1}`),
      is_primary: Boolean(version.is_primary) || index === 0,
      forms: Array.isArray(version.forms) ? version.forms : [],
    })),
  };
}

function parseSongMemo(value) {
  if (!value) return { versions: [] };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      versions: Array.isArray(parsed?.versions) ? parsed.versions : [],
    };
  } catch {
    return { versions: [] };
  }
}

function serializeSongMemo(song) {
  return JSON.stringify(
    {
      versions: (song.versions || []).map((version, index) => ({
        id: version.id,
        name: normalizeGeneratedVersionName(version.name || `Version ${index + 1}`),
        raw_section_name: version.raw_section_name || null,
        hymn_no: version.hymn_no || null,
        is_primary: Boolean(version.is_primary) || index === 0,
        forms: (version.forms || []).map((form, formIndex) => ({
          id: form.id || createLocalId(),
          part_type: form.part_type,
          part_number: form.part_number,
          lyrics: form.lyrics || "",
          sort_order: formIndex + 1,
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
  state.draftSlides = [];
  state.dirty.song = false;
  state.dirty.forms = false;
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

function songOriginalTitleLine(song) {
  const titles = new Set();
  if (song?.original_title) titles.add(song.original_title);
  if (song?.subtitle) titles.add(song.subtitle);
  addSongMetaFromRaw(titles, song?.title);
  for (const version of song?.versions || []) {
    addSongMetaFromRaw(titles, version.raw_section_name || version.version_label || "", versionDisplayName(song, version));
  }
  return [...titles].join(" / ");
}

function addSongMetaFromRaw(target, rawValue, versionName = "") {
  const raw = rawValue || "";
  const original = raw.match(/\[([^\]]+)\]/)?.[1]?.trim();
  const subtitle = raw.match(/\(([^)]*?)\)\s*$/)?.[1]?.trim();
  const versionText = raw.replace(/\[[^\]]+\]/g, "").replace(/\([^)]*?\)\s*$/, "").trim();
  for (const value of [subtitle, original]) {
    if (value && !/^통(?:일)?\s*\d+/.test(value) && value !== versionText && value !== versionName) target.add(value);
  }
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
  if (!tokens.length) return [...state.songs].sort(sortSongs);

  const matched = state.songs
    .map((song) => ({ song, match: getSongSearchMatch(song, tokens) }))
    .filter((item) => item.match);
  const phraseMatched = matched.filter((item) => item.match.phraseMatched);
  const results = phraseMatched.length ? phraseMatched : matched;

  return results
    .sort((a, b) => b.match.score - a.match.score || sortSongs(a.song, b.song))
    .map((item) => item.song);
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
    searchField("title", song.title_normalized, 108),
    searchField("title", song.normalized_title, 108),
    searchField("hymn", song.hymn_no, 125),
    searchField("meta", song.subtitle, 88),
    searchField("meta", song.original_title, 88),
    ...cleanList(song.alt_titles).map((title) => searchField("meta", title, 78)),
    searchField("meta", song.category, 44),
    searchField("meta", song.source, 36),
    ...cleanList(song.theme_tags).map((tag) => searchField("meta", tag, 38)),
  ];

  for (const version of song.versions || []) {
    fields.push(searchField("version", versionDisplayName(song, version), 74));
    fields.push(searchField("version", version.raw_section_name, 58));
    fields.push(searchField("version", version.version_label, 52));
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

function songHasLyrics(song) {
  return Boolean(
    (song?.versions || []).some((version) =>
      (version.forms || []).some((form) => (form.lyrics || "").trim()),
    ),
  );
}

function getSelectedSong() {
  return state.songs.find((song) => song.id === state.selectedSongId) || null;
}

function requireClient() {
  if (state.client) return true;
  showToast("Open Mindex with a connection link first.", "error");
  return false;
}

function hasDirtyChanges() {
  return state.dirty.song || state.dirty.forms;
}

function updateSaveState() {
  refs.saveAllBtn.disabled = !getSelectedSong() || !hasDirtyChanges() || state.saving;
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
  return escapeHtml(value);
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
  formatFreeShowQuickLyrics,
  formatOpenLyricsXml,
  splitLyricsForSlides,
  generateDraftSlides,
  getDraftPayload,
  buildPptxPresentation,
  writePptxArrayBuffer: async (payload) =>
    buildPptxPresentation(payload).write({ outputType: "arraybuffer" }),
};
