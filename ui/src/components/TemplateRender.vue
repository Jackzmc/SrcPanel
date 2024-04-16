<script setup lang="ts">
import { h, compile } from 'vue'
import UserComponent from '@/components/UserComponent.vue'

const props = defineProps<{
  template: string
}>()
h(compile(props.template))
</script>
