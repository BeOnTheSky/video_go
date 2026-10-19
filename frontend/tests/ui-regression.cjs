const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = process.env.UI_BASE_URL || 'https://localhost:8443';
const output = path.resolve(process.env.UI_OUTPUT_DIR || '../.local/frontend-audit');
const widths = process.env.UI_SKIP_MATRIX ? [] : process.env.UI_DESKTOP_ONLY ? [1280, 1440, 1920] : [320, 390, 768, 1440, 1920];
fs.mkdirSync(output, { recursive: true });
const report = { checks: [], screens: [], pageErrors: [], missingAssets: [], unhandled: [], layoutErrors: [] };
const user = { id: 91001, username: 'ui_test_user', nickname: '界面回归测试用户', bio: '测试简介', avatar: '', role: 3, created_at: '2026-10-01T12:00:00Z' };
const favorite = { id: 91001, name: '默认收藏夹', is_public: 1, item_count: 3 };
let cover = '';
const video = id => ({ id, title: `界面测试作品 ${id}：这是用于检查换行、渲染和点击跳转的长标题`, description: '测试简介\n第二行', cover_url: cover, video_url: '', duration: 120, file_size: 1024, category_id: 1, status: 1, views: 12345, created_at: user.created_at, updated_at: user.created_at, user });
const items = () => [video(91001), video(91002), video(91003), video(91004)];
const list = (values, query) => {
  const page = Number(query.get('page') || 1);
  const size = Number(query.get('page_size') || 12);
  return { items: values.slice((page - 1) * size, page * size), total: values.length, page, page_size: size };
};
function observe(page) {
  page.on('console', message => { if (/Failed to resolve component|Unhandled error|Hydration/.test(message.text())) report.pageErrors.push({ url: page.url(), message: message.text() }); });
  page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message }));
  page.on('response', response => {
    if (response.status() >= 400 && /\.(js|css|png|jpg|svg|webp)(\?|$)/.test(response.url())) report.missingAssets.push(`${response.status()} ${response.url()}`);
  });
}
async function open(page, route) {
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.locator('.studio-shell, .studio-auth').waitFor();
  await page.waitForTimeout(180);
}
async function holdFavorite(page) {
  await page.getByRole('button', { name: '收藏', exact: true }).hover();
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
}
async function snapshot(page, name) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
  const state = await page.evaluate(() => ({
    width: innerWidth, scroll: document.documentElement.scrollWidth,
    text: document.body.innerText.length,
    images: [...document.images].filter(img => img.complete && img.naturalWidth === 0 && img.getAttribute('src')).map(img => img.src),
    invalidLinks: [...document.querySelectorAll('a[href]')].filter(a => /undefined|NaN/.test(a.getAttribute('href'))).map(a => a.getAttribute('href')),
    overflow: [...document.querySelectorAll('header *,main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })).slice(0, 12),
  }));
  assert(state.text > 20, `Blank page: ${name}`);
  if (state.scroll > state.width + 1) report.layoutErrors.push({ name, ...state });
  assert.deepEqual(state.images, [], `Broken images: ${name}`);
  assert.deepEqual(state.invalidLinks, [], `Invalid links: ${name}`);
  report.screens.push({ name, ...state });
}
async function mock(context, options = {}) {
  const signedInUser = { ...user, role: options.role ?? user.role };
  const state = { loggedIn: options.loggedIn !== false, empty: false, fail: false, requests: [], comments: [], following: false, favorited: false };
  report.fixtureRequests = state.requests;
  if (context.routeWebSocket) await context.routeWebSocket('**/api/v1/ws/**', () => {});
  await context.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname;
    const q = url.searchParams;
    const method = request.method();
    state.requests.push({ path: p, query: url.search, method });
    let data;
    let status = 200;
    let message = 'success';
    if (p === '/api/v1/auth/me') { data = { ...signedInUser, role: undefined }; if (!state.loggedIn) status = 401; }
    else if (/\/auth\/(login|register)$/.test(p)) { state.loggedIn = true; data = user; }
    else if (p.endsWith('/auth/logout')) { state.loggedIn = false; data = {}; }
    else if (p.endsWith('/csrf-token')) data = { token: 'ui-test-csrf' };
    else if (state.fail && !p.includes('/notifications/')) { status = 503; message = '测试服务暂不可用'; }
    else if (p === '/api/v1/categories/') data = [{ id: 1, name: '动画', slug: 'anime' }, { id: 2, name: '音乐', slug: 'music' }];
    else if (p === '/api/v1/tags/' || /\/tags$/.test(p)) data = [];
    else if (p.endsWith('/search/suggestions')) data = [{ keyword: '测试作品', count: 4 }];
    else if (p.endsWith('/notifications/read-all')) { data = {}; state.read = true; }
    else if (/\/notifications\/\d+\/read$/.test(p)) data = {};
    else if (p === '/api/v1/notifications/') data = { ...list(state.empty ? [] : [{ id: 91001, type: 1, content: '测试评论通知', target_id: 91001, is_read: state.read ? 1 : 0, created_at: user.created_at, from_user: user }], q), unread: state.read || state.empty ? 0 : 1 };
    else if (p === '/api/v1/history/') data = list(state.empty ? [] : [{ video: video(91001), progress: 32, watched_at: user.created_at }], q);
    else if (/\/users\/\d+\/profile$/.test(p)) data = { user, stats: { videos: 4, followers: 2, following: 10 } };
    else if (/\/users\/\d+\/following$/.test(p)) data = { items: state.following ? [{ ...user, id: 91002 }] : [], total: state.following ? 1 : 0 };
    else if (/\/users\/\d+\/follow$/.test(p)) { state.following = !state.following; data = { following: state.following }; }
    else if (/\/users\/\d+\/favorites$/.test(p) || p === '/api/v1/favorites/') data = state.empty ? [] : [favorite];
    else if (/\/users\/\d+$/.test(p)) data = method === 'PUT' ? { ...user, ...request.postDataJSON() } : { ...user, id: Number(p.split('/').pop()) };
    else if (/\/favorites\/\d+\/items$/.test(p)) { state.favorited = !state.favorited; data = { favorited: state.favorited }; }
    else if (/\/favorites\/\d+$/.test(p)) data = { favorite, ...list(state.empty ? [] : (state.favorited ? items() : []), q) };
    else if (p.endsWith('/creator/stats')) data = { total_views: 12345, total_videos: 4, today_views: 20, today_new_fans: 1 };
    else if (p.endsWith('/admin/stats')) { if (signedInUser.role !== 3) status = 403; data = { total_users: 4, total_videos: 4, total_views: 12345, total_comments: 2, total_danmaku: 2, today_new_users: 1, today_new_videos: 1 }; }
    else if (p.endsWith('/admin/system')) data = { go_version: 'go1.25', uptime: '1h', db_connected: true };
    else if (p.endsWith('/admin/users')) data = list(state.empty ? [] : [user], q);
    else if (p.endsWith('/qualities') || p.endsWith('/danmaku')) data = [];
    else if (p.endsWith('/transcode-status')) data = { status: 2, progress: 100 };
    else if (p.endsWith('/play-url')) data = { play_url: base + '/__ui-test.mp4' };
    else if (p.endsWith('/interactions')) data = { liked: false, coins: 0, favorited: state.favorited };
    else if (p.endsWith('/like')) data = { liked: true, count: 1 };
    else if (p.endsWith('/coin')) data = { coins_today: 1 };
    else if (p.endsWith('/comments')) {
      if (method === 'POST') state.comments.push({ id: 91001, video_id: 91001, user_id: user.id, parent_id: 0, root_id: 0, likes: 0, created_at: user.created_at, user, content: request.postDataJSON().content });
      data = list(state.comments, q);
    }
    else if (/\/videos\/\d+$/.test(p)) data = { ...video(Number(p.split('/').pop())), ...(method === 'PUT' ? request.postDataJSON() : {}) };
    else if (p === '/api/v1/videos/' && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: complete\ndata: {"id":91001}\n\n' });
    }
    else if (/\/videos\/(hot|ranking)$/.test(p) || /\/videos\/users\/\d+\/videos$/.test(p) || ['/api/v1/videos/', '/api/v1/search/', '/api/v1/feed'].includes(p)) {
      let values = state.empty ? [] : items();
      if (q.get('category_id') === '2' || q.get('q') === '不存在的关键词') values = [];
      if (q.get('status') === '0') values = values.map(v => ({ ...v, status: 0 }));
      data = list(values, q);
    }
    else { report.unhandled.push(`${method} ${p}`); status = 404; message = 'Unmocked request'; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, message, data }) });
  });
  await context.route('**/__ui-test.mp4', route => process.env.UI_TEST_VIDEO ? route.fulfill({ path: process.env.UI_TEST_VIDEO, contentType: 'video/mp4' }) : route.fulfill({ status: 204 }));
  return state;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // Public pages use real services. The fixture contexts below never write to the database.
    const live = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
    const page = await live.newPage(); observe(page);
    const response = await live.request.get(base + '/api/v1/videos/?page_size=1');
    const actual = (await response.json()).data?.items?.[0];
    cover = actual?.cover_url || '';
    const routes = ['/', '/?view=latest', '/?category_id=1', '/ranking', '/search?q=不存在的关键词', '/login', '/register'];
    if (actual) routes.push(`/video/${actual.id}`, `/user/${actual.user.id}`);
    for (const route of routes) {
      await open(page, route);
      await page.waitForTimeout(250);
      assert.equal(new URL(page.url()).pathname, route.split('?')[0], `Unexpected redirect: ${route}`);
      await snapshot(page, 'live-' + route.replace(/[^a-z0-9]/gi, '_'));
    }
    if (actual) {
      await open(page, `/video/${actual.id}`);
      await page.locator('video').waitFor();
      await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1, { timeout: 20000 });
      report.checks.push('real guest video metadata loaded without redirect');
    }
    await live.close();

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const state = await mock(context);
    const app = await context.newPage(); observe(app);
    const matrix = ['/', '/?view=latest', '/?category_id=1', '/ranking', '/search', '/search?q=测试作品', '/user/91001', '/user/91001?tab=videos', '/user/91001?tab=favorites', '/favorites/91001', '/history', '/feed', '/notifications', '/upload', '/drafts', '/creator', '/admin', '/video/91001'];
    for (const width of widths) {
      await app.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
      for (const theme of ['dark', 'light']) {
        await app.addInitScript(theme => localStorage.setItem('xilixili-theme', theme), theme);
        for (let index = 0; index < matrix.length; index++) {
          await open(app, matrix[index]);
          await snapshot(app, `${theme}-${width}-${index}`);
          assert.equal(await app.locator('a[href="/creator"]').count(), 0, 'Redundant creator entry');
        }
      }
    }
    report.checks.push(`all page routes: ${widths.length} widths x 2 themes, populated fixtures`);

    await app.setViewportSize({ width: 1440, height: 1000 });
    await open(app, '/');
    await app.locator('.studio-sidebar a[href="/admin"]').waitFor();
    await app.evaluate(() => window.scrollTo(0, 700));
    await app.waitForTimeout(100);
    const sticky = await app.locator('.discover-categories').evaluate(el => ({ top: el.getBoundingClientRect().top, header: document.querySelector('.studio-header').getBoundingClientRect().bottom }));
    assert(Math.abs(sticky.top - sticky.header) <= 1, 'Category bar stays directly below fixed header');
    await app.evaluate(() => window.scrollTo(0, 0));
    await app.getByRole('tab', { name: '最新发布', exact: true }).click();
    await app.waitForURL('**/?view=latest');
    const latestBefore = state.requests.filter(r => r.path === '/api/v1/videos/').length;
    await app.getByRole('tab', { name: '最新发布', exact: true }).click();
    await app.waitForTimeout(100);
    assert(state.requests.filter(r => r.path === '/api/v1/videos/').length > latestBefore, 'Active latest tab refetches');
    const beforeFocus = state.requests.filter(r => r.path === '/api/v1/videos/').length;
    await app.evaluate(() => window.dispatchEvent(new Event('focus')));
    await app.waitForTimeout(100);
    assert(state.requests.filter(r => r.path === '/api/v1/videos/').length > beforeFocus, 'Returning to the latest list refetches first page');
    assert.equal(await app.locator('.discover-category.active').count(), 1);
    assert.equal(await app.locator('.studio-sidebar .studio-nav-item.active').count(), 1);
    await app.goBack();
    await app.waitForURL(base + '/');
    await app.locator('.discover-tabs button[aria-selected="true"]').filter({ hasText: '为你推荐' }).waitFor();
    await app.locator('.discover-categories').getByRole('link', { name: '音乐', exact: true }).click();
    await app.waitForURL('**/?category_id=2');
    await app.getByText('这里暂时还没有视频，去看看其他分类吧').waitFor();
    await app.getByTitle('收起侧边栏', { exact: true }).click();
    await app.locator('.studio-sidebar--collapsed').waitFor();
    await app.getByTitle('展开侧边栏', { exact: true }).click();
    await app.getByTitle('用户菜单', { exact: true }).click();
    await app.locator('.studio-account__menu').waitFor();
    await app.keyboard.press('Escape');
    await app.locator('.studio-account__menu').waitFor({ state: 'hidden' });
    assert.equal(await app.locator('.studio-account__menu').count(), 0);
    await app.getByRole('searchbox', { name: '搜索视频', exact: true }).fill('测试');
    await app.locator('.studio-suggestion').first().click();
    await app.waitForURL('**/search?q=*');
    assert.equal(new URL(app.url()).searchParams.get('q'), '测试作品');
    assert.equal(await app.getByRole('searchbox', { name: '搜索视频', exact: true }).inputValue(), '测试作品');
    report.checks.push('navigation selection, URL synchronization, back navigation, categories, collapse');

    await open(app, '/user/91001?tab=favorites');
    await app.getByRole('link', { name: '默认收藏夹 · 3', exact: true }).waitFor();
    await app.getByRole('button', { name: '投稿 (4)' }).click();
    await app.getByRole('searchbox', { name: '搜索此用户的视频' }).fill('没有这条视频');
    await app.getByText('没有匹配的视频').waitFor();
    await app.getByRole('button', { name: '编辑资料', exact: true }).click();
    await app.getByRole('dialog', { name: '编辑资料' }).waitFor();
    await app.keyboard.press('Escape');
    await app.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await app.getByRole('dialog').count(), 0);
    await open(app, '/user/91002');
    await app.getByRole('button', { name: '关注', exact: true }).waitFor();
    await app.getByRole('button', { name: '关注', exact: true }).click();
    await app.getByRole('button', { name: '已关注', exact: true }).waitFor();
    assert(state.following);
    report.checks.push('profile favorites deep link, video filtering, modal Escape, follow state');

    await open(app, '/video/91001');
    await app.getByRole('button', { name: '投币', exact: true }).click();
    await app.getByRole('dialog', { name: '投币', exact: true }).getByRole('button', { name: '1 枚', exact: true }).click();
    await app.getByRole('button', { name: '已投币', exact: true }).waitFor();
    await app.getByRole('dialog').waitFor({ state: 'hidden' });
    await app.getByRole('button', { name: '0', exact: true }).click();
    await app.getByRole('button', { name: '1', exact: true }).waitFor();
    await holdFavorite(app);
    await app.getByRole('dialog').waitFor();
    await app.getByRole('dialog').getByText('默认收藏夹', { exact: true }).click();
    await app.getByRole('dialog').getByRole('button', { name: '完成', exact: true }).click();
    assert(state.favorited);
    await app.getByPlaceholder('发一条友善的评论').fill('前端测试评论');
    await app.getByRole('button', { name: '发表评论', exact: true }).click();
    await app.locator('.comment-item').getByText('前端测试评论', { exact: true }).waitFor();
    await app.getByRole('button', { name: '弹幕', exact: true }).click();
    assert.equal(await app.getByPlaceholder('发送弹幕...').count(), 0);
    report.checks.push('video favorite picker, comment submission, danmaku toggle (mock writes only)');
    await app.getByRole('button', { name: '收藏', exact: true }).click();
    await app.getByRole('dialog', { name: '选择收藏夹' }).waitFor();
    await app.keyboard.press('Escape');

    await open(app, '/notifications');
    await app.getByText('测试评论通知', { exact: true }).click();
    await app.waitForURL('**/video/91001');
    await open(app, '/notifications');
    await app.getByRole('button', { name: '全部已读', exact: true }).click();
    await app.waitForTimeout(150);
    assert.equal(await app.getByRole('button', { name: '全部已读', exact: true }).count(), 0);
    await open(app, '/drafts');
    assert.equal(await app.getByRole('button', { name: '编辑', exact: true }).count(), 4, 'Published videos have edit controls');
    assert.equal(await app.getByRole('button', { name: '删除', exact: true }).count(), 4, 'Published videos have delete controls');
    await app.getByRole('button', { name: '删除', exact: true }).first().click();
    await app.getByRole('dialog', { name: '删除视频' }).waitFor();
    await app.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
    await app.getByRole('button', { name: '草稿', exact: true }).click();
    await app.getByRole('button', { name: '编辑', exact: true }).first().click();
    await app.getByRole('heading', { name: '编辑视频信息' }).waitFor();
    await app.getByRole('button', { name: '取消', exact: true }).click();
    await open(app, '/upload');
    const tagInput = app.getByPlaceholder('输入标签名后按回车添加');
    await tagInput.fill('标签甲'); await tagInput.press('Enter');
    await tagInput.fill('标签乙'); await tagInput.press('Enter');
    assert.equal(await app.locator('.studio-upload-fields span.inline-flex').count(), 2);
    await app.locator('.studio-upload-fields span.inline-flex').filter({ hasText: '标签甲' }).getByRole('button').click();
    assert.equal(await app.locator('.studio-upload-fields span.inline-flex').count(), 1);
    await app.locator('.studio-upload-fields span.inline-flex').getByRole('button').click();
    await app.locator('input[type=file]').first().setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('UI fixture only') });
    await app.getByPlaceholder('视频标题（最多100字）').fill('测试上传');
    await app.getByRole('button', { name: '上传视频', exact: true }).click();
    await app.waitForURL('**/drafts');
    report.checks.push('notifications, draft edit/cancel, upload SSE completion (mock writes only)');

    for (const route of ['/ranking', '/search?q=测试作品', '/history', '/feed', '/user/91001?tab=favorites', '/favorites/91001', '/drafts', '/notifications']) {
      state.empty = true;
      await open(app, route);
      await snapshot(app, 'empty-' + route.replace(/[^a-z0-9]/gi, '_'));
    }
    state.empty = false;
    state.fail = true;
    await open(app, '/search?q=测试作品');
    await app.getByRole('button', { name: '重试', exact: true }).waitFor();
    state.fail = false;
    await app.getByRole('button', { name: '重试', exact: true }).click();
    await app.locator('.studio-video-card').first().waitFor();
    report.checks.push('empty states and failed search retry');

    if (!process.env.UI_DESKTOP_ONLY) {
    await app.setViewportSize({ width: 390, height: 844 });
    await open(app, '/');
    await app.getByRole('button', { name: '更多', exact: true }).click();
    await app.locator('#studio-mobile-menu').waitFor();
    await app.locator('#studio-mobile-menu').getByRole('link', { name: '稿件管理', exact: true }).click();
    await app.waitForURL('**/drafts');
    assert.equal(await app.locator('#studio-mobile-menu').count(), 0);
    report.checks.push('mobile menu opens, navigates and closes');
    }
    await context.close();

    const guest = await browser.newContext({ ignoreHTTPSErrors: true });
    await mock(guest, { loggedIn: false });
    const login = await guest.newPage(); observe(login);
    for (const width of widths) {
      await login.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
      for (const theme of ['dark', 'light']) {
        await login.addInitScript(theme => localStorage.setItem('xilixili-theme', theme), theme);
        for (const route of ['/login', '/register']) { await open(login, route); await snapshot(login, `guest-${theme}-${width}-${route.slice(1)}`); }
      }
    }
    report.checks.push(`login and registration: ${widths.length} widths x 2 themes`);
    for (const route of ['/upload', '/drafts', '/notifications', '/history', '/feed', '/admin']) {
      await open(login, route);
      assert.equal(new URL(login.url()).pathname, '/login');
      assert.equal(new URL(login.url()).searchParams.get('redirect'), route);
    }
    await open(login, '/upload');
    await login.getByPlaceholder('用户名或邮箱').fill('ui_test_user');
    await login.getByPlaceholder('请输入密码', { exact: true }).fill('MockPassword123');
    await login.getByRole('button', { name: '登录', exact: true }).click();
    await login.waitForURL('**/upload');
    report.checks.push('guest route guards and login return to intended page');
    await guest.close();
    const registration = await browser.newContext({ ignoreHTTPSErrors: true });
    await mock(registration, { loggedIn: false, role: 1 });
    const signup = await registration.newPage(); observe(signup);
    await open(signup, '/register');
    await signup.getByPlaceholder('3-20位字母、数字或下划线').fill('ui_fixture_user');
    await signup.getByPlaceholder('请输入邮箱地址').fill('ui-fixture@example.invalid');
    await signup.getByPlaceholder('至少8位，包含字母和数字').fill('TestPassword123');
    await signup.getByPlaceholder('请再次输入密码').fill('WrongPassword123');
    await signup.getByRole('button', { name: '注册', exact: true }).click();
    await signup.getByText('两次输入的密码不一致', { exact: true }).waitFor();
    await signup.getByPlaceholder('请再次输入密码').fill('TestPassword123');
    await signup.getByRole('button', { name: '注册', exact: true }).click();
    await signup.waitForURL(url => url.pathname === '/');
    await registration.close();
    report.checks.push('registration validation and success, follow, like and coin controls');
    const regular = await browser.newContext({ ignoreHTTPSErrors: true });
    const regularState = await mock(regular, { role: 1 });
    const denied = await regular.newPage(); observe(denied);
    await open(denied, '/admin');
    await denied.getByText('当前账号没有管理权限', { exact: true }).waitFor();
    assert(!regularState.requests.some(request => request.path.includes('/admin/') && !request.path.endsWith('/admin/stats')));
    assert.equal(await denied.locator('a[href="/admin"]').count(), 0);
    await regular.close();
    report.checks.push('normal account cannot access admin controls or trigger admin queries');
    assert.deepEqual(report.pageErrors, [], 'Browser runtime exceptions');
    assert.deepEqual(report.missingAssets, [], 'Missing static assets');
    assert.deepEqual(report.unhandled, [], 'Unhandled fixture requests');
    assert.deepEqual(report.layoutErrors, [], 'Responsive layout issues');
    console.log(JSON.stringify({ checks: report.checks, screenshots: report.screens.length }, null, 2));
  } catch (error) {
    report.failure = error.stack;
    report.lastPages = [];
    for (const context of browser.contexts()) for (const page of context.pages()) {
      report.lastPages.push({ url: page.url(), text: await page.locator('body').innerText() });
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
