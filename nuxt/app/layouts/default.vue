<template>
  <div>
    <UBanner
      icon="i-lucide-circle-alert"
      color="warning"
      title="Pre-release build - Features are not complete or are missing, bugs may occur, nothing is final.""
    />
    <NavBar />
    <!-- Notification banners -->
    <UBanner
      v-if="!steamOnline"
      icon="i-lucide-circle-alert"
      color="warning"
      title="Notice: Steam appears to be down. You will not be able to join games until it's back online."
      close
    />
    <UBanner
      v-if="notice"
      icon="i-lucide-circle-alert"
      :color="notice.class as any"
      :title="notice.text"
      close
    />

    <div>
      <slot />
    </div>
    <USeparator class="mt-6" icon="i-simple-icons-nuxtdotjs" />
    <UFooter>
      <template #default>
        <p class="text-sm text-muted">
          <b>jzPanel</b> v2.0.0. Commit <b>{{ commit }}</b>. Built <b>{{ date }}</b>
        </p>
      </template>
    </UFooter>
  </div>
</template>

<script setup lang="ts">
declare const __BUILD_DATE__: string
declare const __BUILD_COMMIT__: string

const commit = __BUILD_COMMIT__
const date = new Date(__BUILD_DATE__).toLocaleString()

const { steamOnline, notice } = await useMeta()
</script>
