<template>
  <LogEntryCard v-for="log in entries" :key="log.id" :entry="log" />
</template>

<script setup lang="ts">
import type { LogEntry } from '@common/Logs';
import LogEntryCard from '@/components/audit/LogEntryCard.vue'

defineProps<{
  entries: LogEntry[]
}>()
</script>
