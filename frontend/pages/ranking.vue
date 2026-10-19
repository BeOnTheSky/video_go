<template>
  <div class="studio-page rank-page">
    <header class="rank-header">
      <div class="rank-header__intro">
        <div class="rank-overline"><span class="rank-overline__pulse" /> TRENDING NOW <span class="rank-overline__slash">/</span> 热门榜单</div>
        <h1>正在流行<span>.</span></h1>
        <p>发现此刻值得看的内容。每一份热爱，都有自己的高光时刻。</p>
      </div>
      <div class="rank-header__decoration" aria-hidden="true">HOT <span>100</span></div>
    </header>

    <div class="rank-toolbar">
      <div class="rank-periods" role="group" aria-label="排行榜时间范围">
        <button v-for="p in periods" :key="p.key" type="button" :aria-pressed="activePeriod === p.key"
          class="rank-period" :class="{ 'rank-period--active': activePeriod === p.key }"
          @click="activePeriod = p.key">
          {{ p.label }}
        </button>
      </div>
      <span class="rank-toolbar__summary">{{ periodDescription }} <span v-if="!loading && !error">· 共 {{ totalVideos }} 条视频</span></span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorMessage v-else-if="error" :message="error" :on-retry="fetchRanking" />
    <template v-else-if="videos.length">
      <div class="studio-library-grid">
        <div v-for="(video, index) in videos" :key="video.id" class="relative">
          <span class="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white" :aria-label="`第 ${index + 1} 名`">{{ index + 1 }}</span>
          <VideoCard :video="video" />
        </div>
      </div>
      <div v-if="hasMore" class="rank-load-more">
        <button type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '正在加载…' : '查看更多上榜作品' }} <UIIcon name="arrow" :size="17" /></button>
      </div>
    </template>
    <EmptyState v-else message="暂无排行榜数据" />
  </div>
</template>

<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import type { RankingData } from '~/types'
import VideoCard from '~/components/video/VideoCard.vue'
import UIIcon from '~/components/common/UIIcon.vue'

const { get } = useApi()
const periods = [{ key: 'day', label: '日榜' }, { key: 'week', label: '周榜' }, { key: 'total', label: '总榜' }]
const activePeriod = ref('day')
const videos = ref<RankingData['items']>([])
const totalVideos = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const currentPage = ref(1)
let requestVersion = 0
const pageSize = 12
const hasMore = computed(() => videos.value.length < totalVideos.value)
const periodDescription = computed(() => activePeriod.value === 'day' ? '今日热度' : activePeriod.value === 'week' ? '本周热度' : '累计热度')

async function fetchRanking() {
  const version = ++requestVersion
  loadingMore.value = false
  loading.value = true; error.value = ''; currentPage.value = 1
  try {
    const data = await get<RankingData>('/api/v1/videos/ranking', { period: activePeriod.value, page: 1, page_size: pageSize })
    if (version !== requestVersion) return
    videos.value = data.items || []; totalVideos.value = data.total || 0
  }
  catch (err) { if (version === requestVersion) error.value = err instanceof Error ? err.message : '加载排行榜失败' }
  finally { if (version === requestVersion) loading.value = false }
}
async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  const version = requestVersion
  loadingMore.value = true; currentPage.value++
  try {
    const data = await get<RankingData>('/api/v1/videos/ranking', { period: activePeriod.value, page: currentPage.value, page_size: pageSize })
    if (version !== requestVersion) return
    videos.value.push(...(data.items || [])); totalVideos.value = data.total || 0
  }
  catch { if (version === requestVersion) currentPage.value-- }
  finally { if (version === requestVersion) loadingMore.value = false }
}
watch(activePeriod, fetchRanking)
onMounted(fetchRanking)
</script>
