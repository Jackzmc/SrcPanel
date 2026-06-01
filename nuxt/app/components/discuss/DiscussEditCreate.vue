<template>
  <div>
    <Hero :title="title" />
    <UContainer>
      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-4 col-span-2">
          <div class="my-0">
            <NuxtLink to="/discuss" class="text-md text-primary">← Back to discussions list (cancel)</NuxtLink>
          </div>
          <p>Click on the discussion title or description to add or change the text.</p>
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
            <h2 class="text-xl font-bold text-center">Discussion Settings</h2>
            <DiscussSettingsEntry label="Type">
              <USelect v-model="editDiscuss.type" :items="discussionTypes" class="w-60" />
            </DiscussSettingsEntry>
            <DiscussSettingsFlagEntry label="Respondants"
              :flags="editDiscuss.flags" :items="respondantsOptions"
              @update:flags="i => editDiscuss.flags = i"
            />
            <DiscussSettingsFlagEntry v-show="editDiscuss.flags & APIDiscussionFlags.RespondersPublic" label="Responses"
              :flags="editDiscuss.flags" :items="responsesOptions"
              @update:flags="i => editDiscuss.flags = i"
            />
            <DiscussSettingsEntry label="Closes">
              <div class="flex gap-2">
                <span v-if="editDiscuss.closedAt">
                  {{ formatDate(editDiscuss.closedAt) }}
                </span>
                <span v-else>Never</span>
                <UPopover modal :content="{
                  align: 'center',
                  side: 'bottom',
                }">
                  <UButton size="sm" variant="outline" leading-icon="lucide:calendar">Set Date</UButton>

                  <template #content>
                      <div class="flex justify-center pt-2 px-2 gap-2">
                        <UInputDate v-model="expiresDate" />
                        <UButton @click="setExpiresDate()" size="sm" :variant="expiresDate ? 'solid' : 'outline'" :disabled="!expiresDate">Set</UButton>
                        <UButton @click="expiresDate = null" size="sm" variant="ghost" color="neutral" :disabled="!expiresDate">Clear</UButton>
                      </div>
                      <UCalendar v-model="expiresDate" />
                  </template>
                </UPopover>
              </div>
            </DiscussSettingsEntry>
            <DiscussSettingsFlagEntry label="Comments"
              :flags="editDiscuss.flags" :items="commentsOption"
              @update:flags="i => editDiscuss.flags = i"
            />
            <DiscussSettingsFlagEntry label="Percents"
              :flags="editDiscuss.flags" :items="resultsOption"
              @update:flags="i => editDiscuss.flags = i"
            />
          </div>
          <div class="flex gap-4 my-5">
            <UButton color="primary" size="xl" :disabled="canCreate ? undefined : true" @click="saveChanges">
              {{ props.mode == 'new' ? 'Create Discussion' : 'Save Changes' }}
            </UButton>
            <UButton variant="outline" size="xl" to="/discuss">Cancel</UButton>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { APIDiscussionFlags, APIDiscussionType, type APIDiscussion, type APIDiscussionBase, type APIDiscussionCreateResponse, type BaseDiscussion } from '@jzpanel/common/Discussions';
import DiscussCardEdit from '@/components/discuss/DiscardCardEdit.vue'
import type { SelectItem, TabsItem } from '@nuxt/ui';
import type { SettingEntry } from '~~/shared/types/discuss';
import DiscussSettingsEntry from '@/components/discuss/edit/DiscussSettingsEntry.vue'
import DiscussSettingsFlagEntry from '@/components/discuss/edit/DiscussSettingsFlagEntry.vue'
import { fromAbsolute, now, ZonedDateTime } from '@internationalized/date';
import { formatDate, slugify } from '@jzpanel/common/format';

const toast = useToast()
const router = useRouter()

const props = defineProps<{
  discuss: APIDiscussionBase | APIDiscussion,
  mode: "new" | "edit"
}>()

const discussionTypes: SelectItem[] = [
  { label: "Single Choice (Radio)", value: APIDiscussionType.Radio },
  { label: "Multiple Choice (Checkbox)", value: APIDiscussionType.Checkbox },
  // { label: "Short Text", value: APIDiscussionType.ShortText },
  // { label: "Long Text", value: APIDiscussionType.LongText },
]

const respondantsOptions: SettingEntry[] = [
  { label: "Only Names", set: APIDiscussionFlags.RespondersPublic, icon: 'lucide:eye' },
  { label: "Hidden", unset: [APIDiscussionFlags.RespondersPublic, APIDiscussionFlags.ResponsesPublic], icon: 'lucide:eye-off' },
]

const responsesOptions: SettingEntry[] = [
  { label: "Show", set: APIDiscussionFlags.ResponsesPublic, icon: 'lucide:eye' },
  { label: "Hidden", unset: APIDiscussionFlags.ResponsesPublic, icon: 'lucide:eye-off' },
]

const commentsOption: SettingEntry[] = [
  { label: "Public", set: APIDiscussionFlags.CommentsPublic, icon: 'lucide:eye' },
  { label: "Anonymous", unset: APIDiscussionFlags.CommentsPublic, icon: 'lucide:eye-off' },
]

const resultsOption: SettingEntry[] = [
  { label: "Show", set: APIDiscussionFlags.ResponsesPublic, icon: 'lucide:eye' },
  { label: "Hidden", unset: APIDiscussionFlags.ResponsesPublic, icon: 'lucide:eye-off' },
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

const initExpiresTime = computed(() => {
  if(props.discuss.closedAt) return fromAbsolute(props.discuss.closedAt*1000, "UTC")
  const n = now("UTC")
  n.set({
    day: n.day + 14,
    hour: 6, minute: 0, second: 0, millisecond: 0
  })
  return n
})

const expiresDate = ref<ZonedDateTime | null>(initExpiresTime.value)
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

function setExpiresDate() {
  editDiscuss.value.closedAt = expiresDate.value ? Math.round(expiresDate.value.toDate().valueOf() / 1000) : 0
  console.log('setExpiresDate', { expiresDate: expiresDate.value, closedAt: editDiscuss.value.closedAt })
}

function onRemoveOption(id: number) {
  if(!editDiscuss.value.options) return
  editDiscuss.value.options.splice(id, 1)
}

async function createDiscussion() {
  // TODO: PUT for edits
  const result = await request<APIDiscussionCreateResponse>(`/api/discussions`, {
    method: props.mode == 'new' ? 'POST' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(editDiscuss.value as BaseDiscussion)
  })
  if ('error' in result) {
    toast.add({
      color: "error",
      title: "Failed to create discussion",
      description: result.error.message,
    })
  } else {
    toast.add({
      color: "success",
      title: `Discussion #${result.body!.id}`,
      description: "Discussion created successfully.",
    })
    await navigateTo(`/discuss/${result.body!.id}/${slugify(editDiscuss.value.title)}`, { replace: true })
  }
}

async function putDiscussion() {
  // TODO: PUT for edits
  if(!props.discuss || !('id' in props.discuss)) return
  const result = await request<null>(`/api/discussions/${props.discuss.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(editDiscuss.value as BaseDiscussion)
  })
  if ('error' in result) {
    toast.add({
      color: "error",
      title: "Failed to create discussion",
      description: result.error.message,
    })
  } else {
    toast.add({
      color: "success",
      title: `Discussion #${props.discuss.id}`,
      description: "Your changes have been saved.",
    })
    await navigateTo(`/discuss/${props.discuss.id}/${slugify(props.discuss.title)}`, { replace: true })
    // nextTick(() => refreshNuxtData(`discuss.${props.discuss.id}`))
  }
}

async function saveChanges() {
  if (props.mode == 'new') {
    await createDiscussion()
  } else {
    await putDiscussion()
  }
}
</script>
