const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const context = {
  normalizeTitle: value => value.trim(),
  worshipAppServiceTypeId: value => value === 'fri' ? 'friday' : value,
};
vm.createContext(context);
for (const name of ['setlistCandidateDisplayOrder', 'compareSetlistCandidatesForDisplay', 'prepareWorshipSetlistArchiveCandidates']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  vm.runInContext(source.slice(start, source.indexOf('\n}\n', start) + 2), context);
}
const prepare = context.prepareWorshipSetlistArchiveCandidates;
const friday = { service_type_id: 'fri', source_kind: 'setlist' };
const song = (raw_label, raw_title, sort_order) => ({ raw_label, raw_title, sort_order });
const opening = ['밤이나 낮이나', '예수 열방의 소망', '새 힘 얻으리', '하나님은 우리의 피난처가 되시며', '보라 너희는 두려워 말고']
  .map((title, index) => song('찬양', title, index + 1));
const rows = [...opening, song('찬양', '272 고통의 멍에 벗으려고', 6),
  song('특송', '365 마음속에 근심 있는 사람', 7), song('결단', '말씀하시면', 8),
  song('기도 1', '주님과 담대히 나아가', 9), song('기도 2', '주께서 전진해 온다', 10), song('기도 3', '기도의 능력', 11)];
const original = JSON.stringify(rows);
const result = prepare(rows, friday);
assert.equal(result.map(row => row.archive_display_label || row.raw_label).join('|'),
  '찬양 1|찬양 2|찬양 3|찬양 4|찬양 5|특송|예배찬양|결단|기도 1|기도 2|기도 3');
assert.equal(result[6].raw_title, '272 고통의 멍에 벗으려고');
assert.equal(JSON.stringify(rows), original, 'source data must stay unchanged');
assert.equal(prepare(opening, friday).at(-1).archive_display_label, '찬양 5');
assert.equal(prepare(rows.filter(row => row.raw_label !== '특송'), friday)[5].archive_display_label, '예배찬양');
assert.equal(prepare([...opening, song('예배찬양', '별도 예배찬양', 6)], friday).at(-1).archive_display_label, '예배찬양');
assert.ok(prepare(rows, { ...friday, service_type_id: 'wednesday' }).every(row => !row.archive_display_label));
assert.ok(prepare(rows, { ...friday, source_kind: 'pptx' }).every(row => row.archive_display_label !== '예배찬양'));
assert.ok(prepare([...rows, song('찬양', '추가 메인 찬양', 12)], friday).every(row => row.archive_display_label !== '예배찬양'));
console.log('PASS: Friday archive ordering, numbering, missing worship praise, explicit role, scope and source preservation');
