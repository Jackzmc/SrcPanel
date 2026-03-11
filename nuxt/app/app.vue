n<script setup lang="ts">
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
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})

</script>

<template>
  <UApp :toaster="{ position: 'top-center'}">
    <NuxtLayout>
      <NuxtPage :page-key="route => route.path" />
    </NuxtLayout>
  </UApp>
</template>
