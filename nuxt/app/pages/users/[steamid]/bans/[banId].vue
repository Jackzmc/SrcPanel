<template>
  <div>
    <UAlert v-if="error" color="error" title="Error" :description="error.message" />
    <BanCard v-if="ban" :ban="ban" />
  </div>
</template>

<script setup lang="ts">
import type { FullAPIBan } from '@jzpanel/common/Ban';
import type { APIUserDetails } from '@jzpanel/common/User'
import BanCard from '~/components/users/BanCard.vue';

const route = useRoute()
const api = useApi()

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const { data: ban, refresh, error } = await useAsyncData<FullAPIBan>(
  `bans.${props.steamid}.${route.params.banId}`,
  () => api(`/bans/${route.params.banId}`)
)
if(!ban.value) createError({
  status: 404,
  message: 'Ban not found'
})
</script>