<template>
<div class="container">
  <h2 class="title is-2 has-text-centered">First Time Setup</h2>
  <ul class="steps has-content-centered">
    <li class="steps-segment">
      <a href="#" class="has-text-dark">
        <span class="steps-marker is-info">1</span>
        <div class="steps-content">
          <strong>Servers</strong>
        </div>
      </a>
    </li>
    <li class="steps-segment">
      <span class="steps-marker is-light">2</span>
      <div class="steps-content">
        <strong>Shares</strong>
      </div>
    </li>
    <li class="steps-segment is-active">
      <span class="steps-marker is-dark">3</span>
      <div class="steps-content">
        <strong>Panel Settings</strong>
      </div>
    </li>
    <li class="steps-segment">
      <span class="steps-marker is-black">4</span>
      <div class="steps-content">
        <strong>Done</strong>
      </div>
    </li>
  </ul>
  <br>
  <template v-if="step === 'servers'">
    <h4 class="title is-4">Add Servers</h4>
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>IP</th>
          <th>Port</th>
        </tr>
      </thead>
      <tbody>
        <td>Server 1</td>
        <td>Left 4 Dead 2 <span class="tag is-rounded" data-tooltip="Type was automatically determined"><Icon size="lg" icon="fa-question-circle" icon-class="has-text-info">Auto</Icon></span></td>
        <td>127.0.0.1</td>
        <td>27015</td>
      </tbody>
    </table>
    <!-- Put this in modal -->
    <ModalCard title="Add Server">
      <form>
        <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
          <Tab name="General">
            <Field label="Name" info="ID will be: my-server-name">
              <input class="input" type="text" placeholder="My Server Name" />
            </Field>
            <Field label="IP Address & Port">
              <input class="input" type="text" placeholder="localhost:27015" pattern="([a-zA-Z0-9\.]+)(:\d+)?" />
            </Field>
            <Field label="Type">
              <div class="select">
                <select>
                  <option>Automatic</option>
                  <option>Left 4 Dead 2</option>
                  <option>Generic Source Engine</option>
                  <option>Minecraft</option>
                </select>
              </div>
            </Field>
          </Tab>
          <Tab name="Features">
            <!-- needed:
              1. rcon
              2. Plugin Setup (separate tab?)
              3. config directory
              4. systemd
              5. activity id (combine with plugin setup?)
              6. tags
              7. logs path
            -->
          </Tab>
        </Tabs>
      </form>
      <template v-slot:buttons>
        <button class="button is-success has-text-white">Add Server</button>
        <button class="button">Cancel</button>
      </template>
    </ModalCard>
  </template>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Field from '@/components/Field.vue'
import ModalCard from '@/components/ModalCard.vue';
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
const props = defineProps<{

}>()

let step = ref<"servers" | "shares" | "settings" | "done">("servers")
</script>

<style scoped>
@import "node_modules/bulma-o-steps/bulma-steps.min.css"
</style>
