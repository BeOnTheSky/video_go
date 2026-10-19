const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.UI_BASE_URL || 'https://localhost:8443';
const output = path.resolve(process.env.UI_OUTPUT_DIR || '.local/profile-layout');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const actual = (await (await context.request.get(base + '/api/v1/videos/')).json()).data.items[0];
    const owner = { id: 99001, username: 'profile_fixture', nickname: 'Profile Test', bio: 'A short personal introduction.', created_at: '2026-10-18T00:00:00Z', role: 1, avatar: actual?.user?.avatar || '' };
    const videos = Array.from({ length: 4 }, (_, i) => ({ ...actual, id: 99010 + i, title: `Profile video ${i + 1}`, user: owner }));
    const errors = [];
    await context.route('**/api/**', async route => {
      const p = new URL(route.request().url()).pathname;
      let data = {};
      if (p.endsWith('/auth/me')) data = owner;
      else if (p.endsWith('/notifications/')) data = { items: [], unread: 0, total: 0 };
      else if (p === '/api/v1/users/99001') {
        if (route.request().method() === 'PUT') Object.assign(owner, route.request().postDataJSON());
        data = owner;
      } else if (p.endsWith('/profile')) data = { user: owner, stats: { videos: 4, followers: 0, following: 0 } };
      else if (p.endsWith('/favorites')) data = [];
      else if (p.includes('/videos/users/')) data = { items: videos, total: 4 };
      await route.fulfill({ json: { code: 200, data } });
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['dark', 'light']) {
        await page.addInitScript(theme => localStorage.setItem('xilixili-theme', theme), theme);
        owner.bio = width === 1920 ? 'A'.repeat(500) : 'A short personal introduction.\nA second line.';
        await page.goto(base + '/user/99001');
        await page.locator('.studio-profile-bio').waitFor();
        assert.equal(await page.locator('.studio-profile a[href="/upload"], .studio-profile a[href="/drafts"]').count(), 0);
        assert.equal(await page.locator('.studio-profile-home-videos .studio-video-card').count(), 4);
        const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, bio: document.querySelector('.studio-profile-bio').getBoundingClientRect().toJSON(), header: document.querySelector('.studio-profile-banner').getBoundingClientRect().toJSON() }));
        assert(bounds.scroll <= bounds.width + 1, 'No horizontal overflow');
        assert(bounds.bio.bottom <= bounds.header.bottom, 'Bio stays inside header');
        if (width !== 1920) assert(bounds.header.height < 220, 'No empty tall banner');
        await page.screenshot({ path: path.join(output, `${theme}-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole('button', { name: '编辑资料', exact: true }).click();
    await page.getByRole('dialog').locator('textarea').fill('Updated introduction');
    await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
    await page.getByText('Updated introduction', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Passed: no duplicate profile shortcuts; full-width videos; compact bio, 500-character wrapping; 3 desktop widths x 2 themes; edit updates bio without reload. All writes intercepted.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
