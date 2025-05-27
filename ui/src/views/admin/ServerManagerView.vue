<template>
<div>
<CreateServerModal />
<div class="container is-fluid">
  <div class="box">
    <div class="is-fullwidth is-radiusless">
      <nav class="level">
        <!-- Left side -->
        <div class="level-left">
          <div class="level-item">
            <a class="button" :disabled="selectedServers.length === 0 ? true : undefined">
              <Icon icon="fa-edit">Edit</Icon>
            </a>
          </div>
          <div class="level-item">
            <a class="button is-danger" :disabled="selectedServers.length === 0 ? true : undefined">
              <Icon icon="fa-trash">Delete</Icon>
            </a>
          </div>

        </div>
        <div class="level-right">
          <div class="level-item">
            <button class="button is-info">
              New Server
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
              <!-- <th>Name <a :class="getSortClass('data.name')" @click="setSort('data.name')"><Icon :icon="getSortIcon('data.name')"></Icon></a></th>
                    <th>Group <a :class="getSortClass('data.group.name')" @click="setSort('data.group.name')"><Icon :icon="getSortIcon('data.group.name')"></Icon></a></th>
                    <th>Tags</th>
                    <th>State <a :class="getSortClass('data.state')" @click="setSort('data.state')"><Icon :icon="getSortIcon('data.state')"></Icon></a></th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="server in filteredSortedServers" :key="server.data.id">
              <td><input v-model="server.checked" type="checkbox" /></td>
              <td><router-link
                  :to="{name: 'manage-servers-server', params: { groupId: server.group.id, serverId: server.data.id }}"
                  class="has-text-weight-semibold">{{ server.data.name }}</router-link></td>
              <td>
                <router-link
                  :to="{name: 'manage-servers-group', params: { groupId: server.group.id }}">{{ server.group.name }}</router-link>
              </td>
              <td>
                <div class="tags">
                  <span class="tag" v-for="tag in server.data.tags" :key="tag">{{ tag }}</span>
                </div>
              </td>
              <td>
                <Icon :icon="server.stateData.icon" :class="server.stateData.class">{{ server.stateData.label }}</Icon>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
</div>
</template>

<script setup lang="ts">
import ModalCard from '@/components/ModalCard.vue'
import CreateServerModal from '@/components/servers/CreateServerModal.vue'
import { computed, onBeforeMount, ref } from 'vue'

enum ServerState {
  Offline = 0,
  Online = 1,
  Starting = 2,
  Stopping = 3,
  Updating = 4
}
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
    sortFn: (a,b) => a.data.state - b.data.state
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

interface ServerInfo {
  id: string,
  name: string,
  groupId: string,
  tags: string[],
  state: ServerState,
}
interface UIServerInfo {
  data: ServerInfo
  checked: boolean,
  group: {
    id: string,
    name: string
  },
  stateData: {
    label: string,
    icon: string,
    class: string
  }
}

const tempGroupMap: Record<string, string|undefined> = {l4d2: "L4D2", minecraft: "Minecraft"}

const rawServers: ServerInfo[] = [
  {
    id: "l4d2-main-27015",
    name: "L4D2 Main 27015",
    groupId: "l4d2",
    tags: ["docker", "5+", "customs"],
    state: ServerState.Online,
  },
  {
    id: "l4d2-main-27101",
    name: "L4D2 Randomizer 27101",
    groupId: "l4d2",
    tags: ["docker", "5+"],
    state: ServerState.Online,
  },
  {
    id: "mc-1",
    name: "Minecraft 1",
    groupId: "minecraft",
    tags: ["docker"],
    state: ServerState.Online,
  },
  {
    id: "mc-2",
    name: "Minecraft 2",
    groupId: "minecraft",
    tags: ["docker"],
    state: ServerState.Offline,
  },
  {
    id: "mc-3",
    name: "Minecraft 3",
    groupId: "minecraft",
    tags: ["docker"],
    state: ServerState.Starting,
  }
]


let servers = ref<UIServerInfo[]>([])
let sort = ref<{field: string, descending: boolean, sortFn: (a: UIServerInfo, b: UIServerInfo) => any}|undefined>(undefined)

onBeforeMount(() => {
  servers.value = rawServers.map(server => {
    return {
      data: server,
      checked: false,
      group: {
        id: server.groupId,
        name: tempGroupMap[server.groupId] ?? server.groupId
      },
      stateData: StateMap[server.state]
    }
  })
})

// const servers = computed(() => {
//   return rawServers.map(server => {
//     return {
//       ...server,
//       group: {
//         id: server.group,
//         name: tempGroupMap[server.group] ?? server.group
//       },
//       stateData: StateMap[server.state]
//     }
//   })
// })

const selectedServers = computed(() => {
  return servers.value.filter(s => s.checked)
})

const filteredSortedServers = computed(() => {
  let result = servers.value
    .filter(server => {
      return true
    })
  if(sort.value != undefined) {
    result = result.sort((a,b) => {
      return sort.value!.descending ? sort.value!.sortFn(b, a) : sort.value!.sortFn(a, b)
    })
  }
  return result
})

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

function selectAllServers(event: Event) {
  if(event.target instanceof HTMLInputElement) {
    console.log(event.target.checked)
    for(const server of servers.value) {
      server.checked = event.target.checked
    }
  }
}

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
