<template>
  <el-dialog
    v-model="visible"
    title="创建新应用"
    width="500px"
    :close-on-click-modal="false"
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      label-position="top"
    >
      <el-form-item label="应用名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="请输入应用名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="应用描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          placeholder="请输入应用描述（可选）"
          :rows="3"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          创建
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 创建成功后显示密钥的对话框 -->
  <el-dialog
    v-model="showSecret"
    title="应用创建成功"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-alert
      type="warning"
      title="请妥善保管以下信息"
      description="Client Secret 只会显示一次，请立即复制保存！"
      :closable="false"
      show-icon
      class="mb-4"
    />

    <div class="space-y-4">
      <div>
        <label class="text-sm text-gray-500 block mb-1">Client ID</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded break-all">
            {{ createdApp?.clientId }}
          </code>
          <el-button
            size="small"
            @click="copyToClipboard(createdApp?.clientId || '')"
          >
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
        </div>
      </div>

      <div>
        <label class="text-sm text-gray-500 block mb-1">Client Secret</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded break-all font-mono">
            {{ createdApp?.clientSecret }}
          </code>
          <el-button
              size="small"
              @click="copyToClipboard(createdApp?.clientSecret || '')"
            >
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="closeSecretDialog">
        我已保存，关闭
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { CopyDocument } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { CreateAppResponse } from '~/types'

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  created: []
}>()

const { createApp, loading } = useApps()

const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  description: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入应用名称', trigger: 'blur' },
    { min: 1, max: 100, message: '名称长度为 1-100 个字符', trigger: 'blur' },
  ],
}

const showSecret = ref(false)
const createdApp = ref<CreateAppResponse['app'] | null>(null)

/**
 * 重置表单
 */
function resetForm(): void {
  formRef.value?.resetFields()
  form.name = ''
  form.description = ''
}

/**
 * 提交创建
 */
async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const result = await createApp({
    name: form.name,
    description: form.description || undefined,
  })

  if (result?.success && result.app) {
    createdApp.value = result.app
    visible.value = false
    showSecret.value = true
    emit('created')
  }
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
 * 关闭密钥对话框
 */
function closeSecretDialog(): void {
  showSecret.value = false
  createdApp.value = null
}
</script>
