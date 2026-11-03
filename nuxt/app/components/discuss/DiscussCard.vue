<template>
  <UCard class="bg-gray-50 dark:bg-gray-950">
    <div>
      <div class="flex justify-between gap-3 items-start flex-wrap">
        <h2 class="text-lg font-semibold">
          <strong class="font-bold text-xl">Discuss: </strong>
          {{ discuss.title }}
        </h2>
        <div class="flex gap-1 sm:gap-2">
          <template v-if="discuss.closedAt">
            <UBadge v-if="isClosed" leading-icon="lucide:clock" color="error">
              Closed
            </UBadge>
            <UBadge v-else leading-icon="lucide:clock" class="bg-primary">
              Closes {{ expiresText }}
            </UBadge>
          </template>
          <UBadge
            v-if="(discuss.flags & APIDiscussionFlags.RespondersPublic) && discuss.submissions.totalVoted > 0"
            class="align-right"
            leading-icon="lucide:users"
            variant="outline"
            color="neutral"
          >
            <UTooltip text="Number of respondants">
              {{ discuss.submissions.totalVoted }}
            </UTooltip>
          </UBadge>
          <UBadge class="align-right" leading-icon="lucide:message-square" variant="outline" color="neutral">
            <UTooltip text="Number of comments">
              {{ discuss.commentsCount }}
            </UTooltip>
          </UBadge>
        </div>
      </div>
      <p class="text-sm">
        {{ discuss.description }}
      </p>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 py-4">
        <DiscussChoice
          v-for="entry in options"
          :key="entry.id"
          :entry="entry"
          :type="discuss.type"
          :editable="type == 'edit'"
          :user-selection="userSelectedOptionIds"
          @select="onSelectOption"
        />
      </div>

      <p v-if="voteState !== VoteState.Inactive" class="">
        <IconText v-if="voteState === VoteState.Success" text="Vote submitted successfully" leading-icon="lucide:circle-check" class="text-success" />
        <IconText v-else text="Error while submitting vote" leading-icon="lucide:x" class="text-error" />
      </p>

      <div v-if="type == 'list'" class="flex flex-wrap justify-between items-end">
        <div>
          <UAvatarGroup v-if="discuss.submissions?.users" max="8">
            <UserComponent v-for="entry in discuss.submissions.users" :key="entry.user.id" :user="entry.user" hide-name />
          </UAvatarGroup>
        </div>
        <div class="flex justify-between gap-4">
          <NuxtLink v-if="discuss.creator?.id == user?.user.steamid " :to="`/discuss/${discuss.id}/edit`" class="btn btn-sm btn-ghost text-primary">
            <IconText leading-icon="lucide:edit" text="Edit" />
          </NuxtLink>
          <NuxtLink :to="`/discuss/${discuss.id}/${slugify(discuss.title)}`" class="btn btn-sm btn-ghost text-primary">
            <IconText trailing-icon="lucide:move-right" text="View discussion" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussionWithSubmissions } from "@srcpanel/common/Discussions";
import type { APISubmitVoteRequest } from '@srcpanel/common/discussions/schemas'
import UserComponent from "@/components/UserComponent.vue";
import IconText from "@/components/IconText.vue";
import DiscussChoice from "./DiscussChoice.vue";
import { debounce } from "@srcpanel/common/util";
import { formatRelTime, slugify } from "@srcpanel/common/format";

const enum VoteState {
  Inactive,
  Success,
  Error,
}

const props = defineProps<{
  discuss: APIDiscussionWithSubmissions;
  type: "list" | "details" | "edit";
}>();

const { user } = useAuth();

const options = computed(() => {
  return props.discuss.options
});

const expiresText = computed(() => {
  return props.discuss.closedAt ? formatRelTime(props.discuss.closedAt) : null;
});
const isClosed = computed(() => {
  return props.discuss.closedAt && (props.discuss.closedAt * 1000) < Date.now();
});

function getUserSelection(): number[] {
  const ids: number[] = []
  props.discuss.userSelection?.map(sub => {
    if('choice' in sub) ids.push(sub.choice.id)
  })
  return ids
}

const userSelectedOptionIds = ref<number[]>(getUserSelection());
const userInput = ref<string>("")
const voteState = ref(VoteState.Inactive);

async function onSelectOption(optionId: number) {
  if (props.discuss.type == APIDiscussionType.Checkbox) {
    const index = userSelectedOptionIds.value.indexOf(optionId);
    if (index > -1) {
      userSelectedOptionIds.value = userSelectedOptionIds.value.splice(index, 1);
    } else {
      userSelectedOptionIds.value.push(optionId);
    }
    return;
  } else {
    userSelectedOptionIds.value = [optionId];
  }
}

watch(userSelectedOptionIds, () => submitVoteDebounce());

async function submitVote() {
  voteState.value = VoteState.Inactive;

  let body: APISubmitVoteRequest;
  if (props.discuss.type == APIDiscussionType.Checkbox) {
    body = { option: userSelectedOptionIds.value };
  } else if (props.discuss.type == APIDiscussionType.Radio) {
    body = { option: userSelectedOptionIds.value };
  } else if (props.discuss.type == APIDiscussionType.ShortText || props.discuss.type == APIDiscussionType.LongText) {
    body = { text: userInput.value }
  } else {
    throw new Error("Unsupported discussion type")
  }

  const result = await request<null>(`/api/discussions/${props.discuss.id}/choose`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if ("body" in result) {
    voteState.value = VoteState.Success;
  } else {
    voteState.value = VoteState.Error;
    console.error("Submit vote error", result.error);
  }
  clearVoteResult();
}
const clearVoteResult = debounce(() => {
  voteState.value = VoteState.Inactive;
}, 4000);
const submitVoteDebounce = debounce(submitVote, 200);
</script>
