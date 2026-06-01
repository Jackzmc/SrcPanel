<template>
  <div>
    <Hero title="Shares" subtitle="" />
    <UContainer>
      <div class="grid grid-cols-4 gap-4">
        <ShareCard v-for="share in shares" :key="share.id" :share="share" />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Shares"
})
import { type ShareData } from '@jzpanel/common/Share'
import ShareCard from '~/components/shares/ShareCard.vue'
const { requireAuth } = useAuth()
await requireAuth()

const api = useApi()

const { data: shares, pending, error } = await useAsyncData<ShareData[]>(
  'shares',
  () => api('/shares')
)
</script>
