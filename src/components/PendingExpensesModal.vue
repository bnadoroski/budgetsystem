<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show && pendingExpenses.length > 0" class="modal-overlay" @click="close">
                <div class="modal-content" @click.stop>
                    <div class="modal-header-fixed">
                        <h2>💰 Despesas Pendentes ({{ pendingExpenses.length }})</h2>
                    </div>

                    <div class="modal-body-scroll">
                        <div class="expenses-list">
                            <div v-for="expense in pendingExpenses" :key="expense.id" class="expense-card"
                                :class="{ 'swiping': swipingId === expense.id, 'selecting': selectionMode }"
                                :style="swipingId === expense.id ? { transform: `translateX(${swipeX}px)` } : {}"
                                @touchstart="handleTouchStart($event, expense)" @touchmove="handleTouchMove($event)"
                                @touchend="handleTouchEnd(expense)" @mousedown="handleMouseDown($event, expense)">
                                <!-- Checkbox para seleção múltipla -->
                                <div v-if="selectionMode" class="checkbox-container"
                                    @click.stop="toggleSelection(expense.id)">
                                    <div class="custom-checkbox"
                                        :class="{ 'checked': selectedExpenses.has(expense.id) }">
                                        <svg v-if="selectedExpenses.has(expense.id)" class="check-icon"
                                            viewBox="0 0 24 24">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                    </div>
                                </div>
                                <!-- Ação de fundo quando arrasta -->
                                <div class="swipe-action-left" v-if="swipeX < -50">
                                    <span class="reject-x">✕</span>
                                </div>
                                <div class="swipe-action-right" v-if="swipeX > 50">
                                    <span>✓</span>
                                </div>

                                <div class="expense-content">
                                    <div class="expense-header">
                                        <span class="expense-bank">🏦 {{ expense.bank }}</span>
                                        <span class="expense-amount" :class="{ 'income': expense.amount < 0 }">{{
                                            formatCurrency(Math.abs(expense.amount)) }}</span>
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

                                    <!-- <div class="expense-footer">
                                    <span class="expense-category">🏷️ {{ expense.category }}</span>
                                    <span class="expense-time">{{ formatTime(expense.timestamp) }}</span>
                                </div> -->

                                    <div class="expense-suggestion">
                                        <span class="suggestion-label">Sugerido:</span>
                                        <span class="suggestion-budget">{{ suggestedBudgets[expense.id] ||
                                            'Carregando...'
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
                    </div>

                    <div class="modal-footer-fixed">
                        <button class="btn-clear" @click="handleClearButton">
                            {{ selectionMode ? (selectedExpenses.size > 0 ? `Rejeitar (${selectedExpenses.size})` :
                                'Rejeitar Todos') : 'Limpar' }}
                        </button>
                        <button class="btn-close" @click="close">Fechar</button>
                    </div>
                </div>

                <!-- Modal de edição de budget -->
                <Transition name="modal">
                    <div v-if="editingExpense" class="modal-overlay edit-overlay" @click="cancelEdit">
                        <div class="edit-modal" @click.stop>
                            <h3>✏️ Editar Despesa</h3>

                            <!-- Informações da despesa -->
                            <div class="expense-info">
                                <div class="info-row">
                                    <span class="info-label">Valor:</span>
                                    <span class="info-value">{{ formatCurrency(editingExpense.amount) }}</span>
                                </div>
                            </div>

                            <!-- Campo de descrição editável -->
                            <div class="form-group">
                                <label class="section-title" for="editDescription">📝 Descrição</label>
                                <input id="editDescription" v-model="editingDescription" type="text"
                                    class="description-input" placeholder="Ex: Pagamento para empresa XYZ" />
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
                            <label class="section-title">🏦 Escolher Budget</label>
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
                <ConfirmModal :show="showRejectConfirm" title="Rejeitar Despesa"
                    message="Tem certeza que deseja <strong>rejeitar</strong> esta despesa? Ela será removida da lista."
                    type="danger" confirm-text="Rejeitar" confirm-icon="❌" @confirm="confirmReject"
                    @cancel="cancelReject" />
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useSubscriptionStore } from '@/stores/subscription'
import ConfirmModal from './ConfirmModal.vue'
import { useLongPress } from '@/composables/useLongPress'

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
    requirePremium: [] // Emitido quando usuário tenta atribuir sem ser premium
}>()

const budgetStore = useBudgetStore()
const subscriptionStore = useSubscriptionStore()
const editingExpense = ref<PendingExpense | null>(null)
const editingDescription = ref<string>('')

// Estado para modo de seleção múltipla
const selectionMode = ref(false)
const selectedExpenses = ref<Set<string>>(new Set())

// Long press para ativar seleção
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const longPressThreshold = 500
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

    try {
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
    } catch (error) {
        console.error('Erro ao buscar sugestão:', error)
        // Em caso de erro, usa fallback baseado na categoria
        const suggested = budgetStore.budgets.find(b =>
            b.name.toLowerCase() === expense.category.toLowerCase()
        )
        const result = suggested?.name || `Criar "${expense.category}"`
        suggestedBudgets.value[expense.id] = result
        return result
    }
}

// Carrega sugestões quando abre modal
watch(() => props.show, async (newShow) => {
    if (newShow && pendingExpenses.value.length > 0) {
        for (const expense of pendingExpenses.value) {
            await getSuggestedBudget(expense)
        }
    }
})

// Carrega sugestões quando novas despesas chegam (modal já aberto)
watch(pendingExpenses, async (newExpenses, oldExpenses) => {
    if (!props.show) return
    // Carrega sugestões apenas para despesas novas
    for (const expense of newExpenses) {
        if (!suggestedBudgets.value[expense.id]) {
            await getSuggestedBudget(expense)
        }
    }
    // Limpa sugestões de despesas removidas
    const newIds = new Set(newExpenses.map(e => e.id))
    for (const id of Object.keys(suggestedBudgets.value)) {
        if (!newIds.has(id)) {
            delete suggestedBudgets.value[id]
        }
    }
}, { deep: true })

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

    // Se em modo de seleção, não fazer swipe
    if (selectionMode.value) {
        toggleSelection(expense.id)
        return
    }

    // Iniciar long press timer
    handleLongPressStart(expense)

    swipingId.value = expense.id
    startX.value = e.touches[0].clientX
    isDragging.value = true
}

const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || !e.touches[0]) return

    // Se moveu, cancelar long press
    const moveX = Math.abs(e.touches[0].clientX - startX.value)
    if (moveX > 10) {
        handleLongPressEnd()
    }

    swipeX.value = e.touches[0].clientX - startX.value
}

const handleTouchEnd = (expense: PendingExpense) => {
    handleLongPressEnd()

    if (!isDragging.value) return

    // Se em modo de seleção, não processar swipe
    if (selectionMode.value) {
        swipeX.value = 0
        swipingId.value = null
        isDragging.value = false
        return
    }

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
    // Verifica se pode atribuir (premium)
    if (!subscriptionStore.canUseAutoNotifications) {
        emit('requirePremium')
        return
    }

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
    // Inicializa campo de descrição
    editingDescription.value = expense.description || ''
    // Inicializa campos de parcelamento com valores da despesa
    editingHasInstallments.value = !!(expense.installmentNumber && expense.installmentTotal)
    // Se já tem parcelas detectadas, usa os valores, senão preenche com 1/1 como padrão
    editingInstallmentNumber.value = expense.installmentNumber || 1
    editingInstallmentTotal.value = expense.installmentTotal || 1
}

const selectBudget = async (budgetName: string) => {
    if (!editingExpense.value) return

    // Verifica se pode atribuir (premium)
    if (!subscriptionStore.canUseAutoNotifications) {
        emit('requirePremium')
        editingExpense.value = null
        return
    }

    const budget = budgetStore.budgets.find(b => b.name === budgetName)
    if (budget) {
        // Atualiza a despesa com informações de parcelamento e descrição antes de aprovar
        const updatedExpense = {
            ...editingExpense.value,
            description: editingDescription.value || editingExpense.value.description,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        }

        // Atualiza a despesa no store
        budgetStore.updatePendingExpense(updatedExpense.id, {
            description: editingDescription.value || editingExpense.value.description,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        })

        await budgetStore.approvePendingExpenseWithTransaction(updatedExpense.id, budget.id)
        editingExpense.value = null
        editingDescription.value = ''
        editingInstallmentNumber.value = undefined
        editingInstallmentTotal.value = undefined
    }
}

const createNewBudget = () => {
    // Verifica se pode atribuir (premium)
    if (!subscriptionStore.canUseAutoNotifications) {
        emit('requirePremium')
        editingExpense.value = null
        return
    }

    // Emite evento para que o App.vue abra a modal de criar budget
    // e mantenha a referência da despesa pendente
    if (editingExpense.value) {
        // Atualiza a despesa com informações de parcelamento e descrição antes de criar novo budget
        const updatedExpense = {
            ...editingExpense.value,
            description: editingDescription.value || editingExpense.value.description,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        }

        budgetStore.updatePendingExpense(updatedExpense.id, {
            description: editingDescription.value || editingExpense.value.description,
            installmentNumber: editingInstallmentNumber.value,
            installmentTotal: editingInstallmentTotal.value
        })

        emit('openAddBudget', updatedExpense)
        editingExpense.value = null
        editingDescription.value = ''
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
    editingDescription.value = ''
    editingInstallmentNumber.value = undefined
    editingInstallmentTotal.value = undefined
}

// Funções de seleção múltipla
const toggleSelection = (expenseId: string) => {
    if (selectedExpenses.value.has(expenseId)) {
        selectedExpenses.value.delete(expenseId)
    } else {
        selectedExpenses.value.add(expenseId)
    }
    // Se não há mais seleções, sair do modo de seleção
    if (selectedExpenses.value.size === 0 && selectionMode.value) {
        selectionMode.value = false
    }
}

const handleClearButton = () => {
    if (!selectionMode.value) {
        // Primeiro clique: entrar no modo de seleção e selecionar todos
        selectionMode.value = true
        selectedExpenses.value = new Set(pendingExpenses.value.map(e => e.id))
    } else {
        // Segundo clique: rejeitar todos os selecionados
        if (selectedExpenses.value.size > 0) {
            selectedExpenses.value.forEach(id => {
                budgetStore.removePendingExpense(id)
            })
            selectedExpenses.value.clear()
            selectionMode.value = false
        }
    }
}

const handleLongPressStart = (expense: PendingExpense) => {
    longPressTimer = setTimeout(() => {
        // Ativar modo de seleção com este item selecionado
        selectionMode.value = true
        selectedExpenses.value = new Set([expense.id])
    }, longPressThreshold)
}

const handleLongPressEnd = () => {
    if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
    }
}

// Reset do modo de seleção quando fechar modal
watch(() => props.show, (newShow) => {
    if (!newShow) {
        selectionMode.value = false
        selectedExpenses.value.clear()
    }
})

const close = () => {
    selectionMode.value = false
    selectedExpenses.value.clear()
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
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header-fixed {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
}

.modal-header-fixed h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
}

.modal-body-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
}

.expenses-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
    font-size: 32px;
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

.expense-amount.income {
    color: #4CAF50;
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

/* Footer fixo com botões */
.modal-footer-fixed {
    padding: 12px 24px;
    background: white;
    border-top: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
}

.btn-clear {
    width: 100%;
    padding: 10px;
    background: #ff5252;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-clear:hover {
    background: #f44336;
}

.btn-close {
    width: 100%;
    padding: 10px;
    background: #666;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-close:hover {
    background: #555;
}

/* Checkbox container */
.checkbox-container {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    padding: 8px;
    margin: -8px;
}

.custom-checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid #ccc;
    border-radius: 6px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    cursor: pointer;
}

.custom-checkbox:hover {
    border-color: #a0a0a0;
}

.custom-checkbox.checked {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    border-color: #4CAF50;
}

.custom-checkbox .check-icon {
    width: 14px;
    height: 14px;
    fill: white;
}

.expense-card.selecting {
    padding-left: 52px;
}

/* X vermelho para rejeitar */
.reject-x {
    font-size: 32px;
    font-weight: bold;
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

/* Campo de descrição editável */
.form-group {
    margin-bottom: 16px;
}

.description-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #E0E0E0;
    border-radius: 8px;
    font-size: 14px;
    color: #333;
    background: white;
    box-sizing: border-box;
}

.description-input:focus {
    outline: none;
    border-color: #4CAF50;
}

.description-input::placeholder {
    color: #999;
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

body.dark-mode .custom-checkbox {
    background: #2a2a3e;
    border-color: #555;
}

body.dark-mode .custom-checkbox:hover {
    border-color: #777;
}

body.dark-mode .custom-checkbox.checked {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    border-color: #4CAF50;
}
</style>
