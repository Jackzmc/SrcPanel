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
    <ShareModal></ShareModal>
  </template>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ShareModal from '@/components/panel-admin/setup/ShareModal.vue';

const props = defineProps<{

}>()

let step = ref<"servers" | "shares" | "settings" | "done">("servers")
</script>

<style scoped>
@import "node_modules/bulma-o-steps/bulma-steps.min.css"
</style>
