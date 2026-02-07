<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>💬 Precisa de Ajuda?</h2>
                        <button class="close-button" @click="$emit('close')">×</button>
                    </div>

                    <div class="modal-content">
                        <p class="description">
                            Tem alguma dúvida ou problema? Envie uma mensagem e responderemos o mais breve possível.
                        </p>

                        <form @submit.prevent="handleSubmit">
                            <div class="form-group">
                                <label for="subject">Assunto</label>
                                <select id="subject" v-model="form.subject" required>
                                    <option value="">Selecione...</option>
                                    <option value="Dúvida sobre o app">Dúvida sobre o app</option>
                                    <option value="Problema técnico">Problema técnico</option>
                                    <option value="Sugestão de melhoria">Sugestão de melhoria</option>
                                    <option value="Premium e pagamentos">Premium e pagamentos</option>
                                    <option value="Compartilhamento">Compartilhamento</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="message">Mensagem</label>
                                <textarea id="message" v-model="form.message" rows="5"
                                    placeholder="Descreva sua dúvida ou problema com o máximo de detalhes possível..."
                                    required></textarea>
                            </div>

                            <div class="user-info">
                                <span class="info-icon">📧</span>
                                <span>Responderemos em: <strong>{{ userEmail }}</strong></span>
                            </div>

                            <div class="button-group">
                                <button type="button" class="btn-secondary" @click="$emit('close')">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary" :disabled="loading || !isFormValid">
                                    <span v-if="loading" class="loading-spinner"></span>
                                    <span v-else>Enviar Mensagem</span>
                                </button>
                            </div>
                        </form>

                        <div v-if="successMessage" class="success-message">
                            <span>✅</span> {{ successMessage }}
                        </div>

                        <div v-if="errorMessage" class="error-message">
                            <span>❌</span> {{ errorMessage }}
                        </div>

                        <!-- Seção de diagnóstico - comentado pois é mais para uso interno
                        <div class="diagnostic-section">
                            <div class="diagnostic-header">
                                <span class="diagnostic-icon">🔧</span>
                                <span>Diagnóstico</span>
                            </div>
                            <p class="diagnostic-text">
                                Está tendo problemas? Os logs do app podem ajudar a identificar o que está acontecendo.
                            </p>
                            <button type="button" class="btn-diagnostic" @click="$emit('show-logs')">
                                📋 Ver Logs do App
                            </button>
                        </div>
                        -->

                        <!-- Link para Termos de Uso -->
                        <div class="terms-section">
                            <button type="button" class="btn-terms" @click="$emit('show-terms')">
                                📜 Ver Termos de Uso e Privacidade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'show-logs'): void
    (e: 'show-terms'): void
}>()

const authStore = useAuthStore()

const form = ref({
    subject: '',
    message: ''
})

const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const userEmail = computed(() => authStore.userEmail || 'Não logado')

const isFormValid = computed(() => {
    return form.value.subject && form.value.message.trim().length >= 10
})

// Reset form when modal opens
watch(() => props.show, (newVal) => {
    if (newVal) {
        form.value = { subject: '', message: '' }
        successMessage.value = ''
        errorMessage.value = ''
    }
})

const handleSubmit = async () => {
    if (!isFormValid.value) return

    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    try {
        // URL da Cloud Function
        const functionUrl = 'https://us-central1-budget-system-34ef8.cloudfunctions.net/sendSupportEmail'

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userEmail: authStore.userEmail,
                userName: authStore.user?.displayName || authStore.userEmail?.split('@')[0] || 'Usuário',
                subject: form.value.subject,
                message: form.value.message
            })
        })

        const data = await response.json()

        if (data.success) {
            successMessage.value = 'Mensagem enviada com sucesso! Responderemos em breve.'
            form.value = { subject: '', message: '' }

            // Auto-close after 3 seconds
            setTimeout(() => {
                emit('close')
            }, 3000)
        } else {
            throw new Error(data.message || 'Erro ao enviar mensagem')
        }
    } catch (error) {
        console.error('Error sending support email:', error)
        errorMessage.value = 'Erro ao enviar mensagem. Tente novamente ou envie email diretamente para admin@budgetsystem.cloud'
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    backdrop-filter: blur(4px);
}

.modal-container {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
}

.modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
}

.close-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.close-button:hover {
    background: rgba(255, 255, 255, 0.3);
}

.modal-content {
    padding: 24px;
    overflow-y: auto;
}

.description {
    color: #64748b;
    font-size: 0.9rem;
    margin: 0 0 20px;
    line-height: 1.5;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-weight: 500;
    color: #334155;
    margin-bottom: 6px;
    font-size: 0.9rem;
}

.form-group select,
.form-group textarea {
    width: 100%;
    padding: 12px 14px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: white;
}

.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #f1f5f9;
    border-radius: 10px;
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 20px;
}

.info-icon {
    font-size: 1.1rem;
}

.button-group {
    display: flex;
    gap: 12px;
}

.btn-primary,
.btn-secondary {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    background: white;
    color: #64748b;
    border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.success-message,
.error-message {
    margin-top: 16px;
    padding: 14px 16px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
}

.success-message {
    background: #dcfce7;
    color: #166534;
}

.error-message {
    background: #fee2e2;
    color: #991b1b;
}

/* Diagnostic Section */
.diagnostic-section {
    margin-top: 24px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 1px dashed #ddd;
}

.diagnostic-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
}

.diagnostic-icon {
    font-size: 1.2rem;
}

.diagnostic-text {
    font-size: 0.85rem;
    color: #666;
    margin: 0 0 12px 0;
}

.btn-diagnostic {
    width: 100%;
    padding: 12px 16px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.2s;
}

.btn-diagnostic:hover {
    background: #e5e5e5;
}

body.dark-mode .diagnostic-section {
    background: #2a2a3e;
    border-color: #444;
}

body.dark-mode .diagnostic-header {
    color: #fff;
}

body.dark-mode .diagnostic-text {
    color: #aaa;
}

body.dark-mode .btn-diagnostic {
    background: #333;
    border-color: #555;
    color: #fff;
}

body.dark-mode .btn-diagnostic:hover {
    background: #444;
}

/* Terms Section */
.terms-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
}

.btn-terms {
    width: 100%;
    padding: 12px 16px;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    color: #6b7280;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-terms:hover {
    background: #f3f4f6;
    color: #374151;
}

body.dark-mode .terms-section {
    border-top-color: #444;
}

body.dark-mode .btn-terms {
    background: #333;
    border-color: #555;
    color: #aaa;
}

body.dark-mode .btn-terms:hover {
    background: #444;
    color: #fff;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
    transform: scale(0.95) translateY(20px);
}

/* Dark Mode */
body.dark-mode .modal-container {
    background: #1e1e2e;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .close-button {
    color: #aaa;
}

body.dark-mode .close-button:hover {
    color: #fff;
}

body.dark-mode .description {
    color: #aaa;
}

body.dark-mode .form-group label {
    color: #ccc;
}

body.dark-mode .form-group select,
body.dark-mode .form-group textarea {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .user-info {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .btn-secondary {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #aaa;
}

body.dark-mode .success-message {
    background: #1a3a2a;
    color: #68d391;
}

body.dark-mode .error-message {
    background: #3a2020;
    color: #ff7070;
}

body.dark-mode .diagnostic-section {
    background: #2a2a3e;
}

body.dark-mode .terms-section {
    background: #2a2a3e;
}
</style>
