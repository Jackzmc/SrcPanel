<template>
<div class="list">
  <div class="list-item" v-for="(comment, i) in comments" :key="i">
    <div class="list-item-image">
      <figure class="image is-32x32" :data-tooltip="comment.creator.name">
        <img class="is-rounded" :src="comment.creator.avatarUrl">
      </figure>
    </div>
    <div class="list-item-content">
      <div class="list-item-title">
        {{ comment.creator.name }} <span class="tag">{{ formatDate(comment.timestamp) }}</span>
      </div>
      <div class="list-item-content">
        {{ comment.content }}
      </div>
    </div>
  </div>
  <div class="list-item has-background-light">
    <div class="list-item-image">
      <figure class="image is-32x32" :data-tooltip="privUser.name">
        <img class="is-rounded" :src="'/api/users/' + privUser.id + '/avatar'">
      </figure>
    </div>
    <div class="list-item-content">
      <div class="list-item-title">
        Submit New Comment
      </div>
      <div class="list-item-description" @mouseover="newComment.hovered = true" @mouseout="newComment.hovered = false">
        <textarea v-model="newComment.content" type="text" @focus="newComment.focused = true" @blur="newComment.focused = false" :class="['input', {'expanded-box': newComment.focused || newComment.hovered }]" placeholder="Enter a comment" style="width:70%" cols=10 :rows="10"></textarea>
        <br>
        <div class="buttons mt-3">
          <a class="button is-success" v-if="newComment.content != ''">Submit</a>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PrivilegedUser } from '../../js/User';
import { formatDate } from '@/js/util.js';
import { APIComment } from '../../../../common-types/Discussions';

let newComment = ref({
  focused: false,
  hovered: false,
  content: ""
})

const props = defineProps<{
  privUser: PrivilegedUser,
  comments: APIComment[]
}>()
</script>

<style>
.expanded-box {
  height: 100px;
}
</style>
