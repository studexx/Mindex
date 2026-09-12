const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../mindex.presenter.js'), 'utf8');
const context = {presenterCircledNumber: n => ['①','②','③'][n],
  presenterLiturgicalBodyLines: () => [], presenterLineCharEstimate: s => s.length,
  escapeAttr: String, escapeHtml: String, escapePresenterSlideLine: String};
vm.createContext(context);
for (const name of ['presenterAnnouncementItems','presenterAnnouncementBodyText','renderPresenterLiturgicalBodySlide']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf('\n}\n', start) + 2), context);
}
const input = '1. First\r\n\r\nDetails\r\n\r\n\r\n2. Second';
const items = context.presenterAnnouncementItems(input);
assert.deepEqual(JSON.parse(JSON.stringify(items)), [
  {marker:'①',lines:['First','','Details','','']},
  {marker:'②',lines:['Second']},
]);
const body = context.presenterAnnouncementBodyText(input);
assert.equal(body, '① First\n\nDetails\n\n\n② Second');
assert.deepEqual(context.presenterAnnouncementItems(body), items);
assert.equal(context.presenterAnnouncementItems(' \n\n ').length, 0);
assert.equal(context.presenterAnnouncementBodyText('Plain\n\nMore'), 'Plain\n\nMore');
const html = context.renderPresenterLiturgicalBodySlide({title:'Notice',announcementItems:items});
assert.equal((html.match(/<br>/g) || []).length, 3);
const spaced = '  Welcome   everyone\n\n  Details    here\n1.   First  item\n    More  details';
const spacedBody = context.presenterAnnouncementBodyText(spaced);
assert.equal(spacedBody, '  Welcome   everyone\n\n  Details    here\n①   First  item\n    More  details');
assert.equal(context.presenterAnnouncementBodyText(spacedBody), spacedBody);
const spacedHtml = context.renderPresenterLiturgicalBodySlide({title:'Notice',announcementItems:context.presenterAnnouncementItems(spaced)});
assert.ok(spacedHtml.includes('>  Welcome   everyone</span>'));
assert.ok(spacedHtml.includes('>    More  details</span>'));
console.log('PASS announcement blank lines: CRLF, numbered/plain, repeated parsing, empty input, rendered spacers');
