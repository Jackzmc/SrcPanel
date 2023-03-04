<template>
  <table class="table is-striped is-fullwidth">
    <thead>
      <tr>
        <th></th>
        <th>Name</th>
        <th>SteamID</th>
        <th>Country</th>
        <th>Bans</th>
        <th>Notes</th>
        <th>Last Joined</th>
        <th>First Joined</th>
        <th v-if="!hasManual">Server</th>
      </tr>
    </thead>
    <tbody>
    <tr v-for="user in users" :key="user.steamid">
      <td>
        <input v-if="user.steamid !== userdata.user.steamid" type="radio" v-model="selectedId" :value="user.steamid">
      </td>
      <td>
        <router-link :to="{ name: 'manage-user', params: { id: user.steamid }}">
          <b>{{user.name}}</b>
          <span v-if="user.isAdmin" class="tag is-info ml-1">Admin</span>
        </router-link>
      </td>
      <td data-tooltip="View user's stats profile"><a :href="'https://stats.jackz.me/user/' + user.steamid">{{user.steamid}}</a></td>
      <td>{{user.country}}</td>
      <td>
        <span :class="{'has-text-grey': user.bansCount == 0}">{{user.bansCount}}</span>
      </td>
      <td>
        <span :class="{'has-text-grey': user.notesCount == 0}">{{user.notesCount}}</span>
      </td>
      <td>{{formatDate(user.lastJoinDate)}}</td>
      <td>{{formatDate(user.firstJoinDate)}}</td>
      <td v-if="!hasManual">{{user.server}}</td>
    </tr>
    </tbody>
    <tfoot v-if="hasManual">
      <tr>
        <td><input type="radio" v-model="selectedId" value="_custom"></td>
        <td><input @focus="selectedId = '_custom'" type="text" class="input" v-model="manualInput" placeholder="STEAM_1:1:" /></td>
        <td><b>Manual Input</b></td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['select', 'manual'])
const props = defineProps<{
  users: any[],
  userdata: any,
  hasManual?: boolean
}>()
let selectedId = ref<any>()
let manualInput = ref<any>()
let isAddAdminDisabled = ref(false)

watch(selectedId, (value) => {
  if(value !== "_custom")
    emit('select', value)
})
watch(manualInput, (value) => {
  // if(selectedId.value === "_custom")
    emit('manual', value)
})



function formatDate(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString()
}
</script>
