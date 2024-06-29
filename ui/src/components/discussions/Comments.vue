<template>
<div class="list has-visible-pointer-controls">
  <div class="list-item" v-for="(comment, i) in comments" :key="i">
    <div class="list-item-image" v-if="discussion.flags & APIDiscussionFlags.CommentsPublic">
      <figure class="image is-32x32" :data-tooltip="comment.creator.name">
        <img class="is-rounded" :src="comment.creator.avatarUrl">
      </figure>
    </div>
    <div class="list-item-content">
      <div class="list-item-title">
        <router-link v-if="discussion.flags & APIDiscussionFlags.CommentsPublic" :to="{ name: 'manage-user', params: { id: comment.creator.id }, query: { returnTo: $route.fullPath }}">
          {{ comment.creator.name ?? comment.creator.id }}
        </router-link>
      </div>
      <div class="list-item-content">
        {{ comment.content }}
      </div>

    </div>
    <div class="list-item-controls">
      <div class="list-item-controls">
        <Icon icon="fa-clock">{{ formatDate(comment.timestamp) }}</Icon>
      </div>
    </div>
  </div>
  <div class="list-item has-background-light" v-if="!isArchived">
    <div class="list-item-image" v-if="discussion.flags & APIDiscussionFlags.CommentsPublic">
      <figure class="image is-32x32" :data-tooltip="privUser.name">
        <img class="is-rounded" :src="'/api/users/' + privUser.id + '/avatar'">
      </figure>
    </div>
    <div class="list-item-content">
      <div class="list-item-title">
        Submit New Comment <template v-if="~discussion.flags & APIDiscussionFlags.CommentsPublic">(anonymously)</template>
      </div>
      <div class="list-item-description" @mouseover="newComment.hovered = true" @mouseout="newComment.hovered = false">
        <textarea v-model="newComment.content" type="text" @focus="newComment.focused = true" @blur="newComment.focused = false" :class="['input', {'expanded-box': newComment.focused || newComment.hovered }]" placeholder="Enter a comment" style="width:70%" cols=10 :rows="10"></textarea>
        <br>
        <div class="buttons mt-3">
          <a class="button is-success" v-if="newComment.content != ''" @click="submit">Submit</a>
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
