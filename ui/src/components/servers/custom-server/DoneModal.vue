<template>
<ModalCard active @close="emit('close')">
  <template #header>
    <p class="modal-card-title">
      <Icon icon="fa-check-circle" icon-class="has-text-success">Created
        <b>{{ server.name }}</b></Icon>
    </p>
    <button class="delete" aria-label="close" @click="emit('close')"></button>
  </template>
  <table class="table">
    <tbody>
      <tr>
        <th>Id</th>
        <td>
          <router-link target="_blank"
            :to="{name: 'admin-server-view', params: { serverId: server.serverId, tab: 'overview',}}">
            {{ server.serverId }}
            <Icon icon="arrow-up-right-from-square" />
          </router-link>
        </td>
      </tr>
      <tr>
        <th>IP</th>
        <td>{{ server.hostname }}:{{ server.port }}</td>
      </tr>
      <tr>
        <th>Type</th>
        <td>{{ server.type }}</td>
      </tr>
      <tr>
        <th>Connect with</th>
        <td>connect {{ server.hostname }}:{{ server.port }}</td>
      </tr>
      <tr>
        <th>Create lobby with</th>
        <td>mm_dedicated_force_servers {{ server.ip }}:{{ server.port }}</td>
      </tr>
    </tbody>
  </table>
  <template #buttons>
    <router-link class="button" :to="{name: 'admin-server-view', params: { serverId: server.serverId, tab: 'overview',}}">
      Close
    </router-link>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import ModalCard from '@/components/ModalCard.vue';
import { CustomServerInfo } from '../../../../../common-types/CustomServer.js';

const emit = defineEmits(["close"])

const props = defineProps<{
  server: CustomServerInfo
}>()

</script>
