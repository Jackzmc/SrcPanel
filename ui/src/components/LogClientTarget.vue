<template>
  <component
    :is="user.hasStats?'a':'span'"
    @click.ctrl="openStatsProfile(user.steamid)"
    @click="setUserFilter(user.steamid)"
    :data-tooltip="tooltip"
  >
    {{ user.name }}
  </component>
</template>

<script>
export default {
  props: ['user', 'type'],
  methods: {
    setUserFilter(steamid) {
      this.$emit('set-filter', { type: this.type, steamid })
    }
  },
  computed: {
    tooltip() {
      let output = `${this.user.steamid}\n\nClick to only see entries from this user.`
      if(this.user.hasStats) {
        output += `\nCtrl + Click to view stats profile`
      }
      return output
    }
  }
}
</script>
