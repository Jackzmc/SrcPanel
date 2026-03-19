<template>
  <Hero title="Discussions" />
  <UContainer>
    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-4 col-span-2">
        <DiscussCardEdit :discuss="editDiscuss" type="edit"
          @option:add="onAddOption"
          @option:del="onRemoveOption"
        />
      </div>
      <div>
        <UCard class="bg-light-blue">

        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussion, type APIDiscussionBase } from '@common/Discussions';
import DiscussCardEdit from '@/components/discuss/DiscardCardEdit.vue'

const props = defineProps<{
  discuss: APIDiscussionBase,
  mode: "new" | "edit"
}>()

useHead({
  title: () => props.mode == "new" ? 'New Discussion' : 'Edit Discussion',
})

const editDiscuss = ref<APIDiscussionBase>({
  ...props.discuss,
  options: props.discuss.options ?? []
})

function onAddOption(value: string) {
  if(!editDiscuss.value.options) editDiscuss.value.options = []

  editDiscuss.value.options.push({
    id: editDiscuss.value.options.length,
    label: value
  })

  console.log('added', {
    id: editDiscuss.value.options.length,
    label: value
  })
}

function onRemoveOption(id: number) {
  if(!editDiscuss.value.options) return
  editDiscuss.value.options.splice(id, 1)
}
</script>
