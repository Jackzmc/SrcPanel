<template>
<a v-if="route.redirect && route.meta?.nav?.isExternalLink" :href="route.redirect.toString()" class="navbar-item">
  <NavBarLabel :route="route" />
</a>
<router-link v-else :to="{ name: route.name }" class="navbar-item">
  <NavBarLabel :route="route" />
</router-link>
</template>

<script setup lang="ts">
import { RouteRecord, RouteRecordRaw } from 'vue-router';
import NavBarLabel from './NavBarLabel.vue';

const props = defineProps<{
  route: RouteRecordRaw
}>()
</script>
