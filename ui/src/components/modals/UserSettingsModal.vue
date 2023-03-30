<template>
  <Modal active closable>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">User Settings</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <Tabs inner-wrapper-class="tabs" :options="{ useUrlFragment: false }">
          <Tab name="Sessions">
            <h4 class="title is-4">Active Sessions</h4>
            <table class="table is-table is-striped is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Country</th>
                  <th>IP</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(session, i) in sessions" :key="session.id">
                  <td>{{ session.id.substring(0, 8) }}</td>
                  <td v-if="session.ip !== '127.0.0.1'">
                    {{ formatCountry(session.countryCode) }}
                  </td>
                  <td v-else><em>(dev)</em></td>
                  <td>{{ session.ip }}</td>
                  <td>{{ formatDate(session.lastLogin) }}</td>
                  <td>
                    <b v-if="currentSessionId === session.id">Current Session</b>
                    <button
                      v-else
                      class="button is-danger is-small"
                      @click="revokeSession(session.id, i)"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </Tab>
          <Tab name="Connections">

            <h4 class="title is-4">Connections</h4>
            <div class="list has-visible-pointer-controls">
              <OauthProviderCard provider="Steam" provider-image-src="/img/providers/steam.png" :data="{id: props.privUser.id, username: props.privUser.name}">
                Cannot unlink
              </OauthProviderCard>
              <OauthProviderCard provider="Discord" provider-image-src="/img/providers/discord.svg" v-slot="slotProps" :data="userdata.providers.discord">
                <a v-if="slotProps.data" target="_blank" href="/api/auth/discord/revoke" class="button has-text-white" style="background-color:#5865F2">
                  <Icon icon="fab fa-discord">Unlink Discord Account</Icon>
                </a>
                <a v-else target="_blank" href="/api/auth/discord/link" class="button has-text-white" style="background-color:#5865F2">
                  <Icon icon="fab fa-discord">Link Discord Account</Icon>
                </a>
              </OauthProviderCard>
            </div>
          </Tab>
        </Tabs>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" aria-label="close" @click="close">Close</button>
      </footer>
    </div>
  </Modal>
</template>

<style src="../../../node_modules/bulma-list/css/bulma-list.css"></style>


<script setup lang="ts">
import Modal from "@/components/Modal.vue";
import { PrivilegedUser } from "@/js/User";
import { formatDate, request } from "@/js/util";
import { ref, watch, computed, onBeforeMount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
// @ts-ignore
import { Tab, Tabs } from "vue3-tabs-component";
import { UserPrivileges } from "../../../../common-types/Privileges";
import { UserData, OauthProvider } from '../../../../common-types/User';
import OauthProviderCard from "@/components/OauthProviderCard.vue";

const emit = defineEmits(["close"]);

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  userdata: UserData;
  privUser: PrivilegedUser;
}>();

interface SessionQuery extends UserData {
  id: string;
  countryCode: string;
  ip: string;
  lastLogin: number;
  privileges: UserPrivileges;
}

const intl = new Intl.DisplayNames(["en"], { type: "region" });

let sessions = ref<SessionQuery[]>([]);
let currentSessionId = ref<string>();

async function fetchSessions() {
  const response = await request("/api/auth/sessions");
  if (response?.ok) {
    const json = await response.json();
    currentSessionId.value = json.currentSessionId;
    sessions.value = json.sessions;
  }
}
async function revokeSession(id: string, i: number) {
  const response = await request(
    `/api/auth/sessions/${id}`,
    { method: "DELETE" },
    { title: "Revoking Session" }
  );
  if (response?.status == 204) {
    sessions.value.splice(i, 1);
  }
}
function formatCountry(code: string) {
  return intl.of(code);
}

function close() {
  emit("close");
}

onBeforeMount(() => {
  fetchSessions();
});
</script>
