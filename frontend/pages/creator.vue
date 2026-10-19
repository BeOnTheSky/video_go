<template>
  <div class="studio-page studio-creator">
    <header class="studio-page-head"><span class="studio-page-head__eyebrow">CREATOR / DASHBOARD</span><h1>创作中心<span class="studio-page-head__dot">.</span></h1><p>查看你的作品表现，管理投稿内容。</p></header>
    <CreatorPanel :user-id="userStore.userInfo?.id || 0" />
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/userStore'
const userStore = useUserStore()
definePageMeta({ middleware: 'auth' })
</script>
