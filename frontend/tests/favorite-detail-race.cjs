const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(require('node:path').join(__dirname, '../pages/favorites/[id].vue'), 'utf8');
const script = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]).replace(/^import .*$/gm, '');
function setup() {
  const requests = [], route = { params: { id: '1' } };
  let unmount;
  const context = vm.createContext({
    Error, ref: value => ({ value }), computed: read => ({ get value() { return read(); } }),
    useRoute: () => route, useRouter: () => ({}), useUserStore: () => ({}),
    useApi: () => ({ get: (url, params) => new Promise((resolve, reject) => requests.push({ url, params, resolve, reject })) }),
    watch() {}, onMounted() {}, onUnmounted: callback => { unmount = callback; },
  });
  vm.runInContext(script + '\nglobalThis.state = { fetchDetail, fetchVideos, videos, favorite, page, error, loading, loadingVideos };', context);
  return { s: context.state, requests, route, unmount: () => unmount() };
}
const detail = id => ({ favorite: { id, name: `Folder ${id}` }, items: [{ id }], total: 1 });
(async () => {
  const t = setup();
  const old = t.s.fetchDetail();
  t.route.params.id = '2';
  const current = t.s.fetchDetail();
  t.requests[1].resolve(detail(2)); await current;
  t.requests[0].resolve(detail(1)); await old;
  assert.equal(t.s.favorite.value.id, 2, 'Old folder response must not overwrite new folder');
  t.s.page.value = 2;
  const slowPage = t.s.fetchVideos();
  t.s.page.value = 3;
  const latestPage = t.s.fetchVideos();
  t.requests[3].resolve(detail(3)); await latestPage;
  t.requests[2].reject(new Error('old failure')); await slowPage;
  assert.equal(t.s.videos.value[0].id, 3);
  assert.equal(t.s.error.value, '');
  const failure = t.s.fetchVideos();
  t.requests[4].reject(new Error('temporary failure')); await failure;
  assert.equal(t.s.error.value, 'temporary failure');
  assert.equal(t.s.loadingVideos.value, false);
  const retry = t.s.fetchDetail();
  t.requests[5].resolve(detail(2)); await retry;
  assert.equal(t.s.error.value, '');
  const leaving = t.s.fetchDetail(); t.unmount();
  t.requests[6].resolve(detail(7)); await leaving;
  assert.equal(t.s.favorite.value.id, 2);
  console.log('Passed: folder navigation/pagination races, stale failures, visible errors/retry, unmount protection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
