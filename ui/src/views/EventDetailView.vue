<template>
<div>
  <div v-if="scEvent" class="container is-fluid">
    <!-- <div class="block mb-4">
      <router-link :to="{name: 'events', params: { id: null }}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to events list" /></router-link>
    </div> -->
    <div v-if="showingEditTutorial" class="modal is-active">
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
    <div class="columns">
      <div class="column is-4 has-text-left">
        <h4 class="title is-4">
          <b>Event: </b>{{ scEvent.name }}
        </h4>
        <p class="subtitle">{{ scEvent.description }}</p>
      </div>
      <div class="column is-4 has-text-centered">
        <h6 class="title is-6 mb-2">Respondants</h6>
        <UserComponent v-for="user in respondedUsers" :key="user.id" :user="user" hide-name />
        <!-- <img v-for="user in respondedUsers" :key="user.id" :src="user.avatarUrl" /> -->
      </div>
      <div class="column is-4 has-text-right">
        <h6 class="title is-6 mb-2">Event Creator</h6>
        <router-link :data-tooltip="scEvent.creator.id"
          :to="{ name: 'manage-user', params: { id: scEvent.creator.id }, query: { returnTo: $route.fullPath }}">
          <figure class="image is-32x32 is-inline-block">
            <img class="is-rounded" :src="scEvent.creator.avatarUrl">
          </figure>
          <p class="is-inline is-size-5 mt-0 ml-1" style="top:-8px;position:relative">{{ scEvent.creator.name }}</p>
        </router-link>
      </div>

    </div>


    <div class="columns">
      <div class="column">
        <nav class="pagination is-rounded" role="navigation" aria-label="pagination">
          <ul class="pagination-list">
            <li><a class="pagination-link" data-tooltip="Advance to previous week" aria-label="Advance to previous week" :disabled="weekDirections[0]?undefined:true" @click="advanceWeek(false)"><Icon icon="fa-chevron-left"></Icon></a></li>
            <li><span class="mx-2">{{ weekRangeLabels[0] }} - {{ weekRangeLabels[1] }}</span></li>
            <li><a class="pagination-link" data-tooltip="Advance to next week" aria-label="Advance to next week" :disabled="weekDirections[1]?undefined:true" @click="advanceWeek(true)"><Icon icon="fa-chevron-right"></Icon></a></li>
          </ul>
        </nav>
      </div>
      <div class="column has-text-centered">
        <a v-if="editSubmitting" class="button is-info" disabled>Submitting changes...</a>
        <a v-else class="button is-info" @click="toggleEditing">{{ editCurrentWeek ? 'Stop Editing' : 'Edit My Availability' }}</a>
      </div>
      <div class="column has-text-right">
        <a v-if="editPrevWeek" class="button is-rounded has-tooltip-left" data-tooltip="Copies all your available times from the previous week to this week" @click="copyPrev"><Icon icon="fa-copy">Copy From Previous Week</Icon></a>
      </div>
    </div>
    <table class="table is-fullwidth is-bordered is-narrow" @mouseleave="hoveredElement = undefined">
      <thead>
      <tr @mouseover="hoveredElement = undefined">
        <th v-for="(day, i) in dayLabels" :key="i" :class="{'disabled': !dayLabels[i][2]}" :data-tooltip="day[0]">
          {{ Days[i] }} <span class="is-pulled-right">{{ day[1] }}</span>
        </th>
      </tr>
      </thead>
      <tbody style="user-select: none">
        <template v-for="(hourData, hour) in Hours" :key="hour">
          <tr v-if="hourData.visible">
            <!--(un)available classes used for editing. style is used for display -->
            <td v-for="(_, day) in Days" :key="day"
              :class="['cell',{'available': userAvailability[day*24+hour], 'unavailable': !userAvailability[day*24+hour], 'disabled': !dayLabels[day][2] }]"
              :style="availabilityPercents && !isEditing ? {'background-color': `rgba(32, 128, 0, ${availabilityPercents[day*24+hour]})`, 'color': availabilityPercents[day*24+hour] > 0.5 ? 'white' : 'inherit'} : {}"
              @mouseover="e => onMouseOver(e, [day, hour])" @mousedown="e => onMouseDown(e, [day, hour])"
            >
              {{ hourData.label }}
              <span v-if="availabilityPercents && !isEditing" class="is-pulled-right">{{ Math.round(availabilityPercents[day*24+hour]*100) }}%</span>
              <!-- On hover popup: -->
              <div v-if="!isEditing && hoveredElement && hoveredElement[0] == day && hoveredElement[1] == hour" class="box hover-box px-0 py-0">
                <h6 class="title is-6 px-4 pt-2 mb-2">Availabilities:</h6>
                <List>
                  <template v-for="(res, i) in selectedWeek?.availability" :key="i">
                    <div class="list-item py-1">
                      <div class="list-item-image">
                        <figure class="image is-32x32" :data-tooltip="res.user.name">
                          <img class="is-rounded" :style="{opacity: res.data[hoveredElement[0]*24+hoveredElement[1]] ? 1 : 0.25}" :src="res.user.avatarUrl">
                        </figure>
                      </div>
                      <div class="list-item-content">
                        <div :class="['list-item-title', {'has-text-grey-lighter': !res.data[hoveredElement[0]*24+hoveredElement[1]]}]" style="font-weight:normal !important">
                          {{ res.user.name }}
                          <Icon v-if="res.data[hoveredElement[0]*24+hoveredElement[1]]" icon="fa-check-circle" class="is-pulled-right ml-2" style="color: hsl(141, 53%, 53%)"></Icon>
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
  <div v-else-if="error" class="container">
    <article class="message is-danger">
      <div class="message-header">
        <p><Icon icon="fa-exclamation-triangle">Error</Icon></p>
      </div>
      <div class="message-body is-size-4">
        {{ error }}
      </div>
    </article>
  </div>
  <div v-else class="container">
    <div class="box has-text-centered is-size-4">
      <Icon icon="fa-spinner" spin>Fetching event</Icon>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import List from '@/components/List.vue';
import { ref, computed, onBeforeMount, onBeforeUnmount, watch, onMounted } from 'vue';
import { EventDataSubmission, APIEventDetailed, APIWeekAvailability } from '../../../common-types/Event';
import { useRoute, useRouter } from 'vue-router';
import { request } from '@/js/util.js'
import { PrivilegedUser } from '@/js/User.js';
import { APIUser } from '../../../common-types/User.js';
import UserComponent from '@/components/UserComponent.vue';

const router = useRouter()
const route = useRoute()

const props = defineProps<{
  privUser: PrivilegedUser
}>()

const Days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// Calculate this week's start and end timestamps
const date = new Date()
const CurrentSunday = new Date()
CurrentSunday.setDate(date.getDate() - date.getDay())
CurrentSunday.setHours(0, 0, 0, 0)
const CurrentSaturday = new Date(CurrentSunday)
CurrentSaturday.setDate(CurrentSunday.getDate() + 6)

const Hours = computed(() => {
  return Array(24).fill(undefined).map((_, i) => {
    // if(i % 2) date.setMinutes(30)
    // else date.setHours(i + 1, 0, 0, 0)
    date.setHours(i + 1, 0, 0, 0)
    return {
      label: date.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'}),
      visible: !scEvent.value || (i >= scEvent.value.hourRange[0] && i <= scEvent.value.hourRange[1])
    }
  })

})


let scEvent = ref<APIEventDetailed<boolean[]>>()
let error = ref<string>()
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

const respondedUsers = computed(() => {
  if(!scEvent.value) return []
  const users = new Map<string, APIUser>()
  for(const week of scEvent.value.weeks) {
    for(const entry of week.availability) {
      if(!users.has(entry.user.id)) {
        users.set(entry.user.id, Object.assign({}, entry.user))
      }
    }
  }
  return users.values()
})

async function toggleEditing() {
  // While submitting, ignore any requests
  if(editSubmitting.value) return
  if(isEditing.value) {
    await submitEdit()
    editCurrentWeek.value = undefined
    editPrevWeek.value = undefined
  } else {
    if(!localStorage['events_tutorial_shown']) {
      showingEditTutorial.value = true
      localStorage['events_tutorial_shown'] = true
    }
    // TODO: show a popup introduction, only show first time
    if(!scEvent.value) return alert("No event has been loaded")
    if(!scEvent.value.range[0]) return alert("Event has no min_date, this should never happen")
    editCurrentWeek.value = selectedWeek.value!.startDate
  }
}

/// float[] of percentages of users that are available for each day/hour
const availabilityPercents = computed(() => {
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
const weekRangeLabels = computed(() => {
  if(!selectedWeek.value) return getWeekLabels(CurrentSunday, CurrentSaturday)
  const sunday = new Date(selectedWeek.value.startDate*1000)
  const saturday = new Date(selectedWeek.value.endDate*1000)
  return getWeekLabels(sunday, saturday)
})
/// Determines if you can go backwards or forward
const weekDirections = computed(() => {
  if(!scEvent.value || !selectedWeek.value) return [false, false]
  return [
    Boolean(selectedWeek.value.startDate !== scEvent.value.range[0] && selectedWeek.value.startDate*1000 >= CurrentSunday.valueOf()),
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
  if(!dayLabels.value[pos[0]][2]) {
    hoveredElement.value = undefined
    return
  }
  if(isEditing.value) {
    if(isDragging && event.buttons == 1) {
      // Prevent dragging on different row or column:
      if(startCoord[0] != pos[0] && startCoord[1] != pos[1]) return
      // Prevent dragging on days that are disabled (in the past)
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array(7).fill(undefined).map(() => {
    const ret = [
      date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      date.toLocaleDateString(undefined, {month: 'numeric', day: '2-digit'}),
      Boolean(date.valueOf() >= today.valueOf())
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
  userAvailableWeeks.value[editCurrentWeek.value!.toString()] = userAvailableWeeks.value[editPrevWeek.value.toString()].slice()
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
    selectedWeek.value = scEvent.value.weeks.find(w => w.startDate*1000 >= CurrentSunday.valueOf())
    if(!selectedWeek.value) {
      selectedWeek.value = {
        startDate: Math.round(CurrentSunday.valueOf() / 1000),
        endDate: Math.round(CurrentSaturday.valueOf() / 1000),
        availability: []
      }
    }
    // Fill out default data for first selected week
    userAvailableWeeks.value = {[selectedWeek.value.startDate!.toString()]: Array(24*7).fill(false)}
    for(const week of scEvent.value.weeks) {
      const myAvailability = week.availability.find(av => av.user.id === props.privUser.id)
      if(myAvailability) {
        userAvailableWeeks.value[week.startDate.toString()] = myAvailability.data.slice()
      }
    }
  } else {
    if(response.headers.get('content-type')?.includes("application/json")) {
      const json = await response.json()
      error.value = json.message ?? json.error
    } else {
      error.value = response.statusText
    }
  }
}
onMounted(async() => {
  document.addEventListener("mouseup", onMouseUp)

  await fetchEvent()

})
onBeforeUnmount(() => {
  document.removeEventListener("mouseup", onMouseUp)
})
</script>

<style scoped>
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

.hover-box {
  position: absolute;
  margin-top: 20px;
  opacity: 100%;
}
.example-cell {
  width: 20%;
  padding: 4px 2px 2px 1rem;
  border: 1px solid #000;
}
th {
  border-bottom: 0;
  table-layout:fixed;
  max-width: 0;
}
td.disabled {
  opacity: 0.3;
}
</style>
