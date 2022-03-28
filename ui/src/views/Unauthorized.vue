<template>
<div class="container has-text-centered">
  <br><br><br>
  <h1 class="title is-1">Unauthorized</h1>
  <p class="subtitle is-4">You are not able to view this page.</p>
  <p v-if="type == 0">please login with steam (top right) to view</p>
  <p v-if="type == 1">
    You are not a registered administrator
    </p>
</div>
</template>

<script>
export default {
  props: ['userdata'],
  data() {
    return {
      type: 0
    }
  },
  created() {
    const params = new URLSearchParams(window.location.search);
    if(params.has('type')) this.type = Number(params.get('type'))
  }
}
</script>
