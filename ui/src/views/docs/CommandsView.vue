<template>
<div class="container">
    <CommandsModal v-if="selected" :cmd="selected" :prefix="prefix" @close='showCommand(null)' />
    <div class="columns is-variable is-6">
        <div class="column is-7 content">
            <Field label="" icon-left="search">
              <input v-model="searchQuery" class="input" type="text" placeholder="Search for a command">
            </Field>
            <br>
            <span v-for="(group, id) in filteredGroups" :key="id">
                <h4 class="title is-4 has-text-link has-text-centered">{{group.name}}</h4>
                <p class="has-text-centered is-size-6" v-if="!showLockedCommands && group.list.filter((cmd: any) => cmd.hasPermission).length === 0">
                  You do not have access to any commands in this category
                </p>
                <ul class="is-unstyled">
                    <li v-for="cmd in group.list" :key="cmd.command">
                      <template v-if="cmd.hasPermission || showLockedCommands">
                        <div
                          v-if="!cmd.consoleOnly || commandViewmode == 'console'"
                          :class="{'has-text-grey': !cmd.hasPermission}"
                          :data-tooltip="cmd.hasPermission ? null : 'You do not have access to this command.'"
                          class="has-tooltip-danger has-tooltip-top is-clickable box-hover"
                          @click="showCommand(cmd)"
                          >
                            <component
                              :is="cmd.hasPermission ? 'b' : 'p'"
                            >
                              <component
                                :is="(cmd.hasPermission && cmd.examples && cmd.examples.length > 0) ? 'a' : 'span'"
                                class="is-size-5 has-tooltip-success"
                                :data-tooltip="cmd.examples && cmd.examples.length > 0 ? 'Click to view examples' : null"
                              >
                              <Icon v-if="!cmd.hasPermission" icon="fa-lock" size="xs" container-class="has-tooltip-right has-tooltip-danger" button data-tooltip="You lack the permission for this command">
                              </Icon>
                              <template v-if="!cmd.hidePrefix">{{prefix}}</template>{{cmd.name}}
                              </component>&nbsp;
                              <span v-html="formatParameters(cmd)" class="is-size-5"></span>
                            </component>
                             - {{formatDescription(cmd)}}
                            <div v-if="cmd.note">
                              <em :class="{'has-text-grey': !cmd.hasPermission}"><span class="tag is-warning"><b>Note</b></span> {{cmd.note}}</em>
                            </div>
                        </div>

                      </template>
                    </li>
                </ul>
                <hr>
            </span>
        </div>
        <div class="column content">
          <div class="box has-background-white-ter">
            <div class="field has-tooltip-left"
              :data-tooltip="isLoggedIn ? 'Show all commands, even if you don\'t have access to them' : 'Login and uncheck to show only commands you have access to'">
              <input class="is-checkradio disabled" id="showlocked" type="checkbox" name="showlocked" value="locked"
                v-model="hideNoPermissionCommands" :disabled="!isLoggedIn">
              <label for="showlocked">Show All Commands</label>
            </div>
          </div>

          <div class="box has-background-info-light">
              <!-- <p>Inputting Commands</p> -->
              <label for="cmdViewmode" class="is-size-5"><b>I want to enter commands via </b></label>
              <div class="select is-info is-small mb-4">
                  <select name="cmdViewmode" id="cmdViewmode"  v-model="commandViewmode">
                      <option value="console">console</option>
                      <option value="private">chat, privately</option>
                      <option value="public">chat, publicly</option>
                  </select>
              </div>
              <p>
                There are three different methods to input commands:
                <ol>
                  <li>From the dev console, usually with the prefix <code>sm_</code></li>
                  <li>In the chat, publicly by using <code>!</code></li>
                  <li>In chat, privately by using <code>/</code> (forward slash) <b class='tag is-dark'>Recommended</b> </li>
                </ol>
              </p>
            </div>
            <div class="box has-background-info-light">
              <h5 class="title is-5">Parameter Info</h5>
              <div class="box">
                <ul>
                  <li>Parameters are separated by spaces. If you want to have spaces for a parameter, surround it with "quotes around
                    the word".</li>
                  <li><b class="tag is-link">&lt;&gt;</b> indictates the argument is <u>required.</u></li>
                  <li><b class="tag is-secondary">[&nbsp;]</b> indictates the argument is <em>optional</em>.</li>
                  <li><b>Do not</b> include the symbols <b class="tag is-link">&lt; &gt;</b> or <b class="tag is-secondary">[ ]</b> as
                    they are just used to indicate if the parameter is required or not.</li>
                </ul>
              </div>
              <p>
                When selecting a player, you only need to put enough of their name that uniquely identifies them. If there is no other player that name starts with 'ja', then you could use that to select 'jackz', if you wanted to select jockey, you could do 'ey'.
              </p>
              <p>
                See <router-link :to="{name: 'docs-targetting'}">Advanced Targetting</router-link> for more information and examples
              </p>
            </div>
            <div class="box has-background-light">
              <h5 class="title is-5">Examples</h5>
              <ol>
                  <li><b class="tag is-link">user</b> means a required user while <b class="tag is-secondary">user</b> means an optional user.</li>
                  <li>I want to kick jackz, the command is <code>{{prefix}}kick &lt;player&gt; [reason]</code>, I don’t need to input a reason so I will just type in: <code>{{prefix}}kick jackz</code></li>
                  <li>I want to kick a troll, and I want to state why. <code>{{ prefix }}kick JimmyTheTroll "goodbye troll"</code></li>
                  <li><p>
                      I want to respawn disgruntled pea, the problem is that he has a space in his name. You can either:
                      <ol type="a">
                        <li>Surround his name with quotes, “Disgruntled pea”</li>
                        <li>Only mention part of his name (disgruntled, or pea):
                          <br><code>/respawn “disgruntled pea”</code> or <code>/respawn disgruntled</code> or even <code>/respawn pea</code>
                        </li>
                      </ol>
                      <br>
                  </p></li>
              </ol>
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { formatParameters, request } from '@/js/util'
import CommandsModal from '@/components/modals/CommandsModal.vue'
import { ref, computed, onMounted } from 'vue'
import { PrivilegedUser } from '../../js/User';
import Field from '@/components/Field.vue'
import { notify } from '@kyvg/vue3-notification';
import { parseParameters } from '../../js/util';
import { useRouter, useRoute } from 'vue-router';

const props = defineProps<{
  privUser: PrivilegedUser
}>()
const isLoggedIn = computed(() => props.privUser != null)

const route = useRoute()
const router = useRouter()

let searchQuery = ref("")
let commandViewmode = ref('private')
let groups = ref<Record<string, any>>({})
let loading = ref(true)
let selected = ref<any>()
let hideNoPermissionCommands = ref<string[]>([])

const prefix = computed(() => {
  if(commandViewmode.value === 'console') return "sm_"
  else if(commandViewmode.value === 'public') return "!"
  else if(commandViewmode.value === 'private') return "/"
  return "<INVALID_MODE>"
})

const filteredGroups = computed(() => {
  if(searchQuery.value != "") {
    let result: Record<string, any> = {}
    const query = searchQuery.value.toLowerCase()
    for(const [key, group] of Object.entries(groups.value)) {
      const items = group.list.filter((command: any) => command.name.toLowerCase().includes(query) ||  command.description.toLowerCase().includes(query))
      if(items.length > 0) {
        result[key] = {
          name: group.name,
          list: items
        }
      }
    }
    return result
  } else {
    return groups.value
  }
})

const showLockedCommands = computed(() => {
  return hideNoPermissionCommands.value.length > 0
})

function showCommand(cmd: any | null) {
  if(cmd) {
    router.replace({
      params: {
        command: cmd.name.toLowerCase()
      }
    })
    selected.value = cmd
  } else {
    router.replace({
      params: {
        command: ""
      }
    })
    selected.value = undefined
  }

}
function getCommand(name: string) {
  const query = name.toLocaleLowerCase()
  for(const [, group] of Object.entries(groups.value)) {
    const item = group.list.find((command: any) => command.name.toLowerCase().includes(query))
    if(item) return item
  }
  return null
}

function formatDescription(command: any) {
  return command.description?.replace(/%prefix%/g, prefix.value)
}

onMounted(async () => {
  loading.value = true
  const response = await request(`/data/commands.json?t=${BUILD_TIMESTAMP}`)
  if(response) {
    const json = await response?.json()

    for(const group in json) {
      const commands = []
      for(let command of json[group].commands) {
        const result = parseParameters(command, "command")
        command.name = result.command
        command.args = result.params
        command.hasPermission = !isLoggedIn.value || (command.perm != undefined ? props.privUser.hasFlag(command.perm) : true)

        delete command.command
        commands.push(command)
      }
      groups.value[group] = {
        name: json[group].name,
        list: commands
      }
    }

    if(route.params.command) {
      const command = getCommand(route.params.command as string)
      console.debug(route.params.command, command)
      if(command) {
        showCommand(command)
      } else {
        console.warn("Could not find command ", command)
      }
    }
  }
  loading.value = false
})

</script>

<style scoped>
ul.is-unstyled {
  list-style: none !important;
  margin: 0;
  padding: 0;
}
.box-hover:hover {
  background-color: hsl(0, 0%, 90%);
  border-radius: 6px;
  box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);
  /* color: hsl(0, 0%, 29%); */
  display: block;
  padding: .25rem;
}
</style>
