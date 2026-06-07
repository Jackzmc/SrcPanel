<template>
    <!-- <pre>{{ JSON.stringify(route, null, 2) }}</pre> -->
    <a :href="route.href">
        <UCard
            class="bg-light-blue"
            :ui="{ body: 'pt-0!' }" 
        >   
            <template #header>
                <div class="flex justify-between">
                    <h3 class="text-lg font-semibold">
                        <IconText :leading-icon="route.icon" >
                            {{ route.label ?? route.href }}
                        </IconText>
                    </h3>
                    <UBadge v-if="isExternal" variant="outline">External</UBadge>
                </div>
                
            </template>
            {{ route.description }}
            <em v-if="!route.description">No description</em>
        </UCard>
    </a>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const props = defineProps<{
    route: NavigationMenuItem
}>()

const isExternal = computed(() => !props.route.href?.toString().startsWith("/"))
</script>