<template>
  <Modal active closable>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Notifications</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="notification" v-for="notification in privUser.notifications" :key="notification.timestamp">
          {{ notification.message }}
        </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" aria-label="close" @click="close">Clear</button>
      </footer>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from "@/components/Modal.vue";
import { PrivilegedUser } from "@/js/User";

const emit = defineEmits(["close"]);

const props = defineProps<{
  privUser: PrivilegedUser;
}>();

async function close() {
  emit("close");
}
</script>
