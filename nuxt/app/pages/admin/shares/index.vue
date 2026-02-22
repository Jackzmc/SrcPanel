<template>
  <div>
    <Hero title="Shares" subtitle="" />
    <UContainer>
      <div class="grid grid-cols-2 gap-4">
        <UCard v-for="share of shares" :key="share.id">
          <h3>{{ share.title }}</h3>
          {{JSON.stringify(share)}}
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Shares"
})
const { requireAuth } = useAuth()
await requireAuth()

const api = useApi()

const { data: shares, pending, error } = await useAsyncData<any>(
  'shares',
  () => api('/shares')
)
</script>
