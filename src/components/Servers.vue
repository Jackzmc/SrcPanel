<template>
    <table class="table">
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
                    <a :href="'steam://connect/lgs.jackz.me:' + server.meta.port">
                      <tooltip label="This is title" placement="top-right">
                        <b :class="getServerColor(server)" >{{server.meta.name}}</b>
                      </tooltip>
                    </a>
                    <span v-if='server.id === "Left_4_Dead_2_Improved"' class='is-size-5'><b>**</b></span>
                    <span v-else-if='server.id.startsWith("Left_4_Dead_2_Public")' class='is-size-5'><b>*</b></span>

                </td>
                <td><span v-if="server.status === 'online'">{{server.players.online}} / {{server.players.max}}</span></td>
                <td><p @click='copyCommand'>{{server.meta.connect}}</p></td>
                <td><p @click='copyCommand'>mm_dedicated_force_servers {{$options.SERVER_IP}}:{{server.meta.port}}</p></td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
  SERVER_IP: "45.33.30.87",
  data() {
      return {
        servers: {}
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
    getServerColor(server) {
      if(server.status === 'online') return server.players.online == 0 ? 'has-text-success' : 'has-text-warning'
      else return 'has-text-danger'
    },
    refreshServers() {
      fetch('https://servers.jackz.me/api/gameservers?group=l4d2')
      .then(response => {
        if(response.ok) return response.json()
        else console.error('Failure getting servers', response)
      })
      .then(json => {
          for(const server of json) {
            this.$set(this.servers, server.meta.id, server)
          }
      })
    }
  },
  created() {
    this.refreshServers()
    setInterval(() => {
        this.refreshServers()
    }, 1000 * 60 * 2)
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
