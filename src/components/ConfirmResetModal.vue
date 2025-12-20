<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('close')">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <h2>Confirmar Reset</h2>
                    </div>

                    <div class="modal-body">
                        <div class="warning-icon">⚠️</div>
                        
                        <p class="warning-text">
                            Tem certeza que deseja resetar o budget <strong>{{ budgetName }}</strong>?
                        </p>

                        <div class="budget-info">
                            <div class="info-row">
                                <span class="label">Valor Total:</span>
                                <span class="value">R$ {{ budgetTotal.toFixed(2) }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Valor Gasto:</span>
                                <span class="value spent">R$ {{ budgetSpent.toFixed(2) }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Será resetado para:</span>
                                <span class="value reset">R$ 0,00</span>
                            </div>
                        </div>

                        <p class="info-text">
                            O histórico será salvo e você poderá consultá-lo depois.
                        </p>

                        <div class="button-group">
                            <button class="btn btn-cancel" @click="$emit('close')">
                                Cancelar
                            </button>
                            <button class="btn btn-confirm" @click="$emit('confirm')">
                                Confirmar Reset
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
    max-width: 400px;
    width: 100%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    padding: 24px 24px 16px;
    text-align: center;
    border-bottom: 1px solid #eee;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.modal-body {
    padding: 24px;
    text-align: center;
}

.warning-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.warning-text {
    font-size: 16px;
    color: #333;
    margin: 0 0 20px 0;
    line-height: 1.5;
}

.warning-text strong {
    color: #d32f2f;
}

.budget-info {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    text-align: left;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.info-row:last-child {
    margin-bottom: 0;
    padding-top: 8px;
    border-top: 1px solid #ddd;
    font-weight: 600;
}

.label {
    color: #666;
    font-size: 14px;
}

.value {
    color: #333;
    font-size: 14px;
    font-weight: 500;
}

.value.spent {
    color: #d32f2f;
}

.value.reset {
    color: #4CAF50;
}

.info-text {
    font-size: 13px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.4;
}

.button-group {
    display: flex;
    gap: 12px;
}

.btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel {
    background: #f5f5f5;
    color: #666;
}

.btn-cancel:hover {
    background: #e0e0e0;
}

.btn-confirm {
    background: #d32f2f;
    color: white;
}

.btn-confirm:hover {
    background: #b71c1c;
}

.btn:active {
    transform: scale(0.98);
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
