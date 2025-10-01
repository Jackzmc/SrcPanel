<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column">
      <div class="notification is-warning" v-if="meta && !meta.steamAvailable">
        <button class="delete"></button>
        Steam servers are currently offline, most likely due to weekly scheduled maintenance. You won't be able to join servers until they come back online. <a href="https://steamstat.us/">Check the status live at steamstat.us</a>
      </div>
      <div v-if="noticeText" :class="['notification', meta?.settings.notice?.class]">
        <button class="delete"></button>
        <!-- eslint-disable-next-line vue/no-v-html -- pulled from /api/meta -->
        <span v-html="noticeText" />
      </div>
      <div class="is-pulled-right mt-2" style="margin-right: 10px">
        <em v-if="countdownText">{{ countdownText }}</em>
        <Icon icon="spinner" v-else spin />
      </div>
      <Servers :priv-user="privUser" @refresh="onServerRefresh" />
    </div>
    <div class="column is-3">
      <div class="content has-text-black">
        <div class="box has-background-info-light">
          <h6>Enabling & opening the dev console:</h6>
          <ol>
              <li>Go to <b>Options</b> then <b>Keyboard/Mouse</b></li>
              <li>Enable the option <b>Allow Developer Console</b></li>
              <li>Open the console with the tilda key (<kbd>`</kbd>/<kbd>~</kbd>, under <kbd>ESC</kbd>)</li>
          </ol>
        </div>
        <div class="box has-background-info-light">
          <h6>Server notes:</h6>
          <ol>
              <li>Only servers marked <span class="tag">5+</span> support 5+ campaign</li>
              <li>Directly connecting does not start matchmaking - the server will not be public. See the below section on how to create a lobby:</li>
          </ol>
        </div>
        <div class="box has-background-info-light">
          <h6>To create a lobby to a server:</h6>
          <ul>
              <li>Create a normal lobby, <b>you need to be the host</b></li>
              <li>Select <b>Best Available Dedicated</b> (not Official, or Local)</li>
              <li>Open the console <em>(see above for instructions)</em></li>
              <li>Copy <b>Create Lobby Command</b> <em>(on the left)</em> and paste and enter in the console</li>
              <li>Start the lobby when ready</li>
          </ul>
        </div>
        <div class="box has-background-info-light">
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
import { computed, ref } from 'vue'
import Servers from '../components/servers/Servers.vue'
import { PanelMetaInfo } from '../../../common-types/Panel.js';

//@ts-expect-error missing types
import { marked } from 'marked'
import { PrivilegedUser } from '@/js/User.js';

const props = defineProps<{
  meta?: PanelMetaInfo,
  privUser?: PrivilegedUser
}>()

let countdown = ref<number>(0)
let interval = ref<ReturnType<typeof setInterval>>()

let countdownText = ref()

const noticeText = computed(() => {
  if(!props.meta?.settings.notice || !props.meta.settings.notice.enabled || props.meta.settings.notice.text === "") return
  return marked(props.meta.settings.notice.text, { breaks: true })
})

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
    countdownText.value = ` `
  }, 1000)
}
</script>
