import type { APILogData } from "@jzpanel/common/Logs";
import type { APIUser } from "@jzpanel/common/User";
import type { APISearchDetailResult, APISearchPartialResults, SearchType } from "@jzpanel/common/Search";
import SteamID from "steamid";

export interface SearchResultData {
  type: SearchType;
  partialContent: string | null;
  data: any | null;
  // Custom parsed data for some objects
  userData?: APIUser;
  logData?: APILogData;
  full: boolean;
}

export function usePanelSearch(query: Ref<string>) {
  const resultMetrics = ref<{ startTime?: number; endTime?: number }>({});
  const results = ref<Record<string, SearchResultData> | null>(null); // key is result's obj ID
  const status = ref<"idle" | "pending" | "done">("idle");
  // const totalResults = computed(() => Object.values(results.value).map(r => r.))

  let source: EventSource | null = null;

  async function execute() {
    if (!query.value) return;
    source?.close();

    source = new EventSource(`/api/search?q=${query.value}`);
    status.value = "pending";

    source.onmessage = (msg) => {
      if (!results.value) results.value = {};
      const json: APISearchDetailResult<any> | APISearchPartialResults = JSON.parse(msg.data);
      if ("done" in json) {
        status.value = "done";
        source?.close();
        return;
      }
      if ("results" in json) {
        // We have not gotten partial results yet
        results.value = {};
        for (const result of json.results) {
          results.value[result.id] = {
            type: result.type,
            partialContent: result.content,
            data: null,
            full: false,
          };

          if (result.type === "user") {
            const steamid2 = SteamID.fromIndividualAccountID(result.id).getSteam2RenderedID();
            results.value[result.id]!.userData = {
              id: steamid2,
              name: result.content,
              avatarUrl: `/api/users/${steamid2}/avatar`,
            };
          }
        }
      }
      else if (results.value && results.value[json.id]) {
        // Update the partial with full data
        results.value[json.id]!.data = json.data;
        results.value[json.id]!.full = true;
        if (json.type === "activity_log") {
          // TODO: make this a shared method
          results.value[json.id]!.logData = {
            ...json.data,
            client: json.data.client && {
              steamid: json.data.client,
              name: json.data.client_name ?? json.data.client,
            },
            target: json.data.target && {
              steamid: json.data.target,
              name: json.data.target_name ?? json.data.target,
            },
          };
        }
      }
      resultMetrics.value.endTime = Date.now();
    };
    source.onerror = () => {
      console.log("err");
      source!.close();
    };
  }

  onBeforeMount(() => {
    // watch(query, execute, { immediate: true })
    execute();
    // watch(query, execute, { immediate: true })
  });

  onUnmounted(() => source?.close());

  return { results, resultMetrics, status, execute };
}
