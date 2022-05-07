<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user"><b>{{user.name}}</b> <span class="is-pulled-right">{{user.steamid}}</span></p>
        <p v-else>Loading...</p>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="user">
        
      </section>
      <footer class="modal-card-foot">
        <button :class="['button','is-success',{'is-loading': loading}]" @click="save">Add Admin</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
    </div>
  </div>
</template>

<script>
import SteamID from 'steamid'
export default {
  name: 'AddBanModal',
  props: ['userdata', 'user'],
    data() {

    },
    methods: {
     cancel() {
      this.$router.back()
    },
  },
}
</script>
