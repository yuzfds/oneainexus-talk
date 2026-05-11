<template>
  <div class="flex justify-start mb-6">
    <div class="max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-gray-700">
      <div
        v-if="waiting"
        class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
      >
        <span class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
        </span>
        <span>{{ waitingLabel }}</span>
      </div>

      <div
        v-if="content"
        class="prose prose-sm dark:prose-invert max-w-none streaming-cursor"
        v-html="renderedContent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarkdown } from '~/composables/useMarkdown'

const props = defineProps<{
  content: string
  waiting?: boolean
  waitingLabel?: string
}>()

const { render } = useMarkdown()

const renderedContent = computed(() => render(props.content))
</script>
