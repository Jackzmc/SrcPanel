<template>
  <div>
    <NavBar />
    <div class="py-6">
      <slot />
    </div>
    <USeparator icon="i-simple-icons-nuxtdotjs" />
    <UFooter>
      <template #default>
        <p class="text-sm text-muted">
          <b>jzPanel</b> v2.0.0. Commit <b>{{ commit }}</b>. Built <b>{{ date }}</b>
        </p>
      </template>
    </UFooter>
  </div>
</template>

<script setup lang="ts">
declare const __BUILD_DATE__: string
declare const __BUILD_COMMIT__: string

const commit = __BUILD_COMMIT__
const date = new Date(__BUILD_DATE__).toLocaleString()
</script>