<template>
  <div>
    <Hero :title="tab.title" />
    <UContainer>
      <UTabs
        class="mt-4"
        :items="tabs"
        :model-value="tabId"
        @update:model-value="tab => navigateTo(`/admin/players/${tab}`)"
      />

      <NuxtPage />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import Hero from "@/components/Hero.vue";

const tabs = [
  {
    label: "Recent",
    icon: "i-lucide-users",
    value: "recent",
    title: "Recent Players",
  },
  {
    label: "Search",
    icon: "i-lucide-user-search",
    value: "search",
    title: "Search Players",
  },
  {
    label: "Admins",
    icon: "i-lucide-user-star",
    value: "admins",
    title: "Admins",
  },
];

const route = useRoute();

const tabId = computed(() => route.path.split("/").pop());
const tab = computed(() => tabs.find(t => t.value === tabId.value) ?? tabs[0]!);

useHead({
  title: computed(() => tab.value?.title ?? "Players"),
});
</script>
