<template>
<div class="container">
  <div :class="['modal', {'is-active': modal.content}]">
    <div class="modal-background" @click="modal.content = undefined"></div>
    <div class="modal-content">
      <div class="box">
        <h3 class="title is-3">
          Flags for {{modal.troll}}
          <button class="delete is-inline is-pulled-right" aria-label="close" @click="modal.content = undefined"></button>
        </h3>
        <hr>
        <!-- eslint-disable-next-line vue/no-v-html -- pulled from ftt.json data file -->
        <div class="content" v-html="modal.content" />
      </div>
    </div>
  </div>

  <div class="columns">
    <div class="column is-size-5">
      <h2 class='title is-2'>Feed The Trolls</h2>
      <p class="subtitle is-5">You can apply trolls on any amount of players to punish or mess with them.
        <br>See the commands section <b>Troll Commands</b> for commands.
        <br><b>Hover</b> over the troll name to view the possible modes
        <br><b>Click</b> on any bolded troll to view all the possible flags
        <br>Use the <b>fta</b> command to apply one of these trolls:
        <br>
      </p>
      <div v-for="(list, category) in trollList" :key="category">
        <h4 class="title is-4">{{category}}</h4>
        <ul>
          <li v-for="(troll, i) in list" :key="troll.name">
            <p>
              <component :is="troll.prompts ? 'a' : 'span'"
                :class="['has-text-link','has-tooltip-right',{'has-text-weight-bold': troll.prompts}]"
                :data-tooltip="getTooltip(troll)"
                @click="showFlags(troll)"
              >
                {{i+1}}. {{troll.name}}
              </component> - {{troll.description}}
            </p>
            <div class="content" v-if="troll.subnotes">
              <ol class="is-lower-alpha">
                <li v-for="note in troll.subnotes" :key="note">
                  {{note}}
                </li>
              </ol>
            </div>
          </li>
        </ul>
        <br>
      </div>
    </div>
    <div class="column is-4 has-text-right">
      <h2 class="title is-2">Troll Combos</h2>
      <p class="subtitle">These combos will apply multiple trolls at once for your convienence.</p>
      <p class="subtitle">Use the <b>ftc</b> command to apply these combinations.</p>
      <div v-for="(trolls, combo) in combos" :key="combo">
        <h5 class="title is-5">{{combo}}</h5>
        <ul>
          <li v-for="(trollName) in trolls" :key="trollName">
            <p><a class='has-tooltip-left' :data-tooltip="getComboTooltip(trollName)">{{trollName}}</a></p>
          </li>
        </ul>
        <br>
      </div>
    </div>
  </div>
  <br>
  <div class="content">
    <h3 class="title is-3">Auto Punishment</h3>
    <p>A new feature that is being worked on is auto punishment, which will take the trolls from “feed the trolls” and automatically apply it on conditions.</p>
    <p>Currently the only auto punishment condition is starting a crescendo / panic event from far away from any other player (ahead of group, not behind). You can notice who starts a crescendo event by opening the console, it will show the text:
        <br><b>CRESCENDO STARTED BY &lt;PLAYER&gt;.</b></p>
    <p>The current auto punishment modes (what the punishment is) are:</p>
        Tank Magnet, Special Magnet, and Swarm
    <p>If you want to just one command to punish the user using the auto punishment modes, simply type:
    <b>sm_ftc</b> – Activates auto punishment on the last person to start a crescendo</p>
    <br>
  </div>
  <br>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router'

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))

let trollList = ref<Record<string,any>>({})
let combos = ref<Record<string,any>>({})
let modal = ref<{content?: string, troll?: any}>({})

const MODE_MAP: Record<string, string> = {
  "constant": "Always active",
  "instant": "Runs once"
}

function getTooltip(troll: any) {
  let modes = ''
  if(troll.modes) {
    modes = troll.modes.map((v: any) => MODE_MAP[v] || "???").join("\n-or-\n")
  } else
    console.warn("No modes found for", troll.name)

  const flags = troll.prompts ? `\n\nClick to view flags` : ''
  return `${modes}${flags}`
}

function getComboTooltip(trollName: string) {
  const troll = getTroll(trollName.toLowerCase())
  if(!troll) return undefined
  return `${trollName}\n${troll.description}`
}

function getTroll(trollName: string) {
  for(const combo of Object.values(trollList.value)) {
    for(const troll of combo) {
      if(trollName.startsWith(troll.name.toLowerCase())) {
        return troll
      }
    }
  }
  return null
}

function showFlags(troll: any) {
  if(!troll.prompts) return
  modal.value.troll = troll.name
  modal.value.content = troll.prompts.map((prompt: any, i: number) => {
    let text = `<div class='columns'><div class='column'><h5>Prompt ${i+1}</b> `
    if(prompt.multiple)
      text += `(any combination)`
    else
      text += `(single choice)`
    text += `</h5>`

    text += `<ul>
    ${prompt.flags.map((flag: string) => `<li>${flag}</li>`).join("")}
    </ul></div>`
    if(prompt.conditions) {
      text += `<div class='column'><p class='subtitle is-5'>Requires Flags: </p>`
      text += `<ul>
      ${prompt.conditions.map((flag: string) => `<li>${flag}</li>`).join("")}
      </ul></div>`
    }
    text += `</div>`
    return text
  }).join("")

}

onMounted(() => {
    fetch(`../data/ftt.json?t=${LAST_UPDATED}`)
    .then(response => response.json())
    .then(json => {
      trollList.value = json
      combos.value = json._Combos_
      delete trollList.value._Combos_
    })
    .catch(err => {
        console.error('Could not fetch trolls, network error.', err)
    })

})
</script>

<style scoped>
.is-lower-alpha {
  margin-top: 0
}
</style>
