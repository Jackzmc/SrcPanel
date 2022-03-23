<template>
  <div id="app">
    <NavBar :userdata="userdata" />
    <span id="lastUpdate">
      <p v-if="updating" class="has-text-black has-text-weight-bold">New update available, updating...</p>
      <a v-else-if="updateRegistration" class="has-text-black" @click='reloadPage'>
        <b>New update available.</b><br>Click here if page does not reload.</a>
      <template v-else>
        Last Updated {{$LAST_UPDATED}}
      </template>
    </span>
    <br>
    <section class="hero is-info has-text-centered">
      <div class="hero-body">
        <p class="title" >
          {{ $route.meta.title }}
        </p>
        <p class="subtitle">
          {{ $route.meta.description }}
        </p>
      </div>
    </section>
    <br>
    <router-view :userdata="userdata"></router-view>
  </div>
</template>

<script>
import NavBar from '@/components/NavBar'

export default {
  name: 'App',
  components: { NavBar },
  data() {
    return {
      updateRegistration: null,
      updating: false,
      userdata: null
    }
  },
  methods: {
    reloadPage() {
      if (!this.updateRegistration || !this.updateRegistration.waiting) return
      this.updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    },
    updateAvailable(event) {
      this.updateRegistration = event.detail
      this.reloadPage()
    },
    async getAuth() {
      const response = await fetch(`../api/auth/steam/details`, {
        credentials: 'include'
      })
      if(response.ok) {
        const json = await response.json()
        this.userdata = {
          user: json.user,
          permissions: json.permissions
        }
        console.log('Authorized: Hello', json.user.name)
      }
    }
  },
  async created() {
    document.addEventListener('swUpdated', this.updateAvailable, { once: true })
    document.addEventListener('swUpdating', () => this.updating = true, { once: true })
    await this.getAuth()
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
