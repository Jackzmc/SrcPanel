<template>
  <div class="container is-fullwidth is-fluid">
    <div class="columns">
      <div class="column">
        <h4 class="title is-4 has-text-centered">Notes</h4>
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Added By</th>
              <th>Note</th>
              <th>Banned</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="note in notes" :key="note.id">
              <td>
                {{note.id}}
              </td>
              <td><a :href="getStatURL(note.client.id)">{{note.client.name}}</a></td>
              <td><a :href="getStatURL(note.markedBy.id)">{{note.markedBy.name}}</a></td>
              <td>{{note.content}}</td>
              <td>
                <span v-if="note.banned">Banned</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column is-3">
        <template v-if="userdata">
          <h4 class="title is-4 has-text-centered">Admins</h4>
          <p><b>Admin CC Bypass</b> is anti-rush bypass</p>
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th>SteamID</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="admin in admins" :key="admin.id">
                <td><a :href="getStatURL(admin.steamid)">{{admin.steamid}}</a></td>
                <td>{{admin.name || admin.comment}}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <p v-else class="has-text-centered"><br><br>Login to view the admins</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['userdata'],
  data() {
    return {
      notes: [],
      admins: []
    }
  },
  created() {
    this.fetchNotes()
  },
  mounted() {
    if(this.userdata) {
      this.fetchAdmins()
    }
  },
  methods: {
    fetchNotes() {
      fetch('/api/notes')
        .then(response => response.json())
        .then(result => {
          this.notes = result.notes
        })
    },
    fetchAdmins() {
      fetch('/api/admins')
        .then(response => response.json())
        .then(json => {
          this.admins = json.admins
        })
    },
    getStatURL(steamid) {
      return `https://stats.jackz.me/user/${steamid}`
    }
  }
}
</script>
