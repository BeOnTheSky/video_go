<template>
  <div class="studio-page studio-drafts">
    <div class="studio-drafts__header flex items-center justify-between mb-8">
      <div class="studio-page-head studio-page-head--inline"><span class="studio-page-head__eyebrow">CREATOR / STUDIO</span>
        <h1>稿件管理<span class="studio-page-head__dot">.</span></h1>
        <p>管理你的作品、查看转码状态与发布进度。</p>
      </div>
      <NuxtLink
        to="/upload"
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-[#10200e] text-sm rounded-[var(--radius-full)] hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        上传视频
      </NuxtLink>
    </div>

    <p v-if="lastPublishedId" class="mb-4 text-sm text-[var(--color-text-secondary)]" role="status">
      视频已发布。
      <NuxtLink to="/?view=latest" class="text-[var(--color-primary)] underline">查看最新发布</NuxtLink>
    </p>

    <!-- Status tabs -->
    <div class="studio-filter-tabs flex gap-2 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="[
          'px-5 py-2 text-sm font-medium rounded-[var(--radius-full)] transition-all duration-[var(--transition-normal)]',
          activeTab === tab.key
            ? 'bg-[var(--color-primary)] text-[#10200e] shadow-sm shadow-[var(--color-primary)]/25'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="loading" />

    <!-- Error -->
    <ErrorMessage
      v-else-if="error"
      :message="error"
      :on-retry="fetchVideos"
    />

    <!-- Video list -->
    <div v-else-if="drafts.length > 0" class="space-y-4">
      <div
        v-for="video in drafts"
        :key="video.id"
        class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-medium text-[var(--color-text)] truncate">{{ video.title }}</h3>
              <span
                :class="[
                  'inline-block px-2 py-0.5 text-xs rounded-[var(--radius-full)]',
                  video.status === 0
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                    : 'bg-green-900/30 text-green-400'
                ]"
              >
                {{ video.status === 0 ? '草稿' : '已发布' }}
              </span>
              <!-- Transcode status for draft videos -->
              <span
                v-if="video.status === 0 && draftTranscodes[video.id] !== 'ready'"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-[var(--radius-full)]',
                  draftTranscodes[video.id] === 'failed' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                ]"
              >
                <svg v-if="draftTranscodes[video.id] !== 'failed'" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                {{ transcodeLabel(draftTranscodes[video.id]) }}
              </span>
            </div>
            <p class="text-xs text-[var(--color-text-secondary)] mt-1">
              上传于 {{ formatTime(video.created_at) }} · {{ formatFileSize(video.file_size) }}
            </p>
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <template v-if="video.status === 1">
              <NuxtLink
                :to="`/video/${video.id}`"
                class="px-4 py-1.5 text-sm bg-[var(--color-primary)] text-[#10200e] rounded-[var(--radius-full)] hover:bg-[var(--color-primary-hover)] transition-colors inline-block"
              >
                查看
              </NuxtLink>
            </template>
            <template v-if="video.status === 1">
              <button class="px-4 py-1.5 text-sm bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-[var(--radius-full)]" @click="openEdit(video)">编辑</button>
              <button class="px-4 py-1.5 text-sm bg-red-900/30 text-[var(--color-danger)] rounded-[var(--radius-full)]" @click="deleteVideo(video)">删除</button>
            </template>
            <template v-if="video.status === 0">
              <button
                class="px-4 py-1.5 text-sm bg-[var(--color-primary)] text-[#10200e] rounded-[var(--radius-full)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="draftTranscodes[video.id] !== undefined && draftTranscodes[video.id] !== 'ready' && draftTranscodes[video.id] !== 'failed'"
                :title="getPublishDisabledTitle(video)"
                @click="publishDraft(video)"
              >
                {{ getPublishButtonText(video) }}
              </button>
              <button
                class="px-4 py-1.5 text-sm bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-[var(--radius-full)] hover:bg-[var(--color-border)] transition-colors"
                @click="openEdit(video)"
              >
                编辑
              </button>
              <button
                class="px-4 py-1.5 text-sm bg-red-900/30 text-[var(--color-danger)] rounded-[var(--radius-full)] hover:bg-red-900/50 transition-colors"
                @click="deleteVideo(video)"
              >
                删除
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <EmptyState v-else :message="emptyMessage" icon="📝" />

    <nav v-if="!loading && !error && total > pageSize" aria-label="稿件分页" class="flex items-center justify-center gap-4 mt-6">
      <button class="px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-40" :disabled="page === 1" @click="changePage(page - 1)">上一页</button>
      <span class="text-sm text-[var(--color-text-secondary)]">{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
      <button class="px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-40" :disabled="page * pageSize >= total" @click="changePage(page + 1)">下一页</button>
    </nav>

    <!-- Edit modal -->
    <AppModal :visible="!!editingDraft" title="编辑视频信息" width="max-w-lg" @close="editingDraft = null">

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">标题</label>
            <input
              v-model="editForm.title"
              type="text"
              maxlength="100"
              class="w-full h-10 px-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-[var(--transition-normal)]"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">简介</label>
            <textarea
              v-model="editForm.description"
              maxlength="2000"
              rows="3"
              class="w-full px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-[var(--transition-normal)] resize-none"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">分类</label>
            <select
              v-model="editForm.category_id"
              class="w-full h-10 px-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-[var(--transition-normal)]"
            >
              <option :value="0">请选择分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <!-- Tags -->
          <div>
            <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5">标签</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <span
                v-for="tag in editForm.tags"
                :key="tag.id || tag.name"
                class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-[var(--radius-full)]"
              >
                {{ tag.name }}
                <button type="button" class="hover:text-[var(--color-danger)] transition-colors" @click="removeEditTag(tag)">&times;</button>
              </span>
            </div>
            <input
              v-model="editTagInput"
              type="text"
              placeholder="输入标签后回车添加"
              class="w-full h-10 px-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-[var(--transition-normal)]"
              @keydown.enter.prevent="addEditTag"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button
            class="px-5 py-2 text-sm font-medium bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-[var(--radius-full)] hover:bg-[var(--color-border)] transition-all duration-[var(--transition-normal)] active:scale-[0.98]"
            @click="editingDraft = null"
          >
            取消
          </button>
          <button
            class="px-5 py-2 text-sm font-medium bg-[var(--color-primary)] text-[#10200e] rounded-[var(--radius-full)] hover:bg-[var(--color-primary-hover)] transition-all duration-[var(--transition-normal)] active:scale-[0.98] shadow-sm shadow-[var(--color-primary)]/25"
            :disabled="loadingEditTags || savingEdit"
            @click="saveEdit"
          >
            保存
          </button>
        </div>
    </AppModal>

    <!-- Delete confirmation modal -->
    <AppModal :visible="showDeleteConfirm" title="删除视频" @close="showDeleteConfirm = false">
      <p class="text-sm text-[var(--color-text)] mb-6">确定要删除视频“{{ pendingDeleteDraft?.title }}”吗？删除后无法恢复。</p>
      <div class="flex justify-end gap-2">
        <button
          class="px-5 py-2 text-sm font-medium bg-[var(--color-surface-hover)] text-[var(--color-text)] rounded-[var(--radius-full)] hover:bg-[var(--color-border)] transition-colors active:scale-[0.98]"
          @click="showDeleteConfirm = false"
        >
          取消
        </button>
        <button
          class="px-5 py-2 text-sm font-medium bg-[var(--color-danger)] text-white rounded-[var(--radius-full)] hover:bg-red-600 transition-colors active:scale-[0.98]"
          @click="confirmDelete"
        >
          删除
        </button>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useUserStore } from '~/stores/userStore'
import { useToast } from '~/composables/useToast'
import type { VideoInfo, PaginatedData, Tag, Category, TranscodeStatus } from '~/types'
import AppModal from '~/components/common/AppModal.vue'

definePageMeta({
  middleware: 'auth',
})

const { get, put, del, post } = useApi()
const userStore = useUserStore()
const { showToast } = useToast()

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'published', label: '已发布' },
]
const activeTab = ref('all')
const drafts = ref<VideoInfo[]>([])
const page = ref(1)
const pageSize = 12
const total = ref(0)
const lastPublishedId = ref<number | null>(null)
let videoRequest = 0
const loading = ref(true)
const error = ref('')
const showDeleteConfirm = ref(false)
const pendingDeleteDraft = ref<VideoInfo | null>(null)
const editingDraft = ref<VideoInfo | null>(null)
const editForm = ref({ title: '', description: '', category_id: 0, tags: [] as Tag[] })
const editTagInput = ref('')
const loadingEditTags = ref(false)
const savingEdit = ref(false)
const allTags = ref<Tag[]>([])
const categories = ref<Category[]>([])
const draftTranscodes = ref<Record<number, string>>({})
let transcodePollTimer: ReturnType<typeof setTimeout> | null = null
let transcodePollGeneration = 0
let disposed = false

const emptyMessage = computed(() => {
  switch (activeTab.value) {
    case 'draft': return '还没有草稿'
    case 'published': return '还没有已发布的视频'
    default: return '还没有视频，快去上传吧'
  }
})

watch(activeTab, () => {
  page.value = 1
  fetchVideos()
})

function changePage(nextPage: number) {
  page.value = nextPage
  fetchVideos()
}

function getPublishButtonText(video: VideoInfo): string {
  const status = draftTranscodes.value[video.id]
  if (status === undefined || status === 'ready') return '发布'
  if (status === 'failed') return '发布（转码失败）'
  const pct = parseInt(status)
  if (!isNaN(pct) && pct > 0) return `发布（${pct}%）`
  return '发布（转码中）'
}

function getPublishDisabledTitle(video: VideoInfo): string {
  const status = draftTranscodes.value[video.id]
  if (status === undefined || status === 'ready' || status === 'failed') return ''
  return '转码完成前无法发布'
}

async function fetchVideos() {
  if (disposed) return
  if (!userStore.userInfo) {
    error.value = '请先登录'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  const requestId = ++videoRequest
  stopTranscodePolling()

  try {
    const params: Record<string, number> = { page: page.value, page_size: pageSize }
    if (activeTab.value === 'draft') {
      params.status = 0
    } else if (activeTab.value === 'published') {
      params.status = 1
    }

    const data = await get<PaginatedData<VideoInfo>>(`/api/v1/videos/users/${userStore.userInfo.id}/videos`, params)
    if (disposed || requestId !== videoRequest) return
    total.value = data.total || 0
    const lastPage = Math.max(1, Math.ceil(total.value / pageSize))
    if (page.value > lastPage) {
      page.value = lastPage
      await fetchVideos()
      return
    }
    drafts.value = data.items || []
    startTranscodePolling()
  } catch (err) {
    if (disposed || requestId !== videoRequest) return
    error.value = err instanceof Error ? err.message : '加载视频列表失败'
  } finally {
    if (!disposed && requestId === videoRequest) loading.value = false
  }
}

async function publishDraft(draft: VideoInfo) {
  try {
    await put(`/api/v1/videos/${draft.id}`, { status: 1 })
    lastPublishedId.value = draft.id
    showToast('视频已发布', 'success')
    await fetchVideos()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发布失败'
    showToast(msg, 'error')
  }
}

async function openEdit(draft: VideoInfo) {
  editingDraft.value = draft
  editForm.value.title = draft.title
  editForm.value.description = draft.description
  editForm.value.category_id = draft.category_id || 0
  editForm.value.tags = []
  editTagInput.value = ''
  loadingEditTags.value = true
  // Load tags for this video
  try {
    const tags = await get<Tag[]>(`/api/v1/videos/${draft.id}/tags`)
    if (editingDraft.value?.id === draft.id) editForm.value.tags = tags || []
  } catch {
    if (editingDraft.value?.id === draft.id) {
      editingDraft.value = null
      showToast('加载视频标签失败，请重试', 'error')
    }
  } finally {
    if (!editingDraft.value || editingDraft.value.id === draft.id) loadingEditTags.value = false
  }
}

function addEditTag() {
  const name = editTagInput.value.trim()
  if (!name) return
  if (editForm.value.tags.some(tag => tag.name === name)) { editTagInput.value = ''; return }
  const existing = allTags.value.find(t => t.name === name)
  if (existing) {
    if (!editForm.value.tags.find(t => t.id === existing.id)) {
      editForm.value.tags.push(existing)
    }
  } else {
    editForm.value.tags.push({ id: 0, name })
  }
  editTagInput.value = ''
}

function removeEditTag(tag: Tag) {
  editForm.value.tags = editForm.value.tags.filter(t => t.name !== tag.name)
}

async function saveEdit() {
  if (!editingDraft.value || loadingEditTags.value || savingEdit.value) return
  const draftId = editingDraft.value.id
  savingEdit.value = true

  try {
    await put(`/api/v1/videos/${draftId}`, {
      title: editForm.value.title,
      description: editForm.value.description,
      category_id: editForm.value.category_id > 0 ? editForm.value.category_id : undefined,
    })
    // Save tags: create/lookup each tag by name, then set video tags
    const tagIds: number[] = []
    for (const tag of editForm.value.tags) {
      if (tag.id > 0) {
        tagIds.push(tag.id)
      } else {
        const resp = await post<Tag>('/api/v1/tags/', { name: tag.name })
        if (!resp?.id) throw new Error('保存标签失败')
        tagIds.push(resp.id)
      }
    }
    await post(`/api/v1/videos/${draftId}/tags`, { tag_ids: tagIds })
    showToast('修改已保存', 'success')
    editingDraft.value = null
    await fetchVideos()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '保存失败'
    showToast(msg, 'error')
  } finally {
    savingEdit.value = false
  }
}

function deleteVideo(draft: VideoInfo) {
  pendingDeleteDraft.value = draft
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!pendingDeleteDraft.value) return
  const draft = pendingDeleteDraft.value
  showDeleteConfirm.value = false
  try {
    await del(`/api/v1/videos/${draft.id}`)
    showToast('视频已删除', 'success')
    drafts.value = drafts.value.filter(v => v.id !== draft.id)
    await fetchVideos()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '删除失败'
    showToast(msg, 'error')
  }
  pendingDeleteDraft.value = null
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

onMounted(async () => {
  await fetchVideos()
  if (disposed) return
  try {
    const [tags, cats] = await Promise.all([
      get<Tag[]>('/api/v1/tags/'),
      get<Category[]>('/api/v1/categories/'),
    ])
    allTags.value = tags || []
    categories.value = cats || []
  } catch { /* non-critical */ }
})

// Transcode polling for drafts
async function fetchDraftTranscodeStatus(generation: number) {
  await Promise.all(drafts.value.filter(v => v.status === 0).map(async v => {
    try {
      const ts = await get<TranscodeStatus>(`/api/v1/videos/${v.id}/transcode-status`)
      if (disposed || generation !== transcodePollGeneration) return
      if (ts.status === 2) {
        draftTranscodes.value[v.id] = 'ready'
      } else if (ts.status === 3) {
        draftTranscodes.value[v.id] = 'failed'
      } else {
        draftTranscodes.value[v.id] = ts.progress !== undefined ? String(ts.progress) : '0'
      }
    } catch {
      // A failed status request does not mean transcoding has completed.
    }
  }))
}

function transcodeLabel(status: string | undefined): string {
  if (status === undefined) return '查询转码状态...'
  if (status === 'ready') return ''
  if (status === 'failed') return '转码失败'
  const pct = parseInt(status)
  if (!isNaN(pct) && pct > 0) {
    return `转码中 ${pct}%`
  }
  return '转码中...'
}

function startTranscodePolling() {
  stopTranscodePolling()
  if (disposed || !drafts.value.some(v => v.status === 0)) return
  const generation = transcodePollGeneration
  async function poll() {
    await fetchDraftTranscodeStatus(generation)
    if (disposed || generation !== transcodePollGeneration) return
    // The API also returns ready before the asynchronous task has been created.
    // Keep observing drafts so a later pending/running state becomes visible.
    transcodePollTimer = setTimeout(() => {
      transcodePollTimer = null
      poll()
    }, 3000)
  }
  poll()
}

function stopTranscodePolling() {
  transcodePollGeneration++
  if (transcodePollTimer) {
    clearTimeout(transcodePollTimer)
    transcodePollTimer = null
  }
}

onUnmounted(() => {
  disposed = true
  videoRequest++
  stopTranscodePolling()
})
</script>
