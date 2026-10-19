const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function setup(file, count, query = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../pages', file + '.vue'), 'utf8');
  const script = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]).replace(/^import .*$/gm, '');
  const requests = [], mounted = [], timers = [], watchers = [], navigations = [];
  const items = Array.from({length:count}, (_, i) => ({id:i+1,title:`fixture-${i+1}`}));
  const route = {query};
  const user = {isLoggedIn:true};
  const context = vm.createContext({Error, ref:value=>({value}),computed:read=>({get value(){return read();}}),useRoute:()=>route,useUserStore:()=>user,
    onMounted:fn=>mounted.push(fn),onUnmounted(){},watch:(read,fn)=>watchers.push({read,fn}),
    setInterval:fn=>{timers.push(fn);return 1;},clearInterval(){},navigateTo:target=>navigations.push(target),
    useApi:()=>({get:(url,params)=>{requests.push({url,params});return url.includes('categories')?new Promise(()=>{}):Promise.resolve({items,total:count});}}),
  });
  const exported = file === 'index' ? '{ videos, featuredVideos, currentFeatured, activeTab, displayTabs, moveFeatured, fetchVideos, switchTab }' : '{ videos, fetchRanking }';
  vm.runInContext(script+'\nglobalThis.state='+exported,context);
  return {state:context.state,source,requests,mounted,timers,watchers,items,route,user,navigations};
}
(async()=>{
  for(const count of [0,1,2,4,13]) {
    for(const page of ['index','ranking']) {
      const x=setup(page,count);
      await (page==='index'?x.state.fetchVideos():x.state.fetchRanking());
      assert.deepEqual(Array.from(x.state.videos.value,v=>v.id),x.items.map(v=>v.id));
      assert.match(x.source,page==='index'?/v-for="video in videos"/:/v-for="\(video, index\) in videos"/);
      assert.doesNotMatch(x.source,/gridVideos|videos\.slice\(3\)|videos\.slice\(1, 3\)/);
      if(page==='index') assert.equal(x.state.featuredVideos.value.length,Math.min(count,4));
    }
  }
  const x=setup('index',2,{category_id:'1'});
  x.mounted.forEach(fn=>fn());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(x.requests[0].url,'/api/v1/videos/');
  assert.equal(x.requests[1].url,'/api/v1/categories/');
  assert.equal(x.state.videos.value.length,2,'pending category request must not block videos');
  assert.equal(x.state.displayTabs.value.length,3);
  for(const tab of ['hot','following','latest']) {
    x.state.activeTab.value=tab; await x.state.fetchVideos();
    const req=x.requests.at(-1);
    assert.equal(req.url,tab==='hot'?'/api/v1/videos/hot':tab==='following'?'/api/v1/feed':'/api/v1/videos/');
    assert.equal(req.params.category_id,tab==='latest'?1:undefined);
  }
  x.state.activeTab.value='hot';
  for(let i=0;i<12;i++) { x.timers[0](); assert.ok(x.state.currentFeatured.value); }
  x.state.moveFeatured(-1); assert.ok(x.state.currentFeatured.value);
  x.state.switchTab('latest');
  assert.equal(x.navigations.at(-1).query.category_id,1);
  console.log('Passed: 0/1/2/4/13 items retain API order and full card loops; four featured items; two-item carousel; category tabs/parameters; slow category does not block videos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
