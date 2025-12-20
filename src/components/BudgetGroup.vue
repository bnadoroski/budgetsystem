<template>
    <div class="budget-group">
        <div class="group-header" @click="handleToggle">
            <div class="group-info">
                <div class="group-color" :style="{ backgroundColor: group.color }"></div>
                <div class="group-text">
                    <h3 class="group-name">{{ group.name }}</h3>
                    <span class="group-count">{{ groupBudgets.length }} budget{{ groupBudgets.length !== 1 ? 's' : ''
                        }}</span>
                </div>
            </div>
            <div class="group-actions">
                <span class="group-total">{{ formatCurrency(groupTotal) }}</span>
                <svg class="expand-icon" :class="{ expanded: group.isExpanded }" width="20" height="20"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        </div>

        <Transition name="expand">
            <div v-if="group.isExpanded" class="group-budgets" @drop="handleDrop" @dragover.prevent="handleDragOver"
                @dragenter.prevent="handleDragEnter" @dragleave="handleDragLeave" :class="{ 'drag-over': isDragOver }">
                <button type="button" class="add-budget-btn-inside" @click.stop="handleAddBudgetToGroup"
                    title="Adicionar budget neste grupo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Adicionar Budget
                </button>
                <BudgetBar v-for="budget in groupBudgets" :key="budget.id" :budget="budget"
                    @edit="() => emit('editBudget', budget.id)" @delete="() => emit('deleteBudget', budget.id)"
                    @confirm-reset="() => emit('confirmReset', budget.id)"
                    @view-transactions="() => emit('viewTransactions', budget.id)" />
                <div v-if="groupBudgets.length === 0" class="no-budgets" @click="handleAddBudgetToGroup">
                    <p>Nenhum budget neste grupo</p>
                    <p class="add-hint">Clique para adicionar</p>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import type { BudgetGroup } from '@/types/budget'
import BudgetBar from './BudgetBar.vue'

const props = defineProps<{
    group: BudgetGroup
}>()

const emit = defineEmits<{
    editBudget: [budgetId: string]
    deleteBudget: [budgetId: string]
    addBudgetToGroup: [groupId: string]
    confirmReset: [budgetId: string]
    viewTransactions: [budgetId: string]
}>()

const budgetStore = useBudgetStore()
const isDragOver = ref(false)
const dragCounter = ref(0)

const handleAddBudgetToGroup = () => {
    emit('addBudgetToGroup', props.group.id)
}

const groupBudgets = computed(() => {
    // Filtra budgets não ocultos pelo usuário atual
    const authStore = useAuthStore()
    return budgetStore.budgets.filter(b => {
        if (b.groupId !== props.group.id) return false
        const hiddenBy = b.hiddenBy || []
        return !hiddenBy.includes(authStore.userId || '')
    })
})

const groupTotal = computed(() => {
    return groupBudgets.value.reduce((sum, b) => sum + b.totalValue, 0)
})

const handleToggle = () => {
    budgetStore.toggleGroupExpansion(props.group.id)
}

const formatCurrency = (value: number) => {
    const currencyCode = budgetStore.currency || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
}

const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = true
}

const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    dragCounter.value++
    isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
    dragCounter.value--
    if (dragCounter.value === 0) {
        isDragOver.value = false
    }
}

const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    dragCounter.value = 0
    isDragOver.value = false

    console.log('🎯 Drop event:', event)
    console.log('🎯 DataTransfer:', event.dataTransfer)
    console.log('🎯 DataTransfer types:', event.dataTransfer?.types)

    let budgetId = event.dataTransfer?.getData('budgetId')
    console.log('🎯 budgetId (custom):', budgetId)

    // Fallback para text/plain
    if (!budgetId) {
        budgetId = event.dataTransfer?.getData('text/plain')
        console.log('🎯 budgetId (text/plain fallback):', budgetId)
    }

    console.log('🎯 Drop detectado - budgetId:', budgetId, 'groupId:', props.group.id)

    if (budgetId && budgetId !== props.group.id) {
        try {
            await budgetStore.moveBudgetToGroup(budgetId, props.group.id)
            console.log('✅ Budget movido para grupo com sucesso')
        } catch (error) {
            console.error('❌ Erro ao mover budget:', error)
        }
    }
}
</script>

<style scoped>
.budget-group {
    margin: 16px 0;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.group-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    cursor: pointer;
    transition: background-color 0.2s;
}

.group-header:hover {
    background-color: #f5f5f5;
}

.group-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.group-color {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
}

.group-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.group-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.2;
}

.group-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
}

.group-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.group-total {
    font-size: 16px;
    font-weight: 600;
    color: #666;
}

.expand-icon {
    transition: transform 0.3s;
    color: #999;
}

.expand-icon.expanded {
    transform: rotate(180deg);
}

.group-budgets {
    padding: 0 16px 16px;
    transition: all 0.3s ease;
}

.group-budgets.drag-over {
    background-color: #e8f5e9;
    border: 2px dashed #4caf50;
    border-radius: 8px;
}

.add-budget-btn-inside {
    width: calc(100% - 32px);
    margin: 8px 16px;
    padding: 12px;
    background: #E8F5E9;
    color: #2E7D32;
    border: 2px dashed #81C784;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.add-budget-btn-inside:hover {
    background: #C8E6C9;
    border-color: #66BB6A;
    color: #1B5E20;
}

.add-budget-btn-inside:active {
    transform: scale(0.98);
}

.no-budgets {
    text-align: center;
    padding: 30px;
    color: #999;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 12px;
}

.no-budgets:hover {
    background: #f5f5f5;
    color: #666;
}

.no-budgets:active {
    transform: scale(0.98);
}

.add-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #4CAF50;
    font-weight: 500;
}

.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
    max-height: 1000px;
    overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
}

/* Dark Mode */
body.dark-mode .budget-group {
    background: #2d3748;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

body.dark-mode .group-header:hover {
    background-color: #3a4556;
}

body.dark-mode .group-name {
    color: #e2e8f0;
}

body.dark-mode .group-total {
    color: #cbd5e0;
}
</style>
