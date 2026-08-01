// Presenter slide/output helpers split from app.js.
// Loaded before app.js so the main controller can keep small wrappers.

function presenterSlidesWithIntroSlide(item = {}, section = {}, index = 0, memo = emptyServiceItemMemo(), slides = []) {
  const list = Array.isArray(slides) ? slides.filter(Boolean) : [];
  if (!list.length) return list;
  const introSlide = presenterIntroSlideFromMemo(item, section, index, memo);
  if (!introSlide) return list;
  const introBody = presenterTitleContentBodyText(introSlide);
  const alreadyPresent = list.some((slide) =>
    slide?._introSlide
    || (
      slide?.type === "title-content"
      && normalizeTitle(slide.title) === normalizeTitle(introSlide.title)
      && normalizeTitle(presenterTitleContentBodyText(slide)) === normalizeTitle(introBody)
    ));
  return alreadyPresent ? list : [introSlide, ...list];
}

function presenterIntroSlideFromMemo(item = {}, section = {}, index = 0, memo = emptyServiceItemMemo()) {
  const intro = normalizeServiceIntroSlide(memo.introSlide);
  if (!intro) return null;
  const title = intro.title || section.sectionTitle || item.label || "제목";
  const bodyText = intro.body || "";
  return {
    id: `${item.id || index}:intro-title`,
    ...section,
    elementLabel: item.label || section.elementLabel || "제목 / 내용",
    elementTitle: title,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
    layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
    type: "title-content",
    label: item.label || "",
    title,
    bodyText,
    marker: "",
    text: [title, bodyText].filter(Boolean).join("\n"),
    sort: index - 0.001,
    _introSlide: true,
  };
}

function presenterSlidesWithSpecialSongTitle(item = {}, section = {}, slides = [], index = 0, service = null) {
  if (!shouldIncludeSpecialSongSectionTitleSlide(item, section, slides)) {
    return presenterSlidesWithSundayMainSpecialSongOutput(slides, item, section, service);
  }
  const titleSlideIndex = slides.findIndex((slide) => slide?.type === "song-title");
  const existingSpecialTitleIndex = slides.findIndex((slide) =>
    slide?.type === "title-assignee"
    && normalizeTitle(slide.title) === normalizeTitle("특송"));
  const existingSpecialTitle = existingSpecialTitleIndex >= 0 ? slides[existingSpecialTitleIndex] : null;
  if (existingSpecialTitle?.missingContent) {
    return presenterSlidesWithSundayMainSpecialSongOutput(slides, item, section, service);
  }
  const titleSlide = titleSlideIndex >= 0 ? slides[titleSlideIndex] : null;
  const remainingSlides = slides.filter((_, slideIndex) =>
    slideIndex !== existingSpecialTitleIndex);
  return presenterSlidesWithSundayMainSpecialSongOutput([
    presenterSpecialSongSectionTitleSlide(item, section, index, titleSlide),
    ...remainingSlides,
  ], item, section, service);
}

function presenterSlidesWithScriptureReadingTitle(item = {}, section = {}, slides = [], index = 0, service = null) {
  const list = Array.isArray(slides) ? slides.filter(Boolean) : [];
  if (!list.length || presenterScriptureBodyContext(item, section) !== "reading") return list;
  const existingTitle = list.some((slide) =>
    slide?.type === "title-assignee"
    && compactSearchValue(slide.title || slide.label || "") === "성경봉독");
  if (existingTitle) return list;
  const references = typeof serviceItemScriptureReferences === "function"
    ? serviceItemScriptureReferences(item, parseServiceItemMemo(item.memo), service)
    : [];
  const reference = references.length && typeof formatServiceScriptureReferenceList === "function"
    ? formatServiceScriptureReferenceList(references)
    : String(list[0]?.title || list[0]?.marker || item.raw_title || "").trim();
  return [presenterScriptureReadingTitleSlide(item, section, index, reference), ...list];
}

function presenterScriptureReadingTitleSlide(item = {}, section = {}, index = 0, reference = "") {
  const title = "성경봉독";
  const assignee = String(reference || "").trim();
  return {
    id: `${item.id || index}:scripture-reading-title`,
    ...section,
    elementLabel: title,
    elementTitle: title,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "title-assignee",
    label: title,
    title,
    assignee,
    marker: "",
    text: cleanList([title, assignee]).join("\n"),
    sort: index - 0.002,
  };
}

function shouldIncludeSpecialSongSectionTitleSlide(item = {}, section = {}, slides = []) {
  if (!slides.length) return false;
  const sectionKey = String(section.sectionKey || item?._worshipSectionKey || "").trim();
  if (!isPresenterSpecialSongItem(item, section)) return false;
  return true;
}

function isPresenterSpecialSongItem(item = {}, section = {}) {
  const sectionKey = String(section.sectionKey || item?._worshipSectionKey || "").trim();
  if (sectionKey === "special_song") return true;
  return compactSearchValue(item?._worshipSectionTitle || "") === "특송";
}

function presenterSlidesWithSundayMainSpecialSongOutput(slides = [], item = {}, section = {}, service = null) {
  if (!shouldUseSundayMainSpecialSongCleanOutput(item, section, service)) return slides;
  return (Array.isArray(slides) ? slides : []).map((slide) => ({
    ...slide,
    outputContext: "clean",
  }));
}

function shouldUseSundayMainSpecialSongCleanOutput(item = {}, section = {}, service = null) {
  if (!isPresenterSpecialSongItem(item, section)) return false;
  const rawType = String(service?.type_id || service?.typeId || "").trim();
  const typeId = typeof worshipAppServiceTypeId === "function"
    ? worshipAppServiceTypeId(rawType)
    : rawType;
  return typeId === "sunday-main";
}

function presenterSpecialSongSectionTitleSlide(item = {}, section = {}, index = 0, songTitleSlide = null) {
  const title = section.sectionLabel || "특송";
  const assignee = cleanServiceAssignee(item.assignee);
  const subtitle = assignee;
  const text = [title, subtitle].filter(Boolean).join("\n");
  return {
    id: `${item.id || index}:special-title`,
    ...section,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "title-assignee",
    label: "특송",
    title,
    subtitle,
    assignee: subtitle,
    marker: "",
    text,
    sort: index - 0.002,
  };
}

function presenterSpecialSongDisplayTitle(item = {}, songTitleSlide = null) {
  const rawTitle = String(item.raw_title || item.title || "").trim();
  const genericLabel = compactSearchValue(item.label || "특송");
  const fromSlideText = String(songTitleSlide?.text || "").replace(/^♪\s*/, "").trim();
  if (fromSlideText && (rawTitle || compactSearchValue(fromSlideText) !== genericLabel)) return fromSlideText;
  const marker = String(songTitleSlide?.marker || "").trim();
  const title = String(songTitleSlide?.title || "").trim();
  const titleText = [marker, title].filter(Boolean).join(" ");
  if (titleText && (rawTitle || compactSearchValue(titleText) !== genericLabel)) return titleText;
  return rawTitle.replace(/^♪\s*/, "").trim();
}

const PRESENTER_PUBLIC_LORDS_PRAYER_TEXT = `하늘에 계신 우리 아버지,
아버지의 이름을 거룩하게 하시며
아버지의 나라가 오게 하시며,
아버지의 뜻이 하늘에서와 같이 땅에서도 이루어지게 하소서.
오늘 우리에게 일용할 양식을 주시고,
우리가 우리에게 잘못한 사람을 용서하여 준 것같이,
우리 죄를 용서하여 주시고,
우리를 시험에 빠지지 않게 하시고, 악에서 구하소서.
나라와 권능과 영광이
영원히 아버지의 것입니다. 아멘.`;

const PRESENTER_PUBLIC_APOSTLES_CREED_TEXT = `나는 전능하신 아버지 하나님, 천지의 창조주를 믿습니다.
나는 그의 유일하신 아들, 우리 주 예수 그리스도를 믿습니다.
그는 성령으로 잉태되어 동정녀 마리아에게서 나시고,
본디오 빌라도에게 고난을 받아 십자가에 못 박혀 죽으시고,
장사된 지 사흘 만에 죽은 자 가운데서 다시 살아나셨으며,
하늘에 오르시어 전능하신 아버지 하나님 우편에 앉아 계시다가,
거기로부터 살아 있는 자와 죽은 자를 심판하러 오십니다.
나는 성령을 믿으며, 거룩한 공교회와 성도의 교제와
죄를 용서받는 것과 몸의 부활과 영생을 믿습니다. 아멘.`;

const PRESENTER_PUBLIC_APOSTLES_CREED_CHROMAKEY_TEXT = `나는 전능하신 아버지 하나님,
천지의 창조주를 믿습니다.
나는 그의 유일하신 아들,
우리 주 예수 그리스도를 믿습니다.
그는 성령으로 잉태되어
동정녀 마리아에게서 나시고,
본디오 빌라도에게 고난을 받아
십자가에 못 박혀 죽으시고,
장사된 지 사흘 만에
죽은 자 가운데서 다시 살아나셨으며,
하늘에 오르시어 전능하신 아버지
하나님 우편에 앉아 계시다가,
거기로부터 살아 있는 자와
죽은 자를 심판하러 오십니다.
나는 성령을 믿으며,
거룩한 공교회와 성도의 교제와
죄를 용서받는 것과
몸의 부활과 영생을 믿습니다. 아멘.`;

const PRESENTER_SCRIPTURE_READING_BACKGROUND = "assets/worship-backgrounds/scripture-reading-cross.png";
const PRESENTER_CHURCH_LOGO = "assets/presenter/church-logo-white.png";

const PRESENTER_PUBLIC_COMMUNITY_CONFESSION_TEXT = `우리는 세상으로부터 부름 받은 하나님의 거룩한 백성입니다.
또한 세상으로 보냄 받은 그리스도의 제자입니다.
하나님을 기쁘게 찬양하는 성령 충만한 예배자가 되겠습니다.
진리를 배우고 수호하는 은혜에 빚진 훈련자가 되겠습니다.
땅 끝까지 복음을 전파하는 전도자가 되겠습니다.
이웃의 아픔을 함께하는 치유자가 되겠습니다.
온 성도가 하나 되는 화해자가 되겠습니다.
사회적 책임을 다하는 소명자가 되겠습니다.
그리하여 우리 모두 하나님을 영화롭게 하는
검단우리교회 공동체가 되겠습니다.`;

const PRESENTER_PUBLIC_COMMUNITY_CONFESSION_CHROMAKEY_SLIDES = Object.freeze([
  "우리는 세상으로부터 부름 받은\n하나님의 거룩한 백성입니다.",
  "또한 세상으로 보냄 받은\n그리스도의 제자입니다.",
  "하나님을 기쁘게 찬양하는\n성령 충만한 예배자가 되겠습니다.",
  "진리를 배우고 수호하는\n은혜에 빚진 훈련자가 되겠습니다.",
  "땅 끝까지 복음을 전파하는\n전도자가 되겠습니다.",
  "이웃의 아픔을 함께하는\n치유자가 되겠습니다.",
  "온 성도가 하나 되는\n화해자가 되겠습니다.",
  "사회적 책임을 다하는\n소명자가 되겠습니다.",
  "그리하여 우리 모두 하나님을 영화롭게 하는\n검단우리교회 공동체가 되겠습니다.",
]);

function serviceItemOutputMode(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  const mode = normalizeServiceOutputMode(
    memo.outputMode
    || item.outputMode
    || item.output_mode
    || item.renderMode
    || item.render_mode,
  );
  const flexibleOffering = typeof serviceItemUsesFlexibleOfferingSlot === "function"
    && serviceItemUsesFlexibleOfferingSlot(item);
  return flexibleOffering && mode === "score" ? "" : mode;
}

function presenterScoreSlidesForServiceItem(
  item,
  section,
  index,
  song,
  version,
  displayText,
  memo = parseServiceItemMemo(item?.memo),
  forms = [],
  formWarnings = [],
) {
  const label = item?.label || "";
  const asset = normalizeServiceAsset(memo.asset || item.asset);
  const title = presenterSongTitleDisplayTitle(song, version, displayText) || displayText || label || "악보";
  const imageSlides = presenterScoreImageSlidesFromAsset(asset, item, section, index, title, label, song, version, displayText, forms, formWarnings);
  if (imageSlides.length) return imageSlides;
  const scoreAsset = { ...asset, kind: asset.kind || "score" };
  if (!String(scoreAsset.url || "").trim()) return [];
  const fileTitle = presenterFileDisplayTitle({ title, asset: scoreAsset }, "악보");
  const scoreForms = presenterScoreFormsFromImageSources([{ formLabel: asset.formLabel || asset.form_label || asset.scoreFormLabel || asset.score_form_label }]);
  return [{
    id: `${item.id || index}:score`,
    ...section,
    sectionLabel: section.sectionLabel || label || "악보",
    sectionTitle: section.sectionTitle || section.sectionLabel || label || "악보",
    sectionName: presenterNameParts(section.sectionLabel || label, fileTitle).join(" / ") || fileTitle,
    elementTitle: fileTitle,
    elementType: PRESENTER_ELEMENT_TYPES.FILE,
    layout: PRESENTER_SLIDE_LAYOUTS.FILE,
    type: "file",
    label,
    title: fileTitle,
    subtitle: versionDisplayName(song, version),
    marker: "악보",
    text: [fileTitle, scoreAsset.url].filter(Boolean).join("\n"),
    asset: scoreAsset,
    ...presenterScoreFormMetadata(scoreForms, 0, formWarnings),
    sourceType: "score",
    componentType: "score",
    sort: index,
  }];
}

function presenterScoreImageSlidesFromAsset(
  asset,
  item,
  section,
  index,
  title,
  label,
  song = null,
  version = null,
  displayText = "",
  forms = [],
  formWarnings = [],
) {
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
      formLabel: presenterScoreFormLabelFromAssetSlide(slide),
      formKey: String(slide.formKey || slide.form_key || slide.scoreFormKey || slide.score_form_key || "").trim(),
      order: Number(slide.order) || slideIndex + 1,
    }))
    .filter((slide) => slide.url && presenterMediaSourceIsImage(slide.url));
  const count = imageSources.length;
  const scoreForms = presenterScoreFormsFromImageSources(imageSources);
  return imageSources.map((slide, slideIndex) => {
    return {
      id: `${item.id || index}:score-image:${slideIndex}`,
      ...section,
      sectionLabel: section.sectionLabel || label || "악보",
      sectionTitle: section.sectionTitle || section.sectionLabel || label || "악보",
      sectionName: presenterNameParts(section.sectionLabel || label, title).join(" / ") || title,
      elementTitle: title,
      elementType: PRESENTER_ELEMENT_TYPES.IMAGE,
      layout: PRESENTER_SLIDE_LAYOUTS.MEDIA,
      type: "image",
      label,
      title,
      subtitle: versionDisplayName(song, version),
      marker: "",
      text: slide.name || title,
      imageSrc: slide.url,
      asset: { ...asset, kind: asset.kind || "score", url: slide.url, name: slide.name || asset.name || "" },
      ...presenterScoreFormMetadata(scoreForms, slideIndex, formWarnings),
      scoreBackground: true,
      sourceType: "score",
      componentType: "score",
      sort: index + slideIndex / 100,
    };
  });
}

function presenterScoreFormMetadata(forms = [], slideIndex = 0, formWarnings = []) {
  const form = Array.isArray(forms) ? forms[slideIndex] : null;
  if (!form) return formWarnings?.length ? { warnings: formWarnings } : {};
  const formId = form._localId || form.id || slideIndex;
  return {
    formKey: form._presenterScoreFormKey || `${formId}:${slideIndex}`,
    formLabel: presenterFormMarker(form),
    warnings: formWarnings,
  };
}

function presenterScoreFormsFromImageSources(imageSources = []) {
  return imageSources.map((source, index) => {
    const label = presenterScoreFormLabelFromAssetSlide(source);
    if (!label) return null;
    const target = normalizePresenterFormPresetLabel(label);
    if (!target.key || target.type === "lyrics") return null;
    const partType = presenterFormPartTypeForPresetTarget(target);
    const formKey = String(source.formKey || source.form_key || source.scoreFormKey || source.score_form_key || "").trim()
      || `score:${target.key}:${index}`;
    return {
      _presenterVirtual: true,
      _presenterScoreFormKey: formKey,
      id: formKey,
      part_type: partType,
      part_number: target.number || null,
      label,
      lyrics: label,
    };
  });
}

function presenterScoreFormLabelFromAssetSlide(slide = {}) {
  return normalizePresenterScoreFormLabel(
    slide.formLabel
    || slide.form_label
    || slide.scoreFormLabel
    || slide.score_form_label
    || slide.form
    || "",
  );
}

function normalizePresenterScoreFormLabel(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const target = normalizePresenterFormPresetLabel(raw);
  if (target.type === "lyrics") return "";
  if (target.type === "verse" && target.number) return `Verse ${target.number}`;
  if (target.key === "chorus") return "Chorus";
  if (target.key === "bridge") return "Bridge";
  if (target.key === "pre-chorus") return "Pre-Chorus";
  if (target.key === "coda") return "Coda";
  return "";
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
      formLabel: slide.scoreFormLabel || slide.score_form_label || slide.formLabel || slide.form_label || "",
      formKey: slide.scoreFormKey || slide.score_form_key || slide.formKey || slide.form_key || "",
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

function presenterFormPlanForServiceItem(version = {}, item, song = null) {
  version = version || {};
  const forms = normalizeForms(version.forms || []).filter((form) => normalizeLyricsForCopy(form.lyrics));
  if (typeof serviceItemFormPresetDisabled === "function" && serviceItemFormPresetDisabled(item)) return { forms, warnings: [] };
  const isHymn = versionEffectivePraiseTypes(song, version).includes("hymn");
  const itemPreset = serviceItemFormPreset(item);
  const matchedRule = matchedServiceItemFormPresetRule(item, song, version);
  const songDefaultPreset = presenterSongDefaultFormPreset(song, version);
  const preset = isHymn
    ? itemPreset
      || matchedRule?.formPreset
      || songDefaultPreset
      || presenterDefaultVerseChorusFormPreset(forms, song, version)
      || null
    : presenterExplicitNonHymnFormPreset(itemPreset)
      || matchedRule?.formPreset
      || presenterExplicitNonHymnFormPreset(songDefaultPreset)
      || presenterDefaultVerseChorusFormPreset(forms, song, version)
      || null;
  const effectivePreset = presenterFormPresetWithAvailableForms(preset, forms);
  if (!effectivePreset?.forms?.length) return { forms, warnings: [] };
  const resolved = resolvePresenterFormPresetSequence(forms, effectivePreset.forms);
  const warnings = resolved.missing.map((label) => `${label} 없음`);
  const omitUnlisted = presenterFormPresetShouldOmitUnlisted(effectivePreset);
  return {
    forms: resolved.items.length
      ? omitUnlisted
        ? resolved.items
        : presenterFormsWithNoSourceOmissions(resolved.items, forms)
      : forms,
    warnings,
  };
}

function presenterFormPresetShouldOmitUnlisted(preset = null) {
  if (preset?.omitUnlisted) return true;
  const strength = String(preset?.strength || "").trim().toLowerCase();
  return ["default", "forced", "manual", "song-default"].includes(strength);
}

function presenterFormsWithNoSourceOmissions(plannedForms = [], sourceForms = []) {
  const source = normalizeForms(sourceForms || []).filter((form) => normalizeLyricsForCopy(form.lyrics));
  const identity = (form) => String(form?._localId || form?.id || "").trim();
  const sourceIndexes = new Map(source.map((form, index) => [identity(form), index]).filter(([id]) => id));
  if (!sourceIndexes.size) return plannedForms;

  const merged = [...plannedForms];
  const present = new Set(merged.map(identity).filter(Boolean));
  source.forEach((form) => {
    const id = identity(form);
    if (!id || present.has(id)) return;
    const sourceIndex = sourceIndexes.get(id);
    const insertAt = merged.findIndex((candidate) => {
      const candidateIndex = sourceIndexes.get(identity(candidate));
      return Number.isFinite(candidateIndex) && candidateIndex > sourceIndex;
    });
    merged.splice(insertAt < 0 ? merged.length : insertAt, 0, form);
    present.add(id);
  });
  return merged;
}

function presenterExplicitNonHymnFormPreset(preset = null) {
  if (!preset?.forms?.length) return null;
  return String(preset.strength || "").trim().toLowerCase() === "suggested" ? null : preset;
}

function presenterFormPresetWithAvailableForms(preset = null, forms = []) {
  if (!preset?.forms?.length) return preset;
  const source = normalizeForms(forms || [])
    .filter((form) => normalizeLyricsForCopy(form.lyrics))
    .map((form) => ({ form, target: normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form)) }))
    .filter(({ target }) => target.key && target.type !== "lyrics");
  if (!source.length) return preset;

  const base = presenterRepeatableVerseChorusPresetForms(preset, source) || cleanList(preset.forms);
  const merged = [];
  let sourceIndex = 0;
  base.forEach((label) => {
    const target = normalizePresenterFormPresetLabel(label);
    if (target.groupIndex) {
      merged.push(label);
      return;
    }
    if (target.lastVerse) {
      const lastVerse = source
        .map((candidate, index) => ({ ...candidate, index }))
        .filter(({ target: candidate }) => candidate.type === "verse")
        .reduce((best, candidate) => {
          if (!best) return candidate;
          const bestNumber = Number(best.target.number) || 0;
          const candidateNumber = Number(candidate.target.number) || 0;
          if (candidateNumber > bestNumber) return candidate;
          if (candidateNumber === bestNumber && candidate.index > best.index) return candidate;
          return best;
        }, null);
      if (lastVerse) {
        sourceIndex = Math.max(sourceIndex, lastVerse.index + 1);
        merged.push(presenterFormDisplayLabel(lastVerse.form));
        return;
      }
    }
    const matchIndex = source.findIndex(({ target: candidate }, index) => index >= sourceIndex && presenterFormTargetsMatch(target, candidate));
    if (matchIndex >= sourceIndex) {
      source.slice(sourceIndex, matchIndex).forEach(({ form, target: candidate }) => {
        if (presenterSupplementalFormType(candidate)) merged.push(presenterFormDisplayLabel(form));
      });
      sourceIndex = matchIndex + 1;
      merged.push(presenterFormDisplayLabel(source[matchIndex].form));
      return;
    }
    merged.push(label);
  });

  if (preset.omitUnlisted) {
    const original = cleanList(preset.forms);
    if (merged.length === original.length && merged.every((label, index) => label === original[index])) return preset;
    return {
      ...preset,
      forms: merged,
      hint: merged.join("-"),
    };
  }

  // Preserve endings and bridges omitted by a generic sequence such as VCVC.
  let includeFollowingChorus = false;
  source.slice(sourceIndex).forEach(({ form, target }) => {
    if (presenterSupplementalFormType(target)) {
      merged.push(presenterFormDisplayLabel(form));
      includeFollowingChorus = target.type === "bridge" || target.type === "pre-chorus";
      return;
    }
    if (includeFollowingChorus && target.type === "chorus") {
      merged.push(presenterFormDisplayLabel(form));
      includeFollowingChorus = false;
    }
  });

  const hasPreChorus = source.some(({ target }) => target.type === "pre-chorus");
  const formsWithPreChorus = hasPreChorus
    ? presenterInsertPreChorusBeforeChoruses(merged)
    : merged;
  const original = cleanList(preset.forms);
  if (formsWithPreChorus.length === original.length && formsWithPreChorus.every((label, index) => label === original[index])) return preset;
  return {
    ...preset,
    forms: formsWithPreChorus,
    hint: formsWithPreChorus.join("-"),
  };
}

function presenterRepeatableVerseChorusPresetForms(preset = null, source = []) {
  const strength = String(preset?.strength || "").trim().toLowerCase();
  if (["default", "forced", "manual"].includes(strength)) return null;
  const presetForms = cleanList(preset?.forms);
  const targets = presetForms.map((label) => normalizePresenterFormPresetLabel(label));
  const core = targets.filter((target) => target.type !== "pre-chorus");
  const alternating = core.length >= 2
    && core.every((target, index) => target.type === (index % 2 === 0 ? "verse" : "chorus"));
  if (!alternating) return null;

  const verses = source.filter(({ target }) => target.type === "verse");
  const choruses = source.filter(({ target }) => target.type === "chorus");
  if (!verses.length || !choruses.length) return null;

  const preChoruses = source.filter(({ target }) => target.type === "pre-chorus");
  const presetChorusCount = targets.filter((target) => target.type === "chorus").length;
  const cycles = Math.max(verses.length, choruses.length, presetChorusCount);
  const expanded = [];
  for (let index = 0; index < cycles; index += 1) {
    expanded.push(presenterFormDisplayLabel(verses[index % verses.length].form));
    if (preChoruses.length) expanded.push(presenterFormDisplayLabel(preChoruses[index % preChoruses.length].form));
    expanded.push(presenterFormDisplayLabel(choruses[index % choruses.length].form));
  }
  return expanded;
}

function presenterFormTargetsMatch(target = {}, candidate = {}) {
  if (target.key === candidate.key) return true;
  return Boolean(target.type && target.type === candidate.type && (!target.number || target.number === candidate.number));
}

function presenterSupplementalFormType(target = {}) {
  return !["", "verse", "chorus", "lyrics"].includes(String(target.type || ""));
}

function presenterInsertPreChorusBeforeChoruses(forms = []) {
  return cleanList(forms).flatMap((label, index, list) => {
    const target = normalizePresenterFormPresetLabel(label);
    const previous = normalizePresenterFormPresetLabel(list[index - 1] || "");
    if (target.type === "chorus" && previous.type !== "pre-chorus") return ["PC", label];
    return [label];
  });
}

function presenterSongDefaultFormPreset(song = null, version = null) {
  const versionMeta = normalizeSongMetadata(version?.metadata);
  const songMeta = normalizeSongMetadata(song?.metadata);
  return versionMeta.presenter_form || songMeta.presenter_form || null;
}

function presenterDefaultVerseChorusFormPreset(forms = [], song = null, version = null) {
  const praiseTypes = versionEffectivePraiseTypes(song, version);
  if (!praiseTypes.includes("hymn") && !praiseTypes.includes("ccm")) return null;
  const normalizedForms = normalizeForms(forms || []);
  const verses = normalizedForms.filter((form) => normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form)).type === "verse");
  const chorus = normalizedForms.find((form) => normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form)).type === "chorus");
  if (!verses.length || !chorus) return null;
  const presetForms = [];
  verses.forEach((verse, index) => {
    const target = normalizePresenterFormPresetLabel(presenterFormDisplayLabel(verse));
    presetForms.push(target.number ? `V${target.number}` : index === 0 ? "V" : `V${index + 1}`);
    presetForms.push("C");
  });
  const hymnCoda = normalizedForms.find((form) => {
    const target = normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form));
    return target.type === "coda";
  });
  if (hymnCoda) presetForms.push("Coda");
  return normalizeServiceFormPreset(presetForms, presetForms.join("-"), "auto");
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
  if (presenterFormsAreUnsplitLyrics(forms)) {
    const lyricsResolved = resolvePresenterLyricsFormPresetSequence(forms, presetForms);
    if (lyricsResolved.items.length) return lyricsResolved;
  }
  const items = [];
  const missing = [];
  for (const label of cleanList(presetForms)) {
    const resolved = findPresenterFormForPresetLabel(forms, label);
    if (resolved) items.push(resolved);
    else missing.push(normalizePresenterMissingFormLabel(label));
  }
  return { items, missing };
}

function presenterFormsAreUnsplitLyrics(forms = []) {
  const normalizedForms = normalizeForms(forms || []).filter((form) => normalizeLyricsForCopy(form.lyrics));
  return Boolean(normalizedForms.length) && normalizedForms.every((form) => normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form)).type === "lyrics");
}

function resolvePresenterLyricsFormPresetSequence(forms = [], presetForms = []) {
  const blocks = presenterLyricsBlocksFromForms(forms);
  const items = [];
  const missing = [];
  const assigned = new Map();
  let blockIndex = 0;
  cleanList(presetForms).forEach((label, index) => {
    const target = normalizePresenterFormPresetLabel(label);
    if (!target.key) return;
    if (target.blank) {
      items.push(presenterBlankFormPresetItem(label, target));
      return;
    }
    const assignedForm = assigned.get(target.key);
    if (assignedForm) {
      items.push({ ...assignedForm, id: `${assignedForm.id}:repeat:${index}` });
      return;
    }
    const block = blocks[blockIndex];
    if (!block) {
      missing.push(normalizePresenterMissingFormLabel(label));
      return;
    }
    blockIndex += 1;
    const form = presenterVirtualFormPresetItem(label, target, block, index);
    assigned.set(target.key, form);
    items.push(form);
  });
  return { items, missing };
}

function presenterLyricsBlocksFromForms(forms = []) {
  return normalizeForms(forms || [])
    .flatMap((form) => String(form.lyrics || "").split(/\n\s*\n/g))
    .map((block) => normalizeLyricsForCopy(block))
    .filter(Boolean);
}

function presenterVirtualFormPresetItem(label = "", target = {}, lyrics = "", index = 0) {
  const partType = presenterFormPartTypeForPresetTarget(target);
  const partNumber = target.number || null;
  const cleanLabel = String(label || "").trim();
  return {
    _presenterVirtual: true,
    id: `preset-form:${target.key || compactSearchValue(cleanLabel) || index}`,
    part_type: partType,
    part_number: partNumber,
    lyrics,
    label: cleanLabel || (partNumber ? `${partType} ${partNumber}` : partType),
  };
}

function presenterFormPartTypeForPresetTarget(target = {}) {
  const type = String(target.type || "").trim();
  if (type === "verse") return "Verse";
  if (type === "chorus") return "Chorus";
  if (type === "bridge") return "Bridge";
  if (type === "pre-chorus") return "Pre-Chorus";
  if (type === "coda") return "Coda";
  if (type === "lyrics") return "Lyrics";
  return PART_TYPES.includes(target.rawType) ? target.rawType : "Lyrics";
}

function findPresenterFormForPresetLabel(forms = [], label = "") {
  const target = normalizePresenterFormPresetLabel(label);
  if (!target.key) return null;
  if (target.blank) return presenterBlankFormPresetItem(label, target);
  if (target.lastVerse) {
    const verses = forms
      .map((form, index) => ({ form, index, target: normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form)) }))
      .filter(({ target }) => target.type === "verse");
    if (!verses.length) return null;
    return verses.reduce((best, candidate) => {
      const bestNumber = Number(best.target.number) || 0;
      const candidateNumber = Number(candidate.target.number) || 0;
      if (candidateNumber > bestNumber) return candidate;
      if (candidateNumber === bestNumber && candidate.index > best.index) return candidate;
      return best;
    }).form;
  }
  if (target.groupIndex) {
    const form = findPresenterFormForPresetTarget(forms, target);
    return form ? presenterFormPresetGroupItem(label, target, form) : null;
  }
  return findPresenterFormForPresetTarget(forms, target);
}

function findPresenterFormForPresetTarget(forms = [], target = {}) {
  const sameType = [];
  for (const form of forms) {
    const candidate = normalizePresenterFormPresetLabel(presenterFormDisplayLabel(form));
    if (target.type && target.type === candidate.type) sameType.push({ form, target: candidate });
    if (target.key === candidate.key) return form;
    if (target.type && target.type === candidate.type && (!target.number || target.number === candidate.number)) return form;
  }
  if (target.groupIndex && target.type) {
    const unnumbered = sameType.filter(({ target: candidate }) => !candidate.number);
    if (unnumbered.length === 1) return unnumbered[0].form;
  }
  return null;
}

function presenterFormPresetGroupItem(label = "", target = {}, form = {}) {
  const chunks = presenterGroupedLyricChunks(form.lyrics, target);
  const lyrics = chunks[(Number(target.groupIndex) || 1) - 1] || "";
  if (!lyrics) return null;
  const cleanLabel = String(label || "").trim();
  const baseId = String(form._localId || form.id || target.key || compactSearchValue(cleanLabel) || "form");
  return {
    ...form,
    _presenterVirtual: true,
    _presenterSourceFormId: form._localId || form.id || "",
    id: `${baseId}:group:${target.group || target.groupIndex}`,
    lyrics,
    label: cleanLabel || presenterFormDisplayLabel(form),
  };
}

function presenterGroupedLyricChunks(lyrics = "", target = {}) {
  const groupIndex = Number(target?.groupIndex) || 0;
  if (!groupIndex) return splitPresenterLyricChunks(lyrics);
  const lines = String(lyrics || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return lines;
  const chunkSize = Math.max(1, Math.ceil(lines.length / Math.max(groupIndex, 2)));
  const chunks = [];
  for (let index = 0; index < lines.length; index += chunkSize) {
    chunks.push(lines.slice(index, index + chunkSize).join("\n"));
  }
  return chunks;
}

function presenterFormDisplayLabel(form = {}) {
  if (form._presenterVirtual && form._presenterSourceFormId) return String(form.label || "").trim() || displayLabel(form);
  if (form._presenterVirtual) return displayLabel(form);
  return String(form.label || "").trim() || displayLabel(form);
}

function normalizePresenterFormPresetLabel(value = "") {
  const raw = String(value || "").trim();
  const compact = compactSearchValue(raw);
  const lastVerse = /^(마지막절|lastverse|last)$/i.test(compact);
  if (lastVerse) return { key: "last-verse", type: "verse", number: 0, lastVerse: true };
  const hymnVerse = raw.match(/^(\d+)\s*절$/u);
  if (hymnVerse) return { key: `verse:${hymnVerse[1]}`, type: "verse", number: Number(hymnVerse[1]) };
  const shorthand = raw.match(/^(v|verse)\s*(\d*)([a-z])?$/i);
  if (shorthand) {
    const number = shorthand[2] ? Number(shorthand[2]) : 0;
    const group = shorthand[3] ? shorthand[3].toUpperCase() : "";
    const baseKey = number ? `verse:${number}` : "verse";
    return {
      key: group ? `${baseKey}:${group.toLowerCase()}` : baseKey,
      type: "verse",
      number,
      ...(group ? { group, groupIndex: group.charCodeAt(0) - 64 } : {}),
    };
  }
  const chorus = raw.match(/^(c|chorus|후렴|코러스)\s*(\d*)$/i);
  if (chorus) {
    const number = chorus[2] ? Number(chorus[2]) : 0;
    return { key: number ? `chorus:${number}` : "chorus", type: "chorus", number };
  }
  const bridge = /^(b|bridge|브릿지)$/i.test(compact);
  if (bridge) return { key: "bridge", type: "bridge", number: 0 };
  const preChorus = /^(pc|prechorus|pre-chorus|프리코러스)$/i.test(compact);
  if (preChorus) return { key: "pre-chorus", type: "pre-chorus", number: 0 };
  const coda = /^(coda|코다|ending|엔딩)$/i.test(compact);
  if (coda) return { key: "coda", type: "coda", number: 0 };
  const lyrics = /^(lyrics|가사)$/i.test(compact);
  if (lyrics) return { key: "lyrics", type: "lyrics", number: 0 };
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
  if (/^coda$/i.test(compact)) return "coda";
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
  if (target.key === "coda") return "Coda";
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

function isServicePreparationItem(item, memo = parseServiceItemMemo(item?.memo)) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  const title = String(item?.raw_title || "").replace(/\s+/g, "");
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  const role = normalizeServicePresenterRole(memo?.presenterRole || memo?.templateKey || memo?.templateVariant);
  return sectionKey === "ready"
    || label === "준비"
    || label === "예배준비"
    || label === "대기영상"
    || label === "인트로"
    || label === "카운트다운"
    || title === "준비"
    || title === "예배준비"
    || title === "대기영상"
    || title === "인트로"
    || title === "카운트다운"
    || role === "ready"
    || role === "waiting_loop"
    || role === "intro"
    || role === "still";
}

function isConfessionPrayerLabel(...values) {
  return values.some((value) => {
    const compact = compactSearchValue(value);
    return compact === "참회기도" || compact === "참회의기도";
  });
}

function isAbsolutionDeclarationLabel(...values) {
  return values.some((value) => compactSearchValue(value) === "사죄의선언");
}

function isConfessionPrayerServiceItem(item = {}) {
  return (String(item?._worshipSectionKey || "").trim() === "confession"
      && !isAbsolutionDeclarationLabel(item?.label, item?.raw_title, item?._worshipSectionTitle))
    || isConfessionPrayerLabel(item?.label, item?.raw_title, item?._worshipSectionTitle);
}

function isConfessionPrayerElement(element = {}, section = {}, sourceRef = {}) {
  return (String(section?.section_key || "").trim() === "confession"
      && !isAbsolutionDeclarationLabel(sourceRef?.label, section?.title, element?.title))
    || isConfessionPrayerLabel(sourceRef?.label, section?.title, element?.title);
}

function presenterConfessionPrayerSlide(item, section, index) {
  return presenterTitleOnlySlide(item, section, index, "참회기도");
}

function presenterTitleOnlySlide(item, section, index, titleText = "") {
  const title = String(titleText || item?.raw_title || item?.label || "제목").trim();
  return {
    id: `${item?.id || index}:title`,
    ...section,
    sectionLabel: item?.label || section.sectionLabel || title,
    sectionTitle: title,
    sectionName: title,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "title-assignee",
    label: item?.label || "",
    title,
    assignee: "",
    marker: "",
    text: title,
    sort: index,
  };
}

function isLiturgicalBodyServiceItem(item = {}) {
  const sectionKey = String(item?._worshipSectionKey || "").trim();
  if (sectionKey === "creed" || sectionKey === "lords_prayer" || sectionKey === "community_confession") return true;
  return isLiturgicalBodyLabel(item?.label, item?.raw_title, item?._worshipSectionTitle)
    || compactSearchValue(item?.label || "") === "청소년부광고";
}

function isLiturgicalBodyLabel(...values) {
  return values.some((value) => {
    const compact = compactSearchValue(value);
    return compact === "사도신경" || compact === "신앙고백" || compact === "주기도문" || compact === "공동체고백";
  });
}

function liturgicalBodyTitle(item = {}) {
  const label = compactSearchValue(item?.label || "");
  const title = compactSearchValue(item?.raw_title || "");
  if (label === "청소년부광고") return "청소년부 광고";
  if (label === "주기도문" || title === "주기도문" || String(item?._worshipSectionKey || "") === "lords_prayer") return "주기도문";
  if (label === "공동체고백" || title === "공동체고백" || String(item?._worshipSectionKey || "") === "community_confession") return "공동체고백";
  return "사도신경";
}

function liturgicalBodyText(item = {}, memo = parseServiceItemMemo(item?.memo), displayText = "") {
  const title = liturgicalBodyTitle(item);
  const canonical = presenterCanonicalLiturgicalBodyText(title);
  if (canonical && !item?.template_modified && !item?.templateModified) return canonical;
  if (memo.slides?.length) return memo.slides.join("\n\n").trim();
  const text = String(item?.raw_title || displayText || "").trim();
  if (!text || compactSearchValue(text) === compactSearchValue(title)) return "";
  return canonical || text;
}

function presenterCanonicalLiturgicalBodyText(title = "") {
  const key = compactSearchValue(title);
  if (key === "주기도문") return PRESENTER_PUBLIC_LORDS_PRAYER_TEXT;
  if (key === "공동체고백") return PRESENTER_PUBLIC_COMMUNITY_CONFESSION_TEXT;
  if (key === "사도신경" || key === "신앙고백") return PRESENTER_PUBLIC_APOSTLES_CREED_TEXT;
  return "";
}

function liturgicalBodyTextHighlights(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  const explicit = normalizeServiceTextHighlights(memo?.textHighlights || memo?.text_highlights || memo?.highlights);
  if (explicit.length) return explicit;
  if (liturgicalBodyTitle(item) !== "공동체고백") return [];
  return [
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
}

function buildPresenterLiturgicalBodySlides(item, section, index, service, memo, displayText) {
  if (!isLiturgicalBodyServiceItem(item)) return [];
  const text = liturgicalBodyText(item, memo, displayText);
  if (!text) return [];
  const title = liturgicalBodyTitle(item);
  const textHighlights = liturgicalBodyTextHighlights(item, memo);
  const base = {
    ...section,
    sectionLabel: item?.label || title,
    sectionTitle: title,
    sectionName: title,
    elementType: PRESENTER_ELEMENT_TYPES.BODY_TEXT,
    label: item?.label || title,
    title,
    marker: "",
    textHighlights,
  };
  if (!presenterServiceUsesChromakey(service)) {
    return [{
      id: `${item.id || index}:liturgical-body`,
      ...base,
      layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: "liturgical-body",
      text,
      bodyText: text,
      sort: index,
    }];
  }
  const chromakeyText = title === "사도신경" && text === PRESENTER_PUBLIC_APOSTLES_CREED_TEXT
    ? PRESENTER_PUBLIC_APOSTLES_CREED_CHROMAKEY_TEXT
    : text;
  return presenterLiturgicalChromakeyChunks(title, chromakeyText).map((chunk, chunkIndex) => ({
    id: `${item.id || index}:liturgical:${chunkIndex}`,
    ...base,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "lyrics",
    formKey: `liturgical:${item.id || index}`,
    marker: chunkIndex === 0 ? title : "",
    text: chunk,
    bodyText: text,
    sort: index + chunkIndex / 100,
  }));
}

function presenterLiturgicalChromakeyChunks(title = "", text = "") {
  if (liturgicalBodyTitle({ label: title }) === "공동체고백"
    && text === PRESENTER_PUBLIC_COMMUNITY_CONFESSION_TEXT) {
    return PRESENTER_PUBLIC_COMMUNITY_CONFESSION_CHROMAKEY_SLIDES;
  }
  return splitPresenterLyricChunks(text);
}

function presenterPreparationSlide(service, item, index) {
  const memo = parseServiceItemMemo(item?.memo);
  const presenterRole = presenterPreparationRole(item, memo);
  const elementLabel = presenterPreparationElementLabel(item, {}, presenterRole);
  if (!presenterServiceUsesChromakey(service) && presenterRole !== "intro") {
    return presenterFullscreenPreparationSlide(service, item, index, presenterRole, elementLabel);
  }
  const configuredAsset = normalizeServiceAsset(memo.asset);
  const asset = configuredAsset.url
    ? configuredAsset
    : presenterDefaultPreparationAsset(service, item, memo);
  const elementType = servicePreparationElementTypeForType(service?.type_id);
  const source = normalizePresenterMediaSource(asset.url || "");
  const playbackType = presenterRole === "intro" ? "intro-video" : "ready-video";
  const assetElementLabel = presenterPreparationElementLabel(item, asset, presenterRole);
  if (source) {
    const title = asset.name || item?.raw_title || "";
    const base = {
      ...presenterReadySlide(service),
      id: `${item?.id || index}:ready-media`,
      sectionId: item?._worshipSectionId || item?.id || `${service?.id || "service"}:ready`,
      sectionKey: item?._worshipSectionKey || "ready",
      sectionLabel: item?._worshipSectionTitle || "준비",
      elementLabel: assetElementLabel,
      elementId: item?.id || `${service?.id || "service"}:ready`,
      sectionIndex: index + 1,
      sectionTitle: item?._worshipSectionTitle || "준비",
      elementTitle: title,
      sectionName: cleanList([item?._worshipSectionTitle || "준비", assetElementLabel]).join(" / "),
      title,
      text: "",
      asset: { ...asset, kind: asset.kind || elementType },
      presenterRole,
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
      playback: presenterPlaybackConfig(memo.playback, playbackType),
    };
  }
  return {
    ...presenterReadySlide(service),
    id: `${item?.id || index}:ready`,
    sectionId: item?._worshipSectionId || item?.id || `${service?.id || "service"}:ready`,
    sectionKey: item?._worshipSectionKey || "ready",
    sectionLabel: item?._worshipSectionTitle || item?.label || "준비",
    elementLabel: assetElementLabel,
    elementId: item?.id || `${service?.id || "service"}:ready`,
    sectionIndex: index + 1,
    presenterRole,
    sort: index,
  };
}

function presenterFullscreenPreparationSlide(service, item, index, presenterRole, elementLabel) {
  return {
    ...presenterReadySlide(service),
    id: `${item?.id || index}:ready`,
    sectionId: item?._worshipSectionId || item?.id || `${service?.id || "service"}:ready`,
    sectionKey: item?._worshipSectionKey || "ready",
    sectionLabel: item?._worshipSectionTitle || item?.label || "준비",
    elementLabel,
    elementId: item?.id || `${service?.id || "service"}:ready`,
    sectionIndex: index + 1,
    sectionTitle: item?._worshipSectionTitle || "준비",
    elementTitle: "준비",
    sectionName: cleanList([item?._worshipSectionTitle || "준비", elementLabel]).join(" / "),
    presenterRole,
    sort: index,
  };
}

function presenterDefaultPreparationAsset(service, item = {}, memo = {}) {
  return { kind: "", name: "", url: "" };
}

function presenterPreparationElementLabel(item = {}, asset = {}, presenterRole = "") {
  const assetName = String(asset?.name || "").trim();
  const label = String(item?.label || "").trim();
  const compactLabel = compactSearchValue(label);
  if ((asset?.kind === "image" || presenterMediaSourceIsImage(asset?.url)) && compactLabel === "대기영상") {
    return assetName || "준비 이미지";
  }
  return label || (presenterRole === "intro" ? "인트로" : presenterRole === "still" ? "첫 화면" : "대기");
}

function presenterPreparationRole(item = {}, memo = parseServiceItemMemo(item?.memo)) {
  const explicit = normalizeServicePresenterRole(memo?.presenterRole);
  if (explicit) return explicit;
  const compact = compactSearchValue(`${item?.label || ""} ${item?.raw_title || ""}`);
  if (compact.includes("인트로") || compact.includes("카운트다운") || compact.includes("시작영상")) return "intro";
  if (compact.includes("대기")) return "waiting_loop";
  if (compact.includes("첫화면") || compact.includes("정지화면")) return "still";
  return "ready";
}

function presenterElementSlideFromMemoCore(item, section, index, memo, displayText, service = null) {
  const elementType = serviceMemoElementType(memo);
  if (!elementType || elementType === "praise" || elementType === "scripture") return null;
  const label = item?.label || "";
  const asset = normalizeServiceAsset(memo?.asset);
  const safeLabel = isLegacyPresentationLabel(label) ? "" : label;
  const assetTitle = asset.name && !isLegacyImportArtifactName(asset.name) ? asset.name : "";
  const title = assetTitle || displayText || label || serviceElementTypeLabel(elementType);
  if (elementType === "title") return presenterTitleOnlySlide(item, section, index, title);
  if (elementType === "title_content") {
    const titleContentText = String(item?.raw_title || displayText || "");
    const lines = titleContentText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const titleText = lines[0] || item?.label || section.sectionTitle || "제목";
    const rawBodyText = lines.slice(1).join("\n") || memo.note || item?.assignee || "";
    const mainPraiseIntro = isMainPraiseTitleContentItem(item, section, titleText);
    const sermonTitle = section.sectionKey === "sermon"
      || ["설교", "설교제목"].includes(compactSearchValue(safeLabel));
    if (sermonTitle) {
      const contentTitle = presenterSermonContentTitle(titleText);
      const assignee = cleanPresenterAssignee(rawBodyText);
      return {
        id: `${item.id || index}:title-assignee`,
        ...section,
        elementLabel: safeLabel || "설교 제목",
        elementTitle: contentTitle,
        elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
        layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
        type: "title-assignee",
        label: safeLabel || "설교 제목",
        title: contentTitle,
        assignee,
        contentTitle,
        titlePresentation: "sermon",
        marker: "",
        text: cleanList([contentTitle, assignee]).join("\n"),
        sort: index,
      };
    }
    const displayTitle = mainPraiseIntro ? "찬양" : titleText;
    const bodyText = mainPraiseIntro
      ? resolveMainPraiseIntroBodyText(service, rawBodyText)
      : rawBodyText;
    return {
      id: `${item.id || index}:title-content`,
      ...section,
      elementLabel: mainPraiseIntro ? "환영" : safeLabel || section.elementLabel || "제목 / 내용",
      elementTitle: displayTitle,
      elementType: PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
      layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: "title-content",
      label: mainPraiseIntro ? "환영" : safeLabel,
      title: displayTitle,
      bodyText,
      marker: "",
      text: [displayTitle, bodyText].filter(Boolean).join("\n"),
      sort: index,
      ...(mainPraiseIntro ? { skipTrailingBlank: true, _praiseIntroSlide: true } : {}),
    };
  }
  if (presenterMemoElementIsTitleSlide(elementType)) {
    const titleText = presenterTitleAssigneeTitle(item, safeLabel, displayText, elementType);
    const assigneeText = presenterTitleAssigneePerson(item, safeLabel, displayText, titleText, service);
    const compactLabel = compactSearchValue(safeLabel);
    const orderTitle = String(section.sectionHeading || section.sectionTitle || section.sectionLabel || "").trim();
    const sermonTitle = section.sectionKey === "sermon" || ["설교", "설교제목"].includes(compactLabel);
    const contentTitle = sermonTitle
      ? presenterSermonContentTitle(displayText)
      : compactLabel === "특송"
        ? String(displayText || "").trim()
      : "";
    const slideTitle = sermonTitle ? contentTitle : titleText;
    const threePartAssignee = sermonTitle || compactLabel === "특송"
      ? cleanPresenterAssignee(item.assignee)
      : assigneeText;
    const hasThreeParts = Boolean(orderTitle && contentTitle && threePartAssignee);
    const scriptureReading = isPresenterScriptureReadingSource({ elementType, label: safeLabel, sectionKey: section.sectionKey });
    if (!titleText && !assigneeText) return null;
    return {
      id: `${item.id || index}:title-assignee`,
      ...section,
      sectionAssignee: scriptureReading ? "" : section.sectionAssignee,
      elementLabel: safeLabel || section.elementLabel || serviceElementTypeLabel(elementType),
      elementTitle: slideTitle,
      elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
      layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
      type: "title-assignee",
      label: safeLabel,
      title: slideTitle,
      assignee: hasThreeParts ? threePartAssignee : assigneeText,
      orderTitle: hasThreeParts ? orderTitle : "",
      contentTitle: hasThreeParts ? contentTitle : "",
      // Keep the presentation role on the slide. Re-inferring this from a
      // section label later can route a sermon title through a split layout.
      titlePresentation: sermonTitle ? "sermon" : "",
      marker: "",
      text: hasThreeParts
        ? cleanList([orderTitle, contentTitle, threePartAssignee]).join("\n")
        : cleanList([slideTitle, assigneeText]).join("\n"),
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
      asset,
      presenterRole: memo.presenterRole || "",
      playback: presenterPlaybackConfig(memo.playback, "video"),
      sourceType: "video",
      componentType: "video",
      sort: index,
    };
  }
  if (elementType === "audio") {
    const source = normalizePresenterMediaSource(asset.url || displayText);
    if (!source) return null;
    const audioAsset = { ...asset, kind: asset.kind || "audio", url: source };
    const audioTitle = presenterFileDisplayTitle({ title, asset: audioAsset }, "오디오");
    return {
      id: `${item.id || index}:audio`,
      ...section,
      sectionLabel: label || "Audio",
      sectionTitle: audioTitle,
      sectionName: audioTitle,
      elementType: PRESENTER_ELEMENT_TYPES.AUDIO,
      layout: PRESENTER_SLIDE_LAYOUTS.FILE,
      type: "audio",
      label,
      title: audioTitle,
      marker: label || "Audio",
      text: [audioTitle, source].filter(Boolean).join("\n"),
      audioSrc: source,
      asset: audioAsset,
      playback: presenterPlaybackConfig(memo.playback, "audio"),
      sourceType: audioAsset.kind || "audio",
      componentType: "audio",
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
    const cleanTitle = title || "실시간 성구";
    return {
      id: `${item.id || index}:activity`,
      ...section,
      sectionLabel: label || cleanTitle,
      sectionTitle: cleanTitle,
      sectionName: cleanTitle,
      elementLabel: label || cleanTitle,
      elementTitle: cleanTitle,
      elementType: PRESENTER_ELEMENT_TYPES.TITLE_CONTENT,
      layout: PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: "title-content",
      label,
      title: cleanTitle,
      bodyText: String(memo.note || "").trim(),
      marker: "",
      text: [cleanTitle, memo.note].filter(Boolean).join("\n"),
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

function isMainPraiseTitleContentItem(item = {}, section = {}, titleText = "") {
  const titleKey = compactSearchValue(titleText);
  const labelKey = compactSearchValue(item?.label || section.elementLabel || "");
  if (titleKey !== "찬양" && titleKey !== "환영" && labelKey !== "환영") return false;
  return String(section.sectionKey || item?._worshipSectionKey || "").trim() === "praise"
    || isMainPraiseServiceItem(item, { allowUnlabeled: true });
}

function resolveMainPraiseIntroBodyText(service = null, bodyText = "") {
  const explicitTeam = servicePraiseTeamName(service);
  if (explicitTeam) return explicitTeam;
  const defaultTeam = serviceDefaultMainPraiseTeamName(service);
  if (!defaultTeam) return String(bodyText || "").trim();
  const bodyKey = compactSearchValue(bodyText);
  const defaultTeamKeys = new Set([
    "",
    "찬양팀",
    "담당자",
    "헤세드찬양단",
    "테힐라찬양단",
    "썸프레이즈",
  ]);
  return defaultTeamKeys.has(bodyKey) ? defaultTeam : String(bodyText || "").trim();
}

function presenterMemoElementIsTitleSlide(elementType) {
  return ["title_person", "scripture_reading"].includes(elementType);
}

function presenterTitleAssigneeTitle(item = {}, label = "", displayText = "", elementType = "") {
  const compact = compactSearchValue(label);
  const text = String(displayText || "").trim();
  if (isCreedPresenterItem(item, label, displayText)) return "신앙고백";
  if (compact === "대표기도" || compact === "기도") return "대표기도";
  if (compact === "성경봉독") return "성경봉독";
  if (compact === "특송") return "특송";
  if (compact === "봉헌기도") return "봉헌기도";
  if (compact === "축도") return "축도";
  if (compact === "교회소식" || compact === "광고") return "교회소식";
  if (compact === "월삭기도") return text || "월삭기도";
  if (compact === "설교") return text || "설교";
  if (compact === "설교제목") return "설교";
  return text || label || serviceElementTypeLabel(elementType);
}

function presenterTitleAssigneePerson(item = {}, label = "", displayText = "", titleText = "", service = null) {
  if (isCreedPresenterItem(item, label, displayText)) return "사도신경";
  const compact = compactSearchValue(label);
  const text = cleanPresenterAssignee(displayText);
  if (compact === "성경봉독") {
    const referenceText = presenterFullKoreanBibleReference(text);
    return referenceText && compactSearchValue(referenceText) !== compactSearchValue(titleText) ? referenceText : "";
  }
  const assignee = cleanPresenterAssignee(item.assignee)
    || (typeof serviceItemDefaultAssignee === "function" ? serviceItemDefaultAssignee(item, service) : "");
  if (compact === "설교제목") return cleanList([presenterSermonContentTitle(text), assignee]).join("\n");
  if (assignee) return assignee;
  const fallback = presenterTitleAssigneeUsesWorshipLeader(compact)
    ? serviceWorshipLeaderLabel(service)
    : "";
  if (!text || compactSearchValue(text) === compactSearchValue(titleText)) return fallback;
  if (["대표기도", "기도", "성경봉독", "특송", "봉헌기도", "축도"].includes(compact)) return text;
  if (fallback) return fallback;
  return "";
}

function presenterFullKoreanBibleReference(value = "") {
  const text = String(value || "").trim();
  if (!text || typeof parseBibleReference !== "function") return text;
  const reference = parseBibleReference(text);
  if (!reference?.book || !reference?.chapter) return text;
  const bookName = String(reference.book.koreanName || reference.book.shortName || reference.book.code || "").trim();
  if (!bookName) return text;
  const range = reference.verse
    ? `${reference.chapter}:${reference.verse}${reference.verseEnd ? `–${reference.verseEnd}` : ""}`
    : `${reference.chapter}`;
  return [bookName, range].filter(Boolean).join(" ").trim() || text;
}

function presenterTitleAssigneeUsesWorshipLeader(compactLabel = "") {
  return [
    "봉헌기도",
    "교회소식",
    "광고",
    "축도",
    "예배의부름",
    "사죄의선언",
    "묵도",
  ].includes(compactLabel);
}

function presenterSlideUsesWorshipLeaderAssignee(slide = {}) {
  if (isPresenterScriptureReadingSource(slide)) return false;
  const key = compactSearchValue([
    slide.elementLabel,
    slide.sectionLabel,
    slide.label,
    slide.title,
  ].filter(Boolean).join(" "));
  return [
    "봉헌기도",
    "교회소식",
    "광고",
    "축도",
    "예배의부름",
    "사죄의선언",
    "묵도",
  ].some((label) => key.includes(label));
}

function isPresenterScriptureReadingSource(source = {}) {
  const key = compactSearchValue([
    source.elementType,
    source.componentType,
    source.sectionKey,
    source.elementLabel,
    source.sectionLabel,
    source.label,
    source.title,
  ].filter(Boolean).join(" "));
  return key.includes("scripturereading")
    || key.includes("성경봉독")
    || normalizeServiceElementType(source.elementType) === "scripture_reading"
    || normalizeWorshipElementType(source.elementType) === "scripture_reading";
}

function serviceElementTypeLabel(type) {
  return SERVICE_ELEMENT_LABELS[normalizeServiceElementType(type)] || "항목";
}

function buildPresenterCustomSlides(item, section, index) {
  if (isScriptureBodyServiceItem(item)) return [];
  const slides = parseServiceItemMemo(item?.memo).slides;
  if (!slides.length) return [];
  const label = item.label || "";
  const songLikeItem = isSongServiceLabel(label) || isPresenterSpecialSongItem(item, section);
  const lyricSlides = slides.map((block, blockIndex) => {
    const parsed = parsePresenterCustomSlideBlock(block);
    return {
      id: `${item.id || index}:custom:${blockIndex}`,
      ...section,
      elementType: songLikeItem ? PRESENTER_ELEMENT_TYPES.PRAISE : PRESENTER_ELEMENT_TYPES.FREEFORM,
      layout: songLikeItem ? PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT : PRESENTER_SLIDE_LAYOUTS.CENTER_TEXT,
      type: songLikeItem ? "lyrics" : "component",
      label,
      title: section.sectionTitle || item.raw_title || label || "Slide",
      marker: parsed.marker,
      formKey: `custom:${blockIndex}`,
      text: parsed.text,
      sort: index + blockIndex / 100,
    };
  }).filter((slide) => String(slide.text || "").trim());
  if (!songLikeItem || !shouldIncludeSongTitleSlide(item, label)) return lyricSlides;
  return [
    presenterSongTitleSlide(item, section, null, null, serviceItemDisplayText(item), index),
    ...lyricSlides,
  ];
}

function parsePresenterCustomSlideBlock(block) {
  const lines = String(block || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { marker: "", text: "" };
  const first = lines[0];
  const bracketed = first.match(/^\[([^\]]+)\]$/)?.[1]?.trim();
  const markerCandidate = bracketed || first;
  if (/^(Verse|Chorus|Pre-Chorus|Bridge|Coda|Lyrics)(?:\s+\d+)?$/i.test(markerCandidate)) {
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
    .replace(/^lyrics/i, "Lyrics");
}

function buildPresenterScriptureTextSlides(item, section, index, service = null) {
  if (!isScriptureBodyServiceItem(item)) return [];
  const payload = serviceScriptureTextPayload(item);
  if (!payload.verses.length) return [];
  const context = presenterScriptureBodyContext(item, section, service);
  const readingForm = presenterScriptureContextUsesReadingForm(context);
  const reference = payload.reference || section.sectionTitle || "본문";
  const lastVerseIndex = payload.verses.length - 1;
  const citation = isPresenterCitationScriptureItem(item);
  return payload.verses.map((verse, verseIndex) => {
    const verseNumber = presenterScriptureVerseNumber(verse);
    const readingFinal = context === "reading" && verseIndex === lastVerseIndex;
    const referenceBook = readingForm
      ? (verse.referenceBookFull || payload.referenceBookFull || verse.referenceBook || payload.referenceBook || "")
      : (verse.referenceBook || payload.referenceBook || "");
    const verseReference = readingForm
      ? [referenceBook, verse.referenceRange || payload.referenceRange || ""].filter(Boolean).join(" ")
      : (verse.reference || reference);
    const verseText = verseNumber ? [verseNumber, verse.text].filter(Boolean).join("   ") : verse.text;
    return {
      id: `${item.id || index}:scripture:${verseReference}:${verseNumber || verseIndex + 1}`,
      ...section,
      elementTitle: verseReference,
      sectionName: presenterNameParts(section.sectionLabel, verseReference).join(" / ") || verseReference,
      elementType: PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT,
      layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
      type: "scripture",
      scriptureContext: context,
      label: item.label || "본문",
      title: verseReference,
      marker: verseReference,
      referenceBook,
      referenceRange: verse.referenceRange || payload.referenceRange || "",
      translationLabel: verse.translationLabel || payload.translationLabel || "",
      text: citation ? presenterCitationScriptureText(verse, payload, context) : verseText,
      citationQuickInsert: citation,
      scriptureReadingFinal: readingFinal,
      ...(readingForm ? { outputContext: "clean" } : {}),
      sort: index + verseIndex / 100,
    };
  });
}

function presenterScriptureVerseNumber(verse = {}) {
  const start = Number(verse.number || verse.verse) || 0;
  const end = Number(verse.verseEnd || verse.verse_end) || 0;
  if (!start) return String(verse.number || verse.verse || "").trim();
  return end > start ? `${start}–${end}` : String(start);
}

function isPresenterCitationScriptureItem(item = {}) {
  return compactSearchValue(item?.label || "") === "인용구절";
}

function presenterCitationScriptureText(verse = {}, payload = {}, context = "") {
  const number = presenterScriptureVerseNumber(verse);
  if (context === "citation-chromakey") {
    const reference = presenterCitationVerseReference(verse, payload, number);
    return reference ? [reference, verse.text].filter(Boolean).join("   ") : verse.text;
  }
  return number ? [number, verse.text].filter(Boolean).join("   ") : verse.text;
}

function presenterCitationVerseReference(verse = {}, payload = {}, verseNumber = "") {
  const book = String(verse.referenceBook || payload.referenceBook || "").trim();
  const range = String(verse.referenceRange || payload.referenceRange || "").trim();
  const chapter = range.match(/^(\d+)/)?.[1] || "";
  const number = String(verseNumber || "").trim();
  if (book && chapter && number) return `${book} ${chapter}:${number}`;
  return String(verse.reference || payload.reference || "").trim();
}

function presenterScriptureBodyContext(item = {}, section = {}, service = null) {
  const sectionKey = String(section.sectionKey || item?._worshipSectionKey || "").trim();
  if (sectionKey === "scripture_reading") return "reading";
  const chromakey = Boolean(service && presenterServiceUsesChromakey(service));
  if (isPresenterCitationScriptureItem(item)) return chromakey ? "citation-chromakey" : "citation";
  if (sectionKey === "sermon") return chromakey ? "sermon-chromakey" : "sermon";
  return "";
}

function presenterScriptureContextUsesReadingForm(context = "") {
  return context === "reading" || context === "sermon" || context === "citation";
}

function serviceScriptureTextPayload(item, memo = parseServiceItemMemo(item?.memo)) {
  if (typeof serviceScriptureTextPayloadFromBible === "function") {
    const resolved = serviceScriptureTextPayloadFromBible(item, memo);
    if (resolved?.reference || resolved?.verses?.length) return resolved;
  }
  const reference = String(memo.scriptureReference || item?.raw_title || "").trim();
  return { reference, verses: [] };
}

function isScriptureBodyServiceItem(item) {
  const label = String(item?.label || "").replace(/\s+/g, "");
  const sectionKey = String(item?._worshipSectionKey || item?.sectionKey || item?.section_key || "").trim();
  const memo = typeof parseServiceItemMemo === "function" ? parseServiceItemMemo(item?.memo) : {};
  const elementType = typeof normalizeWorshipElementType === "function"
    ? normalizeWorshipElementType(memo.elementType || item?.elementType || item?.element_type || "")
    : String(memo.elementType || item?.elementType || item?.element_type || "").trim().toLowerCase();
  return elementType === "scripture_body"
    || label === "본문"
    || label === "성경본문"
    || label === "설교본문"
    || (sectionKey === "scripture_reading" && (label === "성경봉독" || elementType === "scripture_body"));
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
      continue;
    }
    const inline = parsePresenterInlineScriptureText(line);
    if (inline.verses.length) {
      if (!reference && inline.reference) reference = inline.reference;
      verses.push(...inline.verses);
    } else if (!reference) {
      reference = line;
    }
  }
  return { reference, verses };
}

function parsePresenterInlineScriptureText(line) {
  const text = String(line || "").trim();
  const markerMatches = [...text.matchAll(/(?:^|\s)(\d{1,3})\s+(?=\S)/g)];
  if (!markerMatches.length) return { reference: "", verses: [] };
  const reference = text.slice(0, markerMatches[0].index).trim();
  const verses = markerMatches
    .map((match, index) => {
      const start = match.index + match[0].length;
      const end = markerMatches[index + 1]?.index ?? text.length;
      return {
        number: match[1],
        text: text.slice(start, end).trim(),
      };
    })
    .filter((verse) => verse.text);
  return { reference, verses };
}

function shouldIncludeSongTitleSlide(item, label) {
  const displayText = serviceItemDisplayText(item);
  if (!displayText) return false;
  return Boolean(
    item?.song_id
    || isSongServiceLabel(label)
    || isPresenterSpecialSongItem(item)
    || isMainPraiseServiceItem(item, { allowUnlabeled: true }),
  );
}

function presenterSongTitleSlide(item, section, song, version, displayText, index) {
  const marker = presenterPraiseMarker(song, displayText);
  const sectionHeading = presenterSongTitleSectionHeading(item, section);
  const displayTitle = presenterSongTitleDisplayTitle(song, version, displayText, sectionHeading);
  const titleText = presenterSongTitleContentText(displayTitle, sectionHeading);
  if (sectionHeading) {
    return presenterOrderContentTitleSlide(item, section, index, sectionHeading, titleText);
  }
  return {
    id: `${item.id || index}:song-title`,
    ...section,
    elementType: PRESENTER_ELEMENT_TYPES.PRAISE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "song-title",
    label: item.label || "",
    title: displayTitle,
    subtitle: versionDisplayName(song, version),
    marker,
    sectionHeading,
    bodyText: "",
    text: titleText,
    sort: index - 0.001,
  };
}

function presenterSongTitleContentText(displayTitle = "", sectionHeading = "") {
  const titleKey = compactSearchValue(String(displayTitle || "").replace(/^♪\s*/, ""));
  const headingKey = compactSearchValue(sectionHeading);
  if (!titleKey || (headingKey && titleKey === headingKey)) return "입력 필요";
  return formatPresenterSongTitleText(displayTitle);
}

function presenterOrderContentTitleSlide(item, section, index, orderTitle = "", contentTitle = "") {
  const safeOrderTitle = String(orderTitle || "").trim();
  const safeContentTitle = String(contentTitle || "").trim();
  return {
    id: `${item.id || index}:title-assignee`,
    ...section,
    elementType: PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE,
    layout: PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT,
    type: "title-assignee",
    label: item.label || "",
    title: safeOrderTitle,
    assignee: "",
    orderTitle: safeOrderTitle,
    contentTitle: safeContentTitle,
    marker: "",
    text: cleanList([safeOrderTitle, safeContentTitle]).join("\n"),
    sort: index - 0.001,
  };
}

function presenterSongTitleDisplayTitle(song = null, version = null, fallbackText = "", sectionHeading = "") {
  void sectionHeading;
  const title = presenterPraiseTitle(song, fallbackText);
  const hymnNo = presenterSongTitleHymnNo(song, version, fallbackText);
  if (!hymnNo) return title;
  const titleParts = splitHymnNo(title);
  if (titleParts.no) return [titleParts.no, titleParts.title].filter(Boolean).join(" ");
  return [hymnNo, title].filter(Boolean).join(" ");
}

function presenterSongTitleHymnNo(song = null, version = null, fallbackText = "") {
  const rawNo = String(presenterUnifiedHymnVersionNo(version) || song?.hymn_no || version?.hymn_no || splitHymnNo(fallbackText).no || "").trim();
  if (!rawNo) return "";
  const match = rawNo.match(/^(통\s*)?(\d{1,4})/);
  if (!match) return rawNo;
  return `${match[1] ? "통 " : ""}${Number(match[2])}`;
}

function presenterUnifiedHymnVersionNo(version = null) {
  if (!version) return "";
  const values = [version.hymn_no, version.name, version.curated_version_name, version.raw_section_name, version.version_label];
  for (const value of values) {
    const text = String(value || "").trim();
    const match = text.match(/(?:^|\(|\s)통(?:일)?\s*(\d{1,4})(?:\s|[.)]|$)/);
    if (match) return `통 ${Number(match[1])}`;
  }
  return "";
}

function presenterSongTitleSectionHeading(item = {}, section = {}) {
  if (!presenterSongTitleUsesSectionHeading(item, section)) return "";
  const heading = String(
    item?.label
    || section.elementLabel
    || section.sectionLabel
    || item?._worshipSectionTitle
    || section.sectionTitle
    || "",
  ).trim();
  return presenterSongTitleNormalizedHeading(heading, String(section.sectionKey || item?._worshipSectionKey || "").trim());
}

function presenterSongTitleNormalizedHeading(heading = "", sectionKey = "") {
  const raw = String(heading || "").trim();
  if (!raw) return "";
  const compact = compactSearchValue(raw);
  const compactSectionKey = String(sectionKey || "").trim();
  const genericBySection = {
    offering: "봉헌",
    doxology: "송영",
    sending: "파송",
    response_song: "결단",
    prayer_meeting_praise: "기도회",
    closing_hymn: "폐회",
    closing_visual: "폐회",
    closing_song: "폐회",
    hymn_praise: "찬송",
  };
  const canonicalBySection = {
    offering: "봉헌찬송",
    doxology: "송영",
    sending: "송영",
    response_song: "결단찬양",
    prayer_meeting_praise: "기도 찬양",
    closing_hymn: "폐회찬송",
    closing_visual: "폐회찬송",
    closing_song: "폐회찬송",
    hymn_praise: "찬송",
  };
  if (compact === genericBySection[compactSectionKey]) return canonicalBySection[compactSectionKey] || raw;
  return raw;
}

function presenterSongTitleUsesSectionHeading(item = {}, section = {}) {
  if (section.sectionRole === "main-praise") return false;
  const sectionKey = String(section.sectionKey || item?._worshipSectionKey || "").trim();
  if ([
    "hymn_praise",
    "offering",
    "doxology",
    "sending",
    "response_song",
    "prayer_meeting_praise",
    "closing_song",
    "closing_hymn",
    "closing_visual",
  ].includes(sectionKey)) return true;
  const compact = compactSearchValue(item?.label || section.elementLabel || section.sectionLabel || "");
  if (!compact) return false;
  return /^(송영|파송|봉헌|봉헌찬송|봉헌찬양|파송찬송|결단|결단찬송|결단찬양|기도찬양|기도회찬양|폐회|폐회찬송)$/.test(compact);
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
  const fallbackTitle = presenterPraiseFallbackTitle(fallbackText);
  const { title } = splitHymnNo(fallbackTitle);
  return title || fallbackTitle || "";
}

function presenterPraiseFallbackTitle(fallbackText = "") {
  const firstLine = String(fallbackText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean) || "";
  return firstLine.split(/\s+\/\s+/)[0]?.trim() || firstLine;
}

function presenterPraiseElementTitle(song, version = null, fallbackText = "") {
  const title = presenterPraiseTitle(song, fallbackText);
  if (!song) return title;
  const meta = new Set();
  [song.subtitle, song.original_title, version?.subtitle, version?.original_title]
    .forEach((value) => addTitleMeta(meta, value));
  const visibleMeta = [...meta].filter((value) => normalizeTitle(value) !== normalizeTitle(title));
  return visibleMeta.length ? `${title} (${joinMetaItems(visibleMeta)})` : title;
}

function presenterPraiseMarker(song, fallbackText = "") {
  void song;
  void fallbackText;
  return "";
}

function presenterFormMarker(form) {
  const label = presenterFormDisplayLabel(form);
  return isGenericPresenterFormLabel(label) ? "" : label;
}

function isGenericPresenterFormLabel(value) {
  return /^(lyrics|가사)$/i.test(String(value || "").trim());
}

function presenterSectionForServiceItem(item, index, displayText, song = null, version = null) {
  const label = String(item?.label || "").trim();
  const sectionLabel = presenterSectionLabelForServiceItem(item, label);
  const formHint = serviceItemFormHint(item);
  const { no, title } = splitHymnNo(displayText);
  const linkedSongTitle = song ? presenterSongTitleDisplayTitle(song, version, displayText) : "";
  const linkedElementTitle = linkedSongTitle || (song ? presenterPraiseElementTitle(song, version, displayText) : "");
  const elementTitle = linkedElementTitle || [no, title].filter(Boolean).join(" ") || displayText || label || `항목 ${index + 1}`;
  const sectionLabelText = cleanList([label, formHint]).join(" · ");
  return {
    sectionId: item?._worshipSectionId || item?.id || `section:${index}:${normalizeTitle([label, displayText].filter(Boolean).join(" "))}`,
    elementId: item?.id || `element:${index}:${normalizeTitle([label, displayText].filter(Boolean).join(" "))}`,
    sectionIndex: Number(item?._worshipSectionOrder) || index + 1,
    sectionKey: item?._worshipSectionKey || "",
    sectionLabel,
    sectionHeading: sectionLabel,
    sectionFormHint: formHint,
    sectionRole: isMainPraiseServiceItem(item, { allowUnlabeled: true }) ? "main-praise" : "",
    sectionTitle: sectionLabel,
    elementLabel: label,
    elementTitle,
    sectionAssignee: item?.assignee || "",
    sectionName: [sectionLabel || sectionLabelText, elementTitle].filter(Boolean).join(" / "),
  };
}

function presenterSectionLabelForServiceItem(item = {}, fallbackLabel = "") {
  const explicit = String(item?._worshipSectionTitle || "").trim();
  if (explicit) return explicit;
  const key = String(item?._worshipSectionKey || "").trim();
  const canonicalByKey = {
    creed: "신앙고백",
    praise: "찬양",
    confession: "참회기도",
    hymn_praise: "찬송",
    prayer: "대표기도",
    scripture_reading: "성경봉독",
    special_song: "특송",
    sermon: "설교",
    response_song: "결단",
    offering: "봉헌",
    offering_prayer: "봉헌기도",
    announcements: "교회소식",
    community_confession: "공동체고백",
    doxology: "송영",
    closing_hymn: "폐회",
    benediction: "축도",
    closing: "마무리",
  };
  return canonicalByKey[key] || String(fallbackLabel || "").trim();
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
  const worshipBackgroundSource = normalizePresenterWorshipBackgroundSource(source);
  if (worshipBackgroundSource) return worshipBackgroundSource;
  if (/\.(mp4|webm|mov|m4v|png|jpe?g|gif|webp|svg|pdf|mp3|m4a|wav|aac|ogg|flac)(?:[?#].*)?$/i.test(source)) return source;
  return "";
}

function normalizePresenterWorshipBackgroundSource(source) {
  const text = String(source || "").trim();
  if (!text || !text.includes(`${WORSHIP_BACKGROUND_BASE}/`)) return "";
  const suffixMatch = text.match(/([?#].*)$/);
  const suffix = suffixMatch ? suffixMatch[1] : "";
  const clean = suffix ? text.slice(0, -suffix.length) : text;
  const fileName = worshipBackgroundFileNameFromPath(clean);
  if (!fileName) return "";
  const candidate = worshipBackgroundCandidateFileNames(fileName)
    .find((name) => WORSHIP_BACKGROUND_STATIC_FILES.has(name));
  if (!candidate) return "";
  const prefix = clean.slice(0, clean.length - fileName.length);
  return `${prefix}${candidate}${suffix}`;
}

function presenterMediaSourceIsImage(value) {
  return /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(String(value || "").trim());
}

function presenterMediaSourceIsYoutube(value) {
  return /(?:youtube\.com|youtu\.be)\//i.test(String(value || "").trim());
}

function presenterSlideAudioSource(slide) {
  if (presenterSlideElementType(slide) !== PRESENTER_ELEMENT_TYPES.AUDIO) return "";
  return normalizePresenterMediaSource(slide.audioSrc || slide.asset?.url || slide.text);
}

function presenterPlaybackConfig(value, elementType = "") {
  const parsed = normalizeServicePlaybackConfig(value, elementType);
  const type = String(elementType || "").trim().toLowerCase();
  const defaults = type === "ready-video"
    ? { autoplay: true, muted: true, loop: true, controls: false }
    : type === "intro-video"
      ? { autoplay: true, muted: false, loop: false, controls: false, autoAdvanceOnEnd: true }
    : type === "audio"
      ? { output: "controller-audio", autoplay: false, muted: false, loop: false, controls: false }
      : { autoplay: true, muted: false, loop: false, controls: false };
  return { ...defaults, ...(parsed || {}) };
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

function presenterSongForServiceItem(item = {}, displayText = serviceItemDisplayText(item), label = item?.label || "", service = null) {
  const linkedSong = item.song_id
    ? (typeof songById === "function" ? songById(item.song_id) : state.songs.find((candidate) => candidate.id === item.song_id) || null)
    : null;
  if (linkedSong) return linkedSong;
  if (!isSongServiceLabel(label) && !isPresenterSpecialSongItem(item)) return null;
  return findServicePraiseSong(displayText) || presenterSyntheticHymnSongFromDisplayText(displayText);
}

function presenterSyntheticHymnSongFromDisplayText(displayText = "") {
  const { no, title } = splitHymnNo(displayText);
  const hymnNo = normalizedHymnScoreNumber(no);
  if (!hymnNo) return null;
  const cleanTitle = stripHymnNumber(title || displayText).trim() || `찬송가 ${hymnNo}`;
  return {
    id: `__synthetic_hymn_${hymnNo}__`,
    title: cleanTitle,
    hymn_no: hymnNo,
    versions: [],
    _syntheticHymn: true,
  };
}

function getPresenterServiceItemVersion(song, item, service) {
  const preferred = getServiceItemVersion(song, item, service);
  if (presenterVersionHasUsableLyrics(preferred)) return preferred;
  return presenterFallbackLyricVersion(song, preferred) || preferred;
}

function presenterFallbackLyricVersion(song, preferred = null) {
  const versions = song?.versions || [];
  if (!versions.length) return null;
  const defaultVersionId = getDefaultVersionId(song);
  const candidates = [
    versions.find((version) => version.id === defaultVersionId),
    ...versions,
  ].filter(Boolean);
  return candidates.find((version) => version !== preferred && presenterVersionHasUsableLyrics(version)) || null;
}

function presenterVersionHasUsableLyrics(version = null) {
  return normalizeForms(version?.forms || []).some((form) => normalizeLyricsForCopy(form.lyrics));
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
  if (compact === "봉헌") return true;
  if (compact === "결단" || compact === "파송") return true;
  if (/찬양|찬송|특송|송영/.test(compact)) return true;
  return /^(결단|봉헌|파송)(찬양|찬송)$/.test(compact);
}

function presenterStatePayload(serviceId = state.presenter.serviceId) {
  const service = state.services.find((svc) => svc.id === serviceId);
  const slides = presenterSlidesForService(serviceId);
  const serviceChromakey = presenterServiceUsesChromakey(service);
  const hasCleanSlides = slides.some((slide) =>
    presenterSlideOutputContext(slide, serviceChromakey) === "clean");
  const backgroundImages = presenterBackgroundSourcesForService(service, {
    includeChromakeyCleanSlides: hasCleanSlides,
  });
  return {
    serviceId,
    serviceType: service?.type_id || "",
    serviceTitle: [serviceDisplayTypeName(service), service ? formatServiceDate(service) : ""].filter(Boolean).join(" · "),
    serviceDate: service?.date || "",
    chromakey: serviceChromakey,
    outputTheme: presenterOutputTheme(service?.type_id),
    backgroundImage: backgroundImages[0] || "",
    backgroundImages,
    slides,
    index: clampPresenterIndex(state.presenter.index, slides.length),
    safetyBlank: Boolean(state.presenter.safetyBlank),
    liveScripture: state.presenter.liveScripture?.active ? state.presenter.liveScripture : null,
    livePraise: null,
    updatedAt: Date.now(),
  };
}

function readPresenterControllerRestorePayload() {
  try {
    const raw = safeStorageGet("local", PRESENTER_STORAGE_KEY, "");
    const payload = raw ? normalizePresenterPayload(JSON.parse(raw)) : null;
    if (!payload?.serviceId || !payload.slides.length) return null;
    if (Date.now() - payload.updatedAt > PRESENTER_CONTROLLER_RESTORE_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

function primePresenterControllerRestore() {
  state.presenter.restorePayload = readPresenterControllerRestorePayload();
}

function restorePresenterControllerSession() {
  // Only reattach when an output has actually answered the controller. This
  // prevents an old local payload from reviving a presentation on app launch.
  if (state.presenter.serviceId || !isPresenterOutputHeartbeatOpen()) return "none";

  const payload = state.presenter.restorePayload || readPresenterControllerRestorePayload();
  if (!payload) return "none";

  const service = state.services.find((candidate) => candidate.id === payload.serviceId);
  if (!service || !state.serviceItems[service.id]) return "pending";

  const slides = buildServicePresenterSlides(service.id);
  if (!slides.length) return "pending";

  state.presenter.serviceId = service.id;
  state.presenter.slides = slides;
  state.presenter.index = clampPresenterIndex(payload.index, slides.length);
  state.presenter.safetyBlank = Boolean(payload.safetyBlank);
  state.presenter.jumpDraft = "";
  state.presenter.liveScripture = payload.liveScripture?.active
    ? {
      reference: payload.liveScripture.reference || "",
      draft: "",
      active: true,
      slide: payload.liveScripture.slide || null,
    }
    : { reference: "", draft: "", active: false, slide: null };
  state.presenter.livePraise = emptyLivePraiseState();
  state.presenter.restorePayload = null;

  if (state.module === "presenter") {
    state.selectedServiceId = service.id;
    state.selectedServiceTypeId = service.type_id;
  }

  publishPresenterState({ force: true });
  refreshPresenterOutputConnectionState();
  return "restored";
}

function bindPresenterChannel() {
  window.addEventListener("storage", handlePresenterStorageSignal);
  if (!("BroadcastChannel" in window)) return;
  state.presenter.channel = new BroadcastChannel(PRESENTER_CHANNEL);
  state.presenter.channel.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === "presenter-ready") {
      markPresenterOutputConnected(message.clientId);
      const restoreState = restorePresenterControllerSession();
      if (restoreState === "none") publishPresenterState();
      return;
    }
    if (message.type === "presenter-heartbeat") {
      markPresenterOutputConnected(message.clientId, message.warmup);
      restorePresenterControllerSession();
      return;
    }
    if (message.type === "presenter-output-disconnect") {
      markPresenterOutputDisconnected(message.clientId);
      return;
    }
    if (message.type === "presenter-control") {
      if (message.action === "stop") {
        stopPresenterOutput(state.presenter.serviceId);
        return;
      }
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
  // The output can stay open while the controller reloads. Ask it to announce
  // itself again so sidebar clicks immediately return to live-output behavior.
  state.presenter.channel.postMessage({ type: "presenter-controller-ready" });
}

function handlePresenterStorageSignal(event) {
  if (event.key !== PRESENTER_SIGNAL_KEY || !event.newValue) return;
  try {
    const message = JSON.parse(event.newValue);
    if (message.type === "presenter-output-disconnect") markPresenterOutputDisconnected(message.clientId);
    if (message.type === "presenter-control" && message.action === "stop") stopPresenterOutput(state.presenter.serviceId);
  } catch {
    // Ignore malformed cross-window presenter signals.
  }
}

function markPresenterOutputConnected(clientId = "", warmup = null) {
  if (state.presenter.outputStopAt) {
    if (clientId && clientId === state.presenter.outputStoppingClientId) return;
    state.presenter.outputStopAt = 0;
    state.presenter.outputStoppingClientId = "";
  }
  const wasConnected = state.presenter.outputConnectedAt
    && Date.now() - state.presenter.outputConnectedAt <= PRESENTER_OUTPUT_HEARTBEAT_TTL_MS;
  state.presenter.outputConnectedAt = Date.now();
  if (clientId) state.presenter.outputClientId = clientId;
  updatePresenterOutputWarmupState(warmup);
  if (!state.presenter.outputWindowMonitor) startPresenterOutputWindowMonitor(state.presenter.serviceId);
  if (!wasConnected || warmup) refreshPresenterOutputConnectionState();
}

function markPresenterOutputDisconnected(clientId = "") {
  if (clientId && state.presenter.outputClientId && clientId !== state.presenter.outputClientId) return;
  state.presenter.outputWindow = null;
  state.presenter.outputConnectedAt = 0;
  state.presenter.outputClientId = "";
  state.presenter.outputWarmup = null;
  stopPresenterOutputWindowMonitor();
  refreshPresenterOutputConnectionState();
  if (state.presenter.serviceId) renderPresenterControlState(state.presenter.serviceId);
}

function updatePresenterOutputWarmupState(warmup = null) {
  if (!warmup || typeof warmup !== "object") return;
  const total = Math.max(0, Number(warmup.total) || 0);
  const ready = Math.max(0, Math.min(total, Number(warmup.ready) || 0));
  const queued = Math.max(0, Math.min(total, Number(warmup.queued) || 0));
  state.presenter.outputWarmup = {
    serviceId: warmup.serviceId || state.presenter.serviceId || "",
    total,
    ready,
    queued,
    complete: Boolean(warmup.complete) || (total > 0 && ready >= total),
    updatedAt: Date.now(),
  };
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

function handlePresenterShortcut(event) {
  const presenterServiceId = state.presenter.serviceId;
  if (state.module !== "presenter" || !presenterServiceId) return false;
  if (event.key === "F11" && isPresenterOutputWindowOpen()) {
    event.preventDefault();
    event.stopPropagation?.();
    state.presenter.exitArmedAt = 0;
    requestPresenterOutputFullscreenFromController();
    return true;
  }
  if (shouldKeepPresenterShortcutInFocusedControl(event)) return false;
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

  if (event.key === "Enter" || event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
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

function requestPresenterOutputFullscreenFromController() {
  window.mindexElectron?.fullscreenPresenterOutput?.().catch?.(() => {});
  try {
    const outputWindow = presenterOutputWindowRef();
    outputWindow?.document?.documentElement?.requestFullscreen?.().catch?.(() => {});
  } catch {
    // Cross-window fullscreen can be rejected outside the current browser activation.
  }
  const payload = {
    type: "presenter-output-fullscreen",
    updatedAt: Date.now(),
  };
  state.presenter.channel?.postMessage(payload);
  safeStorageSet("local", PRESENTER_SIGNAL_KEY, JSON.stringify(payload));
}

function shouldKeepPresenterShortcutInFocusedControl(event) {
  const target = event?.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.closest("[data-presenter-jump-input]")) {
    return !["ArrowRight", "ArrowDown", "PageDown", " ", "ArrowLeft", "ArrowUp", "PageUp"].includes(event.key);
  }
  return shouldKeepHorizontalNavigationInFocusedControl(target);
}

function isPresenterOutputRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get("output") === "presenter" || params.get("mindex-output") === "presenter";
}

function presenterOutputDocumentTitle(payload = {}) {
  const title = String(payload?.serviceTitle || "").split("·")[0].trim();
  return title || "MINDEX";
}

function syncPresenterOutputDocumentTitle(payload = {}) {
  document.title = presenterOutputDocumentTitle(payload);
}

function initPresenterOutputCore() {
  document.title = "MINDEX";
  document.documentElement.classList.add("presenter-output-document");
  document.body.className = "presenter-output-body";
  document.body.innerHTML = `
    <main id="presenterOutputRoot" class="presenter-output-root no-chromakey" aria-live="polite"></main>
  `;

  let currentPayload = null;
  let channel = null;
  let jumpDraft = "";
  let exitArmedAt = 0;
  let outputStopping = false;
  const outputClientId = `presenter-output:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let heartbeatTimer = null;
  const applyPayload = (payload) => {
    currentPayload = normalizePresenterPayload(payload);
    syncPresenterOutputDocumentTitle(currentPayload);
    renderPresenterOutput(currentPayload, { onAutoAdvance: requestPresenterOutputNext });
  };
  const applyInitialPresenterState = (payload) => {
    applyPayload(payload);
  };
  const postHeartbeat = () => {
    if (outputStopping) return;
    channel?.postMessage({
      type: "presenter-heartbeat",
      clientId: outputClientId,
      warmup: presenterOutputWarmupSummary(),
    });
  };
  presenterOutputImageWarmupState.onProgress = postHeartbeat;
  const closeOutputChannel = () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    channel?.close?.();
    channel = null;
    presenterOutputImageWarmupState.onProgress = null;
  };
  const canCloseOutputWindow = () => {
    try {
      return Boolean(window.opener && !window.opener.closed);
    } catch {
      return false;
    }
  };
  const requestPresenterOutputStop = () => {
    if (outputStopping) return;
    outputStopping = true;
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    const payload = {
      type: "presenter-control",
      action: "stop",
      clientId: outputClientId,
      updatedAt: Date.now(),
    };
    channel?.postMessage(payload);
    safeStorageSet("local", PRESENTER_SIGNAL_KEY, JSON.stringify(payload));
    window.setTimeout(() => {
      closeOutputChannel();
      if (canCloseOutputWindow()) window.close();
    }, 120);
  };
  const requestPresenterOutputNext = () => {
    postHeartbeat();
    if (channel) {
      channel.postMessage({ type: "presenter-control", action: "next", clientId: outputClientId });
      return;
    }
    currentPayload = applyPresenterActionToPayload(currentPayload, "next");
    publishPresenterPayload(currentPayload);
    renderPresenterOutput(currentPayload, { onAutoAdvance: requestPresenterOutputNext });
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
      if (event.data?.type === "presenter-state") {
        applyInitialPresenterState(event.data.payload);
        return;
      }
      if (event.data?.type === "presenter-controller-ready") {
        channel.postMessage({ type: "presenter-ready", clientId: outputClientId });
        postHeartbeat();
        return;
      }
      if (event.data?.type === "presenter-output-close") {
        window.setTimeout(() => {
          closeOutputChannel();
          window.close();
        }, 40);
      }
      if (event.data?.type === "presenter-output-fullscreen") {
        requestLocalPresenterFullscreen({ retry: true, requireActivation: true });
        postHeartbeat();
      }
    };
    window.setTimeout(() => {
      channel.postMessage({ type: "presenter-ready", clientId: outputClientId });
      postHeartbeat();
    }, 50);
    heartbeatTimer = window.setInterval(postHeartbeat, PRESENTER_OUTPUT_HEARTBEAT_INTERVAL_MS);
    // Keep the startup canvas black until the controller publishes its current
    // state. Rendering a stale local payload can flash the previous chromakey
    // frame before a fullscreen service appears.
  } else {
    renderStoredState();
  }
  window.addEventListener("pagehide", () => {
    postDisconnect();
    closeOutputChannel();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === PRESENTER_STORAGE_KEY) {
      renderStoredState();
      return;
    }
    if (event.key !== PRESENTER_SIGNAL_KEY || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue);
      if (message.type === "presenter-output-fullscreen") {
        requestLocalPresenterFullscreen({ retry: true, requireActivation: true });
        postHeartbeat();
      }
    } catch {
      // Ignore malformed cross-window presenter signals.
    }
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
        renderPresenterOutput(currentPayload, { onAutoAdvance: requestPresenterOutputNext });
      }
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      requestLocalPresenterFullscreen();
      postHeartbeat();
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
        renderPresenterOutput(currentPayload, { onAutoAdvance: requestPresenterOutputNext });
      }
    }
  });
  window.addEventListener("pointerdown", () => {
    document.documentElement.requestFullscreen?.().catch?.(() => {});
  }, { once: true });
  document.addEventListener("fullscreenchange", () => {
    if (shouldAutoFullscreenPresenterOutput() && !document.fullscreenElement) exitArmedAt = Date.now();
  });

}

function shouldAutoFullscreenPresenterOutput() {
  return new URLSearchParams(window.location.search).get("fullscreen") === "1";
}

function requestLocalPresenterFullscreen(options = {}) {
  const canRequest = () => !options.requireActivation || !navigator.userActivation || navigator.userActivation.isActive;
  const request = () => {
    if (!canRequest()) return;
    document.documentElement.requestFullscreen?.().catch?.(() => {});
  };
  if (!options.retry) {
    request();
    return;
  }
  const delays = options.retry ? PRESENTER_FULLSCREEN_RETRY_DELAYS_MS : [0];
  delays.forEach((delay) => {
    window.setTimeout(() => {
      request();
    }, delay);
  });
}

function presenterOutputKeyAction(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return "";
  if (event.key === "Enter" || event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") return "next";
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
    serviceDate: payload?.serviceDate || payload?.service_date || "",
    chromakey: Boolean(payload?.chromakey),
    outputTheme: payload?.outputTheme || presenterOutputTheme(payload?.serviceType),
    backgroundImage: payload?.backgroundImage || "",
    backgroundImages: Array.isArray(payload?.backgroundImages)
      ? payload.backgroundImages.filter(Boolean)
      : [payload?.backgroundImage].filter(Boolean),
    slides,
    index: clampPresenterIndex(payload?.index, slides.length),
    safetyBlank: Boolean(payload?.safetyBlank),
    liveScripture: normalizeLiveScripturePayload(payload?.liveScripture),
    livePraise: null,
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
  return null;
}

function applyPresenterActionToPayload(payload, action, options = {}) {
  const next = normalizePresenterPayload(payload);
  const requestedIndex = Number(options.index);
  const appliesJump = action !== "jump"
    || requestedIndex === -1
    || isValidPresenterIndex(requestedIndex, next.slides.length);
  if (["next", "prev", "first", "last", "jump"].includes(action) && appliesJump) {
    next.liveScripture = null;
  }
  if (action === "next" && next.slides.length) {
    next.safetyBlank = false;
    next.index = presenterNextNavigableIndex(next.slides, next.index, 1);
  } else if (action === "prev" && next.slides.length) {
    next.safetyBlank = false;
    next.index = presenterNextNavigableIndex(next.slides, next.index, -1);
  } else if (action === "first" && next.slides.length) {
    next.safetyBlank = false;
    next.index = presenterFirstNavigableIndex(next.slides);
  } else if (action === "last" && next.slides.length) {
    next.safetyBlank = false;
    next.index = presenterLastNavigableIndex(next.slides);
  } else if (action === "jump" && next.slides.length) {
    if (requestedIndex === -1) {
      next.safetyBlank = true;
    } else if (isValidPresenterIndex(requestedIndex, next.slides.length)) {
      next.index = requestedIndex;
      next.safetyBlank = false;
    }
  }
  next.updatedAt = Date.now();
  return next;
}

function presenterSlideIsHidden(slide = {}) {
  return Boolean(slide.hiddenInPresentation || slide.hidden_in_presentation || slide.hidden);
}

function presenterNextNavigableIndex(slides = [], currentIndex = 0, direction = 1) {
  const step = direction < 0 ? -1 : 1;
  let index = Number(currentIndex) + step;
  while (index >= 0 && index < slides.length && presenterSlideIsHidden(slides[index])) index += step;
  return index >= 0 && index < slides.length ? index : Number(currentIndex);
}

function presenterFirstNavigableIndex(slides = []) {
  const index = slides.findIndex((slide) => !presenterSlideIsHidden(slide));
  return index >= 0 ? index : 0;
}

function presenterLastNavigableIndex(slides = []) {
  for (let index = slides.length - 1; index >= 0; index -= 1) {
    if (!presenterSlideIsHidden(slides[index])) return index;
  }
  return Math.max(slides.length - 1, 0);
}

function renderPresenterOutput(payload, options = {}) {
  const root = document.getElementById("presenterOutputRoot");
  if (!root) return;
  clearPresenterOutputAutoAdvanceTimer();
  const slides = Array.isArray(payload?.slides) ? payload.slides : [];
  const liveSlide = payload?.liveScripture?.active ? payload.liveScripture.slide : null;
  const slide = payload?.safetyBlank
    ? presenterSafetyBlankSlide()
    : liveSlide || slides[clampPresenterIndex(payload?.index, slides.length)];
  const frameState = presenterOutputFrameStateForSlide(slide, payload);
  const activeImageSource = presenterSlideImageSource(slide);
  preloadPresenterOutputImages(payload, slide);
  if (activeImageSource && !presenterOutputImageIsReady(activeImageSource)) {
    const token = ++presenterOutputRenderState.token;
    root.setAttribute("aria-busy", "true");
    preloadPresenterOutputImage(activeImageSource)?.finally(() => {
      if (token === presenterOutputRenderState.token) renderPresenterOutput(payload, options);
    });
    return;
  }

  const token = ++presenterOutputRenderState.token;
  root.removeAttribute("aria-busy");
  commitPresenterOutputFrame(root, payload, slide, frameState, token, options);
}

function presenterOutputFrameStateForSlide(slide, payload = {}) {
  const backgroundImages = presenterPayloadBackgroundImages(payload);
  const fallbackChromakey = Boolean(payload?.chromakey);
  const slideChromakey = presenterFrameSlideOutputContext(slide, fallbackChromakey) === "chromakey";
  const cleanOutput = !slideChromakey;
  const blankSlide = presenterSlideLayout(slide) === PRESENTER_SLIDE_LAYOUTS.BLANK;
  const suppressBackground = Boolean(slide?.suppressBackgroundImage || slide?.noBackgroundImage);
  // A fullscreen blank stays inside the service visual system: retain the same
  // background while the cross draws over it. Chromakey remains background-free.
  const showBackground = Boolean(backgroundImages.length && cleanOutput && !suppressBackground);
  return {
    cleanOutput,
    showBackground,
    blankOutput: Boolean(blankSlide && cleanOutput),
    backgroundImage: backgroundImages[0] || "",
    backgroundImages,
    serviceType: payload?.serviceType || "",
    outputTheme: payload?.outputTheme || presenterOutputTheme(payload?.serviceType),
    noChromakey: !slideChromakey,
  };
}

function presenterFrameSlideOutputContext(slide, fallbackChromakey = true) {
  const explicit = presenterFrameNormalizeOutputContext(
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

function presenterFrameNormalizeOutputContext(value = "") {
  const key = compactSearchValue(value);
  if (!key) return "";
  if (["chromakey", "chroma", "key", "green", "greenkey", "크로마키"].includes(key)) return "chromakey";
  if (["clean", "fullscreen", "full", "media", "image", "video", "score", "nochromakey", "no-chromakey", "풀스크린", "전체화면"].includes(key)) return "clean";
  return "";
}

function presenterOutputFrameClassNames(frameState = {}) {
  return [
    frameState.noChromakey ? "no-chromakey" : "",
    frameState.showBackground ? "has-background" : "",
    frameState.blankOutput ? "is-blank" : "",
  ].filter(Boolean).join(" ");
}

function presenterOutputFrameBackgroundStyle(frameState = {}) {
  if (!frameState.showBackground) return "";
  const sources = frameState.backgroundImages?.length
    ? frameState.backgroundImages
    : [frameState.backgroundImage].filter(Boolean);
  if (!sources.length) return "";
  return ` style="--presenter-bg-image: ${escapeAttr(presenterBackgroundCssValue(sources))}"`;
}

function commitPresenterOutputFrame(root, payload, slide, frameState, token, options = {}) {
  const html = slide ? renderPresenterSlideFrame(slide, { noChromakey: frameState.noChromakey }) : "";
  const activeImageSource = presenterSlideImageSource(slide);
  const commit = () => {
    if (token !== presenterOutputRenderState.token) return;
    const layers = presenterOutputLayers(root);
    if (!layers) return;
    const nextLayer = layers.next;
    if (nextLayer.dataset.presenterFrameToken !== String(token)) {
      nextLayer.innerHTML = html;
      nextLayer.dataset.presenterFrameToken = String(token);
    }
    fitPresenterChromakeyScriptureText(nextLayer, frameState);
    fitPresenterSongTitleText(nextLayer);
    fitPresenterSermonTitleText(nextLayer);
    nextLayer.classList.add("is-next");
    applyPresenterOutputFrameState(root, frameState);
    layers.active.classList.remove("is-active");
    layers.active.classList.remove("is-next");
    nextLayer.classList.add("is-active");
    nextLayer.classList.remove("is-next");
    layers.active.innerHTML = "";
    layers.active.removeAttribute("data-presenter-frame-token");
    warmPresenterOutputImages(payload, slide || null);
    bindPresenterOutputAutoAdvance(root, payload, slide, options, token);
  };
  if (!activeImageSource) {
    commit();
    return;
  }
  const commitToken = ++presenterOutputRenderState.commitToken;
  root.setAttribute("aria-busy", "true");
  const layers = presenterOutputLayers(root);
  if (!layers) return;
  layers.next.innerHTML = html;
  layers.next.dataset.presenterFrameToken = String(token);
  layers.next.classList.add("is-next");
  preparePresenterOutputFrameForPaint(layers.next)
    .then(() => nextAnimationFrame())
    .then(() => nextAnimationFrame())
    .finally(() => {
      if (token !== presenterOutputRenderState.token || commitToken !== presenterOutputRenderState.commitToken) return;
      root.removeAttribute("aria-busy");
      commit();
    });
}

function fitPresenterChromakeyScriptureText(host, frameState = {}) {
  if (!host || frameState.noChromakey) return;
  const textBox = host.querySelector(
    ".presenter-slide--scripture:not(.presenter-slide--scripture-reading) > .presenter-slide-text",
  );
  if (!textBox) return;

  textBox.style.removeProperty("--presenter-scripture-fitted-size");
  const baseSize = Number.parseFloat(window.getComputedStyle(textBox).fontSize);
  if (!Number.isFinite(baseSize) || baseSize <= 0) return;

  const minimumSize = Math.min(48, baseSize);
  for (let size = baseSize; size >= minimumSize; size -= 2) {
    textBox.style.setProperty("--presenter-scripture-fitted-size", `${size}px`);
    if (textBox.scrollHeight <= textBox.clientHeight + 1 && textBox.scrollWidth <= textBox.clientWidth + 1) return;
  }
}

function fitPresenterChromakeyScripturePreviews(host) {
  if (!host) return;
  host
    .querySelectorAll(".svc-slide-mini-canvas.presenter-output-root:not(.no-chromakey)")
    .forEach((preview) => fitPresenterChromakeyScriptureText(preview));
}

function fitPresenterSongTitleText(host) {
  if (!host) return;
  const outputRoot = host.closest?.(".presenter-output-root") || host;
  const fullscreen = outputRoot.classList?.contains("no-chromakey");
  const preview = Boolean(host.closest?.(".svc-slide-mini-canvas") || outputRoot.classList?.contains("svc-slide-mini-output"));
  const minimumSize = preview ? 18 : fullscreen ? 72 : 56;
  host
    .querySelectorAll(".presenter-slide--song-title > .presenter-slide-text, .presenter-slide--song-title .presenter-section-song-title-name")
    .forEach((textBox) => {
      textBox.style.removeProperty("font-size");
      const baseSize = Number.parseFloat(window.getComputedStyle(textBox).fontSize);
      if (!Number.isFinite(baseSize) || baseSize <= 0) return;

      const floor = Math.min(minimumSize, baseSize);
      for (let size = baseSize; size >= floor; size -= 2) {
        textBox.style.fontSize = `${size}px`;
        if (textBox.scrollWidth <= textBox.clientWidth + 1) return;
      }
    });
}

function fitPresenterSongTitlePreviews(host) {
  if (!host) return;
  host
    .querySelectorAll(".svc-slide-mini-canvas.presenter-output-root")
    .forEach((preview) => fitPresenterSongTitleText(preview));
}

function fitPresenterSermonTitleText(host) {
  if (!host) return;
  const outputRoot = host.closest?.(".presenter-output-root") || host;
  const fullscreen = outputRoot.classList?.contains("no-chromakey");
  const preview = Boolean(host.closest?.(".svc-slide-mini-canvas") || outputRoot.classList?.contains("svc-slide-mini-output"));
  const minimumSize = preview ? 18 : fullscreen ? 72 : 56;
  host
    .querySelectorAll(".presenter-title-assignee--sermon .presenter-title-assignee-content")
    .forEach((textBox) => {
      textBox.style.removeProperty("font-size");
      const baseSize = Number.parseFloat(window.getComputedStyle(textBox).fontSize);
      if (!Number.isFinite(baseSize) || baseSize <= 0) return;

      const floor = Math.min(minimumSize, baseSize);
      for (let size = baseSize; size >= floor; size -= 2) {
        textBox.style.fontSize = `${size}px`;
        if (textBox.scrollWidth <= textBox.clientWidth + 1) return;
      }
    });
}

function fitPresenterSermonTitlePreviews(host) {
  if (!host) return;
  host
    .querySelectorAll(".svc-slide-mini-canvas.presenter-output-root")
    .forEach((preview) => fitPresenterSermonTitleText(preview));
}

function bindPresenterOutputAutoAdvance(root, payload, slide, options = {}, token = presenterOutputRenderState.token) {
  clearPresenterOutputAutoAdvanceTimer();
  bindPresenterVideoTimelineCatchUp(root, payload, slide, options, token);
  bindPresenterOutputAutoAdvanceOnEnd(root, payload, slide, options);
  bindPresenterOutputAutoAdvanceAt(payload, slide, options, token);
}

function bindPresenterVideoTimelineCatchUp(root, payload, slide, options = {}, token = presenterOutputRenderState.token) {
  if (!slide || presenterSlideElementType(slide) !== PRESENTER_ELEMENT_TYPES.VIDEO) return;
  if (presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.MEDIA) return;
  const video = root?.querySelector(".presenter-output-layer.is-active video.presenter-video");
  if (!video) return;
  const onAutoAdvance = typeof options.onAutoAdvance === "function" ? options.onAutoAdvance : null;
  const applyCatchUp = () => {
    if (token !== presenterOutputRenderState.token) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : Number(slide.playback?.durationSeconds || 0);
    const catchUp = presenterVideoTimelineCatchUp(slide, payload, {
      now: Date.now(),
      durationSeconds: duration,
    });
    if (!catchUp) return;
    if (catchUp.shouldAdvance) {
      if (!onAutoAdvance) return;
      onAutoAdvance({
        serviceId: payload?.serviceId || "",
        slideId: slide?.id || "",
        slideIndex: clampPresenterIndex(payload?.index, Array.isArray(payload?.slides) ? payload.slides.length : 0),
        scheduledAt: catchUp.endAt?.toISOString?.() || "",
        catchUp: true,
      });
      return;
    }
    if (Number.isFinite(catchUp.offsetSeconds) && catchUp.offsetSeconds > 0) {
      try {
        video.currentTime = catchUp.offsetSeconds;
      } catch {
        // Some browsers reject seeking until more metadata is available.
      }
    }
  };
  if (Number.isFinite(video.duration) && video.duration > 0) {
    applyCatchUp();
    return;
  }
  video.addEventListener("loadedmetadata", applyCatchUp, { once: true });
}

function bindPresenterOutputAutoAdvanceOnEnd(root, payload, slide, options = {}) {
  if (!presenterSlideShouldAutoAdvanceOnEnd(slide)) return;
  const video = root?.querySelector(".presenter-output-layer.is-active video.presenter-video");
  const onAutoAdvance = typeof options.onAutoAdvance === "function" ? options.onAutoAdvance : null;
  if (!video || !onAutoAdvance) return;
  const serviceId = payload?.serviceId || "";
  const slideId = slide?.id || "";
  const slideIndex = clampPresenterIndex(payload?.index, Array.isArray(payload?.slides) ? payload.slides.length : 0);
  video.onended = () => onAutoAdvance({ serviceId, slideId, slideIndex });
}

function bindPresenterOutputAutoAdvanceAt(payload, slide, options = {}, token = presenterOutputRenderState.token) {
  const onAutoAdvance = typeof options.onAutoAdvance === "function" ? options.onAutoAdvance : null;
  if (!onAutoAdvance) return;
  const target = presenterSlideAutoAdvanceAt(slide, payload);
  if (!target) return;
  const delay = Math.max(0, target.getTime() - Date.now());
  const serviceId = payload?.serviceId || "";
  const slideId = slide?.id || "";
  const slideIndex = clampPresenterIndex(payload?.index, Array.isArray(payload?.slides) ? payload.slides.length : 0);
  presenterOutputRenderState.autoAdvanceTimer = window.setTimeout(() => {
    if (token !== presenterOutputRenderState.token) return;
    onAutoAdvance({ serviceId, slideId, slideIndex, scheduledAt: target.toISOString() });
  }, delay);
}

function clearPresenterOutputAutoAdvanceTimer() {
  if (!presenterOutputRenderState.autoAdvanceTimer) return;
  window.clearTimeout(presenterOutputRenderState.autoAdvanceTimer);
  presenterOutputRenderState.autoAdvanceTimer = null;
}

function presenterSlideShouldAutoAdvanceOnEnd(slide) {
  if (!slide || presenterSlideElementType(slide) !== PRESENTER_ELEMENT_TYPES.VIDEO) return false;
  if (presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.MEDIA) return false;
  if (slide.live) return false;
  const presenterRole = normalizeServicePresenterRole(slide.presenterRole);
  if (presenterRole !== "intro") return false;
  const playback = presenterPlaybackConfig(slide.playback, "intro-video");
  return playback.autoAdvanceOnEnd !== false && playback.loop !== true;
}

function presenterSlideAutoAdvanceAt(slide, payload = {}) {
  if (!slide || slide.live) return null;
  const raw = String(slide.playback?.autoAdvanceAt || "").trim();
  if (!raw) return null;
  const target = parsePresenterAutoAdvanceAt(raw, payload?.serviceDate);
  if (!target || Number.isNaN(target.getTime())) return null;
  return target;
}

function presenterVideoTimelineCatchUp(slide, payload = {}, options = {}) {
  if (!slide || slide.live) return null;
  const startAt = presenterSlideTimelineStartAt(slide, payload);
  if (!startAt) return null;
  const now = Number(options.now) || Date.now();
  const elapsedSeconds = (now - startAt.getTime()) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return null;
  const durationSeconds = Number(options.durationSeconds) || Number(slide.playback?.durationSeconds || 0);
  const endAt = durationSeconds > 0 ? new Date(startAt.getTime() + (durationSeconds * 1000)) : presenterSlideAutoAdvanceAt(slide, payload);
  const shouldAdvance = Boolean(durationSeconds > 0 && elapsedSeconds >= durationSeconds && presenterSlideShouldAutoAdvanceOnEnd(slide));
  return {
    startAt,
    endAt,
    elapsedSeconds,
    offsetSeconds: durationSeconds > 0 ? Math.min(elapsedSeconds, Math.max(durationSeconds - 0.25, 0)) : elapsedSeconds,
    shouldAdvance,
  };
}

function presenterSlideTimelineStartAt(slide, payload = {}) {
  if (!slide) return null;
  const explicitStart = parsePresenterAutoAdvanceAt(slide.playback?.startAt, payload?.serviceDate);
  if (explicitStart) return explicitStart;
  const slides = Array.isArray(payload?.slides) ? payload.slides : [];
  const index = clampPresenterIndex(payload?.index, slides.length);
  const previous = slides[index - 1];
  const previousAdvanceAt = presenterSlideAutoAdvanceAt(previous, payload);
  if (previousAdvanceAt) return previousAdvanceAt;
  const ownAdvanceAt = presenterSlideAutoAdvanceAt(slide, payload);
  const durationSeconds = Number(slide.playback?.durationSeconds || 0);
  if (ownAdvanceAt && durationSeconds > 0) {
    return new Date(ownAdvanceAt.getTime() - (durationSeconds * 1000));
  }
  return null;
}

function parsePresenterAutoAdvanceAt(value, serviceDate = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) {
    const date = String(serviceDate || toLocalDateStr(new Date())).trim() || toLocalDateStr(new Date());
    return new Date(`${date}T${raw.length === 5 ? `${raw}:00` : raw}`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function presenterOutputLayers(root) {
  if (!root) return null;
  let layers = [...root.querySelectorAll(":scope > .presenter-output-layer")];
  if (layers.length < 2) {
    const existing = [...root.childNodes];
    root.textContent = "";
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.className = "presenter-output-layer is-active";
    second.className = "presenter-output-layer";
    existing.forEach((node) => first.appendChild(node));
    root.append(first, second);
    layers = [first, second];
  }
  const active = layers.find((layer) => layer.classList.contains("is-active")) || layers[0];
  const next = layers.find((layer) => layer !== active) || layers[1];
  return { active, next };
}

function applyPresenterOutputFrameState(root, frameState = {}) {
  document.body.classList.toggle("presenter-output-body--clean", Boolean(frameState.cleanOutput));
  document.body.classList.toggle("has-background", Boolean(frameState.showBackground));
  document.body.classList.toggle("is-blank", Boolean(frameState.blankOutput));
  root.classList.toggle("no-chromakey", Boolean(frameState.noChromakey));
  root.classList.toggle("has-background", Boolean(frameState.showBackground));
  root.classList.toggle("is-blank", Boolean(frameState.blankOutput));
  root.dataset.serviceType = frameState.serviceType || "";
  root.dataset.outputTheme = frameState.outputTheme || presenterOutputTheme(frameState.serviceType);
  if (frameState.showBackground) {
    const backgroundCssValue = presenterBackgroundCssValue(frameState.backgroundImages?.length ? frameState.backgroundImages : [frameState.backgroundImage]);
    document.body.style.setProperty("--presenter-bg-image", backgroundCssValue);
    root.style.setProperty("--presenter-bg-image", backgroundCssValue);
  } else {
    document.body.style.removeProperty("--presenter-bg-image");
    root.style.removeProperty("--presenter-bg-image");
  }
}

function presenterPayloadBackgroundImages(payload = {}) {
  if (Array.isArray(payload?.backgroundImages) && payload.backgroundImages.length) {
    return payload.backgroundImages.filter(Boolean);
  }
  return [payload?.backgroundImage].filter(Boolean);
}

function preparePresenterOutputFrameForPaint(host) {
  if (!host) return Promise.resolve();
  const images = [...host.querySelectorAll("img")];
  const imageReady = images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (typeof image.decode === "function") return image.decode().catch(() => {});
    return new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });
  });
  return Promise.all(imageReady)
    .then(() => nextAnimationFrame());
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function preloadPresenterOutputImages(payload = {}, activeSlide = null) {
  presenterOutputImageSourcesForPreload(payload, activeSlide).forEach(preloadPresenterOutputImage);
}

function presenterOutputImageSourcesForPreload(payload = {}, activeSlide = null) {
  const sources = [];
  const pushSlide = (slide) => {
    const source = presenterSlideImageSource(slide);
    if (source) sources.push(source);
  };
  pushSlide(activeSlide);

  let slideList = [];
  let activeIndex = 0;
  slideList = Array.isArray(payload?.slides) ? payload.slides : [];
  activeIndex = clampPresenterIndex(payload?.index, slideList.length);
  for (let offset = -PRESENTER_OUTPUT_IMAGE_PRELOAD_RADIUS; offset <= PRESENTER_OUTPUT_IMAGE_PRELOAD_RADIUS; offset += 1) {
    pushSlide(slideList[activeIndex + offset]);
  }
  presenterOutputScoreGroupSlidesForPreload(slideList, activeSlide, activeIndex).forEach(pushSlide);

  presenterPayloadBackgroundImages(payload).forEach((source) => {
    const backgroundImage = normalizePresenterMediaSource(source || "");
    if (backgroundImage && presenterMediaSourceIsImage(backgroundImage)) sources.push(backgroundImage);
  });
  return [...new Set(sources)];
}

function warmPresenterOutputImages(payload = {}, activeSlide = null) {
  const sources = presenterOutputWarmupSourcesForPayload(payload, activeSlide);
  const key = presenterOutputWarmupKey(payload, sources);
  if (!key || !sources.length) {
    cancelPresenterOutputImageWarmup();
    presenterOutputImageWarmupState.key = "";
    presenterOutputImageWarmupState.serviceId = "";
    presenterOutputImageWarmupState.sources = [];
    presenterOutputImageWarmupState.index = 0;
    return;
  }
  if (key === presenterOutputImageWarmupState.key) {
    schedulePresenterOutputImageWarmup();
    return;
  }

  cancelPresenterOutputImageWarmup();
  presenterOutputImageWarmupState.key = key;
  presenterOutputImageWarmupState.serviceId = payload?.serviceId || "";
  presenterOutputImageWarmupState.sources = sources;
  presenterOutputImageWarmupState.index = 0;

  const eagerCount = Math.min(PRESENTER_OUTPUT_WARMUP_EAGER_COUNT, sources.length);
  sources.slice(0, eagerCount).forEach((source) => preloadPresenterOutputImage(source));
  presenterOutputImageWarmupState.index = eagerCount;
  schedulePresenterOutputImageWarmup();
}

function presenterOutputWarmupSummary() {
  const sources = presenterOutputImageWarmupState.sources || [];
  const total = sources.length;
  const ready = sources.filter(presenterOutputImageIsReady).length;
  return {
    serviceId: presenterOutputImageWarmupState.serviceId || "",
    total,
    ready,
    queued: Math.max(0, total - presenterOutputImageWarmupState.index),
    complete: total > 0 && ready >= total,
  };
}

function presenterOutputWarmupSourcesForPayload(payload = {}, activeSlide = null) {
  const sources = [];
  const pushSource = (source) => {
    const normalized = normalizePresenterMediaSource(source);
    if (normalized && presenterMediaSourceIsImage(normalized)) sources.push(normalized);
  };
  const pushSlide = (slide) => pushSource(presenterSlideImageSource(slide));
  const serviceSlides = Array.isArray(payload?.slides) ? payload.slides : [];
  const serviceIndex = clampPresenterIndex(payload?.index, serviceSlides.length);

  pushSlide(activeSlide);
  if (payload?.liveScripture?.active) {
    pushSlide(payload.liveScripture.slide);
  }
  presenterSlidesByDistance(serviceSlides, serviceIndex).forEach(pushSlide);
  presenterPayloadBackgroundImages(payload).forEach(pushSource);
  return [...new Set(sources)].slice(0, PRESENTER_OUTPUT_IMAGE_PRELOAD_LIMIT);
}

function presenterSlidesByDistance(slides = [], activeIndex = 0) {
  if (!Array.isArray(slides) || !slides.length) return [];
  const safeIndex = clampPresenterIndex(activeIndex, slides.length);
  return slides
    .map((slide, index) => ({ slide, index, distance: Math.abs(index - safeIndex) }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .map((item) => item.slide);
}

function presenterOutputWarmupKey(payload = {}, sources = []) {
  if (!Array.isArray(sources) || !sources.length) return "";
  const sourceSet = [...new Set(sources)].sort();
  return [
    payload?.serviceId || "no-service",
    payload?.serviceType || "",
    sourceSet.length,
    presenterHashString(sourceSet.join("\n")),
  ].join("|");
}

function presenterHashString(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return String(hash >>> 0);
}

function cancelPresenterOutputImageWarmup() {
  const handle = presenterOutputImageWarmupState.handle;
  if (!handle) return;
  if (handle.type === "idle" && typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle.id);
  } else {
    window.clearTimeout(handle.id);
  }
  presenterOutputImageWarmupState.handle = null;
}

function schedulePresenterOutputImageWarmup() {
  if (presenterOutputImageWarmupState.handle) return;
  if (presenterOutputImageWarmupState.index >= presenterOutputImageWarmupState.sources.length) return;
  const run = (deadline = null) => {
    presenterOutputImageWarmupState.handle = null;
    let count = 0;
    while (
      presenterOutputImageWarmupState.index < presenterOutputImageWarmupState.sources.length
      && count < PRESENTER_OUTPUT_WARMUP_BATCH_SIZE
      && (!deadline || count === 0 || deadline.timeRemaining?.() > 4)
    ) {
      const source = presenterOutputImageWarmupState.sources[presenterOutputImageWarmupState.index];
      presenterOutputImageWarmupState.index += 1;
      count += 1;
      preloadPresenterOutputImage(source, { priority: "low" });
    }
    presenterOutputImageWarmupState.onProgress?.();
    schedulePresenterOutputImageWarmup();
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: PRESENTER_OUTPUT_WARMUP_IDLE_TIMEOUT_MS });
    presenterOutputImageWarmupState.handle = { type: "idle", id };
  } else {
    const id = window.setTimeout(() => run(null), 50);
    presenterOutputImageWarmupState.handle = { type: "timeout", id };
  }
}

function presenterOutputScoreGroupSlidesForPreload(slides = [], activeSlide = null, activeIndex = 0) {
  if (!Array.isArray(slides) || !slides.length) return [];
  const nearbyStart = Math.max(0, activeIndex - PRESENTER_OUTPUT_IMAGE_PRELOAD_RADIUS);
  const nearbyEnd = Math.min(slides.length, activeIndex + PRESENTER_OUTPUT_IMAGE_PRELOAD_RADIUS + 1);
  const nearbySlides = slides.slice(nearbyStart, nearbyEnd);
  const scoreSlide = presenterSlideIsScoreImage(activeSlide)
    ? activeSlide
    : nearbySlides.find(presenterSlideIsScoreImage);
  const groupKey = presenterSlidePreloadGroupKey(scoreSlide);
  if (!groupKey) return [];
  return slides
    .filter((slide) => presenterSlideIsScoreImage(slide) && presenterSlidePreloadGroupKey(slide) === groupKey)
    .slice(0, PRESENTER_OUTPUT_SCORE_PRELOAD_LIMIT);
}

function presenterSlideIsScoreImage(slide) {
  return Boolean(
    slide
    && presenterSlideImageSource(slide)
    && (slide.sourceType === "score" || slide.componentType === "score" || slide.scoreBackground),
  );
}

function presenterSlidePreloadGroupKey(slide) {
  return String(slide?.elementId || slide?.sectionId || slide?.asset?.name || slide?.title || "").trim();
}

function presenterSlideImageSource(slide) {
  if (!slide) return "";
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (layout !== PRESENTER_SLIDE_LAYOUTS.MEDIA || elementType !== PRESENTER_ELEMENT_TYPES.IMAGE) return "";
  const source = normalizePresenterMediaSource(slide.imageSrc || slide.asset?.url || slide.text);
  return source && presenterMediaSourceIsImage(source) ? source : "";
}

function preloadPresenterOutputImage(source, options = {}) {
  const normalized = normalizePresenterMediaSource(source);
  if (!normalized || !presenterMediaSourceIsImage(normalized)) return null;
  const cached = presenterOutputImagePreloadCache.get(normalized);
  if (cached) {
    if (cached.image?.complete && cached.image.naturalWidth > 0) cached.ready = true;
    cached.lastUsed = Date.now();
    return cached.promise;
  }
  const image = new Image();
  image.decoding = "async";
  image.loading = "eager";
  if ("fetchPriority" in image) image.fetchPriority = options.priority === "low" ? "low" : "high";
  image.src = normalized;
  const promise = typeof image.decode === "function"
    ? image.decode().catch(() => {})
    : new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });
  const record = { image, promise, lastUsed: Date.now(), ready: false };
  promise.finally(() => { record.ready = true; });
  presenterOutputImagePreloadCache.set(normalized, record);
  trimPresenterOutputImagePreloadCache();
  return promise;
}

function presenterOutputImageIsReady(source) {
  const normalized = normalizePresenterMediaSource(source);
  const cached = normalized ? presenterOutputImagePreloadCache.get(normalized) : null;
  if (!cached) return false;
  if (cached.ready) return true;
  if (cached.image?.complete && cached.image.naturalWidth > 0) {
    cached.ready = true;
    return true;
  }
  return false;
}

function trimPresenterOutputImagePreloadCache() {
  if (presenterOutputImagePreloadCache.size <= PRESENTER_OUTPUT_IMAGE_PRELOAD_LIMIT) return;
  [...presenterOutputImagePreloadCache.entries()]
    .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
    .slice(0, presenterOutputImagePreloadCache.size - PRESENTER_OUTPUT_IMAGE_PRELOAD_LIMIT)
    .forEach(([source]) => presenterOutputImagePreloadCache.delete(source));
}

function renderPresenterSlideFrame(slide, options = {}) {
  const slideClass = presenterSlideRenderClass(slide);
  const extraClasses = presenterSlideExtraClasses(slide);
  const body = renderPresenterSlideBody(slide, options);
  const sectionKey = String(slide?.sectionKey || slide?.section_key || "").trim();
  const backgroundStyle = slide?.scriptureContext === "reading" && !slide?.suppressBackgroundImage && !slide?.noBackgroundImage
    ? ` style="--presenter-slide-bg-image: url('${escapeAttr(PRESENTER_SCRIPTURE_READING_BACKGROUND)}')"`
    : "";
  return `
    <section class="presenter-slide presenter-slide--${escapeAttr(slideClass)}${extraClasses ? ` ${escapeAttr(extraClasses)}` : ""}" data-element-type="${escapeAttr(presenterSlideElementType(slide))}" data-slide-layout="${escapeAttr(presenterSlideLayout(slide))}"${sectionKey ? ` data-section-key="${escapeAttr(sectionKey)}"` : ""}${backgroundStyle}>
      ${renderPresenterSlideMeta(slide)}
      ${body}
    </section>
  `;
}

function presenterSlideExtraClasses(slide) {
  const classes = [];
  const layout = presenterSlideLayout(slide);
  if (slide?.sourceType === "score" || slide?.componentType === "score" || slide?.scoreBackground) classes.push("presenter-slide--score");
  if (layout !== PRESENTER_SLIDE_LAYOUTS.BLANK && presenterScriptureContextUsesReadingForm(slide?.scriptureContext)) classes.push("presenter-slide--scripture-reading");
  if (layout !== PRESENTER_SLIDE_LAYOUTS.BLANK && slide?.scriptureContext === "sermon") classes.push("presenter-slide--scripture-sermon");
  if (layout !== PRESENTER_SLIDE_LAYOUTS.BLANK && slide?.scriptureContext === "citation") classes.push("presenter-slide--scripture-citation");
  return classes.join(" ");
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

function renderPresenterSlideBody(slide, options = {}) {
  const layout = presenterSlideLayout(slide);
  const elementType = presenterSlideElementType(slide);
  if (slide?.type === "ready" && options.noChromakey) return renderPresenterFullscreenReadySlide(slide);
  if (elementType === PRESENTER_ELEMENT_TYPES.AUDIO) return "";
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA && elementType === PRESENTER_ELEMENT_TYPES.VIDEO) return renderPresenterVideoSlide(slide, options);
  if (layout === PRESENTER_SLIDE_LAYOUTS.MEDIA && elementType === PRESENTER_ELEMENT_TYPES.IMAGE) return renderPresenterImageSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.FILE) return renderPresenterFileSlide(slide);
  if (elementType === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT && presenterScriptureContextUsesReadingForm(slide?.scriptureContext)) return renderPresenterScriptureReadingSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT && elementType === PRESENTER_ELEMENT_TYPES.TITLE_ASSIGNEE) return renderPresenterTitleAssigneeSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT && slide?.type === "song-title" && slide.sectionHeading) return renderPresenterSectionSongTitleSlide(slide);
  if (layout === PRESENTER_SLIDE_LAYOUTS.BLANK) return "";
  if (slide?.type === "liturgical-body") return renderPresenterLiturgicalBodySlide(slide);
  if (presenterSlideIsTitleContent(slide)) return renderPresenterTitleContentSlide(slide);
  return `<div class="presenter-slide-text">${renderPresenterSlideText(slide)}</div>`;
}

function renderPresenterFullscreenReadySlide(slide) {
  const serviceName = String(slide?.readyServiceName || "").trim()
    || String(slide?.text || "").split("\n").map((line) => line.trim()).filter(Boolean)[1]
    || "예배";
  return `
    <div class="presenter-ready-screen">
      <p class="presenter-ready-screen-message">잠시 후 ${escapeHtml(serviceName)}가 시작됩니다</p>
      <img class="presenter-ready-screen-logo" src="${escapeAttr(PRESENTER_CHURCH_LOGO)}" alt="기형 검단우리교회" decoding="sync" loading="eager" fetchpriority="high" draggable="false" />
    </div>
  `;
}

function renderPresenterScriptureReadingSlide(slide) {
  const reference = String(slide?.title || slide?.marker || "").trim();
  const translationLabel = String(slide?.translationLabel || "").trim();
  const { number, text } = presenterScriptureVerseParts(slide?.text || "");
  const headerReference = presenterScriptureReadingHeaderReference(slide, number) || reference;
  const referenceChars = presenterLineCharEstimate(headerReference || "본문");
  const translationChars = presenterLineCharEstimate(translationLabel || "역본");
  const verseChars = presenterLineCharEstimate(text || slide?.text || "");
  return `
    <div class="presenter-scripture-reading">
      <div class="presenter-scripture-reading-head">
        <div class="presenter-scripture-reading-ref" style="--line-chars: ${escapeAttr(referenceChars)}">${escapeHtml(headerReference || "본문")}</div>
        ${translationLabel ? `<div class="presenter-scripture-reading-version" style="--line-chars: ${escapeAttr(translationChars)}">${escapeHtml(translationLabel)}</div>` : ""}
      </div>
      <div class="presenter-scripture-reading-line">
        <span class="presenter-scripture-reading-text" style="--line-chars: ${escapeAttr(verseChars)}">${escapePresenterSlideLine(text || slide?.text || " ", slide)}</span>
      </div>
      ${slide?.scriptureContext === "reading" && slide?.scriptureReadingFinal ? `<div class="presenter-scripture-reading-fin">Fin.</div>` : ""}
    </div>`;
}

function presenterScriptureReadingHeaderReference(slide = {}, verseNumber = "") {
  const referenceBook = presenterScriptureReadingBookName(slide?.referenceBook);
  const referenceRange = String(slide?.referenceRange || "").trim();
  const chapter = referenceRange.match(/^(\d+)/)?.[1] || "";
  const verse = String(verseNumber || "").trim();
  const chapterReference = [referenceBook, chapter && verse ? `${chapter}:${verse}` : chapter ? `${chapter}장` : referenceRange].filter(Boolean).join(" ").trim();
  return chapterReference || String(slide?.title || slide?.marker || "").trim();
}

function presenterScriptureReadingBookName(value = "") {
  const referenceBook = String(value || "").trim();
  if (!referenceBook || typeof findBibleBookByReferenceName !== "function") return referenceBook;
  return String(findBibleBookByReferenceName(referenceBook)?.koreanName || referenceBook).trim();
}

function presenterScriptureVerseParts(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,3}(?:[–-]\d{1,3})?)\s{2,}(.+)$/);
  if (!match) return { number: "", text };
  return { number: match[1], text: match[2].trim() };
}

function renderPresenterVideoSlide(slide, options = {}) {
  const source = normalizePresenterMediaSource(slide.videoSrc || slide.text);
  if (!source) return "";
  const presenterRole = normalizeServicePresenterRole(slide.presenterRole);
  const playbackType = presenterRole === "intro"
    ? "intro-video"
    : (presenterRole === "ready" || presenterRole === "waiting_loop" || slide.type === "ready")
      ? "ready-video"
      : "video";
  const playback = presenterPlaybackConfig(slide.playback, playbackType);
  const previewStage = Boolean(options.previewStage);
  const attrs = [
    "class=\"presenter-video\"",
    `src="${escapeAttr(source)}"`,
    presenterRole ? `data-presenter-role="${escapeAttr(presenterRole)}"` : "",
    playback.autoplay ? "autoplay" : "",
    (previewStage || playback.muted) ? "muted" : "",
    playback.loop ? "loop" : "",
    playback.controls ? "controls" : "",
    options.noChromakey ? "" : `poster="${PRESENTER_CHROMAKEY_VIDEO_POSTER}"`,
    "playsinline",
    `preload=\"${previewStage ? "metadata" : "auto"}\"`,
  ].filter(Boolean).join(" ");
  return `
    <video ${attrs}></video>
  `;
}

function renderPresenterImageSlide(slide) {
  const source = normalizePresenterMediaSource(slide.imageSrc || slide.asset?.url || slide.text);
  if (!source) return "";
  return `<img class="presenter-image" src="${escapeAttr(source)}" alt="" decoding="sync" loading="eager" fetchpriority="high" draggable="false" />`;
}

function renderPresenterTitleAssigneeSlide(slide) {
  const title = String(slide.title || slide.text || slide.label || "").trim();
  const assignee = String(slide.assignee || slide.subtitle || "").trim();
  const orderTitle = String(slide.orderTitle || "").trim();
  const contentTitle = String(slide.contentTitle || "").trim();
  const titleChars = presenterLineCharEstimate(title);
  const assigneeChars = presenterLineCharEstimate(assignee);
  const orderChars = presenterLineCharEstimate(orderTitle);
  const contentChars = presenterLineCharEstimate(contentTitle);
  if (presenterTitleAssigneeIsSermon(slide) && contentTitle && assignee) {
    return `
      <div class="presenter-slide-text presenter-title-assignee presenter-title-assignee--sermon">
        <span class="presenter-title-assignee-content" style="--line-chars: ${escapeAttr(contentChars)}">${escapeHtml(contentTitle)}</span>
        <span class="presenter-title-assignee-person" style="--line-chars: ${escapeAttr(assigneeChars)}">${escapeHtml(assignee)}</span>
      </div>
    `;
  }
  if (orderTitle && contentTitle && !assignee) {
    return `
      <div class="presenter-slide-text presenter-title-assignee presenter-title-assignee--order-content">
        <span class="presenter-title-assignee-order" style="--line-chars: ${escapeAttr(orderChars)}">${escapeHtml(orderTitle)}</span>
        <span class="presenter-title-assignee-content" style="--line-chars: ${escapeAttr(contentChars)}">${escapeHtml(contentTitle)}</span>
      </div>
    `;
  }
  if (orderTitle && contentTitle && assignee) {
    return `
      <div class="presenter-slide-text presenter-title-assignee presenter-title-assignee--three-part">
        <span class="presenter-title-assignee-order" style="--line-chars: ${escapeAttr(orderChars)}">${escapeHtml(orderTitle)}</span>
        <span class="presenter-title-assignee-content" style="--line-chars: ${escapeAttr(contentChars)}">${escapeHtml(contentTitle)}</span>
        <span class="presenter-title-assignee-person" style="--line-chars: ${escapeAttr(assigneeChars)}">${escapeHtml(assignee)}</span>
      </div>
    `;
  }
  const soloClass = assignee ? "" : " presenter-title-assignee--solo";
  return `
    <div class="presenter-slide-text presenter-title-assignee${soloClass}">
      <span class="presenter-title-assignee-title" style="--line-chars: ${escapeAttr(titleChars)}">${escapeHtml(title)}</span>
      ${assignee ? `<span class="presenter-title-assignee-person" style="--line-chars: ${escapeAttr(assigneeChars)}">${escapeHtml(assignee)}</span>` : ""}
    </div>
  `;
}

function presenterTitleAssigneeIsSermon(slide = {}) {
  if (String(slide?.titlePresentation || "").trim() === "sermon") return true;
  const values = [
    slide.sectionKey,
    slide.sectionLabel,
    slide.sectionTitle,
    slide.orderTitle,
    slide.label,
  ].map((value) => compactSearchValue(value));
  return values.some((value) => value === "설교" || value === "sermon");
}

function renderPresenterSectionSongTitleSlide(slide) {
  const heading = presenterSongTitleNormalizedHeading(
    String(slide.sectionHeading || slide.label || slide.sectionLabel || "").trim(),
    String(slide.sectionKey || slide._worshipSectionKey || "").trim(),
  );
  const title = presenterSongTitleContentText(
    String(slide.text || formatPresenterSongTitleText(slide.title || "")).trim(),
    heading,
  );
  const headingChars = presenterLineCharEstimate(heading);
  const titleChars = presenterLineCharEstimate(title);
  return `
    <div class="presenter-slide-text presenter-section-song-title">
      <span class="presenter-section-song-title-heading" style="--line-chars: ${escapeAttr(headingChars)}">${escapeHtml(heading)}</span>
      <span class="presenter-section-song-title-name" style="--line-chars: ${escapeAttr(titleChars)}">${escapeHtml(title)}</span>
    </div>
  `;
}

function renderPresenterTitleContentSlide(slide) {
  const title = String(slide.title || "").trim();
  const bodyLines = presenterTitleContentLines(slide);
  const titleChars = presenterLineCharEstimate(title);
  return `
    <div class="presenter-title-content">
      <span class="presenter-title-content-title" style="--line-chars: ${escapeAttr(titleChars)}">${escapeHtml(title)}</span>
      <div class="presenter-title-content-body">
        ${bodyLines.map((line) => `<span style="--line-chars: ${presenterLineCharEstimate(line)}">${escapePresenterSlideLine(line, slide)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderPresenterLiturgicalBodySlide(slide) {
  const title = String(slide.title || slide.sectionTitle || "").trim();
  const lines = presenterLiturgicalBodyLines(slide);
  const titleChars = presenterLineCharEstimate(title);
  return `
    <div class="presenter-liturgical-body">
      <div class="presenter-liturgical-body-lines">
        ${lines.map((line) => `<span style="--line-chars: ${presenterLineCharEstimate(line)}">${escapePresenterSlideLine(line, slide)}</span>`).join("")}
      </div>
      <div class="presenter-liturgical-body-heading">
        <span style="--line-chars: ${escapeAttr(titleChars)}">${escapeHtml(title)}</span>
      </div>
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
  const verseNumber = presenterLyricVerseNumber(slide);
  let verseNumberUsed = false;
  return presenterDisplayLines(slide)
    .map((line) => {
      const showVerseNumber = verseNumber && !verseNumberUsed && String(line || "").trim();
      if (showVerseNumber) verseNumberUsed = true;
      return `<span${showVerseNumber ? ` class="presenter-lyric-line presenter-lyric-line--numbered" data-verse-no="${escapeAttr(verseNumber)}"` : ""} style="--line-chars: ${presenterLineCharEstimate(line) + (showVerseNumber ? 1 : 0)}">${escapePresenterSlideLine(line, slide)}</span>`;
    })
    .join("");
}

function presenterLyricVerseNumber(slide) {
  if (presenterSlideElementType(slide) !== PRESENTER_ELEMENT_TYPES.PRAISE) return "";
  if (presenterSlideLayout(slide) !== PRESENTER_SLIDE_LAYOUTS.LOWER_BAR_TEXT) return "";
  if (slide?.type !== "lyrics") return "";
  const marker = String(slide?.marker || slide?.formLabel || "").trim();
  const match = marker.match(/^(?:verse|v)\s*(\d{1,2})$/i)
    || marker.match(/^(\d{1,2})\s*절$/);
  return match ? String(Number(match[1])) : "";
}

function escapePresenterSlideLine(line, slide) {
  const text = line || " ";
  if (presenterSlideElementType(slide) === PRESENTER_ELEMENT_TYPES.SCRIPTURE_TEXT) {
    return escapeHtml(text).replace(/ {2,}/g, (spaces) => "&nbsp;".repeat(spaces.length));
  }
  return renderPresenterHighlightedText(text, slide);
}

function renderPresenterHighlightedText(line, slide) {
  const text = String(line || " ");
  const highlights = normalizeServiceTextHighlights(slide?.textHighlights || slide?.text_highlights || slide?.highlights);
  if (!highlights.length) return escapeHtml(text);
  const ranges = [];
  highlights
    .filter((highlight) => highlight.text)
    .sort((a, b) => String(b.text).length - String(a.text).length)
    .forEach((highlight) => {
      const needle = String(highlight.text || "");
      if (!needle) return;
      let index = text.indexOf(needle);
      while (index !== -1) {
        const end = index + needle.length;
        const overlaps = ranges.some((range) => index < range.end && end > range.start);
        if (!overlaps) ranges.push({ start: index, end, highlight });
        index = text.indexOf(needle, end);
      }
    });
  if (!ranges.length) return escapeHtml(text);
  ranges.sort((a, b) => a.start - b.start);
  let cursor = 0;
  const parts = [];
  ranges.forEach((range) => {
    if (range.start > cursor) parts.push(escapeHtml(text.slice(cursor, range.start)));
    const content = escapeHtml(text.slice(range.start, range.end));
    const style = presenterTextHighlightStyle(range.highlight);
    parts.push(`<span class="presenter-text-highlight"${style ? ` style="${style}"` : ""}>${content}</span>`);
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(escapeHtml(text.slice(cursor)));
  return parts.join("");
}

function presenterTextHighlightStyle(highlight = {}) {
  const styles = [];
  const color = normalizeServiceTextHighlightColor(highlight.color || highlight.fg || highlight.foreground || highlight.hex);
  if (color) styles.push(`--presenter-text-highlight-color: ${escapeAttr(color)}`);
  if (highlight.bold === false) styles.push("--presenter-text-highlight-weight: inherit");
  return styles.join("; ");
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

function presenterLiturgicalBodyLines(slide) {
  return String(slide?.text || slide?.bodyText || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function presenterTitleContentBodyText(slide) {
  return String(slide?.bodyText || slide?.body || slide?.text || "").trim();
}

function presenterTitleContentLines(slide) {
  const title = String(slide?.title || "").trim();
  const lines = presenterTitleContentBodyText(slide).split(/\n/);
  const deduped = [];
  for (const line of lines) {
    if (title && normalizeTitle(line) === normalizeTitle(title)) continue;
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
