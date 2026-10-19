const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(require('node:path').join(__dirname, '../components/comment/CommentList.vue'), 'utf8');
const script = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]).replace(/^import .*$/gm, '');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const requests = [], props = { videoId: 1 };
  let unmount;
  const context = vm.createContext({ Error, Set,
    ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }),
    defineProps: () => props, useUserStore: () => ({}), watch() {}, onMounted() {}, onUnmounted: fn => { unmount = fn; },
    useApi: () => ({ get: (url, params) => new Promise((resolve, reject) => requests.push({ url, params, resolve, reject })) }),
  });
  vm.runInContext(script + '\nglobalThis.state = { fetchComments, total, commentCount, countFailed, comments };', context);
  return { s: context.state, requests, props, unmount: () => unmount() };
}
(async () => {
  const t = setup();
  const initial = t.s.fetchComments();
  t.requests[0].resolve({ items: [{ id: 1, replies: [{ id: 2 }, { id: 3, replies: [{ id: 4 }] }, { id: 4 }] }], total: 1 });
  await initial;
  assert.equal(t.s.commentCount.value, 4, 'Count all replies without duplicate IDs');
  assert.equal(t.s.total.value, 1, 'Pagination must still use root count');
  const roots = Array.from({ length: 51 }, (_, i) => ({ id: 100 + i, replies: [{ id: 1000 + i }] }));
  const many = t.s.fetchComments();
  t.requests[1].resolve({ items: roots.slice(0, 20), total: 51 }); await many;
  assert.equal(t.s.comments.value.length, 20, 'Visible list is not replaced by counting requests');
  assert.equal(t.requests[2].params.page_size, 50);
  t.requests[2].resolve({ items: roots.slice(0, 50), total: 51 }); await flush();
  assert.equal(t.requests[3].params.page, 2);
  t.requests[3].resolve({ items: roots.slice(50), total: 51 }); await flush();
  assert.equal(t.s.commentCount.value, 102);
  assert.equal(t.s.total.value, 51);
  const old = t.s.fetchComments();
  t.requests[4].resolve({ items: roots.slice(0, 20), total: 51 }); await old;
  const refresh = t.s.fetchComments();
  t.requests[6].resolve({ items: [{ id: 8, replies: [{ id: 9 }] }], total: 1 }); await refresh;
  t.requests[5].resolve({ items: roots.slice(0, 50), total: 51 }); await flush();
  assert.equal(t.s.commentCount.value, 2, 'Stale count cannot overwrite refreshed result');
  const failure = t.s.fetchComments();
  t.requests[7].resolve({ items: roots.slice(0, 20), total: 51 }); await failure;
  t.requests[8].reject(new Error('temporary failure')); await flush();
  assert.equal(t.s.commentCount.value, null, 'Failure must not display root-only or partial total');
  assert.equal(t.s.countFailed.value, true);
  const empty = t.s.fetchComments(); t.requests[9].resolve({ items: [], total: 0 }); await empty;
  assert.equal(t.s.commentCount.value, 0);
  const leaving = t.s.fetchComments(); t.unmount();
  t.requests[10].resolve({ items: roots, total: 51 }); await leaving;
  assert.equal(t.s.commentCount.value, 0);
  console.log('Passed: root/reply totals, nested duplicate protection, 51-root pagination, stale refresh/unmount, failure and zero count.');
})().catch(error => { console.error(error); process.exitCode = 1; });
