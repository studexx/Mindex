const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const ctx = {Promise, Set, console, chunkArray: (a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n))};
vm.createContext(ctx);
for(const name of ['fetchSupabasePaged','fetchSupabaseBatches','attachRelationalSongVersions','loadSongs']){
 const a=source.indexOf(`async function ${name}(`);
 vm.runInContext(source.slice(a,source.indexOf('\n}\n',a)+2),ctx);
}
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let statusUpdates=0;
 ctx.songLoadPromise=null; ctx.loadSongsOnce=async()=>{};
 ctx.renderLoadingStatus=()=>{statusUpdates++;assert.equal(ctx.songLoadPromise,null)};
 await ctx.loadSongs();assert.equal(statusUpdates,1);
 let active=0,peak=0;
 const ids=Array.from({length:321},(_,i)=>i);
 const rows=await ctx.fetchSupabaseBatches([...ids,0],async batch=>{
  active++;peak=Math.max(peak,active);await pause(batch[0]===0?15:2);active--;return batch;
 });
 assert.equal(peak,3);assert.deepEqual(Array.from(rows),ids,'all rows in input order despite out-of-order completion');
 assert.equal((await ctx.fetchSupabaseBatches([],()=>assert.fail())).length,0);
 let settled=0,calls=0;
 await assert.rejects(ctx.fetchSupabaseBatches(ids,async batch=>{
  calls++;await pause(batch[0]===0?1:10);settled++;if(batch[0]===0)throw Error('offline');return batch;
 }),/offline/);
 assert.equal(settled,3,'wait for in-flight requests before fallback');assert.equal(calls,3,'do not start later groups after failure');
 const all=Array.from({length:2301},(_,id)=>({id}));let ranges=[];
 ctx.state={client:{from:()=>({select:()=>({range:async (a,b)=>{ranges.push([a,b]);return {data:all.slice(a,b+1),error:null}}})})}};
 const paged=await ctx.fetchSupabasePaged('units');assert.equal(paged.length,2301);assert.equal(ranges.length,3);
 let published=false,finished=[];
 ctx.state={client:{from:table=>({select(){return this},order(){return this},table})}};
 ctx.fetchAllRows=async make=>{const table=make().table;await pause(table.endsWith('units')?15:2);finished.push(table);return {data:table.endsWith('units')?[{lyrics:'preserved'}]:[{praise_types:['ccm']}],error:null}};
 ctx.isUnavailableRelationError=()=>true;ctx.yieldToBrowser=async()=>{};
 ctx.attachRelationalSongVersionRows=(v,u)=>{published=true;assert.equal(finished.length,2);assert.equal(u[0].lyrics,'preserved')};
 await ctx.attachRelationalSongVersions();assert.ok(published);
 published=false;ctx.fetchAllRows=async make=>({data:[],error:make().table.endsWith('units')?Error('missing units'):null});
 await ctx.attachRelationalSongVersions();assert.equal(published,false,'never replace hydrated songs with incomplete data');assert.equal(ctx.state.songVersionTablesSupported,false);
 console.log('PASS: bounded concurrency, deduplication/order, complete pagination, settled failures and atomic version/lyrics publication');
})().catch(e=>{console.error(e);process.exitCode=1});
