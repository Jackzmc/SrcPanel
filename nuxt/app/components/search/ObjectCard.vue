<template>
    <UCard
        class="bg-light-blue"
        :ui="{ body: 'p-0! bg-default rounded-none!', header: 'p-2!' }" 
    >   
        <template #header>
            <h3 class="text-lg font-semibold">
                <IconText
:leading-icon="entry.full ? TYPE_CONFIG[entry.type].icon : 'lucide:loader-circle'" 
                    :leading-icon-class="entry.full ? '' : 'animate-spin'"
                >
                    {{ TYPE_CONFIG[entry.type].title }}
                </IconText>
            </h3>
        </template>
        <template v-if="entry.data">
            <LogEntryCard v-if="entry.type === 'activity_log'" :entry="entry.data" />
            <UserComponent v-else-if="entry.type === 'user'" :user="entry.userData!" class='text-primary font-semibold p-3' />
            <DiscussCard v-else-if="entry.type === 'discuss'" :discuss="entry.data" type="list" />
            <NoteCard v-else-if="entry.type === 'note'" :note="entry.data" />
            <BanContainer v-else-if="entry.type === 'ban'" :ban="entry.data" :steamid="entry.data.client" />
            <div v-else-if="entry.type === 'event'" class="p-4">
                <h3 class="font-semibold text-lg">{{ entry.data.name }}</h3>
                <p class="text-neutral text-md">{{ entry.data.description }}</p>
            </div>
            <template v-else>Not implemented type {{ entry.type }}</template>
        </template>
        <template v-else-if="entry.partialContent">
            {{ entry.partialContent }}
        </template>
        <p v-else class="text-muted">No content</p>
    </UCard>
</template>

<script setup lang="ts">
import type { SearchType } from '@jzpanel/common/Search';
import type { SearchResultData } from '~/composables/client/usePanelSearch.js';
import LogEntryCard from '../audit/LogEntryCard.vue';
import NoteCard from '../users/NoteCard.vue';
import BanContainer from '../users/BanContainer.vue';

const TYPE_CONFIG: Record<SearchType, { icon: string; title: string }> = {
  activity_log: { icon: 'lucide:scroll-text', title: 'Activity Log' },
  user: { icon: 'lucide:user', title: 'User' },
  note: { icon: 'lucide:sticky-note', title: 'Note' },
  ban: { icon: 'lucide:javel', title: 'Ban' },
  discuss: { icon: 'lucide:message-square', title: 'Discussion' },
  event: { icon: 'lucide:calendar', title: 'Event' },
}


defineProps<{
    entry: SearchResultData
}>()
</script>