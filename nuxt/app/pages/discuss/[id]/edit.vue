<template>
  <DiscussEditCreate :discuss="discuss" />
</template>
<script setup lang="ts">
import type { APIDiscussion } from '@common/Discussions';
import DiscussEditCreate from '@/components/discuss/DiscussEditCreate.vue';

const route = useRoute()
const { data: discuss } = await useFetch<APIDiscussion>(`/api/discussions/${route.params.id}`, { key: `discuss.${route.params.id}` })
</script>
