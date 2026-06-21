<template>
  <UPopover v-if="!hideTooltip" mode="hover" :open-delay="200" @update:open="onPopover">
    <ULink :to="steamid2 ? { path: `/users/${id}`, query: { returnTo: route.fullPath } } : undefined" class="flex items-center gap-1.5">
      <UAvatar
        v-if="!hideAvatar && clientAvatarSrc"
        :src="clientAvatarSrc"
        :alt="props.user.name ?? id!"
        :size="size"
        loading="lazy"
        :as="{ img: 'img' }"
      />
      <span v-if="!hideName" :class="nameClass">{{ props.user.name || id }}</span>
    </ULink>
    <template #content>
      <div class="flex items-start gap-3 p-3 w-72">
        <UAvatar v-if="clientAvatarSrc" :src="clientAvatarSrc" :alt="props.user.name ?? id!" :size="size" :as="{ img: 'img' }" />
        <div class="min-w-0 flex-1">
          <p class="font-bold text-highlighted text-lg">
            {{ props.user.name }}
          </p>
          <p class="text-md text-muted font-mono">
            {{ steamid2 ?? props.fallbackName ?? 'BOT' }}
          </p>
          <div v-if="id" class="flex flex-wrap gap-1 mt-2">
            <UBadge v-if="isAdmin" color="info" variant="subtle">
              Admin
            </UBadge>
            <UBadge v-if="'bansCount' in props.user && props.user.bansCount != null" color="error" variant="subtle">
              {{ props.user.bansCount }} Ban(s)
            </UBadge>
            <UBadge v-if="'notesCount' in props.user && props.user.notesCount != null" color="neutral" variant="subtle">
              {{ props.user.notesCount }} Note(s)
            </UBadge>
          </div>
          <template v-if="!hideTooltipDetails && steamid2">
            <div v-if="details && 'body' in details && details.body" class="flex flex-wrap gap-1 mt-2">
              <template v-if="'body' in details">
                <UBadge v-if="details.body.user.isAdmin" color="info" variant="subtle">
                  Admin
                </UBadge>
                <UBadge v-if="details.body.user.bansCount != null" color="error" variant="subtle">
                  {{ details.body.user.bansCount }} Ban(s)
                </UBadge>
                <UBadge v-if="details.body.user.notesCount != null" color="neutral" variant="subtle">
                  {{ details.body.user.notesCount }} Note(s)
                </UBadge>

                <div v-if="details.body.user.lastJoinDate">
                  <b>Last seen</b>
                  <span class="ml-1">{{ getRelDate(details.body.user.lastJoinDate) }}</span>
                </div>
                <div v-else>
                  Has never joined server
                </div>

                <div v-if="details.body.profile">
                  <b>Birthday</b>
                  <span class="ml-1">
                    {{ birthDate }}
                  </span>
                </div>
              </template>
              <UAlert v-else color="error" leading-icon="lucide:triange-alert" description="Could not fetch user details" />
            </div>
            <div v-else>
              <Icon name="i-lucide-loader-circle" class="animate-spin align-middle mb-1" />
              Loading user details...
            </div>
          </template>
        </div>
      </div>
    </template>
  </UPopover>

  <!-- No tooltip variant -->
  <ULink v-else :to="steamid2 ? { path: `/users/${id}`, query: { returnTo: route.fullPath } } : undefined" class="flex items-center gap-1.5">
    <UAvatar
      v-if="!hideAvatar && clientAvatarSrc"
      :src="clientAvatarSrc"
      :alt="props.user.name ?? id!"
      size="md"
      loading="lazy"
      :as="{ img: 'img' }"
    />
    <span v-if="!hideName" :class="nameClass">{{ props.user.name || id }}</span>
  </ULink>
</template>

<script setup lang="ts">
import SteamID from "steamid";
import type { APIPlayer, APIUser, APIUserDetails } from "@jzpanel/common/User";
import { getRelDate } from "@jzpanel/common/format";

const route = useRoute();

interface UserMeta {
  name?: string;
  avatarUrl?: string;
}

const props = withDefaults(defineProps<{
  user: APIUser | APIPlayer | (UserMeta & ({ steamid: string | null | undefined } | { id: string }));
  isAdmin?: boolean;
  hideAvatar?: boolean;
  hideName?: boolean;
  hideTooltip?: boolean;
  hideTooltipDetails?: boolean;
  fallbackName?: string;

  size?: "sm" | "md" | "xs";

  nameClass?: string;
}>(), {
  size: "md",
});

const id = computed(() => {
  if (!props.user) return null;
  if ("steamid" in props.user) return props.user.steamid as string ?? null;
  if ("id" in props.user) return props.user.id as string ?? null;
  return null;
});

const clientAvatarSrc = computed(() => {
  return id.value ? `/api/users/${id.value}/avatar` : "/img/steam_default_avatar.png";
});

const steamid2 = computed(() => {
  if (!id.value) return null;
  if (id.value.startsWith("STEAM_")) return id.value;
  try {
    return new SteamID(id.value).getSteam2RenderedID();
  } catch {
    return null;
  }
});

const birthDate = computed(() => {
  if (!details.value || "error" in details.value) return null;
  const profile = details.value.body?.profile;
  if (!profile) return null;
  const date = new Date(2000, profile.birthMonth ?? 0, profile.birthDate);
  if (profile.birthMonth) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  } else if (profile.birthDate) {
    return date.toLocaleDateString("en-US", { day: "numeric" });
  }
});

const details = ref<RequestResult<APIUserDetails | null> | null>(null);

async function getDetails() {
  if (!steamid2.value || props.hideTooltipDetails) return;
  details.value = await request<APIUserDetails | null>(`/api/users/${steamid2.value}?include=profile`);
  if ("error" in details.value) {
    console.error(`Error fetching user details:`, details.value.error);
  }
}

function onPopover(open: boolean) {
  if (open) getDetails();
  else details.value = null;
}
</script>
