<template>
<div class="container">
    <div class="columns is-variable is-6">
        <div class="column is-7">
            <ul>
              <li v-for="cvar in cvars" :key="cvar.cvar">
                <b class="is-size-5" v-html="formatCvar(cvar.cvar)" /> - {{cvar.description}}
              </li>
            </ul>
        </div>
        <div class="column content">
            <p>
              Convars are settings on the server that can affect anything and can be changed at any time.
            </p>
            <p class="has-text-info">
              You can change convars with the command:<br>
              <b>sm_cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
              <br>
              <b>/cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
              <br>
              <b>!cvar
                <span class='tag is-link'>cvar name</span> <span class='tag'>value</span>
              </b>
            </p>
	          <p>
              If value is not specified, it will instead show you the value of the cvar
            </p>
            <p><b>Example</b> /cvar l4d2_population_clowns 1.0 – This will make it a 100% chance it spawns clown zombies</p>
            <p>
            <br>
            <p>
              <em>Nerd shit: Cvars can take three types of inputs: floats, integers, and strings. Booleans are represented by 0 or 1 but using the sm_cvar command allows you to input anything, and this can do unknown behavior.
              0.0 or 1.0 is a float but can also be parsed as an integer or a string. Just be careful with the parameters.</em>
            </p>
        </div>
    </div>
</div>
</template>

<script>
export default {
  data() {
    return {
     cvars: []
    }
  },
  computed: {
    prefix() {
        if(this.commandViewmode === 'console') return "sm_"
        else if(this.commandViewmode === 'public') return "!"
        else if(this.commandViewmode === 'private') return "/"
        return "<INVALID_MODE>"
    }
  },
  methods: {
    formatCvar(cvar) {
      const args = cvar.trim().split('')
      let letters = "", lastChar = null, string = "";
      for(const char of args) {
        if(char === '<') {
          lastChar = '>'
        }else if(char === '[') {
          lastChar = ']'
        }else if(char === lastChar) {
          if(char === '>') {
            string += `<span class='tag is-link'>${letters}</span> `
          }else{
            string += `<span class='tag is-secondary'>${letters}</span> `
          }
          lastChar = null
          letters = ''
        }else if(lastChar)
          letters += char
        else
          string += char
      }
      return string
    }
  },
  created() {
    fetch('./data/cvars.json')
    .then(response => response.json())
    .then(cvars => {
      this.cvars = cvars
    })
    .catch(err => {
        console.error('Could not fetch commands, network error.', err)
    })
  }
}
</script>
