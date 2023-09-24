<template>
<li :key="props.node.key">
    <a :href="'#' + props.node.key">{{props.node.key}}</a>
    <ul v-if="props.node.children.length > 0">
        <SectionNode v-for="child in props.node.children" :key="child.key" :node="child" />
    </ul>
</li>
</template>

<script setup lang="ts">
import SectionNode from '@/components/sections/SectionNode.vue'
import { TreeNode } from '@/js/Tree.js';

const props = defineProps<{
  node: TreeNode
}>()
</script>

