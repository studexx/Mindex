const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../mindex.presenter.js'), 'utf8');
const book = {code: '1KI', koreanName: '열왕기상', shortName: '왕상'};
const context = {
  MINDEX_CONSTANTS: {KOREAN_BIBLE_BOOK_ABBREVIATIONS: {'1KI': '왕상'}},
  findBibleBookByReferenceName: name => ['열왕기상', '왕상'].includes(name) ? book : null,
};
vm.createContext(context);
for (const name of ['presenterScriptureReadingHeaderReference',
  'presenterScriptureReadingBookName', 'presenterScriptureReadingDisplayReference',
  'presenterCitationBookName', 'presenterCitationVerseReference', 'presenterCitationScriptureText']) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  vm.runInContext(source.slice(start, source.indexOf('\n}\n', start) + 2), context);
}
for (const scriptureContext of ['citation', 'reading', 'sermon']) {
  const slide = {scriptureContext, referenceBook: '왕상', referenceRange: '1:1', title: '왕상 1:1'};
  assert.equal(context.presenterScriptureReadingHeaderReference(slide, '1'), '열왕기상 1:1');
  assert.equal(context.presenterScriptureReadingHeaderReference({scriptureContext, title: '왕상 1:1'}), '열왕기상 1:1');
  assert.equal(slide.title, '왕상 1:1');
}
const verse = {referenceBook: '열왕기상', referenceRange: '1:1', text: '본문'};
assert.equal(context.presenterCitationVerseReference(verse, {}, '1'), '왕상 1:1');
assert.equal(context.presenterScriptureReadingHeaderReference({...verse, scriptureContext: 'citation-chromakey'}, '1'), '열왕기상 1:1');
console.log('PASS fullscreen and chromakey tab full names; input unchanged');
