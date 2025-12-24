<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>{{ isAccepted ? 'Convite Aceito! 🎉' : 'Convite Recusado' }}</h2>
                    </div>

                    <div class="modal-body">
                        <div class="response-icon" :class="{ accepted: isAccepted, rejected: !isAccepted }">
                            <svg v-if="isAccepted" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>

                        <p class="response-text" v-if="isAccepted">
                            <strong>{{ email }}</strong> aceitou seu convite de compartilhamento!
                        </p>
                        <p class="response-text" v-else>
                            <strong>{{ email }}</strong> recusou seu convite de compartilhamento.
                        </p>

                        <p class="response-description" v-if="isAccepted">
                            Agora vocês podem acompanhar e gerenciar os budgets em conjunto. 
                            Os gastos de ambos serão somados automaticamente.
                        </p>
                        <p class="response-description" v-else>
                            Você pode enviar um novo convite a qualquer momento ou convidar outra pessoa.
                        </p>

                        <button class="btn-understood" @click="$emit('close')">
                            {{ isAccepted ? 'Começar!' : 'Entendi' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
defineProps<{
    show: boolean
    isAccepted: boolean
    email: string
}>()

defineEmits<{
    close: []
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
    border-radius: 20px;
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
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.modal-body {
    padding: 0 24px 24px;
    text-align: center;
}

.response-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.response-icon.accepted {
    color: #4CAF50;
}

.response-icon.rejected {
    color: #e53935;
}

.response-text {
    font-size: 16px;
    color: #333;
    margin: 0 0 12px 0;
    line-height: 1.5;
}

.response-description {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
}

.btn-understood {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
    transition: all 0.2s;
}

.btn-understood:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
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

/* Dark mode - usando body.dark-mode como padrão do app */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .response-text {
    color: #e0e0e0;
}

body.dark-mode .response-text strong {
    color: #fff;
}

body.dark-mode .response-description {
    color: #aaa;
}
</style>
