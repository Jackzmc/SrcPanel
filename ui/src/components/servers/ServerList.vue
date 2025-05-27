<template>
  <div class="box mb-2 px-3 py-3 is-radiusless">
    <h1 class="title is-4 mb-1 is-family-primary">
      {{ group.name }}
      <div class="is-inline-block has-text-weight-normal">
        <span class="tag mx-1">
          <Icon icon="fa-circle" icon-class="has-text-success" class="mr-1"></Icon>
          2 servers online
        </span>
        <span class="tag mx-1">
          <Icon icon="fa-user" icon-class="has-text-info" class="mr-1"></Icon>
          20 players total
        </span>
      </div>
    </h1>
    <p v-if="group.description" class="subtitle is-6 mb-2">{{ group.description }}</p>
    <div class="list">
      <ServerListItem v-for="server in group.servers" :key="server.id" :server="server" :type="group.type" :manage="manage">
      </ServerListItem>
    </div>
    <p class="subtitle mb-0 pl-4 has-text-grey" v-if="Object.keys(group.servers).length === 0">No servers in this group</p>
    <div class="list"></div>
  </div>
  <!-- <div class="mb-4 box is-radiusless">
    <CreateServerModal :group="group" v-if="createModal" @close="createModal = false" />
    <h4 class="title is-4 mx-4">{{ group.name }}</h4>
    <p v-if="group.description" class="subtitle is-6">{{ group.description }}</p>
    <div class="table-container">
      <table :class="['table','is-fullwidth']">
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
        <tfoot v-if="manage && group.templateId">
          <tr class="has-background-lighter">
            <td style="vertical-align: middle"></td>
            <td colspan="2"></td>
            <td colspan="2">
              <button type="button" class="button is-info is-small" @click="createModal = true">Create New Instance</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div> -->
</template>

<script setup lang="ts">
import { ServerGroup } from '../../../../common-types/Server';
import CreateServerModal from './CreateServerModal.vue';
import ServerListItem from './ServerListItem.vue';

const props = defineProps<{
  group: ServerGroup,
  manage?: boolean
}>()

</script>

<style scoped>

@media screen and (min-width: 640px) {
  .table-container {
    overflow: inherit !important;
  }
}
</style>
