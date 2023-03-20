<template>
<div class="field">
    <label class="label" v-if="label">{{ label }}</label>
    <div class="control">
        <slot />
    </div>
</div>
</template>

<script setup lang="ts">
const props = defineProps<{
    label?: string
}>()
</script>