<template>
  <Modal active closable>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">User Settings</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <Tabs inner-wrapper-class="tabs" :options="{ useUrlFragment: false }" @changed="onTabChanged">
          <Tab name="Sessions">
            <h4 class="title is-4">
              <a :class="['button','is-info','is-small','is-pulled-right',{'is-loading': loading}]" @click="fetchSessions">
                <Icon icon="sync" button :spin="loading">Refresh</Icon>
              </a>
            </h4>
            <table class="table is-table is-striped is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Location</th>
                  <th>Created</th>
                  <th>Last Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(session, i) in sessions" :key="session.id">
                  <td>{{ session.id.substring(0,4) }}</td>
                  <td>
                    <span v-if="session.ip !== '127.0.0.1'">{{ formatCountry(session.countryCode) }}</span><em v-else>(dev)</em>
                    <br>
                    {{ session.ip }}
                  </td>
                  <td>
                    {{ formatDate(session.loginTime) }}
                    <br>
                    {{ getRelDate(session.loginTime) }}
                  </td>
                  <td>
                    {{ formatDate(session.loginTime, true) }}
                    <br>
                    {{ getRelDate(session.lastActive) }}
                  </td>
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
            <div class="list has-visible-pointer-controls">
              <OauthProviderCard :provider="dummySteamProvider" provider-image-src="/img/providers/steam.png">
                Cannot unlink
              </OauthProviderCard>
              <span class="has-text-centered is-size-4 mt-3" v-if="!providers">Loading...</span>
              <OauthProviderCard v-for="provider in providers" :key="provider.id" :provider="provider" :provider-image-src="'/img/providers/' + provider.id + '.svg'">
                <a v-if="provider.enabled" target="_blank" :href="'/api/auth/' + provider.id + '/revoke'" class="button has-text-white" style="background-color:#5865F2">
                  <Icon icon="fab fa-discord">Unlink {{ provider.name }} Account</Icon>
                </a>
                <a v-else target="_blank" :href="'/api/auth/' + provider.id + '/link'" class="button has-text-white" style="background-color:#5865F2">
                  <Icon icon="fab fa-discord">Link {{ provider.name }} Account</Icon>
                </a>
              </OauthProviderCard>
            </div>
          </Tab>
          <Tab name="Developer">
            <p class="title is-5">API Key</p>
            <p class="subtitle is-6" v-if="api.data">
              <b>Created: </b>{{ formatDate(api.data.created) }}
              <span class="is-pulled-right"><b>Last Active: </b>{{ formatDate(api.data.lastUsed) }}</span>
            </p>
            <template v-if="api.data">
              <input type="text" class="input" readonly v-model="api.data.id">
              <br>
              <a class="is-danger is-small" @click="createApiKey">regenerate</a>
            </template>
            <template v-else>
              <p class="subtitle is-6">You have not created an API Key</p>

              <a :class="['button','is-info',{'is-loading': api.loading }]" @click="createApiKey">Create API Key</a>
            </template>
          </Tab>
        </Tabs>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" aria-label="close" @click="close">Close</button>
      </footer>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from "@/components/Modal.vue";
import { PrivilegedUser } from "@/js/User";
import { formatDate, getRelDate, request, sleep } from "@/js/util";
import { ref, watch, computed, onBeforeMount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
// @ts-ignore
import { Tab, Tabs } from "vue3-tabs-component";
import { SessionData, ProviderConnectionData } from '../../../../common-types/User';
import OauthProviderCard from "@/components/OauthProviderCard.vue";

const emit = defineEmits(["close"]);

const route = useRoute();
const router = useRouter();

const props = defineProps<{
  privUser: PrivilegedUser;
}>();

const intl = new Intl.DisplayNames(["en"], { type: "region" });

let loading = ref(false)
let sessions = ref<SessionData[]>([]);
let providers = ref<ProviderConnectionData[]>()
let api = ref<{data: any, loading: boolean}>({
  data: null,
  loading: false
})
let currentSessionId = ref<string>();

// Steam is not an actual provider, but OauthCard needs this data so we just spoof:
const dummySteamProvider = computed(() => {
  return {
    id: 'steam',
    name: 'Steam',
    enabled: true,
    expired: false,
    data: { id: props.privUser.id, username: props.privUser.name }
  } as ProviderConnectionData
})

function onTabChanged(selectedTab: any) {
  console.log(selectedTab.tab.name, 'selected')
  if(selectedTab.tab.name === "Developer") {
    fetchDeveloperData()
  } else if(selectedTab.tab.name === "Connections") {
    fetchConnections()
  }
}

async function fetchSessions() {
  loading.value = true
  const response = await request("/api/auth/sessions");
  loading.value = false
  if (response?.ok) {
    const json = await response.json();
    currentSessionId.value = json.currentSessionId;
    sessions.value = json.sessions;
  }
}
async function fetchDeveloperData() {
  api.value.loading = true
  const response = await request("/api/auth/developer");
  api.value.loading = false
  if (response?.ok) {
    const json = await response.json();
    api.value.data = json.apikey
  }
}

async function fetchConnections() {
  const response = await request("/api/auth/connections");
  if (response?.ok) {
    const json = await response.json();
    props.privUser.updateProviders(json)
    providers.value = json
  }
}

async function createApiKey() {
  if(api.value.data) {
    if(!confirm("Are you sure you want to regenerate your apikey? The existing key will no longer work")) {
      return;
    }
  }

  api.value.loading = true
  const response = await request("/api/auth/developer/apikey", { method: "POST" });
  api.value.loading = false
  if (response?.ok) {
    const json = await response.json();
    api.value.data = json.apikey
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

onMounted(() => {
  fetchSessions();
});
</script>
