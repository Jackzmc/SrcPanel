<template>
  <div class="container is-fullwidth">
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
              <td>{{note.id}}</td>
              <td><a :href="getStatURL(note.steamid)">{{note.user}}</a></td>
              <td><a :href="getStatURL(note.markedBy)">{{note.executor}}</a></td>
              <td>{{note.content}}</td>
              <td>
                <span v-if="note.banned">Banned</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column is-5">
        <h4 class="title is-4 has-text-centered">Admins</h4>
        <p><b>Admin CC Bypass</b> is anti-rush bypass</p>
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>SteamID</th>
              <th>Permissions</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="admin in admins" :key="admin.id">
              <td><a :href="getStatURL(admin.id)">{{admin.id}}</a></td>
              <td>{{admin.perms}}</td>
              <td>{{admin.note}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      notes: [],
      admins: []
    }
  },
  created() {
    this.fetchNotes()
    this.fetchAdmins()
  },
  methods: {
    fetchNotes() {
      fetch('https://jackz.me/l4d2/scripts/notes.php')
        .then(response => response.json())
        .then(notes => {
          this.notes = notes.result
        })
    },
    fetchAdmins() {
      fetch('https://api.lgs.jackz.me/internal/get-admins.php')
        .then(response => response.json())
        .then(json => {
          this.admins = json
        })
    },
    getStatURL(steamid) {
      return `https://stats.jackz.me/user/${steamid}`
    }
  }
}
</script>
