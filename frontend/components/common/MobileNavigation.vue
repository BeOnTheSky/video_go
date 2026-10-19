<template>
  <div class="mobile-navigation-root">
    <nav class="studio-mobile-nav" aria-label="移动端主要导航">
      <NuxtLink to="/" :class="{ active: route.path === '/' }" aria-label="首页"><UIIcon name="home" :size="21" /><span>首页</span></NuxtLink>
      <NuxtLink to="/ranking" :class="{ active: route.path === '/ranking' }" aria-label="排行榜"><UIIcon name="flame" :size="21" /><span>排行</span></NuxtLink>
      <NuxtLink to="/upload" class="studio-mobile-nav__create" aria-label="上传视频"><UIIcon name="upload" :size="20" /><span>投稿</span></NuxtLink>
      <NuxtLink v-if="userStore.isLoggedIn" to="/history" :class="{ active: route.path === '/history' }" aria-label="观看历史"><UIIcon name="clock" :size="21" /><span>历史</span></NuxtLink>
      <button type="button" :aria-expanded="menuOpen" aria-controls="studio-mobile-menu" :class="{ active: menuOpen }" @click="menuOpen = !menuOpen"><UIIcon name="menu" :size="21" /><span>更多</span></button>
    </nav>
    <div v-if="menuOpen" class="studio-mobile-menu__overlay" @click="menuOpen = false" />
    <nav v-if="menuOpen" id="studio-mobile-menu" class="studio-mobile-menu" aria-label="更多页面">
      <p>继续探索</p>
      <NuxtLink :to="profilePath" @click="menuOpen = false"><UIIcon name="user" :size="18" />{{ userStore.isLoggedIn ? '个人中心' : '登录' }}</NuxtLink>
      <NuxtLink v-if="userStore.isLoggedIn" to="/notifications" @click="menuOpen = false"><UIIcon name="bell" :size="18" />通知消息</NuxtLink>
      <NuxtLink v-if="userStore.isLoggedIn" to="/drafts" @click="menuOpen = false"><UIIcon name="list" :size="18" />稿件管理</NuxtLink>
      <NuxtLink v-if="userStore.userRole === 3" to="/admin" @click="menuOpen = false"><UIIcon name="grid" :size="18" />管理后台</NuxtLink>
      <button type="button" @click="toggleTheme();menuOpen = false"><UIIcon :name="isDark ? 'sun' : 'moon'" :size="18" />{{ isDark ? '切换浅色模式' : '切换深色模式' }}</button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import UIIcon from '~/components/common/UIIcon.vue'
import { useUserStore } from '~/stores/userStore'
import { useTheme } from '~/composables/useTheme'
const route = useRoute()
const userStore = useUserStore()
const { currentTheme, toggleTheme } = useTheme()
const isDark = computed(() => currentTheme.value === 'dark')
const profilePath = computed(() => userStore.isLoggedIn && userStore.userInfo ? `/user/${userStore.userInfo.id}` : '/login')
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })
function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') menuOpen.value = false }
onMounted(() => document.addEventListener('keydown', onEscape))
onUnmounted(() => document.removeEventListener('keydown', onEscape))
</script>
