const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const start = source.indexOf('async function loadWorshipSetlistArchive(');
const fn = source.slice(start, source.indexOf('\n}\n', start) + 2);
async function run({ cached = null, force = false, fail = false, auth = false } = {}) {
  let active = 0, peak = 0, writes = 0, cacheReads = 0;
  const snapshots = [];
  const sources = Array.from({length: 321}, (_, id) => ({id: String(id)}));
  const ctx = {
    state: {client: {}, config: {url: 'project-a', authRequired: auth}, worshipSetlistArchive: {loaded: false, loading: false}},
    WORSHIP_IMPORT_SOURCE_LIST_SELECT: 'source-fields', WORSHIP_IMPORT_CANDIDATE_LIST_SELECT: 'candidate-fields',
    chunkArray: (rows, size) => Array.from({length: Math.ceil(rows.length / size)}, (_, i) => rows.slice(i * size, (i + 1) * size)),
    readStaticSupabaseCache: (_, key) => { cacheReads++; assert.ok(key.startsWith('project-a:')); return cached && [cached]; },
    writeStaticSupabaseCache: () => { writes++; },
    renderCurrentServiceModuleDetail: () => snapshots.push(JSON.parse(JSON.stringify(ctx.state.worshipSetlistArchive))),
    renderServiceList: () => {}, console: {warn: () => {}},
    fetchSupabasePaged: async (table, select, build) => {
      if (table.endsWith('sources')) return sources;
      let ids;
      const query = {in: (_, values) => { ids = values; return query; }, eq: (key, value) => { assert.equal(key, 'candidate_level'); assert.equal(value, 'element'); return query; }, order: () => query};
      build(query);
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      if (fail) throw new Error('offline');
      return ids.map(id => ({import_source_id: id}));
    },
  };
  vm.createContext(ctx); vm.runInContext(fn, ctx);
  await ctx.loadWorshipSetlistArchive({force});
  return {archive: ctx.state.worshipSetlistArchive, snapshots, peak, writes, cacheReads};
}
(async () => {
  const cold = await run();
  assert.equal(cold.peak, 3); assert.equal(cold.archive.candidates.length, 321); assert.equal(cold.writes, 1);
  const cached = {sources: [{id:'old'}], candidates: []};
  const warm = await run({cached});
  assert.equal(warm.snapshots[0].loaded, true); assert.equal(warm.snapshots[0].sources[0].id, 'old');
  assert.equal(warm.archive.sources.length, 321);
  const failed = await run({cached, fail:true});
  assert.equal(failed.archive.sources[0].id, 'old'); assert.equal(failed.archive.loading, false);
  assert.equal(failed.archive.error, 'offline'); assert.equal(failed.writes, 0);
  assert.equal((await run({cached, force:true})).cacheReads, 0);
  const privateResult = await run({cached, auth:true});
  assert.equal(privateResult.cacheReads, 0); assert.equal(privateResult.writes, 0);
  console.log('PASS: bounded parallel loading, complete results, cache-first refresh, failure preservation, forced refresh and authenticated isolation');
})().catch(error => {console.error(error); process.exitCode = 1;});
