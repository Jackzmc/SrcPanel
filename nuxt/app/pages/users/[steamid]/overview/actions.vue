<template>
  <div>
    <p class="text-muted">
      Profile
    </p>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@jzpanel/common/User";

defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();
</script>
