<template>
<div class="container">
    <div class="columns is-variable is-6">
        <div class="column is-7">
          <Field label="" icon-left="search">
              <input v-model="searchQuery" class="input" type="text" placeholder="Search for a cvar">
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
          <div class="box has-background-info-light">
            <h4 class="title is-4 has-text-info"><Icon icon="fa-info-circle">Cvar Overview</Icon></h4>
            <p>
              Convars (cvars for short) are settings on the server that can affect anything such as gameplay or plugin settings and can be changed at any time.
            </p>
            <p>Some convars will reset back to their configured value on the next chapter, and some will only reset when the server restarts.</p>
            <div class="box  has-text-black">
              <p>You can change convars with one of these commands:</p>
              <table class="table">
                <tr>
                  <td>sm_cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>in the dev console</td>
                </tr>
                <tr>
                  <td>!cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>in chat (publicly)</td>
                </tr>
                <tr>
                  <td>/cvar</td>
                  <td><span class='tag is-link'>cvar name</span> <span class='tag'>value</span></td>
                  <td>in chat (privately)</td>
                </tr>
              </table>
              <p>
                If a value is not specified, it will instead show you the current value of the cvar
              </p>
            </div>
            <p>Percentages are represented by decimals, so 100% would be entered as <code>1.0</code>, 50% = <code>0.5</code>, 0% = <code>0</code></p>
            <p><b>Example</b> <code>/cvar l4d2_population_clowns 1.0</code> – This will make it a 100% chance it spawns clown zombies</p>
            <br>
            <p>
              <em>Nerd shit: Cvars can take three types of inputs: floats, integers, and strings. Booleans are represented by 0 or 1 but using the sm_cvar command allows you to input anything, and this can do unknown behavior.
              0.0 or 1.0 is a float but can also be parsed as an integer or a string. Just be careful with the parameters.</em>
            </p>
          </div>

        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { formatParameters, parseParameters, request } from '@/js/util'
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
      const result = parseParameters(cvar, "cvar")
      cvar.name = result.command
      cvar.args = result.params
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
