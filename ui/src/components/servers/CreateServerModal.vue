<template>
<ModalCard active @close="emit('close')">
  <template #header>
    <p class="modal-card-title">
      <Icon v-if="stateTitle.icon" :class="stateTitle.icon" :icon-class="stateTitle.iconClass" v-html="stateTitle.label"></Icon>
      <span v-else v-html="stateTitle.label"></span>
    </p>
    <button class="delete" aria-label="close" @click="emit('close')"></button>
  </template>
  <!-- MODAL BODY-->
  <template v-if="state === ModalState.SelectGroup">
    <h5 class="subtitle is-5">Select a server group</h5>
    <div class="list has-hoverable-list-items has-visible-pointer-controls">
      <a :class="['list-item',{'has-background-info-light': selectedGroup?.id === group.id}]" v-for="group in serverGroups" :key="group.id" @click="selectGroup(group)">
        <div class="list-item-content">
          <div class="list-item-title">{{ group.name }}</div>
          <div class="list-item-description">
            <div class="field is-grouped is-grouped-multiline">
              <div class="control">
                <div class="tags has-addons">
                  <span class="tag is-dark">Game</span>
                  <span class="tag is-info">{{ group.game }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  </template>
  <template v-else-if="state === ModalState.StartingInstance">
    <p class="is-size-5">This shouldn't take too long.</p>
    <p class="is-size-5">If it takes longer than 2 minutes, an issue may have occurred</p>
  </template>
  <template v-else-if="state === ModalState.InstanceReady">
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
  <template v-else-if="state === ModalState.ConfirmCreateInstance">
    <p class="is-size-5">You are creating a new instance of <b>{{ selectedGroup!.name}}</b>.</p>
    <!-- TODO: only show if another instance of group exists -->
    <p class="is-size-5">Are you sure? If the other instance is just offline, it's preferable that you try starting it before creating a new instance</p>
    <br>
    <p class="is-size-5">New instances will automatically be reclaimed after they remain empty for some amount of time</p>
  </template>
  <template v-else-if="state === ModalState.InstanceFailed">
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
  <template v-else>
    <article class="message is-danger">
      <div class="message-body">
        <b>Unknown error has occurred</b><br><span>Invalid modal state</span>
      </div>
    </article>
  </template>
  <!-- END MODAL BODY-->
  <template #buttons >
    <template v-if="state == ModalState.ConfirmCreateInstance">
    <button @click="state = ModalState.SelectGroup" class="button">Back</button>
    <button @click="createInstance" class="button is-info">Create Instance</button>
    </template>
    <template v-else-if="state === ModalState.SelectGroup">
      <button @click="emit('close')" class="button">Cancel</button>
      <button @click="confirmGroup" class="button is-info" :disabled="!selectedGroup">Next</button>
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

enum ModalState {
  SelectGroup,
  ConfirmCreateInstance,
  StartingInstance,
  InstanceReady,
  InstanceFailed
}

const stateTitle = computed(() => {
  switch(state.value) {
    case ModalState.SelectGroup:
      return {
        label: "Create New Server"
      }
    case ModalState.ConfirmCreateInstance:
      return {
        label: `New instance of <b>${ selectedGroup.value!.name }</b>`
      }
    case ModalState.StartingInstance:
      return {
        icon: "fa-spinner",
        label: `Creating instance of <b>${ selectedGroup.value!.name}</b>`
      }
    case ModalState.InstanceReady:
      return {
        icon: "fa-check-circle",
        iconClass: "has-text-success",
        label: `Created <b>${ data.value.name }</b>`
      }
    case ModalState.InstanceFailed:
      return {
        icon: "fa-times",
        iconClass: "has-text-danger",
        label: `Error creating instance`
      }
    default:
      return {
        icon: "fa-exclamation-triangle",
        iconClass: "has-text-danger",
        label: "Unknown Error"
      }
  }
})

const serverGroups = ref([
  {
    id: "l4d2-main",
    name: "L4D2 Main",
    game: "left4dead2",
  },
  {
    id: "l4d2-randomizer",
    name: "L4D2 Randomizer",
    game: "left4dead2",
  },
  {
    id: "l4d2-reserved",
    name: "L4D2 Reserved",
    game: "left4dead2",
  },
  {
    id: "minecraft",
    name: "Minecraft",
    game: "minecraft",
  }
])

let state = ref<ModalState>(ModalState.SelectGroup)
let selectedGroup = ref<GroupInfo>()
let data = ref<any|null>(null)

function selectGroup(group: GroupInfo) {
  selectedGroup.value = group
}
function confirmGroup() {
  if(selectedGroup.value) {
    state.value = ModalState.ConfirmCreateInstance
  }
}

async function createInstance() {
  if(!selectedGroup.value) return console.error("createInstance() called with no group")
  state.value = ModalState.StartingInstance
  data.value = null
  try {
    const response = await fetch(`/api/groups/${selectedGroup.value.id}/servers?start=1`, {
      method: "POST"
    })
    if(response.ok) {
      const json = await response.json()
      state.value = ModalState.InstanceReady
      data.value = json
      notify({
        type: "success",
        text: `Started new instance for ${selectedGroup.value.name}`
      })
    } else {
      const json = await response.json()
      state.value = ModalState.InstanceFailed
      data.value = json
    }
  } catch(err) {
    state.value = ModalState.InstanceFailed
    data.value = (err as any).message
  }
}

</script>
