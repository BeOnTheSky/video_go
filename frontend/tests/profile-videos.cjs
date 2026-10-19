const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync(path.join(__dirname, '../pages/user/[id].vue'), 'utf8');
const script = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]).replace(/^import .*$/gm, '');
function setup(id = 700) {
  const requests = [], route = { params: { id }, query: { tab: 'videos' } };
  let unmount;
  const context = vm.createContext({
    Error, Map,
    ref: value => ({ value }), reactive: value => value,
    computed: read => ({ get value() { return read(); } }),
    watch() {}, onMounted() {}, onUnmounted(callback) { unmount = callback; }, definePageMeta() {},
    useRoute: () => route, useRouter: () => ({}), useUserStore: () => ({ userInfo: null }), useToast: () => ({ showToast() {} }),
    useApi: () => ({ get: (url, params) => new Promise((resolve, reject) => requests.push({ url, params, resolve, reject })) }),
  });
  vm.runInContext(script + '\nglobalThis.state = { videos, videosTotal, videosPage, videosError, filteredVideos, searchStopped, searchUserVideos, loadingVideos, loadingMoreVideos, fetchVideos, loadMoreVideos, searchRemainingVideos, continueVideos, retryVideos, fetchFavorites, publicFavorites, loadingFavorites, favVideos };', context);
  return { s: context.state, requests, route, unmount: () => unmount() };
}
const items = (start, count) => Array.from({ length: count }, (_, i) => ({ id: start + i, title: start + i === 13 ? 'Needle Thirteen' : `Video ${start + i}` }));
const data = (list, total) => ({ items: list, total, page_size: 12 });
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  {
    const { s, requests: r } = setup();
    const first = s.fetchVideos(); r[0].resolve(data(items(1, 12), 13)); await first;
    assert.equal(s.videosTotal.value, 13);
    const next = s.loadMoreVideos(); assert.equal(r[1].params.page, 2);
    r[1].resolve(data([items(1, 1)[0], items(13, 1)[0]], 13)); await next;
    assert.equal(s.videos.value.length, 13);
    assert.equal(s.videos.value[12].title, 'Needle Thirteen');
  }
  {
    const { s, requests: r } = setup();
    const first = s.fetchVideos(); r[0].resolve(data(items(1, 12), 13)); await first;
    s.searchUserVideos.value = 'Needle';
    const search = s.searchRemainingVideos();
    r[1].resolve(data(items(13, 1), 13)); await search;
    assert.equal(s.filteredVideos.value.length, 1);
    assert.equal(s.filteredVideos.value[0].id, 13);
    assert.equal(r[1].params.q, undefined);
  }
  {
    const { s, requests: r } = setup();
    const first = s.fetchVideos(); r[0].resolve(data(items(1, 12), 25)); await first;
    s.searchUserVideos.value = 'Needle';
    const search = s.searchRemainingVideos(); s.searchStopped.value = true;
    r[1].resolve(data(items(13, 12), 25)); await search;
    assert.equal(r.length, 2);
    s.continueVideos(); assert.equal(r[2].params.page, 3);
    r[2].resolve(data(items(25, 1), 25)); await tick();
    assert.equal(s.videos.value.length, 25);
  }
  {
    const { s, requests: r } = setup();
    const first = s.fetchVideos(); r[0].resolve(data(items(1, 12), 13)); await first;
    s.searchUserVideos.value = 'Needle';
    const search = s.searchRemainingVideos(); r[1].reject(new Error('page failed')); await search;
    assert.equal(s.videosError.value, 'page failed');
    assert.equal(s.videosPage.value, 1);
    s.retryVideos(); assert.equal(r[2].params.page, 2);
    r[2].resolve(data(items(13, 1), 13)); await tick();
    assert.equal(s.filteredVideos.value[0].id, 13);
    assert.equal(s.videosError.value, '');
  }
  for (const fails of [false, true]) {
    const old = setup(), fresh = setup(701);
    const first = old.s.fetchVideos(); old.requests[0].resolve(data(items(1, 12), 13)); await first;
    const pending = old.s.loadMoreVideos(); old.unmount();
    const current = fresh.s.fetchVideos(); fresh.requests[0].resolve(data([{ id: 900, title: 'Other user' }], 1)); await current;
    if (fails) old.requests[1].reject(new Error('old user failed'));
    else old.requests[1].resolve(data(items(13, 1), 999));
    await pending;
    assert.equal(fresh.s.videos.value.length, 1);
    assert.equal(fresh.s.videos.value[0].title, 'Other user');
    assert.equal(old.s.videosTotal.value, 13);
    assert.equal(old.s.videosError.value, '');
  }
  {
    const { s, requests: r, unmount } = setup();
    const pending = s.fetchFavorites();
    assert.equal(r[0].url, '/api/v1/users/700/favorites');
    r[0].resolve(Array.from({ length: 7 }, (_, index) => ({ id: index + 1, name: `Folder ${index + 1}` })));
    await pending;
    assert.equal(s.loadingFavorites.value, false, 'Directory must render before first slow preview');
    assert.equal(s.publicFavorites.value.length, 7);
    assert.equal(r.length, 2);
    for (let index = 1; index <= 5; index++) {
      r[index].resolve({ items: [] }); await tick();
    }
    assert.equal(r.length, 6, 'Preview only the original first five folders');
    const next = s.fetchFavorites();
    r[6].resolve([{ id: 100, name: 'New folder' }]); await next;
    const oldPreview = r.at(-1);
    unmount(); oldPreview.resolve({ items: [{ id: 800, title: 'Old preview' }] }); await tick();
    assert.equal(s.favVideos[100], undefined, 'Unmounted preview must not mutate folder contents');
  }
  console.log('Passed: pagination/local search, stop/resume/error recovery, stale user responses, immediate public favorites directory, five previews, and stale preview lifecycle.');
})().catch(error => { console.error(error); process.exitCode = 1; });
