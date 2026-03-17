<template>
<div class="flex justify-between items-start">
  <div class="flex flex-row gap-2 items-center">
    <UserComponent :user="comment.creator" hide-tooltip hide-name />
    <div class="flex flex-col">
      <h4 class="text-lg font-semibold">
        {{ comment.creator.name ?? comment.creator.id }}
      </h4>
      <div class="gap-x-1 flex items-start flex-wrap text-wrap">
        <p>{{ comment.content }}</p>
      </div>
    </div>
  </div>
  <UBadge :label="getRelDate(comment.timestamp)" variant="subtle" color="neutral" leading-icon="lucide:clock" size="sm" />
</div>
</template>
<script setup lang="ts">
import type { APIComment } from '@common/Discussions';
import { getRelDate } from '@common/methods/format';

const props = defineProps<{
  comment: APIComment
}>()
</script>
