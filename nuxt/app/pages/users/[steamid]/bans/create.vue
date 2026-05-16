<template>
  <div>
    <BanContainer :steamid="steamid" />
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from '@jzpanel/common/User'
import BanContainer from '~/components/users/BanContainer.vue';

defineProps<{
  steamid: string
  data: APIUserDetails
}>()
</script>