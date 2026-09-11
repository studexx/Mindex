const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Run the browser bundle with a stubbed fetch; no live database requests.
const sdk = {fetch, Headers, Request, Response, URL, URLSearchParams, AbortController,
  TextEncoder, TextDecoder, WebSocket, setTimeout, clearTimeout, console};
vm.createContext(sdk);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../vendor/supabase-js.min.js'), 'utf8'), sdk);
const {createClient} = sdk.supabase;
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const context = {
  MINDEX_SERVICE_DOCUMENT_KIND: 'worship-service',
  MINDEX_SERVICE_DOCUMENT_VERSION: 1,
  MINDEX_SERVICE_DOCUMENT_HISTORY_LIMIT: 3,
  MINDEX_SERVICE_DOCUMENT_HISTORY_MAX_BYTES: 450000,
  cleanList: x => x.filter(Boolean), limitServiceDocumentText: x => x,
  normalizeServiceAsset: x => x || {},
  hasServiceAsset: x => Boolean(x.url),
  normalizeWorshipSlotKey: x => x || '',
  normalizeServiceItemReferenceSpacing: x => x,
  compactSearchValue: x => x,
  compactTextSignature: x => x,
};
vm.createContext(context);
for (const name of ['serviceDocumentHistoryWithPrevious', 'compactServiceDocumentHistoryEntry',
  'serviceDocumentHistoryEntryKey', 'trimServiceDocumentHistory',
  'normalizeServiceDocumentSnapshot', 'normalizeServiceDocumentSourceRecords',
  'normalizeServiceDocumentSlides', 'normalizeServiceDocumentExceptions',
  'serviceDocumentRecordKey', 'serviceDocumentSlideKey'].filter(name => source.includes('function ' + name + '('))) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf('\n}\n', start) + 2), context);
}
const original = {
  version: 1, updatedAt: 'before', sourceSignature: 'same-text', slideSignature: 'same-slides',
  sourceText: 'Original', sourceRecords: [{elementId: 'a', linkedSource: {songVersionId: 'v1'}}],
  slides: [{id: 's1', layout: 'title'}], exceptions: [{reason: 'Original exception'}],
};
for (const change of [
  {sourceRecords: [{elementId: 'a', linkedSource: {songVersionId: 'v2'}}]},
  {exceptions: [{reason: 'Changed exception'}]},
  {slides: [{id: 's1', layout: 'lyrics'}]},
  {sourceText: 'Different text despite an unchanged signature'},
]) {
  const result = context.serviceDocumentHistoryWithPrevious(original, [], {...original, ...change});
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(result[0]), JSON.stringify(context.compactServiceDocumentHistoryEntry(original)));
}
assert.equal(context.serviceDocumentHistoryWithPrevious(original, [], {...original, updatedAt: 'later'}).length, 0);
assert.equal(context.serviceDocumentHistoryWithPrevious(original, [original], {...original, sourceText: 'Next'}).length, 1);
assert.equal(context.trimServiceDocumentHistory([original, original, original, original]).length, 3);
console.log('PASS history preserves recoverable changes, deduplicates timestamps and stays bounded');
(async () => {
  for (const count of [0, 1, null]) {
    const client = createClient('https://example.invalid', 'offline-test-key', {
      auth: {persistSession: false, autoRefreshToken: false},
      global: {fetch: async (_url, options) => {
        assert.equal(options.method, 'PATCH');
        assert.match(new Headers(options.headers).get('Prefer'), /count=exact/);
        return new Response(null, {status: 204,
          headers: count === null ? {} : {'content-range': '*/' + count}});
      }},
    });
    const result = await client.from('mindex_worship_services')
      .update({title: 'Offline fixture'}, {count: 'exact'}).eq('id', 'fixture');
    assert.equal(result.error, null);
    assert.equal(result.count, count);
  }
  console.log('PASS bundled Supabase SDK sends exact-count preference and parses receipts');
})().catch(error => { console.error(error); process.exitCode = 1; });
