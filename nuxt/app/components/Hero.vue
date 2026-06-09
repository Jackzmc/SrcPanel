<!-- eslint-disable vue/multi-word-component-names -->

<template>
  <div class="bg-primary mb-6 text-center py-6 text-white">
    <h2 class="text-3xl font-semibold">
      <UAvatar
v-if="avatar"
:src="avatarUrl"
:text="avatar.text"
:alt="avatar.alt"
loading="lazy"
:as="{ img: 'img' }" />
      {{ title }}
    </h2>
    <slot name="subtitle">
      <p class="text-lg text-gray-100">
        {{ subtitle }}
      </p>
    </slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string,

  avatar?: {
    alt?: string,
    text?: string,
    url?: string
    id: string
  }
}>()

const avatarUrl = computed(() => {
  if(!props.avatar) return
  return props.avatar.url ?? `/api/users/${props.avatar.id}/avatar`
})
</script>
