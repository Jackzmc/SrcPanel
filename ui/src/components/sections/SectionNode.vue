<template>
<li :key="node.key">
    <a @click='gotoHeader'>{{node.key}}</a>
    <ul v-if="node.children.length > 0">
        <SectionNode v-for="child in node.children" :key="child.key" :node="child" />
    </ul>
</li>
</template>

<script setup lang="ts">
import SectionNode from '@/components/sections/SectionNode.vue'
import { TreeNode } from '@/js/Tree.js';
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits([])
const route = useRoute()
const router = useRouter()
const props = defineProps<{
  node: TreeNode
}>()

function gotoHeader() {
  const element = document.getElementById(props.node.key!)
  if(element) element.scrollIntoView()
  else console.warn(`Element not found: ${props.node.key!}`)
}
</script>

