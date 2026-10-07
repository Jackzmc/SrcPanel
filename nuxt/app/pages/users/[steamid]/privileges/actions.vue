<template>
  <div>
    <h4 class="text-lg font-bold">Actions</h4>
    <div class="flex flex-row p-4">
      <UButton v-if="props.data.admin && props.data.admin.steamid !== user?.user.steamid" color="error" @click="revokeAdmin" leading-icon="lucide:shield-alert" size="lg">
        Revoke Admin
      </UButton>
      <p v-else class="text-muted">No actions available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { request } from "#imports";
import type { APIUserDetails } from "@srcpanel/common/User";

const emit = defineEmits(["refresh"])

const { promptConfirm } = useModal()
const toast = useToast()
const { user } = useAuth()

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

async function revokeAdmin() {
  if(!await promptConfirm({
    title: `Revoke admin for ${props.data.user.steamid}`,
    description: `Are you sure you want to revoke admin entirely for ${props.data.user.name}? They will no longer be able to login to this panel or have any permissions in games, including seeing admin chat.`,
    okText: 'Revoke',
    okColor: 'error'
  })) return

  const response = await request(`/api/admins/${props.data.user.steamid}`, { method: 'DELETE '})
  if('error' in response) {
    toast.add({
      title: `Could not revoke admin`,
      description: response.error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: `Admin revoked for ${props.data.user.steamid}`
    })
    emit("refresh")
  }
}
</script>
