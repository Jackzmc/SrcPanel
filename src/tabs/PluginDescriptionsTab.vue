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
          <li v-for="header in headers" :key="header">
            <a @click='gotoHeader(header)'>{{header}}</a>
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
      headers: []
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
      this.html = Marked(text)
      for(const match of this.html.matchAll(/h2 id="(.+)"/g)) {
        console.log(match[1])
        this.headers.push(match[1])
      }
    })
  }
}
</script>
