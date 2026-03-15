<template>
  <Hero title="Discussions" />
  <UContainer>
    <div class="grid grid-cols-3 gap-4">
      <UAlert v-if="error" class="space-y-2 col-span-2" color="error" title="Error occurred" :description="error.message" />
      <div v-else class="space-y-2 col-span-2">
        <DiscussCard v-for="discuss in data" :key="discuss.id" :discuss="discuss" />
      </div>
      <div>
        <UCard>
          <div class="space-y-2">
            <h2 class="text-xl font-bold">Start a discussion</h2>
            <UFormField label="Discussion topic / title">
              <UInput v-model="startDiscussionTitle" placeholder="Ask a question" leading-icon="lucide:message-square" />
            </UFormField>
            <UButton :disabled="!startDiscussionTitle" @click="startDiscussion">Start discussion</UButton>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { type APIDiscussion } from '@common/Discussions';
import DiscussCard from '~/components/discuss/DiscussCard.vue';

const { data, refresh, error } = await useFetch<APIDiscussion[]>('/api/discussions', { key: 'discuss.list' })

const startDiscussionTitle = ref("")

async function startDiscussion() {
  await navigateTo('/discuss/new')
}
</script>
