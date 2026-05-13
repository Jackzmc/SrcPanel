declare module '#app' {
  interface PageMeta {
    /** Title shown on hero and <title> tag */
    title?: string,
    /** og:title, without the JzPanel part */
    pageTitle?: string,
    description?: string,
    /** Defaults to pageTitle, description unless set to null */
    hero?: {
        title?: string,
        subtitle?: string,
    } | null
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {}