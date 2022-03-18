<script>

async function validateLogin(password) {
  const response = await fetch(`https://jackz.me/l4d2/scripts/validate.php`, {
    method: 'POST',
    headers: {
      'X-APIKEY': password
    },
  })
  return response.ok
}

import LoginButton from '@/components/LoginButton'

export default {
  components: { LoginButton },
  data() {
    return {
      auth: {
        password: null,
        state: 0
      },
    }
  },
  methods: {
    async login2() {

    },
    async login(password) {
      let savedPassword = password || this.auth.password
      if(await validateLogin(savedPassword)) {
        window.sessionStorage.setItem('savedkey', savedPassword)
        this.auth.state = 2
        this.auth.password = savedPassword
        // Enable auto-refresh on successful login
        if(this.onAuthed) this.onAuthed()
      } else {
        this.auth.state = 1
        this.auth.password = null
        if(this.onAuthError) this.onAuthError()
      }
    },
  },
  created() {
    const apikey = window.sessionStorage.getItem('savedkey')
    if(apikey) {
      this.login(apikey)
    }
  }
}
</script>
