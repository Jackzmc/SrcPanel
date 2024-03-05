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
    <table class="table is-fullwidth is-bordered">
      <thead>
      <tr>
        <th style="border-bottom: 0" v-for="(month, i) in Months" :key="month">{{ month }} ({{ monthDates[i] }})</th>
      </tr>
      </thead>
      <tbody style="user-select: none">
        <tr v-for="(hour, i) in Hours" :key="hour">
          <td v-for="(hours, j) in days" :key="j"
            :class="['cell',{'available': hours[i], 'unavailable': !hours[i], 'hovered': hoveredElement && hoveredElement[0] == i && hoveredElement[1] == j}]"
            @mouseover="e => onMouseOver(e, [i, j])" @mousedown="e => onMouseDown(e, [i, j])"
          >
            {{ hour }}
            <div class="box hover-box px-0 py-0" v-if="hoveredElement && hoveredElement[0] == i && hoveredElement[1] == j">
              <List v-if="hoveredElementData">
                <div class="list-item py-1" v-for="user in hoveredElementData.users" :key="user">
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
let prevDays = ref<boolean[][]>()
let days = ref<boolean[][]>(Array(7).fill(undefined).map(() => Array(Hours.length).fill(undefined).map(h => false)))

let hoveredElement = ref<[number, number]>([0, 0])
let hoveredElementData = ref<any>()
let monthDates = ref<string[]>([])
let availableType = false
let startCoord = [0, 0]
let axis: number | undefined = undefined
let isDragging = false
function onMouseDown(event: any, pos: [number, number]) {
  isDragging = true
  availableType = !days.value[pos[1]][pos[0]]
  startCoord = pos
  onMouseOver(event, pos)
}
function onMouseOver(event: any, pos: [number, number]) {
  if(isDragging && event.buttons == 1) {
    // Prevent dragging on different row or column:
    if(startCoord[0] != pos[0] && startCoord[1] != pos[1]) return
    console.log(`start=[${startCoord[0]}, ${startCoord[1]}], pos=[${pos[0]}, ${pos[1]}]`)
    // TODO: prevent returning back to startCoord and dragging different direction
    // if(axis && startCoord[axis] != pos[axis]) return
    // if(startCoord[0] == pos[0]) axis = 0
    // else if(startCoord[1] == pos[1]) axis = 1
    days.value[pos[1]][pos[0]] = availableType
  } else {
    hoveredElement.value = pos
    hoveredElementData.value = {
      users: [{"available": true, "id": "STEAM_1:0:49243767","name": "Jackzie ❤","avatarUrl": "http://localhost:8080/api/users/STEAM_1:0:49243767/avatar","choices": [1]},{"id": "STEAM_1:1:37698533","available": true, "name": "Butternut Crinklefries","avatarUrl": "http://localhost:8080/api/users/STEAM_1:1:37698533/avatar","choices": [1]},{"id": "STEAM_1:0:204230496","name": "The Liquor","avatarUrl": "http://localhost:8080/api/users/STEAM_1:0:204230496/avatar","choices": [2], "available": true, },{"available": false, "id": "STEAM_0:1:10882645","name": "Disgruntled Pea","avatarUrl": "http://localhost:8080/api/users/STEAM_0:1:10882645/avatar","choices": [2]}]
    }
  }

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
  days.value = Array(7).fill(undefined).map(() => Array(Hours.length).fill(undefined).map(h => false))
  computeWeek()
}
function copyPrev() {
  if(!prevDays.value) return
  days.value = prevDays.value.slice().map(a => a.slice())
  prevDays.value = undefined
}
function onMouseUp(event: any) {
  if(event.buttons != 1 && isDragging) {
    isDragging = false;
  }
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
.available {
  background-color: green;
  color: white;
}
.unavailable {
}
.hovered:not(.available) {
  background-color: lightgray;
}
.hovered.available {
  background-color: lightgreen;
}
.hover-box {
  position: absolute;
  margin-top: 20px;
}
</style>
