<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('close')">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <div class="delete-icon">🗑️</div>
                        <h2>Excluir Budget</h2>
                    </div>

                    <div class="modal-body">
                        <p class="warning-text">
                            Tem certeza que deseja excluir <strong>{{ budgetName }}</strong>?
                        </p>

                        <div class="budget-summary">
                            <div class="summary-item">
                                <div class="summary-value">R$ {{ budgetTotal.toFixed(2) }}</div>
                                <div class="summary-label">Orçamento</div>
                            </div>
                            <div class="summary-divider"></div>
                            <div class="summary-item">
                                <div class="summary-value spent">R$ {{ budgetSpent.toFixed(2) }}</div>
                                <div class="summary-label">Gasto</div>
                            </div>
                            <div class="summary-divider"></div>
                            <div class="summary-item">
                                <div class="summary-value transactions">{{ transactionCount }}</div>
                                <div class="summary-label">Lançamentos</div>
                            </div>
                        </div>

                        <div class="danger-box">
                            <span class="danger-icon">⚠️</span>
                            <span class="danger-text">Esta ação não pode ser desfeita. Todos os lançamentos serão
                                excluídos permanentemente.</span>
                        </div>

                        <div class="button-group">
                            <button class="btn btn-cancel" @click="$emit('close')">
                                Cancelar
                            </button>
                            <button class="btn btn-delete" @click="$emit('confirm')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path
                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                    </path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                                Excluir Budget
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
defineProps<{
    show: boolean
    budgetName: string
    budgetTotal: number
    budgetSpent: number
    transactionCount: number
}>()

defineEmits<{
    close: []
    confirm: []
}>()
</script>

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
    max-width: 380px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal-header {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    padding: 28px 24px;
    text-align: center;
    color: white;
}

.delete-icon {
    font-size: 40px;
    margin-bottom: 12px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.modal-header h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.modal-body {
    padding: 24px;
}

.warning-text {
    font-size: 16px;
    color: #333;
    margin: 0 0 20px 0;
    line-height: 1.5;
    text-align: center;
}

.warning-text strong {
    color: #cc0000;
    font-weight: 600;
}

.budget-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
}

.summary-item {
    flex: 1;
    text-align: center;
}

.summary-value {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
}

.summary-value.spent {
    color: #e53935;
}

.summary-value.transactions {
    color: #1976d2;
}

.summary-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-divider {
    width: 1px;
    height: 36px;
    background: #ddd;
    margin: 0 8px;
}

.danger-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #fff3f3;
    border: 1px solid #ffcdd2;
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 24px;
}

.danger-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.danger-text {
    font-size: 13px;
    color: #c62828;
    line-height: 1.4;
}

.button-group {
    display: flex;
    gap: 12px;
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

.btn-cancel {
    background: #f0f0f0;
    color: #666;
}

.btn-cancel:hover {
    background: #e0e0e0;
}

.btn-cancel:active {
    transform: scale(0.98);
}

.btn-delete {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(204, 0, 0, 0.3);
}

.btn-delete:hover {
    box-shadow: 0 6px 16px rgba(204, 0, 0, 0.4);
    transform: translateY(-1px);
}

.btn-delete:active {
    transform: translateY(0) scale(0.98);
}

/* Transições do modal */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
}
</style>
