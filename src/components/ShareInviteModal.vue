<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show && invite" class="modal-overlay" @click.self="$emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Convite de Compartilhamento</h2>
                    </div>

                    <div class="modal-body">
                        <div class="invite-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">
                                <g fill="none">
                                    <path fill="url(#gradient1)" fill-rule="evenodd"
                                        d="M15 15H9.5A2.5 2.5 0 0 0 7 17.5V22h2v-4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V22h2v-4.5a2.5 2.5 0 0 0-2.5-2.5H17v-5h-2z"
                                        clip-rule="evenodd" />
                                    <circle cx="24" cy="25" r="5" fill="url(#gradient2)" />
                                    <circle cx="8" cy="25" r="5" fill="url(#gradient3)" />
                                    <circle cx="16" cy="7" r="5" fill="url(#gradient4)" />
                                    <defs>
                                        <linearGradient id="gradient1" x1="7" x2="25" y1="10" y2="22">
                                            <stop stop-color="#b9c0c7" />
                                            <stop offset="1" stop-color="#70777d" />
                                        </linearGradient>
                                        <linearGradient id="gradient2" x1="19" x2="29" y1="20" y2="30">
                                            <stop stop-color="#7b7bff" />
                                            <stop offset="1" stop-color="#4a43cb" />
                                        </linearGradient>
                                        <linearGradient id="gradient3" x1="3" x2="13" y1="20" y2="30">
                                            <stop stop-color="#1ec8b0" />
                                            <stop offset="1" stop-color="#1a7f7c" />
                                        </linearGradient>
                                        <linearGradient id="gradient4" x1="11" x2="21" y1="2" y2="12">
                                            <stop stop-color="#0fafff" />
                                            <stop offset="1" stop-color="#0067bf" />
                                        </linearGradient>
                                    </defs>
                                </g>
                            </svg>
                        </div>

                        <p class="invite-text">
                            <strong>{{ invite.fromUserEmail }}</strong> quer compartilhar
                            <strong>{{ invite.budgetIds.length }}</strong> budget{{ invite.budgetIds.length > 1 ? 's' :
                                '' }} com você.
                        </p>

                        <p class="invite-description">
                            Ao aceitar, vocês poderão acompanhar e gerenciar esses budgets em conjunto.
                        </p>

                        <div class="button-group">
                            <button class="btn btn-accept" @click="$emit('accept', invite.id)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Aceitar
                            </button>
                            <button class="btn btn-reject" @click="$emit('reject', invite.id)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Recusar
                            </button>
                            <button class="btn btn-later" @click="$emit('close')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Agora Não
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import type { ShareInvite } from '@/types/budget'

defineProps<{
    show: boolean
    invite: ShareInvite | null
}>()

defineEmits<{
    close: []
    accept: [inviteId: string]
    reject: [inviteId: string]
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

.invite-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.invite-text {
    font-size: 16px;
    color: #333;
    margin: 0 0 12px 0;
    line-height: 1.5;
}

.invite-description {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
}

.button-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
}

.btn {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.btn-accept {
    background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
    color: white;
}

.btn-accept:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-reject {
    background: #ffebee;
    color: #e53935;
    border: 2px solid #ffcdd2;
}

.btn-reject:hover {
    background: #ffcdd2;
    border-color: #e53935;
}

.btn-later {
    background: transparent;
    color: #757575;
    font-size: 14px;
    padding: 10px;
}

.btn-later:hover {
    color: #424242;
    background: #f5f5f5;
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
