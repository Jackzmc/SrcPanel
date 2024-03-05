<template>
  <div class="container">
    <nav class="pagination is-rounded" role="navigation" aria-label="pagination">
      <a class="pagination-previous" @click="copyPrev" v-if="prevDays"><Icon icon="fa-copy">Copy From Previous Week</Icon></a>
      <ul class="pagination-list">
        <li><a class="pagination-link" aria-label=""  @click="advanceWeek(false)"><Icon icon="fa-chevron-left"></Icon></a></li>
        <li><span class="mx-2">{{ week[0].label }} - {{ week[1].label }}</span></li>
        <li><a class="pagination-link" aria-label="" @click="advanceWeek(true)"><Icon icon="fa-chevron-right"></Icon></a></li>
      </ul>
    </nav>
    <table class="table is-fullwidth is-bordered" @mouseleave="hoveredElementData = undefined">
      <thead>
      <tr>
        <th style="border-bottom: 0" v-for="(month, i) in Months" :key="month">{{ month }} ({{ monthDates[i] }})</th>
      </tr>
      </thead>
      <tbody style="user-select: none">
        <tr v-for="(hour, i) in Hours" :key="hour">
          <td v-for="(hours, j) in days" :key="j"
            :class="['cell',{'available': availableDays[i*24+j], 'unavailable': !availableDays[i*24+j]}]"
            :style="hours[i].percentAvailable ? {'background-color': `rgba(32, 128, 0, ${hours[i].percentAvailable})`, 'color': hours[i].percentAvailable! > 0.5 ? 'white' : 'inherit'} : {}"
            @mouseover="e => onMouseOver(e, [i, j])" @mousedown="e => onMouseDown(e, [i, j])"
          >
            {{ hour }}
            <span class="is-pulled-right" v-if="hours[i].percentAvailable">{{ Math.round(hours[i].percentAvailable*100)}}%</span>
            <div class="box hover-box px-0 py-0" v-if="hoveredElement && hoveredElement[0] == i && hoveredElement[1] == j">
              <List v-if="hoveredElementData">
                <template v-for="user in hoveredElementData.users" :key="user">
                  <div class="list-item py-1">
                    <div class="list-item-image">
                      <figure class="image is-32x32" :data-tooltip="user.name">
                          <img class="is-rounded" :style="{opacity: user.available ? 1 : 0.5}" :src="user.avatarUrl">
                        </figure>
                    </div>
                    <div class="list-item-content">
                      <div :class="['list-item-title', {'has-text-grey-lighter': !user.available}]">
                        {{ user.name }}
                        <span  v-if="user.available" class="tag is-success is-pulled-right ml-2">Available</span>
                      </div>
                    </div>
                  </div>
                </template>
              </List>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import List from '@/components/List.vue';
import ListItem from '@/components/ListItem.vue';
import { faN } from '@fortawesome/free-solid-svg-icons';
import { ref, computed, onBeforeMount, onBeforeUnmount } from 'vue';

const HourRange = [ 1, 24 ]

const Months = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const date = new Date()
const Sunday = new Date()
Sunday.setDate(date.getDate() - date.getDay())
const Hours = Array(HourRange[1] - HourRange[0] + 1).fill(undefined).map((_, i) => {
  date.setHours(i + HourRange[0], 0, 0)
  return date.toLocaleTimeString(undefined, {hour: 'numeric'})
})
const Saturday = new Date(Sunday)
Saturday.setDate(Sunday.getDate() + 6)

let week = ref<[{ date: Date, label: string }, { date: Date, label: string }]>([
  { date: Sunday, label: Sunday.toLocaleDateString(undefined, {month: 'short', day: '2-digit'}) },
  { date: Saturday, label: Saturday.toLocaleDateString(undefined, {month: 'short', day: '2-digit'}) }
])
interface DayInfo {
  users?: any,
  available: boolean,
  percentAvailable?: number
}
let prevDays = ref<DayInfo[][]>()
const USERS = [{"available": true, "id": "STEAM_1:0:49243767","name": "Jackzie ❤","avatarUrl": "http://localhost:8080/api/users/STEAM_1:0:49243767/avatar","choices": [1]},{"id": "STEAM_1:1:37698533","available": true, "name": "Butternut Crinklefries","avatarUrl": "http://localhost:8080/api/users/STEAM_1:1:37698533/avatar","choices": [1]},{"id": "STEAM_1:0:204230496","name": "The Liquor","avatarUrl": "http://localhost:8080/api/users/STEAM_1:0:204230496/avatar","choices": [2], "available": true, },{"available": false, "id": "STEAM_0:1:10882645","name": "Disgruntled Pea","avatarUrl": "http://localhost:8080/api/users/STEAM_0:1:10882645/avatar","choices": [2]},{"name": "Valerie", "avatarUrl": "http://localhost:8080/api/users/STEAM_0:1:437712426/avatar"},{name: "Ashley Golix❤", avatarUrl: "http://localhost:8080/api/users/STEAM_1:0:530680608/avatar"}]
const numUsers = USERS.length
function generateRandomUsers() {
  return USERS.map(user => { return {
    ...user,
    available: Math.random() > 0.5
  }})
  // we use + to convert to number, because TS doesn't like subtracting booleans, but it's valid
  // .sort((a, b) => +b.available - +a.available)
}
let availableDays = ref<boolean[]>(Array(7*24).fill(false))
let days = ref<DayInfo[][]>(Array(7).fill(undefined).map(() => Array(Hours.length).fill(undefined).map(h => {
  const users = generateRandomUsers()
  return {
    // users,
    // percentAvailable: users.reduce((prev, user) => prev + (user.available ? 1 : 0), 0) / numUsers,
    available: false
  }
})))

let hoveredElement = ref<[number, number]|undefined>()
let hoveredElementData = ref<any>()
let monthDates = ref<string[]>([])
let availableType = false
let startCoord = [0, 0]
let axis: number | undefined = undefined
let isDragging = false
function onMouseDown(event: any, pos: [number, number]) {
  if(days.value[pos[1]][pos[0]].percentAvailable) return
  isDragging = true
  availableType = !days.value[pos[1]][pos[0]].available
  startCoord = pos
  onMouseOver(event, pos)
}
function onMouseOver(event: any, pos: [number, number]) {
  if(days.value[pos[1]][pos[0]].percentAvailable) return
  if(isDragging && event.buttons == 1) {
    // Prevent dragging on different row or column:
    if(startCoord[0] != pos[0] && startCoord[1] != pos[1]) return
    // TODO: prevent returning back to startCoord and dragging different direction
    // if(axis && startCoord[axis] != pos[axis]) return
    // if(startCoord[0] == pos[0]) axis = 0
    // else if(startCoord[1] == pos[1]) axis = 1
    availableDays.value[pos[0] * 24 + pos[1]] = availableType
    days.value[pos[1]][pos[0]].available = availableType
    // TODO: improve thing and auto fill previous cells incase they get skipped
  } else {
    hoveredElement.value = pos
    hoveredElementData.value = {
      users: days.value[pos[1]][pos[0]].users
    }
  }
}
function bigint() {
  const binString = availableDays.value.map(a => a ? '1' : '0').join('')
  const int = BigInt(`0b${binString}`)
  int.toString(2) // back to binString
  int.toString() // for mysql storage
}
function onMouseUp(event: any) {
  if(event.buttons != 1 && isDragging) {
    isDragging = false;
  }
  hoveredElement.value = undefined
  hoveredElementData.value = undefined
}
function computeWeek() {
  week.value[0].label = week.value[0].date.toLocaleDateString(undefined, {month: 'short', day: '2-digit'})
  week.value[1].label = week.value[1].date.toLocaleDateString(undefined, {month: 'short', day: '2-digit'})
  monthDates.value = Array(7).fill(undefined).map((_, i) => {
    const d = new Date(week.value[0].date)
    d.setDate(Sunday.getDate() + i)
    return d.toLocaleDateString(undefined, {month: 'short', day: '2-digit'})
  })
}
function advanceWeek(forward: boolean) {
  let amount = forward ? 7 : -7;
  week.value[0].date.setDate(week.value[0].date.getDate() + amount)
  week.value[1].date.setDate(week.value[1].date.getDate() + amount)
  // Reset selected values
  prevDays.value = days.value.slice().map(a => a.slice())
  days.value = Array(7).fill(undefined).map(() => Array(Hours.length).fill(undefined).map(h => {
    return {
      percentAvailable: 0.0,
      available: false
    }
  }))
  computeWeek()
}
function copyPrev() {
  if(!prevDays.value) return
  days.value = prevDays.value.slice().map(a => a.slice())
  prevDays.value = undefined
}
onBeforeMount(() => {
  computeWeek()
  document.addEventListener("mouseup", onMouseUp)
})
onBeforeUnmount(() => {
  document.removeEventListener("mouseup", onMouseUp)
})
</script>

<style>
.cell {
  /* width: 100px; */
  height: 25px;
  user-select: none;
}
.cell:hover {
  outline: 2px solid #000;
  border-radius: 5px;
}
.available {
  background-color: green;
  color: white;
}
.unavailable {

}
.hover-box {
  position: absolute;
  margin-top: 20px;
}
</style>
