<template>
  <div>
    <SettingsModal v-if="settingsTab" @close="closeSettingsModal()" />
    <NavBar />
    <!-- Notification banners -->
    <UBanner
      v-if="!steamOnline"
      icon="i-lucide-circle-alert"
      color="warning"
      title="Notice: Steam appears to be down, most likely for maintenance. You will not be able to join games until it's back online."
      close
      :ui="{ title: 'whitespace-normal text-xs sm:text-sm', root: 'py-2 sm:py-0 -z-1' }"
    />
    <UBanner
      v-if="notice"
      icon="lucide:circle-alert"
      color="info"
      :title="notice.text"
      close
      class="border-b border-b-white dark:border-b-black"
      :ui="{ title: 'whitespace-normal text-xs sm:text-sm text-white dark:text-black', icon: 'text-white dark:text-black', root: 'py-2 sm:py-0 -z-1' }"
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
import pkg from "../../package.json";

const { appName } = useAppConfig();

declare const __BUILD_DATE__: string;
declare const __BUILD_COMMIT__: string;

const commit = __BUILD_COMMIT__;
const date = __BUILD_DATE__;
const version = __BUILD_VERSION__

const { steamOnline, notice } = await usePanelMeta();
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
