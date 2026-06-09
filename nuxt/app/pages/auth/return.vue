<script setup>
const route = useRoute();
onMounted(() => {
  window.location.href = route.query.return_to || "/";
});
</script>

<template>
  <div class="p-6 text-center">
    <h2 class="text-lg font-bold">
      Login successful
    </h2>
    <h4 class="text-md text-muted">
      Redirecting
    </h4>
  </div>
</template>
