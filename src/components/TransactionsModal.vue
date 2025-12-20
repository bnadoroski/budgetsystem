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
                            Carregando lançamentos...
                        </div>

                        <div v-else-if="transactions.length === 0" class="empty-state">
                            <p>📋</p>
                            <p>Nenhum lançamento encontrado</p>
                        </div>

                        <div v-else class="transactions-list">
                            <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item">
                                <div class="transaction-header">
                                    <div class="transaction-info">
                                        <div class="merchant-name">
                                            {{ transaction.merchantName || 'Sem comércio' }}
                                        </div>
                                        <div class="transaction-date">
                                            {{ formatDate(transaction.createdAt) }}
                                        </div>
                                    </div>
                                    <div class="transaction-amount">
                                        R$ {{ transaction.amount.toFixed(2) }}
                                    </div>
                                </div>

                                <div class="transaction-details">
                                    <div class="detail-row">
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
                                    <button class="action-btn edit-btn" @click="editTransaction(transaction)" title="Editar">
                                        ✏️
                                    </button>
                                    <button class="action-btn transfer-btn" @click="startTransfer(transaction)" title="Transferir para outro budget">
                                        🔄
                                    </button>
                                    <button class="action-btn delete-btn" @click="deleteTransaction(transaction.id)" title="Excluir">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Transfer Modal -->
                    <div v-if="showTransferModal" class="transfer-modal-overlay" @click="showTransferModal = false">
                        <div class="transfer-modal-content" @click.stop>
                            <h3>Transferir para qual budget?</h3>
                            <div class="budget-list">
                                <button
                                    v-for="budget in availableBudgets"
                                    :key="budget.id"
                                    class="budget-option"
                                    @click="confirmTransfer(budget.id)">
                                    {{ budget.name }}
                                </button>
                            </div>
                            <button class="cancel-transfer" @click="showTransferModal = false">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import type { Transaction } from '@/types/budget'

const props = defineProps<{
    show: boolean
    budgetId: string
    budgetName: string
}>()

const emit = defineEmits<{
    close: []
}>()

const budgetStore = useBudgetStore()
const transactions = ref<Transaction[]>([])
const loading = ref(false)
const showTransferModal = ref(false)
const transferringTransaction = ref<Transaction | null>(null)

const availableBudgets = computed(() => {
    return budgetStore.budgets.filter(b => b.id !== props.budgetId)
})

watch(() => props.show, async (newVal) => {
    if (newVal) {
        await loadTransactions()
    }
})

const loadTransactions = async () => {
    loading.value = true
    try {
        transactions.value = await budgetStore.loadTransactions(props.budgetId)
    } catch (error) {
        console.error('Erro ao carregar transações:', error)
    } finally {
        loading.value = false
    }
}

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

const editTransaction = (transaction: Transaction) => {
    // TODO: Implementar edição de transação
    console.log('Edit transaction:', transaction)
    alert('Funcionalidade de edição em desenvolvimento')
}

const startTransfer = (transaction: Transaction) => {
    transferringTransaction.value = transaction
    showTransferModal.value = true
}

const confirmTransfer = async (newBudgetId: string) => {
    if (!transferringTransaction.value) return

    try {
        await budgetStore.transferTransaction(transferringTransaction.value.id, newBudgetId)
        showTransferModal.value = false
        transferringTransaction.value = null
        await loadTransactions()
    } catch (error) {
        console.error('Erro ao transferir transação:', error)
        alert('Erro ao transferir transação')
    }
}

const deleteTransaction = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return

    try {
        await budgetStore.deleteTransaction(transactionId)
        await loadTransactions()
    } catch (error) {
        console.error('Erro ao excluir transação:', error)
        alert('Erro ao excluir transação')
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
    max-height: 80vh;
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

.loading,
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #999;
}

.empty-state p:first-child {
    font-size: 48px;
    margin-bottom: 8px;
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
    justify-content: flex-end;
}

.action-btn {
    background: white;
    border: 1px solid #ddd;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
}

.action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.edit-btn:hover {
    background: #e3f2fd;
    border-color: #2196F3;
}

.transfer-btn:hover {
    background: #fff3e0;
    border-color: #ff9800;
}

.delete-btn:hover {
    background: #ffebee;
    border-color: #f44336;
}

/* Transfer Modal */
.transfer-modal-overlay {
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
}

.transfer-modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
}

.transfer-modal-content h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #333;
    text-align: center;
}

.budget-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
}

.budget-option {
    padding: 12px 16px;
    background: #f5f5f5;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s;
    text-align: left;
}

.budget-option:hover {
    background: #e3f2fd;
    border-color: #2196F3;
}

.cancel-transfer {
    width: 100%;
    padding: 12px;
    background: #f5f5f5;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #666;
}

.cancel-transfer:hover {
    background: #e0e0e0;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
