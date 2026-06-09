<template>  
    <Hero :title="heroTitle" :subtitle="subtitle" />
    <UContainer>
        <UFormField class="p-2">
            <UInput
                v-model="query"
                leading-icon="lucide:search"
                class="w-full"
                size="xl"
                placeholder="Search admin panel"
                @keyup.enter="executeDebounce()" 
            />
        </UFormField>
        <div class="p-1">
            <h2 class="text-xl font-bold mb-2">Pages
            </h2>
            <p v-if="routeResults.length === 0" class="text-muted py-3">No results</p>
            <div class="grid grid-cols-0 sm:grid-cols-2 gap-2">
                <RouteCard 
                    v-for="route in routeResults"
                    :key="route.path"
                    :route="route" 
                />
            </div>
        </div>
        
       <div class="p-1">
            <h2 class="text-xl font-bold mb-2">Objects</h2>
            <IconText v-if="status === 'pending'" leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" text="Loading" />
            <p v-if="!results" class="text-muted py-3">No results</p>
            <div class="flex flex-col gap-3">
                <ObjectCard
                    v-for="entry,id in results"
                    :key="id" 
                    :entry="entry"
                />
            </div>
       </div>
        <!-- <pre>{{ JSON.stringify(results,null, 2) }}</pre> -->
    </UContainer>
</template>

<script setup lang="ts">
import { debounce } from '@jzpanel/common/util'
import type { NavigationMenuItem } from '@nuxt/ui'
import ObjectCard from '~/components/search/ObjectCard.vue'
import RouteCard from '~/components/search/RouteCard.vue'
import { usePanelSearch } from '~/composables/client/usePanelSearch.js'

const route = useRoute()
const router = useRouter()
const { routes } = useNavigation()
const api = useApi()

const query = computed({
    get: () => {
        return route.query.q ? (route.query.q as string)?.toLowerCase() : ""
    },
    set: (value) => {
        router.replace({
            path: route.path,
            query: { q: value },
        })
    }
})

const { results, resultMetrics, status, execute } = usePanelSearch(query)

const routeResults = computed(() => {
    if(!query.value) return []
    return routes.value
        .flatMap(item => {
            if ('children' in item && item.children) {
                return item.children as NavigationMenuItem[]
            }
            return [item]
        })
        .filter(route => {
            const name = route.label ?? route.href?.toString()

            // TODO: fuzzy search and sort on closeness
            return name?.toLocaleLowerCase().includes(query.value)
                || route.description?.toLocaleLowerCase().includes(query.value)
        })
})

const heroTitle = computed(() => {
    return query.value ? 'Search' : 'Search Results'
})
const subtitle = computed(() => {
    if(!query.value) return
    const objects = Object.keys(results).length
    const pages = routeResults.value.length
    return `${objects} object${objects != 1  ? 's' : ''} and ${pages} page${pages != 1 ? 's' : ''} found`
})

const executeDebounce = debounce(execute, 1200)

useSeoMeta({
    title: 'Search',
    ogTitle: 'Search',
    description: 'Search the admin panel',
    ogDescription: 'Search the admin panel',
    robots: {
        noarchive: true,
        nofollow: true,
        noindex: true,
    }
})
</script>