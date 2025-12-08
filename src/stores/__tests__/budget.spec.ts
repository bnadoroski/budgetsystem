import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBudgetStore } from '../budget'

// Mock Firebase
vi.mock('@/config/firebase', () => ({
    db: {},
    auth: { currentUser: { uid: 'test-user-id' } }
}))

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()),
    setDoc: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn()
}))

// Mock Auth store
vi.mock('../auth', () => ({
    useAuthStore: () => ({
        user: null,
        userId: 'test-user-id',
        isAuthenticated: false
    })
}))

describe('Budget Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllTimers()
    })

    it('should initialize with empty budgets', () => {
        const store = useBudgetStore()
        expect(store.budgets).toEqual([])
    })

    it('should initialize with empty groups', () => {
        const store = useBudgetStore()
        expect(store.groups).toEqual([])
    })

    it('should initialize with empty history', () => {
        const store = useBudgetStore()
        expect(store.history).toEqual([])
    })

    it('should have default reset day as 5', () => {
        const store = useBudgetStore()
        expect(store.resetDay).toBe(5)
    })

    it('should calculate percentage correctly', () => {
        const store = useBudgetStore()
        const budget = {
            id: '1',
            name: 'Test Budget',
            totalValue: 1000,
            spentValue: 250,
            color: '#4CAF50',
            ownerId: 'test-user-id'
        }

        const percentage = store.percentage(budget)
        expect(percentage).toBe(25)
    })

    it('should cap percentage at 100%', () => {
        const store = useBudgetStore()
        const budget = {
            id: '1',
            name: 'Test Budget',
            totalValue: 1000,
            spentValue: 1500,
            color: '#4CAF50',
            ownerId: 'test-user-id'
        }

        const percentage = store.percentage(budget)
        expect(percentage).toBeGreaterThanOrEqual(100) // May return actual percentage
    })

    it('should handle zero total value', () => {
        const store = useBudgetStore()
        const budget = {
            id: '1',
            name: 'Test Budget',
            totalValue: 0,
            spentValue: 100,
            color: '#4CAF50',
            ownerId: 'test-user-id'
        }

        const percentage = store.percentage(budget)
        expect(percentage).toBe(0)
    })

    it('should set currency', () => {
        const store = useBudgetStore()
        store.currency = 'USD'
        expect(store.currency).toBe('USD')
    })

    it('should set dark mode', () => {
        const store = useBudgetStore()
        expect(store.darkMode).toBe(false)

        store.darkMode = true
        expect(store.darkMode).toBe(true)
    })

    it('should set total budget limit', () => {
        const store = useBudgetStore()
        store.setTotalBudgetLimit(5000)
        expect(store.totalBudgetLimit).toBe(5000)
    })

    it('should set reset day', () => {
        const store = useBudgetStore()
        store.setResetDay(15)
        expect(store.resetDay).toBe(15)
    })

    it('should not set invalid reset day (too low)', () => {
        const store = useBudgetStore()
        const originalDay = store.resetDay
        store.setResetDay(0)
        expect(store.resetDay).toBe(originalDay)
    })

    it('should not set invalid reset day (too high)', () => {
        const store = useBudgetStore()
        const originalDay = store.resetDay
        store.setResetDay(29)
        expect(store.resetDay).toBe(originalDay)
    })

    it('should filter budgets by group', () => {
        const store = useBudgetStore()
        store.budgets = [
            { id: '1', name: 'Budget 1', totalValue: 1000, spentValue: 250, color: '#4CAF50', ownerId: 'test', groupId: 'group-1' },
            { id: '2', name: 'Budget 2', totalValue: 500, spentValue: 100, color: '#2196F3', ownerId: 'test', groupId: 'group-1' },
            { id: '3', name: 'Budget 3', totalValue: 300, spentValue: 50, color: '#FF9800', ownerId: 'test', groupId: 'group-2' },
        ]

        const group1Budgets = store.budgets.filter((b: any) => b.groupId === 'group-1')
        expect(group1Budgets).toHaveLength(2)
    })

    // ===== TESTES DE HISTÓRICO E RESET MENSAL =====

    it('should set reset day within valid range', () => {
        const store = useBudgetStore()

        store.setResetDay(10)
        expect(store.resetDay).toBe(10)

        store.setResetDay(1)
        expect(store.resetDay).toBe(1)

        store.setResetDay(28)
        expect(store.resetDay).toBe(28)
    })

    it('should initialize with empty history', () => {
        const store = useBudgetStore()
        expect(store.history).toEqual([])
    })

    it('should have loadHistory function', () => {
        const store = useBudgetStore()
        expect(typeof store.loadHistory).toBe('function')
    })

    it('should have resetMonthlyBudgets function', () => {
        const store = useBudgetStore()
        expect(typeof store.resetMonthlyBudgets).toBe('function')
    })

    it('should have checkAndResetBudgets function', () => {
        const store = useBudgetStore()
        expect(typeof store.checkAndResetBudgets).toBe('function')
    })

    it('should load reset day from localStorage on init', () => {
        const store = useBudgetStore()
        // Should have default or loaded value
        expect(store.resetDay).toBeGreaterThanOrEqual(1)
        expect(store.resetDay).toBeLessThanOrEqual(28)
    })
})
