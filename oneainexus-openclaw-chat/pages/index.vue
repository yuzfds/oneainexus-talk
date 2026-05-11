<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 顶部栏 -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          OpenClaw Chat - 应用管理
        </h1>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          <span>创建应用</span>
        </el-button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="mb-6"
      />

      <!-- 工具栏 (搜索 & 筛选) -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <el-input
          v-model="searchQuery"
          placeholder="搜索应用名称或 Client ID..."
          clearable
          class="sm:max-w-xs"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="所有状态" clearable class="sm:max-w-[150px]">
          <el-option label="全部" value="" />
          <el-option label="已启用" value="active" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
      </div>

      <!-- 加载状态：骨架屏 -->
      <div v-if="loading && apps.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <el-card v-for="i in 6" :key="i" class="app-card-skeleton" :body-style="{ padding: '20px' }">
          <el-skeleton animated>
            <template #template>
              <div class="flex justify-between mb-4">
                <div class="flex-1">
                  <el-skeleton-item variant="h3" style="width: 50%" />
                  <el-skeleton-item variant="text" style="width: 80%; margin-top: 8px" />
                </div>
                <el-skeleton-item variant="button" style="width: 48px; height: 24px" />
              </div>
              <div class="mb-4">
                <el-skeleton-item variant="text" style="width: 30%; margin-bottom: 4px" />
                <el-skeleton-item variant="text" style="width: 100%; height: 28px" />
              </div>
              <div class="mb-4">
                <el-skeleton-item variant="text" style="width: 40%" />
                <el-skeleton-item variant="text" style="width: 40%" />
              </div>
              <div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <el-skeleton-item variant="button" style="width: 56px; height: 24px" />
                <el-skeleton-item variant="button" style="width: 72px; height: 24px" />
                <el-skeleton-item variant="button" style="width: 56px; height: 24px" />
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-else-if="filteredApps.length === 0"
        :description="apps.length === 0 ? '暂无应用，点击上方按钮创建' : '没有找到匹配的应用'"
        class="py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <el-button v-if="apps.length === 0" type="primary" @click="showCreateDialog = true">
          创建第一个应用
        </el-button>
        <el-button v-else @click="resetFilters">
          清除筛选
        </el-button>
      </el-empty>

      <!-- 应用列表 -->
      <template v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AppCard
            v-for="app in paginatedApps"
            :key="app.id"
            :app="app"
            show-chat-button
            @toggle-status="handleToggleStatus"
            @regenerate-secret="handleRegenerateSecret"
            @delete="handleDelete"
          />
        </div>
        
        <!-- 分页 -->
        <div class="flex justify-end">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[6, 12, 24, 48]"
            layout="total, sizes, prev, pager, next"
            :total="filteredApps.length"
            background
          />
        </div>
      </template>
    </main>

    <!-- 创建应用对话框 -->
    <AppCreateAppDialog
      v-model:visible="showCreateDialog"
      @created="handleCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus, Search } from '@element-plus/icons-vue'
import type { App } from '~/types'

const {
  apps,
  loading,
  error,
  fetchApps,
  deleteApp,
  updateAppStatus,
  regenerateSecret,
} = useApps()

const showCreateDialog = ref(false)

// 搜索与筛选状态
const searchQuery = ref('')
const statusFilter = ref('')

// 分页状态
const currentPage = ref(1)
const pageSize = ref(6)

// 监听筛选条件变化，重置分页
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1
})

// 计算过滤后的应用列表
const filteredApps = computed(() => {
  return apps.value.filter((app: App) => {
    // 关键字搜索
    const matchSearch = !searchQuery.value || 
      app.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      app.clientId.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    // 状态筛选
    const matchStatus = !statusFilter.value || app.status === statusFilter.value
    
    return matchSearch && matchStatus
  })
})

// 计算当前页的应用列表
const paginatedApps = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredApps.value.slice(start, end)
})

/**
 * 重置筛选条件
 */
function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
}

/**
 * 初始化加载应用列表
 * 监听认证状态，认证成功后再获取列表
 */
const authStore = useAuthStore()

onMounted(() => {
  // 如果已经认证，直接获取
  if (authStore.isAuthenticated) {
    fetchApps()
  }
})

// 监听认证状态变化
watch(() => authStore.isAuthenticated, (newVal) => {
  if (newVal) {
    fetchApps()
  }
})

/**
 * 创建成功后刷新列表
 */
function handleCreated(): void {
  ElMessage.success('应用创建成功')
}

/**
 * 切换应用状态
 */
async function handleToggleStatus(appId: string): Promise<void> {
  const app = apps.value.find((a: App) => a.id === appId)
  if (!app) return

  const newStatus = app.status === 'active' ? 'disabled' : 'active'
  const success = await updateAppStatus(appId, newStatus)

  if (success) {
    ElMessage.success(`应用已${newStatus === 'active' ? '启用' : '禁用'}`)
  }
}

/**
 * 重新生成密钥
 */
async function handleRegenerateSecret(appId: string): Promise<void> {
  try {
    const result = await regenerateSecret(appId)

    if (result) {
      ElMessageBox.alert(
        `新的 Client Secret: ${result}`,
        '密钥已重新生成',
        {
          confirmButtonText: '我已保存',
          type: 'warning',
        }
      )
    }
  } catch {
    ElMessage.error('重新生成密钥失败')
  }
}

/**
 * 删除应用
 */
async function handleDelete(appId: string): Promise<void> {
  const success = await deleteApp(appId)

  if (success) {
    ElMessage.success('应用已删除')
  }
}

// 页面标题
useHead({
  title: '应用管理 - OpenClaw Chat',
})
</script>

<style scoped>
.app-card-skeleton {
  @apply h-full;
}
</style>
