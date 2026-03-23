<template>
  <DiscussEditCreate :discuss="discuss!" mode="edit" />
</template>
<script setup lang="ts">
import type { APIDiscussion } from '@common/Discussions';
import DiscussEditCreate from '@/components/discuss/DiscussEditCreate.vue';

const { requireAuth } = useAuth()
await requireAuth()

const route = useRoute()
const { data: discuss } = await useFetch<APIDiscussion>(`/api/discussions/${route.params.id}`, { key: `discuss.${route.params.id}` })
if(!discuss.value) throw createError({
  status: 404,
  statusText: 'Discussion Not Found',
})
</script>
