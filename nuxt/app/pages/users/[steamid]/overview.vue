<template>
  <div class="flex gap-4 mt-4">
    <UNavigationMenu
      v-model="tab"
      orientation="vertical"
      :items="items"
      class="w-40 shrink-0"
    />
    <div class="flex-1 min-w-0">
      <NuxtPage :steamid="steamid" :data="data" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@srcpanel/common/User";

const route = useRoute()

definePageMeta({
  tab: "overview",
});

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();
const tab = ref<string>((route.meta.subtab as string) || 'profile')

const items = [
  { label: "Profile", value: "profile", icon: "i-lucide-user", to: `/users/${props.steamid}/overview/profile` },
  { label: "Names", value: "names", icon: "i-lucide-text", to: `/users/${props.steamid}/overview/names` },
];
</script>
