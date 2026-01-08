import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HistoryModal from '../HistoryModal.vue'
import { useBudgetStore } from '@/stores/budget'
import type { BudgetHistory } from '@/types/budget'

// Mock Auth store
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({
        user: null,
        userId: 'test-user-id',
        isAuthenticated: false
    })
}))

describe('HistoryModal Component', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('should render when show is true', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should not render when show is false', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: false }
        })

        expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should emit close event when close button clicked', async () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        await wrapper.find('.close-button').trigger('click')

        expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should display month name in header', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        const header = wrapper.find('.modal-header h2')
        expect(header.text()).toContain('Histórico')
    })

    it('should show current month data when modal opens', async () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        // Wait for loading to finish
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 10))

        // Modal now starts showing current month
        expect(wrapper.text()).toContain('Dados do mês atual')
    })

    it('should calculate percentage correctly', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        const item: BudgetHistory = {
            id: '1',
            budgetId: 'budget-1',
            budgetName: 'Test Budget',
            totalValue: 1000,
            spentValue: 250,
            color: '#4CAF50',
            month: '2025-11',
            closedAt: new Date()
        }

        const percentage = (wrapper.vm as any).percentage(item)
        expect(percentage).toBe(25)
    })

    it('should format currency correctly', () => {
        const budgetStore = useBudgetStore()
        budgetStore.currency = 'BRL'

        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        const formatted = (wrapper.vm as any).formatCurrency(1000)
        expect(formatted).toContain('R$')
    })

    it('should calculate total budgeted from history items', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

            // Set history items directly
            ; (wrapper.vm as any).historyItems = [
                { id: '1', budgetId: 'b1', budgetName: 'Budget 1', totalValue: 1000, spentValue: 500, color: '#4CAF50', month: '2025-11', closedAt: new Date() },
                { id: '2', budgetId: 'b2', budgetName: 'Budget 2', totalValue: 500, spentValue: 300, color: '#2196F3', month: '2025-11', closedAt: new Date() },
            ]

        const total = (wrapper.vm as any).totalBudgeted
        expect(total).toBe(1500)
    })

    it('should calculate total spent from history items', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

            ; (wrapper.vm as any).historyItems = [
                { id: '1', budgetId: 'b1', budgetName: 'Budget 1', totalValue: 1000, spentValue: 500, color: '#4CAF50', month: '2025-11', closedAt: new Date() },
                { id: '2', budgetId: 'b2', budgetName: 'Budget 2', totalValue: 500, spentValue: 300, color: '#2196F3', month: '2025-11', closedAt: new Date() },
            ]

        const total = (wrapper.vm as any).totalSpent
        expect(total).toBe(800)
    })

    it('should calculate difference correctly', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

            ; (wrapper.vm as any).historyItems = [
                { id: '1', budgetId: 'b1', budgetName: 'Budget 1', totalValue: 1000, spentValue: 500, color: '#4CAF50', month: '2025-11', closedAt: new Date() },
            ]

        const difference = (wrapper.vm as any).difference
        expect(difference).toBe(500) // 1000 - 500
    })

    it('should darken color correctly', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        const darkened = (wrapper.vm as any).darkenColor('#4CAF50')
        expect(darkened).toMatch(/^#[0-9a-f]{6}$/i)
        expect(darkened).not.toBe('#4CAF50')
    })

    it('should cap percentage at 100', () => {
        const wrapper = mount(HistoryModal, {
            props: { show: true }
        })

        const item: BudgetHistory = {
            id: '1',
            budgetId: 'budget-1',
            budgetName: 'Test Budget',
            totalValue: 1000,
            spentValue: 1500,
            color: '#4CAF50',
            month: '2025-11',
            closedAt: new Date()
        }

        const percentage = (wrapper.vm as any).percentage(item)
        expect(percentage).toBe(100)
    })
})
