const assert = require('node:assert/strict');
require('../mindex.setlist-links.js');
const {buildIndex,resolve}=globalThis.MindexSetlistLinks;
const index=buildIndex([
 {id:'ccm',title:'예수 우리 왕이여',subtitle:'Jesus, We Enthrone You'},
 {id:'hymn',title:'예수 우리 왕이여',hymn_no:'38'},
 {id:'a',title:'성령의 불로',subtitle:'예수님 목마릅니다'},
 {id:'b',title:'성령의 불로',subtitle:'주의 도를 버리고'},
]);
assert.equal(resolve('예수 우리 왕이여',index,'ccm').text,'예수 우리 왕이여');
assert.equal(resolve('38 예수 우리 왕이여',index).text,'38 예수 우리 왕이여');
assert.equal(resolve('예수 우리 왕이여',index).status,'ambiguous');
assert.equal(resolve('성령의 불로',index,'a').text,'성령의 불로 (예수님 목마릅니다)');
console.log('PASS hymn/CCM display distinction, explicit links and necessary same-category subtitles');
