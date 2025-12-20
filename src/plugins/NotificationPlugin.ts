import { registerPlugin } from '@capacitor/core'

export interface NotificationPluginPlugin {
    // Verifica se tem permissão de notificação
    checkPermission(): Promise<{ hasPermission: boolean }>

    // Abre configurações para habilitar permissão
    requestPermission(): Promise<void>

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
    merchantName?: string
    installmentNumber?: number
    installmentTotal?: number
}

const NotificationPlugin = registerPlugin<NotificationPluginPlugin>('NotificationPlugin')

export default NotificationPlugin
