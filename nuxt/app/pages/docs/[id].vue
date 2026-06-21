<template>
  <div v-if="data">
    <Hero :title="data.title" :subtitle="data.description" />
    <UContainer>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ContentRenderer class="col-span-2 sm:order-1 order-2" :value="data" />
        <div class="sm:order-2 order-1">
          <UCard v-if="sidebar" class="w-full sm:w-max sticky top-20">
            <div class="flex flex-col gap-2">
              <span v-if="data.updated" class="flex justify-between gap-4 pb-2 not-last:border-b border-b-neutral-300">
                <IconText leading-icon="lucide:calendar"><b>Updated</b></IconText>
                <span>{{ data.updated }}</span>
              </span>
              <div v-if="data.links" class="pb-2 not-last:border-b border-b-neutral-300 flex flex-col justify-between">
                <IconText leading-icon="lucide:external-link">
                  <b>Links</b>
                </IconText>
                <ul class="list-disc list-inside ml-2">
                  <li v-for="entry in data.links" :key="entry.href">
                    <a :href="entry.href" class="text-info whitespace-break-spaces">{{ entry.label }}</a>
                  </li>
                </ul>
              </div>
              <div v-if="data.body.toc&&data.body.toc.links.length > 0" class="not-last:border-b border-b-neutral-300 flex flex-col justify-between">
                <IconText leading-icon="lucide:table-of-contents">
                  <b>Sections</b>
                </IconText>
                <UContentToc title=" " :links="data.body.toc.links" :ui="{ container: 'w-max !py-0', root: '!p-0 !mx-2' }">
                  <template #link="slotProps">
                    {{ Array(slotProps.link.depth).fill('#').join('') }} {{ slotProps.link.text }}
                  </template>
                </UContentToc>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { data } = await useAsyncData(
  `docs-${route.params.id}`,
  () => queryCollection("docs").path(route.path).first(),
);
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}
useSeoMeta({
  title: data.value.title,
  ogTitle: data.value.title,
  description: data.value.description,
});

const sidebar = computed(() => {
  return data.value && (
    data.value.updated
    || data.value.links
    || (data.value.body.toc && data.value.body.toc.links.length > 0)
  );
});
</script>
