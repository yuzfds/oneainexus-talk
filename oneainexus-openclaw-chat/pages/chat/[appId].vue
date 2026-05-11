<template>
  <div class="h-screen flex bg-white font-sans text-[#333333]">
    <!-- 左侧边栏（会话列表） -->
    <aside class="w-[260px] my-4 ml-4 mr-4 bg-white rounded-2xl shadow-[0_0_15px_rgba(255,77,79,0.3)] flex flex-col flex-shrink-0 transition-all duration-300 hidden md:flex overflow-hidden border border-[#ff4d4f]/20">
      <div class="px-5 py-4 flex items-center justify-between z-10 sticky top-0 bg-white border-b border-[#f5f5f5]">
        <h2 class="text-[15px] font-bold text-[#333333] tracking-tight">会话列表</h2>
        <el-tooltip content="新建会话" placement="bottom" :show-after="300">
          <div 
            @click="handleNewChat"
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#fef9f9] cursor-pointer transition-colors text-[#666666] hover:text-[#ff4d4f] border border-transparent hover:border-[#ffe8e8]"
          >
            <el-icon><Plus /></el-icon>
          </div>
        </el-tooltip>
      </div>
      
      <div class="flex-1 overflow-y-auto py-3 px-3 space-y-2 custom-scrollbar">
        <!-- 会话列表 -->
        <div 
          v-for="(session, index) in sessions" 
          :key="session.sessionId"
          @click="switchSession(session.sessionId)"
          class="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-300 rounded-[10px] group relative"
          :class="session.sessionId === sessionId ? 'bg-[#f5f5f5]' : 'hover:bg-[#fafafa]'"
        >
          <div class="relative w-8 h-8 rounded-full bg-[#fff0f0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#ffe5e5] transition-colors">
            <img src="/image/ai-chat-icon.png" alt="AI" class="w-[18px] h-[18px] object-contain" />
          </div>
          <div class="flex flex-col min-w-0 flex-1 gap-0.5">
            <span class="text-[13px] truncate text-[#333333]" :class="session.sessionId === sessionId ? 'font-bold' : 'font-medium'">{{ session.title }}</span>
            <span class="text-[11px] text-[#b3b3b3]">{{ formatTime(session.updatedAt) }}</span>
          </div>
          <div 
            class="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1.5 hover:bg-[#ebebeb] rounded-md"
            @click.stop="handleDeleteSession(session.sessionId)"
          >
            <el-icon class="text-[#999999] hover:text-[#ff4d4f] text-[14px]">
              <Delete />
            </el-icon>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <div class="flex-1 flex flex-col h-full overflow-hidden relative bg-white z-10">
      <!-- 工具调用显示/隐藏控制按钮 -->
      <div class="absolute top-4 right-4 z-50">
        <el-tooltip :content="showToolCalls ? '隐藏工具调用' : '显示工具调用'" placement="bottom">
          <div 
            @click="showToolCalls = !showToolCalls"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md cursor-pointer hover:bg-[#f5f5f5] transition-colors border border-gray-100"
            :class="showToolCalls ? 'text-[#ff4d4f]' : 'text-gray-400'"
          >
            <Icon icon="lucide:wrench" class="w-4 h-4" />
          </div>
        </el-tooltip>
      </div>

      <!-- 隐藏原有顶部栏，保持页面清爽，如需可根据状态恢复 -->

      <!-- 加载状态 -->
      <div v-if="loadingApp" class="flex-1 flex items-center justify-center">
        <el-icon class="is-loading text-[#ff4d4f]" :size="40">
          <Loading />
        </el-icon>
      </div>

      <!-- 应用不存在 -->
      <div v-else-if="!app" class="flex-1 flex items-center justify-center">
        <el-empty description="应用不存在或已被删除">
          <NuxtLink to="/">
            <el-button color="#ff4d4f" plain>返回应用列表</el-button>
          </NuxtLink>
        </el-empty>
      </div>

      <!-- 应用已禁用 -->
      <div v-else-if="app.status === 'disabled'" class="flex-1 flex items-center justify-center">
        <el-empty description="此应用已被禁用">
          <NuxtLink to="/">
            <el-button color="#ff4d4f" plain>返回应用列表</el-button>
          </NuxtLink>
        </el-empty>
      </div>

      <!-- 聊天区域 -->
      <template v-else>
        <!-- 空白欢迎页 -->
        <div v-if="messages.length === 0" class="flex-1 flex flex-col items-center pt-[5vh] md:pt-[10vh] px-4 relative min-h-0 pb-[200px]">
          <h1 class="text-[26px] md:text-[32px] font-bold text-[#333333] mb-3 md:mb-4 text-center z-10 relative flex-shrink-0">
            🎉 OpenClaw 直接对话来了 🎉
          </h1>
          <p class="text-[13px] md:text-[14px] text-[#999999] text-center mb-3 md:mb-6 leading-relaxed max-w-[400px] z-10 relative flex-shrink-0">
            在下方输入消息，无需复杂配置，即可快速开启对话。<br/>
            您也可以将 OpenClaw 接入常用 IM 软件
          </p>
          <!-- 占位插画：items-end 贴底，pb-[220px] 使底部约 1/3 伸入输入框区域 -->
          <div class="flex-1 flex items-end justify-center pointer-events-none z-0 min-h-0">
            <img src="/image/ch.png" alt="Welcome Illustration" class="h-auto max-h-full object-contain" style="width: min(400px, 50vw)" />
          </div>
        </div>

        <!-- 消息列表 -->
        <ChatContainer v-else ref="chatContainerRef" class="flex-1">
          <MessageItem
            v-for="message in sortedMessages"
            :key="message.id"
            :message="message"
          />
          <StreamingMessage
            v-if="streamingContent || isLoading"
            :content="streamingContent"
            :waiting="isLoading && !streamingContent"
            waiting-label="正在思考并准备回复"
          />
          <el-alert
            v-if="error"
            type="error"
            :title="error"
            :closable="false"
            class="mt-4"
          />
          <!-- 底部遮挡占位区 -->
          <div class="h-[260px] w-full flex-shrink-0"></div>
        </ChatContainer>

        <!-- 输入框区域 -->
        <div class="w-full absolute bottom-0 left-0 bg-gradient-to-t from-white via-white/90 to-transparent pt-10 pb-6 px-4 md:px-8 z-20">
          <ChatInput
            v-model="inputText"
            v-model:attachments="pendingAttachments"
            :loading="isLoading"
            :disabled="!isConnected"
            placeholder="在此输入您想了解的内容，按 Shift+Enter 可换行"
            @submit="handleSubmit"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ArrowLeft, Delete, Loading, Bell, Monitor, Document, Setting, ChatLineSquare, ChatRound, ChatLineRound, Plus } from '@element-plus/icons-vue'
import type { App, MessagePart } from '~/types'
import { OneainexusChatClient, ConnectionState, type ReceivedMessage } from '@oneainexus/chat-sdk'
import MessageItem from '~/components/chat/MessageItem.vue'
import StreamingMessage from '~/components/chat/StreamingMessage.vue'
import type { ChatSession } from '~/stores/chat'
import { withAppBasePath } from '~/utils/base-path'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const appBaseURL = runtimeConfig.app.baseURL
const appId = route.params.appId as string

// 格式化时间戳
function formatTime(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function extractTextFromParts(parts?: MessagePart[]): string {
  if (!parts?.length) return ''

  return parts.map((part) => {
    if (part.type === 'text') return part.text
    if (part.type === 'image') return part.alt || part.name || '[image]'
    if (part.type === 'file') return part.name || '[file]'
    return ''
  }).filter(Boolean).join('\n')
}

const { fetchApp } = useApps()
const chatStore = useChatStore()
const { connect, disconnect, sendMessage } = useChat()

const { messages, sessions, sessionId, streamingContent, isLoading, error, isConnected } = storeToRefs(chatStore)
const { clearChat, addUserMessage, setError, setConnected, fetchSessions, resetSession, loadHistory } = chatStore

const app = ref<App | null>(null)
const loadingApp = ref(true)
const inputText = ref('')
const pendingAttachments = ref<Array<Extract<MessagePart, { type: 'image' | 'file' }>>>([])
const chatContainerRef = ref<{ scrollToBottom: () => void }>()
const showToolCalls = ref(true)

const sortedMessages = computed(() => {
  let msgs = [...messages.value]
  if (!showToolCalls.value) {
    msgs = msgs.filter(m => m.role !== 'tool')
  }
  return msgs.sort((a, b) => a.timestamp - b.timestamp)
})

function buildSessionTitle(
  content: string,
  attachments: Array<Extract<MessagePart, { type: 'image' | 'file' }>>,
): string {
  const normalizedContent = content.trim().replace(/\s+/g, ' ')
  if (normalizedContent) {
    return normalizedContent.length > 20 ? `${normalizedContent.slice(0, 20)}...` : normalizedContent
  }

  if (attachments.length) {
    const names = attachments.map(attachment => attachment.name).filter(Boolean).join('、')
    if (names) {
      return names.length > 20 ? `${names.slice(0, 20)}...` : names
    }
    return `附件 (${attachments.length})`
  }

  return '新对话'
}

function upsertSession(session: ChatSession) {
  const existingIndex = sessions.value.findIndex(item => item.sessionId === session.sessionId)
  if (existingIndex >= 0) {
    sessions.value.splice(existingIndex, 1, session)
    return
  }

  sessions.value.unshift(session)
}

function resetComposerState() {
  messages.value = []
  pendingAttachments.value = []
  inputText.value = ''
}

async function createPersistedSession(targetSessionId = crypto.randomUUID()): Promise<boolean> {
  if (!app.value) {
    return false
  }

  try {
    const response = await $fetch<{ success: boolean; data?: ChatSession }>(withAppBasePath(appBaseURL, 'api/chat/sessions'), {
      method: 'POST',
      body: {
        appId: app.value.id,
        sessionId: targetSessionId,
      },
    })

    if (!response.success || !response.data) {
      return false
    }

    upsertSession(response.data)
    sessionId.value = response.data.sessionId
    resetComposerState()
    setError(null)
    return true
  } catch (e) {
    console.error('[ChatPage] Failed to create session:', e)
    return false
  }
}

async function ensureSessionExistsWhenListEmpty() {
  if (sessions.value.length > 0) {
    return
  }

  await createPersistedSession(sessionId.value || crypto.randomUUID())
}

const enableMockSdk = ref(false)
const mockSdkClient = ref<InstanceType<typeof OneainexusChatClient> | null>(null)

/**
 * 切换 SDK 模拟端
 */
async function toggleMockSdk(val: string | number | boolean) {
  if (val && app.value) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}`
    
    const client = new OneainexusChatClient({
      apiEndpoint: wsUrl,
      wsPath: withAppBasePath(appBaseURL, 'api/_ws.ws'),
      clientId: app.value.clientId,
      clientSecret: app.value.clientSecret || 'ae5b88951acc262da121696bf54579728646e65d42903c10302cb57b49b300af',
      reconnect: true,
      logLevel: 'debug'
    })
    
    mockSdkClient.value = client

    client.onStateChange((state: ConnectionState) => {
      if (state === ConnectionState.Connected) {
        ElMessage.success('SDK 模拟端已连接')
      } else if (state === ConnectionState.Disconnected) {
        ElMessage.warning('SDK 模拟端已断开')
      }
    })

    client.onMessage(async (rawMsg: ReceivedMessage) => {
      const msg = rawMsg as ReceivedMessage & {
        type: string
        sessionId?: string
        data?: {
          sessionId?: string
          messages?: Array<{
            content?: string
            parts?: MessagePart[]
          }>
        }
      }
      if (msg.type === 'chat') {
        const sessionId = msg.data?.sessionId || msg.sessionId || ''
        const userMessages = msg.data?.messages || []
        const lastMessage = userMessages[userMessages.length - 1] || {}
        const lastMessageText = lastMessage?.content || extractTextFromParts(lastMessage?.parts)

        await new Promise(resolve => setTimeout(resolve, 500))

        const replyText = `[SDK 模拟] 我收到了你的消息：${lastMessageText}`
        const words = Array.from(replyText)

        for (let i = 0; i < words.length; i++) {
          await client.sendStructuredMessage({
            type: 'chat_stream',
            content: '',
            data: {
              sessionId,
              content: words[i],
              done: false
            }
          }, {
            waitForAck: false
          })
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        await client.sendStructuredMessage({
          type: 'chat_stream',
          content: '',
          data: {
            sessionId,
            content: '',
            done: true,
            finishReason: 'stop'
          }
        }, {
          waitForAck: false
        })
      }
    })

    try {
      await client.connect()
    } catch (e) {
      ElMessage.error('SDK 模拟端连接失败: ' + (e as Error).message)
      enableMockSdk.value = false
    }
  } else {
    if (mockSdkClient.value) {
      await mockSdkClient.value.disconnect()
      mockSdkClient.value = null
    }
  }
}

/**
 * 加载应用信息
 */
const authStore = useAuthStore()

async function loadApp(): Promise<void> {
  loadingApp.value = true
  try {
    const { getAuthHeaders } = useAuth()
    const response = await $fetch<{ success: boolean; data?: App }>(withAppBasePath(appBaseURL, `api/apps/${appId}`), {
      headers: getAuthHeaders(),
    })
    if (response.success && response.data) {
      app.value = response.data
      // 设置当前应用
      chatStore.setCurrentApp(response.data)
      
      await Promise.all([
        chatStore.loadHistory(app.value.id),
        chatStore.fetchSessions(app.value.id)
      ])
      await ensureSessionExistsWhenListEmpty()
      
      // 建立连接
      connect()
    }
  } catch {
    app.value = null
  } finally {
    loadingApp.value = false
  }
}


onMounted(() => {
  if (authStore.isAuthenticated) {
    loadApp()
  }
})

watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal) {
    loadApp()
  }
})

/**
 * 发送消息
 */
async function handleSubmit(): Promise<void> {
  if ((!inputText.value.trim() && pendingAttachments.value.length === 0) || isLoading.value) return

  const currentSessionId = sessionId.value
  const content = inputText.value.trim()
  const attachmentSnapshot = [...pendingAttachments.value]
  const parts = pendingAttachments.value.length
    ? [
        ...(content ? [{ type: 'text', text: content } as const] : []),
        ...pendingAttachments.value,
      ]
    : undefined
  inputText.value = ''
  pendingAttachments.value = []

  // 添加用户消息
  addUserMessage(content, parts)

  // 如果是新对话（当前没有会话记录或消息只有这一条），则发送后刷新会话列表
  const isNewSession = messages.value.length === 1

  try {
    await sendMessage({ content, parts })

    if (isNewSession && app.value) {
      upsertSession({
        sessionId: currentSessionId,
        title: buildSessionTitle(content, attachmentSnapshot),
        updatedAt: new Date().toISOString(),
      })
    }
  } catch (e) {
    setError((e as Error).message)
  }
}

/**
 * 切换会话
 */
async function switchSession(targetSessionId: string) {
  if (sessionId.value === targetSessionId || isLoading.value) return

  sessionId.value = targetSessionId
  inputText.value = ''
  pendingAttachments.value = []
  setError(null)
  if (app.value) {
    await loadHistory(app.value.id)
  }
}

/**
 * 删除对话历史
 */
async function handleDeleteSession(targetSessionId: string) {
  if (!app.value) return

  try {
    await ElMessageBox.confirm('确定要删除这个对话历史吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const success = await chatStore.deleteSession(app.value.id, targetSessionId)
    if (success) {
      await ensureSessionExistsWhenListEmpty()
      ElMessage.success('已删除对话')
    } else {
      ElMessage.error('删除对话失败')
    }
  } catch {
    // 取消删除
  }
}

/**
 * 新建对话
 */
async function handleNewChat() {
  if (isLoading.value) return
  const created = await createPersistedSession()
  if (!created) {
    ElMessage.error('创建新对话失败')
  }
}

/**
 * 清空聊天
 */
function handleClearChat(): void {
  clearChat()
  pendingAttachments.value = []
  inputText.value = ''
}

// 自动滚动
watch([messages, streamingContent, isLoading], async () => {
  await nextTick()
  chatContainerRef.value?.scrollToBottom()
}, { deep: true })

// 离开页面时断开连接
onUnmounted(() => {
  disconnect()
  chatStore.setCurrentApp(null)
  
  if (mockSdkClient.value) {
    mockSdkClient.value.disconnect()
    mockSdkClient.value = null
  }
})

// 页面标题
useHead({
  title: () => app.value ? `${app.value.name} - OpenClaw Chat` : 'OpenClaw Chat',
})
</script>
