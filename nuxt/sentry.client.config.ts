import * as Sentry from "@sentry/nuxt";

Sentry.init({
  // If set up, you can use your runtime config here
  // dsn: useRuntimeConfig().public.sentry.dsn,
  dsn: "https://b81f74147154482cb212ffba0e123630@glitchtip.jackz.me/2",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // integrations: [
  //   Sentry.feedbackIntegration({
  //     // Additional SDK configuration goes in here, for example:
  //     colorScheme: "system",
  //     showBranding: false,
  //     showEmail: false,
  //     triggerLabel: 'Feedback / Report Bug',
  //     formTitle: 'Send feedback or report a bug',
  //     nameLabel: 'Name (optional)'
  //   }),
  // ],
});
