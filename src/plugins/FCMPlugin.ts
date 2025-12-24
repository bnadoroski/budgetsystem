import { PushNotifications } from '@capacitor/push-notifications';
import { useBudgetStore } from '@/stores/budget';
import { Preferences } from '@capacitor/preferences';
import { useAuthStore } from '@/stores/auth';

export interface FCMNotificationOptions {
    title: string
    body: string
    data?: { [key: string]: string }
}

export async function initFCM() {
    const authStore = useAuthStore();

    // Salva userId no Android SharedPreferences para uso nativo
    if (authStore.user?.uid) {
        await Preferences.set({
            key: 'userId',
            value: authStore.user.uid
        });
        console.log('✅ UserId salvo no SharedPreferences:', authStore.user.uid);
    }

    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
    }

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Send token to your server
        sendTokenToServer(token.value);
    });

    // Some issue with your setup and push will not work
    PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));

        // Parse notification data and add expense
        const budgetStore = useBudgetStore();
        if (notification.data.type === 'expense' && notification.data.budgetId) {
            budgetStore.addExpense(
                notification.data.budgetId,
                parseFloat(notification.data.amount)
            );
        }
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
    });
}

async function sendTokenToServer(token: string) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        // Save token to Firestore
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');

        await setDoc(doc(db, 'users', userId, 'devices', 'current'), {
            fcmToken: token,
            updatedAt: new Date()
        });

        console.log('✅ FCM token saved to Firestore');
    } catch (error) {
        console.error('❌ Error saving FCM token:', error);
    }
}

export async function getToken() {
    try {
        // No Capacitor, o token vem do listener de registration
        // Aqui podemos buscar do localStorage ou Preferences se salvo
        const result = await Preferences.get({ key: 'fcmToken' })
        return { token: result.value || '' }
    } catch (error) {
        console.error('Error getting FCM token:', error)
        return { token: '' }
    }
}

export async function showLocalNotification(options: FCMNotificationOptions) {
    try {
        // Usa a API nativa de notificações locais
        await PushNotifications.createChannel({
            id: 'default',
            name: 'Default',
            importance: 5,
            visibility: 1,
            vibration: true
        })

        // Schedule local notification (não há método direto, usa PushNotifications)
        console.log('📬 Local notification:', options.title)
        // Para web/dev, apenas loga
        if (import.meta.env.DEV) {
            console.log('Local notification (DEV):', options)
        }
    } catch (error) {
        console.error('Error showing local notification:', error)
    }
}

// Export default para compatibilidade
export default {
    initFCM,
    getToken,
    showLocalNotification
}

