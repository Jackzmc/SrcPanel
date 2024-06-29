<template>
<ul v-if="node.children.length > 0">
    <SectionNode v-for="child in props.node.children" :key="child.key" :node="child" />
</ul>
</template>

<script setup lang="ts">

import SectionNode from '@/components/sections/SectionNode.vue'
import { TreeNode } from '@/js/Tree.js';

const props = defineProps<{
  node: TreeNode
}>()

</script>

