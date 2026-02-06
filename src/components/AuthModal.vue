<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
                <div class="modal-content auth-modal" @click.stop>
                    <!-- Título dinâmico baseado no modo -->
                    <h2>{{ modalTitle }}</h2>

                    <div v-if="authStore.error" class="error-message">
                        {{ authStore.error }}
                    </div>

                    <!-- Modo: Verificação de Email -->
                    <div v-if="mode === 'verification'" class="verification-section">
                        <div class="verification-icon">📧</div>
                        <p class="verification-text">
                            Enviamos um email de verificação para:<br>
                            <strong>{{ verificationEmail }}</strong>
                        </p>
                        <p class="verification-hint">
                            Clique no link do email para confirmar sua conta.
                        </p>

                        <button @click="checkVerification" class="btn-submit" :disabled="loading">
                            {{ loading ? 'Verificando...' : 'Já verifiquei meu email' }}
                        </button>

                        <button @click="resendEmail" class="btn-secondary" :disabled="resendCooldown > 0">
                            {{ resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar email' }}
                        </button>

                        <div class="toggle-mode">
                            <button type="button" @click="mode = 'login'" class="link-button">
                                ← Voltar para login
                            </button>
                        </div>
                    </div>

                    <!-- Modo: Esqueci a senha -->
                    <div v-else-if="mode === 'forgot'" class="forgot-section">
                        <p class="forgot-text">
                            Digite seu email e enviaremos um link para redefinir sua senha.
                        </p>

                        <form @submit.prevent="handleForgotPassword">
                            <div class="form-group">
                                <label for="forgot-email">Email</label>
                                <input id="forgot-email" v-model="email" type="email" required
                                    placeholder="seu@email.com" autocomplete="email" />
                            </div>

                            <button type="submit" class="btn-submit" :disabled="loading">
                                {{ loading ? 'Enviando...' : 'Enviar link de recuperação' }}
                            </button>
                        </form>

                        <Transition name="fade">
                            <div v-if="resetEmailSent" class="success-message">
                                ✓ Email enviado! Verifique sua caixa de entrada.
                            </div>
                        </Transition>

                        <div class="toggle-mode">
                            <button type="button" @click="mode = 'login'" class="link-button">
                                ← Voltar para login
                            </button>
                        </div>
                    </div>

                    <!-- Modo: Login ou Criar Conta -->
                    <template v-else>
                        <form @submit.prevent="handleSubmit">
                            <div class="form-group">
                                <label for="auth-email">Email</label>
                                <input id="auth-email" v-model="email" type="email" required placeholder="seu@email.com"
                                    autocomplete="email" />
                            </div>

                            <div class="form-group">
                                <label for="auth-password">Senha</label>
                                <div class="password-input-wrapper">
                                    <input id="auth-password" v-model="password"
                                        :type="showPassword ? 'text' : 'password'" required
                                        placeholder="Mínimo 6 caracteres"
                                        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                                        minlength="6" />
                                    <button type="button" class="toggle-password" @click="showPassword = !showPassword"
                                        tabindex="-1">
                                        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20"
                                            height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                            stroke-width="2">
                                            <path
                                                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Campo de confirmação de senha (só no cadastro) -->
                            <div v-if="mode === 'register'" class="form-group">
                                <label for="auth-confirm-password">Confirmar Senha</label>
                                <div class="password-input-wrapper">
                                    <input id="auth-confirm-password" v-model="confirmPassword"
                                        :type="showConfirmPassword ? 'text' : 'password'" required
                                        placeholder="Digite a senha novamente" autocomplete="new-password"
                                        minlength="6" />
                                    <button type="button" class="toggle-password"
                                        @click="showConfirmPassword = !showConfirmPassword" tabindex="-1">
                                        <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20"
                                            height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                            stroke-width="2">
                                            <path
                                                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </button>
                                </div>
                                <p v-if="confirmPassword && password !== confirmPassword" class="field-error">
                                    As senhas não coincidem
                                </p>
                            </div>

                            <!-- Checkbox de aceite dos termos (só no cadastro) -->
                            <div v-if="mode === 'register'" class="form-group terms-checkbox">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="acceptedTerms" />
                                    <span>Li e aceito os <a href="#" @click.prevent="showTermsPreview = true">Termos de
                                            Uso</a></span>
                                </label>
                                <p v-if="!acceptedTerms && termsError" class="field-error">
                                    Você precisa aceitar os termos de uso
                                </p>
                            </div>

                            <button type="submit" class="btn-submit"
                                :disabled="loading || (mode === 'register' && (password !== confirmPassword || !acceptedTerms))">
                                {{ loading ? 'Carregando...' : (mode === 'login' ? 'Entrar' : 'Criar Conta') }}
                            </button>
                        </form>

                        <!-- Esqueci a senha (só no login) -->
                        <div v-if="mode === 'login'" class="forgot-password">
                            <button type="button" @click="mode = 'forgot'" class="link-button">
                                Esqueci minha senha
                            </button>
                        </div>

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

                        <div class="google-note">
                            <small>💡 Ao usar Google, sua conta é verificada automaticamente</small>
                        </div>

                        <div class="toggle-mode">
                            <button type="button" @click="toggleMode" class="link-button">
                                {{ mode === 'login' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar' }}
                            </button>
                        </div>
                    </template>
                </div>
            </div>
        </Transition>

        <!-- Toast de erro -->
        <ToastNotification :show="showErrorToast" :message="toastMessage" type="error" :duration="5000"
            @close="showErrorToast = false" />

        <!-- Toast de sucesso -->
        <ToastNotification :show="showSuccessToast" :message="successMessage" type="success" :duration="4000"
            @close="showSuccessToast = false" />
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import ToastNotification from './ToastNotification.vue'

const props = defineProps<{
    show: boolean
    persist?: boolean // Se true, não permite fechar a modal
}>();

const emit = defineEmits<{
    close: []
    requireTerms: [] // Emitido quando login Google requer aceite de termos
}>()

const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

// Estados do formulário
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptedTerms = ref(false) // Checkbox de termos

// Modos: 'login', 'register', 'forgot', 'verification'
const mode = ref<'login' | 'register' | 'forgot' | 'verification'>('login')

// Estados de loading e feedback
const loading = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const showSuccessToast = ref(false)
const successMessage = ref('')
const resetEmailSent = ref(false)
const verificationEmail = ref('')
const resendCooldown = ref(0)
const termsError = ref(false)
const showTermsPreview = ref(false)

// Timer para cooldown
let cooldownTimer: number | null = null

// Título dinâmico do modal
const modalTitle = computed(() => {
    switch (mode.value) {
        case 'login': return 'Entrar'
        case 'register': return 'Criar Conta'
        case 'forgot': return 'Recuperar Senha'
        case 'verification': return 'Verificar Email'
        default: return 'Autenticação'
    }
})

// Reset quando modal abre
watch(() => props.show, (newVal) => {
    if (newVal) {
        email.value = ''
        password.value = ''
        confirmPassword.value = ''
        showPassword.value = false
        showConfirmPassword.value = false
        mode.value = 'login'
        authStore.error = null
        resetEmailSent.value = false
        acceptedTerms.value = false
        termsError.value = false
        showTermsPreview.value = false
    }
})

// Limpa timer ao desmontar
onUnmounted(() => {
    if (cooldownTimer) {
        clearInterval(cooldownTimer)
    }
})

const handleOverlayClick = () => {
    if (!props.persist) {
        close()
    }
}

const handleSubmit = async () => {
    try {
        loading.value = true
        authStore.error = null
        termsError.value = false

        if (mode.value === 'login') {
            const result = await authStore.signIn(email.value, password.value)
            loading.value = false

            if (result.success) {
                close()
            }
        } else {
            // Verificar se senhas coincidem
            if (password.value !== confirmPassword.value) {
                authStore.error = 'As senhas não coincidem'
                loading.value = false
                return
            }

            // Verificar aceite dos termos
            if (!acceptedTerms.value) {
                termsError.value = true
                loading.value = false
                return
            }

            const result = await authStore.signUp(email.value, password.value)
            loading.value = false

            if (result.success) {
                // Aceita os termos automaticamente pois o checkbox foi marcado
                await subscriptionStore.acceptTerms()

                // Mostrar tela de verificação
                verificationEmail.value = email.value
                mode.value = 'verification'
                startResendCooldown()

                successMessage.value = '📧 Conta criada! Verifique seu email.'
                showSuccessToast.value = true
            }
        }
    } catch (error) {
        loading.value = false
        console.error('❌ Erro no submit de autenticação:', error)
        authStore.error = error instanceof Error ? error.message : 'Erro desconhecido ao fazer login'
    }
}

const handleForgotPassword = async () => {
    try {
        loading.value = true
        authStore.error = null
        resetEmailSent.value = false

        const result = await authStore.resetPassword(email.value)
        loading.value = false

        if (result.success) {
            resetEmailSent.value = true
            successMessage.value = '📧 Email de recuperação enviado!'
            showSuccessToast.value = true
        }
    } catch (error) {
        loading.value = false
        console.error('❌ Erro ao enviar email de recuperação:', error)
    }
}

const checkVerification = async () => {
    try {
        loading.value = true
        const result = await authStore.checkEmailVerification()
        loading.value = false

        if (result.verified) {
            successMessage.value = '✓ Email verificado com sucesso!'
            showSuccessToast.value = true
            close()
        } else {
            authStore.error = 'Email ainda não verificado. Verifique sua caixa de entrada e spam.'
        }
    } catch (error) {
        loading.value = false
        console.error('❌ Erro ao verificar email:', error)
    }
}

const resendEmail = async () => {
    if (resendCooldown.value > 0) return

    try {
        loading.value = true
        const result = await authStore.resendVerificationEmail()
        loading.value = false

        if (result.success) {
            successMessage.value = '📧 Email reenviado!'
            showSuccessToast.value = true
            startResendCooldown()
        }
    } catch (error) {
        loading.value = false
        console.error('❌ Erro ao reenviar email:', error)
    }
}

const startResendCooldown = () => {
    resendCooldown.value = 60 // 60 segundos

    if (cooldownTimer) {
        clearInterval(cooldownTimer)
    }

    cooldownTimer = window.setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
            if (cooldownTimer) {
                clearInterval(cooldownTimer)
                cooldownTimer = null
            }
        }
    }, 1000)
}

const handleGoogleSignIn = async () => {
    try {
        console.log('🔵 Iniciando login com Google...')
        authStore.error = null
        loading.value = true

        const result = await authStore.signInWithGoogle()
        console.log('🔵 Login com Google concluído:', result)

        loading.value = false

        if (result.success) {
            // Carrega subscription para verificar se aceitou termos
            await subscriptionStore.loadSubscription()

            // Verifica se precisa aceitar termos
            if (subscriptionStore.needsTermsAcceptance) {
                console.log('📋 Usuário precisa aceitar termos de uso')
                // Emite evento para App.vue abrir modal de termos
                emit('requireTerms')
                // NÃO fecha a modal ainda - App.vue vai fechar quando termos forem aceitos
            } else {
                close()
            }
        }
    } catch (error) {
        loading.value = false
        console.error('❌ Erro no Google Sign In:', error)
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
        authStore.error = `Erro ao fazer login com Google: ${errorMsg}`

        // Mostrar toast de erro
        toastMessage.value = `Erro ao fazer login com Google: ${errorMsg}`
        showErrorToast.value = true
    }
}

const toggleMode = () => {
    if (mode.value === 'login') {
        mode.value = 'register'
    } else {
        mode.value = 'login'
    }
    authStore.error = null
    password.value = ''
    confirmPassword.value = ''
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
    z-index: 10000;
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
    text-align: center;
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
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

input:focus {
    outline: none;
    border-color: #4CAF50;
}

/* Wrapper para campo de senha com botão de toggle */
.password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.password-input-wrapper input {
    padding-right: 48px;
}

.toggle-password {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
}

.toggle-password:hover {
    color: #333;
}

.toggle-password:active {
    transform: scale(0.95);
}

.field-error {
    color: #e53935;
    font-size: 12px;
    margin-top: 4px;
    margin-bottom: 0;
}

button {
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-submit {
    width: 100%;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    color: white;
    margin-bottom: 12px;
}

.btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-secondary {
    width: 100%;
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    margin-bottom: 12px;
}

.btn-secondary:hover:not(:disabled) {
    background: #eee;
}

.auth-modal {
    max-width: 420px;
}

.error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    text-align: center;
    border: 1px solid #ffcdd2;
}

.success-message {
    background-color: #e8f5e9;
    color: #2e7d32;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    text-align: center;
    border: 1px solid #c8e6c9;
}

.btn-submit:disabled,
.btn-google:disabled,
.btn-secondary:disabled {
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
    border-radius: 8px;
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

.google-note {
    margin-top: 8px;
    text-align: center;
}

.google-note small {
    color: #666;
    font-size: 12px;
    line-height: 1.4;
    display: block;
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
    padding: 4px 8px;
}

.link-button:hover {
    color: #45a049;
}

.forgot-password {
    text-align: right;
    margin-top: -8px;
    margin-bottom: 8px;
}

.forgot-password .link-button {
    font-size: 13px;
    color: #666;
}

.forgot-password .link-button:hover {
    color: #4CAF50;
}

/* Seção de verificação de email */
.verification-section {
    text-align: center;
}

.verification-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.verification-text {
    font-size: 16px;
    color: #333;
    margin-bottom: 8px;
    line-height: 1.5;
}

.verification-hint {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
}

/* Seção de esqueci a senha */
.forgot-section {
    text-align: center;
}

.forgot-text {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
    line-height: 1.5;
}

.forgot-section .form-group {
    text-align: left;
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

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Dark mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode h2 {
    color: #fff;
}

body.dark-mode label {
    color: #ccc;
}

body.dark-mode input {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode input::placeholder {
    color: #666;
}

body.dark-mode .toggle-password {
    color: #888;
}

body.dark-mode .toggle-password:hover {
    color: #ccc;
}

body.dark-mode .divider span {
    background: #1e1e2e;
    color: #666;
}

body.dark-mode .btn-google {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .btn-google:hover:not(:disabled) {
    background: #3a3a4e;
}

body.dark-mode .google-note small {
    color: #888;
}

body.dark-mode .btn-secondary {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #ccc;
}

body.dark-mode .verification-text,
body.dark-mode .forgot-text {
    color: #ccc;
}

body.dark-mode .verification-hint {
    color: #888;
}

body.dark-mode .forgot-password .link-button {
    color: #888;
}

/* Terms Checkbox Styles */
.terms-checkbox {
    margin-top: 8px;
}

.checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    line-height: 1.4;
}

.checkbox-label input[type="checkbox"] {
    margin-top: 3px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #4CAF50;
}

.checkbox-label a {
    color: #4CAF50;
    text-decoration: underline;
}

.checkbox-label a:hover {
    color: #388E3C;
}

body.dark-mode .checkbox-label {
    color: #aaa;
}

body.dark-mode .checkbox-label a {
    color: #66BB6A;
}
</style>
