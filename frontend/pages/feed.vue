<template>
  <div class="studio-page studio-feed">
    <!-- Header -->
    <header class="studio-page-head studio-page-head--feature">
      <div><span class="studio-page-head__eyebrow">YOUR CIRCLE / FOLLOWING</span>
        <h1>关注动态<span class="studio-page-head__dot">.</span></h1>
        <p>不错过你喜欢的创作者，每一次更新都在这里。</p>
      </div>
      <span class="studio-page-head__index" aria-hidden="true">FOLLOW / FEED</span>
    </header>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Error -->
    <ErrorMessage
      v-else-if="error"
      :message="error"
      :on-retry="fetchFeed"
    />

    <!-- Video grid -->
    <div v-else-if="videos.length > 0">
      <div class="studio-library-grid">
        <VideoCard
          v-for="video in videos"
          :key="video.id"
          :video="video"
        />
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center mt-10">
        <button
          class="px-8 py-2.5 bg-[var(--color-surface)] text-[var(--color-text)] text-sm font-medium rounded-[var(--radius-full)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-secondary)]/30 transition-all duration-[var(--transition-normal)] disabled:opacity-50 active:scale-[0.98]"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else
      message="关注一些 UP 主，这里会显示他们的最新视频"
      icon="👥"
    />
  </div>
</template>

<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useUserStore } from '~/stores/userStore'
import type { VideoInfo, PaginatedData } from '~/types'
import VideoCard from '~/components/video/VideoCard.vue'

const { get } = useApi()
definePageMeta({ middleware: 'auth' })
const userStore = useUserStore()
const router = useRouter()

const videos = ref<VideoInfo[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const currentPage = ref(1)
const totalVideos = ref(0)
const pageSize = 12

const hasMore = computed(() => videos.value.length < totalVideos.value)

async function fetchFeed() {
  loading.value = true
  error.value = ''
  currentPage.value = 1

  try {
    const data = await get<PaginatedData<VideoInfo>>('/api/v1/feed', { page: 1, page_size: pageSize })
    videos.value = data.items || []
    totalVideos.value = data.total || 0
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载关注动态失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++

  try {
    const data = await get<PaginatedData<VideoInfo>>('/api/v1/feed', { page: currentPage.value, page_size: pageSize })
    videos.value.push(...(data.items || []))
    totalVideos.value = data.total || 0
  } catch {
    currentPage.value--
  } finally {
    loadingMore.value = false
  }
}

// Redirect to login if not authenticated (feed requires auth)
onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.replace('/login')
    return
  }
  fetchFeed()
})
</script>
