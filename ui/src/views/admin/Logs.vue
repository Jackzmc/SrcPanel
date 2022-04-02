<template>
<div>
<Modal :active="modal.message !== null" v-if="modal.message" :closable="false">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title"><b>Error</b></p>
      <button class="delete" aria-label="close" @click='modal.message = null'></button>
    </header>
    <section class="modal-card-body">
      {{modal.message}}
    </section>
    <footer class="modal-card-foot">
      <button class="button is-success" aria-label="close" @click='modal.message = null'>Close</button>
    </footer>
  </div>
</Modal>
<div>
  <div class="container">
    <div class="columns">
      <div class="column is-9">
        <p class="title is-3">Server Logs</p>
        <p class="subtitle is-4">
          {{count.toLocaleString()}} log entries
          <em v-if="query != ''">(filtered)</em>
        </p>
      </div>
      <div class="column is-2">
        <label class="label">Find Messages Around ID</label>
        <div class="field has-addons">
          <div class="control">
            <input type="text" class="input" v-model="search.id" placeholder="######" />
          </div>
          <div class="control">
            <a class="button is-secondary" @click="search.id = null">
              x
            </a>
          </div>
        </div>

        <em v-if="showIds"><a @click="showIds = false">(click here to hide ids)</a></em>
        <em v-else><a @click="showIds = true">(click here to see ids)</a></em>
      </div>
      <div class="column">
        <div class="buttons">
          <button @click="onBtnRefresh" :disabled="loading > 0" :class="['button','is-info',{'is-loading':loading > 0}]">Refresh</button>
          <button @click="setDefaults" class="button is-secondary">Reset</button>
        </div>
      </div>
    </div>
    <br>
    <div class="columns">
      <div class="column">
        <label class="label">
          Enabled Servers
          <a class="is-inline" @click="filters['servers'] = ['unknown']">(Clear)</a>&nbsp;
          <a @click="filters['servers'] = $options.FILTERS['servers']">(Select All)</a>
        </label>

        <div class="buttons">
          <a
            v-for="key in $options.FILTERS.servers" :key="key"
            :class="['button', 'is-small', serverColors[key]]"
            @click="toggleList('servers', key)"
          >
            {{key}}
          </a>
        </div>
        <label class="label">
          Enabled Types
          <a class="is-inline" @click="filters['types'] = []">(Clear)</a>&nbsp;
          <a @click="filters['types'] = $options.FILTERS['types']">(Select All)</a>
        </label>
        <div class="buttons">
          <a
            v-for="key in $options.FILTERS.types" :key="key"
            :class="['button', 'is-small', typeColors[key]]"
            @click="toggleList('types', key)"
          >
            {{key}}
          </a>
        </div>
      </div>
      <div class="column">
        <label class="label">Filter Activator</label>
        <div class="select">
          <select v-model="filters.client">
            <option :value="null">Any</option>
            <option v-for="user in history.activators" :key="user.steamid" :value="user.steamid">
              <template v-if="user.name">
                {{user.name}} ({{user.steamid}})
              </template>
              <template v-else>{{user.steamid}}</template>
            </option>
          </select>
        </div>
        <br>
        <label class="label">Filter Target</label>
        <div class="select">
          <select v-model="filters.target">
            <option :value="null">Any</option>
            <option v-for="user in history.targets" :key="user.steamid" :value="user.steamid">
              <template v-if="user.name">
                {{user.name}} ({{user.steamid}})
              </template>
              <template v-else>{{user.steamid}}</template>
            </option>
          </select>
        </div>
      </div>
      <div class="column">
        <label class="label">Manual Input:</label>

        <div class="columns">
          <div class="column">
            <div class="field has-addons">
              <div class="control">
                <input type="text" :class="filterClientClass" v-model="filters.client" placeholder="STEAM_#:#:########" />
              </div>
              <div class="control">
                <a class="button is-secondary" @click="filters.client = null">
                  x
                </a>
              </div>
            </div>
            <br>
            <div class="field has-addons">
              <div class="control">
                <input type="text" :class="filterTargetClass" v-model="filters.target" placeholder="STEAM_#:#:########" />
              </div>
              <div class="control">
                <a class="button is-secondary" @click="filters.target = null">
                  x
                </a>
              </div>
            </div>
          </div>
          <div class="column">
            <input type="text" v-model="filterClientName" disabled class="input disabled" />
            <br><br>
            <input type="text" v-model="filterTargetName" disabled class="input disabled" />
          </div>
        </div>
      </div>
    </div>
  </div>
  <hr>
  <div class="container">
    <p v-if="loading == 1" class="subtitle is-3 has-text-centered">Loading...</p>
    <Pagination v-else-if="isFilterTargetValid||!filters.target||filters.target==''" :page="page" :count="count" :limit="limit" @page="setPage" />
    <p v-else class="has-text-danger">Invalid filter target</p>
  </div>
  <br>
  <div class="container is-fluid" v-show="loading == 0">
    <table class="table is-fullwidth is-striped is-hoverable is-bordered">
      <thead>
        <tr>
          <th style="width:0" v-if="debugView||showIds">ID</th>
          <th style="width:0" data-tooltip="The server the action was recorded on" class="has-tooltip-right">Server</th>
          <th style="width:0" data-tooltip="The type of action that occurred">Type</th>
          <th style="width:0" data-tooltip="Who caused the action to occur. May not exist">Activator</th>
          <th>
              <label class="label is-inline-block">Message</label>&nbsp;&nbsp;
              <input class="input is-inline is-small is-rounded" v-model="search.message" style="width:50%" placeholder="Filter" />
          </th>
          <th v-if="isTargetColumnVisible" style="width:0" data-tooltip="Who the action was against. May not exist">Target</th>
          <th style="width:0">Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredData" :key="log.id" :class="search.id==log.id?['has-background-primary']:[]">
          <td v-if="debugView||showIds" class="nowrap">
            <a data-tooltip="Click to view all messages around this entry" class="has-tooltip-right" @click="searchID(log.id)">{{ log.id }}</a>
          </td>
          <td class="nowrap">
            <span v-if="log.server" :class="['tag', $options.SERVER_COLORS[log.server]]">{{ log.server }}</span>
          </td>
          <td class="nowrap">
            <span :class="['tag', $options.TYPE_COLORS[log.type]]">{{ log.type }}</span>
          </td>
          <td class="nowrap">
            <b>
            <component
              :is="log.client.hasStats?'a':'span'"
              @click.ctrl="openStatsProfile(log.client.steamid)"
              @click="setUserFilter('client', log.client.steamid)"
              :data-tooltip="log.client.steamid + '\n\nClick to only see entries from this activator.' + (log.client.hasStats?'\nCtrl + Click to view stats profile':'')"
            >
              {{ log.client.name }}
            </component>
            </b>
          </td>
          <td v-html="log.message"></td>
          <td class="nowrap" v-if="isTargetColumnVisible">
            <component
              :is="log.target.hasStats ? 'a' : 'span'"
              @click.ctrl="openStatsProfile(log.target.steamid)"
              @click.exact="setUserFilter('target', log.target.steamid)"
              :data-tooltip="log.target.steamid + '\n\nClick to only see entries from this target.' + (log.target.hasStats?'\nCtrl + Click to view stats profile':'')"
            >
              {{ log.target.name }}
            </component>
          </td>
          <td class="nowrap">{{ log.timestamp }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <br>
  <div class="container" v-if="!loading">
    <Pagination :page="page" :count="count" :limit="limit" @page="setPage" />
    <a @click="toggleDebug" v-if="debugView"><em>(click to disable debug view)</em></a>
    <a @click="toggleDebug" v-else><em>(click to enable debug view)</em></a>
    <span v-if="debugView">
      {{query}}
    </span>
  </div>
<br>
</div>
</div>
</template>

<script>
import Pagination from '@/components/pagination'
import Debounce from '@/js/debounce.js'

const REFRESH_INTERVAL_MS = 1000 * 60 * 2

const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/g
const USER_REGEX = /^(STEAM_\d:\d:\d+|Server|CONSOLE|Smoker|Boomer|Charger|Jockey|Hunter|Spitter|Tank|Witch)$/
const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/

import Modal from '@/components/Modal'

const DEFAULT_TYPES = ["ACTION", "CHAT", "INFO", "STATE","WEB"]
const DEFAULT_SERVERS = ["improved", "reserved"]


export default {
  props: ['userdata'],
  components: { Pagination, Modal },
  FILTERS: {
    servers: [
      "improved", "reserved", "public1", "public2", "public3", "public4", "public5", "public6", "public7", "public8", "unknown", "web"
    ],
    types: [ "ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN", "WEB"],
  },
  TYPE_COLORS: {
    ACTION: "is-info",
    CHAT: "is-secondary",
    STATE: "is-primary",
    QUIT: "is-danger",
    JOIN: "is-success",
    INFO: "is-link",
    WEB: "is-dark"
  },
  SERVER_COLORS: {
    improved: "is-success",
    reserved: "is-dark",
  },
  data() {
    return {
      modal: {
        message: null
      },
      loading: 1,
      data: [],
      count: 0,
      filters: {
        servers: DEFAULT_SERVERS,
        types: DEFAULT_TYPES,
        client: null,
        target: null
      },
      search: {
        message: null,
        id: null
      },
      history: {
        activators: [],
        targets: [],
      },
      page: 1,
      limit: 20,
      fetchDebounce: null,
      debugView: false,
      showIds: false
    }
  },
  computed: {
    isFilterTargetValid() {
      return USER_REGEX.test(this.filters.target)
    },
    filterTargetClass() {
      let value = this.filters.target ? (this.isFilterTargetValid ? "is-success" : "is-danger") : ""
      return [
        'input',
        value
      ]
    },
    filterTargetName() {
      const result = this.history.targets.find(t => t.steamid === this.filters.target)
      return result ? result.name : null
    },
    isFilterClientValid() {
      return USER_REGEX.test(this.filters.client)
    },
    filterClientClass() {
      let value = this.filters.client ? (this.isFilterClientValid ? "is-success" : "is-danger") : ""
      return [
        'input',
        value
      ]
    },
    filterClientName() {
      const result = this.history.activators.find(t => t.steamid === this.filters.client)
      return result ? result.name : null
    },
    serverColors() {
      let obj = {}
      for(const server of this.$options.FILTERS.servers) {
        obj[server] = this.filters.servers.includes(server) ? this.$options.SERVER_COLORS[server] : 'is-light'
      }
      return obj
    },
    typeColors() {
      let obj = {}
      for(const type of this.$options.FILTERS.types) {
        obj[type] = this.filters.types.includes(type) ? this.$options.TYPE_COLORS[type] : 'is-light'
      }
      return obj
    },
    filteredData() {
      if(!this.search.message) return this.data
      return this.data
    },
    query() {
      //todo: search
      let query = ""
      if(!this.isFilterTargetValid&&this.filters.target) return query
      for(const filter in this.filters) {
        if(this.filters[filter]) {
          if(Array.isArray(this.filters[filter])) {
            if(this.filters[filter].length > 0 )
              query += `&${filter}=${this.filters[filter].join(",")}`
          } else {
            query += `&${filter}=${this.filters[filter]}`
          }
        }
      }
      for(const search in this.search) {
        if(this.search[search]) {
          query += `&search_${search}=${this.search[search]}`
        }
      }
      return query.length > 0 ? query : ""
    },
    isTargetColumnVisible() {
      for(const data in this.data) {
        if(this.data[data]['target']['steamid']) return true
      }
      return false
    }
  },
  watch: {
    query() {
      this.page = 1
      if(this.userdata)
        this.fetchDebounce()
      window.history.pushState("", "", `?page=${this.page}${this.query}#logs`);
    }
  },
  methods: {
    setDefaults() {
      this.filters.servers = DEFAULT_SERVERS
      this.filters.types = DEFAULT_TYPES
      this.filters.client = null
      this.filters.target = null
      this.search.message = null
      this.search.id = null
      this.page = 1
    },
    searchID(id) {
      this.search.id = id;
      this.search.message = null
      this.getData()
    },
    toggleList(listName, element) {
      const index = this.filters[listName].findIndex(e => e == element)
      if(index > -1) {
        this.filters[listName].splice(index, 1)
      } else {
        this.filters[listName].push(element)
      }
      this.getData()
    },
    toggleDebug() {
      this.debugView = !this.debugView
      this.getData()
    },
    onBtnRefresh() {
      this.loading = 2
      this.getData()
    },
    formatFilter(id) {
      return id[0].toUpperCase() + id.slice(1)
    },
    setPage(page) {
      this.page = page
      this.getData()
    },
    setUserFilter(type, id) {
      this.filters[type] = id
    },
    openStatsProfile(id) {
      window.open(`https://stats.jackz.me/user/${id}/overview`)
    },
    async getData() {
      try {
        const response = await fetch(`/api/logs/${this.page}?limit=${this.limit}${this.query}`, { credentials: 'include' })
        if(response.ok && response.status == 200) {
          const json = await response.json()
          this.loading = false
          this.count = json.totalCount
          json.logs.forEach(log => {
            log.timestamp = this.formatDate(log.timestamp)
            log.client = {
              steamid: log.client,
              name: log.clientName || log.client,
              hasStats: !!log.clientName,
            }
            log.target = {
              steamid: log.target,
              name: log.targetName || log.target,
              hasStats: !!log.targetName,
            }
            if(log.type == "ACTION" && log.client.steamid && log.client.steamid.startsWith("STEAM_") && !this.history.activators.some(c => c.steamid == log.client.steamid)) this.history.activators.push(log.client)
            if(log.target.steamid && log.target.steamid.startsWith("STEAM_") &&  !this.history.targets.some(c => c.steamid == log.target.steamid)) this.history.targets.push(log.target)

            if(!this.debugView && log.message) {
              log.message = log.message.replace(FULLNAME_REGEX, (m, p1) => p1)
              const adminChatMatch = log.message.match(ADMINCHAT_REGEX)
              if(adminChatMatch) {
                log.message = `<span class='tag is-warning' data-tooltip='Message was sent in admin chat'>${adminChatMatch[1]}</span>`
                log.type = "CHAT"
              }
            }
          })
          this.data = json.logs
          window.localStorage.setItem('l4d2admin_data', JSON.stringify({
            history: this.history
          }))
          return true
        } else {
          this.loading = false
          alert("Server error while fetching logs: " + response.statusText)
          return false
        }
      } catch(err) {
        this.loading = false
        alert("Error while fetching logs: " + err.message)
        return false
      }
    },
    formatDate(timestamp) {
      const d = new Date(timestamp * 1000)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
    },
    getStatProfile(id) {
      return `https://stats.jackz.me/user/${id}/overview`
    },
    addToHistory(steamid, list) {
      if(!steamid || !list || !this.history[list]) return false
      if(!this.history[list][steamid]) {
        this.history[list][steamid] = 0
      }
      this.history[list][steamid]++
    }
  },
  created() {
    if(window.localStorage['l4d2admin_data']) {
      this.history = JSON.parse(window.localStorage['l4d2admin_data']).history
    }

    this.fetchDebounce = Debounce(this.getData, 500)
    for(const filter in this.$options.FILTERS) {
      if(!this.filters[filter])
        this.$set(this.filters, filter, [])
    }
    const params = new URLSearchParams(window.location.search);
    if(params.has('types')) {
      this.filters.types = params.get('types').split(",")
    }
    if(params.has('servers')) {
      this.filters.servers = params.get('servers').split(",")
    }
    if(params.has('target')) {
      this.filters.target = params.get('target')
    }
    if(params.has('client') || params.has('activator')) {
      this.filters.client = params.get('client') ?? params.get('activator')
    }
    if(params.has('search_id')) {
      this.search.id = params.get('search_id')
    }
    if(params.has('search_message')) {
      this.search.message = params.get('search_message')
    }
    if(params.has('page')) {
      this.page = parseInt(params.get('page'))
    }
    if(this.userdata) {
      setInterval(() => {
        this.getData()
      }, REFRESH_INTERVAL_MS)
      this.getData()
    }

  },
}

</script>

<style>
.nowrap {
  white-space:nowrap;
}
</style>
