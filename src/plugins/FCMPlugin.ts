import { registerPlugin } from '@capacitor/core'

export interface FCMPlugin {
    /**
     * Get the FCM device token
     */
    getToken(): Promise<{ token: string }>

    /**
     * Set the badge count on the app icon
     */
    setBadge(options: { count: number }): Promise<void>

    /**
     * Clear the badge count
     */
    clearBadge(): Promise<void>

    /**
     * Show a local notification
     */
    showLocalNotification(options: {
        title: string
        body: string
        data?: Record<string, any>
    }): Promise<void>
}

const FCM = registerPlugin<FCMPlugin>('FCMPlugin', {
    web: () => {
        return {
            getToken: async () => {
                console.warn('FCM not available on web')
                return { token: 'web-mock-token' }
            },
            setBadge: async () => {
                console.warn('FCM badges not available on web')
            },
            clearBadge: async () => {
                console.warn('FCM badges not available on web')
            },
            showLocalNotification: async () => {
                console.warn('FCM notifications not available on web')
            }
        }
    }
})

export default FCM
