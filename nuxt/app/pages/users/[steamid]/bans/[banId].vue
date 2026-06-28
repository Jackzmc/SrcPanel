<template>
  <div>
    <UAlert v-if="error" color="error" title="Error" :description="error.message" />
    <BanContainer v-if="ban" :steamid="steamid" :ban="ban" />
  </div>
</template>

<script setup lang="ts">
import type { APIBanDetailsResponse } from "@jzpanel/common/Ban";
import type { APIUserDetails } from "@jzpanel/common/User";
import BanContainer from "~/components/users/BanContainer.vue";

const route = useRoute();
const api = useApi();

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

const { data, error } = await useAsyncData<APIBanDetailsResponse>(
  `bans.${props.steamid}.${route.params.banId}`,
  () => api(`/bans/${route.params.banId}`),
);
if (!data.value) createError({
  status: 404,
  message: "Ban not found",
});


const ban = computed(() => data.value?.bans[0]);

useSeoMeta({
  title: `Ban #${ban.value!.id}`,
});
</script>
