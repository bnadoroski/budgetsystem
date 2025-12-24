import { registerPlugin } from '@capacitor/core'

export interface BadgePlugin {
    /**
     * Define o número no badge do ícone do app
     * @param options Objeto com propriedade count (número de notificações pendentes)
     */
    setBadge(options: { count: number }): Promise<void>

    /**
     * Remove o badge do ícone do app
     */
    clearBadge(): Promise<void>

    /**
     * Verifica se o launcher atual suporta badges
     * @returns Promise com objeto { supported: boolean }
     */
    isBadgeSupported(): Promise<{ supported: boolean }>
}

const Badge = registerPlugin<BadgePlugin>('Badge', {
    web: () => ({
        async setBadge() {
            console.log('Badge.setBadge() não suportado na web')
        },
        async clearBadge() {
            console.log('Badge.clearBadge() não suportado na web')
        },
        async isBadgeSupported() {
            return { supported: false }
        }
    })
})

export default Badge
