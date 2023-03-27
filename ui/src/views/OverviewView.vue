<template>
<div class="container is-fullwidth">
    <div class="columns is-multiline is-variable is-1">
      <div class="column is-9">
          <Servers @refresh="onServerRefresh" />
          <p class="is-inline is-pulled-right" style="margin-right: 90px">
            <em v-if="countdownText">{{countdownText}}</em>
            <Icon icon="spinner" v-else spin />
          </p>
      </div>
      <div class="column">
          <div class="content">
            <h6>How to enable & open the developer console?</h6>
            <ol>
                <li>Go to your options, then keyboard/mouse</li>
                <li>Enable the option 'Allow Developer Console'</li>
                <li>Open the console with the tilda key (<code>`</code> or <code>~</code>, left of the <code>1</code>)</li>
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
              If there is 4 people on a 5+ server, you can still join:
              Use the <code>connect <b>ip_address</b></code> command shown on the server entries to join
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

let countdown = ref<number>(0)
let interval = ref<ReturnType<typeof setInterval>>()

let countdownText = ref()

function onServerRefresh(payload: { state: string, interval?: number }) {
  if(payload.state == 'start') {
    countdownText.value = undefined
    countdown.value = 0
  } else {
    countdown.value = (payload.interval ?? 60) / 1000
    startCountdown()
  }
}
function startCountdown() {
  clearInterval(interval.value as unknown as number)
  interval.value = setInterval(() => {
    if(--(countdown.value) <= 0) {
      clearInterval(interval.value as unknown as number)
      countdown.value = 0
    }
    countdownText.value = `refreshing in ${countdown.value} seconds`
  }, 1000)
}
</script>
