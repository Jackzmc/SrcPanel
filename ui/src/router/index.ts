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
    component: () => import('../views/docs/CommandsView.vue'),
    meta: {
      title: 'Commands',
      description: 'All the information to have fun, and manage those troublemakers'
    }
  },
  {
    name: "docs-cvars",
    path: '/docs/cvars',
    component: () => import('../views/docs/CvarsView.vue'),
    meta: {
      title: 'Cvars',
      description: 'All the cvars you may want to change up the gameplay'
    }
  },
  {
    name: 'docs-ftt',
    path: '/docs/ftt',
    component: () => import('../views/docs/FeedTheTrollsView.vue'),
    meta: {
      title: 'Feed The Trolls',
      description: 'The anti-troll arsenal'
    }
  },
  {
    name: 'docs-5plus',
    path: '/docs/extraplayers',
    component: () => import('../views/docs/ExtraPlayersView.vue'),
    meta: {
      title: '5+ Games',
      description: 'How to setup 5+ games, including 8 player lobbies'
    }
  },
  {
    name: 'docs-targetting',
    path: '/docs/targetting',
    component: () => import('../views/docs/PlayerTargettingView.vue'),
    meta: {
      title: 'Player Targetting'
    }
  },
  {
    name: 'docs-notes',
    path: '/docs/notes',
    component: () => import('../views/docs/NotesView.vue'),
    meta: {
      title: "Player Notes",
      description: ""
    }
  },
  {
    name: 'docs-props',
    path: '/docs/props',
    component: () => import('../views/docs/PropSpawnerView.vue'),
    meta: {
      title: "Prop Spawner",
      description: ""
    }
  },
  {
    name: "docs-keybinds",
    path: '/docs/keybinds',
    component: () => import('../views/docs/KeybindsView.vue'),
    meta: {
      title: "Keybinds",
      description: ""
    }
  },
  {
    name: "docs-tutorials",
    path: '/docs/tutorials/:id?',
    alias: '/docs/tutorial/:id?',
    component: () => import('../views/docs/TutorialsView.vue'),
    meta: {
      title: "Tutorials",
      description: ""
    }
  },
  {
    name: 'bans',
    path: '/bans',
    component: () => import('../views/BansView.vue'),
    meta: {
      title: 'Bans',
      hideHero: true,
    },
  },
  {
    name: 'notes',
    path: '/notes',
    alias: '/info',
    component: () => import('../views/InfoView.vue'),
    meta: {
      title: 'Notes',
      description: 'View all player notes'
    }
  },
  {
    name: 'admin-shares',
    path: '/admin/shares/:shareId?/',
    component: () => import('../views/admin/ServerAddonsView.vue'),
    meta: {
      title: 'Addons / Maps',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    },
    children: [
      // I don't think this is valid - but we cannot load a component, otherwise
      // we would have the router-view of admin-shares become list-addons
      // Vue3 seems to just give us a warning and work as I want it for now so...
      {
        name: 'list-addons',
        path: "files",
      },
      {
        name: "upload-addon",
        path: 'upload',
        component: () => import('../components/addons/modals/UploadModal.vue')
      },
      {
        name: "workshop-download",
        path: 'workshop-download/:url?',
        component: () => import('../components/addons/modals/WorkshopDownloadModal.vue')
      },
      {
        name: "collection-info",
        path: 'collections/:collection/:title?',
        meta: {
          needsPrefetch: true
        },
        component: () => import('../components/addons/modals/CollectionInfoModal.vue')
      },
      {
        name: "file-info",
        path: 'file/:addon',
        meta: {
          needsPrefetch: true
        },
        component: () => import('../components/addons/modals/AddonInfoModal.vue')
      }
    ]
  },
  {
    name: 'admin-players',
    path: '/admin/players',
    alias: '/admin/users',
    component: () => import('../views/admin/PlayerManagerView.vue'),
    meta: {
      title: 'Player Management',
      description: 'View all players and manage them, all in one place',
      authRequired: true
    },
    children: [
      {
        name: 'manage-user',
        path: ':id',
        component: () => import('../components/manage-user/modals/ManageUserModal.vue'),
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
            component: () => import('../components/manage-user/modals/ManageOverview.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-admin',
            path: 'privileges',
            component: () => import('../components/manage-user/modals/ManageAdmin.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-bans',
            path: 'bans/:banid?',
            component: () => import('../components/manage-user/modals/ManageBans.vue'),
            meta: {
              authRequired: true
            }
          },
          {
            name: 'manage-user-notes',
            path: 'notes',
            component: () => import('../components/manage-user/modals/ManageNotes.vue'),
            meta: {
              authRequired: true
            }
          },
        ]
      }
    ]
  },
  {
    name: 'logs-audit',
    path: '/admin/audit/:aroundId?',
    component: () => import('../views/admin/AuditLogsView.vue'),
    meta: {
      title: 'Audit Logs',
      description: 'View all actions inside and outside the game',
      authRequired: true
    }
  },
  {
    name: 'admin-server-view',
    path: '/admin/servers/:id/:tab?',
    component: () => import('../views/admin/ServerView.vue'),
    meta: {
      title: 'Server View',
      authRequired: true,
      hideHero: true
    },
  },
  {
    name: 'admin-servers',
    path: '/admin/servers',
    component: () => import('../views/admin/ServerManagementView.vue'),
    meta: {
      title: 'Server Management',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    },
  },
  {
    name: 'panel-dash',
    path: '/panel/dashboard',
    component: () => import('../views/panel-admin/Dashboard.vue'),
    meta: {
      title: "Panel Admin",
      authRequired: true
    }
  },

  {
    name: 'authrequired',
    path: '/login-required',
    component: () => import('../views/UnauthorizedView.vue'),
    meta: {
      hideHero: true
    }
  },
  {
    name: 'errorview',
    path: '/error',
    component: () => import('../views/ErrorView.vue'),
    meta: {
      hideHero: true,
      // hideNav: true
    }
  },
  {
    name: "404",
    path: '/:path(.*)*',
    component: () => import('../views/ErrorView.vue'),
    meta: {
      status: 404,
      hideHero: false,
      title: '404 Not Found',
      description: "The requested resource could not be found"
    }
  }
]


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
