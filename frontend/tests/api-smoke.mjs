// Read-only HTTP contract smoke tests against a running Xilixili Go backend.
// Run: API_BASE=http://127.0.0.1:18081 node tests/api-smoke.mjs
// Tests do not create accounts, upload videos or mutate backend state.
const base = (process.env.API_BASE || 'http://127.0.0.1:8080').replace(/\/$/, '')
const tests = [
  ['分类列表', '/api/v1/categories/', data => Array.isArray(data)],
  ['视频列表', '/api/v1/videos/?page=1&page_size=3', data => Array.isArray(data?.items) && typeof data.total === 'number'],
  ['热门推荐', '/api/v1/videos/hot?page=1&page_size=3', data => Array.isArray(data?.items) && typeof data.total === 'number'],
  ['日排行榜', '/api/v1/videos/ranking?period=day&page=1&page_size=3', data => Array.isArray(data?.items) && typeof data.total === 'number'],
  ['周排行榜', '/api/v1/videos/ranking?period=week&page=1&page_size=3', data => Array.isArray(data?.items) && typeof data.total === 'number'],
  ['总排行榜', '/api/v1/videos/ranking?period=total&page=1&page_size=3', data => Array.isArray(data?.items) && typeof data.total === 'number'],
  ['搜索列表', '/api/v1/search/?q=Go&page=1&page_size=3', data => Array.isArray(data?.items)],
  ['搜索建议', '/api/v1/search/suggestions?q=Go&limit=3', data => Array.isArray(data)],
]
let pass = 0
for (const [name, endpoint, validate] of tests) {
  try {
    const response = await fetch(base + endpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
    const body = await response.json()
    if (!response.ok || ![200, 201].includes(body.code) || !validate(body.data)) {
      throw new Error(`HTTP ${response.status}, code=${body?.code}, data 与前端类型不匹配`)
    }
    console.log(`PASS ${name} ${endpoint}`)
    pass++
  } catch (err) {
    console.error(`FAIL ${name} ${endpoint}: ${err.message}`)
  }
}
console.log(`\n结果：${pass}/${tests.length} 通过；目标后端：${base}`)
if (pass !== tests.length) process.exitCode = 1
