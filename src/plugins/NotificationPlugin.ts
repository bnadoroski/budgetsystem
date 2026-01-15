import { registerPlugin } from '@capacitor/core'

export interface NotificationPluginPlugin {
    // Verifica se tem permissão de notificação
    checkPermission(): Promise<{ hasPermission: boolean }>

    // Abre configurações para habilitar permissão
    requestPermission(): Promise<void>

    // Verifica se está ignorando otimizações de bateria
    checkBatteryOptimization(): Promise<{ isIgnoring: boolean }>

    // Solicita para ignorar otimizações de bateria (importante para background)
    requestIgnoreBatteryOptimization(): Promise<void>

    // Abre configurações de bateria do app
    openBatterySettings(): Promise<void>

    // Abre configurações de notificação do app
    openNotificationSettings(): Promise<void>

    // Carrega despesas pendentes que foram salvas enquanto o app estava fechado
    loadPendingExpenses(): Promise<{ expenses: BankExpenseEvent[], count: number }>

    // Limpa as despesas pendentes após serem processadas
    clearPendingExpenses(): Promise<void>

    // Listener para receber notificações de gastos
    addListener(
        eventName: 'bankExpense',
        listenerFunc: (expense: BankExpenseEvent) => void
    ): Promise<void>

    // Listener para verificação de email
    addListener(
        eventName: 'emailVerification',
        listenerFunc: (data: EmailVerificationEvent) => void
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

export interface EmailVerificationEvent {
    title: string
    text: string
}

const NotificationPlugin = registerPlugin<NotificationPluginPlugin>('NotificationPlugin')

export default NotificationPlugin
