<template>
  <div class="studio-page studio-profile">
    <LoadingSpinner v-if="loadingUser" />
    <ErrorMessage v-else-if="error" :message="error" :on-retry="fetchAll" />
    <div v-else-if="user">
      <div class="studio-profile-banner relative mb-6">
        <div class="studio-profile-banner__body">
          <div class="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <!-- Avatar -->
            <div class="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[var(--color-primary)] text-xl font-bold flex-shrink-0 overflow-hidden ring-4 ring-[var(--color-bg)] relative group"
              :class="isOwner ? 'cursor-pointer' : ''" @click="isOwner ? triggerAvatarUpload() : undefined">
              <div v-if="avatarUploading" class="w-full h-full bg-black/40 flex items-center justify-center">
                <svg class="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <img v-else-if="user.avatar" :src="user.avatar" class="w-full h-full object-cover" />
              <span v-else>{{ (user.nickname || user.username).charAt(0) }}</span>
              <div v-if="isOwner && !avatarUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span class="text-white text-[10px] font-medium text-center leading-tight">更换<br>头像</span>
              </div>
            </div>
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handleAvatarFile" />

            <div class="studio-profile-identity flex-1 min-w-0 text-center sm:text-left">
              <h1 class="text-xl font-bold text-[var(--color-text)] font-display">{{ user.nickname || user.username }}</h1>
              <p class="text-sm text-[var(--color-text-secondary)]">@{{ user.username }} · 注册于 {{ formatTime(user.created_at) }}</p>
              <p class="studio-profile-bio" :class="{ 'studio-profile-bio--empty': !user.bio }">{{ user.bio || '暂未填写个人简介' }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button v-if="!isOwner && userStore.isLoggedIn"
                class="px-5 py-2 text-sm font-medium rounded-full transition-all active:scale-[0.98]"
                :class="isFollowing ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]' : 'bg-[var(--color-primary)] text-[#10200e] shadow-sm shadow-[var(--color-primary)]/25'"
                @click="toggleFollow">{{ isFollowing ? '已关注' : '关注' }}</button>
              <button v-if="isOwner && !editing"
                class="px-4 py-2 text-sm font-medium rounded-full border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all active:scale-[0.98] flex items-center gap-1.5"
                @click="startEditing">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑资料
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit modal -->
      <AppModal :visible="editing" title="编辑资料" @close="editing = false">
        <div class="space-y-4">
          <div><label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">昵称</label><input v-model="editForm.nickname" type="text" maxlength="50" class="w-full h-10 px-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all" /></div>
          <div><label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">签名</label><textarea v-model="editForm.bio" maxlength="500" rows="3" class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all resize-none" /></div>
          <div class="flex gap-2">
            <button class="px-6 py-2 bg-[var(--color-primary)] text-[#10200e] text-sm font-medium rounded-full hover:bg-[var(--color-primary-hover)] active:scale-[0.98]" @click="saveProfile">保存</button>
            <button class="px-6 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text)] text-sm font-medium rounded-full hover:bg-[var(--color-border)] active:scale-[0.98]" @click="editing = false">取消</button>
          </div>
        </div>
      </AppModal>

      <!-- Tab bar with stats -->
      <div class="studio-profile-tabs flex items-center gap-4 border-b border-[var(--color-border)] mb-6">
        <div class="flex gap-4 flex-shrink-0">
          <button v-for="tab in tabs" :key="tab.key"
            class="pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5"
            :class="activeTab === tab.key ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text)]'"
            @click="router.replace({ query: { ...route.query, tab: tab.key } })">
            <span v-html="tab.icon" />
            <span>{{ tab.label }}</span>
          </button>
        </div>
        <div class="hidden md:flex items-center flex-1 max-w-xs">
          <div class="w-full h-9 bg-[var(--color-surface-hover)] rounded-full border border-[var(--color-border)]/50 flex items-center px-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--color-text-secondary)] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="searchUserVideos" type="search" placeholder="搜索视频" aria-label="搜索此用户的视频" class="flex-1 min-w-0 bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none ml-2" @keyup.enter="router.replace({ query: { tab: 'videos' } })" />
          </div>
        </div>
        <div class="hidden sm:flex items-center gap-3 text-xs text-[var(--color-text-secondary)] pb-3 flex-shrink-0 ml-auto">
          <span>关注 {{ stats.following }}</span>
          <span class="text-[var(--color-border)]/50">|</span>
          <span>粉丝 {{ stats.followers }}</span>
          <span class="text-[var(--color-border)]/50">|</span>
          <span>投稿 {{ stats.videos }}</span>
        </div>
      </div>

      <!-- Home overview -->
      <div v-if="activeTab === 'home'">
        <div class="min-w-0 space-y-8">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-[var(--color-text)]">投稿 · {{ videosTotal }}</h3>
            </div>
            <div v-if="videos.length > 0" class="studio-profile-home-videos">
              <div v-for="v in videos.slice(0, 5)" :key="v.id" class="min-w-0"><VideoCard :video="v" /></div>
            </div>
            <EmptyState v-else message="还没有发布视频" />
          </div>
          <div v-if="publicFavorites.length > 0">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-[var(--color-text)]">收藏</h3>
            </div>
            <div class="flex gap-4 overflow-x-auto pb-2">
              <NuxtLink v-for="fav in publicFavorites.slice(0, 5)" :key="fav.id" :to="`/favorites/${fav.id}`"
                class="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden group">
                <img v-if="favVideos[fav.id]?.[0]?.cover_url" :src="favVideos[fav.id][0].cover_url" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div v-else class="w-full h-full bg-[var(--color-surface-hover)]" />
                <div class="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div class="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <p class="text-sm font-medium">{{ fav.name }}</p>
                  <p class="text-xs text-white/70 mt-0.5">{{ fav.item_count }} 个视频</p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- 投稿 Tab -->
      <div v-if="activeTab === 'videos'">
        <LoadingSpinner v-if="loadingVideos" />
        <div v-else-if="filteredVideos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <VideoCard v-for="v in filteredVideos" :key="v.id" :video="v" />
        </div>
        <EmptyState v-else-if="!videosError && !loadingMoreVideos && (!searchUserVideos.trim() || !hasMoreVideos)" :message="searchUserVideos.trim() ? '没有匹配的视频' : '还没有发布视频'" />
        <div v-if="videosError" role="alert" class="mt-4 flex items-center justify-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <span>{{ videosError }}</span>
          <button class="text-[var(--color-primary)] hover:underline" @click="retryVideos">重试</button>
        </div>
        <div v-if="!loadingVideos && hasMoreVideos && !videosError" class="mt-6 flex items-center justify-center gap-4">
          <span v-if="searchUserVideos.trim()" class="text-sm text-[var(--color-text-secondary)]">已搜索 {{ videos.length }} / {{ videosTotal }}</span>
          <button v-if="searchingAllVideos && !searchStopped" class="px-4 py-2 text-sm text-[var(--color-text)]" @click="searchStopped = true">停止搜索</button>
          <button v-else class="px-4 py-2 text-sm text-[var(--color-primary)] disabled:opacity-40" :disabled="loadingMoreVideos" @click="continueVideos">{{ loadingMoreVideos ? '加载中...' : searchUserVideos.trim() ? '继续搜索' : '加载更多' }}</button>
        </div>
      </div>

      <!-- 收藏 Tab -->
      <div v-if="activeTab === 'favorites'">
        <LoadingSpinner v-if="loadingFavorites" />
        <div v-else-if="publicFavorites.length > 0" class="space-y-8">
          <div v-for="fav in publicFavorites" :key="fav.id">
            <div class="flex items-center justify-between mb-3">
              <NuxtLink :to="`/favorites/${fav.id}`" class="text-base font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]">{{ fav.name }} · {{ fav.item_count }}</NuxtLink>
            </div>
            <div v-if="favVideos[fav.id]?.length" class="flex gap-4 overflow-x-auto pb-2">
              <div v-for="v in favVideos[fav.id].slice(0, 5)" :key="v.id" class="w-52 flex-shrink-0">
                <VideoCard :video="v" />
              </div>
            </div>
            <p v-else-if="favPreviewLoading[fav.id]" class="text-sm text-[var(--color-text-secondary)]">加载中...</p>
            <NuxtLink v-else-if="!favVideos[fav.id]" :to="`/favorites/${fav.id}`" class="text-sm text-[var(--color-primary)] hover:underline">查看收藏夹</NuxtLink>
            <p v-else class="text-sm text-[var(--color-text-secondary)]">收藏夹暂无视频</p>
          </div>
        </div>
        <EmptyState v-else :message="isOwner ? '暂无收藏夹' : '暂无公开收藏夹'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserInfo, VideoInfo, PaginatedData, ProfileResp, FollowResp, FavoriteInfo } from '~/types'
import { useApi } from '~/composables/useApi'
import { useUserStore } from '~/stores/userStore'
import { useToast } from '~/composables/useToast'
import VideoCard from '~/components/video/VideoCard.vue'
import AppModal from '~/components/common/AppModal.vue'
import EmptyState from '~/components/common/EmptyState.vue'

const { get, put, post } = useApi()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { showToast } = useToast()
definePageMeta({ key: route => route.path })

const user = ref<UserInfo | null>(null)
const videos = ref<VideoInfo[]>([])
const videosTotal = ref(0)
const videosPage = ref(0)
const videosPageSize = 12
const loadingMoreVideos = ref(false)
const videosError = ref('')
const searchingAllVideos = ref(false)
const searchStopped = ref(false)
let videosRequest = 0
let disposed = false
const loadingUser = ref(true)
const loadingVideos = ref(true)
const loadingFavorites = ref(false)
const error = ref('')
const editing = ref(false)
const activeTab = computed(() => ['videos', 'favorites'].includes(String(route.query.tab)) ? String(route.query.tab) : 'home')
const searchUserVideos = ref('')
const isFollowing = ref(false)
const publicFavorites = ref<FavoriteInfo[]>([])
const favVideos = reactive<Record<number, VideoInfo[]>>({})
const favPreviewLoading = reactive<Record<number, boolean>>({})
let favoritesRequest = 0
const avatarUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const stats = ref({ videos: 0, followers: 0, following: 0 })
const editForm = ref({ nickname: '', bio: '' })
const userId = computed(() => Number(route.params.id))
const filteredVideos = computed(() => videos.value.filter(video => video.title.toLowerCase().includes(searchUserVideos.value.trim().toLowerCase())))
const hasMoreVideos = computed(() => videosPage.value * videosPageSize < videosTotal.value)
const isOwner = computed(() => userStore.userInfo?.id === userId.value)
const favSummary = computed(() => publicFavorites.value.slice(0, 3))

const homeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
const videoIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`
const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`

const tabs = computed(() => [
  { key: 'home', label: '主页', icon: homeIcon },
  { key: 'videos', label: `投稿 (${videosTotal.value})`, icon: videoIcon },
  { key: 'favorites', label: '收藏', icon: starIcon },
])

async function fetchAll() { await fetchUser(); if (!user.value || error.value) return; await Promise.all([fetchVideos(), fetchProfile(), fetchFavorites(), fetchFollowState()]) }
async function fetchUser() {
  loadingUser.value = true; error.value = ''
  try { user.value = await get<UserInfo>(`/api/v1/users/${userId.value}`) }
  catch (err) { error.value = err instanceof Error ? err.message : '加载用户信息失败' }
  finally { loadingUser.value = false }
}
async function fetchProfile() {
  try { const data = await get<ProfileResp>(`/api/v1/users/${userId.value}/profile`); stats.value = data.stats }
  catch { /* */ }
}
async function fetchVideos() {
  const requestId = ++videosRequest
  const id = userId.value
  loadingVideos.value = true
  videosError.value = ''
  try {
    const data = await get<PaginatedData<VideoInfo>>(`/api/v1/videos/users/${id}/videos`, { status: 1, page: 1, page_size: videosPageSize })
    if (disposed || requestId !== videosRequest || id !== userId.value) return
    videos.value = data.items || []
    videosTotal.value = data.total || 0
    videosPage.value = 1
  } catch (err) {
    if (!disposed && requestId === videosRequest) videosError.value = err instanceof Error ? err.message : '加载投稿失败'
  } finally {
    if (!disposed && requestId === videosRequest) {
      loadingVideos.value = false
      searchRemainingVideos()
    }
  }
}
async function loadMoreVideos(): Promise<boolean> {
  if (disposed || loadingVideos.value || loadingMoreVideos.value || !hasMoreVideos.value) return false
  const requestId = videosRequest
  const id = userId.value
  const nextPage = videosPage.value + 1
  loadingMoreVideos.value = true
  videosError.value = ''
  try {
    const data = await get<PaginatedData<VideoInfo>>(`/api/v1/videos/users/${id}/videos`, { status: 1, page: nextPage, page_size: videosPageSize })
    if (disposed || requestId !== videosRequest || id !== userId.value) return false
    videosTotal.value = data.total || 0
    if (!data.items?.length && (nextPage - 1) * videosPageSize < videosTotal.value) throw new Error('投稿列表未完整加载，请重试')
    videos.value = [...new Map([...videos.value, ...(data.items || [])].map(video => [video.id, video])).values()]
    videosPage.value = nextPage
    return true
  } catch (err) {
    if (!disposed && requestId === videosRequest) videosError.value = err instanceof Error ? err.message : '加载投稿失败'
    return false
  } finally {
    if (!disposed && requestId === videosRequest) {
      loadingMoreVideos.value = false
      searchRemainingVideos()
    }
  }
}
async function searchRemainingVideos() {
  if (searchingAllVideos.value || loadingVideos.value) return
  searchingAllVideos.value = true
  try {
    while (!disposed && activeTab.value === 'videos' && searchUserVideos.value.trim() && !searchStopped.value && hasMoreVideos.value && !videosError.value) {
      if (!await loadMoreVideos()) break
    }
  } finally {
    searchingAllVideos.value = false
  }
}
function continueVideos() {
  searchStopped.value = false
  if (searchUserVideos.value.trim()) searchRemainingVideos()
  else loadMoreVideos()
}
function retryVideos() {
  videosError.value = ''
  if (videosPage.value === 0) fetchVideos()
  else continueVideos()
}
watch(searchUserVideos, () => { searchStopped.value = false; searchRemainingVideos() })
watch(activeTab, () => { if (activeTab.value === 'videos') searchRemainingVideos() })
onUnmounted(() => { disposed = true; videosRequest++ })
async function fetchFavorites() {
  if (disposed) return
  const requestId = ++favoritesRequest
  const id = userId.value
  loadingFavorites.value = true
  try {
    const data = await get<FavoriteInfo[]>(`/api/v1/users/${id}/favorites`)
    if (disposed || requestId !== favoritesRequest || id !== userId.value) return
    publicFavorites.value = data || []
    for (const key of Object.keys(favVideos)) delete favVideos[Number(key)]
    for (const key of Object.keys(favPreviewLoading)) delete favPreviewLoading[Number(key)]
  } catch {
    if (!disposed && requestId === favoritesRequest) publicFavorites.value = []
  } finally {
    if (!disposed && requestId === favoritesRequest) loadingFavorites.value = false
  }
  if (disposed || requestId !== favoritesRequest || id !== userId.value) return
  loadFavoritePreviews(publicFavorites.value.slice(0, 5), requestId, id)
}
async function loadFavoritePreviews(favorites: FavoriteInfo[], requestId: number, id: number) {
  for (const fav of favorites) favPreviewLoading[fav.id] = true
  for (const fav of favorites) {
    if (disposed || requestId !== favoritesRequest || id !== userId.value) return
    try {
      const data = await get<{ items: VideoInfo[] }>(`/api/v1/favorites/${fav.id}`, { page_size: 5 })
      if (disposed || requestId !== favoritesRequest || id !== userId.value) return
      favVideos[fav.id] = data?.items || []
    } catch {
      // Keep the folder link available when its optional preview cannot load.
    } finally {
      if (!disposed && requestId === favoritesRequest && id === userId.value) favPreviewLoading[fav.id] = false
    }
  }
}
async function fetchFollowState() {
  isFollowing.value = false
  if (!userStore.userInfo || isOwner.value) return
  let page = 1
  while (true) {
    try {
      const data = await get<{ items: { id: number }[]; total: number }>(`/api/v1/users/${userStore.userInfo.id}/following`, { page, page_size: 50 })
      if (data.items?.some(user => user.id === userId.value)) { isFollowing.value = true; return }
      if (!data.items?.length || page * 50 >= data.total) return
      page++
    } catch { return }
  }
}
async function toggleFollow() {
  if (!userStore.isLoggedIn) { showToast('请先登录', 'error'); return }
  try { const data = await post<FollowResp>(`/api/v1/users/${userId.value}/follow`); isFollowing.value = data.following; stats.value.followers += data.following ? 1 : -1 }
  catch (err) { showToast(err instanceof Error ? err.message : '操作失败', 'error') }
}
function startEditing() { if (!user.value) return; editForm.value.nickname = user.value.nickname || ''; editForm.value.bio = user.value.bio || ''; editing.value = true }
async function saveProfile() {
  try { const updated = await put<UserInfo>(`/api/v1/users/${userId.value}`, { nickname: editForm.value.nickname, bio: editForm.value.bio }); user.value = updated; userStore.userInfo = { ...updated, role: userStore.userRole }; editing.value = false; showToast('资料已更新', 'success') }
  catch (err) { showToast(err instanceof Error ? err.message : '更新失败', 'error') }
}
function triggerAvatarUpload() { fileInput.value?.click() }
async function handleAvatarFile(event: Event) {
  const target = event.target as HTMLInputElement; const file = target.files?.[0]; if (!file) return
  if (file.size > 2 * 1024 * 1024) { showToast('文件大小不能超过 2MB', 'error'); target.value = ''; return }
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { showToast('仅支持 JPEG、PNG、WebP', 'error'); target.value = ''; return }
  avatarUploading.value = true
  try {
    const fd = new FormData(); fd.append('avatar', file)
    const updated = await post<UserInfo>(`/api/v1/users/${userId.value}/avatar`, fd)
    user.value = updated
    if (userStore.userInfo && updated.avatar) userStore.userInfo.avatar = updated.avatar
    showToast('头像已更新', 'success')
  } catch (err) { showToast(err instanceof Error ? err.message : '头像上传失败', 'error') }
  finally { avatarUploading.value = false; target.value = '' }
}
function formatTime(d: string) { return new Date(d).toLocaleDateString('zh-CN') }
onMounted(() => { fetchAll() })
</script>
