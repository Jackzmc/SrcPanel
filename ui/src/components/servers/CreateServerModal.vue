<template>
<ModalCard active @close="emit('close')">
  <template #header>
    <p class="modal-card-title">
      <!-- eslint-disable vue/no-v-html -- pulled from hardcoded computed val -->
      <Icon v-if="stateTitle.icon" :icon="stateTitle.icon" :icon-class="stateTitle.iconClass" :spinning="stateTitle.spinning"><span v-html="stateTitle.htmlLabel"></span></Icon>
      <span v-else v-html="stateTitle.htmlLabel"></span>
      <!-- eslint-enable vue/no-v-html -->
    </p>
    <button class="delete" aria-label="close" @click="emit('close')"></button>
  </template>
  <!-- MODAL BODY-->
  <template v-if="state === ModalState.SelectGroup">
    <h5 class="subtitle is-5">Select a server group to continue</h5>
    <div v-if="!serverGroups" class="my-6 mx-4">
      <Icon icon="fa-spinner" spin>Fetching groups</Icon>
    </div>
    <div class="list has-hoverable-list-items has-visible-pointer-controls">
      <ServerGroupListItem v-for="group in serverGroups" :key="group.id" :group="group" selectable :selected="selectedGroup?.id === group.id" @select="selectGroup(group)" />
    </div>
    <br>
    <p class="subtitle is-6">
      Only dynamic based server groups can be used to create new instances.<br>
      You can create a new server group <a>in the panel management settings</a>
    </p>
  </template>
  <template v-else-if="state === ModalState.ConfirmCreateInstance">
    <p class="is-size-5">You are creating a new instance of:</p>
    <div class="list has-hoverable-list-items">
      <ServerGroupListItem :group="selectedGroup!" selected />
    </div>
    <br>
    <!-- TODO: only show if another instance of group exists -->
    <p v-if="selectedGroup!.currentInstances > 0" class="is-size-5">Are you sure? There are
      {{ selectedGroup!.currentInstances }} available instances already. It's preferable that you try starting them before
      creating a new instance</p>
    <p v-else class="is-size-5">Are you sure? </p>
    <br>
    <p class="is-size-5">New instances may automatically be removed after they remain empty for some amount of time</p>
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
            <router-link target="_blank" :to="{name: 'admin-server-view', params: { serverId: data.serverId, tab: 'overview',}}">
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
  <template v-else-if="state === ModalState.InstanceFailed">
    <p class="subtitle is-5">
      An error occurred while trying to create a new instance:
    </p>
    <article v-if="data.error === 'NO_FREE_RESOURCES'" class="message is-danger">
      <div class="message-body">
        <p>There are not enough system resources available at this time to create a new instance.</p>
        <br>
        <p><b>Resource:</b> {{ data.type }}</p>
        <div v-if="'cpu' in data">
          <b>Thresholds:</b>
          <ul>
            <li>- Current {{ (data.cpu.currentLoad*100).toFixed(2) }}% &gt; {{ (data.cpu.threshold*100).toFixed(2) }}%
              <Icon v-if="data.cpu.currentLoad > data.cpu.threshold" icon="fa-circle-exclamation" icon-class="has-text-danger"></Icon>
              <Icon v-else-if="(data.cpu.currentLoad+0.02) < data.cpu.threshold" icon="fa-circle-check" icon-class="has-text-success"></Icon>
            </li>
            <li>- Average
              {{ (data.cpu.avgLoad*100).toFixed(2) }}% > {{ (data.cpu.threshold*100).toFixed(2) }}%
              <Icon v-if="data.cpu.avgLoad > data.cpu.threshold" icon="fa-circle-exclamation" icon-class="has-text-danger"></Icon>
              <Icon v-else-if="(data.cpu.avgLoad+0.02) < data.cpu.threshold" icon="fa-circle-check" icon-class="has-text-success"></Icon>
            </li>
          </ul>
        </div>
        <div v-else-if="'memory' in data">
          <ul>
          <li><b>Available: </b>{{ formatSize(data.memory.available) }} / {{ formatSize(data.memory.total) }}</li>
          <li>
            <b>Threshold: </b> {{ (data.memory.percentAvailable*100).toFixed(2) }}% &lt; {{ (data.memory.threshold*100).toFixed(2) }}%
            <Icon v-if="data.memory.percentAvailable < data.memory.threshold" icon="fa-circle-exclamation" icon-class="has-text-danger"></Icon>
            <Icon v-else icon="fa-circle-check" icon-class="has-text-success"></Icon>
          </li>
          </ul>
        </div>
        <br>
        <p>Try again later when resources are available</p>
      </div>
    </article>
    <article v-else class="message is-danger">
      <div v-if="data" class="message-body">
        <strong>{{ data.error }}</strong>:<br>
        {{ data.message }}
      </div>
      <div v-else class="message-body">
      No information available
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
  <template #buttons>
    <template v-if="state == ModalState.ConfirmCreateInstance">
    <button class="button" @click="state = ModalState.SelectGroup">Back</button>
    <button v-if="confirmDelayCountdown === 0" class="button is-info" @click="createInstance">Create
      Instance</button>
    <button v-else class="button is-info" disabled data-tooltip="Please read above before confirming">
      <Icon icon="fa-hourglass">{{ confirmDelayCountdown }}s</Icon>
    </button>
    </template>
    <template v-else-if="state === ModalState.SelectGroup">
      <button class="button" @click="emit('close')">Cancel</button>
      <button class="button is-info" :disabled="!selectedGroup" @click="confirmGroup">Next</button>
    </template>
    <template v-else>
      <button class="button" @click="emit('close')">Close</button>
    </template>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import ModalCard from '../ModalCard.vue';
import { APIListServerGroup, GroupInfo } from '../../../../common-types/Server.js';
import { computed, onMounted, ref } from 'vue';
import { notify } from '@kyvg/vue3-notification';
import { formatSize } from '@/js/util.js';
import ServerGroupListItem from './ServerGroupListItem.vue';
import { APIListServersV2_Groups } from '../../../../common-types/Server';

const emit = defineEmits(["close"])

enum ModalState {
  SelectGroup,
  ConfirmCreateInstance,
  StartingInstance,
  InstanceReady,
  InstanceFailed
}

const props = defineProps<{
  group?: GroupInfo
}>()

const stateTitle = computed(() => {
  switch(state.value) {
    case ModalState.SelectGroup:
      return {
        htmlLabel: "Create new server instance",
        icon: "fa-plus"
      }
    case ModalState.ConfirmCreateInstance:
      return {
        htmlLabel: `Confirm new instance`
      }
    case ModalState.StartingInstance:
      return {
        icon: "fa-spinner",
        spinning: true,
        htmlLabel: `Creating instance of <b>${ selectedGroup.value!.name}</b>`
      }
    case ModalState.InstanceReady:
      return {
        icon: "fa-check-circle",
        iconClass: "has-text-success",
        htmlLabel: `Created <b>${ data.value.name }</b>`
      }
    case ModalState.InstanceFailed:
      return {
        icon: "fa-times",
        iconClass: "has-text-danger",
        htmlLabel: `Creating instance of <b>${ selectedGroup.value!.name}</b>`
      }
    default:
      return {
        icon: "fa-exclamation-triangle",
        iconClass: "has-text-danger",
        htmlLabel: "Unknown Error"
      }
  }
})

let serverGroups = ref<APIListServerGroup[]|undefined>(undefined)
let state = ref<ModalState>(ModalState.SelectGroup)
let selectedGroup = ref<APIListServerGroup>()
let data = ref<any|null>(null)
let confirmDelayCountdown = ref(0)

function selectGroup(group: APIListServerGroup) {
  selectedGroup.value = group
  state.value = ModalState.ConfirmCreateInstance
  confirmDelayCountdown.value = 5
  nextConfirmCountdown()
}
function confirmGroup() {
  if(selectedGroup.value) {
    state.value = ModalState.ConfirmCreateInstance
  }
}

async function fetchGroups() {
  const response = await fetch("/api/servers/groups")
  if(response.ok) {
    const json: { groups: APIListServerGroup[] } = await response.json()
    serverGroups.value = json.groups.filter(g => g.type === 'docker' || g.type === 'custom')
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

onMounted(async () => {
  await fetchGroups()
  if(props.group && serverGroups.value != undefined) {
    const group = serverGroups.value.find(g => g.id === props.group!.id)
    if(!group) console.warn("could not find prop group in fetched groups")
    else {
      selectGroup(group)
    }
  }
})

function nextConfirmCountdown() {
  setTimeout(() => {
    confirmDelayCountdown.value = confirmDelayCountdown.value - 1
    if(confirmDelayCountdown.value > 0) {
      nextConfirmCountdown()
    }
  }, 1000)
}

</script>
