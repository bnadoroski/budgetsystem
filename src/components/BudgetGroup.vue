<template>
    <div class="budget-group">
        <div class="group-header" @click="handleToggle">
            <div class="group-info">
                <div class="group-color" :style="{ backgroundColor: group.color }"></div>
                <h3 class="group-name">{{ group.name }}</h3>
                <span class="group-count">({{ groupBudgets.length }})</span>
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
            <div v-if="group.isExpanded" class="group-budgets">
                <BudgetBar v-for="budget in groupBudgets" :key="budget.id" :budget="budget"
                    @edit="() => emit('editBudget', budget.id)" @delete="() => emit('deleteBudget', budget.id)" />
                <div v-if="groupBudgets.length === 0" class="no-budgets">
                    <p>Nenhum budget neste grupo</p>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import type { BudgetGroup } from '@/types/budget'
import BudgetBar from './BudgetBar.vue'

const props = defineProps<{
    group: BudgetGroup
}>()

const emit = defineEmits<{
    editBudget: [budgetId: string]
    deleteBudget: [budgetId: string]
    addBudgetToGroup: [groupId: string]
}>()

const budgetStore = useBudgetStore()

const handleAddBudgetToGroup = () => {
    emit('addBudgetToGroup', props.group.id)
}

const groupBudgets = computed(() => {
    return budgetStore.budgets.filter(b => b.groupId === props.group.id)
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
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
}

.group-header:hover {
    background-color: #f5f5f5;
}

.group-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.group-color {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
}

.group-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
}

.group-count {
    font-size: 14px;
    color: #999;
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
