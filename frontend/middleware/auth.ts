import { useUserStore } from '~/stores/userStore'

export default defineNuxtRouteMiddleware((to) => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
