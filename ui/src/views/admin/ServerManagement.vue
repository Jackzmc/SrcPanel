<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <p :class='message.type' v-if="message" v-html="message.content"></p>

      <table class="table is-fullwidth">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Players</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>
            <tr v-for="server in servers" :key="server.id">
              <td class="is-size-5">
                <a :href="'steam://connect/lgs.jackz.me:' + server.meta.port">
                  <b :data-tooltip="getServerMessage(server)" :class="getServerClasses(server)" >{{server.meta.name}}</b>
                </a>
                <span v-if='server.id === "Left_4_Dead_2_Improved"' class='is-size-5'><b>***</b></span>
                <span v-if='server.id === "Left_4_Dead_2_Extra_Players_Public"' class='is-size-5'><b>**</b></span>
                <span v-else-if='server.id.startsWith("Left_4_Dead_2_Public")' class='is-size-5'><b>*</b></span>
              </td>
              <td><span v-if="server.status === 'online'">{{server.players.online}} / {{server.players.max}}</span></td>
              <td>
                <div class="buttons" v-if="server.meta.host === 'lgs.jackz.me'">
                  <template v-if="server.status === 'online'">
                    <a @click="processAction(server, 'request')" class="button is-dark">Request Restart</a>
                    <a @click="processAction(server, 'restart')" class="button is-warning" v-if="shiftPressed">Force Restart</a>
                  </template>
                  <template v-else-if="server.meta.name.includes('Public')">
                    <a @click="processAction(server, 'start')" v-if="!starting[server.meta.port]" class="button is-success">Start Server</a>
                  </template>
                  <a @click="processAction(server, 'update')" class="button is-info">Update</a>
                </div>
              </td>
            </tr>
          </tbody>
      </table>
      <em>* Server supports custom maps</em><br>
      <em>** Server supports 5+ players</em><br>
      <em>*** Server supports custom maps AND 5+ players</em>
    </div>
    <div class="column">
      <b>Request Restart</b> will restart the server if its empty
      <br>
      <b>Force Restart</b> requires you to hold SHIFT to select, and will force restart even if people are playing
      <br>
      <b>Update</b> will run an update script to update the server. This will take a while, server will not auto restart.
      <p>Updating does not show any progress, just have to wait and hope its updated.</p>
      <b>Start</b> will start the service if the server is currently not running. Check in 1-2 minutes to see if the server goes online.
      <p>Improved and vanilla do not support this, as they are managed differently</p>
    </div>
  </div>
</div>
</template>

<script>
export default {
  data() {
    return {
      servers: {},
      shiftPressed: false,
      message: {
        content: null,
        type: null
      },
      starting: [],
      refreshTimer: null
    }
  },
  methods: {
    sendMessage(type, content) {
      this.message = {
        type: type === "error" ? "has-text-danger" : type === "success" ? "has-text-success" : type,
        content: content
      }
      setTimeout(() => this.message = null, 8000)
    },
    processAction(server, type) {
      if(type === "start") {
        this.$set(this.starting, server.meta.port, true);
        setTimeout(() => {
          this.$set(this.starting, server.meta.port, false);
        }, 1000 * 30)
      }
      fetch(`https://api.lgs.jackz.me/internal/call-rcon.php?method=${type}&port=${server.meta.port}&key=${this.$SCRIPT_KEY}`, {
        headers: {'X-APIKEY': ''}, credentials: 'include'
      })
      .then(async(response) => {
        if(response.ok ) {
          const json = await response.json()
          if(json.error) {
            return this.sendMessage('error', `<b>Server returned error</b><br>${json.error}`)
          }
          if(json.stdout[0].includes("players online")) {
            this.sendMessage('error', 'Cannot restart server: There are players online')
          }else{
           this.sendMessage('success', json.stdout[0])
          }
        }else{
          this.sendMessage('error', `<b>Server returned error</b><br>${response.statusText}`)
        }
      })
      .catch(err => {
        this.sendMessage('error', `${err.message}`)
      })
    },
    getServerClasses(server) {
      const classes = ['has-tooltip-arrow']

      if(server.status === 'online') {
        if(server.players.online == 0) {
          classes.push('has-text-success')
          classes.push('has-tooltip-success')
        } else {
          classes.push('has-tooltip-warning')
        }
      } else {
        classes.push('has-text-danger')
        classes.push('has-tooltip-danger')
      }

      return classes
    },
    getServerMessage(server) {
      if(server.status === 'online') return server.players.online == 0 ? 'Server is currently online & empty. Click to join' : 'Server has players online. Click to join.'
      else return 'Server is offline'
      //
      return
    },
    refreshServers() {
      this.$emit('refresh', 'start')
      fetch('https://servers.jackz.me/api/gameservers?group=l4d2')
      .then(response => {
        if(response.ok) return response.json()
        else console.error('Failure getting servers', response)
      })
      .then(json => {
        for(const server of json.servers) {
          this.$set(this.servers, server.meta.id, server)
        }
      })
      .finally(() => {
        this.$emit('refresh', 'stop')
      })
    }
  },
  activated() {
    this.refreshTimer = setInterval(() => {
      this.refreshServers()
    }, 1000 * 60 * 1)
  },
  deactivated() {
    clearInterval(this.refreshTimer)
  },
  created() {
    this.refreshServers()


    document.onkeydown = (e) => {
      this.shiftPressed = !!e.shiftKey
    }
    document.onkeyup = (e) => {
      this.shiftPressed = !!e.shiftKey
    }
  }
}
</script>
