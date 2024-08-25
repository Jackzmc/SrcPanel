<template>
  <div class="container content">
    <h4 class="title is-4 mb-2">About</h4>
    <p>
      Admins may leave small notes on a player, which all admins will see when said player connects. This is a useful feature to let other admins what to expect when people join such as trolls, newer players, friends, or good players.
    </p>
    <h5 class="title is-5 mb-2">Usage</h5>
    There are two ways to add a note for a player:
    <ul>
      <li><b class="has-text-info">If still connected: </b><code>/note playername "your note in quotes"</code></li>
        <ol>
          <li><b>Tip:</b> You don't need to enter their full name, just enough characters to uniquely target them.</li>
          <li><b>Tip:</b> You can put the player's name in spaces as well, ex: "disgruntled pea"</li>
        </ol>
      <li><b class="has-text-info">If disconnected: </b> <code>/notedisconnected</code>, opens up a list of previous players. Select the player's name, and then send a chat message to create the note message.</li>
    </ul>
    <hr>
    <h4 class="title is-4 mb-2" id="actions">Note Actions</h4>
    <p>
      Another feature of player notes is the ability to activate automatic actions that occur when the player joins. This can do things such as automatically muting the player (from voice chat or vocalizing), punishing them, or make them immune to automatic systems (auto reverse ff, teamkiller detection).
    </p>
    <p>
      These actions must be the only content in the note, and must take the form of <code>@action.key.value</code>.<br>The action field is required, and the key/value fields may be optional ()
    </p>
    <b>
      The following actions exist:
    </b>
    <ul>
      <li v-for="action in actions" :key="action.id" style="white-space: ">
        @<b>{{action.action}}</b>
        <!-- Showing <required> or [optional] for keys -->
        <!-- This is messy, but don't want whitespace to show up. -->
        <template v-if="action.key">.<b :class="{'has-text-info': action.keyFlags & ActionFlag.IsVariable}"><template v-if="action.keyFlags & (ActionFlag.IsVariable)">{{ action.keyFlags & ActionFlag.IsRequired ? '&lt;' : '[' }}</template>{{action.key}}<template v-if="action.keyFlags & (ActionFlag.IsVariable)">{{ action.keyFlags & ActionFlag.IsRequired ? '&gt;' : ']' }}</template></b>
          <!-- Showing <required> or [optional] for values -->
          <template v-if="action.value">.<b :class="{'has-text-success': action.valueFlags & ActionFlag.IsVariable}"><template v-if="action.valueFlags & (ActionFlag.IsVariable)">{{ action.valueFlags & ActionFlag.IsRequired ? '&lt;' : '[' }}</template>{{action.value}}<template v-if="action.valueFlags & (ActionFlag.IsVariable)">{{ action.valueFlags & ActionFlag.IsRequired ? '&gt;' : ']' }}</template></b>
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

enum ActionFlag {
  IsVariable = 1,
  IsRequired = 2
}

function parseActions(actionsList: Record<string, any>) {
  for(const [id, description] of Object.entries(actionsList)) {
    let [action, key, value] = id.split(".")
    // Determine if the documented key or value is a variable (multiple user inputs, store.<store name>) or a fixed point (store.store_a)
    let keyFlags = 0, valueFlags = 0
    if(key && key.startsWith("$")) {
      key = key.slice(1)
      keyFlags |= ActionFlag.IsVariable
      if(key.startsWith("!")) {
        key = key.slice(1)
        keyFlags |= ActionFlag.IsRequired
      }
    }
    if(value && value.startsWith("$")) {
      value = value.slice(1)
      valueFlags |= ActionFlag.IsVariable
      if(value.startsWith("!")) {
        value = value.slice(1)
        valueFlags |= ActionFlag.IsRequired
      }
    }
    const data = {
      id,
      description,
      action: action.slice(1),
      key,
      value,
      keyFlags,
      valueFlags
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
