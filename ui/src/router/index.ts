import { createRouter, createWebHistory } from 'vue-router'
import Overview from '../views/OverviewView.vue'

const DEFAULT_TITLE = import.meta.env.VITE_SITE_TITLE

const routes = [
  {
    name: "overview",
    path: '/',
    component: Overview,
    meta: {
      title: 'Overview',
      description: 'Information & Administration Dashboard',
      hideHero: true
    }
  },
  {
    name: "docs-rules",
    path: '/docs/rules',
    component: () => import('../views/docs/RulesAndInfoView.vue'),
    meta: {
      title: 'Procedures & Rules',
      description: "Because it's a necessary"
    }
  },
  {
    name: "docs-commands",
    path: '/docs/commands/:command?',
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
    name: "docs-maps",
    path: '/docs/maps',
    component: () => import('../views/docs/MapsView.vue'),
    meta: {
      title: "L4D2 Maps",
      description: ""
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
    },
  },
  {
    name: 'notes',
    path: '/notes',
    component: () => import('../views/PlayerNotesView.vue'),
    meta: {
      title: 'Player Notes',
      description: 'View notes that admins have left on players'
    }
  },
  {
    name: 'discuss',
    path: '/discuss',
    meta: {
      title: "Discussions",
      authRequired: true,
    },
    redirect: { name: "discuss-list" },
    children: [
      {
        name: "discuss-list",
        path: '',
        component: () => import('../views/DiscussionsView.vue'),
        meta: {
          title: "Discussions",
          authRequired: true,
        },
      },
      {
        name: 'discuss-new',
        path: 'new',
        component: () => import('../views/DiscussionEdit.vue'),
        meta: {
          authRequired: true,
          prevRoute: "discuss"
        },
      },
      {
        name: 'discuss-edit',
        path: ':id/edit',
        component: () => import('../views/DiscussionEdit.vue'),
        meta: {
          authRequired: true,
          prevRoute: "discuss"
        },
      },
      {
        name: "discuss-view",
        path: ':id/:title?',
        component: () => import('../views/DiscussionsView.vue'),
        meta: {
          title: "Discussions",
          authRequired: true,
        },
      },
    ]
  },
  {
    name: 'events',
    path: '/events',
    component: () => import('../views/EventsView.vue'),
    meta: {
      title: "Events",
      authRequired: true
    }
  },
  {
    name: 'event-details',
    path: '/events/:id/:title?',
    component: () => import('../views/EventDetailView.vue'),
    meta: {
      title: "Event Scheduler",
      prevRoute: "events",
      authRequired: true
    }
  },
  {
    name: 'admin-shares',
    path: '/admin/shares',
    component: () => import('../views/admin/SharesView.vue'),
    meta: {
      title: 'Shares',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    }
  },
  {
    name: 'admin-share-detail',
    path: '/admin/shares/:shareId/:viewMode',
    component: () => import('../views/admin/ShareDetails.vue'),
    meta: {
      title: 'Addons / Files',
      description: 'View all the installed custom maps (and some non-map addons)',
      authRequired: true
    },
    children: [
      {
        name: "upload-addon",
        path: 'upload',
        component: () => import('../components/addons/modals/UploadModal.vue'),
        meta: {
          modal: true
        }
      },
      {
        name: "workshop-download",
        path: 'workshop-download/:url?',
        component: () => import('../components/addons/modals/WorkshopDownloadModal.vue'),
        meta: {
          modal: true
        }
      },
      {
        name: "collection-info",
        path: 'collections/:collection/:title?',
        meta: {
          needsPrefetch: true,
          modal: true
        },
        component: () => import('../components/addons/modals/CollectionInfoModal.vue')
      },
      {
        name: "file-info",
        path: ':addon',
        meta: {
          needsPrefetch: true,
          modal: true
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
        redirect: { name: "manage-user-overview"},
        children: [
          {
            name: "manage-user-default",
            path: '',
            redirect: { name: 'manage-user-overview' }
          },
          {
            name: 'manage-user-overview',
            path: 'overview/:tab?',
            alias: '',
            component: () => import('../components/manage-user/modals/ManageOverview.vue'),
            meta: {
              authRequired: true
            },
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
    name: 'create-custom-server',
    path: '/admin/create-server',
    component: () => import('../views/admin/CustomServerWizard.vue'),
    meta: {
      title: 'Custom Servers',
      authRequired: true,
    },
  },
  {
    name: 'admin-server-view',
    path: '/admin/servers/:serverId/:tab?',
    component: () => import('../views/admin/ServerView.vue'),
    meta: {
      title: 'Server View',
      authRequired: true,
      hideHero: true
    },
  },
  {
    name: 'servers',
    path: '/admin/servers',
    component: () => import('../views/admin/ServerListOverview.vue'),
    meta: {
      title: 'Manage Servers',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    },
  },
  {
    name: 'servers-manage',
    path: '/admin/servers/manage',
    component: () => import('../views/admin/ServerListManage.vue'),
    meta: {
      title: 'Server Instances',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    },
  },
  {
    name: 'servers-manage-group',
    path: '/admin/servers/:groupId',
    component: () => import('../views/admin/ServerListManage.vue'),
    meta: {
      title: 'Manage Servers',
      description: 'View all the servers and manage them, all in one place',
      authRequired: true
    },
  },
  {
    name: 'servers-manage-server',
    path: '/admin/servers2/:groupId/:serverId',
    component: () => import('../views/admin/ServerView.vue'),
    meta: {
      title: 'Server View',
      authRequired: true,
      hideHero: true
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
    name: 'panel-first-time-setup',
    path: '/panel/first-time-setup',
    component: () => import('../views/panel-admin/SetupWizard.vue'),
    meta: {
      title: "First Time Setup",
      authRequired: true,
      hideNav: true
    }
  },
  {
    name: 'errorview',
    path: '/error',
    component: () => import('../views/ErrorView.vue'),
    meta: {
      hideHero: true,
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
  // linkExactActiveClass: "is-active",
  linkActiveClass: "is-active"
})

router.beforeEach((to, from) => {
  if(to.meta.authRequired) {
    // return "/login-required?return=" + encodeURIComponent(to.fullPath)
  }
})

router.afterEach((to, from) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${DEFAULT_TITLE}` : DEFAULT_TITLE
})

export default router
