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

<script>
import Modal from '@/components/Modal'

export default {
  components: {
    Modal
  },
  props: {
    data: {
      type: Object
    },
    prefix: String
  },
  methods: {
    format(input) {
      return input
        .replace(/%cmd%/, this.prefix + this.data.name)
        .replace(/%name%/, this.data.name)
        .replace(/%prefix%/, this.prefix)
    },
    close() {
      this.$emit('close')
    }
  },
  computed: {
    active() {
      return this.data && this.data.name !== null && this.data.name !== undefined
    }
  }
}
</script>
