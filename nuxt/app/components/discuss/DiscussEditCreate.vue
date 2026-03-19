<template>
  <div>
    <Hero :title="title" />
    <UContainer>
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-4 col-span-2">
          <div>
            <NuxtLink to="/discuss" class="text-md text-primary">← Back to discussions list (cancel)</NuxtLink>
          </div>
          <DiscussCardEdit :discuss="editDiscuss" type="edit"
            @option:add="onAddOption"
            @option:del="onRemoveOption"
          />
          <div class="flex flex-col gap-2">
            <UAlert v-for="problem,i in problems" :key="i" color="error" icon="lucide:triangle-alert" :description="problem" />
          </div>
        </div>
        <div>
          <div>
            <h2 class="text-xl font-bold">Discussion Settings</h2>
            {{ editDiscuss.flags }}
            <div class="flex justify-between mx-3 p-3 border-b border-t-gray-200 gap-4">
              <UTooltip>
                <h3 class="text-lg font-semibold">Type</h3>
              </UTooltip>
              <div class="">
                <USelect v-model="editDiscuss.type" :items="discussionTypes" class="w-60" />
              </div>
            </div>
            <div class="flex justify-between mx-3 p-3 border-b border-t-gray-200 gap-4">
              <UTooltip>
                <h3 class="text-lg font-semibold">Closes</h3>
              </UTooltip>
              <div class="">
                Never
              </div>
            </div>
            <div class="flex justify-between mx-3 p-3 border-b border-t-gray-200 gap-4">
              <UTooltip>
                <h3 class="text-lg font-semibold">Respondants</h3>
              </UTooltip>
              <div class="">
                <UTabs :items="respondantsItems" :content="false" class="w-full" size="sm"
                  @update:modelValue="v => onFlagChanged(APIDiscussionFlags.RespondersPublic, v)"
                  :defaultValue="editDiscuss.flags & APIDiscussionFlags.RespondersPublic ? 1 : 0"
                />
              </div>
            </div>
            <div class="flex justify-between mx-3 p-3 border-b border-t-gray-200 gap-4">
              <UTooltip>
                <h3 class="text-lg font-semibold">Comments</h3>
              </UTooltip>
              <div class="">
                <UTabs :items="commentsItems" :content="false" class="w-full" size="sm"
                  @update:modelValue="v => onFlagChanged(APIDiscussionFlags.CommentsPublic, v)"
                  :defaultValue="editDiscuss.flags & APIDiscussionFlags.CommentsPublic ? 1 : 0"
                />
              </div>
            </div>
            <div class="flex justify-between mx-3 p-3 gap-4">
              <UTooltip>
                <h3 class="text-lg font-semibold">Results</h3>
              </UTooltip>
              <div class="">
                <UTabs :items="resultsItems" :content="false" class="w-full" size="sm"
                  @update:modelValue="v => onFlagChanged(APIDiscussionFlags.ResponsesPublic, v)"
                  :defaultValue="editDiscuss.flags & APIDiscussionFlags.ResponsesPublic ? 1 : 0"
                />
              </div>
            </div>
          </div>
          <div class="flex gap-4 my-5">
            <UButton color="primary" size="xl" :disabled="canCreate ? undefined : true">Create Discussion</UButton>
            <UButton variant="outline" size="xl">Cancel</UButton>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussion, type APIDiscussionBase } from '@common/Discussions';
import DiscussCardEdit from '@/components/discuss/DiscardCardEdit.vue'
import type { SelectItem, TabsItem } from '@nuxt/ui';

const props = defineProps<{
  discuss: APIDiscussionBase,
  mode: "new" | "edit"
}>()

const discussionTypes: SelectItem[] = [
  { label: "Single Choice (Radio)", value: APIDiscussionType.Radio },
  { label: "Multiple Choice (Checkbox)", value: APIDiscussionType.Checkbox },
  { label: "Short Text", value: APIDiscussionType.ShortText },
  { label: "Long Text", value: APIDiscussionType.LongText },
]

const respondantsItems: TabsItem[] = [
  { label: "Show Names", value: APIDiscussionFlags.RespondersPublic, icon: 'lucide:eye' },
  { label: "Hidden", value: APIDiscussionFlags.None, icon: 'lucide:eye-off' },
]

const commentsItems: TabsItem[] = [
  { label: "Public", value: APIDiscussionFlags.CommentsPublic, icon: 'lucide:eye' },
  { label: "Anonymous", value: APIDiscussionFlags.None, icon: 'lucide:eye-off' },
]

const resultsItems: TabsItem[] = [
  { label: "Show", value: APIDiscussionFlags.ResponsesPublic, icon: 'lucide:eye' },
  { label: "Hidden", value: APIDiscussionFlags.None, icon: 'lucide:eye-off' },
]

const problems = computed(() => {
  const list = []
  if(!editDiscuss.value.title) list.push("Title is required")
  if(!editDiscuss.value.options || editDiscuss.value.options.length < 2) list.push("Minimum of 2 options are required")
  return list
})

const canCreate = computed(() => {
  return problems.value.length === 0
})

const title = computed(() => props.mode == "new" ? 'New Discussion' : 'Edit Discussion')
useHead({
  title: title,
})

const editDiscuss = ref<APIDiscussionBase>({
  options: props.discuss.options ?? [],
  ...props.discuss
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

function onFlagChanged(flag: APIDiscussionFlags, state: string | number) {
  if(state == 0) {
    editDiscuss.value.flags &= ~flag
  } else {
    editDiscuss.value.flags |= flag
  }
}
</script>
