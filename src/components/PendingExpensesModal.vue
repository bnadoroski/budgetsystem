<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show && pendingExpenses.length > 0" class="modal-overlay" @click="close">
                <div class="modal-content" @click.stop>
                    <h2>💰 Despesas Pendentes ({{ pendingExpenses.length }})</h2>

                    <div class="expenses-list">
                        <div v-for="expense in pendingExpenses" :key="expense.id" class="expense-card"
                            :class="{ 'swiping': swipingId === expense.id }"
                            :style="swipingId === expense.id ? { transform: `translateX(${swipeX}px)` } : {}"
                            @touchstart="handleTouchStart($event, expense)" @touchmove="handleTouchMove($event)"
                            @touchend="handleTouchEnd(expense)" @mousedown="handleMouseDown($event, expense)">
                            <!-- Ação de fundo quando arrasta -->
                            <div class="swipe-action-left" v-if="swipeX < -50">
                                <span>❌ Rejeitar</span>
                            </div>
                            <div class="swipe-action-right" v-if="swipeX > 50">
                                <span>✅ Aprovar</span>
                            </div>

                            <div class="expense-content">
                                <div class="expense-header">
                                    <span class="expense-bank">🏦 {{ expense.bank }}</span>
                                    <span class="expense-amount">{{ formatCurrency(expense.amount) }}</span>
                                </div>

                                <p class="expense-description">{{ expense.description }}</p>

                                <div class="expense-footer">
                                    <span class="expense-category">🏷️ {{ expense.category }}</span>
                                    <span class="expense-time">{{ formatTime(expense.timestamp) }}</span>
                                </div>

                                <div class="expense-suggestion">
                                    <span class="suggestion-label">Sugerido:</span>
                                    <span class="suggestion-budget">{{ getSuggestedBudget(expense) }}</span>
                                    <button class="btn-choose-budget" @click="editExpense(expense)"
                                        title="Escolher budget">
                                        ✏️
                                    </button>
                                </div>

                                <div class="swipe-hint">
                                    👉 Arraste → para aprovar | ← para rejeitar
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="btn-close" @click="close">Fechar</button>
                </div>

                <!-- Modal de edição de budget -->
                <Transition name="modal">
                    <div v-if="editingExpense" class="modal-overlay edit-overlay" @click="cancelEdit">
                        <div class="edit-modal" @click.stop>
                            <h3>✏️ Escolher Budget</h3>

                            <div class="budget-list">
                                <button v-for="budget in budgetStore.budgets" :key="budget.id" class="budget-option"
                                    @click="selectBudget(budget.name)">
                                    <div class="budget-color" :style="{ backgroundColor: budget.color }"></div>
                                    <span>{{ budget.name }}</span>
                                </button>

                                <button class="budget-option new-budget" @click="createNewBudget">
                                    <div class="budget-color" style="background: #4CAF50">+</div>
                                    <span>Criar Novo Budget</span>
                                </button>
                            </div>

                            <button class="btn-cancel" @click="cancelEdit">Cancelar</button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

interface PendingExpense {
    id: string
    amount: number
    bank: string
    description: string
    category: string
    timestamp: number
}

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
    openAddBudget: [expense: PendingExpense]
}>()

const budgetStore = useBudgetStore()
const editingExpense = ref<PendingExpense | null>(null)
const swipingId = ref<string | null>(null)
const swipeX = ref(0)
const startX = ref(0)
const isDragging = ref(false)

const pendingExpenses = computed(() => budgetStore.pendingExpenses)

const getSuggestedBudget = (expense: PendingExpense) => {
    // Procura budget com nome igual à categoria
    const suggested = budgetStore.budgets.find(b =>
        b.name.toLowerCase() === expense.category.toLowerCase()
    )
    return suggested?.name || `Criar "${expense.category}"`
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h atrás`
    return date.toLocaleDateString('pt-BR')
}

// Touch handlers para swipe
const handleTouchStart = (e: TouchEvent, expense: PendingExpense) => {
    if (!e.touches[0]) return
    swipingId.value = expense.id
    startX.value = e.touches[0].clientX
    isDragging.value = true
}

const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || !e.touches[0]) return
    swipeX.value = e.touches[0].clientX - startX.value
}

const handleTouchEnd = (expense: PendingExpense) => {
    if (!isDragging.value) return

    if (swipeX.value > 100) {
        // Arraste para direita = aprovar
        approveExpense(expense)
    } else if (swipeX.value < -100) {
        // Arraste para esquerda = rejeitar
        rejectExpense(expense)
    }

    // Reset
    swipeX.value = 0
    swipingId.value = null
    isDragging.value = false
}

// Mouse handlers para desktop
const handleMouseDown = (e: MouseEvent, expense: PendingExpense) => {
    swipingId.value = expense.id
    startX.value = e.clientX
    isDragging.value = true

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.value) return
        swipeX.value = e.clientX - startX.value
    }

    const handleMouseUp = () => {
        handleTouchEnd(expense)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
}

const approveExpense = async (expense: PendingExpense) => {
    // Procura ou cria budget
    let budget = budgetStore.budgets.find(b =>
        b.name.toLowerCase() === expense.category.toLowerCase()
    )

    if (!budget) {
        // Cria budget automaticamente
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0']
        const color = colors[Math.floor(Math.random() * colors.length)]

        await budgetStore.addBudget(expense.category, 1000, color) // Valor padrão R$ 1000

        // Pega o budget recém criado
        budget = budgetStore.budgets.find(b =>
            b.name.toLowerCase() === expense.category.toLowerCase()
        )
    }

    if (budget) {
        // Adiciona despesa ao budget
        await budgetStore.addExpense(budget.id, expense.amount)

        // Remove da lista de pendentes
        budgetStore.removePendingExpense(expense.id)
    }
}

const editExpense = (expense: PendingExpense) => {
    editingExpense.value = expense
}

const selectBudget = async (budgetName: string) => {
    if (!editingExpense.value) return

    const budget = budgetStore.budgets.find(b => b.name === budgetName)
    if (budget) {
        await budgetStore.addExpense(budget.id, editingExpense.value.amount)
        budgetStore.removePendingExpense(editingExpense.value.id)
        editingExpense.value = null
    }
}

const createNewBudget = () => {
    // Emite evento para que o App.vue abra a modal de criar budget
    // e mantenha a referência da despesa pendente
    if (editingExpense.value) {
        emit('openAddBudget', editingExpense.value)
        editingExpense.value = null
    }
}

const rejectExpense = (expense: PendingExpense) => {
    if (confirm('Tem certeza que deseja rejeitar esta despesa?')) {
        budgetStore.removePendingExpense(expense.id)
    }
}

const cancelEdit = () => {
    editingExpense.value = null
}

const close = () => {
    emit('close')
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 16px;
}

.edit-overlay {
    z-index: 2100;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
}

h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #333;
}

.expenses-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
}

.expense-card {
    position: relative;
    background: #f5f5f5;
    border-radius: 12px;
    padding: 16px;
    cursor: grab;
    user-select: none;
    transition: transform 0.3s, box-shadow 0.2s;
}

.expense-card:active {
    cursor: grabbing;
}

.expense-card.swiping {
    transition: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.swipe-action-left,
.swipe-action-right {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 14px;
}

.swipe-action-left {
    right: 100%;
    background: #f44336;
    border-radius: 12px 0 0 12px;
}

.swipe-action-right {
    left: 100%;
    background: #4CAF50;
    border-radius: 0 12px 12px 0;
}

.expense-content {
    position: relative;
    z-index: 1;
}

.expense-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.expense-bank {
    font-weight: 600;
    color: #666;
}

.expense-amount {
    font-size: 20px;
    font-weight: bold;
    color: #E91E63;
}

.expense-description {
    color: #333;
    margin: 8px 0;
    font-size: 14px;
}

.expense-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #999;
    margin-bottom: 12px;
}

.expense-suggestion {
    background: #E3F2FD;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.suggestion-label {
    color: #666;
}

.suggestion-budget {
    font-weight: 600;
    color: #2196F3;
    flex: 1;
}

.btn-choose-budget {
    padding: 4px 8px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-choose-budget:hover {
    background: #1976D2;
}

.swipe-hint {
    text-align: center;
    font-size: 11px;
    color: #999;
    margin-top: 8px;
}

.btn-close {
    width: 100%;
    padding: 12px;
    background: #666;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-close:hover {
    background: #555;
}

/* Modal de edição */
.edit-modal {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 100%;
}

.edit-modal h3 {
    margin: 0 0 16px 0;
}

.budget-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
}

.budget-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f5f5f5;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
}

.budget-option:hover {
    background: #e0e0e0;
}

.budget-option.new-budget {
    background: #E8F5E9;
}

.budget-color {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
}

.btn-cancel {
    width: 100%;
    padding: 12px;
    background: #666;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
}

/* Animações */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
