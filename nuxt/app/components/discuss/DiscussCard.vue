<template>
  <UCard>
    <div>
      <div class="flex justify-between gap-3 items-start">
        <h2 class="text-lg font-semibold">
          <strong class="font-bold text-xl">Discuss: </strong>
          {{ discuss.title }}
        </h2>
        <UBadge class="align-right" leading-icon="lucide:message-square" variant="outline" color="neutral">
          <UTooltip label="Number of comments">
            {{ discuss.commentsCount }}
          </UTooltip>
        </UBadge>
      </div>
      <p class="text-sm">{{ discuss.description }}</p>

      <div class="grid grid-cols-2 gap-4 py-4">
        <DiscussChoice v-for="entry in options" :key="entry.option.id"
          :entry="entry"
          :type="discuss.type"
          :user-selection="userSelection"
          @select="onSelectOption"
        />
      </div>

      <p v-if="voteState !== VoteState.Inactive" class="">
        <IconText v-if="voteState === VoteState.Success" text="Vote submitted successfully" leading-icon="lucide:circle-check" class="text-success" />
        <IconText v-else text="Error while submitting vote" leading-icon="lucide:x" class="text-error" />
      </p>

      <div class="flex justify-between items-end">
        <div>
          <UAvatarGroup v-if="discuss.responses.users" max="8">
            <UserComponent v-for="user in discuss.responses.users" :key="user.id" :user="user" hide-name />
          </UAvatarGroup>
        </div>
        <div class="flex justify-between gap-4">
          <NuxtLink v-if="discuss.creator?.id == user?.user.steamid " :to="`/discuss/${discuss.id}/edit`" class="btn btn-sm btn-ghost text-primary">
            <IconText leading-icon="lucide:edit" text="Edit" />
          </NuxtLink>
          <NuxtLink :to="`/discuss/${discuss.id}`" class="btn btn-sm btn-ghost text-primary">
            <IconText trailing-icon="lucide:move-right" text="View discussion" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { APIDiscussionType, type APIDiscussion } from '@common/Discussions'
import UserComponent from '@/components/UserComponent.vue'
import IconText from '@/components/IconText.vue'
import DiscussChoice from './DiscussChoice.vue';
import type { DiscussOptionEntry } from '#shared/types/discuss'
import debounce from '@common/methods/debounce';

const enum VoteState {
  Inactive,
  Success,
  Error
}

const props = defineProps<{
  discuss: APIDiscussion
}>()

const { user } = useAuth()

const options = computed(() => {
  return props.discuss.options?.map<DiscussOptionEntry>((option) => {
    const id = option.id.toString()
    return {
      option,
      count: props.discuss.responses.counts[id],
      users: props.discuss.responses.users?.filter(user => user.choices?.includes(id))
    }
  })
})

const userSelection = ref<number[]>(props.discuss.userSelection)
const voteState = ref(VoteState.Inactive)

async function onSelectOption(optionId: number) {
  if(props.discuss.type == APIDiscussionType.Checkbox) {
    const index = userSelection.value.indexOf(optionId)
    if (index > -1) {
      userSelection.value = userSelection.value.splice(index, 1)
    } else {
      userSelection.value.push(optionId)
    }
    return
  } else {
    userSelection.value = [optionId]
  }
}

watch(userSelection, () => submitVoteDebounce())

async function submitVote() {
  voteState.value = VoteState.Inactive

  let body
  if(props.discuss.type == APIDiscussionType.Checkbox) {
    body = { option: userSelection.value }
  } else if(props.discuss.type == APIDiscussionType.Radio) {
    body = { option: userSelection.value.toString() }
  }

  const result = await request<null>(`/api/discussions/${props.discuss.id}/choose`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if ('body' in result) {
    voteState.value = VoteState.Success
  } else {
    voteState.value = VoteState.Error
    console.error('Submit vote error', result.error)
  }
  clearVoteResult()
}
const clearVoteResult = debounce(() => {
  voteState.value = VoteState.Inactive
}, 4000)
const submitVoteDebounce = debounce(submitVote, 200)
</script>
