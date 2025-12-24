<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <div class="icon-wrapper" :class="type">
                            <span class="icon">{{ iconEmoji }}</span>
                        </div>
                        <h2>{{ title }}</h2>
                    </div>

                    <div class="modal-body">
                        <p class="message" v-html="message"></p>

                        <div v-if="$slots.details" class="details-slot">
                            <slot name="details"></slot>
                        </div>
                    </div>

                    <div class="button-group">
                        <button class="btn btn-cancel" @click="$emit('cancel')">
                            {{ cancelText }}
                        </button>
                        <button class="btn btn-confirm" :class="type" @click="$emit('confirm')">
                            <span v-if="confirmIcon" class="btn-icon">{{ confirmIcon }}</span>
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
    show: boolean
    title: string
    message: string
    type?: 'danger' | 'warning' | 'info' | 'success'
    confirmText?: string
    cancelText?: string
    confirmIcon?: string
}>(), {
    type: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
})

defineEmits<{
    confirm: []
    cancel: []
}>()

const iconEmoji = computed(() => {
    switch (props.type) {
        case 'danger': return '🗑️'
        case 'warning': return '⚠️'
        case 'success': return '✅'
        case 'info': return 'ℹ️'
        default: return '❓'
    }
})
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
    z-index: 3000;
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
    text-align: center;
    padding: 32px 24px 16px;
}

.icon-wrapper {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

.icon-wrapper.danger {
    background: linear-gradient(135deg, #FFEBEE, #FFCDD2);
}

.icon-wrapper.warning {
    background: linear-gradient(135deg, #FFF8E1, #FFE082);
}

.icon-wrapper.success {
    background: linear-gradient(135deg, #E8F5E9, #A5D6A7);
}

.icon-wrapper.info {
    background: linear-gradient(135deg, #E3F2FD, #90CAF9);
}

.icon {
    font-size: 36px;
}

h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #1a1a2e;
}

.modal-body {
    padding: 0 24px 24px;
    text-align: center;
}

.message {
    color: #555;
    font-size: 15px;
    line-height: 1.6;
    margin: 0;
}

.message strong {
    color: #1a1a2e;
}

.details-slot {
    margin-top: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 12px;
}

.button-group {
    display: flex;
    gap: 12px;
    padding: 0 24px 24px;
}

.btn {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn-icon {
    font-size: 16px;
}

.btn-cancel {
    background: #f5f5f5;
    border: none;
    color: #666;
}

.btn-cancel:hover {
    background: #e8e8e8;
}

.btn-cancel:active {
    transform: scale(0.98);
}

.btn-confirm {
    border: none;
    color: white;
}

.btn-confirm.danger {
    background: linear-gradient(135deg, #F44336, #D32F2F);
}

.btn-confirm.danger:hover {
    background: linear-gradient(135deg, #E53935, #C62828);
}

.btn-confirm.warning {
    background: linear-gradient(135deg, #FF9800, #F57C00);
}

.btn-confirm.warning:hover {
    background: linear-gradient(135deg, #FB8C00, #EF6C00);
}

.btn-confirm.success {
    background: linear-gradient(135deg, #4CAF50, #388E3C);
}

.btn-confirm.success:hover {
    background: linear-gradient(135deg, #43A047, #2E7D32);
}

.btn-confirm.info {
    background: linear-gradient(135deg, #2196F3, #1976D2);
}

.btn-confirm.info:hover {
    background: linear-gradient(135deg, #1E88E5, #1565C0);
}

.btn-confirm:active {
    transform: scale(0.98);
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: translateY(30px) scale(0.95);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    .modal-content {
        background: #1e1e2e;
    }

    h2 {
        color: #fff;
    }

    .message {
        color: #aaa;
    }

    .message strong {
        color: #fff;
    }

    .details-slot {
        background: #2a2a3e;
    }

    .btn-cancel {
        background: #2a2a3e;
        color: #aaa;
    }

    .btn-cancel:hover {
        background: #353550;
    }
}
</style>
