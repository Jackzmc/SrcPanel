<template>
  <div class="container ">
    <div class="columns">
      <div class="column is-2" />
      <div class="column is-6">
        <div class="content" v-html="html" />
      </div>
      <div class="column content">
        <h4>Sections</h4>
        <ul>
          <li v-for="(subheaders, key) in headers" :key="key">
            <a @click='gotoHeader(header)'>{{key}}</a>
            <template v-if="subheaders.length > 0">
              <ul>
                <li v-for="subheader in subheaders" :key="subheader">
                  <a @click='gotoHeader(subheader)'>{{subheader}}</a>
                </li>
              </ul>
            </template>
          </li>
        </ul>
      </div>
    </div>
    <br>
  </div>
</template>

<script>
import Marked from 'marked'

export default {
  data() {
    return {
      html: null,
      headers: {},
    }
  },
  methods: {
    gotoHeader(header) {
      document.getElementById(header).scrollIntoView()
    }
  },
  created() {
    fetch('./data/plugins.md')
    .then(response => {
      if(response.ok)
        return response.text()
      else
        this.html = "<p class='has-text-danger'>Could not fetch information.</p>"
    })
    .then(text => {
      //TODO: Implement nested headers, h3 under h2, h4 under h3, etc.
      this.html = Marked(text)
      let lastH2Header;
      for(const match of this.html.matchAll(/h(\d) id="(.+)"/g)) {
        if(match[1] == "2") {
          lastH2Header = match[2]
          this.headers[match[2]] = []
        }
        else this.headers[lastH2Header].push(match[2])
      }
    })
  }
}
</script>
