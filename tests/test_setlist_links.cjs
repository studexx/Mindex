const assert = require('node:assert/strict');
require('../mindex.setlist-links.js');
const {buildIndex,resolve,split} = globalThis.MindexSetlistLinks;
const songs = [
 {id:'a', title:'곡 A', subtitle:'별명'}, {id:'b',title:'곡 B'},
 {id:'hymn',title:'동명곡',hymn_no:'38'}, {id:'ccm',title:'동명곡'},
 {id:'number',title:'찬송 제목',hymn_no:'259'},
 {id:'s1',title:'성령의 불로',subtitle:'예수님 목마릅니다'},
 {id:'s2',title:'성령의 불로',subtitle:'주의 도를 버리고'},
];
const versions=[{id:'v',source_song_id:'number',version_label:'통일 100 찬송 제목'}, {id:'a-v',source_song_id:'a',curated_version_name:'버전 별명'}];
const before=JSON.stringify({songs,versions});const index=buildIndex(songs,versions);
assert.deepEqual(split('메들리 (곡 A + 곡 B)'),['곡 A','곡 B']);
assert.deepEqual(split('곡 A + 모르는 곡'),['곡 A','모르는 곡']);
assert.equal(resolve(' 곡 A ',index).song.id,'a');
assert.equal(resolve('별명',index).text,'곡 A');
assert.equal(resolve('버전 별명',index).song.id,'a');
assert.equal(resolve('곡 A (별명)',index).song.id,'a');
assert.equal(resolve('동명곡',index).status,'ambiguous');
assert.equal(resolve('38 동명곡',index).song.id,'hymn');
assert.equal(resolve('256 찬송 제목',index).status,'hymn-number');
assert.equal(resolve('259 찬송 제목 ⑴',index).text,'259 찬송 제목 ⑴');
assert.equal(resolve('통 100 찬송 제목',index).text,'통 100 찬송 제목');
assert.equal(resolve('통 259 찬송 제목',index).status,'hymn-number');
assert.equal(resolve('성령의 불로 (예수님 목마릅니다)',index).song.id,'s1');
assert.equal(resolve('동명곡',index,'ccm').song.id,'ccm');
assert.equal(resolve('곡 A',index,'deleted').status,'broken-link');
assert.equal(resolve('새 곡',index).status,'unmatched');
assert.equal(resolve('곡 A',null).status,'pending');
assert.equal(JSON.stringify({songs,versions}),before);
console.log('PASS: unique/ambiguous titles, explicit links, aliases, medleys, hymn numbers/editions/verses and immutable source');

assert.equal(MindexSetlistLinks.isExcluded({raw_label:'3부 특송'}),true);
assert.equal(MindexSetlistLinks.isExcluded({raw_label:'3 부 특송'}),true);
assert.equal(MindexSetlistLinks.isExcluded({raw_label:'특송'},'sun_3rd'),true);
assert.equal(MindexSetlistLinks.isExcluded({raw_label:'2부 특송'},'sun_3rd'),false);
assert.equal(MindexSetlistLinks.isExcluded({raw_label:'특송'},'fri'),false);
assert.equal(MindexSetlistLinks.isExcluded({raw_label:'찬양'},'sun_3rd'),false);
const reviewed=buildIndex([{id:'569',title:'선한 목자 되신 우리 주',hymn_no:'569'},{id:'jesus',title:'예수 예수'}]);
assert.equal(resolve('569 선한 목자 되신 주',reviewed).text,'569 선한 목자 되신 우리 주');
assert.equal(resolve('능력의 이름 예수',reviewed).status,'unmatched');
const distinct=buildIndex([{id:'jesus',title:'예수 예수'},{id:'power',title:'능력의 이름 예수'}]);
assert.equal(resolve('능력의 이름 예수',distinct).song.id,'power');
assert.equal(resolve('568 선한 목자 되신 주',reviewed).status,'hymn-number');
console.log('PASS: third-service special exclusions and evidence-backed aliases');
