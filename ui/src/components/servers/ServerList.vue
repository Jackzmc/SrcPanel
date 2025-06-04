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
      <ServerListItem v-for="server in group.servers" :key="server.id" :server="server" :game="group.game" :manage="manage">
      </ServerListItem>
    </div>
    <p class="subtitle mb-0 pl-4 has-text-grey" v-if="Object.keys(group.servers).length === 0">No servers in this group</p>
    <div class="list"></div>
  </div>
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
