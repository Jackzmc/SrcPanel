import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Overview from '../views/OverviewView.vue'

const DEFAULT_TITLE = import.meta.env.VITE_SITE_TITLE

const routes: RouteRecordRaw[] = [
  {
    name: "overview",
    path: '/',
    component: Overview,
    meta: {
      title: 'Overview',
      description: 'Information & Administration Dashboard',
      hideHero: true,
      nav: {},
      topLevel: true,
    }
  },
  {
    name: "search",
    path: '/search',
    component: () => import('../views/SearchView.vue'),
    meta: {
      title: 'Search Results',
      hideHero: true,
      searchable: false
    },
  },
  {
    name: "docs",
    path: "/docs",
    meta: {
      title: "Documentation",
      description: "General documentation for in-game commands, settings and features",
      icon: "fa-info-circle",
      nav: {
      },
      topLevel: true,
    },
    children: [
        {
          name: "docs-commands",
          path: 'commands/:command?',
          component: () => import('../views/docs/CommandsView.vue'),
          meta: {
            title: 'Commands',
            description: 'All the information to have fun, and manage those troublemakers',
            icon: "fa-asterisk",
            nav: {
              section: 0
            }
          }
        },
        {
          name: "docs-cvars",
          path: 'cvars',
          component: () => import('../views/docs/CvarsView.vue'),
          meta: {
            title: 'Cvars',
            description: 'All the cvars you may want to change up the gameplay',
            icon: "fa-wrench",
            nav: {
              section: 0
            }
          }
        },
        {
          name: "docs-maps",
          path: 'maps',
          component: () => import('../views/docs/MapsView.vue'),
          meta: {
            title: "L4D2 Maps",
            description: "A list of all L4D2 official maps and a random map picker",
            nav: {
              section: 1
            }
          }
        },
        {
          name: 'docs-ftt',
          path: 'ftt',
          component: () => import('../views/docs/FeedTheTrollsView.vue'),
          meta: {
            title: 'Feed The Trolls',
            description: 'The anti-troll arsenal',
            nav: {
              section: 1
            }
          }
        },
        {
          name: 'docs-5plus',
          path: 'extraplayers',
          component: () => import('../views/docs/ExtraPlayersView.vue'),
          meta: {
            title: '5+ Games',
            description: 'How to setup 5+ games, including 8 player lobbies',
            nav: {
              section: 1
            }
          }
        },
        {
          name: 'docs-targetting',
          path: 'targetting',
          component: () => import('../views/docs/PlayerTargettingView.vue'),
          meta: {
            title: 'Player Targetting',
            nav: {
              section: 1
            }
          }
        },
        {
          name: 'docs-notes',
          path: 'notes',
          component: () => import('../views/docs/NotesView.vue'),
          meta: {
            title: "Player Notes",
            description: "Information about the player notes feature",
            nav: {
              section: 1
            }
          }
        },
        {
          name: 'docs-props',
          path: 'props',
          component: () => import('../views/docs/PropSpawnerView.vue'),
          meta: {
            title: "Prop Spawner",
            description: "Cheat sheat on how to use the new prop spawner",
            nav: {
              section: 1
            }
          }
        },
        {
          name: "docs-rules",
          path: 'rules',
          component: () => import('../views/docs/RulesAndInfoView.vue'),
          meta: {
            title: 'Procedures & Rules',
            description: "Because it's necessary",
            nav: {
              section: 1
            }
          }
        },
        {
          name: "docs-keybinds",
          path: 'keybinds',
          component: () => import('../views/docs/KeybindsView.vue'),
          meta: {
            title: "Keybinds",
            description: "List of all L4D2 keybind codes and tool to create keybinds",
            icon: "keyboard",
            nav: {
              section: 2
            }
          }
        },
        {
          name: "docs-tutorials",
          path: 'tutorials/:id?',
          alias: 'tutorial/:id?',
          component: () => import('../views/docs/TutorialsView.vue'),
          meta: {
            title: "Tutorials",
            description: "Tutorials on how to use the admin panel",
            icon: "circle-question",
            nav: {
              section: 2
            }
          }
        },
    ]
  },
  {
    name: "admin",
    path: "/admin",
    meta: {
      requiresAuth: true,
      title: "Administration",
      description: "Administrative pages",
      icon: "fa-toolbox",
      nav: {
      },
      topLevel: true,
    },
    children: [
            {
        name: 'logs-audit',
        path: 'audit/:aroundId?',
        component: () => import('../views/admin/AuditLogsView.vue'),
        meta: {
          title: 'Activity Log',
          description: 'View all actions inside and outside the game',
          icon: "list",
          keywords: ["activity", "audit", "logs"],
          authRequired: true,
          nav: {
            section: 0,
          }
        }
      },
      {
        name: 'admin-shares',
        path: 'shares',
        component: () => import('../views/admin/SharesView.vue'),
        meta: {
          title: 'Shares',
          description: 'View all the installed custom maps (and some non-map addons)',
          authRequired: true,
          icon: "fa-puzzle-piece",
          nav: {
            labelText: "Addons / Files",
            section: 1
          }
        }
      },
      {
        name: 'servers',
        path: 'servers-legacy',
        component: () => import('../views/admin/ServerListOverview.vue'),
        meta: {
          title: 'Manage Servers',
          icon: "fa-server",
          description: 'View all the servers and manage them, all in one place',
          authRequired: true,
          nav: {
            section: 1,
          }
        }
      },
      {
        name: 'servers-manage',
        path: 'servers',
        component: () => import('../views/admin/ServerListManage.vue'),
        meta: {
          title: 'Server Instances',
          description: 'View all the servers and manage them, all in one place',
          icon: "fa-server",
          authRequired: true,
          nav: {
            section: 1,
            labelText: "Manage Servers v2",
            tagHtml: `<span class="tag is-warning is-tiny ml-1">BETA</span>`
          }
        },
      },
      {
        name: 'servers-manage-group',
        path: 'servers/:groupId',
        component: () => import('../views/admin/ServerListManage.vue'),
        meta: {
          title: 'Manage Servers',
          description: 'View all the servers and manage them, all in one place',
          authRequired: true,
          searchable: false
        }
      },
      {
        name: 'servers-manage-server',
        path: 'servers/:groupId/:serverId',
        component: () => import('../views/admin/ServerView.vue'),
        meta: {
          title: 'Server View',
          authRequired: true,
          hideHero: true,
          searchable: false
        },
      },
      {
        name: 'admin-share-detail',
        path: 'shares/:shareId/:viewMode',
        component: () => import('../views/admin/ShareDetails.vue'),
        meta: {
          title: 'Addons / Files',
          description: 'View all the installed custom maps (and some non-map addons)',
          authRequired: true,
          section: 1,
          searchable: false,
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
        path: 'players',
        alias: 'users',
        component: () => import('../views/admin/PlayerManagerView.vue'),
        meta: {
          title: 'Player Management',
          description: 'View all players and manage them, all in one place',
          icon: "users-gear",
          authRequired: true,
          nav: {
            labelText: "Players",
            section: 2
          }
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
        name: 'bans',
        path: 'bans',
        alias: '/bans',
        component: () => import('../views/BansView.vue'),
        meta: {
          title: 'Player Bans',
          icon: "fa-gavel",
          nav: {
            section: 2,
          }
        },
      },
      {
        name: 'notes',
        path: 'notes',
        alias: '/notes',
        component: () => import('../views/PlayerNotesView.vue'),
        meta: {
          title: 'Player Notes',
          description: 'View notes that admins have left on players',
          icon: "fa-note-sticky",
          nav: {
            section: 2,
          }
        }
      },
      {
        name: 'create-custom-server',
        path: 'create-server',
        component: () => import('../views/admin/CustomServerWizard.vue'),
        meta: {
          title: 'Custom Servers',
          authRequired: true,
          // TODO: remove until impl
          searchable: false
        },
      }
    ]
  },
  {
    name: "Links",
    path: "/links",
    meta: {
      icon: "fa-link",
      nav: {
      },
      topLevel: true
    },
    children: [
      {
        name: "Game Stats",
        path: "game-stats",
        redirect: "https://stats.jackz.me/",
        meta: {
          icon: "fa-chart-simple",
          description: "Link to in-game statistics",
          nav: {
            isExternalLink: true,
          }
        }
      },
      {
        name: "Extended Stats",
        path: "metabase-stats",
        redirect: "https://data.jackz.me/public/dashboard/295194e5-e4c3-41a9-9298-0ea2a895f881",
        meta: {
          icon: "fa-chart-simple",
          description: "Link to extended statistics",
          nav: {
            isExternalLink: true,
          }
        }
      },
      {
        name: "Steam Group",
        path: "steam-group",
        redirect: "https://steamcommunity.com/groups/jackzl4d2",
        meta: {
          icon: "fab fa-steam",
          description: "Link to the steam group for joining 5+ games",
          nav: {
            isExternalLink: true,
            section: 1
          }
        }
      },
      {
        name: "Discord",
        path: "discord",
        redirect: "/api/admins/discord",
        meta: {
          icon: "fab fa-discord",
          description: "Link to the discord server",
          nav: {
            isExternalLink: true,
            section: 1
          }
        }
      }
    ]
  },
  {
    name: 'discuss',
    path: '/discuss',
    meta: {
      title: "Discussions",
      description: "Vote on topics",
      authRequired: true,
      icon: "fa-message",
      nav: {
        labelText: "Discuss"
      },
      topLevel: true
    },
    redirect: { name: "discuss-list" },
    children: [
      {
        name: "discuss-list",
        path: '',
        component: () => import('../views/DiscussionsView.vue'),
        meta: {
          title: "Discussions",
          searchable: false,
          authRequired: true,
        },
      },
      {
        name: 'discuss-new',
        path: 'new',
        component: () => import('../views/DiscussionEdit.vue'),
        meta: {
          title: "Create New Discussion",
          description: "Create a new public discussion",
          icon: "message-plus",
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
          prevRoute: "discuss",
          searchable: false
        },
      },
      {
        name: "discuss-view",
        path: ':id/:title?',
        component: () => import('../views/DiscussionsView.vue'),
        meta: {
          title: "Discussions",
          authRequired: true,
          searchable: false
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
      description: "Schedule time when everyone can participate in an activity",
      icon: "fa-calendar",
      authRequired: true,
      // nav: {
        
      // },
      topLevel: true
    },
    children: [
      {
        name: 'event-details',
        path: ':id/:title?',
        component: () => import('../views/EventDetailView.vue'),
        meta: {
          title: "Event Scheduler",
          prevRoute: "events",
          authRequired: true,
          searchable: false
        }
      },
    ]
  },
  {
    name: 'panel-dash',
    path: '/panel/dashboard',
    component: () => import('../views/panel-admin/Dashboard.vue'),
    meta: {
      title: "Panel Admin",
      authRequired: true,
      searchable: false
    }
  },
  {
    name: 'panel-first-time-setup',
    path: '/panel/first-time-setup',
    component: () => import('../views/panel-admin/SetupWizard.vue'),
    meta: {
      title: "First Time Setup",
      authRequired: true,
      hideNav: true,
      searchable: false
    }
  },
  {
    name: 'errorview',
    path: '/error',
    component: () => import('../views/ErrorView.vue'),
    meta: {
      hideHero: true,
      searchable: false
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
      description: "The requested resource could not be found",
      searchable: false
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
