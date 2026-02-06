<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { PLAN_FEATURES } from '@/types/budget'
import { useStripe, STRIPE_PRICES, type PlanInterval } from '@/services/StripeService'
import { logger } from '@/services/LoggerService'

const props = defineProps<{
    show: boolean
    blockedFeature?: 'sharing' | 'autoNotifications' | null
}>()

const emit = defineEmits<{
    close: []
    upgraded: []
    showReferral: []
}>()

const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()
const stripe = useStripe()

const isProcessing = ref(false)
const currentStep = ref<'features' | 'payment' | 'success'>('features')
const selectedPlan = ref<PlanInterval>('yearly') // Default to yearly (melhor valor)
const paymentError = ref('')

// Reset state when modal opens
watch(() => props.show, (newVal) => {
    if (newVal) {
        currentStep.value = 'features'
        selectedPlan.value = 'yearly'
        paymentError.value = ''
    }
})

const featureMessages = {
    sharing: {
        icon: '👥',
        title: 'Compartilhamento de Orçamentos',
        description: 'Compartilhe seus orçamentos com seu cônjuge ou parceiro(a) para controlar gastos juntos!'
    },
    autoNotifications: {
        icon: '🔔',
        title: 'Captura Automática de Gastos',
        description: 'Deixe o app capturar automaticamente suas despesas das notificações bancárias!'
    }
}

const currentFeatureMessage = computed(() => {
    if (props.blockedFeature) {
        return featureMessages[props.blockedFeature]
    }
    return null
})

const premiumFeatures = [
    { icon: '👥', title: 'Compartilhamento', description: 'Controle gastos com parceiros' },
    { icon: '🔔', title: 'Captura automática', description: 'Atribua gastos capturados automaticamente' },
    { icon: '🎁', title: 'Indique e ganhe', description: '1 mês grátis por indicação' },
    { icon: '�', title: 'Análise de gastos', description: 'Calendário financeiro e gráficos detalhados' }
]

const plans = computed(() => [
    {
        id: 'monthly' as PlanInterval,
        name: 'Mensal',
        price: STRIPE_PRICES.monthly.amount / 100,
        priceFormatted: 'R$ 19,90',
        period: '/mês',
        savings: null,
        popular: false
    },
    {
        id: 'yearly' as PlanInterval,
        name: 'Anual',
        price: STRIPE_PRICES.yearly.amount / 100,
        priceFormatted: 'R$ 159,00',
        pricePerMonth: 'R$ 13,25/mês',
        period: '/ano',
        savings: '33% de desconto',
        popular: true
    }
])

const selectedPlanDetails = computed(() => {
    return plans.value.find(p => p.id === selectedPlan.value)
})

const handleProceedToPayment = async () => {
    isProcessing.value = true
    paymentError.value = ''

    try {
        logger.info('Initiating Stripe checkout', 'PremiumUpgradeModal.handleProceedToPayment', {
            plan: selectedPlan.value
        })

        // Redireciona para o Stripe Checkout
        await stripe.redirectToCheckout(selectedPlan.value)
    } catch (error: any) {
        logger.error('Error initiating checkout', 'PremiumUpgradeModal.handleProceedToPayment', undefined, error)
        paymentError.value = error.message || 'Erro ao processar. Tente novamente.'
    } finally {
        isProcessing.value = false
    }
}

const handleReferral = () => {
    emit('showReferral')
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

const selectPlan = (planId: PlanInterval) => {
    selectedPlan.value = planId
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <button class="close-button" @click="emit('close')">×</button>

                    <!-- Step 1: Features -->
                    <div v-if="currentStep === 'features'" class="modal-body">
                        <!-- Header with Premium Badge -->
                        <div class="premium-header">
                            <div class="premium-badge">
                                <span class="crown">👑</span>
                                <span>PREMIUM</span>
                            </div>
                            <h2>Desbloqueie todo o potencial!</h2>
                        </div>

                        <!-- Blocked Feature Message (if any) -->
                        <div v-if="currentFeatureMessage" class="blocked-feature-card">
                            <div class="feature-icon">{{ currentFeatureMessage.icon }}</div>
                            <div class="feature-info">
                                <strong>{{ currentFeatureMessage.title }}</strong>
                                <p>{{ currentFeatureMessage.description }}</p>
                            </div>
                            <div class="locked-badge">🔒</div>
                        </div>

                        <!-- Feature List -->
                        <div class="features-list">
                            <h3>Com o Premium você tem:</h3>
                            <div v-for="feature in premiumFeatures" :key="feature.title" class="feature-item">
                                <span class="feature-icon">{{ feature.icon }}</span>
                                <div class="feature-text">
                                    <strong>{{ feature.title }}</strong>
                                    <span>{{ feature.description }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Plan Selection -->
                        <div class="plans-container">
                            <h3>Escolha seu plano:</h3>
                            <div class="plans-grid">
                                <div v-for="plan in plans" :key="plan.id" class="plan-card" :class="{
                                    'selected': selectedPlan === plan.id,
                                    'popular': plan.popular
                                }" @click="selectPlan(plan.id)">
                                    <div v-if="plan.popular" class="popular-badge">
                                        🔥 Mais Popular
                                    </div>
                                    <div class="plan-name">{{ plan.name }}</div>
                                    <div class="plan-price">
                                        <span class="price-value">{{ plan.priceFormatted }}</span>
                                        <span class="price-period">{{ plan.period }}</span>
                                    </div>
                                    <div v-if="plan.pricePerMonth" class="plan-monthly">
                                        {{ plan.pricePerMonth }}
                                    </div>
                                    <div v-if="plan.savings" class="plan-savings">
                                        {{ plan.savings }}
                                    </div>
                                    <div class="plan-check" v-if="selectedPlan === plan.id">✓</div>
                                </div>
                            </div>
                        </div>

                        <!-- Referral Option -->
                        <div class="referral-section">
                            <div class="referral-divider">
                                <span>ou</span>
                            </div>
                            <button class="referral-button" @click="handleReferral">
                                🎁 Ganhe meses grátis indicando amigos
                            </button>
                            <p class="referral-note">
                                Cada amigo ativo = 1 mês grátis de Premium!
                            </p>
                        </div>

                        <!-- Error Message -->
                        <div v-if="paymentError" class="error-message">
                            ⚠️ {{ paymentError }}
                        </div>
                    </div>

                    <!-- Step 3: Success -->
                    <div v-else-if="currentStep === 'success'" class="modal-body success-step">
                        <div class="success-icon">🎉</div>
                        <h2>Bem-vindo ao Premium!</h2>
                        <p>Seu pagamento foi processado com sucesso!</p>
                        <div class="success-features">
                            <p>✅ Todos os recursos desbloqueados</p>
                            <p>✅ Compartilhamento ativo</p>
                            <p>✅ Captura automática ativada</p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="modal-footer">
                        <template v-if="currentStep === 'features'">
                            <button class="upgrade-button" :disabled="isProcessing" @click="handleProceedToPayment">
                                <span v-if="isProcessing">Redirecionando...</span>
                                <span v-else>
                                    💳 Assinar {{ selectedPlanDetails?.name }} por {{
                                        selectedPlanDetails?.priceFormatted }}
                                </span>
                            </button>
                            <button class="skip-button" @click="emit('close')">
                                Continuar com plano gratuito
                            </button>
                            <p class="payment-secure">🔒 Pagamento seguro via Stripe</p>
                        </template>
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
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2100;
    padding: 20px;
}

.modal-content {
    background: var(--color-background-soft, linear-gradient(180deg, #1a1a2e 0%, #16213e 100%));
    border-radius: 24px;
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    position: relative;
}

.close-button {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    font-size: 24px;
    color: #888;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.close-button:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

.modal-body {
    padding: 32px 24px 24px;
}

.premium-header {
    text-align: center;
    margin-bottom: 24px;
}

.premium-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    color: #333;
    margin-bottom: 16px;
}

.crown {
    font-size: 18px;
}

.premium-header h2 {
    margin: 0;
    font-size: 24px;
    color: white;
    font-weight: 600;
}

.blocked-feature-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
}

.blocked-feature-card .feature-icon {
    font-size: 32px;
}

.blocked-feature-card .feature-info {
    flex: 1;
}

.blocked-feature-card .feature-info strong {
    display: block;
    color: white;
    font-size: 15px;
    margin-bottom: 4px;
}

.blocked-feature-card .feature-info p {
    margin: 0;
    color: #aaa;
    font-size: 13px;
}

.locked-badge {
    font-size: 24px;
}

.features-list {
    margin-bottom: 24px;
}

.features-list h3 {
    color: #888;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 16px 0;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-item:last-child {
    border-bottom: none;
}

.feature-item .feature-icon {
    font-size: 24px;
    width: 32px;
    text-align: center;
}

.feature-text {
    display: flex;
    flex-direction: column;
}

.feature-text strong {
    color: white;
    font-size: 14px;
}

.feature-text span {
    color: #888;
    font-size: 12px;
}

.pricing-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    margin-bottom: 20px;
}

.price-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    margin-bottom: 8px;
}

.price {
    display: flex;
    align-items: baseline;
    justify-content: center;
    color: white;
}

.currency {
    font-size: 20px;
    font-weight: 500;
    margin-right: 4px;
}

.amount {
    font-size: 56px;
    font-weight: 700;
    line-height: 1;
}

.cents {
    font-size: 24px;
    font-weight: 600;
}

.period {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    margin-left: 4px;
}

.price-note {
    margin: 12px 0 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
}

.referral-section {
    text-align: center;
}

.referral-divider {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}

.referral-divider::before,
.referral-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
}

.referral-divider span {
    padding: 0 16px;
    color: #666;
    font-size: 13px;
}

.referral-button {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    color: #ffd700;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
}

.referral-button:hover {
    background: rgba(255, 215, 0, 0.2);
    transform: translateY(-1px);
}

.referral-note {
    margin: 12px 0 0 0;
    color: #888;
    font-size: 12px;
}

/* Plans Container */
.plans-container {
    margin-bottom: 20px;
}

.plans-container h3 {
    color: #ccc;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 12px 0;
}

.plans-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.plan-card {
    position: relative;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
}

.plan-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
}

.plan-card.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
}

.plan-card.popular {
    border-color: #667eea;
}

.plan-card.popular.selected {
    border-color: #ffd700;
}

.popular-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 10px;
    white-space: nowrap;
}

.plan-name {
    color: #888;
    font-size: 13px;
    margin-bottom: 8px;
}

.plan-price {
    margin-bottom: 4px;
}

.price-value {
    color: white;
    font-size: 22px;
    font-weight: 700;
}

.price-period {
    color: #aaa;
    font-size: 12px;
}

.plan-monthly {
    color: #888;
    font-size: 11px;
    margin-bottom: 4px;
}

.plan-savings {
    background: rgba(56, 161, 105, 0.2);
    color: #38a169;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 6px;
    display: inline-block;
}

.plan-check {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 20px;
    height: 20px;
    background: #ffd700;
    color: #333;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
}

.payment-secure {
    text-align: center;
    color: #666;
    font-size: 12px;
    margin: 0;
}

.modal-footer {
    padding: 0 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.upgrade-button {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
    color: #333;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.upgrade-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
}

.upgrade-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.skip-button {
    background: none;
    border: none;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    padding: 8px;
}

.skip-button:hover {
    color: #888;
}

/* Back Button */
.back-button {
    background: none;
    border: none;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.back-button:hover {
    color: white;
}

/* Payment Step Styles */
.payment-step {
    text-align: center;
}

.payment-header {
    margin-bottom: 24px;
}

.pix-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #32BCAD;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 14px;
    color: white;
    margin-bottom: 16px;
}

.payment-header h2 {
    margin: 0 0 8px 0;
    font-size: 22px;
    color: white;
}

.payment-amount {
    font-size: 28px;
    font-weight: 700;
    color: #ffd700;
    margin: 0;
}

.pix-instructions {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
    text-align: left;
}

.instruction-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    color: #ccc;
    font-size: 14px;
}

.instruction-step:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.step-number {
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
}

.pix-code-container {
    margin-bottom: 20px;
}

.pix-code-container label {
    display: block;
    color: #888;
    font-size: 13px;
    margin-bottom: 8px;
    text-align: left;
}

.pix-code-box {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    max-height: 80px;
    overflow-y: auto;
}

.pix-code-box code {
    font-family: monospace;
    font-size: 11px;
    color: #32BCAD;
    word-break: break-all;
    line-height: 1.4;
}

.copy-button {
    width: 100%;
    padding: 14px;
    background: #32BCAD;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.copy-button:hover {
    background: #2aa89a;
    transform: translateY(-1px);
}

.payment-note {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.2);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 16px;
}

.payment-note p {
    margin: 0;
    color: #ccc;
    font-size: 13px;
    line-height: 1.5;
}

.payment-note p:not(:last-child) {
    margin-bottom: 4px;
}

.error-message {
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 10px;
    padding: 12px;
    margin-top: 16px;
    color: #ff6b6b;
    font-size: 14px;
    text-align: center;
}

.confirm-payment-button {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s;
}

.confirm-payment-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(56, 161, 105, 0.4);
}

.confirm-payment-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Success Step Styles */
.success-step {
    text-align: center;
    padding: 40px 24px;
}

.success-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.success-step h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #38a169;
}

.success-step>p {
    margin: 0 0 24px 0;
    color: #ccc;
    font-size: 16px;
}

.success-features {
    background: rgba(56, 161, 105, 0.1);
    border: 1px solid rgba(56, 161, 105, 0.3);
    border-radius: 12px;
    padding: 16px;
    text-align: left;
}

.success-features p {
    margin: 0;
    padding: 8px 0;
    color: #68d391;
    font-size: 14px;
}

.success-features p:not(:last-child) {
    border-bottom: 1px solid rgba(56, 161, 105, 0.2);
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

/* Dark Mode - Inverte para modal claro para criar contraste */
body.dark-mode .modal-content {
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

body.dark-mode .close-button {
    background: rgba(0, 0, 0, 0.08);
    color: #666;
}

body.dark-mode .close-button:hover {
    background: rgba(0, 0, 0, 0.15);
    color: #333;
}

body.dark-mode .premium-header h2 {
    color: #1a1a2e;
}

body.dark-mode .blocked-feature-card {
    background: rgba(255, 107, 107, 0.1);
    border-color: rgba(255, 107, 107, 0.25);
}

body.dark-mode .blocked-feature-card .feature-info strong {
    color: #333;
}

body.dark-mode .blocked-feature-card .feature-info p {
    color: #666;
}

body.dark-mode .features-list h3 {
    color: #666;
}

body.dark-mode .feature-text strong {
    color: #333;
}

body.dark-mode .feature-text span {
    color: #666;
}

body.dark-mode .feature-item {
    border-bottom-color: rgba(0, 0, 0, 0.08);
}

body.dark-mode .plans-container h3 {
    color: #888;
}

body.dark-mode .price-value {
    color: #333;
}

body.dark-mode .price-period {
    color: #666;
}

body.dark-mode .pricing-card {
    background: rgba(102, 126, 234, 0.08);
    border-color: rgba(102, 126, 234, 0.2);
}

body.dark-mode .price-label {
    color: #666;
}

body.dark-mode .price {
    color: #333;
}

body.dark-mode .price-note {
    color: #888;
}

body.dark-mode .referral-section {
    border-top-color: rgba(0, 0, 0, 0.1);
}

body.dark-mode .referral-divider span {
    background: #f5f5f5;
    color: #888;
}

body.dark-mode .referral-button {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.3);
    color: #667eea;
}

body.dark-mode .referral-button:hover {
    background: rgba(102, 126, 234, 0.15);
}

body.dark-mode .referral-note {
    color: #888;
}

body.dark-mode .skip-button {
    color: #666;
}

body.dark-mode .skip-button:hover {
    color: #333;
}

/* Payment Step - Dark Mode */
body.dark-mode .payment-header h2 {
    color: #333;
}

body.dark-mode .payment-amount {
    color: #333;
}

body.dark-mode .instruction-step span:last-child {
    color: #555;
}

body.dark-mode .pix-code-container label {
    color: #666;
}

body.dark-mode .pix-code-box {
    background: #f0f0f0;
    border-color: #ddd;
}

body.dark-mode .pix-code-box code {
    color: #333;
}

body.dark-mode .payment-note p {
    color: #666;
}

body.dark-mode .back-button {
    color: #666;
}

body.dark-mode .back-button:hover {
    color: #333;
}

/* Success Step - Dark Mode */
body.dark-mode .success-step>p {
    color: #666;
}

body.dark-mode .success-features {
    background: rgba(56, 161, 105, 0.08);
}

body.dark-mode .success-features p {
    color: #2f855a;
}

body.dark-mode .success-features p:not(:last-child) {
    border-bottom-color: rgba(56, 161, 105, 0.15);
}

body.dark-mode .error-message {
    background: rgba(255, 107, 107, 0.1);
}
</style>
