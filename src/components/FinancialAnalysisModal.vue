<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useSubscriptionStore } from '@/stores/subscription'
import type { Transaction } from '@/types/budget'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'upgrade'): void
}>()

const budgetStore = useBudgetStore()
const subscriptionStore = useSubscriptionStore()

const currentMonth = ref(new Date())
const selectedDay = ref<number | null>(null)
const activeTab = ref<'calendar' | 'stats'>('calendar')
const allTransactions = ref<(Transaction & { budgetColor: string })[]>([])
const loading = ref(false)

const isPremium = computed(() => subscriptionStore.isPremium)

// Load transactions for all budgets
const loadAllTransactions = async () => {
    if (!isPremium.value) return

    loading.value = true
    const transactions: (Transaction & { budgetColor: string })[] = []

    try {
        for (const budget of budgetStore.budgets) {
            const budgetTxs = await budgetStore.loadTransactionsWithHistory(budget.id)
            budgetTxs.forEach(tx => {
                transactions.push({
                    ...tx,
                    budgetColor: budget.color
                })
            })
        }
        allTransactions.value = transactions
    } catch (error) {
        console.error('Error loading transactions:', error)
    } finally {
        loading.value = false
    }
}

// Get transactions for the current month
const monthTransactions = computed(() => {
    return allTransactions.value.filter(tx => {
        const txDate = new Date(tx.createdAt)
        return txDate.getMonth() === currentMonth.value.getMonth() &&
            txDate.getFullYear() === currentMonth.value.getFullYear()
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// Get days with transactions
const daysWithTransactions = computed(() => {
    const days = new Map<number, { count: number; total: number }>()

    monthTransactions.value.forEach(tx => {
        const day = new Date(tx.createdAt).getDate()
        const existing = days.get(day) || { count: 0, total: 0 }
        days.set(day, {
            count: existing.count + 1,
            total: existing.total + tx.amount
        })
    })

    return days
})

// Calendar helpers
const monthName = computed(() => {
    return currentMonth.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    return new Date(year, month + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    return new Date(year, month, 1).getDay()
})

const calendarDays = computed(() => {
    const days: (number | null)[] = []

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDayOfMonth.value; i++) {
        days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth.value; i++) {
        days.push(i)
    }

    return days
})

// Get transactions for selected day
const selectedDayTransactions = computed(() => {
    if (selectedDay.value === null) return []

    return monthTransactions.value.filter(tx => {
        return new Date(tx.createdAt).getDate() === selectedDay.value
    })
})

// Statistics
const totalSpentMonth = computed(() => {
    return monthTransactions.value.reduce((sum, tx) => sum + tx.amount, 0)
})

const averageDailySpending = computed(() => {
    const daysWithSpending = daysWithTransactions.value.size
    if (daysWithSpending === 0) return 0
    return totalSpentMonth.value / daysWithSpending
})

const mostExpensiveDay = computed(() => {
    let maxDay = 0
    let maxAmount = 0

    daysWithTransactions.value.forEach((data, day) => {
        if (data.total > maxAmount) {
            maxAmount = data.total
            maxDay = day
        }
    })

    return { day: maxDay, amount: maxAmount }
})

const mostExpensiveTransaction = computed(() => {
    const txs = monthTransactions.value
    if (txs.length === 0) return null

    let maxTx: typeof txs[number] | null = null
    for (const tx of txs) {
        if (!maxTx || tx.amount > maxTx.amount) {
            maxTx = tx
        }
    }
    return maxTx
})

const topCategories = computed(() => {
    const categories = new Map<string, { name: string; color: string; total: number; count: number }>()

    monthTransactions.value.forEach(tx => {
        const existing = categories.get(tx.budgetName) || {
            name: tx.budgetName,
            color: tx.budgetColor,
            total: 0,
            count: 0
        }
        categories.set(tx.budgetName, {
            ...existing,
            total: existing.total + tx.amount,
            count: existing.count + 1
        })
    })

    return Array.from(categories.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
})

const frequentTransactions = computed(() => {
    const descriptions = new Map<string, { description: string; count: number; totalAmount: number }>()

    monthTransactions.value.forEach(tx => {
        const desc = tx.description?.toLowerCase().trim() || 'Sem descrição'
        const existing = descriptions.get(desc) || { description: tx.description || 'Sem descrição', count: 0, totalAmount: 0 }
        descriptions.set(desc, {
            description: existing.description,
            count: existing.count + 1,
            totalAmount: existing.totalAmount + tx.amount
        })
    })

    return Array.from(descriptions.values())
        .filter(d => d.count > 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
})

// Navigation
const previousMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
    selectedDay.value = null
}

const nextMonth = () => {
    const now = new Date()
    const next = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
    if (next <= now) {
        currentMonth.value = next
        selectedDay.value = null
    }
}

const isCurrentMonth = computed(() => {
    const now = new Date()
    return currentMonth.value.getMonth() === now.getMonth() &&
        currentMonth.value.getFullYear() === now.getFullYear()
})

const selectDay = (day: number | null) => {
    if (day === null) return
    selectedDay.value = selectedDay.value === day ? null : day
}

const getDayClass = (day: number | null) => {
    if (day === null) return 'empty'

    const classes: string[] = []
    const data = daysWithTransactions.value.get(day)

    if (data) {
        classes.push('has-transactions')
        if (data.total > averageDailySpending.value * 1.5) {
            classes.push('high-spending')
        }
    }

    if (selectedDay.value === day) {
        classes.push('selected')
    }

    const today = new Date()
    if (isCurrentMonth.value && day === today.getDate()) {
        classes.push('today')
    }

    return classes.join(' ')
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Load transactions when modal opens
watch(() => props.show, (newVal) => {
    if (newVal && isPremium.value) {
        loadAllTransactions()
    }
}, { immediate: true })

// Reload when month changes
watch(currentMonth, () => {
    if (props.show && isPremium.value) {
        loadAllTransactions()
    }
})
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>📊 Análise Financeira</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <!-- Premium Gate -->
                    <div v-if="!isPremium" class="premium-gate">
                        <div class="gate-icon">🔒</div>
                        <h3>Recurso Premium</h3>
                        <p>Desbloqueie o calendário financeiro e análise detalhada de gastos com o Premium!</p>
                        <ul class="gate-features">
                            <li>📅 Calendário com dias de gastos marcados</li>
                            <li>📈 Estatísticas detalhadas</li>
                            <li>🏆 Ranking de categorias mais gastas</li>
                            <li>🔄 Gastos recorrentes identificados</li>
                        </ul>
                        <button class="upgrade-button" @click="emit('upgrade')">
                            👑 Seja Premium
                        </button>
                    </div>

                    <!-- Content for Premium users -->
                    <div v-else class="modal-body">
                        <!-- Loading State -->
                        <div v-if="loading" class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Carregando transações...</p>
                        </div>

                        <template v-else>
                            <!-- Month Navigation -->
                            <div class="month-navigation">
                                <button class="nav-btn" @click="previousMonth">
                                    ◀
                                </button>
                                <span class="month-name">{{ monthName }}</span>
                                <button class="nav-btn" @click="nextMonth" :disabled="isCurrentMonth">
                                    ▶
                                </button>
                            </div>

                            <!-- Tabs -->
                            <div class="tabs">
                                <button class="tab" :class="{ active: activeTab === 'calendar' }"
                                    @click="activeTab = 'calendar'">
                                    📅 Calendário
                                </button>
                                <button class="tab" :class="{ active: activeTab === 'stats' }"
                                    @click="activeTab = 'stats'">
                                    📈 Estatísticas
                                </button>
                            </div>

                            <!-- Calendar Tab -->
                            <div v-if="activeTab === 'calendar'" class="calendar-section">
                                <div class="calendar-header">
                                    <span>Dom</span>
                                    <span>Seg</span>
                                    <span>Ter</span>
                                    <span>Qua</span>
                                    <span>Qui</span>
                                    <span>Sex</span>
                                    <span>Sáb</span>
                                </div>
                                <div class="calendar-grid">
                                    <div v-for="(day, index) in calendarDays" :key="index" class="calendar-day"
                                        :class="getDayClass(day)" @click="selectDay(day)">
                                        <span class="day-number">{{ day }}</span>
                                        <span v-if="day && daysWithTransactions.get(day)" class="day-indicator">
                                            {{ daysWithTransactions.get(day)?.count }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Selected Day Details -->
                                <div v-if="selectedDay !== null" class="day-details">
                                    <h4>{{ selectedDay }} de {{ monthName.split(' ')[0] }}</h4>
                                    <div v-if="selectedDayTransactions.length === 0" class="no-transactions">
                                        Nenhuma transação neste dia
                                    </div>
                                    <div v-else class="transactions-list">
                                        <div v-for="tx in selectedDayTransactions" :key="tx.id"
                                            class="transaction-item">
                                            <div class="tx-color" :style="{ backgroundColor: tx.budgetColor }"></div>
                                            <div class="tx-info">
                                                <span class="tx-description">{{ tx.description || tx.budgetName
                                                    }}</span>
                                                <span class="tx-budget">{{ tx.budgetName }}</span>
                                            </div>
                                            <span class="tx-amount">{{ formatCurrency(tx.amount) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div v-else class="calendar-hint">
                                    💡 Clique em um dia para ver as transações
                                </div>
                            </div>

                            <!-- Stats Tab -->
                            <div v-if="activeTab === 'stats'" class="stats-section">
                                <!-- Quick Stats -->
                                <div class="stats-grid">
                                    <div class="stat-card">
                                        <div class="stat-icon">💰</div>
                                        <div class="stat-value">{{ formatCurrency(totalSpentMonth) }}</div>
                                        <div class="stat-label">Total gasto</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">📊</div>
                                        <div class="stat-value">{{ formatCurrency(averageDailySpending) }}</div>
                                        <div class="stat-label">Média diária</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">📅</div>
                                        <div class="stat-value">{{ daysWithTransactions.size }}</div>
                                        <div class="stat-label">Dias com gastos</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">🧾</div>
                                        <div class="stat-value">{{ monthTransactions.length }}</div>
                                        <div class="stat-label">Transações</div>
                                    </div>
                                </div>

                                <!-- Most Expensive Day -->
                                <div v-if="mostExpensiveDay.day > 0" class="highlight-card">
                                    <div class="highlight-icon">🔥</div>
                                    <div class="highlight-info">
                                        <span class="highlight-title">Dia que mais gastou</span>
                                        <span class="highlight-value">
                                            Dia {{ mostExpensiveDay.day }} - {{ formatCurrency(mostExpensiveDay.amount)
                                            }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Most Expensive Transaction -->
                                <div v-if="mostExpensiveTransaction" class="highlight-card">
                                    <div class="highlight-icon">💸</div>
                                    <div class="highlight-info">
                                        <span class="highlight-title">Maior gasto</span>
                                        <span class="highlight-value">
                                            {{ mostExpensiveTransaction.description ||
                                                mostExpensiveTransaction.budgetName
                                            }}
                                            - {{ formatCurrency(mostExpensiveTransaction.amount) }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Top Categories -->
                                <div v-if="topCategories.length > 0" class="categories-section">
                                    <h4>🏆 Categorias mais gastas</h4>
                                    <div class="categories-list">
                                        <div v-for="(cat, index) in topCategories" :key="cat.name"
                                            class="category-item">
                                            <span class="category-rank">{{ index + 1 }}º</span>
                                            <div class="category-color" :style="{ backgroundColor: cat.color }"></div>
                                            <span class="category-name">{{ cat.name }}</span>
                                            <span class="category-value">{{ formatCurrency(cat.total) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Frequent Transactions -->
                                <div v-if="frequentTransactions.length > 0" class="frequent-section">
                                    <h4>🔄 Gastos recorrentes</h4>
                                    <div class="frequent-list">
                                        <div v-for="item in frequentTransactions" :key="item.description"
                                            class="frequent-item">
                                            <span class="frequent-name">{{ item.description }}</span>
                                            <span class="frequent-count">{{ item.count }}x</span>
                                            <span class="frequent-total">{{ formatCurrency(item.totalAmount) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="monthTransactions.length === 0" class="empty-stats">
                                    <div class="empty-icon">📭</div>
                                    <p>Nenhuma transação neste mês</p>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-radius: 20px 20px 0 0;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 4px 8px;
    border-radius: 8px;
}

.close-button:hover {
    background: #f0f0f0;
    color: #333;
}

/* Loading State */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Premium Gate */
.premium-gate {
    padding: 40px 20px;
    text-align: center;
}

.gate-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.premium-gate h3 {
    margin: 0 0 12px;
    color: #333;
}

.premium-gate p {
    color: #666;
    margin-bottom: 24px;
}

.gate-features {
    list-style: none;
    padding: 0;
    margin: 0 0 24px;
    text-align: left;
    max-width: 280px;
    margin-left: auto;
    margin-right: auto;
}

.gate-features li {
    padding: 8px 0;
    color: #555;
    font-size: 14px;
}

.upgrade-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.upgrade-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Modal Body */
.modal-body {
    padding: 20px;
}

/* Month Navigation */
.month-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.nav-btn {
    background: #f0f0f0;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

.nav-btn:hover:not(:disabled) {
    background: #e0e0e0;
}

.nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.month-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    text-transform: capitalize;
}

/* Tabs */
.tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: #f0f0f0;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.tab.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

/* Calendar */
.calendar-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
}

.calendar-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    font-size: 14px;
    transition: all 0.2s;
}

.calendar-day.empty {
    cursor: default;
}

.calendar-day:not(.empty):hover {
    background: #f0f0f0;
}

.calendar-day.has-transactions {
    background: #e8f5e9;
}

.calendar-day.high-spending {
    background: #ffebee;
}

.calendar-day.selected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.calendar-day.today {
    border: 2px solid #667eea;
}

.day-indicator {
    position: absolute;
    bottom: 2px;
    font-size: 8px;
    background: #667eea;
    color: white;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.calendar-day.selected .day-indicator {
    background: white;
    color: #667eea;
}

/* Day Details */
.day-details {
    margin-top: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
}

.day-details h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #333;
    text-transform: capitalize;
}

.no-transactions {
    color: #999;
    font-size: 14px;
    text-align: center;
    padding: 20px;
}

.transactions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.transaction-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: white;
    border-radius: 8px;
}

.tx-color {
    width: 8px;
    height: 32px;
    border-radius: 4px;
}

.tx-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tx-description {
    font-size: 14px;
    color: #333;
}

.tx-budget {
    font-size: 12px;
    color: #999;
}

.tx-amount {
    font-size: 14px;
    font-weight: 600;
    color: #e53e3e;
}

.calendar-hint {
    text-align: center;
    color: #999;
    font-size: 14px;
    margin-top: 20px;
}

/* Stats Section */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.stat-card {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 12px;
    text-align: center;
}

.stat-icon {
    font-size: 24px;
    margin-bottom: 8px;
}

.stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #333;
}

.stat-label {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

/* Highlight Cards */
.highlight-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border-radius: 12px;
    margin-bottom: 12px;
}

.highlight-icon {
    font-size: 28px;
}

.highlight-info {
    display: flex;
    flex-direction: column;
}

.highlight-title {
    font-size: 12px;
    color: #666;
}

.highlight-value {
    font-size: 14px;
    font-weight: 600;
    color: #333;
}

/* Categories */
.categories-section,
.frequent-section {
    margin-top: 20px;
}

.categories-section h4,
.frequent-section h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #333;
}

.categories-list,
.frequent-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.category-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
}

.category-rank {
    font-size: 12px;
    color: #999;
    width: 24px;
}

.category-color {
    width: 12px;
    height: 12px;
    border-radius: 4px;
}

.category-name {
    flex: 1;
    font-size: 14px;
    color: #333;
}

.category-value {
    font-size: 14px;
    font-weight: 600;
    color: #333;
}

/* Frequent Items */
.frequent-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
}

.frequent-name {
    flex: 1;
    font-size: 14px;
    color: #333;
}

.frequent-count {
    font-size: 12px;
    color: #667eea;
    background: #e8eaf6;
    padding: 2px 8px;
    border-radius: 10px;
}

.frequent-total {
    font-size: 14px;
    font-weight: 600;
    color: #333;
}

/* Empty State */
.empty-stats {
    text-align: center;
    padding: 40px 20px;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.empty-stats p {
    color: #999;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.95);
}

/* Dark Mode */
body.dark-mode .modal-content,
body.dark-mode .modal-header {
    background: #1e1e1e;
}

body.dark-mode .modal-header {
    border-bottom-color: #333;
}

body.dark-mode .modal-header h2,
body.dark-mode .month-name,
body.dark-mode .day-details h4,
body.dark-mode .stat-value,
body.dark-mode .highlight-value,
body.dark-mode .category-name,
body.dark-mode .category-value,
body.dark-mode .frequent-name,
body.dark-mode .frequent-total,
body.dark-mode .categories-section h4,
body.dark-mode .frequent-section h4,
body.dark-mode .tx-description {
    color: #fff;
}

body.dark-mode .nav-btn,
body.dark-mode .tab {
    background: #333;
    color: #fff;
}

body.dark-mode .nav-btn:hover:not(:disabled) {
    background: #444;
}

body.dark-mode .calendar-day:not(.empty):hover {
    background: #333;
}

body.dark-mode .calendar-day.has-transactions {
    background: #2d3b2d;
}

body.dark-mode .calendar-day.high-spending {
    background: #3d2d2d;
}

body.dark-mode .day-details,
body.dark-mode .stat-card,
body.dark-mode .category-item,
body.dark-mode .frequent-item {
    background: #2a2a2a;
}

body.dark-mode .transaction-item {
    background: #333;
}

body.dark-mode .highlight-card {
    background: linear-gradient(135deg, #3d3020 0%, #4d3d20 100%);
}

body.dark-mode .premium-gate h3 {
    color: #fff;
}

body.dark-mode .premium-gate p,
body.dark-mode .gate-features li {
    color: #aaa;
}
</style>
