<template>
<div class="container">
    <div class="columns is-multiline is-variable is-6">
      <div class="column is-9">
          <h4 class="title is-4">How to enable & open the developer console?</h4>
          <ol>
              <li>Go to your options, then keyboard/mouse</li>
              <li>Enable the option 'Allow Developer Console'</li>
              <li>Open the console with the tilda key (<b>`</b> or <b>~</b>, left of '1')</li>
          </ol>
          <hr>
          <Servers @refresh="onServerRefresh" />
            <p class="is-inline is-pulled-right" style="margin-right: 90px">List refreshing in {{countdown}} seconds</p>
            <em>* Server supports custom maps</em><br>
            <em>** Server supports 5+ players</em><br>
            <em>*** Server supports custom maps AND 5+ players</em>
      </div>
      <div class="column">
          <h5 class="title is-5">Server Notes</h5>
          <div class="content">
          <ol>
              <li>Only servers marked as such support 5+ campaign <em>(see bottom left)</em></li>
              <li>Directly connecting does not start matchmaking - no randoms will join! See the below section on how to create a lobby:</li>
          </ol>
          <h5>To create a lobby to a server:</h5>
          <ul>
              <li>Create a normal lobby,<br><b>you need to be the host</b></li>
              <li>Open the console <br><em>(see above for instructions)</em></li>
              <li>Copy the <span class="has-text-info">Create Lobby Command</span> command and paste it in console</li>
              <li>Start the lobby</li>
          </ul>
          </div>
      </div>
    </div>
</div>
</template>

<script>
import Servers from '../components/Servers.vue'

export default {
  components: {
    Servers
  },
  data() {
    return {
      countdown: 0,
      interval: null
    }
  },
  methods: {
    onServerRefresh(mode) {
      if(mode == 'start') {
        this.countdown = "Refreshing..."
      }else{
        this.countdown = 60 * 1;
        this.startCountdown()
      }
    },
    startCountdown() {
      clearInterval(this.interval)
      this.interval = setInterval(() => {
        if(--this.countdown == 0) {
          clearInterval(this.interval)
        }
      }, 1000)
    }
  },
  created() {

  }
}
</script>
