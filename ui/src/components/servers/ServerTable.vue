<template>
  <div class="mb-4">
    <h4 class="title is-4">{{ group.name }}</h4>
    <div class="table-container">
      <table :class="['table','is-fullwidth',{'is-bordered': !manage}]">
        <thead>
          <tr>
            <th>Name</th>
            <th :class="manage ? undefined : 'has-text-centered'">Players</th>
            <template v-if="manage">
              <th v-if="group.type === 'source'">Current Map</th>
              <th>Actions</th>
            </template>
            <template v-else>
              <template v-if="group.type === 'source'">
                <th>Current Map</th>
                <th>Direct Connect Command</th>
                <th>Create Lobby Command</th>
              </template>
              <template v-else-if="group.type === 'minecraft'">
                <th>IP</th>
              </template>
            </template>
          </tr>
        </thead>
        <tbody>
          <ServerRow v-for="server in group.servers" :key="server.id" :server="server" :type="group.type" :manage="manage"></ServerRow>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ServerGroup } from '../../../../common-types/Server';
import ServerRow from '@/components/servers/ServerRow.vue'
import { computed } from 'vue';

const props = defineProps<{
  group: ServerGroup,
  manage?: boolean
}>()

</script>
