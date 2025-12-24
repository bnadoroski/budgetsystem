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
    totalBudgetLimit?: number
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
    merchantId: string
    merchantName: string
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
