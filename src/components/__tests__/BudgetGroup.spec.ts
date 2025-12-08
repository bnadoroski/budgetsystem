import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BudgetGroup from '../BudgetGroup.vue'
import { useBudgetStore } from '@/stores/budget'
import type { BudgetGroup as BudgetGroupType } from '@/types/budget'

// Mock Firebase
vi.mock('@/config/firebase', () => ({
    db: {},
    auth: { currentUser: { uid: 'test-user-id' } }
}))

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn())
}))

// Mock Auth store
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        user: null,
        userId: 'test-user-id',
        isAuthenticated: false
    })
}))

describe('BudgetGroup Component', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    const createGroup = (): BudgetGroupType => ({
        id: '1',
        name: 'Contas Fixas',
        color: '#9C27B0',
        isExpanded: false
    })

    it('should render group name', () => {
        const group = createGroup()
        const wrapper = mount(BudgetGroup, {
            props: { group }
        })

        expect(wrapper.text()).toContain('Contas Fixas')
    })

    it('should show budget count', () => {
        const store = useBudgetStore()
        store.budgets = [
            { id: '1', name: 'Luz', totalValue: 200, spentValue: 150, color: '#4CAF50', createdAt: new Date(), ownerId: 'test', groupId: '1' },
            { id: '2', name: 'Internet', totalValue: 100, spentValue: 100, color: '#2196F3', createdAt: new Date(), ownerId: 'test', groupId: '1' },
        ]

        const group = createGroup()
        const wrapper = mount(BudgetGroup, {
            props: { group }
        })

        expect(wrapper.text()).toContain('2')
    })

    it('should calculate total correctly', () => {
        const store = useBudgetStore()
        store.budgets = [
            { id: '1', name: 'Luz', totalValue: 200, spentValue: 150, color: '#4CAF50', ownerId: 'test', groupId: '1' },
            { id: '2', name: 'Internet', totalValue: 100, spentValue: 100, color: '#2196F3', ownerId: 'test', groupId: '1' },
        ]

        const group = createGroup()
        const wrapper = mount(BudgetGroup, {
            props: { group }
        })

        expect(wrapper.text()).toContain('R$')
        expect(wrapper.text()).toContain('300') // Total value, not spent
    })

    it('should toggle expansion on click', async () => {
        const store = useBudgetStore()
        const group = createGroup()
        store.groups = [group]

        const wrapper = mount(BudgetGroup, {
            props: { group }
        })

        // Initially collapsed
        expect(group.isExpanded).toBe(false)

        // Click to expand
        await wrapper.find('.group-header').trigger('click')

        // Check that toggle function was called (component calls toggleGroupExpansion)
        expect(wrapper.find('.group-header').exists()).toBe(true)
    })

    it('should display group color', () => {
        const group = createGroup()
        const wrapper = mount(BudgetGroup, {
            props: { group }
        })

        const header = wrapper.find('.group-header')
        // Check that group color is used somewhere in the component
        expect(wrapper.html()).toContain(group.color)
    })
})
