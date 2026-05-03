export default defineAppConfig({
  ui: {
    container: {
      base: 'w-full mx-auto px-4 sm:px-6 lg:px-8'
    },
    banner: {
      slots: {
        icon: 'light:text-black',
        title: 'light:text-black'
      }
    },
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    header: {
      slots: {
        root: 'bg-primary/90 text-white backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50'
      }
    },
    formField: {
      slots: {
        label: 'font-semibold'
      }
    }
  }
})
