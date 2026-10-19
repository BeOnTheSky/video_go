<template>
  <aside class="studio-sidebar" :class="{ 'studio-sidebar--collapsed': collapsed }">
    <nav class="studio-sidebar__scroll" aria-label="主要导航">
      <div class="studio-sidebar__group-label" v-if="!collapsed">DISCOVER <span>· 探索</span></div>
      <NuxtLink to="/" class="studio-nav-item" :class="{ active: route.path === '/' }" title="首页">
        <UIIcon name="compass" :size="21"/><span v-if="!collapsed">首页</span>
      </NuxtLink>
      <NuxtLink to="/ranking" class="studio-nav-item" :class="{ active: route.path === '/ranking' }" title="热门排行">
        <UIIcon name="flame"/><span v-if="!collapsed">热门排行</span>
      </NuxtLink>
      <template v-if="userStore.isLoggedIn && userStore.userInfo">
      <div class="studio-sidebar__divider" />
      <div class="studio-sidebar__group-label" v-if="!collapsed">LIBRARY <span>· 我的内容</span></div>
      <NuxtLink to="/history" class="studio-nav-item" :class="{ active: route.path === '/history' }" title="观看历史">
        <UIIcon name="clock"/><span v-if="!collapsed">观看历史</span>
      </NuxtLink>
      <NuxtLink :to="`/user/${userStore.userInfo.id}`" class="studio-nav-item" :class="{ active: route.path === `/user/${userStore.userInfo.id}` || route.path.startsWith('/favorites/') }" title="个人中心">
        <UIIcon name="user"/><span v-if="!collapsed">个人中心</span>
      </NuxtLink>
      <NuxtLink to="/drafts" class="studio-nav-item" :class="{ active: route.path === '/drafts' || route.path === '/upload' }" title="稿件管理">
        <UIIcon name="list"/><span v-if="!collapsed">稿件管理</span>
      </NuxtLink>
      </template>
      <NuxtLink v-if="userStore.isLoggedIn && userStore.userRole >= 3" to="/admin" class="studio-nav-item" :class="{ active: route.path === '/admin' || route.path.startsWith('/admin/') }" title="管理后台">
        <UIIcon name="settings"/><span v-if="!collapsed">管理后台</span>
      </NuxtLink>
    </nav>
    <div class="studio-sidebar__bottom">
      <button type="button" class="studio-nav-item studio-sidebar__collapse" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" :aria-expanded="!collapsed" @click="$emit('toggle')"><UIIcon name="menu"/><span v-if="!collapsed">收起侧边栏</span></button>
      <div v-if="!collapsed" class="studio-sidebar__copyright">© 2026 映界 · VISIO<br/>发现值得停留的画面</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/userStore'
import UIIcon from '~/components/common/UIIcon.vue'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()
const route = useRoute()
const userStore = useUserStore()
</script>
