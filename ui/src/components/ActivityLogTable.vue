<template>
  <table class="table is-fullwidth is-striped is-hoverable is-bordered">
    <thead>
      <tr>
        <th style="width:0" v-if="debug||showIds">ID</th>
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
      <tr v-for="log in logs" :key="log.id" :class="search.id==log.id?['has-background-primary']:[]">
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
</template>

<script>
export default {
  props: ['logs', 'debug', 'showIds'],
  computed: {
    isTargetColumnVisible() {
      for(const data in this.data) {
        if(this.data[data]['target']['steamid']) return true
      }
      return false
    }
  },
}
</script>
