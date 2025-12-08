<template>
    <Transition name="modal">
        <div v-if="show" class="modal-overlay" @click="$emit('close')">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h2>Histórico - {{ monthName }}</h2>
                    <button class="close-button" @click="$emit('close')">✕</button>
                </div>

                <div class="history-body">
                    <div v-if="loading" class="loading">Carregando histórico...</div>

                    <div v-else-if="historyItems.length === 0" class="empty-history">
                        <p>Nenhum histórico encontrado para este mês.</p>
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
import type { BudgetHistory } from '@/types/budget'

const props = defineProps<{
    show: boolean
}>()

defineEmits(['close'])

const budgetStore = useBudgetStore()
const loading = ref(false)
const historyItems = ref<BudgetHistory[]>([])

const monthName = computed(() => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return lastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

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

watch(() => props.show, async (newVal) => {
    if (newVal) {
        loading.value = true
        historyItems.value = await budgetStore.loadHistory(1) || []
        loading.value = false
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
