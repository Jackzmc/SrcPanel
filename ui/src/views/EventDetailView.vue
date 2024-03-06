<template>
  <div class="container is-fluid" v-if="scEvent">
    <!-- <div class="block mb-4">
      <router-link :to="{name: 'events', params: { id: null }}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to events list" /></router-link>
    </div> -->
    <div class="modal is-active" v-if="showingEditTutorial">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Editing Tutorial</p>
          <button class="delete" aria-label="close" @click="showingEditTutorial = false"></button>
        </header>
        <section class="modal-card-body">
          <h5 class="title is-5 is-underlined mb-1">Key</h5>
          <div class="example-cell available">Available</div>
          <div class="example-cell unavailable">Unavailable</div>
          <br>
          <p>
            Click on a cell to make it as available, and then you can drag sideways or up and down to mark multiple at once.
            Once you are done editing your availability, press the button again to submit your changes.
          </p>
          <br>
          <img src="/img/events-tutorial-optimized.gif">
        </section>
        <footer class="modal-card-foot">
          <button class="button" @click="showingEditTutorial = false">Dismiss</button>
        </footer>
      </div>
    </div>
    <router-link :data-tooltip="scEvent.creator.id" :to="{ name: 'manage-user', params: { id: scEvent.creator.id }, query: { returnTo: $route.fullPath }}">
      <figure class="image is-32x32 is-inline-block">
        <img class="is-rounded" :src="scEvent.creator.avatarUrl">
      </figure>
      <p class="is-inline is-size-5 mt-0 ml-1" style="top:-8px;position:relative">{{ scEvent.creator.name }}</p>
    </router-link>
    <h4 class="title is-4">
      <b>Event: </b>{{ scEvent.name }}
    </h4>
    <p class="subtitle">{{ scEvent.description }}</p>
    <div class="columns">
      <div class="column">
        <nav class="pagination is-rounded" role="navigation" aria-label="pagination">
          <ul class="pagination-list">
            <li><a class="pagination-link" aria-label="" :disabled="weekDirections[0]?undefined:true" @click="advanceWeek(false)"><Icon icon="fa-chevron-left"></Icon></a></li>
            <li><span class="mx-2">{{ weekLabels[0] }} - {{ weekLabels[1] }}</span></li>
            <li><a class="pagination-link" aria-label="" :disabled="weekDirections[1]?undefined:true" @click="advanceWeek(true)"><Icon icon="fa-chevron-right"></Icon></a></li>
          </ul>
        </nav>
      </div>
      <div class="column has-text-centered">
        <a class="button is-info" disabled v-if="editSubmitting">Submitting changes...</a>
        <a class="button is-info" v-else @click="toggleEditing">{{ editCurrentWeek ? 'Stop Editing' : 'Edit My Availability' }}</a>
      </div>
      <div class="column has-text-right">
        <a class="button is-rounded has-tooltip-left" @click="copyPrev" v-if="editPrevWeek" data-tooltip="Copies all your available times from the previous week to this week"><Icon icon="fa-copy">Copy From Previous Week</Icon></a>
      </div>
    </div>
    <table class="table is-fullwidth is-bordered is-narrow" @mouseleave="hoveredElement = undefined">
      <thead>
      <tr @mouseover="hoveredElement = undefined">
        <th style="border-bottom: 0; table-layout:fixed; max-width: 0;" v-for="(day, i) in dayLabels" :key="i" :data-tooltip="day[0]">{{ Days[i] }} <span class="is-pulled-right">{{ day[1] }}</span></th>
      </tr>
      </thead>
      <tbody style="user-select: none">
        <template v-for="(hourLabel, hour) in Hours" :key="hour">
          <tr>
            <td v-for="(_, day) in Days" :key="day"
              :class="['cell',{'available': userAvailability[day*24+hour], 'unavailable': !userAvailability[day*24+hour]}]"
              :style="selectedWeekAvailability && !isEditing ? {'background-color': `rgba(32, 128, 0, ${selectedWeekAvailability[day*24+hour]})`, 'color': selectedWeekAvailability[day*24+hour] > 0.5 ? 'white' : 'inherit'} : {}"
              @mouseover="e => onMouseOver(e, [day, hour])" @mousedown="e => onMouseDown(e, [day, hour])"
            >
              {{ hourLabel }}
              <span class="is-pulled-right" v-if="selectedWeekAvailability && !isEditing">{{ Math.round(selectedWeekAvailability[day*24+hour]*100)}}%</span>
              <div class="box hover-box px-0 py-0" v-if="!isEditing && hoveredElement && hoveredElement[0] == day && hoveredElement[1] == hour">
                <List>
                  <template v-for="(res, i) in selectedWeek?.availability" :key="i">
                    <div class="list-item py-1">
                      <div class="list-item-image">
                        <figure class="image is-32x32" :data-tooltip="res.user.name">
                          <img class="is-rounded" :style="{opacity: res.data[hoveredElement[0]*24+hoveredElement[1]] ? 1 : 0.25}" :src="res.user.avatarUrl">
                        </figure>
                      </div>
                      <div class="list-item-content">
                        <div :class="['list-item-title', {'has-text-grey-lighter': !res.data[hoveredElement[0]*24+hoveredElement[1]]}]">
                          {{ res.user.name }}
                          <Icon  v-if="res.data[hoveredElement[0]*24+hoveredElement[1]]" icon="fa-check-circle" class="is-pulled-right ml-2" style="color: hsl(141, 53%, 53%)"></Icon>
                          <!-- <span  class="tag is-success is-pulled-right ml-2">Available</span> -->
                        </div>
                      </div>
                    </div>
                  </template>
                </List>
              </div>
            </td>
          </tr>
          <tr v-if="hour == 11"><td style="border:0"></td></tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import List from '@/components/List.vue';
import { ref, computed, onBeforeMount, onBeforeUnmount, watch } from 'vue';
import { EventDataSubmission, APIEventDetailed, APIWeekAvailability } from '../../../common-types/Event';
import { useRoute, useRouter } from 'vue-router';
import { request } from '@/js/util.js'
import { PrivilegedUser } from '@/js/User.js';

const router = useRouter()
const route = useRoute()

const props = defineProps<{
  privUser: PrivilegedUser
}>()

const HourRange = [ 1, 24 ]

const Days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// Calculate this week's start and end timestamps
const date = new Date()
const CurrentSunday = new Date()
CurrentSunday.setDate(date.getDate() - date.getDay())
CurrentSunday.setHours(0, 0, 0, 0)
const CurrentSaturday = new Date(CurrentSunday)
CurrentSaturday.setDate(CurrentSunday.getDate() + 6)

const Hours = Array(HourRange[1] - HourRange[0] + 1).fill(undefined).map((_, i) => {
  date.setHours(i + HourRange[0], 0, 0, 0)
  return date.toLocaleTimeString(undefined, {hour: 'numeric'})
})


let scEvent = ref<APIEventDetailed<boolean[]>>()
let selectedWeek = ref<APIWeekAvailability<boolean[]>>()
let showingEditTutorial = ref(false)
// User submitted values:
let userAvailableWeeks = ref<Record<string, boolean[]>>()
let editCurrentWeek = ref<number>()
let editPrevWeek = ref<number>()
let editSubmitting = ref<boolean>(false)

const userAvailability = computed(() => {
  if(!editCurrentWeek.value || !userAvailableWeeks.value) return []
  return userAvailableWeeks.value[editCurrentWeek.value]
})

const isEditing = computed(() => {
  return editCurrentWeek.value != undefined
})

async function toggleEditing() {
  // While submitting, ignore any requests
  if(editSubmitting.value) return
  if(isEditing.value) {
    await submitEdit()
    editCurrentWeek.value = undefined
    editPrevWeek.value = undefined
  } else {
    if(!sessionStorage['events_tutorial_shown']) {
      showingEditTutorial.value = true
      sessionStorage['events_tutorial_shown'] = true
    }
    // TODO: show a popup introduction, only show first time
    if(!scEvent.value) return alert("No event has been loaded")
    if(!scEvent.value.range[0]) return alert("Event has no min_date, this should never happen")
    editCurrentWeek.value = scEvent.value.range[0]!
  }
}

/// float[] of percentages of users that are available for each day/hour
const selectedWeekAvailability = computed(() => {
  if(!selectedWeek.value) return
  const numUsers = selectedWeek.value.availability.length
  const sums = Array(24*7).fill(0)
  // Incase there's no users, can't divide by 0
  if(numUsers == 0) return sums
  for(let i = 0; i < sums.length; i++) {
    sums[i] += selectedWeek.value.availability.filter(a => a.data[i]).length
  }
  return sums.map(s => s / numUsers)
})
/// Computed week start and end and it's display
const weekLabels = computed(() => {
  if(!selectedWeek.value) return getWeekLabels(CurrentSunday, CurrentSaturday)
  const sunday = new Date(selectedWeek.value.startDate*1000)
  const saturday = new Date(selectedWeek.value.endDate*1000)
  return getWeekLabels(sunday, saturday)
})
const weekDirections = computed(() => {
  if(!scEvent.value || !selectedWeek.value) return [false, false]
  return [
    Boolean(selectedWeek.value.startDate !== scEvent.value.range[0]),
    Boolean(selectedWeek.value.endDate !== scEvent.value.range[1]),
  ]
})
function getWeekLabels(start: Date, end: Date) {
  return [ start, end ].map(date => {
    return date.toLocaleDateString(undefined, {month: 'long', day: 'numeric'})
  })
}

let hoveredElement = ref<[number, number]|undefined>()
let availableType = false
let startCoord = [0, 0]
let axis: number | undefined = undefined
let isDragging = false
function onMouseDown(event: any, pos: [number, number]) {
  if(!isEditing.value) return
  isDragging = true
  // TODO: reimplement
  availableType = !userAvailableWeeks.value![editCurrentWeek.value!.toString()][pos[0]*24+pos[1]]
  startCoord = pos
  onMouseOver(event, pos)
}
function onMouseOver(event: any, pos: [number, number]) {
  // if(days.value[pos[1]][pos[0]].percentAvailable) return
  if(isEditing.value) {
    if(isDragging && event.buttons == 1) {
      // Prevent dragging on different row or column:
      if(startCoord[0] != pos[0] && startCoord[1] != pos[1]) return
      // TODO: prevent returning back to startCoord and dragging different direction
      // if(axis && startCoord[axis] != pos[axis]) return
      // if(startCoord[0] == pos[0]) axis = 0
      // else if(startCoord[1] == pos[1]) axis = 1
      userAvailableWeeks.value![editCurrentWeek.value!.toString()][pos[0] * 24 + pos[1]] = availableType
      // days.value[pos[1]][pos[0]].available = availableType
      // TODO: improve thing and auto fill previous cells incase they get skipped
    }
  } else {
    hoveredElement.value = pos
  }
}
function onMouseUp(event: any) {
  if(event.buttons != 1 && isDragging) {
    isDragging = false;
    hoveredElement.value = undefined
  }
}

// Converts every 8 booleans into one byte where each bit is its value
function toBytes(array: boolean[]): Uint8Array {
  let bytes = [];
  for(let i = 0; i < array.length; i += 8) {
    let value = 0
    for(let bit = 0; bit < 8; bit++) {
      if(array[i+bit]) {
        value |= (1 << bit);
      }
    }
    bytes.push(value)
  }
  return new Uint8Array(bytes)
}
function fromBytes(bytes: Uint8Array): boolean[] {
  let array = []
  for(let i = 0; i < bytes.length; i++) {
    for(let bit = 0; bit < 8; bit++) {
        let bitValue = 1 << bit;
        array.push((bytes[i] & bitValue) == bitValue)
    }
  }
  return array
}
function serializeWeekData(array: boolean[]): string {
  //@ts-expect-error typescript does not like Uint8Array -> number[], but it's safe:
  return btoa(String.fromCharCode.apply(null, toBytes(array)))
}
function deserializeWeekData(base64: string): boolean[] {
  return fromBytes(new Uint8Array(atob(base64).split("").map(function(c) {
      return c.charCodeAt(0); })));
}
const dayLabels = computed(() => {
  const date = selectedWeek.value ? new Date(selectedWeek.value.startDate*1000) : CurrentSunday
  return Array(7).fill(undefined).map(() => {
    const ret = [
      new Date(date).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      date.toLocaleDateString(undefined, {month: 'numeric', day: '2-digit'})
    ]
    date.setDate(date.getDate() + 1)
    return ret
  })
})
function advanceWeek(forward: boolean) {
  if(!selectedWeek.value || !scEvent.value) return
  else if(!forward && !weekDirections.value[0]) return
  else if(forward && !weekDirections.value[1]) return
  let amount = forward ? 7 : -7;
  const nextDate = new Date(selectedWeek.value.startDate * 1000)
  nextDate.setDate(nextDate.getDate() + amount)
  let week = scEvent.value.weeks.find(w => (w.startDate*1000) === nextDate.valueOf())
  if(!week) {
    const endDate = new Date(nextDate)
    endDate.setDate(endDate.getDate() + 7 - 1)
    week = {
      startDate: Math.round(nextDate.valueOf() / 1000),
      endDate: Math.round(endDate.valueOf() / 1000),
      availability: []
    }
  }
  if(isEditing.value) {
    editPrevWeek.value = editCurrentWeek.value
    editCurrentWeek.value = week.startDate
    if(!userAvailableWeeks.value![editCurrentWeek.value.toString()]) {
      userAvailableWeeks.value![editCurrentWeek.value.toString()] = Array(24*7).fill(false)
    }
  }
  selectedWeek.value = week
}
function copyPrev() {
  if(!editPrevWeek.value || !userAvailableWeeks.value) return
  userAvailableWeeks.value[editCurrentWeek.value!.toString()] = userAvailableWeeks.value[editPrevWeek.value.toString()]
  editPrevWeek.value = undefined
}

async function submitEdit() {
  if(!userAvailableWeeks.value || editSubmitting.value || !scEvent.value) return
  editSubmitting.value = true
  const response = await request(`/api/events/${scEvent.value.id}/my-schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      weeks: Object.entries(userAvailableWeeks.value).map(([startDate, data]) => {
        return {
          startDate: parseInt(startDate),
          data: serializeWeekData(data)
        }
      })
    } as EventDataSubmission<string>)
  }, { title: "Updating availability" })
  if(response?.ok) {
    // Lazy way to get updated data
    await fetchEvent()
  }
  editSubmitting.value = false
}
async function fetchEvent() {
  const response = await fetch(`/api/events/${route.params.id}`)
  if(response.ok) {
    userAvailableWeeks.value = undefined
    const json: APIEventDetailed<string> = await response.json()
    scEvent.value = {
      ...json,
      weeks: json.weeks.map(w => {
        return {
          ...w,
          availability: w.availability.map(av => {
            return {
              ...av,
              data: deserializeWeekData(av.data)
            }
          })
        }
      })
    }
    selectedWeek.value = scEvent.value.weeks[0]
    // Fill out default data for first selected week
    userAvailableWeeks.value = {[selectedWeek.value.startDate!.toString()]: Array(24*7).fill(false)}
    for(const week of scEvent.value.weeks) {
      const myAvailability = week.availability.find(av => av.user.id === props.privUser.id)
      if(myAvailability)
        userAvailableWeeks.value[week.startDate.toString()] = myAvailability.data
    }
  }
}
onBeforeMount(async() => {
  document.addEventListener("mouseup", onMouseUp)

  await fetchEvent()

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
  /* border-radius: 5px; */
  padding-left: 15px;
  padding-right: 15px;
  box-shadow: 2px 5px 8px #000;
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
.example-cell {
  width: 20%;
  padding: 4px 2px 2px 1rem;
  border: 1px solid #000;
}
</style>
