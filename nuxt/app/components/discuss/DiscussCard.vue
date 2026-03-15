<template>
  <UCard>
    <div>
      <div class="flex justify-between gap-3 items-start">
        <h2 class="text-lg font-semibold">
          <strong class="font-bold text-xl">Discuss: </strong>
          {{ discuss.title }}
        </h2>
        <UBadge class="align-right":label="discuss.commentsCount" leading-icon="lucide:message-square" variant="outline" color="neutral" />
      </div>
      <p class="text-sm">{{ discuss.description }}</p>

      <div class="grid grid-cols-2 gap-4 py-4">
        <DiscussChoice v-for="entry in options" :key="entry.option.id" :entry="entry"  :type="discuss.type" />
      </div>

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
import type { APIDiscussion } from '@common/Discussions'
import UserComponent from '@/components/UserComponent.vue'
import IconText from '@/components/IconText.vue'
import DiscussChoice from './DiscussChoice.vue';
import type { DiscussOptionEntry } from '#shared/types/discuss'


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
</script>
