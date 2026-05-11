// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-23',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/tailwindcss',
    '@element-plus/nuxt',
    '@vueuse/nuxt',
  ],

  css: [
    '~/assets/css/design-tokens.css'
  ],

  // Pinia Persisted State 配置
  piniaPersistedstate: {
    storage: 'localStorage',
    debug: true,
  },

  // Element Plus 配置
  elementPlus: {
    importStyle: 'css',
    themes: ['dark'],
  },

  // TailwindCSS 配置
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts',
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  // 运行时配置
  runtimeConfig: {
    // 服务端私有配置
    authApiUrl: process.env.NUXT_AUTH_API_URL || '',
    authTokenHeader: process.env.NUXT_AUTH_TOKEN_HEADER || 'Authentication',

    // 公开配置（暴露给客户端）
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      wsPath: process.env.NUXT_PUBLIC_WS_PATH || '/ws',
      sseTimeout: Number(process.env.NUXT_PUBLIC_SSE_TIMEOUT) || 60000,
    },
  },

  // TypeScript 配置
  typescript: {
    strict: true,
    typeCheck: false,  // 暂时禁用以避免 vite-plugin-checker 问题
  },

  // 应用配置
  app: {
    baseURL: '/oneainexus-talk/',
    head: {
      title: 'OpenClaw Chat',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'OpenClaw Web Chat - AI 聊天应用' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  // Vite 配置
  vite: {
    optimizeDeps: {
      include: ['eventemitter3', 'isomorphic-ws'],
    },
  },

  // 开发服务器
  devServer: {
    port: 3000,
  },
})
