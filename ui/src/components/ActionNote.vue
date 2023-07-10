<template>
<td>
    <div class="field is-horizontal is-grouped is-grouped-multiline">
        <div class="control">
        <div class="tags has-addons">
            <span class="tag is-dark">Action</span>
            <span :class="secondaryClass">{{format(action[0])}}</span>
        </div>
        </div>
        <div class="control">
        <div class="tags has-addons" v-if="action[1]">
            <span class="tag is-info">Key</span>
            <span :class="secondaryClass">{{format(action[1])}}</span>
        </div>
        </div>
        <div class="control">
        <div class="tags has-addons" v-if="action[2]">
            <span class="tag is-success">Value</span>
            <span :class="secondaryClass">{{format(action[2])}}</span>
        </div>
        </div>
    </div>
</td>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    action: string[],
    secondaryColor?: string
}>()
const secondaryClass = computed(() => {
    if(props.secondaryColor) return 'tag ' +  props.secondaryColor
    return 'tag is-secondary'
})

function format(input: string) {
  return input.replace(/_/g, ' ')
}
</script>
