export default defineAppConfig({
  ui: {
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8'
    },
    colors: {
      primary: 'blue',
      neutral: 'slate',
      info: 'bg-light-blue'
    },
    header: {
      slots: {
        root: 'bg-primary/90 text-white backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50'
      }
    }
  }
})
