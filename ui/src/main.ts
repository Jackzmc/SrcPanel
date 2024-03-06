import { createApp } from 'vue';
import App from './App.vue';
// import './registerServiceWorker'
//@ts-ignore next-line
import Notifications from '@kyvg/vue3-notification'
import router from './router'

import '@/assets/main.scss'
import '@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faEllipsisV, faChevronDown, faChevronUp, faSpinner, faUser, faCog, faSitemap, faInfoCircle, faExclamationCircle, faExclamationTriangle, faArrowRightFromBracket, faUsersCog, faServer, faList, faPuzzlePiece, faWrench, faGavel ,faToolbox, faNoteSticky, faChartSimple, faUserCheck, faUserPlus, faUserPen, faTimes, faUpload, faPlus, faEdit, faTrash, faCheck, faSearch, faMessage, faFolder, faDownload, faLock, faSync, faCloud, faThumbsUp, faThumbsDown, faQuestionCircle, faCopy, faChevronLeft, faChevronRight, faTerminal, faBell, faKeyboard, faCircleQuestion, faVideo, faFont, faCircleCheck, faArrowRight, faArrowLeft, faClock, faEye, faEyeSlash, faLockOpen, faBoxArchive, faCalendar } from '@fortawesome/free-solid-svg-icons'
import { faCircle, faComment} from '@fortawesome/free-regular-svg-icons'
import { faSteam, faDiscord } from '@fortawesome/free-brands-svg-icons'
import Icon from '@/components/Icon.vue'


import * as Sentry from "@sentry/vue";



library.add(faSteam, faDiscord)
library.add(faEllipsisV, faChevronDown, faChevronUp, faSpinner, faUser, faCog, faSitemap, faInfoCircle, faExclamationTriangle, faExclamationCircle, faArrowRightFromBracket, faUsersCog, faServer, faList, faPuzzlePiece,  faWrench, faCircle, faGavel, faToolbox,faNoteSticky, faChartSimple, faUserCheck, faUserPlus, faUserPen, faTimes, faUpload, faPlus, faEdit, faTrash, faCheck, faSearch, faMessage, faFolder, faDownload, faLock, faSync, faComment, faCloud, faThumbsUp, faThumbsDown, faQuestionCircle, faCopy, faChevronLeft, faChevronRight, faTerminal, faBell, faKeyboard, faCircleQuestion, faVideo, faFont, faCircleCheck, faArrowRight, faClock, faArrowLeft, faEye, faEyeSlash, faLockOpen, faBoxArchive, faCalendar )

const app = createApp(App)
  .use(Notifications)
  .component('Icon', Icon)

Sentry.init({
  app,
  dsn: "https://c117809a57ce4b9189c6b6503881ec3a@o197534.ingest.sentry.io/4505535899959296",
  integrations: [
    new Sentry.BrowserTracing({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ["localhost"],
      routingInstrumentation: Sentry.vueRouterInstrumentation(router),
    }),
    new Sentry.Replay(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

app.use(router)
  .mount('#app')
