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
            <a @click='gotoHeader(key)'>{{key}}</a>
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
import { Tree, TreeNode } from '@/js/tree.js'

export default {
  data() {
    return {
      html: null,
      headers: {},
    }
  },
  methods: {
    gotoHeader(header) {
      const element = document.getElementById(header)
      if(element) element.scrollIntoView()
      else console.warn(`Element not found: ${header}`)
    }
  },
  created() {
    fetch('./data/plugins.md?timestamp=' + this.$LAST_UPDATED)
    .then(response => {
      if(response.ok)
        return response.text()
      else
        this.html = "<p class='has-text-danger'>Could not fetch information.</p>"
    })
    .then(text => {
      //TODO: Implement nested headers, h3 under h2, h4 under h3, etc.
      this.html = Marked(text)
      const tree = new Tree(0, 0)
      let lastNode
      for (const [,level,name] of this.html.matchAll(/h(\d) id="(.+)"/g)) {
        level = Number(level)
        let newNode;
        if(lastNode && level > lastNode.value) {
          newNode = tree.insert(lastNode.key, name, level)
        } else if(lastNode && level === lastNode.value) {
          newNode = tree.insert(lastNode.parent.key, name, level)
        } else {
          newNode = tree.insert(0, name, level)
        }
        lastNode = newNode
        // if(match[1] == "2") {
        //   lastH2Header = match[2]
        //   this.headers[match[2]] = []
        // }
        // else this.headers[lastH2Header].push(match[2])
      }

      console.debug(tree)
      /*let prev = arr.shift()
      for (const elem of arr) {
        if(elem.level < prev.level) {
          prev.subheaders.push(elem)
        } else if(elem.level == prev.level) {

        }
      }*/
    })
  }
}

function recurseDown(){}
</script>
