<template>
  <div>
    <UBanner
      icon="i-lucide-circle-alert"
      color="warning"
      title="Pre-release build - Features are not complete or are missing, bugs may occur, nothing is final."
      :ui="{title:'whitespace-normal text-xs sm:text-sm',root:'py-2 sm:py-0'}"
    />
    <SettingsModal v-if="settingsTab" @close="closeSettingsModal()" />
    <NavBar />
    <!-- Notification banners -->
    <UBanner
      v-if="!steamOnline"
      icon="i-lucide-circle-alert"
      color="warning"
      title="Notice: Steam appears to be down, most likely for maintenance. You will not be able to join games until it's back online."
      close
      :ui="{title:'whitespace-normal text-xs sm:text-sm',root:'py-2 sm:py-0'}"
    />
    <UBanner
      v-if="notice"
      icon="i-lucide-circle-alert"
      :color="notice.class as any"
      :title="notice.text"
      close
      :ui="{title:'whitespace-normal text-xs sm:text-sm',root:'py-2 sm:py-0'}"
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
import SettingsModal from '~/components/modals/SettingsModal.vue'

declare const __BUILD_DATE__: string
declare const __BUILD_COMMIT__: string

const commit = __BUILD_COMMIT__
const date = new Date(__BUILD_DATE__).toLocaleString()

const { steamOnline, notice } = await useMeta()
const route = useRoute()

const settingsTab = computed(() => {
  return import.meta.client && route.hash.startsWith("#settings")
})

async function closeSettingsModal() {
  await navigateTo({ hash: "" })
}
</script>
