import { registerPlugin } from '@capacitor/core'

export interface FCMTokenPluginInterface {
    getToken(): Promise<{ token: string }>
    saveTokenToFirestore(options: { userId: string }): Promise<{ success: boolean; token: string }>
    forceRefreshToken(): Promise<{ token: string }>
}

const FCMTokenPlugin = registerPlugin<FCMTokenPluginInterface>('FCMTokenPlugin', {
    web: () => ({
        async getToken() {
            console.log('FCMTokenPlugin.getToken() - web stub')
            return { token: '' }
        },
        async saveTokenToFirestore() {
            console.log('FCMTokenPlugin.saveTokenToFirestore() - web stub')
            return { success: false, token: '' }
        },
        async forceRefreshToken() {
            console.log('FCMTokenPlugin.forceRefreshToken() - web stub')
            return { token: '' }
        }
    })
})

export { FCMTokenPlugin }
