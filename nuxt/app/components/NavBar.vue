<template>
  <UHeader 
    :ui="{ 
      container: 'max-w-none', 
      toggle: openClassText
      }" 
    class="group-header"
    @update:open="s => open = s"
  >
    <template #title>
      <strong :class="['font-sans text-2xl',openClassText]">{{ appName }}</strong>
    </template>

    <template #left>
      <strong :class="['font-sans text-2xl',openClassText]">{{ appName }}</strong>
      <UNavigationMenu
        :items="routes"
        popover
        tooltip
        orientation="horizontal"
        content-orientation="vertical"
        variant="pill"
        class="navbar hidden md:block"
        :ui="{
          link: 'text-white group',
          linkTrailingBadge: 'bg-black',
          linkLeadingIcon: 'group-data-[active]:text-black dark:group-data-[active]:text-white text-white'
        }"
      />
    </template>

    <template #body>
      <UNavigationMenu
        :items="routes"
        popover
        tooltip
        orientation="vertical"
        content-orientation="vertical"
        variant="pill"
        class="navbar"
        :ui="{
          link: '',
          linkTrailingBadge: 'bg-black',
        }"
      />
    </template>

    <template #right>
      <UInput
        v-model="searchQuery"
        @keyup.enter="performSearch"
        variant="subtle"
        placeholder="Search"
        icon="ri:search-2-line"
        class="hidden md:block"
      />
      <UTooltip text="Toggle light/dark mode">
        <UColorModeButton :class="[openClassText,'hover:light:text-muted']" />
      </UTooltip>
      <NotificationsButton v-if="isLoggedIn" />
      <template v-if="isLoggedIn">
        <UDropdownMenu
          :items="userDropdown"
          :ui="{
            content: 'px-2',
            item: 'py-2'
          }"
        >
          <UButton
            :class="['hover:bg-white/15 w-max',openClassText]"
            variant="ghost"
            block
            trailing-icon="i-lucide-chevron-down"
          >
            <UAvatar 
              :src="user!.user.avatarhash ? `https://avatars.akamai.steamstatic.com/${user!.user.avatarhash}_medium.jpg` : undefined" 
            />
            <span class="hidden md:block">{{ user!.user.name }}</span>
          </UButton>
        </UDropdownMenu>
      </template>
      <template v-else>
        <UButton leading-icon="lucide:user-circle" 
          color="neutral" 
          size="lg"
          to="/login"
        >Login</UButton>
      </template>
    </template>
  </UHeader>
</template>

<script setup lang="ts">

const emit = defineEmits(["open-settings"])

const { user, isLoggedIn } = useAuth()
const { appName } = useAppConfig()


const docs = await queryCollection("docs").all()

const openClassText = computed(() => {
  return open.value ? "text-black dark:text-white" : "text-white"
})

const { routes, userDropdown } = useNavigation()

const open = ref(false)
const searchQuery = ref("")

async function performSearch() {
  if(!searchQuery.value) return
  await navigateTo(`/search?q=${searchQuery.value}`)
  searchQuery.value = ""
}
</script>

<style>
  .light .navbar li a {
    &[aria-current="page"] {
      color: black;
    }
  }
</style>
