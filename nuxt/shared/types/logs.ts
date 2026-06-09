export const TYPE_MAP: Record<string, { icon: string; color?: string; className?: string; label?: string }> = {
  INFO: {
    icon: "lucide:info",
    color: "var(--ui-info)",
    className: "bg-info",
  },
  QUIT: {
    icon: "lucide:door-open",
    color: "var(--ui-error)",
    className: "bg-error",
  },
  JOIN: {
    icon: "lucide:plus",
    color: "var(--ui-success)",
    className: "bg-success",
  },
  ACTION: {
    icon: "lucide:sparkle",
    color: "var(--ui-warning)",
    className: "bg-warning",
  },
  STATE: {
    icon: "lucide:activity",
    className: "bg-light-blue text-black dark:text-white",
  },
  CHAT: {
    icon: "lucide:message-circle",
    className: "bg-neutral-200 text-black",
  },
  web: {
    icon: "lucide:globe",
    label: "WEB",
  },
  ADMIN_CHAT: {
    icon: "lucide:message-circle-more",
    className: "bg-amber-200 text-black",
    label: "ADMIN CHAT",
  },
};
