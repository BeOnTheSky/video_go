// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,
  components: [{ path: '~/components', pathPrefix: false }],

  app: { head: { title: '映界 VISIO · 发现好内容', link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],

  css: [
    '~/assets/styles/variables.css',
    '~/assets/styles/global.css',
    '~/assets/styles/studio.css',
    '~/assets/styles/studio-pages.css',
    'video.js/dist/video-js.css',
  ],

  devServer: {
    port: 3000,
  },

  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  },
  nitro: {
    devProxy: {
      '/api/**': 'http://localhost:8080',
    },
  },

  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },

  typescript: {
    strict: true,
  },
})
