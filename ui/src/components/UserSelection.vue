<template>
<div class="table-container">
  <table class="table is-striped is-fullwidth is-bordered">
    <thead>
      <tr>
        <th>Name</th>
        <th>Country</th>
        <th>Bans</th>
        <th>Notes</th>
        <th>First Joined</th>
        <th>Last Joined</th>
        <th v-if="!hasManual">Server</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.steamid">
        <td class="sel-user-component">
          <!-- <router-link :to="{ name: 'manage-user', params: { id: user.steamid }}">
            <b>{{user.name}}</b>
            <span v-if="user.isAdmin" class="tag is-info ml-1 is-pulled-right has-text-white">Admin</span>
          </router-link> -->
          <UserComponent :user="user" />
        </td>
        <td><span v-if="user.country">{{user.country}}</span><em v-else>(unknown)</em></td>
        <td>
          <span :class="{'has-text-grey-lighter': user.bansCount == 0}">{{user.bansCount}}</span>
        </td>
        <td>
          <span :class="{'has-text-grey-lighter': user.notesCount == 0}">{{user.notesCount}}</span>
        </td>
        <td><span v-if="user.firstJoinDate">{{formatDate(user.firstJoinDate)}}</span><em v-else>(user has not joined)</em></td>
        <td><span v-if="user.lastJoinDate" :data-tooltip="formatDate(user.lastJoinDate)">{{getRelDate(user.lastJoinDate)}}</span><em v-else>(user has not joined)</em></td>
        <td v-if="!hasManual">{{user.server}}</td>
      </tr>
    </tbody>
  </table>
</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatDate } from "@/js/util"
import { getRelDate } from '../js/util';
import UserComponent from './UserComponent.vue';

const emit = defineEmits(['select', 'manual'])
const props = defineProps<{
  users: any[],
  hasManual?: boolean
}>()
let selectedId = ref<any>()
let manualInput = ref<any>()

watch(selectedId, (value) => {
  if(value !== "_custom")
    emit('select', value)
})
watch(manualInput, (value) => {
  // if(selectedId.value === "_custom")
    emit('manual', value)
})
</script>

<style scoped>
tbody {
  vertical-align: middle;
}
.sel-user-component {
  position: relative;
  padding-bottom: 0;
}
</style>
