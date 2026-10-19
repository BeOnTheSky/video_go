// No dependencies: verify public API method/path names against the Go route table.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const backend = resolve(process.cwd(), '../backend/internal/handler')
const frontend = resolve(process.cwd(), 'pages')
const cases = [
  ['video/routes.go', '/ranking', 'GET', 'ranking.vue', '/api/v1/videos/ranking'],
  ['video/routes.go', '/hot', 'GET', 'index.vue', '/api/v1/videos/hot'],
  ['video/routes.go', '/:id/play-url', 'GET', 'video/[id].vue', '/play-url'],
  ['search/routes.go', '/suggestions', 'GET', 'search.vue', '/api/v1/search/'],
  ['category/routes.go', '/', 'GET', 'upload.vue', '/api/v1/categories/'],
  ['history/routes.go', '/', 'GET', 'history.vue', '/api/v1/history/'],
  ['auth/routes.go', '/login', 'POST', '../stores/userStore.ts', '/api/v1/auth/login'],
  ['auth/routes.go', '/register', 'POST', '../stores/userStore.ts', '/api/v1/auth/register'],
  ['notification/routes.go', '/read-all', 'POST', 'notifications.vue', '/api/v1/notifications/read-all'],
  ['admin/routes.go', '/stats', 'GET', 'admin.vue', '/api/v1/admin/stats'],
  ['video/routes.go', '/', 'POST', 'upload.vue', '/api/v1/videos/'],
  ['follow/routes.go', '/feed', 'GET', 'feed.vue', '/api/v1/feed'],
]
let count = 0
for (const [goFile, subroute, verb, vueFile, clientURL] of cases) {
  const server = readFileSync(resolve(backend, goFile), 'utf8')
  const client = readFileSync(resolve(frontend, vueFile), 'utf8')
  if (!server.includes(`${verb}("${subroute}"`) || !client.includes(clientURL)) {
    console.error('FAIL', `${vueFile}: ${clientURL}`, `↔ ${goFile}: ${verb} ${subroute}`)
    process.exitCode = 1
  } else { console.log('PASS', vueFile, clientURL); count++ }
}
console.log(`${count}/${cases.length} 静态接口契约检查通过`)
