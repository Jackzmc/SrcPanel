<template>
  <UModal
    open
    :title="title"
    :description="description"
    @update:open="emit('close')"
  >
    <template #body>
      <UTabs v-model="active" :items="items" class="w-full" />
      <div v-if="props.loading" class="flex items-center gap-2">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 my-4" />
        <h2 class="text-xl">
          Fetching workshop item details...
        </h2>
      </div>
      <div v-else-if="props.addon && active == 'overview'" class="space-y-2">
        <UBanner
          v-if="props.addon.workshop && props.addon.workshop.deleted"
          color="warning"
          icon="i-lucide-triangle-alert"
          title="Addon may have been deleted since downloaded"
        />
        <NuxtImg v-if="props.addon.workshop?.previewUrl" :src="props.addon?.workshop?.previewUrl" />
        <table class="table-auto w-full border-collapse">
          <tbody>
            <tr class="border-b odd:bg-gray-100 even:bg-white">
              <th class="text-left py-2 px-3">
                Filename
              </th>
              <td class="py-2 px-3">
                {{ props.addon?.filename }}
              </td>
            </tr>
            <tr v-if="props.addon.workshop" class="border-b  odd:bg-gray-100 even:bg-white">
              <th class="text-left py-2 px-3">
                Workshop
              </th>
              <td class="py-2 px-3 text-primary">
                <a :href="`https://steamcommunity.com/sharedfiles/filedetails/?id=${props.addon.workshop.publishedfileid}`" target="_blank">
                  Open Workshop Page
                  <UIcon class="align-middle" name="lucide:square-arrow-out-up-right" />
                </a>
              </td>
            </tr>
            <tr class="border-b  odd:bg-gray-100 even:bg-white">
              <th class="text-left py-2 px-3">
                Size
              </th>
              <td class="py-2 px-3">
                {{ formatSize(props.addon.filesize ?? 0) }}
              </td>
            </tr>
            <tr class="border-b  odd:bg-gray-100 even:bg-white">
              <th class="text-left py-2 px-3">
                Last Updated
              </th>
              <td v-if="props.addon.lastModified" class="py-2 px-3">
                {{ new Date(props.addon.lastModified*1000).toLocaleString() }}
              </td>
              <td v-else class="py-2 px-3">
                <em>Unknown</em>
              </td>
            </tr>
            <tr class="border-b  odd:bg-gray-100 even:bg-white">
              <th class="text-left py-2 px-3">
                Downloaded
              </th>
              <td v-if="props.addon.downloaded" class="py-2 px-3">
                {{ new Date(props.addon.downloaded*1000).toLocaleString() }}
              </td>
              <td v-else class="py-2 px-3">
                <em>Unknown</em>
              </td>
            </tr>
            <tr v-if="props.addon.meta.chapterIds" class="border-b odd:bg-gray-100 even:bg-white">
              <th class="text-left align-top py-2 px-3">
                Chapters
              </th>
              <td class="py-2 px-3">
                <ul>
                  <li v-for="chapterId in props.addon.meta.chapterIds" :key="chapterId">
                    {{ chapterId }}
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="rating" class="border-b  odd:bg-gray-100 even:bg-white">
              <th>Rating</th>
              <td v-if="rating" />
              <td v-else>
                Unavailable
              </td>
            </tr>
          </tbody>
        </table>

        <section v-if="props.addon.workshop?.description">
          <h4 class="font-semibold">
            Description
          </h4>
          <div class="p-2 text-muted text-sm bg-neutral-50">
            {{ props.addon.workshop?.description }}
          </div>
        </section>
      </div>
      <div v-else-if="props.addon && active == 'destinations'" class="space-y-2">
        <p class="text-md">
          Enable or disable addon for following share destinations
        </p>
        <p class="text-md">
          Any changes require the server to be restarted before they are applied
        </p>

        <div v-if="checkedDestinations" class="py-2 px-4">
          <!-- TODO: checkedDestinations, checkboxgroup -->
          <UCheckbox
            v-for="(dest, destId) in props.share.destinations"
            :key="destId"
            v-model="checkedDestinations[destId]"
            :label="dest.name ?? destId"
            size="xl"
            @change="toggleDest(destId, checkedDestinations[destId]!)"
          />
        </div>

        <div class="py-2">
          <UButton v-if="destinationsChanged" size="lg">
            Restart Servers
          </UButton>
        </div>
      </div>
      <div v-else-if="props.addon && active === 'actions'">
        <div class="grid grid-rows-1 gap-2 p-2">
          <UTooltip v-if="props.addon.workshop?.fileUrl" text="Download addon served by workshop. May be newer.">
            <UButton
              leading-icon="lucide:download"
              as="a"
              target="_blank"
              :href="props.addon.workshop.fileUrl"
            >
              Download (via Workshop)
            </UButton>
          </UTooltip>
          <UTooltip text="Download addon directly from panel">
            <UButton
              leading-icon="lucide:download"
              variant="outline"
              as="a"
              target="_blank"
              :href="`/api/shares/${props.share.id}/addons/${props.addon.filename}/download`"
            >
              Download (Direct Download)
            </UButton>
          </UTooltip>
          <UTooltip text="Delete addon">
            <UButton
              leading-icon="lucide:trash"
              color="error"
              @click="deleteAddon"
            >
              Delete Addon
            </UButton>
          </UTooltip>
        </div>
      </div>
      <div v-else>
        <h4 class="text-lg font-medium">
          No Addon Info
        </h4>
        <p>No addon was found</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
// TODO: find out why this doesn't show when addons is loading
import { formatSize } from "@srcpanel/common/format";
import type { AddonInfo, ShareInfo } from "@srcpanel/common/Share";
import type { TabsItem } from "@nuxt/ui";

const props = defineProps<{
  loading: boolean;
  addon: AddonInfo | undefined;
  id: string;
  share: ShareInfo;
}>();

useHead({
  title: computed(() => `${props.id} - ${props.share.id} Shares`),
  meta: [
    { name: "description", content: "Info Modal" },
  ],
});

const emit = defineEmits(["refresh", "close"]);

const route = useRoute();
const router = useRouter();
const toast = useToast();

const items: TabsItem[] = [
  {
    label: "Overview",
    icon: "i-lucide-info",
    value: "overview",
  },
  {
    label: "Destinations",
    icon: "i-lucide-server",
    value: "destinations",
  },
  {
    label: "Actions",
    value: "actions",
  },
];

const active = computed({
  get() {
    return (route.query.tab as string) || "overview";
  },
  set(tab) {
    // Hash is specified here to prevent the page from scrolling to the top
    router.push({
      path: route.path,
      query: { file: props.id, tab },
    });
  },
});

const title = computed(() => {
  return props.addon?.workshop?.title ?? props.addon?.filename ?? props.id;
});

const description = computed(() => {
  return `${props.share.id} / ${props.id}`;
});

const destinationsChanged = computed(() => {
  if (!props.addon || !checkedDestinations.value) return false;
  return Object.entries(checkedDestinations.value)
    .some(([id, enabled]) => enabled !== props.addon!.installInfo[id]);
});

const rating = ref();
// TODO: prefill
const checkedDestinations = ref<Record<string, boolean>>({});

watch(() => props.addon?.installInfo, (_, installInfo) => {
  if (!props.addon || !installInfo) return;
  checkedDestinations.value = installInfo ?? {};
});

async function toggleDest(destId: string, enabled: boolean) {
  const mode = enabled ? "enable" : "disable";
  const response = await request(`/api/shares/${props.share.id}/addons/${props.id}/${mode}/${destId}`, { method: "POST" });
  if ("body" in response) {
    // Update local copy
    emit("refresh");
    toast.add({
      title: `${enabled ? "Enabled" : "Disabled"} ${props.id} on ${destId}`,
      description: `${enabled ? "Enabled" : "Disabled"} ${props.id} on share ${props.share.name ?? props.share.id} / ${destId}`,
      color: "success",
      icon: enabled && "lucide:check",
    });
  } else {
    toast.add({
      title: `Error ${enabled ? "enabling" : "disabling"} ${props.id} on ${destId}`,
      description: response.error.message,
      color: "error",
      icon: "lucide:circle-alert",
    });
    checkedDestinations.value[destId] = props.addon!.installInfo[destId] ?? false;
  }
}

const { promptConfirm } = useModal();

async function deleteAddon() {
  const result = await promptConfirm({
    title: "Delete Addon",
    description: `Are you sure you want to delete ${props.id} from ${props.share.name ?? props.share.id}?`,
    okText: "Delete",
    okColor: "error",
  });
  if (!result) return;
  const response = await request(`/api/shares/${props.share.id}/addons/${props.id}`, { method: "DELETE" });
  if ("body" in response) {
    // Update local copy
    emit("refresh");
    toast.add({
      title: `Deleted ${props.id} from ${props.share.name ?? props.share.id}`,
      description: `Deleted ${props.id} from share ${props.share.name ?? props.share.id}`,
      color: "success",
      icon: "lucide:trash",
    });
  } else {
    toast.add({
      title: `Error deleting ${props.id} from ${props.share.name ?? props.share.id}`,
      description: response.error.message,
      color: "error",
      icon: "lucide:circle-alert",
    });
  }
}
</script>
