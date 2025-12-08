import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BudgetBar from '../BudgetBar.vue'
import type { Budget } from '@/types/budget'

// Mock Auth store
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        user: null,
        userId: 'test-user-id',
        isAuthenticated: false
    })
}))

describe('BudgetBar Component', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    const createBudget = (overrides = {}): Budget => ({
        id: '1',
        name: 'Test Budget',
        totalValue: 1000,
        spentValue: 250,
        color: '#4CAF50',
        createdAt: new Date(),
        ownerId: 'test-user-id',
        ...overrides
    })

    it('should render budget name', () => {
        const budget = createBudget()
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        expect(wrapper.text()).toContain('Test Budget')
    })

    it('should display percentage by default', () => {
        const budget = createBudget()
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        expect(wrapper.text()).toContain('25%')
    })

    it('should toggle display mode on click', async () => {
        const budget = createBudget()
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        // Initially shows percentage
        expect(wrapper.text()).toContain('25%')

        // Click to toggle
        await wrapper.find('.budget-bar').trigger('click')

        // Now should show values
        expect(wrapper.text()).toContain('R$')
    })

    it('should apply correct color gradient', () => {
        const budget = createBudget({ color: '#FF5722' })
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        const fill = wrapper.find('.budget-fill')
        const style = fill.attributes('style')

        expect(style).toContain('#FF5722')
        expect(style).toContain('linear-gradient')
    })

    it('should calculate correct width based on percentage', () => {
        const budget = createBudget({ spentValue: 500 })
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        const fill = wrapper.find('.budget-fill')
        const style = fill.attributes('style')

        expect(style).toContain('width: 50%')
    })

    it('should handle 0 spent value', () => {
        const budget = createBudget({ spentValue: 0 })
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        expect(wrapper.text()).toContain('0%')
    })

    it('should cap at 100% when overspent', () => {
        const budget = createBudget({ spentValue: 1500 })
        const wrapper = mount(BudgetBar, {
            props: { budget }
        })

        const fill = wrapper.find('.budget-fill')
        const style = fill.attributes('style')

        // Width should be capped at 100%
        expect(wrapper.text()).toContain('100%')
    })
})
