<template>
  <UCard>
    <div class="flex">
      <h3 class="text-lg">
        <IconText leading-icon="lucide:message-square" text="Comments"" />
      </h3>
      <UBadge :label="discuss.commentsCount" variant="subtle" />
      <IconText v-if="status === 'pending'" leading-icon="i-lucide-loader-circle" leading-icon-class="animate-spin" class="ml-2" />
    </div>

    <div v-if="comments" class="flex flex-col my-3 mx-2">
      <Comment v-for="comment in comments" :key="comment.id" :comment="comment" class="border-b border-b-neutral-300 py-2 last:border-b-0" />
      <p v-if="comments.length === 0" class="text-muted">No comments here, be the first</p>
    </div>
    <UAlert v-else-if="error" color="error" :description="error.message" />

    <form @submit.prevent="submitComment">
      <UCard variant="subtle">
        <div class="flex flex-col gap-2">
          <div class="flex gap-1">
            <UserComponent v-if="props.discuss.flags & APIDiscussionFlags.CommentsPublic" :user="user!.user" hide-name hide-tooltip />
            <h3 class="text-lg font-bold">
              Respond to discussion
              <span class="text-neutral-500 dark:text-neutral-300">(as {{ (props.discuss.flags & APIDiscussionFlags.CommentsPublic) ? user!.user.name : 'anonymous' }})</span>
            </h3>
          </div>
          <UTextarea v-model="submitCommentText" placeholder="Your comment here..." :rows="5" required autocorrect tabindex="1" @keydown.enter.prevent.ctrl="submitComment" :disabled="submitCommentLoading" />
          <UButton type="submit" class="w-fit" trailing-icon="lucide:send" :disabled="submitCommentText.length === 0" :loading="submitCommentLoading" tabindex="2">Submit Reply</UButton>
        </div>
      </UCard>
    </form>
  </UCard>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, type APIComment, type APIDiscussion } from '@jzpanel/common/Discussions';
import Comment from './Comment.vue';

const { user } = useAuth()
const toast = useToast()

const props = defineProps<{
  discuss: APIDiscussion
}>()

const api = useApi()

const { data: comments, error, refresh, status } = useLazyAsyncData<APIComment[]>(
  `discuss.${props.discuss.id}.comments`,
  () => api(`/discussions/${props.discuss.id}/comments`)
)
const submitCommentText = ref("")
const submitCommentLoading = ref(false)

async function submitComment() {
  if(!submitCommentText.value) return
  submitCommentLoading.value = true
  const result = await request(`/api/discussions/${props.discuss.id}/comments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      content: submitCommentText.value
    })
  })
  if ('error' in result) {
    toast.add({
      color: "error",
      title: "Failed to submit comment",
      description: result.error.message,
    })
  } else {
    submitCommentText.value = ""
    refresh()
  }
  submitCommentLoading.value = false
}
</script>
