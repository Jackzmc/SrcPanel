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

<style src="../../../node_modules/bulma-list/css/bulma-list.css"></style>


<script setup lang="ts">
import Modal from "@/components/Modal.vue";
import { PrivilegedUser } from "@/js/User";
import { formatDate, getRelDate, request, sleep } from "@/js/util";
import { ref, watch, computed, onBeforeMount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ClientUserData, OauthProvider, SessionData } from '../../../../common-types/User';

const emit = defineEmits(["close"]);

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  privUser: PrivilegedUser;
}>();

async function close() {
  emit("close");
}

onBeforeMount(() => {
});
</script>
