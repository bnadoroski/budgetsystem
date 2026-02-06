export interface Budget {
    id: string
    name: string
    totalValue: number
    spentValue: number
    color: string
    groupId?: string
    sharedWith?: string[] // Array of user IDs
    ownerId: string
    ownerEmail?: string
    currentMonth?: string // YYYY-MM format
    hiddenBy?: string[] // Array of user IDs who hid this budget
}

export interface BudgetGroup {
    id: string
    name: string
    color: string
    isExpanded: boolean
}

export interface BudgetHistory {
    id: string
    budgetId: string
    budgetName: string
    totalValue: number
    spentValue: number
    color: string
    groupId?: string
    month: string // YYYY-MM format
    closedAt: Date
}

export interface ShareInvite {
    id: string
    fromUserId: string
    fromUserEmail: string
    toUserEmail: string
    toUserId?: string
    budgetIds: string[]
    totalBudgetLimit?: number // Limite do remetente (fromUser)
    partnerTotalBudgetLimit?: number // Limite do destinatário (toUser) - atualizado quando aceita ou muda
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: Date
    respondedAt?: Date
    viewedAt?: Date // Quando o usuário viu o convite pela primeira vez
    senderNotifiedAt?: Date // Quando o remetente foi notificado da resposta
}

export interface Merchant {
    id: string
    name: string
    normalizedName: string
    createdAt: Date
    foundCount: number // Quantas vezes foi detectado
}

export interface MerchantBudgetMapping {
    id: string
    merchantName: string
    normalizedMerchant: string  // Nome normalizado para busca (lowercase, sem acentos)
    budgetId: string
    budgetName: string
    userId: string
    createdAt: Date
    lastUsedAt: Date
    useCount: number
}

export interface Transaction {
    id: string
    budgetId: string
    budgetName: string
    amount: number
    merchantName?: string
    merchantId?: string
    description: string
    isInstallment: boolean
    installmentNumber?: number
    installmentTotal?: number
    createdAt: Date
    userId: string
    bank?: string
    isIncome?: boolean
    deletedAt?: Date  // Exclusão lógica - usado para histórico
    resetMonth?: string  // Mês em que foi resetado (YYYY-MM)
}

export interface AggregatedBudget {
    name: string
    budgets: Budget[]
    totalValue: number
    spentValue: number
    color: string
    groupId?: string
}

export type DisplayMode = 'percentage' | 'values'

// === SUBSCRIPTION / SAAS TYPES ===

export type SubscriptionPlan = 'free' | 'premium'

export interface Subscription {
    plan: SubscriptionPlan
    premiumMonths: number // Meses restantes de premium (0 = free)
    premiumStartDate?: Date
    premiumEndDate?: Date
    referralCode: string // Código único para indicar amigos
    referredBy?: string // userId de quem indicou
    referralBonusMonths: number // Meses ganhos por indicações ativas
}

export interface Referral {
    id: string
    referrerId: string // Quem indicou
    referredUserId: string // Quem foi indicado
    referredUserEmail: string
    createdAt: Date
    isActive: boolean // Se o usuário indicado está ativo (usou o app no mês atual)
    lastActiveMonth?: string // YYYY-MM format
    bonusAppliedMonths: string[] // Lista de meses em que o bônus já foi aplicado
    status?: 'pending' | 'validated' | 'expired' // Status da indicação
}

export interface UserProfile {
    email: string
    displayName?: string
    photoURL?: string
    createdAt: string
    updatedAt: string
    lastActiveAt: string
    fcmToken?: string
    fcmTokenUpdatedAt?: string
    notificationsEnabled?: boolean
    // Subscription fields
    subscription: Subscription
    termsAcceptedAt?: string // Data de aceite dos termos
    termsVersion?: string // Versão dos termos aceitos
}

export const PREMIUM_PRICE = 19.90
export const TERMS_VERSION = '2.0.0'

// Features disponíveis por plano
export const PLAN_FEATURES = {
    free: {
        maxBudgets: 10,
        sharing: false,
        autoNotifications: false,
        history: true,
        groups: true
    },
    premium: {
        maxBudgets: Infinity,
        sharing: true,
        autoNotifications: true,
        history: true,
        groups: true
    }
}
