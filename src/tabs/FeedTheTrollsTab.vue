<template>
<div class="container">
    <h3 class='title is-3'>Feed The Trolls</h3>
    <p class="subtitle is-5">You can apply trolls on any amount of players to punish or mess with them.
      <br>See the commands section <b>Troll Commands</b> for commands.
      <br>Use the <b>fta</b> command to apply one of these trolls:
      <br>
    </p>
    <div class="message is-warning is-small">
      <div class="message-body">
        The number index of the troll, for current version will no longer work. But none of y'all use it anyway, so why do I even bother putting this here. I don't know, but hey incase I have a case of brain damage I might see this and remember this.
      </div>
    </div>
    <div class="is-size-5">
        <h3 class="title is-3">Troll Modes</h3>
        <ul>
            <li v-for="(troll, i) in trolls" :key="troll.name" >
                <p><b class="has-text-link" :data-tooltip="troll.modes.join(', ')">{{i+1}}. {{troll.name}}</b> - {{troll.description}}</p>
                <div class="content"  v-if="troll.subnotes" >
                    <ol class="is-lower-alpha">
                        <li v-for="note in troll.subnotes" :key="note">
                            {{note}}
                        </li>
                    </ol>
                </div>
            </li>
        </ul>
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
        trolls: []
    }
  },
  computed: {

  },
  methods: {

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
