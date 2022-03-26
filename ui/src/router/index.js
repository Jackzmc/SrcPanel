import Vue from 'vue'
import VueRouter from 'vue-router'
import Overview from '../views/Overview.vue'

Vue.use(VueRouter)

const DEFAULT_TITLE = "L4D2 Admin Guide"

const routes = [
  {
    path: '/',
    component: Overview,
    name: "Overview",
    meta: {
      title: 'Overview',
      description: 'Information & Administration Dashboard'
    }
  },
  {
    path: '/docs/commands',
    component: () => import(/* webpackChunkName: 'commands' */ '../views/docs/Commands.vue'),
    meta: {
      title: 'Commands',
      description: 'All the information to have fun, and manage those troublemakers'
    }
  },
  {
    path: '/docs/cvars',
    component: () => import(/* webpackChunkName: 'cvars' */ '../views/docs/Cvars.vue'),
    meta: {
      title: 'Cvars',
      description: 'All the cvars you may want to change up the gameplay'
    }
  },
  {
    path: '/docs/ftt',
    component: () => import(/* webpackChunkName: 'ftt' */ '../views/docs/FeedTheTrolls.vue'),
    meta: {
      title: 'Feed The Trolls',
      description: 'The anti-troll arsenal'
    }
  },
  {
    path: '/docs/extraplayers',
    component: () => import(/* webpackChunkName: 'extraplayers' */ '../views/docs/ExtraPlayers.vue'),
    meta: {
      title: '5+ Games',
      description: 'How to setup 5+ games, including 8 player lobbies'
    }
  },
  {
    path: '/docs/targetting',
    component: () => import(/* webpackChunkName: 'targetting' */ '../views/docs/PlayerTargetting.vue'),
    meta: {
      title: 'Player Targetting'
    }
  },
  {
    path: '/docs/plugins',
    component: () => import(/* webpackChunkName: 'plugindev' */ '../views/docs/PluginDescriptions.vue'),
    meta: {
      title: "Plugin Development History",
      description: "A insight on how my plugins were developed"
    }
  },
  {
    path: '/bans',
    component: () => import(/* webpackChunkName: 'bans' */ '../views/Bans.vue'),
    meta: {
      title: 'Bans',
      hideHero: true,
    },
    children: [
      {
        path: 'edit/:id',
        component: () => import(/* webpackChunkName: 'bans' */ '../components/modals/BanEditModal.vue'),
        hideHero: true,
      }
    ]
  },
  {
    path: '/info',
    component: () => import(/* webpackChunkName: 'info' */ '../views/Info.vue'),
    meta: {
      title: 'Info',
      description: 'View player notes and admins'
    }
  },
  {
    path: '/graphs',
    component: () => import(/* webpackChunkName: 'graphs' */ '../views/Graphs.vue'),
    meta: {
      title: 'Graphs',
      description: 'View some statistics about gameplay and administration'
    }
  },
  {
    path: '/admin/addons/:id?',
    component: () => import(/* webpackChunkName: 'maps' */ '../views/admin/ServerAddons.vue'),
    meta: {
      title: 'Addons / Maps',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    }
  },
  {
    path: '/admin/players',
    component: () => import(/* webpackChunkName: 'players' */ '../views/admin/PlayerManager.vue'),
    meta: {
      title: 'Player Management',
      description: 'View all players and manage them, all in one place',
      authRequired: true
    }
  },
  {
    path: '/admin/logs',
    component: () => import(/* webpackChunkName: 'logs' */ '../views/admin/Logs.vue'),
    meta: {
      name: 'Audit & Activity Logs',
      description: 'View all activity inside and outside the game',
      authRequired: true
    }
  },
  {
    path: '/admin/servers',
    component: () => import(/* webpackChunkName: 'servers' */ '../views/admin/ServerManagement.vue'),
    meta: {
      title: 'Server Management',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    }
  },
  {
    path: '/user/settings',
    component: () => import(/* webpackChunkName: 'sessions' */ '../views/user/Settings.vue'),
    meta: {
      title: 'Settings',
      description: null,
      authRequired: true
    }
  }
]


const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  linkExactActiveClass: "is-active"
})

router.afterEach((to, from) => {
  Vue.nextTick(() => {
    document.title = to.meta.title ? `${to.meta.title} - ${DEFAULT_TITLE}` : DEFAULT_TITLE
  });
})

export default router
