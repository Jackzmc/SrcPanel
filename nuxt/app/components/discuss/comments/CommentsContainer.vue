<template>
  <UCard>
    <div class="flex">
      <h3 class="text-lg">
        <IconText leading-icon="lucide:message-square" text="Comments"" />
      </h3>
      <UBadge :label="discuss.commentsCount" variant="subtle" />
    </div>
    <div v-if="comments" class="flex flex-col my-3 mx-2">
      <Comment v-for="comment in comments" :key="comment.id" :comment="comment" class="border-b border-b-neutral-300 py-2" />
    </div>
    <UAlert v-else-if="error" color="error" :description="error.message" />

    <UCard variant="subtle">
      <div class="flex flex-col gap-2">
        <div class="flex gap-1">
          <UserComponent :user="user!.user" hide-name hide-tooltip />
          <h3 class="text-lg font-bold">
            Respond to discussion
            <span class="text-neutral-500 dark:text-neutral-300">(as {{ user!.user.name }})</span>
          </h3>
        </div>
        <UTextarea v-model="submitCommentText" placeholder="Your comment here..." rows=5 />
        <UButton @click="submitComment" class="w-40" trailing-icon="lucide:send">Submit Reply</UButton>
      </div>
    </UCard>
  </UCard>
</template>

<script setup lang="ts">
import type { APIComment, APIDiscussion } from '@common/Discussions';
import Comment from './Comment.vue';

const { user } = useAuth()

const props = defineProps<{
  discuss: APIDiscussion
}>()

const { data: comments, error, status } = await useFetch<APIComment[]>(`/api/discussions/${props.discuss.id}/comments`, { key: `discuss.${props.discuss.id}.comments`})

const submitCommentText = ref("")

async function submitComment() {

}
</script>
