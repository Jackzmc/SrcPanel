<template>
<ModalCard active @close="emit('close')">
  <template #header>
    <p class="modal-card-title">
      <Icon icon="fa-spinner" spin v-if="state === LoadState.Loading">Creating new instance of <b>{{ props.group.name }}</b></Icon>
      <Icon icon="fa-check-circle" icon-class="has-text-success" v-else-if="state === LoadState.Success">Created <b>{{ data.name }}</b></Icon>
      <Icon icon="fa-times" icon-class="has-text-danger" v-else>Error creating instance of <b>{{ props.group.name }}</b></Icon>
    </p>
    <button class="delete" aria-label="close" @click="emit('close')"></button>
  </template>
  <template v-if="state === LoadState.Loading">
    <p class="is-size-5">This shouldn't take too long.</p>
    <p class="is-size-5">If it takes longer than 2 minutes, an issue may have occurred</p>
  </template>
  <template v-else-if="state === LoadState.Success">
    <table class="table">
      <tbody>
        <tr>
          <th>Id</th>
          <td>
            <router-link target="_blank" :to="{name: 'admin-server-view', params: { id: data.serverId, tab: 'overview',}}">
              {{ data.serverId }}
              <Icon icon="arrow-up-right-from-square" />
            </router-link>
          </td>
        </tr>
        <tr>
          <th>IP</th>
          <td>{{ data.hostname }}</td>
        </tr>
        <tr>
          <th>Type</th>
          <td>{{ data.type }}</td>
        </tr>
        <tr>
          <th>Connect with</th>
          <td>connect {{ data.hostname }}</td>
        </tr>
        <tr>
          <th>Create lobby with</th>
          <td>mm_dedicated_force_servers {{ data.ip }}:{{ data.port }}</td>
        </tr>
      </tbody>
    </table>
  </template>
  <template v-else>
    <p class="subtitle is-5">
      An error occurred while trying to create a new instance:
    </p>
    <article class="message is-danger">
      <div class="message-body">
       <pre class="mx-0 my-0" v-if="data">{{ JSON.stringify(data, null, 2) }}</pre>
       <span v-else>
        No information available
       </span>
      </div>
    </article>
  </template>
  <template #buttons>
    <button @click="emit('close')" class="button">Close</button>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import ModalCard from '../ModalCard.vue';
import { GroupInfo } from '../../../../common-types/Server.js';
import { computed } from 'vue';

const emit = defineEmits(["close"])

const props = defineProps<{
  group: GroupInfo
  state: LoadState,
  data: any
}>()

</script>
