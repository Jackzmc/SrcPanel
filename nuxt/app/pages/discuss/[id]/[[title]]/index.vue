<template>
  <div class="div">
    <Hero title="Discussions" />
    <UContainer>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="space-y-2 col-span-2">
          <div class="flex gap-4">
            <NuxtLink to="/discuss" class="text-md text-primary">← Back to discussions list</NuxtLink>
            <NuxtLink v-if="discuss?.creator.id == user?.user.steamid" :to="`/discuss/${route.params.id}/edit`" class="text-md text-primary"><IconText leading-icon="lucide:edit" text="Edit Discussion" /></NuxtLink>
          </div>
          <div v-if="discuss" class="flex justify-start gap-5  mt-3 mb-5 ">
            <div class="flex flex-col">
              <h2 class="text-md font-bold">
                Discussion started by
              </h2>
              <p class="text-sm">
                <UserComponent :user="discuss.creator" class="text-primary" size="xs" />
              </p>
            </div>
            <div class="flex flex-col">
              <h2 class="text-md font-bold">
                Discussion started
              </h2>
              <p class="text-sm">
                <IconText leading-icon="lucide:clock" :text="getRelDate(discuss.timestamp)" />
              </p>
            </div>
          </div>

          <UAlert v-if="error" color="error" title="Error occurred" :description="error.message" />
          <template v-if="discuss">
            <DiscussCard :key="discuss.id" :discuss="discuss" type="details" />
            <CommentsContainer :discuss="discuss" />
          </template>
        </div>
        <div>
          <h2 class="text-xl font-bold flex gap-1">
            Respondants
            <UTooltip text="# of admins who voted">
              <span>({{ discuss?.submissions.totalVoted ?? 0 }})</span>
            </UTooltip>
            <UTooltip text="Percentage of admins who voted">
              <span>({{ Math.round(100 * (discuss?.submissions.percentVoted ?? 0)) }}%)</span>
            </UTooltip>
          </h2>
          <p v-if="!discuss || !(discuss.flags & APIDiscussionFlags.RespondersPublic)">
            Responses are hidden
          </p>
          <p v-else-if="discuss?.submissions.users?.length === 0">
            No respondants yet.
          </p>

          <div>
            <table v-if="discuss?.submissions.users && discuss.submissions.users.length > 0" class="table-auto w-full">
              <tbody>
                <tr v-for="entry in discuss.submissions.users" :key="entry.user.id" class="border-b border-b-neutral-400 last:border-b-0">
                  <td class="py-2">
                    <UserComponent :user="entry.user" name-class="text-black font-semibold text-sm" hide-tooltip />
                  </td>
                  <template v-if="entry.submissions && entry.submissions.length > 0">
                    <td v-if="'text' in entry.submissions[0]!">
                      <!-- We assume only one ever text submission -->
                      {{ entry.submissions[0]!.text }}
                    </td>
                    <td v-else>
                      <div v-for="sub, i in entry.submissions" :key="i" class="text-xs text-muted">
                        {{ 'choice' in sub && sub.choice.label }}
                      </div>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussionWithSubmissions } from "@srcpanel/common/Discussions";
import { getRelDate } from "@srcpanel/common/format";
import DiscussCard from "~/components/discuss/DiscussCard.vue";
import CommentsContainer from "~/components/discuss/comments/CommentsContainer.vue";

const route = useRoute();
const { user, requireAuth } = useAuth();

await requireAuth();

const api = useApi();

const { data: discuss, status, error } = await useAsyncData<APIDiscussionWithSubmissions>(
  `discuss.${route.params.id}`,
  () => api(`/discussions/${route.params.id}`),
);
useHead({
  title: () => {
    const id = `Discussion #${route.params.id}`;
    console.log("TITLE", discuss.value, discuss.value?.title, route.params.id);
    return discuss.value ? `${discuss.value.title} - ${id}` : id;
  },
});

watch(discuss, (val) => {
  if (!val && status.value === "success") {
    throw createError({ statusCode: 404, statusMessage: "Discussion not found" });
  }
});
</script>
