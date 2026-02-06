<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="base-modal-overlay" :class="overlayClass" @click="handleOverlayClick">
                <div class="base-modal-content" :class="[sizeClass, contentClass]" @click.stop>
                    <!-- Header -->
                    <div v-if="showHeader" class="base-modal-header" :class="headerClass">
                        <slot name="header">
                            <h2 v-if="title">{{ title }}</h2>
                        </slot>
                        <button v-if="closable" class="base-modal-close" @click="emit('close')" aria-label="Fechar">
                            ✕
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="base-modal-body" :class="bodyClass">
                        <slot />
                    </div>

                    <!-- Footer -->
                    <div v-if="$slots.footer" class="base-modal-footer" :class="footerClass">
                        <slot name="footer" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface BaseModalProps {
    /**
     * Controla visibilidade do modal
     */
    show: boolean

    /**
     * Título do modal (opcional se usar slot header)
     */
    title?: string

    /**
     * Tamanho do modal
     * @default 'medium'
     */
    size?: 'small' | 'medium' | 'large' | 'fullscreen'

    /**
     * Se pode ser fechado pelo usuário
     * @default true
     */
    closable?: boolean

    /**
     * Se fecha ao clicar no overlay
     * @default true
     */
    closeOnOverlay?: boolean

    /**
     * Se mostra o header (título + botão fechar)
     * @default true
     */
    showHeader?: boolean

    /**
     * Z-index customizado
     */
    zIndex?: number

    /**
     * Classes CSS adicionais
     */
    overlayClass?: string
    contentClass?: string
    headerClass?: string
    bodyClass?: string
    footerClass?: string
}

const props = withDefaults(defineProps<BaseModalProps>(), {
    size: 'medium',
    closable: true,
    closeOnOverlay: true,
    showHeader: true
})

const emit = defineEmits<{
    close: []
}>()

const sizeClass = computed(() => `base-modal--${props.size}`)

const handleOverlayClick = () => {
    if (props.closeOnOverlay && props.closable) {
        emit('close')
    }
}
</script>

<style scoped>
.base-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: v-bind('zIndex || 1000');
    padding: 20px;
    box-sizing: border-box;
}

.base-modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
}

/* Tamanhos */
.base-modal--small {
    max-width: 320px;
}

.base-modal--medium {
    max-width: 420px;
}

.base-modal--large {
    max-width: 600px;
}

.base-modal--fullscreen {
    max-width: none;
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
}

/* Header */
.base-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
}

.base-modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a2e;
}

.base-modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
    line-height: 1;
}

.base-modal-close:hover {
    background: #f0f0f0;
    color: #333;
}

/* Body */
.base-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

/* Footer */
.base-modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #eee;
    flex-shrink: 0;
}

/* Animações */
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

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-active .base-modal-content,
.modal-leave-active .base-modal-content {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .base-modal-content,
.modal-leave-to .base-modal-content {
    transform: translateY(20px);
    opacity: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .base-modal-content {
        background: #1a1a2e;
        color: #fff;
    }

    .base-modal-header {
        border-bottom-color: #333;
    }

    .base-modal-header h2 {
        color: #fff;
    }

    .base-modal-close {
        color: #aaa;
    }

    .base-modal-close:hover {
        background: #333;
        color: #fff;
    }

    .base-modal-footer {
        border-top-color: #333;
    }
}
</style>
