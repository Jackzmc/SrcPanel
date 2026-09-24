<template>
  <div>
    <Hero :title="`Shares / ${route.params.id}`" />
    <InfoModal
      v-if="share && modals.file"
      :id="modals.file.id"
      :share="share"
      :loading="modals.file.loading"
      :addon="modals.file.addon"
      @close="closeModal"
      @refresh="refresh"
    />
    <Component v-if="share && modal" :is="modal"  :share="share" @close="closeModal" />
    <UContainer class="fluid">
      <UAlert v-if="error" color="error" title="Failed to load share files" :description="error.message" />
      <UAlert v-else-if="sharesError" color="error" title="Failed to load shares" :description="sharesError.message" />
      <div v-else-if="!addons || status === 'pending'" class="flex justify-center py-12">
        <div class="flex flex-col items-center">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 my-4" />
          <h2 class="text-2xl">
            Loading files for share <span class="font-semibold">{{ route.params.id }}</span>
          </h2>
        </div>
      </div>
      <div v-else-if="addons&&share" class="grid grid-cols-4 gap-4">
        <div class="col-span-3">
          <NuxtPage :addons="addons" :share="share" :status="status" />
        </div>
        <div class="space-y">
          <div class="space-y-2">
            <UCard>
              <h4 class="font-semibold font-2xl">
                {{ addons.length }} files
              </h4>
              <UFormField v-if="shares" label="Selected Share">
                <USelect v-model="selectedShare" :items="shares.map((share) => share.id)" @change="onChangeShare" />
              </UFormField>
              <UTabs
                class="mt-4"
                :items="tabs"
                :model-value="route.name?.toString().split('-').pop()"
                @update:model-value="val => navigateTo(`/admin/shares/${route.params.id}/${val}`)"
              />
            </UCard>
            <div class="flex flex-col gap-2">
              <UButton color="primary" size="lg" @click="setModal(AddWorkshopModal)">
                <UIcon name="i-lucide-plus" />
                Workshop Addon
              </UButton>
              <UButton color="primary" size="lg" @click="setModal(UploadModal)">
                <UIcon name="i-lucide-upload" />
                Upload
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { APIShareAddons, ShareData } from "@srcpanel/common/Share";
import AddWorkshopModal from "~/components/shares/AddWorkshopModal.vue";
import InfoModal from "~/components/shares/InfoModal.vue";
import UploadModal from "~/components/shares/UploadModal.vue";

const tabs = [
  {
    label: "Files",
    icon: "i-lucide-file",
    value: "files",
  },
  {
    label: "Maps",
    icon: "i-lucide-map",
    value: "maps",
  },
];

const modals = computed(() => ({
  file: route.query.file && {
    loading: status.value !== "success",
    id: route.query.file as string,
    addon: addons.value?.find(addon => addon.filename === route.query.file),
  },
  upload: "upload" in route.query,
  workshop: route.query.workshop && {
    idOrUrl: route.query.workshop as string,
    destinations: route.query.dests as string | undefined,
  },
}));

const { data: shares, error: sharesError } = await useFetch<ShareData[]>(`/api/shares`, { key: `shares` });

const route = useRoute();
const router = useRouter();

const selectedShare = ref<string>(route.params.id as string);

const { data, status, refresh, error } = useLazyFetch<APIShareAddons>(`/api/shares/${route.params.id}/addons`, { key: `shares.${route.params.id}`, server: false });
// if(!data.value?.shareInfo) {
//   throw createError({ statusCode: 404, statusMessage: 'Share not found' })
// }
watch(data, (val) => {
  if (val && !val.shareInfo) {
    throw createError({ statusCode: 404, statusMessage: "Share not found" });
  }
});
const share = computed(() => data.value?.shareInfo);
const addons = computed(() => data.value?.addons);

const modal = shallowRef<null | Component>(null);

// const { shareInfo: share, addons } = data.value

async function onChangeShare() {
  await navigateTo(`/admin/shares/${selectedShare.value}`);
}
function closeModal() {
  modal.value = null;
  router.replace({ query: { } });
}
function setModal(newModal: Component) {
  modal.value = newModal
}
</script>
