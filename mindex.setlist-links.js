(function (root) {
  "use strict";
  const key = (value) => String(value || "").normalize("NFKC").replace(/\s+/gu, "").toLowerCase();
  // Reviewed against hymn 569 and the existing Praise alias + stored lyrics.
  const reviewedAliases = new Map([
    [key("선한 목자 되신 주"), "선한 목자 되신 우리 주"],
    [key("능력의 이름 예수"), "예수 예수"],
  ]);
  function titleParts(value) {
    let text = String(value || "").trim();
    const verse = text.match(/\s*([⑴-⒇①-⑳](?:\s*[,·]\s*[⑴-⒇①-⑳])*)$/u)?.[1] || "";
    if (verse) text = text.slice(0, text.lastIndexOf(verse)).trim();
    const hymn = text.match(/^(통\s*)?(\d{1,4})\s+(.+)$/u);
    return { text: hymn ? hymn[3] : text, number: hymn ? String(Number(hymn[2])) : "", oldHymnal: Boolean(hymn?.[1]), verse };
  }
  function aliases(value) {
    const text = titleParts(value).text;
    return [...new Set([text, text.replace(/\s*[(（\[][^)）\]]*[)）\]]/gu, "").trim(),
      ...Array.from(text.matchAll(/[(（\[]([^)）\]]+)[)）\]]/gu), (match) => match[1])].map(key).filter(Boolean))];
  }
  function buildIndex(songs = [], versions = []) {
    const byId = new Map(songs.map((song) => [song.id, { ...song, modernNumbers: new Set(), oldNumbers: new Set() }]));
    const titles = new Map(), names = new Map();
    function add(map, name, id) {
      const normalized = key(name);
      if (!normalized) return;
      if (!map.has(normalized)) map.set(normalized, new Set());
      map.get(normalized).add(id);
    }
    for (const song of byId.values()) {
      add(titles, song.title, song.id);
      if (song.subtitle) add(titles, `${song.title} (${song.subtitle})`, song.id);
      for (const name of [song.title, song.subtitle, song.original_title]) {
        for (const alias of aliases(name)) add(names, alias, song.id);
      }
      if (/^\d+$/u.test(String(song.hymn_no || ""))) song.modernNumbers.add(String(Number(song.hymn_no)));
    }
    for (const version of versions) {
      const song = byId.get(version.source_song_id) || byId.get(version.canonical_song_id);
      if (!song) continue;
      for (const name of [version.curated_version_name, version.version_label, version.subtitle, version.original_title]) {
        if (!name || /^(default|기본|새찬송가|통일찬송가|version\s*\d+)$/iu.test(name.trim())) continue;
        for (const alias of aliases(name)) add(names, alias, song.id);
      }
      const old = [version.curated_version_name, version.version_label].map((name) => String(name || "").match(/^(?:통일|통)\s*(\d+)/u)).find(Boolean);
      if (old) song.oldNumbers.add(String(Number(old[1])));
    }
    return { byId, titles, names };
  }
  function isExcluded(candidate, serviceType = "") {
    const label = String(candidate.raw_label || "").replace(/\s+/gu, "");
    if (!label.includes("특송")) return false;
    if (label.includes("3부")) return true;
    return ["sun_3rd", "sunday-main"].includes(serviceType) && !/[12]부/u.test(label);
  }
  function split(value) {
    const text = String(value || "").trim();
    const wrapped = text.match(/^메들리\s*[(（]([\s\S]*)[)）]$/u);
    return (wrapped ? wrapped[1] : text).split(/\s*[+＋]\s*/u).filter(Boolean);
  }
  function resolve(value, index, explicitId = "") {
    if (!index) return { status: "pending", text: value, candidates: [] };
    const part = titleParts(value);
    let ids = explicitId ? new Set(index.byId.has(explicitId) ? [explicitId] : []) : index.titles.get(key(part.text));
    if (!ids?.size && !explicitId && reviewedAliases.has(key(part.text))) {
      ids = index.titles.get(key(reviewedAliases.get(key(part.text))));
    }
    if (!ids?.size && !explicitId) ids = new Set(aliases(part.text).flatMap((alias) => [...(index.names.get(alias) || [])]));
    const candidates = [...(ids || [])].map((id) => index.byId.get(id)).filter(Boolean);
    if (!candidates.length) return { status: explicitId ? "broken-link" : "unmatched", text: value, candidates };
    const numbered = part.number ? candidates.filter((song) => (part.oldHymnal ? song.oldNumbers : song.modernNumbers).has(part.number)) : candidates;
    if (!numbered.length) return { status: "hymn-number", text: value, candidates };
    if (numbered.length !== 1) return { status: "ambiguous", text: value, candidates: numbered };
    const song = numbered[0];
    const prefix = part.number ? `${part.oldHymnal ? "통 " : ""}${part.number} ` : "";
    const title = index.titles.get(key(song.title))?.size > 1 && song.subtitle ? `${song.title} (${song.subtitle})` : song.title;
    return { status: "linked", song, text: `${prefix}${title}${part.verse ? ` ${part.verse}` : ""}`, candidates: numbered };
  }
  root.MindexSetlistLinks = { buildIndex, resolve, split, isExcluded };
})(typeof window === "undefined" ? globalThis : window);
