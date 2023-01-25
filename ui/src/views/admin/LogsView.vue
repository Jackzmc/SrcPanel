<template>
  <div>
    <Modal :active="modal.message !== undefined" v-if="modal.message" :closable="false">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title"><b>Error</b></p>
          <button
            class="delete"
            aria-label="close"
            @click="modal.message = undefined"
          ></button>
        </header>
        <section class="modal-card-body">
          {{ modal.message }}
        </section>
        <footer class="modal-card-foot">
          <button
            class="button is-success"
            aria-label="close"
            @click="modal.message = undefined"
          >
            Close
          </button>
        </footer>
      </div>
    </Modal>
    <div>
      <div class="container">
        <div class="columns">
          <div class="column is-3">
            <p class="title is-3">Server Logs</p>
            <p class="subtitle is-4">
              {{ count.toLocaleString() }} log entries
              <em v-if="query != ''">(filtered)</em>
            </p>
          </div>
          <div class="column is-6">
            <label class="label">
              Enabled Types
              <a class="is-inline" @click="filters['types'] = []">(Clear)</a>&nbsp;
              <a @click="filters['types'] = FILTERS['types']">(Select All)</a>
            </label>
            <div class="buttons">
              <a
                v-for="key in FILTERS.types"
                :key="key"
                :class="['button', 'is-small', typeColors[key]]"
                @click="toggleList('types', key)"
              >
                {{ key }}
              </a>
            </div>
          </div>
          <div class="column is-2">
            <label class="label">Find Messages Around ID</label>
            <div class="field has-addons">
              <div class="control">
                <input
                  type="text"
                  class="input"
                  v-model="search.id"
                  placeholder="######"
                />
              </div>
              <div class="control">
                <a class="button is-secondary" @click="search.id = undefined"> x </a>
              </div>
            </div>

            <em v-if="showIds"
              ><a @click="showIds = false">(click here to hide ids)</a></em
            >
            <em v-else><a @click="showIds = true">(click here to see ids)</a></em>
          </div>
          <div class="column">
            <div class="buttons">
              <button
                @click="onBtnRefresh"
                :disabled="loading > 0"
                :class="['button', 'is-info', { 'is-loading': loading > 0 }]"
              >
                Refresh
              </button>
              <button @click="setDefaults" class="button is-secondary">Reset</button>
            </div>
          </div>
        </div>
        <br />
        <div class="columns">
          <div class="column">
            <label class="label">
              Enabled Servers
              <a class="is-inline" @click="filters['servers'] = ['unknown']">(Clear)</a
              >&nbsp;
              <a @click="filters['servers'] = FILTERS['servers']">(Select All)</a>
            </label>

            <div class="buttons">
              <a
                v-for="key in FILTERS.servers"
                :key="key"
                :class="['button', 'is-small', serverColors[key]]"
                @click="toggleList('servers', key)"
              >
                {{ key }}
              </a>
            </div>
          </div>
          <div class="column">
            <label class="label">Filter Activator</label>
            <div class="select">
              <select v-model="filters.client">
                <option :value="null">Any</option>
                <option
                  v-for="user in history.activators"
                  :key="user.steamid"
                  :value="user.steamid"
                >
                  <template v-if="user.name">
                    {{ user.name }} ({{ user.steamid }})
                  </template>
                  <template v-else>{{ user.steamid }}</template>
                </option>
              </select>
            </div>
            <br />
            <label class="label">Filter Target</label>
            <div class="select">
              <select v-model="filters.target">
                <option :value="null">Any</option>
                <option
                  v-for="user in history.targets"
                  :key="user.steamid"
                  :value="user.steamid"
                >
                  <template v-if="user.name">
                    {{ user.name }} ({{ user.steamid }})
                  </template>
                  <template v-else>{{ user.steamid }}</template>
                </option>
              </select>
            </div>
          </div>
          <div class="column">
            <label class="label">Manual Input:</label>

            <div class="columns">
              <div class="column">
                <div class="field has-addons">
                  <div class="control">
                    <input
                      type="text"
                      :class="filterClientClass"
                      v-model="filters.client"
                      placeholder="STEAM_#:#:########"
                    />
                  </div>
                  <div class="control">
                    <a class="button is-secondary" @click="filters.client = null"> x </a>
                  </div>
                </div>
                <br />
                <div class="field has-addons">
                  <div class="control">
                    <input
                      type="text"
                      :class="filterTargetClass"
                      v-model="filters.target"
                      placeholder="STEAM_#:#:########"
                    />
                  </div>
                  <div class="control">
                    <a class="button is-secondary" @click="filters.target = null"> x </a>
                  </div>
                </div>
              </div>
              <div class="column">
                <input
                  type="text"
                  v-model="filterClientName"
                  disabled
                  class="input disabled"
                />
                <br /><br />
                <input
                  type="text"
                  v-model="filterTargetName"
                  disabled
                  class="input disabled"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <hr />
      <div class="container" v-if="!search.id">
        <p v-if="loading == 1" class="subtitle is-3 has-text-centered">Loading...</p>
        <Pagination
          v-else-if="isFilterTargetValid || !filters.target || filters.target == ''"
          :page="page"
          :count="count"
          :limit="limit"
          @page="setPage"
        />
        <p v-else class="has-text-danger">Invalid filter target</p>
      </div>
      <br />
      <div class="container is-fluid" v-show="loading == 0">
        <table class="table is-fullwidth is-striped is-hoverable is-bordered">
          <thead>
            <tr>
              <th style="width: 0" v-if="debugView || showIds">ID</th>
              <th style="width: 0" data-tooltip="The type of action that occurred">
                Type
              </th>
              <th style="width: 0">Timestamp</th>
              <th>
                <label class="label is-inline-block">Message</label>&nbsp;&nbsp;
                <input
                  class="input is-inline is-small is-rounded"
                  v-model="search.message"
                  style="width: 50%"
                  placeholder="Search for a message"
                />
              </th>
              <th
                style="width: 0"
                data-tooltip="The server the action was recorded on"
                class="has-tooltip-right"
              >
                Server
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredData"
              :key="log.id"
              :class="search.id == log.id ? ['has-background-primary'] : []"
              @mouseover="hoverId = log.id"
            >
              <td v-if="debugView || showIds" class="nowrap">
                <a
                  data-tooltip="Click to view all messages around this entry"
                  class="has-tooltip-right"
                  @click="searchID(log.id)"
                  >{{ log.id }}</a
                >
              </td>
              <td class="nowrap">
                <span :class="['tag', TYPE_COLORS[log.type]]">{{ log.type }}</span>
              </td>
              <td class="nowrap">{{ log.timestamp }}</td>
              <LogMessage :log="log" :hover-id="hoverId" :userdata="userdata" @set-filter="setUserFilter" @redact-id="redactID" />
              <td class="nowrap">
                <span v-if="log.server" :class="['tag', SERVER_COLORS[log.server]]">{{
                  log.server
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <br />
      <div class="container" v-if="!loading">
        <Pagination
          v-if="!search.id"
          :page="page"
          :count="count"
          :limit="limit"
          @page="setPage"
        />
        <a @click="toggleDebug" v-if="debugView"
          ><em>(click to disable debug view)</em></a
        >
        <a @click="toggleDebug" v-else><em>(click to enable debug view)</em></a>
        <span v-if="debugView">
          {{ query }}
        </span>
      </div>
      <br />
    </div>
  </div>
</template>

<script setup lang="ts">
import Pagination from "@/components/pagination.vue";
import Debounce from "@/js/debounce";
import LogClientTarget from "@/components/LogClientTarget.vue";
import Modal from "@/components/Modal.vue";
import { Session } from "../../../../common-types/User";
import { ref, watch, computed, onBeforeMount, onMounted, Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useNotification } from "@kyvg/vue3-notification";
import LogMessage from "@/components/LogMessage.vue";

const emit = defineEmits([]);
const route = useRoute();
const router = useRouter();

const REFRESH_INTERVAL_MS = 1000 * 60 * 2;

const FULLNAME_REGEX = /"([^"<>]+)<\d+><(STEAM_\d:\d:\d+|Console|BOT)><(Console)?>"/g;
const USER_REGEX = /^(STEAM_\d:\d:\d+|Server|CONSOLE|Smoker|Boomer|Charger|Jockey|Hunter|Spitter|Tank|Witch)$/;
const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/;

const DEFAULT_TYPES = ["ACTION", "CHAT", "INFO", "STATE", "WEB"];
const DEFAULT_SERVERS = ["main", "reserved", "web"];

type Dictionary<K extends string, T> = Partial<Record<K, T>>;

const TYPE_COLORS: Dictionary<string, string> = {
  ACTION: "is-info",
  CHAT: "is-secondary",
  STATE: "is-primary",
  QUIT: "is-danger",
  JOIN: "is-success",
  INFO: "is-link",
  WEB: "is-dark",
};
const SERVER_COLORS: Dictionary<string, string> = {
  main: "is-success",
  reserved: "is-dark",
};

const { notify } = useNotification();

const props = defineProps<{
  userdata: Session;
}>();

const FILTERS = {
  servers: [
    "main",
    "reserved",
    "public1",
    "public2",
    "public3",
    "public4",
    "public5",
    "public6",
    "public7",
    "public8",
    "unknown",
    "web",
  ],
  types: ["ACTION", "CHAT", "INFO", "STATE", "QUIT", "JOIN", "WEB"],
};

let hoverId = ref("");
let modal = ref<{ message?: string }>({ message: undefined });
let loading = ref(1);
let data = ref<any[]>([]);
let count = ref(0);
let filters: Ref<Dictionary<string, string[] | string | null>> = ref<{
  servers: string[];
  types: string[];
  client: string | null;
  target: string | null;
}>({
  servers: DEFAULT_SERVERS,
  types: DEFAULT_TYPES,
  client: null,
  target: null,
});
let search = ref<{ message?: string; id?: string }>({
  message: undefined,
  id: undefined,
});
let history = ref<{
  activators: any[];
  targets: any[];
}>({
  activators: [],
  targets: [],
});
let page = ref(1);
let limit = ref(30);
let fetchDebounce = ref<Function>();
let debugView = ref(false);
let showIds = ref(false);

const isFilterTargetValid = computed(() => {
  return filters.value.target && USER_REGEX.test(filters.value.target as string);
});
const isFilterClientValid = computed(() => {
  return filters.value.client && USER_REGEX.test(filters.value.client as string);
});

const filterTargetClass = computed(() => {
  let value = filters.value.target
    ? isFilterTargetValid.value
      ? "is-success"
      : "is-danger"
    : "";
  return ["input", value];
});
const filterTargetName = computed(() => {
  const result = history.value.targets.find((t) => t.steamid === filters.value.target);
  return result ? result.name : null;
});

const filterClientClass = computed(() => {
  let value = filters.value.client
    ? isFilterClientValid.value
      ? "is-success"
      : "is-danger"
    : "";
  return ["input", value];
});
const filterClientName = computed(() => {
  const result = history.value.activators.find((t) => t.steamid === filters.value.client);
  return result ? result.name : null;
});
const serverColors = computed(() => {
  let obj: Dictionary<string, string> = {};
  for (const server of FILTERS.servers) {
    obj[server] = filters.value.servers!.includes(server)
      ? SERVER_COLORS[server]
      : "is-light";
  }
  return obj;
});
const typeColors = computed(() => {
  let obj: Dictionary<string, string> = {};
  for (const type of FILTERS.types) {
    obj[type] = filters.value.types!.includes(type) ? TYPE_COLORS[type] : "is-light";
  }
  return obj;
});
const filteredData = computed(() => {
  if (!search.value.message) return data.value;
  return data.value;
});
const query = computed(() => {
  //todo: search
  let query = "";
  if (!isFilterTargetValid.value && filters.value.target) return query;
  for (const filterName in filters.value) {
    const value = filters.value[filterName];
    if (value) {
      if (Array.isArray(value)) {
        if (value.length > 0) query += `&${filterName}=${value.join(",")}`;
      } else {
        query += `&${filterName}=${value}`;
      }
    }
  }
  for (const searchKey in search.value) {
    const value = (search.value as Record<string, string>)[searchKey];
    if (value) {
      query += `&search_${searchKey}=${value}`;
    }
  }
  return query.length > 0 ? query : "";
});

const isTargetColumnVisible = computed(() => {
  for (const key in data.value) {
    if (data.value[key]["target"]["steamid"]) return true;
  }
  return false;
});

function setDefaults() {
  filters.value.servers = DEFAULT_SERVERS;
  filters.value.types = DEFAULT_TYPES;
  filters.value.client = null;
  filters.value.target = null;
  search.value.message = undefined;
  search.value.id = undefined;
  page.value = 1;
}
function searchID(id: string) {
  search.value.id = id;
  search.value.message = undefined;
  getData();
}
async function redactID(id: string) {
  hoverId.value = "";
  let log = data.value.find((log) => log.id === id);
  if (!log) {
    alert("Could not find log for " + id);
  }
  const response = await fetch(`/api/logs/${id}/redact`, {
    method: "POST",
    credentials: "include",
  });
  if (response.ok && response.status === 204) {
    log.message = "[redacted]";
    log.redacted = true;
    notify({
      type: "success",
      text: `Redacted #${id}`,
    });
  } else {
    const json = await response.json();
    notify({
      type: "error",
      text: json.message,
      title: `Failed to redact: ${response.statusText}`,
    });
  }
}
function toggleList(listName: string, element: unknown) {
  const value = (filters.value as Record<string, any>)[listName];
  const index = value.findIndex((e: unknown) => e == element);
  if (index > -1) {
    value.splice(index, 1);
  } else {
    value.push(element);
  }
  getData();
}

function toggleDebug() {
  debugView.value = !debugView.value;
  getData();
}
function onBtnRefresh() {
  loading.value = 2;
  getData();
}

function setPage(pageNum: number) {
  page.value = pageNum;
  getData();
}
function setUserFilter(type: string, id: string) {
  filters.value[type] = id;
}
async function getData() {
  try {
    const response = await fetch(
      `/api/logs/${page.value}?limit=${limit.value}${query.value}`,
      { credentials: "include" }
    );
    if (response.ok && response.status == 200) {
      const json = await response.json();
      loading.value = 0;
      count.value = json.totalCount;
      json.logs.forEach((log: any) => {
        log.messageRaw = log.message.slice(0)
        log.timestamp = formatDate(log.timestamp);
        log.client = {
          steamid: log.client,
          name: log.clientName || log.client,
          hasStats: !!log.clientName,
        };
        log.target = {
          steamid: log.target,
          name: log.targetName || log.target,
          hasStats: !!log.targetName,
        };
        if (
          log.type == "ACTION" &&
          log.client.steamid &&
          log.client.steamid.startsWith("STEAM_") &&
          !history.value.activators.some((c) => c.steamid == log.client.steamid)
        )
          history.value.activators.push(log.client);
        if (
          log.target.steamid &&
          log.target.steamid.startsWith("STEAM_") &&
          !history.value.targets.some((c) => c.steamid == log.target.steamid)
        )
          history.value.targets.push(log.target);

        // if (log.client.steamid && log.message && log.message[0] != " ") {
        //   log.message = " " + log.message;
        // }
        if (log.message === "[redacted]") log.redacted = true;

        if (!debugView.value && log.message) {
          // log.message = log.message.replace(FULLNAME_REGEX, "");
          if (log.type === "ACTION") {
            const adminChatMatch = log.message.match(ADMINCHAT_REGEX);
            if (adminChatMatch) {
              log.message = `<span class='tag is-warning' data-tooltip='Message was sent in admin chat'>${adminChatMatch[1]}</span>`;
              log.type = "CHAT";
            }
          } else if (log.type === "CHAT") {
            log.message = `<span class='tag'>${log.message}</span>`;
          }
        }
      });
      data.value = json.logs;
      window.localStorage.setItem(
        "l4d2admin_data",
        JSON.stringify({
          history: history.value,
        })
      );
      return true;
    } else {
      loading.value = 0;
      alert("Server error while fetching logs: " + response.statusText);
      return false;
    }
  } catch (err: any) {
    loading.value = 0;
    alert("Error while fetching logs: " + err.message);
    return false;
  }
}
function formatDate(timestamp: number) {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}
function getStatProfile(id: string) {
  return `https://stats.jackz.me/user/${id}/overview`;
}
function addToHistory(steamid: string, list: string) {
  //@ts-ignore
  if (!steamid || !list || !history.value[list]) return false;
  //@ts-ignore
  if (!history.value[list][steamid]) {
    //@ts-ignore
    history.value[list][steamid] = 0;
  }
  //@ts-ignore
  history.value[list][steamid]++;
}

onBeforeMount(() => {
  if (window.localStorage["l4d2admin_data"]) {
    history.value = JSON.parse(window.localStorage["l4d2admin_data"]).history;
  }

  fetchDebounce.value = Debounce(getData, 500);
  for (const filter in FILTERS) {
    //@ts-ignore
    if (!filters.value[filter])
      //@ts-ignore
      filters.value[filter] = [];
  }
  const params = new URLSearchParams(window.location.search);
  if (params.has("types")) {
    filters.value.types = params.get("types")?.split(",") || [];
  }
  if (params.has("servers")) {
    filters.value.servers = params.get("servers")?.split(",") || [];
  }
  if (params.has("target")) {
    filters.value.target = params.get("target");
  }
  if (params.has("client") || params.has("activator")) {
    filters.value.client = params.get("client") ?? params.get("activator");
  }
  if (params.has("search_id")) {
    search.value.id = params.get("search_id") || undefined;
  }
  if (params.has("search_message")) {
    search.value.message = params.get("search_message") || undefined;
  }
  if (params.has("page")) {
    page.value = parseInt(params.get("page") || "0");
  }
});

onMounted(() => {
  setInterval(() => {
    getData();
  }, REFRESH_INTERVAL_MS);
  getData();
});

watch(query, (value) => {
  page.value = 1;
  if (props.userdata && fetchDebounce.value) fetchDebounce.value();
  window.history.pushState("", "", `?page=${page.value}${value}`);
});
</script>

<style>
.nowrap {
  white-space: nowrap;
}
</style>
