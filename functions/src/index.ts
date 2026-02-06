import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { sendEmail, verifyConnection, EMAIL_CONFIG } from "./email";
import {
    createOrGetStripeCustomer,
    createCheckoutSession,
    createPortalSession,
    handleStripeWebhook,
    cancelSubscriptionAtPeriodEnd,
    reactivateSubscription,
    syncSubscriptionStatus
} from "./stripe";

// Initialize Firebase Admin
admin.initializeApp();

// Define secrets for Stripe
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const stripePriceMonthly = defineSecret("STRIPE_PRICE_MONTHLY");
const stripePriceYearly = defineSecret("STRIPE_PRICE_YEARLY");

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Cloud Function que recebe notificações bancárias e envia via FCM
 * POST /sendExpenseNotification
 * Body: { userId, amount, bank, description, category }
 */
export const sendExpenseNotification = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { userId, amount, bank, description, category } = req.body;

        logger.info("Received expense notification", {
            userId,
            amount,
            bank,
            description,
            category,
        });

        if (!userId || !amount) {
            res.status(400).send("Missing required fields: userId, amount");
            return;
        }

        // Get user's FCM token from Firestore
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
            logger.warn("FCM token not found for user", { userId });
            res.status(404).send("FCM token not found");
            return;
        }

        // Send notification via FCM
        const message = {
            token: fcmToken,
            notification: {
                title: `Nova despesa: R$ ${amount}`,
                body: `${bank} - ${description || "Sem descrição"}`,
            },
            data: {
                type: "expense",
                amount: amount.toString(),
                bank: bank || "",
                description: description || "",
                category: category || "",
            },
        };

        await admin.messaging().send(message);

        logger.info("Notification sent successfully", { userId, amount });
        res.status(200).json({
            success: true,
            message: "Notification sent successfully",
        });
    } catch (error) {
        logger.error("Error sending notification", error);
        res.status(500).send(`Error sending notification: ${error}`);
    }
});

/**
 * Cloud Function para enviar notificações de convites
 * POST /sendInviteNotification
 * Body: { inviteId, fromUserId, fromUserEmail, toUserEmail,
 *         type: 'new_invite' | 'invite_accepted' | 'invite_rejected' }
 */
export const sendInviteNotification = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { inviteId, fromUserId, fromUserEmail, toUserEmail,
            toUserId, type, budgetCount } = req.body;

        logger.info("Received invite notification", {
            inviteId,
            fromUserEmail,
            toUserEmail,
            type,
        });

        if (!inviteId || !type || !fromUserEmail || !toUserEmail) {
            res.status(400).send("Missing required fields");
            return;
        }

        // Prepara mensagem baseada no tipo
        let notificationTitle = "";
        let notificationBody = "";
        const notificationData: { [key: string]: string } = {
            type: "invite",
            inviteId,
            fromUserEmail,
        };

        if (type === "new_invite") {
            notificationTitle = "📬 Novo convite de orçamento";
            notificationBody =
                `${fromUserEmail} convidou você para compartilhar ` +
                `${budgetCount || "um"} orçamento(s)`;
            notificationData.action = "view_invite";

            // Envia push notification se o destinatário tiver FCM token
            logger.info("Processing new_invite", { toUserId, toUserEmail });

            if (toUserId) {
                logger.info("toUserId found, fetching user document", { toUserId });
                const toUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(toUserId)
                    .get();

                const userData = toUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                logger.info("User document fetched", {
                    exists: toUserDoc.exists,
                    hasToken: !!fcmToken,
                    notificationsEnabled,
                    tokenPrefix: fcmToken ? fcmToken.substring(0, 20) + "..." : "none"
                });

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        toUserId,
                        toUserEmail
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    try {
                        await admin.messaging().send(message);
                        logger.info("Push notification sent to recipient", { toUserId });
                    } catch (fcmError: any) {
                        logger.error("FCM send failed", {
                            error: fcmError.message,
                            code: fcmError.code,
                            toUserId
                        });
                    }
                } else {
                    logger.warn("No FCM token for recipient", { toUserId, toUserEmail });
                }
            } else {
                logger.warn("No toUserId provided, cannot send push", { toUserEmail });
            }

            // Envia email para o destinatário com link do app/Play Store
            try {
                await sendEmail(toUserEmail, "share_invite", {
                    inviterName: fromUserEmail.split("@")[0],
                    inviterEmail: fromUserEmail,
                    budgetCount: budgetCount || 1,
                    playStoreUrl: EMAIL_CONFIG.playStoreUrl,
                });
                logger.info("Email sent to recipient", { toUserEmail });
            } catch (emailError) {
                logger.error("Failed to send invite email", { toUserEmail, error: emailError });
            }
        } else if (type === "invite_accepted") {
            notificationTitle = "✅ Convite aceito!";
            notificationBody =
                `${toUserEmail} aceitou seu convite de compartilhamento`;
            notificationData.action = "refresh_budgets";

            // Envia push notification para quem enviou o convite
            if (fromUserId) {
                const fromUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(fromUserId)
                    .get();

                const userData = fromUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        fromUserId
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    await admin.messaging().send(message);
                    logger.info("Push notification sent to sender", { fromUserId });
                }
            }

            // Envia email para quem enviou o convite
            try {
                await sendEmail(fromUserEmail, "invite_accepted", {
                    invitedName: toUserEmail.split("@")[0],
                    invitedEmail: toUserEmail,
                });
                logger.info("Email sent to sender about acceptance", { fromUserEmail });
            } catch (emailError) {
                logger.error("Failed to send acceptance email", { fromUserEmail, error: emailError });
            }
        } else if (type === "invite_rejected") {
            notificationTitle = "❌ Convite recusado";
            notificationBody =
                `${toUserEmail} recusou seu convite de compartilhamento`;
            notificationData.action = "refresh_invites";

            // Envia push notification para quem enviou o convite
            if (fromUserId) {
                const fromUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(fromUserId)
                    .get();

                const userData = fromUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        fromUserId
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    await admin.messaging().send(message);
                    logger.info("Push notification sent to sender", { fromUserId });
                }
            }

            // Envia email para quem enviou o convite
            try {
                await sendEmail(fromUserEmail, "invite_rejected", {
                    invitedName: toUserEmail.split("@")[0],
                    invitedEmail: toUserEmail,
                });
                logger.info("Email sent to sender about rejection", { fromUserEmail });
            } catch (emailError) {
                logger.error("Failed to send rejection email", { fromUserEmail, error: emailError });
            }
        }

        logger.info("Invite notification processed successfully", { type, inviteId });
        res.status(200).json({
            success: true,
            message: "Invite notification processed successfully",
        });
    } catch (error) {
        logger.error("Error sending invite notification", error);
        res.status(500).send(`Error sending invite notification: ${error}`);
    }
});

/**
 * Cloud Function schedulada para notificar usuários inativos com despesas pendentes
 * Executa diariamente às 10h (horário de Brasília = 13h UTC)
 */
export const checkInactiveUsersWithPendingExpenses = onSchedule({
    schedule: "0 13 * * *", // Todo dia às 13h UTC (10h BRT)
    timeZone: "America/Sao_Paulo",
    retryCount: 3,
}, async () => {
    logger.info("🔔 Iniciando verificação de usuários inativos...");

    try {
        const db = admin.firestore();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        logger.info("📅 Buscando usuários inativos desde:", sevenDaysAgo.toISOString());

        // Busca todos os usuários
        const usersSnapshot = await db.collection("users").get();

        let notificationsSent = 0;
        let usersChecked = 0;

        for (const userDoc of usersSnapshot.docs) {
            usersChecked++;
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Verifica se tem FCM token e notificações habilitadas
            if (!userData.fcmToken) {
                continue;
            }

            // Se notificações desabilitadas, pula
            if (userData.notificationsEnabled === false) {
                continue;
            }

            // Verifica se está inativo há mais de 7 dias
            const lastActiveAt = userData.lastActiveAt ?
                new Date(userData.lastActiveAt) : null;

            if (!lastActiveAt || lastActiveAt > sevenDaysAgo) {
                // Usuário ativo recentemente, pula
                continue;
            }

            // Verifica se tem despesas pendentes
            try {
                const pendingDoc = await db
                    .collection("users")
                    .doc(userId)
                    .collection("data")
                    .doc("pendingExpenses")
                    .get();

                if (!pendingDoc.exists) {
                    continue;
                }

                const pendingData = pendingDoc.data();
                const expenses = pendingData?.expenses || [];

                if (expenses.length === 0) {
                    continue;
                }

                // Usuário inativo com despesas pendentes - envia notificação!
                logger.info("📤 Enviando notificação para usuário inativo:", {
                    userId,
                    lastActiveAt: lastActiveAt.toISOString(),
                    pendingExpensesCount: expenses.length,
                });

                const message = {
                    token: userData.fcmToken,
                    notification: {
                        title: "💰 Você tem despesas pendentes!",
                        body: `Você tem ${expenses.length} despesa(s) aguardando aprovação. ` +
                            `Abra o app para categorizar seus gastos.`,
                    },
                    data: {
                        type: "pending_expenses_reminder",
                        count: expenses.length.toString(),
                    },
                };

                try {
                    await admin.messaging().send(message);
                    notificationsSent++;
                    logger.info("✅ Notificação enviada para:", userId);
                } catch (fcmError: any) {
                    logger.error("❌ Erro ao enviar FCM:", {
                        userId,
                        error: fcmError.message,
                    });
                }
            } catch (pendingError) {
                logger.error("Erro ao verificar pendingExpenses:", {
                    userId,
                    error: pendingError,
                });
            }
        }

        logger.info("🏁 Verificação concluída:", {
            usersChecked,
            notificationsSent,
        });
    } catch (error) {
        logger.error("❌ Erro na verificação de usuários inativos:", error);
        throw error;
    }
});
/**
 * Cloud Function schedulada para verificar indicações PENDENTES e validá-las
 * Executa no dia 1 de cada mês às 3h (horário de Brasília = 6h UTC)
 * 
 * Nova lógica:
 * - Indicações começam como "pending"
 * - Após 1 mês de uso ativo OU se viraram premium → "validated" (bônus único)
 * - Se não usou por 1 mês e não virou premium → "expired" (sem bônus)
 */
export const processMonthlyReferralBonuses = onSchedule({
    schedule: "0 6 1 * *", // Dia 1 de cada mês às 6h UTC (3h BRT)
    timeZone: "America/Sao_Paulo",
    retryCount: 3,
}, async () => {
    logger.info("🎁 Iniciando processamento de indicações pendentes...");

    try {
        const db = admin.firestore();
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        logger.info("📅 Data de corte para validação:", oneMonthAgo.toISOString());

        // Busca apenas indicações PENDENTES
        const pendingReferralsSnapshot = await db.collection("referrals")
            .where("status", "==", "pending")
            .get();

        logger.info(`📋 Encontradas ${pendingReferralsSnapshot.size} indicações pendentes`);

        let validated = 0;
        let expired = 0;

        for (const referralDoc of pendingReferralsSnapshot.docs) {
            const referral = referralDoc.data();
            const createdAt = referral.createdAt?.toDate?.() || new Date(referral.createdAt);

            // Só processa se passou pelo menos 1 mês desde o cadastro
            if (createdAt > oneMonthAgo) {
                logger.info("⏳ Indicação ainda não completou 1 mês, pulando", {
                    referralId: referralDoc.id,
                    createdAt: createdAt.toISOString()
                });
                continue;
            }

            // Verifica dados do usuário indicado
            const referredUserDoc = await db
                .collection("users")
                .doc(referral.referredUserId)
                .get();

            if (!referredUserDoc.exists) {
                // Usuário não existe mais, marca como expirado
                await referralDoc.ref.update({
                    status: "expired",
                    isActive: false,
                    expiredAt: now.toISOString(),
                    expiredReason: "user_deleted"
                });
                expired++;
                continue;
            }

            const referredUserData = referredUserDoc.data();

            // Verifica se o usuário indicado virou premium
            const isPremium = referredUserData?.subscription?.plan === "premium" ||
                referredUserData?.stripeSubscription?.status === "active";

            // Verifica se o usuário usou ativamente por 1 mês
            const lastActiveAt = referredUserData?.lastActiveAt;
            let usedActivelyFor1Month = false;

            if (lastActiveAt) {
                const lastActiveDate = new Date(lastActiveAt);
                // Considera ativo se usou o app no último mês
                usedActivelyFor1Month = lastActiveDate >= oneMonthAgo;
            }

            // Também verifica daysActive se disponível
            const daysActive = referredUserData?.daysActive || 0;
            if (daysActive >= 7) {
                // Se usou pelo menos 7 dias diferentes, considera ativo
                usedActivelyFor1Month = true;
            }

            logger.info("📊 Análise da indicação:", {
                referralId: referralDoc.id,
                referredUserId: referral.referredUserId,
                isPremium,
                usedActivelyFor1Month,
                daysActive,
                lastActiveAt
            });

            if (isPremium || usedActivelyFor1Month) {
                // VALIDA a indicação e dá o bônus
                const validationReason = isPremium ? "became_premium" : "usage_1month";

                await referralDoc.ref.update({
                    status: "validated",
                    isActive: true,
                    validatedAt: now.toISOString(),
                    validationReason,
                    bonusApplied: true
                });

                // Aplica o bônus ao indicador
                await applyReferralBonusFromIndex(db, referral.referrerId, referral.referredUserId, referredUserData?.email);

                validated++;
                logger.info("✅ Indicação validada:", {
                    referralId: referralDoc.id,
                    reason: validationReason
                });
            } else {
                // Marca como EXPIRADO (não validou)
                await referralDoc.ref.update({
                    status: "expired",
                    isActive: false,
                    expiredAt: now.toISOString(),
                    expiredReason: "inactive_user"
                });
                expired++;
                logger.info("❌ Indicação expirada:", {
                    referralId: referralDoc.id,
                    reason: "inactive_user"
                });
            }
        }

        logger.info("🏁 Processamento de indicações concluído:", {
            total: pendingReferralsSnapshot.size,
            validated,
            expired
        });
    } catch (error) {
        logger.error("❌ Erro no processamento de indicações:", error);
        throw error;
    }
});

/**
 * Aplica o bônus de 1 mês grátis ao indicador (versão para index.ts)
 */
async function applyReferralBonusFromIndex(
    db: FirebaseFirestore.Firestore,
    referrerId: string,
    referredUserId: string,
    referredEmail?: string
): Promise<void> {
    const userDoc = await db.collection("users").doc(referrerId).get();

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
    await db.collection("users").doc(referrerId).set({
        subscription: {
            plan: "premium",
            premiumMonths: (subscription.premiumMonths || 0) + 1,
            referralBonusMonths: (subscription.referralBonusMonths || 0) + 1,
            premiumEndDate: endDate.toISOString(),
            premiumStartDate: subscription.premiumStartDate || now.toISOString()
        },
        updatedAt: now.toISOString()
    }, { merge: true });

    logger.info("🎁 Bônus de indicação aplicado:", {
        referrerId,
        referredUserId,
        newEndDate: endDate.toISOString()
    });

    // Envia notificação push para o indicador
    const fcmToken = userData?.fcmToken;
    if (fcmToken) {
        try {
            await admin.messaging().send({
                token: fcmToken,
                notification: {
                    title: "🎁 Você ganhou 1 mês de Premium!",
                    body: `Sua indicação de ${referredEmail || "um amigo"} foi validada! Aproveite seu mês grátis.`
                },
                data: {
                    type: "referral_bonus",
                    bonusMonths: "1"
                }
            });
            logger.info("📤 Notificação de bônus enviada:", { referrerId });
        } catch (fcmError) {
            logger.error("❌ Erro ao enviar notificação de bônus:", fcmError);
        }
    }

    // Envia email de bônus
    if (userData?.email) {
        try {
            await sendEmail(userData.email, "referral_bonus", {
                userName: userData.displayName || userData.email.split("@")[0],
                bonusMonths: 1,
                referralCount: 1
            });
            logger.info("📧 Email de bônus enviado:", { email: userData.email });
        } catch (emailError) {
            logger.error("❌ Erro ao enviar email de bônus:", emailError);
        }
    }
}

/**
 * Cloud Function schedulada para verificar assinaturas premium expiradas
 * Executa diariamente às 4h (horário de Brasília = 7h UTC)
 */
export const checkExpiredSubscriptions = onSchedule({
    schedule: "0 7 * * *", // Todo dia às 7h UTC (4h BRT)
    timeZone: "America/Sao_Paulo",
    retryCount: 3,
}, async () => {
    logger.info("🔄 Verificando assinaturas expiradas...");

    try {
        const db = admin.firestore();
        const now = new Date();

        // Busca usuários com subscription premium
        const usersSnapshot = await db.collection("users")
            .where("subscription.plan", "==", "premium")
            .get();

        let expiredCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const subscription = userData?.subscription;

            if (!subscription?.premiumEndDate) continue;

            const endDate = new Date(subscription.premiumEndDate);

            if (endDate < now) {
                // Assinatura expirada
                await userDoc.ref.update({
                    "subscription.plan": "free",
                    "subscription.premiumMonths": 0,
                });

                expiredCount++;

                // Envia email de expiração
                if (userData?.email) {
                    try {
                        await sendEmail(userData.email, "premium_expired", {
                            userName: userData.displayName || userData.email.split("@")[0],
                        });
                        logger.info("📧 Email de expiração enviado:", { email: userData.email });
                    } catch (emailError) {
                        logger.error("❌ Erro ao enviar email de expiração:", emailError);
                    }
                }

                // Notifica o usuário via push
                const fcmToken = userData?.fcmToken;
                if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: "😢 Seu Premium expirou",
                            body: "Sua assinatura Premium expirou. Renove para continuar usando todos os recursos!",
                        },
                        data: {
                            type: "subscription_expired",
                        },
                    };

                    try {
                        await admin.messaging().send(message);
                    } catch (fcmError) {
                        logger.error("Erro ao enviar notificação de expiração:", fcmError);
                    }
                }

                logger.info("⏰ Assinatura expirada:", { userId: userDoc.id });
            }
        }

        logger.info("🏁 Verificação de expiração concluída:", { expiredCount });
    } catch (error) {
        logger.error("❌ Erro na verificação de assinaturas expiradas:", error);
        throw error;
    }
});

/**
 * Cloud Function para enviar email de boas-vindas
 * POST /sendWelcomeEmail
 * Body: { userId, email, userName }
 */
export const sendWelcomeEmail = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { email, userName } = req.body;

        if (!email) {
            res.status(400).send("Missing required field: email");
            return;
        }

        const success = await sendEmail(email, "welcome", {
            userName: userName || email.split("@")[0],
            userEmail: email,
        });

        if (success) {
            logger.info("Welcome email sent", { email });
            res.status(200).json({ success: true, message: "Welcome email sent" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send email" });
        }
    } catch (error) {
        logger.error("Error sending welcome email", error);
        res.status(500).send(`Error: ${error}`);
    }
});

/**
 * Cloud Function para enviar email de suporte/dúvidas
 * POST /sendSupportEmail
 * Body: { userEmail, userName, subject, message }
 */
export const sendSupportEmail = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { userEmail, userName, subject, message } = req.body;

        if (!userEmail || !message) {
            res.status(400).send("Missing required fields: userEmail, message");
            return;
        }

        // Envia email para o suporte (admin@budgetsystem.cloud)
        const success = await sendEmail("admin@budgetsystem.cloud", "support_request", {
            userName: userName || "Usuário",
            userEmail,
            supportSubject: subject || "Dúvida geral",
            supportMessage: message,
        });

        if (success) {
            logger.info("Support email sent", { userEmail, subject });
            res.status(200).json({ success: true, message: "Support email sent" });
        } else {
            res.status(500).json({ success: false, message: "Failed to send email" });
        }
    } catch (error) {
        logger.error("Error sending support email", error);
        res.status(500).send(`Error: ${error}`);
    }
});

/**
 * Cloud Function para enviar convite de indicação por email
 * POST /sendReferralInvite
 * Body: { toEmail, fromName, fromEmail, referralCode, customMessage }
 */
export const sendReferralInvite = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { toEmail, fromName, fromEmail, referralCode, customMessage } = req.body;

        if (!toEmail || !referralCode) {
            res.status(400).json({
                success: false,
                error: "Campos obrigatórios: toEmail, referralCode"
            });
            return;
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            res.status(400).json({
                success: false,
                error: "Email inválido"
            });
            return;
        }

        const success = await sendEmail(toEmail, "referral_invite", {
            inviterName: fromName || fromEmail?.split("@")[0] || "Um amigo",
            inviterEmail: fromEmail,
            referralCode,
            customMessage: customMessage || "",
        });

        if (success) {
            logger.info("Referral invite email sent", {
                toEmail,
                fromEmail,
                referralCode
            });
            res.status(200).json({
                success: true,
                message: "Convite enviado com sucesso!"
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Falha ao enviar email. Tente novamente."
            });
        }
    } catch (error) {
        logger.error("Error sending referral invite email", error);
        res.status(500).json({
            success: false,
            error: "Erro interno. Tente novamente mais tarde."
        });
    }
});

/**
 * Cloud Function para verificar conexão SMTP
 * GET /verifyEmailConnection
 */
export const verifyEmailConnection = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const isConnected = await verifyConnection();

        if (isConnected) {
            res.status(200).json({ success: true, message: "SMTP connection OK" });
        } else {
            res.status(500).json({ success: false, message: "SMTP connection failed" });
        }
    } catch (error) {
        logger.error("Error verifying SMTP connection", error);
        res.status(500).send(`Error: ${error}`);
    }
});

/**
 * Cloud Function schedulada para lembrar usuários Premium perto de expirar
 * Executa diariamente às 10h (horário de Brasília = 13h UTC)
 */
export const sendPremiumReminders = onSchedule({
    schedule: "0 13 * * *", // Todo dia às 13h UTC (10h BRT)
    timeZone: "America/Sao_Paulo",
    retryCount: 3,
}, async () => {
    logger.info("📧 Enviando lembretes de expiração Premium...");

    try {
        const db = admin.firestore();
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Busca usuários premium que expiram nos próximos 7 dias
        const usersSnapshot = await db.collection("users")
            .where("subscription.plan", "==", "premium")
            .get();

        let remindersSent = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const subscription = userData?.subscription;

            if (!subscription?.premiumEndDate) continue;

            const endDate = new Date(subscription.premiumEndDate);

            // Verifica se está entre agora e 7 dias
            if (endDate > now && endDate <= sevenDaysFromNow) {
                const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

                // Envia apenas se for exatamente 7, 3 ou 1 dia restante
                if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
                    if (userData?.email) {
                        try {
                            await sendEmail(userData.email, "premium_reminder", {
                                userName: userData.displayName || userData.email.split("@")[0],
                                daysRemaining,
                                expirationDate: endDate.toLocaleDateString("pt-BR"),
                            });
                            remindersSent++;
                            logger.info("📧 Lembrete enviado:", {
                                email: userData.email,
                                daysRemaining,
                            });
                        } catch (emailError) {
                            logger.error("❌ Erro ao enviar lembrete:", emailError);
                        }
                    }

                    // Envia também push notification
                    const fcmToken = userData?.fcmToken;
                    if (fcmToken) {
                        const message = {
                            token: fcmToken,
                            notification: {
                                title: `⏰ Premium expira em ${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}`,
                                body: "Renove agora para continuar aproveitando todos os benefícios!",
                            },
                            data: {
                                type: "premium_reminder",
                                daysRemaining: daysRemaining.toString(),
                            },
                        };

                        try {
                            await admin.messaging().send(message);
                        } catch (fcmError) {
                            logger.error("Erro ao enviar push de lembrete:", fcmError);
                        }
                    }
                }
            }
        }

        logger.info("🏁 Lembretes de expiração enviados:", { remindersSent });
    } catch (error) {
        logger.error("❌ Erro ao enviar lembretes de expiração:", error);
        throw error;
    }
});

/**
 * Cloud Function para criar pagamento PIX
 * POST /createPixPayment
 * Body: { userId, userEmail, amount, description }
 */
export const createPixPayment = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ success: false, message: "Method Not Allowed" });
        return;
    }

    try {
        const { userId, userEmail, amount, description } = req.body;

        if (!userId || !amount) {
            res.status(400).json({
                success: false,
                message: "Campos obrigatórios: userId, amount",
            });
            return;
        }

        // Gera um ID único para o pagamento
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Chave PIX do recebedor (substitua pela sua chave PIX real)
        const pixKey = "admin@budgetsystem.cloud";
        const merchantName = "BUDGET SYSTEM";
        const merchantCity = "SAO PAULO";
        const txId = paymentId.replace(/[^a-zA-Z0-9]/g, "").substr(0, 25);

        // Gera código PIX EMV (formato Copia e Cola)
        // Este é um exemplo simplificado - em produção use uma biblioteca PIX oficial
        const pixCode = generatePixCode({
            pixKey,
            merchantName,
            merchantCity,
            amount: Number(amount),
            txId,
            description: description || "Premium Budget System",
        });

        // Salva o pagamento pendente no Firestore
        await admin.firestore().collection("payments").doc(paymentId).set({
            paymentId,
            userId,
            userEmail: userEmail || "",
            amount: Number(amount),
            description: description || "Premium Budget System",
            pixCode,
            status: "pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        });

        logger.info("💰 Pagamento PIX criado:", { paymentId, userId, amount });

        res.status(200).json({
            success: true,
            paymentId,
            pixCode,
            amount: Number(amount),
            expiresIn: 30 * 60, // 30 minutos em segundos
        });
    } catch (error) {
        logger.error("❌ Erro ao criar pagamento PIX:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao criar pagamento. Tente novamente.",
        });
    }
});

/**
 * Cloud Function para verificar status do pagamento PIX
 * POST /checkPixPayment
 * Body: { paymentId, userId }
 */
export const checkPixPayment = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ success: false, message: "Method Not Allowed" });
        return;
    }

    try {
        const { paymentId, userId } = req.body;

        if (!paymentId || !userId) {
            res.status(400).json({
                success: false,
                message: "Campos obrigatórios: paymentId, userId",
            });
            return;
        }

        // Busca o pagamento no Firestore
        const paymentDoc = await admin.firestore()
            .collection("payments")
            .doc(paymentId)
            .get();

        if (!paymentDoc.exists) {
            res.status(404).json({
                success: false,
                message: "Pagamento não encontrado",
            });
            return;
        }

        const paymentData = paymentDoc.data();

        // Verifica se o pagamento pertence ao usuário
        if (paymentData?.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "Pagamento não pertence a este usuário",
            });
            return;
        }

        // Em produção, aqui você consultaria a API do seu PSP (Mercado Pago, PagSeguro, etc.)
        // Para demonstração, vamos simular verificação manual ou webhook

        // Se o status já foi marcado como pago (por webhook ou manual)
        if (paymentData?.status === "paid") {
            res.status(200).json({
                success: true,
                paid: true,
                paymentId,
            });
            return;
        }

        // Se ainda está pendente
        res.status(200).json({
            success: true,
            paid: false,
            paymentId,
            message: "Pagamento ainda não identificado",
        });
    } catch (error) {
        logger.error("❌ Erro ao verificar pagamento:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao verificar pagamento. Tente novamente.",
        });
    }
});

/**
 * Cloud Function para confirmar pagamento PIX manualmente (admin ou webhook)
 * POST /confirmPixPayment
 * Body: { paymentId, adminKey } ou via webhook do PSP
 */
export const confirmPixPayment = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ success: false, message: "Method Not Allowed" });
        return;
    }

    try {
        const { paymentId, adminKey } = req.body;

        // Chave de admin simples para confirmação manual
        // Em produção, use autenticação adequada
        const ADMIN_KEY = process.env.ADMIN_KEY || "budget_admin_2024";

        if (adminKey !== ADMIN_KEY) {
            res.status(403).json({
                success: false,
                message: "Não autorizado",
            });
            return;
        }

        if (!paymentId) {
            res.status(400).json({
                success: false,
                message: "Campo obrigatório: paymentId",
            });
            return;
        }

        // Busca e atualiza o pagamento
        const paymentRef = admin.firestore().collection("payments").doc(paymentId);
        const paymentDoc = await paymentRef.get();

        if (!paymentDoc.exists) {
            res.status(404).json({
                success: false,
                message: "Pagamento não encontrado",
            });
            return;
        }

        const paymentData = paymentDoc.data();

        if (paymentData?.status === "paid") {
            res.status(200).json({
                success: true,
                message: "Pagamento já estava confirmado",
            });
            return;
        }

        // Atualiza status para pago
        await paymentRef.update({
            status: "paid",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Ativa premium para o usuário
        const userId = paymentData?.userId;
        if (userId) {
            const now = new Date();
            const endDate = new Date(now);
            endDate.setMonth(endDate.getMonth() + 1);

            await admin.firestore()
                .collection("subscriptions")
                .doc(userId)
                .set({
                    plan: "premium",
                    startDate: now.toISOString(),
                    endDate: endDate.toISOString(),
                    autoRenew: false,
                    lastPaymentId: paymentId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

            logger.info("✅ Premium ativado para:", { userId, paymentId });
        }

        res.status(200).json({
            success: true,
            message: "Pagamento confirmado e premium ativado",
        });
    } catch (error) {
        logger.error("❌ Erro ao confirmar pagamento:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao confirmar pagamento",
        });
    }
});

/**
 * Função auxiliar para gerar código PIX EMV
 */
function generatePixCode(params: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    txId: string;
    description?: string;
}): string {
    const { pixKey, merchantName, merchantCity, amount, txId } = params;

    // Funções auxiliares para formato EMV
    const formatEMV = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, "0");
        return `${id}${len}${value}`;
    };

    // Payload Format Indicator
    let payload = formatEMV("00", "01");

    // Merchant Account Information (PIX)
    const gui = formatEMV("00", "br.gov.bcb.pix");
    const key = formatEMV("01", pixKey);
    const merchantAccount = gui + key;
    payload += formatEMV("26", merchantAccount);

    // Merchant Category Code
    payload += formatEMV("52", "0000");

    // Transaction Currency (986 = BRL)
    payload += formatEMV("53", "986");

    // Transaction Amount
    if (amount > 0) {
        payload += formatEMV("54", amount.toFixed(2));
    }

    // Country Code
    payload += formatEMV("58", "BR");

    // Merchant Name
    payload += formatEMV("59", merchantName.substr(0, 25));

    // Merchant City
    payload += formatEMV("60", merchantCity.substr(0, 15));

    // Additional Data Field (txId)
    if (txId) {
        const additionalData = formatEMV("05", txId);
        payload += formatEMV("62", additionalData);
    }

    // CRC16 placeholder
    payload += "6304";

    // Calcula CRC16
    const crc = crc16CCITT(payload);
    payload = payload.slice(0, -4) + formatEMV("63", crc);

    return payload;
}

/**
 * Calcula CRC16 CCITT para o código PIX
 */
function crc16CCITT(str: string): string {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc = crc << 1;
            }
        }
    }

    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ============================================
// STRIPE PAYMENT FUNCTIONS
// ============================================

/**
 * Cria um cliente Stripe
 * POST /createStripeCustomer
 * Body: { userId, email, name }
 */
export const createStripeCustomer = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method Not Allowed" });
        return;
    }

    try {
        const { userId, email, name } = req.body;

        if (!userId || !email) {
            res.status(400).json({ success: false, error: "Missing userId or email" });
            return;
        }

        const customerId = await createOrGetStripeCustomer(userId, email, name);

        res.status(200).json({
            success: true,
            customerId
        });
    } catch (error: any) {
        logger.error("Error creating Stripe customer", error);
        res.status(500).json({
            success: false,
            error: error.message || "Internal error"
        });
    }
});

/**
 * Cria uma sessão de checkout do Stripe
 * POST /createStripeCheckout
 * Body: { userId, userEmail, priceId, successUrl, cancelUrl }
 */
export const createStripeCheckout = onRequest(
    { secrets: [stripeSecretKey, stripePriceMonthly, stripePriceYearly] },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }

        try {
            const { userId, userEmail, priceId, successUrl, cancelUrl } = req.body;

            if (!userId || !userEmail || !priceId || !successUrl || !cancelUrl) {
                res.status(400).json({ success: false, error: "Missing required fields" });
                return;
            }

            const { sessionId, url } = await createCheckoutSession(
                userId,
                userEmail,
                priceId,
                successUrl,
                cancelUrl
            );

            res.status(200).json({
                success: true,
                sessionId,
                url
            });
        } catch (error: any) {
            logger.error("Error creating checkout session", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal error"
            });
        }
    });

/**
 * Cria uma sessão do portal do cliente Stripe
 * POST /createStripePortalSession
 * Body: { userId, returnUrl }
 */
export const createStripePortalSession = onRequest(
    { secrets: [stripeSecretKey] },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }

        try {
            const { userId, returnUrl } = req.body;

            if (!userId || !returnUrl) {
                res.status(400).json({ success: false, error: "Missing userId or returnUrl" });
                return;
            }

            const url = await createPortalSession(userId, returnUrl);

            res.status(200).json({
                success: true,
                url
            });
        } catch (error: any) {
            logger.error("Error creating portal session", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal error"
            });
        }
    });

/**
 * Webhook do Stripe para processar eventos
 * POST /stripeWebhook
 */
export const stripeWebhook = onRequest(
    { secrets: [stripeSecretKey, stripeWebhookSecret] },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        const signature = req.headers["stripe-signature"] as string;

        if (!signature) {
            res.status(400).send("Missing Stripe signature");
            return;
        }

        try {
            await handleStripeWebhook(req.rawBody, signature);
            res.status(200).json({ received: true });
        } catch (error: any) {
            logger.error("Webhook error", error);
            res.status(400).send(`Webhook Error: ${error.message}`);
        }
    });

/**
 * Cancela assinatura ao final do período
 * POST /cancelStripeSubscription
 * Body: { userId }
 */
export const cancelStripeSubscription = onRequest(
    { secrets: [stripeSecretKey] },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }

        try {
            const { userId } = req.body;

            if (!userId) {
                res.status(400).json({ success: false, error: "Missing userId" });
                return;
            }

            await cancelSubscriptionAtPeriodEnd(userId);

            res.status(200).json({ success: true });
        } catch (error: any) {
            logger.error("Error canceling subscription", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal error"
            });
        }
    });

/**
 * Reativa assinatura que estava marcada para cancelar
 * POST /reactivateStripeSubscription
 * Body: { userId }
 */
export const reactivateStripeSubscription = onRequest(
    { secrets: [stripeSecretKey] },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }

        try {
            const { userId } = req.body;

            if (!userId) {
                res.status(400).json({ success: false, error: "Missing userId" });
                return;
            }

            await reactivateSubscription(userId);

            res.status(200).json({ success: true });
        } catch (error: any) {
            logger.error("Error reactivating subscription", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal error"
            });
        }
    });

/**
 * Sincroniza status da assinatura do Stripe
 * Busca diretamente no Stripe e atualiza Firestore
 * POST /syncStripeSubscription
 * Body: { userId }
 */
export const syncStripeSubscription = onRequest(
    { secrets: [stripeSecretKey] },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.status(204).send("");
            return;
        }

        if (req.method !== "POST") {
            res.status(405).json({ success: false, error: "Method Not Allowed" });
            return;
        }

        try {
            const { userId } = req.body;

            if (!userId) {
                res.status(400).json({ success: false, error: "Missing userId" });
                return;
            }

            const result = await syncSubscriptionStatus(userId);

            res.status(200).json({
                success: true,
                isPremium: result.isPremium,
                subscription: result.subscription
            });
        } catch (error: any) {
            logger.error("Error syncing subscription", error);
            res.status(500).json({
                success: false,
                error: error.message || "Internal error"
            });
        }
    });