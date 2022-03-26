<template>
  <div class="modal is-active" v-if="ban&&edited">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title"><b>{{ban.client.name}}</b> <span class="is-pulled-right">{{ban.client.id}}</span></p>&nbsp;&nbsp;
      </header>
      <section class="modal-card-body">
        <div class="tabs">
          <ul>
            <li :class="{'is-active': tab == 0}" @click="setTab(0)"><a>Review</a></li>
            <li :class="{'is-active': tab == 1}" @click="setTab(1)"><a>Appeals</a></li>
            <li :class="{'is-active': tab == 2}" @click="setTab(2)"><a>Notes</a></li>
            <li :class="{'is-active': tab == 3}" @click="setTab(3)"><a>Info</a></li>
          </ul>
        </div>
        <template v-if="tab == 0">
        <div class="columns is-multiline">
          <div class="column is-2">
            <div class="field">
              <label class="label">ID</label>
              <p>{{ban.id}}</p>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">IP</label>
              <p v-if="ban.ip">{{ban.ip}}</p>
              <em v-else>(no ip recorded)</em>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Country</label>
              <p v-if="ban.country">{{ban.country}}</p>
              <em v-else>unknown</em>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Join Attempts</label>
              <p>{{ban.joinAttempts}}</p>
            </div>
          </div>
        </div>

        <div class="columns">
          <div class="column is-8">
            <div class="field">
              <label class="label">Banned By</label>
              <input v-if="executorEdit.active" v-model="executorEdit.edit" class="input" type="text" @blur='onExEditBlur' />
              <span v-else @click='executorEdit.active = true'>
                <p>{{ban.executor.name}}</p>
                ({{ban.executor.id}})
              </span>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Timestamp</label>
              <p>{{formatTime(ban.timestamp)}}</p>
              <em>about {{ban.relDate}}</em>
            </div>
          </div>

        </div>

        <div class="field">
          <label class="label">Private Reason</label>
          <div class="control">
            <textarea
              v-model="edited.reason"
              class="textarea has-fixed-size"
              placeholder="Enter a reason for this ban (only shown to admins)"
              maxlength="128"
              rows=1
              ></textarea>
          </div>
        </div>
        <div class="field">
          <label class="label">Shown Reason</label>
          <div class="control">
            <textarea
              v-model="edited.publicReason"
              class="textarea has-fixed-size"
              placeholder="Enter a reason for this ban (shown to target)"
              maxlength="250"
              rows=1
              ></textarea>
          </div>
          <p class="help">If no public reason is given, it will default to the private reason</p>
        </div>
        <div class="columns">
          <div class="column">
            <div class="field">
              <label class="label">Flags</label>
              <div class="control">
                <div class="select is-multiple">
                  <select multiple size="2" v-model="flags.edited" @change="changed = true">
                    <option value="1">IP Banned</option>
                    <option value="2">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Expires</label>
              <div class="control">
                <div class="select">
                  <select v-model="edited.expires">
                    <option value="never" v-if="ban.expires">Never</option>
                    <option value="keep">Don't Change</option>
                    <option value="1hour">1 Hour</option>
                    <option value="1day">1 Day</option>
                    <option value="1day">1 Day</option>
                    <option value="1week">1 Week</option>
                    <option value="1month">1 Month</option>
                  </select>
                </div>
              </div>
              <p class="help has-text-danger" v-if="ban.expired">Ban is currently expired</p>
              <p class="help" v-else-if="ban.expires">Will expire on {{formatTime(ban.expires)}}</p>
              <p class="help" v-else>Ban will not currently expire.</p>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Danger Zone</label>
              <div class="control">
                <a class="button is-danger" @click='deleteBan'>Remove Ban Record</a>
              </div>
              <p class="help has-text-danger">This will remove the ban from the records, suspending is recommended instead</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="tab == 1">
        <div class="container has-text-centered" v-if="appeals.state == 0">
          <br>
          <p>Fetching appeals... please wait</p>
          <br>
        </div>
        <template v-else-if="appeals.state == 1">
          <div class="container has-text-centered" v-if="appeals.list.length == 0">
            <br>
            <p>User has not submitted any appeals.</p>
            <br>
          </div>
          <div class="box" v-for="appeal in appeals.list" :key="appeal.id">
            <h5 class="title is-5">Appeal #{{appeal.id}}</h5>
            <p class="subtitle is-6">Submitted {{formatTime(appeal.created)}}</p>
            <article class="message">
              <div class="message-body">
                {{appeal.message}}
              </div>
            </article>
            <div class="buttons" v-if="appeal.state == 0">
              <a :class="['button','is-success',{'is-loading': loading}]" @click='setAppealState(appeal, true)'>Approve</a>
              <a :class="['button','is-danger',{'is-loading': loading}]" @click='setAppealState(appeal, false)'>Reject</a>
            </div>
            <div v-else-if="appeal.state == 1">
              <p class="has-text-success">Appeal was approved</p>
            </div>
            <div v-else-if="appeal.state == 2">
              <p class="has-text-danger"><b>Appeal was rejected: </b></p>
              <p class="has-text-danger">{{appeal.reject_reason}}</p>
            </div>
          </div>
        </template>
      </template>

      <template v-else-if="tab == 2">
        <div class="container has-text-centered" v-if="notes.state == 0">
          <br>
          <p>Fetching notes... please wait</p>
          <br>
        </div>
        <template v-else-if="notes.state == 1">
          <div class="container has-text-centered" v-if="notes.list.length == 0">
            <br>
            <p>User has no attached notes.</p>
            <!-- <p><a>Add a new note</a></p> -->
            <br>
          </div>
          <div class="box" v-for="note in notes.list" :key="note.id">
            <h6 class="title is-6">#{{note.id}}: {{note.markedBy.name}} ({{note.markedBy.id}})</h6>

            "{{note.content}}"
          </div>
        </template>
      </template>

      <template v-else-if="tab == 3">
        <div class="container has-text-centered" v-if="!info">
          <br>
          <p>Fetching player statistics... please wait</p>
          <br>
        </div>
        <div class="container has-text-centered" v-else>
          <div class="columns">
            <div class="column">
              <label class="label">Friendly Fires</label>
              <p>{{info.survivor_ff}}</p>
            </div>
            <div class="column">
              <label class="label">Self Heals</label>
              <p>{{info.heal_self}}</p>
            </div>
            <div class="column">
              <label class="label">Heals (Other)</label>
              <p>{{info.heal_others}}</p>
            </div>
            <div class="column">
              <label class="label">Hours Played</label>
              <p>{{Math.round(info.minutes_played - info.minutes_idle / 60)}}</p>
            </div>
            <div class="column">
              <label class="label">Team kills</label>
              <p>{{info.ff_kills}}</p>
            </div>
          </div>

        </div>

        <br>

        <ul class="content is-medium">
          <li><a :href="'https://stats.jackz.me/user/' + ban.steamid" target="_blank">Stats Profile</a></li>
          <li><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></li>
          <li><a :href="'?client=' + ban.steamid + '#logs'" target="_blank">View Logs</a></li>
        </ul>
      </template>

      </section>
      <footer class="modal-card-foot" v-if="tab == 0">
        <button :disabled="!changed" :class="['button','is-success',{'is-loading': loading, 'disabled': !changed}]" @click="save">Save changes</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
      <footer class="modal-card-foot" v-else-if="tab == 1 || tab == 2 || tab == 3">
        <button :disabled="loading" :class="['button',{'disabled': loading}]" @click="cancel">Done</button>
      </footer>
    </div>
  </div>
</template>

<script>
import SteamID from 'steamid'
export default {
  props: ['ban', 'auth'],
  data() {
    return {
      tab: 0,
      edited: null,
      error: null,
      changed: false,
      flags: {
        original: [],
        edited: []
      },
      loading: false,
      appeals: {
        list: [],
        state: 0
      },
      notes: {
        list: [],
        state: 0
      },
      executorEdit: {
        active: false,
        edit: null
      },
      info: null
    }
  },
  watch: {
    edited: {
      handler(val) {
        if(this.changed) return
        this.changed = this.ban.reason !== val.reason
          || this.ban.publicReason !== val.publicReason
          || this.ban.executor.id !== this.executorEdit.edit.id
          || this.flags.original.length !== this.flags.edited.length
          || val.expires !== "keep"
      },
      deep: true
    },
    ban() {
      this.init()
    }
  },
  created() {
    this.init()
  },
  computed: {
    steamid64() {
      if(!this.ban) return null
      return new SteamID(this.ban.steamid).getSteamID64()
    }
  },
  methods: {
    init() {
      this.error = null
      if(this.ban) {
        this.edited = Object.assign({}, this.ban)
        this.edited.expires = 'keep'
        this.flags.original = []
        for(const i of [1,2,4]) {
          if(this.ban.flags & i) this.flags.original.push(i.toString())
        }
        this.executorEdit.edit = this.ban.executor
        this.flags.edited = [...this.flags.original]
        this.appeals.list = []
        this.appeals.state = 0
        this.changed = false
        this.info = null
        this.setTab(0)
      }
    },
    onExEditBlur() {
      if(this.ban.executor.id === this.executorEdit.edit.id) {
        this.executorEdit.active = false
      }
    },
    async setAppealState(appeal, approved) {
      this.loading = true
      let rejectReason
      if(!approved) {
        rejectReason = prompt("Enter the reason for rejecting:")
        if(!rejectReason) return
      }
      const state = approved ? 1 : 2
      let query = `?id=${appeal.id}&state=${state}`
      if(rejectReason) query += `&reject_reason=${rejectReason}`
      const response = await fetch(`https://jackz.me/l4d2/appeal/appeal.php${query}`, {
        method: 'PUT',
      })
      if(response.ok) {
        this.loading = false
        this.fetchAppeals()
        if(approved) {
          this.edited.flags |= 2
          this.flags.edited.push(2)
        }
      } else {
        this.appeals.state = 2
        alert("Could not update the status of the appeal: " + await response.text())
        return null
      }
    },
    setTab(index) {
      this.tab = index
      switch(index) {
        case 1: {
          if(this.ban.appeals == 0) this.appeals.state = 1
          else if(this.appeals.state === 0) this.fetchAppeals()
          break
        }
        case 2: {
          if(this.ban.notes == 0) this.notes.state = 1
          else if(this.notes.state === 0) this.fetchNotes()
          break
        }
        case 3: {
          if(!this.info) this.fetchInfo()
        }
      }
    },
    async fetchInfo() {
      const response = await fetch(`https://stats.jackz.me/api/user/${this.ban.steamid}`)
      if(response.ok) {
        const json = await response.json()
        this.info = json.user
      } else {
        alert("Could not fetch user statistics: " + await response.text())
      }
    },
    async fetchAppeals() {
      const response = await fetch(`https://jackz.me/l4d2/appeal/appeal.php?id=${this.ban.id}`)
      if(response.ok) {
          const json = await response.json()
          this.appeals.list = json.appeals
          this.appeals.state = 1
      } else {
        this.appeals.state = 2
        alert("Could not fetch appeals: " + await response.text())
        return null
      }
    },
    async fetchNotes() {
      const response = await fetch(`/api/notes/user/${this.ban.client.id}`)
      if(response.ok) {
          const json = await response.json()
          this.notes.list = json.notes
          this.notes.state = 1
      } else {
        this.notes.state = 2
        alert("Could not fetch notes: " + await response.text())
        return null
      }
    },
    formatTime(time) {
      const date = new Date(time*1000)
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
    },
    deleteBan() {
      if(window.confirm("Are you sure you want to remove this ban from the records? This should only be done if mistakes were made when banning them. Recommend to suspend the ban instead.")) {
        fetch(`/api/bans/${ban.steamid}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
        .then(async(response) => {
          if(response.ok) {
            this.cancel()
            alert("Ban was successfully removed")
          } else
            this.error = await response.text()
        })
        .catch(err => {
          this.error = err.message
        })
      }
    },
    save() {
      this.loading = true
      const expires = getExpires(this.edited, this.ban)
      const flags = this.flags.edited.reduce((pv, cv) => pv + Number(cv), 0)
      fetch(`/api/bans/${this.ban.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          steamid: this.edited.steamid,
          reason: this.edited.reason,
          executor: this.executorEdit.edit,
          public_message: this.edited.public_message,
          expires,
          flags
        })
      })
      .then(async(response) => {
        if(response.ok)
          this.$emit('edit', {
            ...this.edited,
            flags
          })
        else
          this.error = (await response.json()).error
        this.loading = false
      })
      .catch(err => {
        this.error = err.message
        this.loading = false
      })
    },
    cancel() {
      this.$emit('edit', null)
    }
  },
}

function getExpires(edited, ban) {
  const baseDate = new Date().valueOf()

  if(edited.expires === "keep") return null
  else if(edited.expires === "never") return "never"
  else if(edited.expires === "1hour") {
    return (baseDate + 3.6e+6) / 1000
  }else if(edited.expires === "1day") {
    return (baseDate + 8.64e+7) / 1000
  }else if(edited.expires === "1week") {
    return (baseDate + 6.048e+8) / 1000
  } else if(edited.expires === "1month") {
    return (baseDate + 2629800000) / 1000
  } else {
    alert('Could not save unknown value: ' + edited.expires)
    return null
  }
}

</script>

