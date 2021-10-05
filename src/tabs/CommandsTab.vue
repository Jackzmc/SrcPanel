<template>
<div class="container">
    <ExamplesModal :data="selected" :prefix="prefix" @close='selected = null' />
    <div class="columns is-variable is-6">
        <div class="column is-7 content">
            <template v-if="loading">
              <span v-for="i in 20" :key="i" >
                <vue-skeleton-loader :width="700" :height="40" animation="fade" />
                <br>
              </span>
            </template>
            <span v-for="(group, id) in groups" :key="id">
                <h5 class='title is-5'>{{group.name}}</h5>
                <ul class="is-unstyled">
                    <li v-for="cmd in group.list" :key="cmd.command">
                      <dl>
                        <dt><template v-if="!cmd.consoleOnly || commandViewmode == 'console'">
                            <b>
                              <component
                                @click='showExamples(cmd)'
                                :is="cmd.examples && cmd.examples.length > 0 ? 'a' : 'span'"
                                class="is-size-5 has-tooltip-success"
                                :data-tooltip="cmd.examples && cmd.examples.length > 0 ? 'Click to view examples' : null"
                              >
                                {{prefix}}{{cmd.name}}
                              </component>
                              <span v-html="formatParameters(cmd)" class="is-size-5"></span>
                            </b>
                             - {{cmd.description}}
                        </template>
                        </dt>
                        <template v-if="cmd.note">
                          <dd>
                              <em><span class="tag is-warning"><b>Note</b></span> {{cmd.note}}</em>
                          </dd>
                        </template>
                        </dl>
                    </li>
                </ul>
                <hr>
            </span>
        </div>
        <div class="column content">
            <label for="cmdViewmode" class="is-size-4"><b>I want to enter commands via </b></label>
            <div class="select is-info ">
                <select name="cmdViewmode" id="cmdViewmode"  v-model="commandViewmode">
                    <option value="console">Console</option>
                    <option value="private">Chat privately</option>
                    <option value="public">Chat publicly</option>
                </select>
            </div>
            <hr>
            <p>
                There are three (3) ways to input commands:
                <ol>
                    <li>Via console, usually with the prefix <b>sm_</b></li>
                    <li>Via chat publicly by using <b>!</b></li>
                    <li>Via chat privately by using <b>/</b> (forward slash) <b class='tag is-dark'>Recommended</b> </li>
                </ol>
            </p>
            <p>Commands highlighted in <b class="has-text-link">blue</b> have examples, click to view the examples.</p>
            <p>
              <b>Parameter Info</b>
              <ul>
                  <li>Parameters are separated by spaces. Use "quotes to surround a word".
                  <li><b class="tag is-link">&lt;&gt;</b> indictates the argument is <u>required.</u></li>
                  <li><b class="tag is-secondary">[&nbsp;]</b> indictates the argument is optional.</li>
                  <li>Do not include the <b class="tag is-link">&lt; &gt;</b> or <b class="tag is-secondary">[ ]</b> as its an indication</li>
              </ul>
              For player selection purposes, you do not need to input their FULL name, just enough to make it only select a player (‘ja’ for jackz, as a jockey could exist, and it wouldn’t know if you wanted jockey or jackz)
            </p>
            <br>
            <h4 class="title is-4">Examples</h4>
            <ol>
                <li><b class="tag is-link">user</b> means a required user while <b class="tag is-secondary">user</b> means an optional user.</li>
                <li>I want to kick jackz, the command is {{prefix}}kick &lt;player&gt; [reason], I don’t need to input a reason so I will just type in: {{prefix}}kick jackz</li>
                <li><p>
                    I want to respawn disgruntled pea, the problem is that he has a space in his name. You can either:
                    <br>a.	Surround his name with quotes, “Disgruntled pea”
                    <br>b.	Only mention part of his name (disgruntled, or pea)
                    <br>/respawn “disgruntled pea” or /respawn disgruntled or even /respawn disgr
                </p></li>
            </ol>
        </div>
    </div>
</div>
</template>

<script>
import { formatParameters } from '@/js/util'
import ExamplesModal from '@/components/ExamplesModal'

export default {
  components: {
    ExamplesModal
  },
  data() {
      return {
          commandViewmode: 'private',
          groups: {},
          loading: true,
          selected: null
      }
  },
  computed: {
    prefix() {
        if(this.commandViewmode === 'console') return "sm_"
        else if(this.commandViewmode === 'public') return "!"
        else if(this.commandViewmode === 'private') return "/"
        return "<INVALID_MODE>"
    }
  },
  methods: {
    formatParameters,
    showExamples(cmd) {
     this.selected = cmd
    }
  },
  created() {
    fetch('./data/commands.json')
    .then(response => response.json())
    .then(groups => {
      for(const group in groups) {
        const commands = []
        for(let command of groups[group].commands) {
          const split = command.command.trim().split(' ')
          command.name = split.shift()
          command.parameters = split.join(" ")
          delete command.command
          commands.push(command)
        }
        this.$set(this.groups, group, {
            name: groups[group].name,
            list: commands
        })
      }
    })
    .catch(err => {
        console.error('Could not fetch commands, network error.', err)
    })
    .finally(() => this.loading = false)
  }
}
</script>

<style scoped>
ul.is-unstyled {
  list-style: none !important;
  margin: 0;
  padding: 0;
}
</style>
