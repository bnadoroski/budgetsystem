<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Compartilhar Budgets</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <div class="modal-body">
                        <p class="description">
                            Compartilhe seus budgets com seu cônjuge ou parceiro(a) para que ambos possam acompanhar os
                            gastos em tempo real.
                        </p>

                        <div class="share-section">
                            <h3>Compartilhar com</h3>
                            <div class="input-group">
                                <input v-model="targetEmail" type="email" placeholder="email@exemplo.com"
                                    @keyup.enter="handleShare" />
                                <button class="share-button" @click="handleShare" :disabled="!targetEmail || isSharing">
                                    {{ isSharing ? 'Compartilhando...' : 'Compartilhar' }}
                                </button>
                            </div>

                            <Transition name="fade">
                                <div v-if="shareSuccess" class="success-message">
                                    ✓ Budget compartilhado com sucesso!
                                </div>
                            </Transition>

                            <Transition name="fade">
                                <div v-if="shareError" class="error-message">
                                    ⚠️ {{ shareError }}
                                </div>
                            </Transition>
                        </div>

                        <div class="budgets-list">
                            <h3>Selecione os budgets para compartilhar</h3>
                            <div v-for="budget in availableBudgets" :key="budget.id" class="budget-item"
                                :class="{ selected: selectedBudgets.includes(budget.id) }"
                                @click="toggleBudgetSelection(budget.id)">
                                <div class="budget-info">
                                    <div class="budget-color" :style="{ backgroundColor: budget.color }"></div>
                                    <span class="budget-name">{{ budget.name }}</span>
                                </div>
                                <div class="budget-check">
                                    <svg v-if="selectedBudgets.includes(budget.id)" width="20" height="20"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            </div>

                            <div v-if="availableBudgets.length === 0" class="no-budgets">
                                <p>Nenhum budget disponível para compartilhar</p>
                            </div>
                        </div>

                        <div v-if="sharedBudgets.length > 0" class="shared-section">
                            <h3>Budgets já compartilhados</h3>
                            <div v-for="budget in sharedBudgets" :key="budget.id" class="shared-item">
                                <div class="budget-info">
                                    <div class="budget-color" :style="{ backgroundColor: budget.color }"></div>
                                    <span class="budget-name">{{ budget.name }}</span>
                                    <span class="shared-badge">Compartilhado</span>
                                </div>
                                <button class="unshare-button" @click="handleUnshare(budget.id)">
                                    Remover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const budgetStore = useBudgetStore()
const targetEmail = ref('')
const selectedBudgets = ref<string[]>([])
const isSharing = ref(false)
const shareSuccess = ref(false)
const shareError = ref('')

const availableBudgets = computed(() => {
    return budgetStore.budgets.filter(b => !b.sharedWith || b.sharedWith.length === 0)
})

const sharedBudgets = computed(() => {
    return budgetStore.budgets.filter(b => b.sharedWith && b.sharedWith.length > 0)
})

const toggleBudgetSelection = (budgetId: string) => {
    const index = selectedBudgets.value.indexOf(budgetId)
    if (index >= 0) {
        selectedBudgets.value.splice(index, 1)
    } else {
        selectedBudgets.value.push(budgetId)
    }
}

const handleShare = async () => {
    if (!targetEmail.value || selectedBudgets.value.length === 0) {
        shareError.value = 'Selecione pelo menos um budget e insira um email'
        setTimeout(() => shareError.value = '', 3000)
        return
    }

    isSharing.value = true
    shareError.value = ''

    try {
        for (const budgetId of selectedBudgets.value) {
            await budgetStore.shareBudgetWithUser(budgetId, targetEmail.value)
        }

        shareSuccess.value = true
        selectedBudgets.value = []
        targetEmail.value = ''

        setTimeout(() => {
            shareSuccess.value = false
        }, 3000)
    } catch (error: any) {
        shareError.value = error.message || 'Erro ao compartilhar budget'
        setTimeout(() => shareError.value = '', 3000)
    } finally {
        isSharing.value = false
    }
}

const handleUnshare = async (budgetId: string) => {
    if (confirm('Deseja remover o compartilhamento deste budget?')) {
        try {
            const budget = budgetStore.budgets.find(b => b.id === budgetId)
            if (budget && budget.sharedWith && budget.sharedWith.length > 0) {
                for (const userId of budget.sharedWith) {
                    await budgetStore.unshareBudget(budgetId, userId)
                }
            }
        } catch (error) {
            console.error('Erro ao remover compartilhamento:', error)
        }
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
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    box-sizing: border-box;
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
}

.modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 32px;
    color: #999;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
}

.close-button:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
    overflow-x: hidden;
    box-sizing: border-box;
}

.description {
    font-size: 14px;
    color: #666;
    line-height: 1.6;
    margin-bottom: 24px;
}

.share-section {
    margin-bottom: 30px;
}

.share-section h3,
.budgets-list h3,
.shared-section h3 {
    font-size: 16px;
    color: #333;
    margin: 0 0 12px 0;
}

.input-group {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.input-group input {
    flex: 1;
    padding: 12px;
    font-size: 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: border-color 0.3s;
}

.input-group input:focus {
    outline: none;
    border-color: #4a90e2;
}

.share-button {
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
    white-space: nowrap;
}

.share-button:hover:not(:disabled) {
    transform: scale(1.02);
}

.share-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.success-message {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
}

.error-message {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
}

.budgets-list,
.shared-section {
    margin-top: 24px;
}

.budget-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.budget-item:hover {
    border-color: #667eea;
    background: #f5f7ff;
}

.budget-item.selected {
    border-color: #667eea;
    background: #e8ecff;
}

.budget-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.budget-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    flex-shrink: 0;
}

.budget-name {
    font-size: 14px;
    color: #333;
    font-weight: 500;
}

.budget-check {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #667eea;
}

.shared-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: #f5f5f5;
    border-radius: 8px;
}

.shared-badge {
    font-size: 12px;
    color: #667eea;
    background: #e8ecff;
    padding: 4px 8px;
    border-radius: 4px;
    margin-left: 8px;
}

.unshare-button {
    padding: 6px 12px;
    background: #e0e0e0;
    color: #666;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.unshare-button:hover {
    background: #ffebee;
    color: #e53e3e;
}

.no-budgets {
    text-align: center;
    padding: 30px;
    color: #999;
    font-size: 14px;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}
</style>
