<template>
  <div
    :class="[
      'rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700',
      paddingClasses,
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    padding?: 'none' | 'sm' | 'md' | 'lg'
  }>(),
  {
    padding: 'md',
  }
)

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none':
      return ''
    case 'sm':
      return 'p-3'
    case 'md':
      return 'p-4'
    case 'lg':
      return 'p-6'
    default:
      return ''
  }
})
</script>
