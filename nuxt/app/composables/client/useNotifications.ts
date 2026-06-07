import type { UserNotification } from "@jzpanel/common/User"

export function useNotifications() {
    const notifications = ref<UserNotification[]>([])
    // const totalResults = computed(() => Object.values(results.value).map(r => r.))

    let source: EventSource | null = null

    async function execute() {
        source?.close()

        source = new EventSource(`/api/auth/notifications/sse`)

        source.onmessage = (msg) => {
            const json: UserNotification = JSON.parse(msg.data)
            notifications.value.push(json)
        }
        source.onerror = () => {
            console.error('notification err')
            source!.close()
        }
    }

    async function clearNotifications() {
        const toast = useToast()
        const result = await request("/api/auth/notifications", {
            method: 'DELETE'
        }) 
        if('error' in result) {
            toast.add({
                title: 'Failed to clear notifications',
                description: result.error.message,
                color: 'error'
            })
        } else {
            notifications.value = []
        }
    }


    onBeforeMount(() => {
        execute()
    })

    onUnmounted(() => source?.close())

    return { notifications, clearNotifications }
}