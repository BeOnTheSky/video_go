<template>
  <div class="studio-auth min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="studio-auth__scene" aria-hidden="true"><span class="studio-auth__orbit studio-auth__orbit--one"/><span class="studio-auth__orbit studio-auth__orbit--two"/><span class="studio-auth__glow"/></div>
    <div class="studio-auth__grid">
      <section class="studio-auth__story" aria-label="映界品牌介绍">
        <NuxtLink to="/" class="studio-auth__brand"><span class="studio-auth__brand-icon">V</span> 映界 <small>VISIO</small></NuxtLink>
        <div class="studio-auth__story-body"><span class="studio-page-head__eyebrow">EXPLORE WHAT YOU LOVE</span>
          <h2>故事，从<br/>这里<span>开始。</span></h2>
          <p>发现有趣的人、记录精彩瞬间。每一次观看，都是下一段灵感的起点。</p>
          <div class="studio-auth__story-foot">DISCOVER <span>·</span> CREATE <span>·</span> SHARE</div>
        </div>
      </section>
      <section class="studio-auth__form-side"><NuxtLink to="/" class="studio-auth__back">← 返回首页</NuxtLink>
        <div class="studio-auth__panel"><span class="studio-page-head__eyebrow">WELCOME TO VISIO</span><slot /></div>
        <p class="studio-auth__legal">映界 VISIO · 让精彩持续发生</p>
      </section>
    </div>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import Toast from '~/components/common/Toast.vue'
import { useTheme } from '~/composables/useTheme'
useTheme()
</script>
