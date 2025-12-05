<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column is-1"></div>
    <div class="column is-7" style="height:100%">
      <template v-if="selectedDiscussion">
        <div class="block mb-3">
          <router-link :to="{name: 'discuss', params: { id: '', title: '' }}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to discussions list" /></router-link>

          <router-link v-if="privUser.equals(selectedDiscussion.creator.id)"
            :to="{name: 'discuss-edit', params:{id: selectedDiscussion.id.toString()}}" class="is-small is-pulled-right mr-2">
            <Icon icon="fa-edit" text="Edit Discussion" />
          </router-link>
        </div>
        <br>
        <div class="fixed-grid has-4-cols-tablet mb-4">
          <div class="grid">
            <div class="cell is-col-span-1">
              <b>Discussion started by</b>
              <div class="pt-1">
                <UserComponent :user="selectedDiscussion.creator"></UserComponent>
              </div>
            </div>
            <div class="cell is-col-span-1">
              <b>Discussion started</b>
              <div class="pt-1">
                <Icon icon="fa fa-clock" class="no-border" :data-tooltip="'on ' + formatDate(selectedDiscussion.timestamp)">
                  {{ getRelDate(selectedDiscussion.timestamp) }}
                </Icon>
              </div>
            </div>
          </div>
        </div>

        <DiscussionBox v-model="selectedDiscussion" :priv-user="privUser" selected :responses="responses" />

        <div class="box">
          <h4 class="title is-4 mb-2">
            <Icon icon="fas fa-comments" icon-class="mr-2">Comments</Icon>
            <span class="tag is-rounded ml-2 is-info" style="vertical-align: top;">{{ comments?.length ?? 0 }}</span>
          </h4>
          <Comments v-if="comments" id="comments" :priv-user="privUser" :comments="comments" :discussion="selectedDiscussion" @comment="onSubmitComment"></Comments>
          <p v-else class="has-text-centered my-3 py-4 is-size-5"><Icon icon="fa-spinner" spin></Icon></p>
        </div>
      </template>
      <template v-else-if="discussions">
        <DiscussionBox v-for="(discuss, index) in discussions" :key="discuss.id" v-model="discussions[index]" :priv-user="privUser" :responses="discuss.responses" />
        <p v-if="discussions.length === 0" class="has-text-centered my-3 is-size-3">There are no active discussions, start one!</p>
      </template>
      <p v-else class="mt-5 has-text-centered is-size-4">
        <Icon icon="fa-spinner" spin>Loading discussions...</Icon>
      </p>
    </div>
    <div v-if="selectedDiscussion" class="column">
      <h4 class="title is-4">Respondants ({{ selectedDiscussion.responses.totalCount }}) ({{ Math.round(selectedDiscussion.responses.percentVoted * 100) }}%)</h4>
      <p v-if="!(selectedDiscussion.flags & APIDiscussionFlags.ResponsesPublic)" class="subtitle is-5">Responses are hidden</p>
      <div v-if="selectedDiscussion.responses.users" class="list has-visible-pointer-controls">
        <div v-for="(user, i) in selectedDiscussion.responses.users" :key="i" class="list-item">
          <div class="list-item-image">
            <figure class="image is-32x32">
                <UserComponent img-class="is-rounded" :user="user" hide-name hide-tooltip />
              </figure>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">
              {{ user.name }}
            </div>
          </div>
          <div v-if="selectedDiscussion.flags & APIDiscussionFlags.ResponsesPublic" class="list-item-controls">
            {{ user.choices?.join(', ') }}
          </div>
        </div>
      </div>
    </div>
    <div v-else class="column ">
      <div class="box">
        <h4 class="title is-4 mb-4">Start a discussion</h4>
        <Field label="Disccusion topic / title" icon-left="fas fa-message">
          <input v-model="newDiscussionTitle" type="text" class="input is-rounded" placeholder="Ask a question" @keyup.enter="startNewDiscussion">
        </Field>
        <div class="button is-link" @click="startNewDiscussion">Start</div>
      </div>
    </div>
    <div class="column is-1"></div>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, watch, onActivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DiscussionBox from '@/components/discussions/DiscussionBox.vue'
import Comments from '@/components/discussions/Comments.vue'
import { APIDiscussionFlags, APIDiscussionType, APIDiscussion, APIDiscussionOption, DiscussionState, Discussion, APIDiscussionDetails, DiscussionDetailed, APIResponsesData, APIComment, APIUserWithChoice } from '../../../common-types/Discussions';
import { formatDate, getRelDate, request } from '@/js/util.js';
import Field from '@/components/Field.vue';
import UserComponent from '@/components/UserComponent.vue';
import LazyImage from '@/components/LazyImage.vue';


const route = useRoute()
const router = useRouter()

const props = defineProps<{
  privUser: PrivilegedUser
}>();

let discussions = ref<Discussion[]>()
let selectedDiscussion = ref<Discussion>()
let comments = ref<APIComment[]>()
let responses = ref<APIResponsesData>()

let newDiscussionTitle = ref("")

watch(() => route.name, async (val) => {
  init()
})

async function selectDiscussion(id: number) {
  selectedDiscussion.value = discussions.value?.find(discuss => discuss.id == id)
  comments.value = undefined
  responses.value = undefined
  await Promise.allSettled([
    fetchDiscussionDetails(id),
    fetchComments(id)
  ])
}
async function fetchDiscussionDetails(id: number) {
  const response = await request(`/api/discussions/${id}`)
  if(response?.ok) {
    const json: APIDiscussionDetails = await response.json()
    selectedDiscussion.value = json as Discussion
    responses.value = json.responses
  }
}
async function fetchComments(id: number) {
  const response = await request(`/api/discussions/${id}/comments`, undefined, { title: "Failed to fetch comments" })
  if(response?.ok) {
    const json: APIComment[] = await response.json()
    comments.value = json
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
function startNewDiscussion() {
  const title = newDiscussionTitle.value
  if(!title || title == "") return
  router.push({
    name: "discuss-new",
    query: {
      title: title
    }
  })
}
function onSubmitComment(comment: APIComment) {
  if(!comments.value) return
  comments.value.push(comment)
}

onActivated(async () => {
  init()
})

async function init() {
  // TODO: fix - discussion box radio buttons missing because 'selected' data is only sent on fetchDiscussions - not individual
  await fetchDiscussions()
  if(route.name === "discuss-view") {
    const id = Number(route.params.id)
    if(isNaN(id)) {
      console.error("Invalid ID", route.params.id, "for discussion; redirecting to list")
      return router.push({ name: "discuss-list" })
    }
    await selectDiscussion(id)
  } else {
    selectedDiscussion.value = undefined
  }
}


</script>

<style>

</style>
