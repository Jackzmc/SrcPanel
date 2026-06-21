<template>
  <LogEntryCard
    v-for="log in entries"
    :key="log.id"
    :entry="log"
    show-actions
    @find-nearby="(id: number) => emit('find-nearby', id)"
  />
</template>

<script setup lang="ts">
import type { LogEntry } from "@jzpanel/common/Logs";
import LogEntryCard from "@/components/audit/LogEntryCard.vue";

const emit = defineEmits<{
  (e: "find-nearby", id: number): void;
}>();

defineProps<{
  entries: LogEntry[];
}>();
</script>
