<template>
  <UModal open title="Add Workshop Addon" @update:open="$emit('close')">
    <template #body>
      <div class="">
        <template v-if="step == Step.Input">
          <UFormField
            label="Enter workshop url or ID"
            :error="workshopUrlError"
          >
            <UInput
              v-model="url"
              class="w-full"
              size="lg"
              type="text"
              placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=######"
              :disabled="loadingState !== LoadingState.Idle"
              focus
              @change="getWorkshopInfoDebounced"
            />
          </UFormField>
          <div v-if="loadingState == LoadingState.Loading" class="flex items-center gap-2">
            <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 my-4" />
            <h2 class="text-xl">
              Fetching workshop item details...
            </h2>
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
                <a :href="'https://store.steampowered.com/app/' + workshopInfo.item.consumer_app_id">
                  <UBadge variant="outline">
                    {{ workshopInfo.item.consumer_app_title }}
                  </UBadge>
                </a>
              </UTooltip>

            </p>
          </div>
        </template>
        <div v-else-if="step == Step.SelectAddons && workshopInfo && 'children' in workshopInfo">
          <h3 class="text-lg">
            Select addons in collection to download
          </h3>

          <UCheckbox
            v-for="item in workshopInfo.children"
            :key="item.publishedfileid"
            v-model="selectedAddons![item.publishedfileid]"
            :label="item.title"
          />
        </div>
        <template v-else-if="step == Step.SelectDestinations && workshopInfo ">
          <h3 class="text-lg">
            Select destinations to install to
          </h3>
          <UCheckbox
            v-for="data, id in share.destinations"
            :key="id"
            v-model="selectedDests[id]"
            :label="data.name ?? id"
          />
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton size="lg" variant="outline" color="neutral" @click="close">
          Close
        </UButton>
        <UButton v-if="step == Step.Input" :disabled="!url || !workshopInfo" size="lg" @click="inputNext">
          Next
        </UButton>
        <UButton
          v-if="step == Step.SelectAddons"
          :disabled="!hasAnyItemSelected"
          size="lg"
          @click="selectChildAddonsNext"
        >Next</UButton>
        <UButton
          v-if="step == Step.SelectDestinations"
          :disabled="!hasAnyItemSelected"
          size="lg"
          @click="selectDestinationsNext"
        >Start Download</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CollectionWorkshopItem, DetailsResponse, ShareInfo } from "@srcpanel/common/Share";
import { debounce } from "@srcpanel/common/util";
import { formatSize } from "@srcpanel/common/format";
import type { APIDownloadAddonsMessage } from "@srcpanel/common/shares/downloadWS";

const WORKSHOP_LINK_REGEX = new RegExp(/https:\/\/steamcommunity\.com\/(sharedfiles|workshop)\/filedetails\/\?id=(\d*)/);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const props = defineProps<{
  share: ShareInfo;
}>();

enum DownloadState {
  Idle,
  Downloading,
  PromptRedownload,
  RestartingServers,
  Done,
}
enum Step {
  Input,
  SelectAddons,
  SelectDestinations,
  Download,
  Done,
}

enum LoadingState {
  Idle,
  Loading,
  Error,
}

const hasAnyItemSelected = computed(() => {
  return (step.value == Step.SelectAddons)
    ? Object.values(selectedAddons.value ?? {}).some(selected => selected)
    : Object.values(selectedDests.value).some(selected => selected);
});

const workshopUrlError = computed(() => {
  if (!url.value) return;
  if (WORKSHOP_LINK_REGEX.test(url.value)) return;
  return "Invalid workshop URL";
});

const toast = useToast()
const step = ref<Step>(Step.Input);
const loadingState = ref<LoadingState>(LoadingState.Idle);
const url = ref();
const workshopInfo = ref<DetailsResponse | null>(null);
const selectedAddons = ref<Record<string, boolean>>();
const selectedDests = ref<Record<string, boolean>>({});

const downloadState = ref<DownloadState>(DownloadState.Idle);
const downloadLog = ref<{ state: string; message?: string; error?: boolean; success?: boolean; filename?: string }[]>([]);
const downloads = ref<Record<string, { entryTitle: string; url: string; totalBytes: number; currentBytes: number; progress: number }>>({});

const getWorkshopInfoDebounced = debounce(getWorkshopInfo, 500);
async function getWorkshopInfo() {
  const match = url.value.match(WORKSHOP_LINK_REGEX);
  if (!match) return;

  workshopInfo.value = null;
  loadingState.value = LoadingState.Loading;
  try {
    const response = await fetch(`/api/shares/workshop/${match[2]}/details`);
    workshopInfo.value = await response.json();
    loadingState.value = LoadingState.Idle;
  } catch (error) {
    console.error(error);
    loadingState.value = LoadingState.Error;
  }
}

function inputNext() {
  if (!workshopInfo.value?.item || step.value != Step.Input) return;
  step.value = workshopInfo.value.type == "collection"
    ? Step.SelectAddons
    : Step.SelectDestinations;

  // Load selectedDests with Record<[id: string], boolean>
  selectedDests.value = Object.fromEntries(
    Object.keys(props.share.destinations)
      .map(id => [id, false]),
  );
  // If switching to collection view, load children
  if ("children" in workshopInfo.value) {
    // Default to all selected
    const item = workshopInfo.value as CollectionWorkshopItem;
    selectedAddons.value = Object.fromEntries(
      item.children.map(item => [item.publishedfileid, true]));
  }
}

function selectChildAddonsNext() {
  if (step.value != Step.SelectAddons) return;
  step.value = Step.SelectDestinations;
}

function selectDestinationsNext() {
  if (step.value != Step.SelectDestinations) return;
  step.value = Step.Download;
  startDownload();
}

async function startDownload(force = false) {
  downloadState.value = DownloadState.Downloading;
  downloadLog.value = [];

  emit("close")

  const destIds = Object.entries(selectedDests.value)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);

  const params = new URLSearchParams()
  params.append("destinations", destIds.join(","))
  if (force) params.append("force", "1");
  if (selectedAddons.value) {
    const addonIds = Object.entries(selectedAddons.value)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);
    params.append("children", addonIds.join(","));
  }

  const response = await request(
    `/api/shares/${props.share.id}/addons/workshop/${workshopInfo.value?.item?.publishedfileid}?${params.toString()}`, 
    {
      method: "POST"
    })
  
  if('body' in response) {
    toast.add({
      color: "success",
      title: "Downloads enqueued",
    })
  } else {
    toast.add({
      color: "error",
      title: "Download failed",
      description: response.error.message
    })
  }
}

function close() {
  emit("close");
}
</script>
