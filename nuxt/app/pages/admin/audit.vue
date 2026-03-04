<template>
  <div>
    <Hero title="Audit Logs" />
    <UContainer class="fluid grid grid-cols-4 gap-4">
      <div class="col-span-3">
        <AuditTable v-if="data" :entries="data.logs">

        </AuditTable>
      </div>
      <div>
        <UCard>
          <div class="space-y-1">
            <h3 class="text-lg font-bold py-2">{{ data.logs.length.toLocaleString() }} entries</h3>
            <UFormField label="Search Client" :ui="{ label: 'font-semibold' }">
              <UInput type="text" leading-icon="lucide:search" placeholder="Search for a client name or steamid" />
            </UFormField>
            <UFormField label="Search Target" :ui="{ label: 'font-semibold' }">
              <UInput type="text" leading-icon="lucide:search" placeholder="Search for a target name or steamid" />
            </UFormField>
            <UFormField label="Search Message" :ui="{ label: 'font-semibold' }">
              <UInput type="text" leading-icon="lucide:search" placeholder="Search by message content" />
            </UFormField>
            <UFormField label="Enabled Types" :ui="{ label: 'font-semibold' }">

            </UFormField>
            <UFormField label="Enabled sources" :ui="{ label: 'font-semibold' }">

            </UFormField>
            <div class="flex justify-between">
              <UFormField label="Around Id" :ui="{ label: 'font-semibold' }">
                <UInput type="number" placeholder="####" />
              </UFormField>
              <UFormField label="Data Year" :ui="{ label: 'font-semibold' }">
                <USelect></USelect>
              </UFormField>
            </div>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Audit Logs"
})
import Hero from '@/components/Hero.vue';
import AuditTable from '@/components/audit/AuditTable.vue'
import { type LogEntry } from '@common/Logs';

const { data } = await useFetch<LogEntry[]>("/api/logs/after/1")
</script>
