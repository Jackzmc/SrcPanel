<template>
  <span class="select-all" @click="copyText">
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
const toast = useToast()

const props = defineProps<{
  text: string
}>()

async function copyText() {
  await navigator.clipboard.writeText(props.text)
  toast.add({
    title: 'Text copied to your clipboard',
    icon: 'i-lucide-clipboard-check',
    progress: false,
    duration: 2000
  })
}
</script>
