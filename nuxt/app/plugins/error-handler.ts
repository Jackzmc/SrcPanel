import * as Sentry from '@sentry/nuxt'
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('vue:error', (error, instance, info) => {
        Sentry.captureException(error, {
            tags: { source: 'nuxt-vue-error-hook' },
            contexts: {
                vue: {
                    componentName: instance?.$options?.name ?? 'anonymous',
                    info,
                },
            },
        })
        console.error('vue:error', error, instance, info)
    })
})
