import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import VueSkeletonLoader from 'skeleton-loader-vue';
import Tooltip from 'vue-bulma-tooltip'

// Register the component globally
Vue.component('vue-skeleton-loader', VueSkeletonLoader);
Vue.component('tooltip', Tooltip)

/*import { library } from '@fortawesome/fontawesome-svg-core'
import { faUser, faFont, faCircle, faInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faUser, faFont, faCircle, faInfo)

Vue.component('font-awesome-icon', FontAwesomeIcon)*/

Vue.config.productionTip = false

Vue.prototype.$LAST_UPDATED = process.env.VUE_APP_BUILD_DATE

new Vue({
  render: h => h(App)
}).$mount('#app')
