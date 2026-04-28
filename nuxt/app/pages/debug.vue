<template>
    <ul>
        <li>API Internal Url: <b>{{  config.apiInternalUrl }}</b>{{ config.public.apiBase }}</li>
        <li>API Public Url: <b>{{  config.public.apiPublicUrl }}</b>{{ config.public.apiBase }}</li>
        <li>API Public Url for Auth: <b>{{  config.public.apiAuthUrl ?? config.public.apiPublicUrl }}</b>{{ config.public.apiBase }}</li>
    </ul>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
</script>