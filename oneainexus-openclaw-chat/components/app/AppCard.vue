<template>
  <el-card class="app-card" :body-style="{ padding: '20px' }">
    <div class="flex flex-col h-full">
      <!-- 头部 -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {{ app.name }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {{ app.description || '暂无描述' }}
          </p>
        </div>
        <el-tag
          :type="app.status === 'active' ? 'success' : 'danger'"
          size="small"
          class="ml-2 flex-shrink-0"
        >
          {{ app.status === 'active' ? '启用' : '禁用' }}
        </el-tag>
      </div>

      <!-- Client ID -->
      <div class="mb-4">
        <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Client ID</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate">
            {{ app.clientId }}
          </code>
          <el-button
            size="small"
            circle
            @click="copyToClipboard(app.clientId)"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 时间信息 -->
      <div class="text-xs text-gray-400 dark:text-gray-500 mb-4">
        <p>创建于: {{ formatDate(app.createdAt) }}</p>
        <p>更新于: {{ formatDate(app.updatedAt) }}</p>
      </div>

      <!-- 进入聊天按钮（仅启用状态显示） -->
      <div v-if="showChatButton && app.status === 'active'" class="mb-4">
        <NuxtLink :to="`/chat/${app.id}`">
          <el-button type="primary" class="w-full">
            <el-icon><ChatDotRound /></el-icon>
            <span>进入聊天</span>
          </el-button>
        </NuxtLink>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <el-button
          :type="app.status === 'active' ? 'warning' : 'success'"
          size="small"
          @click="handleToggleStatus"
        >
          {{ app.status === 'active' ? '禁用' : '启用' }}
        </el-button>
        <el-button
          size="small"
          @click="handleRegenerateSecret"
        >
          重置密钥
        </el-button>
        <el-popconfirm
          title="确定要删除此应用吗？"
          confirm-button-text="删除"
          cancel-button-text="取消"
          @confirm="handleDelete"
        >
          <template #reference>
            <el-button
              type="danger"
              size="small"
            >
              删除
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { CopyDocument, ChatDotRound } from '@element-plus/icons-vue'
import type { App } from '~/types'

const props = withDefaults(
  defineProps<{
    app: App
    showChatButton?: boolean
  }>(),
  {
    showChatButton: false,
  }
)

const emit = defineEmits<{
  toggleStatus: [appId: string]
  regenerateSecret: [appId: string]
  delete: [appId: string]
}>()

/**
 * 格式化日期
 */
function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 复制到剪贴板
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

/**
 * 切换状态
 */
function handleToggleStatus(): void {
  emit('toggleStatus', props.app.id)
}

/**
 * 重新生成密钥
 */
function handleRegenerateSecret(): void {
  emit('regenerateSecret', props.app.id)
}

/**
 * 删除应用
 */
function handleDelete(): void {
  emit('delete', props.app.id)
}
</script>

<style scoped>
.app-card {
  @apply h-full transition-shadow hover:shadow-lg;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
