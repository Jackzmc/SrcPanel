<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-menu">
      <div class="navbar-end">
        <div class="navbar-item has-dropdown is-hoverable " >
          <a class="navbar-link">
            <img :src="avatarurl" />
            {{userdata.user.name}}
          </a>
          <div class="navbar-dropdown is-right">
            <div class="navbar-item">
              {{userdata.user.steamid}}
            </div>
            <hr class="navbar-divider">
            <a class="navbar-item has-text-danger">
              Logout
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  props: ['userdata'],
  computed: {
    avatarurl() {
      return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/${this.userdata.user.avatarhash}.jpg`
    }
  }
}
</script>
