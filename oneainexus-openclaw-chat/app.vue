<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
/**
 * 应用入口
 * 负责初始化认证状态，并在宿主稍后注入 token 时自动同步。
 */

const { initAuth, isAuthenticated, token, authenticate } = useAuth()
const route = useRoute()
const AUTH_TOKEN_KEY = 'Authentication'

function getStoredToken(): string | null {
  if (!import.meta.client) {
    return null
  }

  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
  return storedToken && storedToken.trim() ? storedToken : null
}

async function syncAuthFromStorage(): Promise<void> {
  const storedToken = getStoredToken()
  if (!storedToken) {
    return
  }

  if (storedToken === token.value && isAuthenticated.value) {
    return
  }

  console.log('[app.vue] Found token in localStorage, authenticating...')
  await authenticate(storedToken)
}

async function initializeAuth(): Promise<void> {
  const urlToken = route.query.token as string | undefined

  if (urlToken) {
    console.log('[app.vue] Found token in URL, authenticating...')
    await authenticate(urlToken)
    return
  }

  await syncAuthFromStorage()
  initAuth()
}

async function handleStorageSync(): Promise<void> {
  if (!import.meta.client || document.visibilityState === 'hidden') {
    return
  }

  if (!isAuthenticated.value || !token.value) {
    await syncAuthFromStorage()
  }
}

async function handleMessage(event: MessageEvent): Promise<void> {
  const data = event.data
  if (!data || typeof data !== 'object') {
    return
  }

  const externalToken = typeof data.token === 'string'
    ? data.token
    : typeof data.authentication === 'string'
      ? data.authentication
      : null

  if (!externalToken) {
    return
  }

  console.log('[app.vue] Received token via postMessage, authenticating...')
  localStorage.setItem(AUTH_TOKEN_KEY, externalToken)
  await authenticate(externalToken)
}

onMounted(() => {
  nextTick(() => {
    initializeAuth()
    window.addEventListener('storage', handleStorageSync)
    window.addEventListener('focus', handleStorageSync)
    document.addEventListener('visibilitychange', handleStorageSync)
    window.addEventListener('message', handleMessage)
  })
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }

  window.removeEventListener('storage', handleStorageSync)
  window.removeEventListener('focus', handleStorageSync)
  document.removeEventListener('visibilitychange', handleStorageSync)
  window.removeEventListener('message', handleMessage)
})

watchEffect(() => {
  if (import.meta.client && token.value && !isAuthenticated.value) {
    // Keep this hook for future auth refresh flows.
  }
})
</script>
