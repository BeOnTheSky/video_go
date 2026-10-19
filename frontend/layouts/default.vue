<template>
  <div class="studio-shell" :style="{ '--studio-sidebar-width': sidebarCollapsed ? '76px' : '210px' }">
    <AppHeader />
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    <main class="studio-main">
      <slot />
    </main>
    <div class="studio-footer"><AppFooter /><span>以热爱，发现好内容。</span></div>
    <MobileNavigation />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/common/AppHeader.vue'
import AppSidebar from '~/components/common/AppSidebar.vue'
import AppFooter from '~/components/common/AppFooter.vue'
import Toast from '~/components/common/Toast.vue'
import MobileNavigation from '~/components/common/MobileNavigation.vue'
const sidebarCollapsed = ref(false)
</script>
