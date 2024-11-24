<template>
<ModalCard active @close="emit('close')">
  <template #header>
    <p class="modal-card-title">
      <template v-if="state === LoadState.Idle">New instance of <b>{{ props.group.name }}</b></template>
      <Icon icon="fa-spinner" spin v-else-if="state === LoadState.Loading">Creating new instance of <b>{{ props.group.name }}</b></Icon>
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
          <td>{{ data.hostname }}:{{ data.port }}</td>
        </tr>
        <tr>
          <th>Type</th>
          <td>{{ data.type }}</td>
        </tr>
        <tr>
          <th>Connect with</th>
          <td>connect {{ data.hostname }}:{{ data.port }}</td>
        </tr>
        <tr>
          <th>Create lobby with</th>
          <td>mm_dedicated_force_servers {{ data.ip }}:{{ data.port }}</td>
        </tr>
      </tbody>
    </table>
  </template>
  <template v-else-if="state === LoadState.Idle">
    <p class="is-size-5">You are creating a new instance of <b>{{ props.group.name}}</b>.</p>
    <p class="is-size-5">Are you sure? If the other instance is just offline, it's preferable that you try starting it before creating a new instance</p>
    <br>
    <p class="is-size-5">New instances will automatically be reclaimed after they remain empty for some amount of time</p>
  </template>
  <template v-else>
    <p class="subtitle is-5">
      An error occurred while trying to create a new instance:
    </p>
    <article class="message is-danger" v-if="data.error === 'NO_FREE_RESOURCES'">
      <div class="message-body">
        <p>There are not enough system resources available at this time to create a new instance.</p>
        <br>
        <p><b>Resource:</b> {{data.type}}</p>
        <div v-if="'cpu' in data">
          <b>Thresholds:</b>
          <ul>
            <li>- Current {{(data.cpu.currentLoad*100).toFixed(2)}}% &gt; {{(data.cpu.threshold*100).toFixed(2)}}%
              <Icon icon="fa-circle-exclamation" icon-class="has-text-danger" v-if="data.cpu.currentLoad > data.cpu.threshold"></Icon>
              <Icon icon="fa-circle-check" icon-class="has-text-success" v-else-if="(data.cpu.currentLoad+0.02) < data.cpu.threshold"></Icon>
            </li>
            <li>- Average
              {{(data.cpu.avgLoad*100).toFixed(2)}}% > {{(data.cpu.threshold*100).toFixed(2)}}%
              <Icon icon="fa-circle-exclamation" icon-class="has-text-danger" v-if="data.cpu.avgLoad > data.cpu.threshold"></Icon>
              <Icon icon="fa-circle-check" icon-class="has-text-success" v-else-if="(data.cpu.avgLoad+0.02) < data.cpu.threshold"></Icon>
            </li>
          </ul>
        </div>
        <div v-else-if="'memory' in data">
          <ul>
          <li><b>Available: </b>{{ formatSize(data.memory.available) }} / {{ formatSize(data.memory.total)}}</li>
          <li>
            <b>Threshold: </b> {{ (data.memory.percentAvailable*100).toFixed(2) }}% &lt; {{ (data.memory.threshold*100).toFixed(2) }}%
            <Icon icon="fa-circle-exclamation" icon-class="has-text-danger" v-if="data.memory.percentAvailable < data.memory.threshold"></Icon>
            <Icon icon="fa-circle-check" icon-class="has-text-success" v-else></Icon>
          </li>
          </ul>
        </div>
        <br>
        <p>Try again later when resources are available</p>
      </div>
    </article>
    <article class="message is-danger" v-else>
      <div class="message-body">
       <pre class="mx-0 my-0" v-if="data" style="text-wrap: auto">{{ JSON.stringify(data, null, 2) }}</pre>
       <span v-else>
        No information available
       </span>
      </div>
    </article>
  </template>
  <template #buttons >
    <template v-if="state == LoadState.Idle">
    <button @click="createInstance" class="button is-success">Create Instance</button>
    <button @click="emit('close')" class="button">Cancel</button>
    </template>
    <template v-else>
      <button @click="emit('close')" class="button">Close</button>
    </template>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import { LoadState } from '@/types/global.js';
import ModalCard from '../ModalCard.vue';
import { GroupInfo } from '../../../../common-types/Server.js';
import { computed, ref } from 'vue';
import { notify } from '@kyvg/vue3-notification';
import { formatSize } from '@/js/util.js';

const emit = defineEmits(["close"])

const props = defineProps<{
  group: GroupInfo
}>()

let state = ref<LoadState>(LoadState.Idle)
let data = ref<any|null>(null)

async function createInstance() {
  state.value = LoadState.Loading
  data.value = null
  try {
    const response = await fetch(`/api/groups/${props.group.id}/servers?start=1`, {
      method: "POST"
    })
    if(response.ok) {
      const json = await response.json()
      state.value = LoadState.Success
      data.value = json
      notify({
        type: "success",
        text: `Started new instance for ${props.group.name}`
      })
    } else {
      const json = await response.json()
      state.value = LoadState.Error
      data.value = json
    }
  } catch(err) {
    state.value = LoadState.Error
    data.value = (err as any).message
  }
}

</script>
