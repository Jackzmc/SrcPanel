<template>
<div class="container" style="width:50%" v-if="userdata">
  <div class="mb-6" >
    <h4 class="title is-4">Info</h4>
    <p class="subtitle is-6"><b>Immunity Level: </b> {{userdata.permissions.immunityLevel}}</p>
  </div>
  <div class="mb-6" >
    <h4 class="title is-4">Preferences</h4>
  </div>
  <div>
    <h4 class="title is-4">Active Sessions</h4>
    <table class="table is-table is-striped is-hoverable  is-fullwidth">
      <thead>
        <tr>
          <th>Country</th>
          <th>IP</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(session, i) in sessions" :key="session.id">
          <td>{{formatCountry(session.countryCode)}}</td>
          <td>{{session.ip}}</td>
          <td>{{formatTime(session.lastLogin)}}</td>
          <td>
            <button v-if="currentId != session.id"  class="button is-danger" @click="revokeSession(session.id, i)">Revoke</button>
            <b>Current Session</b>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<script>

const intl = new Intl.DisplayNames(['en'], {type: 'region'})

export default {
  props: ['userdata'],
  data() {
    return {
      sessions: [],
      currentId: null
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async fetchSessions() {
      const response = await fetch('/api/auth/sessions')
      if(response.ok) {
        const json = await response.json()
        this.currentId = json.currentSessionId
        this.sessions = json.sessions
      }
    },
    async revokeSession(id, i) {
      const response = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' })
      if(response.status == 204) {
        this.sessions.splice(i, 1)
      } else {
        alert('Failed to revoke session: ' + (await response.json()).message)
      }
    },
    formatTime(s) {
      const d = new Date(s)
      console.log(d, s)
      return d.toLocaleString()
    },
    formatCountry(code) {
      return intl.of(code)
    }
  },
  created() {
    this.fetchSessions()
  }
}
</script>
