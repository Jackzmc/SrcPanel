<template>
  <input
  v-model="content"
  :class="className"
  type="text"
  :placeholder="placeholder"
  @input="onValidate"
  />
</template>

<script>
export default {
  props: {
    placeholder: String,
    value: String
  },
  data() {
    return {
      valid: false,
      content: this.value
    }
  },
  computed: {
    className() {
      return [
        'input',
        {'is-danger': !this.valid }
      ]
    }
  },
  methods: {
    onValidate() {
      this.$emit('input', (this.content, cb => {

      }))
    }
  }
}
</script>
