import { createApp } from 'vue';
import App from './App.vue';
import './registerServiceWorker'
//@ts-ignore next-line
import VueSkeletonLoader from 'skeleton-loader-vue';
import Notifications from '@kyvg/vue3-notification'
import router from './router'

import '@/assets/main.scss'
import '@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faEllipsisV, faChevronDown, faChevronUp, faSpinner, faUser, faCog, faSitemap, faInfoCircle, faExclamationCircle, faExclamationTriangle, faArrowRightFromBracket, faUsersCog, faServer, faList, faPuzzlePiece, faWrench, faUserSlash ,faToolbox, faNoteSticky, faChartSimple, faUserCheck, faUserPlus, faUserPen, faTimes, faUpload, faPlus, faEdit, faTrash, faCheck, faSearch, faMessage, faFolder, faDownload } from '@fortawesome/free-solid-svg-icons'
import { faCircle } from '@fortawesome/free-regular-svg-icons'
import { faSteam, faDiscord } from '@fortawesome/free-brands-svg-icons'
import Icon from '@/components/Icon.vue'

library.add(faSteam, faDiscord)
library.add(faEllipsisV, faChevronDown, faChevronUp, faSpinner, faUser, faCog, faSitemap, faInfoCircle, faExclamationTriangle, faExclamationCircle, faArrowRightFromBracket, faUsersCog, faServer, faList, faPuzzlePiece,  faWrench, faCircle, faUserSlash, faToolbox,faNoteSticky, faChartSimple, faUserCheck, faUserPlus, faUserPen, faTimes, faUpload, faPlus, faEdit, faTrash, faCheck, faSearch, faMessage, faFolder, faDownload)

createApp(App)
  .use(Notifications)
  .component('Icon', Icon)
  .component('vue-skeleton-loader', VueSkeletonLoader)
  .use(router)
  .mount('#app')
