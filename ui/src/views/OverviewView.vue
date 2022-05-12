<template>
<div class="container">
    <div class="columns is-multiline is-variable is-6">
      <div class="column is-8">
          <Servers @refresh="onServerRefresh" />
          <p class="is-inline is-pulled-right" style="margin-right: 90px">List refreshing in {{countdown}} seconds</p>
      </div>
      <div class="column">
          <div class="content">
            <h6>How to enable & open the developer console?</h6>
            <ol>
                <li>Go to your options, then keyboard/mouse</li>
                <li>Enable the option 'Allow Developer Console'</li>
                <li>Open the console with the tilda key (<b>`</b> or <b>~</b>, left of '1')</li>
            </ol>
            <h5>Server Notes</h5>
            <ol>
                <li>Only servers marked as such support 5+ campaign <em>(see bottom left)</em></li>
                <li>The public servers will automatically scale, so that only one server is empty (upto 7 active)</li>
                <li>Directly connecting does not start matchmaking - no randoms will join! See the below section on how to create a lobby:</li>
            </ol>
            <h5>To create a lobby to a server:</h5>
            <ul>
                <li>Create a normal lobby, <b>you need to be the host</b></li>
                <li>Open the console <em>(see above for instructions)</em></li>
                <li>Copy the <b>Create Lobby Command</b> to the console</li>
                <li>Start the lobby</li>
            </ul>
            <h5>Joining a 5+ server when its full</h5>
            <p>
              If people are playing on a 5+ compatible server and there is already 4 players, you can join still!
              Use the 'connect ...' command on the left for the server to join, exactly as it is shown
            </p>
            <p>If you get kicked because it's full, wait a few seconds for people to finish joining, or you maybe be trying to join a non 5+ server.</p>
          </div>
      </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Servers from '../components/Servers.vue'

let countdown = ref<string|number>(0)
let interval = ref<number>()

function onServerRefresh(mode: string) {
  if(mode == 'start') {
    countdown.value = "Refreshing..."
  }else{
    countdown.value = 60 * 1;
    startCountdown()
  }
}
function startCountdown() {
  clearInterval(interval.value)
  interval.value = setInterval(() => {
    if(--(countdown.value as number) == 0) {
      clearInterval(interval.value)
    }
  }, 1000)
}
</script>
