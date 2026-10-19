const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(path.join(__dirname, '../pages/drafts.vue'), 'utf8');
const script = stripTypeScriptTypes(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]).replace(/^import .*$/gm, '');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const requests = [], timers = new Map();
  let timerId = 0, unmount;
  const context = vm.createContext({
    Error, Promise,
    ref: value => ({ value }), computed: read => ({ get value() { return read(); } }),
    watch() {}, definePageMeta() {}, onMounted() {}, onUnmounted(callback) { unmount = callback; },
    useUserStore: () => ({ userInfo: { id: 700 } }), useToast: () => ({ showToast() {} }),
    useApi: () => ({ get: (url, params) => new Promise((resolve, reject) => requests.push({ url, params, resolve, reject })) }),
    setInterval: callback => { timers.set(++timerId, { callback, repeat: true }); return timerId; },
    setTimeout: callback => { timers.set(++timerId, { callback, repeat: false }); return timerId; },
    clearInterval: id => timers.delete(id), clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(script + '\nglobalThis.state = { drafts, draftTranscodes, fetchVideos, startTranscodePolling };', context);
  return { s: context.state, requests, timers, unmount: () => unmount(), async tick() {
    assert.equal(timers.size, 1, 'Exactly one active poll timer');
    const [id, timer] = [...timers][0]; if (!timer.repeat) timers.delete(id);
    timer.callback(); await flush();
  } };
}
const video = (id = 901) => ({ id, status: 0, title: `Draft ${id}` });
const list = (items = [video()]) => ({ items, total: items.length });
async function load(t, rows) {
  const pending = t.s.fetchVideos(); t.requests.at(-1).resolve(list(rows)); await pending; await flush();
}
(async () => {
  {
    const t = setup(); await load(t);
    t.requests.at(-1).resolve({ status: 2, progress: 100 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], 'ready');
    await t.tick();
    assert.equal(t.requests.length, 3, 'Synthetic ready before task creation must not stop polling');
    assert.equal(t.timers.size, 0, 'No next poll is scheduled while status requests are in flight');
    t.requests.at(-1).resolve({ status: 0, progress: 0 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], '0');
    await t.tick(); t.requests.at(-1).resolve({ status: 1, progress: 45 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], '45');
    await t.tick(); t.requests.at(-1).resolve({ status: 2, progress: 100 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], 'ready');
    t.unmount(); assert.equal(t.timers.size, 0);
  }
  {
    const t = setup(); await load(t);
    t.requests.at(-1).reject(new Error('temporary 500')); await flush();
    assert.notEqual(t.s.draftTranscodes.value[901], 'ready', 'Request failure cannot be treated as complete');
    await t.tick(); t.requests.at(-1).resolve({ status: 1, progress: 20 }); await flush();
    await t.tick(); t.requests.at(-1).reject(new Error('temporary network failure')); await flush();
    assert.equal(t.s.draftTranscodes.value[901], '20', 'Keep last known progress on temporary failure');
    await t.tick(); t.requests.at(-1).resolve({ status: 2, progress: 100 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], 'ready');
  }
  {
    const t = setup(); await load(t);
    const oldStatus = t.requests.at(-1);
    await load(t, [video(901), video(902)]);
    const current = t.requests.filter(r => r.url.includes('transcode-status')).slice(-2);
    current[0].resolve({ status: 1, progress: 60 }); current[1].resolve({ status: 0, progress: 0 }); await flush();
    oldStatus.resolve({ status: 2, progress: 100 }); await flush();
    assert.equal(t.s.draftTranscodes.value[901], '60', 'Old list response cannot overwrite current progress');
    assert.equal(t.s.draftTranscodes.value[902], '0', 'New draft begins polling on list refresh');
    assert.equal(t.timers.size, 1);
    await t.tick();
    const late = t.requests.filter(r => r.url.includes('transcode-status')).slice(-2);
    t.unmount(); late.forEach(r => r.resolve({ status: 2, progress: 100 })); await flush();
    assert.equal(t.s.draftTranscodes.value[901], '60');
    assert.equal(t.timers.size, 0);
  }
  {
    const t = setup();
    const pending = t.s.fetchVideos(); t.unmount();
    t.requests[0].resolve(list()); await pending;
    assert.equal(t.s.drafts.value.length, 0);
    assert.equal(t.requests.length, 1, 'Late list response must not start status requests');
    assert.equal(t.timers.size, 0);
  }
  {
    const t = setup(); await load(t, []); assert.equal(t.timers.size, 0);
    t.unmount();
    const pending = t.s.fetchVideos();
    assert.equal(t.requests.length, 1, 'Unmounted page must not start new list or poll requests');
    await pending;
  }
  console.log('Passed: delayed task creation, pending/running/ready, temporary failure recovery, new drafts, stale list/unmount requests, and no overlapping poll timers.');
})().catch(error => { console.error(error); process.exitCode = 1; });
