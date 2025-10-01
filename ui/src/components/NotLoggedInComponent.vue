<template>
<div class="container has-text-centered">
  <div class="columns mt-6">
    <div class="column is-8">
      <div class="box">
        <h4 class="title is-3">
          <Icon icon="fa-lock">Login Required</Icon>
        </h4>
        <p class="subtitle is-4">This page requires you to be logged in.</p>
        <hr>
        <p class="subtitle is-5">Login with either Steam or Discord (if linked) on the right to continue</p>
      </div>
    </div>
    <div v-if="meta&&!hideButtons" class="column">
      <div class="block">
        <SteamLoginButton size="large" :meta="meta" />
      </div>
      <div class="block" data-tooltip="Only if you have linked to a steam account">
        <DiscordLoginButton size="large" :meta="meta" />
      </div>
    </div>
    <div v-if="meta&&hideButtons" class="column">
      <Icon icon="fa-spinner" spin>Waiting for server</Icon>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
  import DiscordLoginButton from '@/components/oauth/DiscordLoginButton.vue';
  import SteamLoginButton from '@/components/oauth/SteamLoginButton.vue';
  import { PanelMetaInfo } from '../../../common-types/Panel.js';

  const props = defineProps<{
    meta?: PanelMetaInfo,
    hideButtons?: boolean
  }>()
  </script>

