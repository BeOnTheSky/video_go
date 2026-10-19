const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.UI_BASE_URL || 'https://localhost:8443';
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
    const user = { id: 99001, username: 'fixture', role: 1 };
    const video = { id: 99002, title: 'Favorite picker test', user, status: 1, views: 0 };
    const comment = (id, parent = 0) => ({ id, video_id: video.id, user_id: user.id, user, content: `comment-${id}`, parent_id: parent, root_id: parent, likes: 0, created_at: '2026-10-19T00:00:00Z' });
    const roots = [{ ...comment(1), replies: [comment(2, 1), comment(3, 1), comment(4, 1)] }, comment(5)];
    let writes = 0, reads = 0;
    const errors = [];
    if (context.routeWebSocket) await context.routeWebSocket('**/api/v1/ws/**', () => {});
    await context.route('**/api/**', async route => {
      const p = new URL(route.request().url()).pathname;
      let data = {};
      if (!['GET', 'HEAD'].includes(route.request().method())) writes++;
      if (p.endsWith('/auth/me')) data = user;
      else if (p.endsWith('/notifications/')) data = { items: [], total: 0, unread: 0 };
      else if (p === '/api/v1/videos/99002') data = video;
      else if (p.endsWith('/play-url')) data = { play_url: '' };
      else if (p.endsWith('/interactions')) data = { favorited: false, liked: false, coins: 0 };
      else if (p === '/api/v1/favorites/') { reads++; data = [{ id: 99003, name: '默认收藏夹', is_public: 1 }]; }
      else if (p === '/api/v1/favorites/99003') data = { favorite: { id: 99003 }, items: [], total: 0, page_size: 50 };
      else if (p.endsWith('/qualities') || p.endsWith('/tags') || p.endsWith('/danmaku')) data = [];
      else if (p.endsWith('/transcode-status')) data = { status: 2, progress: 100 };
      else if (p.endsWith('/comments')) {
        if (route.request().method() === 'POST') {
          roots[0].replies.push({ ...comment(6, 1), content: route.request().postDataJSON().content });
        }
        data = { items: roots, total: 2, page: 1, page_size: 20 };
      }
      else if (p.endsWith('/comments/6')) roots[0].replies = roots[0].replies.filter(c => c.id !== 6);
      else if (p.endsWith('/comments') || p.endsWith('/history/') || p.endsWith('/hot')) data = { items: [], total: 0 };
      await route.fulfill({ json: { code: 200, data } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/video/99002');
    const button = page.getByRole('button', { name: '收藏', exact: true });
    await button.waitFor();
    await page.getByRole('heading', { name: '评论 (5)', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '选择收藏夹', exact: true }).count(), 0);
    const baselineWrites = writes;
    for (const gesture of ['click', 'hold', 'Enter', 'Space']) {
      const before = reads;
      if (gesture === 'click') await button.click();
      else if (gesture === 'hold') {
        await button.hover(); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
      } else { await button.focus(); await page.keyboard.press(gesture); }
      const dialog = page.getByRole('dialog', { name: '选择收藏夹' });
      await dialog.waitFor();
      await dialog.getByText('默认收藏夹', { exact: true }).waitFor();
      await page.waitForTimeout(100);
      assert.equal(reads, before + 1, gesture + ' opens picker exactly once');
      assert.equal(writes, baselineWrites, gesture + ' must not mutate favorites');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    }
    const root = page.locator('.comment-item').filter({ hasText: 'comment-1' });
    await root.getByRole('button', { name: '回复', exact: true }).first().click();
    await root.getByPlaceholder('回复 @fixture', { exact: true }).fill('new test reply');
    await root.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByRole('heading', { name: '评论 (6)', exact: true }).waitFor();
    await root.getByRole('button', { name: /展开更多回复/ }).click();
    page.on('dialog', dialog => dialog.accept());
    await root.getByRole('button', { name: '删除', exact: true }).last().click();
    await page.getByRole('heading', { name: '评论 (5)', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Passed: short click, long press, Enter and Space open picker once without favorite writes; no extra dropdown button; comment count includes replies and updates 5 -> 6 -> 5 on reply/delete.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
