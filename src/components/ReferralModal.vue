<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { Referral } from '@/types/budget'

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const referralCodeInput = ref('')
const isApplying = ref(false)
const copied = ref(false)

// Novos campos para envio de email
const showEmailForm = ref(false)
const inviteEmail = ref('')
const inviteMessage = ref('')
const isSendingInvite = ref(false)

const myReferralCode = computed(() => subscriptionStore.referralCode)

// Nova lógica de status: pending, validated, expired
const validatedReferrals = computed(() =>
    (subscriptionStore.referrals as Referral[]).filter(r => r.status === 'validated' || r.isActive)
)
const pendingReferrals = computed(() =>
    (subscriptionStore.referrals as Referral[]).filter(r => r.status === 'pending' && !r.isActive)
)
const expiredReferrals = computed(() =>
    (subscriptionStore.referrals as Referral[]).filter(r => r.status === 'expired')
)

const totalBonusMonths = computed(() => subscriptionStore.subscription?.referralBonusMonths || 0)
const hasReferrer = computed(() => !!subscriptionStore.subscription?.referredBy)

const handleCopyCode = async () => {
    const success = await subscriptionStore.copyReferralCode()
    if (success) {
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    }
}

const handleShareCode = async () => {
    if (!myReferralCode.value) return

    const shareText = `Use meu código ${myReferralCode.value} para se cadastrar no Budget System e ganhe benefícios! 🎁💰`

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Budget System - Código de Indicação',
                text: shareText,
                url: subscriptionStore.getReferralLink()
            })
        } catch (err) {
            // User cancelled share
        }
    } else {
        // Fallback: copy to clipboard
        await handleCopyCode()
    }
}

const handleShareByEmail = () => {
    showEmailForm.value = true
    inviteEmail.value = ''
    inviteMessage.value = ''
}

const handleSendInviteEmail = async () => {
    if (!inviteEmail.value.trim()) {
        showError('Digite o email do seu amigo')
        return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.value.trim())) {
        showError('Digite um email válido')
        return
    }

    isSendingInvite.value = true
    try {
        const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-budget-system-34ef8.cloudfunctions.net'

        const response = await fetch(`${functionsUrl}/sendReferralInvite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                toEmail: inviteEmail.value.trim(),
                fromName: authStore.userEmail?.split('@')[0] || 'Um amigo',
                fromEmail: authStore.userEmail,
                referralCode: myReferralCode.value,
                customMessage: inviteMessage.value.trim()
            })
        })

        const data = await response.json()

        if (data.success) {
            success('Convite enviado com sucesso! 📧')
            showEmailForm.value = false
            inviteEmail.value = ''
            inviteMessage.value = ''
        } else {
            showError(data.error || 'Erro ao enviar convite')
        }
    } catch (err: any) {
        console.error('Erro ao enviar convite:', err)
        showError('Erro ao enviar convite. Tente novamente.')
    } finally {
        isSendingInvite.value = false
    }
}

const handleCancelEmailForm = () => {
    showEmailForm.value = false
    inviteEmail.value = ''
    inviteMessage.value = ''
}

const handleApplyCode = async () => {
    if (!referralCodeInput.value.trim()) {
        showError('Digite um código de indicação')
        return
    }

    isApplying.value = true
    try {
        const result = await subscriptionStore.applyReferralCode(referralCodeInput.value.trim())
        if (result.success) {
            success(result.message || 'Código aplicado com sucesso!')
            referralCodeInput.value = ''
        } else {
            showError(result.error || 'Erro ao aplicar código')
        }
    } finally {
        isApplying.value = false
    }
}

onMounted(() => {
    subscriptionStore.loadReferrals()
})
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🎁 Indique e Ganhe</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <div class="modal-body">
                        <!-- How it works -->
                        <section class="info-section">
                            <h3>Como funciona?</h3>
                            <div class="steps">
                                <div class="step">
                                    <div class="step-number">1</div>
                                    <div class="step-text">
                                        <strong>Compartilhe seu código</strong>
                                        <span>Envie para amigos e familiares</span>
                                    </div>
                                </div>
                                <div class="step">
                                    <div class="step-number">2</div>
                                    <div class="step-text">
                                        <strong>Eles se cadastram</strong>
                                        <span>Usando seu código de indicação</span>
                                    </div>
                                </div>
                                <div class="step">
                                    <div class="step-number">3</div>
                                    <div class="step-text">
                                        <strong>Você ganha!</strong>
                                        <span>1 mês grátis de Premium por indicação</span>
                                    </div>
                                </div>
                            </div>
                            <div class="info-note">
                                ⚠️ <strong>Importante:</strong> Para você ganhar o bônus, seu indicado deve usar o app
                                ativamente por 1 mês <strong>OU</strong> assinar o Premium.
                            </div>
                        </section>

                        <!-- My Referral Code -->
                        <section class="referral-code-section">
                            <h3>Seu código de indicação</h3>
                            <div class="code-card">
                                <div class="code-display">
                                    <span class="code">{{ myReferralCode }}</span>
                                </div>
                                <div class="code-actions">
                                    <button class="btn-copy" @click="handleCopyCode">
                                        {{ copied ? '✓ Copiado!' : '📋 Copiar' }}
                                    </button>
                                    <button class="btn-share" @click="handleShareCode">
                                        📤 Compartilhar
                                    </button>
                                    <button class="btn-email" @click="handleShareByEmail">
                                        ✉️ Convidar por Email
                                    </button>
                                </div>
                            </div>

                            <!-- Formulário de envio de email -->
                            <Transition name="slide">
                                <div v-if="showEmailForm" class="email-invite-form">
                                    <h4>📧 Enviar convite por email</h4>
                                    <div class="form-group">
                                        <label>Email do amigo:</label>
                                        <input v-model="inviteEmail" type="email" placeholder="amigo@email.com"
                                            :disabled="isSendingInvite" />
                                    </div>
                                    <div class="form-group">
                                        <label>Mensagem personalizada (opcional):</label>
                                        <textarea v-model="inviteMessage"
                                            placeholder="Escreva uma mensagem para seu amigo..." rows="3"
                                            maxlength="500" :disabled="isSendingInvite"></textarea>
                                        <span class="char-count">{{ inviteMessage.length }}/500</span>
                                    </div>
                                    <div class="form-actions">
                                        <button class="btn-cancel" @click="handleCancelEmailForm"
                                            :disabled="isSendingInvite">
                                            Cancelar
                                        </button>
                                        <button class="btn-send" @click="handleSendInviteEmail"
                                            :disabled="isSendingInvite || !inviteEmail.trim()">
                                            {{ isSendingInvite ? 'Enviando...' : '📤 Enviar Convite' }}
                                        </button>
                                    </div>
                                </div>
                            </Transition>
                        </section>

                        <!-- Apply Someone's Code (only if no referrer yet) -->
                        <section v-if="!hasReferrer" class="apply-code-section">
                            <h3>Tem um código de amigo?</h3>
                            <div class="apply-form">
                                <input v-model="referralCodeInput" type="text" placeholder="Digite o código aqui"
                                    maxlength="8" @keyup.enter="handleApplyCode" />
                                <button class="btn-apply" :disabled="isApplying || !referralCodeInput.trim()"
                                    @click="handleApplyCode">
                                    {{ isApplying ? 'Aplicando...' : 'Aplicar' }}
                                </button>
                            </div>
                        </section>

                        <section v-else class="already-referred">
                            <div class="referred-badge">
                                ✅ Você já foi indicado por um amigo!
                            </div>
                        </section>

                        <!-- My Referrals Stats -->
                        <section class="stats-section">
                            <h3>Suas indicações</h3>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value">{{ subscriptionStore.referrals.length }}</div>
                                    <div class="stat-label">Total</div>
                                </div>
                                <div class="stat-card validated">
                                    <div class="stat-value">{{ validatedReferrals.length }}</div>
                                    <div class="stat-label">Validadas</div>
                                </div>
                                <div class="stat-card pending">
                                    <div class="stat-value">{{ pendingReferrals.length }}</div>
                                    <div class="stat-label">Pendentes</div>
                                </div>
                                <div class="stat-card bonus">
                                    <div class="stat-value">{{ totalBonusMonths }}</div>
                                    <div class="stat-label">Meses ganhos</div>
                                </div>
                            </div>
                        </section>

                        <!-- Referrals List -->
                        <section v-if="subscriptionStore.referrals.length > 0" class="referrals-list-section">
                            <h3>Pessoas que você indicou</h3>

                            <div v-if="validatedReferrals.length > 0" class="referrals-group">
                                <div class="group-label validated">✅ Validadas</div>
                                <div v-for="referral in validatedReferrals" :key="referral.id"
                                    class="referral-item validated">
                                    <div class="referral-email">{{ referral.referredUserEmail }}</div>
                                    <div class="referral-status">+1 mês ganho ✓</div>
                                </div>
                            </div>

                            <div v-if="pendingReferrals.length > 0" class="referrals-group">
                                <div class="group-label pending">⏳ Pendentes</div>
                                <div v-for="referral in pendingReferrals" :key="referral.id"
                                    class="referral-item pending">
                                    <div class="referral-email">{{ referral.referredUserEmail }}</div>
                                    <div class="referral-status">Aguardando qualificação</div>
                                </div>
                            </div>

                            <div v-if="expiredReferrals.length > 0" class="referrals-group">
                                <div class="group-label expired">❌ Expiradas</div>
                                <div v-for="referral in expiredReferrals" :key="referral.id"
                                    class="referral-item expired">
                                    <div class="referral-email">{{ referral.referredUserEmail }}</div>
                                    <div class="referral-status">Não qualificou</div>
                                </div>
                            </div>
                        </section>

                        <section v-else class="empty-referrals">
                            <div class="empty-icon">👥</div>
                            <p>Você ainda não indicou ninguém</p>
                            <span>Compartilhe seu código e ganhe Premium grátis!</span>
                        </section>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

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
    z-index: 2200;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-radius: 20px 20px 0 0;
}

.modal-header h2 {
    margin: 0;
    font-size: 22px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 28px;
    color: #999;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-button:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
}

section {
    margin-bottom: 24px;
}

section h3 {
    font-size: 15px;
    color: #333;
    margin: 0 0 12px 0;
}

/* Info Section */
.steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.step {
    display: flex;
    align-items: center;
    gap: 12px;
}

.step-number {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
}

.step-text {
    display: flex;
    flex-direction: column;
}

.step-text strong {
    font-size: 14px;
    color: #333;
}

.step-text span {
    font-size: 12px;
    color: #888;
}

.info-note {
    margin-top: 16px;
    padding: 12px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border-radius: 10px;
    font-size: 13px;
    color: #856404;
}

/* Referral Code Section */
.code-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 20px;
}

.code-display {
    text-align: center;
    margin-bottom: 16px;
}

.code {
    font-size: 32px;
    font-weight: 700;
    color: white;
    letter-spacing: 4px;
    font-family: monospace;
}

.code-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.btn-copy,
.btn-share,
.btn-email {
    flex: 1;
    min-width: 80px;
    padding: 12px 8px;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-copy {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.btn-copy:hover {
    background: rgba(255, 255, 255, 0.3);
}

.btn-share {
    background: white;
    color: #667eea;
}

.btn-share:hover {
    transform: translateY(-1px);
}

.btn-email {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-email:hover {
    background: rgba(255, 255, 255, 0.25);
}

/* Email Invite Form */
.email-invite-form {
    margin-top: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.email-invite-form h4 {
    margin: 0 0 16px;
    font-size: 15px;
    color: #333;
}

.form-group {
    margin-bottom: 14px;
}

.form-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #555;
    margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
}

.form-group textarea {
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
}

.form-group input:disabled,
.form-group textarea:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
}

.char-count {
    display: block;
    text-align: right;
    font-size: 11px;
    color: #888;
    margin-top: 4px;
}

.form-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.btn-cancel {
    flex: 1;
    padding: 12px;
    background: #f0f0f0;
    color: #666;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
    background: #e0e0e0;
}

.btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-send {
    flex: 2;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-send:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-send:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Apply Code Section */
.apply-code-section {
    padding: 0 4px;
}

.apply-form {
    display: flex;
    gap: 10px;
    padding-right: 4px;
}

.apply-form input {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: monospace;
}

.apply-form input::placeholder {
    text-transform: none;
    letter-spacing: normal;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #999;
}

.apply-form input:focus {
    outline: none;
    border-color: #667eea;
}

.btn-apply {
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
}

.btn-apply:hover:not(:disabled) {
    transform: translateY(-1px);
}

.btn-apply:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.already-referred {
    text-align: center;
}

.referred-badge {
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    color: #155724;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
}

/* Stats Section */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.stat-card {
    background: #f5f5f5;
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    flex: 1;
    min-width: 0;
}

.stat-card.validated {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.stat-card.pending {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
}

.stat-card.bonus {
    background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #333;
}

.stat-card.bonus .stat-value {
    color: #333;
}

.stat-label {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
}

/* Referrals List */
.referrals-group {
    margin-bottom: 16px;
}

.group-label {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 8px;
}

.group-label.validated {
    background: #d4edda;
    color: #155724;
}

.group-label.pending {
    background: #fff3cd;
    color: #856404;
}

.group-label.expired {
    background: #f8d7da;
    color: #721c24;
}

.referral-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 8px;
}

.referral-item.validated {
    background: #f0fff4;
    border: 1px solid #c6f6d5;
}

.referral-item.pending {
    background: #fffbeb;
    border: 1px solid #fef3c7;
}

.referral-item.expired {
    background: #fef2f2;
    border: 1px solid #fecaca;
}

.referral-email {
    font-size: 14px;
    color: #333;
}

.referral-status {
    font-size: 12px;
    font-weight: 500;
}

.referral-item.validated .referral-status {
    color: #38a169;
}

.referral-item.pending .referral-status {
    color: #d69e2e;
}

.referral-item.expired .referral-status {
    color: #e53e3e;
}

/* Empty State */
.empty-referrals {
    text-align: center;
    padding: 30px;
    background: #f8f9fa;
    border-radius: 12px;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.empty-referrals p {
    margin: 0;
    font-size: 15px;
    color: #333;
}

.empty-referrals span {
    font-size: 13px;
    color: #888;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9) translateY(20px);
}
</style>
