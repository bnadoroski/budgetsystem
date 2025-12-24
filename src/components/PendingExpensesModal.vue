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

                                <div v-if="expense.merchantName" class="expense-merchant">
                                    <span class="merchant-icon">🏪</span>
                                    <span class="merchant-name">{{ expense.merchantName }}</span>
                                </div>

                                <div v-if="expense.installmentTotal" class="expense-installment">
                                    <span class="installment-icon">💳</span>
                                    <span class="installment-text">Parcela {{ expense.installmentNumber }}/{{
                                        expense.installmentTotal }}</span>
                                </div>

                                <div class="expense-footer">
                                    <span class="expense-category">🏷️ {{ expense.category }}</span>
                                    <span class="expense-time">{{ formatTime(expense.timestamp) }}</span>
                                </div>

                                <div class="expense-suggestion">
                                    <span class="suggestion-label">Sugerido:</span>
                                    <span class="suggestion-budget">{{ suggestedBudgets[expense.id] || 'Carregando...'
                                    }}</span>
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

                            <!-- Informações da despesa -->
                            <div class="expense-info">
                                <div class="info-row">
                                    <span class="info-label">Valor:</span>
                                    <span class="info-value">{{ formatCurrency(editingExpense.amount) }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Descrição:</span>
                                    <span class="info-value">{{ editingExpense.description }}</span>
                                </div>
                            </div>

                            <!-- Checkbox de Parcelamento -->
                            <div class="form-group checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="editingHasInstallments" />
                                    <span>💳 Esta compra é parcelada</span>
                                </label>
                            </div>

                            <!-- Opções de parcelamento -->
                            <div v-show="editingHasInstallments" class="installment-section">
                                <label class="section-title">💳 Parcelamento</label>
                                <div class="installment-inputs">
                                    <div class="input-group">
                                        <label for="installmentNumber">Parcela Atual:</label>
                                        <input id="installmentNumber" v-model.number="editingInstallmentNumber"
                                            type="number" min="1" :max="editingInstallmentTotal || 12" />
                                    </div>
                                    <div class="installment-separator">/</div>
                                    <div class="input-group">
                                        <label for="installmentTotal">Total de Parcelas:</label>
                                        <input id="installmentTotal" v-model.number="editingInstallmentTotal"
                                            type="number" min="1" max="99" />
                                    </div>
                                </div>
                            </div>

                            <!-- Lista de budgets -->
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

                <!-- Modal de confirmação para rejeitar -->
                <ConfirmModal
                    :show="showRejectConfirm"
                    title="Rejeitar Despesa"
                    message="Tem certeza que deseja <strong>rejeitar</strong> esta despesa? Ela será removida da lista."
                    type="danger"
                    confirm-text="Rejeitar"
                    confirm-icon="❌"
                    @confirm="confirmReject"
                    @cancel="cancelReject"
                />
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import ConfirmModal from './ConfirmModal.vue'

interface PendingExpense {
    id: string
    amount: number
    bank: string
    description: string
    category: string
    timestamp: number
    merchantName?: string
    installmentNumber?: number
    installmentTotal?: number
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
const editingHasInstallments = ref(false)
const editingInstallmentNumber = ref<number | undefined>(undefined)
const editingInstallmentTotal = ref<number | undefined>(undefined)
const swipingId = ref<string | null>(null)
const swipeX = ref(0)
const startX = ref(0)
const isDragging = ref(false)
const showRejectConfirm = ref(false)
const expenseToReject = ref<PendingExpense | null>(null)

const pendingExpenses = computed(() => budgetStore.pendingExpenses)

const suggestedBudgets = ref<{ [expenseId: string]: string }>({})

const getSuggestedBudget = async (expense: PendingExpense) => {
    // Se já tem cache, retorna
    if (suggestedBudgets.value[expense.id]) {
        return suggestedBudgets.value[expense.id]
    }

    // Primeiro tenta por merchant usando o store
    if (expense.merchantName && expense.merchantName !== 'Desconhecido') {
        const suggestion = await budgetStore.getMerchantSuggestion(expense.merchantName)
        if (suggestion && suggestion.confidence === 'high' && suggestion.budgetName) {
            const result = suggestion.budgetName + ' 🎯'
            suggestedBudgets.value[expense.id] = result
            return result
        }
        if (suggestion && suggestion.confidence === 'medium' && suggestion.budgetName) {
            const result = suggestion.budgetName + ' 💡'
            suggestedBudgets.value[expense.id] = result
            return result
        }
    }

    // Senão, procura budget com nome igual à categoria
    const suggested = budgetStore.budgets.find(b =>
        b.name.toLowerCase() === expense.category.toLowerCase()
    )
    const result = suggested?.name || `Criar "${expense.category}"`
    suggestedBudgets.value[expense.id] = result
    return result
}

// Carrega sugestões quando abre modal
watch(() => props.show, async (newShow) => {
    if (newShow && pendingExpenses.value.length > 0) {
        for (const expense of pendingExpenses.value) {
            await getSuggestedBudget(expense)
        }
    }
})

// Limpa campos de parcelamento quando checkbox é desmarcado
watch(editingHasInstallments, (newVal) => {
    if (!newVal) {
        editingInstallmentNumber.value = undefined
        editingInstallmentTotal.value = undefined
    }
})

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
        // Aprova despesa e salva transação
        await budgetStore.approvePendingExpenseWithTransaction(expense.id, budget.id)
    }
}

const editExpense = (expense: PendingExpense) => {
    editingExpense.value = expense
    // Inicializa campos de parcelamento com valores da despesa
    editingHasInstallments.value = !!(expense.installmentNumber && expense.installmentTotal)
    // Se já tem parcelas detectadas, usa os valores, senão preenche com 1/1 como padrão
    editingInstallmentNumber.value = expense.installmentNumber || 1
    editingInstallmentTotal.value = expense.installmentTotal || 1
}

const selectBudget = async (budgetName: string) => {
    if (!editingExpense.value) return

    const budget = budgetStore.budgets.find(b => b.name === budgetName)
    if (budget) {
        // Atualiza a despesa com informações de parcelamento antes de aprovar
        const updatedExpense = {
            ...editingExpense.value,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        }

        // Atualiza a despesa no store
        budgetStore.updatePendingExpense(updatedExpense.id, {
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        })

        await budgetStore.approvePendingExpenseWithTransaction(updatedExpense.id, budget.id)
        editingExpense.value = null
        editingInstallmentNumber.value = undefined
        editingInstallmentTotal.value = undefined
    }
}

const createNewBudget = () => {
    // Emite evento para que o App.vue abra a modal de criar budget
    // e mantenha a referência da despesa pendente
    if (editingExpense.value) {
        // Atualiza a despesa com informações de parcelamento antes de criar novo budget
        const updatedExpense = {
            ...editingExpense.value,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        }

        budgetStore.updatePendingExpense(updatedExpense.id, {
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        })

        emit('openAddBudget', updatedExpense)
        editingExpense.value = null
        editingInstallmentNumber.value = undefined
        editingInstallmentTotal.value = undefined
    }
}

const rejectExpense = (expense: PendingExpense) => {
    expenseToReject.value = expense
    showRejectConfirm.value = true
}

const confirmReject = () => {
    if (expenseToReject.value) {
        budgetStore.removePendingExpense(expenseToReject.value.id)
    }
    expenseToReject.value = null
    showRejectConfirm.value = false
}

const cancelReject = () => {
    expenseToReject.value = null
    showRejectConfirm.value = false
}

const cancelEdit = () => {
    editingExpense.value = null
    editingInstallmentNumber.value = undefined
    editingInstallmentTotal.value = undefined
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

.expense-merchant {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #FFF3E0;
    border-radius: 8px;
    margin-bottom: 8px;
}

.merchant-icon {
    font-size: 16px;
}

.merchant-name {
    font-size: 13px;
    font-weight: 600;
    color: #F57C00;
}

.expense-installment {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #E3F2FD;
    border-radius: 8px;
    margin-bottom: 8px;
}

.installment-icon {
    font-size: 16px;
}

.installment-text {
    font-size: 13px;
    font-weight: 600;
    color: #1976D2;
}

.expense-suggestion {
    background: #E8F5E9;
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
    color: #4CAF50;
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
    max-width: 450px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

.edit-modal h3 {
    margin: 0 0 16px 0;
}

/* Informações da despesa */
.expense-info {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-label {
    font-weight: 600;
    color: #666;
    font-size: 13px;
}

.info-value {
    color: #333;
    font-size: 13px;
}

/* Estilos para checkbox de parcelamento */
.checkbox-group {
    margin: 16px 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: #333;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #4CAF50;
}

.checkbox-label span {
    cursor: pointer;
}

/* Seção de parcelamento */
.installment-section {
    background: #E3F2FD;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
}

.section-title {
    display: block;
    font-weight: 600;
    color: #1976D2;
    margin-bottom: 12px;
    font-size: 14px;
}

.installment-inputs {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 8px;
}

.input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.input-group label {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
    font-weight: 500;
}

.input-group input {
    padding: 10px;
    border: 2px solid #BBDEFB;
    border-radius: 8px;
    font-size: 16px;
    text-align: center;
    font-weight: 600;
    color: #1976D2;
    background: white;
}

.input-group input:focus {
    outline: none;
    border-color: #1976D2;
}

.installment-separator {
    font-size: 24px;
    font-weight: bold;
    color: #1976D2;
    padding-bottom: 8px;
}

.installment-hint {
    font-size: 11px;
    color: #666;
    margin: 0;
    font-style: italic;
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

/* Dark mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header {
    background: linear-gradient(135deg, #1a3a5c 0%, #0f2336 100%);
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .expense-card {
    background: #2a2a3e;
    border-color: #3a3a4e;
}

body.dark-mode .expense-description {
    color: #fff;
}

body.dark-mode .expense-bank {
    color: #aaa;
}

body.dark-mode .expense-amount {
    color: #ff6b6b;
}

body.dark-mode .budget-selector-label {
    color: #aaa;
}

body.dark-mode .budget-selector {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .expense-installment {
    background: #1a2a3e;
}

body.dark-mode .installment-text {
    color: #64b5f6;
}

body.dark-mode .expense-suggestion {
    background: #1a3a2a;
}

body.dark-mode .suggestion-label {
    color: #aaa;
}

body.dark-mode .empty-state {
    color: #aaa;
}

body.dark-mode .btn-reject {
    background: #3a2a2a;
    color: #ff7070;
}

body.dark-mode .btn-reject:hover {
    background: #4a3a3a;
}

body.dark-mode .delete-all-section {
    border-top-color: #3a3a4e;
}
</style>
