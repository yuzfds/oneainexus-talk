<template>
  <div
    :class="[
      'flex w-full mb-6',
      isUser ? 'justify-end' : 'justify-start'
    ]"
  >
    <!-- Normal Messages & Attachments -->
    <div
      v-if="!isTool"
      :class="[
        'max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm',
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-700'
      ]"
    >
      <div
        v-if="textContent && isUser"
        class="whitespace-pre-wrap"
      >
        {{ textContent }}
      </div>

      <div
        v-else-if="textContent"
        class="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2"
        v-html="renderedContent"
      />

      <div v-if="imageParts.length" class="mt-3 space-y-3">
        <a
          v-for="(part, index) in imageParts"
          :key="`image-${index}-${part.url}`"
          :href="part.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block overflow-hidden rounded-2xl border border-white/20 bg-black/5 dark:bg-white/5"
        >
          <img
            :src="part.url"
            :alt="part.alt || part.name || 'image attachment'"
            class="max-h-80 w-full object-cover"
            loading="lazy"
          >
          <div
            v-if="part.alt || part.name"
            :class="[
              'px-3 py-2 text-xs',
              isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            ]"
          >
            {{ part.alt || part.name }}
          </div>
        </a>
      </div>

      <div v-if="fileParts.length" class="mt-3 space-y-2">
        <a
          v-for="(part, index) in fileParts"
          :key="`file-${index}-${part.url}`"
          :href="part.url"
          target="_blank"
          rel="noopener noreferrer"
          :download="part.name"
          :class="[
            'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors',
            isUser
              ? 'border-white/20 bg-white/10 hover:bg-white/15'
              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/60 dark:hover:bg-gray-900'
          ]"
        >
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">
              {{ part.name }}
            </div>
            <div
              :class="[
                'mt-1 text-xs',
                isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ formatFileMeta(part) }}
            </div>
          </div>
          <div
            :class="[
              'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide',
              isUser
                ? 'bg-white/15 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
            ]"
          >
            file
          </div>
        </a>
      </div>
    </div>

    <!-- Tool Execution UI Optimization -->
    <div
      v-else
      class="w-full max-w-[85%] sm:max-w-2xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 ease-in-out"
    >
      <!-- Header / Summary -->
      <button
        class="w-full flex items-center justify-between p-3 md:p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        :aria-expanded="isDetailsOpen"
        :aria-controls="`tool-details-${message.id}`"
        @click="isDetailsOpen = !isDetailsOpen"
        aria-label="Toggle tool details"
      >
        <div class="flex items-center gap-3 overflow-hidden">
          <!-- Title -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ toolTitle || 'Tool Execution' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Chevron -->
        <Icon
          icon="lucide:chevron-down"
          class="w-5 h-5 text-gray-400 transition-transform duration-300"
          :class="{ 'rotate-180': isDetailsOpen }"
          aria-hidden="true"
        />
      </button>

      <!-- Collapsible Details Section -->
      <div
        v-show="isDetailsOpen"
        :id="`tool-details-${message.id}`"
        class="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        role="region"
      >
        <!-- Text / Description -->
        <div
          v-if="toolText"
          class="p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border-b border-gray-100 dark:border-gray-700 last:border-0"
        >
          {{ toolText }}
        </div>

        <div v-if="imageParts.length" class="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
          <a
            v-for="(part, index) in imageParts"
            :key="`tool-image-${index}-${part.url}`"
            :href="part.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <img
              :src="part.url"
              :alt="part.alt || part.name || 'image attachment'"
              class="max-h-80 w-full object-cover"
              loading="lazy"
            >
            <div v-if="part.alt || part.name" class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              {{ part.alt || part.name }}
            </div>
          </a>
        </div>

        <div v-if="fileParts.length" class="p-4 border-b border-gray-100 dark:border-gray-700 space-y-2">
          <a
            v-for="(part, index) in fileParts"
            :key="`tool-file-${index}-${part.url}`"
            :href="part.url"
            target="_blank"
            rel="noopener noreferrer"
            :download="part.name"
            class="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ part.name }}
              </div>
              <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ formatFileMeta(part) }}
              </div>
            </div>
            <div class="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              file
            </div>
          </a>
        </div>
        
        <!-- Code / Details -->
        <div v-if="toolDetails" class="p-4 relative group">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Output / Details</span>
            <button
              class="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
              @click.stop="copyDetails"
              :aria-label="'Copy tool output'"
            >
              <Icon :icon="copied ? 'lucide:check' : 'lucide:copy'" class="w-3 h-3" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <pre
            class="overflow-x-auto rounded-lg bg-[#1e1e1e] p-3 text-xs leading-relaxed text-gray-200 shadow-inner max-h-[400px]"
            tabindex="0"
          ><code>{{ toolDetails }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ChatMessage, MessagePart } from '~/types'
import { useMarkdown } from '~/composables/useMarkdown'

const props = defineProps<{
  message: ChatMessage
}>()

const { render } = useMarkdown()
const isUser = computed(() => props.message.role === 'user')
const isTool = computed(() => props.message.role === 'tool')
const toolEvent = computed(() => props.message.event ?? {})

const isDetailsOpen = ref(false)
const copied = ref(false)

const copyDetails = async () => {
  if (toolDetails.value) {
    try {
      await navigator.clipboard.writeText(toolDetails.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }
}

const toolTitle = computed(() => {
  if (!isTool.value) return ''

  const event = toolEvent.value
  if (props.message.eventType === 'tool_start') {
    const name = getString(event.name)
    const phase = getString(event.phase)
    if (name && phase) return `${name} (${phase})`
    if (name) return name
    if (phase) return phase
  }

  if (props.message.eventType === 'tool_item') {
    return getString(event.title) || getString(event.name) || getString(event.kind) || getString(event.itemId) || 'Tool step'
  }

  if (props.message.eventType === 'tool_output') {
    const name = getString(event.name)
    const exitCode = getNumber(event.exitCode)
    if (name && exitCode != null) return `${name} (exit ${exitCode})`
    return name || 'Command output'
  }

  return ''
})

const toolDetails = computed(() => {
  if (!isTool.value) return ''

  if (props.message.eventType === 'tool_output') {
    return getString(toolEvent.value.output) || props.message.content
  }

  return ''
})

const toolText = computed(() => {
  if (!isTool.value) return ''
  const content = props.message.content.trim()
  if (!content) return ''
  if (content === toolDetails.value) return ''
  return content
})

const textContent = computed(() => {
  if (props.message.parts?.length) {
    const textParts = props.message.parts
      .filter((part): part is Extract<MessagePart, { type: 'text' }> => part.type === 'text')
      .map(part => part.text.trim())
      .filter(Boolean)

    if (textParts.length) {
      return textParts.join('\n')
    }
  }

  return props.message.content
})

const imageParts = computed(() =>
  (props.message.parts || []).filter((part): part is Extract<MessagePart, { type: 'image' }> => part.type === 'image'),
)

const fileParts = computed(() =>
  (props.message.parts || []).filter((part): part is Extract<MessagePart, { type: 'file' }> => part.type === 'file'),
)

const renderedContent = computed(() => render(textContent.value || ''))

function formatFileMeta(part: Extract<MessagePart, { type: 'file' }>): string {
  const meta = [part.mimeType]

  if (typeof part.size === 'number') {
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

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

</script>
