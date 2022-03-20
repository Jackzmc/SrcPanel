<template>
  <div id="app">
    <NavBar v-if="userdata" :userdata="userdata" />
    <span id="lastUpdate">
      <p v-if="updating" class="has-text-black has-text-weight-bold">New update available, updating...</p>
      <a v-else-if="updateRegistration" class="has-text-black" @click='reloadPage'>
        <b>New update available.</b><br>Click here if page does not reload.</a>
      <template v-else>
        Last Updated {{$LAST_UPDATED}}
      </template>
    </span>
    <section class="hero is-info has-text-centered">
        <div class="hero-body">
            <p class="title" >
              Jackz's L4D2 Network
            </p>
            <p class="subtitle">
              Information & Administration Dashboard
            </p>
        </div>
    </section>
    <div class="tabs is-centered">
        <ul>
          <li v-for="(data, id) in tabs" :key="id" :class="{'is-active': isActive(id)}">
            <a @click='setTab(id)'>{{data[0]}}</a>
          </li>
        </ul>
    </div>
    <keep-alive :name="tabIndex">
      <component :userdata="userdata" :is="tab" />
    </keep-alive>
  </div>
</template>

<script>
import CommandsTab from './tabs/CommandsTab.vue'
import CvarsTab from './tabs/CvarsTab.vue'
import OverviewTab from './tabs/OverviewTab.vue'
import ExtraPlayersTab from './tabs/ExtraPlayersTab.vue'
import FeedTheTrollsTab from './tabs/FeedTheTrollsTab.vue'
import PlayerTargetting from './tabs/PlayerTargetting.vue'
import StateManagementTab from './tabs/StateManagementTab.vue'
import BansTab from './tabs/BansTab.vue'
import PluginDescriptionsTab from './tabs/PluginDescriptionsTab.vue'
import MapsTab from './tabs/MapsTab.vue'
import ManagementTab from './tabs/ManagementTab.vue'
import LogTab from './tabs/LogTab.vue'
import NotesTab from './tabs/NotesTab.vue'
import GraphsTab from './tabs/GraphsTab.vue'

import NavBar from '@/components/NavBar'

export default {
  name: 'App',
  components: { NavBar },
  DEFAULT_TABS: {
    overview: ["Overview", OverviewTab],
    commands: ["Commands", CommandsTab],
    cvars:    ["Cvars", CvarsTab],
    ftt:      ["Feed The Trolls", FeedTheTrollsTab],
    targetting: ["Player Targets", PlayerTargetting],
    extraplayers: ["5+ Players", ExtraPlayersTab],
    //states:   ["State Management", StateManagementTab],
    bans:     ["Bans", BansTab],
    plugins:  ["Plugins", PluginDescriptionsTab],
    info:    ["Info", NotesTab],
    graphs:   ["Graphs", GraphsTab],
  },
  data() {
    return {
      tabIndex: 'overview',
      tab: OverviewTab,
      updateRegistration: null,
      updating: false,
      userdata: null
    }
  },
  computed: {
    tabs() {
      if(this.userdata) {
        return {
          ...this.$options.DEFAULT_TABS,
          workshop: ['Maps', MapsTab],
          manage:   ["Management", ManagementTab],
          logs:     ["Logs", LogTab],
          info:    ["Info", NotesTab],
        }
      } else return this.$options.DEFAULT_TABS
    }
  },
  methods: {
    setTab(tabid) {
      this.tabIndex = tabid
      const tab = this.tabs[tabid]
      if(!tab) return console.warn('Tab not found: ', tabid)
      document.title = `${tab[0]} - L4D2 Admin Guide`
      this.tab = tab[1]
      window.location.hash = `#${tabid}`
    },
    isActive(tab) {
      return this.tabIndex == tab
    },
    reloadPage() {
      if (!this.updateRegistration || !this.updateRegistration.waiting) return
      this.updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    },
    updateAvailable(event) {
      this.updateRegistration = event.detail
      this.reloadPage()
    },
    async getAuth() {
      const response = await fetch(`api/auth/steam/details`, {
        credentials: 'include'
      })
      if(response.ok) {
        const json = await response.json()
        this.userdata = {
          user: json.user,
          permissions: json.permissions
        }
        console.log('Authorized: Hello', json.user.name)
      }
    }
  },
  async created() {
    document.addEventListener('swUpdated', this.updateAvailable, { once: true })
    document.addEventListener('swUpdating', () => this.updating = true, { once: true })
    await this.getAuth()

    if(window.location.hash) {
      let tab = window.location.hash.substring(1)
      if(this.tabs[tab]) {
        this.setTab(tab)
      }
    }else{
      window.location.hash = '#overview'
      document.title = "Overview - L4D2 Admin Guide"
    }
  }
}
</script>


<style>
#lastUpdate {
  position: fixed;
  top: 0;
  right: 5px;
  color: white;
}
</style>
