<template>
  <div class="bg-transparent px-0 pb-0 pt-2 w-full">
    <div class="max-w-[800px] mx-auto flex flex-col items-start w-full relative">
      <div
        class="w-full bg-white border border-[#ffe8e8] rounded-[24px] shadow-[0_4px_16px_rgba(255,77,79,0.06)] focus-within:border-[#ff999a] focus-within:shadow-[0_4px_16px_rgba(255,77,79,0.12)] transition-all duration-300 relative"
        :class="isDragOver ? 'ring-2 ring-[#ff999a] border-[#ff999a]' : ''"
        @dragenter.prevent="handleDragEnter"
        @dragover.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          multiple
          :disabled="disabled"
          @change="handleFilePicker"
        >

        <div
          v-if="isDragOver"
          class="absolute inset-0 z-10 rounded-[24px] border-2 border-dashed border-[#ff999a] bg-[#fef9f9]/90 flex items-center justify-center pointer-events-none"
        >
          <div class="text-sm font-medium text-[#ff4d4f]">
            拖拽图片或文件到这里发送
          </div>
        </div>

        <div v-if="attachments.length" class="px-4 pt-4">
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(part, index) in attachments"
              :key="`${part.type}-${part.url}-${index}`"
              class="relative group"
            >
              <div
                v-if="part.type === 'image'"
                class="overflow-hidden rounded-xl border border-[#ffe8e8] bg-[#fef9f9]"
              >
                <img
                  :src="part.url"
                  :alt="part.alt || part.name || 'image attachment'"
                  class="h-16 w-16 object-cover"
                >
              </div>
              <div
                v-else
                class="flex items-center gap-2 rounded-xl border border-[#ffe8e8] bg-[#fef9f9] px-3 py-2 max-w-52"
              >
                <el-icon class="text-[#ff999a]"><Folder /></el-icon>
                <div class="min-w-0">
                  <div class="truncate text-sm text-[#333333]">{{ part.name }}</div>
                  <div class="truncate text-xs text-[#999999]">{{ formatFileMeta(part) }}</div>
                </div>
              </div>

              <button
                type="button"
                class="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition hover:bg-black"
                @click="removeAttachment(index)"
              >
                <el-icon size="10"><Close /></el-icon>
              </button>
            </div>
          </div>
        </div>

        <textarea
          :value="modelValue"
          class="w-full bg-transparent border-none outline-none resize-none px-5 pt-5 pb-2 text-[#333333] placeholder-[#cccccc] focus:ring-0 text-[15px]"
          rows="3"
          :placeholder="placeholder || '在此输入您想了解的内容, 按shift+enter可换行'"
          :disabled="disabled"
          @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          @keydown.enter.prevent="handleEnter"
        ></textarea>

        <div class="flex items-center justify-between px-4 pb-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#fef9f9] text-[#999999] hover:text-[#ff4d4f] transition-colors"
              :disabled="disabled || isProcessingFiles"
              @click="openFilePicker"
            >
              <el-icon v-if="isProcessingFiles" class="is-loading" size="18"><Loading /></el-icon>
              <el-icon v-else size="20"><Paperclip /></el-icon>
            </button>
          </div>

          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300"
            :class="[
              (!canSubmit || disabled)
                ? 'bg-[#ffe8e8] text-white cursor-not-allowed'
                : 'bg-[#ff4d4f] hover:bg-[#ff3333] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
            ]"
            :disabled="disabled || !canSubmit"
            @click="handleSubmit"
          >
            <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
            <el-icon v-else size="16"><Position /></el-icon>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3 mt-4 text-[12px] text-[#666666]">
        <div class="flex items-center gap-1.5 cursor-pointer bg-white border border-[#ffe8e8] hover:border-[#ff999a] px-3 py-1.5 rounded-lg transition-colors">
          <span>模型配置</span>
          <img src="/image/model_icon.svg" alt="模型配置" class="w-5 h-5 p-0.5 bg-[#fef9f9] rounded" />
        </div>
        <div class="flex items-center gap-1.5 cursor-pointer bg-white border border-[#ffe8e8] hover:border-[#ff999a] px-3 py-1.5 rounded-lg transition-colors">
          <span>通道管理</span>
          <img src="/image/channel_icon.svg" alt="通道管理" class="w-5 h-5 p-0.5 bg-[#fef9f9] rounded" />
        </div>
        <div class="flex items-center gap-1.5 cursor-pointer bg-white border border-[#ffe8e8] hover:border-[#ff999a] px-3 py-1.5 rounded-lg transition-colors">
          <span>技能拓展</span>
          <img src="/image/skill_icon.svg" alt="技能拓展" class="w-5 h-5 p-0.5 bg-[#fef9f9] rounded" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Loading, Close, Paperclip, Position, Setting, Connection, Menu } from '@element-plus/icons-vue'
import type { MessagePart } from '~/types'

type AttachmentPart = Extract<MessagePart, { type: 'image' | 'file' }>

const MAX_ATTACHMENT_FILE_BYTES = 4 * 1024 * 1024
const MAX_ATTACHMENT_TOTAL_BYTES = 8 * 1024 * 1024

const props = defineProps<{
  modelValue: string
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  attachments?: AttachmentPart[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:attachments': [value: AttachmentPart[]]
  'submit': []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const isProcessingFiles = ref(false)

const attachments = computed(() => props.attachments ?? [])
const canSubmit = computed(() => Boolean(props.modelValue?.trim() || attachments.value.length))

const handleEnter = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.shiftKey) {
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const val = target.value
    emit('update:modelValue', val.substring(0, start) + '\n' + val.substring(end))
    return
  }
  handleSubmit()
}

const handleSubmit = () => {
  if (!canSubmit.value || props.loading || props.disabled || isProcessingFiles.value) return
  emit('submit')
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleDragEnter() {
  if (props.disabled) return
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  if (!event.currentTarget) return
  const currentTarget = event.currentTarget as HTMLElement
  if (event.relatedTarget && currentTarget.contains(event.relatedTarget as Node)) {
    return
  }
  isDragOver.value = false
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  await addFiles(files)
}

async function handleFilePicker(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await addFiles(files)
  input.value = ''
}

async function addFiles(files: File[]) {
  if (!files.length || props.disabled) return

  isProcessingFiles.value = true
  try {
    const currentAttachmentBytes = attachments.value.reduce((total, part) => {
      if ('size' in part && typeof part.size === 'number') {
        return total + part.size
      }
      return total
    }, 0)
    const newAttachmentBytes = files.reduce((total, file) => total + file.size, 0)
    const oversizedFile = files.find(file => file.size > MAX_ATTACHMENT_FILE_BYTES)

    if (oversizedFile) {
      throw new Error(`单个附件不能超过 ${formatBytes(MAX_ATTACHMENT_FILE_BYTES)}：${oversizedFile.name}`)
    }

    if (currentAttachmentBytes + newAttachmentBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
      throw new Error(`本次消息附件总大小不能超过 ${formatBytes(MAX_ATTACHMENT_TOTAL_BYTES)}`)
    }

    const newParts = await Promise.all(files.map(fileToPart))
    emit('update:attachments', [...attachments.value, ...newParts])
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    isProcessingFiles.value = false
  }
}

function removeAttachment(index: number) {
  emit('update:attachments', attachments.value.filter((_, currentIndex) => currentIndex !== index))
}

async function fileToPart(file: File): Promise<AttachmentPart> {
  const url = await readFileAsDataUrl(file)

  if (file.type.startsWith('image/')) {
    return {
      type: 'image',
      url,
      mimeType: file.type || undefined,
      name: file.name,
      alt: file.name,
    }
  }

  return {
    type: 'file',
    url,
    name: file.name,
    mimeType: file.type || undefined,
    size: file.size,
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function formatFileMeta(part: AttachmentPart): string {
  const meta = [part.mimeType]
  if ('size' in part && typeof part.size === 'number') {
    meta.push(formatBytes(part.size))
  }
  return meta.filter(Boolean).join(' · ') || 'Attachment'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}
</script>
