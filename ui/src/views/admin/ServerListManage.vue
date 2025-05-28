<template>
<div>
<CreateServerModal v-if="activeModal == Modal.NewServer" @close="setModal(null); fetchServers()" />
<ModalCard v-if="activeModal == Modal.Help" @close="setModal(null)">
  <template #title><Icon icon="fa-circle-question">Help</Icon></template>
  <div class="content">
    <h4>Actions</h4>
    <ul>
      <li><b>Unreserve</b> - Removes the active lobby reservation, allowing players to join when lobby is full. It is automatically removed once 4 players are fully in game.</li>
      <li><b>Request Restart</b> - Restarts server <em>only</em> if no players are currently online</li>
      <li><b>Force Restart</b> - Restarts server <em>regardless</em> of players online</li>
      <li><b>Start</b> - Available only on some servers, starts the server</li>
      <li><b>Stop</b> - Available only on some servers, stops the server, requiring it to be manually restarted</li>
    </ul>
    <h4>New Server</h4>
    <p>
      A new server can be created for some supported server groups. This can allow you to play even if another party is playing on the server you want already.
    </p>
    <p>Extra servers that are unused & empty for a duration of time may be automatically removed</p>
    <h4>Search</h4>
    <p>Search will search the following properties:
      <ul>
        <li>Server Id</li>
        <li>Server Name</li>
        <li>Server IP</li>
        <li>Server Port</li>
        <li>Group Name</li>
      </ul>
      In addition, you can filter only servers of a certain group with <code>@groupid</code> or <code>@groupname</code>. (no spaces)
    </p>
  </div>
  <template #buttons><!-- hide buttons, need non-empty template: --><template /></template>
</ModalCard>
<div class="container is-fluid">
  <div class="box">
    <div class="is-fullwidth is-radiusless">
      <nav class="level">
        <!-- Left side -->
        <div class="level-left">
          <div class="level-item">
            <Field icon-left="fa-search">
              <input v-model="searchQuery" type="text" class="input" placeholder="Search..." />
            </Field>
          </div>
          <div class="level-item" @mouseleave="showActionDropdown = false" v-if="selectedServers.length > 0">
            <div :class="['dropdown',{'is-active': showActionDropdown}]">
              <div class="dropdown-trigger">
                <button class="button" aria-haspopup="true" aria-controls="dropdown-menu" @click="showActionDropdown = !showActionDropdown">
                  <Icon icon="fa-chevron-down" text-left="Perform action"></Icon>
                </button>
              </div>
              <div class="dropdown-menu" id="dropdown-menu" role="menu">
                <div class="dropdown-content">
                  <a class="dropdown-item" v-for="action in allActions" :key="action.name"
                    @click="performAction(null, action)"
                    :style="{ color: action.color }"
                    :data-tooltip="action.description || undefined"
                  >
                    {{ action.name }}
                  </a>
                  <!-- <a class="dropdown-item"> Start </a>
                  <a class="dropdown-item"> Request Restart </a>
                  <a class="dropdown-item"> Stop </a>
                  <hr class="dropdown-divider" />
                  <a class="dropdown-item"> Unreserve </a>
                  <hr class="dropdown-divider" />
                  <a class="dropdown-item has-text-danger"> Delete </a> -->
                </div>
              </div>
            </div>
          </div>
          <div class="level-item">
            {{ filteredSortedServers.length }} <template v-if="filteredSortedServers.length != serverList.length">/ {{ serverList.length }}</template> servers
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button :class="['button',{'is-loading': refreshingServers}]" @click="fetchServers">
              <Icon icon="fa-sync"></Icon>
            </button>
          </div>
          <div class="level-item">
            <button class="button is-info" @click="setModal(Modal.NewServer)" data-tooltip="Start a new server instance">
              <Icon icon="fa-plus">New Server</Icon>
            </button>
          </div>
          <div class="level-item">
            <button class="button" data-tooltip="Help" @click="setModal(Modal.Help)">
              <Icon icon="fa-circle-question">Help</Icon>
            </button>
          </div>
        </div>
      </nav>
    </div>
    <br>
    <div class="columns">
      <div class="column is-12">
        <table class="table is-fullwidth is-hoverable">
          <thead>
            <tr class="header">
              <th><input type="checkbox" @input="selectAllServers" /></th>
              <th v-for="(field, i) in FIELDS" :key="i">
                {{ field.label }}
                <a v-if="field.sortFn" :class="getSortClass(field.label)" @click="setSort(field.label, field.sortFn)">
                  <Icon :icon="getSortIcon(field.label)"></Icon>
                </a>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="server in filteredSortedServers" :key="server.data.id">
              <td><input v-model="server.checked" type="checkbox" /></td>
              <td><router-link :data-tooltip="server.data.id"
                  :to="{name: 'servers-manage-server', params: { groupId: server.group.id, serverId: server.data.id }}"
                  class="has-text-weight-semibold">{{ server.data.name }}</router-link>
                <p>{{ server.data.host }}:{{ server.data.port }}</p>
              </td>
              <td>
                <router-link :data-tooltip="server.group.id"
                  :to="{name: 'servers-manage-group', params: { groupId: server.group.id }}">{{ server.group.name }}</router-link>
              </td>
              <td>
                <div class="tags">
                  <span class="tag" v-for="tag in server.data.tags" :key="tag">{{ tag }}</span>
                </div>
              </td>
              <td>
                <Icon :icon="server.stateData.icon" :class="server.stateData.class">{{ server.stateData.label }}</Icon>
                <p v-if="server.state === ServerState.Online">{{ server.data.status?.data?.players.length }} players online</p>
              </td>
              <td>
                <div class="buttons">
                  <!-- TODO: pull priority? or action flag -->
                  <a class="button is-small" @click="performAction([server], {})">Request Restart</a>
                  <a class="button is-small" @click="performAction([server], {})">Unreserve</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="py-2 columns is-centered" v-if="refreshError">
          <article class="column message is-half is-danger">
            <div class="message-body">
              <strong>Failed to fetch servers</strong><br>
              <p>{{ refreshError }}</p>
            </div>
          </article>
        </div>
        <p class="has-text-centered py-6" v-else-if="filteredSortedServers.length === 0">
          No servers found matching your query
          <br>See <b>Search</b> section in <a @click="setModal(Modal.Help)">help</a> for more information
        </p>
      </div>
    </div>
  </div>
</div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
import ModalCard from '@/components/ModalCard.vue'
import CreateServerModal from '@/components/servers/CreateServerModal.vue'
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue'
import { APIListServersV2, APIListServersV2_Groups, APIListServersV2_Server, ServerAction, ServerState } from '../../../../common-types/Server.js'

// The number of ms to refresh server list
const LIST_REFRESH_INTERVAL = 1000 * 8

interface FieldInfo {
  label: string,
  sortFn?: (a: UIServerInfo, b: UIServerInfo) => number
}
const FIELDS: FieldInfo[] = [
  {
    label: "Name",
    sortFn: (a,b) => a.data.name.localeCompare(b.data.name)
  },
  {
    label: "Group",
    sortFn: (a,b) => a.group.name.localeCompare(b.group.name)
  },{
    label: "Tags",
  },{
    label: "State",
    sortFn: (a,b) => a.state - b.state
  },
]
const StateMap: Record<ServerState, { label: string, icon: string, class: string }> = {
  [ServerState.Offline]: {
    label: 'Offline',
    icon: 'fa-square',
    class: 'has-text-danger'
  },
  [ServerState.Online]: {
    label: 'Online',
    icon: 'fa-circle',
    class: 'has-text-success'
  },
  [ServerState.Starting]: {
    label: 'Starting',
    icon: 'fa-diamond',
    class: 'has-text-pending'
  },
  [ServerState.Stopping]: {
    label: 'Stopping',
    icon: 'fa-diamond',
    class: 'has-text-pending'
  },
  [ServerState.Updating]: {
    label: '',
    icon: 'fa-hourglass',
    class: 'has-text-info'
  }
}

interface UIServerInfo {
  data: APIListServersV2_Server
  checked: boolean,
  group: {
    id: string,
    name: string
  },
  state: ServerState,
  stateData: {
    label: string,
    icon: string,
    class: string
  }
}


// const rawServers: ServerInfo[] = [
//   {
//     id: "l4d2-main-27015",
//     name: "L4D2 Main 27015",
//     groupId: "l4d2",
//     tags: ["docker", "5+", "customs"],
//     state: ServerState.Online,
//   },
//   {
//     id: "l4d2-main-27101",
//     name: "L4D2 Randomizer 27101",
//     groupId: "l4d2",
//     tags: ["docker", "5+"],
//     state: ServerState.Online,
//   },
//   {
//     id: "mc-1",
//     name: "Minecraft 1",
//     groupId: "minecraft",
//     tags: ["docker"],
//     state: ServerState.Online,
//   },
//   {
//     id: "mc-2",
//     name: "Minecraft 2",
//     groupId: "minecraft",
//     tags: ["docker"],
//     state: ServerState.Offline,
//   },
//   {
//     id: "mc-3",
//     name: "Minecraft 3",
//     groupId: "minecraft",
//     tags: ["docker"],
//     state: ServerState.Starting,
//   }
// ]


enum Modal {
  None,
  Help,
  NewServer
}
let activeModal = ref<Modal>(Modal.None)
let showActionDropdown = ref(false)
let searchQuery = ref()
let groups = ref<APIListServersV2_Groups>({})
let serverList = ref<UIServerInfo[]>([])
let sort = ref<{field: string, descending: boolean, sortFn: (a: UIServerInfo, b: UIServerInfo) => any}|undefined>(undefined)
let refreshingServers = ref(false)
let refreshError = ref()

const selectedServers = computed(() => {
  return serverList.value.filter(s => s.checked)
})

const SEARCH_REGEX_GROUP = new RegExp(/@([a-zA-Z0-9\-]+)?/)

const filteredSortedServers = computed(() => {
  let result = serverList.value
  if(searchQuery.value != undefined) {
    let query = searchQuery.value.toLowerCase().trim()
    let groupMatch = query.match(SEARCH_REGEX_GROUP)
    if(groupMatch) {
      query = query.substring(0, groupMatch.index) + query.substring(groupMatch.index+groupMatch[0].length).trim()
      groupMatch = groupMatch[1]
    }
    result = result.filter(server => {
      return (
        server.data.name.toLowerCase().includes(query)
        || server.data.id.toLowerCase().includes(query)
        || server.data.host.includes(query)
        || server.data.port.toString().includes(query)
      ) && (
        !groupMatch || (server.group.id.startsWith(groupMatch) || server.group.name.startsWith(groupMatch))
      )
    })
  }
  if(sort.value != undefined) {
    result = result.sort((a,b) => {
      return sort.value!.descending ? sort.value!.sortFn(b, a) : sort.value!.sortFn(a, b)
    })
  }
  return result
})

const allActions = computed(() => {
  const actions: Record<string, ServerAction> = {}
  for(const server of serverList.value) {
    for(const action of server.data.actions) {
      if(!actions[action.name]) {
        actions[action.name] = action
      }
    }
  }
  return Object.values(actions)
})

function setModal(modal: Modal | null) {
  activeModal.value = modal ?? Modal.None
}
function getSortClass(field: string) {
  return sort.value && sort.value.field === field ? 'has-text-info' : 'has-text-black'
}
function getSortIcon(field: string) {
  if(!sort.value || sort.value.field !== field) return "fa-sort"
  return sort.value?.descending ? "fa-sort-down" : "fa-sort-up"
}

function setSort(field: string, fn: (a: UIServerInfo, b: UIServerInfo) => number) {
  if(!sort.value || sort.value.field != field) {
    sort.value = {
      field,
      descending: false,
      sortFn: fn
    }
  }
  sort.value.descending = !sort.value.descending
}

async function performAction(servers: UIServerInfo[]|null, action: ServerAction) {
  if(!servers) servers = selectedServers.value
  alert("Not implemented")
}

function selectAllServers(event: Event) {
  if(event.target instanceof HTMLInputElement) {
    for(const server of serverList.value) {
      server.checked = event.target.checked
    }
  }
}


async function fetchServers() {
  refreshingServers.value = true

  try {
    const response = await fetch("/api/servers/v2")
    if(response.ok) {
      const json = await response.json() as APIListServersV2
      groups.value = json.groups
      serverList.value = json.servers.map(server => {
        const state = server.status?.data ? ServerState.Online : ServerState.Offline
        return {
          data: server,
          checked: false,
          group: {
            id: server.groupId,
            name: groups.value[server.groupId]?.name ?? server.groupId
          },
          state,
          stateData: StateMap[state]
        } as UIServerInfo
      })
      refreshingServers.value = false
      refreshError.value = undefined
      return true
    } else if(response.headers.get("Content-Type")?.startsWith("application/json")) {
      const json = await response.json()
      refreshingServers.value = false
      refreshError.value = `Server returned error \"${json.message}\" code ${json.error}`
    } else {
      refreshingServers.value = false
      refreshError.value = `Server returned an error: ${response.status} ${response.statusText}`
    }
  } catch(err) {
    refreshingServers.value = false
    refreshError.value = (err as any).message
    alert(err)
  }
  return false
}

onMounted(() => {
  fetchServers()
})
let refreshTimer: any

onMounted(async () => {
  if(await fetchServers()) { // only set timer on first success
    refreshTimer = setInterval(() => fetchServers(), LIST_REFRESH_INTERVAL)
  }
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
})
</script>

<style scoped>
.has-text-pending {
  color: rgb(176, 176, 176);
}
tr.header > td {
  color: gray !important;
}
tbody > th,td {
  padding-top: 25px;
  padding-bottom: 25px;
}
td {
  vertical-align: middle;
}
input[type="checkbox"] {
  /* Double-sized Checkboxes */
  -ms-transform: scale(1.5);
  /* IE */
  -moz-transform: scale(1.5);
  /* FF */
  -webkit-transform: scale(1.5);
  /* Safari and Chrome */
  -o-transform: scale(1.5);
  /* Opera */
  transform: scale(1.5);
  padding: 10px;
}
</style>
