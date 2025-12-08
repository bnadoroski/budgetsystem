import { registerPlugin } from '@capacitor/core'

export interface NotificationPluginPlugin {
    // Listener para receber notificações de gastos
    addListener(
        eventName: 'bankExpense',
        listenerFunc: (expense: BankExpenseEvent) => void
    ): Promise<void>
}

export interface BankExpenseEvent {
    amount: number
    bank: string
    description: string
    category: string
    timestamp: number
}

const NotificationPlugin = registerPlugin<NotificationPluginPlugin>('NotificationPlugin')

export default NotificationPlugin
