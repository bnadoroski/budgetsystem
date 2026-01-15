<template>
    <Transition name="modal">
        <div v-if="show" class="modal-overlay" @click="$emit('close')">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h2>Histórico - {{ monthName }}</h2>
                    <button class="close-button" @click="$emit('close')">✕</button>
                </div>

                <!-- Navegação entre meses -->
                <div class="month-navigation">
                    <button class="nav-button" @click="previousMonth" :disabled="loading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Anterior
                    </button>
                    <span class="current-month">{{ monthName }}</span>
                    <button class="nav-button" @click="nextMonth" :disabled="loading || monthOffset <= 0">
                        Próximo
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                <div class="history-body">
                    <div v-if="loading" class="loading">Carregando histórico...</div>

                    <!-- Mês atual: mostra budgets atuais -->
                    <div v-else-if="monthOffset === 0" class="history-list">
                        <div class="current-month-notice">
                            <span class="notice-icon">📊</span>
                            <span>Dados do mês atual (em andamento)</span>
                        </div>

                        <div class="history-summary">
                            <h3>Resumo do Mês Atual</h3>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="label">Total Orçado:</span>
                                    <span class="value">{{ formatCurrency(currentMonthTotalBudgeted) }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Total Gasto:</span>
                                    <span class="value"
                                        :class="{ overspent: currentMonthTotalSpent > currentMonthTotalBudgeted }">
                                        {{ formatCurrency(currentMonthTotalSpent) }}
                                    </span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Restante:</span>
                                    <span class="value" :class="{
                                        positive: currentMonthDifference > 0,
                                        negative: currentMonthDifference < 0
                                    }">
                                        {{ formatCurrency(Math.abs(currentMonthDifference)) }}
                                        {{ currentMonthDifference >= 0 ? '(disponível)' : '(excedido)' }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h3 v-show="budgetStore?.budgets">Budgets Atuais</h3>
                        <div v-for="budget in budgetStore.budgets" :key="budget.id" class="history-item">
                            <div class="item-header">
                                <div class="item-name">
                                    <div class="color-dot" :style="{ backgroundColor: budget.color }"></div>
                                    {{ budget.name }}
                                </div>
                                <div class="item-percentage" :class="{
                                    high: budgetPercentage(budget) >= 90,
                                    medium: budgetPercentage(budget) >= 70 && budgetPercentage(budget) < 90
                                }">
                                    {{ budgetPercentage(budget) }}%
                                </div>
                            </div>
                            <div class="item-values">
                                <span>{{ formatCurrency(budget.spentValue) }} / {{ formatCurrency(budget.totalValue)
                                    }}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" :style="{
                                    width: `${Math.min(budgetPercentage(budget), 100)}%`,
                                    background: `linear-gradient(to right, ${darkenColor(budget.color)}, ${budget.color})`
                                }"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Histórico de meses anteriores -->
                    <div v-else-if="historyItems.length === 0" class="empty-history">
                        <p>Nenhum histórico encontrado para {{ monthName }}.</p>
                        <p class="hint">O histórico é salvo quando os budgets são resetados no dia {{
                            budgetStore.resetDay }} de cada mês.</p>
                    </div>

                    <div v-else class="history-list">
                        <div class="history-summary">
                            <h3>Resumo do Mês</h3>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="label">Total Orçado:</span>
                                    <span class="value">{{ formatCurrency(totalBudgeted) }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Total Gasto:</span>
                                    <span class="value" :class="{ overspent: totalSpent > totalBudgeted }">
                                        {{ formatCurrency(totalSpent) }}
                                    </span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">Diferença:</span>
                                    <span class="value" :class="{
                                        positive: difference > 0,
                                        negative: difference < 0
                                    }">
                                        {{ formatCurrency(Math.abs(difference)) }}
                                        {{ difference >= 0 ? '(economizado)' : '(excedido)' }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <h3>Budgets Individuais</h3>
                        <div v-for="item in historyItems" :key="item.id" class="history-item">
                            <div class="item-header">
                                <div class="item-name">
                                    <div class="color-dot" :style="{ backgroundColor: item.color }"></div>
                                    {{ item.budgetName }}
                                </div>
                                <div class="item-percentage" :class="{
                                    high: percentage(item) >= 90,
                                    medium: percentage(item) >= 70 && percentage(item) < 90
                                }">
                                    {{ percentage(item) }}%
                                </div>
                            </div>
                            <div class="item-values">
                                <span>{{ formatCurrency(item.spentValue) }} / {{ formatCurrency(item.totalValue)
                                    }}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" :style="{
                                    width: `${Math.min(percentage(item), 100)}%`,
                                    background: `linear-gradient(to right, ${darkenColor(item.color)}, ${item.color})`
                                }"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import type { BudgetHistory, Budget } from '@/types/budget'

const props = defineProps<{
    show: boolean
}>()

defineEmits(['close'])

const budgetStore = useBudgetStore()
const loading = ref(false)
const historyItems = ref<BudgetHistory[]>([])
const monthOffset = ref(0) // 0 = mês atual, 1 = mês passado, 2 = 2 meses atrás...

const monthName = computed(() => {
    const now = new Date()
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset.value, 1)
    // Formato curto: "Dez/2026"
    const month = targetDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const year = targetDate.getFullYear()
    return `${month.charAt(0).toUpperCase() + month.slice(1)}/${year}`
})

// Cálculos para mês atual (budgets em uso)
const currentMonthTotalBudgeted = computed(() =>
    budgetStore.budgets.reduce((sum, b) => sum + b.totalValue, 0)
)

const currentMonthTotalSpent = computed(() =>
    budgetStore.budgets.reduce((sum, b) => sum + b.spentValue, 0)
)

const currentMonthDifference = computed(() =>
    currentMonthTotalBudgeted.value - currentMonthTotalSpent.value
)

const budgetPercentage = (budget: Budget) => {
    if (budget.totalValue === 0) return 0
    return Math.min(Math.round((budget.spentValue / budget.totalValue) * 100), 100)
}

// Cálculos para histórico
const totalBudgeted = computed(() =>
    historyItems.value.reduce((sum, item) => sum + item.totalValue, 0)
)

const totalSpent = computed(() =>
    historyItems.value.reduce((sum, item) => sum + item.spentValue, 0)
)

const difference = computed(() => totalBudgeted.value - totalSpent.value)

const percentage = (item: BudgetHistory) => {
    if (item.totalValue === 0) return 0
    return Math.min(Math.round((item.spentValue / item.totalValue) * 100), 100)
}

const formatCurrency = (value: number) => {
    const currencyCode = budgetStore.currency || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
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

const loadHistoryData = async () => {
    if (monthOffset.value === 0) {
        // Mês atual não precisa carregar histórico
        historyItems.value = []
        return
    }

    loading.value = true
    try {
        historyItems.value = await budgetStore.loadHistory(monthOffset.value) || []
    } catch (error) {
        console.error('Erro ao carregar histórico:', error)
        historyItems.value = []
    } finally {
        loading.value = false
    }
}

const previousMonth = () => {
    monthOffset.value++
    loadHistoryData()
}

const nextMonth = () => {
    if (monthOffset.value > 0) {
        monthOffset.value--
        loadHistoryData()
    }
}

watch(() => props.show, async (newVal) => {
    if (newVal) {
        // Começa mostrando o mês atual
        monthOffset.value = 0
        historyItems.value = []
    }
})
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
    text-transform: capitalize;
}

.close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.close-button:hover {
    background-color: #f0f0f0;
    color: #333;
}

/* Navegação entre meses */
.month-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
}

.nav-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    transition: all 0.2s;
}

.nav-button:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

.nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.current-month {
    font-weight: 600;
    color: #333;
    text-transform: capitalize;
}

/* Aviso do mês atual */
.current-month-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #2e7d32;
}

.notice-icon {
    font-size: 18px;
}

/* Dica no histórico vazio */
.empty-history .hint {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
}

.history-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #666;
}

.empty-history {
    text-align: center;
    padding: 40px;
    color: #999;
}

.history-summary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
}

.history-summary h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
}

.summary-grid {
    display: grid;
    gap: 12px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.summary-item .label {
    font-size: 14px;
    opacity: 0.9;
}

.summary-item .value {
    font-size: 16px;
    font-weight: 600;
}

.summary-item .value.overspent {
    color: #ffeb3b;
}

.summary-item .value.positive {
    color: #4CAF50;
}

.summary-item .value.negative {
    color: #ffeb3b;
}

.history-list h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #333;
}

.history-item {
    background: #f9f9f9;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 12px;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.item-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: #333;
}

.color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.item-percentage {
    font-weight: 600;
    color: #4CAF50;
}

.item-percentage.medium {
    color: #FF9800;
}

.item-percentage.high {
    color: #F44336;
}

.item-values {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
}

.progress-bar {
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 4px;
}

/* Dark mode */
body.dark-mode .modal-content {
    background: #2d3748;
}

body.dark-mode .modal-header {
    border-bottom-color: #4a5568;
}

body.dark-mode .modal-header h2,
body.dark-mode .item-name,
body.dark-mode .history-list h3 {
    color: #e2e8f0;
}

body.dark-mode .close-button {
    color: #e2e8f0;
}

body.dark-mode .close-button:hover {
    background-color: #4a5568;
}

body.dark-mode .history-item {
    background: #1a202c;
}

body.dark-mode .item-values,
body.dark-mode .empty-history {
    color: #a0aec0;
}

body.dark-mode .progress-bar {
    background-color: #4a5568;
}

body.dark-mode .month-navigation {
    background: #1a202c;
    border-bottom-color: #4a5568;
}

body.dark-mode .nav-button {
    background: #2d3748;
    border-color: #4a5568;
    color: #e2e8f0;
}

body.dark-mode .nav-button:hover:not(:disabled) {
    background: #667eea;
    border-color: #667eea;
}

body.dark-mode .current-month {
    color: #e2e8f0;
}

body.dark-mode .current-month-notice {
    background: linear-gradient(135deg, #1a4d2e 0%, #2d5a3d 100%);
    color: #81c784;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
