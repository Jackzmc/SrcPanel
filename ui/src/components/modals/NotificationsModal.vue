<template>
  <Modal active closable>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Notifications</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="list has-visible-pointer-controls">
          <ListItem v-for="notification in privUser.notifications" :key="notification.timestamp">
            <template #title>
              <Icon v-if="notification.level === NotificationLevel.Info" icon="fa-info-circle" icon-class="has-text-info" />
              <Icon v-else-if="notification.level === NotificationLevel.Error" icon="fa-exclamation-triangle" icon-class="has-text-danger" />
              <Icon v-else-if="notification.level === NotificationLevel.Warning" icon="fa-exclamation-triangle" icon-class="has-text-warning" />
              <Icon v-else-if="notification.level === NotificationLevel.Success" icon="fa-check-circle" icon-class="has-text-success" />
              <a v-if="notification.link" :href="notification.link">{{ formatDate(notification.timestamp) }}</a>
              <span v-else>{{ formatDate(notification.timestamp) }}</span>
            </template>
            <template #description>
              {{ notification.message }}
            </template>
          </ListItem>
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
import ListItem from "../ListItem.vue";
import { formatDate } from "@/js/util.js";
import { NotificationLevel } from "../../../../common-types/User.js";

const emit = defineEmits(["close"]);

const props = defineProps<{
  privUser: PrivilegedUser;
}>();

async function close() {
  emit("close");
}
</script>
