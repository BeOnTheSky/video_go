<template>
  <header class="studio-header">
    <NuxtLink to="/" class="studio-brand" aria-label="映界首页">
      <span class="studio-brand__mark"><UIIcon name="play" :size="20" /></span>
      <span class="studio-brand__type">映界<span class="studio-brand__en">VISIO</span></span>
    </NuxtLink>

    <div class="studio-search-wrap">
      <form class="studio-search" @submit.prevent="doSearch" role="search">
        <UIIcon name="search" :size="20" />
        <input v-model="searchQuery" type="search" placeholder="搜索视频…" aria-label="搜索视频" @input="onSearchInput" @focus="onSearchFocus" @blur="onSearchBlur" />
        <span class="studio-search__hint">发现更多灵感</span>
        <button type="submit" class="studio-search__submit">搜索</button>
      </form>
      <div v-if="showSuggestions && suggestions.length" class="studio-suggestions">
        <button v-for="item in suggestions" :key="item.keyword" class="studio-suggestion" @mousedown.prevent @click="selectSuggestion(item.keyword)">
          <UIIcon name="search" :size="16"/><span>{{ item.keyword }}</span>
          <span class="studio-suggestion__count" v-if="item.count">{{ item.count }} 播放</span>
        </button>
        <div class="studio-suggestions__label">搜索建议</div>
      </div>
    </div>

    <div class="studio-header__right">
      <NuxtLink to="/ranking" class="studio-header__action" title="排行榜"><UIIcon name="chart"/><span>排行</span></NuxtLink>
      <NuxtLink v-if="userStore.isLoggedIn" to="/notifications" class="studio-header__action studio-header__notification" title="消息通知">
        <UIIcon name="bell"/><span>消息</span>
        <b v-if="userStore.unreadCount > 0" class="studio-header__unread">{{ userStore.unreadCount > 99 ? '99+' : userStore.unreadCount }}</b>
      </NuxtLink>
      <button class="studio-header__action studio-header__theme" type="button" :title="isDark ? '切换浅色主题' : '切换深色主题'" @click="toggleTheme">
        <UIIcon :name="isDark ? 'sun' : 'moon'"/><span>主题</span>
      </button>
      <span class="studio-header__divider" />
      <NuxtLink to="/upload" class="studio-create"><UIIcon name="upload" :size="18"/><span>发布作品</span></NuxtLink>
      <template v-if="userStore.isLoggedIn && userStore.userInfo">
        <div ref="accountRef" class="studio-account">
          <button class="studio-avatar" title="用户菜单" type="button" :aria-expanded="showDropdown" @click="showDropdown = !showDropdown">
            <img v-if="userStore.userInfo.avatar" :src="userStore.userInfo.avatar" alt="用户头像"/>
            <span v-else>{{ (userStore.userInfo.nickname || userStore.userInfo.username || 'U').charAt(0) }}</span>
          </button>
          <div v-if="showDropdown" class="studio-account__menu">
            <div class="studio-account__profile">{{ userStore.userInfo.nickname || userStore.userInfo.username }}<small>@{{ userStore.userInfo.username }}</small></div>
            <NuxtLink :to="`/user/${userStore.userInfo.id}`" @click="showDropdown = false">我的主页</NuxtLink>
            <NuxtLink to="/drafts" @click="showDropdown = false">稿件管理</NuxtLink>
              <NuxtLink v-if="userStore.userRole >= 3" to="/admin" @click="showDropdown = false">管理后台</NuxtLink>
            <button type="button" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </template>
      <NuxtLink v-else to="/login" class="studio-login">登录</NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import UIIcon from '~/components/common/UIIcon.vue'
import { useUserStore } from '~/stores/userStore'
import { useToast } from '~/composables/useToast'
import { useTheme } from '~/composables/useTheme'
import { useApi } from '~/composables/useApi'
interface Suggestion { keyword: string; count: number }
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const { get } = useApi()
const { showToast } = useToast()
const { currentTheme, toggleTheme } = useTheme()
const isDark = computed(() => currentTheme.value === 'dark')
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const suggestions = ref<Suggestion[]>([])
const showSuggestions = ref(false)
const showDropdown = ref(false)
const accountRef = ref<HTMLElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
function doSearch() {
  const q = searchQuery.value.trim()
  showSuggestions.value = false
  if (!q) { router.push('/search'); return }
  const target = { path: '/search', query: { q } }
  if (route.path === '/search') router.replace(target)
  else router.push(target)
}
async function fetchSuggestions(q: string) {
  if (!q) { suggestions.value = []; showSuggestions.value = false; return }
  try {
    const data = await get<Suggestion[]>('/api/v1/search/suggestions', { q, limit: 8 }) || []
    if (searchQuery.value.trim() !== q) return
    suggestions.value = data
    showSuggestions.value = suggestions.value.length > 0
  } catch { suggestions.value = []; showSuggestions.value = false }
}
function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchSuggestions(searchQuery.value.trim()), 300)
}
function onSearchFocus() { if (blurTimer) clearTimeout(blurTimer); if (suggestions.value.length) showSuggestions.value = true }
function onSearchBlur() { blurTimer = setTimeout(() => { showSuggestions.value = false }, 180) }
function selectSuggestion(keyword: string) {
  if (blurTimer) clearTimeout(blurTimer)
  searchQuery.value = keyword
  suggestions.value = []; showSuggestions.value = false
  doSearch()
}
function onDocumentClick(event: MouseEvent) { if (!accountRef.value?.contains(event.target as Node)) showDropdown.value = false }
function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') { showDropdown.value = false; showSuggestions.value = false } }
async function handleLogout() {
  await userStore.logout()
  showDropdown.value = false
  showToast('已退出登录', 'info')
  router.push('/')
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
function startPolling() { stopPolling(); userStore.fetchUnread(); pollTimer = setInterval(() => userStore.fetchUnread(), 30_000) }
watch(() => userStore.isLoggedIn, loggedIn => { if (loggedIn) startPolling(); else { stopPolling(); userStore.clearUnread() } })
watch(() => route.fullPath, () => {
  showDropdown.value = false
  showSuggestions.value = false
  searchQuery.value = typeof route.query.q === 'string' ? route.query.q : ''
})
onMounted(() => { if (userStore.isLoggedIn) startPolling(); document.addEventListener('click', onDocumentClick); document.addEventListener('keydown', onEscape) })
onUnmounted(() => { [debounceTimer, blurTimer, closeTimer].forEach(id => { if (id) clearTimeout(id) }); stopPolling(); document.removeEventListener('click', onDocumentClick); document.removeEventListener('keydown', onEscape) })
</script>
