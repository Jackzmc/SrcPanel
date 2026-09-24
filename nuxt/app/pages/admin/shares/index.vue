<template>
  <div>
    <Hero title="Shares" subtitle="" />
    <UContainer>
      <UAlert v-if="error" type="error" color="error" title="Error occurred" :description="error.message" />
      <div class="grid sm:grid-cols-4 grid-cols-1 gap-4">
        <ShareCard v-for="share in shares" :key="share.id" :share="share" />
      </div>
      <div v-if="!shares || shares.length === 0" class="text muted text-center">
        No shares have been found
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { ShareData } from "@srcpanel/common/Share";
import ShareCard from "~/components/shares/ShareCard.vue";

useSeoMeta({
  title: "Shares",
  description: "Manage addons and files",
});
const { requireAuth } = useAuth();
await requireAuth();

const api = useApi();

const { data: shares, error } = await useAsyncData<ShareData[]>(
  "shares",
  () => api("/shares"),
);
</script>
