<template>
 {{ route.params.filename}}
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
