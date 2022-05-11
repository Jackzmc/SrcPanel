<template>
<Modal :active="active" v-if="data" :closable="false">
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Examples for <b>{{data.name}}</b></p>
      <button class="delete" aria-label="close" @click='close'></button>
    </header>
    <section class="modal-card-body">
      <p class="content">
        <ol>
          <li v-for="(example, i) in data.examples" :key="i" v-html="format(example)">
          </li>
        </ol>
      </p>
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

const props = defineProps({
  data: {
    type: Object
  },
  prefix: String
})


const active = computed(() => {
  return (props.data && props.data.name !== null && props.data.name !== undefined) as boolean
})

function format(input: string) {
  return input
    .replace(/%cmd%/, props.prefix + props.data?.name)
    .replace(/%name%/, props.data?.name)
    .replace(/%prefix%/, props.prefix!)
}
function close() {
  emit('close')
}
</script>
