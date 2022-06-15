import { createApp } from 'vue';
import App from './App.vue';
import './registerServiceWorker'
//@ts-ignore next-line
import VueSkeletonLoader from 'skeleton-loader-vue';
import router from './router'

import '@/assets/main.scss'
import '@creativebulma/bulma-tooltip/dist/bulma-tooltip.min.css'

const app = createApp(App)
  .use(router)

app.mount('#app')
app.component('vue-skeleton-loader', VueSkeletonLoader);
