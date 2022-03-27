<template>
    <table class="table is-bordered">
        <thead>
            <tr>
                <th>Name</th>
                <th>Players</th>
                <th>Direct Connect Command</th>
                <th>Create Lobby Command</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="server in servers" :key="server.id">
                <td>
                    <a :href="'steam://connect/lgs.jackz.me:' + server.port">
                      <b
                        :data-tooltip="getServerMessage(server)"
                        :class="getServerClasses(server)"
                      >
                        {{server.name}}
                      </b>
                    </a>
                    <span v-if="server.tags.includes('5+')" class='is-size-5'><b>**</b></span>
                    <span v-if="server.tags.includes('customs')" class='is-size-5'><b>*</b></span>
                </td>
                <td class="has-text-centered">
                  <span
                    v-if="server.status.online"
                  >
                    {{server.status.data.players.length}} / {{server.status.data.maxplayers}}
                  </span>
                </td>
                <td>
                  <p @click='copyCommand' :class="{'has-text-grey': !server.status.online}">
                    connect {{server.domain}}:{{server.port}}
                  </p>
                </td>
                <td>
                  <p @click='copyCommand' :class="{'has-text-grey': !server.status.online}">
                    mm_dedicated_force_servers {{server.ip}}:{{server.port}}
                  </p>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
  data() {
    return {
      servers: [],
      refreshTimer: null
    }
  },
  methods: {
    copyCommand(event) {
      if (document.selection) { // IE
        const range = document.body.createTextRange();
        range.moveToElementText(event.target);
        range.select();
      } else if (window.getSelection) {
        const range = document.createRange();
        range.selectNode(event.target);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
    },
    getServerClasses(server) {
      const classes = ['has-tooltip-arrow', "has-tooltip-right"]

      if(server.status.online) {
        if(server.status.data.players.length == 0) {
          classes.push('has-text-success')
          classes.push('has-tooltip-success')
        } else {
          classes.push('')
          classes.push('has-tooltip-info')
        }
      } else {
        classes.push('has-text-danger')
        classes.push('has-tooltip-danger')
      }

      return classes
    },
    getServerMessage(server) {
      if(server.status.online)
        return server.status.data.players.length  == 0
          ? 'Server is currently online & empty. Click to join'
          : 'Server has players online. Click to join.'
      else return 'Server is offline, unresponsive, or unreachable'
    },
    refreshServers() {
      this.$emit('refresh', 'start')
      fetch('/api/servers')
      .then(response => {
        if(response.ok) return response.json()
        else console.error('Failure getting servers', response)
      })
      .then(json => {
        this.servers = json
      })
      .finally(() => {
        this.$emit('refresh', 'stop')
      })
    }
  },
  created() {
    this.refreshTimer = setInterval(() => {
      this.refreshServers()
    }, 1000 * 60 * 1)
    this.refreshServers()
  },
}
</script>

<style>

#lastUpdate {
  position: fixed;
  top: 0;
  right: 5px;
  color: white;
}

b.warn {
  color: #b79613 !important
}
</style>
