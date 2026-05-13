export default defineAppConfig({
  ui: {
    container: {
      base: 'w-full mx-auto px-4 sm:px-6 lg:px-8'
    },
    banner: {
      slots: {
        icon: 'text-black',
        title: 'text-black'
      }
    },
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    header: {
      slots: {
        root: 'group-header bg-primary/90 text-white backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50',
        title: 'text-white',
        body: 'bg-white dark:bg-gray-900'
      }
    },
    formField: {
      slots: {
        label: 'font-semibold'
      }
    }
  },
})
