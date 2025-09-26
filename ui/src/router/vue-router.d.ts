// This can be directly added to any of your `.ts` files like `router.ts`
// It can also be added to a `.d.ts` file. Make sure it's included in
// project's tsconfig.json "files"
import 'vue-router'
import { RouteLocationNormalizedGeneric, RouteRecordRaw } from 'vue-router'

// To ensure it is treated as a module, add at least one `export` statement
export {}

interface NavOptions {
  /* The section in a dropdown to place item in. Default 0 */
  section?: number,
  /* Overwrite the text of nav item with this */
  labelText?: string,
  /* Icon to show */
  icon?: string,
  /* An optional tag html to insert */
  tagHtml?: string,

  /* If 'redirect' is set, should it be handled as a direct external link? */
  isExternalLink?: boolean
}

// TODO: use this instead
interface HeroOptions {
    prevRoute?: string | RouteNavFunction,
    nextRoute?: string | RouteNavFunction,
}

type RouteNavFunction = (route: RouteLocationNormalizedGeneric) => string

declare module 'vue-router' {
  interface RouteMeta {
    /** Inheritted by nav / hero if not overwritten */
    title?: string,
    /** Inheritted by nav / hero if not overwritten */
    description?: string,

    /** Does this route require user to be logged in? If set, nav will be hidden if not logged in */
    requiresAuth?: boolean,

    /** If set, shows up in top level nav, if topLevel or child of a topLevel */
    nav?: NavOptions,

    /** Is route top level (shown in top nav directly), parent of other routes */
    topLevel?: boolean

    // TODO: impl
    hero?: HeroOptions | false,

    /** Is route shown in search results? Default true */
    searchable?: boolean

    /**  Should the blue hero be hidden? (Default false) */
    hideHero?: boolean,

    /** The previous to show navigation to in hero.
     *  @deprecated use hero
    */
    prevRoute?: string | RouteNavFunction,
    /** The next route to show navigation to in hero.
     *  @deprecated use hero
    */
    nextRoute?: string | RouteNavFunction,

    /** HTTP Status to return */
    status?: number
  }
}
