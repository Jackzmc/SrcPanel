<template>
<div>
  <div class="container">
    <div class="columns">
      <div class="column is-11">
        <p class="title is-3">Server Logs</p>
        <p class="subtitle is-4">
          {{count.toLocaleString()}} log entries
          <em v-if="query != ''">(filtered)</em>
        </p>
      </div>
      <div class="column">
        <button @click="onBtnRefresh" :disabled="loading > 0" :class="['button','is-info',{'is-loading':loading > 0}]">Refresh</button>
      </div>
    </div>
    <br>
    <div class="columns">
      <div class="column">
        <label class="label">
          Enabled Servers
          <a class="is-inline" @click="filters['servers'] = []">(Clear)</a>&nbsp;
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
        <br>
        <span class="has-text-weight-bold"> - or enter manually: - </span>
        <div class="columns">
          <div class="column">
            <input type="text" :class="filterTargetClass" v-model="filters.target" message="a" placeholder="STEAM_#:#:########" />
          </div>
          <div class="column" v-show="filterTargetName">
            <input type="text" v-model="filterTargetName" disabled class="input disabled" />
          </div>
        </div>
      </div>
      <div class="column is-2">
        <label class="label">Find Messages Around ID</label>
        <input type="text" class="input" v-model="search.id" placeholder="#####" />
        <em v-if="showIds"><a @click="showIds = false">(click here to hide ids)</a></em>
        <em v-else><a @click="showIds = true">(click here to see ids)</a></em>
      </div>
    </div>
  </div>
  <hr>
  <div class="container">
    <p v-if="loading == 1" class="subtitle is-3 has-text-centered">Loading...</p>
    <Pagination v-else :page="page" :count="count" :limit="limit" @page="setPage" />
  </div>
  <br>
  <div class="container is-fluid" v-show="loading == 0">
    <table class="table is-fullwidth is-striped is-hoverable is-bordered">
      <thead>
        <tr>
          <th style="width:0" v-if="debugView||showIds">ID</th>
          <th style="width:0" data-tooltip="The server the action was recorded on">Server</th>
          <th style="width:0" data-tooltip="The type of action that occurred">Type</th>
          <th style="width:0" data-tooltip="Who caused the action to occur. May not exist">Activator</th>
          <th>
            <div class="is-inline-block">
              <label class="label is-inline-block">Message</label>&nbsp;&nbsp;
              <input class="input is-inline is-small is-expanded" v-model="search.message" placeholder="Filter" />
            </div>
          </th>
          <th v-if="isTargetColumnVisible" style="width:0" data-tooltip="Who the action was against. May not exist">Target</th>
          <th style="width:0">Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredData" :key="log.id" :class="search.id==log.id?['has-background-primary']:[]">
          <td v-if="debugView||showIds" class="nowrap">
            <a data-tooltip="Click to view all messages around this entry" class="has-tooltip-right" @click="search.id=log.id;getData()">{{ log.id }}</a>
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
              @click="setUserFilter('client', log.client.steamid)"
              @click.ctrl="openStatsProfile(log.client.steamid)"
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
              @click="setUserFilter('target', log.target.steamid)"
              @click.ctrl="openStatsProfile(log.target.steamid)"
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
  </div>
<br>
</div>
</template>

<script>
import Pagination from '@/components/pagination'
import Debounce from '@/js/debounce.js'

const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/g
const USER_REGEX = /^(STEAM_\d:\d:\d+|Server|CONSOLE)$/
const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/

export default {
  components: { Pagination },
  FILTERS: {
    servers: [
      "improved", "reserved", "public1", "public2", "public3", "public4", "public5", "public6", "public7", "public8"
    ],
    types: [ "ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN" ],
  },
  TYPE_COLORS: {
    ACTION: "is-info",
    CHAT: "is-secondary",
    STATE: "is-primary",
    QUIT: "is-danger",
    JOIN: "is-success",
    INFO: "is-link"
  },
  SERVER_COLORS: {
    improved: "is-success",
    reserved: "is-dark",
  },
  data() {
    return {
      loading: 1,
      data: [],
      count: 0,
      filters: {
        servers: ["improved", "reserved"],
        types: ["ACTION", "CHAT", "INFO", "STATE"],
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
      return this.data.filter(log => log.message.includes(this.search.message))
    },
    query() {
      //todo: search
      let query = ""
      if(!this.isFilterTargetValid) return query
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
      this.fetchDebounce()
    }
  },
  methods: {
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
    getData() {
      fetch(`//api.lgs.jackz.me/get-activity.php?page=${this.page}&limit=${this.limit}${this.query}`)
        .then(res => res.json())
        .then(json => {
          this.loading = false
          this.count = json.count
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
        })
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
    this.getData()
    setInterval(() => this.getData(), 1000 * 60 * 2)
  },
}

</script>

<style>
.nowrap {
  white-space:nowrap;
}
</style>
