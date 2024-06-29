<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <template v-if="selectedDiscussion">
        <div class="block mb-2">
          <router-link :to="{params: { id: '', title: '' }}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to discussions" /></router-link>
        </div>
        <br>
        <b>Creator</b>
        <div><UserComponent :user="selectedDiscussion.creator"></UserComponent></div>
        <DiscussionBox :priv-user="privUser" v-model="selectedDiscussion" selected :responses="responses" />
        <div class="box">
          <h4 class="title is-4 mb-0"><Icon icon="far fa-comment">Discussion</Icon></h4>
          <Comments v-if="comments" :priv-user="privUser" :comments="comments" :discussion="selectedDiscussion" @comment="onSubmitComment"></Comments>
          <p class="has-text-centered my-3" v-else><Icon icon="fa-spinner" spin>Loading comments...</Icon></p>
        </div>
      </template>
      <template v-else-if="discussions">
        <DiscussionBox :priv-user="privUser" v-for="(discuss, index) in discussions" :key="discuss.id" v-model="discussions[index]" :responses="discuss.responses" />
        <p class="has-text-centered my-3 is-size-3" v-if="discussions.length === 0">There are no active discussions, start one!</p>
      </template>
      <p class="mt-5 has-text-centered is-size-4" v-else>
        <Icon icon="fa-spinner" spin>Loading discussions...</Icon>
      </p>
    </div>
    <div class="column" v-if="selectedDiscussion">
      <h4 class="title is-4">Respondants ({{ selectedDiscussion.responses.totalCount }}) ({{ Math.round(selectedDiscussion.responses.percentVoted * 100) }}%)</h4>
      <div class="list has-visible-pointer-controls" v-if="selectedDiscussion.responses.users">
        <div class="list-item" v-for="(user, i) in selectedDiscussion.responses.users" :key="i">
          <div class="list-item-image">
            <figure class="image is-32x32" :data-tooltip="user.name">
                <img class="is-rounded" :src="user.avatarUrl">
              </figure>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">
              {{ user.name }}
            </div>
          </div>
          <div class="list-item-controls" v-if="selectedDiscussion.flags & APIDiscussionFlags.ResponsesPublic">
            {{ user.choices?.join(', ') }}
          </div>
        </div>
      </div>
    </div>
    <div class="column is-offset-1" v-else>
      <Field label="Start A New Discussion" icon-left="far fa-comment" info="Press enter to continue">
        <input type="text" class="input is-rounded" placeholder="Enter a title"  @keyup.enter="startNewDiscussion">
      </Field>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, computed, onBeforeUnmount, onUnmounted, onMounted, watch, onActivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DiscussionBox from '@/components/discussions/DiscussionBox.vue'
import Comments from '@/components/discussions/Comments.vue'
import { APIDiscussionFlags, APIDiscussionType, APIDiscussion, APIDiscussionOption, DiscussionState, Discussion, APIDiscussionDetails, DiscussionDetailed, APIResponsesData, APIComment, APIUserWithChoice } from '../../../common-types/Discussions';
import { request } from '@/js/util.js';
import Field from '@/components/Field.vue';
import UserComponent from '@/components/UserComponent.vue';


const route = useRoute()
const router = useRouter()
const { notify } = useNotification();

const props = defineProps<{
  privUser: PrivilegedUser
}>();

let discussions = ref<Discussion[]>()
let selectedDiscussion = ref<Discussion>()
let comments = ref<APIComment[]>()
let responses = ref<APIResponsesData>()

watch(() => route.params.id, async (val) => {
  console.log(route.name, route.params, val)
  if(route.name !== 'discuss') return
  const id = Number(val)
  if(val && !isNaN(id)) {
    await selectDiscussion(id)
  } else {
    selectedDiscussion.value = undefined
  }
})
async function selectDiscussion(id: number) {
  selectedDiscussion.value = discussions.value?.find(discuss => discuss.id == id)
  comments.value = undefined
  responses.value = undefined
  const response = await request(`/api/discussions/${id}`)
  if(response?.ok) {
    const json: APIDiscussionDetails = await response.json()
    // @ts-expect-error close enough... in case its new, where its not in cache.
    selectedDiscussion.value = json as Discussion
    comments.value = json.comments
    responses.value = json.responses
  }
}
async function fetchDiscussions() {
  const response = await request("/api/discussions")
  if(response?.ok) {
    const json: APIDiscussion[] = await response.json()
    discussions.value = json.map(discuss => {
      let selected: APIDiscussionOption[] | APIDiscussionOption | undefined = undefined
      if(discuss.type === APIDiscussionType.Checkbox) {
        selected = []
      }
      if(discuss.userSelection.length > 0) {
        if(discuss.type == APIDiscussionType.Radio) {
          selected = discuss.options!.find(opt => discuss.userSelection[0] == opt.id)
        } else {
          selected = discuss.options!.filter(opt => discuss.userSelection.includes(opt.id))
        }
      }
      return {
        ...discuss,
        selected,
        state: DiscussionState.PendingAnswer,
        lastEditTime: 0
      } as Discussion
    })
  }
}
function startNewDiscussion(event: KeyboardEvent) {
  const target = event.target as HTMLInputElement
  if(!target.value || target.value == "") return
  router.push({
    name: "discuss-new",
    query: {
      title: target.value
    }
  })
}
function onSubmitComment(comment: APIComment) {
  if(!comments.value) return
  comments.value.push(comment)
}

onActivated(async () => {
  console.log("activated")
  await fetchDiscussions()
  if(route.params.id) {
    await selectDiscussion(Number(route.params.id))
  }
})


</script>

<style scoped>
.question-box {
  background-color: rgb(204, 240, 255);

}

[data-theme=dark] .question-box {
  background-color: #24292E;
  color: white;
}

</style>
