<template>
  <DiscussEditCreate :discuss="defaultDiscuss" mode="new" />
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussionBase } from '@jzpanel/common/Discussions';

const route = useRoute()
const { requireAuth } = useAuth()
await requireAuth()

const defaultDiscuss: APIDiscussionBase = {
  title: route.query.title as string,
  timestamp: Date.now(),
  closedAt: 0,
  type: APIDiscussionType.Radio,
  description: route.query.description as string,
  options: [],
  flags: APIDiscussionFlags.None
}

useHead({
  title: `Create Discussion`,
})
</script>
