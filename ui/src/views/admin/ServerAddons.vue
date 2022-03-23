<template>
<div>
  <div class="container">
    <div class="columns">
      <div class="column is-8">
        <div class="content">
          <b>Listing {{vpks.length}} workshop items - Click a name to view information</b>
          <div class="columns is-multiline">
            <div class="column is-4" v-for="entry in vpks" :key="entry.vpk">
              <a v-if="entry.url && (!entry.workshop || !entry.workshop.deleted)" @click='preview(entry)' class="has-text-info">
                <b>{{entry.display}}</b>
              </a>
              <b v-else>{{entry.display}}</b>

              <br>
              <em class="has-text-danger" v-if="entry.workshop && entry.workshop.deleted">was deleted from workshop</em>
              <a v-else-if="entry.url" :href="entry.url"><em>View on workshop</em></a>
            </div>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="notification is-danger"  v-if="!prefetch">
          Downloading maps from this page is disabled. Please join the discord and post links in #maps to download. It's a better experience.
        </div>

        <template v-if="prefetch">
          <img :src="prefetch.previewUrl" />
          <h4 class='title is-4'>
            <a :href="prefetch.fileUrl">{{prefetch.title}}</a>
          </h4>
          <p class="subtitle is-6">{{formatSize(prefetch.filesize)}} • Updated {{ formatTime(prefetch.lastUpdated) }}</p>
          <p>{{prefetch.description}}</p>
        </template>
      </div>
    </div>
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
      error: false,
      itemid: null,
      download: {
        status: null,
        error: null
      },
      prefetch: null
    }
  },
  computed: {
    isDownloadable() {
      return this.itemid && this.prefetch.result && this.prefetch.lastValid === this.itemid && !this.prefetch.error
    }
  },
  methods: {
    submitKey() {
      this.fetchVPKS()
    },
    preview(entry) {
      this.prefetch = entry.workshop
    },

    fetchVPKS() {
      fetch(`/api/admins/addons`)
      .then(response => {
        if(response.ok) return response.json()
      })
      .then(json => {
        this.vpks = json.addons.map(entry => {
          if(entry.workshop) {
            entry.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.filename}`
          }
          entry.display = entry.workshop && !entry.workshop.deleted ? entry.workshop.title : entry.filename
          return entry
        })
        this.ready = true
      })
    },
    formatSize(bytes, si=false, dp=1) {
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
    },
    formatTime(time) {
      const date = new Date(time*1000)
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
    }
  },
  created() {
    this.fetchVPKS()
  }
}

</script>
