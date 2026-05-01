<template>
    <div>
        <Hero title="Rules & Procedures" subtitle="Because it's necessary" />
        <UContainer>
            <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2 flex flex-col gap-4">
                    <div v-if="filteredItems.length === 0" class="text-center p-7 text-muted">
                        No rules or procedures found
                    </div>
                    <div v-else-if="selectedItem">
                        <UCard>
                            <h2 class="text-xl font-bold" :id="selectedItem.id">{{ selectedItem.title }}</h2>
                            <ContentRenderer :value="selectedItem" />
                        </UCard>
                    </div>
                    <template v-else>
                        <UCard v-for="entry in filteredItems" :key="entry.id">
                            <h2 class="text-xl font-bold" :id="entry.id">{{ entry.title }}</h2>
                            <ContentRenderer :value="entry" />
                        </UCard>
                    </template>
                    
                </div>
                <div>
                    <UCard>
                        <div class="flex flex-col gap-2">
                            <UInput v-model="queryInput" placeholder="Search for an item" leading-icon="lucide:search"/>
                            <UNavigationMenu :items="items" orientation="vertical" color="primary" type="multiple" />
                        </div>
                    </UCard>
                </div>
            </div>
        </UContainer>
    </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import type { DocsRulesCollectionItem } from '@nuxt/content'

const route = useRoute()

const { data } = await useAsyncData(
    `docs-rules`,
    () => queryCollection("docs_rules").all()
)

const filteredItems = computed(() => {
    if(!data.value) return []
    const query = queryInput.value.toLocaleLowerCase()
    return data.value
        .filter(entry => entry.title.toLocaleLowerCase().includes(query)
            || entry.seo.description?.toLocaleLowerCase().includes(query)
        )
})

const items = computed(() => {
    if(!data.value) return []
    return [[
        {
            label: "Rules",
            open: true,
            children: filteredItems.value
                .filter(entry => entry.type === "rule")
                .map(mapEntry)
        },
        {
            label: "Procedures",
            open: true,
            children: filteredItems.value
                .filter(entry => entry.type === "procedure")
                .map(mapEntry)
        }
    ]] as NavigationMenuItem[][]
})



const selectedItem = computed(() => {
    if(!data.value || route.hash.length < 2) return
    return data.value.find(item => {
        const id = item.stem.split('/').pop()
        return id === route.hash.slice(1)
    })
})
useHead({
    title: "Rules & Procedures"
})

const queryInput = ref("")
function mapEntry(entry: DocsRulesCollectionItem) {
    const id = entry.stem.split('/').pop()
    return {
        label: entry.title,
        value: entry.id,
        href: `#${id}`,
        // This is a bit hacky but we can't actually select with v-model natively 
        // and we want to track the #hash 
        class: entry.id === selectedItem.value?.id ? 'text-primary' : '',
    }
}
</script>