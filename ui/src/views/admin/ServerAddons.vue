<template>
<div>
  <div class="container" v-if="ready">
    <div class="columns">
      <div :class="['column', {'is-8': prefetch}]">
        <div class="content">
          <b>Listing {{vpks.length}} workshop items - Click a name to view information</b>
          <table class="table is-striped">
            <thead>
              <tr>
                <th></th>
                <th><input type="text" class="input" placeholder="Search" v-model="search" /></th>
                <th></th>
              </tr>
              <tr>
                <th>Filename / WorkshopID</th>
                <th>Name</th>
                <th>File Size</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="vpk in filteredVPKs" :key="vpk.filename">
                <td>
                  <a :href="vpk.url" v-if="vpk.workshop">{{vpk.filename}}</a>
                  <span v-else>{{vpk.filename}}</span>
                </td>
                <td>
                  <a v-if="vpk.workshop" @click="preview(vpk)">{{vpk.workshop.title}}</a>
                </td>
                <td>
                  <span v-if="vpk.workshop">{{formatSize(vpk.workshop.filesize)}}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="column" v-if="prefetch">
        <template >
          <a class="button" @click="closePreview">⟵</a>
          <br><br>
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
  <div v-else>
    <p class="title is-4 has-text-centered">Fetching addons...</p>
    <p class="subtitle is-6 has-text-centered">This could take a bit</p>
  </div>
</div>
</template>

<script>

export default {
  data() {
    return {
      vpks: [],
      ready: false,
      error: false,
      itemid: null,
      search: null,
      prefetch: null
    }
  },
  computed: {
    isDownloadable() {
      return this.itemid && this.prefetch.result && this.prefetch.lastValid === this.itemid && !this.prefetch.error
    },
    filteredVPKs() {
      if (!this.search) {
        return this.vpks
      }
      const query = this.search.toLowerCase()
      return this.vpks.filter(vpk => {
        return vpk.filename.toLowerCase().includes(query) || (vpk.workshop && vpk.workshop.title.toLowerCase().includes(query))
      })
    }
  },
  methods: {
    submitKey() {
      this.fetchVPKS()
    },
    preview(entry) {
      this.$router.push(`/admin/addons/${entry.filename}`)
      this.prefetch = entry.workshop
    },

    async fetchVPKS() {
      const response = await fetch(`/api/admins/addons`)
      if(response.ok) {
        const json = await response.json()
        this.vpks = json.addons.map(entry => {
          if(entry.workshop) {
            if(entry.workshop.deleted) entry.workshop = null
            else entry.url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${entry.filename}`
          }
          return entry
        })
        this.ready = true
        return true
      }
      return false
    },
    closePreview() {
      this.prefetch = null
      this.$router.back()
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
  async created() {
    await this.fetchVPKS()
    if(this.$route.params.id) {
      for(const vpk of this.vpks) {
        if(vpk.filename === this.$route.params.id) {
          this.prefetch = vpk.workshop
          break
        }
      }
    }
  }
}

</script>
