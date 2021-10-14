<template>
<div class="container">
  <div :class="['modal', {'is-active': modal}]">
    <div class="modal-background" @click="modal = null"></div>
    <div class="modal-content">
      <div class="box">
        <h3 class="title is-3">
          Flags
          <button class="delete is-inline is-pulled-right" aria-label="close" @click="modal = null"></button>
        </h3>
        <hr>
        <div class="content" v-html="modal" />
      </div>
    </div>
    <button class="modal-close is-large" aria-label="close" @click="modal = null"></button>
  </div>
  <h3 class='title is-3'>Feed The Trolls</h3>
  <p class="subtitle is-5">You can apply trolls on any amount of players to punish or mess with them.
    <br>See the commands section <b>Troll Commands</b> for commands.
    <br>Hover over the troll name to view the possible modes and all possible flags
    <br>Use the <b>fta</b> command to apply one of these trolls:
    <br>
  </p>
  <div class="message is-warning is-small">
    <div class="message-body">
      The number index of the troll, for current version will no longer work. But none of y'all use it anyway, so why do I even bother putting this here. I don't know, but hey incase I have a case of brain damage I might see this and remember this.
    </div>
  </div>
  <div class="is-size-5">
      <div v-for="(trolls, category) in trolls" :key="category">
        <h4 class="title is-4">{{category}}</h4>
        <ul>
            <li v-for="(troll, i) in trolls" :key="troll.name" >
                <p>
                  <a
                    class="has-text-link has-tooltip-right has-text-weight-bold"
                    :data-tooltip="getTooltip(troll)"
                    @click="showFlags(troll)"
                  >
                    {{i+1}}. {{troll.name}}
                  </a> - {{troll.description}}
                </p>
                <div class="content"  v-if="troll.subnotes" >
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
  </div>
  <br>
</div>
</template>

<script>
export default {
  data() {
    return {
      trolls: {},
      modal: null
    }
  },
  computed: {

  },
  methods: {
    getTooltip(troll) {
      const modes = troll.modes.map(v => `runs ${v}ly`).join("\n-or-\n")

      const flags = troll.prompts ? `\n\nClick to view flags` : ''
      return `${modes}${flags}`
    },
    showFlags(troll) {
      this.modal = troll.prompts.map((prompt, i) => {
        let text = `<div class='columns'><div class='column'><h5>Prompt ${i+1}</b> `
        if(prompt.multiple)
          text += `(any combination)`
        else
          text += `(single choice)`
        text += `</h5>`

        text += `<ul>
        ${prompt.flags.map(flag => `<li>${flag}</li>`).join("")}
        </ul></div>`
        if(prompt.conditions) {
          text += `<div class='column'><p class='subtitle is-5'>Requires Flags: </p>`
          text += `<ul>
          ${prompt.conditions.map(flag => `<li>${flag}</li>`).join("")}
          </ul></div>`
        }
        text += `</div>`
        return text
      }).join("")
    }
  },
  created() {
    fetch('./data/ftt.json')
    .then(response => response.json())
    .then(trolls => {
      this.trolls = trolls
    })
    .catch(err => {
        console.error('Could not fetch trolls, network error.', err)
    })
  }
}
</script>

<style scoped>
.is-lower-alpha {
  margin-top: 0
}
</style>
