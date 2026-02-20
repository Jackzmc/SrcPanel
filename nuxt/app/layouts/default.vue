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
          <b>jzPanel</b> v2.0.0. Commit <b>DEV</b>. Built <b>{{new Date().toLocaleString()}}</b>
        </p>
      </template>
    </UFooter>
  </div>
</template>
