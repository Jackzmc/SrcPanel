import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

export function useNavigation() {
  const { isLoggedIn, logout } = useAuth();

  // const docs = queryCollection("docs").all()
  const { data: docs } = useAsyncData("docs-nav", () =>
    queryCollection("docs").all(),
  );

  const docsDropdown = computed(() => {
    return {
      label: "Docs",
      description: "Documentation pages for various things",
      icon: "lucide:book",
      children: docs.value?.map(doc => {
        return {
          href: doc.path,
          label: doc.title,
          // icon: doc.icon
        };
      })
        .concat([
          {
            href: "/docs/ftt",
            label: "Feed The Trolls",
          },
          {
            href: "/docs/info",
            label: "Rules & Procedures",
          },
        ]),
    };
  });

  const adminDropdown: NavigationMenuItem = {
    label: "Administration",
    description: "Admin tools",
    icon: "lucide:toolbox",
    children: [
      {
        href: "/admin/audit",
        label: "Audit Logs",
        icon: "lucide:logs",
      },
      {
        href: "/admin/shares",
        label: "Addons & Files",
        icon: "lucide:folder-tree",
      },
      {
        href: "/admin/servers",
        label: "Manage Servers",
        icon: "lucide:server",
      },
      {
        href: "/admin/players/recent",
        label: "Manage Players",
        icon: "lucide:users",
      },
      {
        href: "/admin/bans",
        label: "Player Bans",
        icon: "lucide:gavel",
      },
      {
        href: "/admin/notes",
        label: "Player Notes",
        icon: "lucide:sticky-note",
      },
    ],
  };

  const linksDropdown = computed(() => {
    const list: NavigationMenuItem[] = [
      {
        href: "https://stats.jackz.me/",
        label: "Game Stats",
        icon: "lucide:chart-pie",
      },
      {
        href: "https://data.jackz.me/public/dashboard/295194e5-e4c3-41a9-9298-0ea2a895f881",
        label: "Extended Stats",
        icon: "lucide:chart-column-big",
      },
      {
        href: "https://steamcommunity.com/groups/jackzl4d2",
        label: "Steam Group",
        icon: "simple-icons:steam",
      },
      {
        href: "https://fluxer.gg/7opLPRTU",
        label: "Fluxer.gg Server",
        admin: true,
      },
      {
        href: "https://app.youform.com/forms/uzxsbsaf",
        label: "Anonymous Report Form",
        icon: "lucide:form",
        admin: true,
      },
    ];
    return {
      label: "Links",
      description: "External links",
      icon: "lucide:link",
      children: list.filter(item => isLoggedIn.value || !item.admin),
    };
  });

  const userDropdown: DropdownMenuItem[][] = [
    [
      {
        href: "/users/@me",
        label: "My Profile",
      },
      {
        href: "#settings",
        label: "Settings",
      },
      {
        href: "/panel/overview",
        label: "Panel Administration",
      },
    ],
    [
      {
        label: "Logout",
        class: "text-error",
        onSelect: logout,
      },
    ],
  ];

  const routes = computed<NavigationMenuItem[]>(() => [
    {
      href: "/",
      label: "Overview",
      description: "Server status & instructions",
      icon: "lucide:house",
    },
    docsDropdown.value,
    {
      label: "Tools",
      description: "Simple tools",
      icon: "lucide:component",
      children: [
        {
          href: "/docs/commands",
          label: "Commands",
          icon: "ri:slash-commands",
        },
        {
          href: "/docs/cvars",
          label: "Cvars",
          icon: "ri:settings-2-line",
        },
        {
          href: "/docs/maps",
          label: "L4D2 Maps",
          icon: "ri:map-line",
        },
        {
          href: "/docs/keybinds",
          label: "Keybind Generator",
          icon: "ri:keyboard-line",
        },
        {
          href: "/docs/tutorials",
          label: "Tutorials",
          icon: "ri:question-fill",
        },
      ],
    },
    ...(isLoggedIn.value ? [adminDropdown] : []),
    linksDropdown.value,
    { href: "/discuss", label: "Discuss", description: "Admin panel discussions" },
  ]);

  return { routes, userDropdown };
}
