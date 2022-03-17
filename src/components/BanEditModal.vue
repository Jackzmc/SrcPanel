<template>
  <div class="modal is-active" v-if="ban&&edited">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Edit ban for <b>{{ban.last_alias}}</b> ({{ban.steamid}})</p>
        <button class="delete" aria-label="close"></button>
      </header>
      <section class="modal-card-body">

        <div class="columns">
          <div class="column">
            <div class="field">
              <label class="label">Banned By</label>
              <component :is="ban.executor.startsWith('STEAM_') ? 'a':'em'" :href="'https://stats.jackz.me/user/' + ban.executor">
                {{ban.adminName}} ({{ban.executor}})
              </component>
            </div>
          </div>

          <div class="column">
            <div class="field">
              <label class="label">Timestamp</label>
              <p>{{formatTime(ban.timestamp)}}</p>
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
              v-model="edited.public_message"
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
                  <select multiple size="2" v-model="flags">
                    <option value="1">IP Banned</option>
                    <option value="2">Suspended (inactive)</option>
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
            </div>
          </div>
        </div>




      </section>
      <footer class="modal-card-foot">
        <button :class="['button','is-success',{'is-loading': loading}]" @click="save">Save changes</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  props: ['ban', 'auth'],
  data() {
    return {
      edited: null,
      error: null,
      changed: false,
      flags: [],
      loading: false
    }
  },
  watch: {
    edited: {
      handler(val) {
        if(this.changed) return
        this.changed = this.ban.reason !== this.edited.reason
          || this.ban.executor !== this.edited.executor
          || this.ban.expires !== "keep"
      },
      deep: true
    },
    ban() {
      this.error = null
      this.changed = false
      if(this.ban) {
        this.edited = this.ban
        for(const i of [1,2,4]) {
          if(this.ban.flags & i) this.flags.push(i.toString())
        }
      }
    }
  },
  methods: {
    formatTime(time) {
      const date = new Date(time)
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
    },
    save() {
      this.loading = true
      const expires = getExpires(this.edited, this.ban)
      const flags = this.flags.reduce((pv, cv) => pv + Number(cv), 0)
      fetch(`https://jackz.me/l4d2/scripts/bans.php?mode=update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-APIKEY': this.auth.password
        },
        body: JSON.stringify({
          steamid: this.edited.steamid,
          reason: this.edited.reason,
          executor: this.edited.executor,
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

