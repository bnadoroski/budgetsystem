<template>
    <div v-if="totalBudgetLimit > 0" class="daily-budget-card"
        :class="[statusClass, { 'minimized': isMinimized, 'newly-shared': hasNewlySharedBudgets }]" :style="cardStyle"
        @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd" @click="handleClick">
        <template v-if="!isMinimized">
            <div class="drag-handle">
                <div class="drag-indicator"></div>
            </div>
            <div class="card-content">
                <div class="amount">{{ formatCurrency(dailyAvailable) }}</div>
                <div class="label">por dia até o fim do mês</div>
                <div class="details">
                    {{ formatCurrency(remainingSalary) }} restantes / {{ remainingDays }} dias
                </div>
            </div>
        </template>
        <template v-else>
            <div class="minimized-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

// Estado de minimização e drag
const isMinimized = ref(false)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const startTime = ref(0)

// Calcula o total gasto
const totalSpent = computed(() => {
    return budgetStore.budgets.reduce((sum, budget) => sum + budget.spentValue, 0)
})

// Pega o salário configurado (incluindo compartilhado)
const totalBudgetLimit = computed(() => {
    let myLimit = budgetStore.totalBudgetLimit

    // Buscar se há convites aceitos com totalBudgetLimit
    const acceptedInvites = budgetStore.shareInvites.filter(inv => inv.status === 'accepted')
    const partnerLimit = acceptedInvites.reduce((sum, inv) => sum + (inv.totalBudgetLimit || 0), 0)

    return myLimit + partnerLimit
})

// Calcula o salário restante
const remainingSalary = computed(() => {
    return Math.max(0, totalBudgetLimit.value - totalSpent.value)
})

// Calcula dias restantes do mês
const remainingDays = computed(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const currentDay = today.getDate()
    return Math.max(1, lastDay - currentDay + 1) // +1 para incluir o dia atual
})

// Calcula quanto pode gastar por dia
const dailyAvailable = computed(() => {
    return remainingSalary.value / remainingDays.value
})

// Calcula a porcentagem de saúde do orçamento
const healthPercentage = computed(() => {
    if (totalBudgetLimit.value === 0) return 100
    return (remainingSalary.value / totalBudgetLimit.value) * 100
})

// Verifica se há budgets recém-compartilhados
const hasNewlySharedBudgets = computed(() => {
    return budgetStore.newlySharedBudgetIds.size > 0
})

// Define a classe de status baseado na porcentagem
const statusClass = computed(() => {
    const percentage = healthPercentage.value
    if (percentage >= 60) return 'status-good' // Verde
    if (percentage >= 30) return 'status-warning' // Amarelo
    return 'status-danger' // Vermelho
})

// Estilo dinâmico do card durante o drag
const cardStyle = computed(() => {
    if (!isDragging.value || isMinimized.value) return {}

    const deltaY = currentY.value - startY.value
    const deltaX = currentX.value - startX.value

    // Só permite arrastar para cima ou para os lados
    if (deltaY >= 0 && Math.abs(deltaX) < 30) return {}

    return {
        transform: `translateX(calc(-50% + ${deltaX}px)) translateY(${Math.min(0, deltaY)}px)`,
        transition: 'none'
    }
})

const handleTouchStart = (e: TouchEvent) => {
    if (isMinimized.value || !e.touches[0]) return // Se minimizado, não inicia drag
    isDragging.value = true
    startX.value = e.touches[0].clientX
    startY.value = e.touches[0].clientY
    currentX.value = e.touches[0].clientX
    currentY.value = e.touches[0].clientY
    startTime.value = Date.now()
}

const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || isMinimized.value || !e.touches[0]) return

    currentX.value = e.touches[0].clientX
    currentY.value = e.touches[0].clientY
    const deltaY = currentY.value - startY.value
    const deltaX = Math.abs(currentX.value - startX.value)

    // Permite arrastar para cima ou para os lados
    if (deltaY < 0 || deltaX > 30) {
        e.preventDefault()
    }
}

const handleTouchEnd = () => {
    if (!isDragging.value || isMinimized.value) return

    const deltaY = currentY.value - startY.value
    const deltaX = currentX.value - startX.value
    const deltaTime = Date.now() - startTime.value
    const velocity = Math.abs(deltaY) / deltaTime // pixels por ms
    const horizontalDistance = Math.abs(deltaX)

    // Se arrastou para cima mais de 80px ou com velocidade alta, minimiza
    // OU se arrastou para os lados mais de 100px, minimiza também
    if (deltaY < -80 || (deltaY < -40 && velocity > 0.5) || horizontalDistance > 100) {
        isMinimized.value = true
    }

    isDragging.value = false
    currentX.value = startX.value
    currentY.value = startY.value
}

const handleClick = () => {
    if (isMinimized.value) {
        // Clique no card minimizado expande ele
        isMinimized.value = false
    }
}

// Formata valores monetários
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: budgetStore.currency || 'BRL'
    }).format(value)
}
</script>

<style scoped>
.daily-budget-card {
    position: fixed;
    bottom: 125px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 12px;
    padding: 10px 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    z-index: 99;
    min-width: 240px;
    transition: all 0.3s ease;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
}

.daily-budget-card:active {
    cursor: grabbing;
}

.daily-budget-card.minimized {
    width: 48px;
    height: 48px;
    min-width: 48px;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    bottom: 145px;
    right: 20px;
    left: auto;
    transform: none;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
}

.drag-handle {
    display: flex;
    justify-content: center;
    padding: 4px 0 8px 0;
    cursor: grab;
}

.drag-indicator {
    width: 40px;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
}

.minimized-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.status-good {
    background: linear-gradient(135deg, #4CAF50, #66BB6A);
    color: white;
}

.status-warning {
    background: linear-gradient(135deg, #FFA726, #FFB74D);
    color: white;
}

.status-danger {
    background: linear-gradient(135deg, #EF5350, #E57373);
    color: white;
}

.status-good:not(.minimized) {
    background: white;
}

.status-warning:not(.minimized) {
    background: white;
}

.status-danger:not(.minimized) {
    background: white;
}

.status-good:not(.minimized)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
    border-radius: 12px 12px 0 0;
}

.status-warning:not(.minimized)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #FFA726, #FFB74D);
    border-radius: 12px 12px 0 0;
}

.status-danger:not(.minimized)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #EF5350, #E57373);
    border-radius: 12px 12px 0 0;
}

.card-content {
    text-align: center;
}

.amount {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 2px;
    transition: color 0.3s ease;
}

.status-good .amount {
    color: #4CAF50;
}

.status-warning .amount {
    color: #FF9800;
}

.status-danger .amount {
    color: #F44336;
}

.label {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
}

.details {
    font-size: 10px;
    color: #999;
    margin-top: 2px;
}

/* Dark mode - usando body.dark-mode como os outros componentes */
body.dark-mode .daily-budget-card:not(.minimized) {
    background: #2d3748;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark-mode .label {
    color: #aaa;
}

body.dark-mode .details {
    color: #888;
}

body.dark-mode .drag-indicator {
    background: #555;
}

/* Fallback para prefers-color-scheme */
@media (prefers-color-scheme: dark) {
    .daily-budget-card:not(.minimized) {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }

    .label {
        color: #aaa;
    }

    .details {
        color: #888;
    }

    .drag-indicator {
        background: #555;
    }
}

/* Animação de entrada */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

.daily-budget-card:not(.minimized) {
    animation: slideUp 0.4s ease-out;
}

/* Animação de minimização */
@keyframes minimize {
    from {
        width: 240px;
        height: auto;
        border-radius: 12px;
    }

    to {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }
}

.daily-budget-card.minimized {
    animation: minimize 0.3s ease-out;
}

/* Pulse animation no minimized icon */
@keyframes pulse {

    0%,
    100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.05);
    }
}

.minimized-icon {
    animation: pulse 2s ease-in-out infinite;
}

/* Animação de borda piscando quando há budgets recém-compartilhados */
.daily-budget-card.newly-shared {
    animation: pulse-border-card 1s ease-in-out infinite;
}

.daily-budget-card.newly-shared.minimized {
    animation: pulse-border-card 1s ease-in-out infinite, minimize 0.3s ease-out;
}

@keyframes pulse-border-card {

    0%,
    100% {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(76, 175, 80, 0.6);
    }

    50% {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 0 6px rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.4);
    }
}
</style>
