<template>
<Modal :active="active" v-if="cmd" :closable="false">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title"><b>{{prefix}}{{cmd.name}}</b> Command</p>
      <button class="delete" aria-label="close" @click='close'></button>
    </header>
    <section class="modal-card-body">
      <p class="content">
        {{ cmd.description }}
        <div v-if="cmd.note">
          <em :class="{'has-text-grey': !cmd.hasPermission}"><span class="tag is-warning"><b>Note</b></span> {{cmd.note}}</em>
        </div>
      </p>

      <div class="field is-grouped is-grouped-multiline">
        <div class="control">
          <div class="tags has-addons">
            <span class="tag is-dark">Required Permission</span>
            <span class="tag">{{ props.cmd.perm ?? 'None' }}</span>
          </div>
        </div>
      </div>
      <p class="content">
        <h5>Arguments</h5>
        <table class="table" v-if="Object.keys(props.cmd.args).length > 0">
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
      </p>

      <template v-if="cmd.examples?.length > 0">
        <p class="content">
          <h5>Examples</h5>
          <ol>
            <li v-for="(example, i) in cmd.examples" :key="i" v-html="format(example)">
            </li>
          </ol>
        </p>
      </template>
    </section>
    <footer class="modal-card-foot">
      <button class="button is-success" aria-label="close" @click='close'>Close</button>
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()

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
