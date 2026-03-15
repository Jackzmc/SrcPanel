<template>
  <UCard>
    <div class="space-y-">
      <div class="flex justify-between gap-3 items-start">
        <h2 class="text-xl font-semibold">
          <strong class="font-bold">Discuss: </strong>
          {{ discuss.title }}
        </h2>
        <UBadge class="align-right":label="discuss.commentsCount" leading-icon="lucide:message-square" variant="outline" color="neutral" />
      </div>
      <p class="text-sm">{{ discuss.description }}</p>

      <div class="flex gap-4">
        <DiscussChoice v-for="choice in discuss.options" :key="choice.id" :option="choice" />
      </div>

      <div class="flex justify-between my-2 items-end">
        <div>
          <UAvatarGroup v-if="discuss.responses.users" max="8">
            <UserComponent v-for="user in discuss.responses.users" :key="user.id" :user="user" hide-name/>
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

const props = defineProps<{
  discuss: APIDiscussion
}>()

const { user } = useAuth()
</script>
