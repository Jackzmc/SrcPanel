<template>
    <UCard
        :class="['bg-light-blue', 'cursor-pointer', { 'border-2 border-primary-400': selected }]" 
        @click="emit('select')"
    >
        <h3 class="text-xl font-bold">{{ group.name ?? group.id }}</h3>
        <div class="flex flex-row flex-wrap gap-1">
            <div>
                <UBadge class="rounded-r-none" color="neutral"># of Instances</UBadge>
                <UBadge class="rounded-l-none" >{{ group.currentInstances }}</UBadge>
            </div>
            <div>
                <UBadge class="rounded-r-none" color="neutral">Game</UBadge>
                <UBadge class="rounded-l-none" >{{ group.game }}</UBadge>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { APIListServerGroup } from '@common/Server.js';

const emit = defineEmits(["select"])

defineProps<{
    group: APIListServerGroup,
    selected?: boolean
}>()
</script>