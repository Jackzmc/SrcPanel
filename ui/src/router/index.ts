import { createRouter, createWebHistory } from 'vue-router'
import Overview from '../views/OverviewView.vue'

const DEFAULT_TITLE = "L4D2 Admin Guide"

const routes = [
  {
    name: "overview",
    path: '/',
    component: Overview,
    meta: {
      title: 'Overview',
      description: 'Information & Administration Dashboard'
    }
  },
  {
    name: "docs-commands",
    path: '/docs/commands',
    component: () => import(/* webpackChunkName: 'commands' */ '../views/docs/CommandsView.vue'),
    meta: {
      title: 'Commands',
      description: 'All the information to have fun, and manage those troublemakers'
    }
  },
  {
    name: "docs-cvars",
    path: '/docs/cvars',
    component: () => import(/* webpackChunkName: 'cvars' */ '../views/docs/CvarsView.vue'),
    meta: {
      title: 'Cvars',
      description: 'All the cvars you may want to change up the gameplay'
    }
  },
  {
    name: 'docs-ftt',
    path: '/docs/ftt',
    component: () => import(/* webpackChunkName: 'ftt' */ '../views/docs/FeedTheTrollsView.vue'),
    meta: {
      title: 'Feed The Trolls',
      description: 'The anti-troll arsenal'
    }
  },
  {
    name: 'docs-5plus',
    path: '/docs/extraplayers',
    component: () => import(/* webpackChunkName: 'extraplayers' */ '../views/docs/ExtraPlayersView.vue'),
    meta: {
      title: '5+ Games',
      description: 'How to setup 5+ games, including 8 player lobbies'
    }
  },
  {
    name: 'docs-targetting',
    path: '/docs/targetting',
    component: () => import(/* webpackChunkName: 'targetting' */ '../views/docs/PlayerTargettingView.vue'),
    meta: {
      title: 'Player Targetting'
    }
  },
  {
    name: 'docs-plugins',
    path: '/docs/plugins',
    component: () => import(/* webpackChunkName: 'plugindev' */ '../views/docs/PluginDescriptionsView.vue'),
    meta: {
      title: "Plugin Development History",
      description: "A insight on how my plugins were developed"
    }
  },
  {
    name: 'docs-notes',
    path: '/docs/notes',
    component: () => import(/* webpackChunkName: 'ftt' */ '../views/docs/NotesView.vue'),
    meta: {
      title: "Player Notes",
      description: ""
    }
  },
  {
    name: 'bans',
    path: '/bans',
    component: () => import(/* webpackChunkName: 'bans' */ '../views/BansView.vue'),
    meta: {
      title: 'Bans',
      hideHero: true,
    },
    children: [
      {
        name: 'bans-edit',
        path: 'edit/:id',
        component: () => import(/* webpackChunkName: 'bans' */ '../components/modals/EditBanModal.vue'),
        hideHero: true,
      }
    ]
  },
  {
    name: 'info',
    path: '/info',
    component: () => import(/* webpackChunkName: 'info' */ '../views/InfoView.vue'),
    meta: {
      title: 'Info',
      description: 'View player notes and admins'
    }
  },
  {
    name: 'graphs',
    path: '/graphs',
    component: () => import(/* webpackChunkName: 'graphs' */ '../views/GraphsView.vue'),
    meta: {
      title: 'Graphs',
      description: 'View some statistics about gameplay and administration'
    }
  },
  {
    name: 'admin-addons',
    path: '/admin/addons/:id?',
    component: () => import(/* webpackChunkName: 'maps' */ '../views/admin/ServerAddonsView.vue'),
    meta: {
      title: 'Addons / Maps',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    }
  },
  {
    name: 'admin-players',
    path: '/admin/players',
    component: () => import(/* webpackChunkName: 'players' */ '../views/admin/PlayerManagerView.vue'),
    meta: {
      title: 'Player Management',
      description: 'View all players and manage them, all in one place',
      authRequired: true
    },
    children: [
      {
        name: 'admin-players-add-ban',
        path: ':id/add-ban',
        component: () => import(/* webpackChunkName: 'players' */ '../components/modals/AddBanModal.vue'),
        meta: {
          title: 'Ban Player',
          authRequired: true
        }
      },
      {
        name: 'admin-players-manage-admin',
        path: ':id/manage-admin',
        component: () => import(/* webpackChunkName: 'players' */ '../components/modals/ManageAdminsModal.vue'),
        meta: {
          title: 'Manage Admin Player',
          authRequired: true
        }
      }
    ]
  },
  {
    name: 'admin-logs',
    path: '/admin/logs',
    component: () => import(/* webpackChunkName: 'logs' */ '../views/admin/LogsView.vue'),
    meta: {
      title: 'Audit & Activity Logs',
      description: 'View all activity inside and outside the game',
      authRequired: true
    }
  },
  {
    name: 'admin-server-view',
    path: '/admin/servers/:id',
    component: () => import(/* webpackChunkName: 'servers' */ '../views/admin/ServerView.vue'),
    meta: {
      title: 'Server View',
      authRequired: true,
      hideHero: true
    },
  },
  {
    name: 'admin-servers',
    path: '/admin/servers',
    component: () => import(/* webpackChunkName: 'servers' */ '../views/admin/ServerManagementView.vue'),
    meta: {
      title: 'Server Management',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    },
  },
  {
    name: 'admin-settings',
    path: '/user/settings',
    component: () => import(/* webpackChunkName: 'sessions' */ '../views/user/SettingsView.vue'),
    meta: {
      title: 'Settings',
      description: null,
      authRequired: true
    }
  },
  {
    name: 'authrequired',
    path: '/login-required',
    component: () => import(/* webpackChunkName: 'misc' */ '../views/UnauthorizedView.vue'),
    meta: {
      hideHero: true
    }
  }
]


const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  linkExactActiveClass: "is-active"
})

router.beforeEach((to, from) => {
  if(to.meta.authRequired && window.sessionStorage.getItem("srcds_userdata") == null) {
    return "/login-required?return=" + encodeURIComponent(to.fullPath)
  }
})

router.afterEach((to, from) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${DEFAULT_TITLE}` : DEFAULT_TITLE
})

export default router
