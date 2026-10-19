const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync(path.join(__dirname, '../pages/ranking.vue'), 'utf8');
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
const javascript = stripTypeScriptTypes(script).replace(/^import .*$/gm, '');

function setup() {
  const requests = [];
  const context = vm.createContext({
    Error,
    ref: value => ({ value }),
    computed: read => ({ get value() { return read(); } }),
    watch() {},
    onMounted() {},
    useApi: () => ({ get: (url, params) => new Promise((resolve, reject) => requests.push({ params, resolve, reject })) }),
  });
  vm.runInContext(javascript + '\nglobalThis.state = { activePeriod, videos, totalVideos, loading, loadingMore, error, currentPage, fetchRanking, loadMore };', context);
  return { state: context.state, requests };
}
const data = (title, total = 24) => ({ items: [{ id: title, title }], total });

(async () => {
  {
    const { state: s, requests: r } = setup();
    const day = s.fetchRanking();
    s.activePeriod.value = 'week';
    const week = s.fetchRanking();
    r[1].resolve(data('week')); await week;
    r[0].resolve(data('day')); await day;
    assert.equal(s.videos.value[0].title, 'week');
    assert.equal(s.totalVideos.value, 24);
  }
  {
    const { state: s, requests: r } = setup();
    const old = s.fetchRanking();
    s.activePeriod.value = 'week';
    const current = s.fetchRanking();
    r[0].reject(new Error('old failure')); await old;
    assert.equal(s.error.value, '');
    assert.equal(s.loading.value, true);
    r[1].resolve(data('week')); await current;
    assert.equal(s.loading.value, false);
  }
  for (const staleFails of [false, true]) {
    const { state: s, requests: r } = setup();
    const first = s.fetchRanking(); r[0].resolve(data('day')); await first;
    const oldPage = s.loadMore();
    assert.equal(r[1].params.page, 2);
    s.activePeriod.value = 'week';
    const refresh = s.fetchRanking();
    assert.equal(s.loadingMore.value, false);
    r[2].resolve(data('week')); await refresh;
    const newPage = s.loadMore();
    assert.equal(r[3].params.page, 2);
    if (staleFails) r[1].reject(new Error('old pagination failure'));
    else r[1].resolve(data('day-page-2', 999));
    await oldPage;
    assert.equal(s.videos.value.length, 1);
    assert.equal(s.totalVideos.value, 24);
    assert.equal(s.currentPage.value, 2);
    assert.equal(s.loadingMore.value, true);
    r[3].resolve(data('week-page-2')); await newPage;
    assert.equal(s.videos.value[1].title, 'week-page-2');
    assert.equal(s.loadingMore.value, false);
  }
  {
    const { state: s, requests: r } = setup();
    const first = s.fetchRanking(); r[0].resolve(data('day')); await first;
    const failed = s.loadMore(); r[1].reject(new Error('current pagination failure')); await failed;
    assert.equal(s.currentPage.value, 1);
    assert.equal(s.loadingMore.value, false);
    const retry = s.loadMore(); assert.equal(r[2].params.page, 2);
    r[2].resolve(data('day-page-2')); await retry;
    assert.equal(s.videos.value.length, 2);
  }
  console.log('Passed: stale ranking refresh, stale error/loading, stale pagination success/failure, and pagination retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
