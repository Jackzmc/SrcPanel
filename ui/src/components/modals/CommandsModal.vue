<template>
<Modal :active="active" v-if="cmd" :closable="true" @close="emit('close')">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title"><b>{{prefix}}{{cmd.name}}</b> Command</p>

      <button class="delete" aria-label="close" @click='close'></button>
    </header>
    <section class="modal-card-body">
      <div class="field is-grouped is-grouped-multiline">
        <div class="control">
          <div class="tags has-addons">
            <span class="tag is-dark">Required Permission</span>
            <span class="tag">{{ cmd.perm ?? 'None' }}</span>
          </div>
        </div>
        <div class="control">
          <div class="tags has-addons">
            <span class="tag is-dark">Has Permission</span>
            <span class="tag is-success" v-if="cmd.hasPermission">Yes</span>
            <span class="tag is-danger" v-else>No</span>
          </div>
        </div>
      </div>
      <br>
      <div class="block">
        <h5 class="title is-5"><Icon icon="fa-circle-question">Description</Icon></h5>
        <p>{{ cmd.description }}</p>
        <div v-if="cmd.note">
          <em :class="{'has-text-grey': !cmd.hasPermission}"><span class="tag is-warning"><b>Note</b></span> {{cmd.note}}</em>
        </div>
      </div>
      <br>
      <div class="block">
        <h5 class="title is-5 mb-2"><Icon icon="fa-bars-staggered">Arguments</Icon></h5>
        <table class="table is-fullwidth" v-if="Object.keys(props.cmd.args).length > 0">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Allowed Values</th>
              <th v-if="anyDefaults">Default Value</th>
            </tr>
            <tr v-for="(data, param) of props.cmd.args" :key="param">
              <td><span :class="['tag',{'is-link': data.required, 'is-secondary': !data.required}]">{{ param }}</span></td>
              <td v-if="data.allowedValues">{{ data.allowedValues.join(", ")}}</td>
              <td v-else>{{ data.type }}</td>
              <td v-if="anyDefaults">{{ data.defaultValue }}</td>
            </tr>
          </thead>
        </table>
        <p v-else class="ml-5">Command has no arguments</p>
      </div>
      <template v-if="cmd.examples?.length > 0">
        <div class="content">
          <h5>Examples</h5>
          <ol>
            <li v-for="(example, i) in cmd.examples" :key="i" v-html="format(example)">
            </li>
          </ol>
        </div>
      </template>
    </section>
    <footer class="modal-card-foot">
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['close'])

const props = defineProps<{
  cmd: {
    hasPermission: boolean,
    note?: string,
    args: any,
    name: string,
    description?: string
    type: string,
    examples: string[],
    perm?: string
  },
  prefix: string
}>()


const active = computed(() => {
  return (props.cmd && props.cmd.name !== null && props.cmd.name !== undefined) as boolean
})
const anyDefaults = computed(() => {
  return Object.values(props.cmd.args).some((arg: any) => arg.defaultValue !== undefined)
})

function format(input: string) {
  return input
    .replace(/%cmd%/, props.prefix + props.cmd?.name)
    .replace(/%name%/, props.cmd?.name)
    .replace(/%prefix%/, props.prefix!)
}
function close() {
  emit('close')
}
</script>
