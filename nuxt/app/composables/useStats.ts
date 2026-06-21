import type { PlayerFull } from '@jackzmc/l4d2-stats-api-types/player'
export function useStats() {
    const config = useRuntimeConfig()
    const statsUrl = config.public.statsUrl

    async function getUserStats(steamid: string): Promise<PlayerFull | null> {
        return $fetch<PlayerFull>(`${statsUrl}/api/users/${steamid}`)
    }


    return { getUserStats }
}