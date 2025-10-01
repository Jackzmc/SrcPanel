<template>
<div class="box question-box">
  <div class="taglist">
    <router-link v-if="discuss.commentsCount > 0" :to="{name: 'discuss-view', params:{id: discuss.id.toString(), title: urlTitle }, hash: '#comments' }" class="ml-3 tag is-pulled-right is-inline is-white"
      data-tooltip="Number of comments">
      <Icon icon="far fa-comments">{{ discuss.commentsCount }}</Icon>
    </router-link>
    <template v-if="discuss.closedAt">
      <span v-if="isClosed" class="tag is-danger is-inline is-pulled-right">
        <Icon icon="fa-clock">Closed</Icon>
      </span>
      <span v-else class="tag is-link is-inline is-pulled-right">
        <Icon icon="fa-clock">Closes {{ expiresText }}</Icon>
      </span>
    </template>
  </div>
  <h5 class="title is-5"><b>Discuss:</b> {{ discuss.title }}</h5>
  <FormatText v-if="discuss.description" class="subtitle mt-1" :text="discuss.description" markdown />

  <div v-if="discuss.type == APIDiscussionType.Radio || discuss.type == APIDiscussionType.Checkbox" class="columns is-mobile is-multiline">
    <div v-for="option of discuss.options" :key="option.id" class="column is-6" @click="selectChoice(option)">
      <div style="height:100%" :class="['box','field',{'is-clickable': canInteract}]">
        <input v-if="canInteract && isSelection && 'selected' in discuss" :id="option.id.toString()" v-model="discuss.selected" readonly :value="option" class="is-checkradio" :type="optionType" :name="'choice' + discuss.id">
        <label :for="option.id.toString()">{{ option.label }}</label>
        <span v-if="showPercents" class="is-pulled-right has-text-info">
          {{ Math.round((responses!.counts![option.id.toString()]?.percent || 0) * 100) }}%
        </span>
      </div>
    </div>
  </div>
  <div v-else-if="discuss.type == APIDiscussionType.ShortText">
    <Field>
      <input v-model.trim="discuss.value" type="text" class="input" placeholder="Enter your submission" @input="submitChoiceDebounceMultiOrText">
    </Field>
  </div>
  <div v-else-if="discuss.type == APIDiscussionType.LongText">
    <Field>
      <textarea v-model="discuss.value" class="textarea" placeholder="Enter your submission" @input="submitChoiceDebounceMultiOrText"></textarea>
    </Field>
  </div>
  <div v-else>
   Unsupported Discussion Type
  </div>
  <div v-if="!selected" class="columns mt-3 actions">
    <div class="column">
      <div v-if="discuss.responses.users" class="columns is-gapless is-mobile">
        <div v-for="(user, i) in discuss.responses.users.slice(0, MAX_DISCUSSION_AVATARS)" :key="i" class="column is-narrow">
          <figure class="image is-32x32" :data-tooltip="user.name">
              <LazyImage alt="User's avatar" img-class="is-rounded" :src="user.avatarUrl"
                placeholder-src="/img/steam_default_avatar.png" />
          </figure>
        </div>
        <div v-if="discuss.responses.totalCount > MAX_DISCUSSION_AVATARS" class="column mx-2 mt-2">
          <p>... and {{ discuss.responses.totalCount - MAX_DISCUSSION_AVATARS }} more</p>
        </div>
      </div>
    </div>
    <div class="column is-4">
      <router-link :to="{name: 'discuss-view',params:{id: discuss.id.toString(), title: urlTitle }}" class="is-small is-pulled-right"><Icon icon="fa-arrow-right" text-left="View responses" /></router-link>
      <router-link v-if="privUser.equals(discuss.creator.id)" :to="{name: 'discuss-edit', params:{id: discuss.id.toString()}}" class="is-small is-pulled-right mr-2"><Icon icon="fa-edit" text="Edit" /></router-link>
    </div>
  </div>
  <p v-if="selected && isClosed" class="has-text-danger">
    <Icon icon="fa-clock"> This discussion has closed and no more responses are accepted</Icon>
  </p>
  <p v-if="discuss.state == DiscussionState.SavedSuccess" class="has-text-success">
    <Icon icon="fa-circle-check"> Choice saved successfully</Icon>
  </p>
  <p v-else-if="discuss.state == DiscussionState.SavedError" class="has-text-danger">
    <Icon icon="fa-times"> Could not save your choice. Please try again later.</Icon>
  </p>
  <p v-else-if="discuss.state == DiscussionState.Saving">
    <Icon icon="fa-spinner" spin> Saving your choice</Icon>
  </p>
</div>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, APIDiscussion, APIDiscussionOption, DiscussionState, Discussion, APIDiscussionDetails, APIResponsesData, APIComment } from '../../../../common-types/Discussions';
import { request } from '@/js/util.js';
import debounce from '@/js/debounce.js';
import { ref, computed, onMounted } from 'vue';
import Sugar from 'sugar'
import { PrivilegedUser } from '../../js/User';
import Field from '@/components/Field.vue'
import FormatText from '@/components/FormatText.vue'
import LazyImage from '../LazyImage.vue';

const MAX_DISCUSSION_AVATARS = 10
const DISCUSSION_SAVE_NOTIFICATION_DURATION = 1000 * 3

const optionType = computed(() => {
  return discuss.value.type == APIDiscussionType.Checkbox ? 'checkbox' : 'radio'
})
const isSelection = computed(() => {
  return discuss.value.type == APIDiscussionType.Selection || discuss.value.type == APIDiscussionType.Checkbox || discuss.value.type == APIDiscussionType.Radio
})

const urlTitle = computed(() => {
  return discuss.value.title.toLocaleLowerCase().trim().replace(/\s/g,'-').replace(/[^a-zA-Z0-9-]/g,'')
})

const props = defineProps<{
  privUser: PrivilegedUser,
  modelValue: Discussion,
  selected?: boolean,
  responses?: APIResponsesData
}>()
let discuss = ref(props.modelValue)
const emit = defineEmits<{
  (e: 'update:modelValue', discuss: Discussion): void
}>()

const expiresText = computed(() => {
  return discuss.value.closedAt ? new Sugar.Date(discuss.value.closedAt*1000).relative() : null
})
const isClosed = computed(() => {
  return discuss.value.closedAt && (discuss.value.closedAt*1000) < Date.now()
})
const showPercents = computed(() => {
  if(!(discuss.value.flags & APIDiscussionFlags.RespondersPublic)) return false
  return props.responses?.counts != undefined
})
const canInteract = computed(() => {
  return !(discuss.value.flags & APIDiscussionFlags.Archived) && !isClosed.value
})

function escapeHtml(unsafe: string) {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

async function selectChoice(option?: APIDiscussionOption) {
  console.log("selectChoice")
  if(!canInteract.value) return
  if(Date.now() - discuss.value.lastEditTime < 10) return
  discuss.value.lastEditTime = Date.now()
  if(discuss.value.type == APIDiscussionType.Radio) {
    // Ignore selecting the same option again.
    if(!option || discuss.value.selected?.id == option.id) return
    console.log("set option", option)
    // discuss.value.selected = option
    submitChoiceDebounceRadio()
  } else if(discuss.value.type == APIDiscussionType.Checkbox || discuss.value.type == APIDiscussionType.Selection) {
    submitChoiceDebounceMultiOrText()
  } else if(discuss.value.type == APIDiscussionType.LongText || discuss.value.type == APIDiscussionType.ShortText) {
    // Ignore empty submissions
    if(!discuss.value.value || discuss.value.value == "") return
    submitChoiceDebounceMultiOrText()
  }
  if(discuss.value.flags & APIDiscussionFlags.RespondersPublic && discuss.value.responses.users) {
    if(!discuss.value.responses.users.some(user => user.id == props.privUser.id)) {
      discuss.value.responses.users.push({
        id: props.privUser.id,
        name: props.privUser.name,
        avatarUrl: props.privUser.avatarUrl
      })
    }
  }
  emit("update:modelValue", discuss.value)
}
async function submitChoice() {
  if(discuss.value.type === APIDiscussionType.Checkbox || discuss.value.type === APIDiscussionType.Selection || discuss.value.type === APIDiscussionType.Radio) {
    if(!discuss.value.selected) return
  }
  discuss.value.state = DiscussionState.Saving

  // TODO: abort controller?
  const data: { option?: string[]|string, text?: string } = {}
  if(discuss.value.type == APIDiscussionType.Checkbox || discuss.value.type == APIDiscussionType.Selection) {
    data.option = []
    discuss.value.selected.every(opt => (data.option! as string[]).push(opt.id.toString()))
  } else if(discuss.value.type == APIDiscussionType.Radio)
    data.option = discuss.value.selected!.id.toString()
  else if(discuss.value.type == APIDiscussionType.ShortText || discuss.value.type == APIDiscussionType.LongText) {
    data.text = discuss.value.value
  }

  const response = await request(`/api/discussions/${discuss.value.id}/choose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if(response?.ok) {
    discuss.value.state = DiscussionState.SavedSuccess
  } else {
    discuss.value.state = DiscussionState.SavedError
  }

  setTimeout(() => {
    if(discuss.value.state != DiscussionState.Saving)
    discuss.value.state = DiscussionState.PendingAnswer
  }, DISCUSSION_SAVE_NOTIFICATION_DURATION)
}
const submitChoiceDebounceMultiOrText = debounce(submitChoice, 2000)
const submitChoiceDebounceRadio = debounce(submitChoice, 400)

</script>

<style scoped>
.md-image {
  max-width: 64%;
  max-height: 64%;
}
@media screen and (max-width: 640px) {
  .actions {
    margin-bottom: 3px;
  }
}
</style>
