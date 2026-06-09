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
        <template v-else-if="step == Step.Download">
          <h3 class="text-lg font-semibold mb-1">
            Downloads
          </h3>
          <div class="flex flex-col gap-2">
            <div
              v-for="(download, id) in downloads"
              :key="id"
              class="flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium">
                    <a :href="download.url">{{ download.entryTitle }}</a>
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UProgress :value="download.progress" :max="download.totalBytes" />
                <span class="text-xs">
                  {{ formatSize(download.currentBytes) }} / {{ formatSize(download.totalBytes) }}
                </span>
              </div>
            </div>
          </div>

          <h3 class="text-lg font-semibold mb-1 mt-2">
            Logs
          </h3>
          <div class="flex flex-col gap-2">
            <div
              v-for="(entry, index) in downloadLog"
              :key="index"
            >
              <UBadge
                class="mr-2"
                :color="entry.error ? 'error' : 'primary'"
              >
                {{ entry.state }}
              </UBadge>
              <span v-html="entry.message" />
            </div>
          </div>
        </template>
        <!-- TODO: other steps -->
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
        >Next</UButton>
        <UButton
          v-if="step == Step.Download"
          :disabled="downloadState != DownloadState.Done"
          size="lg"
          @click="restartServers"
        >Restart Servers</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CollectionWorkshopItem, DetailsResponse, ShareInfo } from "@jzpanel/common/Share";
import { debounce } from "@jzpanel/common/util";
import { formatSize } from "@jzpanel/common/format";
import type { APIDownloadAddonsMessage } from "@jzpanel/common/share/downloadWS";

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
  }
  catch (error) {
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

function restartServers() {
  if (step.value != Step.Download) return;
  // TODO: impl
  alert("Restart servers not implemented");
}

function startDownload(force = false) {
  downloadState.value = DownloadState.Downloading;
  downloadLog.value = [];
  const query = new URLSearchParams();

  const destIds = Object.entries(selectedDests.value)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
  query.append("destinations", destIds.join(","));
  query.append("sse", "1");
  if (force) query.append("force", "1");
  if (selectedAddons.value) {
    const addonIds = Object.entries(selectedAddons.value)
      .filter(([, enabled]) => enabled)
      .map(([id]) => id);
    query.append("children", addonIds.join(","));
  }

  const startTime = Date.now();

  const sse = new EventSource(
    `/api/shares/${props.share.id}/addons/workshop/${props.share.appid}/download?${query.toString()}`);
  // Don't care about see.onerror, will trigger when server closes
  sse.onerror = () => {
    downloadLog.value.push({
      state: "SERVER_ERROR",
      message: "Lost connection with server, please try again.",
      error: true,
    });
    sse.close();
  };
  sse.addEventListener("message", event => {
    try {
      const payload = JSON.parse(event.data);
      onDownloadPayload(payload, sse, force, startTime);
    }
    catch (err) {
      console.warn("Got invalid json payload: ", err, " data: ", event.data);
    }
  });
}

function onDownloadPayload(payload: APIDownloadAddonsMessage, sse: EventSource, wasForced: boolean, startTime: number) {
  if ("error" in payload && payload.error) {
    if ("code" in payload && payload.code === "FILE_EXISTS") {
      console.debug("File already exist, asking for confirmation");
      downloadState.value = DownloadState.PromptRedownload;
      downloadLog.value.push({
        // @ts-expect-error whatever this code is terrible
        state: ("state" in payload && payload.state) || payload.code,
        filename: payload.filename,
        message: "Addon was already downloaded. Press the redownload button to download a fresh version",
        error: true,
      });
      sse.close();
    }
    else {
      downloadLog.value.push({
        state: ("state" in payload && payload.state) || payload.code,
        message: payload.message,
        error: true,
      });
    }
  }
  else if ("state" in payload && payload.state === "COMPLETE") {
    downloadLog.value.push({
      state: "DONE",
      message: `Took ${Math.round((Date.now() - startTime) / 1000)} seconds. Maps will not be playable until the server(s) have restarted. You can restart individual servers from the 'Server Management' page.`,
    });
    // If no force prompt shown or this was a force download, then we are done.
    if (downloadState.value == DownloadState.Downloading || wasForced) downloadState.value = DownloadState.Done;
    else console.debug("COMPLETE on state=", downloadState.value);
    sse.close();
  }
  else if ("state" in payload && payload.state === "DOWNLOAD_PROGRESS") {
    if (!payload.entry || !downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`);
    downloads.value[payload.entry]!.currentBytes = payload.currentBytes;
    downloads.value[payload.entry]!.progress = payload.progress;
  }
  else if ("state" in payload && payload.state === "DOWNLOADING") {
    // @ts-expect-error whatever this code is terrible
    downloads.value[payload.entry] = {
      ...payload,
      url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${payload.entry}`,
    };
  }
  else {
    if ("state" in payload && payload.state === "DOWNLOADED") {
      if (!payload.entry || !downloads.value[payload.entry]) return console.warn(`Progress update for download that we don't know: ${payload.entry}`);
      downloads.value[payload.entry]!.progress = 1;
      downloads.value[payload.entry]!.currentBytes = downloads.value[payload.entry]!.totalBytes;
    }

    downloadLog.value.push({
      state: ("state" in payload && payload.state) || payload.code,
      message: payload.message,
      // @ts-expect-error whatever this code is terrible
      success: payload.state == "SUCCESS",
    });
  }
  return true;
}

function close() {
  emit("close");
}
</script>
