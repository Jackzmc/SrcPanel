<template>
<div class="container is-fluid">
    <div class="columns is-multiline is-variable is-1 is-fullwidth">
      <div class="column">
          <Servers @refresh="onServerRefresh" />
          <p class="is-inline is-pulled-right" style="margin-right: 90px">
            <em v-if="countdownText">{{countdownText}}</em>
            <Icon icon="spinner" v-else spin />
          </p>
      </div>
      <div class="column is-offset-1 is-3">
          <div class="content">
            <div class="box">
              <h6>Enabling & opening the dev console:</h6>
              <ol>
                  <li>Go to <b>Options</b> then <b>Keyboard/Mouse</b></li>
                  <li>Enable the option <b>Allow Developer Console</b></li>
                  <li>Open the console with the tilda key (<code>`</code> or <code>~</code>, under <code>ESC</code>)</li>
              </ol>
            </div>
            <div class="box">
              <h6>Server notes:</h6>
              <ol>
                  <li>Only servers marked <span class="tag">5+</span> support 5+ campaign</li>
                  <li>Directly connecting does not start matchmaking - the server will not be public. See the below section on how to create a lobby:</li>
              </ol>
            </div>
            <div class="box">
              <h6>To create a lobby to a server:</h6>
              <ul>
                  <li>Create a normal lobby, <b>you need to be the host</b></li>
                  <li>Open the console <em>(see above for instructions)</em></li>
                  <li>Copy the <b>Create Lobby Command</b> <em>(on the left)</em> to the console</li>
                  <li>Start the lobby</li>
              </ul>
            </div>
            <div class="box">
              <h6>Joining a 5+ server when its full:</h6>
              <p>
                If there is 4 people on a 5+ server, you can still join:
                Use the <code>connect <b>ip_address</b></code> command shown on the server entries to join
              </p>
              <p>If you get kicked because it's full, wait a few seconds for people to finish joining, or you maybe be trying to join a non 5+ server.</p>
            </div>
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
