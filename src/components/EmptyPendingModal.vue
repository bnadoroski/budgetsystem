<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('close')">
                <div class="modal-content" @click.stop>
                    <div class="icon-container">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 32 32">
                            <g fill="none">
                                <path fill="url(#f2051ida)"
                                    d="M16.003 5.5C9.65 5.5 4.5 10.649 4.5 17c0 1.088.154 2.14.436 3.14l3.462-1.92c-.125-.396-.218-.81-.218-1.249c0-4.709 3.82-8.529 8.53-8.529c1.64 0 3.166.475 4.462 1.28l2.155-3.096A11.4 11.4 0 0 0 16.003 5.5" />
                                <path fill="url(#f2051idb)"
                                    d="M27.5 17.001c0-1.007-.13-1.984-.372-2.915l-3.459 1.976c.07.303.111.617.111.94c0 4.71-3.82 8.53-8.53 8.53a8.5 8.5 0 0 1-3.933-.963l-2.186 3.14c1.82.897 3.874 1.404 6.052 1.404c6.352 0 11.502-5.149 11.502-11.501z" />
                                <path fill="url(#f2051idc)" d="M16 22a5 5 0 1 0 0-10a5 5 0 0 0 0 10" />
                                <path fill="url(#f2051idd)"
                                    d="M4.858 4.858a2 2 0 0 1 2.828 0l19.456 19.456a2 2 0 1 1-2.828 2.828L4.858 7.686a2 2 0 0 1 0-2.828" />
                                <defs>
                                    <linearGradient id="f2051ida" x1="4.5" x2="15.396" y1="8.933" y2="22.506"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#37c2e8" />
                                        <stop offset="1" stop-color="#2764e7" />
                                    </linearGradient>
                                    <linearGradient id="f2051idb" x1="20.841" x2="17.25" y1="12.438" y2="29.113"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#37c2e8" />
                                        <stop offset="1" stop-color="#2764e7" />
                                    </linearGradient>
                                    <linearGradient id="f2051idc" x1="12.833" x2="19.667" y1="13.167" y2="21.833"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#e3f2ff" />
                                        <stop offset="1" stop-color="#c7e5ff" />
                                    </linearGradient>
                                    <linearGradient id="f2051idd" x1="7.143" x2="20.571" y1="6.952" y2="25.238"
                                        gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#ff6f47" />
                                        <stop offset="1" stop-color="#e84351" />
                                    </linearGradient>
                                </defs>
                            </g>
                        </svg>
                    </div>
                    <h2>Nenhuma despesa pendente</h2>
                    <p class="description">
                        Não há despesas pendentes no momento.
                    </p>
                    <p class="sub-description">
                        Assim que uma transação bancária for detectada, ela aparecerá aqui para aprovação! 🎉
                    </p>
                    <div class="actions">
                        <button class="btn-ok" @click="$emit('close')">Entendi</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
defineProps<{
    show: boolean
}>()

defineEmits(['close'])
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

.btn-ok {
    flex: 1;
    padding: 14px 24px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
}

.btn-ok:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
}

.btn-ok:active {
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
</style>
