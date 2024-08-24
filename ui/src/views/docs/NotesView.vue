<template>
  <div class="container content">
    <h4 class="title is-4 mb-2">About</h4>
    <p>
      Admins may leave small notes on a player, which all admins will see when said player connects. This is a useful feature to let other admins what to expect when people join such as trolls, newer players, friends, or good players.
    </p>
    <h5 class="title is-5 mb-2">Usage</h5>
    There are two ways to add a note for a player:
    <ul>
      <li><b class="has-text-info">Still connected: </b><code>/note player_name "your note in quotes"</code></li>
        <ol>
          <li><b>Tip:</b> You don't need to enter their full name, just enough characters to uniquely target them.</li>
          <li><b>Tip:</b> You can put the player's name in spaces as well, ex: "disgruntled pea"</li>
        </ol>
      <li><b class="has-text-info">Disconnected: </b> <code>/notedisconnected</code>, select the player's name, and then send a chat message to create the note message.</li>
    </ul>
    <hr>
    <h4 class="title is-4 mb-2" id="actions">Note Actions</h4>
    <p>
      A new feature that's been added is the ability to add automatic actions that will apply when the player joins. This can do things such as automatically muting the player (from voice chat or vocalizing), trolling them, or disabling automatic systems (auto reverse ff, teamkiller detection).
    </p>
    <p>
      These actions must be the only content in the note, and must take the form of <code>@action.key.value</code>.<br>The key and value fields are completely optional, but the <b>action field is required</b>.
    </p>
    <b>
      The following actions exist:
    </b>
    <ul>
      <li v-for="action in actions" :key="action.id">
        @<b>{{action.action}}</b>
        <template v-if="action.key">.<b :class="{'has-text-info': action.keyIsVar}">{{action.key}}</b>
          <template v-if="action.value">.<b :class="{'has-text-success': action.valueIsVar}">{{action.value}}</b>
          </template>
        </template> - <span v-html="action.description" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue';

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))

let actions = ref<Record<string,any>>([])

function parseActions(actionsList: Record<string, any>) {
  for(const [id, description] of Object.entries(actionsList)) {
    let [action, key, value] = id.split(".")
    // Determine if the documented key or value is a variable (multiple user inputs, store.<store name>) or a fixed point (store.store_a)
    let keyIsVar = false, valueIsVar = false
    if(key && key.startsWith("$")) {
      key = key.slice(1)
      keyIsVar = true
    }
    if(value && value.startsWith("$")) {
      value = value.slice(1)
      valueIsVar = true
    }
    const data = {
      id,
      description,
      action: action.slice(1),
      key,
      value,
      keyIsVar,
      valueIsVar
    }
    actions.value.push(data)
  }
}

onMounted(() => {
    fetch(`../data/notes.json?t=${LAST_UPDATED}`)
    .then(response => response.json())
    .then(json => {
      parseActions(json.actions)
    })
    .catch(err => {
        console.error('Could not fetch notes data, network error.', err)
    })

})
</script>

<style scoped>
.container {
  width: 50%;
}
@media screen and (max-width: 640px) {
  .container {
    width: 100%;
  }
}
</style>
