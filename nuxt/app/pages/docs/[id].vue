<template>
    <div v-if="data">
        <Hero :title="data.title" :subtitle="data.description" />
        <UContainer>
            <div class="grid grid-cols-3 gap-4">
                <ContentRenderer class="col-span-2" :value="data" />
                <div>
                    <UCard class="w-max">
                        <div class="flex flex-col gap-2">
                            <span class="flex justify-between gap-4 pb-2 not-last:border-b border-b-neutral-300">
                                <IconText leading-icon="lucide:calendar"><b>Updated</b></IconText>
                                <span>{{ data.updated }}</span>
                            </span>
                            <div v-if="data.links" class="pb-2 not-last:border-b border-b-neutral-300 flex flex-col justify-between">
                                <IconText leading-icon="lucide:external-link"><b>Links</b></IconText>
                                <ul class="list-disc list-inside ml-2">
                                  <li v-for="entry in data.links" :key="entry.href">
                                    <a :href="entry.href" class="text-info whitespace-break-spaces">{{ entry.label }}</a>
                                  </li>
                                </ul>
                            </div>
                            <div v-if="data.body.toc" class="pb-2 not-last:border-b border-b-neutral-300 flex flex-col justify-between">
                                <IconText leading-icon="lucide:table-of-contents"><b>Sections</b></IconText>
                                <ul class="list-none list-inside ml-2">
                                  <li v-for="entry in data.body.toc.links" :key="entry.id" class="flex gap-1">
                                    <span class="text-muted">#</span>
                                    <a :href="`#${entry.id}`" class="text-info whitespace-break-spaces">{{ entry.text }}</a>
                                  </li>
                                </ul>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useAsyncData(() => queryCollection('docs').path(route.path).first())
if(!data.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

useSeoMeta({
    title: data.value.title,
    description: data.value.description
})
</script>