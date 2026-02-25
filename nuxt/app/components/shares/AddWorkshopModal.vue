<template>
  <UModal open title="Add Workshop Addon">
    <template #body>
      <div class="">
        <template v-if="step == Step.Input">
          <UFormField label="Enter workshop url or ID">
            <UInput v-model.lazy.trim="url" class="w-full" size="lg" type="text" placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=######" :disabled="loadingState !== LoadingState.Idle" focus />
          </UFormField>
          <div v-if="loadingState == LoadingState.Loading" class="flex items-center gap-2" >
            <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 my-4" />
            <h2 class="text-xl">Fetching workshop item details...</h2>
          </div>
          <div v-else-if="workshopInfo?.item" class="my-4">
            <h4 class="text-lg">
              {{ workshopInfo.item.title }}

            </h4>
            <p class="text-muted text-md space-x-2">
              <UTooltip text="Workshop Item ID">
                <UBadge color="neutral">
                  {{ workshopInfo.item.publishedfileid }}
                </UBadge>
              </UTooltip>
              <UTooltip text="Workshop Item Type">
                <UBadge>{{ workshopInfo.type }}</UBadge>
              </UTooltip>
              <UTooltip text="Click to view steam game">
                <a
                  :href="'https://store.steampowered.com/app/' + workshopInfo.item.consumer_app_id"
                >
                  <UBadge variant="outline">
                    {{ workshopInfo.item.consumer_app_title }}
                  </UBadge>
                </a>
              </UTooltip>

            </p>
          </div>
        </template>
        <div v-else-if="step == Step.SelectAddons && workshopInfo && 'children' in workshopInfo">
          <h3 class="text-lg">Select addons in collection to download</h3>

          <UCheckbox v-for="item in workshopInfo.children"
            :key="item.publishedfileid"
            :label="item.title"
            v-model="selectedAddons[item.publishedfileid]"
          />
        </div>
        <template v-else-if="step == Step.SelectDestinations && workshopInfo ">
          <h3 class="text-lg">Select destinations to install to</h3>
          <UCheckbox v-for="data,id in share.destinations"
            :key="id"
            :label="data.name ?? id"
            v-model="selectedDests[id]"
          />
        </template>
        <!-- TODO: other steps -->
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton @click="close" size="lg" variant="outline" color="neutral">Close</UButton>
        <UButton v-if="step == Step.Input" :disabled="workshopInfo == undefined" @click="inputNext" size="lg">Next</UButton>
        <UButton v-if="step == Step.SelectAddons"
          :disabled="!hasAnyItemSelected"
          @click="selectChildAddonsNext"
          size="lg"
        >Next</UButton>
        <UButton v-if="step == Step.SelectDestinations"
          :disabled="!hasAnyItemSelected"
          @click="selectDestinationsNext"
          size="lg"
        >Next</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CollectionWorkshopItem, DetailsResponse, ShareInfo } from '@common/Share';
const WORKSHOP_LINK_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/(sharedfiles|workshop)\/filedetails\/\?id=(\d*)/)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const props = defineProps<{
  share: ShareInfo
}>()

enum Step {
  Input,
  SelectAddons,
  SelectDestinations,
  Download,
  Done
}

enum LoadingState {
  Idle,
  Loading,
  Error
}

const hasAnyItemSelected = computed(() => {
  return (step.value == Step.SelectAddons)
    ? Object.values(selectedAddons.value).some(selected => selected)
    : Object.values(selectedDests.value).some(selected => selected)
})


const step = ref<Step>(Step.Input)
const loadingState = ref<LoadingState>(LoadingState.Idle)
const url = ref()
const workshopInfo = ref<DetailsResponse|null>(null)
const selectedAddons = ref<Record<string, boolean>>({})
const selectedDests = ref<Record<string, boolean>>({})

watch(url, () => {
  const match = url.value.match(WORKSHOP_LINK_REGEX)
  if (match) {
    getWorkshopInfo(match[2])
  }
})

async function getWorkshopInfo(id: string) {
  workshopInfo.value = null
  loadingState.value = LoadingState.Loading
  try {
    const response = await fetch(`/api/shares/workshop/${id}/details`)
    workshopInfo.value = await response.json();
    loadingState.value = LoadingState.Idle
  } catch (error) {
    console.error(error);
    loadingState.value = LoadingState.Error
  }
}

function inputNext() {
  if(!workshopInfo.value?.item || step.value != Step.Input) return
  step.value = workshopInfo.value.type == "collection"
    ? Step.SelectAddons
    : Step.SelectDestinations

  // Load selectedDests with Record<[id: string], boolean>
  selectedDests.value = Object.fromEntries(
    Object.keys(props.share.destinations)
      .map(id => [id, false])
  )
  // If switching to collection view, load children
  if('children' in workshopInfo.value) {
    // Default to all selected
    const item = workshopInfo.value as CollectionWorkshopItem
    selectedAddons.value = Object.fromEntries(
      item.children.map(item => [item.publishedfileid, true]))
  }
}

function selectChildAddonsNext() {
  if(step.value != Step.SelectAddons) return
  step.value = Step.SelectDestinations
}

function selectDestinationsNext() {
  if(step.value != Step.SelectDestinations) return
  step.value = Step.Download
}

function close() {
  emit('close')
}
</script>
