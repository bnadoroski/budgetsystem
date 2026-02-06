import { db } from '@/config/firebase'
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/services/LoggerService'
import { Capacitor } from '@capacitor/core'

// Preços dos planos (em centavos para Stripe)
export const STRIPE_PRICES = {
    monthly: {
        id: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
        amount: 1990, // R$ 19,90
        interval: 'month' as const,
        label: 'Mensal',
        description: 'R$ 19,90/mês',
        savings: null
    },
    yearly: {
        id: import.meta.env.VITE_STRIPE_PRICE_YEARLY || '',
        amount: 15900, // R$ 159,00 (equivalente a R$ 13,25/mês)
        interval: 'year' as const,
        label: 'Anual',
        description: 'R$ 159,00/ano',
        savings: '33% de desconto'
    }
}

export type PlanInterval = 'monthly' | 'yearly'

export interface StripeCheckoutSession {
    id: string
    url: string
    status: 'open' | 'complete' | 'expired'
}

export interface StripeSubscription {
    id: string
    status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete'
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    priceId: string
    interval: 'month' | 'year'
}

export interface StripeCustomer {
    id: string
    email: string
}

/**
 * Gera a URL de retorno adequada para web ou app nativo
 * Para app nativo, usa https://budgetsystem.app que é interceptado pelo Capacitor
 */
function getReturnUrl(path: string): string {
    if (Capacitor.isNativePlatform()) {
        // No app nativo, usa o hostname configurado no Capacitor
        // Isso será interceptado pelo app e não abrirá no browser
        return `https://budgetsystem.app${path}`
    }
    // Na web, usa a origem atual
    return `${window.location.origin}${path}`
}

class StripeService {
    private stripeCustomerId: string | null = null
    private subscriptionListener: Unsubscribe | null = null

    /**
     * Obtém ou cria um cliente Stripe para o usuário atual
     */
    async getOrCreateCustomer(): Promise<string | null> {
        const authStore = useAuthStore()
        if (!authStore.userId || !authStore.userEmail) {
            logger.warn('User not authenticated', 'StripeService.getOrCreateCustomer')
            return null
        }

        try {
            // Verifica se já existe um customerId no Firestore
            const userDoc = await getDoc(doc(db, 'users', authStore.userId))
            const userData = userDoc.data()

            if (userData?.stripeCustomerId) {
                this.stripeCustomerId = userData.stripeCustomerId
                return this.stripeCustomerId
            }

            // Cria um novo customer via Cloud Function
            const response = await fetch(
                `${import.meta.env.VITE_FUNCTIONS_URL}/createStripeCustomer`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: authStore.userId,
                        email: authStore.userEmail,
                        name: authStore.user?.displayName || authStore.userEmail
                    })
                }
            )

            const data = await response.json()

            if (data.success && data.customerId) {
                this.stripeCustomerId = data.customerId
                logger.info('Stripe customer created', 'StripeService.getOrCreateCustomer', {
                    customerId: data.customerId
                })
                return this.stripeCustomerId
            }

            throw new Error(data.error || 'Failed to create customer')
        } catch (error) {
            logger.error('Error getting/creating Stripe customer', 'StripeService.getOrCreateCustomer', undefined, error as Error)
            throw error
        }
    }

    /**
     * Cria uma sessão de checkout do Stripe
     */
    async createCheckoutSession(planInterval: PlanInterval): Promise<StripeCheckoutSession> {
        const authStore = useAuthStore()
        if (!authStore.userId) {
            throw new Error('User not authenticated')
        }

        const plan = STRIPE_PRICES[planInterval]
        logger.info('Creating checkout session', 'StripeService.createCheckoutSession', {
            planInterval,
            priceId: plan.id
        })

        try {
            const response = await fetch(
                `${import.meta.env.VITE_FUNCTIONS_URL}/createStripeCheckout`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: authStore.userId,
                        userEmail: authStore.userEmail,
                        priceId: plan.id,
                        planInterval,
                        successUrl: getReturnUrl('/?payment=success'),
                        cancelUrl: getReturnUrl('/?payment=canceled')
                    })
                }
            )

            const data = await response.json()

            if (data.success && data.sessionId && data.url) {
                logger.info('Checkout session created', 'StripeService.createCheckoutSession', {
                    sessionId: data.sessionId
                })
                return {
                    id: data.sessionId,
                    url: data.url,
                    status: 'open'
                }
            }

            throw new Error(data.error || 'Failed to create checkout session')
        } catch (error) {
            logger.error('Error creating checkout session', 'StripeService.createCheckoutSession', undefined, error as Error)
            throw error
        }
    }

    /**
     * Redireciona para o checkout do Stripe
     */
    async redirectToCheckout(planInterval: PlanInterval): Promise<void> {
        const session = await this.createCheckoutSession(planInterval)
        window.location.href = session.url
    }

    /**
     * Abre o portal do cliente Stripe (para gerenciar assinatura)
     */
    async openCustomerPortal(): Promise<void> {
        const authStore = useAuthStore()
        if (!authStore.userId) {
            throw new Error('User not authenticated')
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_FUNCTIONS_URL}/createStripePortalSession`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: authStore.userId,
                        returnUrl: window.location.origin
                    })
                }
            )

            const data = await response.json()

            if (data.success && data.url) {
                window.location.href = data.url
            } else {
                throw new Error(data.error || 'Failed to create portal session')
            }
        } catch (error) {
            logger.error('Error opening customer portal', 'StripeService.openCustomerPortal', undefined, error as Error)
            throw error
        }
    }

    /**
     * Obtém a assinatura atual do usuário
     */
    async getCurrentSubscription(): Promise<StripeSubscription | null> {
        const authStore = useAuthStore()
        if (!authStore.userId) return null

        try {
            const userDoc = await getDoc(doc(db, 'users', authStore.userId))
            const userData = userDoc.data()

            if (!userData?.stripeSubscription) return null

            return {
                id: userData.stripeSubscription.id,
                status: userData.stripeSubscription.status,
                currentPeriodStart: new Date(userData.stripeSubscription.currentPeriodStart),
                currentPeriodEnd: new Date(userData.stripeSubscription.currentPeriodEnd),
                cancelAtPeriodEnd: userData.stripeSubscription.cancelAtPeriodEnd || false,
                priceId: userData.stripeSubscription.priceId,
                interval: userData.stripeSubscription.interval
            }
        } catch (error) {
            logger.error('Error getting subscription', 'StripeService.getCurrentSubscription', undefined, error as Error)
            return null
        }
    }

    /**
     * Inicia listener para mudanças na assinatura
     */
    startSubscriptionListener(callback: (subscription: StripeSubscription | null) => void): void {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        this.stopSubscriptionListener()

        this.subscriptionListener = onSnapshot(
            doc(db, 'users', authStore.userId),
            (snapshot) => {
                const data = snapshot.data()
                if (data?.stripeSubscription) {
                    callback({
                        id: data.stripeSubscription.id,
                        status: data.stripeSubscription.status,
                        currentPeriodStart: new Date(data.stripeSubscription.currentPeriodStart),
                        currentPeriodEnd: new Date(data.stripeSubscription.currentPeriodEnd),
                        cancelAtPeriodEnd: data.stripeSubscription.cancelAtPeriodEnd || false,
                        priceId: data.stripeSubscription.priceId,
                        interval: data.stripeSubscription.interval
                    })
                } else {
                    callback(null)
                }
            },
            (error) => {
                logger.error('Subscription listener error', 'StripeService.subscriptionListener', undefined, error)
            }
        )
    }

    /**
     * Para o listener de assinatura
     */
    stopSubscriptionListener(): void {
        if (this.subscriptionListener) {
            this.subscriptionListener()
            this.subscriptionListener = null
        }
    }

    /**
     * Sincroniza status da assinatura diretamente do Stripe
     * Útil quando o webhook falha ou para verificar estado atual
     */
    async syncSubscription(): Promise<{ isPremium: boolean; subscription: any | null }> {
        const authStore = useAuthStore()
        if (!authStore.userId) {
            logger.warn('User not authenticated', 'StripeService.syncSubscription')
            return { isPremium: false, subscription: null }
        }

        try {
            logger.info('Syncing subscription from Stripe', 'StripeService.syncSubscription')

            const response = await fetch(
                `${import.meta.env.VITE_FUNCTIONS_URL}/syncStripeSubscription`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: authStore.userId })
                }
            )

            const data = await response.json()

            if (data.success) {
                logger.info('Subscription synced', 'StripeService.syncSubscription', {
                    isPremium: data.isPremium,
                    status: data.subscription?.status
                })
                return {
                    isPremium: data.isPremium,
                    subscription: data.subscription
                }
            }

            throw new Error(data.error || 'Failed to sync subscription')
        } catch (error) {
            logger.error('Error syncing subscription', 'StripeService.syncSubscription', undefined, error as Error)
            return { isPremium: false, subscription: null }
        }
    }

    /**
     * Verifica se a assinatura está ativa
     */
    isSubscriptionActive(subscription: StripeSubscription | null): boolean {
        if (!subscription) return false
        return ['active', 'trialing'].includes(subscription.status)
    }

    /**
     * Calcula dias restantes da assinatura
     */
    getDaysRemaining(subscription: StripeSubscription | null): number {
        if (!subscription) return 0
        const now = new Date()
        const end = subscription.currentPeriodEnd
        const diff = end.getTime() - now.getTime()
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }
}

// Singleton
export const stripeService = new StripeService()

// Composable para uso em componentes Vue
export function useStripe() {
    return {
        prices: STRIPE_PRICES,
        getOrCreateCustomer: stripeService.getOrCreateCustomer.bind(stripeService),
        createCheckoutSession: stripeService.createCheckoutSession.bind(stripeService),
        redirectToCheckout: stripeService.redirectToCheckout.bind(stripeService),
        openCustomerPortal: stripeService.openCustomerPortal.bind(stripeService),
        getCurrentSubscription: stripeService.getCurrentSubscription.bind(stripeService),
        startSubscriptionListener: stripeService.startSubscriptionListener.bind(stripeService),
        stopSubscriptionListener: stripeService.stopSubscriptionListener.bind(stripeService),
        isSubscriptionActive: stripeService.isSubscriptionActive.bind(stripeService),
        getDaysRemaining: stripeService.getDaysRemaining.bind(stripeService),
        syncSubscription: stripeService.syncSubscription.bind(stripeService)
    }
}

export default stripeService
