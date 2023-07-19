<template>
<div class="container">
    <div class="columns is-variable is-6">
        <div class="column is-7">
          <Field label="Search" icon-left="search">
              <input v-model="searchQuery" class="input" style="width:50%" type="text" placeholder="Search for a cvar">
            </Field>
          <ul>
            <li v-for="cvar in filteredCvars" :key="cvar.cvar">
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
              Convars are settings on the server that can affect anything such as gameplay or plugin settings and can be changed at any time.
            </p>
            <p class="has-text-info">
              You can change convars with one of these commands:<br>
              <table class="table">
                <tr>
                  <td>sm_cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>from console</td>
                </tr>
                <tr>
                  <td>!cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>publicly in chat</td>
                </tr>
                <tr>
                  <td>/cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>privately in chat</td>
                </tr>
              </table>
            </p>
	          <p>
              If value is not specified, it will instead show you the value of the cvar
            </p>
            <hr>
            <p>Percentages are represented by decimals, so 100% = 1.0, 50% = 0.5, 0% = 0.0</p>
            <p><b>Example</b> <code>/cvar l4d2_population_clowns 1.0</code> – This will make it a 100% chance it spawns clown zombies</p>
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
import { ref, onMounted, computed } from 'vue'
import { formatParameters, request } from '@/js/util'
import Field from '@/components/Field.vue'
import { notify } from '@kyvg/vue3-notification';

let cvars = ref<any[]>([])
let selected = ref<any>()
let searchQuery = ref("")

function getParameters(cvar: string) {
  return cvar.split(' ').slice(1).join("")
}

function showExamples(cvar: any) {
  selected.value = cvar
}

const filteredCvars = computed(() => {
  let filtered = cvars.value
  if(searchQuery.value != "") {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(cvar => cvar.name.toLowerCase().includes(query) || cvar.description.toLowerCase().includes(query))
  }
  return filtered
})

onMounted(async () => {
  try {
    const response = await request(`../data/cvars.json?t=${BUILD_TIMESTAMP}`)
    if(!response?.ok) return
    const json = await response.json()
    for(let cvar of json) {
      const split = cvar.cvar.trim().split(' ')
      cvar.name = split.shift()
      cvar.parameters = split.join(" ")
      cvar.defaultValue = cvar.default
      if(cvar.default !== null && cvar.default !== undefined) {
        if(typeof(cvar.default) === "string") {
          cvar.defaultValue = `"${cvar.default}"`
        } else
          cvar.defaultValue = cvar.default
      }
      delete cvar.default
      cvars.value.push(cvar)
    }
  } catch(err: any) {
    notify({
      type: "error",
      text: err.message
    })
    console.error('Could not fetch commands, network error.', err)
  }
})
</script>
