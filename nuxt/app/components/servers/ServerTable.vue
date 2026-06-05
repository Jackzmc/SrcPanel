<template>
    <table class="w-full table-auto">
        <thead>
            <tr class="border-b text-left">
                <th>Name</th>
                <th class="text-center">State</th>
                <th class="text-center">Actions</th>
            </tr>
        </thead>
        <tbody>
            <ServerTableRow v-for="server in group.servers" :key="server.id" 
                :group="group" :server="server"
            />
        </tbody>
    </table>
</template>

<script setup lang="ts">
import type { APIListServersV1_Group, APIListServersV1_Server, GroupInfo, ServerInfo } from '@jzpanel/common/Server'
import ServerTableRow from './ServerTableRow.vue'


const props = defineProps<{
  group: APIListServersV1_Group
}>()
</script>