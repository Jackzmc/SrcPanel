<template>
<JsonEditorVue v-model="json" boxed>

</JsonEditorVue>
</template>

<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue'
import { ref } from 'vue'

let json = ref({ share: true })
</script>
