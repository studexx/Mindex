const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { compactSearchValue: value => String(value || '').replace(/\s+/g, '').toLowerCase() };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../mindex.worship-input.js'), 'utf8'), context);
const parse = input => JSON.parse(JSON.stringify(context.parsePresenterPreparationInput(input)));
const rows = input => {
  const result = parse(input);
  assert.deepEqual(result.errors, [], input);
  return result.entries.map(({ key, content }) => [key, content]);
};
assert.deepEqual(rows('9월 13일 주일예배\n주 은혜임을\n주 품에'), [
  ['찬양1', '주 은혜임을'], ['찬양2', '주 품에'],
]);
assert.deepEqual(rows('2026-09-13 주일예배 [2부]\n특송\n\n그 크신 하나님의 사랑 / 찬양대'), [
  ['특송', '그 크신 하나님의 사랑 / 찬양대'],
]);
assert.deepEqual(rows('봉헌 특송: 그 크신 하나님의 사랑 / 찬양대'), [
  ['봉헌특송', '그 크신 하나님의 사랑 / 찬양대'],
]);
assert.deepEqual(rows('성경봉독\n요 21:15~25\n설교 제목\n베드로의 고백'), [
  ['성경봉독', '요 21:15~25'], ['설교제목', '베드로의 고백'],
]);
assert.deepEqual(rows('찬양 1 · 목마른 사슴 시냇물\n찬양 3: 꽃들도\n충만'), [
  ['찬양1', '목마른 사슴 시냇물'], ['찬양3', '꽃들도'], ['찬양4', '충만'],
]);
assert.deepEqual(rows('찬양 1 찬 1장\n찬양 2. 1\n찬양 3. 찬송가 2장\n찬양4:2장'), [
  ['찬양1', '찬 1장'], ['찬양2', '찬 1장'], ['찬양3', '찬 2장'], ['찬양4', '찬 2장'],
]);
assert.deepEqual(rows('찬송가 9, 288, 182'), [
  ['찬양1', '찬 9장'], ['찬양2', '찬 288장'], ['찬양3', '찬 182장'],
]);
assert.deepEqual(rows('찬송가 430장 주와 같이 길 가는 것'), [['찬양1', '430장 주와 같이 길 가는 것']]);
assert.deepEqual(rows('기도하는 이 시간\n찬송하며 살리라'), [
  ['찬양1', '기도하는 이 시간'], ['찬양2', '찬송하며 살리라'],
]);
assert.deepEqual(rows('찬양 12\r주 품에'), [['찬양12', '주 품에']]);
for (const input of ['특송', '특송\n대표기도 김 집사', '특송 곡명\n김 집사', '요 21:15', '김 목사']) {
  assert.ok(parse(input).errors.length, input);
  assert.ok(!parse(input).entries.some(entry => /^찬양/.test(entry.key)), input);
}
assert.ok(parse('찬양1 꽃들도\n찬양1 충만').errors.length);
assert.equal(parse('\n특송\n곡명').entries[0].line, 2);
console.log('PASS worship input: context, multiline, boundaries, hymns, shorthand, ambiguous lines, duplicates');
