<template>
    <div class="aggregated-budget-container">
        <div class="budget-bar">
            <div class="budget-label" :class="{ 'overbudget': percentage >= 100 }">
                {{ aggregatedBudget.name }}
                <span class="shared-badge">👥</span>
            </div>
            <div class="budget-progress" @click="toggleDisplayMode" @touchstart="longPress.onTouchStart"
                @touchend="longPress.onTouchEnd" @touchmove="longPress.onTouchMove">
                <div class="budget-fill" :style="{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, ${darkenColor(aggregatedBudget.color)}, ${aggregatedBudget.color})`
                }">
                    <span v-if="displayMode === 'values'" class="budget-value-inside">
                        {{ formatCurrency(aggregatedBudget.spentValue) }}
                    </span>
                </div>
                <div class="budget-value-outside">
                    <template v-if="displayMode === 'percentage'">
                        {{ percentage }}%
                    </template>
                    <template v-else>
                        <span class="split-values">
                            {{ formatBudgetValues() }}
                        </span>
                    </template>
                </div>
            </div>
            <div class="owners-info">
                <span v-for="budget in aggregatedBudget.budgets" :key="budget.id" class="owner-tag">
                    {{ budget.ownerEmail || 'Você' }}: {{ formatCurrency(budget.totalValue) }}
                </span>
            </div>
        </div>

        <!-- Menu de contexto -->
        <Teleport to="body">
            <Transition name="context-menu">
                <div v-if="showContextMenu" class="context-menu" @click.stop>
                    <div class="context-header">Gerenciar Budgets</div>
                    <div v-for="budget in aggregatedBudget.budgets" :key="budget.id" class="budget-item">
                        <span class="budget-owner">{{ budget.ownerEmail || 'Você' }}</span>
                        <div class="budget-actions">
                            <button v-if="canEdit(budget)" class="context-btn edit" @click="handleEdit(budget.id)">
                                Editar
                            </button>
                            <button class="context-btn transactions" @click="handleViewTransactions(budget.id)">
                                Ver Lançamentos
                            </button>
                            <button v-if="canReset(budget)" class="context-btn reset" @click="handleReset(budget.id)">
                                Resetar
                            </button>
                            <button v-if="!canEdit(budget)" class="context-btn hide" @click="handleHide(budget.id)">
                                {{ isHidden(budget) ? 'Mostrar' : 'Ocultar' }}
                            </button>
                        </div>
                    </div>
                    <button class="context-btn cancel" @click="showContextMenu = false">Fechar</button>
                </div>
            </Transition>
            <div v-if="showContextMenu" class="overlay" @click="showContextMenu = false"></div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AggregatedBudget, DisplayMode } from '@/types/budget'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useLongPress } from '@/composables/useLongPress'

const props = defineProps<{
    aggregatedBudget: AggregatedBudget
}>()

const emit = defineEmits<{
    edit: [budgetId: string]
    viewTransactions: [budgetId: string]
    confirmReset: [budgetId: string]
}>()

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const displayMode = ref<DisplayMode>('percentage')
const showContextMenu = ref(false)

const longPress = useLongPress(() => {
    showContextMenu.value = true
}, 500)

const percentage = computed(() => {
    if (props.aggregatedBudget.totalValue === 0) return 0
    return Math.round((props.aggregatedBudget.spentValue / props.aggregatedBudget.totalValue) * 100)
})

const canEdit = (budget: any) => {
    return budget.ownerId === authStore.userId
}

const canReset = (budget: any) => {
    return budget.ownerId === authStore.userId
}

const isHidden = (budget: any) => {
    return budget.hiddenBy && budget.hiddenBy.includes(authStore.userId)
}

const handleHide = async (budgetId: string) => {
    const budget = props.aggregatedBudget.budgets.find(b => b.id === budgetId)
    if (!budget) return

    const hiddenBy = budget.hiddenBy || []
    const isCurrentlyHidden = hiddenBy.includes(authStore.userId || '')

    if (isCurrentlyHidden) {
        // Remover do array de ocultos
        await budgetStore.updateBudget(budgetId, {
            hiddenBy: hiddenBy.filter(id => id !== authStore.userId)
        })
    } else {
        // Adicionar ao array de ocultos
        if (!authStore.userId) return
        await budgetStore.updateBudget(budgetId, {
            hiddenBy: [...hiddenBy, authStore.userId]
        })
    }

    showContextMenu.value = false
}

const toggleDisplayMode = () => {
    displayMode.value = displayMode.value === 'percentage' ? 'values' : 'percentage'
}

const handleEdit = (budgetId: string) => {
    showContextMenu.value = false
    emit('edit', budgetId)
}

const handleReset = (budgetId: string) => {
    showContextMenu.value = false
    emit('confirmReset', budgetId)
}

const handleViewTransactions = (budgetId: string) => {
    showContextMenu.value = false
    emit('viewTransactions', budgetId)
}

const formatCurrency = (value: number) => {
    const currencyCode = budgetStore.currency || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
}

const formatBudgetValues = () => {
    // Separa budgets do usuário vs compartilhados
    const userBudgets = props.aggregatedBudget.budgets.filter(b => b.ownerId === authStore.userId)
    const sharedBudgets = props.aggregatedBudget.budgets.filter(b => b.ownerId !== authStore.userId)

    const userTotal = userBudgets.reduce((sum, b) => sum + b.totalValue, 0)
    const sharedTotal = sharedBudgets.reduce((sum, b) => sum + b.totalValue, 0)

    if (sharedTotal > 0) {
        // Formato: "R$ 100,00 / R$ 50,00" (você / compartilhado)
        return `${formatCurrency(userTotal)} / ${formatCurrency(sharedTotal)}`
    }

    return formatCurrency(userTotal)
}

const darkenColor = (color: string) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const factor = 0.7
    const newR = Math.floor(r * factor)
    const newG = Math.floor(g * factor)
    const newB = Math.floor(b * factor)
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}
</script>

<style scoped>
.aggregated-budget-container {
    position: relative;
    margin: 16px 0;
}

.budget-bar {
    cursor: pointer;
    user-select: none;
}

.budget-label {
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.85);
    padding: 6px 12px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(8px);
}

.budget-label.overbudget {
    color: #ff3b3b;
}

.shared-badge {
    font-size: 12px;
}

.budget-progress {
    position: relative;
    height: 50px;
    background-color: #f0f0f0;
    border-radius: 25px;
    overflow: hidden;
    display: flex;
    align-items: center;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.budget-fill {
    height: 100%;
    transition: width 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
}

.budget-value-inside {
    color: white;
    font-weight: 600;
    font-size: 14px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.budget-value-outside {
    position: absolute;
    right: 16px;
    font-weight: 600;
    font-size: 14px;
    color: #666;
}

.split-values {
    font-size: 12px;
}

.owners-info {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
}

.owner-tag {
    font-size: 11px;
    padding: 4px 8px;
    background: rgba(33, 150, 243, 0.1);
    color: #2196F3;
    border-radius: 12px;
    font-weight: 500;
}

.context-menu {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 2001;
    max-width: 90%;
    width: 320px;
    overflow: hidden;
}

.context-header {
    padding: 16px;
    background: #f5f5f5;
    font-weight: 600;
    color: #333;
    text-align: center;
    border-bottom: 1px solid #e0e0e0;
}

.budget-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
}

.budget-owner {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 8px;
}

.budget-actions {
    display: flex;
    gap: 8px;
}

.context-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.context-btn.edit {
    background: #2196F3;
    color: white;
}

.context-btn.reset {
    background: #FFA726;
    color: white;
}

.context-btn.hide {
    background: #9E9E9E;
    color: white;
}

.context-btn.cancel {
    width: 100%;
    padding: 14px;
    background: #f5f5f5;
    color: #666;
    margin-top: 8px;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
}

.context-menu-enter-active,
.context-menu-leave-active {
    transition: all 0.3s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
}

/* Dark Mode */
body.dark-mode .budget-label {
    color: #e2e8f0;
}

body.dark-mode .budget-value-outside {
    color: #ccc;
}

body.dark-mode .context-header {
    color: #fff;
}

body.dark-mode .budget-owner {
    color: #aaa;
}

body.dark-mode .context-menu {
    background: #1e1e2e;
}

body.dark-mode .context-btn.cancel {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .budget-progress {
    background-color: #2d3748;
}
</style>
