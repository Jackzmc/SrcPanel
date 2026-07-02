<template>
  <UApp :toaster="{ position: 'top-center' }" :tooltip="{ delayDuration: 400 }">
    <NuxtLayout class="min-h-screen">
        <UContainer class="flex my-6 justify-center">
            <div class="flex flex-col gap-4">
                <UCard
                    icon="lucide:circle-alert"
                >
                    <div class="space-y-3">
                        <h2 v-if="error?.status == 404" class="title text-2xl font-bold text-error">
                            <IconText text="404 Page Not Found" leading-icon="lucide:file-question-mark" />
                        </h2>
                        <h2 v-else class="title text-2xl font-bold text-error">
                            <IconText text="Unexpected Error" leading-icon="lucide:circle-alert" />
                        </h2>
                        <p class="title text-xl text-muted">{{ error?.message }}</p>
                    </div>
                </UCard>
                <KeyValueTable v-if="error?.status != 404" class="text-xs">
                    <KeyValueRow v-if="error?.status" label="Status">
                        {{ error.status }} {{  error?.statusText }}
                    </KeyValueRow>
                    <KeyValueRow v-if="error?.data" label="Data">
                        <pre class="bg-inherit!">{{ error.data }}</pre>
                    </KeyValueRow>
                </KeyValueTable>
            </div>
        </UContainer>
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";
import * as Sentry from "@sentry/nuxt";
import KeyValueTable from "./components/table/KeyValueTable.vue";
import KeyValueRow from "./components/table/KeyValueRow.vue";

const props = defineProps({
  error: Object as () => NuxtError,
})
</script>
