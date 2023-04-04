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
  },
  {
    name: 'notes',
    path: '/notes',
    alias: '/info',
    component: () => import(/* webpackChunkName: 'info' */ '../views/InfoView.vue'),
    meta: {
      title: 'Notes',
      description: 'View all player notes'
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
    path: '/admin/addons',
    redirect: '/admin/addons/default'
  },
  {
    name: 'admin-addons',
    path: '/admin/addons/:shareId',
    // redirect: '/admin/addons/default',
    component: () => import(/* webpackChunkName: 'shares' */ '../views/admin/ServerAddonsView.vue'),
    meta: {
      title: 'Addons / Maps',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    },
    children: [
      {
        name: "upload-addon",
        path: 'upload',
        component: () => import(/* webpackChunkName: 'shares' */ '../components/addons/modals/UploadModal.vue')
      },
      {
        name: "workshop-download",
        path: 'workshop-download/:url?',
        component: () => import(/* webpackChunkName: 'shares' */ '../components/addons/modals/WorkshopDownloadModal.vue')
      },
      {
        name: "addon-info",
        path: ':addon',
        component: () => import(/* webpackChunkName: 'shares' */ '../components/addons/modals/AddonInfoModal.vue')
      }
    ]
  },
  {
    name: 'admin-players',
    path: '/admin/players',
    alias: '/admin/users',
    component: () => import(/* webpackChunkName: 'players' */ '../views/admin/PlayerManagerView.vue'),
    meta: {
      title: 'Player Management',
      description: 'View all players and manage them, all in one place',
      authRequired: true
    },
    children: [
      {
        name: 'manage-user',
        path: ':id',
        component: () => import(/* webpackChunkName: 'manage-user' */ '../components/manage-user/modals/ManageUserModal.vue'),
        meta: {
          title: 'Manage User',
          authRequired: true
        },
        redirect: { name: 'manage-user-overview' },
        children: [
          {
            name: 'manage-user-overview',
            path: '',
            alias: 'overview',
            component: () => import(/* webpackChunkName: 'manage-user' */ '../components/manage-user/modals/ManageOverview.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-admin',
            path: 'privileges',
            component: () => import(/* webpackChunkName: 'manage-user' */ '../components/manage-user/modals/ManageAdmin.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-bans',
            path: 'bans/:banid?',
            component: () => import(/* webpackChunkName: 'manage-user' */ '../components/manage-user/modals/ManageBans.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-notes',
            path: 'notes',
            component: () => import(/* webpackChunkName: 'manage-user' */ '../components/manage-user/modals/ManageNotes.vue'),
            meta: {
              authRequired: true
            }
          },
        ]
      }
    ]
  },
  {
    name: 'logs-activity',
    path: '/admin/activity',
    alias: '/admin/logs',
    component: () => import(/* webpackChunkName: 'logs' */ '../views/admin/ActivityLogsView.vue'),
    meta: {
      title: 'Activity Logs',
      description: 'View all activity inside and outside the game',
      authRequired: true
    }
  },
  {
    name: 'logs-audit',
    path: '/admin/audit',
    component: () => import(/* webpackChunkName: 'logs' */ '../views/admin/AuditLogsView.vue'),
    meta: {
      title: 'Audit Logs',
      description: 'View all actions inside and outside the game',
      authRequired: true
    }
  },
  {
    name: 'admin-server-view',
    path: '/admin/servers/:id/:tab?',
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
      title: 'User Settings',
      description: null,
      authRequired: true
    }
  },
  {
    name: 'panel-dash',
    path: '/panel/dashboard',
    component: () => import(/* webpackChunkName: 'paneladmin' */ '../views/panel-admin/Dashboard.vue'),
    meta: {
      title: "Panel Admin",
      authRequired: true
    }
  },

  {
    name: 'authrequired',
    path: '/login-required',
    component: () => import(/* webpackChunkName: 'errors' */ '../views/UnauthorizedView.vue'),
    meta: {
      hideHero: true
    }
  },
  {
    name: 'errorview',
    path: '/error',
    component: () => import(/* webpackChunkName: 'errors' */ '../views/ErrorView.vue'),
    meta: {
      hideHero: true,
      hideNav: true
    }
  },
  {
    name: "404",
    path: '/:path(.*)*',
    component: () => import(/* webpackChunkName: 'errors' */ '../views/ErrorView.vue'),
    meta: {
      status: 404,
      hideHero: false,
      title: '404 Not Found',
      description: "The requested resource could not be found"
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
