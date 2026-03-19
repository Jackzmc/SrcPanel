<template>
  <DiscussEditCreate :discuss="defaultDiscuss" mode="new" />
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussionBase } from '@common/Discussions';

const route = useRoute()

const defaultDiscuss: APIDiscussionBase = {
  title: route.query.title as string,
  timestamp: Date.now(),
  closedAt: undefined,
  type: APIDiscussionType.Radio,
  description: route.query.description as string,
  options: [],
  flags: APIDiscussionFlags.None
}
</script>
