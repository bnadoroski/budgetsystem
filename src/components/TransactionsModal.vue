<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('close')">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <h2>Lançamentos - {{ budgetName }}</h2>
                        <button class="close-button" @click="$emit('close')">✕</button>
                    </div>

                    <div class="modal-body">
                        <div v-if="loading" class="loading">
                            <div class="loading-spinner"></div>
                            <p>Carregando lançamentos...</p>
                        </div>

                        <div v-else-if="transactions.length === 0" class="empty-state">
                            <div class="empty-icon">📋</div>
                            <p>Nenhum lançamento encontrado</p>
                        </div>

                        <div v-else class="transactions-list">
                            <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item">
                                <div class="transaction-header">
                                    <div class="transaction-info">
                                        <div class="merchant-name">
                                            {{ transaction.merchantName || 'Lançamento manual' }}
                                        </div>
                                        <div class="transaction-date">
                                            {{ formatDate(transaction.createdAt) }}
                                        </div>
                                    </div>
                                    <div class="transaction-amount" :class="{ income: transaction.isIncome }">
                                        {{ transaction.isIncome ? '+' : '-' }} R$ {{ transaction.amount.toFixed(2) }}
                                    </div>
                                </div>

                                <div class="transaction-details">
                                    <div v-if="transaction.description" class="detail-row">
                                        <span class="detail-label">Descrição:</span>
                                        <span class="detail-value">{{ transaction.description }}</span>
                                    </div>
                                    <div v-if="transaction.bank" class="detail-row">
                                        <span class="detail-label">Banco:</span>
                                        <span class="detail-value">{{ transaction.bank }}</span>
                                    </div>
                                    <div v-if="transaction.isInstallment" class="detail-row">
                                        <span class="detail-label">Parcela:</span>
                                        <span class="detail-value installment">
                                            {{ transaction.installmentNumber }}/{{ transaction.installmentTotal }}
                                        </span>
                                    </div>
                                </div>

                                <div class="transaction-actions">
                                    <button class="action-btn edit-btn" @click="openEditModal(transaction)"
                                        title="Editar">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                        Editar
                                    </button>
                                    <button class="action-btn transfer-btn" @click="openTransferModal(transaction)"
                                        title="Transferir">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2">
                                            <polyline points="17 1 21 5 17 9"></polyline>
                                            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                            <polyline points="7 23 3 19 7 15"></polyline>
                                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                        </svg>
                                        Transferir
                                    </button>
                                    <button class="action-btn delete-btn" @click="openDeleteModal(transaction)"
                                        title="Excluir">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path
                                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                            </path>
                                        </svg>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Modal -->
                    <Transition name="submodal">
                        <div v-if="showEditModal" class="submodal-overlay" @click="closeEditModal">
                            <div class="submodal-content edit-modal" @click.stop>
                                <div class="submodal-header">
                                    <div class="submodal-icon edit-icon">✏️</div>
                                    <h3>Editar Lançamento</h3>
                                </div>
                                <div class="submodal-body">
                                    <div class="form-group">
                                        <label>Descrição</label>
                                        <input type="text" v-model="editForm.description"
                                            placeholder="Descrição do lançamento" />
                                    </div>
                                    <div class="form-group">
                                        <label>Valor</label>
                                        <Money3Component v-model="editFormAmount" v-bind="moneyConfig"
                                            class="money-input" />
                                    </div>
                                    <div class="form-group">
                                        <label>Comércio</label>
                                        <input type="text" v-model="editForm.merchantName"
                                            placeholder="Nome do comércio" />
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group half">
                                            <label>
                                                <input type="checkbox" v-model="editForm.isInstallment" />
                                                Parcelado
                                            </label>
                                        </div>
                                        <template v-if="editForm.isInstallment">
                                            <div class="form-group quarter">
                                                <label>Parcela</label>
                                                <input type="number" v-model="editForm.installmentNumber" min="1" />
                                            </div>
                                            <div class="form-group quarter">
                                                <label>de</label>
                                                <input type="number" v-model="editForm.installmentTotal" min="1" />
                                            </div>
                                        </template>
                                    </div>
                                </div>
                                <div class="submodal-actions">
                                    <button class="btn btn-cancel" @click="closeEditModal">Cancelar</button>
                                    <button class="btn btn-save" @click="saveEdit">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Transition>

                    <!-- Transfer Modal -->
                    <Transition name="submodal">
                        <div v-if="showTransferModal" class="submodal-overlay" @click="closeTransferModal">
                            <div class="submodal-content transfer-modal" @click.stop>
                                <div class="submodal-header transfer-header">
                                    <div class="submodal-icon transfer-icon">🔄</div>
                                    <h3>Transferir Lançamento</h3>
                                </div>
                                <div class="submodal-body">
                                    <div class="transfer-info">
                                        <div class="transfer-amount">R$ {{
                                            transferringTransaction?.amount.toFixed(2) }}</div>
                                        <div class="transfer-desc">{{ transferringTransaction?.merchantName ||
                                            transferringTransaction?.description }}</div>
                                    </div>
                                    <p class="transfer-label">Selecione o budget de destino:</p>
                                    <div class="budget-options">
                                        <button v-for="budget in availableBudgets" :key="budget.id"
                                            class="budget-option" :style="{ borderColor: budget.color }"
                                            @click="confirmTransfer(budget.id)">
                                            <span class="budget-color" :style="{ background: budget.color }"></span>
                                            <span class="budget-name">{{ budget.name }}</span>
                                            <span class="budget-value">R$ {{ budget.spentValue.toFixed(2) }} / {{
                                                budget.totalValue.toFixed(2) }}</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="submodal-actions">
                                    <button class="btn btn-cancel full" @click="closeTransferModal">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </Transition>

                    <!-- Delete Modal -->
                    <Transition name="submodal">
                        <div v-if="showDeleteModal" class="submodal-overlay" @click="closeDeleteModal">
                            <div class="submodal-content delete-modal" @click.stop>
                                <div class="submodal-header delete-header">
                                    <div class="submodal-icon delete-icon">🗑️</div>
                                    <h3>Excluir Lançamento</h3>
                                </div>
                                <div class="submodal-body">
                                    <p class="delete-warning">Tem certeza que deseja excluir este lançamento?</p>
                                    <div class="delete-preview">
                                        <div class="preview-row">
                                            <span class="preview-label">Valor:</span>
                                            <span class="preview-value amount">R$ {{
                                                deletingTransaction?.amount.toFixed(2) }}</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Descrição:</span>
                                            <span class="preview-value">{{ deletingTransaction?.merchantName ||
                                                deletingTransaction?.description || 'Sem descrição' }}</span>
                                        </div>
                                        <div class="preview-row">
                                            <span class="preview-label">Data:</span>
                                            <span class="preview-value">{{ deletingTransaction ?
                                                formatDate(deletingTransaction.createdAt) : '' }}</span>
                                        </div>
                                    </div>
                                    <div class="delete-note">
                                        <span class="note-icon">⚠️</span>
                                        <span>O valor será removido do total gasto do budget.</span>
                                    </div>
                                </div>
                                <div class="submodal-actions">
                                    <button class="btn btn-cancel" @click="closeDeleteModal">Cancelar</button>
                                    <button class="btn btn-delete" @click="confirmDelete">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path
                                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                            </path>
                                        </svg>
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import type { Transaction } from '@/types/budget'
import { Money3Component } from 'v-money3'

const props = defineProps<{
    show: boolean
    budgetId: string
    budgetName: string
}>()

const emit = defineEmits<{
    close: []
}>()

const authStore = useAuthStore()
const budgetStore = useBudgetStore()
const transactions = ref<Transaction[]>([])
const loading = ref(false)

// Money config
const moneyConfig = {
    decimal: ',',
    thousands: '.',
    prefix: 'R$ ',
    suffix: '',
    precision: 2,
    masked: true
}

// Edit modal state
const showEditModal = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const editFormAmount = ref('')
const editForm = ref({
    description: '',
    amount: 0,
    merchantName: '',
    isInstallment: false,
    installmentNumber: 1,
    installmentTotal: 1
})

// Transfer modal state
const showTransferModal = ref(false)
const transferringTransaction = ref<Transaction | null>(null)

// Delete modal state
const showDeleteModal = ref(false)
const deletingTransaction = ref<Transaction | null>(null)

const availableBudgets = computed(() => {
    return budgetStore.budgets.filter(b => b.id !== props.budgetId)
})

const loadTransactions = async () => {
    loading.value = true
    try {
        transactions.value = await budgetStore.loadTransactions(props.budgetId)
    } catch (error) {
        console.error('[TRANSACTIONS_MODAL] Erro ao carregar transacoes:', error)
    } finally {
        loading.value = false
    }
}

watch(() => props.show, async (newVal) => {
    if (newVal) {
        await loadTransactions()
    }
}, { immediate: true })

onMounted(() => {
    console.log('[TRANSACTIONS_MODAL] Componente montado')
})

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

// Edit functions
const openEditModal = (transaction: Transaction) => {
    editingTransaction.value = transaction
    editFormAmount.value = transaction.amount.toFixed(2).replace('.', ',')
    editForm.value = {
        description: transaction.description || '',
        amount: transaction.amount,
        merchantName: transaction.merchantName || '',
        isInstallment: transaction.isInstallment || false,
        installmentNumber: transaction.installmentNumber || 1,
        installmentTotal: transaction.installmentTotal || 1
    }
    showEditModal.value = true
}

const closeEditModal = () => {
    showEditModal.value = false
    editingTransaction.value = null
}

// Função para converter string de moeda para número
const parseMoneyValue = (value: string): number => {
    if (!value) return 0
    const cleanStr = value
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    return parseFloat(cleanStr) || 0
}

const saveEdit = async () => {
    if (!editingTransaction.value) return

    try {
        const amount = parseMoneyValue(editFormAmount.value)
        const updates: Partial<Transaction> = {
            description: editForm.value.description,
            amount: amount,
            merchantName: editForm.value.merchantName,
            isInstallment: editForm.value.isInstallment
        }

        if (editForm.value.isInstallment) {
            updates.installmentNumber = editForm.value.installmentNumber
            updates.installmentTotal = editForm.value.installmentTotal
        }

        await budgetStore.updateTransaction(editingTransaction.value.id, updates)
        closeEditModal()
        await loadTransactions()
        // Recarregar budgets para atualizar valores
        if (authStore.userId) {
            await budgetStore.loadBudgets(authStore.userId)
        }
    } catch (error) {
        console.error('Erro ao editar transação:', error)
    }
}

// Transfer functions
const openTransferModal = (transaction: Transaction) => {
    transferringTransaction.value = transaction
    showTransferModal.value = true
}

const closeTransferModal = () => {
    showTransferModal.value = false
    transferringTransaction.value = null
}

const confirmTransfer = async (newBudgetId: string) => {
    if (!transferringTransaction.value) return

    try {
        await budgetStore.transferTransaction(transferringTransaction.value.id, newBudgetId)
        closeTransferModal()
        await loadTransactions()
        // Recarregar budgets para atualizar valores na tela principal
        if (authStore.userId) {
            await budgetStore.loadBudgets(authStore.userId)
        }
    } catch (error) {
        console.error('Erro ao transferir transação:', error)
    }
}

// Delete functions
const openDeleteModal = (transaction: Transaction) => {
    deletingTransaction.value = transaction
    showDeleteModal.value = true
}

const closeDeleteModal = () => {
    showDeleteModal.value = false
    deletingTransaction.value = null
}

const confirmDelete = async () => {
    if (!deletingTransaction.value) return

    try {
        await budgetStore.deleteTransaction(deletingTransaction.value.id)
        closeDeleteModal()
        await loadTransactions()
        // Recarregar budgets para atualizar valores
        if (authStore.userId) {
            await budgetStore.loadBudgets(authStore.userId)
        }
    } catch (error) {
        console.error('Erro ao excluir transação:', error)
    }
}
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
    z-index: 2000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
}

.close-button:hover {
    background: #f5f5f5;
    color: #333;
}

.modal-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
}

.loading {
    text-align: center;
    padding: 40px 20px;
    color: #999;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #999;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.transactions-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.transaction-item {
    background: #f9f9f9;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #eee;
}

.transaction-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.transaction-info {
    flex: 1;
}

.merchant-name {
    font-weight: 600;
    color: #333;
    font-size: 16px;
    margin-bottom: 4px;
}

.transaction-date {
    font-size: 12px;
    color: #999;
}

.transaction-amount {
    font-size: 18px;
    font-weight: 700;
    color: #d32f2f;
}

.transaction-amount.income {
    color: #4CAF50;
}

.transaction-details {
    margin-bottom: 12px;
    padding: 12px;
    background: white;
    border-radius: 8px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
}

.detail-row:last-child {
    margin-bottom: 0;
}

.detail-label {
    color: #666;
    font-weight: 500;
}

.detail-value {
    color: #333;
}

.detail-value.installment {
    background: #e3f2fd;
    color: #1976d2;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 13px;
}

.transaction-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: white;
    border: 1px solid #ddd;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    color: #555;
}

.action-btn svg {
    flex-shrink: 0;
}

.action-btn:active {
    transform: scale(0.95);
}

.edit-btn:hover {
    background: #e3f2fd;
    border-color: #2196F3;
    color: #1976d2;
}

.transfer-btn:hover {
    background: #fff3e0;
    border-color: #ff9800;
    color: #f57c00;
}

.delete-btn:hover {
    background: #ffebee;
    border-color: #f44336;
    color: #d32f2f;
}

/* Submodal Styles */
.submodal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
    padding: 20px;
}

.submodal-content {
    background: white;
    border-radius: 16px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.submodal-header {
    padding: 24px;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.transfer-header {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.delete-header {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
}

.submodal-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.submodal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.submodal-body {
    padding: 24px;
}

.submodal-actions {
    display: flex;
    gap: 12px;
    padding: 0 24px 24px;
}

.btn {
    flex: 1;
    padding: 14px 20px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn.full {
    width: 100%;
}

.btn-cancel {
    background: #f0f0f0;
    color: #666;
}

.btn-cancel:hover {
    background: #e0e0e0;
}

.btn-save {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-save:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-delete {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    color: white;
}

.btn-delete:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(204, 0, 0, 0.4);
}

/* Edit Modal Styles */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #555;
    margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group .money-input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 15px;
    transition: border-color 0.2s;
    box-sizing: border-box;
}

.form-group input:focus,
.form-group .money-input:focus {
    outline: none;
    border-color: #667eea;
}

.form-row {
    display: flex;
    gap: 12px;
    align-items: flex-end;
}

.form-group.half {
    flex: 1;
}

.form-group.quarter {
    width: 70px;
}

.form-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 8px;
    vertical-align: middle;
}

/* Transfer Modal Styles */
.transfer-info {
    text-align: center;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 12px;
    margin-bottom: 16px;
}

.transfer-amount {
    font-size: 24px;
    font-weight: 700;
    color: #d32f2f;
    margin-bottom: 4px;
}

.transfer-desc {
    font-size: 14px;
    color: #666;
}

.transfer-label {
    font-size: 14px;
    color: #555;
    margin-bottom: 12px;
}

.budget-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
}

.budget-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
}

.budget-option:hover {
    border-color: currentColor;
    transform: translateX(4px);
}

.budget-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.budget-name {
    flex: 1;
    font-weight: 600;
    color: #333;
}

.budget-value {
    font-size: 12px;
    color: #888;
}

/* Delete Modal Styles */
.delete-warning {
    text-align: center;
    font-size: 16px;
    color: #333;
    margin-bottom: 16px;
}

.delete-preview {
    background: #f9f9f9;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;
}

.preview-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.preview-row:last-child {
    margin-bottom: 0;
}

.preview-label {
    color: #888;
    font-size: 13px;
}

.preview-value {
    color: #333;
    font-size: 13px;
    font-weight: 500;
}

.preview-value.amount {
    color: #d32f2f;
    font-weight: 700;
}

.delete-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: #fff3e0;
    border-radius: 8px;
    padding: 12px;
    font-size: 13px;
    color: #e65100;
}

.note-icon {
    font-size: 16px;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.submodal-enter-active,
.submodal-leave-active {
    transition: opacity 0.2s ease;
}

.submodal-enter-from,
.submodal-leave-to {
    opacity: 0;
}

.submodal-enter-from .submodal-content,
.submodal-leave-to .submodal-content {
    transform: translateY(20px) scale(0.95);
}

/* Dark mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header {
    border-bottom-color: #3a3a4e;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .close-button {
    color: #aaa;
}

body.dark-mode .close-button:hover {
    background: #2a2a3e;
    color: #fff;
}

body.dark-mode .transaction-card {
    background: #2a2a3e;
    border-color: #3a3a4e;
}

body.dark-mode .transaction-description {
    color: #fff;
}

body.dark-mode .transaction-date {
    color: #aaa;
}

body.dark-mode .transaction-amount {
    color: #ff6b6b;
}

body.dark-mode .empty-state {
    color: #aaa;
}

body.dark-mode .submodal-content {
    background: #1e1e2e;
}

body.dark-mode .submodal-header h3 {
    color: #fff;
}

body.dark-mode .submodal-body label {
    color: #aaa;
}

body.dark-mode .submodal-body input,
body.dark-mode .submodal-body select {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .btn-cancel {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .btn-cancel:hover {
    background: #3a3a4e;
}

body.dark-mode .btn-delete {
    background: #3a2a2a;
    color: #ff7070;
}

body.dark-mode .btn-delete:hover {
    background: #4a2a2a;
}

body.dark-mode .loading {
    color: #aaa;
}

body.dark-mode .merchant-name {
    color: #fff;
}

body.dark-mode .detail-label {
    color: #aaa;
}

body.dark-mode .detail-value {
    color: #fff;
}

body.dark-mode .action-btn {
    color: #ccc;
}

body.dark-mode .transfer-desc {
    color: #aaa;
}

body.dark-mode .transfer-label {
    color: #ccc;
}

body.dark-mode .budget-name {
    color: #fff;
}

body.dark-mode .budget-value {
    color: #ccc;
}

body.dark-mode .delete-warning {
    color: #fff;
}

body.dark-mode .preview-label {
    color: #ccc;
}
</style>
