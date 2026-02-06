import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuthStore } from './auth'
import type { Subscription, Referral, SubscriptionPlan, UserProfile } from '@/types/budget'
import { PLAN_FEATURES, TERMS_VERSION } from '@/types/budget'
import { stripeService } from '@/services/StripeService'

// Interface para a assinatura do Stripe
interface StripeSubscription {
    id: string
    status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused'
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    priceId?: string
    interval?: string
}

export const useSubscriptionStore = defineStore('subscription', () => {
    const subscription = ref<Subscription | null>(null)
    const stripeSubscription = ref<StripeSubscription | null>(null)
    const referrals = ref<Referral[]>([])
    const sentInvites = ref<{ id: string; toEmail: string; sentAt: Date; status: string }[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const termsAccepted = ref(false)
    const termsAcceptedAt = ref<string | null>(null)

    // Cache local para status premium (evita flicker ao reabrir app)
    const loadCachedPremiumStatus = () => {
        try {
            const cached = localStorage.getItem('premiumStatus')
            if (cached) {
                const data = JSON.parse(cached)
                // Verifica se o cache não expirou (24 horas)
                if (data.timestamp && Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    if (data.stripeSubscription) {
                        stripeSubscription.value = data.stripeSubscription
                    }
                    if (data.subscription) {
                        subscription.value = {
                            ...data.subscription,
                            premiumStartDate: data.subscription.premiumStartDate ? new Date(data.subscription.premiumStartDate) : undefined,
                            premiumEndDate: data.subscription.premiumEndDate ? new Date(data.subscription.premiumEndDate) : undefined
                        }
                    }
                    console.log('📦 Loaded cached premium status:', data.isPremium ? 'Premium' : 'Free')
                    return true
                }
            }
        } catch (e) {
            console.error('Error loading cached premium status:', e)
        }
        return false
    }

    const savePremiumStatusToCache = () => {
        try {
            const cacheData = {
                isPremium: isPremium.value,
                stripeSubscription: stripeSubscription.value,
                subscription: subscription.value ? {
                    ...subscription.value,
                    premiumStartDate: subscription.value.premiumStartDate?.toISOString(),
                    premiumEndDate: subscription.value.premiumEndDate?.toISOString()
                } : null,
                timestamp: Date.now()
            }
            localStorage.setItem('premiumStatus', JSON.stringify(cacheData))
            console.log('💾 Saved premium status to cache:', cacheData.isPremium ? 'Premium' : 'Free')
        } catch (e) {
            console.error('Error saving premium status to cache:', e)
        }
    }

    // Inicializa com cache local
    loadCachedPremiumStatus()

    // Computed - verifica se é premium baseado no plano OU na assinatura Stripe ativa
    const isPremium = computed(() => {
        // Verifica status da assinatura Stripe primeiro
        if (stripeSubscription.value) {
            const activeStatuses = ['active', 'trialing']
            if (activeStatuses.includes(stripeSubscription.value.status)) {
                return true
            }
        }

        // Fallback para verificação do plano local
        if (!subscription.value) return false
        return subscription.value.plan === 'premium' || subscription.value.premiumMonths > 0
    })

    const currentPlan = computed((): SubscriptionPlan => {
        return isPremium.value ? 'premium' : 'free'
    })

    const features = computed(() => {
        return PLAN_FEATURES[currentPlan.value]
    })

    const canShare = computed(() => features.value.sharing)
    const canUseAutoNotifications = computed(() => features.value.autoNotifications)
    const maxBudgets = computed(() => features.value.maxBudgets)

    const activeReferralsCount = computed(() => {
        return referrals.value.filter(r => r.isActive).length
    })

    const referralCode = computed(() => subscription.value?.referralCode || '')

    const premiumDaysRemaining = computed(() => {
        if (!subscription.value?.premiumEndDate) return 0
        const end = new Date(subscription.value.premiumEndDate)
        const now = new Date()
        const diff = end.getTime() - now.getTime()
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    })

    const needsTermsAcceptance = computed(() => {
        return !termsAccepted.value
    })

    // Generate unique referral code
    const generateReferralCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    // Load subscription data
    const loadSubscription = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        loading.value = true
        error.value = null

        try {
            const userDocRef = doc(db, 'users', authStore.userId)
            const userDoc = await getDoc(userDocRef)

            if (userDoc.exists()) {
                const data = userDoc.data() as Partial<UserProfile> & {
                    stripeSubscription?: StripeSubscription
                    stripeCustomerId?: string
                }

                // Check terms acceptance
                termsAccepted.value = !!data.termsAcceptedAt && data.termsVersion === TERMS_VERSION
                termsAcceptedAt.value = data.termsAcceptedAt || null

                // Carrega stripeSubscription se existir
                if (data.stripeSubscription) {
                    stripeSubscription.value = data.stripeSubscription
                    console.log('📦 Stripe subscription loaded:', data.stripeSubscription.status)
                } else if (data.stripeCustomerId) {
                    // Tem customerId mas não tem subscription salva - sincroniza do Stripe
                    console.log('🔄 Syncing subscription from Stripe (has customerId but no subscription data)...')
                    try {
                        const syncResult = await stripeService.syncSubscription()
                        if (syncResult.subscription) {
                            stripeSubscription.value = syncResult.subscription
                            console.log('✅ Subscription synced:', syncResult.subscription.status)

                            // Recarrega o documento para pegar dados atualizados
                            const updatedDoc = await getDoc(userDocRef)
                            if (updatedDoc.exists()) {
                                const updatedData = updatedDoc.data()
                                if (updatedData?.subscription) {
                                    subscription.value = {
                                        ...updatedData.subscription,
                                        premiumStartDate: updatedData.subscription.premiumStartDate
                                            ? new Date(updatedData.subscription.premiumStartDate)
                                            : undefined,
                                        premiumEndDate: updatedData.subscription.premiumEndDate
                                            ? new Date(updatedData.subscription.premiumEndDate)
                                            : undefined
                                    }
                                }
                            }
                        }
                    } catch (syncErr) {
                        console.error('❌ Error syncing subscription:', syncErr)
                    }
                }

                if (data.subscription) {
                    subscription.value = {
                        ...data.subscription,
                        premiumStartDate: data.subscription.premiumStartDate ? new Date(data.subscription.premiumStartDate) : undefined,
                        premiumEndDate: data.subscription.premiumEndDate ? new Date(data.subscription.premiumEndDate) : undefined,
                        // Garante que sempre tenha um referralCode
                        referralCode: data.subscription.referralCode || generateReferralCode()
                    }
                    // Se gerou um novo referralCode, salva no Firebase
                    if (!data.subscription.referralCode) {
                        await saveSubscription()
                    }
                } else {
                    // Initialize default subscription
                    subscription.value = {
                        plan: 'free',
                        premiumMonths: 0,
                        referralCode: generateReferralCode(),
                        referralBonusMonths: 0
                    }
                    await saveSubscription()
                }
            }

            // Load referrals
            await loadReferrals()

            // Salva no cache local após carregar do Firebase
            savePremiumStatusToCache()
        } catch (err: any) {
            console.error('Erro ao carregar subscription:', err)
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    // Save subscription to Firestore
    const saveSubscription = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId || !subscription.value) return

        try {
            const userDocRef = doc(db, 'users', authStore.userId)
            await setDoc(userDocRef, {
                subscription: {
                    ...subscription.value,
                    premiumStartDate: subscription.value.premiumStartDate?.toISOString(),
                    premiumEndDate: subscription.value.premiumEndDate?.toISOString()
                },
                updatedAt: new Date().toISOString()
            }, { merge: true })

            // Atualiza cache local
            savePremiumStatusToCache()
        } catch (err: any) {
            console.error('Erro ao salvar subscription:', err)
            error.value = err.message
        }
    }

    // Accept terms of service
    const acceptTerms = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const userDocRef = doc(db, 'users', authStore.userId)
            await setDoc(userDocRef, {
                termsAcceptedAt: new Date().toISOString(),
                termsVersion: TERMS_VERSION,
                updatedAt: new Date().toISOString()
            }, { merge: true })

            termsAccepted.value = true
            termsAcceptedAt.value = new Date().toISOString()

            return { success: true }
        } catch (err: any) {
            console.error('Erro ao aceitar termos:', err)
            error.value = err.message
            return { success: false, error: err.message }
        }
    }

    // Load referrals
    const loadReferrals = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const referralsRef = collection(db, 'referrals')
            const q = query(referralsRef, where('referrerId', '==', authStore.userId))
            const snapshot = await getDocs(q)

            referrals.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as Referral[]
        } catch (err: any) {
            console.error('Erro ao carregar referrals:', err)
        }
    }

    // Load sent invites
    const loadSentInvites = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const sentInvitesRef = collection(db, 'users', authStore.userId, 'sentInvites')
            const snapshot = await getDocs(sentInvitesRef)

            sentInvites.value = snapshot.docs.map(doc => ({
                id: doc.id,
                toEmail: doc.data().toEmail,
                sentAt: doc.data().sentAt?.toDate() || new Date(),
                status: doc.data().status || 'sent'
            }))
            console.log('📧 Loaded sent invites:', sentInvites.value.length)
        } catch (err: any) {
            console.error('Erro ao carregar convites enviados:', err)
        }
    }

    // Apply referral code (when someone uses another user's code)
    const applyReferralCode = async (code: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId || !authStore.userEmail) {
            return { success: false, error: 'Usuário não autenticado' }
        }

        // Prevent self-referral
        if (subscription.value?.referralCode === code) {
            return { success: false, error: 'Você não pode usar seu próprio código' }
        }

        // Check if already has a referrer
        if (subscription.value?.referredBy) {
            return { success: false, error: 'Você já foi indicado por outro usuário' }
        }

        try {
            // Find user with this referral code
            const usersRef = collection(db, 'users')
            const q = query(usersRef, where('subscription.referralCode', '==', code.toUpperCase()))
            const snapshot = await getDocs(q)

            if (snapshot.empty || snapshot.docs.length === 0) {
                return { success: false, error: 'Código de indicação não encontrado' }
            }

            const referrerDoc = snapshot.docs[0]!
            const referrerId = referrerDoc.id

            // Prevent being referred by someone you referred
            const existingReferral = referrals.value.find(r => r.referredUserId === referrerId)
            if (existingReferral) {
                return { success: false, error: 'Não é possível usar este código' }
            }

            // Create referral record - starts as PENDING
            const referralRef = doc(collection(db, 'referrals'))

            await setDoc(referralRef, {
                referrerId,
                referredUserId: authStore.userId,
                referredUserEmail: authStore.userEmail,
                createdAt: new Date(),
                status: 'pending', // pending -> validated or expired
                isActive: false, // Will become true when validated
                validatedAt: null,
                bonusApplied: false,
                validationReason: null // 'usage_1month' or 'became_premium'
            })

            // Update current user's subscription
            subscription.value = {
                ...subscription.value!,
                referredBy: referrerId
            }
            await saveSubscription()

            return { success: true, message: 'Código aplicado com sucesso! Você e quem te indicou ganharão benefícios.' }
        } catch (err: any) {
            console.error('Erro ao aplicar código de indicação:', err)
            return { success: false, error: 'Erro ao aplicar código. Tente novamente.' }
        }
    }

    // Upgrade to premium (manual payment)
    const upgradeToPremium = async (months: number = 1) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return { success: false, error: 'Usuário não autenticado' }

        try {
            const now = new Date()
            const endDate = new Date(now)

            // If already has premium, extend from current end date
            if (subscription.value?.premiumEndDate && new Date(subscription.value.premiumEndDate) > now) {
                endDate.setTime(new Date(subscription.value.premiumEndDate).getTime())
            }

            endDate.setMonth(endDate.getMonth() + months)

            subscription.value = {
                ...subscription.value!,
                plan: 'premium',
                premiumMonths: months + (subscription.value?.premiumMonths || 0),
                premiumStartDate: subscription.value?.premiumStartDate || now,
                premiumEndDate: endDate
            }

            await saveSubscription()
            return { success: true }
        } catch (err: any) {
            console.error('Erro ao fazer upgrade:', err)
            return { success: false, error: err.message }
        }
    }

    // Add bonus months from referrals
    const addBonusMonths = async (months: number) => {
        if (!subscription.value) return

        const now = new Date()
        let endDate = subscription.value.premiumEndDate ? new Date(subscription.value.premiumEndDate) : new Date()

        if (endDate < now) {
            endDate = now
        }

        endDate.setMonth(endDate.getMonth() + months)

        subscription.value = {
            ...subscription.value,
            plan: 'premium',
            premiumMonths: (subscription.value.premiumMonths || 0) + months,
            referralBonusMonths: (subscription.value.referralBonusMonths || 0) + months,
            premiumStartDate: subscription.value.premiumStartDate || now,
            premiumEndDate: endDate
        }

        await saveSubscription()
    }

    // Check if feature is available
    const checkFeature = (feature: 'sharing' | 'autoNotifications' | 'maxBudgets'): boolean => {
        if (feature === 'maxBudgets') {
            return true // Always true, limit is checked separately
        }
        return features.value[feature] as boolean
    }

    // Check if can add more budgets
    const canAddBudget = (currentCount: number): boolean => {
        return currentCount < maxBudgets.value
    }

    // Get share link with referral code
    const getReferralLink = (): string => {
        if (!referralCode.value) return ''
        // This would be your app's URL in production
        return `https://budgetsystem.app/register?ref=${referralCode.value}`
    }

    // Copy referral code to clipboard
    const copyReferralCode = async (): Promise<boolean> => {
        if (!referralCode.value) return false

        try {
            await navigator.clipboard.writeText(referralCode.value)
            return true
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea')
            textArea.value = referralCode.value
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            return true
        }
    }

    // Sincroniza subscription diretamente do Stripe
    const syncFromStripe = async () => {
        loading.value = true
        try {
            console.log('🔄 Manual sync from Stripe...')
            const result = await stripeService.syncSubscription()

            if (result.subscription) {
                stripeSubscription.value = result.subscription
                console.log('✅ Synced from Stripe:', result.subscription.status)
            }

            // Recarrega todos os dados
            await loadSubscription()

            return result
        } catch (err: any) {
            console.error('❌ Error syncing from Stripe:', err)
            error.value = err.message
            return { isPremium: false, subscription: null }
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        subscription,
        stripeSubscription,
        referrals,
        sentInvites,
        loading,
        error,
        termsAccepted,
        termsAcceptedAt,

        // Computed
        isPremium,
        currentPlan,
        features,
        canShare,
        canUseAutoNotifications,
        maxBudgets,
        activeReferralsCount,
        referralCode,
        premiumDaysRemaining,
        needsTermsAcceptance,

        // Actions
        loadSubscription,
        saveSubscription,
        acceptTerms,
        loadReferrals,
        loadSentInvites,
        applyReferralCode,
        upgradeToPremium,
        addBonusMonths,
        checkFeature,
        canAddBudget,
        getReferralLink,
        copyReferralCode,
        syncFromStripe,
        clearPremiumCache: () => {
            localStorage.removeItem('premiumStatus')
            subscription.value = null
            stripeSubscription.value = null
            console.log('🗑️ Premium cache cleared')
        }
    }
})
