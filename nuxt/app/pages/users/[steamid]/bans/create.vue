<template>
  <div>
    <BanContainer :steamid="steamid" />
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@srcpanel/common/User";
import BanContainer from "~/components/users/BanContainer.vue";

defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();
</script>
