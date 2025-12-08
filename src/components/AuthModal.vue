<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="close">
                <div class="modal-content auth-modal" @click.stop>
                    <h2>{{ isLogin ? 'Entrar' : 'Criar Conta' }}</h2>

                    <div v-if="authStore.error" class="error-message">
                        {{ authStore.error }}
                    </div>

                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label for="auth-email">Email</label>
                            <input id="auth-email" v-model="email" type="email" required placeholder="seu@email.com"
                                autocomplete="email" />
                        </div>

                        <div class="form-group">
                            <label for="auth-password">Senha</label>
                            <input id="auth-password" v-model="password" type="password" required
                                placeholder="Mínimo 6 caracteres" autocomplete="current-password" minlength="6" />
                        </div>

                        <button type="submit" class="btn-submit" :disabled="loading">
                            {{ loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta') }}
                        </button>
                    </form>

                    <div class="divider">
                        <span>ou</span>
                    </div>

                    <button @click="handleGoogleSignIn" class="btn-google" :disabled="loading">
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4"
                                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                            <path fill="#34A853"
                                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                            <path fill="#FBBC05"
                                d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z" />
                            <path fill="#EA4335"
                                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                        </svg>
                        Continuar com Google
                    </button>

                    <div class="toggle-mode">
                        <button type="button" @click="toggleMode" class="link-button">
                            {{ isLogin ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const isLogin = ref(true)
const loading = ref(false)

watch(() => props.show, (newVal) => {
    if (newVal) {
        email.value = ''
        password.value = ''
        isLogin.value = true
        authStore.error = null
    }
})

const handleSubmit = async () => {
    loading.value = true

    const result = isLogin.value
        ? await authStore.signIn(email.value, password.value)
        : await authStore.signUp(email.value, password.value)

    loading.value = false

    if (result.success) {
        close()
    }
}

const handleGoogleSignIn = async () => {
    loading.value = true
    const result = await authStore.signInWithGoogle()
    loading.value = false

    if (result.success) {
        close()
    }
}

const toggleMode = () => {
    isLogin.value = !isLogin.value
    authStore.error = null
}

const close = () => {
    emit('close')
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
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-height: 90vh;
    overflow-y: auto;
}

h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #333;
}

.form-group {
    margin-bottom: 16px;
}

label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #555;
    font-size: 14px;
}

input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

input:focus {
    outline: none;
    border-color: #4CAF50;
}

button {
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-submit {
    width: 100%;
    background-color: #4CAF50;
    color: white;
    margin-bottom: 16px;
}

.btn-submit:hover:not(:disabled) {
    background-color: #45a049;
}

.auth-modal {
    max-width: 420px;
}

.error-message {
    background-color: #fee;
    color: #c33;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
    text-align: center;
}

.btn-submit:disabled,
.btn-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.divider {
    position: relative;
    text-align: center;
    margin: 24px 0;
}

.divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #ddd;
}

.divider span {
    position: relative;
    background: white;
    padding: 0 16px;
    color: #999;
    font-size: 14px;
}

.btn-google {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #333;
}

.btn-google:hover:not(:disabled) {
    background-color: #f8f8f8;
    border-color: #ccc;
}

.toggle-mode {
    text-align: center;
    margin-top: 20px;
}

.link-button {
    background: none;
    border: none;
    color: #4CAF50;
    cursor: pointer;
    font-size: 14px;
    text-decoration: underline;
}

.link-button:hover {
    color: #45a049;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}
</style>
