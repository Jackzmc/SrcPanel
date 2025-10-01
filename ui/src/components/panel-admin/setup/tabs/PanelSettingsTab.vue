<template>
  <div class="container box">
    <Field label="Domain">
      <input v-model="config.domain" type="text" class="input" />
    </Field>
  </div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
import { onMounted, ref } from 'vue';

let config = ref<{
  domain: string
}>({
  domain: ""
})

onMounted(() => {
  config.value.domain = window.location.host
})
</script>
