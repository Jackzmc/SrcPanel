<template>
  <div id="app">
    <NavBar :userdata="userdata" @logout="onLogout" :update-info="updateInfo" />
    <br>
    <br v-if="$route.meta.hideHero">

    <section  v-else class="hero is-info has-text-centered">
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
      updateInfo: {
        registration: null,
        updating: false
      },
      userdata: null
    }
  },
  methods: {
    reloadPage() {
      if (!this.updateInfo.registration || !this.updateInfo.registration.waiting) return
      this.updateInfo.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    },
    updateAvailable(event) {
      this.updateInfo.registration = event.detail
      this.reloadPage()
    },
    async getAuth() {
      const response = await fetch(`/api/auth/profile`, {
        credentials: 'include'
      })
      if(response.ok) {
        const json = await response.json()
        this.userdata = {
          user: json.user,
          permissions: json.permissions
        }
        console.log('Authorized: Hello', json.user.name)
      } else {
        if(this.$route.meta.authRequired && !this.userdata) {
          this.$router.push('/login-required?return=' + this.$route.fullPath)
        }
      }
    },
    onLogout() {
      this.userdata = null
    }
  },
  async created() {
    document.addEventListener('swUpdated', this.updateAvailable, { once: true })
    document.addEventListener('swUpdating', () => this.updateInfo.updating = true, { once: true })
    await this.getAuth()
  }
}
</script>
