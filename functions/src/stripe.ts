import Stripe from "stripe";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicializa Stripe de forma lazy (só quando necessário)
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
    if (!stripeInstance) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY não configurada");
        }
        stripeInstance = new Stripe(secretKey, {
            apiVersion: "2025-02-24.acacia"
        });
    }
    return stripeInstance;
}

// Firestore também precisa ser lazy para evitar erros de inicialização
function getDb() {
    return admin.firestore();
}

// IDs dos preços no Stripe (configurar no Dashboard do Stripe)
export const PRICE_IDS = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_YEARLY || ""
};

/**
 * Cria ou obtém um cliente Stripe
 */
export async function createOrGetStripeCustomer(
    userId: string,
    email: string,
    name?: string
): Promise<string> {
    const stripe = getStripe();

    // Verifica se já existe um customerId
    const userDoc = await getDb().collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
        logger.info("Customer already exists", { customerId: userData.stripeCustomerId });
        return userData.stripeCustomerId;
    }

    // Cria novo customer no Stripe
    const customer = await stripe.customers.create({
        email,
        name: name || email,
        metadata: {
            firebaseUserId: userId
        }
    });

    // Salva o customerId no Firestore
    await getDb().collection("users").doc(userId).set({
        stripeCustomerId: customer.id,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info("Created new Stripe customer", {
        customerId: customer.id,
        userId,
        email
    });

    return customer.id;
}

/**
 * Cria uma sessão de checkout do Stripe
 */
export async function createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
    const stripe = getStripe();

    // Obtém ou cria o customer
    const customerId = await createOrGetStripeCustomer(userId, email);

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
            {
                price: priceId,
                quantity: 1
            }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            firebaseUserId: userId
        },
        subscription_data: {
            metadata: {
                firebaseUserId: userId
            }
        },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        locale: "pt-BR"
    });

    logger.info("Created checkout session", {
        sessionId: session.id,
        userId,
        priceId
    });

    return {
        sessionId: session.id,
        url: session.url!
    };
}

/**
 * Cria uma sessão do portal do cliente
 */
export async function createPortalSession(
    userId: string,
    returnUrl: string
): Promise<string> {
    const userDoc = await getDb().collection("users").doc(userId).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
        throw new Error("Customer not found");
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
    });

    return session.url;
}

/**
 * Processa eventos de webhook do Stripe
 */
export async function handleStripeWebhook(
    rawBody: Buffer,
    signature: string
): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error("Webhook secret not configured");
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
        logger.error("Webhook signature verification failed", { error: err.message });
        throw new Error(`Webhook Error: ${err.message}`);
    }

    logger.info("Processing webhook event", { type: event.type });

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutComplete(session);
            break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            await updateSubscriptionInFirestore(subscription);
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionCanceled(subscription);
            break;
        }

        case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            await handleInvoicePaid(invoice);
            break;
        }

        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            await handlePaymentFailed(invoice);
            break;
        }

        default:
            logger.info("Unhandled event type", { type: event.type });
    }
}

/**
 * Processa checkout completo
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.firebaseUserId;

    if (!userId) {
        logger.error("No userId in checkout session metadata");
        return;
    }

    logger.info("Checkout completed", {
        userId,
        subscriptionId: session.subscription
    });

    // Verifica se este usuário tem uma indicação pendente e valida
    await validatePendingReferral(userId, "became_premium");
}

/**
 * Valida uma indicação pendente e dá o bônus ao indicador
 * @param referredUserId - ID do usuário que foi indicado
 * @param reason - Motivo da validação: 'became_premium' ou 'usage_1month'
 */
async function validatePendingReferral(referredUserId: string, reason: "became_premium" | "usage_1month"): Promise<void> {
    try {
        // Busca indicação pendente deste usuário
        const referralsSnapshot = await getDb().collection("referrals")
            .where("referredUserId", "==", referredUserId)
            .where("status", "==", "pending")
            .limit(1)
            .get();

        if (referralsSnapshot.empty) {
            logger.info("No pending referral found for user", { referredUserId });
            return;
        }

        const referralDoc = referralsSnapshot.docs[0];
        const referral = referralDoc.data();
        const referrerId = referral.referrerId;

        logger.info("Validating referral", {
            referralId: referralDoc.id,
            referrerId,
            referredUserId,
            reason
        });

        // Atualiza a indicação como validada
        await referralDoc.ref.update({
            status: "validated",
            isActive: true,
            validatedAt: new Date().toISOString(),
            validationReason: reason,
            bonusApplied: true
        });

        // Dá o bônus de 1 mês ao indicador
        await applyReferralBonus(referrerId, referredUserId);

        logger.info("Referral validated successfully", {
            referralId: referralDoc.id,
            referrerId,
            reason
        });
    } catch (error) {
        logger.error("Error validating referral", { referredUserId, reason, error });
    }
}

/**
 * Aplica o bônus de 1 mês grátis ao indicador
 */
async function applyReferralBonus(referrerId: string, referredUserId: string): Promise<void> {
    const userDoc = await getDb().collection("users").doc(referrerId).get();

    if (!userDoc.exists) {
        logger.error("Referrer not found", { referrerId });
        return;
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription || {
        plan: "free",
        premiumMonths: 0,
        referralBonusMonths: 0
    };

    // Calcula nova data de término
    const now = new Date();
    let endDate = subscription.premiumEndDate
        ? new Date(subscription.premiumEndDate)
        : new Date();

    if (endDate < now) {
        endDate = now;
    }

    // Adiciona 1 mês
    endDate.setMonth(endDate.getMonth() + 1);

    // Atualiza subscription do indicador
    await getDb().collection("users").doc(referrerId).set({
        subscription: {
            plan: "premium",
            premiumMonths: (subscription.premiumMonths || 0) + 1,
            referralBonusMonths: (subscription.referralBonusMonths || 0) + 1,
            premiumEndDate: endDate.toISOString(),
            premiumStartDate: subscription.premiumStartDate || now.toISOString()
        },
        updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info("Referral bonus applied", {
        referrerId,
        referredUserId,
        newEndDate: endDate.toISOString()
    });

    // Busca dados do usuário indicado para a notificação
    const referredUserDoc = await getDb().collection("users").doc(referredUserId).get();
    const referredUserData = referredUserDoc.data();
    const referredEmail = referredUserData?.email || "um amigo";

    // Envia notificação push para o indicador
    const fcmToken = userData?.fcmToken;
    if (fcmToken) {
        try {
            const admin = await import("firebase-admin");
            await admin.default.messaging().send({
                token: fcmToken,
                notification: {
                    title: "🎁 Você ganhou 1 mês de Premium!",
                    body: `Sua indicação de ${referredEmail} foi validada! Aproveite seu mês grátis.`
                },
                data: {
                    type: "referral_bonus",
                    bonusMonths: "1"
                }
            });
            logger.info("Push notification sent to referrer", { referrerId });
        } catch (fcmError) {
            logger.error("Error sending push notification", { error: fcmError });
        }
    }
}

// Exporta para uso em outros módulos
export { validatePendingReferral, applyReferralBonus };

/**
 * Atualiza a assinatura no Firestore
 */
async function updateSubscriptionInFirestore(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.firebaseUserId;

    if (!userId) {
        // Tenta encontrar pelo customerId
        const customerId = subscription.customer as string;
        const usersSnapshot = await getDb().collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            logger.error("User not found for subscription", { customerId });
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        await updateUserSubscription(userDoc.id, subscription);
        return;
    }

    await updateUserSubscription(userId, subscription);
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
    const priceId = subscription.items.data[0]?.price.id;
    const interval = subscription.items.data[0]?.price.recurring?.interval;

    const isActive = ["active", "trialing"].includes(subscription.status);

    await getDb().collection("users").doc(userId).set({
        stripeSubscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            priceId,
            interval
        },
        subscription: {
            plan: isActive ? "premium" : "free",
            premiumMonths: 0, // Stripe gerencia o período
            premiumStartDate: new Date(subscription.current_period_start * 1000).toISOString(),
            premiumEndDate: new Date(subscription.current_period_end * 1000).toISOString()
        },
        updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info("Updated user subscription", {
        userId,
        status: subscription.status,
        isActive
    });
}

/**
 * Processa cancelamento de assinatura
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const usersSnapshot = await getDb().collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        logger.error("User not found for canceled subscription", { customerId });
        return;
    }

    const userId = usersSnapshot.docs[0].id;

    await getDb().collection("users").doc(userId).set({
        stripeSubscription: {
            id: subscription.id,
            status: "canceled",
            canceledAt: new Date().toISOString()
        },
        subscription: {
            plan: "free",
            premiumMonths: 0
        },
        updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info("Subscription canceled", { userId });
}

/**
 * Processa pagamento de fatura
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    logger.info("Invoice paid", {
        invoiceId: invoice.id,
        customerId,
        amount: invoice.amount_paid
    });

    // Podemos enviar email de confirmação aqui se necessário
}

/**
 * Processa falha no pagamento
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const usersSnapshot = await getDb().collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();

    if (!usersSnapshot.empty) {
        const userId = usersSnapshot.docs[0].id;

        logger.warn("Payment failed", {
            userId,
            invoiceId: invoice.id,
            attemptCount: invoice.attempt_count
        });

        // Podemos enviar email de aviso aqui se necessário
    }
}

/**
 * Obtém a assinatura atual do Stripe
 */
export async function getStripeSubscription(userId: string): Promise<Stripe.Subscription | null> {
    const userDoc = await getDb().collection("users").doc(userId).get();
    const subscriptionId = userDoc.data()?.stripeSubscription?.id;

    if (!subscriptionId) return null;

    const stripe = getStripe();
    try {
        return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
        logger.error("Error retrieving subscription", { subscriptionId, error });
        return null;
    }
}

/**
 * Cancela a assinatura ao final do período
 */
export async function cancelSubscriptionAtPeriodEnd(userId: string): Promise<boolean> {
    const userDoc = await getDb().collection("users").doc(userId).get();
    const subscriptionId = userDoc.data()?.stripeSubscription?.id;

    if (!subscriptionId) {
        throw new Error("No subscription found");
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
    });

    logger.info("Subscription set to cancel at period end", { userId, subscriptionId });
    return true;
}

/**
 * Reativa assinatura que estava marcada para cancelar
 */
export async function reactivateSubscription(userId: string): Promise<boolean> {
    const userDoc = await getDb().collection("users").doc(userId).get();
    const subscriptionId = userDoc.data()?.stripeSubscription?.id;

    if (!subscriptionId) {
        throw new Error("No subscription found");
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
    });

    logger.info("Subscription reactivated", { userId, subscriptionId });
    return true;
}

/**
 * Sincroniza o status da assinatura do Stripe com o Firestore
 * Busca pelo stripeCustomerId e atualiza os dados da assinatura
 */
export async function syncSubscriptionStatus(userId: string): Promise<{
    isPremium: boolean;
    subscription: any | null;
}> {
    const userDoc = await getDb().collection("users").doc(userId).get();

    if (!userDoc.exists) {
        throw new Error("User not found");
    }

    const userData = userDoc.data();
    const customerId = userData?.stripeCustomerId;

    if (!customerId) {
        logger.info("No Stripe customer for user", { userId });
        return { isPremium: false, subscription: null };
    }

    const stripe = getStripe();

    // Busca assinaturas ativas do cliente
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
        expand: ["data.default_payment_method"]
    });

    if (subscriptions.data.length === 0) {
        logger.info("No subscriptions found for customer", { userId, customerId });

        // Limpa dados de assinatura se não houver nenhuma
        await getDb().collection("users").doc(userId).set({
            stripeSubscription: null,
            subscription: {
                plan: "free",
                premiumMonths: 0
            },
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { isPremium: false, subscription: null };
    }

    const subscription = subscriptions.data[0];
    const isActive = ["active", "trialing"].includes(subscription.status);
    const priceId = subscription.items.data[0]?.price.id;
    const interval = subscription.items.data[0]?.price.recurring?.interval;

    // Atualiza no Firestore
    const stripeSubscription = {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId,
        interval
    };

    await getDb().collection("users").doc(userId).set({
        stripeSubscription,
        subscription: {
            plan: isActive ? "premium" : "free",
            premiumMonths: 0,
            premiumStartDate: new Date(subscription.current_period_start * 1000).toISOString(),
            premiumEndDate: new Date(subscription.current_period_end * 1000).toISOString()
        },
        updatedAt: new Date().toISOString()
    }, { merge: true });

    logger.info("Subscription synced", {
        userId,
        status: subscription.status,
        isActive
    });

    return {
        isPremium: isActive,
        subscription: stripeSubscription
    };
}
