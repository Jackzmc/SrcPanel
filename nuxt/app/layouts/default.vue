<template>
  <div>
    <SettingsModal v-if="settingsTab" @close="closeSettingsModal()" />
    <NavBar />
    <!-- Notification banners -->
    <UBanner
      v-if="meta && !meta.steamAvailable"
      id="steam-notice"
      icon="i-lucide-circle-alert"
      color="warning"
      title="Notice: Steam appears to be down, most likely for maintenance. You will not be able to join games until it's back online."
      close
      :ui="{ title: 'whitespace-normal text-xs sm:text-sm', root: 'py-2 sm:py-0 z-0' }"
    />
    <UBanner
      v-if="meta?.settings.notice"
      id="general-banner"
      icon="lucide:circle-alert"
      color="info"
      :title="meta.settings.notice.text"
      close
      class="border-b border-b-white dark:border-b-black"
      :ui="{ 
        title: 'whitespace-normal text-xs sm:text-sm text-white dark:text-black', 
        icon: 'text-white dark:text-black', 
        root: 'py-2 sm:py-0 -z-0',
        close: ''
      }"
    />

    <div>
      <Hero v-if="hero" :title="hero.title" :subtitle="hero.subtitle" />
      <slot />
    </div>
    <USeparator class="mt-6" icon="i-simple-icons-nuxtdotjs" />
    <UFooter>
      <template #default>
        <p class="text-sm text-muted">
          <b>{{ appName }}</b> {{ version }}. Built <b>{{ date }} UTC</b>
        </p>
      </template>
    </UFooter>
  </div>
</template>

<script setup lang="ts">
import SettingsModal from "~/components/modals/SettingsModal.vue";

const { appName } = useAppConfig();

const date = __BUILD_DATE__;
const version = __BUILD_VERSION__

const { meta } = await usePanelMeta();
const route = useRoute();

const settingsTab = computed(() => {
  return import.meta.client && route.hash.startsWith("#settings");
});

const hero = computed(() => {
  if (!route.meta.hero) return null;
  let title = route.meta.pageTitle ?? route.meta.title ?? appName;
  let subtitle = route.meta.description;
  if (route.meta.hero != "default") {
    if (route.meta.hero.title) title = route.meta.hero.title;
    if (route.meta.hero.subtitle) subtitle = route.meta.hero.subtitle;
  }
  return {
    title,
    subtitle,
  };
});

useSeoMeta({
  title: route.meta.title,
  ogTitle: route.meta.pageTitle ?? route.meta.title,
  description: route.meta.description,
});

async function closeSettingsModal() {
  await navigateTo({ hash: "" });
}
</script>
