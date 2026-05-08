<template>
  <Hero title="Discussions" />
  <UContainer>
    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-2 col-span-2">
        <div class="flex gap-4">
          <NuxtLink to="/discuss" class="text-md text-primary">← Back to discussions list</NuxtLink>
          <NuxtLink v-if="discuss?.creator.id == user?.user.steamid" :to="`/discuss/${route.params.id}/edit`" class="text-md text-primary"><IconText leading-icon="lucide:edit" text="Edit Discussion" /></NuxtLink>
        </div>
        <div v-if="discuss" class="flex justify-start gap-5  mt-3 mb-5 ">
          <div class="flex flex-col">
            <h2 class="text-md font-bold">Discussion started by</h2>
            <p class="text-sm">
              <UserComponent :user="discuss.creator" class="text-primary" size="xs" />
            </p>
          </div>
          <div class="flex flex-col">
            <h2 class="text-md font-bold">Discussion started</h2>
            <p class="text-sm">
              <IconText leading-icon="lucide:clock" :text="getRelDate(discuss.timestamp)" />
            </p>
          </div>
        </div>

        <UAlert v-if="error"  color="error" title="Error occurred" :description="error.message" />
        <template v-if="discuss">
          <DiscussCard :key="discuss.id" :discuss="discuss" type="details"/>
          <CommentsContainer :discuss="discuss" />
        </template>
      </div>
      <div>
        <h2 class="text-xl font-bold">
          Respondants
          <UTooltip text="# of admins who voted">({{ discuss?.responses.totalCount ?? 0 }})</UTooltip>
          <UTooltip text="Percentage of admins who voted">
            ({{ Math.round(100 * (discuss?.responses.percentVoted ?? 0)) }}%)
          </UTooltip>
        </h2>
        <p v-if="!discuss || !(discuss.flags & APIDiscussionFlags.RespondersPublic)">Responses are hidden</p>
        <p v-else-if="discuss?.responses.users?.length === 0">No respondants yet.</p>

        <div>
          <table v-if="discuss?.responses.users?.length" class="table-auto w-full">
            <tbody>
              <tr v-for="respondant in discuss.responses.users" :key="respondant.id" class="border-b border-b-neutral-400 last:border-b-0">
                <td class="py-2">
                  <UserComponent :user="respondant" name-class="text-black font-semibold text-sm" hide-tooltip />
                </td>
                <td>
                  <div v-for="choice in respondant.choices" :key="choice" class="text-xs text-muted">{{ choice }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, type APIDiscussion } from '@jzpanel/common/Discussions';
import { getRelDate } from '@jzpanel/common/methods/format';
import DiscussCard from '~/components/discuss/DiscussCard.vue';
import CommentsContainer from '~/components/discuss/comments/CommentsContainer.vue';


const route = useRoute()
const { user, requireAuth } = useAuth()

await requireAuth()

const api = useApi()

const { data: discuss, status, error } = await useAsyncData<APIDiscussion>(
  `discuss.${route.params.id}`,
  () => api(`/discussions/${route.params.id}`)
)
useHead({
  title: () => {
    const id = `Discussion #${route.params.id}`
    console.log('TITLE', discuss.value, discuss.value?.title, route.params.id)
    return discuss.value ? `${discuss.value.title} - ${id}` : id
  },
})

watch(discuss, (val) => {
  if (!val && status.value === 'success') {
    throw createError({ statusCode: 404, statusMessage: 'Discussion not found' })
  }
})
</script>
