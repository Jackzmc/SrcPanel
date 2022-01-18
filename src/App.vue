<template>
  <div id="app">
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
                Administration Guide
            </p>
            <p class="subtitle">
            Click on one of the tabs.
            </p>
        </div>
    </section>
    <div class="tabs is-centered">
        <ul>
          <li v-for="(data, id) in $options.TABS" :key="id" :class="{'is-active': isActive(id)}">
            <a @click='setTab(id)'>{{data[0]}}</a>
          </li>
        </ul>
    </div>
    <keep-alive :name="tabIndex">
      <component :is="tab" />
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

export default {
  name: 'App',
  TABS: {
    overview: ["Overview", OverviewTab],
    commands: ["Commands", CommandsTab],
    cvars:    ["Cvars", CvarsTab],
    ftt:      ["Feed The Trolls", FeedTheTrollsTab],
    targetting: ["Player Targets", PlayerTargetting],
    extraplayers: ["5+ Players", ExtraPlayersTab],
    //states:   ["State Management", StateManagementTab],
    bans:     ["Bans", BansTab],
    workshop: ['Maps', MapsTab],
    manage:   ["Management", ManagementTab],
    plugins:  ["Plugins", PluginDescriptionsTab],
    logs:     ["Logs", LogTab],
    info:    ["Info", NotesTab],
    graphs:   ["Graphs", GraphsTab],
  },
  data() {
    return {
      tabIndex: 'overview',
      tab: OverviewTab,
      updateRegistration: null,
      updating: false
    }
  },
  methods: {
    setTab(tabid) {
      this.tabIndex = tabid
      const tab = this.$options.TABS[tabid]
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
  },
  created() {
    document.addEventListener('swUpdated', this.updateAvailable, { once: true })
    document.addEventListener('swUpdating', () => this.updating = true, { once: true })
    if(window.location.hash) {
      const hash = window.location.hash.substring(1)
      if(this.$options.TABS[hash]) {
        this.setTab(hash)
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
