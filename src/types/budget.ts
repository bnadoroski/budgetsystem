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
    budgetIds: string[]
    totalBudgetLimit?: number
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: Date
    respondedAt?: Date
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
