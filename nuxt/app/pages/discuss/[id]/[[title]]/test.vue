<template>
  <UContainer>
    {{ route.params.id }}
  </UContainer>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, type APIDiscussion } from '@common/Discussions';
import { getRelDate } from '@common/methods/format';
import DiscussCard from '~/components/discuss/DiscussCard.vue';
import CommentsContainer from '~/components/discuss/comments/CommentsContainer.vue';


const route = useRoute()
const { user, requireAuth } = useAuth()

await requireAuth()

const { data: discuss, status, error } = await useAsyncData<APIDiscussion>(
  `discuss.${route.params.id}`,
  () => $fetch(`/api/discussions/${route.params.id}`)
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
