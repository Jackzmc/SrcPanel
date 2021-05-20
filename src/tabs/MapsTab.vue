<template>
<div>
  <div class="container" v-if="key">
    <div class="columns">
      <div class="column is-8">
        <div class="content">
          <b>Listing {{vpks.length}} workshop items - Click a name to view information</b>
          <div class="columns is-multiline">
            <div class="column is-4" v-for="entry in vpks" :key="entry.vpk">
              <b><a @click='preview(entry)' class="has-text-info">{{entry.display}}</a></b>
              <br>
              <a v-if="entry.url" :href="entry.url"><em>View on workshop</em></a>
            </div>
          </div>
        </div>
      </div>
      <div class="column" v-if="ready">
        <p class="has-text-danger" v-if="download.error">{{download.error}}</p>
        <p class="has-text-danger" v-if="prefetch.error">{{prefetch.error}}</p>
        <p class="has-text-success" v-if="download.status === 'success'">File successfully downloaded.</p>
        <p v-if="download.status === 'downloading'">Downloading...</p>


        <form @submit.prevent="downloadItem">
          <div class="field">
            <label class="label">Download Workshop Item</label>
            <div class="control">
              <input class="input" type="text" v-model="itemid" placeholder="Enter an itemid or workshop url" />
            </div>
          </div>
          <div class="field">
            <div class="control">
              <a v-if="prefetch.invalidType" click='download(true)'>Click here to force download. Please do not abuse.</a>
              <input class="button is-success" type="submit" value="Download" v-if="isDownloadable" :disabled="download.status"/>
              <input class="button is-info" @click="restartServer" v-if="download.status === 'success'" value="Restart Server" />
            </div>
          </div>

          <div class="notification is-warning">
            Please avoid downloading any items that are content items, only download campaigns.
          </div>
        </form>

        <template v-if="prefetch.result">
          <hr>
          <img :src="prefetch.result.preview_url" />
          <h4 class='title is-4'>
            <a :href="prefetch.result.file_url">{{prefetch.result.title}}</a>
          </h4>
          <p class="subtitle is-6">{{prefetch.result.fileSizeReadable}} • Updated {{prefetch.result.updateDate}}</p>
          <p>{{prefetch.result.description}}</p>
        </template>
      </div>
    </div>
  </div>
  <div class="container has-text-centered" v-else>
    <p class="has-text-danger" v-if="error === 'Unauthorized'">The key specified is invalid. </p>

    <h4 class="title is-4">Please enter a key</h4>
    <input class="input" type="text" v-model="keyInput" @keyup.enter="submitKey" />
  </div>
</div>
</template>

<script>

const WORKSHOP_REGEX = new RegExp(/https:\/\/steamcommunity.com\/(workshop|sharedfiles)\/filedetails\/\?id=(\d+)/);

export default {
  data() {
    return {
      vpks: [],
      ready: false,
      key: "",
      keyInput: null,
      error: false,
      itemid: null,
      download: {
        status: null,
        error: null
      },
      prefetch: {
        lastValid: null,
        error: null,
        result: null
      }
    }
  },
  computed: {
    isDownloadable() {
      return this.itemid && this.prefetch.result && this.prefetch.lastValid === this.itemid && !this.prefetch.error
    }
  },
  watch: {
    itemid() {
      this.prefetch.invalidType = false
      const match = this.itemid.match(WORKSHOP_REGEX)
      if(match) {
        this.itemid = match[2]
      }else if(!isNaN(parseInt(this.itemid))) {
        if(this.prefetch.lastValid != this.itemid) {
          this.fetchItem()
        }
      }
    }
  },
  methods: {
    submitKey() {
      this.key = this.keyInput
      this.error = null
      this.fetchVPKS()
    },
    restartServer() {
      fetch(`https://jackz.me/l4d2/scripts/manage.php?key=${this.$SCRIPT_KEY}&method=${type}&port=${server.meta.port}`)
      .then(async(response) => {
        if(response.ok) {
          this.download.status = null
        }else{
          this.download.error = await response.json().error
        }
      })
      .catch(err => {
        this.download.error = err.message
      })
    },
    preview(entry) {
      if(!this.prefetch.result || this.prefetch.result.name !== entry.name) {
        if(entry.info) {
          this.prefetch.result = generatePrefetch(entry.info)
        } else {
          this.itemid = null
          this.fetchItem(entry.name.slice(0, -4))
        }
      }
    },

    fetchVPKS() {
      fetch(`https://jackz.me/l4d2/scripts/workshop.php?key=${this.key}&mode=list`)
      .then(response => {
        if(response.ok) return response.json()
        if(response.status === 401) {
          this.key = null
          this.error = "Unauthorized"
        }
      })
      .then(json => {
        this.vpks = json.map(entry => {
          if(/^(\d+)\.vpk/.test(entry.name)) {
            entry.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.name.slice(0,-4)}`
          }
          entry.display = entry.info ? entry.info.title : entry.name
          return entry
        })
        this.ready = true
      })
    },

    fetchItem(itemid = this.itemid) {
      if(!itemid || itemid.length == "") return
      this.prefetch.error = null
      this.download.error = null
      this.download.result = null

      if(isNaN(this.itemid)) {
        return this.prefetch.error = "An invalid workshop item id was provided."
      }else if(this.vpks.find(vpk => vpk.name === `${this.itemid}.vpk`)) {
        return this.prefetch.error = "Item has already been downloaded."
      }else{
        fetch(`https://jackz.me/l4d2/scripts/workshop.php?key=${this.key}&mode=prefetch&itemid=${itemid}`)
        .then(response => {
          if(response.ok) return response.json()
          else this.prefetch.error = response.statusText
        })
        .then(json => {
          const result = json
          const tags = result.tags.map(t => t.tag)
          if(!tags.includes("Campaigns") && !tags.includes("Co-op")) {
            this.prefetch.error = `Item does not seem to be a valid campaign. If you think this is an error press the button below`
            this.prefetch.invalidType = true
          }else{
            this.prefetch.lastValid = itemid
          }

          const index = this.vpks.findIndex(entry => entry.name === `${itemid}.vpk`)
          if(index > -1) this.vpks[index] = {
            ...this.vpks[index].info,
            display: json.title,
            url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${itemid}`,
            info: json
          }

          this.prefetch.result = generatePrefetch(result)
        })
      }
    },

    downloadItem(forced = false) {
      if(!this.itemid || this.itemid.length == "") return
      this.download.status = "Downloading"
      this.download.error = null
      this.prefetch.invalidType = false
      fetch(`https://jackz.me/l4d2/scripts/workshop.php?key=${this.key}&mode=download&itemid=${this.itemid}&forced=${forced}`)
      .then(response => {
        if(response.ok) return response.json()
        if(response.status === 401) {
          this.key = null
          this.download.error = "Unauthorized"
        }
      })
      .then(json => {
        this.vpks = json.vpks
        this.download.status = "success"
        this.itemid = null
        setTimeout(() => this.download.status = null, 7000)
      })
    }
  },
  created() {
    if(this.$SCRIPT_KEY) {
      this.key = this.$SCRIPT_KEY
      this.fetchVPKS()
    }
  }
}

function generatePrefetch(result) {
  const lastUpdateDate = new Date(result.time_updated * 1000);
  return {
    ...result,
    tags: result.tags.map(t => t.tag),
    fileSizeReadable: humanFileSize(result.file_size, true),
    updateDate: `${lastUpdateDate.toLocaleDateString()} at ${lastUpdateDate.toLocaleTimeString()}`
  }
}

function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

</script>
