export interface Budget {
    id: string
    name: string
    totalValue: number
    spentValue: number
    color: string
}

export type DisplayMode = 'percentage' | 'values'
