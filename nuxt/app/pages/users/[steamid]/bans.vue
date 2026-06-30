<template>
  <div class="mt-4 space-y-2">
    <div class="flex">
      <UTabs
        :items="tabs"
        variant="link"
        :content="false"
        :model-value="routeId"
        value-key="value"
        @update:model-value="tab => navigateTo(`/users/${props.steamid}/bans/${tab}`)"
      />
    </div>
    <NuxtPage :steamid="steamid" :data="data" />
  </div>
</template>

<script setup lang="ts">
import { APIBanFlags, type APIBanResponse, type ListAPIBan } from "@srcpanel/common/Ban";
import type { APIUserDetails } from "@srcpanel/common/User";
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  tab: "bans",
});

const api = useApi();

const props = defineProps<{
  steamid: string;
  playerName: string;
  data: APIUserDetails;
}>();

const { data } = await useAsyncData<APIBanResponse>(
  `bans.${props.steamid}`,
  () => api(`/bans/${props.steamid}`),
);

useSeoMeta({
  description: `Bans for ${props.playerName}`,
  ogDescription: `Bans for ${props.playerName}`,
});

function getBadge(ban: ListAPIBan): TabsItem["badge"] | undefined {
  if (ban.flags & APIBanFlags.Suspended) {
    return {
      color: "error",
      label: "Suspended",
    };
  } else if (ban.flags & APIBanFlags.AppealBanned) {
    return {
      color: "success",
      label: "Appealed",
      variant: "soft",
    };
  } else if (ban.expired) {
    return {
      color: "error",
      label: "Expired",
      variant: "soft",
    };
  }
  // return {
  //   color: 'primary',
  //   label: 'Active',
  //   variant: 'soft'
  // }
}

const tabs = computed(() => {
  const bans: TabsItem[] = data.value ? data.value.bans.map(ban => {
    const badge = getBadge(ban);
    const isActive = badge === undefined;
    return {
      label: `#${ban.id}`,
      value: ban.id.toString(), // toString important, route.path is always gonna be string
      badge,
      ui: {
        label: isActive ? "text-black dark:text-white hover:text-muted" : "line-through text-dimmed hover:text-muted",
      },
    };
  }) : [];
  return [
    ...bans,
    {
      label: "Add Ban",
      value: "create",
      icon: "lucide:gavel",
      ui: {
        trigger: "rounded-xl border-neutral-200 border-1 px-2 py-1",
      },
    },
  ];
});
const route = useRoute();
const routeId = computed(() => {
  return route.path.split("/").pop();
});

// async function createNote() {
//   if(!canSubmit.value) return
//   newNoteSubmitting.value = true

//   const result = await request<APICreateNoteResponse>(`/api/notes/${props.steamid}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       content: newNoteContent.value
//     })
//   })

//   if('body' in result) {
//     toast.add({
//       title: `Note submitted for ${props.data.user.name ?? props.data.user.id}`,
//       description: `Note #${result.body?.id}`,
//       color: 'success',
//       icon: "lucide:note"
//     })
//     newNoteContent.value = ""
//     refresh()
//   } else {
//     toast.add({
//       title: `Note submission failed`,
//       description: result.error.message,
//       color: 'error',
//       icon: "lucide:note"
//     })
//   }
//   newNoteSubmitting.value = false
// }
</script>
