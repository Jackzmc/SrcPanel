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
            :class="['cell',{'available': hours[i], 'unavailable': !hours[i]}]"
            @mouseover="e => onMouseOver(e, [i, j])" @mousedown="e => onMouseDown(e, [i, j])"
          >
            {{ hour }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from 'vue';

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


let monthDates = ref<string[]>([])
let availableType = false
let startCoord = [0, 0]
let axis: number | undefined = undefined
function onMouseDown(event: any, pos: [number, number]) {
  availableType = !days.value[pos[1]][pos[0]]
  startCoord = pos
  onMouseOver(event, pos)
}
function onMouseOver(event: any, pos: [number, number]) {
  if(event.buttons == 1) {
    // Prevent dragging on different row or column:
    if(startCoord[0] != pos[0] && startCoord[1] != pos[1]) return
    console.log(`start=[${startCoord[0]}, ${startCoord[1]}], pos=[${pos[0]}, ${pos[1]}]`)
    // TODO: prevent returning back to startCoord and dragging different direction
    // if(axis && startCoord[axis] != pos[axis]) return
    // if(startCoord[0] == pos[0]) axis = 0
    // else if(startCoord[1] == pos[1]) axis = 1
    days.value[pos[1]][pos[0]] = availableType
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
onBeforeMount(() => {
  computeWeek()
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
</style>
