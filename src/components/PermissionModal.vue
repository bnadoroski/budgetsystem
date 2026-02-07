<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="handleCancel">
                <div class="modal-content" @click.stop>
                    <div class="icon-container">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">
                            <g fill="none">
                                <path fill="url(#SVGjugm2bKq)"
                                    d="M26.394 12.39a5 5 0 1 0-6.785-6.785a11.03 11.03 0 0 1 6.785 6.786" />
                                <path fill="url(#SVGE4gBAcai)"
                                    d="M26.394 12.39a5 5 0 1 0-6.785-6.785a11.03 11.03 0 0 1 6.785 6.786" />
                                <path fill="url(#SVGjp3ajd0O)"
                                    d="M12.39 5.606a11.03 11.03 0 0 0-6.784 6.785a5 5 0 1 1 6.785-6.785" />
                                <path fill="url(#SVG0H4igb9F)"
                                    d="M12.39 5.606a11.03 11.03 0 0 0-6.784 6.785a5 5 0 1 1 6.785-6.785" />
                                <path fill="url(#SVGjsFRTkNg)"
                                    d="m5.707 27.707l3-3l-1.414-1.414l-3 3a1 1 0 0 0 1.414 1.414" />
                                <path fill="url(#SVGjsFRTkNg)"
                                    d="m27.707 26.293l-3-3l-1.414 1.414l3 3a1 1 0 1 0 1.414-1.414" />
                                <path fill="url(#SVGxNFSRyGS)"
                                    d="M28 16c0 6.627-5.373 12-12 12S4 22.627 4 16S9.373 4 16 4s12 5.373 12 12" />
                                <path fill="url(#SVGtuctPdhH)"
                                    d="M26 16c0 5.523-4.477 10-10 10S6 21.523 6 16S10.477 6 16 6s10 4.477 10 10" />
                                <path fill="url(#SVGxkhECe8k)" fill-rule="evenodd"
                                    d="M15 9a1 1 0 0 1 1 1v6h4a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1"
                                    clip-rule="evenodd" />
                                <defs>
                                    <linearGradient id="SVGjugm2bKq" x1="30.106" x2="20.77" y1="12.826" y2="5.188"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#ff6f47" />
                                        <stop offset="1" stop-color="#ffcd0f" />
                                    </linearGradient>
                                    <linearGradient id="SVGjp3ajd0O" x1="13.844" x2="4.507" y1="13.826" y2="6.188"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#ff6f47" />
                                        <stop offset="1" stop-color="#ffcd0f" />
                                    </linearGradient>
                                    <linearGradient id="SVGjsFRTkNg" x1="5" x2="5.946" y1="21.272" y2="29.551"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#cad2d9" />
                                        <stop offset="1" stop-color="#70777d" />
                                    </linearGradient>
                                    <linearGradient id="SVGxNFSRyGS" x1="8" x2="20" y1="2.667" y2="29.333"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#1ec8b0" />
                                        <stop offset="1" stop-color="#2764e7" />
                                    </linearGradient>
                                    <linearGradient id="SVGtuctPdhH" x1="9.043" x2="22.087" y1="3.826" y2="31.652"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#fdfdfd" />
                                        <stop offset="1" stop-color="#dedeff" />
                                    </linearGradient>
                                    <linearGradient id="SVGxkhECe8k" x1="16.8" x2="20.573" y1="10.845" y2="17.132"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#1ec8b0" />
                                        <stop offset="1" stop-color="#2764e7" />
                                    </linearGradient>
                                    <radialGradient id="SVGE4gBAcai" cx="0" cy="0" r="1"
                                        gradientTransform="rotate(-45 27.718 -12.973)scale(14.7078)"
                                        gradientUnits="userSpaceOnUse">
                                        <stop offset=".644" stop-color="#ff6f47" />
                                        <stop offset=".942" stop-color="#ff6f47" stop-opacity="0" />
                                    </radialGradient>
                                    <radialGradient id="SVG0H4igb9F" cx="0" cy="0" r="1"
                                        gradientTransform="rotate(225 11.88 4.92)scale(14.7078)"
                                        gradientUnits="userSpaceOnUse">
                                        <stop offset=".659" stop-color="#ff6f47" />
                                        <stop offset=".949" stop-color="#ff6f47" stop-opacity="0" />
                                    </radialGradient>
                                </defs>
                            </g>
                        </svg>
                    </div>
                    <h2>Permissão de Notificação</h2>
                    <p class="description">
                        Para detectar gastos automaticamente, o app precisa acessar suas notificações bancárias.
                    </p>
                    <p class="sub-description">
                        Você receberá uma notificação sempre que houver uma transação em seu banco.
                    </p>
                    <div class="actions">
                        <button class="btn-cancel" @click="handleCancel">Agora não</button>
                        <button class="btn-allow" @click="handleAllow">Permitir</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
    allow: []
    cancel: []
}>()

const handleAllow = () => {
    emit('allow')
}

const handleCancel = () => {
    emit('cancel')
}
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
    padding: 32px 24px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    text-align: center;
}

.icon-container {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
}

h2 {
    font-size: 22px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
}

.description {
    font-size: 16px;
    color: #666;
    line-height: 1.5;
    margin: 0 0 12px 0;
}

.sub-description {
    font-size: 14px;
    color: #999;
    line-height: 1.4;
    margin: 0 0 24px 0;
}

.actions {
    display: flex;
    gap: 12px;
}

.btn-cancel,
.btn-allow {
    flex: 1;
    padding: 14px 24px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
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

.btn-allow {
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
}

.btn-allow:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
}

.btn-allow:active {
    transform: scale(0.98);
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9) translateY(20px);
}

/* Dark Mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode h2 {
    color: #fff;
}

body.dark-mode .description {
    color: #aaa;
}

body.dark-mode .sub-description {
    color: #888;
}

body.dark-mode .btn-cancel {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .btn-cancel:hover {
    background: #3a3a4e;
}
</style>
