<template>
  <div class="discover-page">
    <nav class="discover-categories" aria-label="视频分类">
      <NuxtLink to="/" class="discover-category" :class="{ active: !categoryId && activeTab === 'hot' }">为你精选</NuxtLink>
      <NuxtLink to="/?view=latest" class="discover-category" :class="{ active: !categoryId && activeTab === 'latest' }">最新上线</NuxtLink>
      <NuxtLink v-for="cat in categories" :key="cat.id" :to="`/?category_id=${cat.id}`" class="discover-category" :class="{ active: categoryId === cat.id }">{{ cat.name }}</NuxtLink>
    </nav>

    <div class="discover-toolbar">
      <div>
        <p class="discover-eyebrow"><span class="discover-live-dot"/> DISCOVER / 为你发现</p>
        <h1>发现这一刻的<span>好内容</span><span class="discover-h1-mark">✳</span></h1>
      </div>
      <div class="discover-tabs" role="tablist" aria-label="视频排序">
        <button v-for="tab in displayTabs" :key="tab.key" role="tab" :aria-selected="activeTab === tab.key" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
          <UIIcon :name="tab.key === 'hot' ? 'flame' : tab.key === 'latest' ? 'clock' : 'users'" :size="16" />{{ tab.label }}
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorMessage v-else-if="error" :message="error" :on-retry="fetchVideos" />
    <template v-else-if="videos.length">
      <div v-if="activeTab === 'hot'" class="discover-feature-grid" :class="{ 'discover-feature-grid--single': !secondaryFeatured.length }">
        <div class="discover-hero" :style="heroStyle">
          <div class="discover-hero__atmosphere"></div>
          <div class="discover-hero__topline">
            <span class="discover-hero__tag"><span class="discover-live-dot" /> 本周精选</span>
            <span class="discover-hero__number">{{ String(featuredIndex + 1).padStart(2,'0') }} / {{ String(featuredVideos.length).padStart(2,'0') }}</span>
          </div>
          <div class="discover-hero__content">
            <span class="discover-hero__kicker">EDITOR'S PICK <span class="discover-hero__divider">—</span> 值得一看</span>
            <h2>{{ currentFeatured?.title }}</h2>
            <p v-if="currentFeatured?.description" class="discover-hero__description">{{ currentFeatured.description }}</p>
            <div class="discover-hero__meta"><span>{{ currentFeatured?.user?.nickname || currentFeatured?.user?.username || '优质创作者' }}</span><i></i><UIIcon name="eye" :size="15"/> {{ formatViews(currentFeatured?.views || 0) }} 次观看</div>
            <div class="discover-hero__actions">
              <NuxtLink :to="`/video/${currentFeatured?.id}`" class="discover-hero__watch"><UIIcon name="play" :size="18"/> 立即观看 <UIIcon name="arrow" :size="17"/></NuxtLink>
              <span class="discover-hero__duration" v-if="currentFeatured?.duration">{{ formatDuration(currentFeatured.duration) }}</span>
            </div>
          </div>
          <div class="discover-hero__paging" v-if="featuredVideos.length > 1">
            <button v-for="(_, i) in featuredVideos" :key="i" type="button" :aria-label="`展示精选视频 ${i + 1}`" :class="{ active: featuredIndex === i }" @click="featuredIndex = i"></button>
          </div>
          <button v-if="featuredVideos.length > 1" type="button" class="absolute left-3 top-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60" aria-label="上一个精选视频" @click="moveFeatured(-1)"><UIIcon name="arrow" :size="18" class="rotate-180" /></button>
          <button v-if="featuredVideos.length > 1" type="button" class="absolute right-3 top-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60" aria-label="下一个精选视频" @click="moveFeatured(1)"><UIIcon name="arrow" :size="18" /></button>
        </div>
        <aside v-if="secondaryFeatured.length" class="discover-aside" aria-label="更多精选视频">
          <div class="discover-aside__title"><span><UIIcon name="sparkles" :size="18"/> 正在被发现</span><small>CURATED FOR YOU</small></div>
          <NuxtLink v-for="(video, i) in secondaryFeatured" :key="video.id" :to="`/video/${video.id}`" class="discover-mini">
            <div class="discover-mini__cover" :style="coverStyle(video)"><span class="discover-mini__badge">0{{ i + 2 }}</span><span class="discover-mini__play"><UIIcon name="play" :size="18"/></span></div>
            <div class="discover-mini__copy"><b>{{ video.title }}</b><span>{{ video.user?.nickname || video.user?.username || '创作者' }} <span>·</span> {{ formatViews(video.views) }} 播放</span></div>
          </NuxtLink>
          <div class="discover-aside__bottom">下一段精彩，正在发生 <UIIcon name="arrow" :size="16"/></div>
        </aside>
      </div>

      <div class="discover-section-head">
        <div><span class="discover-section-kicker">EXPLORE MORE</span><h2>{{ sectionTitle }}<span class="discover-section-accent">.</span></h2></div>
        <div class="discover-section-head__right"><span>{{ totalVideos }} 条视频</span><NuxtLink to="/ranking" class="discover-rank-link">浏览排行榜 <UIIcon name="arrow" :size="16"/></NuxtLink></div>
      </div>
      <div class="discover-video-grid">
        <VideoCard v-for="video in videos" :key="video.id" :video="video" />
      </div>
      <div v-if="hasMore" class="discover-load-more"><button :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '正在加载…' : '加载更多内容' }} <UIIcon name="arrow" :size="17"/></button></div>
    </template>
    <EmptyState v-else message="这里暂时还没有视频，去看看其他分类吧" />
  </div>
</template>

<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useUserStore } from '~/stores/userStore'
import type { VideoInfo, PaginatedData, Category } from '~/types'
import VideoCard from '~/components/video/VideoCard.vue'
import UIIcon from '~/components/common/UIIcon.vue'

const { get } = useApi()
const route = useRoute()
const userStore = useUserStore()
const videos = ref<VideoInfo[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const currentPage = ref(1)
const totalVideos = ref(0)
const pageSize = 12
const categoryId = computed(() => Number(route.query.category_id || 0) || 0)
function tabFromRoute() {
  if (route.query.view === 'hot' || route.query.view === 'latest') return route.query.view
  if (route.query.view === 'following') return userStore.isLoggedIn ? 'following' : 'hot'
  return categoryId.value ? 'latest' : 'hot'
}
const activeTab = ref(tabFromRoute())
const featuredIndex = ref(0)
const featuredVideos = computed(() => videos.value.slice(0, 4))
const currentFeatured = computed(() => featuredVideos.value[featuredIndex.value] || featuredVideos.value[0])
const secondaryFeatured = computed(() => featuredVideos.value.filter((_, i) => i !== featuredIndex.value).slice(0, 2))
const hasMore = computed(() => videos.value.length < totalVideos.value)
const displayTabs = computed(() => [
  { key: 'hot', label: '为你推荐' },
  { key: 'latest', label: '最新发布' },
  ...(userStore.isLoggedIn ? [{ key: 'following', label: '我的关注' }] : []),
])
const sectionTitle = computed(() => activeTab.value === 'following' ? '关注动态' : categoryId.value ? (categories.value.find(c => c.id === categoryId.value)?.name || '分类精选') : activeTab.value === 'latest' ? '最新发布' : '继续探索')
const heroStyle = computed(() => currentFeatured.value?.cover_url ? { backgroundImage: `url("${currentFeatured.value.cover_url.replaceAll('"','%22')}")` } : {})
function coverStyle(video: VideoInfo) { return video.cover_url ? { backgroundImage: `url("${video.cover_url.replaceAll('"','%22')}")` } : {} }
function formatViews(v: number) { return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v) }
function formatDuration(s: number) { return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(Math.floor(s % 60)).padStart(2,'0')}` }
function switchTab(tab: string) {
  if (tab === activeTab.value) { fetchVideos(); return }
  navigateTo({ path: '/', query: { ...(categoryId.value ? { category_id: categoryId.value } : {}), view: tab } })
}
function moveFeatured(direction: number) {
  const count = featuredVideos.value.length
  featuredIndex.value = count ? (featuredIndex.value + direction + count) % count : 0
}
let featuredTimer: ReturnType<typeof setInterval> | null = null
let requestVersion = 0
function refreshOnReturn() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && activeTab.value === 'latest' && !loading.value && !loadingMore.value && currentPage.value === 1) fetchVideos()
}
async function fetchVideos() {
  const version = ++requestVersion
  loadingMore.value = false
  loading.value = true
  error.value = ''
  currentPage.value = 1
  featuredIndex.value = 0
  try {
    const params: Record<string, string | number> = { page: 1, page_size: pageSize }
    let endpoint = '/api/v1/videos/hot'
    if (activeTab.value === 'following') endpoint = '/api/v1/feed'
    else if (activeTab.value === 'latest') { endpoint = '/api/v1/videos/'; if (categoryId.value > 0) params.category_id = categoryId.value }
    const data = await get<PaginatedData<VideoInfo>>(endpoint, params)
    if (version !== requestVersion) return
    videos.value = data.items || []
    totalVideos.value = data.total || 0
  } catch (err) { if (version === requestVersion) error.value = err instanceof Error ? err.message : '加载视频列表失败' }
  finally { if (version === requestVersion) loading.value = false }
}
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const version = requestVersion
  currentPage.value++
  try {
    const params: Record<string, string | number> = { page: currentPage.value, page_size: pageSize }
    let endpoint = '/api/v1/videos/hot'
    if (activeTab.value === 'following') endpoint = '/api/v1/feed'
    else if (activeTab.value === 'latest') { endpoint = '/api/v1/videos/'; if (categoryId.value > 0) params.category_id = categoryId.value }
    const data = await get<PaginatedData<VideoInfo>>(endpoint, params)
    if (version !== requestVersion) return
    videos.value.push(...(data.items || []))
    totalVideos.value = data.total || 0
  } catch { if (version === requestVersion) currentPage.value-- }
  finally { if (version === requestVersion) loadingMore.value = false }
}
watch(() => [route.query.category_id, route.query.view], () => {
  const tab = tabFromRoute()
  if (tab !== activeTab.value) activeTab.value = tab
  else if (tab === 'latest') fetchVideos()
})
watch(activeTab, fetchVideos)
watch(() => userStore.isLoggedIn, loggedIn => {
  if (!loggedIn && activeTab.value === 'following') switchTab('hot')
})
onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('focus', refreshOnReturn)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refreshOnReturn)
  fetchVideos()
  get<Category[]>('/api/v1/categories/').then(data => { categories.value = data || [] }).catch(() => {})
  featuredTimer = setInterval(() => moveFeatured(1), 5000)
})
onUnmounted(() => {
  requestVersion++
  if (featuredTimer) clearInterval(featuredTimer)
  if (typeof window !== 'undefined') window.removeEventListener('focus', refreshOnReturn)
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refreshOnReturn)
})
</script>
