<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Jz Panel'
const description = ''
useSeoMeta({
  titleTemplate: (chunk) => chunk ? `${chunk} | ${title}` : title,
  title: undefined, // let each page set its own
  description,
  ogTitle: title,
  ogDescription: description,
})

</script>

<template>
  <UApp :toaster="{ position: 'top-center' }" :tooltip="{ delayDuration: 400 }">
    <NuxtLayout class="min-h-screen">
      <NuxtPage :page-key="route => route.path" />
    </NuxtLayout>
  </UApp>
</template>
