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
}
</script>
