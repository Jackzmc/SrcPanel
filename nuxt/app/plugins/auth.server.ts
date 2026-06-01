// .server.ts suffix means Nuxt only runs this during SSR
export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()
  await fetchUser()
  // State is serialized into the HTML payload; client picks it up automatically
})
