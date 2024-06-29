
<template>
<div class="container">
  <div class="block content">
    <h4>Welcome to the admin panel!</h4>

    <template v-if="stage == FirstTimeSetupStage.Default">
      <p class="subtitle">To begin, you'll need to sign in with your steam account. We'll set up your account with all privileges.</p>
      <Icon icon="fa-spinner" spin>Please wait, getting ready...</Icon>
    </template>
    <template v-else-if="stage == FirstTimeSetupStage.FirstSetupComplete">
      <p class="subtitle">To begin, you'll need to sign in with your steam account. We'll set up your account with all privileges.</p>
      <SteamLoginButton size="large" :meta="meta" />
    </template>
    <template v-else-if="stage == FirstTimeSetupStage.SteamAdminCreated">
      <p class="subtitle">Your account is all setup! Now you can move onto adding servers, shares, and changing some settings.</p>
    </template>
  </div>
</div>

</template>

<script setup lang="ts">
import SteamLoginButton from '@/components/oauth/SteamLoginButton.vue';
import { FirstTimeSetupStage, PanelMetaInfo } from '../../../../../../common-types/Panel.js';
import Field from '@/components/Field.vue'
import { onMounted, ref } from 'vue';

const emit = defineEmits(["stage", "ready"])

const props = defineProps<{
  meta: PanelMetaInfo,
  stage: FirstTimeSetupStage
}>()

async function sendStageData(stage: number, data: any = {}) {
  const params = new URLSearchParams(data)
  const response = await fetch(`/api/panel/first-time-setup?stage=${stage}&${params.toString()}`, { method: "POST"})
  if(response.ok) {
    emit("stage", stage)
  } else {
    alert("Fatal error: Failed to send first time setup data (stage = " + stage + ")")
  }
}



onMounted(async () => {
  if(props.stage == FirstTimeSetupStage.Default) {
    await sendStageData(1, { domain: `${window.location.protocol}//${window.location.host}` })
  }
})
</script>
