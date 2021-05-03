<template>
  <div class="container">
    <table class="table is-fullwidth" v-if="!loading&&!error">
      <thead>
        <th>Player Name</th>
        <th>SteamID</th>
        <th>Executor</th>
        <th>Reason</th>
        <th>Date</th>
      </thead>
      <tbody>
        <tr v-for="ban in bans" :key="ban.steamid">
          <td>
            <p v-if="ban.last_alias">{{ban.last_alias}}</p>
            <em v-else class="is-size-7">No profile found</em>
          </td>
          <td>{{ban.steamid}}</td>
          <td>{{ban.executor}}</td>
          <td>{{ban.reason}}</td>
          <td>{{ban.timestamp}}</td>
        </tr>
      </tbody>
    </table>
    <p class="has-text-centered has-text-danger title is-3" v-else-if="error">{{error}}</p>
    <p class="has-text-centered title is-2" v-else>Loading</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      error: null,
      bans: []
    }
  },
  computed: {

  },
  methods: {

  },
  created() {
    fetch('https://jackz.me/l4d2/scripts/bans.php')
    .then(response => {
      if(response.ok)
        return response.json()
      else
        this.error = response.statusText
    })
    .then(bans => {
      this.bans = bans
    })
    .catch(err => {
        console.error('Could not fetch bans, network error.', err)
    })
    .finally(() => this.loading = false)
  }
}
</script>
