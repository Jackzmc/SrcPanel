<template>
  <UContainer>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UAlert v-if="error" class="space-y-2 col-span-2" color="error" title="Error occurred" :description="error.message" />
      <div v-else class="space-y-4 col-span-2">
        <DiscussCard v-for="discuss in data" :key="discuss.id" :discuss="discuss" type="list" />
      </div>
      <div>
        <UCard class="bg-light-blue">
          <div class="space-y-2">
            <h2 class="text-xl font-bold">
              Start a discussion
            </h2>
            <UFormField label="Discussion topic / title" :ui="{ label: 'font-semibold' }">
              <UInput v-model="startDiscussionTitle" placeholder="Ask a question" leading-icon="lucide:message-square" class="w-full rounded-4xl" @keydown.enter="startDiscussion" />
            </UFormField>
            <UButton :disabled="startDiscussionTitle.length === 0" trailing-icon="lucide:arrow-right" @click="startDiscussion">
              Start discussion
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { APIDiscussion } from "@srcpanel/common/Discussions";
import DiscussCard from "~/components/discuss/DiscussCard.vue";

definePageMeta({
  title: "Discussions",
  description: "Vote and discuss anything",
  hero: "default",
});

const { requireAuth } = useAuth();
await requireAuth();

const { data, error } = await useFetch<APIDiscussion[]>("/api/discussions", { key: "discuss.list" });

const startDiscussionTitle = ref("");

async function startDiscussion() {
  await navigateTo(`/discuss/new?title=${encodeURIComponent(startDiscussionTitle.value)}`);
}
</script>
