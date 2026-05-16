<template>
  <div>
    <BanCard :steamid="steamid" />
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from '@jzpanel/common/User'
import BanCard from '~/components/users/BanCard.vue';

defineProps<{
  steamid: string
  data: APIUserDetails
}>()
</script>