<template>
  <div id="app">
    <span id="lastUpdate">Last Updated {{$LAST_UPDATED}}</span>
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
    <component :is="tab" />
  </div>
</template>

<script>
import CommandsTab from './tabs/CommandsTab.vue'
import CvarsTab from './tabs/CvarsTab.vue'
import OverviewTab from './tabs/OverviewTab.vue'
import ExtraPlayersTab from './tabs/ExtraPlayersTab.vue'
import FeedTheTrollsTab from './tabs/FeedTheTrollsTab.vue'
import AdvancedTab from './tabs/AdvancedTab.vue'
import StateManagementTab from './tabs/StateManagementTab.vue'
import BansTab from './tabs/BansTab.vue'
import PluginDescriptionsTab from './tabs/PluginDescriptionsTab.vue'

export default {
  name: 'App',
  TABS: {
    overview: ["Overview", OverviewTab],
    commands: ["Commands", CommandsTab],
    cvars:    ["Cvars", CvarsTab],
    ftt:      ["Feed The Trolls", FeedTheTrollsTab],
    advanced: ["Advanced", AdvancedTab],
    extraplayers: ["5+ Player Games", ExtraPlayersTab],
    states:   ["State Management", StateManagementTab],
    bans:     ["Bans", BansTab],
    plugins:  ["Plugins", PluginDescriptionsTab]
  },
  data() {
    return {
      tabIndex: 'overview',
      tab: OverviewTab,
      servers: []
    }
  },
  methods: {
    setTab(tab) {
      this.tabIndex = tab
      this.tab = this.$options.TABS[tab][1]
      window.location.hash = `#${tab}`
    },
    isActive(tab) {
      return this.tabIndex == tab
    },
  },
  created() {
    if(window.location.hash) {
      const hash = window.location.hash.substring(1)
      if(this.$options.TABS[hash]) {
        this.setTab(hash)
      }
    }else{
      window.location.hash = '#overview'
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
