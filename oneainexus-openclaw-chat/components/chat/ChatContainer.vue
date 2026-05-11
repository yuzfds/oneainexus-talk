<template>
  <div
    ref="containerRef"
    class="flex-1 overflow-y-auto px-6 py-4"
  >
    <div class="max-w-4xl mx-auto space-y-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const containerRef = ref<HTMLElement>()

// 滚动到底部
const scrollToBottom = () => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: containerRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

// 暴露方法
defineExpose({
  scrollToBottom,
})
</script>
