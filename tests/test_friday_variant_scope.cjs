const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const context = {parseLocalDate: value => new Date(`${value}T12:00:00`)};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const FRIDAY_SERVICE_VARIANT_START_DATE'),
  source.indexOf('const ALL_GENERATION_MAIN_PRAISE_SERVICE_ALIAS')), context);
for (const name of ['fridayWeekOfMonth', 'fridayServiceVariantForDate', 'autoFridayServiceTarget']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf('\n}\n', start) + 2), context);
}
for (const [date, key] of [['2026-08-07','monthly'],['2026-08-14','culture'],
  ['2026-08-21','3355'],['2026-08-28','district-union'],
  ['2026-09-04','monthly'],['2026-09-25','district-union']]) {
  assert.equal(context.fridayServiceVariantForDate(date)?.key, key, date);
}
for (const date of ['2026-07-17','2026-09-11','2026-09-18','2026-10-09',
  '2026-10-16','2026-10-30','2027-08-13','2027-08-20']) {
  assert.equal(context.fridayServiceVariantForDate(date), null, date);
  const target = context.autoFridayServiceTarget(date);
  assert.equal(target.typeId, 'friday');
  assert.equal(target.sourceRef, undefined);
  assert.equal(target.alias, undefined);
}
assert.equal(context.fridayServiceVariantForDate('2026-09-13'), null);
console.log('PASS August-only special Fridays; later regular Fridays; first/fourth weeks preserved');
