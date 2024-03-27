<template>
  <div class="mb-4">
    <h4 class="title is-4">{{ group.name }}</h4>
    <table class="table is-bordered is-fullwidth">
      <thead>
        <tr>
          <th>Name</th>
          <th style="width:0">Players</th>
          <template v-if="group.type === 'left4dead2' || group.type === 'source'">
            <th>Current Map</th>
            <th>Direct Connect Command</th>
            <th>Create Lobby Command</th>
          </template>
          <template v-else-if="group.type === 'minecraft'">
            <th>IP</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <ServerRow v-for="server in group.servers" :key="server.id" :server="server" :type="group.type"></ServerRow>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ServerGroup } from '../../../common-types/Server';
import ServerRow from '@/components/ServerRow.vue'
import { computed } from 'vue';

const props = defineProps<{
  group: ServerGroup
}>()

</script>
