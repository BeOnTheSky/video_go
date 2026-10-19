const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.UI_BASE_URL || 'https://localhost:8443';
const output = path.resolve(process.env.UI_OUTPUT_DIR || '../.local/session-expiry');
fs.mkdirSync(output, { recursive: true });
const user = { id: 92001, username: 'session_fixture', nickname: 'Session fixture', avatar: '', bio: '', role: 1, created_at: '2026-10-01T00:00:00Z' };

(async () => {
  const browser = await chromium.launch();
  const report = { checks: [], errors: [] };
  try {
    for (const mode of ['direct-401', 'csrf-retry-401']) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
      let expired = false;
      let writes = 0;
      let loggedIn = true;
      await context.route('**/api/**', async route => {
        const request = route.request();
        const p = new URL(request.url()).pathname;
        let data = {};
        let status = 200;
        let message = 'success';
        const headers = {};
        if (p.endsWith('/auth/me')) { data = user; if (!loggedIn) status = 401; }
        else if (p.endsWith('/auth/login')) { expired = false; loggedIn = true; data = user; }
        else if (p.endsWith('/csrf-token')) { data = { token: 'fixture-csrf' }; headers['Set-Cookie'] = 'csrf_token=fixture-csrf; Path=/; Secure; SameSite=Lax'; }
        else if (p === '/api/v1/history/') { data = { items: [], total: 0, page: 1, page_size: 20 }; if (expired) { status = 401; loggedIn = false; } }
        else if (p === '/api/v1/users/92001' && request.method() === 'PUT') { writes++; if (writes === 1) { status = 403; message = 'CSRF token expired'; } else { status = 401; loggedIn = false; } }
        else if (p === '/api/v1/users/92001') data = user;
        else if (p.endsWith('/profile')) data = { user, stats: { videos: 0, followers: 0, following: 0 } };
        else if (p === '/api/v1/favorites/') data = [];
        else if (p === '/api/v1/categories/') data = [];
        else if (p.includes('/notifications/')) data = { items: [], total: 0, unread: 0 };
        else if (p.includes('/videos/')) data = { items: [], total: 0, page: 1, page_size: 12 };
        else { status = 404; message = 'Unhandled fixture path: ' + p; }
        await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify({ code: status, message, data }) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      if (mode === 'direct-401') {
        await page.goto(base + '/');
        await page.getByTitle('观看历史', { exact: true }).waitFor();
        expired = true;
        await page.getByTitle('观看历史', { exact: true }).click();
      } else {
        await page.goto(base + '/user/92001');
        await page.getByRole('button', { name: '编辑资料', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
      }
      await page.waitForURL(url => url.pathname === '/login');
      const intended = mode === 'direct-401' ? '/history' : '/user/92001';
      assert.equal(new URL(page.url()).searchParams.get('redirect'), intended);
      if (mode === 'csrf-retry-401') assert.equal(writes, 2);
      await page.getByPlaceholder('用户名或邮箱').fill(user.username);
      await page.getByPlaceholder('请输入密码', { exact: true }).fill('FixturePassword123');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.waitForURL(url => url.pathname === intended);
      await page.screenshot({ path: path.join(output, mode + '.png'), fullPage: true });
      report.checks.push(mode + ': clears stale store, reaches login and returns after login');
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { report.failure = error.stack; throw error; }
  finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
