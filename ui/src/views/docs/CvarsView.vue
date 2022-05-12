<template>
<div class="container">
    <div class="columns is-variable is-6">
        <div class="column is-7">
            <ul>
              <li v-for="cvar in cvars" :key="cvar.cvar">
                <b class="is-size-5">
                  <component
                    @click='showExamples(cvar)'
                    :is="cvar.examples && cvar.examples.length > 0 ? 'a' : 'span'"
                    class="is-size-5 has-tooltip-success"
                    :data-tooltip="cvar.examples && cvar.examples.length > 0 ? 'Click to view examples' : null"
                  >
                    {{cvar.name}}
                  </component>&nbsp;
                  <span v-html="formatParameters(cvar)" />
                </b>
                 - {{cvar.description}}
              </li>
            </ul>
        </div>
        <div class="column content">
            <p>
              Convars are settings on the server that can affect anything and can be changed at any time.
            </p>
            <p class="has-text-info">
              You can change convars with the command:<br>
              <b>sm_cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
              <br>
              <b>/cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
              <br>
              <b>!cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
            </p>
	          <p>
              If value is not specified, it will instead show you the value of the cvar
            </p>
            <p><b>Example</b> /cvar l4d2_population_clowns 1.0 – This will make it a 100% chance it spawns clown zombies</p>
            <br>
            <p>
              <em>Nerd shit: Cvars can take three types of inputs: floats, integers, and strings. Booleans are represented by 0 or 1 but using the sm_cvar command allows you to input anything, and this can do unknown behavior.
              0.0 or 1.0 is a float but can also be parsed as an integer or a string. Just be careful with the parameters.</em>
            </p>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { formatParameters } from '@/js/util'

const LAST_UPDATED = inject('LAST_UPDATED')

let cvars = ref<any[]>([])
let selected = ref<any>()

function getParameters(cvar: string) {
  return cvar.split(' ').slice(1).join("")
}

function showExamples(cvar: any) {
  selected.value = cvar
}

onMounted(() => {
  fetch(`../data/cvars.json?t=${LAST_UPDATED}`)
  .then(response => response.json())
  .then(json => {
    for(let cvar of json) {
      const split = cvar.cvar.trim().split(' ')
      cvar.name = split.shift()
      cvar.parameters = split.join(" ")
      cvars.value.push(cvar)
    }
  })
  .catch(err => {
      console.error('Could not fetch commands, network error.', err)
  })
})
</script>
