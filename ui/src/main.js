import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import VueSkeletonLoader from 'skeleton-loader-vue';
import router from './router'

Vue.component('vue-skeleton-loader', VueSkeletonLoader);

import '@/assets/main.scss'
import '@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css'

/*import { library } from '@fortawesome/fontawesome-svg-core'
import { faUser, faFont, faCircle, faInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faUser, faFont, faCircle, faInfo)

Vue.component('font-awesome-icon', FontAwesomeIcon)*/

Vue.config.productionTip = false

Vue.prototype.$LAST_UPDATED = process.env.VUE_APP_BUILD_DATE
Vue.prototype.$CONNECT_IP = process.env.VUE_APP_SERVER_IP
Vue.prototype.$SCRIPT_KEY = process.env.VUE_APP_SCRIPT_KEY
Vue.prototype.$GRAPH_KEY = process.env.VUE_APP_GRAPH_KEY
Vue.prototype.$API_URL = process.env.VUE_APP_API_URL
Vue.prototype.$REALM = process.env.VUE_APP_REALM

new Vue({
  router,
  render: h => h(App),
}).$mount('#app')
