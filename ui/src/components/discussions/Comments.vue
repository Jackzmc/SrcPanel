<template>
<div class="list has-visible-pointer-controls">
  <div class="list-item" v-for="(comment, i) in comments" :key="i">
    <div class="list-item-image" v-if="discussion.flags & APIDiscussionFlags.CommentsPublic && comment.creator">
      <figure class="image is-32x32" :data-tooltip="comment.creator.name">
        <img class="is-rounded" :src="comment.creator.avatarUrl">
      </figure>
    </div>
    <div class="list-item-content">
      <div class="list-item-title">
        <router-link v-if="hasCommentsPublic && comment.creator" :to="{ name: 'manage-user', params: { id: comment.creator.id }, query: { returnTo: $route.fullPath }}">
          {{ comment.creator.name ?? comment.creator.id }}
        </router-link>
        <span v-else>
          Anonymous
        </span>
        <span class="is-pulled-right has-text-weight-normal tag">
          <Icon icon="fa-clock" class="no-border" :data-tooltip="formatDate(comment.timestamp)">
            {{ new Sugar.Date(comment.timestamp*1000).relative() }}
          </Icon>
        </span>
      </div>
      <div class="list-item-content py-1 pt-2" style="word-wrap:anywhere">
        <div>
          {{ comment.content }}
        </div>
      </div>

    </div>
    <div class="list-item-controls">
    </div>
  </div>
  <div class="list-item has-background-light py-4 px-4" style="border-top: 4px solid rgb(219, 219, 219)" v-if="!isArchived">
    <div class="list-item-content">
      <div class="list-item-title mb-3">
        <div>
            <figure v-if="hasCommentsPublic" class="image is-32x32 avatar" :data-tooltip="privUser.name">
              <img class="is-rounded" :src="'/api/users/' + privUser.id + '/avatar'">
            </figure>
            Respond to discussion
            <template v-if="!hasCommentsPublic">(as anonymous)</template>
            <template v-else>(as {{ privUser.name }})</template>
        </div>

      </div>
      <div class="list-item-description" @focus="newComment.hovered = true" @blur="newComment.hovered = false">
        <textarea v-model="newComment.content" type="text" @focus="newComment.focused = true" @blur="newComment.focused = false" :class="['input', {'expanded-box': true }]" placeholder="Enter a reply to the discussion" cols=10 :rows="10"></textarea>
        <br>
        <div class="buttons mt-3">
          <a class="button is-info" :disabled="newComment.content === '' ? true : undefined" @click="submit">Submit Reply</a>
        </div>
      </div>
    </div>
  </div>
  <p class="has-text-danger" v-if="isArchived">
    <Icon icon="fa-box-archive"> This discussion has been archived, no more comments can be submitted.</Icon>
  </p>
</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PrivilegedUser } from '../../js/User';
import { formatDate, request } from '@/js/util.js';
import { APIComment, Discussion, APIDiscussionFlags } from '../../../../common-types/Discussions';
import { notify } from '@kyvg/vue3-notification';
import Sugar from 'sugar'


const emit = defineEmits(["comment"])


const props = defineProps<{
  privUser: PrivilegedUser,
  comments: APIComment[],
  discussion: Discussion
}>()

const isClosed = computed(() => {
  return props.discussion.closedAt && (props.discussion.closedAt*1000) < Date.now()
})

const isArchived = computed(() => {
  return (props.discussion.flags & APIDiscussionFlags.Archived) != 0
})

const hasCommentsPublic = computed(() => {
  return (props.discussion.flags & APIDiscussionFlags.CommentsPublic) != 0
})

let newComment = ref({
  focused: false,
  hovered: false,
  content: ""
})

async function submit() {
  const response = await request(`/api/discussions/${props.discussion.id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: newComment.value.content })
  })
  if(response?.ok) {
    const json = await response.json()
    notify({
      type: "success",
      text: "Comment submitted",
      title: `Discussion #${props.discussion.id}`
    })
    emit("comment", json)
    newComment.value.content = ""
    newComment.value.hovered = false
    newComment.value.focused = false
  }
}
</script>

<style scoped>
.expanded-box {
  height: 100px;
}
</style>
