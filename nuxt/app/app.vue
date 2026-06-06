<template>
  <UApp :toaster="{ position: 'top-center' }" :tooltip="{ delayDuration: 400 }">
    <NuxtLayout class="min-h-screen">
      <NuxtPage :page-key="route => route.path" />
    </NuxtLayout>
  </UApp>
</template>


<script setup lang="ts">
const { user } = useAuth()
const { appName } = useAppConfig()

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

const description = ''
useSeoMeta({
  titleTemplate: (chunk) => chunk ? `${chunk} | ${appName}` : appName,
  title: undefined, // let each page set its own
  description,
  ogTitle: undefined,
  ogDescription: description,
})

import * as Sentry from '@sentry/nuxt'
if(user.value) Sentry.setUser({
  id: user.value.user.steamid,
  username: user.value.user.name,
})

</script>