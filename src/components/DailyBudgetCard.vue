<template>
    <div v-if="totalBudgetLimit > 0" class="daily-budget-card" :class="statusClass">
        <div class="card-content">
            <div class="amount">{{ formatCurrency(dailyAvailable) }}</div>
            <div class="label">por dia até o fim do mês</div>
            <div class="details">
                {{ formatCurrency(remainingSalary) }} restantes / {{ remainingDays }} dias
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const budgetStore = useBudgetStore()

// Calcula o total gasto
const totalSpent = computed(() => {
    return budgetStore.budgets.reduce((sum, budget) => sum + budget.spentValue, 0)
})

// Pega o salário configurado
const totalBudgetLimit = computed(() => budgetStore.totalBudgetLimit)

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

// Define a classe de status baseado na porcentagem
const statusClass = computed(() => {
    const percentage = healthPercentage.value
    if (percentage >= 60) return 'status-good' // Verde
    if (percentage >= 30) return 'status-warning' // Amarelo
    return 'status-danger' // Vermelho
})

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
    z-index: 100;
    min-width: 240px;
    transition: all 0.3s ease;
}

.status-good::before {
    background: linear-gradient(90deg, #4CAF50, #66BB6A);
}

.status-warning::before {
    background: linear-gradient(90deg, #FFA726, #FFB74D);
}

.status-danger::before {
    background: linear-gradient(90deg, #EF5350, #E57373);
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
body.dark-mode .daily-budget-card {
    background: #2d3748;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark-mode .label {
    color: #aaa;
}

body.dark-mode .details {
    color: #888;
}

/* Fallback para prefers-color-scheme */
@media (prefers-color-scheme: dark) {
    .daily-budget-card {
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }

    .label {
        color: #aaa;
    }

    .details {
        color: #888;
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

.daily-budget-card {
    animation: slideUp 0.4s ease-out;
}
</style>
