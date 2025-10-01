<template>
  <div class="mb-4is-radiusless">
    <CreateServerModal v-if="createModal" :group="group" @close="createModal = false" />
    <h4 class="title is-4 mx-4">{{ group.name }}</h4>
    <p v-if="group.description" class="subtitle is-6">{{ group.description }}</p>
    <div class="table-container">
      <table :class="['table','is-fullwidth','is-bordered']">
        <thead>
          <tr>
            <th>Name</th>
            <th :class="manage ? undefined : 'has-text-centered'">Players</th>
            <template v-if="manage">
              <th v-if="gameConfig.hasMap">Current Map</th>
              <th>Actions</th>
            </template>
            <template v-else>
              <template v-if="gameType === 'source'">
                <th>Current Map</th>
                <th>Direct Connect Command</th>
                <th>Create Lobby Command</th>
              </template>
              <template v-else-if="gameType === 'minecraft'">
                <th>IP</th>
              </template>
            </template>
          </tr>
        </thead>
        <tbody>
          <ServerRow v-for="server in group.servers" :key="server.id" :priv-user="privUser" :server="server" :game="group.game" :manage="manage"></ServerRow>
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
    <br>
  </div>
</template>

<script setup lang="ts">
import { GAME_TYPE_MAP, ServerGroup, GAME_TYPE_CONFIG } from '../../../../common-types/Server';
import ServerRow from '@/components/servers/ServerRow.vue'
import { request } from '@/js/util.js';
import { LoadState } from '@/types/global.js';
import { notify } from '@kyvg/vue3-notification';
import { computed, ref } from 'vue';
import CreateServerModal from './CreateServerModal.vue';
import { PrivilegedUser } from '@/js/User.js';

const props = defineProps<{
  group: ServerGroup,
  manage?: boolean,
  privUser?: PrivilegedUser
}>()

const gameType = computed(() => {
  return GAME_TYPE_MAP[props.group.game]
})
const gameConfig = computed(() => {
  return (gameType.value && GAME_TYPE_CONFIG[gameType.value]) || {}
})

let createModal = ref(false)

</script>

<style scoped>

@media screen and (min-width: 640px) {
  .table-container {
    overflow: inherit !important;
  }
}
</style>
