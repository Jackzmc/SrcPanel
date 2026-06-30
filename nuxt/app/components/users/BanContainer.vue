<template>
  <div class="grid grid-cols-1 sm:grid-cols-4 gap-y-4 gap-0 sm:gap-4">
    <UCard class="col-span-3 grow">
      <h3 class="text-sm font-bold mb-3 text-muted">
        {{ ban ? 'EDIT BAN' : 'NEW BAN' }}
      </h3>
      <div class="flex flex-col gap-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Reason">
            <UTextarea
              v-model="editBan.reason"
              placeholder="Banned"
              class="w-full"
              size="lg"
              :rows="2"
              required
              :maxlen="255"
            />
            <p class="text-muted text-sm">
              Message will be shown to the user if no public reason is set
            </p>
          </UFormField>
          <UFormField label="Public Reason (Optional)">
            <UTextarea
              v-model="editBan.publicReason"
              placeholder="Optional reason to show to user instead of the private reason"
              class="w-full"
              size="lg"
              :rows="2"
              :maxlen="255"
              :maxrows="3"
            />
          </UFormField>
        </div>
        <UFormField label="Expires">
          <!-- <USelect v-model="extendExpires" :placeholder="ban && ban.expires > 0 ? 'Extend expiry date' : 'Set expiry date'" :items="expiresOptions" /> -->
          <div class="py-1 mb-1">
            <span v-if="!editBan.expires">Ban is set to never expire</span>
            <UBadge v-else variant="soft" color="neutral" size="lg">
              Ban {{ hasExpiredEdit ? 'expired' : 'will expire' }} <b>{{ formatRelTime(editBan.expires) }}</b> on <b>{{ formatDate(editBan.expires) }}</b>
            </UBadge>
          </div>
          <div class="flex gap-1">
            <UButton
              v-for="option in expiresOptions"
              :key="option.value"
              variant="outline"
              color="neutral"
              @click="extendExpires(option.value)"
            >
              {{ option.label }}
            </UButton>
            <UButton v-if="editBan.expires > 0" variant="outline" color="error" @click="extendExpires(0)">
              Never
            </UButton>
          </div>
        </UFormField>
        <UFormField label="Flags">
          <p class="text-muted text-sm pb-2">
            Click the buttons to toggle option on or off
          </p>
          <div class="flex flex-row gap-1">
            <UTooltip text="Make the ban inactive">
              <UButton
                color="error"
                size="lg"
                :variant="editBan.flags & APIBanFlags.Suspended ? 'solid' : 'outline'"
                :leading-icon="editBan.flags & APIBanFlags.Suspended ? 'lucide:circle-check' : undefined"
                @click="toggleFlag(APIBanFlags.Suspended)"
              >Suspend</UButton>
            </UTooltip>
            <UTooltip text="Ban by IP Address">
              <UButton
                color="neutral"
                size="lg"
                :variant="editBan.flags & APIBanFlags.IPBan ? 'solid' : 'outline'"
                :disabled="!editBan.ip"
                :leading-icon="editBan.flags & APIBanFlags.IPBan ? 'lucide:circle-check' : undefined"
                @click="toggleFlag(APIBanFlags.IPBan)"
              >IP Ban</UButton>
            </UTooltip>
          </div>
        </UFormField>
      </div>
      <br><br><br>
      <template #footer>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div class="flex items-center col-span-2 gap-1">
            <UButton size="xl" class="my-2" :loading="saveActive" :disabled="!canSave" @click="saveOrAdd()">
              {{ ban ? 'Save Changes' : 'Ban Player' }}
            </UButton>
            <UButton
              size="xl"
              class="my-2"
              :loading="saveActive"
              :disabled="hasChanges"
              variant="outline"
              color="neutral"
              @click="reset()"
            >Reset</UButton>
          </div>

          <div v-if="ban" class="flex items-start">
            <UFormField label="Danger Zone" orientation="horizontal" class="py-2 px-4 border-dashed rounded-lg border w-full" :ui="{ root: 'items-center' }">
              <UButton color="error" :loading="saveActive||deleteActive" @click="deleteBan()">
                Delete Ban
              </UButton>
            </UFormField>
          </div>
        </div>
      </template>
    </UCard>
    <div class="flex flex-col gap-y-4">
      <UCard class="grow">
        <h3 class="text-sm font-bold mb-2 text-muted">
          DETAILS
        </h3>
        <div class="flex flex-col justify-around gap-1">
          <div v-if="ban" class="flex flex-row justify-between items-center">
            <h4 class="text-lg font-semibold text-dimmed">
              Id
            </h4>
            <p class="text-black dark:text-white">
              #{{ ban.id }}
            </p>
          </div>
          <div class="flex flex-row justify-between items-center">
            <h4 class="text-lg font-semibold text-dimmed">
              State
            </h4>
            <UBadge v-if="!ban" color="primary">
              New
            </UBadge>
            <UBadge v-else-if="ban.expired" color="error" variant="subtle">
              Expired
            </UBadge>
            <UBadge v-else-if="ban.flags & APIBanFlags.Suspended" color="error" variant="subtle">
              Suspended
            </UBadge>
            <UBadge v-else-if="ban.flags & APIBanFlags.AppealBanned" color="success" variant="subtle">
              Appealed
            </UBadge>
            <UBadge v-else color="primary" variant="subtle">
              Active
            </UBadge>
          </div>
          <div class="flex flex-row justify-between items-center">
            <h4 class="text-lg font-semibold text-dimmed">
              IP
            </h4>
            <p v-if="editBan.ip" class="text-black dark:text-white">
              {{ editBan.ip }}
            </p>
            <p v-else class="text-muted">
              --
            </p>
          </div>
          <div class="flex flex-row justify-between items-center">
            <h4 class="text-lg font-semibold text-dimmed">
              Country
            </h4>
            <p v-if="editBan.client.country" class="text-black dark:text-white">
              {{ editBan.client.country }}
            </p>
            <p v-else class="text-muted">
              --
            </p>
          </div>
          <div class="flex flex-row justify-between items-center">
            <h4 class="text-lg font-semibold text-dimmed">
              Join Attempts
            </h4>
            <p v-if="ban" class="text-black dark:text-white">
              {{ editBan.joinAttempts }}
            </p>
            <p v-else class="text-muted">
              --
            </p>

          </div>
        </div>
        <template v-if="ban" #footer>
          <h4 class="text-sm font-semibold text-dimmed">
            EXPIRES
          </h4>
          <div class="my-2 space-y-1 text-sm">
            <p v-if="ban.expires" class="text-black dark:text-white text-sm">
              {{ formatDate(editBan.expires) }}
            </p>
            <p v-if="ban.expires" class="text-xs text-muted">
              {{ formatRelTime(editBan.expires) }}
            </p>
            <!-- <p class="text-black">{{ formatDateSmart(editBan.timestamp) }}</p> -->
            <!-- <p class="text-xs text-muted">{{ getRelDate(editBan.timestamp) }}</p> -->
            <p v-else class="text-black dark:text-white">
              Permanent
            </p>
          </div>
        </template>
      </UCard>
      <UCard>
        <div class="flex flex-col gap-2">
          <h4 class="text-sm font-semibold text-muted">
            BANNED BY
          </h4>
          <UserComponent class=" text-black dark:text-white" name-class="ml-2 py-2" :user="editBan.executor" />
        </div>
        <template v-if="ban" #footer>
          <h4 class="text-sm font-semibold text-dimmed">
            ISSUED
          </h4>
          <div class="my-2 space-y-1 text-sm">
            <p class="text-black dark:text-white">
              {{ formatDateSmart(editBan.timestamp) }}
            </p>
            <p class="text-xs text-muted">
              {{ getRelDate(editBan.timestamp) }}
            </p>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { APIBanFlags, type APICreateBanResponse, type FullAPIBan } from "@srcpanel/common/Ban";
import { formatDate, formatDateSmart, formatRelTime, getRelDate } from "@srcpanel/common/format";

const toast = useToast();
const { promptConfirm } = useModal();
const { user } = useAuth();

type EditBan = Omit<FullAPIBan, "id">;

const props = defineProps<{
  ban?: FullAPIBan;
  steamid: string;
}>();

const hasExpiredEdit = computed(() => {
  return editBan.value.expires > 0 && (editBan.value.expires * 1000 <= Date.now());
});

const expiresOptions = computed(() => {
  // value is number of minutes
  return [
    {
      label: "+1 Hour",
      value: 60,
    },
    {
      label: "+1 Day",
      value: 60 * 24,
    },
    {
      label: "+1 Week",
      value: 60 * 24 * 7,
    },
    {
      label: "+1 Month",
      value: 60 * 24 * 7 * 4,
    },
    {
      label: "+1 Year",
      value: 60 * 24 * 7 * 4 * 12,
    },
    {
      label: "Never",
      value: 0,
    },
  ] as { label: string; value: number }[];
});

const hasChanges = computed(() => {
  if (!props.ban) return true;
  return props.ban.expires !== editBan.value.expires
    || props.ban.publicReason !== editBan.value.publicReason
    || props.ban.reason !== editBan.value.reason
    || props.ban.flags !== editBan.value.flags;
});

const canSave = computed(() => {
  if (!props.ban) {
    return editBan.value.reason != ""
      && editBan.value.client.id;
  }
  return hasChanges.value === true;
});

const editBan = ref<EditBan>(props.ban ? JSON.parse(JSON.stringify(props.ban)) : defaultBan());
const saveActive = ref(false);
const deleteActive = ref(false);
// const extendExpires = ref("")

function toggleFlag(flag: APIBanFlags) {
  if (editBan.value.flags & flag) {
    editBan.value.flags &= ~flag;
  } else {
    editBan.value.flags |= flag;
  }
}

function extendExpires(minutes: number) {
  if (minutes == 0) {
    editBan.value.expires = 0;
  } else {
    // If no expires OR has already expired, reset to current time + now
    if (editBan.value.expires == 0 || hasExpiredEdit.value) {
      editBan.value.expires = Math.floor(Date.now() / 1000);
    }
    editBan.value.expires += (60 * minutes);
  }
}

function defaultBan(): EditBan {
  return {
    reason: "",
    publicReason: "",
    ip: undefined,
    flags: 0,
    client: {
      id: "",
    },
    executor: {
      id: user.value?.user.steamid!,
      name: user.value?.user.name,
    },
    expires: 0,
    expired: false,
    joinAttempts: 0,
    timestamp: Math.ceil(Date.now() / 1000),
  };
}

function reset() {
  if (props.ban === null) {
    editBan.value = defaultBan();
  } else {
    editBan.value = JSON.parse(JSON.stringify(props.ban));
  }
}

async function saveOrAdd() {
  if (props.ban) {
    await save();
  } else {
    await createBan();
  }
}

async function save() {
  if (!props.ban) return;
  if (!canSave.value) return console.warn("save() called when canSave is false");
  saveActive.value = true;
  const result = await request(`/api/bans/${props.ban.id}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(editBan.value),
  });
  saveActive.value = false;
  if ("body" in result) {
    toast.add({
      title: `Ban #${props.ban.id} updated successfully`,
      color: "success",
    });
  } else {
    toast.add({
      title: `Ban #${props.ban.id} update failed`,
      description: result.error.message,
      color: "error",
    });
  }
}

async function createBan() {
  if (props.ban) return console.warn("createBan called on edited ban");
  saveActive.value = true;
  const result = await request<APICreateBanResponse>(`/api/bans/${props.steamid}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(editBan.value),
  });
  saveActive.value = false;
  if ("body" in result) {
    if (!result.body) throw Error("createBan with empty body");
    toast.add({
      title: `Ban #${result.body.banId} created`,
      color: "success",
    });
    await navigateTo(`/users/${props.steamid}/bans/${result.body.banId}`);
  } else {
    toast.add({
      title: `Failed to ban player`,
      description: result.error.message,
      color: "error",
    });
  }
}

async function deleteBan() {
  if (!props.ban) return;
  deleteActive.value = true;
  if (await promptConfirm({
    title: "Confirm deletion",
    description: "This will completely purge ban from the records, intended for unintentional bans. It is preferred to suspend the ban instead if the ban is to no longer be active. Are you sure you want to continue?",
    okColor: "error",
    okText: "Delete",
  })) {
    const result = await request(`/api/bans/${props.ban.id}`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
    });
    deleteActive.value = false;
    if ("body" in result) {
      toast.add({
        title: `Ban #${props.ban.id} deleted`,
        color: "success",
      });
      await navigateTo(`/users/${props.ban.client.id}/bans`);
    } else {
      toast.add({
        title: `Ban #${props.ban.id} deletion failed`,
        description: result.error.message,
        color: "error",
      });
    }
  }
}
</script>
