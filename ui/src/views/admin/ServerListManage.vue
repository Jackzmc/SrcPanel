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
    <div><p>Search will search the following properties:</p>
      <ul>
        <li>Server Id</li>
        <li>Server Name</li>
        <li>Server IP</li>
        <li>Server Port</li>
        <li>Group Name</li>
      </ul>
      <p>In addition, you can filter only servers of a certain group with <code>@groupid</code> or <code>@groupname</code>. (no spaces)</p>
    </div>
  </div>
  <template #buttons><!-- hide buttons, need non-empty template: --><template /></template>
</ModalCard>
<div class="container is-fluid">
  <div class="columns is-multiline">
    <!-- <article class="column is-6 message is-danger">
      <div class="message-body">
        <button class="delete is-inline is-pulled-right"></button>
        <h5 class="title is-5">Action(s) Failed</h5>
        <table class="table is-narrow ">
          <thead>
            <tr>
              <th>Server</th>
              <th>Error Code</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Server 1</td>
              <td>ERROR_CODE</td>
              <td>an error message here</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article> -->
    <div v-for="notification,i in notifications" :key="i" class="column is-10">
      <div :class="['notification','is-'+notification.type,'is-light']">
      <button class="delete" @click="notifications.splice(i,1)"></button>
      <h5 class="title is-5">Action Error</h5>
      <p class="subtitle">{{ notification.message }}</p>
      <table :class="'table is-narrow is-fullwidth has-background-' + notification.type + '-light'">
        <thead>
          <tr>
            <th>Server</th>
            <th>Error Code</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="action,i in notification.errors" :key="i">
            <td>{{ action.groupId }}/{{ action.serverId }}</td>
            <td>{{ action.code }}</td>
            <td>{{ action.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>

  </div>
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
                <button :class="['button',{'is-loading': pendingAction}]"
                  :disabled="pendingAction?true:undefined"
                  aria-haspopup="true" aria-controls="dropdown-menu"
                  @click="showActionDropdown = !showActionDropdown"
                >
                  <Icon icon="fa-chevron-down" text-left="Perform an action"></Icon>
                </button>
              </div>
              <div class="dropdown-menu" id="dropdown-menu" role="menu">
                <div class="dropdown-content">
                  <a :class="['dropdown-item',{'is-loading': pendingAction}]" v-for="action in allActions" :key="action.name"
                    @click="performAction(null, action)"
                    :style="{ color: action.color }"
                    :data-tooltip="action.description || undefined"
                  >
                    {{ action.name }}
                  </a>
                  <a class="dropdown-item is-disabled" disabled v-if="allActions.length === 0">No actions available</a>
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
            <button :class="['button',{'is-loading': refreshingServers}]" @click="fetchServers(false)">
              <Icon icon="fa-sync"></Icon>
            </button>
          </div>
          <div class="level-item">
            <button class="button is-info" @click="setModal(Modal.NewServer)" data-tooltip="Start a new server instance">
              <Icon icon="fa-plus">Start New Server</Icon>
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
        <div class="py-2 columns is-centered" v-if="refreshError">
          <article class="column message is-half is-danger">
            <div class="message-body">
              <strong>Failed to fetch servers</strong><br>
              <p>{{ refreshError }}</p>
            </div>
          </article>
        </div>
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
              <th>Quick Actions</th>
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
                <!-- <router-link :data-tooltip="server.group.id"
                  :to="{name: 'servers-manage-group', params: { groupId: server.group.id }}">{{ server.group.name }}</router-link> -->
                <a @click="searchQuery = '@' + server.group.id" :data-tooltip="server.group.id">{{ server.group.name }}</a>
              </td>
              <td>
                <div class="tags">
                  <span class="tag" v-for="tag in server.data.tags" :key="tag">{{ tag }}</span>
                </div>
              </td>
              <td>
                <Icon :icon="server.stateData.icon" :class="server.stateData.class">{{ server.stateData.label }}</Icon>
                <p v-if="server.data.status.data">
                  {{ server.data.status?.data?.players.length }} players online
                </p>
                <p v-else-if="server.state === ServerState.Online"><em>No status available</em></p>
              </td>
              <td>
                <div class="buttons my-0">
                  <!-- TODO: pull priority? or action flag -->
                  <a v-for="(action, i) in server.quickActions" :key="i" :data-tooltip="action.description"
                    :class="['button','is-small','has-tooltip-multiline',{'is-loading': pendingAction}]"
                    @click="performAction([server], action)"
                  >{{ action.name }}</a>
                </div>
                <!-- <div class="buttons mt-2">
                  <a class="button is-small" @click="performAction([server], {})">Request Restart</a>
                  <a class="button is-small" @click="performAction([server], {})">Unreserve</a>

                </div> -->
              </td>
            </tr>
          </tbody>
        </table>
        <p class="has-text-centered py-6" v-if="filteredSortedServers.length === 0">
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
import { computed, onActivated, onBeforeMount, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { APIListServersCompactV2, APIListServersV2, APIListServersV2_Groups, APIListServersV2_Server, ServerAction } from '../../../../common-types/Server.js'
import { PanelMetaInfo } from '../../../../common-types/Panel.js'
import { notify } from '@kyvg/vue3-notification'

const props = defineProps<{
  meta?: PanelMetaInfo
}>()

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
enum ServerState {
  Offline,
  Online
}
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
  // [ServerState.Starting]: {
  //   label: 'Starting',
  //   icon: 'fa-diamond',
  //   class: 'has-text-pending'
  // },
  // [ServerState.Stopping]: {
  //   label: 'Stopping',
  //   icon: 'fa-diamond',
  //   class: 'has-text-pending'
  // },
  // [ServerState.Updating]: {
  //   label: '',
  //   icon: 'fa-hourglass',
  //   class: 'has-text-info'
  // }
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
  },
  quickActions: ServerAction[]
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
let serverMap = ref<Record<string, UIServerInfo>>({})
let sort = ref<{field: string, descending: boolean, sortFn: (a: UIServerInfo, b: UIServerInfo) => any}|undefined>(undefined)
let refreshingServers = ref(false)
let refreshError = ref()
let pendingAction = ref(false)

let notifications = ref<{ errors: { groupId: string, serverId: string, code: string, message: string }[], message?: string, type: string, expireOn: number }[]>([])

const serverList = computed(() => Object.values(serverMap.value))
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

class ActionError extends Error {
  groupId: string;
  serverId: string;
  code: string;
  constructor(groupId: string, serverId: string, errorCode: string, message: string) {
    super(message)
    this.groupId = groupId
    this.serverId = serverId
    this.code = errorCode
  }
  get name() { return "ActionError"}
}

async function performAction(servers: UIServerInfo[]|null, action: ServerAction) {
  if(pendingAction.value) return console.warn("performAction not ready")
  pendingAction.value = true
  if(!servers) servers = selectedServers.value
  const promises = servers.map(async server => {
    try {
      const response = await fetch(`/api/servers/${server.data.id}/action/${action.command}`, { method: "POST"})
      if(response.ok) {
        return true
      } else if(response.headers.get("content-type")?.includes("application/json")) {
        const json = await response.json()
        throw new ActionError(server.data.groupId, server.data.id, json.error, json.message)
      } else {
        throw new ActionError(server.data.groupId, server.data.id, response.status.toString(), response.statusText)
      }
    } catch(err) {
      throw new ActionError(server.data.groupId, server.data.id, "FETCH_ERROR", (err as any).message)
    }
  })
  const results = await Promise.allSettled(promises)
  pendingAction.value = false
  const failed = results.filter(r => r.status == "rejected")
  if(failed.length >= promises.length) {
    notifications.value.push({
      type: "danger",
      errors: failed.map(p => {
        return {
          groupId: p.reason.groupId,
          serverId: p.reason.serverId,
          code: p.reason.code,
          message: p.reason.message
        }
      }),
      message: "All servers returned an error",
      expireOn: Date.now() + 1000 * 30,
    })
    // notify({
    //   type: "error",
    //   title: `Action <b>${action.name}</b> failed`,
    //   text: "All servers returned an error, click for more information",
    // })
  } else if(failed.length > 0) {
    notifications.value.push({
      type: "warning",
      errors: failed.map(p => {
        return {
          groupId: p.reason.groupId,
          serverId: p.reason.serverId,
          code: p.reason.code,
          message: p.reason.message
        }
      }),
      message: `${failed.length} servers had errors performing action`,
      expireOn: Date.now() + 1000 * 30,
    })
    // notify({
    //   type: "warn",
    //   title: `Action <b>${action.name}</b> had errors`,
    //   text: `${failed.length} servers had errors performing action, click for more information`
    // })
  } else {
    notify({
      type: "success",
      title: `Action <b>${action.name}</b> complete`,
      text: `${promises.length} servers returned no errors`
    })
  }
}

function selectAllServers(event: Event) {
  if(event.target instanceof HTMLInputElement) {
    for(const server of serverList.value) {
      server.checked = event.target.checked
    }
  }
}


async function fetchServers(compact = false) {
  refreshingServers.value = true

  for(const [i,notify] of notifications.value.entries()) {
    if(notify.expireOn <= Date.now()) {
      notifications.value.splice(i, 1)
    }
  }

  try {
    const response = await fetch(compact ? "/api/servers/v2/compact" : "/api/servers/v2")
    if(response.ok) {
      const json = await response.json() as APIListServersV2 | APIListServersCompactV2
      if('groups' in json) {
        groups.value = json.groups
      }
      for(const server of json.servers) {
        const state = server.online ? ServerState.Online : ServerState.Offline
        if('host' in server) {
          // Not compact, full refresh
          serverMap.value[server.id] = {
            data: server,
            checked: serverMap.value[server.id]?.checked ?? false,
            group: {
              id: server.groupId,
              name: groups.value[server.groupId]?.name ?? server.groupId
            },
            state,
            stateData: StateMap[state],
            quickActions: server.actions.filter(a => a.inQuickAction)
          }
        } else {
          // Compact, only update status / online
          serverMap.value[server.id].data.status = server.status
          serverMap.value[server.id].state = state
        }
      }
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
  }
  return false
}

let refreshTimer: any

onActivated(async () => {
  if(await fetchServers()) { // only set timer on first success
    refreshTimer = setInterval(() => fetchServers(true), LIST_REFRESH_INTERVAL)
  }

})

onDeactivated(() => {
  console.debug("clear", refreshTimer)
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
