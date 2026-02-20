export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    },
    header: {
      slots: {
        root: 'bg-primary/90 text-white backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50'
      }
    }
  }
})
