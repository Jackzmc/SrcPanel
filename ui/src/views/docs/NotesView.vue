<template>
  <div class="container content" style="width:50%">
    <h4 class="title is-4 mb-2">About</h4>
    <p>
      Admins may leave small notes on a player, which all admins will see when said player connects. This is a useful feature to tell other admins when a good player, a questionable player, or just bad player joins.
    </p>
    <h5 class="title is-5 mb-2">Usage</h5>
    There are two ways to add a note for a player:
    <ul>
      <li><b class="has-text-info">Still connected: </b><code>/note &lt;player name&gt; "note in quotes"</code></li>
        <ol>
          <li><b>Tip:</b> You don't need to enter their full name, just enough characters to uniquely target them.</li>
          <li><b>Tip:</b> You can put the player's name in spaces as well, ex: "disgruntled pea"</li>
        </ol>
      <li><b class="has-text-info">Disconnected: </b> <code>/notedisconnected</code>, select the player's name, and then enter the note in chat.</li>
    </ul>
    <hr>
    <h4 class="title is-4 mb-2" id="actions">Note Actions</h4>
    <p>
      A new feature that's been added is the ability to add automatic actions that will apply when the player joins. This can do things such as automatically muting the player from voice, or trolling them.
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
        <template v-if="action.key">.<b class="has-text-info">{{action.key}}</b>
          <template v-if="action.value">.<b class="has-text-success">{{action.value}}</b>
          </template>
        </template> - <span v-html="action.description" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount } from 'vue'

const LAST_UPDATED = new Date(Number(process.env.VUE_APP_BUILD_DATE))

let actions = ref<Record<string,any>>([])

function parseActions(actionsList: Record<string, any>) {
  for(const [id, description] of Object.entries(actionsList)) {
    let [action, key, value] = id.split(".")
    const data = {
      id,
      description,
      action: action.slice(1),
      key,
      value
    }
    actions.value.push(data)
  }
}

onBeforeMount(() => {
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
