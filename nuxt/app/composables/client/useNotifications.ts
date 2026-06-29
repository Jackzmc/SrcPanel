import { NotificationLevel, type UserNotification } from "@srcpanel/common/User";
import type { ToastProps } from "@nuxt/ui";

export function useNotifications() {
  const notifications = ref<UserNotification[]>([]);
  const toast = useToast();

  let source: EventSource | null = null;

  async function subscribe() {
    source?.close();

    source = new EventSource(`/api/auth/notifications/sse`);

    source.onmessage = (msg) => {
      const json: UserNotification = JSON.parse(msg.data);
      notifications.value.push(json);
      // TODO: other properties

      const actions: ToastProps["actions"] = [];
      if (json.link) {
        actions.push({
          label: json.link,
          href: json.link,

        });
      }

      const data = getLevelData(json.level);

      toast.add({
        icon: "lucide:bell-ring",
        title: "New Notification",
        description: json.message,
        color: data.color,
        orientation: "vertical",
        actions,
        duration: 5000,
      });
    };
    source.onerror = () => {
      console.error("notification err");
      source!.close();
    };
  }

  async function clearNotifications() {
    const result = await request<null>("/api/auth/notifications", {
      method: "DELETE",
    });
    if ("error" in result) {
      toast.add({
        title: "Failed to clear notifications",
        description: result.error.message,
        color: "error",
      });
    } else {
      notifications.value = [];
    }
  }

  onUnmounted(() => source?.close());

  return { notifications, subscribe, clearNotifications };
}

export type Color = "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral" | undefined;

const NOTIFICATION_DATA: Record<NotificationLevel, { icon: string; color: Color; textClass: string }> = {
  [NotificationLevel.Default]: {
    icon: "lucide:message-square",
    color: "neutral",
    textClass: "text-neutral",
  },
  [NotificationLevel.Info]: {
    icon: "lucide:info",
    color: "primary",
    textClass: "text-primary",
  },
  [NotificationLevel.Success]: {
    icon: "lucide:check",
    color: "success",
    textClass: "text-success",
  },
  [NotificationLevel.Warning]: {
    icon: "lucide:circle-alert",
    color: "warning",
    textClass: "text-warning",
  },
  [NotificationLevel.Error]: {
    icon: "lucide:circle-x",
    color: "error",
    textClass: "text-error",
  },
};

export function getLevelData(level?: NotificationLevel) {
  return NOTIFICATION_DATA[level ?? NotificationLevel.Default];
}
